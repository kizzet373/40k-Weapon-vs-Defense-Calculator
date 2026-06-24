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

  function parseWeaponKeywords(txt){
    const s = String(txt || '');
    const has = (re) => re.test(s);
    const getNum = (re, d=0) => {
      const m = s.match(re);
      if(!m) return d;
      const n = parseFloat(m[1]);
      return Number.isFinite(n) ? n : d;
    };

    return {
      torrent: has(/\bTorrent\b/i) || has(/\bAuto[-\s]?hits\b/i),
      lethal: has(/\bLethal\s+Hits\b/i),
      devw: has(/\bDevastating\s+Wounds\b/i) || has(/\bDev\s*Wounds\b/i),
      sustained: getNum(/\bSustained\s+Hits\s*(\d+)\b/i, 0),
      anti: getNum(/\bAnti[-\s]?(?:\w+\s*)?(\d)\+\b/i, 0),
      extraAttacks: has(/\bExtra\s+Attacks\b/i),
    };
  }

  function calcOneWeapon(weapon, def, modifierText){
    const A = parseNdX(weapon?.A).mean;
    const skill = parseFloat(String(weapon?.skill || '').replace('+','')) || 0;
    const S = parseFloat(weapon?.S) || 0;
    const apRaw = parseFloat(weapon?.AP) || 0;
    const AP = Math.abs(apRaw);
    const D = parseNdX(weapon?.D).mean;
    const cappedD = expectedCappedDamage(weapon?.D, def.W);
    const fnp = parseFloat(def?.Fnp ?? def?.fnp) || 0;
    const kw = parseWeaponKeywords(modifierText || weapon?.modifiers || '');
    const critMin = 6;

    let pHit = 0;
    let pCrit = 0;
    if(skill === 0 || skill === 1 || String(weapon?.skill || '').trim().toLowerCase() === 'auto' || kw.torrent){
      pHit = 1;
      pCrit = 0;
    }else{
      pHit = probAtLeast(skill, 0, null);
      pCrit = (7 - critMin) / 6;
    }

    const expectedHits = A * (pHit + ((kw.sustained || 0) * pCrit));
    const needed = clamp(woundNeeded(S, def.T), 2, 6);
    const pWound = probAtLeast(needed, 0, null);
    const critPortionOfHits = pHit > 0 ? (pCrit / pHit) : 0;
    const pAuto = Math.min(1, (kw.lethal ? critPortionOfHits : 0) + (kw.anti > 0 ? ((7 - kw.anti) / 6) : 0));
    const expectedWounds = expectedHits * (pAuto + (1 - pAuto) * pWound);
    const neededSave = pickSave(def.sv, def.inv, AP, 0);
    const pSave = neededSave >= 7 ? 0 : (7 - clamp(neededSave, 2, 6)) / 6;
    const portionDevastating = kw.devw ? ((7 - critMin) / 6) : 0;
    const unsavedNormal = expectedWounds * (1 - portionDevastating) * (1 - pSave);
    const mortals = expectedWounds * portionDevastating;
    const pFnp = fnp > 0 ? ((7 - clamp(fnp, 2, 6)) / 6) : 0;
    const totalDamage = ((unsavedNormal * cappedD) + (mortals * D)) * (1 - pFnp);
    return { dmg: totalDamage, kills: def.W > 0 ? (totalDamage / def.W) : 0 };
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
