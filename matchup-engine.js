(function(){
  const emptyCell = () => ({ dmg:0, kills:0, pctModelWounds:null, pctUnitKilled:null, weaponName:'', profilesUsed:[] });

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

  function changedProfileStats(weapon, modifierText){
    const kw = window.WeaponCalc.parseWeaponKeywords(modifierText || '', weapon);
    const diceMean = value => window.WeaponCalc.parseNdX(value).mean || 0;
    const numeric = value => parseFloat(String(value ?? '').replace('+', ''));
    const stats = [
      ['A', diceMean(weapon?.A), diceMean(weapon?.A) + (kw.attacksAdd || 0), weapon?.A],
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

  function profileModifierEntries(weapon, modifierText){
    const changes = changedProfileStats(weapon, modifierText);
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
    return {
      dmg: models,
      profile: { name: 'Brass Stampede mortal wounds', count: models },
    };
  }

  function specialMortalSpecs(unit, attackMode, options){
    if(attackMode === 'shooting') return [];
    if(!options?.conditionsMet) return [];
    if(typeof options?.isMeleeEnabled === 'function' && !options.isMeleeEnabled()) return [];
    const service = window.AbilityModifierService;
    if(!service?.modifiersForRule || !service?.parseModifierSpec) return [];
    const specs = [];
    (unit?.abilities || []).forEach(ability => {
      if(!isAbilityEnabled(unit, ability, options)) return;
      service.modifiersForRule(ability).forEach(spec => {
        const parsed = service.parseModifierSpec(spec);
        if(parsed?.meta?.kind !== 'special' || parsed?.meta?.special !== 'fightPhaseMortals') return;
        const diceCount = parseInt(parsed.meta.diceCount, 10) || 0;
        const rollTarget = parseInt(parsed.meta.rollTarget, 10) || 0;
        const successChance = rollTarget > 0 ? (7 - Math.max(2, Math.min(6, rollTarget))) / 6 : 0;
        const dmg = diceCount * successChance;
        if(dmg <= 0) return;
        specs.push({
          dmg,
          profile: { name: `${ability} mortal wounds`, count: 1 },
          modifierText: parsed.modifiers?.[0] || 'Fight phase mortal wounds',
        });
      });
    });
    return specs;
  }

  function additionalMortalDamage(unit, attackMode, options){
    const items = [];
    const chargeMortals = chargeMortalDamage(unit, attackMode, options);
    if(chargeMortals.profile) items.push({ ...chargeMortals, modifierText: 'Mortal wounds on charge' });
    items.push(...specialMortalSpecs(unit, attackMode, options));
    return items;
  }

  function allocateMortalDamageItems(items, defenderUnit, options, attackerUnit){
    return (items || []).map(item => {
      const allocated = allocateFlatDamageIntoDefender(item.dmg, defenderUnit, false, options, attackerUnit);
      return { ...item, allocated };
    });
  }

  function mortalFormulaItem(item, defenderUnit){
    return {
      weaponName: item.profile.name,
      modifierText: item.modifierText || 'Mortal wounds',
      totalDamage: item.allocated?.dmg || 0,
      totalKills: item.allocated?.kills || 0,
      lines: [{ targetName: defenderUnit?.label || 'Defender', appliedDamage: item.allocated?.dmg || 0 }],
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
    const children = Array.isArray(defenderUnit?._children) ? defenderUnit._children : [];
    const units = children.length ? children : [defenderUnit];
    const lines = units
      .map((unit, index) => {
        const def = effectiveDefense(unit, options, attackerUnit);
        const pool = defenderWoundPool(def, unit);
        return {
          unit,
          index,
          def,
          pool: Number.isFinite(pool) && pool > 0 ? pool : null,
          isCharacter: isCharacterTarget(unit),
        };
      })
      .filter(line => line.def && line.pool != null);

    if(!lines.length) return [{
      unit: defenderUnit,
      index: 0,
      def: effectiveDefense(defenderUnit, options, attackerUnit),
      pool: defenderWoundPool(effectiveDefense(defenderUnit, options, attackerUnit), defenderUnit),
      isCharacter: isCharacterTarget(defenderUnit),
    }];

    return lines.sort((a, b) => {
      if(a.isCharacter !== b.isCharacter){
        return precision ? (a.isCharacter ? -1 : 1) : (a.isCharacter ? 1 : -1);
      }
      return a.index - b.index;
    });
  }

  function defensePayloadForLine(line, fallbackUnit=null){
    const def = line?.def || fallbackUnit?.defense || {};
    const unit = line?.unit || fallbackUnit || {};
    return {
      T: parseFloat(def.T) || 0,
      sv: parseFloat(def.Sv) || 0,
      inv: parseFloat(def.Inv) || 0,
      W: parseFloat(def.W) || 0,
      Fnp: parseFloat(def.Fnp) || 0,
      cover: !!def.cover,
      keywords: [...(unit._keywords || []), ...(def.keywords || []), ...(def._keywords || [])],
    };
  }

  function calcOneWeaponIntoDefender(weapon, defenderUnit, modifierText, options={}, attackerUnit=null){
    const kw = window.WeaponCalc.parseWeaponKeywords(modifierText || weapon?.modifiers || '', weapon);
    const lines = defenderTargetLines(defenderUnit, !!kw.precision, options, attackerUnit);
    if(lines.length <= 1){
      const result = window.WeaponCalc.calcOneWeapon(weapon, defensePayloadForLine(lines[0], defenderUnit), modifierText, { includeFormula: !!options.includeFormula });
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
      const result = window.WeaponCalc.calcOneWeapon(weapon, defensePayloadForLine(line, defenderUnit), modifierText, { includeFormula: !!options.includeFormula });
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

  function computeCell(attackerUnit, defenderUnit, options){
    const def = effectiveDefense(defenderUnit, options, attackerUnit);
    const T = parseFloat(def.T) || 0;
    const sv = parseFloat(def.Sv) || 0;
    const inv = parseFloat(def.Inv) || 0;
    const Fnp = parseFloat(def.Fnp) || 0;
    const W = parseFloat(def.W) || 0;
    const unitWoundPool = defenderWoundPool(def, defenderUnit);
    const attackMode = attackerUnit?._attackMode || 'all';
    const childUnits = Array.isArray(attackerUnit?._children) ? attackerUnit._children : [];
    if(childUnits.length){
      const childCells = childUnits.map(child => computeCell(child, defenderUnit, { ...options, suppressInheritedUnitAbilities: true }));
      const mortalItems = allocateMortalDamageItems(additionalMortalDamage(attackerUnit, attackMode, options), defenderUnit, options, attackerUnit);
      const mortalDmg = mortalItems.reduce((total, item) => total + (item.allocated?.dmg || 0), 0);
      const mortalKills = mortalItems.reduce((total, item) => total + (item.allocated?.kills || 0), 0);
      const dmg = childCells.reduce((total, cell) => total + (cell?.dmg || 0), 0) + mortalDmg;
      const kills = childCells.reduce((total, cell) => total + (cell?.kills || 0), 0) + mortalKills;
      const profilesUsed = aggregateProfiles([
        ...childCells.flatMap(cell => cell?.profilesUsed || []),
        ...mortalItems.map(item => item.profile),
      ]);
      const profileModifierText = childCells
        .map(cell => cell?.profileModifierText)
        .filter(Boolean)
        .filter((text, index, list) => list.indexOf(text) === index)
        .join(' | ');
      const formulaItems = options.includeFormula ? [
        ...childCells.flatMap(cell => cell?.formulaItems || []),
        ...mortalItems.map(item => mortalFormulaItem(item, defenderUnit)),
      ] : [];
      return {
        dmg,
        kills,
        pctModelWounds: unitWoundPool ? dmg / unitWoundPool : null,
        pctUnitKilled: unitWoundPool ? killChanceFromExpectedDamage(dmg, unitWoundPool) : null,
        weaponName: formatProfiles(profilesUsed),
        profileModifierText,
        profilesUsed,
        ...(options.includeFormula ? { formulaItems } : {}),
      };
    }

    const enabled = (attackerUnit?.weapons || [])
      .filter(w => options.isWeaponEnabled(w))
      .filter(w => weaponMatchesAttackMode(w, attackMode));
    if(enabled.length === 0) return emptyCell();

    const evalOne = (w) => {
      const modifierText = options.effectiveWeaponModifiers(w, attackerUnit, defenderUnit);
      const variants = window.AbilityModifierService?.modifierTextVariants
        ? window.AbilityModifierService.modifierTextVariants(modifierText)
        : [modifierText];
      const bestVariant = variants
        .map(text => ({
          text,
          result: calcOneWeaponIntoDefender(w, defenderUnit, text, options, attackerUnit),
          kw: window.WeaponCalc.parseWeaponKeywords(text, w),
        }))
        .reduce((winner, candidate) => candidate.result.dmg > (winner?.result?.dmg ?? -1) ? candidate : winner, null);
      const result = bestVariant?.result || { dmg: 0, kills: 0 };
      const kw = bestVariant?.kw || window.WeaponCalc.parseWeaponKeywords(modifierText, w);
      return {
        ...result,
        weapon: w,
        weaponName: w.name || '',
        profileLabel: weaponProfileLabel(w),
        profilesUsed: [weaponProfileEntry(w)],
        profileModifiers: profileModifierEntries(w, bestVariant?.text || modifierText),
        ...(options.includeFormula ? { formulaItems: [result.formula].filter(Boolean) } : {}),
        extraAttacks: !!kw.extraAttacks,
      };
    };

    const shooting = enabled.filter(w => !isMeleeWeapon(w)).map(evalOne);
    const melee = enabled.filter(w => isMeleeWeapon(w)).map(evalOne);
    const best = (arr) => arr.reduce((winner, candidate) => candidate.dmg > (winner?.dmg ?? -1) ? candidate : winner, null);

    let shootingSelection = { dmg: 0, kills: 0, profilesUsed: [], formulaItems: [] };
    if(shooting.length){
      const chosenShooting = chooseShootingProfiles(shooting);
      shootingSelection = selectedTotals(chosenShooting);
    }

    let meleeSelection = { dmg: 0, kills: 0, profilesUsed: [], formulaItems: [] };
    if(melee.length){
      const extra = melee.filter(x => x.extraAttacks);
      const normal = melee.filter(x => !x.extraAttacks);
      const extraTotals = selectedTotals(extra);
      const mortalItems = allocateMortalDamageItems(additionalMortalDamage(attackerUnit, attackMode, options), defenderUnit, options, attackerUnit);
      const mortalDmg = mortalItems.reduce((total, item) => total + (item.allocated?.dmg || 0), 0);
      const mortalKills = mortalItems.reduce((total, item) => total + (item.allocated?.kills || 0), 0);
      const choices = normal.length ? normal : (extra.length ? [{ dmg:0, kills:0, profilesUsed:[], formulaItems:[] }] : []);
      const winner = best(choices.map(choice => ({
        dmg: (choice?.dmg || 0) + extraTotals.dmg + mortalDmg,
        kills: (choice?.kills || 0) + extraTotals.kills + mortalKills,
        profilesUsed: aggregateProfiles([
          ...(choice?.profilesUsed || []),
          ...extraTotals.profilesUsed,
          ...mortalItems.map(item => item.profile),
        ]),
        profileModifiers: [
          ...(choice?.profileModifiers || []),
          ...extraTotals.profileModifiers,
        ],
        ...(options.includeFormula ? { formulaItems: [
          ...(choice?.formulaItems || []),
          ...extraTotals.formulaItems,
          ...mortalItems.map(item => mortalFormulaItem(item, defenderUnit)),
        ] } : {}),
      })));
      meleeSelection = winner || meleeSelection;
    }

    let selectedProfiles = [];
    let selectedFormulaItems = [];
    let selectedProfileModifiers = [];
    let dmg = 0;
    let kills = 0;
    if(options.combineShootingProfiles){
      dmg = shootingSelection.dmg + meleeSelection.dmg;
      kills = shootingSelection.kills + meleeSelection.kills;
      selectedProfiles = aggregateProfiles([...shootingSelection.profilesUsed, ...meleeSelection.profilesUsed]);
      selectedProfileModifiers = [...(shootingSelection.profileModifiers || []), ...(meleeSelection.profileModifiers || [])];
      selectedFormulaItems = [...(shootingSelection.formulaItems || []), ...(meleeSelection.formulaItems || [])];
    }else{
      const selected = meleeSelection.dmg > shootingSelection.dmg ? meleeSelection : shootingSelection;
      dmg = selected.dmg || 0;
      kills = selected.kills || 0;
      selectedProfiles = selected.profilesUsed || [];
      selectedProfileModifiers = selected.profileModifiers || [];
      selectedFormulaItems = selected.formulaItems || [];
    }

    return {
      dmg,
      kills,
      pctModelWounds: unitWoundPool ? dmg / unitWoundPool : null,
      pctUnitKilled: unitWoundPool ? killChanceFromExpectedDamage(dmg, unitWoundPool) : null,
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
