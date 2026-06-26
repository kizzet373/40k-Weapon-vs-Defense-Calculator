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
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames("Disciples of Be'lakor")),
  JSON.stringify(['Choose Best: Lethal Hits; Sustained Hits 1']),
  "Disciples of Be'lakor maps to the same always-on best Dark Pacts modifier"
);
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
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Shadow Lord (Aura, Psychic)')),
  JSON.stringify(['Unit-wide | Reroll Hits 1']),
  'imported Shadow Lord aura maps to an always-on unit-wide hit reroll modifier'
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
const easyTarget = { label: 'Easy target', defense: { T: 3, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const hardTarget = { label: 'Hard target', defense: { T: 20, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
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
app.openMatchupFormula(darkPactHard, darkPactAttacker, hardTarget);
assert.ok(app.formulaModalOpen, 'clicking a matchup value can open the formula modal state');
assert.ok((app.formulaCell?.formulaItems || []).length > 0, 'formula modal recomputes detailed formula data on demand');
assert.ok(app.matchupFormulaLines().some(line => /Total average damage/i.test(line)), 'formula modal includes the total damage calculation summary');
assert.strictEqual(app.matchupFormulaSections().length, app.formulaCell.formulaItems.length, 'formula modal groups each weapon profile into its own section');
assert.ok(!app.matchupFormulaLines().some(line => /NaN|undefined/i.test(line)), 'formula modal lines do not expose invalid numeric text');
app.closeMatchupFormula();

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
assert.strictEqual(app.formulaTotalEquation(), '1.25 + 2.5 = 3.75 total average damage', 'formula modal shows a bottom summation equation');

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
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'S', braggart).text, '7', 'effective weapon helper reflects always-on ability strength modifiers');
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'D', braggart).text, '2', 'effective weapon helper does not show conditional damage modifiers when conditions are off');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
assert.ok(/Damage \+1/i.test(app.effectiveWeaponModifiers(braggartBlade, braggart, hardTarget)), 'Braggart’s Steel applies damage when conditions are met');
assert.strictEqual(app.weaponEffectiveStat(braggartBlade, 'D', braggart).text, '3', 'effective weapon helper reflects conditional ability damage modifiers when conditions are met');
assert.ok(app.weaponEffectiveKeywordList(braggartBlade, braggart).some(mod => /Damage \+1/i.test(mod)), 'effective weapon helper lists active ability modifiers');
const braggartCell = app.computeMatchupCell({ ...braggart, weapons: [braggartBlade] }, hardTarget);
assert.ok(/S 7 from 5/.test(braggartCell.profileModifierText), 'grid cells show weapon characteristic modifiers used in the calculation');
assert.ok(/D 3 from 2/.test(braggartCell.profileModifierText), 'grid cells show conditional weapon damage modifiers used in the calculation');

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
assert.ok(/S 8 from 4/.test(afterCustom.profileModifierText), 'custom profile modifiers are represented visually in grid cells');
assert.ok(app.unitCustomModifierOptions().some(option => option.value === 'Hit Rolls +1' && /\+1 to Hit/.test(option.label)), 'unit custom modifier dropdown includes readable offensive effects');
assert.ok(app.unitCustomModifierOptions().some(option => option.value === 'Defense: Invulnerable Save 4+'), 'unit custom modifier dropdown includes defensive profile effects');
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
