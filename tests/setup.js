/**
 * Test setup: loads the pure calculation source files into a shared VM context.
 *
 * utils.js + config.js + calculator.js are concatenated into one script so that
 * const/let declarations (fmtAUD, ATO_RES, etc.) are in the same lexical scope
 * as the functions that reference them — matching how the browser bundles them.
 *
 * Exported properties include all function-keyword declarations:
 *   mRate, pmt, getFbt, calcYear, runScenario, parseDate, addMonths
 */
const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const SRC   = path.resolve(__dirname, '../src/js');
const files = ['utils.js', 'config.js', 'calculator.js'];
const code  = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');

const sandbox = { Intl, Math, Date, console };
vm.createContext(sandbox);
new vm.Script(code).runInContext(sandbox);

module.exports = sandbox;
