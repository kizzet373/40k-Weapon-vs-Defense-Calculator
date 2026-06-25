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

  function expectedCappedDamage(expr, modelWounds, flatMod=0){
    const cap = parseFloat(modelWounds);
    const distribution = diceDistribution(expr, flatMod);
    return distribution.reduce((sum, entry) => {
      const damage = Math.max(0, entry.value);
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
    let skillTargetMod = 0;
    let critMin = 6;
    let rerollHits = 'none';
    let rerollWounds = 'none';
    let ignoreHitPenalties = false;

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
      const skillMatch = text.match(/\b(?:BS|WS|Skill)\s*([+-]\d+)\b/i);
      if(skillMatch) skillTargetMod -= parseFloat(skillMatch[1]) || 0;
      if(/\bReroll\s+Hits?\b/i.test(text) || /\bRe-roll\s+Hits?\b/i.test(text)) rerollHits = bestRerollMode(rerollHits, /\b(?:of\s+)?1s?\b/i.test(text) ? 'ones' : 'all');
      if(/\bReroll\s+Wounds?\b/i.test(text) || /\bRe-roll\s+Wounds?\b/i.test(text)) rerollWounds = bestRerollMode(rerollWounds, /\b(?:of\s+)?1s?\b/i.test(text) ? 'ones' : 'all');
      if(/\bIgnore\s+Hit\s+Penalties\b/i.test(text)) ignoreHitPenalties = true;
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
      hitRollMod: capRollModifier(hitPositive, hitNegative),
      woundRollMod: capRollModifier(woundPositive + (has(/\bLance\b/i) ? 1 : 0), woundNegative),
      critMin,
      attacksAdd,
      strengthAdd,
      apAdd,
      damageAdd,
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
    const cappedD = expectedCappedDamage(weapon?.D, def.W, kw.damageAdd || 0);
    const fnp = parseFloat(def?.Fnp ?? def?.fnp) || 0;
    const critMin = kw.critMin || 6;

    let pHit = 0;
    let pCrit = 0;
    if(skill === 0 || skill === 1 || String(weapon?.skill || '').trim().toLowerCase() === 'auto' || kw.torrent){
      pHit = 1;
      pCrit = 0;
    }else{
      pHit = applyRerolls(probAtLeast(skill, kw.hitRollMod || 0, null), kw.rerollHits || 'none');
      pCrit = applyRerolls((7 - critMin) / 6, kw.rerollHits || 'none');
    }

    const expectedHits = A * (pHit + ((kw.sustained || 0) * pCrit));
    const needed = clamp(woundNeeded(S, def.T), 2, 6);
    const pWound = applyRerolls(probAtLeast(needed, kw.woundRollMod || 0, null), kw.rerollWounds || 'none');
    const critPortionOfHits = pHit > 0 ? (pCrit / pHit) : 0;
    const applicableAnti = (kw.antiRules || [])
      .filter(rule => targetHasKeyword(def, rule.target))
      .map(rule => rule.value)
      .filter(value => Number.isFinite(value) && value > 0);
    const bestAnti = applicableAnti.length ? Math.min(...applicableAnti) : (kw.anti || 0);
    const pAntiWound = bestAnti > 0
      ? applyRerolls(probAtLeast(bestAnti, 0, null), kw.rerollWounds || 'none')
      : 0;
    const pWoundRollSuccess = Math.max(pWound, pAntiWound);
    const pLethalAmongHits = kw.lethal ? critPortionOfHits : 0;
    const lethalWounds = expectedHits * pLethalAmongHits;
    const woundRollHits = expectedHits * (1 - pLethalAmongHits);
    const expectedWoundsFromRolls = woundRollHits * pWoundRollSuccess;
    const expectedWounds = lethalWounds + expectedWoundsFromRolls;
    const neededSave = pickSave(def.sv, def.inv, AP, 0);
    const pSave = neededSave >= 7 ? 0 : (7 - clamp(neededSave, 2, 6)) / 6;
    const criticalWoundTarget = bestAnti > 0 ? Math.min(bestAnti, critMin) : critMin;
    const criticalWounds = kw.devw
      ? Math.min(expectedWoundsFromRolls, woundRollHits * applyRerolls(probAtLeast(criticalWoundTarget, 0, null), kw.rerollWounds || 'none'))
      : 0;
    const normalWounds = Math.max(0, expectedWounds - criticalWounds);
    const unsavedNormal = normalWounds * (1 - pSave);
    const mortals = criticalWounds;
    const pFnp = fnp > 0 ? ((7 - clamp(fnp, 2, 6)) / 6) : 0;
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
        defense: { T: def.T, sv: def.sv, inv: def.inv, W: def.W, Fnp: fnp, keywords: [...(def?.keywords || []), ...(def?._keywords || [])] },
        probabilities: { pHit, pCrit, pWound, pAntiWound, pWoundRollSuccess, pSave, pFnp },
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

    let pHit = 0;
    let pCrit = 0;
    if(skill === 1 || String(weapon.skill).trim().toLowerCase() === 'auto' || mods.torrent){
      pHit = 1;
      pCrit = 0;
    }else{
      const heavyBonus = (mods.heavy && mods.stationary) ? 1 : 0;
      pHit = applyRerolls(probAtLeast(skill, heavyBonus, mods.forceHit || null), rrHit);
      pCrit = applyRerolls((7 - critMin) / 6, rrHit);
    }

    const extraHitsPerAttack = (mods.sustained || 0) * pCrit;
    const expectedHits = Aeff * (pHit + extraHitsPerAttack);
    const need = woundNeeded(S, T);
    const neededAfterMod = clamp(need + (mods.charged ? 1 : 0), 2, 6);
    const pWound = applyRerolls(probAtLeast(neededAfterMod, 0, mods.forceWound || null), rrWound);
    const critPortionOfHits = pHit > 0 ? (pCrit / pHit) : 0;
    const pLethalAmongHits = mods.lethal ? critPortionOfHits : 0;
    const expectedWounds = expectedHits * (pLethalAmongHits + (1 - pLethalAmongHits) * pWound);
    const coverMod = (defense.cover && !mods.ignoresCover) ? -1 : 0;
    const neededSave = pickSave(sv, inv, AP, coverMod);
    const pSave = neededSave >= 7 ? 0 : (7 - clamp(neededSave, 2, 6)) / 6;
    const pWoundCrit = applyRerolls((7 - critMin) / 6, rrWound);
    const portionDevastating = mods.devw ? Math.min(1, pWoundCrit) : 0;
    const unsavedNormal = expectedWounds * (1 - portionDevastating) * (1 - pSave);
    const mortals = expectedWounds * portionDevastating;
    const DwithMelta = Math.max(0, D + (mods.melta > 0 ? mods.melta : 0));
    const effD = Math.max(0, DwithMelta - dmgRed);
    const cappedEffD = expectedCappedDamage(weapon.D, W, (mods.melta > 0 ? mods.melta : 0) - dmgRed);
    const dmgNormal = unsavedNormal * cappedEffD;
    const dmgMortal = mortals * effD;
    const pFnp = fnp > 0 ? ((7 - clamp(fnp, 2, 6)) / 6) : 0;
    const totalDamage = (dmgNormal + dmgMortal) * (1 - pFnp);
    const modelsKilled = W > 0 ? (totalDamage / W) : 0;
    const expectedUnsavedIncludingMortals = unsavedNormal + mortals;

    return {
      inputs: { A, Aeff, D, effD, W, neededAfterMod, neededSave },
      probabilities: { pHit, pCrit, pWound, pSave, portionDevastating, extraHitsPerAttack },
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
