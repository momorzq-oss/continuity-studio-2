import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const projectRoot = resolve(process.cwd());
const outputSchema = JSON.parse(readFileSync(resolve(projectRoot, 'lib/studio-brain-schema.json'), 'utf8'));
const port = Number(process.env.CONTINUITY_CODEX_PORT || 4317);
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.CONTINUITY_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
]);

let nextRequestId = 1;
let initialized = false;
let startupError = '';
const pending = new Map();
const turns = new Map();
const completedTurns = new Map();
const turnText = new Map();

const codex = spawn(process.env.CONTINUITY_CODEX_BIN || 'codex', ['app-server'], {
  cwd: projectRoot,
  env: process.env,
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});

codex.stderr.setEncoding('utf8');
codex.stderr.on('data', (chunk) => {
  startupError = `${startupError}${chunk}`.slice(-4000);
});
codex.on('error', (error) => {
  startupError = error.message;
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
});
codex.on('exit', (code) => {
  const error = new Error(`Codex app-server stopped with exit code ${code ?? 'unknown'}. ${startupError}`.trim());
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
  for (const waiter of turns.values()) waiter.reject(error);
  turns.clear();
});

function send(message) {
  codex.stdin.write(`${JSON.stringify(message)}\n`);
}

function rpc(method, params, timeoutMs = 30000) {
  const id = nextRequestId++;
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out.`));
    }, timeoutMs);
    pending.set(id, {
      resolve(value) { clearTimeout(timer); resolvePromise(value); },
      reject(error) { clearTimeout(timer); reject(error); },
    });
    send({ method, id, params });
  });
}

function completedText(turn) {
  return [...(turn?.items || [])].reverse().find((item) => item.type === 'agentMessage')?.text || '';
}

createInterface({ input: codex.stdout }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (Object.hasOwn(message, 'id')) {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message || JSON.stringify(message.error)));
    else waiter.resolve(message.result);
    return;
  }
  if (message.method === 'turn/completed') {
    const turn = message.params?.turn;
    const finalText = completedText(turn) || turnText.get(turn?.id) || '';
    turnText.delete(turn?.id);
    const waiter = turns.get(turn?.id);
    if (!waiter) {
      if (turn?.id) completedTurns.set(turn.id, { turn, text: finalText });
      return;
    }
    turns.delete(turn.id);
    if (turn.status === 'failed') waiter.reject(new Error(turn.error?.message || 'Codex reasoning failed.'));
    else waiter.resolve(finalText);
    return;
  }
  if (message.method === 'item/agentMessage/delta' && message.params?.turnId) {
    turnText.set(message.params.turnId, `${turnText.get(message.params.turnId) || ''}${message.params.delta || ''}`);
  }
});

const developerInstructions = `You are the private filmmaking reasoning brain for Continuity Studio 2. You do not edit files, run commands, browse, call tools, or mutate project state. Return only the JSON object required by the supplied output schema.

For project-blueprint mode, reason from the entire movie idea. Produce original, production-specific story structure, World Bible, Film Bible, a comprehensive visual asset discovery manifest, and one exact 30-second planning unit per sequence (the final unit may be shorter). Discover every visually distinct production element actually required by the story: main and secondary characters, costumes and meaningful costume states, locations, connected interiors, environments and weather states, furniture, props, hero objects, vehicles, animals, creatures, transformations, damage states, mechanical systems, lighting states, and visual effects. Do not invent separate audio assets. Dialogue, ambience, sound effects, music, and silence belong only in scenario and Film Bible instructions for Seedance. Put the protagonist first in the Characters category. Asset names must be unique. Do not create separate assets for camera angles or panels of one reference sheet. Use sequence numbers to express dependencies.

For command mode, translate the user's natural language into one terse canonical command that the deterministic production engine can validate. Use the engine's established command vocabulary instead of prose. Examples: "Continue"; "Automatic Production"; "Master Approval"; "Manual Approval"; "Approve story"; "Approve World Bible"; "Approve Film Bible"; "Approve all assets"; "Create the master character sheet"; "Show Sequence 2"; "Generate Sequence 1"; "Confirm generation for Sequence 1"; "Validate Sequence 1"; "Approve Sequence 1"; "What is missing?"; "Repair this project"; "Export all assets"; "Export full project"; "Regenerate Asset 007"; "Replace Asset 007 reference"; "Change dialogue in Sequence 2: CHARACTER_001 says 'exact line' from 4 to 7 seconds". For a planning-only request, use "Continue" and never add render/generate language. Do not include a project ID or explanatory prose in canonicalCommand. Preserve permanent asset numbers, version intent, sequence numbers, dialogue wording, and explicit paid-generation boundaries. Never claim an action was completed. The engine and database decide what is legal and what actually changes.`;

async function initialize() {
  await rpc('initialize', {
    clientInfo: { name: 'continuity-studio-2', title: 'Continuity Studio 2', version: '1.0.0' },
    capabilities: { experimentalApi: true },
  });
  send({ method: 'initialized', params: {} });
  initialized = true;
}

const initializedPromise = initialize().catch((error) => {
  startupError = error.message;
  throw error;
});

async function reason(payload) {
  await initializedPromise;
  const mode = payload?.mode === 'project-blueprint' ? 'project-blueprint' : 'command';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (!message) throw new Error('A movie idea or instruction is required.');
  const threadParams = {
    cwd: projectRoot,
    approvalPolicy: 'never',
    sandbox: 'read-only',
    developerInstructions,
    ephemeral: true,
    serviceName: 'continuity-studio-brain',
  };
  if (process.env.CONTINUITY_CODEX_MODEL) threadParams.model = process.env.CONTINUITY_CODEX_MODEL;
  const started = await rpc('thread/start', threadParams, 60000);
  const prompt = mode === 'project-blueprint'
    ? `MODE: project-blueprint\nMOVIE IDEA:\n${message}\n\nBuild the complete structured filmmaking blueprint. The output must contain blueprint and canonicalCommand must be null.`
    : `MODE: command\nUSER INSTRUCTION:\n${message}\n\nAUTHORITATIVE PROJECT CONTEXT:\n${JSON.stringify(payload?.project || {})}\n\nInterpret the instruction as a canonical engine command. The output must set blueprint to null.`;
  const turnStarted = await rpc('turn/start', {
    threadId: started.thread.id,
    input: [{ type: 'text', text: prompt, text_elements: [] }],
    approvalPolicy: 'never',
    effort: process.env.CONTINUITY_CODEX_EFFORT || 'medium',
    outputSchema,
  }, 60000);
  return new Promise((resolvePromise, reject) => {
    const alreadyCompleted = completedTurns.get(turnStarted.turn.id);
    if (alreadyCompleted) {
      completedTurns.delete(turnStarted.turn.id);
      if (alreadyCompleted.turn.status === 'failed') reject(new Error(alreadyCompleted.turn.error?.message || 'Codex reasoning failed.'));
      else {
        try { resolvePromise(JSON.parse(alreadyCompleted.text)); }
        catch (error) { reject(error); }
      }
      return;
    }
    const timer = setTimeout(() => {
      turns.delete(turnStarted.turn.id);
      reject(new Error('Codex filmmaking reasoning timed out.'));
    }, Number(process.env.CONTINUITY_CODEX_TIMEOUT_MS || 240000));
    turns.set(turnStarted.turn.id, {
      resolve(value) {
        clearTimeout(timer);
        try { resolvePromise(JSON.parse(value)); }
        catch (error) { reject(error); }
      },
      reject(error) { clearTimeout(timer); reject(error); },
    });
  });
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
}

function respond(response, status, value) {
  response.writeHead(status, corsHeaders(response.req));
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  response.req = request;
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return respond(response, 403, { error: 'Origin not allowed.' });
  if (request.method === 'OPTIONS') return respond(response, 204, {});
  if (request.method === 'GET' && request.url === '/healthz') {
    return respond(response, initialized ? 200 : 503, { available: initialized, source: 'Codex app-server', signedInThrough: 'Codex desktop/CLI', error: initialized ? null : startupError || 'Starting' });
  }
  if (request.method !== 'POST' || request.url !== '/v1/reason') return respond(response, 404, { error: 'Not found.' });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) return respond(response, 413, { error: 'Reasoning request is too large.' });
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result = await reason(payload);
    return respond(response, 200, { result });
  } catch (error) {
    return respond(response, 502, { error: error instanceof Error ? error.message : 'Codex reasoning failed.' });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    process.stderr.write(`Continuity Codex host already appears to be running on 127.0.0.1:${port}.\n`);
    codex.kill();
    process.exit(0);
  }
  throw error;
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Continuity Codex brain listening on http://127.0.0.1:${port}\n`);
});

function shutdown() {
  server.close();
  codex.kill();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
