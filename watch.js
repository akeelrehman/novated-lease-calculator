/**
 * watch.js — rebuilds app.html whenever any file under src/ changes.
 *
 * Uses Node's built-in fs.watch (no npm packages required).
 * A 150 ms debounce coalesces rapid saves (e.g. editor auto-format).
 *
 * Usage:  npm run watch   (or: node watch.js)
 * Stop:   Ctrl-C
 */

const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');

const WATCH_DIR = path.join(__dirname, 'src');
const DEBOUNCE  = 150; // ms

let timer = null;

function rebuild(changedFile) {
  const rel  = path.relative(__dirname, changedFile);
  const time = new Date().toLocaleTimeString('en-AU', { hour12: false });
  console.log(`\n[${time}] changed: ${rel}`);
  try {
    execSync('node build.js', { stdio: 'inherit', cwd: __dirname });
  } catch {
    // build.js already prints its own error; keep watching
  }
}

function schedule(filename) {
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(filename), DEBOUNCE);
}

// fs.watch with recursive:true works natively on macOS and Windows.
// On Linux you may need to install the 'chokidar-cli' package instead.
fs.watch(WATCH_DIR, { recursive: true }, (event, filename) => {
  if (!filename) return;
  const full = path.join(WATCH_DIR, filename);
  schedule(full);
});

console.log(`Watching src/ for changes — press Ctrl-C to stop.\n`);

// Run an initial build so the output is always fresh on startup.
rebuild(WATCH_DIR);
