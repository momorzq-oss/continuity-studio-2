import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(runtimeDirectory, '..');

function readManifest(name) {
  return JSON.parse(readFileSync(join(runtimeDirectory, 'manifests', name), 'utf8'));
}

export const componentManifest = readManifest('components.json');
export const modelManifest = readManifest('models.json');
export const workflowManifest = readManifest('workflows.json');

export function runtimeConfiguration(environment = process.env) {
  const localData = environment.LOCALAPPDATA || join(homedir(), '.local', 'share');
  const runtimeRoot = resolve(environment.CONTINUITY_RUNTIME_ROOT || join(localData, 'ContinuityStudio2', 'engine'));
  const comfyRoot = resolve(environment.CONTINUITY_COMFYUI_ROOT || join(runtimeRoot, 'ComfyUI'));
  const comfyPort = boundedPort(environment.CONTINUITY_COMFYUI_PORT, 8188);
  const managerPort = boundedPort(environment.CONTINUITY_RUNTIME_PORT, 4318);
  const comfyBaseUrl = safeLoopbackUrl(environment.CONTINUITY_COMFYUI_URL || `http://127.0.0.1:${comfyPort}`);
  return {
    runtimeRoot,
    comfyRoot,
    comfyPort,
    managerPort,
    comfyBaseUrl,
    pythonBinary: environment.CONTINUITY_PYTHON || 'python',
    workflowSourcePath: environment.CONTINUITY_WORKFLOW_PATH || '',
  };
}

function boundedPort(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : fallback;
}

export function safeLoopbackUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('The ComfyUI endpoint must be an HTTP loopback URL.');
  }
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function componentById(id) {
  return componentManifest.components.find((component) => component.id === id) || null;
}

export function modelById(id) {
  return modelManifest.models.find((model) => model.id === id) || null;
}

export function workflowById(id) {
  return workflowManifest.workflows.find((workflow) => workflow.id === id) || null;
}

export function componentInstallPath(component, configuration = runtimeConfiguration()) {
  if (component.id === 'comfyui') return configuration.comfyRoot;
  if (component.kind !== 'custom-node') return null;
  const leaf = basename(component.installDirectory || component.id);
  return resolve(configuration.comfyRoot, 'custom_nodes', leaf);
}

export function modelInstallPath(model, configuration = runtimeConfiguration()) {
  return resolve(configuration.comfyRoot, ...model.relativePath.split('/'));
}

export function assertPathInside(candidate, parent, label = 'path') {
  const resolvedCandidate = resolve(candidate);
  const resolvedParent = resolve(parent);
  const relation = relative(resolvedParent, resolvedCandidate);
  if (!relation || relation === '.') return resolvedCandidate;
  if (relation.startsWith(`..${sep}`) || relation === '..' || isAbsolute(relation)) {
    throw new Error(`${label} must stay inside ${resolvedParent}.`);
  }
  return resolvedCandidate;
}

export function resolveWorkflowSource(workflow, configuration = runtimeConfiguration()) {
  const candidates = [
    configuration.workflowSourcePath,
    join(projectRoot, 'runtime', 'workflows', workflow.sourceFileName),
    workflow.sourcePathHint,
  ].filter(Boolean).map((value) => resolve(value));
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const details = statSync(candidate);
    if (!details.isFile() || details.size > 5_000_000 || !candidate.toLowerCase().endsWith('.json')) continue;
    return candidate;
  }
  return null;
}

export function sha256File(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolvePromise(hash.digest('hex')));
  });
}

export function staticRegistrySummary(configuration = runtimeConfiguration()) {
  return {
    configuration: {
      runtimeRoot: configuration.runtimeRoot,
      comfyRoot: configuration.comfyRoot,
      comfyBaseUrl: configuration.comfyBaseUrl,
      managerPort: configuration.managerPort,
    },
    components: componentManifest.components,
    models: modelManifest.models,
    workflows: workflowManifest.workflows.map((workflow) => ({
      ...workflow,
      resolvedSourcePath: resolveWorkflowSource(workflow, configuration),
    })),
  };
}
