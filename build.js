/**
 * build.js — assembles app.html from src/ source files.
 *
 * CSS files are concatenated in order and replace the /* BUILD:CSS *\/ marker
 * inside the <style> block in src/template.html.
 *
 * JS files are concatenated in order and replace the /* BUILD:JS *\/ marker
 * inside the <script> block.
 *
 * Usage:  node build.js
 * Output: app.html (project root)
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = __dirname;
const SRC      = path.join(ROOT, 'src');
const TEMPLATE = path.join(SRC, 'template.html');
const OUT      = path.join(ROOT, 'app.html');

// ── CSS load order ──────────────────────────────────────────────────────────
const CSS_FILES = [
  'tokens.css',
  'base.css',
  'components.css',
].map(f => path.join(SRC, 'css', f));

// ── JS load order (dependency-safe: globals before callers) ─────────────────
const JS_FILES = [
  'config.js',
  'utils.js',
  'calculator.js',
  'renderer.js',
  'pdf.js',
  'export.js',
  'ui.js',
  'app.js',
].map(f => path.join(SRC, 'js', f));

// ── Helpers ──────────────────────────────────────────────────────────────────
function readAll(files) {
  return files.map(f => {
    if (!fs.existsSync(f)) {
      console.error(`  ✗ Missing: ${path.relative(ROOT, f)}`);
      process.exit(1);
    }
    return fs.readFileSync(f, 'utf8');
  }).join('\n\n');
}

// ── Build ────────────────────────────────────────────────────────────────────
console.log('Building app.html…\n');

let html = fs.readFileSync(TEMPLATE, 'utf8');

// Inline CSS
const css = readAll(CSS_FILES);
if (!html.includes('/* BUILD:CSS */')) {
  console.error('  ✗ Could not find /* BUILD:CSS */ marker in template.html');
  process.exit(1);
}
html = html.replace('/* BUILD:CSS */', css);
console.log(`  ✓ CSS inlined (${CSS_FILES.length} files, ${css.length} chars)`);

// Inline JS
const js = readAll(JS_FILES);
if (!html.includes('/* BUILD:JS */')) {
  console.error('  ✗ Could not find /* BUILD:JS */ marker in template.html');
  process.exit(1);
}
html = html.replace('/* BUILD:JS */', js);
console.log(`  ✓ JS  inlined (${JS_FILES.length} files, ${js.length} chars)`);

// Write output
fs.writeFileSync(OUT, html, 'utf8');
const lines = html.split('\n').length;
console.log(`\n  → app.html written (${lines} lines, ${(html.length / 1024).toFixed(1)} KB)`);
