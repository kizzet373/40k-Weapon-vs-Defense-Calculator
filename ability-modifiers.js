(function(){
  const ABILITY_MODIFIERS = {
    ...(window.WahapediaModifierMap || {}),
    'Dark Pacts': ['Unit-wide | Choose Best: Lethal Hits; Sustained Hits 1'],
    "Disciples of Be'lakor": ['Unit-wide | Choose Best: Lethal Hits; Sustained Hits 1'],
    'Stealth': ['Defense: Cover'],
    'Cover': ['Defense: Cover'],
    'Benefit of Cover': ['Defense: Cover'],
    'Oath of Moment': ['Conditional | Reroll Hits'],
    'Heroes All': ['Conditional | Reroll Hits 1', 'Conditional | Reroll Wounds 1'],
    'Saga of The Bold': ['Conditional | Reroll Hits 1', 'Conditional | Reroll Wounds 1'],

    'Shadow Lord': ['Unit-wide | Reroll Hits 1'],
    'The Shadow Lord': ['Unit-wide | Reroll Hits 1'],
    'Shadow Lord (Aura, Psychic)': ['Unit-wide | Reroll Hits 1'],

    'Daemon Lord of Khorne': ['Unit-wide | Melee: Hit Rolls +1'],
    'Daemon Lord of Khorne (Aura)': ['Unit-wide | Melee: Hit Rolls +1'],
    'Changecaster': ['Unit-wide | Ranged: Sustained Hits 1'],
    'Penumbral Puppetry': ['Defense Attack: Hit Rolls -1'],
    'Fateskimmer': ['Unit-wide | Melee: Lethal Hits'],
    'Daemon Lord of Nurgle': ['Unit-wide | Defense: Toughness +1'],
    'Daemon Lord of Nurgle (Aura)': ['Unit-wide | Defense: Toughness +1'],
    "Nurgle's Rot": ['Conditional | Target Defense: Toughness -1'],
    "Nurgle's Rot (Psychic)": ['Conditional | Target Defense: Toughness -1'],
    'Nurgle’s Rot (Psychic)': ['Conditional | Target Defense: Toughness -1'],
    'Gloam Rot': ['Defense Attack: Wound Rolls -1 | If Strength > Toughness'],
    'Daemon Lord of Slaanesh': ['Unit-wide | Melee: AP +1'],
    'Daemon Lord of Slaanesh (Aura)': ['Unit-wide | Melee: AP +1'],
    'Mesmerising Form': ['Defense Attack: Hit Rolls -1'],
    'Daemon Lord of Tzeentch': ['Unit-wide | Ranged: Strength +1'],
    'Daemon Lord of Tzeentch (Aura)': ['Unit-wide | Ranged: Strength +1'],
    'Master of Magicks': ['Weapon: Bolt of Change | Choose Best: Ignores Cover; Lethal Hits; Sustained Hits D3'],
    'Master of Magicks (Psychic)': ['Weapon: Bolt of Change | Choose Best: Ignores Cover; Lethal Hits; Sustained Hits D3'],
    'Death Hex': ['Conditional | Unit-wide | AP +1'],
    'Death Hex (Psychic)': ['Conditional | Unit-wide | AP +1'],
    'Gift of Chaos': ['Conditional | Weapon Keyword: Psychic | Post-Damage Mortals: 1D3 100%'],
    'Gift of Chaos (Psychic)': ['Conditional | Weapon Keyword: Psychic | Post-Damage Mortals: 1D3 100%'],
    'Warp Storms': ['Conditional | Pre-Damage Mortals: 1D3 3+'],
    'Warp Storms (Psychic)': ['Conditional | Pre-Damage Mortals: 1D3 3+'],
    'Slashing Dive': ['Conditional | Unit-wide | Pre-Damage Mortals Per Model: 1 4+'],
    '*Invulnerable Save': ['Defense Attack: Ranged: Invulnerable Save 5+'],
    'Blessed by the Plague God': ['Unit-wide | Defense: Invulnerable Save 4+'],
    'Poxbringer': ['Unit-wide | Critical Hits 5+'],
    'Bloodmaster': ['Unit-wide | Wound Rolls +1'],
    'Blood Throne': ['Conditional | Unit-wide | Strength +1 | AP +1 | Damage +1'],
    'Brigand': ['Bearer | Conditional | Ranged: Ignores Cover'],
    'Relentless Carnage': ['Conditional | Fight Phase Mortals: 8D6 4+'],
    'Champion Slayer': ['Bearer | Melee: Reroll Wounds | Target: Character | Target: Monster'],
    'Collar of Khorne': ['Defense Attack: FNP 3+ | Weapon is Psychic'],
    "Skullmaster's Fury": ['Conditional | Unit-wide | Weapon: Juggernaut bladed horns | Melee: Devastating Wounds'],
    'Keep Counting!': ['Unit-wide | Melee: Sustained Hits 1'],
    'Tormentbringer (Aura)': ['Unit-wide | Melee: Sustained Hits 1'],
    'Mischief Makers': ['Defense Attack: Melee: Hit Rolls -1'],
    'Mischief Makers (Aura)': ['Defense Attack: Melee: Hit Rolls -1'],
    'Brass Stampede': ['Conditional | Unit-wide | Mortal Wounds On Charge'],
    'Cutting Down the Foe': ['Conditional | Unit-wide | Melee: Strength +1 | Melee: Damage +1'],
    "Death's Heads": ['Conditional | Unit-wide | Reroll Wounds'],
    'Executioner': ['Bearer | Conditional | Hit Rolls +1'],
    'Fluxmaster': ['Unit-wide | Defense: Cover', 'Unit-wide | Defense Attack: Melee: Hit Rolls -1'],
    'Harbinger of Death': ['Bearer | Weapon: hellforged | Choose Best: Lethal Hits; Precision; Sustained Hits 1'],
    'Horrible Fascination (Psychic)': ['Conditional | Defense Attack: Ranged: Hit Rolls -1'],
    'Huntsman': ['Bearer | Reroll Wounds | Target: Monster | Target: Vehicle'],
    'Lord of Decapitations': ['Unit-wide | Melee: Devastating Wounds'],
    'Malefic Destruction': ['Bearer | Conditional | Weapon: hellforged | Melee: Attacks +3'],
    'Mischief and Confusion': ['Conditional | Defense Attack: Ranged: Hit Rolls -1'],
    'Monarch of the Hunt': ['Bearer | Conditional | Melee: Reroll Hits | Melee: Reroll Wounds'],
    "P'tarix's Sorcerous Syphon (Aura)": ['Defense Attack: Wound Rolls -1 | Weapon is Psychic'],
    'Prey of the Blood God': ['Conditional | Unit-wide | Melee: Reroll Wounds'],
    'Prince of Darkness (Aura)': ['Unit-wide | Defense: Cover'],
    'Rage Embodied (Aura)': ['Unit-wide | Melee: Attacks +1'],
    'Seductive Gambit': ['Conditional | Reroll Hits | Reroll Wounds 1'],
    'Skulls for Khorne': ['Bearer | Reroll Hits | Reroll Wounds | Target: Character'],
    'Stalker': ['Bearer | Conditional | Wound Rolls +1'],
    'Swallow Energy (Psychic)': ['Unit-wide | Defense Attack: FNP 4+ | Weapon is Psychic'],
    'Symphony of Pain (Psychic)': ['Conditional | Unit-wide | Reroll Hits | Reroll Wounds'],
    'The Eternal Dance': ['Conditional | Unit-wide | Melee: Wound Rolls +1', 'Conditional | Defense Attack: Melee: Wound Rolls -1'],
    'Tranceweaver': ['Unit-wide | Reroll Hits 1', 'Conditional | Unit-wide | Reroll Hits | Target On Objective'],
    'Unholy Vigour': ['Conditional | Defense: Invulnerable Save 3+'],
    'Virulent Blessing (Psychic)': ['Conditional | Unit-wide | Damage +1'],
    'Chance for Glory': ['Bearer | Conditional | Melee: Strength +1 | Melee: Attacks +1 | Melee: AP +1 | Melee: Damage +1'],
    'Dark Ritual': ['Conditional | Unit-wide | Hit Rolls +1 | Wound Rolls +1'],
    'Dark Zealotry': ['Unit-wide | Melee: Wound Rolls +1'],
    'Eldritch Flames (Psychic)': ['Conditional | Ranged: Ignores Cover'],
    'Unholy Bloodshed': ['Conditional | Unit-wide | Devastating Wounds'],
    'Sacrificial Dagger': ['Conditional | Weapon Keyword: Psychic | Hit Rolls +1 | Wound Rolls +1'],
    'Prescience': ['Unit-wide | Defense Attack: Hit Rolls -1'],
    'Prescience (Psychic)': ['Unit-wide | Defense Attack: Hit Rolls -1'],
    'Faithful Flock': ['Unit-wide | Defense: Invulnerable Save 5+'],
    'Formidably Resilient': ['Defense Attack: Damage /2'],
    'Veterans of the Long War': ['Unit-wide | Melee: Reroll Wounds 1', 'Conditional | Unit-wide | Melee: Reroll Wounds'],
    'Despoilers': ['Conditional | Reroll Hits'],
    'Stabilisation Talons': ['Ranged: Ignore Hit Penalties'],

    'Fierce Example': ['Defense: Toughness +1'],
    'Enhancement: Fierce Example': ['Defense: Toughness +1'],
    'Fangs of the Pack': ['Bearer | Conditional | Melee: Precision'],
    'Stratagem: Fangs of the Pack (1CP)': ['Bearer | Conditional | Melee: Precision'],
    'Inspiring Presence': ['Conditional | Melee: Lethal Hits'],
    'Stratagem: Inspiring Presence (1CP)': ['Conditional | Melee: Lethal Hits'],
    "Champion's Guidance": ['Conditional | Reroll Hits'],
    'Champion’s Guidance': ['Conditional | Reroll Hits'],
    "Stratagem: Champion's Guidance (1CP)": ['Conditional | Reroll Hits'],
    'Stratagem: Champion’s Guidance (1CP)': ['Conditional | Reroll Hits'],
    'Heroic Resolve': ['Conditional | Defense Attack: Damage -1'],
    'Stratagem: Heroic Resolve (2CP)': ['Conditional | Defense Attack: Damage -1'],
    'Champion of The Kingsguard': ['Bearer | Melee: Reroll Hits | Melee: Reroll Wounds | Target: Character'],
    'Legendary Tenacity': ['Defense Attack: Wound Rolls -1 | If Strength > Toughness'],
    'Rugged Resilience': ['Defense Attack: Wound Rolls -1 | If Strength > Toughness'],
    'Priority Objective Identified': ['Conditional | Unit-wide | Reroll Wounds 1'],
    'Tempered Ferocity': ['Unit-wide | Sustained Hits 1', 'Conditional | Unit-wide | Reroll Hits 1'],
    'Headhunters': ['Bearer | Conditional | Devastating Wounds | Precision'],
    'Deadly Stalkers': ['Bearer | Conditional | Wound Rolls +1'],
    'Storm Shield': ['Defense: Invulnerable Save 4+'],

    "Braggart's Steel": ['Bearer | Melee: Strength +2', 'Bearer | Conditional | Melee: Damage +1'],
    'Braggart’s Steel': ['Bearer | Melee: Strength +2', 'Bearer | Conditional | Melee: Damage +1'],
    'Hordeslayer': ['Bearer | Conditional | Melee: Attacks +3'],
  };

  function normalizeRuleName(value){
    return String(value || '')
      .replace(/^Enhancement:\s*/i, '')
      .replace(/\s*\(\s*\d+(?:\.\d+)?\s*pts?\s*\)\s*$/i, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  const normalized = Object.fromEntries(
    Object.entries(ABILITY_MODIFIERS).map(([name, modifiers]) => [normalizeRuleName(name), modifiers])
  );
  const parsedSpecCache = new Map();

  function splitModifierText(value){
    return String(value || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }

  function splitSpecParts(value){
    return String(value || '')
      .split('|')
      .map(part => part.trim())
      .filter(Boolean);
  }

  function parseModifierSpec(value){
    const cacheKey = String(value || '');
    if(parsedSpecCache.has(cacheKey)) return parsedSpecCache.get(cacheKey);
    const meta = {
      conditional: false,
      bearer: false,
      unitWide: false,
      weapons: [],
      weaponKeywords: [],
      targets: [],
      targetOnObjective: false,
      strengthGreaterThanToughness: false,
      kind: 'weapon',
    };
    const modifiers = [];

    splitSpecParts(value).forEach(part => {
      let match = null;
      if(/^Conditional$/i.test(part)){ meta.conditional = true; return; }
      if(/^Bearer$/i.test(part)){ meta.bearer = true; return; }
      if(/^Unit[-\s]?wide$/i.test(part)){ meta.unitWide = true; return; }
      if((match = part.match(/^Weapon:\s*(.+)$/i))){ meta.weapons.push(match[1]); return; }
      if((match = part.match(/^Weapon Keyword:\s*(.+)$/i))){ meta.weaponKeywords.push(match[1]); return; }
      if((match = part.match(/^Weapon\s+(?:is|has keyword)\s+(.+)$/i))){ meta.weaponKeywords.push(match[1]); return; }
      if((match = part.match(/^Target:\s*(.+)$/i))){ meta.targets.push(...match[1].split(/[\/,]/).map(x => x.trim()).filter(Boolean)); return; }
      if(/^Target On Objective$/i.test(part)){ meta.targetOnObjective = true; return; }
      if(/^If Strength > Toughness$/i.test(part)){ meta.strengthGreaterThanToughness = true; return; }
      if((match = part.match(/^Defense Attack:\s*(.+)$/i))){ meta.kind = 'defenseAttack'; modifiers.push(match[1]); return; }
      if((match = part.match(/^Target Defense:\s*(.+)$/i))){ meta.kind = 'targetDefense'; modifiers.push(match[1]); return; }
      if((match = part.match(/^Defense:\s*(.+)$/i))){ meta.kind = 'defenseProfile'; modifiers.push(match[1]); return; }
      if((match = part.match(/^Fight Phase Mortals:\s*(\d+)D6\s*(\d)\+$/i))){
        meta.kind = 'special';
        meta.special = 'fightPhaseMortals';
        meta.diceCount = parseInt(match[1], 10) || 0;
        meta.rollTarget = parseInt(match[2], 10) || 0;
        modifiers.push(part);
        return;
      }
      if((match = part.match(/^(Pre|Post)-Damage Mortals:\s*(\d+)?D(\d+)\s*(?:(\d)\+|(\d+(?:\.\d+)?)%)$/i))){
        meta.kind = 'special';
        meta.special = 'phaseMortals';
        meta.phase = match[1].toLowerCase() === 'post' ? 'postDamage' : 'preDamage';
        meta.damageDice = `${match[2] || '1'}d${match[3]}`;
        meta.rollTarget = match[4] ? (parseInt(match[4], 10) || 0) : 0;
        meta.chance = match[5] ? Math.max(0, Math.min(1, parseFloat(match[5]) / 100)) : null;
        modifiers.push(part);
        return;
      }
      if((match = part.match(/^(Pre|Post)-Damage Mortals Per Model:\s*(\d+(?:\.\d+)?|\d*D\d+(?:[\+\-]\d+)?)\s*(?:(\d)\+|(\d+(?:\.\d+)?)%)$/i))){
        meta.kind = 'special';
        meta.special = 'phaseMortalsPerModel';
        meta.phase = match[1].toLowerCase() === 'post' ? 'postDamage' : 'preDamage';
        meta.damageDice = String(match[2] || '1').toLowerCase();
        meta.rollTarget = match[3] ? (parseInt(match[3], 10) || 0) : 0;
        meta.chance = match[4] ? Math.max(0, Math.min(1, parseFloat(match[4]) / 100)) : null;
        modifiers.push(part);
        return;
      }
      if(/^Mortal Wounds On Charge$/i.test(part)){ meta.kind = 'special'; modifiers.push(part); return; }
      modifiers.push(part);
    });

    const parsed = { raw: value, meta, modifiers };
    parsedSpecCache.set(cacheKey, parsed);
    return parsed;
  }

  function modifiersForRule(name){
    return [...(normalized[normalizeRuleName(name)] || [])];
  }

  function modifierTextVariants(value){
    const tokens = splitModifierText(value);
    const base = [];
    const choiceGroups = [];
    tokens.forEach(token => {
      const match = token.match(/^Choose Best:\s*(.+)$/i);
      if(match){
        choiceGroups.push(match[1].split(/[|;]/).map(option => option.trim()).filter(Boolean));
      }else{
        base.push(token);
      }
    });
    if(!choiceGroups.length) return [base.join(', ')];

    let variants = [base];
    choiceGroups.forEach(group => {
      variants = variants.flatMap(prefix => group.map(option => [...prefix, option]));
    });
    return variants.map(variant => variant.join(', '));
  }

  function ruleHasUnitWideModifier(name){
    return modifiersForRule(name).some(spec => parseModifierSpec(spec).meta.unitWide);
  }

  window.AbilityModifierMap = ABILITY_MODIFIERS;
  window.AbilityModifierService = {
    normalizeRuleName,
    modifiersForRule,
    modifierTextVariants,
    parseModifierSpec,
    ruleHasUnitWideModifier,
  };
})();
