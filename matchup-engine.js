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

  function fnpDamageMultiplier(def){
    const fnp = parseFloat(def?.Fnp ?? def?.fnp);
    if(!Number.isFinite(fnp) || fnp <= 0) return 1;
    return 1 - ((7 - Math.max(2, Math.min(6, fnp))) / 6);
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
    const def = defenderUnit?.defense || {};
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
      const chargeMortals = chargeMortalDamage(attackerUnit, attackMode, options);
      const chargeDamage = chargeMortals.dmg * fnpDamageMultiplier(def);
      const dmg = childCells.reduce((total, cell) => total + (cell?.dmg || 0), 0) + chargeDamage;
      const kills = childCells.reduce((total, cell) => total + (cell?.kills || 0), 0) + (W > 0 ? chargeDamage / W : 0);
      const profilesUsed = aggregateProfiles([
        ...childCells.flatMap(cell => cell?.profilesUsed || []),
        ...(chargeMortals.profile ? [chargeMortals.profile] : []),
      ]);
      return {
        dmg,
        kills,
        pctModelWounds: unitWoundPool ? dmg / unitWoundPool : null,
        pctUnitKilled: unitWoundPool ? killChanceFromExpectedDamage(dmg, unitWoundPool) : null,
        weaponName: formatProfiles(profilesUsed),
        profilesUsed,
      };
    }

    const enabled = (attackerUnit?.weapons || [])
      .filter(w => options.isWeaponEnabled(w))
      .filter(w => weaponMatchesAttackMode(w, attackMode));
    if(enabled.length === 0) return emptyCell();

    const evalOne = (w) => {
      const modifierText = options.effectiveWeaponModifiers(w);
      const result = window.WeaponCalc.calcOneWeapon(w, { T, sv, inv, W, Fnp }, modifierText);
      const kw = window.WeaponCalc.parseWeaponKeywords(modifierText);
      return {
        ...result,
        weapon: w,
        weaponName: w.name || '',
        profileLabel: weaponProfileLabel(w),
        profilesUsed: [weaponProfileEntry(w)],
        extraAttacks: !!kw.extraAttacks,
      };
    };

    const shooting = enabled.filter(w => !isMeleeWeapon(w)).map(evalOne);
    const melee = enabled.filter(w => isMeleeWeapon(w)).map(evalOne);
    const best = (arr) => arr.reduce((winner, candidate) => candidate.dmg > (winner?.dmg ?? -1) ? candidate : winner, null);

    let shootingSelection = { dmg: 0, kills: 0, profilesUsed: [] };
    if(shooting.length){
      const chosenShooting = chooseShootingProfiles(shooting);
      shootingSelection = selectedTotals(chosenShooting);
    }

    let meleeSelection = { dmg: 0, kills: 0, profilesUsed: [] };
    if(melee.length){
      const extra = melee.filter(x => x.extraAttacks);
      const normal = melee.filter(x => !x.extraAttacks);
      const extraTotals = selectedTotals(extra);
      const chargeMortals = chargeMortalDamage(attackerUnit, attackMode, options);
      const chargeDamage = chargeMortals.dmg * fnpDamageMultiplier(def);
      const choices = normal.length ? normal : (extra.length ? [{ dmg:0, kills:0, profilesUsed:[] }] : []);
      const winner = best(choices.map(choice => ({
        dmg: (choice?.dmg || 0) + extraTotals.dmg + chargeDamage,
        kills: (choice?.kills || 0) + extraTotals.kills + (W > 0 ? chargeDamage / W : 0),
        profilesUsed: aggregateProfiles([
          ...(choice?.profilesUsed || []),
          ...extraTotals.profilesUsed,
          ...(chargeMortals.profile ? [chargeMortals.profile] : []),
        ]),
      })));
      meleeSelection = winner || meleeSelection;
    }

    let selectedProfiles = [];
    let dmg = 0;
    let kills = 0;
    if(options.combineShootingProfiles){
      dmg = shootingSelection.dmg + meleeSelection.dmg;
      kills = shootingSelection.kills + meleeSelection.kills;
      selectedProfiles = aggregateProfiles([...shootingSelection.profilesUsed, ...meleeSelection.profilesUsed]);
    }else{
      const selected = meleeSelection.dmg > shootingSelection.dmg ? meleeSelection : shootingSelection;
      dmg = selected.dmg || 0;
      kills = selected.kills || 0;
      selectedProfiles = selected.profilesUsed || [];
    }

    return {
      dmg,
      kills,
      pctModelWounds: unitWoundPool ? dmg / unitWoundPool : null,
      pctUnitKilled: unitWoundPool ? killChanceFromExpectedDamage(dmg, unitWoundPool) : null,
      weaponName: formatProfiles(selectedProfiles),
      profilesUsed: aggregateProfiles(selectedProfiles),
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
