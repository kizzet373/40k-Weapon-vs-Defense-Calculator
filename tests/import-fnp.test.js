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
['calculator-core.js', 'ability-modifiers.js', 'matchup-engine.js', 'army-import.js', 'utilities.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

const app = context.weaponVsDefenseApp();
app.addRoster({
  roster: {
    name: 'FNP import roster',
    battleScribeVersion: '2.03',
    forces: [{
      name: 'FNP force',
      selections: [{
        type: 'unit',
        id: 'great-unclean-one',
        name: 'Great Unclean One',
        number: '1',
        costs: [{ name: 'pts', value: '285' }],
        rules: [{
          name: 'Feel No Pain 6+',
          description: 'This ability always takes the form Feel No Pain X+. Each time a model with this ability would lose a wound, roll one D6: on an X+, that wound is not lost.',
        }],
        profiles: [{
          typeName: 'Unit',
          name: 'Great Unclean One',
          characteristics: [
            { name: 'T', $text: '12' },
            { name: 'Sv', $text: '5+' },
            { name: 'W', $text: '20' },
            { name: 'InSv', $text: '4+' },
          ],
        }, {
          typeName: 'Ranged Weapons',
          name: 'Putrid vomit',
          characteristics: [
            { name: 'Range', $text: '12"' },
            { name: 'A', $text: 'D6+3' },
            { name: 'BS', $text: 'N/A' },
            { name: 'S', $text: '5' },
            { name: 'AP', $text: '-2' },
            { name: 'D', $text: '1' },
            { name: 'Keywords', $text: 'Torrent, Ignores Cover' },
          ],
        }],
      }, {
        type: 'unit',
        id: 'flesh-hounds',
        name: 'Flesh Hounds',
        number: '1',
        rules: [{
          name: 'Feel No Pain 3+',
          description: 'This ability always takes the form Feel No Pain X+. Each time a model with this ability would lose a wound, roll one D6: on an X+, that wound is not lost.',
        }],
        profiles: [{
          typeName: 'Unit',
          name: 'Flesh Hounds',
          characteristics: [
            { name: 'T', $text: '4' },
            { name: 'Sv', $text: '7+' },
            { name: 'W', $text: '2' },
            { name: 'InSv', $text: '5+' },
          ],
        }],
        selections: [{
          type: 'model',
          id: 'flesh-hound-models',
          name: 'Flesh Hound',
          number: '5',
          profiles: [{
            typeName: 'Abilities',
            name: 'Collar of Khorne',
            characteristics: [
              { name: 'Description', $text: 'Models in this unit have the Feel No Pain 3+ ability against Psychic Attacks.' },
            ],
          }],
        }],
      }, {
        type: 'unit',
        id: 'psychic-only-fnp',
        name: 'Psychic Ward',
        number: '1',
        profiles: [{
          typeName: 'Unit',
          name: 'Psychic Ward',
          characteristics: [
            { name: 'T', $text: '4' },
            { name: 'Sv', $text: '3+' },
            { name: 'W', $text: '3' },
          ],
        }, {
          typeName: 'Abilities',
          name: 'Feel No Pain 3+',
          characteristics: [
            { name: 'Description', $text: 'The bearer has the Feel No Pain 3+ ability against Psychic Attacks.' },
          ],
        }],
      }],
    }],
  },
}, 'FNP import roster');

const greatUnclean = app.units.find(unit => unit.label === 'Great Unclean One');
assert.ok(greatUnclean, 'imports Great Unclean One');
assert.strictEqual(greatUnclean.defense.Fnp, 6, 'generic Feel No Pain rules populate defense FNP');
assert.ok(/FNP 6\+/.test(app.matchupDefenseHeaderLabel(greatUnclean)), 'imported FNP appears in matchup defensive headers');

const attacker = {
  label: 'FNP test attacker',
  weapons: [{ name: 'Flat damage', range: '24"', A: '6', skill: 'auto', S: '12', AP: '6', D: '1', modifiers: '', mode: 'ranged' }],
  defense: { T: 4, Sv: 3, W: 2, models: 1 },
};
const withFnp = app.computeMatchupCell(attacker, greatUnclean, { includeFormula: true });
const withoutFnp = app.computeMatchupCell(attacker, { ...greatUnclean, defense: { ...greatUnclean.defense, Fnp: null }, _unitKey: 'great-unclean-no-fnp' });
assert.ok(withFnp.dmg < withoutFnp.dmg, 'imported FNP reduces matchup damage');
app.formulaCell = withFnp;
assert.ok(app.matchupFormulaLines().some(line => /after FNP/i.test(line)), 'FNP appears in calculation breakdown when imported');

const psychicWard = app.units.find(unit => unit.label === 'Psychic Ward');
assert.ok(psychicWard, 'imports psychic-only FNP control unit');
assert.ok(psychicWard.defense.Fnp == null, 'psychic-only FNP is not treated as always-on FNP');

const fleshHounds = app.units.find(unit => unit.label === 'Flesh Hounds');
assert.ok(fleshHounds, 'imports Flesh Hounds');
assert.ok(fleshHounds.defense.Fnp == null, 'Flesh Hounds Collar of Khorne is not imported as universal FNP');
assert.ok(fleshHounds.abilities.includes('Collar of Khorne'), 'aggregate Flesh Hounds inherit Collar of Khorne when every child model has it');
const nonPsychicIntoFlesh = app.computeMatchupCell(attacker, fleshHounds).dmg;
const psychicIntoFlesh = app.computeMatchupCell({
  ...attacker,
  weapons: [{ ...attacker.weapons[0], name: 'Psychic flat damage', modifiers: 'Psychic' }],
}, fleshHounds).dmg;
assert.ok(psychicIntoFlesh < nonPsychicIntoFlesh, 'Collar of Khorne reduces only Psychic incoming weapon damage');

const enhancementImportApp = context.weaponVsDefenseApp();
enhancementImportApp.addRoster({
  roster: {
    name: 'Enhancement fixture',
    battleScribeVersion: '2.03',
    forces: [{
      name: 'Force',
      selections: [{
        type: 'unit',
        id: 'enhanced-unit',
        name: 'Enhanced Unit',
        number: '1',
        profiles: [{
          typeName: 'Unit',
          name: 'Enhanced Unit',
          characteristics: [
            { name: 'T', $text: '4' },
            { name: 'Sv', $text: '3+' },
            { name: 'W', $text: '2' },
          ],
        }],
        selections: [{
          type: 'upgrade',
          id: 'mantle-of-gloom',
          name: 'Mantle of Gloom (Aura)',
          costs: [
            { name: 'Enhancements', value: '1' },
            { name: 'pts', value: '20' },
          ],
          profiles: [{
            typeName: 'Abilities',
            name: 'Mantle of Gloom (Aura)',
            characteristics: [
              { name: 'Description', $text: 'The bearer fades away.' },
            ],
          }],
        }],
      }],
    }],
  },
}, 'Enhancement fixture');
const enhancedUnit = enhancementImportApp.units.find(unit => unit.label === 'Enhanced Unit');
assert.strictEqual(JSON.stringify(enhancedUnit?._enhancements?.map(enh => enh.name)), JSON.stringify(['Mantle of Gloom (Aura)']), 'fresh imports keep enhancement entries in the enhancement section');
assert.ok(!enhancedUnit?.abilities?.some(name => /Mantle of Gloom/i.test(name)), 'fresh imports do not duplicate enhancements in abilities');

const duplicateEnhancementImportApp = context.weaponVsDefenseApp();
duplicateEnhancementImportApp.addRoster({
  schema: '40k-roster-matchup-import',
  rosterLabel: 'Duplicate enhancement fixture',
  postMergeUnits: [{
    key: 'enhancement-owner',
    label: 'Enhancement Owner',
    abilities: ['Battle Focus', 'Mantle of Gloom (Aura) (20 pts)'],
    enhancements: [{ name: 'Mantle of Gloom (Aura)', points: 20, description: 'The bearer fades away.' }],
    defense: { T: 4, Sv: 3, W: 2, models: 1 },
    weapons: [],
  }],
}, 'Duplicate enhancement fixture');
const duplicateEnhancementUnit = duplicateEnhancementImportApp.units[0];
assert.strictEqual(JSON.stringify(duplicateEnhancementUnit.abilities), JSON.stringify(['Battle Focus']), 'matchup imports remove enhancement duplicates from abilities');
assert.strictEqual(JSON.stringify(duplicateEnhancementUnit._enhancements.map(enh => enh.name)), JSON.stringify(['Mantle of Gloom (Aura)']), 'matchup imports keep the enhancement section');

const matchupImportApp = context.weaponVsDefenseApp();
matchupImportApp.addRoster({
  schema: '40k-roster-matchup-import',
  rosterLabel: 'Saved matchup import',
  sourceRoster: {
    roster: {
      name: 'Saved matchup source',
      battleScribeVersion: '2.03',
      forces: [{
        name: 'Source force',
        selections: [{
          type: 'model',
          id: 'saved-great-unclean-one',
          name: 'Great Unclean One',
          number: '1',
          rules: [{
            name: 'Feel No Pain 6+',
            description: 'This ability always takes the form Feel No Pain X+. Each time a model with this ability would lose a wound, roll one D6: on an X+, that wound is not lost.',
          }],
          profiles: [{
            typeName: 'Unit',
            name: 'Great Unclean One',
            characteristics: [
              { name: 'T', $text: '12' },
              { name: 'Sv', $text: '5+' },
              { name: 'W', $text: '20' },
              { name: 'InSv', $text: '4+' },
            ],
          }],
        }, {
          type: 'unit',
          id: 'flesh-hounds',
          name: 'Flesh Hounds',
          number: '1',
          rules: [{
            name: 'Feel No Pain 3+',
            description: 'This ability always takes the form Feel No Pain X+. Each time a model with this ability would lose a wound, roll one D6: on an X+, that wound is not lost.',
          }],
          profiles: [{
            typeName: 'Unit',
            name: 'Flesh Hounds',
            characteristics: [
              { name: 'T', $text: '4' },
              { name: 'Sv', $text: '7+' },
              { name: 'W', $text: '2' },
              { name: 'InSv', $text: '5+' },
            ],
          }],
          selections: [{
            type: 'model',
            id: 'saved-flesh-hound-models',
            name: 'Flesh Hound',
            number: '2',
            profiles: [{
              typeName: 'Abilities',
              name: 'Collar of Khorne',
              characteristics: [
                { name: 'Description', $text: 'Models in this unit have the Feel No Pain 3+ ability against Psychic Attacks.' },
              ],
            }],
          }],
        }],
      }],
    },
  },
  postMergeUnits: [{
    label: 'Great Unclean One',
    key: 'nr-saved-great-unclean-one',
    defense: { T: 12, Sv: 5, Inv: 4, W: 20, models: 1, totalWounds: 20 },
    weapons: [],
    abilities: [],
  }, {
    label: 'Flesh Hounds',
    key: 'nr-flesh-hounds',
    defense: { T: 4, Sv: 7, Inv: 5, W: 2, Fnp: 3, models: 5, totalWounds: 10 },
    weapons: [],
    abilities: [],
    children: [
      { label: 'Flesh Hound 1', defense: { T: 4, Sv: 7, Inv: 5, W: 2, models: 1 }, weapons: [], abilities: ['Collar of Khorne'] },
      { label: 'Flesh Hound 2', defense: { T: 4, Sv: 7, Inv: 5, W: 2, models: 1 }, weapons: [], abilities: ['Collar of Khorne'] },
    ],
  }],
}, 'Saved matchup import');
const repairedGreatUnclean = matchupImportApp.units.find(unit => unit.label === 'Great Unclean One');
assert.strictEqual(repairedGreatUnclean?.defense?.Fnp, 6, 'saved matchup imports repair missing FNP from embedded source roster');
const repairedFleshHounds = matchupImportApp.units.find(unit => unit.label === 'Flesh Hounds');
assert.ok(repairedFleshHounds?.defense?.Fnp == null, 'saved matchup imports clear stale universal Flesh Hounds FNP from embedded source roster');
assert.ok(repairedFleshHounds?.abilities?.includes('Collar of Khorne'), 'saved matchup imports keep Collar of Khorne as the scoped defensive ability');

console.log('import-fnp tests passed');
