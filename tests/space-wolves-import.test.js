const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const samplePath = process.argv[2] || 'C:/Users/Kirkland/Downloads/space_wolves_2k_2care_roster_structure.json';

const context = {
  console,
  window: {},
  queueMicrotask: fn => fn(),
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  parseFloat,
  parseInt,
  setTimeout,
  clearTimeout,
  alert: message => { throw new Error(String(message)); },
};
context.global = context;
context.window = context;

vm.createContext(context);
['calculator-core.js', 'matchup-engine.js', 'army-import.js', 'utilities.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const app = context.weaponVsDefenseApp();

app.addRoster(sample, 'Space Wolves');
assert.strictEqual(app.rosters[0].data._sourceFormat, 'newrecruit-roster', 'recognizes BattleScribe-shaped roster even with a custom generatedBy string');
assert.strictEqual(app.units.length, 15, 'imports all Space Wolves top-level units');

const unitKeys = app.units.map(unit => unit._unitKey);
assert.ok(unitKeys.every(Boolean), 'assigns stable unit keys for every imported unit');
assert.strictEqual(new Set(unitKeys).size, unitKeys.length, 'unit keys are unique even when labels repeat');
assert.ok(app.units.some(unit => unit.label === 'Arjac Rockfist'), 'imports character models before Wolf Scouts');
assert.ok(app.units.some(unit => unit.label === 'Wolf Scouts'), 'imports Wolf Scouts');
assert.strictEqual(app.units.filter(unit => unit.label === 'Wolf Guard Battle Leader').length, 2, 'keeps separately configured duplicate-named leaders as separate units');

const assaultTerminators = app.units.find(unit => unit.label === 'Terminator Assault Squad');
assert.ok(assaultTerminators, 'imports Terminator Assault Squad');
assert.ok((assaultTerminators._enhancements || []).some(enh => enh.name === 'Thirst For Glory' && enh.points === 15), 'imports enhancements from this roster structure');

const inceptors = app.units.find(unit => unit.label === 'Inceptor Squad');
assert.ok(inceptors._children.every(child => child.weapons.length > 0), 'Inceptor expanded model rows have weapon profiles');
const wolfScouts = app.units.find(unit => unit.label === 'Wolf Scouts');
assert.ok(wolfScouts._children.every(child => child.weapons.length > 0), 'Wolf Scout expanded model rows have weapon profiles');
const assaultTerminatorsWithWeapons = app.units.find(unit => unit.label === 'Terminator Assault Squad');
assert.ok(assaultTerminatorsWithWeapons._children.every(child => child.weapons.length > 0), 'Assault Terminator expanded model rows have weapon profiles');
const headtakers = app.units.filter(unit => unit.label === 'Wolf Guard Headtakers');
assert.ok(headtakers.every(unit => unit._children.every(child => child.weapons.length > 0)), 'Headtaker expanded model rows have weapon profiles');
const wolfTerminators = app.units.filter(unit => unit.label === 'Wolf Guard Terminators');
assert.ok(wolfTerminators.every(unit => unit._children.every(child => child.weapons.length > 0)), 'Wolf Guard Terminator expanded model rows have weapon profiles');
assert.ok(wolfTerminators.some(unit => unit._children.some(child => child.label !== 'Wolf Guard Terminator Pack Leader' && child.defense.W === 4)), 'Wolf Guard Terminator storm shield rows use the W4 profile');

app.openMatchupModal();
assert.strictEqual(app.matchup.metric, 'modelWounds', 'Damage % is selected by default in the matchup grid');
const mergeOptions = app.mergeOptionsForSide('attacker');
assert.strictEqual(mergeOptions.length, 15, 'merge dropdown source contains every imported unit');
assert.strictEqual(new Set(mergeOptions.map(unit => unit._unitKey)).size, 15, 'merge dropdown options have unique values');
assert.ok(mergeOptions[0].label !== 'Wolf Scouts', 'merge dropdown is not collapsed down to only the final imported unit');
assert.strictEqual(app.mergeOptionLabel(app.units.find(unit => unit.label === 'Arjac Rockfist')), 'Arjac Rockfist (1)', 'merge option labels show model count for single models');
assert.strictEqual(app.mergeOptionLabel(wolfScouts), 'Wolf Scouts (6)', 'merge option labels show model count for units');
assert.strictEqual(app.mergeOptionLabel(app.units.find(unit => unit.label === 'Wolf Guard Terminators' && unit.defense.models === 10)), 'Wolf Guard Terminators (10)', 'merge option labels show larger model counts');

const arjac = app.matchupDefenderUnits.find(unit => unit.label === 'Arjac Rockfist');
assert.ok(app.cachedMatchupCell(inceptors, arjac).dmg > 0, 'Inceptor parent matchup uses child model weapons');
assert.ok(app.cachedMatchupCell(wolfScouts, arjac).dmg > 0, 'Wolf Scout parent matchup uses child model weapons');
assert.ok(app.cachedMatchupCell(assaultTerminatorsWithWeapons, arjac).dmg > 0, 'Assault Terminator parent matchup uses child model weapons');
assert.ok(headtakers.every(unit => app.cachedMatchupCell(unit, arjac).dmg > 0), 'Headtaker parent matchups use child model weapons');
assert.ok(wolfTerminators.every(unit => app.cachedMatchupCell(unit, arjac).dmg > 0), 'Wolf Guard Terminator parent matchups use child model weapons');

const tsv = app.matchupGridTsv();
const tsvLines = tsv.split('\n');
assert.ok(tsvLines.length > 1, 'copy grid TSV includes a header and body rows');
assert.ok(tsvLines[0].startsWith('Attacker \\ Defender\t'), 'copy grid TSV starts with the top-left header and tab-delimited defender headers');
assert.strictEqual(tsvLines[0].split('\t').length, app.matchupVisibleDefenders().length + 1, 'copy grid TSV has one column per visible defender plus row header');
assert.ok(tsvLines.some(line => /Wolf Scouts/.test(line) && /Plasma/.test(line)), 'copy grid TSV includes visible unit rows and weapon profile text');
assert.ok(tsvLines.every(line => line.split('\t').every(cell => !/\r|\n/.test(cell))), 'copy grid TSV keeps individual cells single-line for Excel paste');

console.log('space-wolves-import tests passed');
