import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, statfs, writeFile } from 'node:fs/promises';
import { arch, freemem, hostname, platform, release, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { ComfyUIClient } from '../runtime/comfyui-client.mjs';
import {
  assertPathInside,
  componentById,
  componentInstallPath,
  componentManifest,
  modelInstallPath,
  modelManifest,
  resolveWorkflowSource,
  runtimeConfiguration,
  sha256File,
  workflowById,
  workflowManifest,
} from '../runtime/manifest-loader.mjs';
import {
  applySemanticBindings,
  compileWorkflowRequest,
  loadWorkflowTemplate,
  validateWorkflow,
} from '../runtime/workflow-adapter.mjs';

const configuration = runtimeConfiguration();
const client = new ComfyUIClient(configuration.comfyBaseUrl);
const statePath = join(configuration.runtimeRoot, 'runtime-state.json');
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.CONTINUITY_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
]);

const jobs = new Map();
const operations = new Map();
const processLogs = [];
let comfyProcess = null;
let shuttingDown = false;
let persistenceChain = Promise.resolve();
let websocket = null;
let websocketTimer = null;

await mkdir(configuration.runtimeRoot, { recursive: true });
await restoreState();

function nowIso() {
  return new Date().toISOString();
}

function appendLog(source, text) {
  for (const line of String(text).split(/\r?\n/).filter(Boolean)) {
    processLogs.push({ at: nowIso(), source, text: line.slice(0, 2_000) });
  }
  if (processLogs.length > 300) processLogs.splice(0, processLogs.length - 300);
}

function publicJob(job) {
  const { compiledPrompt: _compiledPrompt, request: _request, ...safe } = job;
  return safe;
}

function serializableState() {
  return {
    schemaVersion: 1,
    savedAt: nowIso(),
    jobs: [...jobs.values()],
  };
}

function persistState() {
  persistenceChain = persistenceChain.then(async () => {
    const temporary = `${statePath}.tmp`;
    await writeFile(temporary, JSON.stringify(serializableState()), 'utf8');
    await rename(temporary, statePath);
  }).catch((error) => appendLog('runtime', `State persistence failed: ${error.message}`));
  return persistenceChain;
}

async function restoreState() {
  try {
    const value = JSON.parse(await readFile(statePath, 'utf8'));
    for (const job of value.jobs || []) {
      if (['Preparing', 'Waiting for GPU', 'Loading model', 'Generating', 'Decoding', 'Saving', 'Validating'].includes(job.status)) {
        job.status = 'Failed';
        job.failure = 'The runtime restarted before this attempt completed. Its immutable request is preserved; retry resumes from verified backend checkpoints.';
        job.updatedAt = nowIso();
      }
      jobs.set(job.id, job);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') appendLog('runtime', `Ignored unreadable prior runtime state: ${error.message}`);
  }
}

function runProcess(binary, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const maximumOutput = options.maximumOutput || 100_000;
    child.stdout.on('data', (chunk) => { stdout = `${stdout}${chunk}`.slice(-maximumOutput); });
    child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-maximumOutput); });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${binary} timed out after ${options.timeoutMs || 20_000} ms.`));
    }, options.timeoutMs || 20_000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0 || options.allowFailure) resolvePromise({ code: code ?? -1, stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(`${binary} exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

async function commandVersion(binary, args) {
  try {
    const result = await runProcess(binary, args, { timeoutMs: 8_000, allowFailure: true, maximumOutput: 8_000 });
    return { available: result.code === 0, version: (result.stdout || result.stderr).split(/\r?\n/)[0] || 'Detected', error: result.code === 0 ? null : result.stderr || result.stdout };
  } catch (error) {
    return { available: false, version: null, error: error instanceof Error ? error.message : `${binary} is unavailable.` };
  }
}

async function gpuInformation() {
  try {
    const result = await runProcess('nvidia-smi', ['--query-gpu=name,memory.total,memory.free,driver_version', '--format=csv,noheader,nounits'], { timeoutMs: 8_000 });
    const devices = result.stdout.split(/\r?\n/).filter(Boolean).map((line, index) => {
      const [name, memoryTotalMb, memoryFreeMb, driverVersion] = line.split(',').map((value) => value.trim());
      return { index, name, memoryTotalMb: Number(memoryTotalMb), memoryFreeMb: Number(memoryFreeMb), driverVersion };
    });
    return { nvidia: true, cudaAvailable: true, devices, error: null };
  } catch (error) {
    return { nvidia: false, cudaAvailable: false, devices: [], error: error instanceof Error ? error.message : 'NVIDIA detection failed.' };
  }
}

async function diskInformation() {
  const details = await statfs(configuration.runtimeRoot);
  return {
    path: configuration.runtimeRoot,
    totalBytes: details.blocks * details.bsize,
    freeBytes: details.bavail * details.bsize,
  };
}

async function gitInformation(path) {
  if (!existsSync(join(path, '.git'))) return { installed: false, commit: null, origin: null, dirty: false, error: null };
  try {
    const [commit, origin, status] = await Promise.all([
      runProcess('git', ['-C', path, 'rev-parse', 'HEAD']),
      runProcess('git', ['-C', path, 'remote', 'get-url', 'origin'], { allowFailure: true }),
      runProcess('git', ['-C', path, 'status', '--porcelain'], { allowFailure: true }),
    ]);
    return { installed: true, commit: commit.stdout, origin: origin.stdout, dirty: Boolean(status.stdout), error: null };
  } catch (error) {
    return { installed: true, commit: null, origin: null, dirty: false, error: error instanceof Error ? error.message : 'Git inspection failed.' };
  }
}

async function componentStatus(component) {
  if (component.kind === 'system-binary') {
    const detection = component.id === 'ffmpeg' ? await commandVersion('ffmpeg', ['-version']) : { available: false, version: null, error: 'Unsupported system binary.' };
    return { ...component, path: null, installed: detection.available, installedVersion: detection.version, status: detection.available ? 'Ready' : 'Missing', updateAvailable: null, error: detection.error };
  }
  if (component.kind === 'model-source') {
    return { ...component, path: null, installed: true, installedVersion: component.pinnedVersion, status: 'Registry source', updateAvailable: null, error: null };
  }
  const path = componentInstallPath(component, configuration);
  const git = await gitInformation(path);
  const originMatches = !git.origin || normalizeRepository(git.origin) === normalizeRepository(component.repository);
  const pinned = git.commit === component.pinnedCommit;
  const installed = git.installed && originMatches;
  return {
    ...component,
    path,
    installed,
    installedVersion: git.commit,
    status: !git.installed ? 'Missing' : !originMatches ? 'Conflict' : git.dirty ? 'Needs repair' : pinned ? 'Ready' : 'Version mismatch',
    updateAvailable: git.installed ? !pinned : null,
    dirty: git.dirty,
    error: !originMatches ? `Installed origin ${git.origin} does not match the registry.` : git.error,
  };
}

function normalizeRepository(value) {
  return String(value || '').toLowerCase().replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '').replace(/\/$/, '');
}

async function quickModelStatus(model) {
  const path = modelInstallPath(model, configuration);
  try {
    const details = await stat(path);
    const sizeMatches = !model.sizeBytes || Math.abs(details.size - model.sizeBytes) < Math.max(1024, model.sizeBytes * 0.02);
    return { ...model, path, installed: details.isFile(), size: details.size, checksumStatus: model.sha256 ? 'Not verified' : 'Unavailable', status: details.isFile() && sizeMatches ? 'Present' : details.isFile() ? 'Size mismatch' : 'Missing' };
  } catch {
    return { ...model, path, installed: false, size: null, checksumStatus: 'Not verified', status: 'Missing' };
  }
}

async function workflowStatus(descriptor, liveObjectInfo = null, bindings = {}) {
  const { sourcePath, workflow } = loadWorkflowTemplate(descriptor, configuration);
  if (!workflow) return { ...descriptor, sourcePath: null, compatible: false, storyboardCompatible: false, h3Compatible: false, findings: [{ id: 'workflow-source', severity: 'blocking', message: 'The supplied workflow JSON was not found. Set CONTINUITY_WORKFLOW_PATH or place the file at its registered path.' }] };
  const effective = applySemanticBindings(workflow, descriptor, bindings);
  const [sourceValidation, storyboardValidation] = await Promise.all([
    validateWorkflow(descriptor, effective, { sourcePath, objectInfo: liveObjectInfo }),
    validateWorkflow(descriptor, effective, { sourcePath, objectInfo: liveObjectInfo, target: 'storyboard' }),
  ]);
  const ref2vaModel = modelManifest.models.find((model) => model.id === 'h3-ref2va-int8');
  const ref2vaReady = ref2vaModel ? existsSync(modelInstallPath(ref2vaModel, configuration)) : false;
  let h3Validation = { compatible: false, findings: [{ id: 'ref2va-model-file', severity: 'blocking', message: 'The registered genuine Ref2VA checkpoint is missing.' }] };
  if (ref2vaReady && ref2vaModel) {
    const filename = ref2vaModel.relativePath.split('/').at(-1);
    const corrected = applySemanticBindings(effective, descriptor, { 'h3-model': filename });
    h3Validation = await validateWorkflow(descriptor, corrected, { sourcePath, objectInfo: liveObjectInfo, target: 'h3-chain' });
  }
  const findings = sourceValidation.findings.filter((finding) => finding.id !== 'ref2va-model-selection');
  findings.push(...storyboardValidation.findings.filter((finding) => !findings.some((item) => item.id === finding.id)));
  findings.push(...h3Validation.findings.filter((finding) => !findings.some((item) => item.id === finding.id)));
  findings.push(ref2vaReady
    ? { id: 'ref2va-managed-binding', severity: 'review', message: 'The source graph selects FL2VA, but Studio will inject the verified registered Ref2VA checkpoint through its semantic binding before H3 submission.' }
    : sourceValidation.findings.find((finding) => finding.id === 'ref2va-model-selection') || { id: 'ref2va-model-selection', severity: 'blocking', message: 'A genuine Ref2VA checkpoint is required.' });
  return { ...descriptor, sourcePath, compatible: storyboardValidation.compatible && h3Validation.compatible, storyboardCompatible: storyboardValidation.compatible, h3Compatible: h3Validation.compatible, findings };
}

async function runtimeStatus(options = {}) {
  const [gpu, disk, python, ffmpeg, comfy, components, models] = await Promise.all([
    gpuInformation(),
    diskInformation(),
    commandVersion(configuration.pythonBinary, ['--version']),
    commandVersion('ffmpeg', ['-version']),
    client.health(),
    Promise.all(componentManifest.components.map(componentStatus)),
    Promise.all(modelManifest.models.map(quickModelStatus)),
  ]);
  let workflows;
  if (options.includeWorkflowValidation) {
    let objectInfo = null;
    if (comfy.connected) {
      try { objectInfo = await client.objectInfo(); } catch (error) { appendLog('comfyui', error.message); }
    }
    workflows = await Promise.all(workflowManifest.workflows.map((workflow) => workflowStatus(workflow, objectInfo)));
  } else {
    workflows = workflowManifest.workflows.map((workflow) => ({ ...workflow, sourcePath: resolveWorkflowSource(workflow, configuration) }));
  }
  const preset = chooseHardwarePreset(gpu.devices[0]?.memoryTotalMb ? gpu.devices[0].memoryTotalMb / 1024 : 0);
  const requiredModelIds = new Set(workflowManifest.workflows.flatMap((workflow) => workflow.requiredModels));
  const annotatedModels = models.map((model) => ({ ...model, required: requiredModelIds.has(model.id) }));
  return {
    available: true,
    service: 'Continuity Studio Local Runtime Manager',
    version: '1.0.0',
    startedAt,
    configuration: { runtimeRoot: configuration.runtimeRoot, comfyRoot: configuration.comfyRoot, comfyBaseUrl: configuration.comfyBaseUrl },
    system: { hostname: hostname(), platform: platform(), release: release(), architecture: arch(), ram: { totalBytes: totalmem(), freeBytes: freemem() }, disk, gpu, python, ffmpeg, preset },
    engine: { ...comfy, managedByStudio: Boolean(comfyProcess && !comfyProcess.killed), processId: comfyProcess?.pid || null },
    components,
    models: annotatedModels,
    workflows,
    operations: [...operations.values()],
    jobs: [...jobs.values()].map(publicJob),
    logs: processLogs.slice(-80),
  };
}

function chooseHardwarePreset(vramGb) {
  const presets = modelManifest.hardwarePresets;
  if (vramGb <= 0) {
    return {
      id: 'unavailable',
      label: 'No supported CUDA GPU detected',
      minimumVramGb: 0,
      maximumVramGb: 0,
      storyboardResolution: null,
      videoResolution: null,
      steps: null,
      candidateCount: 0,
      contextFrames: 0,
      audioContext: false,
      notes: 'Planning, prompt compilation, exports, and project work remain available. Local Krea and MiniMax generation stays blocked until a supported NVIDIA CUDA GPU is detected.',
    };
  }
  return presets.find((preset) => vramGb >= preset.minimumVramGb && (preset.maximumVramGb === null || vramGb <= preset.maximumVramGb)) || presets[0];
}

async function waitForEngine(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const health = await client.health();
    if (health.connected) return health;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  return client.health();
}

async function startEngine() {
  const health = await client.health();
  if (health.connected) return { ok: true, message: 'ComfyUI is already connected.', managedByStudio: Boolean(comfyProcess) };
  if (comfyProcess && !comfyProcess.killed) return { ok: true, message: 'ComfyUI is starting.', managedByStudio: true };
  const mainPath = resolve(configuration.comfyRoot, 'main.py');
  if (!existsSync(mainPath)) throw new Error(`ComfyUI is not installed at ${configuration.comfyRoot}.`);
  comfyProcess = spawn(configuration.pythonBinary, ['main.py', '--listen', '127.0.0.1', '--port', String(configuration.comfyPort), '--disable-auto-launch'], {
    cwd: configuration.comfyRoot,
    env: process.env,
    windowsHide: true,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  comfyProcess.stdout.on('data', (chunk) => appendLog('comfyui', chunk));
  comfyProcess.stderr.on('data', (chunk) => appendLog('comfyui', chunk));
  comfyProcess.on('error', (error) => appendLog('comfyui', `Process error: ${error.message}`));
  comfyProcess.on('exit', (code) => {
    appendLog('comfyui', `Process exited with code ${code ?? 'unknown'}.`);
    comfyProcess = null;
  });
  const connected = await waitForEngine();
  if (!connected.connected) throw new Error(`ComfyUI did not become ready: ${connected.error}`);
  connectWebsocket();
  return { ok: true, message: 'ComfyUI started and passed its loopback health check.', managedByStudio: true };
}

async function stopEngine() {
  if (!comfyProcess || comfyProcess.killed) {
    const health = await client.health();
    if (health.connected) throw new Error('ComfyUI is running outside this Studio runtime. Stop it from the process that started it.');
    return { ok: true, message: 'ComfyUI is already stopped.', managedByStudio: false };
  }
  const child = comfyProcess;
  child.kill('SIGTERM');
  await new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 5_000);
    child.once('exit', () => { clearTimeout(timer); resolvePromise(); });
  });
  comfyProcess = null;
  return { ok: true, message: 'The Studio-managed ComfyUI process stopped.', managedByStudio: false };
}

async function engineAction(action) {
  if (action === 'start') return startEngine();
  if (action === 'stop') return stopEngine();
  if (action === 'restart') { await stopEngine(); return startEngine(); }
  if (action === 'test') {
    const health = await client.health();
    if (!health.connected) throw new Error(health.error || 'ComfyUI is unavailable.');
    const objectInfo = await client.objectInfo();
    return { ok: true, message: `ComfyUI responded in ${health.latencyMs} ms with ${Object.keys(objectInfo).length} node types.`, health };
  }
  if (action === 'diagnostics') return runtimeStatus({ includeWorkflowValidation: true });
  throw new Error('Unknown engine action.');
}

function startOperation(kind, targetId, task) {
  const operation = { id: `operation_${crypto.randomUUID()}`, kind, targetId, status: 'Running', progress: 0, message: 'Starting', createdAt: nowIso(), updatedAt: nowIso(), error: null };
  operations.set(operation.id, operation);
  void task(operation).then(() => {
    operation.status = 'Completed';
    operation.progress = 100;
    operation.updatedAt = nowIso();
  }).catch((error) => {
    operation.status = 'Failed';
    operation.error = error instanceof Error ? error.message : 'Operation failed.';
    operation.message = operation.error;
    operation.updatedAt = nowIso();
  });
  return operation;
}

async function checkoutPinnedComponent(component, action, operation) {
  const destination = componentInstallPath(component, configuration);
  if (!destination) throw new Error(`${component.name} is not installed as a Git component.`);
  if (component.id !== 'comfyui') assertPathInside(destination, resolve(configuration.comfyRoot, 'custom_nodes'), 'Custom-node destination');
  else if (destination !== configuration.comfyRoot) assertPathInside(destination, configuration.runtimeRoot, 'ComfyUI destination');
  await mkdir(dirname(destination), { recursive: true });
  const git = await gitInformation(destination);
  operation.progress = 10;
  operation.message = git.installed ? 'Verifying repository origin' : 'Cloning pinned repository';
  operation.updatedAt = nowIso();
  if (!git.installed) {
    if (existsSync(destination)) throw new Error(`${destination} exists but is not a Git checkout. Move it or configure CONTINUITY_COMFYUI_ROOT explicitly.`);
    await runProcess('git', ['clone', '--no-checkout', '--filter=blob:none', component.repository, destination], { timeoutMs: 600_000, maximumOutput: 20_000 });
  } else if (normalizeRepository(git.origin) !== normalizeRepository(component.repository)) {
    throw new Error(`Refusing to modify ${destination}: its origin is ${git.origin}, not ${component.repository}.`);
  }
  const current = await gitInformation(destination);
  if (current.dirty && action !== 'test') throw new Error(`Refusing to overwrite local changes in ${destination}. Commit or move them before repair/update.`);
  operation.progress = 45;
  operation.message = `Fetching pinned commit ${component.pinnedCommit}`;
  operation.updatedAt = nowIso();
  await runProcess('git', ['-C', destination, 'fetch', '--depth=1', 'origin', component.pinnedCommit], { timeoutMs: 600_000, maximumOutput: 20_000 });
  await runProcess('git', ['-C', destination, 'checkout', '--detach', component.pinnedCommit], { timeoutMs: 120_000, maximumOutput: 20_000 });
  operation.progress = 70;
  operation.message = 'Installing declared Python requirements';
  operation.updatedAt = nowIso();
  const requirements = join(destination, 'requirements.txt');
  if (existsSync(requirements)) {
    await runProcess(configuration.pythonBinary, ['-m', 'pip', 'install', '-r', requirements], { cwd: destination, timeoutMs: 900_000, maximumOutput: 30_000 });
  }
  operation.progress = 90;
  operation.message = 'Verifying pinned commit';
  operation.updatedAt = nowIso();
  const verified = await gitInformation(destination);
  if (verified.commit !== component.pinnedCommit) throw new Error(`Installed commit ${verified.commit} does not match ${component.pinnedCommit}.`);
  operation.message = `${component.name} is pinned and verified.`;
}

function componentAction(id, action) {
  const component = componentById(id);
  if (!component) throw new Error('Unknown component ID.');
  if (!['install', 'update', 'repair', 'test'].includes(action)) throw new Error('Component action must be install, update, repair, or test.');
  if (action === 'test') return startOperation('component-test', id, async (operation) => {
    const status = await componentStatus(component);
    operation.message = `${component.name}: ${status.status}`;
    if (status.status === 'Conflict') throw new Error(status.error);
  });
  if (!['engine', 'custom-node'].includes(component.kind)) throw new Error(`${component.name} is detected or installed through its upstream distribution, not cloned by Studio.`);
  return startOperation(`component-${action}`, id, (operation) => checkoutPinnedComponent(component, action, operation));
}

function verifyModels(ids = []) {
  const selected = ids.length ? ids.map(modelBySafeId) : modelManifest.models;
  return startOperation('model-verification', ids.join(',') || 'all', async (operation) => {
    const results = [];
    for (let index = 0; index < selected.length; index += 1) {
      const model = selected[index];
      operation.progress = Math.floor((index / Math.max(1, selected.length)) * 100);
      operation.message = `Verifying ${model.name}`;
      operation.updatedAt = nowIso();
      const quick = await quickModelStatus(model);
      if (!quick.installed) {
        results.push({ id: model.id, status: 'Missing', checksum: null });
        continue;
      }
      const checksum = model.sha256 ? await sha256File(quick.path) : null;
      results.push({ id: model.id, status: !model.sha256 ? 'Present' : checksum === model.sha256 ? 'Verified' : 'Checksum mismatch', checksum });
    }
    operation.results = results;
    const bad = results.filter((result) => ['Missing', 'Checksum mismatch'].includes(result.status));
    operation.message = bad.length ? `${bad.length} model files require attention.` : 'All selected model files passed verification.';
  });
}

function modelBySafeId(id) {
  const model = modelManifest.models.find((item) => item.id === id);
  if (!model) throw new Error(`Unknown model ID ${id}.`);
  return model;
}

function phaseForNode(node) {
  const type = node?.class_type || '';
  if (/Loader|Lora|Patch|Attention|Spectrum|Cache/.test(type)) return { status: 'Loading model', progress: 10 };
  if (/Sampler|Scheduler|Noise|ReferenceToVideo|MultiShot/.test(type)) return { status: 'Generating', progress: 35 };
  if (/Decode|Trim/.test(type)) return { status: 'Decoding', progress: 75 };
  if (/Save|LoopEnd/.test(type)) return { status: 'Saving', progress: 88 };
  if (/Review/.test(type)) return { status: 'Needs Review', progress: 100 };
  if (/Assemble/.test(type)) return { status: 'Saving', progress: 95 };
  return { status: 'Generating', progress: 25 };
}

function connectWebsocket() {
  if (typeof WebSocket === 'undefined' || shuttingDown) return;
  if (websocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(websocket.readyState)) return;
  clearTimeout(websocketTimer);
  try {
    websocket = new WebSocket(client.websocketUrl());
    websocket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const promptId = message.data?.prompt_id;
      const job = [...jobs.values()].find((item) => item.promptId === promptId);
      if (!job) return;
      if (message.type === 'progress') {
        const value = Number(message.data?.value || 0);
        const maximum = Math.max(1, Number(message.data?.max || 1));
        job.status = 'Generating';
        job.progress = Math.max(job.progress, Math.min(80, 20 + Math.round((value / maximum) * 60)));
      } else if (message.type === 'executing' && message.data?.node) {
        const phase = phaseForNode(job.compiledPrompt?.[String(message.data.node)]);
        job.status = phase.status;
        job.progress = Math.max(job.progress, phase.progress);
      } else if (message.type === 'execution_error') {
        job.status = 'Failed';
        job.failure = message.data?.exception_message || 'ComfyUI execution failed.';
      } else if (message.type === 'execution_interrupted') {
        if (!['Paused', 'Cancelled'].includes(job.status)) job.status = 'Failed';
      }
      job.updatedAt = nowIso();
      void persistState();
    });
    websocket.addEventListener('close', () => {
      websocket = null;
      if (!shuttingDown) websocketTimer = setTimeout(connectWebsocket, 3_000);
    });
    websocket.addEventListener('error', () => websocket?.close());
  } catch (error) {
    appendLog('runtime', `ComfyUI WebSocket unavailable: ${error.message}`);
  }
}

function extractOutputs(value, results = []) {
  if (!value || typeof value !== 'object') return results;
  for (const [key, entry] of Object.entries(value)) {
    if (['images', 'gifs', 'audio', 'videos'].includes(key) && Array.isArray(entry)) {
      for (const item of entry) if (item && typeof item === 'object') results.push(item);
    } else if (typeof entry === 'object') extractOutputs(entry, results);
  }
  return results;
}

async function refreshJobs() {
  const active = [...jobs.values()].filter((job) => job.promptId && !['Needs Review', 'Approved', 'Failed', 'Paused', 'Cancelled'].includes(job.status));
  for (const job of active) {
    try {
      const history = await client.history(job.promptId);
      const record = history?.[job.promptId];
      if (!record) continue;
      const status = record.status || {};
      if (status.completed || status.status_str === 'success') {
        job.status = 'Needs Review';
        job.progress = 100;
        job.output = extractOutputs(record.outputs || {});
        job.checkpoint = job.output.find((item) => /manifest|checkpoint/i.test(JSON.stringify(item))) || job.checkpoint;
        job.failure = null;
        if (job.provenance) job.provenance.generatedAt = nowIso();
        job.updatedAt = nowIso();
        await persistState();
      } else if (status.status_str === 'error') {
        job.status = 'Failed';
        job.failure = status.messages?.at(-1)?.at(-1)?.exception_message || 'ComfyUI reported an execution error.';
        job.updatedAt = nowIso();
        await persistState();
      }
    } catch (error) {
      appendLog('runtime', `Job ${job.id} history poll: ${error.message}`);
    }
  }
}

function validateJobRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('A job request is required.');
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(body.projectId || '')) throw new Error('projectId is invalid.');
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(body.sequenceId || body.target || '')) throw new Error('sequenceId is invalid.');
  if (!['storyboard', 'h3-chain'].includes(body.target)) throw new Error('target must be storyboard or h3-chain.');
  if (body.workflowId !== 'short-film-director-krea-minimax-h3') throw new Error('Unknown workflow ID.');
  if (body.target === 'h3-chain' && body.mode !== 'Ref2VA') {
    throw new Error(`The registered H3 execution graph is Ref2VA-only. ${body.mode || 'No'} mode may be compiled and exported, but needs a separately validated workflow before local submission.`);
  }
  const descriptor = workflowById(body.workflowId);
  const allowed = new Set(descriptor.semanticBindings.map((binding) => binding.id));
  for (const key of Object.keys(body.bindings || {})) if (!allowed.has(key)) throw new Error(`Unknown workflow binding ${key}.`);
  return descriptor;
}

function safeStageName(projectId, reference, index) {
  const tag = String(reference.stableTag || `reference_${index + 1}`).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48);
  const identifier = String(reference.stableReferenceId || index + 1).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48);
  return `continuity_${projectId}_${tag}_${identifier}.png`;
}

function verifiedStudioReferenceUrl(value, projectId) {
  const url = new URL(String(value || ''));
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '3000' || url.pathname !== '/api/files') {
    throw new Error('Reference staging accepts only the local Studio /api/files endpoint on port 3000.');
  }
  if (url.searchParams.get('projectId') !== projectId || !/^[a-zA-Z0-9_-]{1,180}$/.test(url.searchParams.get('referenceId') || '')) {
    throw new Error('Reference staging URL does not match the immutable project/reference identity.');
  }
  return url;
}

async function fetchStudioReference(reference, projectId) {
  const url = verifiedStudioReferenceUrl(reference.sourceUrl, projectId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error(`Studio reference ${reference.stableTag || reference.stableReferenceId} could not be verified (HTTP ${response.status}).`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error(`${reference.stableTag || 'Reference'} is not an image and cannot fill a LoadImage binding.`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > 95 * 1024 * 1024) throw new Error('The staged Studio reference exceeds the 95 MB project limit.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 95 * 1024 * 1024) throw new Error('The staged Studio reference exceeds the 95 MB project limit.');
    return { bytes, contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveReferenceBytes(reference, projectId) {
  if (reference.sourceUrl) return fetchStudioReference(reference, projectId);
  if (reference.runtimeJobId) {
    const sourceJob = jobs.get(reference.runtimeJobId);
    if (!sourceJob || sourceJob.projectId !== projectId || !['Needs Review', 'Approved'].includes(sourceJob.status)) {
      throw new Error(`${reference.stableTag || 'Reference'} does not point to a completed runtime job in this project.`);
    }
    const index = Number(reference.outputIndex || 0);
    const output = sourceJob.output?.[index];
    const resolved = await client.outputBytes(output);
    if (!resolved.contentType.startsWith('image/')) throw new Error(`${reference.stableTag || 'Reference'} runtime output is not an image.`);
    return resolved;
  }
  throw new Error(`${reference.stableTag || reference.stableReferenceId || 'A required reference'} has no verified local source.`);
}

async function stageH3References(body) {
  const references = Array.isArray(body.references) ? body.references : [];
  const character = references.find((item) => item?.stableTag === '@hero_face')
    || references.find((item) => item?.stableTag === '@hero')
    || references.find((item) => item?.kind === 'image' && !String(item?.stableTag || '').includes('storyboard'));
  const storyboard = references.find((item) => item?.stableTag === '@storyboard');
  if (!character) throw new Error('Ref2VA preflight requires a verified character identity image (@hero_face or @hero).');
  if (!storyboard) throw new Error('Ref2VA preflight requires the sequence storyboard image (@storyboard). Generate and select the storyboard output first.');
  const staged = {};
  for (const [binding, reference, index] of [
    ['h3-character-reference', character, 0],
    ['h3-storyboard-reference', storyboard, 1],
  ]) {
    const resolved = await resolveReferenceBytes(reference, body.projectId);
    const uploaded = await client.uploadImage(safeStageName(body.projectId, reference, index), resolved.bytes, resolved.contentType);
    if (!uploaded?.name) throw new Error(`ComfyUI did not acknowledge the staged ${reference.stableTag} image.`);
    staged[binding] = uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
  }
  return staged;
}

async function stageStoryboardReference(body) {
  const references = Array.isArray(body.references) ? body.references : [];
  const character = references.find((item) => item?.stableTag === '@hero_face')
    || references.find((item) => item?.stableTag === '@hero')
    || references.find((item) => item?.kind === 'image');
  if (!character) throw new Error('Krea storyboard preflight requires a verified character identity image. Upload and bind the main character reference first.');
  const resolved = await resolveReferenceBytes(character, body.projectId);
  const uploaded = await client.uploadImage(safeStageName(body.projectId, character, 0), resolved.bytes, resolved.contentType);
  if (!uploaded?.name) throw new Error('ComfyUI did not acknowledge the staged character identity image.');
  return { 'character-sheet': uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name };
}

async function createRuntimeJob(body) {
  const descriptor = validateJobRequest(body);
  const health = await client.health();
  if (!health.connected) throw new Error(`ComfyUI is not connected: ${health.error}`);
  const { sourcePath, workflow } = loadWorkflowTemplate(descriptor, configuration);
  if (!workflow) throw new Error('The registered workflow source file is missing.');
  const objectInfo = await client.objectInfo();
  const stagedBindings = body.target === 'h3-chain' ? await stageH3References(body) : await stageStoryboardReference(body);
  const effectiveRequest = { ...body, bindings: { ...body.bindings, ...stagedBindings } };
  const compiled = await compileWorkflowRequest(descriptor, workflow, objectInfo, effectiveRequest);
  const componentPins = await Promise.all(descriptor.requiredComponents.map(async (id) => {
    const component = componentById(id);
    const installed = component ? await componentStatus(component) : null;
    return [id, { repository: component?.repository || null, license: component?.license || null, requiredVersion: component?.pinnedVersion || null, requiredCommit: component?.pinnedCommit || null, installedVersion: installed?.installedVersion || null, status: installed?.status || 'Unknown' }];
  }));
  const selectedModelFile = String(body.bindings?.['h3-model'] || '');
  const modelEntry = modelManifest.models.find((item) => item.id === body.model || item.relativePath.endsWith(selectedModelFile)) || null;
  const job = {
    id: `local_job_${crypto.randomUUID()}`,
    studioJobId: typeof body.studioJobId === 'string' ? body.studioJobId : null,
    candidateId: typeof body.candidateId === 'string' ? body.candidateId : null,
    projectId: body.projectId,
    sequenceId: body.sequenceId,
    sequenceNumber: Number(body.sequenceNumber || 0),
    target: body.target,
    status: 'Preparing',
    progress: 5,
    provider: 'ComfyUI',
    model: String(body.model || body.bindings?.['h3-model'] || (body.target === 'storyboard' ? 'Krea 2' : 'MiniMax H3')),
    resolution: body.resolution || null,
    durationSeconds: Number(body.durationSeconds || 0),
    seed: body.seed ?? null,
    steps: body.steps ?? null,
    references: Array.isArray(body.references) ? body.references : [],
    estimatedVramGb: body.estimatedVramGb ?? null,
    elapsedSeconds: 0,
    output: [],
    failure: null,
    retryCount: 0,
    checkpoint: body.checkpoint || null,
    workflowId: descriptor.id,
    workflowVersion: descriptor.version,
    workflowChecksum: descriptor.sha256,
    sourcePath,
    promptId: null,
    promptNumber: null,
    warnings: compiled.warnings,
    provenance: {
      runtimeVersion: apiDescription.version,
      comfyUI: Object.fromEntries(componentPins).comfyui,
      backendVersions: Object.fromEntries(componentPins),
      model: modelEntry ? { id: modelEntry.id, relativePath: modelEntry.relativePath, sha256: modelEntry.sha256 || null, license: modelEntry.license } : { id: body.model || null },
      workflow: { id: descriptor.id, version: descriptor.version, sha256: descriptor.sha256, sourceKind: descriptor.sourceKind },
      sampler: body.sampler || null,
      scheduler: body.scheduler || null,
      loras: Array.isArray(body.loras) ? body.loras : [],
      generatedAt: null,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    request: effectiveRequest,
    compiledPrompt: compiled.prompt,
  };
  jobs.set(job.id, job);
  await persistState();
  const submitted = await client.submit(compiled.prompt, {
    continuityStudio: {
      projectId: body.projectId,
      sequenceId: body.sequenceId,
      jobId: job.id,
      workflowId: descriptor.id,
      workflowChecksum: descriptor.sha256,
    },
  });
  job.promptId = submitted.prompt_id;
  job.promptNumber = submitted.number ?? null;
  job.status = 'Waiting for GPU';
  job.progress = 8;
  job.updatedAt = nowIso();
  await persistState();
  connectWebsocket();
  return publicJob(job);
}

async function runtimeJobAction(id, action, body = {}) {
  const job = jobs.get(id);
  if (!job) throw new Error('Runtime job not found.');
  if (action === 'approve') {
    if (job.status !== 'Needs Review') throw new Error('Only a reviewed result can be approved.');
    job.status = 'Approved';
  } else if (action === 'reject') {
    if (!['Needs Review', 'Approved'].includes(job.status)) throw new Error('Only a completed candidate can be rejected.');
    job.status = 'Rejected';
  } else if (action === 'pause') {
    if (job.promptId) {
      try { await client.removeQueued(job.promptId); } catch { await client.interrupt(); }
    }
    job.status = 'Paused';
    job.failure = 'Paused explicitly. Completed transactional checkpoints remain intact.';
  } else if (action === 'cancel') {
    if (job.promptId) {
      try { await client.removeQueued(job.promptId); } catch { await client.interrupt(); }
    }
    job.status = 'Cancelled';
    job.failure = 'Cancelled explicitly. Completed outputs and checkpoints were preserved.';
  } else if (action === 'retry' || action === 'resume') {
    if (!['Failed', 'Paused', 'Cancelled', 'Needs Review', 'Rejected'].includes(job.status)) throw new Error('This job is not at a safe retry boundary.');
    const bindings = { ...job.request.bindings, ...body.bindings };
    const replacement = await createRuntimeJob({ ...job.request, bindings, checkpoint: job.checkpoint, parentJobId: job.id });
    job.failure = `${action === 'resume' ? 'Resumed' : 'Retried'} as ${replacement.id}; this attempt remains immutable.`;
    job.updatedAt = nowIso();
    await persistState();
    return { job: publicJob(job), replacement };
  } else {
    throw new Error('Unknown runtime job action.');
  }
  job.updatedAt = nowIso();
  await persistState();
  return { job: publicJob(job) };
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
}

function respond(request, response, status, value) {
  response.writeHead(status, corsHeaders(request));
  response.end(JSON.stringify(value));
}

async function readJsonBody(request, maximum = 2_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximum) throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const apiDescription = {
  service: 'Continuity Studio Local Runtime Manager',
  version: '1.0.0',
  loopbackOnly: true,
  endpoints: {
    'GET /healthz': 'Compact service and ComfyUI health',
    'GET /v1/status': 'GPU, RAM, disk, engine, components, models, workflows, jobs and diagnostics',
    'GET /v1/components': 'Pinned component registry and install state',
    'GET /v1/models': 'Model manifest and local presence',
    'GET /v1/workflows': 'Workflow registry and compatibility findings',
    'GET /v1/jobs': 'Local production queue',
    'POST /v1/engine': 'start | stop | restart | test | diagnostics',
    'POST /v1/components': 'install | update | repair | test an allowlisted component',
    'POST /v1/models': 'Explicit checksum verification',
    'POST /v1/workflows': 'Validate a registered workflow with semantic bindings',
    'POST /v1/jobs': 'Submit a registered, validated workflow job',
    'POST /v1/jobs/:id/actions': 'approve | reject | pause | cancel | retry | resume',
  },
};

const startedAt = nowIso();
const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return respond(request, response, 403, { error: 'Origin not allowed.' });
  if (request.method === 'OPTIONS') return respond(request, response, 204, {});
  const url = new URL(request.url || '/', `http://127.0.0.1:${configuration.managerPort}`);
  try {
    if (request.method === 'GET' && url.pathname === '/') return respond(request, response, 200, apiDescription);
    if (request.method === 'GET' && url.pathname === '/healthz') {
      const health = await client.health();
      return respond(request, response, 200, { available: true, service: apiDescription.service, engine: health.connected ? 'Connected' : 'Not connected', comfyBaseUrl: configuration.comfyBaseUrl, error: health.error });
    }
    if (request.method === 'GET' && url.pathname === '/v1/status') return respond(request, response, 200, await runtimeStatus({ includeWorkflowValidation: url.searchParams.get('deep') === 'true' }));
    if (request.method === 'GET' && url.pathname === '/v1/components') return respond(request, response, 200, { components: await Promise.all(componentManifest.components.map(componentStatus)), operations: [...operations.values()] });
    if (request.method === 'GET' && url.pathname === '/v1/models') {
      const requiredModelIds = new Set(workflowManifest.workflows.flatMap((workflow) => workflow.requiredModels));
      const models = (await Promise.all(modelManifest.models.map(quickModelStatus))).map((model) => ({ ...model, required: requiredModelIds.has(model.id) }));
      return respond(request, response, 200, { models, hardwarePresets: modelManifest.hardwarePresets, operations: [...operations.values()].filter((item) => item.kind === 'model-verification') });
    }
    if (request.method === 'GET' && url.pathname === '/v1/workflows') {
      const health = await client.health();
      const objectInfo = health.connected ? await client.objectInfo() : null;
      return respond(request, response, 200, { workflows: await Promise.all(workflowManifest.workflows.map((workflow) => workflowStatus(workflow, objectInfo))) });
    }
    if (request.method === 'GET' && url.pathname === '/v1/jobs') return respond(request, response, 200, { jobs: [...jobs.values()].map(publicJob) });
    const outputMatch = request.method === 'GET' ? url.pathname.match(/^\/v1\/jobs\/([a-zA-Z0-9_-]+)\/output\/(\d+)$/) : null;
    if (outputMatch) {
      const job = jobs.get(outputMatch[1]);
      if (!job || !['Needs Review', 'Approved'].includes(job.status)) return respond(request, response, 404, { error: 'Completed runtime output not found.' });
      const output = job.output?.[Number(outputMatch[2])];
      if (!output || typeof output.filename !== 'string') return respond(request, response, 404, { error: 'Runtime output file not found.' });
      const query = new URLSearchParams({ filename: output.filename, type: output.type || 'output', subfolder: output.subfolder || '' });
      const upstream = await fetch(`${configuration.comfyBaseUrl}/view?${query}`);
      if (!upstream.ok || !upstream.body) return respond(request, response, 502, { error: `ComfyUI could not serve this output (HTTP ${upstream.status}).` });
      const outputHeaders = {
        ...corsHeaders(request),
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      };
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) outputHeaders['Content-Length'] = contentLength;
      response.writeHead(200, outputHeaders);
      for await (const chunk of upstream.body) response.write(chunk);
      response.end();
      return;
    }
    if (request.method === 'POST' && url.pathname === '/v1/engine') {
      const body = await readJsonBody(request);
      return respond(request, response, 200, await engineAction(body.action));
    }
    if (request.method === 'POST' && url.pathname === '/v1/components') {
      const body = await readJsonBody(request);
      return respond(request, response, 202, { operation: componentAction(body.id, body.action) });
    }
    if (request.method === 'POST' && url.pathname === '/v1/models') {
      const body = await readJsonBody(request);
      if (body.action !== 'verify') throw new Error('Model action must be verify.');
      return respond(request, response, 202, { operation: verifyModels(Array.isArray(body.ids) ? body.ids : []) });
    }
    if (request.method === 'POST' && url.pathname === '/v1/workflows') {
      const body = await readJsonBody(request);
      if (body.action !== 'validate') throw new Error('Workflow action must be validate.');
      const descriptor = workflowById(body.id);
      if (!descriptor) throw new Error('Unknown workflow ID.');
      const { sourcePath, workflow } = loadWorkflowTemplate(descriptor, configuration);
      if (!workflow) throw new Error('The registered workflow source is missing.');
      const effective = applySemanticBindings(workflow, descriptor, body.bindings || {});
      const objectInfo = await client.objectInfo();
      return respond(request, response, 200, { workflow: { ...descriptor, sourcePath, ...(await validateWorkflow(descriptor, effective, { sourcePath, objectInfo })) } });
    }
    if (request.method === 'POST' && url.pathname === '/v1/jobs') return respond(request, response, 201, { job: await createRuntimeJob(await readJsonBody(request)) });
    const actionMatch = request.method === 'POST' ? url.pathname.match(/^\/v1\/jobs\/([a-zA-Z0-9_-]+)\/actions$/) : null;
    if (actionMatch) {
      const body = await readJsonBody(request);
      return respond(request, response, 200, await runtimeJobAction(actionMatch[1], body.action, body));
    }
    return respond(request, response, 404, { error: 'Not found.' });
  } catch (error) {
    appendLog('api', error instanceof Error ? error.message : 'Unknown request error.');
    return respond(request, response, error?.statusCode || 400, { error: error instanceof Error ? error.message : 'The runtime request failed.' });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    process.stderr.write(`Continuity local runtime already appears to be running on 127.0.0.1:${configuration.managerPort}.\n`);
    process.exit(0);
  }
  throw error;
});

server.listen(configuration.managerPort, '127.0.0.1', () => {
  process.stdout.write(`Continuity local AI runtime listening on http://127.0.0.1:${configuration.managerPort}\n`);
  void client.health().then((health) => { if (health.connected) connectWebsocket(); });
});

const pollTimer = setInterval(() => void refreshJobs(), 2_500);
const elapsedTimer = setInterval(() => {
  for (const job of jobs.values()) {
    if (['Preparing', 'Waiting for GPU', 'Loading model', 'Generating', 'Decoding', 'Saving', 'Validating'].includes(job.status)) {
      job.elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1_000));
    }
  }
}, 1_000);

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(pollTimer);
  clearInterval(elapsedTimer);
  clearTimeout(websocketTimer);
  websocket?.close();
  await persistState();
  server.close();
  if (comfyProcess && !comfyProcess.killed) comfyProcess.kill('SIGTERM');
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
