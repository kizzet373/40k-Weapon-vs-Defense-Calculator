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
vm.runInContext(fs.readFileSync(path.join(root, 'ability-modifiers.js'), 'utf8'), context, { filename: 'ability-modifiers.js' });
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

const antiVehicleWeapon = { name: 'Anti check', range: '24', A: '6', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: 'Anti-Vehicle 4+', mode: 'ranged' };
const antiIntoInfantry = context.window.WeaponCalc.calcOneWeapon(
  antiVehicleWeapon,
  { T: 8, sv: 7, inv: 0, W: 2, keywords: ['Infantry'] },
  antiVehicleWeapon.modifiers
);
const antiIntoVehicle = context.window.WeaponCalc.calcOneWeapon(
  antiVehicleWeapon,
  { T: 8, sv: 7, inv: 0, W: 2, keywords: ['Vehicle'] },
  antiVehicleWeapon.modifiers
);
assert.ok(Math.abs(antiIntoInfantry.dmg - 1) < 1e-9, 'Anti-Vehicle does not apply into non-vehicle defenders');
assert.ok(Math.abs(antiIntoVehicle.dmg - 3) < 1e-9, 'Anti-Vehicle applies only into vehicle defenders');

const antiMatchupInfantry = context.window.MatchupEngine.computeCell(
  { label: 'Anti attacker', weapons: [antiVehicleWeapon], defense: { T: 4, Sv: 3, W: 2, models: 1 } },
  { label: 'Infantry target', _keywords: ['Infantry'], defense: { T: 8, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
const antiMatchupVehicle = context.window.MatchupEngine.computeCell(
  { label: 'Anti attacker', weapons: [antiVehicleWeapon], defense: { T: 4, Sv: 3, W: 2, models: 1 } },
  { label: 'Vehicle target', _keywords: ['Vehicle'], defense: { T: 8, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
assert.ok(Math.abs(antiMatchupInfantry.dmg - 1) < 1e-9, 'matchup grid preserves defender keywords for failed Anti checks');
assert.ok(Math.abs(antiMatchupVehicle.dmg - 3) < 1e-9, 'matchup grid preserves defender keywords for successful Anti checks');

const apBase = context.window.WeaponCalc.calcOneWeapon(
  { name: 'AP base', A: '6', skill: 'auto', S: '8', AP: '0', D: '1', modifiers: '' },
  { T: 4, sv: 3, inv: 0, W: 2 },
  ''
);
const apBoosted = context.window.WeaponCalc.calcOneWeapon(
  { name: 'AP boost', A: '6', skill: 'auto', S: '8', AP: '0', D: '1', modifiers: '' },
  { T: 4, sv: 3, inv: 0, W: 2 },
  'AP +1'
);
assert.ok(apBoosted.dmg > apBase.dmg, 'AP modifiers improve failed-save damage');

const critSix = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Crit base', A: '6', skill: '4', S: '1', AP: '6', D: '1', modifiers: '' },
  { T: 10, sv: 7, inv: 0, W: 2 },
  'Lethal Hits'
);
const critFive = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Crit five', A: '6', skill: '4', S: '1', AP: '6', D: '1', modifiers: '' },
  { T: 10, sv: 7, inv: 0, W: 2 },
  'Lethal Hits, Critical Hits 5+'
);
assert.ok(critFive.dmg > critSix.dmg, 'Critical Hits 5+ increases lethal-hit output');

const sustainedD3 = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Sustained D3', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Sustained Hits D3'
);
assert.ok(Math.abs(sustainedD3.dmg - 2.5) < 1e-9, 'Sustained Hits D3 uses the average D3 extra hits');

const hitPenalty = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Penalty', A: '6', skill: '4', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Hit Rolls -1'
);
const ignoredHitPenalty = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Ignore penalty', A: '6', skill: '4', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Hit Rolls -1, Ignore Hit Penalties'
);
assert.ok(ignoredHitPenalty.dmg > hitPenalty.dmg, 'Ignore Hit Penalties removes negative hit-roll modifiers');

const mixedCharacterDefender = {
  label: 'Bodyguard with character',
  defense: { T: 4, Sv: 7, W: 2, models: 3, totalWounds: 9 },
  _children: [
    { label: 'Bodyguard 1', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    { label: 'Bodyguard 2', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    { label: 'Attached Character', _isCharacterModel: true, defense: { T: 10, Sv: 7, W: 5, models: 1, totalWounds: 5 } },
  ],
};
const nonPrecisionCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Normal attacker',
    weapons: [{ name: 'Normal shots', range: '24', A: '4', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
  },
  mixedCharacterDefender,
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
const precisionCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Precision attacker',
    weapons: [{ name: 'Precision shots', range: '24', A: '4', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: 'Precision', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
  },
  mixedCharacterDefender,
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
assert.ok(Math.abs(nonPrecisionCell.dmg - 2) < 1e-9, 'non-Precision weapons allocate into non-character defensive profiles first');
assert.ok(Math.abs(precisionCell.dmg - (2 / 3)) < 1e-9, 'Precision weapons allocate into character defensive profiles first');

const app = context.weaponVsDefenseApp();
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Dark Pacts')),
  JSON.stringify(['Choose Best: Lethal Hits; Sustained Hits 1']),
  'profile modal can list mapped modifiers under abilities'
);
const modifiedDefenseLine = app.matchupDefenseProfileLine(
  app.applyDefenseModifiers(
    { T: 4, Sv: 3, Inv: 5, W: 2, models: 1 },
    ['Defense: Toughness +1', 'Defense: Save +1', 'Defense: FNP 5+']
  ),
  1
);
assert.strictEqual(modifiedDefenseLine, 'T5 - 2+ 5++ - W2 - FNP 5+ - 1 models', 'defensive modifiers and FNP are reflected in header formatting');
const unmodifiedTarget = { label: 'Base target', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const tougherTarget = { label: 'Tougher target', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const defenseModifierAttacker = {
  label: 'Defense modifier check',
  weapons: [{ name: 'S4 shots', range: '24', A: '6', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const baseDefenseCell = context.window.MatchupEngine.computeCell(defenseModifierAttacker, unmodifiedTarget, {
  isWeaponEnabled: () => true,
  isMeleeEnabled: () => true,
  effectiveWeaponModifiers: weapon => weapon.modifiers || '',
  effectiveDefense: unit => unit.defense || {},
  isAbilityEnabled: () => true,
});
const modifiedDefenseCell = context.window.MatchupEngine.computeCell(defenseModifierAttacker, tougherTarget, {
  isWeaponEnabled: () => true,
  isMeleeEnabled: () => true,
  effectiveWeaponModifiers: weapon => weapon.modifiers || '',
  effectiveDefense: unit => app.applyDefenseModifiers(unit.defense || {}, ['Defense: Toughness +4']),
  isAbilityEnabled: () => true,
});
assert.ok(baseDefenseCell.dmg > modifiedDefenseCell.dmg, 'matchup calculations use effective defensive profiles when modifiers are active');

const darkPactAttacker = {
  label: 'Dark Pact unit',
  abilities: ['Dark Pacts'],
  weapons: [{ name: 'Pact gun', range: '24', A: '6', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'pact-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const easyTarget = { label: 'Easy target', defense: { T: 3, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const hardTarget = { label: 'Hard target', defense: { T: 20, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const darkPactEasy = app.computeMatchupCell(darkPactAttacker, easyTarget);
const darkPactHard = app.computeMatchupCell(darkPactAttacker, hardTarget);
assert.ok(Math.abs(darkPactEasy.dmg - (10 / 3)) < 1e-9, 'Dark Pacts chooses Sustained Hits when it beats Lethal Hits');
assert.ok(Math.abs(darkPactHard.dmg - (4 / 3)) < 1e-9, 'Dark Pacts chooses Lethal Hits when it beats Sustained Hits');
app.openMatchupFormula(darkPactHard, darkPactAttacker, hardTarget);
assert.ok(app.formulaModalOpen, 'clicking a matchup value can open the formula modal state');
assert.ok((app.formulaCell?.formulaItems || []).length > 0, 'formula modal recomputes detailed formula data on demand');
assert.ok(app.matchupFormulaLines().some(line => /Total average damage/i.test(line)), 'formula modal includes the total damage calculation summary');
assert.ok(!app.matchupFormulaLines().some(line => /NaN|undefined/i.test(line)), 'formula modal lines do not expose invalid numeric text');
app.closeMatchupFormula();

const sharedAbilitySource = {
  label: 'Icon bearer',
  abilities: ['Dark Pacts'],
  weapons: [],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'shared-source',
};
const sharedAbilityReceiver = {
  label: 'Squad model',
  abilities: ['Dark Pacts'],
  weapons: [{ name: 'Borrowed pact gun', range: '24', A: '6', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'borrowed-pact-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'shared-receiver',
};
const sharedAbilityUnit = {
  label: 'Shared ability unit',
  abilities: [],
  weapons: [],
  defense: { T: 4, Sv: 3, W: 2, models: 2 },
  _children: [sharedAbilitySource, sharedAbilityReceiver],
  _unitKey: 'shared-unit',
};
Object.defineProperty(sharedAbilitySource, '_parentUnit', { value: sharedAbilityUnit, enumerable: false, configurable: true });
Object.defineProperty(sharedAbilityReceiver, '_parentUnit', { value: sharedAbilityUnit, enumerable: false, configurable: true });
const sharedModifiers = app.effectiveWeaponModifiers(sharedAbilityReceiver.weapons[0], sharedAbilityReceiver);
assert.strictEqual((sharedModifiers.match(/Choose Best:/g) || []).length, 1, 'shared model abilities do not stack duplicate modifiers on the same model');
const sharedCell = app.computeMatchupCell(sharedAbilityReceiver, hardTarget);
assert.ok(Math.abs(sharedCell.dmg - (4 / 3)) < 1e-9, 'mapped abilities from one model in a unit apply to the other models in that unit');

const skullmaster = {
  label: 'Skullmaster',
  abilities: ["Skullmaster's Fury"],
  weapons: [],
  defense: { T: 7, Sv: 3, W: 6, models: 1 },
  _unitKey: 'skullmaster',
};
const bloodcrusher = {
  label: 'Bloodcrusher',
  abilities: [],
  weapons: [
    { name: "Juggernaut's bladed horns", range: 'Melee', A: '4', skill: '3', S: '6', AP: '1', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'horns' },
    { name: 'Hellblade', range: 'Melee', A: '4', skill: '3', S: '5', AP: '2', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'hellblade' },
  ],
  defense: { T: 7, Sv: 3, W: 4, models: 1 },
  _unitKey: 'bloodcrusher',
};
const skullmasterUnit = { label: 'Skullmaster unit', abilities: [], weapons: [], defense: { T: 7, Sv: 3, W: 4, models: 2 }, _children: [skullmaster, bloodcrusher], _unitKey: 'skullmaster-unit' };
Object.defineProperty(skullmaster, '_parentUnit', { value: skullmasterUnit, enumerable: false, configurable: true });
Object.defineProperty(bloodcrusher, '_parentUnit', { value: skullmasterUnit, enumerable: false, configurable: true });
app.matchup.conditionsMet = false;
assert.ok(!/Devastating Wounds/i.test(app.effectiveWeaponModifiers(bloodcrusher.weapons[0], bloodcrusher, hardTarget)), 'conditional unit-wide weapon modifiers are off by default');
app.matchup.conditionsMet = true;
assert.ok(/Devastating Wounds/i.test(app.effectiveWeaponModifiers(bloodcrusher.weapons[0], bloodcrusher, hardTarget)), 'conditional unit-wide weapon modifiers apply when conditions are met');
assert.ok(!/Devastating Wounds/i.test(app.effectiveWeaponModifiers(bloodcrusher.weapons[1], bloodcrusher, hardTarget)), 'weapon-scoped modifiers only apply to matching weapons');

const conditionalAttacker = {
  label: 'Conditional attacker',
  abilities: ['Chance for Glory'],
  weapons: [{ name: 'Glory blade', range: 'Melee', A: '2', skill: '3', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'glory-blade' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'conditional-attacker',
};
const conditionalTarget = { label: 'Conditional target', defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 }, _unitKey: 'conditional-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
app.matchup.rows = [{ unit: conditionalAttacker, cells: [app.computeMatchupCell(conditionalAttacker, conditionalTarget)] }];
app.matchupDefenderUnits = [conditionalTarget];
app.seedAggregateCellCache();
const conditionalOff = app.cachedMatchupCell(conditionalAttacker, conditionalTarget).dmg;
const originalRebuildMatchup = app.rebuildMatchup.bind(app);
let conditionsToggleRebuilt = false;
app.rebuildMatchup = function(){
  conditionsToggleRebuilt = true;
  this.clearMatchupComputationCache();
  this.matchup.rows = [{ unit: conditionalAttacker, cells: [this.computeMatchupCell(conditionalAttacker, conditionalTarget)] }];
  this.matchupDefenderUnits = [conditionalTarget];
  this.seedAggregateCellCache();
};
app.setMatchupRecomputeOption('conditionsMet', true);
const conditionalOn = app.cachedMatchupCell(conditionalAttacker, conditionalTarget).dmg;
assert.ok(conditionsToggleRebuilt, 'setting Conditions Met triggers a matchup rebuild');
assert.ok(conditionalOn > conditionalOff, 'setting Conditions Met recalculates visible cells with conditional modifiers');
app.rebuildMatchup = originalRebuildMatchup;

const championSlayer = { label: 'Champion', abilities: ['Champion Slayer'], weapons: [], defense: { T: 4, Sv: 3, W: 3, models: 1 }, _unitKey: 'champion' };
const champSword = { name: 'Sword', range: 'Melee', A: '4', skill: '3', S: '5', AP: '2', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'champ-sword' };
assert.ok(/Reroll Wounds/i.test(app.effectiveWeaponModifiers(champSword, championSlayer, { label: 'Monster', _keywords: ['Monster'], defense: { T: 8, Sv: 3, W: 10, models: 1 } })), 'target-scoped modifiers apply into matching keywords');
assert.ok(!/Reroll Wounds/i.test(app.effectiveWeaponModifiers(champSword, championSlayer, { label: 'Infantry', _keywords: ['Infantry'], defense: { T: 4, Sv: 3, W: 2, models: 1 } })), 'target-scoped modifiers do not apply into non-matching keywords');

const kingsguard = { label: 'Arjac', abilities: ['Champion of The Kingsguard'], weapons: [], defense: { T: 5, Sv: 2, W: 6, models: 1 }, _unitKey: 'arjac' };
const kingsguardHammer = { name: 'Foehammer', range: 'Melee', A: '5', skill: '2', S: '8', AP: '2', D: '3', modifiers: '', mode: 'melee', _weaponKey: 'foehammer' };
assert.ok(/Reroll Hits/i.test(app.effectiveWeaponModifiers(kingsguardHammer, kingsguard, { label: 'Enemy Character', _keywords: ['Character'], defense: { T: 5, Sv: 2, W: 6, models: 1 } })), 'Champion of The Kingsguard applies into Character targets');
assert.ok(!/Reroll Hits/i.test(app.effectiveWeaponModifiers(kingsguardHammer, kingsguard, { label: 'Enemy unit', _keywords: ['Infantry'], defense: { T: 5, Sv: 2, W: 3, models: 1 } })), 'Champion of The Kingsguard does not apply into non-Character targets');

const braggart = { label: 'Battle Leader', abilities: ['Braggart’s Steel'], weapons: [], defense: { T: 4, Sv: 3, W: 4, models: 1 }, _unitKey: 'braggart' };
const braggartBlade = { name: 'Master-crafted power weapon', range: 'Melee', A: '4', skill: '3', S: '5', AP: '2', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'braggart-blade' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const braggartBaseMods = app.effectiveWeaponModifiers(braggartBlade, braggart, hardTarget);
assert.ok(/Strength \+2/i.test(braggartBaseMods), 'Braggart’s Steel always applies melee strength');
assert.ok(!/Damage \+1/i.test(braggartBaseMods), 'Braggart’s Steel boast damage is conditional');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Damage \+1/i.test(app.effectiveWeaponModifiers(braggartBlade, braggart, hardTarget)), 'Braggart’s Steel applies damage when conditions are met');

const heroicDefender = { label: 'Resolved Character', abilities: ['Heroic Resolve'], defense: { T: 4, Sv: 7, W: 3, models: 1 }, _unitKey: 'heroic-resolve' };
const damageTwo = { name: 'Damage two', range: '24', A: '1', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'damage-two' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
assert.ok(!/Damage -1/i.test(app.effectiveWeaponModifiers(damageTwo, darkPactAttacker, heroicDefender)), 'Heroic Resolve is off until conditions are met');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Damage -1/i.test(app.effectiveWeaponModifiers(damageTwo, darkPactAttacker, heroicDefender)), 'Heroic Resolve adds defensive damage reduction when conditions are met');

const rotCaster = { label: 'Rot caster', abilities: ["Nurgle's Rot"], weapons: [], defense: { T: 5, Sv: 3, W: 5, models: 1 }, _unitKey: 'rot-caster' };
const rotTarget = { label: 'Rot target', abilities: [], defense: { T: 6, Sv: 3, W: 4, models: 1 }, _unitKey: 'rot-target' };
assert.strictEqual(app.effectiveDefense(rotTarget, rotCaster).T, 5, 'conditional target-defense debuffs apply when conditions are met');
app.matchup.conditionsMet = false;
assert.strictEqual(app.effectiveDefense(rotTarget, rotCaster).T, 6, 'conditional target-defense debuffs are off by default');

const gloamTarget = { label: 'Gloam target', abilities: ['Gloam Rot'], defense: { T: 5, Sv: 3, W: 3, models: 1 }, _unitKey: 'gloam-target' };
const highStrengthWeapon = { name: 'Big hit', range: '24', A: '1', skill: '3', S: '8', AP: '1', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'big-hit' };
const lowStrengthWeapon = { name: 'Small hit', range: '24', A: '1', skill: '3', S: '4', AP: '1', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'small-hit' };
assert.ok(/Wound Rolls -1/i.test(app.effectiveWeaponModifiers(highStrengthWeapon, darkPactAttacker, gloamTarget)), 'defender abilities can add attack penalties when their condition matches');
assert.ok(!/Wound Rolls -1/i.test(app.effectiveWeaponModifiers(lowStrengthWeapon, darkPactAttacker, gloamTarget)), 'defender attack penalties respect strength/toughness conditions');
app.matchup.conditionsMet = false;
app.toggleUnitAbility(darkPactAttacker, 'Dark Pacts');
const darkPactDisabled = app.computeMatchupCell(darkPactAttacker, hardTarget);
assert.ok(Math.abs(darkPactDisabled.dmg - 0.5) < 1e-9, 'turning off Dark Pacts removes its chosen damage modifier');

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
