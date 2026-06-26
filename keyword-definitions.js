(function(){
  const KEYWORD_DEFINITIONS = {
    'Anti': 'Critical Wounds are scored against matching target keywords on the listed roll, such as Anti-Vehicle 4+.',
    'Assault': 'This ranged weapon can be shot even if the bearer advanced.',
    'Blast': 'This weapon gains attacks against larger target units.',
    'Cover': 'The target receives the Benefit of Cover, improving its armour save against eligible attacks.',
    'Devastating Wounds': 'Critical Wounds inflict damage that bypasses normal saving throws.',
    'Extra Attacks': 'This melee weapon can be used in addition to one other selected melee weapon profile.',
    'Feel No Pain': 'After damage is allocated, each point of damage can be ignored on the listed roll.',
    'FNP': 'After damage is allocated, each point of damage can be ignored on the listed roll.',
    'Hazardous': 'After this weapon is used, the firing model may suffer damage from a failed Hazardous test.',
    'Heavy': 'This ranged weapon gains +1 to Hit if the attacking unit remained stationary.',
    'Ignores Cover': 'Targets cannot receive the Benefit of Cover against this weapon.',
    'Lance': 'This weapon adds +1 to Wound when the attacking unit made a Charge move this turn.',
    'Lethal Hits': 'Critical Hits automatically wound the target.',
    'Melta': 'This weapon increases damage at close range by the listed Melta value.',
    'Pistol': 'This ranged weapon can be shot while the bearer is within Engagement Range, subject to pistol restrictions.',
    'Precision': 'Successful wounds can be allocated to visible Character models in the target unit.',
    'Psychic': 'This attack or ability has the Psychic keyword.',
    'Rapid Fire': 'This ranged weapon gains additional attacks within half range.',
    'Stealth': 'Ranged attacks against this unit suffer -1 to Hit.',
    'Sustained Hits': 'Critical Hits score additional hits equal to the listed Sustained Hits value.',
    'Torrent': 'This weapon automatically hits.',
    'Twin-linked': 'This weapon can re-roll Wound rolls.',
  };

  function normalizeKeyword(value){
    return String(value || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+\d+\+?$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  const normalized = Object.fromEntries(
    Object.entries(KEYWORD_DEFINITIONS).map(([name, description]) => [normalizeKeyword(name), { name, description }])
  );

  function definitionForKeyword(value){
    const text = String(value || '').trim();
    const anti = text.match(/\bAnti[-\s]+([A-Za-z ]+)\s+(\d\+)\b/i);
    if(anti){
      return {
        name: text,
        description: `Critical Wounds are scored against ${anti[1].trim()} targets on an unmodified Wound roll of ${anti[2]}.`,
      };
    }
    const sustained = text.match(/\bSustained Hits\s+(.+)$/i);
    if(sustained){
      return {
        name: text,
        description: `Critical Hits score ${sustained[1].trim()} additional hit${sustained[1].trim() === '1' ? '' : 's'}.`,
      };
    }
    const melta = text.match(/\bMelta\s+(.+)$/i);
    if(melta){
      return {
        name: text,
        description: `This weapon increases damage by ${melta[1].trim()} at close range.`,
      };
    }
    return normalized[normalizeKeyword(text)] || null;
  }

  window.KeywordDefinitionMap = KEYWORD_DEFINITIONS;
  window.KeywordDefinitionService = {
    definitionForKeyword,
    normalizeKeyword,
  };
})();
