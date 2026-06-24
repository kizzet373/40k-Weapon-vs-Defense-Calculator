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

const loadedLabel = app.addRoster(sample, 'Space Wolves');
assert.strictEqual(loadedLabel, '2k 2care', 'addRoster returns the imported roster name');
assert.strictEqual(app.rosters[0].data._sourceFormat, 'newrecruit-roster', 'recognizes BattleScribe-shaped roster even with a custom generatedBy string');
assert.strictEqual(app.units.length, 15, 'imports all Space Wolves top-level units');

const importApp = context.weaponVsDefenseApp();
importApp.jsonPaste = JSON.stringify(sample);
importApp.loadPastedRoster();
assert.strictEqual(importApp.importStatus.type, 'success', 'pasted army import sets a success status');
assert.ok(/successfully imported 2k 2care/.test(importApp.importStatus.text), 'pasted army import status names the imported roster');

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
assert.ok(/^\(\d+ pts\) - Score: \d+$/.test(app.matchupHeaderMeta(wolfScouts, 'attacker')), 'attacker header meta includes points and whole-number calibrated score');
assert.ok(/^\(\d+ pts\) - Score: \d+$/.test(app.matchupHeaderMeta(arjac, 'defender')), 'defender header meta includes points and whole-number calibrated score');
const wolfScoutRow = app.matchupVisibleRows().find(row => row.unit.label === 'Wolf Scouts');
const wolfScoutAvgMetric = wolfScoutRow.cells.reduce((sum, cell) => sum + app.matchupCellMetric(cell), 0) / wolfScoutRow.cells.length;
const expectedWolfScoutScore = Math.round((wolfScoutAvgMetric / 95) * app.efficiencyScoreMultiplier('attacker'));
assert.strictEqual(Math.round(app.matchup.scoreMaps.attackers[app.unitKey(wolfScoutRow.unit)]), expectedWolfScoutScore, 'attacker score uses calibrated displayed metric per point');
const arjacColIndex = app.matchupVisibleDefenders().findIndex(col => col.unit.label === 'Arjac Rockfist');
const arjacAvgIncoming = app.averageFinite(app.matchupVisibleRows().map(row => app.matchupCellMetric(row.cells[arjacColIndex])));
const expectedArjacScore = Math.round((1 / (arjacAvgIncoming * 105)) * app.efficiencyScoreMultiplier('defender'));
assert.strictEqual(Math.round(app.matchup.scoreMaps.defenders[app.unitKey(arjac)]), expectedArjacScore, 'defender score uses calibrated durability per point');
assert.strictEqual(app.matchupWeaponTypeSummary(wolfScouts), 'melee / shoot', 'attacker header weapon summary shows only weapon types');
assert.ok(/ - /.test(app.matchupDefenseHeaderLabel(arjac)), 'defender header defense summary uses dash-separated statlines');

const tsv = app.matchupGridTsv();
const tsvLines = tsv.split('\n');
assert.ok(tsvLines.length > 1, 'copy grid TSV includes a header and body rows');
assert.ok(tsvLines[0].startsWith('Attacker \\ Defender\t'), 'copy grid TSV starts with the top-left header and tab-delimited defender headers');
assert.strictEqual(tsvLines[0].split('\t').length, app.matchupVisibleDefenders().length + 1, 'copy grid TSV has one column per visible defender plus row header');
assert.ok(tsvLines.some(line => /Wolf Scouts/.test(line) && /Plasma/.test(line)), 'copy grid TSV includes visible unit rows and weapon profile text');
assert.ok(/Score: \d+/.test(tsvLines[0]) && /Score: \d+/.test(tsvLines.find(line => /Wolf Scouts/.test(line)) || ''), 'copy grid TSV includes score values in row and column headers');
assert.ok(tsvLines.some(line => /\d+(?:\.\d+)?%? - [^\t]+/.test(line)), 'copy grid TSV separates display values from weapon profile details');
assert.ok(tsvLines.every(line => line.split('\t').every(cell => !/\r|\n/.test(cell))), 'copy grid TSV keeps individual cells single-line for Excel paste');

const collapsedExcelHtml = app.matchupGridHtml('excel');
assert.ok(!/Wolf Scout Pack Leader/.test(collapsedExcelHtml), 'Excel detailed export omits collapsed inner model rows');
const matchupWolfScouts = app.matchupAttackerUnits.find(unit => unit.label === 'Wolf Scouts');
app.toggleUnitExpanded(matchupWolfScouts);
const matchupWolfScoutsDefender = app.matchupDefenderUnits.find(unit => unit.label === 'Wolf Scouts');
app.toggleUnitExpanded(matchupWolfScoutsDefender);
const visibleExport = app.matchupGridTsv('visible');
assert.ok(/Wolf Scout Pack Leader/.test(visibleExport), 'visible grid export follows expanded onscreen inner model rows');
const fullExport = app.matchupGridTsv('full');
assert.strictEqual(fullExport, visibleExport, 'legacy full grid export aliases the displayed visible grid');
const excelHtml = app.matchupGridHtml('excel');
assert.ok(/<table/i.test(excelHtml), 'Excel detailed export emits an HTML table');
assert.ok(/Wolf Scout Pack Leader/.test(excelHtml), 'Excel detailed export includes expanded visible inner model rows');
assert.ok(/Score: \d+/.test(excelHtml), 'Excel detailed export includes score values in unit headers');
assert.ok(/cellNote"> - /i.test(excelHtml), 'Excel detailed export separates display values from weapon profile details');
assert.ok(/background-color:#[0-9a-f]{6}/i.test(excelHtml), 'Excel detailed export includes inline hex cell background colors');
assert.ok(/<col[^>]*mso-outline-level:2/i.test(excelHtml), 'Excel detailed export includes outline hints for expanded child columns');
assert.ok(/<tr[^>]*mso-outline-level:2/i.test(excelHtml), 'Excel detailed export includes outline hints for expanded child rows');
assert.ok(!/display:none/i.test(excelHtml), 'Excel detailed export does not include hidden collapsed inner models');
const excelTsv = app.matchupGridTsv('excel');
assert.ok(/Wolf Scout Pack Leader/.test(excelTsv), 'Excel detailed TSV fallback uses the same visible expanded grid as the HTML export');
assert.ok(excelTsv.includes(' - '), 'Excel detailed TSV fallback keeps the value/profile separator');

const exportOptions = app.matchupExportOptions();
assert.ok(!exportOptions.some(option => option.label === 'Matchup Import'), 'copy/export menus do not include a generic Matchup Import option');
assert.ok(!exportOptions.some(option => option.label === 'Full Grid'), 'copy/export menus do not offer a separate hidden full-grid mode');
assert.ok(exportOptions.some(option => option.label === '2k 2care import'), 'copy/export menus include a roster-specific import option');
const rosterImportPayload = JSON.parse(app.matchupExportText('import:attacker'));
assert.strictEqual(rosterImportPayload.schema, '40k-roster-matchup-import', 'roster import export identifies its schema');
assert.strictEqual(rosterImportPayload.rosterLabel, '2k 2care', 'roster import export names the roster');
assert.ok(rosterImportPayload.sourceRoster, 'roster import export includes the source roster');
assert.ok(rosterImportPayload.postMergeUnits.length > 0, 'roster import export includes post-merge units');

const attackerForce = app.forceForMatchupSide('attacker');
const arjacSource = app.units.find(unit => unit.label === 'Arjac Rockfist');
assert.ok(context.window.ArmyImportService.mergeUnits(attackerForce, arjacSource._unitKey, wolfScouts._unitKey), 'can create a manual merge before exporting roster import');
app.rebuildMatchup();
const mergedRosterImport = JSON.parse(app.matchupExportText('import:attacker'));
assert.ok(mergedRosterImport.manualMerges.some(merge => merge.from === arjacSource._unitKey && merge.to === wolfScouts._unitKey), 'roster import export includes manual merge metadata');
const exportedMergedScouts = mergedRosterImport.postMergeUnits.find(unit => unit.key === wolfScouts._unitKey);
assert.ok(exportedMergedScouts.children.some(child => child.label === 'Arjac Rockfist'), 'roster import export includes manually merged units in post-merge units');

assert.ok(context.window.ArmyImportService.unmergeUnit(attackerForce, wolfScouts._unitKey), 'unmerge removes manual merge records for the selected target unit');
app.rebuildMatchup();
assert.ok(app.matchupAttackerBaseUnits.some(unit => unit.label === 'Arjac Rockfist'), 'unmerge restores manually merged units as separate top-level units');
assert.ok(!app.matchupAttackerBaseUnits.find(unit => unit._unitKey === wolfScouts._unitKey)._children.some(child => child.label === 'Arjac Rockfist'), 'unmerge removes the merged child from the target unit');

const roundTripApp = context.weaponVsDefenseApp();
roundTripApp.addRoster(mergedRosterImport, 'Round trip import');
assert.strictEqual(roundTripApp.rosters[0].data._sourceFormat, 'matchup-roster-import', 'roster import export can be imported back into the app');
const roundTripScouts = roundTripApp.units.find(unit => unit.label === 'Wolf Scouts');
assert.ok(roundTripScouts, 'round-tripped roster import includes the merged target unit');
assert.ok(roundTripScouts._children.some(child => child.label === 'Arjac Rockfist'), 'round-tripped roster import keeps manually merged units');
assert.ok(roundTripScouts.weapons.some(weapon => weapon.name === 'Foehammer'), 'round-tripped roster import keeps merged unit weapon profiles');
assert.ok(roundTripScouts._children.every(child => child.weapons.length > 0), 'round-tripped roster import keeps child model weapon profiles');
assert.ok(context.window.ArmyImportService.unmergeUnit(roundTripApp.forces[0], wolfScouts._unitKey), 'unmerge splits uniquely named models from a freshly imported roster export');
roundTripApp.refreshUnits();
const freshUnmergedScouts = roundTripApp.units.find(unit => unit._unitKey === wolfScouts._unitKey);
assert.ok(roundTripApp.units.some(unit => unit.label === 'Arjac Rockfist'), 'fresh roster-export import can unmerge a named model into a top-level unit');
assert.ok(freshUnmergedScouts._children.some(child => child.label === 'Wolf Scout Pack Leader'), 'unmerge keeps squad command models inside the unit');
assert.ok(!freshUnmergedScouts._children.some(child => child.label === 'Arjac Rockfist'), 'unmerge removes named model children from the target unit');

console.log('space-wolves-import tests passed');
