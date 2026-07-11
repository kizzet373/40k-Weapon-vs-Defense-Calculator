const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
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
vm.runInContext(fs.readFileSync(path.join(root, 'calculator-core.js'), 'utf8'), context, { filename: 'calculator-core.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'matchup-engine.js'), 'utf8'), context, { filename: 'matchup-engine.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'army-import.js'), 'utf8'), context, { filename: 'army-import.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'utilities.js'), 'utf8'), context, { filename: 'utilities.js' });

const app = context.weaponVsDefenseApp();
const samplePath = process.argv[2] || 'C:/Users/Kirkland/Downloads/2000 gyip daemons.json';
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

app.addRoster(sample, 'Daemons sample');
app.addRoster(sample, 'Daemons sample 2');

assert.strictEqual(app.rosters.length, 2, 'loads two armies');
assert.strictEqual(app.forces.length, 1, 'normalizes TTS save into one force');
assert.ok(app.units.length > 10, 'imports units from TTS object descriptions');

const greatUnclean = app.units.find(u => /Great Unclean One/i.test(u.label));
assert.ok(greatUnclean, 'imports Great Unclean One');
assert.strictEqual(greatUnclean.defense.T, 12, 'parses toughness');
assert.strictEqual(greatUnclean.defense.Sv, 5, 'parses armor save');
assert.strictEqual(greatUnclean.defense.Inv, 4, 'parses invulnerable save');
assert.strictEqual(greatUnclean.defense.W, 20, 'parses wounds');
assert.strictEqual(app.matchupDefenseLabel(greatUnclean), 'T12 - 5+ 4++ - W20 - 1 models', 'formats compact matchup defense labels');
assert.strictEqual(app.unitPointsText(greatUnclean), '', 'does not invent points when the import has no point values');
assert.ok(greatUnclean.weapons.some(w => /Putrid vomit/i.test(w.name) && /TORRENT/i.test(w.modifiers)), 'parses ranged weapon modifiers');

const pointsApp = context.weaponVsDefenseApp();
pointsApp.addRoster({
  roster: {
    name: 'Points roster',
    forces: [{
      name: 'Points force',
      selections: [{
        type: 'unit',
        id: 'point-unit',
        name: 'Point Unit',
        number: '1',
        costs: [{ name: 'pts', value: '130' }],
        profiles: [{
          typeName: 'Unit',
          characteristics: [
            { name: 'T', $text: '4' },
            { name: 'SV', $text: '3+' },
            { name: 'W', $text: '2' },
          ],
        }],
      }],
    }],
  },
}, 'Points roster');
const pointUnit = pointsApp.units.find(u => /^Point Unit$/i.test(u.label));
assert.ok(pointUnit, 'imports a generic point-costed unit');
assert.strictEqual(pointUnit._points, 130, 'extracts points from generic roster costs');
assert.strictEqual(pointsApp.unitPointsText(pointUnit), '(130 pts)', 'formats points next to unit names');

const bloodcrushers = app.units.find(u => /^Bloodcrushers$/i.test(u.label));
assert.ok(bloodcrushers, 'imports grouped duplicate model objects as one unit');
assert.strictEqual(Number(bloodcrushers.defense.models), 6, 'groups models with shared TTS uuid');
assert.ok(bloodcrushers._children.some(child => /Bloodhunter/i.test(child.label)), 'includes unit leader/champion model in aggregate');

const havocs = app.units.find(u => /^Havocs$/i.test(u.label));
assert.ok(havocs, 'imports Havocs as a unit');
assert.ok(havocs._children.some(child => /Havoc Champion/i.test(child.label)), 'includes champion in Havocs aggregate');
const weaponCount = (unit, name) => {
  const weapon = (unit.weapons || []).find(w => String(w.name || '').toLowerCase() === String(name).toLowerCase());
  return weapon ? Math.max(1, parseInt(weapon._profileCount ?? weapon._count ?? 1, 10) || 1) : 0;
};
const havocUnits = app.units.filter(u => /^Havocs$/i.test(u.label));
assert.ok(havocUnits.length >= 2, 'imports both Havoc units from the sample');
havocUnits.forEach(unit => {
  assert.strictEqual(weaponCount(unit, 'Meltagun'), 1, 'Havoc champion keeps one meltagun');
  assert.strictEqual(weaponCount(unit, 'Power fist'), 1, 'Havoc champion keeps one power fist');
  assert.strictEqual(weaponCount(unit, 'Close combat weapon'), 4, 'regular Havocs keep close combat weapons');
  assert.ok(
    weaponCount(unit, 'Havoc lascannon') === 4 || weaponCount(unit, 'Havoc reaper chaincannon') === 4,
    'regular Havocs keep four selected heavy weapons'
  );
});

const chosen = app.units.find(u => /^Chosen$/i.test(u.label));
assert.ok(chosen, 'imports Chosen as a unit');
assert.strictEqual(weaponCount(chosen, 'Plasma pistol – standard'), 1, 'Chosen import assigns one standard plasma pistol profile');
assert.strictEqual(weaponCount(chosen, 'Plasma pistol – supercharge'), 1, 'Chosen import assigns one supercharged plasma pistol profile');
assert.strictEqual(weaponCount(chosen, 'Boltgun'), 3, 'Chosen import assigns three boltguns');
assert.strictEqual(weaponCount(chosen, 'Bolt pistol'), 5, 'Chosen import assigns bolt pistols across the unit');
assert.strictEqual(weaponCount(chosen, 'Combi-weapon'), 1, 'Chosen import assigns one combi-weapon');
assert.strictEqual(weaponCount(chosen, 'Power fist'), 1, 'Chosen import assigns one power fist');
assert.strictEqual(weaponCount(chosen, 'Accursed weapon'), 3, 'Chosen import assigns three accursed weapons');
assert.strictEqual(weaponCount(chosen, 'Paired accursed weapons'), 1, 'Chosen import assigns one paired accursed weapons profile');
const chosenLeader = chosen._children.find(child => child._isLeaderModel);
assert.ok(chosenLeader, 'Chosen aggregate includes a leader model');
assert.strictEqual(weaponCount(chosenLeader, 'Paired accursed weapons'), 1, 'Chosen leader gets paired accursed weapons');
assert.strictEqual(weaponCount(chosenLeader, 'Combi-weapon'), 0, 'Chosen leader does not inherit every copied weapon');
assert.strictEqual(chosen._children.filter(child => child._equipmentResolution === 'chosen-regular').length, 3, 'Chosen import identifies three regular Chosen models');
assert.strictEqual(chosen._children.filter(child => child._equipmentResolution === 'chosen-special').length, 1, 'Chosen import identifies one special Chosen model');

app.matchupModalOpen = true;
app.matchup.attackerRosterIdx = 0;
app.matchup.attackerForceIdx = 0;
app.matchup.defenderRosterIdx = 1;
app.matchup.defenderForceIdx = 0;
app.onMatchupRosterChanged('attacker');
app.onMatchupRosterChanged('defender');
app.rebuildMatchup();

assert.ok(app.matchupAttackerUnits.length > 10, 'builds attacker unit list');
assert.ok(app.matchupDefenderUnits.length > 10, 'builds defender unit list');
assert.strictEqual(app.matchup.rows.length, app.matchupAttackerUnits.length, 'one row per attacker');
assert.strictEqual(app.matchup.rows[0].cells.length, app.matchupDefenderUnits.length, 'one cell per defender');

const expandable = app.matchupAttackerUnits.find(u => app.hasChildUnits(u));
assert.ok(expandable, 'has expandable aggregate units');
app.warmMatchupCellCache();
let expandComputeCalls = 0;
const originalComputeMatchupCell = app.computeMatchupCell.bind(app);
app.computeMatchupCell = (...args) => {
  expandComputeCalls += 1;
  return originalComputeMatchupCell(...args);
};
const collapsedRows = app.matchupVisibleRows().length;
app.toggleUnitExpanded(expandable);
assert.ok(app.matchupVisibleRows().length > collapsedRows, 'expands attacker unit into model rows');
const expandableDefender = app.matchupDefenderUnits.find(u => app.hasChildUnits(u));
const collapsedCols = app.matchupVisibleDefenders().length;
app.toggleUnitExpanded(expandableDefender);
assert.ok(app.matchupVisibleDefenders().length > collapsedCols, 'expands defender unit into model columns');
assert.strictEqual(expandComputeCalls, 0, 'expand/collapse uses cached matchup cells');
app.computeMatchupCell = originalComputeMatchupCell;

const firstCell = app.matchup.rows.find(row => row.cells.some(cell => cell.dmg > 0)).cells.find(cell => cell.dmg > 0);
app.matchup.metric = 'damage';
assert.ok(/^\d+\.\d{2}$/.test(app.formatMatchupMetric(firstCell)), 'formats damage metric');
assert.ok(/background:hsl/.test(app.matchupCellStyle(firstCell)), 'creates gradient cell style');

app.matchup.metric = 'modelWounds';
assert.ok(app.formatMatchupMetric(firstCell).endsWith('%'), 'formats model wound percent metric');
app.matchup.metric = 'unitKill';
assert.ok(app.formatMatchupMetric(firstCell).endsWith('%'), 'formats unit destroy percent metric');

const beLakor = app.matchupAttackerUnits.find(u => /Bel'?akor|Be.lakor/i.test(u.label));
assert.ok(beLakor, 'finds Be-lakor profile');
const devWeapon = beLakor.weapons.find(w => /DEVASTATING WOUNDS/i.test(w.modifiers));
assert.ok(devWeapon, 'finds weapon with toggleable modifiers');
assert.ok(app.weaponModifierNames(devWeapon).some(x => /DEVASTATING WOUNDS/i.test(x)), 'lists imported modifier');
assert.strictEqual(app.isWeaponModifierEnabled(devWeapon, 'DEVASTATING WOUNDS'), true, 'modifier starts enabled');
app.toggleWeaponModifier(devWeapon, 'DEVASTATING WOUNDS');
assert.strictEqual(app.isWeaponModifierEnabled(devWeapon, 'DEVASTATING WOUNDS'), false, 'modifier toggles off');
assert.ok(!/DEVASTATING WOUNDS/i.test(app.effectiveWeaponModifiers(devWeapon)), 'disabled modifier is omitted from calculation text');
app.rebuildMatchup();
const beLakorAfterRebuild = app.matchupAttackerUnits.find(u => /Bel'?akor|Be.lakor/i.test(u.label));
const devWeaponAfterRebuild = beLakorAfterRebuild.weapons.find(w => /DEVASTATING WOUNDS/i.test(w.modifiers));
assert.strictEqual(app.isWeaponModifierEnabled(devWeaponAfterRebuild, 'DEVASTATING WOUNDS'), false, 'modifier toggle persists after matchup rebuild');

const meleeTest = {
  label: 'Melee test',
  weapons: [
    { name:'Weak strike', range:'Melee', A:'1', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'melee', _weaponKey:'test-weak' },
    { name:'Strong strike', range:'Melee', A:'10', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'melee', _weaponKey:'test-strong' },
    { name:'Extra bite', range:'Melee', A:'2', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'EXTRA ATTACKS', mode:'melee', _weaponKey:'test-extra' },
  ],
  defense: { T:4, Sv:7, W:10, models:1, totalWounds:10 },
};
const meleeTarget = { label:'Target', weapons:[], defense:{ T:4, Sv:7, W:10, models:1, totalWounds:10 } };
const meleeCell = app.computeMatchupCell(meleeTest, meleeTarget);
assert.ok(Math.abs(meleeCell.dmg - 6) < 1e-9, 'adds Extra Attacks melee to best normal profile only');
assert.strictEqual(meleeCell.weaponName, '1x Strong strike, 1x Extra bite', 'reports the best melee profile plus Extra Attacks bundle');

const sweepStrikeTest = {
  label: 'Sweep strike test',
  weapons: [
    { name:'Strike', range:'Melee', A:'2', skill:'auto', S:'4', AP:'0', D:'2', modifiers:'', mode:'melee', _weaponKey:'test-strike' },
    { name:'Sweep', range:'Melee', A:'8', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'melee', _weaponKey:'test-sweep' },
    { name:'Tail', range:'Melee', A:'4', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'EXTRA ATTACKS', mode:'melee', _weaponKey:'test-tail' },
  ],
  defense: { T:4, Sv:7, W:10, models:1, totalWounds:10 },
};
const sweepStrikeCell = app.computeMatchupCell(sweepStrikeTest, meleeTarget);
assert.ok(Math.abs(sweepStrikeCell.dmg - 6) < 1e-9, 'picks best strike/sweep profile and adds Extra Attacks without summing strike plus sweep');
assert.strictEqual(sweepStrikeCell.weaponName, '1x Sweep, 1x Tail', 'reports the selected normal melee profile plus Extra Attacks');

app.matchup.combineShootingProfiles = false;
app.matchup.showShooting = true;
app.matchup.showMelee = true;
const splitUnit = {
  label: 'Split Unit',
  _unitKey: 'split-unit',
  _viewKey: 'attacker:test:split-unit',
  weapons: [
    { name:'Gun', range:'24"', A:'6', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'split-gun' },
    { name:'Blade', range:'Melee', A:'2', skill:'auto', S:'4', AP:'0', D:'2', modifiers:'', mode:'melee', _weaponKey:'split-blade' },
    { name:'Bite', range:'Melee', A:'4', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'EXTRA ATTACKS', mode:'melee', _weaponKey:'split-bite' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
const splitVariants = app.attackModeVariants(splitUnit);
assert.strictEqual(JSON.stringify(splitVariants.map(u => u.label)), JSON.stringify(['Split Unit (Shooting)', 'Split Unit (Melee)']), 'turning off combined shooting splits attacker units into shooting and melee rows');
assert.ok(Math.abs(app.computeMatchupCell(splitVariants[0], meleeTarget).dmg - 3) < 1e-9, 'shooting split row only uses shooting weapons');
assert.ok(Math.abs(app.computeMatchupCell(splitVariants[1], meleeTarget).dmg - 4) < 1e-9, 'melee split row uses best melee profile plus Extra Attacks');

const alphaSplitUnit = {
  label: 'Alpha Split',
  _unitKey: 'alpha-split',
  _viewKey: 'attacker:test:alpha-split',
  weapons: [
    { name:'Light gun', range:'24"', A:'1', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'alpha-gun' },
    { name:'Heavy blade', range:'Melee', A:'12', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'melee', _weaponKey:'alpha-blade' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
const betaSplitUnit = {
  label: 'Beta Split',
  _unitKey: 'beta-split',
  _viewKey: 'attacker:test:beta-split',
  weapons: [
    { name:'Medium gun', range:'24"', A:'8', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'beta-gun' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
const independentlySortedVariants = [
  ...app.attackModeVariants(alphaSplitUnit),
  ...app.attackModeVariants(betaSplitUnit),
];
app.matchup.sortAttackers = 'overallDamage';
app.matchupDefenderUnits = [meleeTarget];
app.matchupAttackerUnits = independentlySortedVariants;
app.matchup.rows = independentlySortedVariants.map(unit => ({
  unit,
  cells: [app.computeMatchupCell(unit, meleeTarget)],
}));
app.applyMatchupSorting(false);
app.seedAggregateCellCache();
app.refreshVisibleMatchup();
assert.strictEqual(
  JSON.stringify(app.matchupVisibleRows().map(row => row.unit.label)),
  JSON.stringify(['Alpha Split (Melee)', 'Beta Split (Shooting)', 'Alpha Split (Shooting)']),
  'split shooting and melee profiles sort as independent matchup rows'
);

app.matchup.combineShootingProfiles = true;
const shootingLabelUnit = {
  label: 'Shooting Labels',
  weapons: [
    { name:'gun a', range:'24"', A:'4', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'label-a', _profileCount:4 },
    { name:'gun b', range:'18"', A:'2', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'label-b', _profileCount:2 },
    { name:'gun c', range:'12"', A:'1', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'label-c' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
assert.strictEqual(app.computeMatchupCell(shootingLabelUnit, meleeTarget).weaponName, '4x gun a, 2x gun b, 1x gun c', 'combined shooting cells list every shooting profile with counts');

const focusedWitchfireUnit = {
  label: 'Focused Witchfire',
  weapons: [
    { name:'Betraying Shades - witchfire', range:'18"', A:'1', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'shades-witchfire' },
    { name:'Betraying Shades - focused witchfire', range:'18"', A:'1', skill:'auto', S:'4', AP:'0', D:'3', modifiers:'HAZARDOUS', mode:'ranged', _weaponKey:'shades-focused' },
    { name:'bolt pistol', range:'12"', A:'2', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'shades-pistol' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
const focusedWitchfireCell = app.computeMatchupCell(focusedWitchfireUnit, meleeTarget);
assert.ok(Math.abs(focusedWitchfireCell.dmg - 2.5) < 1e-9, 'chooses the best shooting profile from a same-weapon profile group and still includes other guns');
assert.strictEqual(focusedWitchfireCell.weaponName, '1x Betraying Shades - focused witchfire, 1x bolt pistol', 'reports selected shooting profile choices with counts');

const enDashChoiceUnit = {
  label: 'En Dash Choice',
  weapons: [
    { name:'Betraying Shades \u2013 witchfire', range:'18"', A:'1', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'ranged', _weaponKey:'shades-en-witchfire' },
    { name:'Betraying Shades \u2013 focused witchfire', range:'18"', A:'1', skill:'auto', S:'4', AP:'0', D:'3', modifiers:'HAZARDOUS', mode:'ranged', _weaponKey:'shades-en-focused' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
assert.strictEqual(app.computeMatchupCell(enDashChoiceUnit, meleeTarget).weaponName, '1x Betraying Shades \u2013 focused witchfire', 'groups en-dash named weapon profile choices');

const focusedAggregateUnit = {
  label: 'Focused Aggregate',
  weapons: [],
  _children: [
    focusedWitchfireUnit,
    {
      ...focusedWitchfireUnit,
      label: 'Focused Witchfire 2',
      weapons: focusedWitchfireUnit.weapons.map(w => ({ ...w, _weaponKey: `${w._weaponKey}-2` })),
    },
  ],
  defense: { T:4, Sv:7, W:2, models:2, totalWounds:4 },
};
const focusedAggregateCell = app.computeMatchupCell(focusedAggregateUnit, meleeTarget);
assert.ok(Math.abs(focusedAggregateCell.dmg - 5) < 1e-9, 'aggregates per-model selected shooting profile choices into the full unit');
assert.strictEqual(focusedAggregateCell.weaponName, '2x Betraying Shades - focused witchfire, 2x bolt pistol', 'aggregates selected profile labels across child models');

const overkillAttacker = {
  label: 'Overkill Attacker',
  weapons: [
    { name:'Overkill blade', range:'Melee', A:'18', skill:'auto', S:'4', AP:'0', D:'1', modifiers:'', mode:'melee', _weaponKey:'overkill-blade' },
  ],
  defense: { T:4, Sv:7, W:2, models:1, totalWounds:2 },
};
const oneModelDefender = { label:'One model', weapons:[], defense:{ T:4, Sv:7, W:2, models:1, totalWounds:2 } };
const threeModelDefender = { label:'Three model unit', weapons:[], defense:{ T:4, Sv:7, W:2, models:3, totalWounds:6 } };
const oneModelOverkill = app.computeMatchupCell(overkillAttacker, oneModelDefender);
const threeModelOverkill = app.computeMatchupCell(overkillAttacker, threeModelDefender);
assert.ok(Math.abs(oneModelOverkill.dmg - 9) < 1e-9, 'overkill fixture has expected damage');
assert.ok(Math.abs(oneModelOverkill.pctModelWounds - 4.5) < 1e-9, 'damage percent can exceed 100 percent for one model');
assert.ok(Math.abs(threeModelOverkill.pctModelWounds - 1.5) < 1e-9, 'unit damage percent uses the full defender wound pool');
assert.ok(threeModelOverkill.pctUnitKilled >= 0 && threeModelOverkill.pctUnitKilled < 1, 'chance to destroy is a bounded probability estimate');
app.matchup.metric = 'unitKill';
assert.ok(!/^1\d\d/.test(app.formatMatchupMetric(threeModelOverkill)), 'chance to destroy does not format above 100 percent');
app.matchup.metric = 'damage';

app.matchup.sortAttackers = 'overallDamage';
app.matchup.sortDefenders = 'leastDamage';
app.matchupAttackerUnits = [{ label:'Low damage' }, { label:'High damage' }];
app.matchupDefenderUnits = [{ label:'Soft target' }, { label:'Tough target' }];
app.matchup.rows = [
  { unit: app.matchupAttackerUnits[0], cells: [{ dmg:100 }, { dmg:1 }] },
  { unit: app.matchupAttackerUnits[1], cells: [{ dmg:200 }, { dmg:2 }] },
];
app.applyMatchupSorting(false);
assert.strictEqual(app.matchupAttackerUnits[0].label, 'High damage', 'attackers sort by best overall damage by default');
assert.strictEqual(app.matchupDefenderUnits[0].label, 'Tough target', 'defenders sort by least overall incoming damage by default');
app.refreshVisibleMatchup();
assert.strictEqual(app.matchupVisibleRows()[0].unit.label, 'High damage', 'visible rows follow sorted attacker order');

app.matchup.sortAttackers = 'overallDamage';
app.matchup.sortDefenders = 'leastDamage';
app.matchupAttackerUnits = [{ label:'Focus attacker' }, { label:'Other attacker' }];
app.matchupDefenderUnits = [{ label:'Low vs focus high total' }, { label:'High vs focus low total' }];
app.matchup.rows = [
  { unit: app.matchupAttackerUnits[0], cells: [{ dmg:60 }, { dmg:70 }] },
  { unit: app.matchupAttackerUnits[1], cells: [{ dmg:100 }, { dmg:0 }] },
];
app.applyMatchupSorting(false);
assert.strictEqual(
  JSON.stringify(app.matchupDefenderUnits.map(u => u.label)),
  JSON.stringify(['Low vs focus high total', 'High vs focus low total']),
  'default defender sort follows the top attacker row instead of global totals'
);

const screenshotAttacker = { label:'Screenshot attacker', _viewKey:'screenshot-attacker' };
const bjorn = { label:'Bjorn the Fell-handed', _viewKey:'def-bjorn' };
const murderfang = { label:'Murderfang', _viewKey:'def-murderfang' };
const arjac = { label:'Arjac Rockfist', _viewKey:'def-arjac' };
const expandedParent = { label:'Expanded defenders', _viewKey:'def-parent', _children:[bjorn, murderfang, arjac] };
app.matchup.rows = [{ unit:screenshotAttacker, cells:[] }];
app.matchupDefenderUnits = [expandedParent];
app.matchup.sortDefenders = 'leastDamage';
app.matchup.cellCache = {
  [app.cellCacheKey(screenshotAttacker, bjorn)]: { dmg:15.05 },
  [app.cellCacheKey(screenshotAttacker, murderfang)]: { dmg:17.48 },
  [app.cellCacheKey(screenshotAttacker, arjac)]: { dmg:16.65 },
};
app.expandedUnitKeys[app.unitKey(expandedParent)] = true;
assert.strictEqual(
  JSON.stringify(app.buildVisibleDefenders().map(col => col.unit.label)),
  JSON.stringify(['Expanded defenders', 'Bjorn the Fell-handed', 'Arjac Rockfist', 'Murderfang']),
  'expanded defender child columns sort by least overall damage instead of import order'
);

app.matchupAttackerUnits = [{ label:'Low damage' }, { label:'High damage' }];
app.matchupDefenderUnits = [{ label:'Soft target' }, { label:'Tough target' }];
app.matchup.rows = [
  { unit: app.matchupAttackerUnits[0], cells: [{ dmg:10, pctModelWounds:0.25, pctUnitKilled:0.1 }, { dmg:2, pctModelWounds:0.05, pctUnitKilled:0.01 }] },
  { unit: app.matchupAttackerUnits[1], cells: [{ dmg:1, pctModelWounds:0.5, pctUnitKilled:0.8 }, { dmg:0.5, pctModelWounds:0.1, pctUnitKilled:0.2 }] },
];
app.seedAggregateCellCache();
app.matchup.sortAttackers = 'alpha';
app.setMatchupMetric('modelWounds');
assert.strictEqual(app.matchupMetricRange().max, 0.5, 'metric changes refresh the gradient range for damage percent');
app.setMatchupMetric('unitKill');
assert.strictEqual(app.matchupMetricRange().max, 0.8, 'metric changes refresh the gradient range for chance to destroy');

app.matchupAttackerUnits = [{ label:'Low damage' }, { label:'High damage' }];
app.matchupDefenderUnits = [{ label:'Soft target' }, { label:'Tough target' }];
app.matchup.rows = [
  { unit: app.matchupAttackerUnits[0], cells: [{ dmg:100 }, { dmg:1 }] },
  { unit: app.matchupAttackerUnits[1], cells: [{ dmg:200 }, { dmg:2 }] },
];
app.seedAggregateCellCache();
app.matchup.sortAttackers = 'overallDamage';
app.matchup.sortDefenders = 'leastDamage';
app.setMatchupSort('attacker');
assert.strictEqual(app.matchupVisibleRows()[0].unit.label, 'High damage', 'sort changes refresh visible matchup rows');

const gradientRange = { min: 0, max: 10 };
assert.ok(/hsl\(0,/.test(context.window.MatchupEngine.colorForValue(0, gradientRange)), 'lowest matchup color is red');
assert.ok(/hsl\(60,/.test(context.window.MatchupEngine.colorForValue(5, gradientRange)), 'middle matchup color is yellow');
assert.ok(/hsl\(120,/.test(context.window.MatchupEngine.colorForValue(10, gradientRange)), 'highest matchup color is green');

console.log('import-matchup tests passed');
