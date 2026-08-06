(function(){
  const emptyCell = () => ({ dmg:0, kills:0, pctModelWounds:null, pctUnitKilled:null, weaponName:'', profilesUsed:[] });
  const keywordParseCache = new Map();
  const weaponCalcKeyCache = new WeakMap();
  const modifierTokenCache = new Map();
  const darkPactTokenCache = new Map();
  const darkPactTextCache = new Map();
  const unitPhaseChoiceCache = new WeakMap();
  const exactSequenceCache = new Map();
  const binomialCache = new Map();

  function parsedWeaponKeywords(modifierText='', weapon=null){
    const key = [
      modifierText || '',
      weapon?.range ?? weapon?.R ?? weapon?.Range ?? '',
      weapon?.mode ?? weapon?.type ?? '',
    ].join('|');
    if(keywordParseCache.has(key)) return keywordParseCache.get(key);
    const parsed = window.WeaponCalc.parseWeaponKeywords(modifierText || '', weapon);
    keywordParseCache.set(key, parsed);
    return parsed;
  }

  function isMeleeWeapon(w){
    const r = (w?.range ?? w?.R ?? w?.Range ?? '').toString().trim().toLowerCase();
    if(r === 'melee' || r === '-') return true;
    const n = parseFloat(r);
    if(Number.isFinite(n)) return false;
    const t = (w?.type || w?.mode || '').toString().toLowerCase();
    return t.includes('melee');
  }

  function weaponMatchesAttackMode(w, attackMode){
    if(!attackMode || attackMode === 'all') return true;
    const melee = isMeleeWeapon(w);
    if(attackMode === 'melee') return melee;
    if(attackMode === 'shooting') return !melee;
    return true;
  }

  function metricValue(cell, metric='damage'){
    if(metric === 'modelWounds') return Number(cell?.pctModelWounds);
    if(metric === 'unitKill') return Number(cell?.pctUnitKilled);
    return Number(cell?.dmg);
  }

  function metricRange(rows, metric='damage'){
    const values = [];
    (rows || []).forEach(row => {
      (row.cells || []).forEach(cell => {
        const value = metricValue(cell, metric);
        if(Number.isFinite(value)) values.push(value);
      });
    });
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min:0, max:0 };
  }

  function colorHueForValue(value, range){
    if(!Number.isFinite(value)) return '';
    const span = range.max - range.min;
    const raw = span > 1e-9 ? (value - range.min) / span : 0.5;
    const t = Math.max(0, Math.min(1, raw));
    return t <= 0.5
      ? 0 + (60 * (t / 0.5))
      : 60 + (120 - 60) * ((t - 0.5) / 0.5);
  }

  function hslToHex(h, s, l){
    h = ((Number(h) % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, Number(s))) / 100;
    l = Math.max(0, Math.min(100, Number(l))) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if(h < 60){ r = c; g = x; }
    else if(h < 120){ r = x; g = c; }
    else if(h < 180){ g = c; b = x; }
    else if(h < 240){ g = x; b = c; }
    else if(h < 300){ r = x; b = c; }
    else { r = c; b = x; }
    const toHex = channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function colorHexForValue(value, range){
    const hue = colorHueForValue(value, range);
    return hue === '' ? '' : hslToHex(hue, 85, 43);
  }

  function colorForValue(value, range){
    const hue = colorHueForValue(value, range);
    if(hue === '') return '';
    return `background:hsl(${hue}, 85%, 43%); color:#071016;`;
  }

  function weaponProfileCount(w){
    return Math.max(1, parseInt(w?._profileCount ?? w?._count ?? 1, 10) || 1);
  }

  function weaponProfileLabel(w){
    const name = String(w?.name || 'Weapon').trim() || 'Weapon';
    return `${weaponProfileCount(w)}x ${name}`;
  }

  function weaponProfileEntry(w){
    const name = String(w?.name || 'Weapon').trim() || 'Weapon';
    return { name, count: weaponProfileCount(w) };
  }

  function multipliedWeaponProfile(weapon, count){
    const profileCount = Math.max(1, parseInt(count, 10) || 1);
    if(profileCount <= 1) return { ...weapon };
    const attacks = window.WeaponCalc.multiplyDiceText
      ? window.WeaponCalc.multiplyDiceText(weapon?.A, profileCount)
      : String(window.WeaponCalc.parseNdX(weapon?.A).mean * profileCount);
    return {
      ...weapon,
      A: attacks,
      _profileCount: weaponProfileCount(weapon) * profileCount,
    };
  }

  function aggregateProfiles(items){
    const order = [];
    const totals = new Map();
    (items || []).forEach(item => {
      const name = String(item?.name || '').trim();
      if(!name) return;
      const count = Math.max(1, parseInt(item?.count ?? 1, 10) || 1);
      const key = name.toLowerCase();
      if(!totals.has(key)){
        totals.set(key, { name, count: 0 });
        order.push(key);
      }
      totals.get(key).count += count;
    });
    return order.map(key => totals.get(key));
  }

  function formatProfiles(items){
    return aggregateProfiles(items).map(item => `${item.count}x ${item.name}`).join(', ');
  }

  function fmtNumber(value){
    const n = Number(value);
    if(!Number.isFinite(n)) return String(value ?? '');
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  }

  function changedProfileStats(weapon, modifierText, defense=null){
    const kw = parsedWeaponKeywords(modifierText || '', weapon);
    const diceMean = value => window.WeaponCalc.parseNdX(value).mean || 0;
    const numeric = value => parseFloat(String(value ?? '').replace('+', ''));
    const targetModels = parseFloat(defense?.models);
    const blastAttacksAdd = (kw.blastDice || 0) * Math.floor(Math.max(0, Number.isFinite(targetModels) ? targetModels : 0) / 5);
    const stats = [
      ['A', diceMean(weapon?.A), diceMean(weapon?.A) + (kw.attacksAdd || 0) + blastAttacksAdd, weapon?.A],
      ['Skill', numeric(weapon?.skill) || 0, (numeric(weapon?.skill) || 0) + (kw.skillTargetMod || 0), weapon?.skill],
      ['S', numeric(weapon?.S) || 0, (numeric(weapon?.S) || 0) + (kw.strengthAdd || 0), weapon?.S],
      ['AP', Math.abs(numeric(weapon?.AP) || 0), Math.max(0, Math.abs(numeric(weapon?.AP) || 0) + (kw.apAdd || 0)), weapon?.AP],
      ['D', diceMean(weapon?.D), diceMean(weapon?.D) + (kw.damageAdd || 0), weapon?.D],
    ];
    return stats
      .filter(([, base, effective]) => Math.abs((effective || 0) - (base || 0)) > 1e-9)
      .map(([label, base, effective, baseText]) => {
        const delta = effective - base;
        const sign = delta > 0 ? '+' : '';
        return `${label} ${fmtNumber(effective)} from ${baseText ?? ''} (${sign}${fmtNumber(delta)})`;
      });
  }

  function profileModifierEntries(weapon, modifierText, defense=null){
    const changes = changedProfileStats(weapon, modifierText, defense);
    if(!changes.length) return [];
    return [{ name: weaponProfileLabel(weapon), text: changes.join(', ') }];
  }

  function formatProfileModifiers(entries){
    const seen = new Set();
    return (entries || [])
      .map(entry => {
        const name = String(entry?.name || '').trim();
        const text = String(entry?.text || '').trim();
        return text ? `${name}: ${text}` : '';
      })
      .filter(Boolean)
      .filter(line => {
        const key = line.toLowerCase();
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(' | ');
  }

  function normalizeChoiceText(value){
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function canonicalModifierKey(value){
    const tokens = (window.ArmyImportService?.splitModifiers
      ? window.ArmyImportService.splitModifiers(value)
      : String(value || '').split(','))
      .map(token => String(token || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    return [...new Set(tokens.map(token => token.toLowerCase()))].sort().join(', ');
  }

  function splitModifierTokens(value){
    const key = String(value || '');
    if(modifierTokenCache.has(key)) return modifierTokenCache.get(key);
    const result = (window.ArmyImportService?.splitModifiers
      ? window.ArmyImportService.splitModifiers(value)
      : String(value || '').split(','))
      .map(token => String(token || '').trim())
      .filter(Boolean);
    modifierTokenCache.set(key, result);
    return result;
  }

  function darkPactChoiceOptions(token){
    const key = String(token || '');
    if(darkPactTokenCache.has(key)) return darkPactTokenCache.get(key);
    const match = String(token || '').match(/^Choose Best:\s*(.+)$/i);
    if(!match){
      darkPactTokenCache.set(key, null);
      return null;
    }
    const options = match[1].split(/[|;]/).map(option => option.trim()).filter(Boolean);
    const normalized = options.map(option => option.toLowerCase()).sort().join('|');
    const result = normalized === 'lethal hits|sustained hits 1' ? options : null;
    darkPactTokenCache.set(key, result);
    return result;
  }

  function darkPactChoiceGroupsFromText(text){
    const key = String(text || '');
    if(darkPactTextCache.has(key)) return darkPactTextCache.get(key);
    const groups = [];
    splitModifierTokens(text).forEach(token => {
      const options = darkPactChoiceOptions(token);
      if(options?.length) groups.push(options);
    });
    darkPactTextCache.set(key, groups);
    return groups;
  }

  function applyPhaseChoiceSelections(text, selections=[]){
    let choiceIndex = 0;
    return splitModifierTokens(text)
      .map(token => {
        if(darkPactChoiceOptions(token)){
          const selected = selections[choiceIndex++];
          return selected || '';
        }
        return token;
      })
      .filter(Boolean)
      .join(', ');
  }

  function cartesianChoiceSelections(groups){
    return (groups || []).reduce(
      (variants, group) => variants.flatMap(prefix => group.map(option => [...prefix, option])),
      [[]]
    );
  }

  function weaponPhase(weapon){
    return isMeleeWeapon(weapon) ? 'melee' : 'shooting';
  }

  function phaseChoiceSelectionForWeapon(weapon, options={}){
    return options?._phaseChoiceSelections?.[weaponPhase(weapon)] || [];
  }

  function ruleNameMayHavePhaseChoice(value){
    return /\bDark Pacts?\b|Disciples of Be['\u2019]lakor/i.test(String(value || ''));
  }

  function unitFamilyMayHavePhaseChoice(unit){
    if(!unit || typeof unit !== 'object') return false;
    if(unitPhaseChoiceCache.has(unit)) return unitPhaseChoiceCache.get(unit);
    const root = parentUnit(unit) || unit;
    const members = [root, ...(root?._children || [])].filter(Boolean);
    const result = members.some(member => [
      ...(member?.abilities || []),
      ...(member?._enhancements || []).map(enh => enh?.name || enh),
    ].some(ruleNameMayHavePhaseChoice));
    unitPhaseChoiceCache.set(unit, result);
    return result;
  }

  function itemMayHavePhaseChoice(item){
    return unitFamilyMayHavePhaseChoice(item?.sourceUnit)
      || darkPactChoiceGroupsFromText(item?.weapon?.modifiers || '').length > 0;
  }

  function shootingChoiceKey(w){
    const name = String(w?.name || '').trim();
    const match = name.match(/\s[-\u2013\u2014]\s/);
    if(!match) return `weapon:${normalizeChoiceText(name)}:${w?._weaponKey || ''}`;
    return `choice:${normalizeChoiceText(name.slice(0, match.index))}`;
  }

  function chooseShootingProfiles(items){
    const groups = new Map();
    const order = [];
    (items || []).forEach(item => {
      const key = shootingChoiceKey(item.weapon);
      if(!groups.has(key)){
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key).push(item);
    });
    return order.map(key => {
      const group = groups.get(key);
      return group.reduce((winner, candidate) => candidate.dmg > (winner?.dmg ?? -1) ? candidate : winner, null);
    }).filter(Boolean);
  }

  function selectedTotals(items){
    const list = items || [];
    return {
      dmg: list.reduce((total, item) => total + (item?.dmg || 0), 0),
      kills: list.reduce((total, item) => total + (item?.kills || 0), 0),
      profilesUsed: aggregateProfiles(list.flatMap(item => item?.profilesUsed || [])),
      profileModifiers: list.flatMap(item => item?.profileModifiers || []),
      formulaItems: list.flatMap(item => item?.formulaItems || (item?.formula ? [item.formula] : [])),
    };
  }

  function unitHasAbility(unit, pattern){
    return (unit?.abilities || []).some(ability => pattern.test(String(ability || '')));
  }

  function parentUnit(unit){
    return unit?._parentUnit || unit?._baseUnit?._parentUnit || null;
  }

  function isAbilityEnabled(unit, name, options){
    if(typeof options?.isAbilityEnabled === 'function') return options.isAbilityEnabled(unit, name);
    return true;
  }

  function bloodcrusherChargeModelCount(unit){
    const children = Array.isArray(unit?._children) ? unit._children : [];
    const bloodcrusherChildren = children.filter(child => /bloodhunter|bloodcrusher/i.test(child?.label || ''));
    if(bloodcrusherChildren.length){
      return bloodcrusherChildren.reduce((sum, child) => sum + (parseInt(child?.defense?.models, 10) || 1), 0);
    }
    const models = parseInt(unit?.defense?.models, 10);
    return Number.isFinite(models) && models > 0 ? models : 0;
  }

  function unitModelCount(unit){
    const children = Array.isArray(unit?._children) ? unit._children : [];
    if(children.length){
      const childTotal = children.reduce((sum, child) => sum + unitModelCount(child), 0);
      if(childTotal > 0) return childTotal;
    }
    const models = parseFloat(unit?.defense?.models ?? unit?.size);
    return Number.isFinite(models) && models > 0 ? models : 1;
  }

  function rollSuccessChance(rollTarget, fallback=1){
    const target = parseInt(rollTarget, 10) || 0;
    return target > 0 ? (7 - Math.max(2, Math.min(6, target))) / 6 : fallback;
  }

  function chargeMortalDamage(unit, attackMode, options){
    if(attackMode === 'shooting') return { dmg: 0, profile: null };
    if(!options?.conditionsMet) return { dmg: 0, profile: null };
    if(typeof options?.isMeleeEnabled === 'function' && !options.isMeleeEnabled()) return { dmg: 0, profile: null };
    const inheritedFrom = parentUnit(unit);
    const ownAbility = unitHasAbility(unit, /brass stampede/i);
    const inheritedAbility = !ownAbility && inheritedFrom && !options?.suppressInheritedUnitAbilities && unitHasAbility(inheritedFrom, /brass stampede/i);
    const abilityUnit = ownAbility ? unit : (inheritedAbility ? inheritedFrom : null);
    if(!abilityUnit) return { dmg: 0, profile: null };
    if(!isAbilityEnabled(abilityUnit, 'Brass Stampede', options)) return { dmg: 0, profile: null };
    const models = bloodcrusherChargeModelCount(unit);
    if(models <= 0) return { dmg: 0, profile: null };
    const chance = 0.5;
    const dice = '1d3';
    const expectedPerModel = chance * window.WeaponCalc.parseNdX(dice).mean;
    return {
      dmg: models * expectedPerModel,
      profile: { name: 'Brass Stampede mortal wounds', count: models, D: dice },
      effect: { count: models, chance, dice, label: models === 1 ? 'model' : 'models' },
      phase: 'preDamage',
    };
  }

  function specialAbilitySources(unit, options){
    const seen = new Set();
    const out = [];
    [unit, ...leafAttackUnits(unit)].filter(Boolean).forEach(source => {
      (source?.abilities || []).forEach(ability => {
        if(!isAbilityEnabled(source, ability, options)) return;
        const key = `${source?._unitKey || source?.label || 'unit'}|${ability}`;
        if(seen.has(key)) return;
        seen.add(key);
        out.push({ source, ability });
      });
    });
    return out;
  }

  function unitHasEnabledWeaponKeyword(unit, defenderUnit, keyword, options){
    const wanted = String(keyword || '').trim();
    if(!wanted) return true;
    return leafAttackUnits(unit).some(leaf => (leaf?.weapons || [])
      .filter(w => !options?.isWeaponEnabled || options.isWeaponEnabled(w))
      .filter(w => weaponMatchesAttackMode(w, leaf?._attackMode || unit?._attackMode || 'all'))
      .some(w => {
        const modifierText = typeof options?.effectiveWeaponModifiers === 'function'
          ? options.effectiveWeaponModifiers(w, leaf, defenderUnit)
          : (w?.modifiers || '');
        const kw = parsedWeaponKeywords(modifierText || w?.modifiers || '', w);
        return !!kw[String(wanted).toLowerCase()];
      }));
  }

  function specialMortalSpecs(unit, defenderUnit, attackMode, options){
    if(!options?.conditionsMet) return [];
    const service = window.AbilityModifierService;
    if(!service?.modifiersForRule || !service?.parseModifierSpec) return [];
    const specs = [];
    const emittedPhaseMortals = new Set();
    specialAbilitySources(unit, options).forEach(({ source, ability }) => {
      service.modifiersForRule(ability).forEach(spec => {
        const parsed = service.parseModifierSpec(spec);
        if(parsed?.meta?.kind !== 'special') return;
        if(parsed?.meta?.weaponKeywords?.length && !parsed.meta.weaponKeywords.some(keyword => unitHasEnabledWeaponKeyword(unit, defenderUnit, keyword, options))) return;
        if(parsed?.meta?.special === 'fightPhaseMortals'){
          if(attackMode === 'shooting') return;
          if(typeof options?.isMeleeEnabled === 'function' && !options.isMeleeEnabled()) return;
          const diceCount = parseInt(parsed.meta.diceCount, 10) || 0;
          const rollTarget = parseInt(parsed.meta.rollTarget, 10) || 0;
          const successChance = rollSuccessChance(rollTarget, 0);
          const dmg = diceCount * successChance;
          if(dmg <= 0) return;
          specs.push({
            dmg,
            profile: { name: `${ability} mortal wounds`, count: 1, D: '1' },
            modifierText: parsed.modifiers?.[0] || 'Fight phase mortal wounds',
            effect: { count: diceCount, chance: successChance, dice: '1', label: 'rolls' },
            phase: 'postDamage',
          });
          return;
        }
        if(parsed?.meta?.special === 'phaseMortalsPerModel'){
          const dice = parsed.meta.damageDice || '1';
          const successChance = Number.isFinite(parsed.meta.chance)
            ? parsed.meta.chance
            : rollSuccessChance(parsed.meta.rollTarget, 1);
          const sourceUnit = parentUnit(source) || unit;
          const models = unitModelCount(sourceUnit);
          const key = `${ability}|${parsed.meta.phase}|per-model|${dice}|${parsed.meta.rollTarget || parsed.meta.chance}|${models}`;
          if(emittedPhaseMortals.has(key)) return;
          emittedPhaseMortals.add(key);
          const dmg = models * successChance * window.WeaponCalc.parseNdX(dice).mean;
          if(dmg <= 0) return;
          specs.push({
            dmg,
            profile: { name: `${ability} mortal wounds`, count: models, D: dice },
            modifierText: parsed.modifiers?.[0] || 'Mortal wounds per model',
            effect: { count: models, chance: successChance, dice, label: models === 1 ? 'model' : 'models' },
            phase: parsed.meta.phase || 'preDamage',
          });
          return;
        }
        if(parsed?.meta?.special !== 'phaseMortals') return;
        const key = `${ability}|${parsed.meta.phase}|${parsed.meta.damageDice}|${parsed.meta.rollTarget || parsed.meta.chance}`;
        if(emittedPhaseMortals.has(key)) return;
        emittedPhaseMortals.add(key);
        const dice = parsed.meta.damageDice || '1d3';
        const rollTarget = parseInt(parsed.meta.rollTarget, 10) || 0;
        const successChance = Number.isFinite(parsed.meta.chance)
          ? parsed.meta.chance
          : rollSuccessChance(rollTarget, 1);
        const dmg = window.WeaponCalc.parseNdX(dice).mean * successChance;
        if(dmg <= 0) return;
        specs.push({
          dmg,
          profile: { name: `${ability} mortal wounds`, count: 1, D: dice },
          modifierText: parsed.modifiers?.[0] || 'Mortal wounds',
          effect: { count: 1, chance: successChance, dice, label: 'roll' },
          phase: parsed.meta.phase || 'preDamage',
        });
      });
    });
    return specs;
  }

  function additionalMortalDamage(unit, defenderUnit, attackMode, options){
    const items = [];
    const chargeMortals = chargeMortalDamage(unit, attackMode, options);
    if(chargeMortals.profile) items.push({ ...chargeMortals, modifierText: 'Mortal wounds on charge', phase: chargeMortals.phase || 'preDamage' });
    items.push(...specialMortalSpecs(unit, defenderUnit, attackMode, options));
    return items;
  }

  function allocateMortalDamageItems(items, defenderUnit, options, attackerUnit){
    return (items || []).map(item => {
      const allocated = allocateFlatDamageIntoDefender(item.dmg, defenderUnit, false, options, attackerUnit);
      return { ...item, allocated };
    });
  }

  function mortalFormulaItem(item, defenderUnit){
    const rawDamage = Number(item.dmg);
    return {
      weaponName: item.profile.name,
      modifierText: item.modifierText || 'Mortal wounds',
      phase: item.phase || 'preDamage',
      effect: item.effect || null,
      rawDamage: Number.isFinite(rawDamage) ? rawDamage : (item.allocated?.dmg || 0),
      totalDamage: item.allocated?.dmg || 0,
      totalKills: item.allocated?.kills || 0,
      lines: (item.allocated?.lines || []).length
        ? item.allocated.lines
        : [{ targetName: defenderUnit?.label || 'Defender', appliedDamage: item.allocated?.dmg || 0 }],
    };
  }

  function fnpDamageMultiplier(def){
    const fnp = parseFloat(def?.Fnp ?? def?.fnp);
    if(!Number.isFinite(fnp) || fnp <= 0) return 1;
    return 1 - ((7 - Math.max(2, Math.min(6, fnp))) / 6);
  }

  function isCharacterTarget(unit){
    if(unit?._isCharacterModel || unit?._isCharacterUnit || unit?.isCharacter || unit?.isCharacterModel || unit?.isCharacterUnit) return true;
    const tags = (unit?._tags || []).map(tag => String(tag || '').toLowerCase());
    if(tags.some(tag => tag === 'character' || tag === 'epic hero')) return true;
    return false;
  }

  function unitIdentity(unit){
    return String(unit?._unitKey || unit?._viewKey || unit?._groupId || unit?.label || '');
  }

  function cloneTargetLine(line){
    return line ? { ...line, units: Array.isArray(line.units) ? [...line.units] : line.units } : line;
  }

  function defenderWoundPool(def, defenderUnit){
    const W = parseFloat(def?.W) || 0;
    const size = def?.models != null
      ? parseFloat(def.models)
      : (defenderUnit?.size != null ? parseFloat(defenderUnit.size) : null);
    const totalWounds = parseFloat(def?.totalWounds);
    if(Number.isFinite(totalWounds) && totalWounds > 0) return totalWounds;
    if(W > 0 && Number.isFinite(size) && size > 0) return W * size;
    return W > 0 ? W : null;
  }

  function effectiveDefense(unit, options, opposingUnit=null){
    if(typeof options?.effectiveDefense === 'function') return options.effectiveDefense(unit, opposingUnit);
    return unit?.defense || {};
  }

  function defenderTargetLines(defenderUnit, precision=false, options={}, attackerUnit=null){
    const cacheKey = options?._targetLinesCache
      ? `${precision ? 1 : 0}|${unitIdentity(defenderUnit)}|${unitIdentity(attackerUnit)}|${options.conditionsMet ? 1 : 0}`
      : '';
    if(cacheKey && options._targetLinesCache.has(cacheKey)){
      return options._targetLinesCache.get(cacheKey).map(cloneTargetLine);
    }
    const children = Array.isArray(defenderUnit?._children) ? defenderUnit._children : [];
    const units = children.length ? children : [defenderUnit];
    const rawLines = units
      .map((unit, index) => {
        const def = effectiveDefense(unit, options, attackerUnit);
        const pool = defenderWoundPool(def, unit);
        const W = parseFloat(def?.W) || 0;
        return {
          unit,
          index,
          def,
          pool: Number.isFinite(pool) && pool > 0 ? pool : null,
          models: W > 0 && Number.isFinite(pool) && pool > 0 ? pool / W : (parseFloat(def?.models) || 1),
          isCharacter: isCharacterTarget(unit),
        };
      })
      .filter(line => line.def && line.pool != null);
    const grouped = new Map();
    const order = [];
    rawLines.forEach(line => {
      const keywords = [
        ...(line.unit?._keywords || []),
        ...(line.def?.keywords || []),
        ...(line.def?._keywords || []),
      ].map(value => String(value || '').toLowerCase()).sort();
      const key = JSON.stringify({
        isCharacter: line.isCharacter,
        T: line.def?.T ?? '',
        Sv: line.def?.Sv ?? '',
        Inv: line.def?.Inv ?? '',
        W: line.def?.W ?? '',
        Fnp: line.def?.Fnp ?? '',
        cover: !!line.def?.cover,
        keywords,
      });
      if(!grouped.has(key)){
        grouped.set(key, { ...line, units: [line.unit] });
        order.push(key);
        return;
      }
      const existing = grouped.get(key);
      existing.pool += line.pool;
      existing.models += line.models || 0;
      existing.units.push(line.unit);
      existing.index = Math.min(existing.index, line.index);
    });
    const lines = order.map(key => grouped.get(key));

    if(!lines.length){
      const fallback = [{
      unit: defenderUnit,
      index: 0,
      def: effectiveDefense(defenderUnit, options, attackerUnit),
      pool: defenderWoundPool(effectiveDefense(defenderUnit, options, attackerUnit), defenderUnit),
      models: parseFloat(effectiveDefense(defenderUnit, options, attackerUnit)?.models) || 1,
      isCharacter: isCharacterTarget(defenderUnit),
      }];
      if(cacheKey) options._targetLinesCache.set(cacheKey, fallback.map(cloneTargetLine));
      return fallback;
    }

    const sorted = lines.sort((a, b) => {
      if(a.isCharacter !== b.isCharacter){
        return precision ? (a.isCharacter ? -1 : 1) : (a.isCharacter ? 1 : -1);
      }
      return a.index - b.index;
    });
    if(cacheKey) options._targetLinesCache.set(cacheKey, sorted.map(cloneTargetLine));
    return sorted;
  }

  function defensePayloadForLine(line, fallbackUnit=null){
    if(line?._defensePayload) return line._defensePayload;
    const def = line?.def || fallbackUnit?.defense || {};
    const unit = line?.unit || fallbackUnit || {};
    const keywords = [...(unit._keywords || []), ...(def.keywords || []), ...(def._keywords || [])];
    const payload = {
      T: parseFloat(def.T) || 0,
      sv: parseFloat(def.Sv) || 0,
      inv: parseFloat(def.Inv) || 0,
      W: parseFloat(def.W) || 0,
      Fnp: parseFloat(def.Fnp) || 0,
      cover: !!def.cover,
      models: parseFloat(line?.models ?? def.models) || 1,
      keywords,
    };
    payload._cacheKey = [
      payload.T,
      payload.sv,
      payload.inv,
      payload.W,
      payload.Fnp,
      payload.cover ? 1 : 0,
      payload.models,
      keywords.map(value => String(value || '').toLowerCase()).sort().join('|'),
    ].join('~');
    if(line) line._defensePayload = payload;
    return payload;
  }

  function weaponCalcProfileKey(weapon){
    if(weapon && typeof weapon === 'object' && weaponCalcKeyCache.has(weapon)) return weaponCalcKeyCache.get(weapon);
    const key = [
      weapon?.name || '',
      weapon?.range ?? weapon?.R ?? weapon?.Range ?? '',
      weapon?.A ?? '',
      weapon?.skill ?? '',
      weapon?.S ?? '',
      weapon?.AP ?? '',
      weapon?.D ?? '',
      weapon?._profileCount ?? weapon?._count ?? '',
    ].join('~');
    if(weapon && typeof weapon === 'object') weaponCalcKeyCache.set(weapon, key);
    return key;
  }

  function calcOneWeaponCacheKey(weapon, def, modifierText, detailMode='base'){
    return [
      detailMode || 'base',
      weaponCalcProfileKey(weapon),
      modifierText || weapon?.modifiers || '',
      def?._cacheKey || [
        def?.T ?? '',
        def?.sv ?? '',
        def?.inv ?? '',
        def?.W ?? '',
        def?.Fnp ?? '',
        def?.cover ? 1 : 0,
        def?.models ?? '',
        (def?.keywords || []).map(value => String(value || '').toLowerCase()).sort().join('|'),
      ].join('~'),
    ].join('~');
  }

  function calcOneWeaponCached(weapon, def, modifierText, options={}, detailMode='base'){
    if(!options?._weaponCalcCache){
      return window.WeaponCalc.calcOneWeapon(weapon, def, modifierText, {
        includeFormula: detailMode === 'formula',
        includeAllocation: detailMode === 'allocation',
      });
    }
    const key = calcOneWeaponCacheKey(weapon, def, modifierText, detailMode);
    if(options._weaponCalcCache.has(key)) return options._weaponCalcCache.get(key);
    const result = window.WeaponCalc.calcOneWeapon(weapon, def, modifierText, {
      includeFormula: detailMode === 'formula',
      includeAllocation: detailMode === 'allocation',
    });
    options._weaponCalcCache.set(key, result);
    return result;
  }

  function calcOneWeaponIntoDefender(weapon, defenderUnit, modifierText, options={}, attackerUnit=null){
    const kw = parsedWeaponKeywords(modifierText || weapon?.modifiers || '', weapon);
    const lines = defenderTargetLines(defenderUnit, !!kw.precision, options, attackerUnit);
    if(lines.length <= 1){
      const result = calcOneWeaponCached(weapon, defensePayloadForLine(lines[0], defenderUnit), modifierText, options, options.includeFormula ? 'formula' : 'allocation');
      if(!options.includeFormula) return result;
      return {
        ...result,
        formula: {
          weaponName: weapon?.name || 'Weapon',
          modifierText,
          totalDamage: result.dmg || 0,
          totalKills: result.kills || 0,
          lines: [{
            targetName: lines[0]?.unit?.label || defenderUnit?.label || 'Defender',
            damageFraction: 1,
            appliedDamage: result.dmg || 0,
            formula: result.formula,
          }],
        },
      };
    }

    let remainingFraction = 1;
    let dmg = 0;
    let kills = 0;
    const formulaLines = [];
    for(const line of lines){
      if(remainingFraction <= 1e-9) break;
      const def = line.def || {};
      const W = parseFloat(def.W) || 0;
      const result = calcOneWeaponCached(weapon, defensePayloadForLine(line, defenderUnit), modifierText, options, options.includeFormula ? 'formula' : 'allocation');
      const lineDamage = (result.dmg || 0) * remainingFraction;
      if(lineDamage <= 0) break;
      const capacity = Number.isFinite(line.pool) && line.pool > 0 ? line.pool : lineDamage;
      const applied = Math.min(lineDamage, capacity);
      dmg += applied;
      kills += W > 0 ? (applied / W) : 0;
      if(options.includeFormula){
        formulaLines.push({
          targetName: line.unit?.label || 'Defender',
          damageFraction: remainingFraction,
          availableDamage: lineDamage,
          woundPool: capacity,
          appliedDamage: applied,
          formula: result.formula,
        });
      }
      remainingFraction *= Math.max(0, lineDamage - capacity) / lineDamage;
    }
    return {
      dmg,
      kills,
      ...(options.includeFormula ? { formula: {
        weaponName: weapon?.name || 'Weapon',
        modifierText,
        totalDamage: dmg,
        totalKills: kills,
        lines: formulaLines,
      } } : {}),
    };
  }

  function defenderState(defenderUnit, options={}, attackerUnit=null){
    return defenderTargetLines(defenderUnit, false, options, attackerUnit)
      .map(line => ({
        ...line,
        remainingPool: Number.isFinite(line.pool) && line.pool > 0 ? line.pool : 0,
      }))
      .filter(line => line.remainingPool > 0);
  }

  function totalStateWounds(state){
    return (state || []).reduce((sum, line) => sum + (Number(line.pool) || 0), 0);
  }

  function aliveStateLines(state){
    return (state || []).filter(line => (line.remainingPool || 0) > 1e-9);
  }

  function overkillStateLine(state){
    const base = state?._lastTargetLine || (Array.isArray(state) ? state[state.length - 1] : null);
    if(!base) return null;
    const W = parseFloat(base.def?.W) || parseFloat(base.pool) || 0;
    return {
      ...base,
      remainingPool: W > 0 ? W : (parseFloat(base.pool) || 0),
      overkill: true,
    };
  }

  function lineDamageValue(weapon, line, modifierText, options={}){
    if(!line) return 0;
    return calcOneWeaponCached(
      weapon,
      defensePayloadForLine(line),
      modifierText,
      options,
      'allocation'
    ).dmg || 0;
  }

  function orderedStateLinesForWeapon(state, weapon, modifierText, options={}, attackerUnit=null){
    const kw = parsedWeaponKeywords(modifierText || weapon?.modifiers || '', weapon);
    const alive = aliveStateLines(state);
    if(!alive.length){
      const overkill = overkillStateLine(state);
      return overkill ? [overkill] : [];
    }
    const characters = alive.filter(line => line.isCharacter);
    const nonCharacters = alive.filter(line => !line.isCharacter);
    const primary = kw.precision ? characters : nonCharacters;
    const secondary = kw.precision ? nonCharacters : characters;
    const sortWorstFirst = lines => [...lines].sort((a, b) => {
      const aDamage = lineDamageValue(weapon, a, modifierText, options);
      const bDamage = lineDamageValue(weapon, b, modifierText, options);
      if(Math.abs(aDamage - bDamage) > 1e-9) return aDamage - bDamage;
      return (a.index || 0) - (b.index || 0);
    });
    return [...sortWorstFirst(primary), ...sortWorstFirst(secondary)];
  }

  function stateChoiceSignature(state){
    const alive = aliveStateLines(state);
    if(!alive.length){
      const overkill = overkillStateLine(state);
      return overkill
        ? `overkill:${unitIdentity(overkill.unit)}:${overkill.def?.T}:${overkill.def?.Sv}:${overkill.def?.Inv}:${overkill.def?.W}:${overkill.def?.Fnp}:${overkill.def?.cover ? 1 : 0}`
        : 'empty';
    }
    return alive.map(line => [
      unitIdentity(line.unit),
      line.isCharacter ? 1 : 0,
      line.def?.T ?? '',
      line.def?.Sv ?? '',
      line.def?.Inv ?? '',
      line.def?.W ?? '',
      line.def?.Fnp ?? '',
      line.def?.cover ? 1 : 0,
    ].join(':')).join('|');
  }

  function weaponChoiceCacheKey(weapon, sourceUnit, defenderUnit, state, options){
    return [
      options?.conditionsMet ? 1 : 0,
      unitIdentity(sourceUnit),
      unitIdentity(defenderUnit),
      weapon?._weaponKey || '',
      weapon?.name || '',
      weapon?.range ?? weapon?.R ?? weapon?.Range ?? '',
      weapon?.A ?? '',
      weapon?.skill ?? '',
      weapon?.S ?? '',
      weapon?.AP ?? '',
      weapon?.D ?? '',
      weapon?._profileCount ?? weapon?._count ?? '',
      weapon?.modifiers || '',
      phaseChoiceSelectionForWeapon(weapon, options).join('|'),
      stateChoiceSignature(state),
    ].join('~');
  }

  function bestWeaponVariantForState(weapon, sourceUnit, defenderUnit, state, options={}){
    const cacheKey = options?._variantCache ? weaponChoiceCacheKey(weapon, sourceUnit, defenderUnit, state, options) : '';
    if(cacheKey && options._variantCache.has(cacheKey)) return options._variantCache.get(cacheKey);
    const baseModifierText = options.effectiveWeaponModifiers
      ? options.effectiveWeaponModifiers(weapon, sourceUnit, defenderUnit)
      : (weapon?.modifiers || '');
    const phaseResolvedText = applyPhaseChoiceSelections(baseModifierText, phaseChoiceSelectionForWeapon(weapon, options));
    const variants = window.AbilityModifierService?.modifierTextVariants
      ? window.AbilityModifierService.modifierTextVariants(phaseResolvedText)
      : [phaseResolvedText];
    const result = variants
      .map(text => {
        const firstLine = orderedStateLinesForWeapon(state, weapon, text, options, sourceUnit)[0];
        return {
          weapon,
          sourceUnit,
          text,
          kw: parsedWeaponKeywords(text, weapon),
          firstLine,
          firstTargetDamage: firstLine ? lineDamageValue(weapon, firstLine, text, options) : 0,
        };
      })
      .reduce((winner, candidate) => candidate.firstTargetDamage > (winner?.firstTargetDamage ?? -1) ? candidate : winner, null);
    if(cacheKey) options._variantCache.set(cacheKey, result);
    return result;
  }

  function applyWeaponToState(choice, defenderUnit, state, options={}){
    const weapon = choice?.weapon;
    if(!weapon) return { dmg:0, kills:0, formula:null };
    let remainingFraction = 1;
    let dmg = 0;
    let kills = 0;
    const formulaLines = [];
    while(remainingFraction > 1e-9){
      const line = orderedStateLinesForWeapon(state, weapon, choice.text, options, choice.sourceUnit)[0];
      if(!line) break;
      if(remainingFraction <= 1e-9) break;
      if((line.remainingPool || 0) <= 1e-9) break;
      const result = calcOneWeaponCached(
        weapon,
        defensePayloadForLine(line),
        choice.text,
        options,
        options.includeFormula ? 'formula' : 'allocation'
      );
      const formula = result.formula || result.allocation || {};
      const capacity = Math.max(0, line.remainingPool || 0);
      const W = parseFloat(line.def?.W) || 0;
      const modelsLeft = line.overkill ? 0 : aliveModelCount(capacity, W);
      const allocated = allocateWeaponProfileDamage(weapon, choice.text, line, formula, remainingFraction, !!line.overkill, !line.overkill && aliveStateLines(state).length <= 1);
      const applied = allocated.appliedDamage;
      if(applied <= 0) continue;
      if(!line.overkill){
        line.remainingPool = allocated.remainingPool;
        state._lastTargetLine = line;
      }
      const countedDamage = Number.isFinite(Number(allocated.totalDamage))
        ? Number(allocated.totalDamage)
        : ((Number(allocated.appliedDamage) || 0) + (Number(allocated.overkillDamage) || 0));
      dmg += countedDamage;
      kills += W > 0 ? countedDamage / W : allocated.kills;
      if(options.includeFormula){
        formulaLines.push({
          targetName: line.unit?.label || 'Defender',
          damageFraction: remainingFraction,
          availableDamage: allocated.preAllocationDamage,
          woundPool: capacity,
          modelsLeft,
          appliedDamage: applied,
          allocation: allocated,
          formula,
        });
      }
      remainingFraction = allocated.remainingFraction;
    }
    return {
      dmg,
      kills,
      formula: options.includeFormula ? {
        weaponName: weapon?.name || 'Weapon',
        profileCount: weaponProfileCount(weapon),
        modifierText: choice.text,
        totalDamage: dmg,
        totalKills: kills,
        lines: formulaLines,
      } : null,
    };
  }

  function currentModelRemaining(remainingPool, modelWounds){
    const remaining = Math.max(0, Number(remainingPool) || 0);
    const wounds = Number(modelWounds) || 0;
    if(wounds <= 0) return remaining;
    const mod = remaining % wounds;
    return mod > 1e-9 ? mod : Math.min(wounds, remaining);
  }

  function aliveModelCount(remainingPool, modelWounds){
    const remaining = Math.max(0, Number(remainingPool) || 0);
    const wounds = Number(modelWounds) || 0;
    if(wounds <= 0) return remaining > 1e-9 ? 1 : 0;
    return Math.ceil(remaining / wounds);
  }

  function allocateWeaponProfileDamage(weapon, modifierText, line, formula={}, scale=1, overkill=false, finalTarget=false){
    const totals = formula?.totals || {};
    const probs = formula?.probabilities || {};
    const kw = parsedWeaponKeywords(modifierText || weapon?.modifiers || '', weapon);
    const modelWounds = parseFloat(line?.def?.W) || parseFloat(formula?.defense?.W) || 0;
    const startPool = Math.max(0, Number(line?.remainingPool) || 0);
    const scaleFactor = Math.max(0, Math.min(1, Number(scale) || 0));
    const fnpMultiplier = 1 - (Number(probs.pFnp) || 0);
    const normalAttacksTotal = Math.max(0, (Number(totals.unsavedNormal) || 0) * scaleFactor);
    const mortalAttackTotal = Math.max(0, (Number(totals.mortals) || 0) * scaleFactor);
    const damageInstancesTotal = normalAttacksTotal + mortalAttackTotal;
    const cappedDamage = Math.max(0, Number(formula.cappedDamage) || 0);
    const rawDamagePerHit = window.WeaponCalc.expectedCappedDamage(
      weapon?.D,
      null,
      kw.damageAdd || 0,
      kw.damageDivisor || 1
    ) * fnpMultiplier;
    // A damage-1 instance can never lose damage to spill: each point that gets
    // through FNP is a single wound. Fractional expected wounds on the current
    // model must therefore continue into overkill instead of being discarded.
    const damageCannotSpill = window.WeaponCalc.expectedCappedDamage(
      weapon?.D,
      null,
      kw.damageAdd || 0,
      kw.damageDivisor || 1
    ) <= 1 + 1e-9;
    const mortalDamageTotal = mortalAttackTotal * rawDamagePerHit;
    const rawNormalDamageTotal = Math.max(0, normalAttacksTotal * rawDamagePerHit);
    const rawDamageTotal = Math.max(0, rawNormalDamageTotal + mortalDamageTotal);
    const preAllocationDamage = Math.max(0, (normalAttacksTotal * cappedDamage * fnpMultiplier) + mortalDamageTotal);

    const hypotheticalPoolFor = (rawDamage, normalAttacks) => {
      if(modelWounds <= 0) return rawDamage;
      const models = Math.max(1, Math.ceil((rawDamage / modelWounds) + normalAttacks + 2));
      return modelWounds * models;
    };

    const allocateIntoPool = (pool, damageInstances) => {
      let remainingPool = Math.max(0, Number(pool) || 0);
      let instancesRemaining = Math.max(0, Number(damageInstances) || 0);
      let appliedDamage = 0;
      let rawSpillLoss = 0;
      const fullModelDamage = modelWounds > 0
        ? window.WeaponCalc.expectedCappedDamage(
            weapon?.D,
            modelWounds,
            kw.damageAdd || 0,
            kw.damageDivisor || 1
          ) * fnpMultiplier
        : rawDamagePerHit;

      const consumePartialModelWithFullInstance = () => {
        if(instancesRemaining < 1 - 1e-9 || remainingPool <= 1e-9 || modelWounds <= 0) return false;
        const modelRemaining = currentModelRemaining(remainingPool, modelWounds);
        if(modelRemaining >= modelWounds - 1e-9) return false;
        const attackDamage = modelWounds > 0
          ? window.WeaponCalc.expectedCappedDamage(
              weapon?.D,
              modelRemaining || modelWounds,
              kw.damageAdd || 0,
              kw.damageDivisor || 1
            ) * fnpMultiplier
          : rawDamagePerHit;
        const applied = Math.min(Math.max(0, attackDamage), remainingPool);
        if(applied <= 1e-9) return false;
        rawSpillLoss += Math.max(0, rawDamagePerHit - applied);
        appliedDamage += applied;
        remainingPool = Math.max(0, remainingPool - applied);
        instancesRemaining -= 1;
        return true;
      };

      consumePartialModelWithFullInstance();

      if(modelWounds > 0 && fullModelDamage > 1e-9 && instancesRemaining >= 1 - 1e-9 && remainingPool >= modelWounds - 1e-9){
        const instancesPerModel = Math.max(1, Math.ceil(modelWounds / fullModelDamage - 1e-9));
        const fullModelsAvailable = Math.floor((remainingPool + 1e-9) / modelWounds);
        const fullModelsFromInstances = Math.floor((instancesRemaining + 1e-9) / instancesPerModel);
        const modelsToResolve = Math.min(fullModelsAvailable, fullModelsFromInstances);
        if(modelsToResolve > 0){
          const spentInstances = modelsToResolve * instancesPerModel;
          const applied = modelsToResolve * modelWounds;
          appliedDamage += applied;
          rawSpillLoss += Math.max(0, (spentInstances * rawDamagePerHit) - applied);
          remainingPool = Math.max(0, remainingPool - applied);
          instancesRemaining = Math.max(0, instancesRemaining - spentInstances);
        }
      }

      consumePartialModelWithFullInstance();

      if(instancesRemaining > 1e-9 && remainingPool > 1e-9 && fullModelDamage > 1e-9){
        const attackPortion = instancesRemaining;
        const possibleApplied = Math.max(0, fullModelDamage * attackPortion);
        const applied = Math.min(possibleApplied, remainingPool);
        const usedPortion = possibleApplied > 1e-9
          ? Math.min(attackPortion, attackPortion * (applied / possibleApplied))
          : attackPortion;
        rawSpillLoss += Math.max(0, (rawDamagePerHit * usedPortion) - applied);
        appliedDamage += applied;
        remainingPool = Math.max(0, remainingPool - applied);
        instancesRemaining -= usedPortion;
      }

      const killedModels = modelWounds > 0
        ? Math.max(0, aliveModelCount(pool, modelWounds) - aliveModelCount(remainingPool, modelWounds))
        : 0;
      return {
        normalApplied: appliedDamage,
        mortalApplied: 0,
        appliedDamage,
        remainingPool,
        normalAttacksRemaining: instancesRemaining,
        damageInstancesRemaining: instancesRemaining,
        rawSpillLoss: damageCannotSpill ? 0 : rawSpillLoss,
        killedModels,
      };
    };

    if(overkill){
      const hypotheticalPool = hypotheticalPoolFor(rawDamageTotal, damageInstancesTotal);
      const allocated = allocateIntoPool(hypotheticalPool, damageInstancesTotal);
      const appliedDamage = allocated.appliedDamage;
      const rawSpillLoss = Math.max(0, allocated.rawSpillLoss);
      return {
        appliedDamage,
        totalDamage: appliedDamage,
        kills: modelWounds > 0 ? appliedDamage / modelWounds : 0,
        normalApplied: allocated.normalApplied,
        mortalApplied: allocated.mortalApplied,
        preAllocationDamage,
        rawDamageTotal,
        rawDamageRemaining: 0,
        rawSpillLoss,
        overkillDamage: 0,
        allocationLoss: rawSpillLoss,
        killedModels: allocated.killedModels,
        remainingPool: startPool,
        normalAttacks: normalAttacksTotal,
        normalAttacksRemaining: allocated.normalAttacksRemaining,
        damageInstances: damageInstancesTotal,
        damageInstancesRemaining: allocated.damageInstancesRemaining,
        mortalDamage: mortalDamageTotal,
        remainingFraction: 0,
        fnpMultiplier,
        overkill: true,
      };
    }

    const allocated = allocateIntoPool(startPool, damageInstancesTotal);
    let remainingPool = allocated.remainingPool;
    const normalApplied = allocated.normalApplied;
    const mortalApplied = allocated.mortalApplied;
    const appliedDamage = normalApplied + mortalApplied;
    const allocationLoss = Math.max(0, preAllocationDamage - appliedDamage);
    let killedModels = allocated.killedModels;
    const damageInstancesRemaining = allocated.damageInstancesRemaining;
    const normalAttacksRemaining = normalAttacksTotal > 1e-9 && damageInstancesTotal > 1e-9
      ? damageInstancesRemaining * (normalAttacksTotal / damageInstancesTotal)
      : 0;
    const mortalAttacksRemaining = mortalAttackTotal > 1e-9 && damageInstancesTotal > 1e-9
      ? damageInstancesRemaining * (mortalAttackTotal / damageInstancesTotal)
      : 0;
    const normalFractionRemaining = damageInstancesTotal > 1e-9 ? damageInstancesRemaining / damageInstancesTotal : 0;
    const mortalFractionRemaining = normalFractionRemaining;
    const rawNormalDamageRemaining = Math.max(0, normalAttacksRemaining * rawDamagePerHit);
    const rawMortalDamageRemaining = Math.max(0, mortalAttacksRemaining * rawDamagePerHit);
    const rawRemainder = Math.max(0, rawNormalDamageRemaining + rawMortalDamageRemaining);
    const rawDamageRemaining = finalTarget ? 0 : rawRemainder;
    let rawOverkillDamage = 0;
    let rawOverkillSpillLoss = 0;
    if(finalTarget && rawRemainder > 1e-9){
      const hypotheticalPool = hypotheticalPoolFor(rawRemainder, damageInstancesRemaining);
      const overkillAllocation = allocateIntoPool(hypotheticalPool, damageInstancesRemaining);
      rawOverkillDamage = overkillAllocation.appliedDamage;
      rawOverkillSpillLoss = overkillAllocation.rawSpillLoss;
      killedModels += overkillAllocation.killedModels;
    }
    const rawSpillLoss = Math.max(0, allocated.rawSpillLoss + rawOverkillSpillLoss);
    const totalDamage = Math.max(0, rawDamageTotal - rawSpillLoss - rawDamageRemaining);
    rawOverkillDamage = finalTarget ? Math.max(0, totalDamage - appliedDamage) : rawOverkillDamage;
    const remainingLocalFraction = rawDamageTotal > 1e-9
      ? Math.max(0, Math.min(1, rawDamageRemaining / rawDamageTotal))
      : Math.max(normalFractionRemaining, mortalFractionRemaining);

    return {
      appliedDamage,
      totalDamage,
      kills: modelWounds > 0 ? appliedDamage / modelWounds : 0,
      normalApplied,
      mortalApplied,
      preAllocationDamage,
      rawDamageTotal,
      rawDamageRemaining,
      rawSpillLoss,
      overkillDamage: rawOverkillDamage,
      allocationLoss,
      killedModels,
      remainingPool,
      normalAttacks: normalAttacksTotal,
      normalAttacksRemaining,
      damageInstances: damageInstancesTotal,
      damageInstancesRemaining,
      mortalDamage: mortalDamageTotal,
      remainingFraction: scaleFactor * remainingLocalFraction,
      fnpMultiplier,
    };
  }

  function applyFlatDamageToState(rawDamage, state, precision=false){
    let remainingRaw = Math.max(0, parseFloat(rawDamage) || 0);
    let dmg = 0;
    let kills = 0;
    const lines = [];
    const alive = aliveStateLines(state);
    if(!alive.length){
      const line = overkillStateLine(state);
      const mult = fnpDamageMultiplier(line?.def || {});
      const applied = remainingRaw * mult;
      const W = parseFloat(line?.def?.W) || 0;
      if(applied > 1e-9 && line){
        lines.push({
          targetName: line.unit?.label || 'Defender',
          woundPool: 0,
          appliedDamage: applied,
          formula: { defense: defensePayloadForLine(line) },
          allocation: {
            overkill: true,
            appliedDamage: applied,
            remainingPool: 0,
            rawSpillLoss: 0,
            overkillDamage: applied,
          },
        });
      }
      return { dmg: applied, kills: W > 0 ? applied / W : 0, overkill: true, lines };
    }
    const ordered = [
      ...(precision ? alive.filter(line => line.isCharacter) : alive.filter(line => !line.isCharacter)),
      ...(precision ? alive.filter(line => !line.isCharacter) : alive.filter(line => line.isCharacter)),
    ];
    for(const line of ordered){
      if(remainingRaw <= 1e-9) break;
      const mult = fnpDamageMultiplier(line.def);
      const effectiveAvailable = remainingRaw * mult;
      const capacity = Math.max(0, line.remainingPool || 0);
      const applied = Math.min(effectiveAvailable, capacity);
      const W = parseFloat(line.def?.W) || 0;
      const beforePool = capacity;
      line.remainingPool = Math.max(0, capacity - applied);
      state._lastTargetLine = line;
      dmg += applied;
      kills += W > 0 ? (applied / W) : 0;
      if(applied > 1e-9){
        lines.push({
          targetName: line.unit?.label || 'Defender',
          woundPool: beforePool,
          appliedDamage: applied,
          formula: { defense: defensePayloadForLine(line) },
          allocation: {
            appliedDamage: applied,
            remainingPool: line.remainingPool,
            rawSpillLoss: 0,
            overkillDamage: 0,
          },
        });
      }
      remainingRaw = mult > 0 ? Math.max(0, remainingRaw - (applied / mult)) : 0;
    }
    if(remainingRaw > 1e-9){
      const line = overkillStateLine(state);
      const mult = fnpDamageMultiplier(line?.def || {});
      const applied = remainingRaw * mult;
      const W = parseFloat(line?.def?.W) || 0;
      if(applied > 1e-9 && line){
        dmg += applied;
        kills += W > 0 ? applied / W : 0;
        lines.push({
          targetName: line.unit?.label || 'Defender',
          woundPool: 0,
          appliedDamage: applied,
          formula: { defense: defensePayloadForLine(line) },
          allocation: {
            overkill: true,
            appliedDamage: applied,
            remainingPool: 0,
            rawSpillLoss: 0,
            overkillDamage: applied,
          },
        });
      }
    }
    return { dmg, kills, lines };
  }

  function allocateFlatDamageIntoDefender(rawDamage, defenderUnit, precision=false, options={}, attackerUnit=null){
    let remainingRaw = Math.max(0, parseFloat(rawDamage) || 0);
    let dmg = 0;
    let kills = 0;
    for(const line of defenderTargetLines(defenderUnit, precision, options, attackerUnit)){
      if(remainingRaw <= 1e-9) break;
      const mult = fnpDamageMultiplier(line.def);
      const effectiveAvailable = remainingRaw * mult;
      const capacity = Number.isFinite(line.pool) && line.pool > 0 ? line.pool : effectiveAvailable;
      const applied = Math.min(effectiveAvailable, capacity);
      const W = parseFloat(line.def?.W) || 0;
      dmg += applied;
      kills += W > 0 ? (applied / W) : 0;
      remainingRaw = mult > 0 ? Math.max(0, remainingRaw - (applied / mult)) : 0;
    }
    return { dmg, kills };
  }

  function leafAttackUnits(unit){
    const children = Array.isArray(unit?._children) ? unit._children : [];
    if(!children.length) return [unit];
    return children.flatMap(child => leafAttackUnits(child));
  }

  function attackGroupsForLeaf(unit, defenderUnit, options){
    const attackMode = unit?._attackMode || 'all';
    const enabled = (unit?.weapons || [])
      .filter(w => !options.isWeaponEnabled || options.isWeaponEnabled(w))
      .filter(w => weaponMatchesAttackMode(w, attackMode));
    if(enabled.length === 0) return [];

    const groups = [];
    const shooting = enabled.filter(w => !isMeleeWeapon(w));
    const melee = enabled.filter(w => isMeleeWeapon(w));

    const addShootingGroups = () => {
      const grouped = new Map();
      const order = [];
      shooting.forEach(weapon => {
        const key = shootingChoiceKey(weapon);
        if(!grouped.has(key)){
          grouped.set(key, []);
          order.push(key);
        }
        grouped.get(key).push({ weapon, sourceUnit: unit });
      });
      order.forEach(key => groups.push({ type:'weaponChoice', sourceUnit: unit, alternatives: grouped.get(key) }));
    };

    const addMeleeGroups = () => {
      const extra = [];
      const normal = [];
      melee.forEach(weapon => {
        const kw = parsedWeaponKeywords(weapon?.modifiers || '', weapon);
        (kw.extraAttacks ? extra : normal).push({ weapon, sourceUnit: unit });
      });
      if(normal.length) groups.push({ type:'weaponChoice', sourceUnit: unit, alternatives: normal });
      extra.forEach(item => groups.push({ type:'weaponChoice', sourceUnit: unit, alternatives: [item] }));
    };

    if(attackMode === 'shooting') addShootingGroups();
    else if(attackMode === 'melee') addMeleeGroups();
    else if(options.combineShootingProfiles){
      addShootingGroups();
      addMeleeGroups();
    }else{
      addShootingGroups();
      addMeleeGroups();
    }
    return groups;
  }

  function weaponChoiceSignature(item, defenderUnit, options){
    const weapon = item?.weapon || {};
    const source = item?.sourceUnit || {};
    const modifierText = typeof options?.effectiveWeaponModifiers === 'function'
      ? options.effectiveWeaponModifiers(weapon, source, defenderUnit)
      : (weapon?.modifiers || '');
    const sourceRules = [
      ...(source?.abilities || []),
      ...(source?._enhancements || []).map(enh => enh?.name || enh),
    ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean).sort().join('~');
    return JSON.stringify({
      name: String(weapon.name || ''),
      range: String(weapon.range ?? weapon.R ?? weapon.Range ?? ''),
      A: String(weapon.A ?? ''),
      skill: String(weapon.skill ?? ''),
      S: String(weapon.S ?? ''),
      AP: String(weapon.AP ?? ''),
      D: String(weapon.D ?? ''),
      mode: String(weapon.mode ?? weapon.type ?? ''),
      modifiers: canonicalModifierKey(modifierText || ''),
      sourceRules,
      melee: isMeleeWeapon(weapon),
      extra: !!parsedWeaponKeywords(modifierText || weapon?.modifiers || '', weapon).extraAttacks,
    });
  }

  function aggregateWeaponChoiceGroups(groups, defenderUnit, options){
    const output = [];
    const grouped = new Map();
    const order = [];
    (groups || []).forEach(group => {
      if(group.type !== 'weaponChoice'){
        output.push(group);
        return;
      }
      const altSignatures = (group.alternatives || []).map(item => weaponChoiceSignature(item, defenderUnit, options));
      const key = altSignatures.slice().sort().join('||');
      if(!grouped.has(key)){
        grouped.set(key, { template: group, alternativesBySignature: new Map(), altOrder: altSignatures });
        order.push(key);
      }
      const bucket = grouped.get(key);
      (group.alternatives || []).forEach((item, index) => {
        const signature = altSignatures[index];
        if(!bucket.alternativesBySignature.has(signature)) bucket.alternativesBySignature.set(signature, []);
        bucket.alternativesBySignature.get(signature).push(item);
      });
    });

    order.forEach(key => {
      const bucket = grouped.get(key);
      const alternatives = bucket.altOrder.map(signature => {
        const items = bucket.alternativesBySignature.get(signature) || [];
        const first = items[0] || {};
        return {
          weapon: multipliedWeaponProfile(first.weapon || {}, items.length),
          sourceUnit: first.sourceUnit,
        };
      }).filter(item => item.weapon);
      output.push({ ...bucket.template, alternatives });
    });
    return output;
  }

  function attackGroupCacheKey(unit, attackMode, options){
    return [
      unitIdentity(unit),
      attackMode || 'all',
      options?.combineShootingProfiles ? 1 : 0,
      options?.isMeleeEnabled?.() ? 1 : 0,
    ].join('|');
  }

  function cloneAttackGroup(group){
    return {
      ...group,
      alternatives: Array.isArray(group?.alternatives)
        ? group.alternatives.map(item => ({ ...item }))
        : group?.alternatives,
    };
  }

  function baseAttackGroupsForUnit(unit, attackMode, options){
    const key = options?._attackGroupCache ? attackGroupCacheKey(unit, attackMode, options) : '';
    if(key && options._attackGroupCache.has(key)){
      return options._attackGroupCache.get(key).map(cloneAttackGroup);
    }
    const groups = aggregateWeaponChoiceGroups(
      leafAttackUnits(unit).flatMap(leaf => attackGroupsForLeaf(leaf, null, options)),
      null,
      options
    );
    if(key) options._attackGroupCache.set(key, groups.map(cloneAttackGroup));
    return groups;
  }

  function attackGroupsForUnit(unit, defenderUnit, attackMode, options){
    const groups = baseAttackGroupsForUnit(unit, attackMode, options);
    additionalMortalDamage(unit, defenderUnit, attackMode, options).forEach(item => {
      groups.push({ type:'mortal', sourceUnit: unit, item });
    });
    return groups;
  }

  function cloneStateForPhaseChoice(state){
    const cloned = (state || []).map(line => ({
      ...cloneTargetLine(line),
      remainingPool: Number(line?.remainingPool) || 0,
    }));
    cloned._lastTargetLine = state?._lastTargetLine
      ? cloned.find(line => line.unit === state._lastTargetLine.unit && line.index === state._lastTargetLine.index) || null
      : null;
    return cloned;
  }

  function phaseChoiceOptionGroups(groups, defenderUnit, options, phase){
    const bySignature = new Map();
    (groups || []).forEach(group => {
      if(group.type !== 'weaponChoice') return;
      const weapon = group.alternatives?.[0]?.weapon;
      if(weaponPhase(weapon) !== phase) return;
      (group.alternatives || []).forEach(item => {
        if(!itemMayHavePhaseChoice(item)) return;
        const baseModifierText = options.effectiveWeaponModifiers
          ? options.effectiveWeaponModifiers(item.weapon, item.sourceUnit, defenderUnit)
          : (item.weapon?.modifiers || '');
        darkPactChoiceGroupsFromText(baseModifierText).forEach(choiceGroup => {
          const signature = choiceGroup.map(option => option.toLowerCase()).sort().join('|');
          if(!bySignature.has(signature)) bySignature.set(signature, choiceGroup);
        });
      });
    });
    return [...bySignature.values()];
  }

  function simulatePhaseChoiceDamage(groups, defenderUnit, baseState, options, phase, selections){
    const state = cloneStateForPhaseChoice(baseState);
    const localOptions = {
      ...options,
      includeFormula: false,
      _phaseChoiceSelections: {
        ...(options?._phaseChoiceSelections || {}),
        [phase]: selections,
      },
    };
    const remaining = (groups || [])
      .filter(group => group.type === 'weaponChoice')
      .filter(group => weaponPhase(group.alternatives?.[0]?.weapon) === phase)
      .map((group, index) => ({ ...group, index }));
    let dmg = 0;
    while(remaining.length){
      const choices = remaining.map((group, index) => {
        const alternatives = (group.alternatives || [])
          .map(item => bestWeaponVariantForState(item.weapon, item.sourceUnit, defenderUnit, state, localOptions))
          .filter(Boolean);
        const bestAlternative = alternatives.reduce((winner, candidate) => candidate.firstTargetDamage > (winner?.firstTargetDamage ?? -1) ? candidate : winner, null);
        return {
          group,
          groupIndex: index,
          firstTargetDamage: bestAlternative?.firstTargetDamage || 0,
          choice: bestAlternative,
        };
      });
      const selected = choices.reduce((winner, candidate) => {
        if(candidate.firstTargetDamage > (winner?.firstTargetDamage ?? -1)) return candidate;
        if(Math.abs(candidate.firstTargetDamage - (winner?.firstTargetDamage ?? 0)) <= 1e-9 && candidate.group.index < winner.group.index) return candidate;
        return winner;
      }, choices[0]);
      remaining.splice(selected.groupIndex, 1);
      if(!selected.choice) continue;
      const applied = applyWeaponToState(selected.choice, defenderUnit, state, localOptions);
      dmg += applied.dmg;
    }
    return dmg;
  }

  function choosePhaseChoiceSelections(groups, defenderUnit, state, options){
    if(!(groups || []).some(group => group.type === 'weaponChoice' && (group.alternatives || []).some(itemMayHavePhaseChoice))){
      return {};
    }
    const selections = {};
    ['shooting', 'melee'].forEach(phase => {
      const optionGroups = phaseChoiceOptionGroups(groups, defenderUnit, options, phase);
      if(!optionGroups.length) return;
      const variants = cartesianChoiceSelections(optionGroups);
      const best = variants
        .map(selection => ({
          selection,
          dmg: simulatePhaseChoiceDamage(groups, defenderUnit, state, options, phase, selection),
        }))
        .reduce((winner, candidate) => candidate.dmg > (winner?.dmg ?? -1) ? candidate : winner, null);
      if(best?.selection?.length) selections[phase] = best.selection;
    });
    return selections;
  }

  function killChanceFromExpectedDamage(expectedDamage, woundPool){
    const lambda = parseFloat(expectedDamage);
    const target = Math.ceil(parseFloat(woundPool));
    if(!Number.isFinite(lambda) || lambda <= 0 || !Number.isFinite(target) || target <= 0) return 0;

    // The calculator is expectation-based; use a Poisson tail as a bounded estimate
    // for the chance that total damage reaches the target wound pool.
    if(lambda > 700) return 0.999;
    let term = Math.exp(-lambda);
    let cumulative = term;
    for(let k = 1; k < target; k++){
      term *= lambda / k;
      cumulative += term;
      if(!Number.isFinite(cumulative)) return 0.999;
    }
    return Math.max(0, Math.min(0.999, 1 - cumulative));
  }

  function exactStateKey(models, wounds){
    return `${models}|${wounds}`;
  }

  function addExactState(map, models, wounds, probability, spillMass=0, overkillMass=0){
    if(probability <= 0) return;
    const key = exactStateKey(models, wounds);
    const current = map.get(key) || { models, wounds, probability:0, spillMass:0, overkillMass:0 };
    current.probability += probability;
    current.spillMass += spillMass;
    current.overkillMass += overkillMass;
    map.set(key, current);
  }

  function binomialDistribution(trials, successProbability){
    const n = Math.max(0, Math.round(Number(trials) || 0));
    const p = Math.max(0, Math.min(1, Number(successProbability) || 0));
    const cacheKey = `${n}|${p}`;
    if(binomialCache.has(cacheKey)) return binomialCache.get(cacheKey);
    let dist = [1];
    for(let i = 0; i < n; i++){
      const next = Array(dist.length + 1).fill(0);
      dist.forEach((probability, successes) => {
        next[successes] += probability * (1 - p);
        next[successes + 1] += probability * p;
      });
      dist = next;
    }
    const result = dist.map((probability, value) => ({ value, probability }));
    binomialCache.set(cacheKey, result);
    return result;
  }

  function exactDamageDistribution(weapon, kw){
    return (window.WeaponCalc.diceDistribution?.(weapon?.D, kw.damageAdd || 0) || [{ value:window.WeaponCalc.parseNdX(weapon?.D).mean, probability:1 }])
      .map(entry => ({
        value: Math.ceil(Math.max(0, Number(entry.value) || 0) / Math.max(1, Number(kw.damageDivisor) || 1)),
        probability: Number(entry.probability) || 0,
      }))
      .filter(entry => entry.probability > 0);
  }

  function applyExactDamageEvent(states, eventProbability, damageDistribution, modelWounds, pFnp){
    const next = new Map();
    states.forEach(state => {
      addExactState(next, state.models, state.wounds, state.probability * (1 - eventProbability), state.spillMass * (1 - eventProbability), state.overkillMass * (1 - eventProbability));
      damageDistribution.forEach(damageEntry => {
        const branchProbability = eventProbability * damageEntry.probability;
        if(branchProbability <= 0) return;
        if(state.models <= 0){
          const allocatedDamage = Math.min(damageEntry.value, modelWounds);
          const spill = Math.max(0, damageEntry.value - allocatedDamage);
          binomialDistribution(allocatedDamage, 1 - pFnp).forEach(fnpEntry => {
            const probability = state.probability * branchProbability * fnpEntry.probability;
            addExactState(
              next,
              0,
              0,
              probability,
              (state.spillMass * branchProbability * fnpEntry.probability) + (probability * spill),
              (state.overkillMass * branchProbability * fnpEntry.probability) + (probability * fnpEntry.value)
            );
          });
          return;
        }
        const allocatedDamage = Math.min(damageEntry.value, state.wounds);
        const spill = Math.max(0, damageEntry.value - allocatedDamage);
        binomialDistribution(allocatedDamage, 1 - pFnp).forEach(fnpEntry => {
          const probability = state.probability * branchProbability * fnpEntry.probability;
          let models = state.models;
          let wounds = state.wounds - fnpEntry.value;
          if(wounds <= 0){
            models -= 1;
            wounds = models > 0 ? modelWounds : 0;
          }
          addExactState(
            next,
            models,
            wounds,
            probability,
            (state.spillMass * branchProbability * fnpEntry.probability) + (probability * spill),
            state.overkillMass * branchProbability * fnpEntry.probability
          );
        });
      });
    });
    return next;
  }

  function applyExactWoundHits(states, count, damageProbability, damageDistribution, modelWounds, pFnp){
    let next = states;
    for(let i = 0; i < count; i++){
      next = applyExactDamageEvent(next, damageProbability, damageDistribution, modelWounds, pFnp);
    }
    return next;
  }

  function applyExactBaseAttack(states, formula, weapon, kw, modelWounds){
    const probs = formula.probabilities || {};
    const pHit = Math.max(0, Math.min(1, Number(probs.pHit) || 0));
    const pCrit = Math.max(0, Math.min(pHit, Number(probs.pCrit) || 0));
    const pSave = Math.max(0, Math.min(1, Number(probs.pSave) || 0));
    const pWound = Math.max(0, Math.min(1, Number(probs.pWound) || 0));
    const pCriticalWound = kw.devw ? Math.max(0, Math.min(pWound, Number(probs.pCriticalWound) || 0)) : 0;
    const normalDamageProbability = Math.max(0, pWound - pCriticalWound) * (1 - pSave);
    const woundDamageProbability = Math.min(1, normalDamageProbability + pCriticalWound);
    const lethalDamageProbability = 1 - pSave;
    const sustained = Math.max(0, Math.round(Number(probs.sustained) || 0));
    const damageDistribution = exactDamageDistribution(weapon, kw);
    const pFnp = Math.max(0, Math.min(1, Number(probs.pFnp) || 0));
    const output = new Map();
    const runBranch = (branchProbability, normalHits, lethalHits=0) => {
      if(branchProbability <= 0) return;
      const seeded = new Map();
      states.forEach(state => addExactState(seeded, state.models, state.wounds, state.probability * branchProbability, state.spillMass * branchProbability, state.overkillMass * branchProbability));
      let branch = applyExactWoundHits(seeded, lethalHits, lethalDamageProbability, damageDistribution, modelWounds, pFnp);
      branch = applyExactWoundHits(branch, normalHits, woundDamageProbability, damageDistribution, modelWounds, pFnp);
      branch.forEach(state => addExactState(output, state.models, state.wounds, state.probability, state.spillMass, state.overkillMass));
    };
    runBranch(1 - pHit, 0);
    runBranch(pHit - pCrit, 1);
    if(kw.lethal) runBranch(pCrit, sustained, 1);
    else runBranch(pCrit, 1 + sustained);
    return output;
  }

  function exactProfileSequence(initialLine, choices){
    const cacheKey = JSON.stringify({
      defense: {
        T:initialLine?.def?.T, Sv:initialLine?.def?.Sv, Inv:initialLine?.def?.Inv,
        W:initialLine?.def?.W, Fnp:initialLine?.def?.Fnp, models:initialLine?.models,
        cover:!!initialLine?.def?.cover,
        keywords:[...(initialLine?.unit?._keywords || []), ...(initialLine?.def?.keywords || []), ...(initialLine?.def?._keywords || [])].map(String).sort(),
      },
      choices: choices.map(choice => ({
        A:choice.weapon?.A, skill:choice.weapon?.skill, S:choice.weapon?.S,
        AP:choice.weapon?.AP, D:choice.weapon?.D, text:choice.text,
      })),
    });
    if(exactSequenceCache.has(cacheKey)) return exactSequenceCache.get(cacheKey);
    const modelWounds = Math.max(1, Math.round(parseFloat(initialLine?.def?.W) || 0));
    const initialModels = Math.max(1, Math.round(Number(initialLine?.models) || (Number(initialLine?.pool) / modelWounds) || 1));
    let states = new Map([[exactStateKey(initialModels, modelWounds), {
      models:initialModels,
      wounds:modelWounds,
      probability:1,
      spillMass:0,
      overkillMass:0,
    }]]);
    let previousDamage = 0;
    let previousKills = 0;
    let previousSpill = 0;
    let previousOverkill = 0;
    const profiles = [];
    const expectedDamage = current => [...current.values()].reduce((sum, state) => {
      const remaining = state.models > 0 ? ((state.models - 1) * modelWounds) + state.wounds : 0;
      return sum + state.probability * ((initialModels * modelWounds) - remaining);
    }, 0);
    const expectedKills = current => [...current.values()].reduce((sum, state) => sum + state.probability * (initialModels - state.models), 0);
    const expectedSpill = current => [...current.values()].reduce((sum, state) => sum + state.spillMass, 0);
    const expectedOverkill = current => [...current.values()].reduce((sum, state) => sum + state.overkillMass, 0);

    for(const choice of choices){
      const formula = calcOneWeaponCached(choice.weapon, defensePayloadForLine(initialLine), choice.text, {}, 'formula').formula;
      const kw = parsedWeaponKeywords(choice.text || choice.weapon?.modifiers || '', choice.weapon);
      const attackMean = window.WeaponCalc.parseNdX(choice.weapon?.A).mean || 0;
      const attackAdd = Math.max(0, (Number(formula.attacks) || 0) - attackMean);
      const attackDistribution = window.WeaponCalc.diceDistribution?.(choice.weapon?.A, attackAdd) || [{ value:formula.attacks, probability:1 }];
      const combined = new Map();
      attackDistribution.forEach(attackEntry => {
        let branch = new Map();
        states.forEach(state => addExactState(branch, state.models, state.wounds, state.probability * attackEntry.probability, state.spillMass * attackEntry.probability, state.overkillMass * attackEntry.probability));
        const attackCount = Math.max(0, Math.round(Number(attackEntry.value) || 0));
        for(let attack = 0; attack < attackCount; attack++) branch = applyExactBaseAttack(branch, formula, choice.weapon, kw, modelWounds);
        branch.forEach(state => addExactState(combined, state.models, state.wounds, state.probability, state.spillMass, state.overkillMass));
      });
      states = combined;
      const damage = expectedDamage(states);
      const kills = expectedKills(states);
      const spill = expectedSpill(states);
      const overkill = expectedOverkill(states);
      const meanDamage = exactDamageDistribution(choice.weapon, kw)
        .reduce((sum, entry) => sum + entry.value * entry.probability, 0);
      const rawDamage = (Number(formula?.totals?.unsavedNormal) + Number(formula?.totals?.mortals))
        * meanDamage
        * (1 - (Number(formula?.probabilities?.pFnp) || 0));
      profiles.push({
        damage:damage - previousDamage,
        overkill:overkill - previousOverkill,
        totalDamage:(damage - previousDamage) + (overkill - previousOverkill),
        kills:kills - previousKills,
        spill:spill - previousSpill,
        rawDamage,
        expectedModelsBefore:initialModels - previousKills,
        expectedModelsRemaining:initialModels - kills,
      });
      previousDamage = damage;
      previousKills = kills;
      previousSpill = spill;
      previousOverkill = overkill;
    }
    const result = {
      damage:previousDamage + previousOverkill,
      appliedDamage:previousDamage,
      kills:previousKills,
      destroyChance:[...states.values()].filter(state => state.models === 0).reduce((sum, state) => sum + state.probability, 0),
      profiles,
    };
    exactSequenceCache.set(cacheKey, result);
    if(exactSequenceCache.size > 5000) exactSequenceCache.delete(exactSequenceCache.keys().next().value);
    return result;
  }

  function computeCell(attackerUnit, defenderUnit, options){
    if(options && !options._weaponCalcCache) options._weaponCalcCache = new Map();
    if(options && !options._targetLinesCache) options._targetLinesCache = new Map();
    if(options && !options._attackGroupCache) options._attackGroupCache = new Map();
    if(options && !options._variantCache) options._variantCache = new Map();
    const metric = options?.metric || 'damage';
    const def = effectiveDefense(defenderUnit, options, attackerUnit);
    const attackMode = attackerUnit?._attackMode || 'all';
    const state = defenderState(defenderUnit, options, attackerUnit);
    const exactInitialLine = state.length === 1 ? cloneTargetLine(state[0]) : null;
    const unitWoundPool = totalStateWounds(state) || defenderWoundPool(def, defenderUnit);
    const groups = attackGroupsForUnit(attackerUnit, defenderUnit, attackMode, options);
    if(groups.length === 0) return emptyCell();

    let dmg = 0;
    let kills = 0;
    const selectedProfiles = [];
    const selectedFormulaItems = [];
    const selectedProfileModifiers = [];
    const exactChoices = [];
    const exactFormulaItems = [];
    const preDamageGroups = groups.filter(group => group.type === 'mortal' && (group.item?.phase || group.phase) === 'preDamage');
    const postDamageGroups = groups.filter(group => group.type === 'mortal' && (group.item?.phase || group.phase) === 'postDamage');
    const hasInlineMortalGroups = groups.some(group => group.type === 'mortal' && !['preDamage', 'postDamage'].includes(group.item?.phase || group.phase));
    const remainingGroups = groups
      .filter(group => !(group.type === 'mortal' && ['preDamage', 'postDamage'].includes(group.item?.phase || group.phase)))
      .map((group, index) => ({ ...group, index }));

    const applyMortalGroup = (group, phase) => {
      const allocated = applyFlatDamageToState(group.item?.dmg, state, false);
      dmg += allocated.dmg;
      kills += allocated.kills;
      selectedProfiles.push(group.item.profile);
      if(options.includeFormula){
        selectedFormulaItems.push({
          ...mortalFormulaItem({ ...group.item, allocated, phase }, defenderUnit),
          totalDamage: allocated.dmg,
          totalKills: allocated.kills,
        });
      }
    };

    preDamageGroups.forEach(group => applyMortalGroup(group, 'preDamage'));
    const phaseChoiceSelections = choosePhaseChoiceSelections(remainingGroups, defenderUnit, state, options);
    const attackOptions = Object.keys(phaseChoiceSelections).length
      ? { ...options, _phaseChoiceSelections: phaseChoiceSelections }
      : options;

    while(remainingGroups.length){
      const choices = remainingGroups.map((group, index) => {
        if(group.type === 'mortal'){
          return {
            group,
            groupIndex: index,
            firstTargetDamage: group.item?.dmg || 0,
            mortal: group.item,
          };
        }
        const alternatives = (group.alternatives || [])
          .map(item => bestWeaponVariantForState(item.weapon, item.sourceUnit, defenderUnit, state, attackOptions))
          .filter(Boolean);
        const bestAlternative = alternatives.reduce((winner, candidate) => candidate.firstTargetDamage > (winner?.firstTargetDamage ?? -1) ? candidate : winner, null);
        return {
          group,
          groupIndex: index,
          firstTargetDamage: bestAlternative?.firstTargetDamage || 0,
          choice: bestAlternative,
        };
      });
      const selected = choices.reduce((winner, candidate) => {
        if(candidate.firstTargetDamage > (winner?.firstTargetDamage ?? -1)) return candidate;
        if(Math.abs(candidate.firstTargetDamage - (winner?.firstTargetDamage ?? 0)) <= 1e-9 && candidate.group.index < winner.group.index) return candidate;
        return winner;
      }, choices[0]);
      remainingGroups.splice(selected.groupIndex, 1);

      if(selected.mortal){
        const allocated = applyFlatDamageToState(selected.mortal.dmg, state, false);
        dmg += allocated.dmg;
        kills += allocated.kills;
        selectedProfiles.push(selected.mortal.profile);
        if(options.includeFormula){
          selectedFormulaItems.push({
            ...mortalFormulaItem({ ...selected.mortal, allocated }, defenderUnit),
            totalDamage: allocated.dmg,
            totalKills: allocated.kills,
          });
        }
        continue;
      }

      if(!selected.choice) continue;
      const applied = applyWeaponToState(selected.choice, defenderUnit, state, attackOptions);
      dmg += applied.dmg;
      kills += applied.kills;
      selectedProfiles.push(weaponProfileEntry(selected.choice.weapon));
      selectedProfileModifiers.push(...profileModifierEntries(
        selected.choice.weapon,
        selected.choice.text,
        selected.choice.firstLine?.def ? { ...selected.choice.firstLine.def, models: selected.choice.firstLine.models } : null
      ));
      exactChoices.push(selected.choice);
      if(options.includeFormula && applied.formula){
        selectedFormulaItems.push(applied.formula);
        exactFormulaItems.push(applied.formula);
      }
    }

    postDamageGroups.forEach(group => applyMortalGroup(group, 'postDamage'));

    let exactDestroyChance = null;
    const canUseExactDistribution = exactInitialLine
      && preDamageGroups.length === 0
      && postDamageGroups.length === 0
      && !hasInlineMortalGroups
      && exactChoices.length > 0;
    if(canUseExactDistribution){
      const exact = exactProfileSequence(exactInitialLine, exactChoices);
      dmg = exact.damage;
      kills = exact.kills;
      exact.profiles.forEach((profile, index) => {
        const item = exactFormulaItems[index];
        const line = item?.lines?.[0];
        if(!item || !line) return;
        const allocation = line.allocation || (line.allocation = {});
        allocation.overkill = false;
        line.modelsLeft = profile.expectedModelsBefore;
        line.appliedDamage = profile.damage;
        allocation.appliedDamage = profile.damage;
        allocation.normalApplied = profile.damage;
        allocation.rawDamageTotal = profile.rawDamage;
        allocation.rawSpillLoss = profile.spill;
        allocation.overkillDamage = profile.overkill;
        allocation.rawDamageRemaining = 0;
        allocation.remainingFraction = 0;
        allocation.killedModels = profile.kills;
        allocation.expectedDestroyedModels = profile.kills;
        item.totalDamage = profile.totalDamage;
        item.totalKills = profile.kills;
      });
      exactDestroyChance = exact.destroyChance;
    }

    return {
      dmg,
      kills,
      pctModelWounds: unitWoundPool ? dmg / unitWoundPool : null,
      pctUnitKilled: unitWoundPool ? (Number.isFinite(exactDestroyChance) ? exactDestroyChance : killChanceFromExpectedDamage(dmg, unitWoundPool)) : null,
      weaponName: formatProfiles(selectedProfiles),
      profileModifierText: formatProfileModifiers(selectedProfileModifiers),
      profilesUsed: aggregateProfiles(selectedProfiles),
      ...(options.includeFormula ? { formulaItems: selectedFormulaItems } : {}),
    };
  }

  window.MatchupEngine = {
    emptyCell,
    isMeleeWeapon,
    weaponMatchesAttackMode,
    metricValue,
    metricRange,
    colorForValue,
    colorHexForValue,
    weaponProfileCount,
    weaponProfileLabel,
    weaponProfileEntry,
    aggregateProfiles,
    formatProfiles,
    shootingChoiceKey,
    defenderWoundPool,
    killChanceFromExpectedDamage,
    computeCell,
  };
})();
