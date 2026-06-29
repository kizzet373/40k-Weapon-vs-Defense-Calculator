(function(){
  function cleanText(value){
    return String(value || '')
      .replace(/\[[0-9a-fA-F]{6}\]/g, '')
      .replace(/\[-\]/g, '')
      .replace(/\r/g, '')
      .trim();
  }

  function cleanName(value){
    return cleanText(value)
      .replace(/^\s*\d+\s*\/\s*\d+\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseSave(value){
    const raw = String(value || '').trim();
    if(raw === '-' || /^n\/?a$/i.test(raw)) return null;
    const n = parseFloat(raw.replace('+', ''));
    return Number.isFinite(n) ? n : null;
  }

  function parsePointsValue(value){
    if(value == null || value === '') return null;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    if(!match) return null;
    const n = parseFloat(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  function pointCostFromNode(node){
    if(!node || typeof node !== 'object') return null;
    const directKeys = ['_points', 'points', 'pts', 'cost', 'totalPoints', 'pointCost'];
    for(const key of directKeys){
      if(node[key] == null) continue;
      const parsed = parsePointsValue(node[key]);
      if(parsed != null) return parsed;
    }

    const costs = Array.isArray(node.costs) ? node.costs : [];
    const ptsCosts = costs
      .filter(cost => /(^|\b)(pts?|points?)(\b|$)/i.test(`${cost?.name || ''} ${cost?.typeId || ''} ${cost?.unit || ''}`))
      .map(cost => parsePointsValue(cost?.value ?? cost?.$text))
      .filter(value => value != null);
    if(ptsCosts.length) return ptsCosts.reduce((sum, value) => sum + value, 0);
    return null;
  }

  function sumPointCosts(nodes){
    const values = (nodes || []).map(pointCostFromNode).filter(value => value != null);
    if(!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0);
  }

  function averageDice(expr){
    const s = String(expr || '').replace(/\s+/g, '');
    if(/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const m = s.match(/^(\d+)?[dD](\d+)([+\-]\d+)?$/);
    if(!m) return parseFloat(s) || 0;
    const dice = parseInt(m[1] || '1', 10);
    const faces = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    return dice * ((faces + 1) / 2) + mod;
  }

  function fmtNumber(n){
    if(!Number.isFinite(n)) return '0';
    if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2).replace(/\.?0+$/, '');
  }

  function splitModifiers(raw){
    const s = String(raw || '').trim();
    if(!s) return [];
    return s
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }

  function serializeModifiers(modifiers){
    const xs = (modifiers || []).map(x => String(x || '').trim()).filter(Boolean);
    return xs.length ? xs.join(', ') : '';
  }

  function mergeDescriptionMaps(...maps){
    const out = {};
    maps.forEach(map => {
      Object.entries(map || {}).forEach(([name, description]) => {
        const key = cleanProfileName(name);
        const text = cleanText(description);
        if(key && text && !out[key]) out[key] = text;
      });
    });
    return out;
  }

  function parseStatline(lines){
    const headerIdx = lines.findIndex(line => /\bM\b/i.test(line) && /\bT\b/i.test(line) && /\bSv\b/i.test(line) && /\bW\b/i.test(line));
    if(headerIdx < 0) return null;
    const values = lines.slice(headerIdx + 1).find(line => line.trim());
    if(!values) return null;
    const parts = values.trim().split(/\s+/);
    if(parts.length < 4) return null;
    return {
      T: parseFloat(parts[1]),
      Sv: parseSave(parts[2]),
      W: parseFloat(parts[3]),
    };
  }

  function parseWeaponLine(name, line, mode){
    const match = String(line || '').trim().match(/^(.+?)\s+A:([^\s]+)\s+(BS|WS):([^\s]+)\s+S:([^\s]+)\s+AP:([^\s]+)\s+D:([^\s]+)(?:\s+(.+))?$/i);
    if(!match) return null;
    const modifiers = splitModifiers(match[8] || '');
    return {
      name,
      range: match[1],
      A: match[2],
      skill: match[4].replace('+', '').replace(/^N\/A$/i, 'auto'),
      S: match[5],
      AP: String(match[6]).replace('-', ''),
      D: match[7],
      modifiers: serializeModifiers(modifiers),
      mode,
      _profileCount: 1,
      _modifierToggles: Object.fromEntries(modifiers.map(mod => [mod, true])),
    };
  }

  function tagsFor(objectState){
    return Array.isArray(objectState && objectState.Tags) ? objectState.Tags.map(String) : [];
  }

  function uuidFromTags(tags){
    const tag = (tags || []).find(t => /^uuid:/i.test(t));
    return tag ? tag.replace(/^uuid:/i, '') : '';
  }

  function modelFingerprint(objectState){
    const mesh = objectState?.CustomMesh?.MeshURL || '';
    const asset = objectState?.CustomAssetbundle?.AssetbundleURL || '';
    return [
      objectState?.Name || '',
      objectState?.GUID || '',
      mesh,
      asset,
    ].join('|');
  }

  function normalizedWeaponName(name){
    return String(name || '')
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[’]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function weaponNameMatches(weapon, patterns){
    const name = normalizedWeaponName(weapon?.name);
    return patterns.some(pattern => {
      if(pattern && typeof pattern.test === 'function') return pattern.test(name);
      return name === normalizedWeaponName(pattern);
    });
  }

  function filterWeapons(unit, patterns){
    const list = unit?.weapons || [];
    return list.filter(weapon => weaponNameMatches(weapon, patterns));
  }

  function weaponNamesKey(unit){
    return (unit?.weapons || [])
      .map(weapon => [
        normalizedWeaponName(weapon.name),
        normalizedWeaponName(weapon.range),
        normalizedWeaponName(weapon.A),
        normalizedWeaponName(weapon.skill),
        normalizedWeaponName(weapon.S),
        normalizedWeaponName(weapon.AP),
        normalizedWeaponName(weapon.D),
        normalizedWeaponName(weapon.mode),
      ].join('|'))
      .sort()
      .join('||');
  }

  function hasAllWeaponPatterns(unit, patterns){
    return patterns.every(pattern => (unit?.weapons || []).some(weapon => weaponNameMatches(weapon, [pattern])));
  }

  function parseTtsUnitObject(objectState, index){
    const description = cleanText(objectState && objectState.Description);
    if(!description) return null;
    const label = cleanName(objectState.Nickname) || 'Imported unit';
    const tags = tagsFor(objectState);
    const keywords = tags.map(tag => cleanName(tag).replace(/^Faction:\s*/i, '').trim()).filter(Boolean);
    const lines = description.split('\n').map(x => x.trim()).filter(Boolean);
    const statline = parseStatline(lines) || {};
    const invMatch = description.match(/Invulnerable Save:\s*(\d)\+/i) || description.match(/(\d)\+\s*Invulnerable Save/i);
    const abilitiesIdx = lines.findIndex(line => /^Abilities$/i.test(line));
    const abilities = abilitiesIdx >= 0 ? lines.slice(abilitiesIdx + 1).filter(line => !/weapons$/i.test(line)) : [];
    const abilityDescriptions = Object.fromEntries(abilities.map(name => [name, name]));

    const weapons = [];
    let mode = null;
    for(let i = 0; i < lines.length; i++){
      if(/^Ranged weapons$/i.test(lines[i])){ mode = 'ranged'; continue; }
      if(/^Melee weapons$/i.test(lines[i])){ mode = 'melee'; continue; }
      if(/^Abilities$/i.test(lines[i])) break;
      if(!mode) continue;

      const maybeName = lines[i];
      const maybeProfile = lines[i + 1] || '';
      if(/\sA:[^\s]+/i.test(maybeProfile) && /\s(?:BS|WS):[^\s]+/i.test(maybeProfile)){
        const weapon = parseWeaponLine(maybeName, maybeProfile, mode);
        if(weapon) weapons.push(weapon);
        i++;
      }
    }

    if(!weapons.length && statline.T == null) return null;
    const unitKey = `tts-model-${index}`;
    weapons.forEach((weapon, weaponIndex) => {
      weapon._weaponKey = `${unitKey}|${weaponIndex}|${weapon.name}|${weapon.range}|${weapon.mode}`;
    });
    return {
      label,
      weapons,
      defense: {
        T: Number.isFinite(statline.T) ? statline.T : null,
        Sv: Number.isFinite(statline.Sv) ? statline.Sv : null,
        Inv: invMatch ? parseFloat(invMatch[1]) : null,
        W: Number.isFinite(statline.W) ? statline.W : null,
        models: 1,
      },
      abilities,
      _abilityDescriptions: abilityDescriptions,
      source: 'Tabletop Simulator',
      rawDescription: description,
      _unitKey: unitKey,
      _groupId: uuidFromTags(tags) || `ungrouped-${index}`,
      _isLeaderModel: tags.some(t => /^leaderModel$/i.test(t)),
      _isCharacterModel: tags.some(t => /^character$/i.test(t)),
      _tags: tags,
      _keywords: keywords,
      _objectGuid: objectState?.GUID || '',
      _modelFingerprint: modelFingerprint(objectState),
      _points: null,
    };
  }

  function mergeWeapons(existing, incoming){
    const keyOf = w => [w.name, w.range, w.skill, w.S, w.AP, w.D, w.mode].join('|');
    const countOf = w => Math.max(1, parseInt(w?._profileCount ?? w?._count ?? 1, 10) || 1);
    const map = new Map((existing || []).map(w => [keyOf(w), { ...w, _profileCount: countOf(w) }]));
    (incoming || []).forEach(w => {
      const key = keyOf(w);
      if(!map.has(key)){
        map.set(key, { ...w, _profileCount: countOf(w) });
        return;
      }
      const current = map.get(key);
      current.A = fmtNumber(averageDice(current.A) + averageDice(w.A));
      current._profileCount = countOf(current) + countOf(w);
    });
    return [...map.values()];
  }

  function pickAggregateLabel(children){
    const counts = new Map();
    const candidates = children.filter(ch => !ch._isLeaderModel);
    (candidates.length ? candidates : children).forEach(ch => {
      const key = ch.label || 'Imported unit';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] || 'Imported unit';
  }

  function mostCommonFingerprint(children){
    const counts = new Map();
    children.forEach(child => {
      const key = child._modelFingerprint || child._objectGuid || child.label || '';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] || '';
  }

  function withResolvedWeapons(child, weapons, note){
    return {
      ...child,
      weapons,
      _equipmentResolution: note,
    };
  }

  function resolveHavocEquipment(children){
    const leader = children.find(ch => ch._isLeaderModel);
    const regulars = children.filter(ch => !ch._isLeaderModel);
    const source = leader || children[0];
    if(!leader || !regulars.length) return null;
    if(!hasAllWeaponPatterns(source, [/^meltagun$/, /^power fist$/, /^close combat weapon$/, /^havoc /])) return null;

    return children.map(child => {
      if(child._isLeaderModel){
        return withResolvedWeapons(child, filterWeapons(child, [/^meltagun$/, /^power fist$/]), 'havoc-leader');
      }
      return withResolvedWeapons(child, filterWeapons(child, [/^havoc /, /^close combat weapon$/]), 'havoc-regular');
    });
  }

  function resolveChosenEquipment(children){
    const leader = children.find(ch => ch._isLeaderModel);
    const nonleaders = children.filter(ch => !ch._isLeaderModel);
    const source = leader || children[0];
    if(!leader || nonleaders.length < 2) return null;
    if(!hasAllWeaponPatterns(source, [
      /^plasma pistol - standard$/,
      /^plasma pistol - supercharge$/,
      /^boltgun$/,
      /^bolt pistol$/,
      /^combi-weapon$/,
      /^power fist$/,
      /^accursed weapon$/,
      /^paired accursed weapons$/,
    ])) return null;

    const regularFingerprint = mostCommonFingerprint(nonleaders);
    const specialModels = nonleaders.filter(ch => (ch._modelFingerprint || ch._objectGuid || ch.label || '') !== regularFingerprint);
    if(!specialModels.length) return null;

    return children.map(child => {
      if(child._isLeaderModel){
        return withResolvedWeapons(child, filterWeapons(child, [
          /^plasma pistol - standard$/,
          /^plasma pistol - supercharge$/,
          /^bolt pistol$/,
          /^paired accursed weapons$/,
        ]), 'chosen-leader');
      }
      if(specialModels.includes(child)){
        return withResolvedWeapons(child, filterWeapons(child, [
          /^combi-weapon$/,
          /^bolt pistol$/,
          /^power fist$/,
        ]), 'chosen-special');
      }
      return withResolvedWeapons(child, filterWeapons(child, [
        /^boltgun$/,
        /^bolt pistol$/,
        /^accursed weapon$/,
      ]), 'chosen-regular');
    });
  }

  function resolveCopiedTtsEquipment(children, label){
    if(children.length <= 1) return children;
    const keys = new Set(children.map(weaponNamesKey));
    if(keys.size !== 1) return children;

    const unitName = normalizedWeaponName(label || pickAggregateLabel(children));
    const resolved =
      /^havocs?$/.test(unitName) ? resolveHavocEquipment(children)
      : /^chosen$/.test(unitName) ? resolveChosenEquipment(children)
      : null;
    return resolved || children;
  }

  function mergeMetadataEntries(...lists){
    const map = new Map();
    lists.flat().filter(Boolean).forEach(entry => {
      const key = [
        entry.name || '',
        entry.points ?? '',
        entry.description || '',
      ].join('|');
      if(!map.has(key)) map.set(key, { ...entry });
    });
    return [...map.values()];
  }

  function positivePointValue(value){
    const points = parseFloat(value);
    return Number.isFinite(points) && points > 0 ? points : null;
  }

  function modelWeight(unit){
    const models = parseFloat(unit?.defense?.models ?? unit?.size ?? 1);
    return Number.isFinite(models) && models > 0 ? models : 1;
  }

  function allocateUnitPointRemainder(unit){
    if(!unit || typeof unit !== 'object') return unit;
    const children = Array.isArray(unit._children) ? unit._children : [];
    children.forEach(child => allocateUnitPointRemainder(child));
    if(!children.length) return unit;

    const unitPoints = positivePointValue(unit._points);
    const childPoints = child => positivePointValue(child?._points) || 0;
    const knownChildTotal = children.reduce((sum, child) => sum + childPoints(child), 0);

    if(unitPoints != null){
      const remaining = unitPoints - knownChildTotal;
      if(remaining > 1e-9){
        const missing = children.filter(child => positivePointValue(child?._points) == null);
        const targets = missing.length ? missing : children;
        const totalWeight = targets.reduce((sum, child) => sum + modelWeight(child), 0) || targets.length || 1;
        targets.forEach(child => {
          const current = childPoints(child);
          child._points = current + (remaining * modelWeight(child) / totalWeight);
          allocateUnitPointRemainder(child);
        });
      }
    }

    const summedChildren = children.reduce((sum, child) => sum + childPoints(child), 0);
    if(summedChildren > 0) unit._points = summedChildren;
    return unit;
  }

  function aggregateChildren(children, key, label, sourceUnits=[]){
    const resolvedLabel = label || pickAggregateLabel(children);
    const resolvedChildren = resolveCopiedTtsEquipment(children, resolvedLabel);
    const ordered = [...resolvedChildren].sort((a, b) => {
      if(!!a._isLeaderModel !== !!b._isLeaderModel) return a._isLeaderModel ? -1 : 1;
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
    const primary = ordered.find(ch => !ch._isLeaderModel) || ordered[0] || {};
    const defense = { ...(primary.defense || {}) };
    defense.models = ordered.reduce((sum, ch) => sum + (parseInt(ch?.defense?.models, 10) || 1), 0);
    defense.totalWounds = ordered.reduce((sum, ch) => {
      const models = parseInt(ch?.defense?.models, 10) || 1;
      const wounds = parseFloat(ch?.defense?.W);
      return sum + (Number.isFinite(wounds) ? wounds * models : 0);
    }, 0);

    return allocateUnitPointRemainder({
      label: resolvedLabel,
      weapons: ordered.reduce((all, ch) => mergeWeapons(all, ch.weapons || []), []),
      defense,
      abilities: [...new Set([...sourceUnits, ...ordered].flatMap(ch => ch.abilities || []))],
      _abilityDescriptions: mergeDescriptionMaps(
        ...sourceUnits.map(unit => unit._abilityDescriptions || {}),
        ...ordered.map(unit => unit._abilityDescriptions || {})
      ),
      source: [...new Set([...sourceUnits, ...ordered].map(unit => unit.source).filter(Boolean))].join(' + ') || 'Imported',
      _unitKey: key,
      _groupId: key,
      _children: ordered,
      _isAggregate: ordered.length > 1,
      _isCharacterUnit: ordered.every(ch => !!(ch._isCharacterModel || ch._isCharacterUnit)),
      _tags: [...new Set([...sourceUnits, ...ordered].flatMap(ch => ch._tags || []))],
      _keywords: [...new Set([...sourceUnits, ...ordered].flatMap(ch => ch._keywords || []))],
      _points: sumPointCosts(sourceUnits) ?? sumPointCosts(ordered),
      _enhancements: mergeMetadataEntries(
        sourceUnits.flatMap(unit => unit._enhancements || []),
        ordered.flatMap(unit => unit._enhancements || [])
      ),
      _upgrades: mergeMetadataEntries(
        sourceUnits.flatMap(unit => unit._upgrades || []),
        ordered.flatMap(unit => unit._upgrades || [])
      ),
    });
  }

  function applyManualMerges(units, merges){
    const byKey = new Map(units.map(unit => [unit._unitKey, unit]));
    (merges || []).forEach(merge => {
      const from = byKey.get(merge?.from);
      const to = byKey.get(merge?.to);
      if(!from || !to || from === to) return;
      const children = [
        ...(to._children && to._children.length ? to._children : [to]),
        ...(from._children && from._children.length ? from._children : [from]),
      ];
      byKey.set(to._unitKey, aggregateChildren(children, to._unitKey, to.label, [to, from]));
      byKey.delete(from._unitKey);
    });
    return [...byKey.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  function normalizedUnitName(value){
    return cleanName(value)
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\b\d+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function singularish(value){
    return normalizedUnitName(value)
      .replace(/\bterminators\b/g, 'terminator')
      .replace(/\bscouts\b/g, 'scout')
      .replace(/\bcrushers\b/g, 'crusher')
      .replace(/\bhavocs\b/g, 'havoc')
      .replace(/\bhounds\b/g, 'hound')
      .replace(/\bbearers\b/g, 'bearer')
      .replace(/\bs\b/g, '')
      .trim();
  }

  function isSquadCommandModelName(label){
    return /\b(champion|sergeant|pack leader|bloodhunter|plagueridden|gore hound|icon bearer|instrument|standard bearer|banner|vox|watchmaster|tempestor|exarch|aspiring champion)\b/i.test(label || '');
  }

  function isUniquelyNamedChild(child, unit, siblingCounts){
    const label = cleanName(child?.label);
    if(!label || isSquadCommandModelName(label)) return false;
    const normalized = normalizedUnitName(label);
    if((siblingCounts.get(normalized) || 0) !== 1) return false;
    const parent = singularish(unit?.label || '');
    const childName = singularish(label);
    if(parent && (childName === parent || childName.includes(parent) || parent.includes(childName))) return false;
    return true;
  }

  function uniqueUnitKey(base, existingKeys){
    let key = String(base || `unmerged-${Math.random().toString(36).slice(2)}`);
    if(!existingKeys.has(key)) return key;
    let i = 2;
    while(existingKeys.has(`${key}-unmerged-${i}`)) i++;
    return `${key}-unmerged-${i}`;
  }

  function splitUniquelyNamedChildren(units, targetKey){
    const sourceUnits = units || [];
    const index = sourceUnits.findIndex(unit => unit?._unitKey === targetKey);
    if(index < 0) return { units: sourceUnits, changed: false };
    const target = sourceUnits[index];
    const children = target?._children || [];
    if(children.length <= 1) return { units: sourceUnits, changed: false };

    const siblingCounts = new Map();
    children.forEach(child => {
      const key = normalizedUnitName(child?.label);
      siblingCounts.set(key, (siblingCounts.get(key) || 0) + 1);
    });

    const split = [];
    const kept = [];
    children.forEach(child => {
      if(isUniquelyNamedChild(child, target, siblingCounts)) split.push(child);
      else kept.push(child);
    });
    if(!split.length) return { units: sourceUnits, changed: false };

    const existingKeys = new Set(sourceUnits.map(unit => unit?._unitKey).filter(Boolean));
    existingKeys.delete(target._unitKey);

    const rebuilt = [...sourceUnits];
    const splitPoints = split.reduce((sum, child) => {
      const points = parseFloat(child?._points);
      return sum + (Number.isFinite(points) ? points : 0);
    }, 0);
    const originalPoints = parseFloat(target?._points);

    if(kept.length){
      const nextTarget = aggregateChildren(kept, target._unitKey, target.label, []);
      nextTarget._unitKey = target._unitKey;
      nextTarget._groupId = target._groupId || target._unitKey;
      if(Number.isFinite(originalPoints)){
        nextTarget._points = splitPoints > 0 ? Math.max(0, originalPoints - splitPoints) : originalPoints;
      }
      rebuilt[index] = nextTarget;
    }else{
      rebuilt.splice(index, 1);
    }

    split.forEach(child => {
      const restored = cloneUnit(child);
      restored._unitKey = uniqueUnitKey(restored._unitKey || restored._groupId || restored.label, existingKeys);
      restored._groupId = restored._groupId || restored._unitKey;
      existingKeys.add(restored._unitKey);
      rebuilt.push(restored);
    });

    return {
      units: rebuilt.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      changed: true,
    };
  }

  function getAllSelections(node){
    const out = [];
    (node?.selections || []).forEach(selection => {
      out.push(selection);
      out.push(...getAllSelections(selection));
    });
    return out;
  }

  function extractWeaponsFromNode(node){
    const profiles = node?.profiles || [];
    const count = Math.max(1, parseInt(node?.number ?? 1, 10) || 1);
    const list = [];

    profiles.forEach(profile => {
      const typeName = (profile.typeName || '').toLowerCase();
      if(!(typeName.includes('ranged weapons') || typeName.includes('melee weapons'))) return;

      const characteristics = profile.characteristics || [];
      const get = (name) => {
        const found = characteristics.find(x => String(x.name || '').toLowerCase() === String(name).toLowerCase());
        return found ? (found.$text || '') : '';
      };
      const attacks = averageDice(get('A') || get('Attacks') || '') * count;
      const modifiers = get('modifiers') || get('Keywords');

      list.push({
        name: cleanProfileName(profile.name),
        range: get('Range'),
        A: fmtNumber(attacks),
        skill: (get('BS') || get('WS') || '').replace('+','').replace(/^N\/A$/i, 'auto') || '',
        S: get('S'),
        AP: (get('AP') || '').replace('-',''),
        D: get('D'),
        modifiers: /^-+$/.test(String(modifiers).trim()) ? '' : modifiers,
        mode: typeName.includes('melee') ? 'melee' : 'ranged',
        _count: count,
        _profileCount: count,
      });
    });

    return list;
  }

  function parseInvFromText(text){
    const s = String(text || '');
    const match =
      s.match(/(\d)\+\s*invulnerable\s*save/i) ||
      s.match(/invulnerable\s*save\s*(?:of|is|:)?\s*(\d)\+/i) ||
      s.match(/\b(\d)\+\b(?=.*\binvulnerable\b)/i);
    return match ? `${match[1]}` : '';
  }

  function parseFnpFromText(text){
    const s = String(text || '');
    const match = s.match(/\b(?:Feel No Pain|FNP)\s*(\d)\+/i);
    return match ? parseFloat(match[1]) : null;
  }

  function parseGenericFnp(name, description=''){
    const desc = String(description || '');
    if(/\bagainst\b/i.test(desc)) return null;
    return parseFnpFromText(`${name || ''} ${desc}`);
  }

  function bestFnp(current, candidate){
    const c = parseFloat(current);
    const n = parseFloat(candidate);
    if(!Number.isFinite(n)) return current;
    if(!Number.isFinite(c) || c <= 0) return n;
    return Math.min(c, n);
  }

  function modelEntriesUnder(unitNode){
    return [unitNode, ...getAllSelections(unitNode)]
      .filter(node => node?.type === 'model' && Number.isFinite(parseInt(node?.number, 10)))
      .map(node => ({ node, name: node?.name || 'Model', count: Math.max(1, parseInt(node.number, 10) || 1) }));
  }

  function unitModelCount(unitNode){
    const models = modelEntriesUnder(unitNode);
    if(models.length) return models.reduce((sum, model) => sum + model.count, 0);
    const n = parseInt(unitNode?.number, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function extractDefense(selection, modelCount){
    const defense = { T:null, Sv:null, Inv:null, W:null, models:modelCount };
    const extract = (profiles) => {
      (profiles || []).forEach(profile => {
        const typeName = (profile.typeName || '').toLowerCase();
        const characteristics = profile.characteristics || [];
        const get = (name) => {
          const found = characteristics.find(x => (x.name || '').toLowerCase() === String(name).toLowerCase());
          return found ? (found.$text || '') : '';
        };

        if(/\b(unit|model)\b/.test(typeName)){
          if(defense.T == null){
            const toughness = parseFloat(get('T')) || parseFloat(get('Toughness'));
            if(!Number.isNaN(toughness)) defense.T = toughness;
          }
          if(!defense.Sv) defense.Sv = parseSave(get('SV') || get('Sv') || get('Save') || 0);
          if(!defense.Inv) defense.Inv = parseSave(get('Invulnerable Save') || get('Invuln') || get('InSv') || 0);
          if(defense.W == null){
            const wounds = parseFloat(get('W')) || parseFloat(get('Wounds'));
            if(!Number.isNaN(wounds)) defense.W = wounds;
          }
          return;
        }

        if(typeName === 'abilities'){
          const inv = parseInvFromText(get('Description')) || parseInvFromText(profile.name);
          if(inv) defense.Inv = inv;
          const fnp = parseGenericFnp(profile.name, get('Description'));
          if(fnp) defense.Fnp = bestFnp(defense.Fnp, fnp);
        }
      });
    };

    [selection, ...(selection?.selections || [])].forEach(node => extract(node.profiles));
    if(defense.T == null || !defense.Sv || defense.W == null || !defense.Inv){
      getAllSelections(selection).forEach(node => extract(node.profiles));
    }
    return defense;
  }

  function collectGenericUnits(force, opts = {}){
    const separateModels = !!opts.separateModels;
    const unitMap = new Map();
    const mergeUnit = (key, patch) => {
      const unitKey = `generic-${key}`;
      if(!unitMap.has(key)){
        unitMap.set(key, { ...patch, _unitKey: patch._unitKey || unitKey, _groupId: patch._groupId || unitKey });
        return;
      }
      const current = unitMap.get(key);
      current.weapons = [...(current.weapons || []), ...(patch.weapons || [])];
      current.defense = current.defense || { T:null, Sv:null, Inv:null, W:null, models:0 };
      const d = current.defense;
      const p = patch.defense || {};
      if(d.T == null && p.T != null) d.T = p.T;
      if(!d.Sv && p.Sv) d.Sv = p.Sv;
      if(!d.Inv && p.Inv) d.Inv = p.Inv;
      if(d.W == null && p.W != null) d.W = p.W;
      d.models = (parseInt(d.models || 0, 10) || 0) + (parseInt(p.models || 0, 10) || 0);
      current.label = current.label || patch.label;
      if(patch._points != null){
        current._points = (parseFloat(current._points) || 0) + patch._points;
      }
    };

    (force?.selections || []).forEach(root => {
      [root, ...getAllSelections(root)].forEach(selection => {
        const isUnitish = selection.type === 'unit' || selection.type === 'model';
        const hasUnitProfile = (selection.profiles || []).some(profile => /\bunit\b/i.test(profile.typeName || ''));
        if(!(isUnitish || hasUnitProfile)) return;

        const modelCount = selection.type === 'unit'
          ? (unitModelCount(selection) ?? 1)
          : Math.max(1, parseInt(selection.number || 1, 10) || 1);
        const label = selection.type === 'model' && !separateModels
          ? (selection.group || selection.name || 'Unit')
          : (selection.name || selection.group || 'Unit');
        const key = selection.type === 'model' && !separateModels
          ? (selection.entryGroupId || selection.group || selection.name || selection.entryId || label)
          : (selection.id || selection.entryId || selection.name || label);

        const weapons = [];
        [selection, ...(selection.selections || [])].forEach(node => weapons.push(...extractWeaponsFromNode(node)));
        if(weapons.length === 0) getAllSelections(selection).forEach(node => weapons.push(...extractWeaponsFromNode(node)));

        const defense = extractDefense(selection, modelCount);
        const selectionPoints = pointCostFromNode(selection) ?? sumPointCosts(getAllSelections(selection));
        if(separateModels){
          const models = modelEntriesUnder(selection);
          if(models.length){
            models.forEach((model, modelIndex) => {
              const modelWeapons = [];
              [model.node, ...(model.node.selections || []), ...getAllSelections(model.node)].forEach(node => modelWeapons.push(...extractWeaponsFromNode(node)));
              const modelDefense = { ...defense, models:model.count };
              const modelPoints = pointCostFromNode(model.node) ?? sumPointCosts(getAllSelections(model.node));
              unitMap.set(`${label}::${model.name}::${modelIndex}`, {
                label: `${label} - ${model.name}`,
                weapons: modelWeapons,
                defense: modelDefense,
                _points: modelPoints,
                _unitKey: `generic-${key}-model-${modelIndex}`,
                _groupId: `generic-${key}`,
              });
            });
            return;
          }
        }

        if(weapons.length > 0 || defense.T != null || defense.Sv || defense.W != null || defense.Inv){
          mergeUnit(key, { label, weapons, defense, _points: selectionPoints });
        }
      });
    });

    return [...unitMap.values()].map(unit => {
      unit.defense = unit.defense || { T:null, Sv:null, Inv:null, W:null, models:1 };
      if(!Number.isFinite(parseInt(unit.defense.models, 10))) unit.defense.models = 1;
      return allocateUnitPointRemainder(unit);
    });
  }

  function cleanProfileName(value){
    return cleanName(value).replace(/^\s*[\u2794\u27a4>]+\s*/, '').trim();
  }

  function categoryNames(node){
    return (node?.categories || []).map(cat => String(cat?.name || '')).filter(Boolean);
  }

  function keywordNamesFromCategories(node){
    return categoryNames(node)
      .map(name => cleanName(name).replace(/^Faction:\s*/i, '').trim())
      .filter(Boolean);
  }

  function hasCharacterCategory(node){
    return categoryNames(node).some(name => /\b(character|epic hero)\b/i.test(name));
  }

  function costValue(node, namePattern){
    return (node?.costs || [])
      .filter(cost => namePattern.test(String(cost?.name || cost?.typeId || '')))
      .map(cost => parsePointsValue(cost?.value ?? cost?.$text))
      .filter(value => value != null)
      .reduce((sum, value) => sum + value, 0);
  }

  function totalPointsForTree(node){
    return [node, ...getAllSelections(node)].reduce((sum, item) => sum + costValue(item, /^pts?$/i), 0);
  }

  function profileCharacteristic(profile, names){
    const wanted = new Set((Array.isArray(names) ? names : [names]).map(name => String(name).toLowerCase()));
    const found = (profile?.characteristics || []).find(ch => wanted.has(String(ch?.name || '').toLowerCase()));
    return found ? (found.$text || '') : '';
  }

  function profileCharacteristicsText(profile){
    return (profile?.characteristics || [])
      .map(ch => `${ch?.name || ''}: ${ch?.$text || ''}`.trim())
      .filter(Boolean)
      .join(' | ');
  }

  function applyDefenseRulesFromNodes(defense, nodes){
    (nodes || []).forEach(node => {
      (node?.rules || []).forEach(rule => {
        const fnp = parseGenericFnp(rule?.name, rule?.description || rule?.$text || '');
        if(fnp) defense.Fnp = bestFnp(defense.Fnp, fnp);
      });
      (node?.profiles || []).forEach(profile => {
        if(!/abilities|shadow form/i.test(profile?.typeName || '')) return;
        const fnp = parseGenericFnp(profile?.name, profileCharacteristic(profile, ['Description', 'Effect']) || profileCharacteristicsText(profile));
        if(fnp) defense.Fnp = bestFnp(defense.Fnp, fnp);
      });
    });
    return defense;
  }

  function unitDefenseRuleNodes(node){
    return [node, ...getAllSelections(node).filter(item => item?.type !== 'model')];
  }

  function unitProfileFromNode(node){
    return (node?.profiles || []).find(profile => /\bunit\b/i.test(profile?.typeName || '')) || null;
  }

  function defenseFromProfile(profile, modelCount){
    const defense = {
      T: null,
      Sv: null,
      Inv: null,
      W: null,
      Fnp: null,
      models: modelCount,
    };
    if(!profile) return defense;
    const toughness = parseFloat(profileCharacteristic(profile, ['T', 'Toughness']));
    const save = parseSave(profileCharacteristic(profile, ['Sv', 'SV', 'Save']));
    const inv = parseSave(profileCharacteristic(profile, ['InSv', 'Invulnerable Save', 'Invuln']));
    const wounds = parseFloat(profileCharacteristic(profile, ['W', 'Wounds']));
    if(Number.isFinite(toughness)) defense.T = toughness;
    if(save != null) defense.Sv = save;
    if(inv != null) defense.Inv = inv;
    if(Number.isFinite(wounds)) defense.W = wounds;
    return defense;
  }

  function cloneDefenseForModel(parentDefense, modelProfile, count){
    const modelDefense = defenseFromProfile(modelProfile, count);
    ['T', 'Sv', 'Inv', 'W', 'Fnp'].forEach(key => {
      if(modelDefense[key] == null && parentDefense?.[key] != null) modelDefense[key] = parentDefense[key];
    });
    modelDefense.models = count;
    if(Number.isFinite(parseFloat(modelDefense.W)) && count > 0){
      modelDefense.totalWounds = parseFloat(modelDefense.W) * count;
    }
    return modelDefense;
  }

  function abilityNamesFromProfiles(profiles){
    return (profiles || [])
      .filter(profile => /abilities|shadow form/i.test(profile?.typeName || ''))
      .map(profile => cleanProfileName(profile?.name))
      .filter(Boolean);
  }

  function abilityDescriptionEntriesFromProfiles(profiles){
    return (profiles || [])
      .filter(profile => /abilities|shadow form/i.test(profile?.typeName || ''))
      .map(profile => {
        const name = cleanProfileName(profile?.name);
        const description = cleanText(profileCharacteristic(profile, ['Description', 'Effect']) || profileCharacteristicsText(profile));
        return name && description ? [name, description] : null;
      })
      .filter(Boolean);
  }

  function ruleNamesFromNode(node){
    return (node?.rules || [])
      .map(rule => cleanProfileName(rule?.name))
      .filter(name => name && (window.AbilityModifierService?.modifiersForRule(name).length));
  }

  function ruleDescriptionEntriesFromNode(node){
    return (node?.rules || [])
      .map(rule => {
        const name = cleanProfileName(rule?.name);
        const description = cleanText(rule?.description || rule?.$text || '');
        return name && description ? [name, description] : null;
      })
      .filter(Boolean);
  }

  function abilityNamesFromTree(node){
    return normalizeAbilityNames([node, ...getAllSelections(node)].flatMap(item => [
      ...ruleNamesFromNode(item),
      ...abilityNamesFromProfiles(item?.profiles || []),
    ]));
  }

  function abilityDescriptionsFromTree(node){
    return mergeDescriptionMaps(...[node, ...getAllSelections(node)].map(item => Object.fromEntries([
      ...ruleDescriptionEntriesFromNode(item),
      ...abilityDescriptionEntriesFromProfiles(item?.profiles || []),
    ])));
  }

  function normalizeAbilityNames(names){
    const cleaned = [...new Set((names || []).map(name => cleanProfileName(name)).filter(Boolean))];
    const hasDisciples = cleaned.some(name => /^Disciples of Be['’]lakor$/i.test(name));
    return hasDisciples
      ? cleaned.filter(name => !/^Dark Pacts$/i.test(name))
      : cleaned;
  }

  function modifiersFromWeaponNode(node, profile){
    const keywords = profileCharacteristic(profile, ['Keywords', 'modifiers']);
    const mods = /^-+$/.test(String(keywords).trim()) ? [] : splitModifiers(keywords);
    if(categoryNames(node).some(name => /extra attacks weapon/i.test(name)) && !mods.some(mod => /extra attacks/i.test(mod))){
      mods.push('Extra Attacks');
    }
    return serializeModifiers(mods);
  }

  function weaponProfilesFromNode(node, keyPrefix, countTransform=null){
    const rawCount = Math.max(1, parseInt(node?.number ?? 1, 10) || 1);
    const transformedCount = typeof countTransform === 'function' ? countTransform(rawCount, node) : rawCount;
    const count = Math.max(1, parseInt(transformedCount, 10) || 1);
    return (node?.profiles || [])
      .filter(profile => /ranged weapons|melee weapons/i.test(profile?.typeName || ''))
      .map((profile, profileIndex) => {
        const typeName = String(profile?.typeName || '');
        const attacks = averageDice(profileCharacteristic(profile, ['A', 'Attacks'])) * count;
        return {
          name: cleanProfileName(profile?.name),
          range: profileCharacteristic(profile, 'Range'),
          A: fmtNumber(attacks),
          skill: (profileCharacteristic(profile, ['BS', 'WS']) || '').replace('+','').replace(/^N\/A$/i, 'auto'),
          S: profileCharacteristic(profile, 'S'),
          AP: String(profileCharacteristic(profile, 'AP') || '').replace('-', ''),
          D: profileCharacteristic(profile, 'D'),
          modifiers: modifiersFromWeaponNode(node, profile),
          mode: /melee weapons/i.test(typeName) ? 'melee' : 'ranged',
          _count: count,
          _profileCount: count,
          _weaponKey: `${keyPrefix}|${node?.id || node?.entryId || node?.name || 'weapon'}|${profileIndex}`,
        };
      });
  }

  function weaponProfilesFromTree(node, keyPrefix, countTransform=null){
    return [node, ...getAllSelections(node)].flatMap((item, index) => weaponProfilesFromNode(item, `${keyPrefix}|${index}`, countTransform));
  }

  function perModelWeaponCount(rawCount, modelCount){
    const count = Math.max(1, parseInt(modelCount, 10) || 1);
    if(rawCount <= 1) return 1;
    return Math.max(1, Math.round(rawCount / count));
  }

  function enhancementEntries(node){
    return getAllSelections(node)
      .filter(item => costValue(item, /enhancements?/i) > 0 || (costValue(item, /^pts?$/i) > 0 && abilityNamesFromProfiles(item?.profiles || []).length))
      .map(item => {
        const points = costValue(item, /^pts?$/i);
        const abilityProfile = (item?.profiles || []).find(profile => /abilities/i.test(profile?.typeName || ''));
        return {
          name: cleanProfileName(abilityProfile?.name || item?.name || 'Enhancement'),
          points: points || null,
          description: profileCharacteristic(abilityProfile, ['Description', 'Effect']) || '',
        };
      });
  }

  function modelSelectionsForUnit(selection){
    return (selection?.selections || []).filter(child => child?.type === 'model');
  }

  function modelCountForSelection(selection){
    const models = modelSelectionsForUnit(selection);
    if(models.length) return models.reduce((sum, model) => sum + (Math.max(1, parseInt(model?.number ?? 1, 10) || 1)), 0);
    return Math.max(1, parseInt(selection?.number ?? 1, 10) || 1);
  }

  function parseNewRecruitUnit(selection, index){
    const categories = categoryNames(selection);
    if(categories.some(name => /^configuration$/i.test(name))) return null;
    if(!['unit', 'model'].includes(selection?.type)) return null;
    const selectionIsCharacter = hasCharacterCategory(selection);
    const selectionKeywords = keywordNamesFromCategories(selection);

    const parentModelCount = modelCountForSelection(selection);
    const parentDefense = defenseFromProfile(unitProfileFromNode(selection), parentModelCount);
    applyDefenseRulesFromNodes(parentDefense, unitDefenseRuleNodes(selection));

    const modelSelections = modelSelectionsForUnit(selection);
    const children = modelSelections.flatMap((model, modelIndex) => {
      const count = Math.max(1, parseInt(model?.number ?? 1, 10) || 1);
      const baseLabel = cleanName(model?.name) || `Model ${modelIndex + 1}`;
      const modelIsCharacter = selectionIsCharacter || hasCharacterCategory(model);
      const modelKeywords = [...new Set([...selectionKeywords, ...keywordNamesFromCategories(model)])];
      const modelAbilityDescriptions = abilityDescriptionsFromTree(model);
      return Array.from({ length: count }, (_, instanceIndex) => {
        const modelDefense = cloneDefenseForModel(parentDefense, unitProfileFromNode(model), 1);
        applyDefenseRulesFromNodes(modelDefense, [model, ...getAllSelections(model)]);
        return {
          label: count > 1 ? `${baseLabel} ${instanceIndex + 1}` : baseLabel,
          weapons: weaponProfilesFromTree(
            model,
            `nr-${selection?.id || index}|model-${modelIndex}-${instanceIndex}`,
            rawCount => perModelWeaponCount(rawCount, count)
          ),
          defense: modelDefense,
          abilities: abilityNamesFromTree(model),
          _abilityDescriptions: modelAbilityDescriptions,
          source: 'NewRecruit/BattleScribe',
          _unitKey: `nr-${selection?.id || index}-model-${model?.id || model?.entryId || modelIndex}-${instanceIndex}`,
          _groupId: selection?.id || selection?.entryId || String(index),
          _modelGroupKey: `nr-${selection?.id || index}-model-${model?.id || model?.entryId || modelIndex}`,
          _modelGroupCount: count,
          _isLeaderModel: (count === 1 || instanceIndex === 0) && (modelIndex === 0 || /champion|bloodhunter|plagueridden|gore hound/i.test(model?.name || '')),
          _isCharacterModel: modelIsCharacter,
          _keywords: modelKeywords,
          _points: null,
        };
      });
    });

    if((parentDefense.T == null || parentDefense.Sv == null || parentDefense.W == null) && children.length){
      const primary = children.find(child => child.defense?.T != null && child.defense?.W != null) || children[0];
      ['T', 'Sv', 'Inv', 'W'].forEach(key => {
        if(parentDefense[key] == null && primary?.defense?.[key] != null) parentDefense[key] = primary.defense[key];
      });
    }
    if(Number.isFinite(parseFloat(parentDefense.W)) && parentModelCount > 0){
      parentDefense.totalWounds = parseFloat(parentDefense.W) * parentModelCount;
    }

    const directWeapons = modelSelections.length
      ? (selection?.selections || [])
          .filter(child => child?.type !== 'model')
          .flatMap((child, childIndex) => weaponProfilesFromTree(child, `nr-${selection?.id || index}|direct-${childIndex}`))
      : weaponProfilesFromTree(selection, `nr-${selection?.id || index}`);
    const enhancementList = enhancementEntries(selection);
    const abilityDescriptions = mergeDescriptionMaps(
      abilityDescriptionsFromTree(selection),
      Object.fromEntries(enhancementList.map(enh => [enh.name, enh.description]).filter(entry => entry[0] && entry[1]))
    );
    const abilities = normalizeAbilityNames([
      ...ruleNamesFromNode(selection),
      ...abilityNamesFromProfiles(selection?.profiles || []),
      ...enhancementList.map(enh => enh.points ? `${enh.name} (${fmtNumber(enh.points)} pts)` : enh.name),
      ...((selection?.selections || [])
        .filter(child => child?.type !== 'model')
        .flatMap(child => abilityNamesFromTree(child))),
    ]);
    const points = totalPointsForTree(selection);
    const key = `nr-${selection?.id || selection?.entryId || `${selection?.name || 'unit'}-${index}`}`;

    return allocateUnitPointRemainder({
      label: cleanName(selection?.name) || 'Imported unit',
      weapons: children.length
        ? children.reduce((all, child) => mergeWeapons(all, child.weapons || []), directWeapons)
        : directWeapons,
      defense: parentDefense,
      abilities,
      _abilityDescriptions: abilityDescriptions,
      source: 'NewRecruit/BattleScribe',
      _unitKey: key,
      _groupId: key,
      _children: children,
      _isAggregate: children.length > 0,
      _isCharacterUnit: selectionIsCharacter,
      _keywords: selectionKeywords,
      _points: points || null,
      _enhancements: enhancementList,
    });
  }

  function looksLikeNewRecruitRoster(obj){
    const roster = obj?.roster || obj;
    if(!roster || !Array.isArray(roster.forces)) return false;
    const generatorText = `${roster.generatedBy || ''} ${roster.battleScribeVersion || ''}`;
    if(/newrecruit|battlescribe/i.test(generatorText)) return true;
    if(roster.battleScribeVersion != null) return true;
    return (roster.forces || []).some(force => (force?.selections || []).some(selection => (
      ['unit', 'model'].includes(selection?.type)
      && Array.isArray(selection?.profiles)
      && selection.profiles.some(profile => /\bunit\b/i.test(profile?.typeName || ''))
    )));
  }

  function parseNewRecruitRoster(obj, label){
    const roster = obj?.roster || obj;
    return {
      roster: {
        ...roster,
        name: roster?.name || label || 'NewRecruit import',
        forces: (roster?.forces || []).map((force, forceIndex) => {
          const units = (force?.selections || [])
            .map((selection, selectionIndex) => parseNewRecruitUnit(selection, selectionIndex))
            .filter(Boolean);
          return {
            ...force,
            name: force?.name || `Force ${forceIndex + 1}`,
            _importedUnits: units,
            _unitMerges: [],
          };
        }),
      },
      _sourceFormat: 'newrecruit-roster',
    };
  }

  function parseTtsSave(obj, label){
    const groups = new Map();
    (obj.ObjectStates || []).forEach((state, index) => {
      const parsed = parseTtsUnitObject(state, index);
      if(!parsed) return;
      const groupKey = parsed._groupId || parsed.label.toLowerCase();
      if(!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(parsed);
    });

    const units = [...groups.entries()]
      .map(([key, children]) => aggregateChildren(children, `tts-group-${key}`))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    return {
      roster: {
        name: obj.SaveName || label || 'Tabletop Simulator import',
        forces: [{
          name: 'Imported force',
          _importedUnits: units,
          _unitMerges: [],
        }],
      },
      _sourceFormat: 'tts-save',
    };
  }

  function unitLookupKeys(unit){
    return [
      unit?._unitKey,
      unit?.key,
      unit?._viewKey,
      unit?.viewKey,
      cleanName(unit?.label || '').toLowerCase(),
    ].map(key => String(key || '').trim()).filter(Boolean);
  }

  function flattenUnitTree(units){
    return (units || []).flatMap(unit => [unit, ...flattenUnitTree(unit?._children || [])]);
  }

  function sourceDefenseRepairMap(sourceRoster){
    if(!sourceRoster || !looksLikeNewRecruitRoster(sourceRoster)) return new Map();
    const parsed = parseNewRecruitRoster(sourceRoster, sourceRoster?.roster?.name || sourceRoster?.name || 'Source roster');
    const repairs = new Map();
    (parsed?.roster?.forces || []).forEach(force => {
      flattenUnitTree(force?._importedUnits || []).forEach(unit => {
        if(unit?.defense?.Fnp == null || unit.defense.Fnp === '') return;
        unitLookupKeys(unit).forEach(key => {
          if(!repairs.has(key)) repairs.set(key, { Fnp: unit.defense.Fnp });
        });
      });
    });
    return repairs;
  }

  function applySourceDefenseRepair(unit, repairs){
    if(!unit || !repairs?.size) return unit;
    const repair = unitLookupKeys(unit).map(key => repairs.get(key)).find(Boolean);
    if(repair?.Fnp != null && repair.Fnp !== '' && (unit.defense?.Fnp == null || unit.defense.Fnp === '')){
      unit.defense = { ...(unit.defense || {}), Fnp: repair.Fnp };
    }
    return unit;
  }

  function parseMatchupImportUnit(unit, repairs=new Map()){
    const parsed = allocateUnitPointRemainder({
      label: cleanName(unit?.label) || 'Imported unit',
      weapons: (unit?.weapons || []).map(weapon => ({
        name: weapon.name || '',
        range: weapon.range || '',
        A: weapon.A || '',
        skill: weapon.skill || '',
        S: weapon.S || '',
        AP: weapon.AP || '',
        D: weapon.D || '',
        modifiers: weapon.modifiers || '',
        mode: weapon.mode || '',
        _profileCount: Math.max(1, parseInt(weapon.count ?? weapon._profileCount ?? 1, 10) || 1),
        _count: Math.max(1, parseInt(weapon.count ?? weapon._count ?? 1, 10) || 1),
      })),
      defense: { ...(unit?.defense || {}) },
      abilities: normalizeAbilityNames(unit?.abilities || []),
      _abilityDescriptions: { ...(unit?.abilityDescriptions || unit?._abilityDescriptions || {}) },
      _children: (unit?.children || unit?._children || []).map(child => parseMatchupImportUnit(child, repairs)),
      _tags: [...(unit?._tags || [])],
      _keywords: [...(unit?.keywords || unit?._keywords || [])],
      _points: unit?.points ?? unit?._points ?? null,
      _enhancements: (unit?.enhancements || unit?._enhancements || []).map(enh => ({ ...enh })),
      _upgrades: (unit?.upgrades || unit?._upgrades || []).map(upgrade => ({ ...upgrade })),
      _unitKey: String(unit?.key || unit?._unitKey || unit?.viewKey || unit?.label || Math.random()),
      _groupId: String(unit?._groupId || unit?.key || unit?._unitKey || unit?.label || Math.random()),
      _isAggregate: (unit?.children || unit?._children || []).length > 0,
      _isCharacterUnit: !!(unit?._isCharacterUnit || unit?.isCharacterUnit || unit?.isCharacter),
      _isCharacterModel: !!(unit?._isCharacterModel || unit?.isCharacterModel || unit?.isCharacter),
      _isLeaderModel: !!unit?._isLeaderModel,
      source: unit?.source || 'Matchup roster import',
    });
    return applySourceDefenseRepair(parsed, repairs);
  }

  function parseMatchupRosterImport(obj, label){
    const repairs = sourceDefenseRepairMap(obj?.sourceRoster);
    const units = (obj?.postMergeUnits || obj?.gridUnits || [])
      .map(unit => parseMatchupImportUnit(unit, repairs))
      .filter(Boolean);
    return {
      roster: {
        name: obj?.rosterLabel || label || 'Roster import',
        forces: [{
          name: obj?.forceName || 'Imported force',
          _importedUnits: units,
          _unitMerges: [],
          _sourceRoster: obj?.sourceRoster || null,
          _exportedManualMerges: [...(obj?.manualMerges || [])],
          _matchupImportOptions: { ...(obj?.options || {}) },
        }],
      },
      _sourceFormat: 'matchup-roster-import',
    };
  }

  function normalizeRosterData(obj, label){
    if(obj?.schema === '40k-roster-matchup-import') return parseMatchupRosterImport(obj, label);
    if(obj && Array.isArray(obj.ObjectStates)) return parseTtsSave(obj, label);
    if(looksLikeNewRecruitRoster(obj)) return parseNewRecruitRoster(obj, label);
    return obj;
  }

  function cloneUnit(unit){
    return {
      ...unit,
      defense: { ...(unit.defense || {}) },
      weapons: (unit.weapons || []).map(w => ({
        ...w,
        _modifierToggles: { ...(w._modifierToggles || Object.fromEntries(splitModifiers(w.modifiers).map(mod => [mod, true]))) },
      })),
      abilities: [...(unit.abilities || [])],
      _abilityDescriptions: { ...(unit._abilityDescriptions || {}) },
      _children: (unit._children || []).map(cloneUnit),
      _tags: [...(unit._tags || [])],
      _keywords: [...(unit._keywords || [])],
      _points: unit._points ?? null,
      _enhancements: (unit._enhancements || []).map(enh => ({ ...enh })),
      _upgrades: (unit._upgrades || []).map(upgrade => ({ ...upgrade })),
      _isCharacterUnit: !!unit._isCharacterUnit,
      _isCharacterModel: !!unit._isCharacterModel,
      _isLeaderModel: !!unit._isLeaderModel,
    };
  }

  function uniqueDuplicateLabel(label, existingLabels){
    const base = `${cleanName(label) || 'Unit'} Copy`;
    if(!existingLabels.has(base)) return base;
    let index = 2;
    while(existingLabels.has(`${base} ${index}`)) index++;
    return `${base} ${index}`;
  }

  function rewriteDuplicatedUnitIdentity(unit, existingKeys, parentGroup=null){
    const baseKey = unit?._unitKey || unit?._groupId || unit?.label || 'unit';
    unit._unitKey = uniqueUnitKey(`${baseKey}-copy`, existingKeys);
    existingKeys.add(unit._unitKey);
    unit._groupId = parentGroup || unit._unitKey;
    delete unit._baseUnit;
    delete unit._parentUnit;
    delete unit._viewKey;
    (unit._children || []).forEach(child => rewriteDuplicatedUnitIdentity(child, existingKeys, unit._unitKey));
    return unit;
  }

  function collectUnitIdentityKeys(unit, keys=new Set()){
    if(!unit) return keys;
    if(unit._unitKey) keys.add(unit._unitKey);
    if(unit._groupId) keys.add(unit._groupId);
    (unit._children || []).forEach(child => collectUnitIdentityKeys(child, keys));
    return keys;
  }

  function findUnitByIdentity(units, unitKey, groupId=''){
    for(const unit of units || []){
      const key = String(unit?._unitKey || '');
      const group = String(unit?._groupId || '');
      if(unitKey ? key === unitKey : (groupId && group === groupId)) return unit;
      const child = findUnitByIdentity(unit?._children || [], unitKey, groupId);
      if(child) return child;
    }
    return null;
  }

  function renameSelectionByIdentity(selections, unitKey, groupId, newLabel){
    const genericKey = unitKey.replace(/^generic-/, '');
    for(const selection of selections || []){
      const selectionKey = String(selection?.id || selection?.entryId || selection?.name || '');
      const selectionGroup = String(selection?.entryGroupId || selection?.group || selection?.name || '');
      if(unitKey
        ? (selectionKey === genericKey || selectionKey === unitKey)
        : (selectionKey === groupId || (groupId && selectionGroup === groupId))
      ){
        selection.name = newLabel;
        return true;
      }
      if(renameSelectionByIdentity(selection?.selections || [], unitKey, groupId, newLabel)) return true;
    }
    return false;
  }

  function clonePlainSelection(selection){
    return JSON.parse(JSON.stringify(selection));
  }

  function rewriteSelectionIdentity(selection, suffix){
    if(!selection || typeof selection !== 'object') return;
    if(selection.id != null) selection.id = `${selection.id}${suffix}`;
    if(selection.entryId != null) selection.entryId = `${selection.entryId}${suffix}`;
    if(Array.isArray(selection.selections)) selection.selections.forEach(child => rewriteSelectionIdentity(child, suffix));
  }

  window.ArmyImportService = {
    normalizeRosterData,
    collectImportedUnits(force){
      if(!Array.isArray(force && force._importedUnits)) return null;
      return applyManualMerges(force._importedUnits.map(cloneUnit), force._unitMerges || [])
        .map(unit => allocateUnitPointRemainder(unit));
    },
    collectUnits(force, opts){
      const imported = this.collectImportedUnits(force);
      return imported || collectGenericUnits(force, opts);
    },
    duplicateUnit(force, unit){
      if(!force || !unit) return null;
      const unitKey = String(unit?._baseUnit?._unitKey || unit?._unitKey || '');
      const groupId = String(unit?._baseUnit?._groupId || unit?._groupId || '');

      if(Array.isArray(force._importedUnits)){
        const storedSource = force._importedUnits.find(candidate => {
          const candidateKey = String(candidate?._unitKey || '');
          const candidateGroup = String(candidate?._groupId || '');
          return candidateKey === unitKey || (groupId && candidateGroup === groupId);
        });
        const source = unit?._isAggregate && Array.isArray(unit?._children) && unit._children.length ? unit : storedSource;
        if(source){
          const existingKeys = force._importedUnits.reduce((keys, candidate) => collectUnitIdentityKeys(candidate, keys), new Set());
          const existingLabels = new Set(force._importedUnits.map(candidate => cleanName(candidate?.label)).filter(Boolean));
          const copy = rewriteDuplicatedUnitIdentity(cloneUnit(source), existingKeys);
          copy.label = uniqueDuplicateLabel(source.label, existingLabels);
          force._importedUnits.push(copy);
          return copy;
        }
      }

      if(Array.isArray(force.selections)){
        const genericKey = unitKey.replace(/^generic-/, '');
        const source = force.selections.find(selection => {
          const selectionKey = String(selection?.id || selection?.entryId || selection?.name || '');
          return selectionKey === genericKey || selectionKey === unitKey || selectionKey === groupId;
        });
        if(source){
          const copy = clonePlainSelection(source);
          const existingNames = new Set(force.selections.map(selection => cleanName(selection?.name)).filter(Boolean));
          copy.name = uniqueDuplicateLabel(source.name, existingNames);
          rewriteSelectionIdentity(copy, `-copy-${Date.now().toString(36)}`);
          force.selections.push(copy);
          return { key: `generic-${copy.id || copy.entryId || copy.name}` };
        }
      }

      return null;
    },
    removeUnit(force, unit){
      if(!force || !unit) return false;
      const unitKey = String(unit?._baseUnit?._unitKey || unit?._unitKey || '');
      const groupId = String(unit?._baseUnit?._groupId || unit?._groupId || '');
      let changed = false;

      if(Array.isArray(force._importedUnits)){
        const before = force._importedUnits.length;
        force._importedUnits = force._importedUnits.filter(candidate => {
          const candidateKey = String(candidate?._unitKey || '');
          const candidateGroup = String(candidate?._groupId || '');
          return candidateKey !== unitKey && candidateGroup !== groupId;
        });
        changed = force._importedUnits.length !== before;
      }

      if(Array.isArray(force._unitMerges)){
        force._unitMerges = force._unitMerges.filter(merge => merge?.from !== unitKey && merge?.to !== unitKey);
      }

      if(!changed && Array.isArray(force.selections)){
        const genericKey = unitKey.replace(/^generic-/, '');
        const before = force.selections.length;
        force.selections = force.selections.filter(selection => {
          const selectionKey = String(selection?.id || selection?.entryId || selection?.name || '');
          return selectionKey !== genericKey && selectionKey !== unitKey && selectionKey !== groupId;
        });
        changed = force.selections.length !== before;
      }

      return changed;
    },
    renameUnit(force, unit, newLabel){
      const label = cleanName(newLabel);
      if(!force || !unit || !label) return false;
      const unitKey = String(unit?._baseUnit?._unitKey || unit?._unitKey || '');
      const groupId = String(unit?._baseUnit?._groupId || unit?._groupId || '');
      let changed = false;

      if(Array.isArray(force._importedUnits)){
        const target = findUnitByIdentity(force._importedUnits, unitKey, groupId);
        if(target){
          target.label = label;
          changed = true;
        }
      }

      if(Array.isArray(force.selections) && renameSelectionByIdentity(force.selections, unitKey, groupId, label)){
        changed = true;
      }

      return changed;
    },
    getAllSelections,
    extractWeaponsFromNode,
    mergeUnits(force, fromKey, toKey){
      if(!force || !fromKey || !toKey || fromKey === toKey) return false;
      if(!Array.isArray(force._unitMerges)) force._unitMerges = [];
      const exists = force._unitMerges.some(m => m.from === fromKey && m.to === toKey);
      if(!exists) force._unitMerges.push({ from: fromKey, to: toKey });
      return true;
    },
    unmergeUnit(force, targetKey){
      if(!force || !targetKey) return false;
      let changed = false;
      if(Array.isArray(force._unitMerges)){
        const before = force._unitMerges.length;
        force._unitMerges = force._unitMerges.filter(merge => merge?.to !== targetKey);
        changed = force._unitMerges.length !== before;
      }
      if(Array.isArray(force._importedUnits)){
        const split = splitUniquelyNamedChildren(force._importedUnits, targetKey);
        if(split.changed){
          force._importedUnits = split.units;
          changed = true;
        }
      }
      return changed;
    },
    clearMerges(force){
      if(!force || !Array.isArray(force._unitMerges)) return;
      force._unitMerges = [];
    },
    splitModifiers,
    serializeModifiers,
  };
})();
