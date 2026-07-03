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
  queueMicrotask: fn => fn(),
};
context.global = context;
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'calculator-core.js'), 'utf8'), context, { filename: 'calculator-core.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'ability-modifiers.js'), 'utf8'), context, { filename: 'ability-modifiers.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'keyword-definitions.js'), 'utf8'), context, { filename: 'keyword-definitions.js' });
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
    weapons: [{ name: 'FNP check', range: '24', A: '2', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
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
    weapons: [{ name: 'FNP check', range: '24', A: '2', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
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
  { label: 'Infantry target', _keywords: ['Infantry'], defense: { T: 8, Sv: 7, W: 6, models: 1, totalWounds: 6 } },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
  }
);
const antiMatchupVehicle = context.window.MatchupEngine.computeCell(
  { label: 'Anti attacker', weapons: [antiVehicleWeapon], defense: { T: 4, Sv: 3, W: 2, models: 1 } },
  { label: 'Vehicle target', _keywords: ['Vehicle'], defense: { T: 8, Sv: 7, W: 6, models: 1, totalWounds: 6 } },
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

const hammerDevReroll = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Daemon hammer', range: 'Melee', A: '5', skill: '3', S: '8', AP: '2', D: '2', modifiers: '' },
  { T: 4, sv: 3, inv: 4, W: 4, Fnp: 0 },
  'Devastating Wounds, Melee: Strength +1, Melee: Attacks +1, Melee: AP +1, Melee: Damage +1, Melee: Reroll Wounds, Sustained Hits 1',
  { includeFormula: true }
);
assert.ok(Math.abs(hammerDevReroll.dmg - 8.75) < 1e-9, 'full wound rerolls choose one valid strategy instead of stacking failure rerolls and crit fishing');
assert.notStrictEqual(hammerDevReroll.formula.defense.Fnp, 0, 'formula defense omits zero-value FNP');

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
const psychicPenaltyBaseline = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Psychic baseline', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  ''
);
const psychicIgnoredHitPenalty = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Psychic ignores hit penalty', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Psychic, Hit Rolls -1'
);
const psychicIgnoredSkillPenalty = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Psychic ignores skill penalty', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Psychic, BS -1, WS -1'
);
const psychicWoundPenalty = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Psychic keeps wound penalty', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Psychic, Wound Rolls -1'
);
assert.ok(Math.abs(psychicIgnoredHitPenalty.dmg - psychicPenaltyBaseline.dmg) < 1e-9, 'Psychic attacks ignore negative hit-roll modifiers');
assert.ok(Math.abs(psychicIgnoredSkillPenalty.dmg - psychicPenaltyBaseline.dmg) < 1e-9, 'Psychic attacks ignore negative BS and WS modifiers');
assert.ok(psychicWoundPenalty.dmg < psychicPenaltyBaseline.dmg, 'Psychic attacks do not ignore negative wound-roll modifiers');

const blastSmallTarget = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Blast check', A: '1', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: 'Blast' },
  { T: 4, sv: 7, inv: 0, W: 20, models: 4 },
  'Blast',
  { includeFormula: true }
);
const blastTenTarget = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Blast check', A: '1', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: 'Blast' },
  { T: 4, sv: 7, inv: 0, W: 20, models: 10 },
  'Blast',
  { includeFormula: true }
);
const blastTwoTenTarget = context.window.WeaponCalc.calcOneWeapon(
  { name: 'Blast two check', A: '1', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: 'Blast 2' },
  { T: 4, sv: 7, inv: 0, W: 20, models: 10 },
  'Blast 2',
  { includeFormula: true }
);
assert.ok(Math.abs(blastTenTarget.formula.attacks - 3) < 1e-9, 'Blast adds one attack per five target models');
assert.ok(Math.abs(blastTenTarget.dmg - (blastSmallTarget.dmg * 3)) < 1e-9, 'Blast increases damage from target model count');
assert.ok(Math.abs(blastTwoTenTarget.formula.attacks - 5) < 1e-9, 'Blast X adds X attacks per five target models');

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

const sharedStateDefender = {
  label: 'Shared state defender',
  defense: { T: 4, Sv: 7, W: 2, models: 3, totalWounds: 9 },
  _children: [
    { label: 'Bodyguard 1', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    { label: 'Bodyguard 2', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    { label: 'Attached Character', _isCharacterModel: true, defense: { T: 10, Sv: 2, W: 5, models: 1, totalWounds: 5 } },
  ],
};
const sharedStateCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Three separate gunners',
    defense: { T: 4, Sv: 3, W: 1, models: 3 },
    _children: [
      { label: 'Gunner 1', weapons: [{ name: 'Clean kill 1', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '2', mode: 'ranged' }], defense: { T: 4, Sv: 3, W: 1, models: 1 } },
      { label: 'Gunner 2', weapons: [{ name: 'Clean kill 2', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '2', mode: 'ranged' }], defense: { T: 4, Sv: 3, W: 1, models: 1 } },
      { label: 'Gunner 3', weapons: [{ name: 'Clean kill 3', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '2', mode: 'ranged' }], defense: { T: 4, Sv: 3, W: 1, models: 1 } },
    ],
  },
  sharedStateDefender,
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
    combineShootingProfiles: true,
  }
);
assert.ok(sharedStateCell.dmg < 6 && sharedStateCell.dmg > 3, 'unit attacks share defender wound state instead of every model hitting a fresh bodyguard pool');

const precisionAfterCharacterCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Precision then normal',
    weapons: [
      { name: 'Character picker', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '5', modifiers: 'Precision', mode: 'ranged' },
      { name: 'Follow up shots', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '2', modifiers: '', mode: 'ranged' },
    ],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  sharedStateDefender,
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
    combineShootingProfiles: true,
  }
);
assert.ok(precisionAfterCharacterCell.dmg > 5, 'Precision weapons remove character wounds before later non-Precision weapons continue into bodyguards');

const optimalOrderCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Optimal order attacker',
    weapons: [
      { name: 'Infantry sweeper', range: '24', A: '6', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged' },
      { name: 'Tank breaker', range: '24', A: '1', skill: 'auto', S: '99', AP: '6', D: '4', modifiers: '', mode: 'ranged' },
    ],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  {
    label: 'Worst first defender',
    defense: { T: 4, Sv: 7, W: 2, models: 2, totalWounds: 6 },
    _children: [
      { label: 'Hard target', defense: { T: 10, Sv: 7, W: 4, models: 1, totalWounds: 4 } },
      { label: 'Soft target', defense: { T: 3, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    ],
  },
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    isAbilityEnabled: () => true,
    combineShootingProfiles: true,
  }
);
assert.ok(optimalOrderCell.weaponName.startsWith('1x Tank breaker'), 'weapon order is selected by best damage into the current worst legal defensive profile');

const app = context.weaponVsDefenseApp();
const movementProfileUnit = { label: 'Movement profile', defense: { M: '6"', T: 4, Sv: 3, Inv: 5, W: 2, models: 5 } };
assert.ok(/^M6" \| T4 \| 3\+ 5\+\+ \| W2 \| 5 models$/.test(app.profileDefenseHeaderLabel(movementProfileUnit)), 'unit profile modal defense line shows movement before toughness');
assert.ok(/^T4 \| 3\+ 5\+\+ \| W2 \| 5 models$/.test(app.matchupDefenseHeaderLabel(movementProfileUnit)), 'matchup grid defense line does not add movement');
assert.ok(/M6&quot;.*T4/.test(app.profileChildSummaryHtml(movementProfileUnit)), 'unit profile modal child summaries show movement before toughness');
app.addBaseProfilesRoster();
assert.strictEqual(app.activeView, 'matchups', 'Unit Matchups view is active by default');
app.switchToMatchupView({ reset: true });
assert.strictEqual(app.activeView, 'matchups', 'Unit Matchups switches to the matchup grid view');
assert.strictEqual(app.matchupModalOpen, true, 'matchup calculations are active when the matchup view is shown');
assert.ok(app.matchup.rows.length > 0, 'matchup view builds the grid rows');
app.switchToCalcView();
assert.strictEqual(app.activeView, 'calc', 'Weapon Damage Calc switches back to the calculator view');
assert.strictEqual(app.matchupModalOpen, false, 'leaving the matchup view does not keep a matchup modal active');
const baseProfiles = app.baseProfilesRosterData();
const baseProfileUnits = baseProfiles.roster.forces[0]._importedUnits;
assert.strictEqual(baseProfiles.roster.name, 'Base Profiles', 'base profiles roster is named for generic matchup use');
assert.strictEqual(baseProfileUnits.length, 10, 'base profiles roster includes ten common unique defensive profiles');
assert.ok(baseProfileUnits.every(unit => unit.weapons.length > 0 && !unit.abilities.length && !(unit._enhancements || []).length), 'base profiles roster includes weapon profiles but no abilities or enhancements');
assert.ok(baseProfileUnits.every(unit => unit.weapons.every(weapon => !weapon.modifiers)), 'base profile weapons are modifier-free baseline profiles');
assert.ok(baseProfileUnits.every(unit => Number.isFinite(unit._points) && unit._points > 0), 'base profiles include point values for scoring');
const lightInfantryProfile = baseProfileUnits.find(unit => unit.label === 'Light Infantry');
assert.ok(lightInfantryProfile, 'base profiles include light infantry');
assert.strictEqual(lightInfantryProfile.defense.models, 10, 'light infantry uses a common ten-model squad size');
assert.strictEqual(lightInfantryProfile.defense.totalWounds, 10, 'light infantry total wounds match its model count');
assert.strictEqual(lightInfantryProfile._points, 60, 'light infantry includes a common low-cost squad point value');
assert.ok(lightInfantryProfile.weapons.some(weapon => weapon.name === 'Basic rifle' && weapon.A === '10' && weapon.mode === 'ranged'), 'light infantry includes a common basic ranged profile');
const powerArmourProfile = baseProfileUnits.find(unit => unit.label === 'Power Armour');
assert.ok(powerArmourProfile, 'base profiles include power armour');
assert.strictEqual(powerArmourProfile.defense.models, 5, 'power armour uses a common five-model squad size');
assert.strictEqual(powerArmourProfile._points, 90, 'power armour includes a common five-model point value');
assert.ok(powerArmourProfile.weapons.some(weapon => weapon.name === 'Bolt rifle' && weapon.AP === '1'), 'power armour includes a common bolt rifle profile');
const terminatorProfile = baseProfileUnits.find(unit => unit.label === 'Terminators');
assert.ok(terminatorProfile.weapons.some(weapon => weapon.name === 'Power fists' && weapon.mode === 'melee'), 'terminators include a common heavy melee profile');
const titanicProfile = baseProfileUnits.find(unit => unit.label === 'Titanic Target');
assert.ok(titanicProfile && titanicProfile.defense.T === 12 && titanicProfile.defense.Inv === 5 && titanicProfile.defense.W === 22, 'base profiles include a titanic target');
assert.strictEqual(titanicProfile._points, 400, 'titanic target includes a common large-model point value');

const baseScoreApp = context.weaponVsDefenseApp();
baseScoreApp.addRoster({
  roster: {
    name: 'Score attacker roster',
    forces: [{
      name: 'Force',
      _importedUnits: [{
        label: 'Score attacker',
        weapons: [{ name: 'Score gun', range: '24', A: '6', skill: 'auto', S: '5', AP: '1', D: '1', modifiers: '', mode: 'ranged' }],
        defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 },
        abilities: [],
        _unitKey: 'score-attacker',
        _groupId: 'score-attacker',
        _points: 100,
        _children: [],
      }],
    }],
  },
}, 'Score attacker roster');
baseScoreApp.addRoster(baseProfiles, 'Base Profiles');
baseScoreApp.selectedRosterIdx = 0;
baseScoreApp.selectedForceIdx = 0;
baseScoreApp.openMatchupModal();
const baseDefender = baseScoreApp.matchupDefenderUnits.find(unit => unit.label === 'Power Armour');
assert.ok(baseDefender, 'base profiles can be selected as matchup defenders');
assert.ok(/^\(90 pts\) - Def Score: \d+$/.test(baseScoreApp.matchupHeaderMeta(baseDefender, 'defender')), 'base profiles display calibrated defensive scores from their point values');
baseScoreApp.swapMatchupSides();
const baseAttacker = baseScoreApp.matchupAttackerUnits.find(unit => unit.label === 'Power Armour');
assert.ok(baseAttacker, 'base profiles can be selected as matchup attackers');
assert.ok(/^\(90 pts\) - Atk Score: \d+$/.test(baseScoreApp.matchupHeaderMeta(baseAttacker, 'attacker')), 'base profiles display calibrated offensive scores from their point values and weapon profiles');
assert.ok(baseScoreApp.cachedMatchupCell(baseAttacker, baseScoreApp.matchupDefenderUnits[0]).dmg > 0, 'base profile weapon packages produce matchup damage');

assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Dark Pacts')),
  JSON.stringify(['Unit-wide | Choose Best: Lethal Hits; Sustained Hits 1']),
  'profile modal can list mapped modifiers under abilities'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames("Disciples of Be'lakor")),
  JSON.stringify(['Unit-wide | Choose Best: Lethal Hits; Sustained Hits 1']),
  "Disciples of Be'lakor maps to the same always-on best Dark Pacts modifier"
);
const veteransModifierList = app.unitAbilityModifierNames('Veterans of the Long War');
assert.ok(veteransModifierList.includes('Conditional | Unit-wide | Melee: Reroll Wounds'), 'Veterans of the Long War uses the generic conditional gate for full wound rerolls');
assert.ok(!veteransModifierList.some(mod => /Target On Objective/i.test(mod)), 'Veterans of the Long War does not expose bespoke objective-condition wording');
const descriptionApp = context.weaponVsDefenseApp();
descriptionApp.addRoster({
  roster: {
    name: 'Description roster',
    battleScribeVersion: 2.03,
    forces: [{
      name: 'Force',
      selections: [{
        type: 'unit',
        id: 'description-unit',
        name: 'Description Unit',
        number: '1',
        profiles: [
          {
            typeName: 'Unit',
            name: 'Description Unit',
            characteristics: [
              { name: 'T', $text: '4' },
              { name: 'Sv', $text: '3+' },
              { name: 'W', $text: '2' },
            ],
          },
          {
            typeName: 'Abilities',
            name: 'Veterans of the Long War',
            characteristics: [{ name: 'Description', $text: 'Each time this unit makes a melee attack, reroll wound rolls of 1.' }],
          },
        ],
        selections: [{
          type: 'upgrade',
          name: 'Fade to Darkness',
          costs: [{ name: 'pts', value: '30' }],
          profiles: [{
            typeName: 'Abilities',
            name: 'Fade to Darkness',
            characteristics: [{ name: 'Description', $text: 'Once per battle, this unit fades away from danger.' }],
          }],
        }],
      }],
    }],
  },
}, 'Description roster');
const descriptionUnit = descriptionApp.units[0];
assert.ok(/melee attack/i.test(descriptionApp.unitAbilityDescription(descriptionUnit, 'Veterans of the Long War')), 'raw roster ability descriptions are retained on imported units');
descriptionApp.openRuleDescription({ type: 'Ability', name: 'Veterans of the Long War', title: 'Veterans of the Long War', unit: descriptionUnit });
assert.ok(descriptionApp.ruleDescriptionModalOpen, 'clicking an ability name can open the rule description modal');
assert.ok(/reroll wound rolls of 1/i.test(descriptionApp.ruleDescription.description), 'ability description modal uses imported roster text');
descriptionApp.openRuleDescription({ type: 'Enhancement', name: 'Fade to Darkness', title: 'Fade to Darkness', enhancement: descriptionUnit._enhancements[0], unit: descriptionUnit });
assert.ok(/fades away/i.test(descriptionApp.ruleDescription.description), 'enhancement description modal uses imported roster text');
descriptionApp.openRuleDescription({ type: 'Keyword', name: 'Sustained Hits 1', title: 'Sustained Hits 1' });
assert.ok(/additional hit/i.test(descriptionApp.ruleDescription.description), 'keyword description modal uses local keyword definitions');
descriptionApp.closeRuleDescription();
assert.ok(!descriptionApp.ruleDescriptionModalOpen, 'rule description modal can close independently');
const disciplesImportApp = context.weaponVsDefenseApp();
disciplesImportApp.addRoster({
  roster: {
    name: 'Disciples import check',
    battleScribeVersion: 2.03,
    forces: [{
      name: 'Force',
      selections: [{
        id: 'disciples-unit',
        type: 'unit',
        name: "Be'lakor",
        number: 1,
        rules: [{ name: 'Dark Pacts' }],
        profiles: [
          {
            typeName: 'Unit',
            name: "Be'lakor",
            characteristics: [
              { name: 'T', $text: '10' },
              { name: 'Sv', $text: '3+' },
              { name: 'W', $text: '18' },
            ],
          },
          { typeName: 'Abilities', name: "Disciples of Be'lakor", characteristics: [] },
        ],
      }],
    }],
  },
}, 'Disciples import check');
assert.strictEqual(
  JSON.stringify(disciplesImportApp.units[0].abilities),
  JSON.stringify(["Disciples of Be'lakor"]),
  "imports Disciples of Be'lakor without also showing Dark Pacts"
);
const deleteUnitApp = context.weaponVsDefenseApp();
deleteUnitApp.addRoster({
  roster: {
    name: 'Delete unit check',
    battleScribeVersion: 2.03,
    forces: [{
      name: 'Force',
      selections: [
        {
          id: 'unit-a',
          type: 'unit',
          name: 'Unit A',
          number: 1,
          profiles: [{
            typeName: 'Unit',
            name: 'Unit A',
            characteristics: [
              { name: 'T', $text: '4' },
              { name: 'Sv', $text: '3+' },
              { name: 'W', $text: '2' },
            ],
          }],
        },
        {
          id: 'unit-b',
          type: 'unit',
          name: 'Unit B',
          number: 1,
          profiles: [{
            typeName: 'Unit',
            name: 'Unit B',
            characteristics: [
              { name: 'T', $text: '5' },
              { name: 'Sv', $text: '4+' },
              { name: 'W', $text: '3' },
            ],
          }],
        },
      ],
    }],
  },
}, 'Delete unit check');
assert.strictEqual(deleteUnitApp.unitDropdownLabel(deleteUnitApp.units[0]), 'Unit A (1)', 'main unit dropdown labels include model count');
deleteUnitApp.selectedUnitIdx = 0;
deleteUnitApp.duplicateSelectedUnit();
assert.strictEqual(deleteUnitApp.units.length, 3, 'Duplicate adds a copy of the selected unit');
assert.ok(/^Unit A Copy/.test(deleteUnitApp.activeUnit.label), 'Duplicate selects the copied unit');
assert.notStrictEqual(deleteUnitApp.units[0]._unitKey, deleteUnitApp.activeUnit._unitKey, 'Duplicate assigns a distinct unit key');
deleteUnitApp.deleteSelectedUnit();
assert.strictEqual(deleteUnitApp.units.length, 2, 'Delete removes the duplicated unit safely');
deleteUnitApp.selectedUnitIdx = 0;
deleteUnitApp.deleteSelectedUnit();
assert.strictEqual(deleteUnitApp.units.length, 1, 'Delete Unit removes the selected unit from the main unit list');
assert.strictEqual(deleteUnitApp.units[0].label, 'Unit B', 'Delete Unit keeps the remaining unit selected safely');

const renameUnitApp = context.weaponVsDefenseApp();
renameUnitApp.addRoster({
  roster: {
    name: 'Rename unit check',
    forces: [{
      name: 'Force',
      _importedUnits: [{
        label: 'Wolf Squad',
        weapons: [],
        defense: { T: 4, Sv: 3, W: 2, models: 2 },
        _unitKey: 'wolf-squad',
        _groupId: 'wolf-squad',
        _children: [
          { label: 'Pack Leader', weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'pack-leader', _groupId: 'wolf-squad' },
          { label: 'Wolf Guard', weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'wolf-guard', _groupId: 'wolf-squad' },
        ],
      }, {
        label: 'Leader',
        weapons: [],
        defense: { T: 4, Sv: 3, W: 3, models: 1 },
        _unitKey: 'leader',
        _groupId: 'leader',
      }],
      _unitMerges: [],
    }],
  },
}, 'Rename unit check');
renameUnitApp.selectedUnitIdx = renameUnitApp.units.findIndex(unit => unit._unitKey === 'wolf-squad');
renameUnitApp.renameUnit(renameUnitApp.activeUnit, 'Renamed Squad');
assert.strictEqual(renameUnitApp.activeUnit.label, 'Renamed Squad', 'renaming a main unit refreshes the selected unit label');
assert.ok(/^Renamed Squad \(\d+\)$/.test(renameUnitApp.unitDropdownLabel(renameUnitApp.activeUnit)), 'renaming a main unit updates the dropdown label');
assert.strictEqual(renameUnitApp.forces[0]._importedUnits[0].label, 'Renamed Squad', 'renaming persists to the imported unit source');
renameUnitApp.profileModalOpen = true;
renameUnitApp.profileUnit = renameUnitApp.activeUnit;
const renamedChild = renameUnitApp.profileUnit._children[0];
renameUnitApp.renameUnit(renamedChild, 'Pack Boss');
assert.strictEqual(renameUnitApp.profileUnit.label, 'Renamed Squad', 'renaming a child keeps the parent profile modal open');
assert.ok(renameUnitApp.profileUnit._children.some(child => child.label === 'Pack Boss'), 'renaming a child updates model rows in the profile modal');
assert.ok(renameUnitApp.forces[0]._importedUnits[0]._children.some(child => child.label === 'Pack Boss'), 'renaming a child persists to the imported model source');
renameUnitApp.matchup.attackerRosterIdx = 0;
renameUnitApp.matchup.attackerForceIdx = 0;
renameUnitApp.matchup.defenderRosterIdx = 0;
renameUnitApp.matchup.defenderForceIdx = 0;
renameUnitApp.onMatchupRosterChanged('attacker', false);
renameUnitApp.onMatchupRosterChanged('defender', false);
renameUnitApp.matchupMerge.attackerFrom = 'leader';
renameUnitApp.matchupMerge.attackerTo = 'wolf-squad';
renameUnitApp.applyManualMerge('attacker');
assert.strictEqual(renameUnitApp.activeUnit._unitKey, 'wolf-squad', 'merging into the selected roster keeps the main dropdown mapped to the target unit');
assert.strictEqual(renameUnitApp.activeUnit.label, 'Renamed Squad', 'merged unit keeps renamed target label in the main dropdown');
renameUnitApp.matchupMerge.attackerTo = 'wolf-squad';
renameUnitApp.unmergeSelectedUnit('attacker');
assert.ok(renameUnitApp.units.some(unit => unit.label === 'Pack Boss'), 'unmerge keeps renamed unique model names when they split out');

const renameNoRecalcApp = context.weaponVsDefenseApp();
renameNoRecalcApp.addRoster({
  roster: {
    name: 'Rename no recalc check',
    forces: [{
      name: 'Force',
      _importedUnits: [{
        label: 'Old Attacker',
        weapons: [{ name: 'Test blade', range: 'Melee', A: '2', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee' }],
        defense: { T: 4, Sv: 3, W: 2, models: 1 },
        _unitKey: 'old-attacker',
        _groupId: 'old-attacker',
      }, {
        label: 'Target',
        weapons: [],
        defense: { T: 4, Sv: 7, W: 2, models: 1 },
        _unitKey: 'target',
        _groupId: 'target',
      }],
      _unitMerges: [],
    }],
  },
}, 'Rename no recalc check');
renameNoRecalcApp.selectedUnitIdx = renameNoRecalcApp.units.findIndex(unit => unit._unitKey === 'old-attacker');
renameNoRecalcApp.matchupModalOpen = true;
renameNoRecalcApp.matchup.attackerRosterIdx = renameNoRecalcApp.selectedRosterIdx;
renameNoRecalcApp.matchup.attackerForceIdx = 0;
renameNoRecalcApp.matchup.defenderRosterIdx = renameNoRecalcApp.selectedRosterIdx;
renameNoRecalcApp.matchup.defenderForceIdx = 0;
renameNoRecalcApp.matchup.showMelee = true;
renameNoRecalcApp.rebuildMatchup();
const renameCacheTokenBefore = renameNoRecalcApp.matchup.cacheWarmToken;
let renameRecalcCount = 0;
const originalRenameCompute = renameNoRecalcApp.computeMatchupCell.bind(renameNoRecalcApp);
renameNoRecalcApp.computeMatchupCell = (...args) => {
  renameRecalcCount += 1;
  return originalRenameCompute(...args);
};
renameNoRecalcApp.renameUnit(renameNoRecalcApp.activeUnit, 'New Attacker');
assert.strictEqual(renameRecalcCount, 0, 'renaming a unit does not recalculate matchup cells');
assert.strictEqual(renameNoRecalcApp.matchup.cacheWarmToken, renameCacheTokenBefore, 'renaming a unit does not clear matchup caches');
assert.ok(renameNoRecalcApp.matchup.rows.some(row => /^New Attacker/.test(row.unit.label || '')), 'renaming updates the current matchup grid row label');
assert.ok(renameNoRecalcApp.matchupVisibleRows().some(row => /^New Attacker/.test(row.unit.label || '')), 'renaming updates visible matchup row labels');

assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Shadow Lord (Aura, Psychic)')),
  JSON.stringify(['Unit-wide | Reroll Hits 1']),
  'imported Shadow Lord aura maps to an always-on unit-wide hit reroll modifier'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Oath of Moment')),
  JSON.stringify(['Conditional | Reroll Hits']),
  'Oath of Moment is treated as a conditional hit reroll'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Daemon Lord of Khorne (Aura)')),
  JSON.stringify(['Conditional | Unit-wide | Melee: Hit Rolls +1']),
  'Daemon Lord aura aliases from Daemons Options map to their damage modifier'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Master of Magicks (Psychic)')),
  JSON.stringify(['Conditional | Weapon: Bolt of Change | Choose Best: Ignores Cover; Lethal Hits; Sustained Hits D3']),
  'Psychic suffix aliases map to the same modifier choices'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Formidably Resilient')),
  JSON.stringify(['Defense Attack: Damage /2']),
  'Formidably Resilient maps to its incoming damage modifier'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Damaged: 1-5 wounds remaining')),
  JSON.stringify([]),
  'self-detrimental conditional modifiers are hidden from ability modifier lists'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Stealth')),
  JSON.stringify(['Defense: Cover']),
  'Stealth maps to a defensive Cover modifier'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Relentless Carnage')),
  JSON.stringify(['Conditional | Fight Phase Mortals: 8D6 4+']),
  'Bloodthirster Relentless Carnage maps to its conditional fight phase mortal wounds'
);
assert.strictEqual(JSON.stringify(app.weaponKeywordList({ modifiers: 'Torrent, Ignores Cover' })), JSON.stringify(['Torrent', 'Ignores Cover']), 'main page weapon keyword rows split imported modifiers');
const mixedMainPageDefense = {
  label: 'Mixed defense unit',
  defense: { T: 5, Sv: 2, Inv: 4, W: 4, models: 4, totalWounds: 15 },
  _children: [
    { label: 'Shield models', defense: { T: 5, Sv: 2, Inv: 4, W: 4, models: 3 } },
    { label: 'Pack leader', defense: { T: 5, Sv: 2, Inv: 4, W: 3, models: 1 } },
  ],
};
const mixedMainPageDefenseHtml = app.renderUnitDefenseProfiles(mixedMainPageDefense);
assert.ok(/T5.*defenseProfileSeparator.*2\+ 4\+\+.*defenseProfileSeparator.*W4.*defenseProfileSeparator.*3 models/.test(mixedMainPageDefenseHtml), 'main page defense panel renders the first unique child defensive profile');
assert.ok(/T5.*defenseProfileSeparator.*2\+ 4\+\+.*defenseProfileSeparator.*W3.*defenseProfileSeparator.*1 models/.test(mixedMainPageDefenseHtml), 'main page defense panel renders additional unique child defensive profiles');
app.defense.Inv = 4;
app.defense.Fnp = 5;
app.units = [{ label: 'No invulnerable', defense: { T: 4, Sv: 3, Inv: null, W: 2, models: 1 } }];
app.selectedUnitIdx = 0;
app.loadSelectedDefenseIntoForm();
assert.strictEqual(app.defense.Inv, '', 'loading a selected defense clears a stale invulnerable save when the new unit lacks one');
assert.strictEqual(app.defense.Fnp, '', 'loading a selected defense clears stale FNP when the new unit lacks one');
const modifiedDefenseLine = app.matchupDefenseProfileLine(
  app.applyDefenseModifiers(
    { T: 4, Sv: 3, Inv: 5, W: 2, models: 1 },
    ['Defense: Toughness +1', 'Defense: Save +1', 'Defense: FNP 5+']
  ),
  1
);
assert.strictEqual(modifiedDefenseLine, 'T5 | 2+ 5++ | W2 | FNP 5+ | 1 models', 'defensive modifiers and FNP are reflected in header formatting');
const stealthTarget = { label: 'Stealth target', abilities: ['Stealth'], defense: { T: 4, Sv: 4, W: 2, models: 1, totalWounds: 2 }, _unitKey: 'stealth-target' };
assert.strictEqual(app.effectiveDefense(stealthTarget).cover, true, 'Stealth gives the unit cover in its effective defensive profile');
assert.strictEqual(app.matchupDefenseProfileLine(app.effectiveDefense(stealthTarget), 1), 'T4 | 4+ | W2 | Cover | 1 models', 'cover is reflected in defensive profile text');
const faithfulFlockTarget = { label: 'Faithful Flock target', abilities: ['Faithful Flock'], defense: { T: 3, Sv: 7, W: 1, models: 10 }, _unitKey: 'faithful-flock' };
const faithfulDefenseHtml = app.renderUnitDefenseProfiles(faithfulFlockTarget);
assert.ok(/5\+\+/.test(faithfulDefenseHtml), 'main defense profile display includes ability-granted invulnerable saves');
assert.ok(/Invulnerable Save 5\+/.test(faithfulDefenseHtml), 'main defense profile display lists the active defensive modifier');
assert.ok(/5\+\+/.test(app.matchupDefenseHeaderLabel(faithfulFlockTarget)), 'grid defensive profile headers include ability-granted saves');
assert.ok(!/added/i.test(app.matchupDefenseHeaderLabel(faithfulFlockTarget)), 'grid defensive profile headers do not append added text');
app.units = [faithfulFlockTarget];
app.selectedUnitIdx = 0;
app.loadSelectedDefenseIntoForm();
assert.strictEqual(app.defense.Inv, 5, 'loading selected defense uses ability-granted invulnerable saves');
const appGridFnpAttacker = {
  label: 'App grid FNP attacker',
  weapons: [{ name: 'FNP grid gun', range: '24', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'fnp-grid-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'app-grid-fnp-attacker',
};
const appGridNoFnpTarget = { label: 'App grid no FNP target', defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 }, _unitKey: 'app-grid-no-fnp-target' };
const appGridFnpTarget = { label: 'App grid FNP target', defense: { T: 4, Sv: 7, W: 100, Fnp: 5, models: 1, totalWounds: 100 }, _unitKey: 'app-grid-fnp-target' };
app.clearMatchupComputationCache();
const appGridNoFnpDamage = app.computeMatchupCell(appGridFnpAttacker, appGridNoFnpTarget).dmg;
const appGridFnpDamage = app.computeMatchupCell(appGridFnpAttacker, appGridFnpTarget).dmg;
assert.ok(Math.abs(appGridFnpDamage - (appGridNoFnpDamage * (2 / 3))) < 1e-9, 'app matchup grid damage is reduced by defender FNP');
const customFnpTarget = { label: 'Custom FNP target', defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 }, _unitKey: 'custom-fnp-target' };
app.addCustomModifierSpec(customFnpTarget, 'Defense: Feel No Pain 5+');
app.clearMatchupComputationCache();
const customFnpDamage = app.computeMatchupCell(appGridFnpAttacker, customFnpTarget).dmg;
assert.ok(Math.abs(customFnpDamage - (appGridNoFnpDamage * (2 / 3))) < 1e-9, 'ability/custom defensive FNP modifiers reduce matchup grid damage');
assert.strictEqual(app.effectiveDefense(customFnpTarget).Fnp, 5, 'ability/custom defensive FNP modifiers are reflected in effective defense');
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('Collar of Khorne')), JSON.stringify(['Defense Attack: FNP 3+ | Weapon is Psychic']), 'Collar of Khorne maps to a weapon-keyword-scoped defensive FNP');
const collarTarget = { label: 'Flesh Hounds', abilities: ['Collar of Khorne'], defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 }, _unitKey: 'collar-target' };
const collarNonPsychicAttacker = {
  label: 'Non-psychic attacker',
  weapons: [{ name: 'Normal gun', range: '24', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'normal-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'normal-attacker',
};
const collarPsychicAttacker = {
  ...collarNonPsychicAttacker,
  label: 'Psychic attacker',
  weapons: [{ ...collarNonPsychicAttacker.weapons[0], name: 'Psychic gun', modifiers: 'Psychic', _weaponKey: 'psychic-gun' }],
  _unitKey: 'psychic-attacker',
};
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
assert.ok(collarTarget.defense.Fnp == null, 'Collar of Khorne does not become a universal defensive FNP');
assert.ok(!/FNP/i.test(app.effectiveWeaponModifiers(collarNonPsychicAttacker.weapons[0], collarNonPsychicAttacker, collarTarget)), 'Collar of Khorne does not apply into non-Psychic weapons');
assert.ok(/FNP 3\+/i.test(app.effectiveWeaponModifiers(collarPsychicAttacker.weapons[0], collarPsychicAttacker, collarTarget)), 'Collar of Khorne applies into Psychic weapons');
const collarNonPsychicDamage = app.computeMatchupCell(collarNonPsychicAttacker, collarTarget).dmg;
const collarPsychicDamage = app.computeMatchupCell(collarPsychicAttacker, collarTarget).dmg;
assert.ok(collarPsychicDamage < collarNonPsychicDamage, 'Collar of Khorne reduces damage only from Psychic weapons');
const collarFormulaCell = app.computeMatchupCell(collarPsychicAttacker, collarTarget, { includeFormula: true });
app.formulaCell = collarFormulaCell;
assert.ok(app.matchupFormulaLines().some(line => /after FNP/i.test(line)), 'Psychic weapon calculations show Collar of Khorne FNP in the formula');
app.toggleUnitAbility(collarTarget, 'Collar of Khorne');
const collarDisabledDamage = app.computeMatchupCell(collarPsychicAttacker, collarTarget).dmg;
assert.ok(Math.abs(collarDisabledDamage - collarNonPsychicDamage) < 1e-9, 'turning off Collar of Khorne removes the Psychic FNP');
app.toggleUnitAbility(collarTarget, 'Collar of Khorne');
const conditionalDefenseAttacker = {
  label: 'Conditional defense attacker',
  weapons: [{ name: 'S4 grid gun', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'conditional-defense-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'conditional-defense-attacker',
};
const nurgleAuraTarget = { label: 'Nurgle aura target', abilities: ['Daemon Lord of Nurgle'], defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 }, _unitKey: 'nurgle-aura-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const nurgleAuraOff = app.computeMatchupCell(conditionalDefenseAttacker, nurgleAuraTarget).dmg;
assert.strictEqual(app.effectiveDefense(nurgleAuraTarget).T, 4, 'conditional defensive profile modifiers are off by default');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const nurgleAuraOn = app.computeMatchupCell(conditionalDefenseAttacker, nurgleAuraTarget).dmg;
assert.strictEqual(app.effectiveDefense(nurgleAuraTarget).T, 5, 'conditional defensive profile modifiers apply when Conditions Met is enabled');
assert.ok(nurgleAuraOn < nurgleAuraOff, 'conditional defensive profile modifiers reduce matchup grid damage when Conditions Met is enabled');
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
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
const coverCheckAttacker = {
  label: 'Cover check attacker',
  weapons: [{ name: 'AP0 shots', range: '24', A: '6', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'ranged' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const coverCheckTarget = { label: 'Cover check target', defense: { T: 4, Sv: 4, W: 2, models: 1, totalWounds: 2 } };
const uncoveredCell = context.window.MatchupEngine.computeCell(coverCheckAttacker, coverCheckTarget, {
  isWeaponEnabled: () => true,
  isMeleeEnabled: () => true,
  effectiveWeaponModifiers: weapon => weapon.modifiers || '',
  effectiveDefense: unit => unit.defense || {},
  isAbilityEnabled: () => true,
});
const coveredCell = context.window.MatchupEngine.computeCell(coverCheckAttacker, coverCheckTarget, {
  isWeaponEnabled: () => true,
  isMeleeEnabled: () => true,
  effectiveWeaponModifiers: weapon => weapon.modifiers || '',
  effectiveDefense: unit => app.applyDefenseModifiers(unit.defense || {}, ['Defense: Cover']),
  isAbilityEnabled: () => true,
});
const ignoresCoverCell = context.window.MatchupEngine.computeCell(
  { ...coverCheckAttacker, weapons: [{ ...coverCheckAttacker.weapons[0], modifiers: 'Ignores Cover' }] },
  coverCheckTarget,
  {
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: weapon => weapon.modifiers || '',
    effectiveDefense: unit => app.applyDefenseModifiers(unit.defense || {}, ['Defense: Cover']),
    isAbilityEnabled: () => true,
  }
);
assert.ok(coveredCell.dmg < uncoveredCell.dmg, 'cover reduces incoming failed-save damage in matchup calculations');
assert.ok(Math.abs(ignoresCoverCell.dmg - uncoveredCell.dmg) < 1e-9, 'Ignores Cover bypasses defensive cover in matchup calculations');

const darkPactAttacker = {
  label: 'Dark Pact unit',
  abilities: ['Dark Pacts'],
  weapons: [{ name: 'Pact gun', range: '24', A: '6', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'pact-gun' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const easyTarget = { label: 'Easy target', defense: { T: 3, Sv: 7, W: 10, models: 1, totalWounds: 10 } };
const hardTarget = { label: 'Hard target', defense: { T: 20, Sv: 7, W: 10, models: 1, totalWounds: 10 } };
const darkPactEasy = app.computeMatchupCell(darkPactAttacker, easyTarget);
const darkPactHard = app.computeMatchupCell(darkPactAttacker, hardTarget);
assert.ok(Math.abs(darkPactEasy.dmg - (10 / 3)) < 1e-9, 'Dark Pacts chooses Sustained Hits when it beats Lethal Hits');
assert.ok(Math.abs(darkPactHard.dmg - (4 / 3)) < 1e-9, 'Dark Pacts chooses Lethal Hits when it beats Sustained Hits');
const disciplesAttacker = {
  ...darkPactAttacker,
  label: "Disciples of Be'lakor unit",
  abilities: ["Disciples of Be'lakor"],
};
const disciplesEasy = app.computeMatchupCell(disciplesAttacker, easyTarget);
const disciplesHard = app.computeMatchupCell(disciplesAttacker, hardTarget);
assert.ok(Math.abs(disciplesEasy.dmg - darkPactEasy.dmg) < 1e-9, "Disciples of Be'lakor chooses Sustained Hits when it beats Lethal Hits");
assert.ok(Math.abs(disciplesHard.dmg - darkPactHard.dmg) < 1e-9, "Disciples of Be'lakor chooses Lethal Hits when it beats Sustained Hits");
app.matchup.conditionsMet = false;
const shadowLordBase = {
  label: 'Be-lakor without Shadow Lord',
  abilities: [],
  weapons: [{ name: 'Shadow strike', range: 'Melee', A: '6', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'shadow-strike-base' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const shadowLordAttacker = {
  ...shadowLordBase,
  label: "Be'lakor with Shadow Lord",
  abilities: ['Shadow Lord (Aura, Psychic)'],
  weapons: [{ ...shadowLordBase.weapons[0], _weaponKey: 'shadow-strike-aura' }],
};
const shadowLordBaseCell = app.computeMatchupCell(shadowLordBase, easyTarget);
const shadowLordAuraCell = app.computeMatchupCell(shadowLordAttacker, easyTarget);
assert.ok(shadowLordAuraCell.dmg > shadowLordBaseCell.dmg, 'Shadow Lord applies to Be-lakor unit attacks without Conditions Met');
const bloodthirster = {
  label: 'Bloodthirster',
  abilities: ['Relentless Carnage'],
  weapons: [{ name: 'Axe of Khorne - sweep', range: 'Melee', A: '1', skill: 'auto', S: '10', AP: '6', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'bloodthirster-sweep' }],
  defense: { T: 11, Sv: 3, Inv: 4, W: 18, models: 1 },
  _unitKey: 'bloodthirster',
};
const carnageTarget = { label: 'Carnage target', defense: { T: 4, Sv: 7, W: 20, models: 1, totalWounds: 20 }, _unitKey: 'carnage-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const carnageOff = app.computeMatchupCell(bloodthirster, carnageTarget);
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const carnageOn = app.computeMatchupCell(bloodthirster, carnageTarget);
assert.ok(Math.abs((carnageOn.dmg - carnageOff.dmg) - 4) < 1e-9, 'Relentless Carnage adds the expected four mortal wounds when conditions are met');
const carnageShootingOnly = app.computeMatchupCell({ ...bloodthirster, _attackMode: 'shooting' }, carnageTarget);
assert.strictEqual(carnageShootingOnly.dmg, 0, 'Relentless Carnage is not applied to shooting-only evaluations');
const carnageFormulaCell = app.computeMatchupCell(bloodthirster, carnageTarget, { includeFormula: true });
app.formulaCell = carnageFormulaCell;
const carnageSections = app.matchupFormulaSections();
assert.strictEqual(carnageFormulaCell.formulaItems.at(-1)?.phase, 'postDamage', 'Relentless Carnage is scheduled after weapon damage');
assert.ok(/^2\. Post-Damage - Relentless Carnage mortal wounds \(x8\) - D:1/i.test(carnageSections.at(-1)?.title || ''), 'Relentless Carnage appears as a Post-Damage formula section');
assert.ok(carnageSections.at(-1).lines.some(line => /Damage: 8 rolls x 50\.0% x 1 damage = 4 damage/i.test(line.text || line)), 'Relentless Carnage formula shows its eight D6 4+ mortal wound math');
app.openMatchupFormula(darkPactHard, darkPactAttacker, hardTarget);
assert.ok(app.formulaModalOpen, 'clicking a matchup value can open the formula modal state');
assert.ok((app.formulaCell?.formulaItems || []).length > 0, 'formula modal recomputes detailed formula data on demand');
assert.ok(app.matchupFormulaLines().some(line => /Total average damage/i.test(line)), 'formula modal includes the total damage calculation summary');
assert.strictEqual(app.matchupFormulaSections().length, app.formulaCell.formulaItems.length, 'formula modal groups each weapon profile into its own section');
assert.ok(!app.matchupFormulaLines().some(line => /NaN|undefined/i.test(line)), 'formula modal lines do not expose invalid numeric text');
app.closeMatchupFormula();

const noSpillFormulaCell = app.computeMatchupCell(
  {
    label: 'No spill attacker',
    weapons: [{ name: 'Power Fist', range: 'Melee', A: '3', skill: 'auto', S: '8', AP: '2', D: '2', modifiers: '', mode: 'melee', _profileCount: 3 }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'No spill defender', defense: { T: 4, Sv: 7, W: 3, models: 2, totalWounds: 6 } },
  { includeFormula: true }
);
app.formulaCell = noSpillFormulaCell;
const noSpillSection = app.matchupFormulaSections()[0];
const noSpillLines = noSpillSection.lines.map(line => line.text || line);
assert.ok(/Power Fist \(x3\).*A:3 Skill:auto S:8 AP:2 D:2/.test(noSpillSection.title), 'formula title includes profile count and effective statline');
assert.ok(noSpillLines.some(line => /Wound: .* x .* wound rate = .* wounds/i.test(line)), 'wound step shows wound rate');
assert.ok(noSpillLines.some(line => /Damage: .* x 2 damage = .* damage/i.test(line)), 'damage step shows generated damage before allocation loss');
assert.ok(noSpillLines.some(line => /^Spill Loss: .* = .* spill loss$/i.test(line)), 'spill loss is split into its own calculation step');
assert.ok(noSpillLines.some(line => /^Total: .* damage \(.* wounds\)$/i.test(line)), 'target total summarizes damage after spill loss');
assert.ok(noSpillLines.some(line => /^Profile Total: .* damage \(.* wounds\)$/i.test(line)), 'profile total summarizes all target totals');
assert.ok(!noSpillLines.some(line => /\bexpected\b/i.test(line)), 'profile calculation steps do not use expected wording');
assert.ok(!noSpillLines.some(line => /sustained|lethal|after FNP/i.test(line)), 'formula omits sustained, lethal, and FNP text when they do not apply');

const blastFormulaCell = app.computeMatchupCell(
  {
    label: 'Blast attacker',
    weapons: [{ name: 'Frag launcher', range: '24', A: '1', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: 'Blast 2', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Blast target', defense: { T: 4, Sv: 7, W: 20, models: 10, totalWounds: 200 } },
  { includeFormula: true }
);
app.formulaCell = blastFormulaCell;
const blastSection = app.matchupFormulaSections()[0];
assert.ok(/Frag launcher \(x1\).*A:5 Skill:auto S:8 AP:6 D:1/.test(blastSection.title), 'matchup formula title includes Blast-modified attacks from target model count');
assert.ok(/A 5 from 1 \(\+4\)/.test(blastFormulaCell.profileModifierText), 'matchup cell modifier text reports Blast attack increases');

const diceFormulaCell = app.computeMatchupCell(
  {
    label: 'Dice attacker',
    weapons: [{ name: 'Dice cannon', range: '24', A: '4', skill: '3', S: '8', AP: '6', D: 'D6', modifiers: 'Sustained Hits D3, Reroll Hits 1', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Dice target', defense: { T: 4, Sv: 7, W: 3, models: 2, totalWounds: 6 } },
  { includeFormula: true }
);
app.formulaCell = diceFormulaCell;
const diceSection = app.matchupFormulaSections()[0];
const diceLines = diceSection.lines.map(line => line.text || line);
assert.ok(/Dice cannon \(x1\).*D:1d6/.test(diceSection.title), 'formula title keeps dice damage as dice text');
assert.ok(diceLines.some(line => /Damage: .* x \(1d6\) damage/i.test(line)), 'damage step keeps dice damage in the equation');
assert.ok(diceLines.some(line => /Hits: .*66\.7% base \+ 11\.1% Reroll Hits of 1 \+ 38\.9% sustained hits \(1d3\) = 116\.7% hit/i), 'hit formula shows base, reroll, sustained, and final hit-rate percentages as one equation');

const groupedDefenseFormulaCell = app.computeMatchupCell(
  {
    label: 'Grouped profile attacker',
    weapons: [{ name: 'Light shots', range: '24', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  {
    label: 'Three identical defenders',
    defense: { T: 4, Sv: 7, W: 2, models: 3, totalWounds: 6 },
    _children: [
      { label: 'Defender 1', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
      { label: 'Defender 2', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
      { label: 'Defender 3', defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } },
    ],
  },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = groupedDefenseFormulaCell;
const groupedDefenseLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.strictEqual(groupedDefenseFormulaCell.formulaItems[0].lines.length, 1, 'identical defending models are grouped into one unique defensive-profile formula section');
assert.ok(groupedDefenseLines.some(line => /T4 .* W2 .* 3 models left/i.test(line)), 'formula defensive profile says models left for grouped profiles');

const groupedWeaponFormulaCell = app.computeMatchupCell(
  {
    label: 'Four melee models',
    defense: { T: 4, Sv: 3, W: 1, models: 4 },
    _children: [1, 2, 3, 4].map(index => ({
      label: `Heavy model ${index}`,
      weapons: [{ name: 'Heavy melee weapon', range: 'Melee', A: '2', skill: '3', S: '8', AP: '2', D: '2', modifiers: '', mode: 'melee' }],
      defense: { T: 4, Sv: 3, W: 1, models: 1 },
    })),
  },
  { label: 'Grouped weapon target', defense: { T: 5, Sv: 7, W: 2, models: 5, totalWounds: 10 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = groupedWeaponFormulaCell;
const groupedWeaponSections = app.matchupFormulaSections();
assert.strictEqual(groupedWeaponSections.length, 1, 'identical attacking weapon profiles are grouped into one formula section');
assert.ok(/Heavy melee weapon \(x4\).*A:8 Skill:3 S:8 AP:2 D:2/.test(groupedWeaponSections[0].title), 'grouped weapon formula title shows combined profile count and multiplied attacks');

const reorderedModifierWeapon = { name: 'Slashing claws', range: 'Melee', A: '8', skill: '3', S: '5', AP: '1', D: '1', modifiers: '', mode: 'melee' };
const reorderedModifierCell = context.window.MatchupEngine.computeCell(
  {
    label: 'Reordered modifier unit',
    defense: { T: 4, Sv: 3, W: 1, models: 2 },
    _children: [
      { label: 'Claw model A', weapons: [reorderedModifierWeapon], defense: { T: 4, Sv: 3, W: 1, models: 1 }, _unitKey: 'claw-a' },
      { label: 'Claw model B', weapons: [{ ...reorderedModifierWeapon }], defense: { T: 4, Sv: 3, W: 1, models: 1 }, _unitKey: 'claw-b' },
    ],
  },
  { label: 'Claw target', defense: { T: 4, Sv: 3, W: 2, models: 5, totalWounds: 10 } },
  {
    includeFormula: true,
    combineShootingProfiles: true,
    isWeaponEnabled: () => true,
    isMeleeEnabled: () => true,
    effectiveWeaponModifiers: (weapon, sourceUnit) => sourceUnit?.label === 'Claw model A'
      ? 'Devastating Wounds, Melee: Strength +1, Melee: Damage +1, Melee: Sustained Hits 1'
      : 'Devastating Wounds, Melee: Sustained Hits 1, Melee: Strength +1, Melee: Damage +1',
    effectiveDefense: unit => unit.defense || {},
    isAbilityEnabled: () => true,
  }
);
app.formulaCell = reorderedModifierCell;
const reorderedModifierSections = app.matchupFormulaSections();
assert.strictEqual(reorderedModifierSections.length, 1, 'identical weapon profiles with reordered modifiers are grouped into one formula section');
assert.ok(/Slashing claws \(x2\).*A:16 Skill:3 S:6 AP:1 D:1 \+ 1/.test(reorderedModifierSections[0].title), 'grouped reordered modifier profile shows combined model count and effective statline');

const overkillFormulaCell = app.computeMatchupCell(
  {
    label: 'Overkill attacker',
    weapons: [
      { name: 'First cannon', range: '24', A: '2', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'ranged' },
      { name: 'Second cannon', range: '24', A: '2', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'ranged' },
    ],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Single model defender', defense: { T: 4, Sv: 7, W: 1, models: 1, totalWounds: 1 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = overkillFormulaCell;
const overkillLines = app.matchupFormulaLines();
assert.ok(overkillFormulaCell.dmg > 2, 'matchup damage keeps counting weapon output after the defender is killed');
assert.ok(/First cannon/.test(overkillFormulaCell.weaponName) && /Second cannon/.test(overkillFormulaCell.weaponName), 'overkill calculations still include later weapons');
assert.ok(!overkillLines.some(line => /Overkill - ~/i.test(line)), 'formula does not prefix defensive profile lines with Overkill');
assert.ok(overkillLines.some(line => /0 models left/i.test(line)), 'formula shows zero models left for weapon profiles calculated after the defender is destroyed');
assert.ok(overkillLines.some((line, index) => /0 models left/i.test(line) && overkillLines.slice(index, index + 8).some(next => /^Spill Loss:/i.test(next))), 'post-destroy weapon profile calculations still apply no-spill damage loss');
assert.ok(overkillLines.some(line => /^Total: .* damage \(.*overkill\)$/i.test(line)), 'target totals summarize overkill damage instead of models killed');
assert.ok(overkillLines.some(line => /^Profile Total: .* damage \(.*overkill\)$/i.test(line)), 'profile totals summarize overkill damage instead of models killed');
assert.ok(!overkillLines.some(line => /^Remaining allocation:/i.test(line)), 'formula does not render remaining allocation as a standalone row');
assert.ok(!overkillLines.some(line => /^Target \d+:/i.test(line)), 'formula steps are not prefixed with target numbers or model names');

const finalProfileOverkillCell = app.computeMatchupCell(
  {
    label: 'Final profile overkill attacker',
    weapons: [{ name: 'Damage two claws', range: 'Melee', A: '4', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'melee' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'One wound defender', defense: { T: 4, Sv: 7, W: 1, models: 1, totalWounds: 1 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = finalProfileOverkillCell;
const finalProfileOverkillLines = app.matchupFormulaLines();
assert.ok(Math.abs(finalProfileOverkillCell.dmg - (10 / 3)) < 1e-9, 'the profile that kills the final model still applies no-spill damage loss to its overkill attacks');
assert.ok(finalProfileOverkillLines.some(line => /^Spill Loss: .* = 3\.333 spill loss$/i.test(line)), 'last-profile overkill shows spill loss from the repeated final defensive profile');
assert.ok(finalProfileOverkillLines.some(line => /^Total: 3\.333 damage \(1 wounds \+ 2\.333 overkill\)$/i.test(line)), 'last-profile overkill total reports post-spill overkill damage');

const remainingAllocationFormulaCell = app.computeMatchupCell(
  {
    label: 'Remaining allocation attacker',
    weapons: [{ name: 'High damage blade', range: 'Melee', A: '7', skill: '2', S: '14', AP: '4', D: '1d6+1', modifiers: 'Devastating Wounds, Reroll Hits 1, Sustained Hits 1', mode: 'melee' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  {
    label: 'Split defender',
    defense: { T: 5, Sv: 3, Inv: 0, W: 3, models: 4, totalWounds: 12 },
    _children: [
      { label: 'Bodyguard', defense: { T: 5, Sv: 3, Inv: 0, W: 3, models: 3, totalWounds: 9 } },
      { label: 'Leader', defense: { T: 5, Sv: 3, Inv: 0, W: 3, models: 1, totalWounds: 3 }, _isCharacterModel: true },
    ],
  },
  { includeFormula: true }
);
app.formulaCell = remainingAllocationFormulaCell;
const remainingAllocationLines = app.matchupFormulaSections()[0].lines.map(line => line.text ?? line);
assert.ok(!remainingAllocationLines.some(line => /^Damage: .*remaining allocation\)$/i.test(line)), 'remaining allocation is no longer shown on the damage step');
assert.ok(remainingAllocationLines.some(line => /^Total: .*overkill \/ .*remaining allocation\)$/i.test(line)), 'remaining allocation appears in the target total when another defensive profile is available');
assert.ok(!remainingAllocationLines.some(line => /^Remaining allocation:/i.test(line)), 'remaining allocation is not rendered as a separate line for split defensive profiles');
assert.ok(remainingAllocationLines.some((line, index) => line === '' && /^~ T5/i.test(remainingAllocationLines[index + 1] || '')), 'formula keeps a blank line before the next real defensive profile block');
assert.ok(remainingAllocationLines.some((line, index) => /^Total:/i.test(line) && remainingAllocationLines[index + 1] === '' && /^Profile Total:/i.test(remainingAllocationLines[index + 2] || '')), 'formula keeps a blank line between the last target total and profile total');

app.formulaCell = {
  dmg: 3.75,
  pctModelWounds: null,
  pctUnitKilled: null,
  weaponName: '1x weapon a, 1x weapon b',
  formulaItems: [
    { weaponName: 'weapon a', modifierText: '', totalDamage: 1.25, lines: [{ appliedDamage: 1.25 }] },
    { weaponName: 'weapon b', modifierText: '', totalDamage: 2.5, lines: [{ appliedDamage: 2.5 }] },
  ],
};
assert.strictEqual(app.matchupFormulaSections().length, 2, 'formula modal keeps multiple weapon profiles separated');
assert.strictEqual(app.formulaTotalEquation(), '1.25 (weapon a) + 2.5 (weapon b)\n\nTotal damage: 3.75', 'formula modal shows a labeled bottom summation equation');

const sharedAbilitySource = {
  label: 'Icon bearer',
  abilities: ['Dark Pacts'],
  weapons: [],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'shared-source',
};
const sharedAbilityReceiver = {
  label: 'Squad model',
  abilities: [],
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

const bearerParent = {
  label: 'Bearer parent',
  abilities: ['Braggart’s Steel'],
  weapons: [],
  defense: { T: 4, Sv: 3, W: 4, models: 2 },
  _children: [],
  _unitKey: 'bearer-parent',
};
const bearerOnlyModel = {
  label: 'Actual bearer',
  abilities: ['Braggart’s Steel'],
  weapons: [{ name: 'Bearer blade', range: 'Melee', A: '1', skill: 'auto', S: '5', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'bearer-blade' }],
  defense: { T: 4, Sv: 3, W: 4, models: 1 },
  _unitKey: 'bearer-only-model',
};
const bearerSibling = {
  label: 'Non-bearer sibling',
  abilities: [],
  weapons: [{ name: 'Sibling blade', range: 'Melee', A: '1', skill: 'auto', S: '5', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'sibling-blade' }],
  defense: { T: 4, Sv: 3, W: 4, models: 1 },
  _unitKey: 'bearer-sibling',
};
bearerParent._children = [bearerOnlyModel, bearerSibling];
Object.defineProperty(bearerOnlyModel, '_parentUnit', { value: bearerParent, enumerable: false, configurable: true });
Object.defineProperty(bearerSibling, '_parentUnit', { value: bearerParent, enumerable: false, configurable: true });
app.clearMatchupComputationCache();
assert.ok(/Strength \+2/i.test(app.effectiveWeaponModifiers(bearerOnlyModel.weapons[0], bearerOnlyModel, hardTarget)), 'bearer-only abilities still apply to the actual model with the ability');
assert.ok(!/Strength \+2/i.test(app.effectiveWeaponModifiers(bearerSibling.weapons[0], bearerSibling, hardTarget)), 'bearer-only abilities on an aggregate parent do not leak to sibling models');
bearerParent.weapons = [
  { name: 'Parent aggregate blade', range: 'Melee', A: '2', skill: 'auto', S: '5', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'parent-aggregate-blade' },
];
assert.ok(!/Strength \+2|Damage \+1/i.test(app.effectiveWeaponModifiers(bearerParent.weapons[0], bearerParent, hardTarget)), 'bearer-only abilities do not apply to aggregate parent weapon displays');

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
const brassStampedeUnit = { ...skullmasterUnit, abilities: ['Brass Stampede'] };
const brassStampedeCell = app.computeMatchupCell(brassStampedeUnit, hardTarget, { includeFormula: true });
app.formulaCell = brassStampedeCell;
const brassStampedeSections = app.matchupFormulaSections();
assert.ok(brassStampedeCell.dmg > 1, 'Brass Stampede pre-damage is added before normal weapon damage');
assert.ok(/^1\. Pre-Damage - Brass Stampede mortal wounds/i.test(brassStampedeSections[0]?.title || ''), 'Brass Stampede appears as the first Pre-Damage formula section');
assert.strictEqual(brassStampedeCell.formulaItems[0]?.phase, 'preDamage', 'Brass Stampede formula item is tagged as pre-damage');
assert.ok(brassStampedeSections[0].lines.some(line => /Damage: 50\.0% x 1d3 damage = 1 damage/i.test(line.text || line)), 'Brass Stampede formula shows the charge chance and dice damage expression');

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

const veterans = { label: 'Legionaries', abilities: ['Veterans of the Long War'], weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 5 }, _unitKey: 'veterans' };
const veteransSword = { name: 'Chainsword', range: 'Melee', A: '10', skill: '3', S: '4', AP: '1', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'veterans-sword' };
const veteransGun = { name: 'Boltgun', range: '24', A: '10', skill: '3', S: '4', AP: '0', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'veterans-gun' };
const veteransTarget = { label: 'Enemy unit', _keywords: ['Infantry'], defense: { T: 5, Sv: 3, W: 2, models: 5, totalWounds: 10 }, _unitKey: 'veterans-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
assert.ok(/Reroll Wounds 1/i.test(app.effectiveWeaponModifiers(veteransSword, veterans, veteransTarget)), 'Veterans of the Long War applies melee wound rerolls of 1 by default');
assert.ok(!/Reroll Wounds/i.test(app.effectiveWeaponModifiers(veteransGun, veterans, veteransTarget)), 'Veterans of the Long War melee rerolls do not apply to ranged weapons');
const veteransChild = { label: 'Legionary model', abilities: [], weapons: [veteransSword], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'veterans-child' };
const veteransParent = { ...veterans, _children: [veteransChild] };
Object.defineProperty(veteransChild, '_parentUnit', { value: veteransParent, enumerable: false, configurable: true });
assert.ok(/Reroll Wounds 1/i.test(app.effectiveWeaponModifiers(veteransSword, veteransChild, veteransTarget)), 'unit-wide Veterans wound rerolls apply to child model melee attacks');
const veteransBaseDamage = app.computeMatchupCell({ ...veterans, abilities: [], weapons: [veteransSword], _unitKey: 'veterans-base' }, veteransTarget).dmg;
const veteransRerollOnesDamage = app.computeMatchupCell({ ...veterans, weapons: [veteransSword] }, veteransTarget).dmg;
assert.ok(veteransRerollOnesDamage > veteransBaseDamage, 'Veterans of the Long War wound rerolls increase melee damage');
const veteransFormulaCell = app.computeMatchupCell({ ...veterans, weapons: [veteransSword] }, veteransTarget, { includeFormula: true });
app.formulaCell = veteransFormulaCell;
assert.ok(app.matchupFormulaLines().some(line => /^Wound: .*Reroll Wounds of 1/i.test(line)), 'formula modal names Veterans wound rerolls of 1 in the wound calculation');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Reroll Wounds\b/i.test(app.effectiveWeaponModifiers(veteransSword, veterans, veteransTarget)), 'Veterans of the Long War applies full melee wound rerolls when Conditions Met is enabled');
const veteransFullRerollDamage = app.computeMatchupCell({ ...veterans, weapons: [veteransSword] }, veteransTarget).dmg;
assert.ok(veteransFullRerollDamage > veteransRerollOnesDamage, 'Veterans of the Long War full conditional wound rerolls increase melee damage beyond rerolling ones');
const veteransConditionalFormulaCell = app.computeMatchupCell({ ...veterans, weapons: [veteransSword] }, veteransTarget, { includeFormula: true });
app.formulaCell = veteransConditionalFormulaCell;
assert.ok(app.matchupFormulaLines().some(line => /^Wound: .*Reroll Wounds/i.test(line)), 'formula modal names full Veterans wound rerolls in the wound calculation when Conditions Met is enabled');

const braggart = { label: 'Battle Leader', abilities: ['Braggart’s Steel'], weapons: [], defense: { T: 4, Sv: 3, W: 4, models: 1 }, _unitKey: 'braggart' };
const braggartBlade = { name: 'Master-crafted power weapon', range: 'Melee', A: '4', skill: '3', S: '5', AP: '2', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'braggart-blade' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const braggartBaseMods = app.effectiveWeaponModifiers(braggartBlade, braggart, hardTarget);
assert.ok(/Strength \+2/i.test(braggartBaseMods), 'Braggart’s Steel always applies melee strength');
assert.ok(!/Damage \+1/i.test(braggartBaseMods), 'Braggart’s Steel boast damage is conditional');
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'S', braggart).text, '7', 'effective weapon helper reflects always-on ability strength modifiers');
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'D', braggart).text, '2', 'effective weapon helper does not show conditional damage modifiers when conditions are off');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Damage \+1/i.test(app.effectiveWeaponModifiers(braggartBlade, braggart, hardTarget)), 'Braggart’s Steel applies damage when conditions are met');
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'D', braggart).text, '3', 'effective weapon helper reflects conditional ability damage modifiers when conditions are met');
assert.ok(app.weaponEffectiveKeywordList(braggartBlade, braggart).some(mod => /Damage \+1/i.test(mod)), 'effective weapon helper lists active ability modifiers');
const braggartCell = app.computeMatchupCell({ ...braggart, weapons: [braggartBlade] }, hardTarget);
assert.ok(/S 7 from 5/.test(braggartCell.profileModifierText), 'calculation breakdown data keeps weapon characteristic modifiers used in the calculation');
assert.ok(/D 3 from 2/.test(braggartCell.profileModifierText), 'calculation breakdown data keeps conditional weapon damage modifiers used in the calculation');
const braggartCellCopyText = app.matchupCellCopyText(braggartCell);
assert.ok(/Master-crafted power weapon/.test(braggartCellCopyText), 'copy/export cells include the profiles used in the calculation');
assert.ok(!/S 7 from 5|D 3 from 2/.test(braggartCellCopyText), 'copy/export cells omit profile modifier details from the grid cell text');

const oathAttacker = { label: 'Oath unit', abilities: ['Oath of Moment'], weapons: [{ name: 'Oath gun', range: '24', A: '6', skill: '4', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'oath-gun' }], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'oath-unit' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const oathOff = app.computeMatchupCell(oathAttacker, hardTarget).dmg;
assert.ok(!/Reroll Hits/i.test(app.effectiveWeaponModifiers(oathAttacker.weapons[0], oathAttacker, hardTarget)), 'Oath of Moment is off until Conditions Met is enabled');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const oathOn = app.computeMatchupCell(oathAttacker, hardTarget).dmg;
assert.ok(/Reroll Hits/i.test(app.effectiveWeaponModifiers(oathAttacker.weapons[0], oathAttacker, hardTarget)), 'Oath of Moment applies when Conditions Met is enabled');
assert.ok(oathOn > oathOff, 'conditional Oath of Moment rerolls increase damage when enabled');

const heroicDefender = { label: 'Resolved Character', abilities: ['Heroic Resolve'], defense: { T: 4, Sv: 7, W: 3, models: 1 }, _unitKey: 'heroic-resolve' };
const damageTwo = { name: 'Damage two', range: '24', A: '1', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'damage-two' };
const damageTwoAttacker = { label: 'Damage two attacker', weapons: [damageTwo], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'damage-two-attacker' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
assert.ok(!/Damage -1/i.test(app.effectiveWeaponModifiers(damageTwo, darkPactAttacker, heroicDefender)), 'Heroic Resolve is off until conditions are met');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Damage -1/i.test(app.effectiveWeaponModifiers(damageTwo, darkPactAttacker, heroicDefender)), 'conditional defensive attack penalties that benefit the owner apply when conditions are met');
const resilientDefender = { label: 'Resilient Character', abilities: ['Formidably Resilient'], defense: { T: 4, Sv: 7, W: 3, models: 1 }, _unitKey: 'resilient' };
const resilientCell = app.computeMatchupCell(damageTwoAttacker, resilientDefender);
const normalDamageTwoCell = app.computeMatchupCell(damageTwoAttacker, { label: 'Normal Character', abilities: [], defense: { T: 4, Sv: 7, W: 3, models: 1 }, _unitKey: 'normal-damage-two' });
assert.ok(resilientCell.dmg < normalDamageTwoCell.dmg, 'non-conditional incoming damage division still applies');

const rotCaster = { label: 'Rot caster', abilities: ["Nurgle's Rot"], weapons: [], defense: { T: 5, Sv: 3, W: 5, models: 1 }, _unitKey: 'rot-caster' };
const rotTarget = { label: 'Rot target', abilities: [], defense: { T: 6, Sv: 3, W: 4, models: 1 }, _unitKey: 'rot-target' };
assert.strictEqual(app.effectiveDefense(rotTarget, rotCaster).T, 5, 'conditional target-defense debuffs that benefit the owner apply when conditions are met');
app.matchup.conditionsMet = false;
assert.strictEqual(app.effectiveDefense(rotTarget, rotCaster).T, 6, 'conditional target-defense debuffs are off by default');

const damagedAttacker = { label: 'Damaged tank', abilities: ['Damaged: 1-5 wounds remaining'], weapons: [], defense: { T: 9, Sv: 3, W: 12, models: 1 }, _unitKey: 'damaged-tank' };
const damagedGun = { name: 'Damaged gun', range: '24', A: '6', skill: '4', S: '8', AP: '2', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'damaged-gun' };
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(!/Hit Rolls -1/i.test(app.effectiveWeaponModifiers(damagedGun, damagedAttacker, hardTarget)), 'self-detrimental conditional modifiers do not apply to the owner attack calculation');

const gloamTarget = { label: 'Gloam target', abilities: ['Gloam Rot'], defense: { T: 5, Sv: 3, W: 3, models: 1 }, _unitKey: 'gloam-target' };
const highStrengthWeapon = { name: 'Big hit', range: '24', A: '1', skill: '3', S: '8', AP: '1', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'big-hit' };
const lowStrengthWeapon = { name: 'Small hit', range: '24', A: '1', skill: '3', S: '4', AP: '1', D: '2', modifiers: '', mode: 'ranged', _weaponKey: 'small-hit' };
assert.ok(/Wound Rolls -1/i.test(app.effectiveWeaponModifiers(highStrengthWeapon, darkPactAttacker, gloamTarget)), 'defender abilities can add attack penalties when their condition matches');
assert.ok(!/Wound Rolls -1/i.test(app.effectiveWeaponModifiers(lowStrengthWeapon, darkPactAttacker, gloamTarget)), 'defender attack penalties respect strength/toughness conditions');
app.matchup.conditionsMet = false;
app.toggleUnitAbility(darkPactAttacker, 'Dark Pacts');
const darkPactDisabled = app.computeMatchupCell(darkPactAttacker, hardTarget);
assert.ok(Math.abs(darkPactDisabled.dmg - 0.5) < 1e-9, 'turning off Dark Pacts removes its chosen damage modifier');

const customAttacker = { label: 'Custom attacker', _viewKey: 'custom-attacker', _unitKey: 'custom-attacker', abilities: [], weapons: [{ name: 'Custom blade', range: 'Melee', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'custom-blade' }], defense: { T: 4, Sv: 3, W: 2, models: 1 } };
const customDefender = { label: 'Custom defender', _viewKey: 'custom-defender', _unitKey: 'custom-defender', abilities: [], weapons: [], defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
app.matchupAttackerUnits = [customAttacker];
app.matchupDefenderUnits = [customDefender];
app.matchup.rows = [{ unit: customAttacker, cells: [app.computeMatchupCell(customAttacker, customDefender)] }];
app.seedAggregateCellCache();
const beforeCustom = app.cachedMatchupCell(customAttacker, customDefender);
app.profileCustomModifierText = 'Strength +4';
app.addCustomModifier(customAttacker);
const afterCustom = app.cachedMatchupCell(customAttacker, customDefender);
assert.ok(afterCustom.dmg > beforeCustom.dmg, 'custom profile modifiers affect matchup calculations');
assert.ok(/S 8 from 4/.test(afterCustom.profileModifierText), 'custom profile modifiers are retained for calculation breakdown data');
assert.ok(app.unitCustomModifierOptions().some(option => option.value === 'Hit Rolls +1' && /\+1 to Hit/.test(option.label)), 'unit custom modifier dropdown includes readable offensive effects');
assert.ok(app.unitCustomModifierOptions().some(option => option.value === 'Defense: Invulnerable Save 4+'), 'unit custom modifier dropdown includes defensive profile effects');
const globalCustomApp = context.weaponVsDefenseApp();
const globalCustomAttacker = { label: 'Global custom attacker', _viewKey: 'global-custom-attacker', _unitKey: 'global-custom-attacker', abilities: [], weapons: [{ name: 'Global blade', range: 'Melee', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'global-blade' }], defense: { T: 4, Sv: 3, W: 2, models: 1 } };
const globalCustomDefender = { label: 'Global custom defender', _viewKey: 'global-custom-defender', _unitKey: 'global-custom-defender', abilities: [], weapons: [], defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const beforeGlobalCustom = globalCustomApp.computeMatchupCell(globalCustomAttacker, globalCustomDefender);
globalCustomApp.addMatchupCustomModifier('Strength +4');
const afterGlobalCustom = globalCustomApp.computeMatchupCell(globalCustomAttacker, globalCustomDefender);
assert.ok(afterGlobalCustom.dmg > beforeGlobalCustom.dmg, 'matchup custom modifiers apply globally to matchup calculations');
assert.strictEqual(globalCustomApp.matchupCustomModifiers().length, 1, 'matchup custom modifier dropdown adds selected modifiers as pills');
globalCustomApp.removeMatchupCustomModifier(globalCustomApp.matchupCustomModifiers()[0].id);
assert.strictEqual(globalCustomApp.matchupCustomModifiers().length, 0, 'matchup custom modifier pills can be removed');
const scopedWeaponA = { name: 'Scoped blade', range: 'Melee', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'scoped-a' };
const scopedWeaponB = { name: 'Other blade', range: 'Melee', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'scoped-b' };
const scopedAttacker = { label: 'Scoped attacker', _viewKey: 'scoped-attacker', _unitKey: 'scoped-attacker', abilities: [], weapons: [scopedWeaponA, scopedWeaponB], defense: { T: 4, Sv: 3, W: 2, models: 1 } };
app.addWeaponCustomModifier(scopedAttacker, scopedWeaponA, 'Strength +1');
assert.ok(/Strength \+1/.test(app.effectiveWeaponModifiers(scopedWeaponA, scopedAttacker, customDefender)), 'weapon custom dropdown modifiers apply to the selected weapon profile');
assert.ok(!/Strength \+1/.test(app.effectiveWeaponModifiers(scopedWeaponB, scopedAttacker, customDefender)), 'weapon custom dropdown modifiers do not leak to other weapon profiles');

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
  'T5 | 2+ 4++ | W4 | 3 models',
  'T5 | 2+ 4++ | W8 | 1 models',
  'T5 | 2+ 4++ | W3 | 1 models',
]), 'mixed defender headers show each unique defensive profile on its own line');

assert.strictEqual(app.matchup.sortAttackers, 'overallDamage', 'attacker sort defaults to Total');
assert.strictEqual(app.matchup.sortDefenders, 'overallDamage', 'defender sort defaults to Total');
assert.strictEqual(app.matchupSideSortLabel('attacker'), '↓', 'attacker sort button defaults to descending arrow');
assert.strictEqual(app.matchupSideSortLabel('defender'), '↓', 'defender sort button defaults to descending arrow');
app.cycleMatchupSideSort('attacker');
assert.strictEqual(app.matchupSideSortLabel('attacker'), '↑', 'attacker sort button toggles from desc to asc');
app.cycleMatchupSideSort('attacker');
assert.strictEqual(app.matchupSideSortLabel('attacker'), '↓', 'attacker sort button toggles from asc back to desc');
app.setMatchupSideSortMode('attacker', 'overallDamage');
assert.strictEqual(app.matchup.sortAttackers, 'overallDamage', 'attacker dropdown can sort by Total');
app.setMatchupSideSortMode('attacker', 'overallScore');
assert.strictEqual(app.matchup.sortAttackers, 'overallScore', 'attacker dropdown can sort by Overall Score');
assert.strictEqual(app.matchupSideSortModeLabel('overallScore'), 'Overall Score', 'Overall Score sort mode has a readable label');
app.setMatchupSideSortMode('attacker', 'alpha');
assert.strictEqual(app.matchup.sortAttackers, 'alpha', 'attacker dropdown can sort by Name');
app.cycleMatchupSideSort('defender');
assert.strictEqual(app.matchupSideSortLabel('defender'), '↑', 'defender sort button toggles from desc to asc');
app.cycleMatchupSideSort('defender');
assert.strictEqual(app.matchupSideSortLabel('defender'), '↓', 'defender sort button toggles from asc back to desc');
app.setMatchupSideSortMode('defender', 'overallDamage');
assert.strictEqual(app.matchup.sortDefenders, 'overallDamage', 'defender dropdown can sort by Total');
app.setMatchupSideSortMode('defender', 'overallScore');
assert.strictEqual(app.matchup.sortDefenders, 'overallScore', 'defender dropdown can sort by Overall Score');
app.setMatchupSideSortMode('defender', 'alpha');
assert.strictEqual(app.matchup.sortDefenders, 'alpha', 'defender dropdown can sort by Name');
app.setMatchupSideSortMode('attacker', 'score');
app.setMatchupSideSortMode('defender', 'score');

const noRecalcSortApp = context.weaponVsDefenseApp();
const sortAttackerA = {
  label: 'Sort attacker A',
  _unitKey: 'sort-attacker-a',
  _points: 100,
  weapons: [{ name: 'Rifle', range: '24', A: '1', skill: 3, S: 4, AP: 0, D: 1, mode: 'ranged' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const sortAttackerB = {
  label: 'Sort attacker B',
  _unitKey: 'sort-attacker-b',
  _points: 100,
  weapons: [{ name: 'Rifle', range: '24', A: '1', skill: 3, S: 4, AP: 0, D: 1, mode: 'ranged' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const sortDefenderA = { label: 'Sort defender A', _unitKey: 'sort-defender-a', _points: 100, defense: { T: 4, Sv: 3, W: 2, models: 1 } };
const sortDefenderB = { label: 'Sort defender B', _unitKey: 'sort-defender-b', _points: 100, defense: { T: 5, Sv: 2, W: 3, models: 1 } };
noRecalcSortApp.matchupModalOpen = true;
noRecalcSortApp.matchupAttackerUnits = [sortAttackerA, sortAttackerB];
noRecalcSortApp.matchupDefenderUnits = [sortDefenderA, sortDefenderB];
noRecalcSortApp.matchup.rows = [
  { unit: sortAttackerA, cells: [{ dmg: 10 }, { dmg: 1 }] },
  { unit: sortAttackerB, cells: [{ dmg: 2 }, { dmg: 20 }] },
];
noRecalcSortApp.matchup.cellCache = {
  [noRecalcSortApp.cellCacheKey(sortAttackerA, sortDefenderA)]: { dmg: 10 },
  [noRecalcSortApp.cellCacheKey(sortAttackerA, sortDefenderB)]: { dmg: 1 },
  [noRecalcSortApp.cellCacheKey(sortAttackerB, sortDefenderA)]: { dmg: 2 },
};
noRecalcSortApp.computeMatchupCell = () => {
  throw new Error('sorting should not recalculate matchup cells');
};
noRecalcSortApp.setMatchupSideSortMode('attacker', 'overallDamage');
noRecalcSortApp.cycleMatchupSideSort('attacker');
noRecalcSortApp.setMatchupSideSortMode('defender', 'overallDamage');
noRecalcSortApp.cycleMatchupSideSort('defender');
noRecalcSortApp.sortMatchupByColumn(sortDefenderA);
noRecalcSortApp.sortMatchupByRow(sortAttackerA);
noRecalcSortApp.sortMatchupAlphabetical();
assert.ok(noRecalcSortApp.matchup.visibleRows.length > 0, 'sorting refreshes visible rows from cached matchup cells');

const profileScoreAttacker = {
  label: 'Profile score attacker',
  _unitKey: 'profile-score-attacker',
  _viewKey: 'profile-score-attacker',
  _points: 100,
  weapons: [
    { name: 'Score rifle', range: '24', A: '6', skill: 'auto', S: '5', AP: '1', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'score-rifle' },
    { name: 'Score blade', range: 'Melee', A: '4', skill: 'auto', S: '5', AP: '1', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'score-blade' },
  ],
  defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 },
};
const profileScoreDefender = {
  label: 'Profile score defender',
  _unitKey: 'profile-score-defender',
  _viewKey: 'profile-score-defender',
  _points: 80,
  weapons: [],
  defense: { T: 4, Sv: 4, W: 2, models: 1, totalWounds: 2 },
};
app.matchup.metric = 'damage';
app.matchup.showMelee = true;
app.matchup.showShooting = true;
app.matchup.combineShootingProfiles = true;
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
app.matchupAttackerUnits = [profileScoreAttacker];
app.matchupDefenderUnits = [profileScoreDefender];
app.matchup.rows = [{ unit: profileScoreAttacker, cells: [app.computeMatchupCell(profileScoreAttacker, profileScoreDefender)] }];
app.seedAggregateCellCache();
app.refreshVisibleMatchup();
assert.ok(/^Offensive Score: \d+ \(Melee: \d+ \/ Shooting: \d+\)$/.test(app.profileOffensiveScoreText(profileScoreAttacker)), 'unit profile modal offense line includes total, melee, and shooting scores');
assert.ok(/^Defensive Score: \d+$/.test(app.profileDefensiveScoreText(profileScoreDefender)), 'unit profile modal shows defensive score');
assert.ok(/^Overall Score: \d+$/.test(app.profileOverallScoreText(profileScoreAttacker)), 'unit profile modal shows overall score');

console.log('damage-cap tests passed');
