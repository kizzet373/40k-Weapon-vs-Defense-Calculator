const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const samplePath = process.argv[2] || 'C:/Users/Kirkland/Downloads/11th Daemons.json';

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

const cappedDamageCheck = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D6 overkill', A: '6', skill: 'auto', S: '8', AP: '6', D: 'D6', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  ''
);
assert.ok(Math.abs(cappedDamageCheck.dmg - (55 / 6)) < 1e-9, 'normal D6 damage is capped per failed save into W2 models instead of spilling over');
assert.ok(Math.abs(context.window.WeaponCalc.expectedCappedDamage('D6', 2) - (11 / 6)) < 1e-9, 'expected capped dice damage uses the roll distribution');

app.addRoster(sample, '11th Daemons A');
assert.strictEqual(app.rosters.length, 1, 'loads NewRecruit roster');
assert.strictEqual(app.forces.length, 1, 'loads one force');
assert.strictEqual(app.units.length, 14, 'imports only roster units as top-level units');
assert.strictEqual(app.units.reduce((sum, unit) => sum + (Number(unit._points) || 0), 0), 2000, 'imports unit points including enhancements');

const greatUnclean = app.units.find(unit => unit.label === 'Great Unclean One');
assert.ok(greatUnclean, 'imports Great Unclean One');
assert.strictEqual(
  JSON.stringify({ T: greatUnclean.defense.T, Sv: greatUnclean.defense.Sv, Inv: greatUnclean.defense.Inv, W: greatUnclean.defense.W, models: greatUnclean.defense.models }),
  JSON.stringify({ T: 12, Sv: 5, Inv: 4, W: 20, models: 1 }),
  'parses NewRecruit Unit profile defense including InSv'
);
assert.strictEqual(greatUnclean._points, 285, 'adds enhancement points to the unit total');
assert.strictEqual(JSON.stringify(greatUnclean._enhancements.map(e => `${e.name}:${e.points}`)), JSON.stringify(['Mantle of Gloom (Aura):20']), 'imports paid enhancements');
assert.ok(greatUnclean.weapons.some(w => w.name === 'Bilesword - strike'), 'strips decorative profile arrows from weapon names');
assert.ok(greatUnclean.weapons.some(w => /Torrent/i.test(w.modifiers)), 'imports Keywords as weapon modifiers');

const bloodcrushers = app.units.find(unit => unit.label === 'Bloodcrushers');
assert.ok(bloodcrushers, 'imports Bloodcrushers');
assert.strictEqual(bloodcrushers.defense.models, 6, 'counts models from nested model selections');
assert.strictEqual(bloodcrushers._children.length, 6, 'keeps one nested model row per model under the unit');
assert.strictEqual(
  JSON.stringify(bloodcrushers._children.map(child => `${child.label}:${child.defense.models}`)),
  JSON.stringify(['Bloodhunter:1', 'Bloodcrusher 1:1', 'Bloodcrusher 2:1', 'Bloodcrusher 3:1', 'Bloodcrusher 4:1', 'Bloodcrusher 5:1']),
  'expands grouped regular models into individual child rows'
);
assert.ok(!app.units.some(unit => unit.label === 'Bloodhunter'), 'does not leak child models into top-level units');
assert.ok(bloodcrushers.weapons.some(w => w.name === "Juggernaut's bladed horn" && w._profileCount === 6 && /Extra Attacks/i.test(w.modifiers)), 'aggregates child weapon counts and extra attacks');
assert.strictEqual(Math.round(bloodcrushers._children.reduce((sum, child) => sum + (Number(child._points) || 0), 0)), bloodcrushers._points, 'allocates parent unit points into child model rows');
assert.ok(bloodcrushers._children.every(child => Math.abs(child._points - (bloodcrushers._points / 6)) < 1e-9), 'splits unassigned unit points evenly across same-size child models');

const mergeForce = app.forces[0];
assert.ok(context.window.ArmyImportService.mergeUnits(mergeForce, greatUnclean._unitKey, bloodcrushers._unitKey), 'allows manual unit merge');
const mergedUnits = app.collectUnits(mergeForce);
const mergedBloodcrushers = mergedUnits.find(unit => unit._unitKey === bloodcrushers._unitKey);
assert.ok(mergedBloodcrushers, 'keeps target unit after manual merge');
assert.ok(!mergedUnits.some(unit => unit._unitKey === greatUnclean._unitKey), 'removes source unit after manual merge');
assert.strictEqual(mergedBloodcrushers._points, 475, 'manual merge preserves and sums full unit points including enhancements');
assert.strictEqual(Math.round(mergedBloodcrushers._children.reduce((sum, child) => sum + (Number(child._points) || 0), 0)), mergedBloodcrushers._points, 'manual merge keeps displayed unit points as the sum of child model points');
assert.strictEqual(
  JSON.stringify((mergedBloodcrushers._enhancements || []).map(enh => `${enh.name}:${enh.points}`).sort()),
  JSON.stringify(['Mantle of Gloom (Aura):20', 'Soul-shattering Charge:10'].sort()),
  'manual merge preserves enhancements and upgrades from both merged units'
);
assert.ok(mergedBloodcrushers.abilities.some(name => /Gloam Rot/i.test(name)), 'manual merge preserves parent-level abilities from source units');
context.window.ArmyImportService.clearMerges(mergeForce);

const chosen = app.units.find(unit => unit.label === 'Chosen');
assert.ok(chosen, 'imports Chosen');
assert.strictEqual(chosen.defense.T, 4, 'derives parent defense from child model profiles when the parent lacks a Unit profile');
assert.strictEqual(chosen.defense.models, 5, 'counts mixed Chosen model selections');
assert.strictEqual(chosen._children.length, 5, 'keeps selected Chosen models as individual child rows');
assert.strictEqual(chosen._children.filter(child => /^Chosen w\/ combi-weapon and bolt pistol/.test(child.label)).length, 2, 'splits duplicate Chosen combi models into separate child rows');
assert.ok(chosen.weapons.some(w => w.name === 'Combi-weapon' && w._profileCount === 2), 'imports selected combi-weapon count');
assert.ok(chosen.weapons.some(w => w.name === 'Paired accursed weapons' && w._profileCount === 1), 'imports selected paired accursed weapons');

const havocs = app.units.filter(unit => unit.label === 'Havocs');
assert.strictEqual(havocs.length, 2, 'imports both Havoc squads separately');
assert.ok(havocs.some(unit => unit.weapons.some(w => w.name === 'Havoc reaper chaincannon' && w._profileCount === 4)), 'imports reaper chaincannon squad');
assert.ok(havocs.some(unit => unit.weapons.some(w => w.name === 'Havoc lascannon' && w._profileCount === 4)), 'imports lascannon squad');
havocs.forEach(unit => {
  assert.strictEqual(unit.defense.T, 5, 'derives Havoc parent defense from child model profiles');
  assert.strictEqual(unit._children.length, 5, 'splits each Havoc squad into one champion row and four regular model rows');
  assert.ok(unit._children.some(child => child.label === 'Havoc Champion' && child.weapons.some(w => w.name === 'Meltagun')), 'keeps Havoc champion wargear separate');
  assert.ok(unit.weapons.some(w => w.name === 'Power fist' && w._profileCount === 1), 'aggregates one champion power fist');
});

const partialPointsApp = context.weaponVsDefenseApp();
partialPointsApp.addRoster({
  schema: '40k-roster-matchup-import',
  rosterLabel: 'Partial points',
  forceName: 'Merged force',
  postMergeUnits: [{
    key: 'screamers-plus-fateskimmer',
    label: 'Screamers with Fateskimmer',
    points: 175,
    defense: { T: 4, Sv: 4, W: 3, models: 4, totalWounds: 14 },
    weapons: [],
    children: [
      { key: 'fateskimmer', label: 'Fateskimmer', points: 95, defense: { T: 6, Sv: 4, W: 5, models: 1 }, weapons: [] },
      { key: 'screamer-1', label: 'Screamer 1', points: 0, defense: { T: 4, Sv: 4, W: 3, models: 1 }, weapons: [] },
      { key: 'screamer-2', label: 'Screamer 2', points: 0, defense: { T: 4, Sv: 4, W: 3, models: 1 }, weapons: [] },
      { key: 'screamer-3', label: 'Screamer 3', points: 0, defense: { T: 4, Sv: 4, W: 3, models: 1 }, weapons: [] },
    ],
  }],
}, 'Partial points');
const partialUnit = partialPointsApp.units.find(unit => unit.label === 'Screamers with Fateskimmer');
assert.strictEqual(partialUnit._points, 175, 'partial point import keeps the parent total as the sum of child model points');
assert.strictEqual(partialUnit._children.find(child => child.label === 'Fateskimmer')._points, 95, 'partial point import preserves explicit child model points');
assert.ok(partialUnit._children.filter(child => /^Screamer/.test(child.label)).every(child => Math.abs(child._points - (80 / 3)) < 1e-9), 'partial point import splits remaining points across missing-cost models');

app.addRoster(sample, '11th Daemons B');
app.openMatchupModal();
assert.strictEqual(app.matchupAttackerUnits.length, 14, 'matchup modal uses imported NewRecruit attacker units');
assert.strictEqual(app.matchupDefenderUnits.length, 14, 'matchup modal uses imported NewRecruit defender units');
assert.strictEqual(app.matchup.rows.length, 14, 'builds one row per NewRecruit attacker unit');
assert.strictEqual(app.matchup.rows[0].cells.length, 14, 'builds one cell per NewRecruit defender unit');
const belakorRow = app.matchup.rows.find(row => row.unit.label === "Be'lakor");
assert.ok(belakorRow.cells.some(cell => /Betraying Shades - focused witchfire/.test(cell.weaponName)), 'grid reports selected NewRecruit weapon profiles');

const bloodcrushersAttacker = app.matchupAttackerUnits.find(unit => unit.label === 'Bloodcrushers');
const greatUncleanDefender = app.matchupDefenderUnits.find(unit => unit.label === 'Great Unclean One');
assert.ok(bloodcrushersAttacker, 'Bloodcrushers are available as matchup attackers');
assert.ok(greatUncleanDefender, 'Great Unclean One is available as a matchup defender');
const withStampede = app.computeMatchupCell(bloodcrushersAttacker, greatUncleanDefender);
assert.ok(/Brass Stampede mortal wounds/.test(withStampede.weaponName), 'Bloodcrushers charge mortal wounds are included in the melee profile text');
app.toggleUnitAbility(bloodcrushersAttacker, 'Brass Stampede');
const withoutStampede = app.computeMatchupCell(bloodcrushersAttacker, greatUncleanDefender);
assert.ok(Math.abs((withStampede.dmg - withoutStampede.dmg) - 6) < 1e-9, 'disabling Brass Stampede removes one expected mortal wound per Bloodcrusher model');
assert.ok(!/Brass Stampede mortal wounds/.test(withoutStampede.weaponName), 'disabled Brass Stampede is omitted from the profile text');
app.toggleUnitAbility(bloodcrushersAttacker, 'Brass Stampede');
app.matchup.showMelee = false;
const shootingOnlyBloodcrushers = app.computeMatchupCell(bloodcrushersAttacker, greatUncleanDefender);
assert.ok(!/Brass Stampede mortal wounds/.test(shootingOnlyBloodcrushers.weaponName), 'Brass Stampede respects the melee toggle');
app.matchup.showMelee = true;
const bloodcrusherChildCell = app.computeMatchupCell(bloodcrushersAttacker._children[0], greatUncleanDefender);
assert.ok(/Brass Stampede mortal wounds/.test(bloodcrusherChildCell.weaponName), 'Bloodcrusher child model rows inherit their per-model charge mortal wounds');

app.toggleUnitExpanded(bloodcrushersAttacker);
const expandedBloodcrusherRows = app.matchupVisibleRows().filter(row => row.unit.label === 'Bloodcrushers' || /^Bloodhunter$|^Bloodcrusher \d+$/.test(row.unit.label));
const bloodcrusherParentScore = Number(app.matchupHeaderScore(expandedBloodcrusherRows.find(row => !row.isChild).unit, 'attacker'));
const bloodcrusherChildScores = expandedBloodcrusherRows.filter(row => row.isChild).map(row => Number(app.matchupHeaderScore(row.unit, 'attacker')));
assert.ok(bloodcrusherParentScore >= Math.min(...bloodcrusherChildScores) && bloodcrusherParentScore <= Math.max(...bloodcrusherChildScores), 'aggregate attacker score stays within the point-weighted child model score range');
app.toggleUnitExpanded(bloodcrushersAttacker);

assert.strictEqual(app.isUnitEnhancementEnabled(greatUncleanDefender, 'Mantle of Gloom (Aura)'), true, 'enhancements default to enabled');
app.toggleUnitEnhancement(greatUncleanDefender, 'Mantle of Gloom (Aura)');
assert.strictEqual(app.isUnitEnhancementEnabled(greatUncleanDefender, 'Mantle of Gloom (Aura)'), false, 'enhancement toggles persist in unit state');
app.toggleUnitEnhancement(greatUncleanDefender, 'Mantle of Gloom (Aura)');
assert.strictEqual(app.isUnitEnhancementEnabled(greatUncleanDefender, 'Mantle of Gloom (Aura)'), true, 'enhancement toggles can be turned back on');

const greatUncleanColumn = app.matchupVisibleDefenders().find(col => col.unit.label === 'Great Unclean One');
app.sortMatchupByColumn(greatUncleanColumn.unit);
const sortedRows = app.matchupVisibleRows();
const columnValues = sortedRows.map(row => app.matchupCellMetric(app.cachedMatchupCell(row.unit, greatUncleanColumn.unit)));
for(let i = 1; i < columnValues.length; i++){
  assert.ok(columnValues[i - 1] >= columnValues[i], 'column header sort orders attacker rows by displayed metric descending');
}
const firstRow = app.matchupVisibleRows()[0];
app.sortMatchupByRow(firstRow.unit);
const rowValues = app.matchupVisibleDefenders().map(col => app.matchupCellMetric(app.cachedMatchupCell(firstRow.unit, col.unit)));
for(let i = 1; i < rowValues.length; i++){
  assert.ok(rowValues[i - 1] >= rowValues[i], 'row header sort orders defender columns by displayed metric descending');
}
app.matchupVisibleRows().slice(0, 3).forEach(row => {
  app.matchupVisibleDefenders().slice(0, 3).forEach((col, colIndex) => {
    assert.strictEqual(row.cells[colIndex], app.cachedMatchupCell(row.unit, col.unit), 'visible cells stay paired with their sorted row and column units');
    assert.strictEqual(
      app.matchupCellStyle(row.cells[colIndex]),
      context.window.MatchupEngine.colorForValue(app.matchupCellMetric(row.cells[colIndex]), app.matchupMetricRange()),
      'visible cell color is refreshed for its displayed metric and sorted position'
    );
  });
});

app.sortMatchupAlphabetical();
assert.strictEqual(app.matchupVisibleRows()[0].unit.label, "Be'lakor", 'top-left sort alphabetizes attacker rows');
assert.strictEqual(app.matchupVisibleDefenders()[0].unit.label, "Be'lakor", 'top-left sort alphabetizes defender columns');

const noWeapon = {
  label: 'No Weapon Unit',
  _unitKey: 'no-weapon-unit',
  _viewKey: 'attacker:test:no-weapon-unit',
  weapons: [],
  defense: { T:4, Sv:3, W:2, models:1, totalWounds:2 },
};
app.matchupAttackerUnits = [noWeapon, ...app.matchupAttackerUnits];
app.matchup.rows = [
  { unit: noWeapon, cells: app.matchupDefenderUnits.map(() => context.window.MatchupEngine.emptyCell()) },
  ...app.matchup.rows,
];
app.seedAggregateCellCache();
app.applyMatchupSorting();
assert.ok(!app.matchupVisibleRows().some(row => row.unit.label === 'No Weapon Unit'), 'hides attacker rows with no weapon profiles');

console.log('newrecruit-import tests passed');
