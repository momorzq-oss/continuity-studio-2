import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const brain = spawn(process.execPath, ['scripts/continuity-codex-host.mjs'], { stdio: 'inherit', windowsHide: true });
const runtime = spawn(process.execPath, ['scripts/local-runtime-manager.mjs'], { stdio: 'inherit', windowsHide: true });
const web = spawn(npm, ['run', 'dev:web'], { stdio: 'inherit', windowsHide: true });

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  brain.kill();
  runtime.kill();
  web.kill();
  process.exitCode = code;
}

brain.on('exit', (code) => {
  if (!stopping && code && code !== 0) process.stderr.write(`Continuity Codex host exited with code ${code}; the web app can continue with its deterministic fallback.\n`);
});
runtime.on('exit', (code) => {
  if (!stopping && code && code !== 0) process.stderr.write(`Continuity local AI runtime exited with code ${code}; project planning can continue without local generation.\n`);
});
web.on('exit', (code) => stop(code ?? 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
