function weaponVsDefenseApp(){
  return {
    // ---------------- UI ----------------
    sidebarCollapsed: false,
    jsonPaste: '',

    // ---------------- Matchups ----------------
    matchupModalOpen: false,
    matchup: {
      loading:false,
      attackerRosterIdx: 0,
      attackerForceIdx: 0,
      defenderRosterIdx: 0,
      defenderForceIdx: 0,
      sortAttackers: 'alpha',
      sortDefenders: 'alpha',
      combineShootingProfiles: true,
      showMelee: true,
      showShooting: true,
      opts: {
        separateModels: false,
      },
      rows: [],
    },
    matchupAttackerForces: [],
    matchupDefenderForces: [],
    matchupAttackerUnits: [],
    matchupDefenderUnits: [],

    // ---------------- Roster state ----------------
    rosters: [],
    selectedRosterIdx: 0,

    forces: [],
    units: [],
    selectedForceIdx: 0,
    selectedUnitIdx: 0,

    // ---------------- Weapon state ----------------
    weapon: {
      A: '6',
      skill: '3',
      S: '4',
      AP: '0',
      D: '1',
    },

    // ---------------- Modifiers ----------------
    MODIFIERS: [
      { key:'torrent',      label:'Torrent',            type:'flag' },
      { key:'sustained',    label:'Sustained Hits',     type:'number', defaultValue:1 },
      { key:'lethal',       label:'Lethal Hits',        type:'flag' },
      { key:'devw',         label:'Devastating Wounds', type:'flag' },
      { key:'twinlinked',   label:'Twin-linked',        type:'flag' },
      { key:'anti',         label:'Anti',               type:'number', defaultValue:4 },
      { key:'ignorescover', label:'Ignores Cover',      type:'flag' },
      { key:'melta',        label:'Melta',              type:'number', defaultValue:2 },
      { key:'rapidfire',    label:'Rapid Fire',         type:'number', defaultValue:1 },
      { key:'blast',        label:'Blast',              type:'flag' },
      { key:'heavy',        label:'Heavy',              type:'flag' },
      { key:'mod_critmin',  label:'Min Roll for Crit',  type:'number', defaultValue:6 },

      { key:'mod_rrhit',    label:'Reroll hits',                 type:'select', defaultValue:'ones',
        options:[{value:'ones',label:'Ones'},{value:'all',label:'All'}] },

      { key:'mod_rrwound',  label:'Reroll wounds',               type:'select', defaultValue:'ones',
        options:[{value:'ones',label:'Ones'},{value:'all',label:'All'}] },

      { key:'mod_within',   label:'Within Half Range? (Melta/RF)',type:'flag' },
      { key:'mod_station',  label:'Remained Stationary? (Heavy)', type:'flag' },
      { key:'mod_charged',  label:'Charged? (Lance)',             type:'flag' },
    ],

    modAdd: { key: 'torrent', value: 1 },
    modifierTags: [],

    modDef(key){
      return this.MODIFIERS.find(m => m.key === key) || null;
    },

    syncModValueDefault(){
      const def = this.modDef(this.modAdd.key);
      if(!def) return;

      if(def.type === 'number'){
        this.modAdd.value = Number(def.defaultValue ?? 0);
      }else if(def.type === 'select'){
        this.modAdd.value = String(def.defaultValue ?? (def.options?.[0]?.value ?? 'none'));
      }else{
        this.modAdd.value = 1; // unused for flags
      }
    },

    addModifierTag(){
      const def = this.modDef(this.modAdd.key);
      if(!def) return;

      const key = def.key;
      let value = null;

      if(def.type === 'number'){
        value = parseInt(this.modAdd.value ?? def.defaultValue ?? 0, 10);
        if(!Number.isFinite(value)) value = parseInt(def.defaultValue ?? 0, 10) || 0;
      }else if(def.type === 'select'){
        value = String(this.modAdd.value ?? def.defaultValue ?? 'none');
      }else{
        value = true; // flags
      }

      const i = this.modifierTags.findIndex(t => t.key === key);
      if(i >= 0){
        // Update existing
        if(def.type === 'number'){
          this.modifierTags[i].value = value;
        }else if(def.type === 'select'){
          this.modifierTags[i].value = value;
        }else{
          this.modifierTags[i].value = true;
        }
      }else{
        this.modifierTags.push({ key, value });
      }
    },

    removeModifierTag(i){
      this.modifierTags.splice(i, 1);
    },

    hasMod(key){
      return this.modifierTags.some(t => t.key === key);
    },

    modValue(key, fallback=null){
      const t = this.modifierTags.find(x => x.key === key);
      return (t && t.value != null) ? t.value : fallback;
    },

    modNumber(key, fallback=0){
      const v = this.modValue(key, null);
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : fallback;
    },

    modSelect(key, fallback='none'){
      const v = this.modValue(key, null);
      return (v == null) ? fallback : String(v);
    },

    normalizeModifierDisplay(t){
      const def = this.modDef(t.key);
      const lbl = def?.label || t.key;

      if(def?.type === 'number') return `${lbl}: ${t.value}`;
      if(def?.type === 'select'){
        const opt = (def.options || []).find(o => o.value === t.value);
        return `${lbl}: ${opt ? opt.label : t.value}`;
      }
      return lbl;
    },

    // ---------------- Defense ----------------
    defense: {
      T: 4,
      Sv: 3,
      Inv: 0,
      cover: 0,
      W: 2,
      Fnp: 0,
      DR: 0,
      models: 5,
    },

    defenseMods: {
      forceHit: null,
      forceWound: null,
    },

    // ---------------- Output ----------------
    output: {
      hits: null,
      wounds: null,
      fails: null,
      dmg: null,
      breakdownHtml: '',
      steps: null,
    },

    // ---------------- Lifecycle ----------------
    init(){
      this.syncModValueDefault();
      this.renderBreakdownChart(null);

      window.addEventListener('resize', () => {
        if (this.output && Number.isFinite(this.output.dmg)) this.calculate();
        else this.renderBreakdownChart(null);
      });
    },

    // ---------------- Derived ----------------
    get activeRosterData(){
      return this.rosters?.[this.selectedRosterIdx]?.data || null;
    },

    // ---------------- Derived ----------------
    get activeUnit(){
      return this.units?.[this.selectedUnitIdx] || null;
    },

    get activeWeapons(){
      return this.activeUnit?.weapons || [];
    },

    get activeForce(){
      return this.forces?.[this.selectedForceIdx] || null;
    },

    // ---------------- Roster loading ----------------
    async onRosterFile(evt){
      const f = evt.target.files?.[0];
      if(!f) return;
      const text = await f.text();
      try{
        const obj = JSON.parse(text);
        this.addRoster(obj, f?.name || 'Uploaded JSON');
      }catch(e){
        alert('Invalid JSON');
        console.error(e);
      }
    },

    loadPastedRoster(){
      const t = (this.jsonPaste || '').trim();
      if(!t){ alert('Paste JSON first.'); return; }
      try{
        this.addRoster(JSON.parse(t), 'Pasted JSON');
      }catch(e){
        alert('Invalid JSON');
        console.error(e);
      }
    },

    addRoster(obj){
      const label = (obj?.roster?.name).trim() || `Roster ${this.rosters.length+1}`;

      this.rosters.push({ label, data: obj });
      this.selectedRosterIdx = this.rosters.length - 1;

      this.refreshForces();
    },

    removeRoster(idx){
      const i = Math.max(0, Math.min(this.rosters.length - 1, parseInt(idx, 10) || 0));
      if(this.rosters.length === 0) return;

      this.rosters.splice(i, 1);

      if(this.rosters.length === 0){
        this.selectedRosterIdx = 0;
        this.forces = [];
        this.units = [];
        this.selectedForceIdx = 0;
        this.selectedUnitIdx = 0;
        return;
      }

      this.selectedRosterIdx = Math.min(this.selectedRosterIdx, this.rosters.length - 1);
      this.refreshForces();
    },

    refreshForces(){
      const obj = this.activeRosterData;
      this.forces = (obj?.roster?.forces) || (obj?.forces) || [];

      this.selectedForceIdx = 0;
      this.refreshUnits();
    },

    refreshUnits(){
      const force = this.getForceByIdx(this.selectedForceIdx);
      this.units = force ? this.collectUnits(force) : [];
      this.selectedUnitIdx = 0;
    },

    // ---------------- Matchup modal ----------------
    openMatchupModal(){
      if(!this.rosters || this.rosters.length === 0){ alert('Load at least one roster first.'); return; }
      this.matchupModalOpen = true;

      // Defaults: attacker = current selection; defender = next roster if present
      const aR = Number.isFinite(this.selectedRosterIdx) ? this.selectedRosterIdx : 0;
      const aF = Number.isFinite(this.selectedForceIdx) ? this.selectedForceIdx : 0;
      const dR = (this.rosters.length > 1) ? (aR === 0 ? 1 : 0) : aR;

      this.matchup.attackerRosterIdx = this.clamp(aR, 0, this.rosters.length-1);
      this.matchup.attackerForceIdx  = aF;
      this.matchup.defenderRosterIdx = this.clamp(dR, 0, this.rosters.length-1);
      this.matchup.defenderForceIdx  = 0;

      this.onMatchupRosterChanged('attacker');
      this.onMatchupRosterChanged('defender');
      this.rebuildMatchup();
    },

    closeMatchupModal(){
      this.matchupModalOpen = false;
    },

    swapMatchupSides(){
      const aR = this.matchup.attackerRosterIdx;
      const aF = this.matchup.attackerForceIdx;
      this.matchup.attackerRosterIdx = this.matchup.defenderRosterIdx;
      this.matchup.attackerForceIdx  = this.matchup.defenderForceIdx;
      this.matchup.defenderRosterIdx = aR;
      this.matchup.defenderForceIdx  = aF;
      this.onMatchupRosterChanged('attacker');
      this.onMatchupRosterChanged('defender');
      this.rebuildMatchup();
    },

    getForcesForRoster(rosterIdx){
      const r = this.rosters?.[rosterIdx];
      const obj = r?.data || null;
      return (obj?.roster?.forces) || (obj?.forces) || [];
    },

    onMatchupRosterChanged(side){
      if(side === 'attacker'){
        this.matchupAttackerForces = this.getForcesForRoster(this.matchup.attackerRosterIdx);
        this.matchup.attackerForceIdx = this.clamp(this.matchup.attackerForceIdx, 0, Math.max(0, this.matchupAttackerForces.length-1));
      }else{
        this.matchupDefenderForces = this.getForcesForRoster(this.matchup.defenderRosterIdx);
        this.matchup.defenderForceIdx = this.clamp(this.matchup.defenderForceIdx, 0, Math.max(0, this.matchupDefenderForces.length-1));
      }
    },

    matchupDefenseLabel(u){
      const d = u?.defense || {};
      const t = (d.T!=null) ? `T${d.T}` : '';
      const sv = (d.Sv!=null && d.Sv!=='') ? `Sv${d.Sv}+` : '';
      const inv = (d.Inv!=null && d.Inv!=='') ? `Inv${d.Inv}+` : '';
      const w = (d.W!=null) ? `W${d.W}` : '';
      const size = (u?.size!=null) ? `${u.size} models` : '';
      return [t, sv, inv, w, size].filter(Boolean).join(' · ');
    },

    matchupWeaponSummary(u){
      const all = (u?.weapons || []);
      const filtered = all.filter(x => this.isWeaponEnabledByToggles(x));
      if(filtered.length === 0) return 'No weapons (per toggles)';

      const shooting = filtered.filter(w => !this.isMeleeWeapon(w));
      const melee = filtered.filter(w => this.isMeleeWeapon(w));

      const parts = [];
      if(shooting.length) parts.push(`${shooting.length} shoot`);
      if(melee.length) parts.push(`${melee.length} melee`);

      if(this.matchup.combineShootingProfiles && shooting.length){
        return `${parts.join(' / ')} (shoot combined)`;
      }
      return parts.join(' / ');
    },

    isWeaponEnabledByToggles(w){
      const mode = (w?.mode || '').toLowerCase();
      if(mode === 'melee') return !!this.matchup.showMelee;
      return !!this.matchup.showShooting;
    },

    rebuildMatchup(){
      if(!this.matchupModalOpen) return;

      const atkForces = this.getForcesForRoster(this.matchup.attackerRosterIdx);
      const defForces = this.getForcesForRoster(this.matchup.defenderRosterIdx);
      this.matchupAttackerForces = atkForces;
      this.matchupDefenderForces = defForces;

      const aForce = atkForces?.[this.matchup.attackerForceIdx] || null;
      const dForce = defForces?.[this.matchup.defenderForceIdx] || null;

      this.matchup.loading = true;
      queueMicrotask(() => {
        try{
          const aUnits = aForce ? this.collectUnits(aForce, { separateModels: this.matchup.opts.separateModels }) : [];
          const dUnits = dForce ? this.collectUnits(dForce, { separateModels: this.matchup.opts.separateModels }) : [];

          this.matchupAttackerUnits = aUnits;
          this.matchupDefenderUnits = dUnits;

          this.matchup.rows = aUnits.map(au => ({
            unit: au,
            cells: dUnits.map(du => this.computeMatchupCell(au, du)),
          }));

          this.applyMatchupSorting();
        }finally{
          this.matchup.loading = false;
        }
      });
    },

    applyMatchupSorting(){
      const rawA = [...(this.matchupAttackerUnits || [])];
      const rawD = [...(this.matchupDefenderUnits || [])];
      const rawRows = this.matchup.rows || [];

      const rowSummary = (ai) => {
        const cells = rawRows?.[ai]?.cells || [];
        let maxDmg = 0;
        let maxPct = 0;
        for(const c of cells){
          if(Number.isFinite(c?.dmg)) maxDmg = Math.max(maxDmg, c.dmg);
          if(Number.isFinite(c?.pctKilled)) maxPct = Math.max(maxPct, c.pctKilled);
        }
        return { maxDmg, maxPct };
      };

      const colSummary = (di) => {
        let maxDmg = 0;
        let maxPct = 0;
        for(let ai=0; ai<rawRows.length; ai++){
          const c = rawRows?.[ai]?.cells?.[di];
          if(Number.isFinite(c?.dmg)) maxDmg = Math.max(maxDmg, c.dmg);
          if(Number.isFinite(c?.pctKilled)) maxPct = Math.max(maxPct, c.pctKilled);
        }
        return { maxDmg, maxPct };
      };

      const aOrder = rawA.map((u, i) => ({ u, i, ...rowSummary(i) }));
      const dOrder = rawD.map((u, i) => ({ u, i, ...colSummary(i) }));

      const sortAlpha = (a,b) => String(a.u?.label||'').localeCompare(String(b.u?.label||''));
      const sortDmg = (a,b) => (b.maxDmg - a.maxDmg) || sortAlpha(a,b);
      const sortPct = (a,b) => (b.maxPct - a.maxPct) || sortDmg(a,b);

      const aSort = (this.matchup.sortAttackers || 'alpha');
      const dSort = (this.matchup.sortDefenders || 'alpha');

      const pick = (mode) => mode === 'pkill' ? sortPct : (mode === 'dmg' ? sortDmg : sortAlpha);
      aOrder.sort(pick(aSort));
      dOrder.sort(pick(dSort));

      // Apply sorted units
      this.matchupAttackerUnits = aOrder.map(x => x.u);
      this.matchupDefenderUnits = dOrder.map(x => x.u);

      // Rebuild rows+cells in sorted order from raw
      const newRows = aOrder.map(a => ({
        unit: a.u,
        cells: dOrder.map(d => rawRows?.[a.i]?.cells?.[d.i] || { dmg:0, kills:0, pctKilled:null, weaponName:'' }),
      }));

      this.matchup.rows = newRows;
    },

    computeMatchupCell(attackerUnit, defenderUnit){
      const def = defenderUnit?.defense || {};
      const T = parseFloat(def.T) || 0;
      const sv = parseFloat(def.Sv) || 0;
      const inv = parseFloat(def.Inv) || 0;
      const W = parseFloat(def.W) || 0;

      // Prefer model count from defense.models; fallback to defenderUnit.size if you already set it.
      const size =
        (def?.models != null) ? parseFloat(def.models) :
        (defenderUnit?.size != null) ? parseFloat(defenderUnit.size) :
        null;

      const enabled = (attackerUnit?.weapons || []).filter(w => this.isWeaponEnabledByToggles(w));
      if(enabled.length === 0) return { dmg:0, kills:0, pctKilled:null, weaponName:'' };

      // Split modes so we can combine only shooting
      const shooting = enabled.filter(w => !this.isMeleeWeapon(w));
      const melee = enabled.filter(w => this.isMeleeWeapon(w));

      const evalOne = (w) => {
        const r = this.matchupCalcOneWeapon(w, {T, sv, inv, W});
        return { ...r, weaponName: w.name || '' };
      };

      const perShooting = shooting.map(evalOne);
      const perMelee = melee.map(evalOne);

      const sum = (arr, k) => arr.reduce((s,x)=>s+((x?.[k])||0),0);
      const best = (arr) => arr.reduce((b,c)=> (c.dmg > (b?.dmg ?? -1)) ? c : b, null);

      // SHOOTING: combine or best-single depending on toggle
      let shootDmg = 0, shootKills = 0, shootName = '';
      if(perShooting.length){
        if(this.matchup.combineShootingProfiles){
          shootDmg = sum(perShooting,'dmg');
          shootKills = sum(perShooting,'kills');
        }else{
          const b = best(perShooting);
          shootDmg = b?.dmg || 0;
          shootKills = b?.kills || 0;
          shootName = b?.weaponName || '';
        }
      }

      // MELEE: always best-single (never combined)
      let meleeDmg = 0, meleeKills = 0, meleeName = '';
      if(perMelee.length){
        const b = best(perMelee);
        meleeDmg = b?.dmg || 0;
        meleeKills = b?.kills || 0;
        meleeName = b?.weaponName || '';
      }

      // Total depends on your existing melee/shoot toggles handled by isWeaponEnabledByToggles(),
      // so enabled already respects them. We just add the two channels we evaluated.
      const dmg = shootDmg + meleeDmg;
      const kills = shootKills + meleeKills;

      // weaponName: show which profile “drove” the result when not combining shooting; keep empty when combining
      let weaponName = '';
      if(this.matchup.combineShootingProfiles){
        // If only melee is enabled, still show melee best weapon
        if(!shooting.length && meleeName) weaponName = meleeName;
      }else{
        // pick whichever channel contributes more damage
        if(meleeDmg > shootDmg) weaponName = meleeName;
        else weaponName = shootName || meleeName || '';
      }

      let pctKilled = null;
      if(Number.isFinite(size) && size > 0){
        pctKilled = this.clamp(kills / size, 0, 1);
      }

      return { dmg, kills, pctKilled, weaponName };
    },

    parseWeaponKeywords(txt){
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
      };
    },

    matchupCalcOneWeapon(w, def){
      const A = this.parseNdX(w?.A).mean;
      const skill = parseFloat(String(w?.skill||'').replace('+','')) || 0;
      const S = parseFloat(w?.S) || 0;
      const apRaw = parseFloat(w?.AP) || 0;
      const AP = Math.abs(apRaw);
      const D = this.parseNdX(w?.D).mean;

      const kw = this.parseWeaponKeywords(w?.modifiers);
      const torrent = kw.torrent;
      const sustained = kw.sustained || 0;
      const lethal = !!kw.lethal;
      const devw = !!kw.devw;
      const anti = kw.anti || 0;

      // Hits (simplified: no rerolls/mods)
      let pHit = 0;
      let pCrit = 0;
      const critMin = 6;

      if(skill == 0 || skill == 1 || String(w?.skill||'').trim().toLowerCase() === 'auto' || torrent){
        pHit = 1;
        pCrit = 0;
      }else{
        pHit = this.probAtLeast(skill, 0, null);
        pCrit = (7 - critMin) / 6;
      }

      const expectedHits = A * (pHit + (sustained * pCrit));

      // Wounds
      const need = this.woundNeeded(S, def.T);
      const needed = this.clamp(need, 2, 6);
      const pWound = this.probAtLeast(needed, 0, null);

      const critPortionOfHits = (pHit > 0) ? (pCrit / pHit) : 0;
      const autoWoundFromLethal = lethal ? critPortionOfHits : 0;
      const autoWoundFromAnti = (anti > 0) ? ((7 - anti) / 6) : 0;

      const pAuto = Math.min(1, autoWoundFromLethal + autoWoundFromAnti);
      const effectiveWoundSuccess = pAuto + (1 - pAuto) * pWound;
      const expectedWounds = expectedHits * effectiveWoundSuccess;

      // Saves
      const neededSave = this.pickSave(def.sv, def.inv, AP, 0);
      const pSave = (neededSave >= 7) ? 0 : (7 - this.clamp(neededSave, 2, 6)) / 6;

      const portionDevastating = devw ? ((7 - critMin) / 6) : 0;
      const unsavedNormal = expectedWounds * (1 - portionDevastating) * (1 - pSave);
      const mortals = expectedWounds * portionDevastating;

      const totalDamage = (unsavedNormal + mortals) * D;
      const kills = (def.W > 0) ? (totalDamage / def.W) : 0;

      return { dmg: totalDamage, kills };
    },

    onUnitChanged(){
      const u = this.activeUnit;
      const m = u?.defense?.models ?? u?.size ?? null;
      if(m != null) this.defense.models = m;
    },

    getForceByIdx(i){
      // Prefer the already-derived forces list; fallback to active roster data
      if(Array.isArray(this.forces) && this.forces.length) return this.forces?.[i] || null;

      const obj = this.activeRosterData;
      if(!obj) return null;
      const forces = (obj?.roster?.forces) || (obj?.forces) || [];
      return forces?.[i] || null;
    },

    // ---------------- Preset Template ----------------
    applyPreset(T,Sv,Inv,cover,DR,Fnp,W){
      this.defense.T = T;
      this.defense.Sv = Sv;
      this.defense.Inv = Inv;
      this.defense.cover = cover;
      this.defense.DR = DR;
      this.defense.Fnp = Fnp;
      this.defense.W = W;
      this.calculate();
    },

    // ---------------- Load weapon into form ----------------
    loadWeapon(w){
      this.weapon.A = (w.A ?? '1').toString();
      this.weapon.skill = (String(w.skill || '3').trim()).replace(/\s*\+\s*$/,'') || '3';
      this.weapon.S = (w.S ?? '4').toString();
      this.weapon.AP = (w.AP ?? '0').toString();
      this.weapon.D = (w.D ?? '1').toString();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ---------------- Load selected defense into form ----------------
    loadSelectedDefenseIntoForm(){
      const u = this.activeUnit;
      if(!u){ alert('No unit selected.'); return; }
      const def = u.defense || {};
      if(def.T != null) this.defense.T = def.T;
      if(def.Sv) this.defense.Sv = def.Sv;
      if(def.Inv) this.defense.Inv = def.Inv;
      if(def.W != null) this.defense.W = def.W;
      if(def.models != null) this.defense.models = def.models;
    },

    renderDefensePills(def){
      if(!def) return '<div class="muted">No defensive data.</div>';
      const p = (label, v, suffix='') => (v!=null && v!=='') ? `<span class="pill">${label}: ${v}${suffix}</span>` : '';
      const html = [p('T', def.T), p('Save', def.Sv), p('Inv', def.Inv), p('W', def.W)].filter(Boolean).join(' ');
      return html || '<div class="muted">No defensive data.</div>';
    },

    // ---------------- Output helpers ----------------
    resetOutput(){
      this.output = { hits:null, wounds:null, fails:null, dmg:null, breakdownHtml:'', steps:null };
      this.renderBreakdownChart(null);
    },

    fmtOut(n){
      return Number.isFinite(n) ? n.toFixed(2) : "—";
    },
    fmtPct(p){
      return Number.isFinite(p) ? `${(p*100).toFixed(0)}%` : '—';
    },

    // ---------------- Math utils ----------------
    clamp(x,min,max){ return Math.max(min, Math.min(max, x)); },

    parseNdX(expr){
      if(!expr) return { mean:0, text:'0' };
      const s = String(expr).replace(/\s+/g,'');
      if(/^\d+$/.test(s)) return { mean: parseFloat(s), text:s };
      const m = s.match(/^(\d+)?[dD](\d+)([\+\-]\d+)?$/);
      if(!m) return { mean: parseFloat(s) || 0, text:s };
      const n = parseInt(m[1] || '1', 10);
      const faces = parseInt(m[2], 10);
      const k = m[3] ? parseInt(m[3], 10) : 0;
      const dieMean = (1 + faces) / 2;
      return { mean: (n * dieMean) + k, text:s };
    },

    probAtLeast(target, mod=0, cap=null){
      if(target === 1) return 1;
      if(target === null) return 0;
      let t = this.clamp(target - mod, 2, 6);
      if(cap){
        const c = parseInt(cap, 10);
        if(Number.isFinite(c)) t = Math.max(t, c);
      }
      return (7 - t) / 6;
    },

    applyRerolls(p, mode){
      if(mode === 'none') return p;
      if(mode === 'all') return p + (1-p)*p;
      if(mode === 'ones'){
        // Approx: reroll only 1s (1/6 of rolls)
        return p + (1/6)*p - (1/6)*p*p;
      }
      return p;
    },

    woundNeeded(S,T){
      if(S >= 2*T) return 2;
      if(S > T) return 3;
      if(S === T) return 4;
      if(S*2 <= T) return 6;
      return 5;
    },

    pickSave(sv, inv, ap, saveMod){
      const worsened = sv ? this.clamp(sv + ap, 2, 7) : 7;
      const final = saveMod ? this.clamp(worsened + saveMod, 2, 7) : worsened;
      if(inv) return Math.min(final, inv);
      return final;
    },

    // ---------------- Core calculation ----------------
    calculate(){
      // Inputs
      const A = this.parseNdX(this.weapon.A).mean;

      const skill = this.weapon.skill;
      const S = parseFloat(this.weapon.S) || 0;

      const AP = parseFloat(this.weapon.AP) || 0;

      const D = this.parseNdX(this.weapon.D).mean;

      const critMin  = this.modNumber('mod_critmin', 6);
      const rrHit = this.modSelect('mod_rrhit', 'none');

      const hasTwinlinked = this.hasMod('twinlinked');
      const rrWound = hasTwinlinked ? 'all' : this.modSelect('mod_rrwound', 'none');

      const T = parseFloat(this.defense.T) || 0;
      const sv = this.defense.Sv;
      const inv = this.defense.Inv;
      const cover = this.defense.cover;
      const W = parseFloat(this.defense.W) || 0;
      const fnp = this.defense.Fnp;
      const dmgRed = parseFloat(this.defense.DR) || 0;
      const targetModels = Math.max(1, parseInt(this.defense.models || '5', 10) || 5);

      const forceHit = (this.defenseMods.forceHit || '').trim();
      const forceWound = (this.defenseMods.forceWound || '').trim();

      const withinHalf = this.hasMod('mod_within');
      const stationary = this.hasMod('mod_station');
      const charged    = this.hasMod('mod_charged');

      // Keyword effects
      const torrent      = this.hasMod('torrent');
      const ignoresCover = this.hasMod('ignorescover');
      const hasBlast     = this.hasMod('blast');
      const hasHeavy     = this.hasMod('heavy');
      const hasLance     = this.hasMod('lance');

      const kwSustained  = this.modNumber('sustained', 0);
      const kwRapidFire  = this.modNumber('rapidfire', 0);
      const kwMelta      = this.modNumber('melta', 0);
      const kwAnti       = this.modNumber('anti', 0);

      // Merge “controls” with “tags” for these
      const effSustained = kwSustained;
      const effLethal = this.hasMod('lethal');
      const effDevw   = this.hasMod('devw');
      const antiOverride = this.modNumber('mod_antiover', 0);
      const effAnti = Math.max(antiOverride, kwAnti);

      // Effective attacks
      const blastBonusA = hasBlast ? Math.floor(targetModels / 5) : 0;
      const rapidFireBonusA = (kwRapidFire > 0 && withinHalf) ? kwRapidFire : 0;
      const Aeff = A + blastBonusA + rapidFireBonusA;

      // Hits
      let pHit = 0;
      let pCrit = 0;

      if(skill === 1 || String(this.weapon.skill).trim().toLowerCase() === 'auto' || torrent){
        pHit = 1;
        pCrit = 0; // auto-hits => no crit-hit modeling here
      }else{
        const heavyBonus = (hasHeavy && stationary) ? 1 : 0;
        const basePHit = this.probAtLeast(skill, heavyBonus, forceHit || null);
        pHit = this.applyRerolls(basePHit, rrHit);

        const baseCrit = (7 - critMin) / 6;
        pCrit = this.applyRerolls(baseCrit, rrHit);
      }

      const extraHitsPerAttack = effSustained * pCrit;
      const expectedHits = Aeff * (pHit + extraHitsPerAttack);

      // Wounds
      const need = this.woundNeeded(S, T);
      const lanceBonus = charged ? 1 : 0;
      const neededAfterMod = this.clamp(need + lanceBonus, 2, 6);

      const pWoundBase = this.probAtLeast(neededAfterMod, 0, forceWound || null);
      const pWound = this.applyRerolls(pWoundBase, rrWound);

      const critPortionOfHits = (pHit > 0) ? (pCrit / pHit) : 0;
      const autoWoundFromLethal = effLethal ? critPortionOfHits : 0;

      const anti = effAnti;
      const autoWoundFromAnti = anti > 0 ? ((7 - anti) / 6) : 0;

      const pLethalAmongHits = effLethal ? critPortionOfHits : 0;  
      const effectiveWoundSuccess = pLethalAmongHits + (1 - pLethalAmongHits) * pWound;
      const expectedWounds = expectedHits * effectiveWoundSuccess;

      // Saves
      const coverMod = (cover && !ignoresCover) ? -1 : 0;
      const neededSave = this.pickSave(sv, inv, AP, coverMod);
      const pSave = (neededSave >= 7) ? 0 : (7 - this.clamp(neededSave, 2, 6)) / 6;

      // Dev Wounds portion (approx)
      const pWoundCrit = this.applyRerolls((7 - critMin) / 6, rrWound);
      const portionDevastating = effDevw ? Math.min(1, pWoundCrit) : 0;

      const unsavedNormal = expectedWounds * (1 - portionDevastating) * (1 - pSave);
      const mortals = expectedWounds * portionDevastating;

      // Damage
      const meltaBonusD = kwMelta > 0 ? kwMelta : 0;
      const DwithMelta = Math.max(0, D + meltaBonusD);

      const effD = Math.max(0, DwithMelta - dmgRed);
      const dmgNormal = unsavedNormal * effD;
      const dmgMortal = mortals * effD;

      // FNP
      const pFnp = fnp ? ((7 - this.clamp(fnp, 2, 6)) / 6) : 0;
      const totalDamage = (dmgNormal + dmgMortal) * (1 - pFnp);

      // Models killed (expected)
      const modelsKilled = (W > 0) ? (totalDamage / W) : 0;

      // Output numbers
      this.output.hits = expectedHits;
      this.output.wounds = expectedWounds;
      this.output.fails = unsavedNormal;
      this.output.dmg = totalDamage;

      // Breakdown pills
      const lines = [];
      if(Aeff != A)
        lines.push(`<span class="pill">ATKs: Base(${A.toFixed(1)}) + Extra(${Aeff-A}) → Total=${Aeff.toFixed(1)}</span>`);
      else
        lines.push(`<span class="pill">ATKs: ${Aeff.toFixed(1)}</span>`)
      lines.push(`<span class="pill">Hit%=${pHit.toFixed(3)*100}%</span>`);
      lines.push(`<span class="pill">Crit%=${(pCrit*100).toFixed(1)}%</span>`);
      if(effSustained>0) lines.push(`<span class="pill">extra hits/ATK=${extraHitsPerAttack.toFixed(3)}</span>`);
      lines.push(`<span class="pill">Need ${neededAfterMod}+ to Wound → ${(pWound*100).toFixed(1)}%</span>`);
      if(anti>0) lines.push(`<span class="pill">Anti=${anti}+</span>`);
      lines.push(`<span class="pill">save need ${neededSave===7?'—':neededSave+'+'} → pSave=${(pSave*100).toFixed(1)}%</span>`);
      if(effDevw) lines.push(`<span class="pill">DevW portion≈${(portionDevastating*100).toFixed(1)}%</span>`);
      if(dmgRed>0) lines.push(`<span class="pill">Damage Reduction ${dmgRed}</span>`);
      if(fnp) lines.push(`<span class="pill">FNP ${fnp}+</span>`);
      if(kwMelta>0 && withinHalf) lines.push(`<span class="pill">Melta +${kwMelta}</span>`);
      lines.push(`<span class="pill">Expected Models Killed≈${modelsKilled.toFixed(2)}</span>`);

      this.output.breakdownHtml = lines.join(' ');

      // Chart steps
      const hitExtras = [];
      if(torrent || String(this.weapon.skill).trim().toLowerCase()==='auto') hitExtras.push('auto-hit');
      if(forceHit) hitExtras.push(`cap ${forceHit}`);
      if(rrHit!=='none') hitExtras.push(`rr ${rrHit}`);
      if(effSustained>0) hitExtras.push(`Sust ${effSustained}`);
      if(hasHeavy && stationary) hitExtras.push('Heavy');

      const woundExtras = [];
      if(forceWound) woundExtras.push(`cap ${forceWound}`);
      if(rrWound!=='none') woundExtras.push(`rr ${rrWound}`);
      if(charged) woundExtras.push('Lance');
      if(effLethal) woundExtras.push('Lethal');
      if(anti>0) woundExtras.push(`Anti ${anti}+`);
      if(effDevw) woundExtras.push('DevW');

      const saveExtras = [];
      if(cover && !ignoresCover) saveExtras.push('cover');
      if(inv && String(inv).trim()) saveExtras.push(`inv ${String(inv).trim()}+`);

      const dmgExtras = [];
      if(kwMelta>0 && withinHalf) dmgExtras.push(`Melta +${kwMelta}`);
      if(dmgRed>0) dmgExtras.push(`-DR ${dmgRed}`);

      const fnpExtras = [];
      if(fnp > 1) fnpExtras.push(`${fnp}`);

      const baseTotalDamage = Aeff * effD;
      const dmgAfterHits = expectedHits * effD;
      const dmgAfterWounds = expectedWounds * effD;
      const expectedUnsavedIncludingMortals = (unsavedNormal + mortals);
      const dmgAfterSaves = expectedUnsavedIncludingMortals * effD;
      const dmgAfterDamageMods = dmgNormal + dmgMortal;

      const steps = [
        { label: this.buildStepLabel('Attacks', [`+${Aeff-A}`]), value: baseTotalDamage },
        { label: this.buildStepLabel('Hits', hitExtras), value: dmgAfterHits, percent: (dmgAfterHits - baseTotalDamage)/baseTotalDamage },
        { label: this.buildStepLabel('Wounds', woundExtras), value: dmgAfterWounds, percent: (dmgAfterWounds - dmgAfterHits)/dmgAfterHits },
        { label: this.buildStepLabel('After Saves', saveExtras), value: dmgAfterSaves, percent: (dmgAfterSaves - dmgAfterWounds)/dmgAfterWounds },
        { label: this.buildStepLabel('Damage Reduction', dmgExtras), value: dmgAfterDamageMods, percent: (dmgAfterDamageMods - dmgAfterSaves)/dmgAfterSaves },
        { label: this.buildStepLabel('After FNP', fnpExtras), value: totalDamage, percent: (totalDamage - dmgAfterDamageMods)/dmgAfterDamageMods },
      ];

      this.output.steps = steps;
      this.renderBreakdownChart(steps);
    },

    // ---------------- Chart ----------------
    _fmtChart(n){
      if(!Number.isFinite(n)) return "";
      if(Math.abs(n) >= 100) return n.toFixed(0);
      if(Math.abs(n) >= 10) return n.toFixed(1);
      return n.toFixed(2);
    },

    buildStepLabel(base, extras){
      const xs = (extras || []).filter(Boolean);
      if(xs.length === 0) return base;
      return `${base} (${xs.join(', ')})`;
    },

    renderBreakdownChart(steps){
      const canvas = this.$refs.chart;
      if(!canvas) return;
      const ctx = canvas.getContext('2d');

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0,0,w,h);

      if(!steps || steps.length < 2){
        ctx.fillStyle = '#90a4b4';
        ctx.font = '12px system-ui, Segoe UI, Roboto, Arial';
        ctx.fillText('No chart data yet.', 12, 20);
        return;
      }

      const padL = 44, padR = 30, padT = 24, padB = 44;
      const plotW = Math.max(10, w - padL - padR);
      const plotH = Math.max(10, h - padT - padB);

      const vals = steps.map(s => Math.max(0, Number(s.value) || 0));
      const maxV = Math.max(1e-9, ...vals);
      const percentChanges = steps.map(s => s.percent != null ? s.percent : null)

      const xFor = (i)=> padL + (steps.length===1 ? plotW/2 : (i*(plotW/(steps.length-1))));
      const yFor = (v)=> padT + (plotH - (v/maxV)*plotH);

      // grid
      ctx.strokeStyle = '#223044';
      ctx.lineWidth = 1;
      for(let k=0;k<=4;k++){
        const y = padT + (k*(plotH/4));
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL+plotW, y);
        ctx.stroke();
      }

      // axes
      ctx.strokeStyle = '#2a3a4f';
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT+plotH);
      ctx.lineTo(padL+plotW, padT+plotH);
      ctx.stroke();

      // line
      ctx.strokeStyle = '#6ee7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      steps.forEach((s,i)=>{
        const x = xFor(i);
        const y = yFor(vals[i]);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();

      // points + labels
      ctx.font = '12px system-ui, Segoe UI, Roboto, Arial';
      steps.forEach((s,i)=>{
        const x = xFor(i);
        const y = yFor(vals[i]);

        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#e8eef7';
        const valText = this._fmtChart(vals[i]);
        ctx.fillText(valText, x - (valText.length*3), y - 8);

        if(percentChanges[i] != null) {
          ctx.fillStyle = percentChanges[i] >= 0 ? '#b6d7a8' : '#ea9999';
          const percentText = percentChanges[i] ? `(${percentChanges[i].toFixed(2)*100}%)` : "( - )"
          ctx.fillText(percentText, x + 3 - (percentText.length*3), y - 25);
        }

        ctx.save();
        ctx.translate(x, padT + plotH + 10);
        //ctx.rotate(-Math.PI/6);
        ctx.fillStyle = '#90a4b4';
        const lbl = String(s.label || '');
        ctx.fillText(lbl, -Math.min(120, lbl.length*3), 18);
        ctx.restore();
      });

      // y ticks
      ctx.fillStyle = '#90a4b4';
      for(let k=0;k<=4;k++){
        const v = maxV * (1 - k/4);
        const y = padT + (k*(plotH/4));
        ctx.fillText(this._fmtChart(v), 8, y+4);
      }
    },

    // ---------------- Army JSON parsing / unit collection ----------------
    getAllSelections(node){
      const out = [];
      (node?.selections || []).forEach(s => { out.push(s); out.push(...this.getAllSelections(s)); });
      return out;
    },

    extractWeaponsFromNode(node){
      const profiles = node?.profiles || [];
      const countRaw = node?.number;
      const count = Math.max(1, parseInt(countRaw ?? 1, 10) || 1);

      const list = [];
      profiles.forEach(p => {
        const tn = (p.typeName || '').toLowerCase();
        if(!(tn.includes('ranged weapons') || tn.includes('melee weapons'))) return;

        const c = p.characteristics || [];
        const get = (name) => (c.find(x => x.name === name) || {}).$text || '';

        const Araw = get('A') || get('Attacks') || '';
        const Amean = this.parseNdX(Araw).mean;
        const Atotal = Amean * count;

        list.push({
          name: p.name,
          range: get('Range'),
          // IMPORTANT: weapon.A becomes TOTAL attacks for the *whole unit* based on node.number
          A: String(Atotal),
          skill: (get('BS') || get('WS') || '').replace("+","") || '',
          S: get('S'),
          AP: (get('AP') || '').replace("-",""),
          D: get('D'),
          modifiers: get('modifiers'),

          // optional debug/meta if you want it later
          _count: count,
          _Araw: Araw,
        });
      });

      return list;
    },

    extractWeaponsFromProfiles(profiles){
      // keep this as a thin wrapper in case anything else still calls it
      // (treat as 1 copy)
      return this.extractWeaponsFromNode({ profiles, number: 1 });
    },

    collectUnits(force, opts = { separateModels:false }){
      const separateModels = !!opts.separateModels;
      const unitMap = new Map();

      const parseInvFromText = (txt) => {
        const s = String(txt || '');
        const m =
          s.match(/(\d)\+\s*invulnerable\s*save/i) ||
          s.match(/invulnerable\s*save\s*(?:of|is|:)?\s*(\d)\+/i) ||
          s.match(/\b(\d)\+\b(?=.*\binvulnerable\b)/i);
        return m ? `${m[1]}` : '';
      };

      const walk = (node) => {
        const out = [node];
        (node?.selections || []).forEach(ch => out.push(...walk(ch)));
        return out;
      };

      const modelEntriesUnder = (unitNode) => {
        const all = walk(unitNode);
        return all
          .filter(n => (n?.type === 'model') && Number.isFinite(parseInt(n?.number, 10)))
          .map(n => ({ node: n, name: n?.name || 'Model', count: Math.max(1, parseInt(n.number, 10) || 1) }));
      };

      const unitModelCount = (unitNode) => {
        const models = modelEntriesUnder(unitNode);
        if(models.length) return models.reduce((s,m)=>s+m.count, 0);

        // fallback if a dataset only provides unitNode.number
        const n = parseInt(unitNode?.number, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };


      const mergeUnit = (key, patch) => {
        if(!unitMap.has(key)){
          unitMap.set(key, patch);
          return;
        }
        const cur = unitMap.get(key);

        // merge weapons (keep all; your matchup logic can choose “best” later)
        cur.weapons = [...(cur.weapons || []), ...(patch.weapons || [])];

        // merge defense (fill missing)
        cur.defense = cur.defense || { T:null, Sv:null, Inv:null, W:null, models:0 };
        const d = cur.defense;
        const p = patch.defense || {};

        if(d.T == null && p.T != null) d.T = p.T;
        if(!d.Sv && p.Sv) d.Sv = p.Sv;
        if(!d.Inv && p.Inv) d.Inv = p.Inv;
        if(d.W == null && p.W != null) d.W = p.W;

        // sum model counts when grouping
        d.models = (parseInt(d.models || 0, 10) || 0) + (parseInt(p.models || 0, 10) || 0);

        // keep a stable label
        cur.label = cur.label || patch.label;

        unitMap.set(key, cur);
      };

      (force?.selections || []).forEach(root => {
        const all = [root, ...this.getAllSelections(root)];

        all.forEach(s => {
          const isUnitish = (s.type === 'unit' || s.type === 'model');
          const hasUnitProfile = (s.profiles || []).some(p => /\bunit\b/i.test(p.typeName || ''));
          if(!(isUnitish || hasUnitProfile)) return;


          // ---- grouping key + label ----
          // If we're NOT separating models, we want a whole unit key that merges sergeants/champions.
          // Battlescribe typically gives all models in a unit the same entryGroupId and/or group name.

          // For unit nodes, compute size by summing all model entries under it (includes sergeants/champions).
          // For model nodes, keep using s.number because mergeUnit sums across grouped model entries.
          const modelCount = (s.type === 'unit')
            ? (unitModelCount(s) ?? 1)
            : Math.max(1, parseInt(s.number || 1, 10) || 1);


          let key;
          let label;

          if(s.type === 'model' && !separateModels){
            key = s.entryGroupId || s.group || s.name || s.entryId || Math.random();
            label = s.group || s.name || 'Unit';
          }else{
            // separateModels OR unit-level selection
            key = s.id || s.entryId || s.name || Math.random();
            label = s.name || s.group || 'Unit';
          }

          // ---- Collect weapons (from this node + its immediate children; fallback to deep) ----
          const weapons = [];
          const under = [s, ...(s.selections || [])];
          under.forEach(n => weapons.push(...this.extractWeaponsFromNode(n)));

          if(weapons.length === 0){
            this.getAllSelections(s).forEach(n => weapons.push(...this.extractWeaponsFromNode(n)));
          }

          // ---- Collect defense (T, Sv, Inv, W) + models ----
          let defense = { T:null, Sv:null, Inv:null, W:null, models: modelCount };

          const extractDef = (profiles) => {
            (profiles || []).forEach(p => {
              const tn = (p.typeName || '').toLowerCase();
              const c = p.characteristics || [];
              const get = (name) => {
                const f = c.find(x => (x.name || '').toLowerCase() === String(name).toLowerCase());
                return f ? (f.$text || '') : '';
              };

              // Primary: Unit/Model statline profile
              if(/\b(unit|model)\b/.test(tn)){
                if(defense.T == null){
                  const t = parseFloat(get('T')) || parseFloat(get('Toughness'));
                  if(!Number.isNaN(t)) defense.T = t;
                }

                if(!defense.Sv) defense.Sv = parseFloat((get('SV') || get('Sv') || get('Save') || 0).replace("+",""));

                // Sometimes present directly
                if(!defense.Inv) defense.Inv = parseFloat(get('Invulnerable Save') || get('Invuln') || 0);

                if(defense.W == null){
                  const w = parseFloat(get('W')) || parseFloat(get('Wounds'));
                  if(!Number.isNaN(w)) defense.W = w;
                }
                return;
              }

              // Secondary: Abilities text contains invuln
              if(!defense.Inv && tn === 'abilities'){
                const name = String(p.name || '');
                const desc = get('Description');

                if(/invulnerable/i.test(name) || /invulnerable/i.test(desc)){
                  const inv = parseInvFromText(desc) || parseInvFromText(name);
                  if(inv) defense.Inv = inv;
                }
              }
            });
          };

          [s, ...(s.selections || [])].forEach(n => extractDef(n.profiles));
          if(defense.T == null || !defense.Sv || defense.W == null || !defense.Inv){
            this.getAllSelections(s).forEach(n => extractDef(n.profiles));
          }

          // If splitting models is enabled, emit one row/col per model entry under this unit.
          if(separateModels){
            const models = modelEntriesUnder(s);
            if(models.length){
              models.forEach((m, mi) => {
                const mk = `${label}::${m.name}::${mi}`;

                // weapons only from that model node subtree (keeps correct per-model counts)
                const wList = [];
                const underM = [m.node, ...(m.node.selections || [])];
                underM.forEach(n => wList.push(...this.extractWeaponsFromNode(n)));
                if(wList.length === 0){
                  underM.push(...this.getAllSelections(m.node));
                  underM.forEach(n => wList.push(...this.extractWeaponsFromNode(n)));
                }

                // reuse the unit’s defensive statline but set the model count to that model entry’s count
                const def2 = { ...(defense || {}) };
                def2.models = m.count;

                unitMap.set(mk, {
                  label: `${label} — ${m.name}`,
                  weapons: wList,
                  defense: def2
                });
              });

              return; // don’t also add the combined unit entry
            }
          }

          // Only keep things that look like real units/models
          if(weapons.length > 0 || defense.T != null || defense.Sv || defense.W != null || defense.Inv){
            mergeUnit(key, { label, weapons, defense  });
          }
        });
      });

      return [...unitMap.values()].map(u => {
        // Ensure models always exists
        u.defense = u.defense || { T:null, Sv:null, Inv:null, W:null, models:1 };
        if(!Number.isFinite(parseInt(u.defense.models, 10))) u.defense.models = 1;
        return u;
      });
    },
    
    isMeleeWeapon(w){
      // Prefer explicit range field when available
      const r = (w?.range ?? w?.R ?? w?.Range ?? '').toString().trim().toLowerCase();
      if(r === 'melee' || r === '-') return true;

      // Fallback: if range parses to a number, it’s shooting
      const n = parseFloat(r);
      if(Number.isFinite(n)) return false;

      // Fallback on type flag if you store it
      const t = (w?.type || w?.mode || '').toString().toLowerCase();
      if(t.includes('melee')) return true;

      return false;
    },
  }
}