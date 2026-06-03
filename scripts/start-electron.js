#!/usr/bin/env node

const { spawn } = require('child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, process.argv.slice(2), {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`${electron} exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
