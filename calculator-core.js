(function(){
  function clamp(x, min, max){
    return Math.max(min, Math.min(max, x));
  }

  function parseNdX(expr){
    if(!expr) return { mean:0, text:'0' };
    const s = String(expr).replace(/\s+/g,'');
    if(/^\d+(\.\d+)?$/.test(s)) return { mean: parseFloat(s), text:s };
    const m = s.match(/^(\d+)?[dD](\d+)([\+\-]\d+)?$/);
    if(!m) return { mean: parseFloat(s) || 0, text:s };
    const n = parseInt(m[1] || '1', 10);
    const faces = parseInt(m[2], 10);
    const k = m[3] ? parseInt(m[3], 10) : 0;
    return { mean: (n * ((1 + faces) / 2)) + k, text:s };
  }

  function diceDistribution(expr, flatMod=0){
    const s = String(expr || '').replace(/\s+/g,'');
    if(/^\d+(\.\d+)?$/.test(s)){
      return [{ value: parseFloat(s) + flatMod, probability: 1 }];
    }
    const m = s.match(/^(\d+)?[dD](\d+)([\+\-]\d+)?$/);
    if(!m) return [{ value: (parseFloat(s) || 0) + flatMod, probability: 1 }];
    const dice = parseInt(m[1] || '1', 10);
    const faces = parseInt(m[2], 10);
    const mod = (m[3] ? parseInt(m[3], 10) : 0) + flatMod;
    if(!Number.isFinite(dice) || dice <= 0 || !Number.isFinite(faces) || faces <= 0){
      return [{ value: mod, probability: 1 }];
    }

    let counts = new Map([[0, 1]]);
    for(let i = 0; i < dice; i++){
      const next = new Map();
      counts.forEach((count, sum) => {
        for(let face = 1; face <= faces; face++){
          next.set(sum + face, (next.get(sum + face) || 0) + count);
        }
      });
      counts = next;
    }
    const total = Math.pow(faces, dice);
    return [...counts.entries()].map(([sum, count]) => ({
      value: sum + mod,
      probability: count / total,
    }));
  }

  function expectedCappedDamage(expr, modelWounds, flatMod=0, divisor=1){
    const cap = parseFloat(modelWounds);
    const distribution = diceDistribution(expr, flatMod);
    const div = parseFloat(divisor);
    const damageDivisor = Number.isFinite(div) && div > 0 ? div : 1;
    return distribution.reduce((sum, entry) => {
      const damage = Math.ceil(Math.max(0, entry.value) / damageDivisor);
      const effective = Number.isFinite(cap) && cap > 0 ? Math.min(damage, cap) : damage;
      return sum + effective * entry.probability;
    }, 0);
  }

  function probAtLeast(target, mod=0, cap=null){
    if(target === 1) return 1;
    if(target === null) return 0;
    let t = clamp(target - mod, 2, 6);
    if(cap){
      const c = parseInt(cap, 10);
      if(Number.isFinite(c)) t = Math.max(t, c);
    }
    return (7 - t) / 6;
  }

  function applyRerolls(p, mode){
    if(mode === 'none') return p;
    if(mode === 'all') return p + (1-p)*p;
    if(mode === 'ones') return p + (1/6)*p - (1/6)*p*p;
    return p;
  }

  function rollOutcome(successProbability, criticalProbability, rerollMode='none', strategy='failures'){
    const success = clamp(successProbability || 0, 0, 1);
    const critical = clamp(criticalProbability || 0, 0, success);
    if(rerollMode === 'ones'){
      return {
        success: clamp(success + (1 / 6) * success, 0, 1),
        critical: clamp(critical + (1 / 6) * critical, 0, 1),
        strategy: 'ones',
      };
    }
    if(rerollMode === 'all' && strategy === 'crits'){
      return {
        success: clamp(critical + (1 - critical) * success, 0, 1),
        critical: clamp(critical + (1 - critical) * critical, 0, 1),
        strategy: 'crits',
      };
    }
    if(rerollMode === 'all'){
      return {
        success: clamp(success + (1 - success) * success, 0, 1),
        critical: clamp(critical + (1 - success) * critical, 0, 1),
        strategy: 'failures',
      };
    }
    return { success, critical, strategy: 'none' };
  }

  function bestRerollMode(a='none', b='none'){
    if(a === 'all' || b === 'all') return 'all';
    if(a === 'ones' || b === 'ones') return 'ones';
    return 'none';
  }

  function woundNeeded(S,T){
    if(S >= 2*T) return 2;
    if(S > T) return 3;
    if(S === T) return 4;
    if(S*2 <= T) return 6;
    return 5;
  }

  function pickSave(sv, inv, ap, saveMod){
    const worsened = sv ? clamp(sv + ap, 2, 7) : 7;
    const final = saveMod ? clamp(worsened + saveMod, 2, 7) : worsened;
    return inv > 0 ? Math.min(final, inv) : final;
  }

  function splitModifierTokens(txt){
    return String(txt || '')
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);
  }

  function modifierAppliesToWeapon(token, weapon=null){
    const match = String(token || '').match(/^(Melee|Ranged|Shooting):\s*(.+)$/i);
    if(!match) return { applies: true, token };
    if(!weapon) return { applies: true, token: match[2] };
    const melee = String(weapon?.range || weapon?.Range || '').trim().toLowerCase() === 'melee'
      || String(weapon?.mode || '').toLowerCase() === 'melee';
    const wantsMelee = /^melee$/i.test(match[1]);
    const wantsRanged = /^(ranged|shooting)$/i.test(match[1]);
    return { applies: (wantsMelee && melee) || (wantsRanged && !melee), token: match[2] };
  }

  function capRollModifier(positive, negative){
    return clamp(Math.min(1, positive) + Math.max(-1, negative), -1, 1);
  }

  function normalizeKeyword(value){
    return String(value || '')
      .replace(/^Faction:\s*/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .replace(/s$/, '');
  }

  function targetHasKeyword(def, keyword){
    const wanted = normalizeKeyword(keyword);
    if(!wanted) return true;
    const keywords = [
      ...(Array.isArray(def?.keywords) ? def.keywords : []),
      ...(Array.isArray(def?._keywords) ? def._keywords : []),
    ].map(normalizeKeyword);
    return keywords.includes(wanted);
  }

  function parseWeaponKeywords(txt, weapon=null){
    const tokens = splitModifierTokens(txt)
      .map(token => modifierAppliesToWeapon(token, weapon))
      .filter(item => item.applies)
      .map(item => item.token);
    const s = tokens.join(', ');
    const has = (re) => re.test(s);
    const getNum = (re, d=0) => {
      const m = s.match(re);
      if(!m) return d;
      const n = parseFloat(m[1]);
      return Number.isFinite(n) ? n : d;
    };

    let sustained = 0;
    let anti = 0;
    const antiRules = [];
    let hitPositive = 0;
    let hitNegative = 0;
    let woundPositive = 0;
    let woundNegative = 0;
    let attacksAdd = 0;
    let strengthAdd = 0;
    let apAdd = 0;
    let damageAdd = 0;
    let damageDivisor = 1;
    let skillTargetMod = 0;
    let critMin = 6;
    let rerollHits = 'none';
    let rerollWounds = 'none';
    let ignoreHitPenalties = false;
    let ignoresCover = false;

    tokens.forEach(token => {
      const text = String(token || '');
      const sustainedMatch = text.match(/\bSustained\s+Hits\s*([Dd]\d+|\d+)\b/i);
      if(sustainedMatch) sustained = Math.max(sustained, parseNdX(sustainedMatch[1]).mean || 0);
      const antiMatch = text.match(/\bAnti(?:[-\s]+([A-Za-z][A-Za-z0-9\s-]*?))?\s*(\d)\+/i);
      if(antiMatch){
        const target = (antiMatch[1] || '').trim();
        const value = parseFloat(antiMatch[2]);
        if(Number.isFinite(value)){
          antiRules.push({ target, value });
          if(!target) anti = anti ? Math.min(anti, value) : value;
        }
      }
      const hitMatch = text.match(/\bHit\s+Rolls?\s*([+-]\d+)\b/i) || text.match(/\b([+-]\d+)\s+to\s+Hit\b/i);
      if(hitMatch){
        const value = parseFloat(hitMatch[1]);
        if(value > 0) hitPositive += value;
        if(value < 0) hitNegative += value;
      }
      const woundMatch = text.match(/\bWound\s+Rolls?\s*([+-]\d+)\b/i) || text.match(/\b([+-]\d+)\s+to\s+Wound\b/i);
      if(woundMatch){
        const value = parseFloat(woundMatch[1]);
        if(value > 0) woundPositive += value;
        if(value < 0) woundNegative += value;
      }
      const attacksMatch = text.match(/\bAttacks?\s*([+-]\d+)\b/i);
      if(attacksMatch) attacksAdd += parseFloat(attacksMatch[1]) || 0;
      const strengthMatch = text.match(/\bStrength\s*([+-]\d+)\b/i);
      if(strengthMatch) strengthAdd += parseFloat(strengthMatch[1]) || 0;
      const apMatch = text.match(/\b(?:AP|Armou?r Penetration)\s*([+-]\d+)\b/i);
      if(apMatch) apAdd += parseFloat(apMatch[1]) || 0;
      const damageMatch = text.match(/\bDamage\s*([+-]\d+)\b/i);
      if(damageMatch) damageAdd += parseFloat(damageMatch[1]) || 0;
      const damageDivisorMatch = text.match(/\bDamage\s*(?:\/|÷|divided\s+by)\s*(\d+(?:\.\d+)?)\b/i) || text.match(/\b(?:Halve|Half)\s+(?:the\s+)?Damage\b/i);
      if(damageDivisorMatch){
        const value = damageDivisorMatch[1] ? parseFloat(damageDivisorMatch[1]) : 2;
        if(Number.isFinite(value) && value > 0) damageDivisor = Math.max(damageDivisor, value);
      }
      const skillMatch = text.match(/\b(?:BS|WS|Skill)\s*([+-]\d+)\b/i);
      if(skillMatch) skillTargetMod -= parseFloat(skillMatch[1]) || 0;
      if(/\bReroll\s+Hits?\b/i.test(text) || /\bRe-roll\s+Hits?\b/i.test(text)) rerollHits = bestRerollMode(rerollHits, /\b(?:of\s+)?1s?\b/i.test(text) ? 'ones' : 'all');
      if(/\bReroll\s+Wounds?\b/i.test(text) || /\bRe-roll\s+Wounds?\b/i.test(text)) rerollWounds = bestRerollMode(rerollWounds, /\b(?:of\s+)?1s?\b/i.test(text) ? 'ones' : 'all');
      if(/\bIgnore\s+Hit\s+Penalties\b/i.test(text)) ignoreHitPenalties = true;
      if(/\bIgnores?\s+Cover\b/i.test(text)) ignoresCover = true;
      const critHitMatch = text.match(/\bCritical\s+Hits?\s*(\d)\+/i);
      if(critHitMatch) critMin = Math.min(critMin, parseFloat(critHitMatch[1]) || critMin);
    });
    if(ignoreHitPenalties) hitNegative = 0;

    return {
      torrent: has(/\bTorrent\b/i) || has(/\bAuto[-\s]?hits\b/i),
      lethal: has(/\bLethal\s+Hits\b/i),
      devw: has(/\bDevastating\s+Wounds\b/i) || has(/\bDev\s*Wounds\b/i),
      sustained,
      anti,
      antiRules,
      extraAttacks: has(/\bExtra\s+Attacks\b/i),
      precision: has(/\bPrecision\b/i),
      lance: has(/\bLance\b/i),
      rerollHits,
      rerollWounds,
      ignoreHitPenalties,
      ignoresCover,
      hitRollMod: capRollModifier(hitPositive, hitNegative),
      woundRollMod: capRollModifier(woundPositive + (has(/\bLance\b/i) ? 1 : 0), woundNegative),
      critMin,
      attacksAdd,
      strengthAdd,
      apAdd,
      damageAdd,
      damageDivisor,
      skillTargetMod,
    };
  }

  function calcOneWeapon(weapon, def, modifierText, options={}){
    const kw = parseWeaponKeywords(modifierText || weapon?.modifiers || '', weapon);
    const A = Math.max(0, parseNdX(weapon?.A).mean + (kw.attacksAdd || 0));
    const skill = Math.max(0, (parseFloat(String(weapon?.skill || '').replace('+','')) || 0) + (kw.skillTargetMod || 0));
    const S = Math.max(0, (parseFloat(weapon?.S) || 0) + (kw.strengthAdd || 0));
    const apRaw = parseFloat(weapon?.AP) || 0;
    const AP = Math.max(0, Math.abs(apRaw) + (kw.apAdd || 0));
    const D = Math.max(0, parseNdX(weapon?.D).mean + (kw.damageAdd || 0));
    const cappedD = expectedCappedDamage(weapon?.D, def.W, kw.damageAdd || 0, kw.damageDivisor || 1);
    const fnp = parseFloat(def?.Fnp ?? def?.fnp) || 0;
    const critMin = kw.critMin || 6;
    const applicableAnti = (kw.antiRules || [])
      .filter(rule => targetHasKeyword(def, rule.target))
      .map(rule => rule.value)
      .filter(value => Number.isFinite(value) && value > 0);
    const bestAnti = applicableAnti.length ? Math.min(...applicableAnti) : (kw.anti || 0);
    const coverMod = (def.cover && !kw.ignoresCover) ? -1 : 0;
    const neededSave = pickSave(def.sv, def.inv, AP, coverMod);
    const pSave = neededSave >= 7 ? 0 : (7 - clamp(neededSave, 2, 6)) / 6;
    const normalWoundDamage = (1 - pSave) * cappedD;
    const criticalWoundDamage = kw.devw ? D : normalWoundDamage;
    const pFnp = fnp > 0 ? ((7 - clamp(fnp, 2, 6)) / 6) : 0;
    const needed = clamp(woundNeeded(S, def.T), 2, 6);
    const baseWound = probAtLeast(needed, kw.woundRollMod || 0, null);
    const criticalWoundTarget = bestAnti > 0 ? Math.min(bestAnti, critMin) : critMin;
    const baseCriticalWound = probAtLeast(criticalWoundTarget, 0, null);
    const baseAntiWound = bestAnti > 0 ? probAtLeast(bestAnti, 0, null) : 0;
    const baseWoundSuccess = Math.max(baseWound, baseAntiWound, baseCriticalWound);

    function chooseWoundOutcome(){
      const candidates = (kw.rerollWounds === 'all')
        ? [rollOutcome(baseWoundSuccess, baseCriticalWound, 'all', 'failures'), rollOutcome(baseWoundSuccess, baseCriticalWound, 'all', 'crits')]
        : [rollOutcome(baseWoundSuccess, baseCriticalWound, kw.rerollWounds || 'none', 'failures')];
      const withDamage = candidates.map(outcome => {
        const normal = Math.max(0, outcome.success - (kw.devw ? outcome.critical : 0));
        const critical = kw.devw ? outcome.critical : 0;
        return {
          ...outcome,
          normalPerRoll: normal,
          criticalPerRoll: critical,
          damagePerRoll: (normal * normalWoundDamage) + (critical * criticalWoundDamage),
        };
      });
      return withDamage.reduce((best, candidate) => candidate.damagePerRoll > best.damagePerRoll ? candidate : best, withDamage[0]);
    }

    const woundOutcome = chooseWoundOutcome();

    let hitOutcome = { success: 0, critical: 0, strategy: 'none' };
    if(skill === 0 || skill === 1 || String(weapon?.skill || '').trim().toLowerCase() === 'auto' || kw.torrent){
      hitOutcome = { success: 1, critical: 0, strategy: 'auto' };
    }else{
      const baseHit = probAtLeast(skill, kw.hitRollMod || 0, null);
      const baseCrit = (7 - critMin) / 6;
      const hitCandidates = (kw.rerollHits === 'all')
        ? [rollOutcome(Math.max(baseHit, baseCrit), baseCrit, 'all', 'failures'), rollOutcome(Math.max(baseHit, baseCrit), baseCrit, 'all', 'crits')]
        : [rollOutcome(Math.max(baseHit, baseCrit), baseCrit, kw.rerollHits || 'none', 'failures')];
      const valueForHitOutcome = outcome => {
        const criticalHits = outcome.critical;
        const successfulHits = outcome.success;
        const sustainedHits = (kw.sustained || 0) * criticalHits;
        const lethalWoundsPerAttack = kw.lethal ? criticalHits : 0;
        const woundRollsPerAttack = kw.lethal
          ? Math.max(0, successfulHits - criticalHits) + sustainedHits
          : successfulHits + sustainedHits;
        return (lethalWoundsPerAttack * normalWoundDamage) + (woundRollsPerAttack * woundOutcome.damagePerRoll);
      };
      hitOutcome = hitCandidates.reduce((best, candidate) => valueForHitOutcome(candidate) > valueForHitOutcome(best) ? candidate : best, hitCandidates[0]);
    }

    const pHit = hitOutcome.success;
    const pCrit = hitOutcome.critical;
    const expectedHits = A * (pHit + ((kw.sustained || 0) * pCrit));
    const lethalWounds = kw.lethal ? A * pCrit : 0;
    const woundRollHits = A * (kw.lethal
      ? Math.max(0, pHit - pCrit) + ((kw.sustained || 0) * pCrit)
      : pHit + ((kw.sustained || 0) * pCrit));
    const expectedWoundsFromRolls = woundRollHits * woundOutcome.success;
    const expectedWounds = lethalWounds + expectedWoundsFromRolls;
    const criticalWounds = kw.devw ? woundRollHits * woundOutcome.critical : 0;
    const normalWounds = Math.max(0, expectedWounds - criticalWounds);
    const unsavedNormal = normalWounds * (1 - pSave);
    const mortals = criticalWounds;
    const totalDamage = ((unsavedNormal * cappedD) + (mortals * D)) * (1 - pFnp);
    const result = {
      dmg: totalDamage,
      kills: def.W > 0 ? (totalDamage / def.W) : 0,
    };
    if(options.includeFormula){
      result.formula = {
        weaponName: weapon?.name || 'Weapon',
        modifierText: modifierText || weapon?.modifiers || '',
        attacks: A,
        skill,
        strength: S,
        ap: AP,
        damage: D,
        cappedDamage: cappedD,
        defense: { T: def.T, sv: def.sv, inv: def.inv, W: def.W, Fnp: fnp > 0 ? fnp : null, cover: !!def.cover, keywords: [...(def?.keywords || []), ...(def?._keywords || [])] },
        probabilities: {
          pHit,
          pCrit,
          pWound: woundOutcome.success,
          pAntiWound: bestAnti > 0 ? woundOutcome.success : 0,
          pWoundRollSuccess: woundOutcome.success,
          pCriticalWound: woundOutcome.critical,
          pSave,
          pFnp,
          hitRerollStrategy: hitOutcome.strategy,
          woundRerollStrategy: woundOutcome.strategy,
        },
        totals: { expectedHits, lethalWounds, expectedWoundsFromRolls, expectedWounds, normalWounds, criticalWounds, unsavedNormal, mortals, totalDamage },
      };
    }
    return result;
  }

  function calculateProfile(input){
    const weapon = input.weapon || {};
    const defense = input.defense || {};
    const mods = input.mods || {};
    const A = parseNdX(weapon.A).mean;
    const skill = weapon.skill;
    const S = parseFloat(weapon.S) || 0;
    const AP = parseFloat(weapon.AP) || 0;
    const D = parseNdX(weapon.D).mean;
    const critMin = mods.critMin ?? 6;
    const rrHit = mods.rrHit || 'none';
    const rrWound = mods.rrWound || 'none';
    const T = parseFloat(defense.T) || 0;
    const sv = parseFloat(defense.Sv) || 7;
    const inv = parseFloat(defense.Inv) || 0;
    const W = parseFloat(defense.W) || 0;
    const fnp = parseFloat(defense.Fnp) || 0;
    const dmgRed = parseFloat(defense.DR) || 0;
    const targetModels = Math.max(1, parseInt(defense.models || '5', 10) || 5);

    const blastBonusA = mods.blast ? Math.floor(targetModels / 5) : 0;
    const rapidFireBonusA = (mods.rapidFire > 0 && mods.withinHalf) ? mods.rapidFire : 0;
    const Aeff = A + blastBonusA + rapidFireBonusA;

    const coverMod = (defense.cover && !mods.ignoresCover) ? -1 : 0;
    const neededSave = pickSave(sv, inv, AP, coverMod);
    const pSave = neededSave >= 7 ? 0 : (7 - clamp(neededSave, 2, 6)) / 6;
    const DwithMelta = Math.max(0, D + (mods.melta > 0 ? mods.melta : 0));
    const effD = Math.max(0, DwithMelta - dmgRed);
    const cappedEffD = expectedCappedDamage(weapon.D, W, (mods.melta > 0 ? mods.melta : 0) - dmgRed);
    const normalWoundDamage = (1 - pSave) * cappedEffD;
    const criticalWoundDamage = mods.devw ? effD : normalWoundDamage;
    const need = woundNeeded(S, T);
    const neededAfterMod = clamp(need + (mods.charged ? 1 : 0), 2, 6);
    const baseWoundSuccess = probAtLeast(neededAfterMod, 0, mods.forceWound || null);
    const baseCriticalWound = (7 - critMin) / 6;
    const woundCandidates = rrWound === 'all'
      ? [rollOutcome(Math.max(baseWoundSuccess, baseCriticalWound), baseCriticalWound, 'all', 'failures'), rollOutcome(Math.max(baseWoundSuccess, baseCriticalWound), baseCriticalWound, 'all', 'crits')]
      : [rollOutcome(Math.max(baseWoundSuccess, baseCriticalWound), baseCriticalWound, rrWound, 'failures')];
    const woundOutcome = woundCandidates
      .map(outcome => {
        const critical = mods.devw ? outcome.critical : 0;
        const normal = Math.max(0, outcome.success - critical);
        return {
          ...outcome,
          damagePerRoll: (normal * normalWoundDamage) + (critical * criticalWoundDamage),
        };
      })
      .reduce((best, candidate) => candidate.damagePerRoll > best.damagePerRoll ? candidate : best);

    let hitOutcome = { success: 0, critical: 0, strategy: 'none' };
    if(skill === 1 || String(weapon.skill).trim().toLowerCase() === 'auto' || mods.torrent){
      hitOutcome = { success: 1, critical: 0, strategy: 'auto' };
    }else{
      const heavyBonus = (mods.heavy && mods.stationary) ? 1 : 0;
      const baseHit = probAtLeast(skill, heavyBonus, mods.forceHit || null);
      const baseCrit = (7 - critMin) / 6;
      const hitCandidates = rrHit === 'all'
        ? [rollOutcome(Math.max(baseHit, baseCrit), baseCrit, 'all', 'failures'), rollOutcome(Math.max(baseHit, baseCrit), baseCrit, 'all', 'crits')]
        : [rollOutcome(Math.max(baseHit, baseCrit), baseCrit, rrHit, 'failures')];
      const hitValue = outcome => {
        const sustainedHits = (mods.sustained || 0) * outcome.critical;
        const lethalWoundsPerAttack = mods.lethal ? outcome.critical : 0;
        const woundRollsPerAttack = mods.lethal
          ? Math.max(0, outcome.success - outcome.critical) + sustainedHits
          : outcome.success + sustainedHits;
        return (lethalWoundsPerAttack * normalWoundDamage) + (woundRollsPerAttack * woundOutcome.damagePerRoll);
      };
      hitOutcome = hitCandidates.reduce((best, candidate) => hitValue(candidate) > hitValue(best) ? candidate : best, hitCandidates[0]);
    }

    const pHit = hitOutcome.success;
    const pCrit = hitOutcome.critical;
    const extraHitsPerAttack = (mods.sustained || 0) * pCrit;
    const expectedHits = Aeff * (pHit + extraHitsPerAttack);
    const lethalWounds = mods.lethal ? Aeff * pCrit : 0;
    const woundRollHits = Aeff * (mods.lethal
      ? Math.max(0, pHit - pCrit) + extraHitsPerAttack
      : pHit + extraHitsPerAttack);
    const expectedWoundsFromRolls = woundRollHits * woundOutcome.success;
    const expectedWounds = lethalWounds + expectedWoundsFromRolls;
    const criticalWounds = mods.devw ? woundRollHits * woundOutcome.critical : 0;
    const normalWounds = Math.max(0, expectedWounds - criticalWounds);
    const unsavedNormal = normalWounds * (1 - pSave);
    const mortals = criticalWounds;
    const dmgNormal = unsavedNormal * cappedEffD;
    const dmgMortal = mortals * effD;
    const pFnp = fnp > 0 ? ((7 - clamp(fnp, 2, 6)) / 6) : 0;
    const totalDamage = (dmgNormal + dmgMortal) * (1 - pFnp);
    const modelsKilled = W > 0 ? (totalDamage / W) : 0;
    const expectedUnsavedIncludingMortals = unsavedNormal + mortals;

    return {
      inputs: { A, Aeff, D, effD, W, neededAfterMod, neededSave },
      probabilities: { pHit, pCrit, pWound: woundOutcome.success, pSave, portionDevastating: woundOutcome.critical, extraHitsPerAttack },
      output: { hits: expectedHits, wounds: expectedWounds, fails: unsavedNormal, dmg: totalDamage, modelsKilled },
      damageFlow: {
        baseTotalDamage: Aeff * cappedEffD,
        dmgAfterHits: expectedHits * cappedEffD,
        dmgAfterWounds: expectedWounds * cappedEffD,
        dmgAfterSaves: expectedUnsavedIncludingMortals * cappedEffD,
        dmgAfterDamageMods: dmgNormal + dmgMortal,
      },
    };
  }

  window.WeaponCalc = {
    clamp,
    parseNdX,
    expectedCappedDamage,
    probAtLeast,
    applyRerolls,
    woundNeeded,
    pickSave,
    parseWeaponKeywords,
    calcOneWeapon,
    calculateProfile,
  };
})();
