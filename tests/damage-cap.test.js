const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.ok(!/mergeDropHint|>\s*Drop\s*</i.test(indexHtml), 'merge manager target units do not show a Drop label');
assert.ok(!/mergeDragHandle|>\s*Drag unit\s*</i.test(indexHtml), 'merge manager source units do not show a Drag unit label');
assert.ok(/mergeManagerDraggableUnit[\s\S]*draggable="true"[\s\S]*mergeManagerDragStart\(\$event, 'unit', unit\)/.test(indexHtml), 'merge manager source unit rows are draggable');
assert.ok(/mergeManagerDragBubble[\s\S]*>\s*drag\s*</i.test(indexHtml), 'merge manager source units and models show a compact drag bubble');
assert.ok(/mergeManagerDuplicateButton[\s\S]*duplicateMergeManagerItem\(unit\)[\s\S]*>\s*Duplicate\s*<\/button>/.test(indexHtml), 'merge manager source unit rows expose a Duplicate button');
assert.ok(/mergeManagerDuplicateButton[\s\S]*duplicateMergeManagerItem\(child\)[\s\S]*>\s*Duplicate\s*<\/button>/.test(indexHtml), 'merge manager source model rows expose a Duplicate button');
assert.ok(/mergeManagerProfileLink[\s\S]*openUnitProfile\(unit, 'Unit'\)[\s\S]*mergeManagerUnitName/.test(indexHtml), 'merge manager unit names open the unit profile modal');
assert.ok(/mergeManagerProfileLink[\s\S]*openUnitProfile\(child, 'Model'\)[\s\S]*mergeManagerChildName/.test(indexHtml), 'merge manager model names open the model profile modal');
assert.ok(/promptMergeManagerRename\(unit\)/.test(indexHtml), 'merge manager unit rows expose an inline rename button');
assert.ok(/promptMergeManagerRename\(child\)/.test(indexHtml), 'merge manager model rows expose an inline rename button');
assert.ok(/deleteMergeManagerItem\(unit\)/.test(indexHtml), 'merge manager unit rows expose an inline delete button');
assert.ok(/deleteMergeManagerItem\(child\)/.test(indexHtml), 'merge manager model rows expose an inline delete button');
assert.ok(/mergeManagerIsCollapsible\(unit\) \? 'mergeManagerCollapsibleUnit' : 'mergeManagerFlatUnit'/.test(indexHtml), 'merge manager only marks multi-model units as collapsible');
assert.ok(/<summary @click="if\(!mergeManagerIsCollapsible\(unit\)\) \$event\.preventDefault\(\)">/.test(indexHtml), 'merge manager flat unit summaries do not toggle');
assert.ok(/mergeManagerChildren" x-show="mergeManagerIsCollapsible\(unit\)"/.test(indexHtml), 'merge manager model rows are hidden unless the unit is collapsible');
assert.ok(/mergeManagerUnit summary::before[\s\S]*width:13px[\s\S]*border-right:3px solid var\(--accent\)/.test(stylesCss), 'merge manager collapsible arrow is a larger left-side affordance');
assert.ok(!/mergeManagerUnit summary::after/.test(stylesCss), 'merge manager collapsible arrow is no longer right-side after content');
assert.ok(/mergeManagerFlatUnit summary::before\{display:none\}/.test(stylesCss), 'merge manager single-model unit rows hide the collapse arrow');
assert.ok(/mergeManagerDeleteButton/.test(stylesCss), 'merge manager delete buttons have a dedicated compact danger style');
assert.ok(/mergeManagerDropUnit \.mergeManagerIconButton,\s*\.mergeManagerDropUnit \.mergeManagerSummaryActions\{display:none\}/.test(stylesCss), 'merge manager target-side edit controls are hidden');
assert.ok(/Add Army Modifiers/.test(indexHtml), 'matchup sidebar custom modifier dropdown is labeled Add Army Modifiers');
assert.ok(/Copy Roster/.test(indexHtml) && /Export Roster/.test(indexHtml), 'matchup sidebar copy/export dropdowns are labeled as roster actions');
assert.ok(indexHtml.indexOf('copy-attacker') < indexHtml.indexOf('matchup-attacker-custom'), 'attacker Copy Roster/Export Roster controls appear above Add Army Modifiers');
assert.ok(indexHtml.indexOf('copy-defender') < indexHtml.indexOf('matchup-defender-custom'), 'defender Copy Roster/Export Roster controls appear above Add Army Modifiers');
assert.ok(indexHtml.indexOf('export-attacker') < indexHtml.indexOf("promptDeleteMatchupRoster('attacker'") && indexHtml.indexOf("promptDeleteMatchupRoster('attacker'") < indexHtml.indexOf('matchup-attacker-custom'), 'attacker Delete Roster sits next to Export Roster above Add Army Modifiers');
assert.ok(indexHtml.indexOf('export-defender') < indexHtml.indexOf("promptDeleteMatchupRoster('defender'") && indexHtml.indexOf("promptDeleteMatchupRoster('defender'") < indexHtml.indexOf('matchup-defender-custom'), 'defender Delete Roster sits next to Export Roster above Add Army Modifiers');
assert.ok(!/matchup-attacker-unit|matchup-defender-unit/.test(indexHtml), 'Army Matchups sidebar no longer includes per-side Unit selectors');
assert.ok(indexHtml.indexOf("openMatchupArmyEditor('attacker'") < indexHtml.indexOf('matchup-attacker-custom'), 'attacker Army Editor button appears to the left of the army modifier dropdown');
assert.ok(indexHtml.indexOf("openMatchupArmyEditor('defender'") < indexHtml.indexOf('matchup-defender-custom'), 'defender Army Editor button appears to the left of the army modifier dropdown');
assert.ok(/Army Editor/.test(indexHtml) && /openMatchupArmyEditor\('attacker'\)/.test(indexHtml) && /openMatchupArmyEditor\('defender'\)/.test(indexHtml), 'Army Matchups sidebar keeps only Army Editor for unit management');
assert.ok(/copy-attacker/.test(indexHtml) && /export-defender/.test(indexHtml), 'copy/export roster dropdowns remain scoped to each matchup side');
assert.ok(!/copy-inline|export-inline/.test(indexHtml), 'copy/export dropdowns are no longer in the matchup mode button row');
assert.ok(/matchupModifierExportActions\{grid-column:1 \/ -1;justify-self:start/.test(stylesCss), 'copy/export roster controls sit above the army modifier dropdown');
assert.ok(/matchupArmyEditorButton\{grid-column:1 \/ 2;justify-self:start;align-self:end\}/.test(stylesCss) && /matchupArmyModifierLabel\{grid-column:2 \/ 3;min-width:0\}/.test(stylesCss), 'Army Editor and Add Army Modifiers share one row with editor on the left');
assert.ok(/deleteConfirmModalOpen/.test(indexHtml) && /Confirm delete/.test(indexHtml), 'sidebar destructive actions open a shared delete confirmation modal');
assert.ok(/promptDeleteSelectedRoster\(\)/.test(indexHtml), 'Weapon Damage Calc roster delete opens a confirmation prompt');
assert.ok(/promptDeleteMatchupRoster\('attacker'\)/.test(indexHtml) && /promptDeleteMatchupRoster\('defender'\)/.test(indexHtml), 'Army Matchups roster deletes open confirmation prompts');
assert.ok(/promptDeleteSelectedUnit\(\)/.test(indexHtml), 'main unit delete opens a confirmation prompt');
assert.ok(!/promptDeleteMatchupUnit\('attacker'\)|promptDeleteMatchupUnit\('defender'\)|duplicateMatchupUnit\('attacker'\)|duplicateMatchupUnit\('defender'\)/.test(indexHtml), 'Army Matchups sidebar removes per-side rename duplicate and delete controls');
assert.ok(/Delete Roster/.test(indexHtml) && /Delete Unit/.test(indexHtml), 'sidebar delete buttons use explicit roster and unit labels');
assert.ok(!/deleteMatchupForce\('attacker'\)|deleteMatchupForce\('defender'\)/.test(indexHtml), 'Army Matchups sidebar no longer exposes force deletion');
assert.ok(/matchupRosterRow\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.25fr\)/.test(stylesCss), 'matchup roster rows restore Roster width while keeping Force wider');
assert.ok(/matchupUnitActionInline\{grid-template-columns:minmax\(0,1fr\) auto auto\}/.test(stylesCss) && /matchupUnitActionInline \.deleteUnitButton\{grid-column:3 \/ 4;justify-self:end\}/.test(stylesCss), 'matchup unit Delete Unit buttons get a full auto-width column');

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
assert.ok(Math.abs(context.window.WeaponCalc.expectedCappedDamage('1', null, 0, 2) - 1) < 1e-9, 'halved flat damage 1 rounds up to 1');
assert.ok(Math.abs(context.window.WeaponCalc.expectedCappedDamage('3', null, 0, 2) - 2) < 1e-9, 'halved flat damage 3 rounds up to 2');
assert.ok(Math.abs(context.window.WeaponCalc.expectedCappedDamage('D3', null, 0, 2) - (4 / 3)) < 1e-9, 'halved dice damage rounds each roll up before averaging');

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

const halvedDamageOne = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D1 halved', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  'Damage /2'
);
const unhalvedDamageOne = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D1 normal', A: '6', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '' },
  { T: 4, sv: 7, inv: 0, W: 2 },
  ''
);
assert.ok(Math.abs(halvedDamageOne.dmg - unhalvedDamageOne.dmg) < 1e-9, 'halved D1 attacks still deal 1 damage per failed save');

const halvedDevD3 = context.window.WeaponCalc.calcOneWeapon(
  { name: 'D3 devastating halved', A: '6', skill: 'auto', S: '8', AP: '6', D: 'D3', modifiers: 'Devastating Wounds' },
  { T: 4, sv: 7, inv: 0, W: 10 },
  'Devastating Wounds, Damage /2',
  { includeFormula: true }
);
assert.ok(Math.abs(halvedDevD3.dmg - (20 / 3)) < 1e-9, 'halved damage applies to both normal and devastating wound damage using rounded per-roll damage');
assert.strictEqual(halvedDevD3.formula.damageText, '1d3 / 2', 'formula displays halved dice damage instead of only the average');

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
assert.ok(Math.abs(sharedStateCell.dmg - 5) < 1e-9, 'unit attacks share defender wound state before remaining expected allocation moves into the character');

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
const scoreScaleUnit = { label: 'Score scale check', _unitKey: 'score-scale-check', _points: 100, defense: { T: 4, Sv: 3, W: 2, models: 1 } };
app.matchup.metric = 'modelWounds';
assert.strictEqual(Math.round(app.offensiveEfficiencyFromAverage(scoreScaleUnit, 1)), 138, 'attacker scores are based on average total damage percent per point');
assert.strictEqual(Math.round(app.defensiveEfficiencyFromAverage(scoreScaleUnit, 1)), 48, 'defender scores are based on inverse average incoming damage percent per point');
const scorePctAttacker = { label: 'Score pct attacker', _unitKey: 'score-pct-attacker', _points: 100, defense: { T: 4, Sv: 3, W: 2, models: 1 } };
const scorePctDefender10 = { label: 'Score pct defender 10W', _unitKey: 'score-pct-defender-10', _points: 100, defense: { T: 4, Sv: 3, W: 10, models: 1, totalWounds: 10 } };
const scorePctDefender20 = { label: 'Score pct defender 20W', _unitKey: 'score-pct-defender-20', _points: 100, defense: { T: 4, Sv: 3, W: 20, models: 1, totalWounds: 20 } };
app.matchup.scoreMaps = { attackers: {}, defenders: {} };
app.updateMatchupScoreMaps(
  [{
    unit: scorePctAttacker,
    cells: [
      { dmg: 5, pctModelWounds: 0.5 },
      { dmg: 5, pctModelWounds: 0.25 },
    ],
  }],
  [{ unit: scorePctDefender10 }, { unit: scorePctDefender20 }]
);
assert.strictEqual(Math.round(app.matchup.scoreMaps.attackers[scorePctAttacker._unitKey]), 52, 'attacker score averages total damage percent across defenders');
assert.strictEqual(Math.round(app.matchup.scoreMaps.defenders[scorePctDefender10._unitKey]), 96, 'defender score uses incoming damage percent for a smaller wound pool');
assert.strictEqual(Math.round(app.matchup.scoreMaps.defenders[scorePctDefender20._unitKey]), 192, 'same raw incoming damage scores better into a larger wound pool');
const hammerIntoOneWoundModels = app.computeMatchupCell(
  {
    label: 'Daemon hammer attacker',
    weapons: [{
      name: 'Daemon hammer',
      range: 'Melee',
      A: '6',
      skill: '3',
      S: '9',
      AP: '3',
      D: '2',
      modifiers: 'Devastating Wounds, Melee: Damage +1, Melee: Reroll Wounds, Sustained Hits 1',
      mode: 'melee',
    }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'One wound screen', defense: { T: 3, Sv: 5, Inv: 0, W: 1, models: 10, totalWounds: 10 } },
  { includeFormula: true }
);
app.formulaCell = hammerIntoOneWoundModels;
const hammerLines = app.matchupFormulaLines();
assert.ok(hammerIntoOneWoundModels.dmg <= 6 + 1e-9, 'six attacks into one-wound models cannot apply more than six damage after allocation spill loss');
assert.ok(Math.abs(hammerIntoOneWoundModels.dmg - (155 / 36)) < 1e-9, 'high damage hammer into W1 models applies one wound per damaging instance and reports any post-unit damage as overkill');
assert.ok(hammerLines.some(line => /^Spill Loss: 4\.306 instances x 3 damage vs 1 wounds \* 10 models = 8\.611 spill loss$/i.test(line)), 'spill loss is based on expected damage instances instead of whole killed models');
const movementProfileUnit = { label: 'Movement profile', defense: { M: '6"', T: 4, Sv: 3, Inv: 5, W: 2, models: 5 } };
assert.ok(/^M6" \| T4 \| 3\+ 5\+\+ \| W2 \| 5 models$/.test(app.profileDefenseHeaderLabel(movementProfileUnit)), 'unit profile modal defense line shows movement before toughness');
assert.ok(/^T4 \| 3\+ 5\+\+ \| W2 \| 5 models$/.test(app.matchupDefenseHeaderLabel(movementProfileUnit)), 'matchup grid defense line does not add movement');
assert.ok(/M6&quot;.*T4/.test(app.profileChildSummaryHtml(movementProfileUnit)), 'unit profile modal child summaries show movement before toughness');
const objectiveControlProfileUnit = { label: 'OC profile', defense: { M: '10"', T: 5, Sv: 2, Inv: 4, W: 3, OC: 2, models: 1 } };
assert.ok(/^M10" \| T5 \| 2\+ 4\+\+ \| W3 \| OC2 \| 1 models$/.test(app.profileDefenseHeaderLabel(objectiveControlProfileUnit)), 'unit profile modal defense line shows objective control');
assert.ok(/^T5 \| 2\+ 4\+\+ \| W3 \| 1 models$/.test(app.matchupDefenseHeaderLabel(objectiveControlProfileUnit)), 'matchup grid defense headers do not add objective control');
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
baseScoreApp.matchup.defenderRosterIdx = baseScoreApp.rosters.findIndex(roster => roster.label === 'Base Profiles');
baseScoreApp.onMatchupRosterChanged('defender', false);
baseScoreApp.rebuildMatchup();
const baseDefender = baseScoreApp.matchupDefenderUnits.find(unit => unit.label === 'Power Armour');
assert.ok(baseDefender, 'base profiles can be selected as matchup defenders');
assert.ok(/^\(90 pts\) - Def Score: \d+$/.test(baseScoreApp.matchupHeaderMeta(baseDefender, 'defender')), 'base profiles display calibrated defensive scores from their point values');
baseScoreApp.swapMatchupSides();
const baseAttacker = baseScoreApp.matchupAttackerUnits.find(unit => unit.label === 'Power Armour');
assert.ok(baseAttacker, 'base profiles can be selected as matchup attackers');
assert.ok(/^\(90 pts\) - Atk Score: \d+$/.test(baseScoreApp.matchupHeaderMeta(baseAttacker, 'attacker')), 'base profiles display calibrated offensive scores from their point values and weapon profiles');
assert.ok(baseScoreApp.cachedMatchupCell(baseAttacker, baseScoreApp.matchupDefenderUnits[0]).dmg > 0, 'base profile weapon packages produce matchup damage');

const deleteRosterApp = context.weaponVsDefenseApp();
deleteRosterApp.addRoster({
  roster: {
    name: 'Delete roster A',
    forces: [{
      name: 'Force A',
      _importedUnits: [{ label: 'Unit A', weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'unit-a' }],
    }],
  },
}, 'Delete roster A');
deleteRosterApp.addRoster({
  roster: {
    name: 'Delete roster B',
    forces: [{
      name: 'Force B',
      _importedUnits: [{ label: 'Unit B', weapons: [], defense: { T: 5, Sv: 3, W: 3, models: 1 }, _unitKey: 'unit-b' }],
    }, {
      name: 'Force C',
      _importedUnits: [{ label: 'Unit C', weapons: [], defense: { T: 6, Sv: 2, W: 4, models: 1 }, _unitKey: 'unit-c' }],
    }],
  },
}, 'Delete roster B');
deleteRosterApp.matchup.attackerRosterIdx = 1;
deleteRosterApp.matchup.defenderRosterIdx = 0;
deleteRosterApp.matchup.attackerForceIdx = 1;
deleteRosterApp.onMatchupRosterChanged('attacker', false);
deleteRosterApp.matchup.attackerForceIdx = 1;
deleteRosterApp.onMatchupRosterChanged('defender', false);
let deleteRosterRebuilt = false;
deleteRosterApp.rebuildMatchup = () => { deleteRosterRebuilt = true; };
deleteRosterApp.promptDeleteMatchupRoster('attacker');
assert.strictEqual(deleteRosterApp.deleteConfirmModalOpen, true, 'sidebar Delete Roster opens a confirmation modal before deleting');
assert.strictEqual(deleteRosterApp.deleteConfirm.confirmLabel, 'Delete Roster', 'Delete Roster confirmation uses the roster label');
deleteRosterApp.closeDeleteConfirm();
assert.strictEqual(deleteRosterApp.rosters.length, 2, 'closing Delete Roster confirmation keeps the roster list unchanged');
deleteRosterApp.promptDeleteMatchupRoster('attacker');
deleteRosterApp.matchup.attackerRosterIdx = 0;
deleteRosterApp.confirmDeleteAction();
assert.strictEqual(deleteRosterApp.rosters.length, 1, 'confirming Delete Roster removes one full roster');
assert.strictEqual(deleteRosterApp.rosters[0].label, 'Delete roster A', 'Delete Roster removes the originally confirmed roster, not a force or later dropdown selection');
assert.strictEqual(deleteRosterApp.getForcesForRoster(0).length, 1, 'Delete Roster leaves the remaining roster forces intact');
assert.strictEqual(deleteRosterApp.matchup.attackerRosterIdx, 0, 'attacker roster index clamps after roster deletion');
assert.strictEqual(deleteRosterApp.matchup.defenderRosterIdx, 0, 'defender roster index clamps after roster deletion');
assert.strictEqual(deleteRosterApp.matchupAttackerForces.length, 1, 'attacker force options refresh after roster deletion');
assert.strictEqual(deleteRosterApp.matchupDefenderForces.length, 1, 'defender force options refresh after roster deletion');
assert.ok(deleteRosterRebuilt, 'confirming Delete Roster rebuilds the matchup grid');

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
deleteUnitApp.promptDeleteSelectedUnit();
assert.strictEqual(deleteUnitApp.deleteConfirmModalOpen, true, 'Delete Unit opens a confirmation modal before deleting');
assert.strictEqual(deleteUnitApp.deleteConfirm.confirmLabel, 'Delete Unit', 'Delete Unit confirmation uses the unit label');
deleteUnitApp.closeDeleteConfirm();
assert.strictEqual(deleteUnitApp.units.length, 2, 'closing Delete Unit confirmation keeps units unchanged');
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
        _points: 100,
        _children: [
          { label: 'Pack Leader', weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'pack-leader', _groupId: 'wolf-squad', _points: 40 },
          { label: 'Wolf Guard', weapons: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'wolf-guard', _groupId: 'wolf-squad', _points: 60 },
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
const pointsEditChild = renameUnitApp.profileUnit._children.find(child => child.label === 'Pack Boss');
renameUnitApp.renameTargetUnit = pointsEditChild;
renameUnitApp.renameDraft = 'Pack Boss';
renameUnitApp.renamePointsDraft = '45';
renameUnitApp.submitRenameUnit();
assert.strictEqual(renameUnitApp.forces[0]._importedUnits[0]._children.find(child => child.label === 'Pack Boss')._points, 45, 'unit summary edit persists model points');
assert.strictEqual(renameUnitApp.forces[0]._importedUnits[0]._points, 105, 'editing model points updates the parent unit total by the same delta');
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
  JSON.stringify(['Weapon: Bolt of Change | Choose Best: Ignores Cover; Lethal Hits; Sustained Hits D3']),
  'Psychic suffix aliases map to the same non-conditional modifier choices'
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
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Death Hex (Psychic)')),
  JSON.stringify(['Conditional | Unit-wide | AP +1']),
  'Death Hex maps to its conditional AP improvement'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Gift of Chaos (Psychic)')),
  JSON.stringify(['Conditional | Weapon Keyword: Psychic | Post-Damage Mortals: 1D3 100%']),
  'Gift of Chaos maps to Psychic-gated post-damage mortal wounds'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Warp Storms (Psychic)')),
  JSON.stringify(['Conditional | Pre-Damage Mortals: 1D3 3+']),
  'Warp Storms maps to conditional pre-damage mortal wounds'
);
assert.strictEqual(
  JSON.stringify(app.unitAbilityModifierNames('Slashing Dive')),
  JSON.stringify(['Conditional | Unit-wide | Pre-Damage Mortals Per Model: 1 4+']),
  'Slashing Dive maps to conditional per-model pre-damage mortal wounds'
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
assert.strictEqual(app.matchupDefenseProfileLine(app.effectiveDefense(stealthTarget), 1), 'T4 | 4+ | W2 | 1 models', 'cover is omitted from defensive profile text');
assert.ok(app.unitDefenseModifierList(stealthTarget).some(mod => /Cover/i.test(mod)), 'cover remains listed as a defensive modifier instead of a profile stat');
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
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('Blessed by the Plague God')), JSON.stringify(['Unit-wide | Defense: Invulnerable Save 4+']), 'Epidemius grants his led unit a 4+ invulnerable save');
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('Fluxmaster')), JSON.stringify(['Unit-wide | Defense: Cover', 'Unit-wide | Defense Attack: Melee: Hit Rolls -1']), 'Fluxmaster supplies both defensive datasheet effects');
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('Seductive Gambit')), JSON.stringify(['Conditional | Reroll Hits | Reroll Wounds 1']), 'Seductive Gambit exposes its conditional offensive rerolls');
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('The Eternal Dance')), JSON.stringify(['Conditional | Unit-wide | Melee: Wound Rolls +1', 'Conditional | Defense Attack: Melee: Wound Rolls -1']), 'The Eternal Dance exposes both sides of its conditional melee effect');
assert.strictEqual(JSON.stringify(app.unitAbilityModifierNames('Virulent Blessing (Psychic)')), JSON.stringify(['Conditional | Unit-wide | Damage +1']), 'Virulent Blessing exposes its conditional damage bonus');
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
const phaseWideDarkPactAttacker = {
  label: 'Phase-wide Dark Pact unit',
  abilities: ['Dark Pacts'],
  weapons: [
    { name: 'High strength pact gun', range: '24', A: '12', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'phase-pact-high-gun' },
    { name: 'Low strength pact gun', range: '24', A: '6', skill: '4', S: '1', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'phase-pact-low-gun' },
    { name: 'Low strength pact blade', range: 'Melee', A: '6', skill: '4', S: '1', AP: '6', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'phase-pact-low-blade' },
  ],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const phaseWideDarkPactCell = app.computeMatchupCell(phaseWideDarkPactAttacker, { label: 'Phase pact target', defense: { T: 3, Sv: 7, W: 100, models: 1, totalWounds: 100 } });
assert.ok(Math.abs(phaseWideDarkPactCell.dmg - (26 / 3)) < 1e-9, 'Dark Pacts chooses one option for all shooting attacks and a separate option for all melee attacks');
const disciplesAttacker = {
  ...darkPactAttacker,
  label: "Disciples of Be'lakor unit",
  abilities: ["Disciples of Be'lakor"],
};
const disciplesEasy = app.computeMatchupCell(disciplesAttacker, easyTarget);
const disciplesHard = app.computeMatchupCell(disciplesAttacker, hardTarget);
assert.ok(Math.abs(disciplesEasy.dmg - darkPactEasy.dmg) < 1e-9, "Disciples of Be'lakor chooses Sustained Hits when it beats Lethal Hits");
assert.ok(Math.abs(disciplesHard.dmg - darkPactHard.dmg) < 1e-9, "Disciples of Be'lakor chooses Lethal Hits when it beats Sustained Hits");
const boltOfChangeAttacker = {
  label: 'Bolt of Change caster',
  abilities: ['Master of Magicks (Psychic)'],
  weapons: [{ name: 'Bolt of Change', range: '24', A: '6', skill: '4', S: '10', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'bolt-of-change' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
  _unitKey: 'bolt-of-change-caster',
};
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const boltOfChangeCell = app.computeMatchupCell(boltOfChangeAttacker, easyTarget);
assert.ok(Math.abs(boltOfChangeCell.dmg - (25 / 6)) < 1e-9, 'Master of Magicks chooses the best Bolt of Change ability without Conditions Met');
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
const deathHexCaster = {
  label: 'Death Hex caster',
  abilities: ['Death Hex (Psychic)'],
  weapons: [{ name: 'Hex bolt', range: '18', A: '6', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'hex-bolt' }],
  defense: { T: 4, Sv: 4, W: 2, models: 1 },
  _unitKey: 'death-hex-caster',
};
const deathHexTarget = { label: 'Death Hex target', defense: { T: 4, Sv: 3, W: 20, models: 1, totalWounds: 20 }, _unitKey: 'death-hex-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
const deathHexOff = app.computeMatchupCell(deathHexCaster, deathHexTarget);
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const deathHexOn = app.computeMatchupCell(deathHexCaster, deathHexTarget);
assert.ok(deathHexOn.dmg > deathHexOff.dmg, 'Death Hex improves AP and increases damage when conditions are met');
assert.ok(/AP 1 from 0/.test(deathHexOn.profileModifierText), 'Death Hex calculation data shows the AP improvement');
const giftCaster = {
  label: 'Gift caster',
  abilities: ['Gift of Chaos (Psychic)'],
  weapons: [{ name: 'Psychic flame', range: '18', A: '1', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: 'Psychic', mode: 'ranged', _weaponKey: 'psychic-flame' }],
  defense: { T: 4, Sv: 4, W: 2, models: 1 },
  _unitKey: 'gift-caster',
};
const giftNonPsychic = {
  ...giftCaster,
  label: 'Gift non-psychic caster',
  weapons: [{ ...giftCaster.weapons[0], name: 'Mundane flame', modifiers: '', _weaponKey: 'mundane-flame' }],
  _unitKey: 'gift-non-psychic-caster',
};
const giftTarget = { label: 'Gift target', defense: { T: 4, Sv: 7, W: 20, models: 1, totalWounds: 20 }, _unitKey: 'gift-target' };
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const giftNonPsychicDamage = app.computeMatchupCell(giftNonPsychic, giftTarget).dmg;
const giftPsychicDamage = app.computeMatchupCell(giftCaster, giftTarget).dmg;
assert.ok(Math.abs((giftPsychicDamage - giftNonPsychicDamage) - 2) < 1e-9, 'Gift of Chaos adds expected D3 mortal wounds only for Psychic attacks');
const giftFormulaCell = app.computeMatchupCell(giftCaster, giftTarget, { includeFormula: true });
app.formulaCell = giftFormulaCell;
const giftSections = app.matchupFormulaSections();
assert.strictEqual(giftFormulaCell.formulaItems.at(-1)?.phase, 'postDamage', 'Gift of Chaos is scheduled after weapon damage');
assert.ok(/Post-Damage - Gift of Chaos \(Psychic\) mortal wounds - D:1d3/i.test(giftSections.at(-1)?.title || ''), 'Gift of Chaos appears as a Post-Damage D3 formula section');
assert.ok(giftSections.at(-1).lines.some(line => /Damage: 100\.0% x 1d3 damage = 2 damage/i.test(line.text || line)), 'Gift of Chaos formula shows its D3 mortal wound math');
const warpStormUnit = {
  label: 'Warp storm unit',
  abilities: ['Warp Storms (Psychic)'],
  weapons: [],
  defense: { T: 4, Sv: 4, W: 2, models: 1 },
  _unitKey: 'warp-storm-unit',
};
const warpStormTarget = { label: 'Warp storm target', defense: { T: 4, Sv: 7, W: 20, models: 1, totalWounds: 20 }, _unitKey: 'warp-storm-target' };
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const warpStormCell = app.computeMatchupCell(warpStormUnit, warpStormTarget, { includeFormula: true });
assert.ok(Math.abs(warpStormCell.dmg - (4 / 3)) < 1e-9, 'Warp Storms adds expected 3+ D3 mortal wounds as pre-damage');
assert.strictEqual(warpStormCell.formulaItems[0]?.phase, 'preDamage', 'Warp Storms is scheduled before weapon damage');
app.formulaCell = warpStormCell;
assert.ok(app.matchupFormulaSections()[0].lines.some(line => /Damage: 66\.7% x 1d3 damage = 1\.333 damage/i.test(line.text || line)), 'Warp Storms formula shows its 3+ D3 mortal wound math');
const slashingDiveUnit = {
  label: 'Slashing Dive unit',
  abilities: ['Slashing Dive'],
  weapons: [],
  defense: { T: 4, Sv: 4, W: 2, models: 5 },
  _children: [
    { label: 'Skyhunter leader', weapons: [], defense: { T: 4, Sv: 4, W: 2, models: 1 }, _unitKey: 'skyhunter-leader' },
    { label: 'Skyhunters', weapons: [], defense: { T: 4, Sv: 4, W: 2, models: 4 }, _unitKey: 'skyhunters' },
  ],
  _unitKey: 'slashing-dive-unit',
};
slashingDiveUnit._children.forEach(child => Object.defineProperty(child, '_parentUnit', { value: slashingDiveUnit, enumerable: false, configurable: true }));
const slashingDiveTarget = { label: 'Slashing Dive target', defense: { T: 4, Sv: 7, W: 20, models: 1, totalWounds: 20 }, _unitKey: 'slashing-dive-target' };
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
assert.strictEqual(app.computeMatchupCell(slashingDiveUnit, slashingDiveTarget).dmg, 0, 'Slashing Dive is gated by Conditions Met');
app.matchup.conditionsMet = true;
app.clearMatchupComputationCache();
const slashingDiveCell = app.computeMatchupCell(slashingDiveUnit, slashingDiveTarget, { includeFormula: true });
assert.ok(Math.abs(slashingDiveCell.dmg - 2.5) < 1e-9, 'Slashing Dive adds one 4+ mortal wound roll per model in the unit');
app.formulaCell = slashingDiveCell;
assert.ok(app.matchupFormulaSections()[0].lines.some(line => /Damage: 5 models x 50\.0% x 1 damage = 2\.5 damage/i.test(line.text || line)), 'Slashing Dive formula shows per-model mortal wound math');
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
assert.ok(noSpillLines.some(line => /^Profile Total: .* damage \(.* wounds\) - Models destroyed: /i.test(line)), 'profile total summarizes all target totals and destroyed models');
assert.ok(!noSpillLines.some(line => /\bexpected\b/i.test(line)), 'profile calculation steps do not use expected wording');
assert.ok(!noSpillLines.some(line => /sustained|lethal|after FNP/i.test(line)), 'formula omits sustained, lethal, and FNP text when they do not apply');

const damageOneFractionalTargetCell = app.computeMatchupCell(
  {
    label: 'Damage one spill attacker',
    weapons: [
      { name: 'Fractional setup', range: 'Melee', A: '7', skill: '3', S: '5', AP: '2', D: '3', modifiers: '', mode: 'melee' },
      { name: 'Damage one finisher', range: 'Melee', A: '12', skill: '4', S: '6', AP: '1', D: '1', modifiers: 'Extra Attacks, Lance', mode: 'melee' },
    ],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Fractional target', defense: { T: 4, Sv: 3, Fnp: 5, W: 4, models: 1, totalWounds: 4 } },
  { includeFormula: true }
);
app.formulaCell = damageOneFractionalTargetCell;
const damageOneFinisherLines = app.matchupFormulaSections()[1].lines.map(line => line.text || line);
assert.ok(!damageOneFinisherLines.some(line => /^Spill Loss:/i.test(line)), 'damage-1 profiles never lose damage to spill against a fractionally wounded model');
assert.ok(damageOneFinisherLines.some(line => /^Profile Total: 1\.667 damage /i.test(line)), 'damage-1 profiles deal all expected post-FNP damage even when the target has fractional wounds remaining');

const belakorTerminatorCell = app.computeMatchupCell(
  {
    label: "Be'lakor",
    weapons: [
      { name: 'The Blade of Shadows - strike', range: 'Melee', A: '7', skill: '2', S: '14', AP: '4', D: '1d6+1', modifiers: 'Devastating Wounds, Reroll Hits 1, Sustained Hits 1, Wound Rolls -1', mode: 'melee' },
      { name: 'Betraying Shades - focused witchfire', range: '18', A: '12', skill: '2', S: '6', AP: '3', D: '1', modifiers: 'Devastating Wounds, Hazardous, Ignores Cover, Psychic, Reroll Hits 1, Sustained Hits 1, Wound Rolls -1', mode: 'ranged' },
    ],
    defense: { T: 10, Sv: 2, W: 18, models: 1 },
  },
  { label: 'Wolf Guard Terminators', defense: { T: 5, Sv: 2, Inv: 4, W: 4, models: 4, totalWounds: 16 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = belakorTerminatorCell;
const belakorTerminatorSections = app.matchupFormulaSections();
const belakorBladeLines = belakorTerminatorSections[0].lines.map(line => line.text || line);
const belakorShadesLines = belakorTerminatorSections[1].lines.map(line => line.text || line);
assert.ok(Math.abs(belakorTerminatorCell.dmg - 15.270276189378974) < 1e-9, "Be'lakor exact sequence reports post-spill damage including probability-weighted overkill");
assert.ok(Math.abs(belakorTerminatorCell.pctModelWounds - (15.270276189378974 / 16)) < 1e-9, "Be'lakor Damage % includes probability-weighted overkill damage");
assert.ok(Math.abs(belakorTerminatorCell.kills - 3.140724917757548) < 1e-9, "Be'lakor reports probability-weighted models destroyed across both profiles");
assert.ok(Math.abs(belakorTerminatorCell.pctUnitKilled - 0.4590320577627054) < 1e-9, "Be'lakor uses the exact probability of destroying all four terminators");
assert.ok(belakorBladeLines.some(line => /^Spill Loss: .* = 4\.709 spill loss$/i.test(line)), 'variable Blade damage uses the full dice distribution for spill loss');
assert.ok(belakorBladeLines.some(line => /^Total: 10\.604 damage \(10\.191 wounds \+ 0\.413 overkill\)$/i.test(line)), 'Blade total separates applied wounds from probability-weighted overkill');
assert.ok(belakorBladeLines.some(line => /Models destroyed: 2\.408$/i.test(line)), 'Blade profile reports expected models destroyed');
assert.ok(belakorShadesLines.some(line => /^~ .*1\.592 models left ~$/.test(line)), 'the second profile starts from the expected model state left by the Blade distribution');
assert.ok(belakorShadesLines.some(line => /^Total: 4\.667 damage \(3\.276 wounds \+ 1\.391 overkill\)$/i.test(line)), 'D1 follow-up damage is allocated across every state left by the Blade');
assert.strictEqual(app.formulaDestroyedSummaryText(), 'Models destroyed: 3.141 (T5 | 2+ 4++ | W4)', 'total result reports probability-weighted destroyed terminators');

const halvedFlatFormulaCell = app.computeMatchupCell(
  {
    label: 'Halved flat attacker',
    weapons: [{ name: 'Halved power fist', range: 'Melee', A: '3', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: 'Damage /2', mode: 'melee' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Halved flat defender', defense: { T: 4, Sv: 7, W: 10, models: 1, totalWounds: 10 } },
  { includeFormula: true }
);
app.formulaCell = halvedFlatFormulaCell;
const halvedFlatLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(halvedFlatLines.some(line => /Damage: .* x 1 \(2 halved\) damage/i.test(line)), 'halved flat damage formula shows the effective damage and original value');

const halvedDiceFormulaCell = app.computeMatchupCell(
  {
    label: 'Halved dice attacker',
    weapons: [{ name: 'Halved dice fist', range: 'Melee', A: '3', skill: 'auto', S: '8', AP: '6', D: 'D3', modifiers: 'Damage /2', mode: 'melee' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Halved dice defender', defense: { T: 4, Sv: 7, W: 10, models: 1, totalWounds: 10 } },
  { includeFormula: true }
);
app.formulaCell = halvedDiceFormulaCell;
const halvedDiceLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(halvedDiceLines.some(line => /Damage: .* x 1\.333 \(1d3 halved\) damage/i.test(line)), 'halved dice damage formula shows the rounded average and original dice value');

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

const attackDiceFormulaCell = app.computeMatchupCell(
  {
    label: 'Attack dice attacker',
    weapons: [{ name: 'Variable cannon', range: '24', A: '2d6+1', skill: 'auto', S: '8', AP: '6', D: 'D6+2', modifiers: '', mode: 'ranged' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Attack dice target', defense: { T: 4, Sv: 7, W: 3, models: 10, totalWounds: 30 } },
  { includeFormula: true }
);
app.formulaCell = attackDiceFormulaCell;
const attackDiceSection = app.matchupFormulaSections()[0];
const attackDiceLines = attackDiceSection.lines.map(line => line.text || line);
assert.ok(/Variable cannon \(x1\).*A:2d6\+1 Skill:auto S:8 AP:6 D:1d6\+2/.test(attackDiceSection.title), 'formula title keeps dice attacks and dice damage as dice text');
assert.ok(attackDiceLines.some(line => /^Hits: 2d6\+1 \(8 avg\) attacks x/i.test(line)), 'formula hit step shows variable attacks while using the averaged attack count');
const diceProfileWeapon = { name: 'Profile dice gun', range: '24', A: '2d6+1', skill: '3', S: '8', AP: '2', D: 'D6+2', modifiers: 'Damage +1', mode: 'ranged' };
const diceProfileUnit = { label: 'Profile dice unit', weapons: [diceProfileWeapon], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _unitKey: 'profile-dice-unit' };
assert.strictEqual(app.weaponEffectiveStat(diceProfileWeapon, 'A', diceProfileUnit).text, '2d6+1', 'profile modal keeps dice attacks as dice text');
assert.strictEqual(app.weaponEffectiveStat(diceProfileWeapon, 'D', diceProfileUnit).text, '1d6+3', 'profile modal keeps modified dice damage as dice text');
const repairImportApp = context.weaponVsDefenseApp();
repairImportApp.addRoster({
  schema: '40k-roster-matchup-import',
  rosterLabel: 'Dice repair import',
  forceName: 'Dice repair force',
  sourceRoster: {
    roster: {
      forces: [{
        selections: [{
          name: 'Dice repair source',
          profiles: [{
            name: 'Variable gun',
            typeName: 'Ranged Weapons',
            characteristics: [
              { name: 'Range', $text: '24"' },
              { name: 'A', $text: 'D6' },
              { name: 'BS', $text: '3+' },
              { name: 'S', $text: '8' },
              { name: 'AP', $text: '-2' },
              { name: 'D', $text: 'D3' },
              { name: 'Keywords', $text: 'Psychic' },
            ],
          }],
        }],
      }],
    },
  },
  postMergeUnits: [{
    label: 'Dice repair unit',
    weapons: [{ name: 'Variable gun', range: '24"', A: '3.5', skill: '3', S: '8', AP: '2', D: 'D3', modifiers: 'Psychic', mode: 'ranged', count: 1 }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
  }],
}, 'Dice repair import');
assert.strictEqual(repairImportApp.units[0].weapons[0].A, '1d6', 'matchup roster import repairs older flattened attack dice when source profile data is available');

const lethalDevFormulaCell = app.computeMatchupCell(
  {
    label: 'Lethal dev attacker',
    weapons: [{ name: 'Lethal hammer', range: 'Melee', A: '14', skill: '2', S: '4', AP: '6', D: '1', modifiers: 'Lethal Hits, Devastating Wounds', mode: 'melee', _weaponKey: 'lethal-dev-hammer' }],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'Lethal dev target', defense: { T: 9, Sv: 7, W: 100, models: 1, totalWounds: 100 } },
  { includeFormula: true }
);
app.formulaCell = lethalDevFormulaCell;
const lethalDevLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(lethalDevLines.some(line => /Hits: .* = 2\.333 lethal hits \+ 9\.333 normal hits/i.test(line)), 'formula hit result splits lethal hits from normal hits');
assert.ok(lethalDevLines.some(line => /Wound: 2\.333 lethal hits \+ \(9\.333 normal hits x 16\.7% wound rate\) = 3\.889 wounds \(2\.333 normal wounds & 1\.556 devastating wounds\)/i.test(line)), 'formula wound result adds lethal auto-wounds while separately showing devastating wounds');

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

const importedKeyGroupedWeaponCell = app.computeMatchupCell(
  {
    label: 'Imported keyed melee models',
    defense: { T: 4, Sv: 3, W: 1, models: 3 },
    _children: [1, 2, 3].map(index => ({
      label: `Imported model ${index}`,
      _unitKey: `imported-model-${index}`,
      weapons: [{ name: 'Imported sword', range: 'Melee', A: '1', skill: 'auto', S: '8', AP: '6', D: '1', modifiers: '', mode: 'melee', _weaponKey: `imported-sword-${index}` }],
      defense: { T: 4, Sv: 3, W: 1, models: 1 },
    })),
  },
  { label: 'Imported key target', defense: { T: 4, Sv: 7, W: 10, models: 1, totalWounds: 10 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = importedKeyGroupedWeaponCell;
const importedKeyGroupedSections = app.matchupFormulaSections();
assert.strictEqual(importedKeyGroupedSections.length, 1, 'identical imported weapon profiles group even when each model has a unique import weapon key');
assert.ok(/Imported sword \(x3\).*A:3 Skill:auto S:8 AP:6 D:1/.test(importedKeyGroupedSections[0].title), 'unique import keys do not prevent grouped weapon formula titles');

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
assert.ok(/Slashing claws \(x2\).*A:16 Skill:3 S:6 AP:1 D:2/.test(reorderedModifierSections[0].title), 'grouped reordered modifier profile shows combined model count and effective statline');

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
assert.ok(overkillFormulaCell.pctModelWounds > 1, 'Damage % can exceed 100% by including overkill output');
assert.ok(/First cannon/.test(overkillFormulaCell.weaponName) && /Second cannon/.test(overkillFormulaCell.weaponName), 'overkill calculations still include later weapons');
assert.ok(!overkillLines.some(line => /Overkill - ~/i.test(line)), 'formula does not prefix defensive profile lines with Overkill');
assert.ok(app.matchupFormulaSections()[1].lines.some(line => /models left/i.test(line.text || line)), 'later weapon profiles show the probability-weighted model state left by earlier profiles');
assert.ok(app.matchupFormulaSections()[1].lines.some(line => /^Spill Loss:/i.test(line.text || line)), 'later weapon profiles retain probability-weighted spill damage');
assert.ok(overkillLines.some(line => /^Total: .* damage \(.*overkill\)$/i.test(line)), 'target totals summarize overkill damage instead of models destroyed');
assert.ok(overkillLines.some(line => /^Profile Total: .* damage \(.*overkill\) - Models destroyed: /i.test(line)), 'profile totals summarize overkill damage and destroyed models');
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
assert.ok(Math.abs(finalProfileOverkillCell.dmg - (10 / 3)) < 1e-9, 'the profile that destroys the final model still applies no-spill damage loss to its overkill attacks');
assert.ok(Math.abs(finalProfileOverkillCell.formulaItems[0].totalDamage - finalProfileOverkillCell.dmg) < 1e-9, 'the killing profile formula item includes its own overkill in total damage');
assert.ok(/3\.33 \(Damage two claws\)[\s\S]*Total damage: 3\.33/i.test(app.formulaTotalEquation()), 'the final total includes overkill from the profile that killed the unit');
assert.ok(finalProfileOverkillLines.some(line => /^Spill Loss: .* = 3\.333 spill loss$/i.test(line)), 'last-profile overkill shows spill loss from the repeated final defensive profile');
assert.ok(finalProfileOverkillLines.some(line => /^Total: 3\.333 damage \(0\.999 wounds \+ 2\.334 overkill\)$/i.test(line)), 'last-profile overkill total probability-weights damage to the final model and subsequent overkill');
assert.ok(finalProfileOverkillLines.some(line => /^Profile Total: 3\.333 damage \(0\.999 wounds \+ 2\.334 overkill\) - Models destroyed: /i.test(line)), 'killing profile total reports its probability-weighted destroyed models');

const groupedFinalProfileOverkillCell = app.computeMatchupCell(
  {
    label: 'Grouped final profile overkill attacker',
    weapons: [
      { name: 'Matched claws', range: 'Melee', A: '1', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'matched-1' },
      { name: 'Matched claws', range: 'Melee', A: '1', skill: 'auto', S: '8', AP: '6', D: '2', modifiers: '', mode: 'melee', _weaponKey: 'matched-2' },
    ],
    defense: { T: 4, Sv: 3, W: 1, models: 1 },
  },
  { label: 'One wound grouped defender', defense: { T: 4, Sv: 7, W: 1, models: 1, totalWounds: 1 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = groupedFinalProfileOverkillCell;
const groupedFinalProfileOverkillLines = app.matchupFormulaLines();
assert.ok(Math.abs(groupedFinalProfileOverkillCell.dmg - (5 / 3)) < 1e-9, 'grouped duplicate profiles keep overkill from the profile that killed the unit');
assert.ok(/1\.67 \(Matched claws\)[\s\S]*Total damage: 1\.67/i.test(app.formulaTotalEquation()), 'grouped killing profile overkill reaches the final total equation');
assert.ok(groupedFinalProfileOverkillLines.some(line => /^Total: 1\.667 damage \(0\.972 wounds \+ 0\.694 overkill\)$/i.test(line)), 'grouped killing profile probability-weights wounds plus overkill after spill loss');
assert.ok(groupedFinalProfileOverkillLines.some(line => /^Profile Total: 1\.667 damage \(0\.972 wounds \+ 0\.694 overkill\) - Models destroyed: /i.test(line)), 'grouped profile total reports probability-weighted destroyed models');
assert.ok(app.matchupFormulaSections()[0].lines.some(line => /^Profile Total:/i.test(line.text || '') && /formulaProfileTotalMeta/.test(line.html || '')), 'profile total suffix uses white meta styling');

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
assert.strictEqual(app.formulaTotalEquation(), '1.25 (weapon a) + 2.5 (weapon b)\nModels destroyed: 0\n\nTotal damage: 3.75', 'formula modal shows a labeled bottom summation equation');
assert.ok(app.formulaTotalEquationHtml().includes('<span class="formulaProfileName">(weapon a)</span>'), 'formula modal styles weapon profile names separately from damage values');
app.formulaCell = {
  dmg: 9,
  pctModelWounds: null,
  pctUnitKilled: null,
  weaponName: '2x kill tester',
  formulaItems: [
    {
      weaponName: 'kill tester a',
      modifierText: '',
      totalDamage: 6,
      lines: [
        {
          appliedDamage: 4,
          woundPool: 6,
          allocation: { appliedDamage: 4, remainingPool: 2 },
          formula: { defense: { T: 4, sv: 3, inv: 0, W: 2, Fnp: null, cover: false } },
        },
        {
          appliedDamage: 2,
          woundPool: 2,
          allocation: { appliedDamage: 2, remainingPool: 0 },
          formula: { defense: { T: 4, sv: 3, inv: 0, W: 2, Fnp: null, cover: false } },
        },
      ],
    },
    {
      weaponName: 'kill tester b',
      modifierText: '',
      totalDamage: 3,
      lines: [
        {
          appliedDamage: 3,
          woundPool: 3,
          allocation: { appliedDamage: 3, remainingPool: 0 },
          formula: { defense: { T: 5, sv: 2, inv: 4, W: 3, Fnp: 5, cover: false } },
        },
      ],
    },
  ],
};
assert.strictEqual(app.formulaDestroyedSummaryText(), 'Models destroyed: 3 (T4 | 3+ 0++ | W2), 1 (T5 | 2+ 4++ | W3 | FNP 5+)', 'formula total result summarizes destroyed models by defensive profile');

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
  abilities: ["Skullmaster's Fury", 'Devastating Charge'],
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
const skullmasterHornModifiers = app.effectiveWeaponModifiers(bloodcrusher.weapons[0], bloodcrusher, hardTarget);
assert.ok(/Devastating Wounds/i.test(skullmasterHornModifiers), 'conditional unit-wide weapon modifiers apply when conditions are met');
assert.ok(!/\bLance\b/i.test(skullmasterHornModifiers), "Skullmaster's Devastating Charge does not add Lance because it only forces Battle-shock tests");
assert.ok(!/Devastating Wounds/i.test(app.effectiveWeaponModifiers(bloodcrusher.weapons[1], bloodcrusher, hardTarget)), 'weapon-scoped modifiers only apply to matching weapons');
const brassStampedeUnit = { ...skullmasterUnit, abilities: ['Brass Stampede'] };
const brassStampedeCell = app.computeMatchupCell(brassStampedeUnit, hardTarget, { includeFormula: true });
app.formulaCell = brassStampedeCell;
const brassStampedeSections = app.matchupFormulaSections();
assert.ok(brassStampedeCell.dmg > 1, 'Brass Stampede pre-damage is added before normal weapon damage');
assert.ok(/^1\. Pre-Damage - Brass Stampede mortal wounds/i.test(brassStampedeSections[0]?.title || ''), 'Brass Stampede appears as the first Pre-Damage formula section');
assert.strictEqual(brassStampedeCell.formulaItems[0]?.phase, 'preDamage', 'Brass Stampede formula item is tagged as pre-damage');
assert.ok(brassStampedeSections[0].lines.some(line => /Damage: 50\.0% x 1d3 damage = 1 damage/i.test(line.text || line)), 'Brass Stampede formula shows the charge chance and dice damage expression');

const brassStampedeKillSummaryCell = app.computeMatchupCell(
  {
    label: 'Six mortal Bloodcrushers',
    abilities: ['Brass Stampede'],
    weapons: [],
    defense: { T: 7, Sv: 3, W: 4, models: 6 },
    _children: [1, 2, 3, 4, 5, 6].map(index => ({
      label: `Bloodcrusher ${index}`,
      weapons: [],
      defense: { T: 7, Sv: 3, W: 4, models: 1 },
    })),
  },
  {
    label: 'Mortal wound summary target',
    defense: { T: 4, Sv: 3, W: 3, models: 3, totalWounds: 9 },
    _children: [1, 2, 3].map(index => ({
      label: `Mortal target ${index}`,
      defense: { T: 4, Sv: 3, W: 3, models: 1, totalWounds: 3 },
    })),
  },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = brassStampedeKillSummaryCell;
assert.strictEqual(app.formulaDestroyedSummaryText(), 'Models destroyed: 2 (T4 | 3+ 0++ | W3)', 'pre-damage mortal wounds count toward the total destroyed-model summary');

const brassStampedeOverkillCell = app.computeMatchupCell(
  {
    label: 'Six mortal Bloodcrushers overkill',
    abilities: ['Brass Stampede'],
    weapons: [],
    defense: { T: 7, Sv: 3, W: 4, models: 6 },
    _children: [1, 2, 3, 4, 5, 6].map(index => ({
      label: `Overkill Bloodcrusher ${index}`,
      weapons: [],
      defense: { T: 7, Sv: 3, W: 4, models: 1 },
    })),
  },
  { label: 'Four wound target', defense: { T: 4, Sv: 3, W: 4, models: 1, totalWounds: 4 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = brassStampedeOverkillCell;
const brassStampedeOverkillLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(brassStampedeOverkillLines.some(line => /Damage: 6 models x 50\.0% x 1d3 damage = 6 damage/i.test(line)), 'Brass Stampede formula shows raw expected mortal damage instead of capped remaining wounds');
assert.ok(brassStampedeOverkillLines.some(line => /^~ T4 \| 3\+ 0\+\+ \| W4 \| 1 models left ~$/.test(line)), 'Brass Stampede ability section shows the target defensive profile before its damage math');
assert.ok(brassStampedeOverkillLines.some(line => /^Profile Total: 6 damage \(4 wounds \+ 2 overkill\) - Models destroyed: 1$/i.test(line)), 'Brass Stampede profile total separates applied wounds from overkill and destroyed models');

const brassStampedeFnpCell = app.computeMatchupCell(
  {
    label: 'Six mortal Bloodcrushers into FNP',
    abilities: ['Brass Stampede'],
    weapons: [],
    defense: { T: 7, Sv: 3, W: 4, models: 6 },
    _children: [1, 2, 3, 4, 5, 6].map(index => ({
      label: `FNP Bloodcrusher ${index}`,
      weapons: [],
      defense: { T: 7, Sv: 3, W: 4, models: 1 },
    })),
  },
  { label: 'Four wound FNP target', defense: { T: 4, Sv: 3, W: 4, Fnp: 5, models: 1, totalWounds: 4 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = brassStampedeFnpCell;
const brassStampedeFnpLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(brassStampedeFnpLines.some(line => /Mortal Wounds: 6 models x 50\.0% x 1d3 damage = 6 mortal wounds/i.test(line)), 'Brass Stampede formula shows raw expected mortal wounds before FNP');
assert.ok(brassStampedeFnpLines.some(line => /Feel No Pain: 6 mortal wounds x 66\.7% after FNP = 4 damage/i.test(line)), 'Brass Stampede formula shows FNP reduction for flat mortal wounds');
assert.ok(brassStampedeFnpLines.some(line => /^~ T4 \| 3\+ 0\+\+ \| W4 \| FNP 5\+ \| 1 models left ~$/.test(line)), 'Brass Stampede FNP ability section shows the target defensive profile before its damage math');
assert.ok(brassStampedeFnpLines.some(line => /^Profile Total: 4 damage \(4 wounds\) - Models destroyed: 1$/i.test(line)), 'Brass Stampede FNP profile total reports post-FNP applied wounds and destroyed models');

const brassStampedeFnpOverkillCell = app.computeMatchupCell(
  {
    label: 'Nine mortal Bloodcrushers into FNP',
    abilities: ['Brass Stampede'],
    weapons: [],
    defense: { T: 7, Sv: 3, W: 4, models: 9 },
    _children: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => ({
      label: `FNP Overkill Bloodcrusher ${index}`,
      weapons: [],
      defense: { T: 7, Sv: 3, W: 4, models: 1 },
    })),
  },
  { label: 'Four wound FNP overkill target', defense: { T: 4, Sv: 3, W: 4, Fnp: 5, models: 1, totalWounds: 4 } },
  { includeFormula: true, combineShootingProfiles: true }
);
app.formulaCell = brassStampedeFnpOverkillCell;
const brassStampedeFnpOverkillLines = app.matchupFormulaSections()[0].lines.map(line => line.text || line);
assert.ok(brassStampedeFnpOverkillLines.some(line => /Feel No Pain: 9 mortal wounds x 66\.7% after FNP = 6 damage/i.test(line)), 'Brass Stampede overkill formula applies FNP before overkill');
assert.ok(brassStampedeFnpOverkillLines.some(line => /^Profile Total: 6 damage \(4 wounds \+ 2 overkill\) - Models destroyed: 1$/i.test(line)), 'Brass Stampede mortal wounds count post-FNP overkill beyond the whole unit and reports destroyed models');

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

const sideConditionsApp = context.weaponVsDefenseApp();
sideConditionsApp.activeView = 'matchups';
sideConditionsApp.matchupModalOpen = false;
let sideConditionsRebuilds = 0;
sideConditionsApp.rebuildMatchup = function(){
  if(this.matchupModalOpen) sideConditionsRebuilds += 1;
};
sideConditionsApp.setMatchupSideConditions('attacker', true);
assert.strictEqual(sideConditionsApp.matchup.attackerConditionsMet, true, 'attacker Conditions Met checkbox updates attacker state');
assert.strictEqual(sideConditionsRebuilds, 1, 'attacker Conditions Met checkbox rebuilds the active matchup grid');
sideConditionsApp.setMatchupSideConditions('defender', true);
assert.strictEqual(sideConditionsApp.matchup.defenderConditionsMet, true, 'defender Conditions Met checkbox updates defender state');
assert.strictEqual(sideConditionsRebuilds, 2, 'defender Conditions Met checkbox rebuilds the active matchup grid');

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
const sideCustomApp = context.weaponVsDefenseApp();
const sideCustomAttacker = { label: 'Side custom attacker', _viewKey: 'attacker:0:0:side-custom-attacker:0', _unitKey: 'side-custom-attacker', abilities: [], weapons: [{ name: 'Side blade', range: 'Melee', A: '1', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'side-blade' }], defense: { T: 4, Sv: 3, W: 2, models: 1 } };
const sideCustomDefender = { label: 'Side custom defender', _viewKey: 'defender:0:0:side-custom-defender:0', _unitKey: 'side-custom-defender', abilities: [], weapons: [], defense: { T: 4, Sv: 7, W: 2, models: 1, totalWounds: 2 } };
const beforeSideCustom = sideCustomApp.computeMatchupCell(sideCustomAttacker, sideCustomDefender);
sideCustomApp.addMatchupCustomModifier('defender', 'Strength +4');
const defenderOnlySideCustom = sideCustomApp.computeMatchupCell(sideCustomAttacker, sideCustomDefender);
sideCustomApp.addMatchupCustomModifier('attacker', 'Strength +4');
const attackerSideCustom = sideCustomApp.computeMatchupCell(sideCustomAttacker, sideCustomDefender);
assert.ok(Math.abs(defenderOnlySideCustom.dmg - beforeSideCustom.dmg) < 1e-9, 'defender matchup custom modifiers do not leak into attacker weapon calculations');
assert.ok(attackerSideCustom.dmg > beforeSideCustom.dmg, 'attacker matchup custom modifiers apply to attacker weapon calculations');
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
  [noRecalcSortApp.cellCacheKey(sortAttackerB, sortDefenderB)]: { dmg: 20 },
  [noRecalcSortApp.cellCacheKey(sortAttackerA, sortAttackerA)]: { dmg: 4 },
  [noRecalcSortApp.cellCacheKey(sortAttackerA, sortAttackerB)]: { dmg: 5 },
  [noRecalcSortApp.cellCacheKey(sortAttackerB, sortAttackerA)]: { dmg: 6 },
  [noRecalcSortApp.cellCacheKey(sortAttackerB, sortAttackerB)]: { dmg: 7 },
};
noRecalcSortApp.updateMatchupSortSummaries();
noRecalcSortApp.computeMatchupCell = () => {
  throw new Error('sorting should not recalculate matchup cells');
};
noRecalcSortApp.setMatchupSideSortMode('attacker', 'overallDamage');
noRecalcSortApp.cycleMatchupSideSort('attacker');
noRecalcSortApp.setMatchupSideSortMode('defender', 'overallDamage');
noRecalcSortApp.cycleMatchupSideSort('defender');
noRecalcSortApp.setMatchupSideSortMode('attacker', 'overallScore');
noRecalcSortApp.setMatchupSideSortMode('defender', 'overallScore');
noRecalcSortApp.sortMatchupByColumn(sortDefenderA);
noRecalcSortApp.sortMatchupByRow(sortAttackerA);
noRecalcSortApp.sortMatchupAlphabetical();
assert.ok(noRecalcSortApp.matchup.visibleRows.length > 0, 'sorting refreshes visible rows from cached matchup cells');

const conditionalOverallSortApp = context.weaponVsDefenseApp();
const conditionalSortFragile = {
  label: 'Fragile profile',
  _unitKey: 'conditional-sort-fragile',
  _viewKey: 'conditional-sort-fragile',
  _points: 100,
  weapons: [{ name: 'Sort rifle', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'sort-rifle-fragile' }],
  defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
const conditionalSortTank = {
  label: 'Conditional tank',
  _unitKey: 'conditional-sort-tank',
  _viewKey: 'conditional-sort-tank',
  _points: 100,
  abilities: ['Daemon Lord of Nurgle'],
  weapons: [{ name: 'Sort rifle', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'sort-rifle-tank' }],
  defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
const conditionalSortTarget = {
  label: 'Sort target',
  _unitKey: 'conditional-sort-target',
  _viewKey: 'conditional-sort-target',
  _points: 100,
  weapons: [],
  defense: { T: 4, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
conditionalOverallSortApp.matchupModalOpen = true;
conditionalOverallSortApp.matchup.conditionsMet = true;
conditionalOverallSortApp.matchup.sortAttackers = 'overallScore';
conditionalOverallSortApp.matchup.sortAttackersDirection = 'desc';
conditionalOverallSortApp.matchup.sortDefenders = 'overallDamage';
conditionalOverallSortApp.matchupAttackerUnits = [conditionalSortFragile, conditionalSortTank];
conditionalOverallSortApp.matchupDefenderUnits = [conditionalSortTarget];
conditionalOverallSortApp.matchup.rows = [conditionalSortFragile, conditionalSortTank].map(unit => ({
  unit,
  cells: [conditionalOverallSortApp.computeMatchupCell(unit, conditionalSortTarget)],
}));
conditionalOverallSortApp.seedAggregateCellCache();
conditionalOverallSortApp.updateMatchupSortSummaries();
assert.ok(!conditionalOverallSortApp.lookupCachedMatchupCell(conditionalSortFragile, conditionalSortTank), 'Overall Score summary does not warm hidden cross-axis cells');
conditionalOverallSortApp.computeMatchupCell = () => {
  throw new Error('Overall Score sorting should use visible summary cells only');
};
conditionalOverallSortApp.refreshMatchupPresentation({ computeMissing: false });
assert.strictEqual(conditionalOverallSortApp.matchupVisibleRows()[0].unit.label, 'Conditional tank', 'Overall Score attacker sorting uses the visible grid score after Conditions Met');
assert.ok(!conditionalOverallSortApp.lookupCachedMatchupCell(conditionalSortFragile, conditionalSortTank), 'Overall Score sorting does not create hidden cross-axis cells');

const conditionalDefenderOverallSortApp = context.weaponVsDefenseApp();
const conditionalSortAttacker = {
  label: 'Incoming attacker',
  _unitKey: 'conditional-def-sort-attacker',
  _viewKey: 'conditional-def-sort-attacker',
  _points: 100,
  weapons: [{ name: 'Incoming rifle', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'incoming-rifle' }],
  defense: { T: 5, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
const conditionalSortPlainDefender = {
  label: 'Plain defender',
  _unitKey: 'conditional-sort-plain-defender',
  _viewKey: 'conditional-sort-plain-defender',
  _points: 100,
  weapons: [{ name: 'Defender rifle', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'plain-defender-rifle' }],
  defense: { T: 5, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
const conditionalSortShooterDefender = {
  label: 'Conditional shooter defender',
  _unitKey: 'conditional-sort-shooter-defender',
  _viewKey: 'conditional-sort-shooter-defender',
  _points: 100,
  abilities: ['Daemon Lord of Tzeentch'],
  weapons: [{ name: 'Defender rifle', range: '24', A: '12', skill: 'auto', S: '4', AP: '6', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'shooter-defender-rifle' }],
  defense: { T: 5, Sv: 7, W: 100, models: 1, totalWounds: 100 },
};
conditionalDefenderOverallSortApp.matchupModalOpen = true;
conditionalDefenderOverallSortApp.matchup.conditionsMet = true;
conditionalDefenderOverallSortApp.matchup.sortAttackers = 'overallDamage';
conditionalDefenderOverallSortApp.matchup.sortDefenders = 'overallScore';
conditionalDefenderOverallSortApp.matchup.sortDefendersDirection = 'desc';
conditionalDefenderOverallSortApp.matchupAttackerUnits = [conditionalSortAttacker];
conditionalDefenderOverallSortApp.matchupDefenderUnits = [conditionalSortPlainDefender, conditionalSortShooterDefender];
conditionalDefenderOverallSortApp.matchup.rows = [{
  unit: conditionalSortAttacker,
  cells: [conditionalSortPlainDefender, conditionalSortShooterDefender].map(unit => conditionalDefenderOverallSortApp.computeMatchupCell(conditionalSortAttacker, unit)),
}];
conditionalDefenderOverallSortApp.seedAggregateCellCache();
conditionalDefenderOverallSortApp.updateMatchupSortSummaries();
assert.ok(!conditionalDefenderOverallSortApp.lookupCachedMatchupCell(conditionalSortShooterDefender, conditionalSortPlainDefender), 'defender Overall Score summary does not warm hidden cross-axis cells');
conditionalDefenderOverallSortApp.computeMatchupCell = () => {
  throw new Error('Defender Overall Score sorting should use visible summary cells only');
};
conditionalDefenderOverallSortApp.refreshMatchupPresentation({ computeMissing: false });
assert.strictEqual(conditionalDefenderOverallSortApp.matchupVisibleDefenders()[0].unit.label, 'Conditional shooter defender', 'Overall Score defender sorting uses the visible grid score after Conditions Met');
assert.ok(!conditionalDefenderOverallSortApp.lookupCachedMatchupCell(conditionalSortShooterDefender, conditionalSortPlainDefender), 'defender Overall Score sorting does not create hidden cross-axis cells');

const displayToggleApp = context.weaponVsDefenseApp();
const displayToggleAttacker = {
  label: 'Display Toggle Unit',
  _unitKey: 'display-toggle-unit',
  _viewKey: 'display-toggle-unit',
  _points: 100,
  weapons: [
    { name: 'Toggle rifle', range: '24', A: '6', skill: 'auto', S: '4', AP: '1', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'toggle-rifle' },
    { name: 'Toggle blade', range: 'Melee', A: '6', skill: 'auto', S: '5', AP: '1', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'toggle-blade' },
  ],
  defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 },
};
const displayToggleDefender = {
  label: 'Display Toggle Target',
  _unitKey: 'display-toggle-target',
  _viewKey: 'display-toggle-target',
  _points: 100,
  weapons: [],
  defense: { T: 4, Sv: 4, W: 2, models: 1, totalWounds: 2 },
};
displayToggleApp.matchupModalOpen = true;
displayToggleApp.matchup.showShooting = true;
displayToggleApp.matchup.showMelee = true;
displayToggleApp.matchup.combineShootingProfiles = true;
displayToggleApp.matchupAttackerBaseUnits = [displayToggleAttacker];
displayToggleApp.matchupAttackerUnits = displayToggleApp.attackModeVariants(displayToggleAttacker);
displayToggleApp.matchupDefenderUnits = [displayToggleDefender];
displayToggleApp.matchup.rows = displayToggleApp.matchupAttackerUnits.map(unit => ({
  unit,
  cells: [displayToggleApp.computeMatchupCell(unit, displayToggleDefender)],
}));
displayToggleApp.seedAggregateCellCache();
displayToggleApp.updateMatchupSortSummaries();
displayToggleApp.refreshVisibleMatchup();
assert.strictEqual(displayToggleApp.matchupVisibleRows().map(row => row.unit._attackMode || 'all').join('|'), 'all', 'combined display starts with the already-computed combined row');
displayToggleApp.computeMatchupCell = () => {
  throw new Error('matchup display toggles should not recalculate cells or scores');
};
displayToggleApp.toggleMatchupRecomputeOption('combineShootingProfiles');
assert.strictEqual(
  displayToggleApp.matchupVisibleRows().map(row => row.unit._attackMode).sort().join('|'),
  'melee|shooting',
  'turning off Combined only reveals already-computed shooting and melee rows'
);
displayToggleApp.toggleMatchupRecomputeOption('showMelee');
assert.strictEqual(displayToggleApp.matchupVisibleRows().map(row => row.unit._attackMode).join('|'), 'shooting', 'turning off Melee only hides melee rows');
displayToggleApp.toggleMatchupRecomputeOption('showShooting');
assert.strictEqual(displayToggleApp.matchupVisibleRows().length, 0, 'turning off both profile buttons hides attacker rows without recalculation');
displayToggleApp.toggleMatchupRecomputeOption('showMelee');
assert.strictEqual(displayToggleApp.matchupVisibleRows().map(row => row.unit._attackMode).join('|'), 'melee', 'turning Melee back on reveals the cached melee row');
displayToggleApp.toggleMatchupRecomputeOption('combineShootingProfiles');
assert.strictEqual(displayToggleApp.matchupVisibleRows().map(row => row.unit._attackMode).join('|'), 'melee', 'Combined remains display-only when just one profile type is visible');

const staleBuildApp = context.weaponVsDefenseApp();
staleBuildApp.addBaseProfilesRoster();
staleBuildApp.addRoster({
  roster: {
    name: 'Daemon Race Roster',
    forces: [{
      name: 'Daemon Race Force',
      _importedUnits: [{
        label: 'Daemon Race Unit',
        _unitKey: 'daemon-race-unit',
        _groupId: 'daemon-race-unit',
        _points: 100,
        weapons: [{ name: 'Race blade', range: 'Melee', A: '3', skill: '3', S: '5', AP: '1', D: '1', mode: 'melee', modifiers: '', _weaponKey: 'race-blade' }],
        abilities: [],
        defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 },
        _children: [],
      }],
      _unitMerges: [],
    }],
  },
}, 'Daemon Race Roster');
const scheduledBuilds = [];
staleBuildApp.scheduleMatchupBuild = work => scheduledBuilds.push(work);
staleBuildApp.matchupModalOpen = true;
staleBuildApp.matchup.attackerRosterIdx = staleBuildApp.rosters.findIndex(roster => roster.label === 'Daemon Race Roster');
staleBuildApp.matchup.defenderRosterIdx = staleBuildApp.rosters.findIndex(roster => roster.label === 'Base Profiles');
staleBuildApp.matchup.attackerForceIdx = 0;
staleBuildApp.matchup.defenderForceIdx = 0;
staleBuildApp.rebuildMatchup();
staleBuildApp.matchup.attackerRosterIdx = staleBuildApp.rosters.findIndex(roster => roster.label === 'Base Profiles');
staleBuildApp.rebuildMatchup();
assert.strictEqual(scheduledBuilds.length, 2, 'race regression schedules two matchup rebuilds');
scheduledBuilds[1]();
assert.ok(staleBuildApp.matchupVisibleRows()[0].unit.label !== 'Daemon Race Unit', 'newer Base Profiles rebuild controls visible attacker rows');
scheduledBuilds[0]();
assert.ok(staleBuildApp.matchupVisibleRows()[0].unit.label !== 'Daemon Race Unit', 'stale Daemon rebuild cannot overwrite rows after dropdown state changes');
assert.strictEqual(staleBuildApp.rosters[staleBuildApp.matchup.attackerRosterIdx].label, 'Base Profiles', 'attacker dropdown state remains aligned with the accepted rebuild');
const buildTokenBeforeNavigation = staleBuildApp.matchup.buildToken;
staleBuildApp.matchup.loading = true;
staleBuildApp.switchToCalcView();
assert.ok(staleBuildApp.matchup.buildToken > buildTokenBeforeNavigation, 'leaving the matchup grid cancels any in-flight grid build');
assert.strictEqual(staleBuildApp.matchup.loading, false, 'leaving the matchup grid immediately clears its loading state');
assert.ok(/now - lastYield > 12/.test(fs.readFileSync(path.join(root, 'utilities.js'), 'utf8')), 'browser grid calculation yields within a frame-sized work budget');
assert.ok(/requestAnimationFrame\(\(\) => setTimeout\(resolve, 0\)\)/.test(fs.readFileSync(path.join(root, 'utilities.js'), 'utf8')), 'grid calculation resumes after a browser paint so navigation remains responsive');

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
  weapons: [
    { name: 'Return blade', range: 'Melee', A: '3', skill: 'auto', S: '4', AP: '1', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'return-blade' },
  ],
  defense: { T: 4, Sv: 4, W: 2, models: 1, totalWounds: 2 },
};
app.matchup.metric = 'damage';
app.matchup.showMelee = true;
app.matchup.showShooting = true;
app.matchup.combineShootingProfiles = true;
app.matchup.conditionsMet = false;
app.clearMatchupComputationCache();
app.matchupAttackerBaseUnits = [profileScoreAttacker];
app.matchupAttackerUnits = [profileScoreAttacker];
app.matchupDefenderUnits = [profileScoreDefender];
app.matchup.rows = [{ unit: profileScoreAttacker, cells: [app.computeMatchupCell(profileScoreAttacker, profileScoreDefender)] }];
app.seedAggregateCellCache();
app.updateMatchupSortSummaries([profileScoreAttacker], [profileScoreDefender]);
app.refreshVisibleMatchup();
assert.notStrictEqual(app.profileOffensiveScoreRaw(profileScoreAttacker, 'melee'), app.profileOffensiveScoreRaw(profileScoreAttacker, 'shooting'), 'unit profile modal shows distinct melee and shooting scores');
assert.ok(Number.isFinite(app.profileDefensiveScoreRaw(profileScoreAttacker)), 'unit profile modal shows the attacker defensive score from the opposing force offense');
assert.ok(Math.round(app.profileDefensiveScoreRaw(profileScoreAttacker)) > 1, 'attacker defensive profile score does not collapse to 0 or 1');
assert.ok(Number.isFinite(app.profileOffensiveScoreRaw(profileScoreDefender)), 'unit profile modal shows the defender offensive score from the reverse matchup');
assert.ok(Math.round(app.profileDefensiveScoreRaw(profileScoreDefender)) > 1, 'defender defensive profile score does not collapse to 0 or 1');
assert.ok(/^Offensive Score: \d+ \(Melee: (?:\d+|—) \/ Shooting: (?:\d+|—)\)$/.test(app.profileOffensiveScoreText(profileScoreAttacker)), 'unit profile modal offense line uses precomputed score summaries without extra melee/shooting calculations');
assert.ok(/^Defensive Score: \d+$/.test(app.profileDefensiveScoreText(profileScoreDefender)), 'unit profile modal shows defensive score');
assert.ok(/^Overall Score: \d+$/.test(app.profileOverallScoreText(profileScoreAttacker)), 'unit profile modal shows overall score');
assert.ok(/^Average Damage: \d+\.\d{2}$/.test(app.profileMetricSummaryText(profileScoreAttacker)), 'unit profile modal shows the selected matchup metric under the scores');

const childScoreApp = context.weaponVsDefenseApp();
childScoreApp.matchup.metric = 'damage';
childScoreApp.matchup.showMelee = true;
childScoreApp.matchup.showShooting = true;
childScoreApp.matchup.combineShootingProfiles = true;
const childScoreWeaponSet = [
  { name: 'Child rifle', range: '24', A: '4', skill: 'auto', S: '4', AP: '1', D: '1', modifiers: '', mode: 'ranged', _weaponKey: 'child-rifle' },
  { name: 'Child blade', range: 'Melee', A: '3', skill: 'auto', S: '4', AP: '0', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'child-blade' },
];
const scoreChildA = { label: 'Score Child A', _unitKey: 'score-child-a', _points: 50, weapons: childScoreWeaponSet, defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 } };
const scoreChildB = { label: 'Score Child B', _unitKey: 'score-child-b', _points: 50, weapons: JSON.parse(JSON.stringify(childScoreWeaponSet)), defense: { T: 4, Sv: 3, W: 2, models: 1, totalWounds: 2 } };
const scoreChildParent = {
  label: 'Score Child Parent',
  _unitKey: 'score-child-parent',
  _points: 100,
  weapons: JSON.parse(JSON.stringify(childScoreWeaponSet)),
  defense: { T: 4, Sv: 3, W: 2, models: 2, totalWounds: 4 },
  _children: [scoreChildA, scoreChildB],
};
const scoreDefenderChild = {
  label: 'Score Defender Child',
  _unitKey: 'score-defender-child',
  _points: 80,
  weapons: [{ name: 'Return talon', range: 'Melee', A: '4', skill: 'auto', S: '5', AP: '1', D: '1', modifiers: '', mode: 'melee', _weaponKey: 'return-talon' }],
  defense: { T: 5, Sv: 4, W: 3, models: 1, totalWounds: 3 },
};
const scoreDefenderParent = {
  label: 'Score Defender Parent',
  _unitKey: 'score-defender-parent',
  _points: 80,
  weapons: scoreDefenderChild.weapons,
  defense: { T: 5, Sv: 4, W: 3, models: 1, totalWounds: 3 },
  _children: [scoreDefenderChild],
};
childScoreApp.matchupAttackerBaseUnits = [scoreChildParent];
childScoreApp.matchupAttackerUnits = [scoreChildParent];
childScoreApp.matchupDefenderUnits = [scoreDefenderParent];
childScoreApp.updateMatchupSortSummaries([scoreChildParent], [scoreDefenderParent]);
assert.ok(Number.isFinite(childScoreApp.profileOffensiveScoreRaw(scoreChildA)), 'model profile modal shows a precomputed offensive score for child models');
assert.ok(Number.isFinite(childScoreApp.profileDefensiveScoreRaw(scoreChildA)), 'model profile modal shows a precomputed defensive score for child models');
assert.ok(Number.isFinite(childScoreApp.profileOverallScoreRaw(scoreChildA)), 'model profile modal shows a precomputed overall score for child models');
assert.ok(/^Average Damage: \d+\.\d{2}$/.test(childScoreApp.profileMetricSummaryText(scoreChildA)), 'model profile modal shows the selected matchup metric for child models');
assert.strictEqual(childScoreApp.profileOffensiveScoreRaw(scoreChildA), childScoreApp.profileOffensiveScoreRaw(scoreChildB), 'identical child model profiles reuse the same offensive score value');
assert.strictEqual(childScoreApp.profileDefensiveScoreRaw(scoreChildA), childScoreApp.profileDefensiveScoreRaw(scoreChildB), 'identical child model profiles reuse the same defensive score value');
assert.ok(Number.isFinite(childScoreApp.profileOffensiveScoreRaw(scoreDefenderChild)), 'defender-side child model profile modal shows offensive score from reverse matchup');
assert.ok(Number.isFinite(childScoreApp.profileDefensiveScoreRaw(scoreDefenderChild)), 'defender-side child model profile modal shows defensive score');

const preMetricSwitchScores = {
  offense: app.profileOffensiveScoreRaw(profileScoreAttacker),
  melee: app.profileOffensiveScoreRaw(profileScoreAttacker, 'melee'),
  shooting: app.profileOffensiveScoreRaw(profileScoreAttacker, 'shooting'),
  defense: app.profileDefensiveScoreRaw(profileScoreAttacker),
  overall: app.profileOverallScoreRaw(profileScoreAttacker),
};
let metricSwitchRecalcCount = 0;
const originalMetricSwitchCompute = app.computeMatchupCell.bind(app);
app.computeMatchupCell = (...args) => {
  metricSwitchRecalcCount += 1;
  return originalMetricSwitchCompute(...args);
};
app.setMatchupMetric('unitKill');
assert.strictEqual(metricSwitchRecalcCount, 0, 'changing the display metric refreshes presentation without recalculating cells');
const metricSwitchCell = app.matchup.visibleRows
  .find(row => row.unit?._unitKey === profileScoreAttacker._unitKey)
  ?.cells?.[0] || null;
assert.ok((metricSwitchCell?.pctUnitKilled || 0) > 0, 'cached matchup cells include chance-to-destroy data before switching to the Chance to Destroy display metric');
assert.notStrictEqual(app.formatMatchupMetric(metricSwitchCell), '0.0%', 'Chance to Destroy display uses cached destroy chance instead of falling back to null as zero');
assert.strictEqual(app.profileOffensiveScoreRaw(profileScoreAttacker), preMetricSwitchScores.offense, 'display metric changes do not alter offensive scores');
assert.strictEqual(app.profileOffensiveScoreRaw(profileScoreAttacker, 'melee'), preMetricSwitchScores.melee, 'display metric changes do not alter melee scores');
assert.strictEqual(app.profileOffensiveScoreRaw(profileScoreAttacker, 'shooting'), preMetricSwitchScores.shooting, 'display metric changes do not alter shooting scores');
assert.strictEqual(app.profileDefensiveScoreRaw(profileScoreAttacker), preMetricSwitchScores.defense, 'display metric changes do not alter defensive scores');
assert.strictEqual(app.profileOverallScoreRaw(profileScoreAttacker), preMetricSwitchScores.overall, 'display metric changes do not alter overall scores');
assert.ok(/^Average Chance to Destroy: \d+\.\d%$/.test(app.profileMetricSummaryText(profileScoreAttacker)), 'unit profile modal metric line follows the selected display metric');
app.computeMatchupCell = originalMetricSwitchCompute;

const realScoreAuditApp = context.weaponVsDefenseApp();
const realScoreAuditPath = path.join(root, 'list data', '11th-daemons-options-import.json');
if(fs.existsSync(realScoreAuditPath)){
  realScoreAuditApp.addRoster(JSON.parse(fs.readFileSync(realScoreAuditPath, 'utf8')), 'Real score audit');
  realScoreAuditApp.matchup.metric = 'modelWounds';
  realScoreAuditApp.matchup.showMelee = true;
  realScoreAuditApp.matchup.showShooting = true;
  realScoreAuditApp.matchup.combineShootingProfiles = true;
  realScoreAuditApp.matchup.conditionsMet = false;
  const scoreAuditForce = realScoreAuditApp.rosters[0].data.roster.forces[0];
  const scoreAuditAttackers = realScoreAuditApp.prepareMatchupUnits(realScoreAuditApp.collectUnits(scoreAuditForce), 'attacker');
  const scoreAuditDefenders = realScoreAuditApp.prepareMatchupUnits(realScoreAuditApp.collectUnits(scoreAuditForce), 'defender');
  const scoreAuditRows = scoreAuditAttackers
    .flatMap(unit => realScoreAuditApp.attackModeVariants(unit))
    .filter(unit => realScoreAuditApp.hasMatchupWeaponProfiles(unit));
  realScoreAuditApp.matchupAttackerBaseUnits = scoreAuditAttackers;
  realScoreAuditApp.matchupAttackerUnits = scoreAuditRows;
  realScoreAuditApp.matchupDefenderUnits = scoreAuditDefenders;
  realScoreAuditApp.matchup.rows = realScoreAuditApp.buildMatchupRows(scoreAuditRows, scoreAuditDefenders, () => true);
  realScoreAuditApp.seedAggregateCellCache();
  realScoreAuditApp.updateMatchupSortSummaries(scoreAuditRows, scoreAuditDefenders);
  realScoreAuditApp.refreshVisibleMatchup();
  const realDefenderScores = scoreAuditDefenders
    .map(unit => Math.round(realScoreAuditApp.profileDefensiveScoreRaw(unit)))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const realAttackerScores = scoreAuditAttackers
    .map(unit => Math.round(realScoreAuditApp.profileDefensiveScoreRaw(unit)))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  assert.ok(realDefenderScores.length > 10, 'real score audit imported enough defenders');
  assert.ok(realDefenderScores[Math.floor(realDefenderScores.length / 2)] >= 25, 'real defender defensive scores do not collapse to zero');
  assert.ok(realAttackerScores[Math.floor(realAttackerScores.length / 2)] >= 25, 'real attacker defensive scores do not collapse to one');
}

const moveModelForce = {
  _importedUnits: [
    {
      label: 'Source Squad',
      _unitKey: 'source-squad',
      _groupId: 'source-squad',
      _points: 100,
      weapons: [],
      defense: { T: 4, Sv: 3, W: 2, models: 2 },
      _children: [
        { label: 'Champion', _unitKey: 'champion', _groupId: 'source-squad', _points: 40, weapons: [], abilities: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _children: [] },
        { label: 'Trooper', _unitKey: 'trooper', _groupId: 'source-squad', _points: 60, weapons: [], abilities: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _children: [] },
      ],
    },
    {
      label: 'Target Leader',
      _unitKey: 'target-leader',
      _groupId: 'target-leader',
      _points: 80,
      weapons: [],
      abilities: [],
      defense: { T: 4, Sv: 3, W: 4, models: 1 },
      _children: [],
    },
  ],
  _unitMerges: [],
};
assert.ok(context.window.ArmyImportService.moveModelToUnit(moveModelForce, 'source-squad', 'champion', 'target-leader'), 'can stage-service move a child model into another unit');
let movedUnits = context.window.ArmyImportService.collectImportedUnits(moveModelForce);
let movedTarget = movedUnits.find(unit => unit._unitKey === 'target-leader');
let movedSource = movedUnits.find(unit => unit._unitKey === 'source-squad');
assert.ok(movedTarget._children.some(child => child.label === 'Champion'), 'moved child appears under target unit after merge');
assert.ok(movedSource._children.every(child => child.label !== 'Champion'), 'moved child is removed from source unit after split');
assert.ok(context.window.ArmyImportService.moveModelToUnit(moveModelForce, 'target-leader', 'champion', ''), 'can unmerge moved child back to standalone');
movedUnits = context.window.ArmyImportService.collectImportedUnits(moveModelForce);
assert.ok(movedUnits.some(unit => unit._unitKey === 'champion' && unit.label === 'Champion'), 'unmerged child returns as a standalone unit');

const mergeManagerApp = context.weaponVsDefenseApp();
mergeManagerApp.forces = [moveModelForce];
mergeManagerApp.selectedForceIdx = 0;
mergeManagerApp.units = mergeManagerApp.collectUnits(moveModelForce);
mergeManagerApp.openMergeUnitModal(null, moveModelForce, mergeManagerApp.units);
mergeManagerApp.mergeManagerStageMove({
  kind: 'unit',
  fromKey: 'champion',
  childKey: 'champion',
  toKey: 'target-leader',
  action: 'merge',
  label: 'Champion',
  fromLabel: 'Champion',
  toLabel: 'Target Leader',
});
const stagedTarget = mergeManagerApp.mergeManagerUnits().find(unit => unit._unitKey === 'target-leader');
assert.ok(stagedTarget._children?.some(child => child.label === 'Champion'), 'merge manager immediately refreshes staged modal lists after a drop');
const actualTargetBeforeSubmit = context.window.ArmyImportService.collectImportedUnits(moveModelForce).find(unit => unit._unitKey === 'target-leader');
assert.ok(!actualTargetBeforeSubmit._children?.some(child => child.label === 'Champion'), 'merge manager staging does not mutate the real army before submit');
mergeManagerApp.submitMergeManager();
assert.ok(mergeManagerApp.mergeModalOpen, 'merge manager stays open after submit so the refreshed lists are visible');
assert.strictEqual(mergeManagerApp.mergeManager.moves.length, 0, 'merge manager clears staged moves after submit');
assert.ok(mergeManagerApp.mergeManagerUnits().some(unit => unit._unitKey === 'target-leader' && unit._children?.some(child => child.label === 'Champion')), 'merge manager refreshes its unit list after submit');
const mergeManagerRealTarget = context.window.ArmyImportService.collectImportedUnits(moveModelForce).find(unit => unit._unitKey === 'target-leader');
assert.ok(mergeManagerRealTarget._children?.some(child => child.label === 'Champion'), 'merge manager submit applies staged unit merge to the real army');
mergeManagerApp.openMergeUnitModal(null, moveModelForce, context.window.ArmyImportService.collectImportedUnits(moveModelForce));
const reopenedKeys = mergeManagerApp.mergeManagerUnits().map(unit => unit._unitKey).sort();
assert.strictEqual(JSON.stringify(reopenedKeys), JSON.stringify(['source-squad', 'target-leader']), 'merge manager reopens with the current full merged unit list on both sides');
mergeManagerApp.mergeManagerStageMove({
  kind: 'model',
  fromKey: 'target-leader',
  childKey: 'champion',
  toKey: 'source-squad',
  action: 'merge',
  label: 'Champion',
  fromLabel: 'Target Leader',
  toLabel: 'Source Squad',
});
const stagedSquad = mergeManagerApp.mergeManagerUnits().find(unit => unit._unitKey === 'source-squad');
assert.ok(stagedSquad._children?.some(child => child.label === 'Champion'), 'merge manager can stage moving a merged model into another unit');
const actualSquadBeforeSecondSubmit = context.window.ArmyImportService.collectImportedUnits(moveModelForce).find(unit => unit._unitKey === 'source-squad');
assert.ok(!actualSquadBeforeSecondSubmit._children?.some(child => child.label === 'Champion'), 'staged model move still does not mutate the real army before submit');
mergeManagerApp.submitMergeManager();
const actualSquadAfterSecondSubmit = context.window.ArmyImportService.collectImportedUnits(moveModelForce).find(unit => unit._unitKey === 'source-squad');
assert.ok(actualSquadAfterSecondSubmit._children?.some(child => child.label === 'Champion'), 'merge manager submit applies staged model move/unmerge to the real army');

const mergeEditForce = {
  name: 'Merge edit force',
  _importedUnits: [
    {
      label: 'Edit Squad',
      _unitKey: 'edit-squad',
      _groupId: 'edit-squad',
      _points: 100,
      weapons: [],
      abilities: [],
      defense: { T: 4, Sv: 3, W: 2, models: 2 },
      _children: [
        { label: 'Edit Leader', _unitKey: 'edit-leader', _groupId: 'edit-squad', _points: 50, weapons: [], abilities: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _children: [] },
        { label: 'Delete Me', _unitKey: 'delete-me', _groupId: 'edit-squad', _points: 50, weapons: [], abilities: [], defense: { T: 4, Sv: 3, W: 2, models: 1 }, _children: [] },
      ],
    },
    {
      label: 'Spare Unit',
      _unitKey: 'spare-unit',
      _groupId: 'spare-unit',
      _points: 80,
      weapons: [],
      abilities: [],
      defense: { T: 4, Sv: 3, W: 2, models: 1 },
      _children: [],
    },
  ],
  _unitMerges: [],
};
const mergeDuplicateForce = JSON.parse(JSON.stringify(mergeEditForce));
const mergeDuplicateApp = context.weaponVsDefenseApp();
mergeDuplicateApp.forces = [mergeDuplicateForce];
mergeDuplicateApp.selectedForceIdx = 0;
mergeDuplicateApp.units = mergeDuplicateApp.collectUnits(mergeDuplicateForce);
mergeDuplicateApp.openMergeUnitModal(null, mergeDuplicateForce, mergeDuplicateApp.units);
const duplicatePreviewSquad = mergeDuplicateApp.mergeManagerUnits().find(unit => unit._unitKey === 'edit-squad');
const duplicatePreviewSpare = mergeDuplicateApp.mergeManagerUnits().find(unit => unit._unitKey === 'spare-unit');
assert.ok(mergeDuplicateApp.mergeManagerIsCollapsible(duplicatePreviewSquad), 'merge manager treats multi-model units as collapsible');
assert.ok(!mergeDuplicateApp.mergeManagerIsCollapsible(duplicatePreviewSpare), 'merge manager treats one-model units as flat rows');
const duplicatePreviewChild = duplicatePreviewSquad._children.find(child => child._unitKey === 'edit-leader');
assert.ok(mergeDuplicateApp.duplicateMergeManagerItem(duplicatePreviewChild), 'merge manager can stage duplicating a model');
assert.ok(mergeDuplicateApp.mergeManagerUnits().find(unit => unit._unitKey === 'edit-squad')._children.some(child => /^Edit Leader Copy/.test(child.label)), 'merge manager preview refreshes after staged model duplicate');
assert.ok(!context.window.ArmyImportService.collectImportedUnits(mergeDuplicateForce).find(unit => unit._unitKey === 'edit-squad')._children.some(child => /^Edit Leader Copy/.test(child.label)), 'staged model duplicate does not mutate the real army before submit');
mergeDuplicateApp.submitMergeManager();
assert.ok(context.window.ArmyImportService.collectImportedUnits(mergeDuplicateForce).find(unit => unit._unitKey === 'edit-squad')._children.some(child => /^Edit Leader Copy/.test(child.label)), 'merge manager submit applies staged model duplicate to the real army');

const mergeEditApp = context.weaponVsDefenseApp();
mergeEditApp.forces = [mergeEditForce];
mergeEditApp.selectedForceIdx = 0;
mergeEditApp.units = mergeEditApp.collectUnits(mergeEditForce);
mergeEditApp.openMergeUnitModal(null, mergeEditForce, mergeEditApp.units);
const previewEditSquad = mergeEditApp.mergeManagerUnits().find(unit => unit._unitKey === 'edit-squad');
assert.ok(mergeEditApp.renameMergeManagerItem(previewEditSquad, 'Renamed Edit Squad'), 'merge manager can stage a unit rename');
assert.ok(mergeEditApp.mergeManagerUnits().some(unit => unit.label === 'Renamed Edit Squad'), 'merge manager preview refreshes after staged unit rename');
assert.strictEqual(context.window.ArmyImportService.collectImportedUnits(mergeEditForce).find(unit => unit._unitKey === 'edit-squad').label, 'Edit Squad', 'staged unit rename does not mutate the real army before submit');
mergeEditApp.submitMergeManager();
assert.strictEqual(context.window.ArmyImportService.collectImportedUnits(mergeEditForce).find(unit => unit._unitKey === 'edit-squad').label, 'Renamed Edit Squad', 'merge manager submit applies staged unit rename to the real army');
const renamedPreview = mergeEditApp.mergeManagerUnits().find(unit => unit._unitKey === 'edit-squad');
const deletePreviewChild = renamedPreview._children.find(child => child._unitKey === 'delete-me');
assert.ok(mergeEditApp.deleteMergeManagerItem(deletePreviewChild), 'merge manager can stage deleting a model');
assert.ok(!mergeEditApp.mergeManagerUnits().find(unit => unit._unitKey === 'edit-squad')._children.some(child => child._unitKey === 'delete-me'), 'merge manager preview refreshes after staged model delete');
assert.ok(context.window.ArmyImportService.collectImportedUnits(mergeEditForce).find(unit => unit._unitKey === 'edit-squad')._children.some(child => child._unitKey === 'delete-me'), 'staged model delete does not mutate the real army before submit');
mergeEditApp.submitMergeManager();
assert.ok(!context.window.ArmyImportService.collectImportedUnits(mergeEditForce).find(unit => unit._unitKey === 'edit-squad')._children.some(child => child._unitKey === 'delete-me'), 'merge manager submit applies staged model delete to the real army');

const modalStackApp = context.weaponVsDefenseApp();
const modalStackUnit = { label: 'Modal Stack Unit', _unitKey: 'modal-stack-unit', weapons: [], abilities: [], defense: { T: 4, Sv: 3, W: 2, models: 1 } };
modalStackApp.openMatchupFormula({ dmg: 0, formulaItems: [] });
assert.strictEqual(modalStackApp.modalZIndex('formula'), 3000, 'first opened modal uses the bottom dynamic modal layer');
modalStackApp.openUnitProfile(modalStackUnit, 'Unit');
assert.ok(modalStackApp.modalZIndex('profile') > modalStackApp.modalZIndex('formula'), 'a profile opened after a formula modal stacks above it');
modalStackApp.openRuleDescription({ type: 'Rule', title: 'Stacked Rule', description: 'Stacked rule description.', unit: modalStackUnit });
assert.ok(modalStackApp.modalZIndex('rule') > modalStackApp.modalZIndex('profile'), 'a rule description opened from a profile stacks above it');
modalStackApp.openRenameUnitModal(modalStackUnit);
assert.ok(modalStackApp.modalZIndex('rename') > modalStackApp.modalZIndex('rule'), 'rename modal stacks above the modal that opened it');
modalStackApp.openDeleteConfirm({ title: 'Delete', message: 'Delete stacked item?' });
assert.ok(modalStackApp.modalZIndex('confirm') > modalStackApp.modalZIndex('rename'), 'delete confirmation stacks above all currently open modals');
modalStackApp.closeDeleteConfirm();
assert.ok(modalStackApp.modalZIndex('rename') > modalStackApp.modalZIndex('confirm'), 'closing the top modal restores the previous modal to the highest active layer');

const localStorageStore = new Map();
context.localStorage = {
  getItem: key => localStorageStore.has(key) ? localStorageStore.get(key) : null,
  setItem: (key, value) => localStorageStore.set(key, String(value)),
  removeItem: key => localStorageStore.delete(key),
};
const cacheImportApp = context.weaponVsDefenseApp();
cacheImportApp.addBaseProfilesRoster();
cacheImportApp.addRoster({
  roster: {
    name: 'Cached Army',
    forces: [{
      name: 'Cached Force',
      _importedUnits: [{
        label: 'Cached Unit',
        _unitKey: 'cached-unit',
        _groupId: 'cached-unit',
        _points: 55,
        weapons: [{ name: 'Cached blade', range: 'Melee', A: '4', skill: '3', S: '5', AP: '1', D: '1', mode: 'melee', modifiers: '', _weaponKey: 'cached-blade' }],
        abilities: [],
        defense: { T: 4, Sv: 3, W: 2, models: 1 },
        _children: [],
      }],
      _unitMerges: [],
    }],
  },
}, 'Cached Army');
cacheImportApp.addRoster({
  roster: {
    name: 'Other Cached Army',
    forces: [{
      name: 'Other Force',
      _importedUnits: [{
        label: 'Other Cached Unit',
        _unitKey: 'other-cached-unit',
        _groupId: 'other-cached-unit',
        _points: 60,
        weapons: [{ name: 'Other blade', range: 'Melee', A: '2', skill: '3', S: '4', AP: '0', D: '1', mode: 'melee', modifiers: '', _weaponKey: 'other-blade' }],
        abilities: [],
        defense: { T: 4, Sv: 3, W: 2, models: 1 },
        _children: [],
      }],
      _unitMerges: [],
    }],
  },
}, 'Other Cached Army');
cacheImportApp.addRoster({
  roster: {
    name: 'Cached Army',
    forces: [{
      name: 'Cached Force',
      _importedUnits: [{
        label: 'Cached Unit',
        _unitKey: 'cached-unit',
        _groupId: 'cached-unit',
        _points: 55,
        weapons: [{ name: 'Cached blade', range: 'Melee', A: '4', skill: '3', S: '5', AP: '1', D: '1', mode: 'melee', modifiers: '', _weaponKey: 'cached-blade' }],
        abilities: [],
        defense: { T: 4, Sv: 3, W: 2, models: 1 },
        _children: [],
      }],
      _unitMerges: [],
    }],
  },
}, 'Cached Army');
assert.strictEqual(cacheImportApp.rosters.filter(roster => /^Cached Army(?: \d+)?$/.test(roster.label)).length, 1, 'uploading the same roster again updates the existing roster instead of creating a suffixed duplicate');
cacheImportApp.matchup.attackerRosterIdx = cacheImportApp.rosters.findIndex(roster => roster.label === 'Cached Army');
cacheImportApp.matchup.attackerForceIdx = 0;
cacheImportApp.matchup.defenderRosterIdx = cacheImportApp.rosters.findIndex(roster => roster.label === 'Base Profiles');
cacheImportApp.matchup.defenderForceIdx = 0;
cacheImportApp.onMatchupRosterChanged('attacker', false);
cacheImportApp.onMatchupRosterChanged('defender', false);
cacheImportApp.saveCachedAppState();
const cachedPayload = JSON.parse(localStorageStore.get(cacheImportApp.rosterCacheKey()));
assert.strictEqual(cachedPayload.rosters.length, 2, 'browser roster cache stores imported armies');
assert.strictEqual(cachedPayload.rosters[0].label, 'Cached Army', 'browser roster cache does not store built-in Base Profiles');
assert.strictEqual(localStorageStore.has(cacheImportApp.appStateCacheKey()), false, 'browser storage does not persist selected options or matchup state');

const restoredCacheApp = context.weaponVsDefenseApp();
restoredCacheApp.addBaseProfilesRoster();
assert.strictEqual(restoredCacheApp.loadCachedRosters(), 2, 'fresh app restores cached armies from browser storage');
assert.ok(restoredCacheApp.rosters.some(roster => roster.label === 'Cached Army'), 'restored cache includes the imported army');
localStorageStore.set(restoredCacheApp.appStateCacheKey(), JSON.stringify({ version: 1, matchup: { metric: 'damage' } }));
assert.strictEqual(restoredCacheApp.loadCachedAppState(), false, 'fresh app ignores cached sidebar and matchup state');
assert.strictEqual(localStorageStore.has(restoredCacheApp.appStateCacheKey()), false, 'fresh app clears stale cached sidebar and matchup state');
restoredCacheApp.switchToMatchupView({ reset: true });
assert.strictEqual(restoredCacheApp.rosters[restoredCacheApp.matchup.attackerRosterIdx].label, 'Base Profiles', 'fresh matchup view starts from defaults after restoring army files');
assert.strictEqual(restoredCacheApp.rosters[restoredCacheApp.matchup.defenderRosterIdx].label, 'Base Profiles', 'fresh matchup defender dropdown starts from defaults after restoring army files');
assert.ok(restoredCacheApp.matchupVisibleRows()[0].unit._viewKey.startsWith('attacker:0:'), 'fresh matchup grid rows come from the default roster rather than cached selection state');
assert.ok(restoredCacheApp.matchupVisibleDefenders()[0].unit._viewKey.startsWith('defender:0:'), 'fresh matchup grid columns come from the default defender roster rather than cached selection state');
assert.strictEqual(restoredCacheApp.matchupVisibleDefenders()[0].unit._sourceRosterKey, restoredCacheApp.rosterIdentityKey(restoredCacheApp.rosters[restoredCacheApp.matchup.defenderRosterIdx], restoredCacheApp.rosters[restoredCacheApp.matchup.defenderRosterIdx]?.label), 'defender axis source identity matches the defender dropdown roster');
assert.notStrictEqual(restoredCacheApp.matchupVisibleRows()[0].unit.label, 'Cached Unit', 'fresh matchup grid does not restore cached selected army rows');
assert.notStrictEqual(restoredCacheApp.matchupVisibleDefenders()[0].unit.label, 'Cached Unit', 'fresh matchup grid does not restore cached selected army columns');
restoredCacheApp.selectedRosterIdx = restoredCacheApp.rosters.findIndex(roster => roster.label === 'Cached Army');
restoredCacheApp.refreshForces();
restoredCacheApp.renameUnit(restoredCacheApp.activeUnit, 'Renamed Cached Unit');
const renamedPayload = JSON.parse(localStorageStore.get(restoredCacheApp.rosterCacheKey()));
assert.strictEqual(renamedPayload.rosters[0].data.roster.forces[0]._importedUnits[0].label, 'Renamed Cached Unit', 'browser roster cache updates after roster edits');
delete context.localStorage;

console.log('damage-cap tests passed');
