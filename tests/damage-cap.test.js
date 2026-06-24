const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = {
  window: {},
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  parseFloat,
  parseInt,
};
context.global = context;
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'calculator-core.js'), 'utf8'), context, { filename: 'calculator-core.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'matchup-engine.js'), 'utf8'), context, { filename: 'matchup-engine.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'army-import.js'), 'utf8'), context, { filename: 'army-import.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'utilities.js'), 'utf8'), context, { filename: 'utilities.js' });

const cappedD6 = context.window.WeaponCalc.expectedCappedDamage('D6', 2);
assert.ok(Math.abs(cappedD6 - (11 / 6)) < 1e-9, 'D6 damage into W2 averages the capped roll distribution');

const cappedResult = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D6 overkill', A: '6', skill: 'auto', S: '8', AP: '6', D: 'D6', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  ''
);
assert.ok(Math.abs(cappedResult.dmg - (55 / 6)) < 1e-9, 'normal D6 damage is capped per failed save instead of spilling over');

const devResult = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D6 devastating', A: '6', skill: 'auto', S: '8', AP: '6', D: 'D6', modifiers: 'Devastating Wounds' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Devastating Wounds'
);
assert.ok(devResult.dmg > cappedResult.dmg, 'spill-capable devastating wound damage still contributes beyond the normal per-attack cap');

const noFnpWeapon = context.window.WeaponCalc.calcOneWeapon(
  { name: 'FNP check', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  ''
);
const fnpWeapon = context.window.WeaponCalc.calcOneWeapon(
  { name: 'FNP check', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2, Fnp: 5 },
  ''
);
assert.ok(Math.abs(fnpWeapon.dmg - (noFnpWeapon.dmg * (2 / 3))) < 1e-9, 'weapon damage is reduced by defender FNP');

const matchupNoFnp = context.window.MatchupEngine.computeCell(
  {
    label: 'Attacker',
    weapons: [{ name: 'FNP check', range: '24', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
  },
  { label: 'No FNP target', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
const matchupFnp = context.window.MatchupEngine.computeCell(
  {
    label: 'Attacker',
    weapons: [{ name: 'FNP check', range: '24', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
  },
  { label: 'FNP target', defense: { T: 4, Sv: 7, W: 2, Fnp: 5, models: 1, totalWounds: 2 } },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
assert.ok(Math.abs(matchupFnp.dmg - (matchupNoFnp.dmg * (2 / 3))) < 1e-9, 'matchup-grid damage is reduced by defender FNP');

const app = context.weaponVsDefenseApp();
const mixedDefender = {
  label: 'Mixed Terminators',
  defense: { T: 5, Sv: 2, Inv: 4, W: 4, models: 5, totalWounds: 22 },
  _children: [
    { label: 'Storm shield 1', defense: { T: 5, Sv: 2, Inv: 4, W: 4, models: 3 } },
    { label: 'Leader', defense: { T: 5, Sv: 2, Inv: 4, W: 8, models: 1 } },
    { label: 'Terminator', defense: { T: 5, Sv: 2, Inv: 4, W: 3, models: 1 } },
  ],
};
assert.strictEqual(JSON.stringify(app.matchupDefenseProfileLines(mixedDefender)), JSON.stringify([
  'T5 - 2+ 4++ - W4 - 3 models',
  'T5 - 2+ 4++ - W8 - 1 models',
  'T5 - 2+ 4++ - W3 - 1 models',
]), 'mixed defender headers show each unique defensive profile on its own line');

assert.strictEqual(app.matchupSideSortLabel('attacker'), 'DESC', 'attacker sort defaults to best overall damage first');
assert.strictEqual(app.matchupSideSortLabel('defender'), 'DESC', 'defender sort defaults to best overall incoming damage first');
app.cycleMatchupSideSort('attacker');
assert.strictEqual(app.matchupSideSortLabel('attacker'), 'ASC', 'attacker sort cycles from DESC to ASC');
app.cycleMatchupSideSort('attacker');
assert.strictEqual(app.matchupSideSortLabel('attacker'), 'A-Z', 'attacker sort cycles from ASC to A-Z');
app.cycleMatchupSideSort('attacker');
assert.strictEqual(app.matchupSideSortLabel('attacker'), 'DESC', 'attacker sort cycles from A-Z back to default DESC');
app.cycleMatchupSideSort('defender');
assert.strictEqual(app.matchupSideSortLabel('defender'), 'ASC', 'defender sort cycles from DESC to ASC');
app.cycleMatchupSideSort('defender');
assert.strictEqual(app.matchupSideSortLabel('defender'), 'A-Z', 'defender sort cycles from ASC to A-Z');
app.cycleMatchupSideSort('defender');
assert.strictEqual(app.matchupSideSortLabel('defender'), 'DESC', 'defender sort cycles from A-Z back to DESC');

console.log('damage-cap tests passed');
