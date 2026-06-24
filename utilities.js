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
      sortAttackers: 'overallDamage',
      sortAttackersDirection: 'desc',
      sortAttackersColumnKey: '',
      sortDefenders: 'leastDamage',
      sortDefendersDirection: 'asc',
      sortDefendersRowKey: '',
      combineShootingProfiles: true,
      showMelee: true,
      showShooting: true,
      metric: 'modelWounds',
      opts: {
        separateModels: false,
      },
      rows: [],
      visibleRows: [],
      visibleDefenders: [],
      metricRange: { min: 0, max: 0 },
      cellCache: {},
      cacheWarmToken: 0,
    },
    matchupAttackerForces: [],
    matchupDefenderForces: [],
    matchupAttackerBaseUnits: [],
    matchupAttackerUnits: [],
    matchupDefenderUnits: [],
    expandedUnitKeys: {},
    modifierToggleState: {},
    unitToggleState: {},
    matchupClipboardStatus: '',
    matchupMerge: {
      attackerFrom: '',
      attackerTo: '',
      defenderFrom: '',
      defenderTo: '',
    },
    profileModalOpen: false,
    profileModalRole: '',
    profileUnit: null,

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
      Inv: null,
      cover: 0,
      W: 2,
      Fnp: null,
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

    addRoster(obj, providedLabel){
      const normalized = window.ArmyImportService?.normalizeRosterData(obj, providedLabel) || obj;
      const label = (normalized?.roster?.name || providedLabel || `Roster ${this.rosters.length+1}`).trim();

      this.rosters.push({ label, data: normalized });
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
      const saves = [
        (d.Sv!=null && d.Sv!=='') ? `${d.Sv}+` : '',
        (d.Inv!=null && d.Inv!=='') ? `${d.Inv}++` : '',
      ].filter(Boolean).join(' ');
      const w = (d.W!=null) ? `W${d.W}` : '';
      const models = d.models ?? u?.size ?? null;
      const size = (models!=null) ? `${models} models` : '';
      return [t, saves, w, size].filter(Boolean).join(' - ');
    },

    matchupWeaponSummary(u){
      const all = (u?.weapons || []);
      const filtered = all.filter(x => this.isWeaponEnabledByToggles(x));
      if(filtered.length === 0) return 'No weapons (per toggles)';

      const shooting = filtered.filter(w => !this.isMeleeWeapon(w));
      const melee = filtered.filter(w => this.isMeleeWeapon(w));

      if(u?._attackMode === 'shooting') return `${shooting.length} shooting profile${shooting.length === 1 ? '' : 's'}`;
      if(u?._attackMode === 'melee') return `${melee.length} melee profile${melee.length === 1 ? '' : 's'}`;

      const parts = [];
      if(shooting.length) parts.push(`${shooting.length} shoot`);
      if(melee.length) parts.push(`${melee.length} melee`);

      if(this.matchup.combineShootingProfiles && shooting.length){
        return `${parts.join(' / ')} (shoot combined)`;
      }
      return parts.join(' / ');
    },

    unitKey(unit){
      return String(unit?._viewKey || unit?._unitKey || unit?.label || '');
    },

    hasChildUnits(unit){
      return Array.isArray(unit?._children) && unit._children.length > 1;
    },

    isUnitExpanded(unit){
      return !!this.expandedUnitKeys[this.unitKey(unit)];
    },

    toggleUnitExpanded(unit){
      const key = this.unitKey(unit);
      if(!key) return;
      this.expandedUnitKeys[key] = !this.expandedUnitKeys[key];
      this.refreshVisibleMatchup();
    },

    matchupVisibleRows(){
      return this.matchup.visibleRows || [];
    },

    matchupVisibleDefenders(){
      return this.matchup.visibleDefenders || [];
    },

    buildVisibleDefenders(){
      const cols = [];
      (this.matchupDefenderUnits || []).forEach((unit, colIndex) => {
        cols.push({ unit, colIndex, depth: 0, isChild: false });
        if(this.isUnitExpanded(unit)){
          this.sortedDefenderChildren(unit?._children || []).forEach((child, childIndex) => {
            cols.push({ unit: child, colIndex, childIndex, depth: 1, isChild: true });
          });
        }
      });
      return cols;
    },

    flattenMatchupUnits(units){
      const out = [];
      (units || []).forEach(unit => {
        out.push(unit);
        (unit?._children || []).forEach(child => out.push(child));
      });
      return out;
    },

    weaponMatchesAttackMode(w, attackMode){
      return window.MatchupEngine.weaponMatchesAttackMode(w, attackMode);
    },

    attackModeVariant(unit, attackMode){
      if(!unit || !attackMode || attackMode === 'all') return unit;
      const labelSuffix = attackMode === 'shooting' ? 'Shooting' : 'Melee';
      const baseKey = this.unitKey(unit);
      return {
        ...unit,
        label: `${unit.label || 'Unit'} (${labelSuffix})`,
        _baseUnit: unit,
        _attackMode: attackMode,
        _viewKey: `${baseKey}:${attackMode}`,
        _children: (unit._children || []).map(child => this.attackModeVariant(child, attackMode)),
      };
    },

    attackModeVariants(unit){
      if(unit?._attackMode) return [unit];
      if(this.matchup.combineShootingProfiles) return [unit];

      const weapons = (unit?.weapons || []).filter(w => this.isWeaponEnabledByToggles(w));
      const hasShooting = this.matchup.showShooting && weapons.some(w => !this.isMeleeWeapon(w));
      const hasMelee = this.matchup.showMelee && weapons.some(w => this.isMeleeWeapon(w));
      const variants = [];
      if(hasShooting) variants.push(this.attackModeVariant(unit, 'shooting'));
      if(hasMelee) variants.push(this.attackModeVariant(unit, 'melee'));
      return variants.length ? variants : [unit];
    },

    flattenMatchupAttackers(units){
      const out = [];
      (units || []).forEach(unit => {
        this.attackModeVariants(unit).forEach(variant => out.push(variant));
        (unit?._children || []).forEach(child => {
          this.attackModeVariants(child).forEach(variant => out.push(variant));
        });
      });
      return out;
    },

    cellCacheKey(attacker, defender){
      return `${this.unitKey(attacker)}=>${this.unitKey(defender)}`;
    },

    warmMatchupCellCache(){
      const attackers = this.flattenMatchupAttackers(this.matchupAttackerUnits);
      const defenders = this.flattenMatchupUnits(this.matchupDefenderUnits);
      const cache = {};
      attackers.forEach(attacker => {
        defenders.forEach(defender => {
          cache[this.cellCacheKey(attacker, defender)] = this.computeMatchupCell(attacker, defender);
        });
      });
      this.matchup.cellCache = cache;
    },

    seedAggregateCellCache(){
      const cache = {};
      (this.matchup.rows || []).forEach(row => {
        this.attackModeVariants(row.unit).forEach(attacker => {
          (this.matchupDefenderUnits || []).forEach((defender, index) => {
            const cell = attacker === row.unit
              ? (row.cells?.[index] || this.computeMatchupCell(row.unit, defender))
              : this.computeMatchupCell(attacker, defender);
            cache[this.cellCacheKey(attacker, defender)] = cell;
          });
        });
      });
      this.matchup.cellCache = cache;
      this.matchup.cacheWarmToken = (this.matchup.cacheWarmToken || 0) + 1;
    },

    scheduleWarmMatchupCellCache(){
      if(typeof document === 'undefined') return;
      const token = this.matchup.cacheWarmToken;
      const attackers = this.flattenMatchupAttackers(this.matchupAttackerUnits);
      const defenders = this.flattenMatchupUnits(this.matchupDefenderUnits);
      const pairs = [];

      attackers.forEach(attacker => {
        defenders.forEach(defender => {
          const key = this.cellCacheKey(attacker, defender);
          if(!this.matchup.cellCache[key]) pairs.push([key, attacker, defender]);
        });
      });

      const processChunk = () => {
        if(token !== this.matchup.cacheWarmToken) return;
        const started = Date.now();
        while(pairs.length && Date.now() - started < 12){
          const [key, attacker, defender] = pairs.shift();
          if(!this.matchup.cellCache[key]){
            this.matchup.cellCache[key] = this.computeMatchupCell(attacker, defender);
          }
        }
        if(pairs.length) setTimeout(processChunk, 0);
      };

      setTimeout(processChunk, 0);
    },

    cachedMatchupCell(attacker, defender){
      const key = this.cellCacheKey(attacker, defender);
      if(!this.matchup.cellCache) this.matchup.cellCache = {};
      if(!this.matchup.cellCache[key]){
        this.matchup.cellCache[key] = this.computeMatchupCell(attacker, defender);
      }
      return this.matchup.cellCache[key];
    },

    refreshVisibleMatchup(){
      const defenders = this.buildVisibleDefenders();
      const rows = [];
      (this.matchup.rows || []).forEach((row, rowIndex) => {
        rows.push({
          ...row,
          rowIndex,
          depth: 0,
          isChild: false,
          cells: defenders.map(defender => this.cachedMatchupCell(row.unit, defender.unit)),
        });
        if(this.isUnitExpanded(row.unit)){
          (row.unit?._children || []).filter(child => this.hasMatchupWeaponProfiles(child)).forEach((child, childIndex) => {
            rows.push({
              unit: child,
              rowIndex,
              childIndex,
              depth: 1,
              isChild: true,
              cells: defenders.map(defender => this.cachedMatchupCell(child, defender.unit)),
            });
          });
        }
      });

      this.matchup.visibleDefenders = defenders;
      this.matchup.visibleRows = rows;
      const range = this.updateMatchupMetricRange();
      this.decorateVisibleMatchupCells(range);
    },

    decorateVisibleMatchupCells(range=this.matchupMetricRange()){
      const metric = this.matchup.metric || 'damage';
      (this.matchup.visibleRows || []).forEach(row => {
        (row.cells || []).forEach(cell => {
          if(!cell) return;
          const value = window.MatchupEngine.metricValue(cell, metric);
          cell._matchupMetric = metric;
          cell._matchupMetricValue = value;
          cell._matchupStyle = window.MatchupEngine.colorForValue(value, range);
        });
      });
    },

    refreshMatchupPresentation(){
      this.applyMatchupSorting(false);
      this.refreshVisibleMatchup();
    },

    sortedDefenderChildren(children){
      const list = [...(children || [])];
      if(list.length <= 1) return list;
      const summaries = new Map(list.map(unit => [this.unitKey(unit), this.defenderSortSummaryForUnit(unit)]));
      const sortAlpha = (a, b) => String(a?.label || '').localeCompare(String(b?.label || ''));
      const summary = unit => summaries.get(this.unitKey(unit)) || { maxMetric:0, totalMetric:0, focusMetric:0 };
      const direction = this.matchup.sortDefendersDirection || 'asc';
      const metricSort = (getter, fallback=sortAlpha) => (a, b) => this.compareSortValues(getter(a), getter(b), direction) || fallback(a, b);
      const byDmg = metricSort(unit => summary(unit).maxMetric);
      const byOverallDmg = metricSort(unit => summary(unit).totalMetric, byDmg);
      const byLeastDmg = metricSort(unit => summary(unit).focusMetric, (a, b) => this.compareSortValues(summary(a).totalMetric, summary(b).totalMetric, direction) || sortAlpha(a, b));
      const byRow = metricSort(unit => {
        const attacker = this.sortAnchorAttacker();
        return attacker ? this.matchupCellMetric(this.cachedMatchupCell(attacker, unit)) : summary(unit).focusMetric;
      }, byOverallDmg);
      const mode = this.matchup.sortDefenders || 'alpha';
      if(mode === 'leastDamage') return list.sort(byLeastDmg);
      if(mode === 'row') return list.sort(byRow);
      if(mode === 'overallDamage') return list.sort(byOverallDmg);
      if(mode === 'dmg') return list.sort(byDmg);
      return list.sort(sortAlpha);
    },

    defenderSortSummaryForUnit(unit){
      let maxMetric = 0;
      let totalMetric = 0;
      let focusMetric = 0;
      (this.matchup.rows || []).forEach(row => {
        const c = this.cachedMatchupCell(row.unit, unit);
        const value = this.matchupCellMetric(c);
        if(Number.isFinite(value)){
          maxMetric = Math.max(maxMetric, value);
          totalMetric += value;
        }
      });
      const focusCell = this.matchup.rows?.[0]?.unit ? this.cachedMatchupCell(this.matchup.rows[0].unit, unit) : null;
      const focusValue = this.matchupCellMetric(focusCell);
      if(Number.isFinite(focusValue)) focusMetric = focusValue;
      return { maxMetric, totalMetric, focusMetric };
    },

    mergeOptionsForSide(side){
      return side === 'attacker' ? (this.matchupAttackerBaseUnits || this.matchupAttackerUnits || []) : (this.matchupDefenderUnits || []);
    },

    mergeOptionLabel(unit){
      const label = this.unitLabelText(unit);
      const models = parseInt(unit?.defense?.models ?? unit?.size, 10);
      return Number.isFinite(models) && models > 0 ? `${label} (${models})` : label;
    },

    forceForMatchupSide(side){
      const rosterIdx = side === 'attacker' ? this.matchup.attackerRosterIdx : this.matchup.defenderRosterIdx;
      const forceIdx = side === 'attacker' ? this.matchup.attackerForceIdx : this.matchup.defenderForceIdx;
      return this.getForcesForRoster(rosterIdx)?.[forceIdx] || null;
    },

    applyManualMerge(side){
      const fromKey = side === 'attacker' ? this.matchupMerge.attackerFrom : this.matchupMerge.defenderFrom;
      const toKey = side === 'attacker' ? this.matchupMerge.attackerTo : this.matchupMerge.defenderTo;
      const force = this.forceForMatchupSide(side);
      const ok = window.ArmyImportService?.mergeUnits(force, fromKey, toKey);
      if(!ok){ alert('Choose two different units to merge.'); return; }
      if(side === 'attacker'){
        this.matchupMerge.attackerFrom = '';
        this.matchupMerge.attackerTo = '';
      }else{
        this.matchupMerge.defenderFrom = '';
        this.matchupMerge.defenderTo = '';
      }
      this.rebuildMatchup();
    },

    clearManualMerges(side){
      const force = this.forceForMatchupSide(side);
      window.ArmyImportService?.clearMerges(force);
      this.rebuildMatchup();
    },

    isWeaponEnabledByToggles(w){
      const mode = (w?.mode || '').toLowerCase();
      if(mode === 'melee') return !!this.matchup.showMelee;
      return !!this.matchup.showShooting;
    },

    hasMatchupWeaponProfiles(unit){
      return (unit?.weapons || []).some(w => this.isWeaponEnabledByToggles(w) && this.weaponMatchesAttackMode(w, unit?._attackMode || 'all'));
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
          const aUnits = this.prepareMatchupUnits(aForce ? this.collectUnits(aForce) : [], 'attacker');
          const dUnits = this.prepareMatchupUnits(dForce ? this.collectUnits(dForce) : [], 'defender');
          const aRows = aUnits
            .flatMap(unit => this.attackModeVariants(unit))
            .filter(unit => this.hasMatchupWeaponProfiles(unit));

          this.matchupAttackerBaseUnits = aUnits;
          this.matchupAttackerUnits = aRows;
          this.matchupDefenderUnits = dUnits;

          this.matchup.rows = aRows.map(au => ({
            unit: au,
            cells: dUnits.map(du => this.computeMatchupCell(au, du)),
          }));

          this.seedAggregateCellCache();
          this.applyMatchupSorting(false);
          this.refreshVisibleMatchup();
          this.scheduleWarmMatchupCellCache();
          this.syncMatchupMergeSelections();
        }finally{
          this.matchup.loading = false;
        }
      });
    },

    prepareMatchupUnits(units, side){
      const rosterIdx = side === 'attacker' ? this.matchup.attackerRosterIdx : this.matchup.defenderRosterIdx;
      const forceIdx = side === 'attacker' ? this.matchup.attackerForceIdx : this.matchup.defenderForceIdx;
      const decorate = (unit, path='unit') => {
        unit._viewKey = `${side}:${rosterIdx}:${forceIdx}:${unit._unitKey || unit.label}:${path}`;
        (unit._children || []).forEach((child, index) => decorate(child, `${path}.${index}`));
        return unit;
      };
      return (units || []).map((unit, index) => decorate(unit, String(index)));
    },

    syncMatchupMergeSelections(){
      const pick = units => units?.[0]?._unitKey || '';
      const attackerMergeUnits = this.matchupAttackerBaseUnits || this.matchupAttackerUnits || [];
      if(!attackerMergeUnits.some(u => u._unitKey === this.matchupMerge.attackerFrom)) this.matchupMerge.attackerFrom = pick(attackerMergeUnits);
      if(!attackerMergeUnits.some(u => u._unitKey === this.matchupMerge.attackerTo)) this.matchupMerge.attackerTo = pick(attackerMergeUnits);
      if(!this.matchupDefenderUnits.some(u => u._unitKey === this.matchupMerge.defenderFrom)) this.matchupMerge.defenderFrom = pick(this.matchupDefenderUnits);
      if(!this.matchupDefenderUnits.some(u => u._unitKey === this.matchupMerge.defenderTo)) this.matchupMerge.defenderTo = pick(this.matchupDefenderUnits);
    },

    compareSortValues(a, b, direction='desc'){
      const av = Number.isFinite(Number(a)) ? Number(a) : 0;
      const bv = Number.isFinite(Number(b)) ? Number(b) : 0;
      return direction === 'asc' ? (av - bv) : (bv - av);
    },

    sortAnchorDefender(){
      const key = this.matchup.sortAttackersColumnKey;
      return key ? this.flattenMatchupUnits(this.matchupDefenderUnits || []).find(unit => this.unitKey(unit) === key) : null;
    },

    sortAnchorAttacker(){
      const key = this.matchup.sortDefendersRowKey;
      return key ? this.flattenMatchupAttackers(this.matchupAttackerUnits || []).find(unit => this.unitKey(unit) === key) : null;
    },

    applyMatchupSorting(refresh=true){
      const attackers = [...(this.matchupAttackerUnits || [])].filter(unit => this.hasMatchupWeaponProfiles(unit));
      const defenders = [...(this.matchupDefenderUnits || [])];
      const alphaDirection = this.matchup.sortAttackers === 'alpha' ? (this.matchup.sortAttackersDirection || 'asc') : 'asc';
      const alpha = (direction=alphaDirection) => (a, b) => {
        const diff = String(a?.label || '').localeCompare(String(b?.label || ''));
        return direction === 'desc' ? -diff : diff;
      };
      const metricFor = (attacker, defender) => this.matchupCellMetric(this.cachedMatchupCell(attacker, defender));
      const rowTotal = attacker => defenders.reduce((sum, defender) => {
        const value = metricFor(attacker, defender);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
      const colTotal = defender => attackers.reduce((sum, attacker) => {
        const value = metricFor(attacker, defender);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
      const maxRow = attacker => Math.max(0, ...defenders.map(defender => metricFor(attacker, defender)).filter(Number.isFinite));
      const maxCol = defender => Math.max(0, ...attackers.map(attacker => metricFor(attacker, defender)).filter(Number.isFinite));

      const rowDirection = this.matchup.sortAttackersDirection || 'desc';
      const colDirection = this.matchup.sortDefendersDirection || 'asc';
      const rowMode = this.matchup.sortAttackers || 'overallDamage';
      const colMode = this.matchup.sortDefenders || 'leastDamage';
      const rowAnchor = this.sortAnchorDefender();
      const colAnchor = this.sortAnchorAttacker();

      attackers.sort((a, b) => {
        if(rowMode === 'alpha') return alpha(rowDirection)(a, b);
        if(rowMode === 'column' && rowAnchor){
          return this.compareSortValues(metricFor(a, rowAnchor), metricFor(b, rowAnchor), rowDirection) || alpha('asc')(a, b);
        }
        if(rowMode === 'dmg' || rowMode === 'pkill'){
          return this.compareSortValues(maxRow(a), maxRow(b), rowDirection) || alpha('asc')(a, b);
        }
        return this.compareSortValues(rowTotal(a), rowTotal(b), rowDirection) || alpha('asc')(a, b);
      });

      const focusAttacker = attackers[0] || null;
      defenders.sort((a, b) => {
        if(colMode === 'alpha') return alpha(colDirection)(a, b);
        if(colMode === 'row' && colAnchor){
          return this.compareSortValues(metricFor(colAnchor, a), metricFor(colAnchor, b), colDirection) || alpha('asc')(a, b);
        }
        if(colMode === 'overallDamage'){
          return this.compareSortValues(colTotal(a), colTotal(b), colDirection) || alpha('asc')(a, b);
        }
        if(colMode === 'dmg' || colMode === 'pkill'){
          return this.compareSortValues(maxCol(a), maxCol(b), colDirection) || alpha('asc')(a, b);
        }
        if(focusAttacker){
          return this.compareSortValues(metricFor(focusAttacker, a), metricFor(focusAttacker, b), colDirection)
            || this.compareSortValues(colTotal(a), colTotal(b), colDirection)
            || alpha('asc')(a, b);
        }
        return alpha('asc')(a, b);
      });

      this.matchupAttackerUnits = attackers;
      this.matchupDefenderUnits = defenders;
      this.matchup.rows = attackers.map(attacker => ({
        unit: attacker,
        cells: defenders.map(defender => this.cachedMatchupCell(attacker, defender)),
      }));
      if(refresh) this.refreshVisibleMatchup();
    },

    setMatchupSort(side){
      if(side === 'attacker'){
        this.matchup.sortAttackers = this.matchup.sortAttackers || 'overallDamage';
        this.matchup.sortAttackersDirection = this.matchup.sortAttackersDirection || 'desc';
      }else if(side === 'defender'){
        this.matchup.sortDefenders = this.matchup.sortDefenders || 'leastDamage';
        this.matchup.sortDefendersDirection = this.matchup.sortDefendersDirection || 'asc';
      }
      this.refreshMatchupPresentation();
    },

    toggleDirection(current, defaultDirection='desc'){
      return current ? (current === 'asc' ? 'desc' : 'asc') : defaultDirection;
    },

    sortMatchupAlphabetical(){
      const next = this.toggleDirection(this.matchup.sortAttackers === 'alpha' ? this.matchup.sortAttackersDirection : '', 'asc');
      this.matchup.sortAttackers = 'alpha';
      this.matchup.sortDefenders = 'alpha';
      this.matchup.sortAttackersDirection = next;
      this.matchup.sortDefendersDirection = next;
      this.matchup.sortAttackersColumnKey = '';
      this.matchup.sortDefendersRowKey = '';
      this.refreshMatchupPresentation();
    },

    sortMatchupByColumn(defender){
      const key = this.unitKey(defender);
      const active = this.matchup.sortAttackers === 'column' && this.matchup.sortAttackersColumnKey === key;
      this.matchup.sortAttackers = 'column';
      this.matchup.sortAttackersColumnKey = key;
      this.matchup.sortAttackersDirection = active ? this.toggleDirection(this.matchup.sortAttackersDirection, 'desc') : 'desc';
      this.refreshMatchupPresentation();
    },

    sortMatchupByRow(attacker){
      const key = this.unitKey(attacker);
      const active = this.matchup.sortDefenders === 'row' && this.matchup.sortDefendersRowKey === key;
      this.matchup.sortDefenders = 'row';
      this.matchup.sortDefendersRowKey = key;
      this.matchup.sortDefendersDirection = active ? this.toggleDirection(this.matchup.sortDefendersDirection, 'asc') : 'desc';
      this.refreshMatchupPresentation();
    },

    sortButtonSymbol(axis, unit=null){
      if(axis === 'alpha'){
        if(this.matchup.sortAttackers === 'alpha' && this.matchup.sortDefenders === 'alpha'){
          return this.matchup.sortAttackersDirection === 'desc' ? 'Z-A' : 'A-Z';
        }
        return 'A-Z';
      }
      if(axis === 'column'){
        const active = this.matchup.sortAttackers === 'column' && this.matchup.sortAttackersColumnKey === this.unitKey(unit);
        if(!active) return '↕';
        return this.matchup.sortAttackersDirection === 'asc' ? '↑' : '↓';
      }
      if(axis === 'row'){
        const active = this.matchup.sortDefenders === 'row' && this.matchup.sortDefendersRowKey === this.unitKey(unit);
        if(!active) return '↕';
        return this.matchup.sortDefendersDirection === 'asc' ? '↑' : '↓';
      }
      return '↕';
    },

    toggleMatchupRecomputeOption(key){
      if(!(key in this.matchup)) return;
      this.matchup[key] = !this.matchup[key];
      this.rebuildMatchup();
    },

    computeMatchupCell(attackerUnit, defenderUnit){
      return window.MatchupEngine.computeCell(attackerUnit, defenderUnit, {
        combineShootingProfiles: !!this.matchup.combineShootingProfiles,
        isWeaponEnabled: w => this.isWeaponEnabledByToggles(w),
        isMeleeEnabled: () => !!this.matchup.showMelee,
        effectiveWeaponModifiers: w => this.effectiveWeaponModifiers(w),
        isAbilityEnabled: (unit, ability) => this.isUnitAbilityEnabled(unit, ability),
        isEnhancementEnabled: (unit, enhancement) => this.isUnitEnhancementEnabled(unit, enhancement),
      });
    },

    matchupCellMetric(cell){
      return window.MatchupEngine.metricValue(cell, this.matchup.metric || 'damage');
    },

    setMatchupMetric(metric){
      this.matchup.metric = metric;
      this.refreshMatchupPresentation();
    },

    matchupMetricRange(){
      return this.matchup.metricRange || { min: 0, max: 0 };
    },

    updateMatchupMetricRange(){
      this.matchup.metricRange = window.MatchupEngine.metricRange(this.matchup.visibleRows || [], this.matchup.metric || 'damage');
      return this.matchup.metricRange;
    },

    matchupCellStyle(cell){
      if(cell?._matchupMetric === (this.matchup.metric || 'damage') && typeof cell?._matchupStyle === 'string'){
        return cell._matchupStyle;
      }
      return window.MatchupEngine.colorForValue(this.matchupCellMetric(cell), this.matchupMetricRange());
    },

    formatMatchupMetric(cell){
      const value = this.matchupCellMetric(cell);
      if(!Number.isFinite(value)) return '—';
      const mode = this.matchup.metric || 'damage';
      if(mode === 'unitKill') return `${(Math.min(value, 0.999) * 100).toFixed(1)}%`;
      if(mode === 'modelWounds') return `${(value * 100).toFixed(0)}%`;
      return value.toFixed(2);
    },

    tsvCell(value){
      return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    },

    matchupCopyHeader(unit){
      return this.tsvCell([
        this.unitLabelText(unit),
        this.unitPointsText(unit),
        this.matchupDefenseLabel(unit),
      ].filter(Boolean).join(' '));
    },

    matchupCopyRowHeader(unit){
      return this.tsvCell([
        this.unitLabelText(unit),
        this.unitPointsText(unit),
        this.matchupWeaponSummary(unit),
      ].filter(Boolean).join(' '));
    },

    matchupCellCopyText(cell){
      const weapons = cell?.weaponName ? ` ${cell.weaponName}` : '';
      return this.tsvCell(`${this.formatMatchupMetric(cell)}${weapons}`);
    },

    matchupGridTsv(){
      const defenders = this.matchupVisibleDefenders();
      const rows = this.matchupVisibleRows();
      const header = ['Attacker \\ Defender', ...defenders.map(col => this.matchupCopyHeader(col.unit))];
      const body = rows.map(row => [
        this.matchupCopyRowHeader(row.unit),
        ...(row.cells || []).map(cell => this.matchupCellCopyText(cell)),
      ]);
      return [header, ...body].map(line => line.map(value => this.tsvCell(value)).join('\t')).join('\n');
    },

    async copyMatchupGrid(){
      const text = this.matchupGridTsv();
      try{
        if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(text);
        }else{
          const el = document.createElement('textarea');
          el.value = text;
          el.setAttribute('readonly', '');
          el.style.position = 'fixed';
          el.style.left = '-9999px';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        }
        this.matchupClipboardStatus = 'Copied';
      }catch(err){
        this.matchupClipboardStatus = 'Copy failed';
        throw err;
      }finally{
        setTimeout(() => {
          if(this.matchupClipboardStatus) this.matchupClipboardStatus = '';
        }, 1600);
      }
    },

    unitLabelText(unit, fallback='Unit'){
      return unit?.label || fallback;
    },

    unitPointsText(unit){
      const points = parseFloat(unit?._points);
      if(!Number.isFinite(points)) return '';
      const formatted = Math.abs(points - Math.round(points)) < 1e-9
        ? String(Math.round(points))
        : points.toFixed(1).replace(/\.?0+$/, '');
      return `(${formatted} pts)`;
    },

    openUnitProfile(unit, role=''){
      this.profileUnit = unit || null;
      this.profileModalRole = role;
      this.profileModalOpen = true;
    },

    closeUnitProfile(){
      this.profileModalOpen = false;
      this.profileModalRole = '';
      this.profileUnit = null;
    },

    weaponStateKey(w){
      return String(w?._weaponKey || [w?.name, w?.range, w?.A, w?.skill, w?.S, w?.AP, w?.D, w?.mode].join('|'));
    },

    ensureModifierState(w){
      const key = this.weaponStateKey(w);
      if(!key) return {};
      const names = window.ArmyImportService?.splitModifiers(w?.modifiers) || [];
      const defaults = { ...(w?._modifierToggles || {}) };
      names.forEach(name => {
        if(!(name in defaults)) defaults[name] = true;
      });
      if(!this.modifierToggleState[key]){
        this.modifierToggleState[key] = defaults;
      }else{
        Object.entries(defaults).forEach(([name, enabled]) => {
          if(!(name in this.modifierToggleState[key])) this.modifierToggleState[key][name] = enabled;
        });
      }
      return this.modifierToggleState[key];
    },

    weaponModifierNames(w){
      const names = window.ArmyImportService?.splitModifiers(w?.modifiers) || [];
      const toggled = Object.keys(this.ensureModifierState(w));
      return [...new Set([...names, ...toggled])];
    },

    isWeaponModifierEnabled(w, mod){
      if(!w) return false;
      const state = this.ensureModifierState(w);
      if(!(mod in state)) state[mod] = true;
      return !!state[mod];
    },

    toggleWeaponModifier(w, mod){
      if(!w) return;
      const state = this.ensureModifierState(w);
      state[mod] = !this.isWeaponModifierEnabled(w, mod);
    },

    effectiveWeaponModifiers(w){
      const names = this.weaponModifierNames(w).filter(mod => this.isWeaponModifierEnabled(w, mod));
      return window.ArmyImportService?.serializeModifiers(names) || names.join(', ');
    },

    unitStateKey(unit){
      return String(unit?._unitKey || unit?._baseUnit?._unitKey || unit?._viewKey || unit?.label || 'unit');
    },

    unitAbilityNames(unit){
      return [...new Set((unit?.abilities || []).map(name => String(name || '').trim()).filter(Boolean))];
    },

    unitEnhancementNames(unit){
      return [...new Set((unit?._enhancements || []).map(enh => String(enh?.name || '').trim()).filter(Boolean))];
    },

    ensureUnitToggleState(unit){
      const key = this.unitStateKey(unit);
      if(!this.unitToggleState[key]) this.unitToggleState[key] = { abilities: {}, enhancements: {} };
      const state = this.unitToggleState[key];
      if(!state.abilities) state.abilities = {};
      if(!state.enhancements) state.enhancements = {};
      this.unitAbilityNames(unit).forEach(name => {
        if(!(name in state.abilities)) state.abilities[name] = true;
      });
      this.unitEnhancementNames(unit).forEach(name => {
        if(!(name in state.enhancements)) state.enhancements[name] = true;
      });
      return state;
    },

    isUnitAbilityEnabled(unit, ability){
      if(!unit || !ability) return true;
      const state = this.ensureUnitToggleState(unit);
      if(!(ability in state.abilities)) state.abilities[ability] = true;
      return !!state.abilities[ability];
    },

    toggleUnitAbility(unit, ability){
      if(!unit || !ability) return;
      const state = this.ensureUnitToggleState(unit);
      state.abilities[ability] = !this.isUnitAbilityEnabled(unit, ability);
    },

    isUnitEnhancementEnabled(unit, enhancement){
      if(!unit || !enhancement) return true;
      const state = this.ensureUnitToggleState(unit);
      if(!(enhancement in state.enhancements)) state.enhancements[enhancement] = true;
      return !!state.enhancements[enhancement];
    },

    toggleUnitEnhancement(unit, enhancement){
      if(!unit || !enhancement) return;
      const state = this.ensureUnitToggleState(unit);
      state.enhancements[enhancement] = !this.isUnitEnhancementEnabled(unit, enhancement);
    },

    parseWeaponKeywords(txt){
      return window.WeaponCalc.parseWeaponKeywords(txt);
    },

    matchupCalcOneWeapon(w, def){
      return window.WeaponCalc.calcOneWeapon(w, def, this.effectiveWeaponModifiers(w));
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
    clamp(x,min,max){ return window.WeaponCalc.clamp(x, min, max); },

    parseNdX(expr){ return window.WeaponCalc.parseNdX(expr); },

    probAtLeast(target, mod=0, cap=null){ return window.WeaponCalc.probAtLeast(target, mod, cap); },

    applyRerolls(p, mode){ return window.WeaponCalc.applyRerolls(p, mode); },

    woundNeeded(S,T){ return window.WeaponCalc.woundNeeded(S, T); },

    pickSave(sv, inv, ap, saveMod){ return window.WeaponCalc.pickSave(sv, inv, ap, saveMod); },

    // ---------------- Core calculation ----------------
    calculate(){
      const hasTwinlinked = this.hasMod('twinlinked');
      const mods = {
        critMin: this.modNumber('mod_critmin', 6),
        rrHit: this.modSelect('mod_rrhit', 'none'),
        rrWound: hasTwinlinked ? 'all' : this.modSelect('mod_rrwound', 'none'),
        forceHit: (this.defenseMods.forceHit || '').trim(),
        forceWound: (this.defenseMods.forceWound || '').trim(),
        withinHalf: this.hasMod('mod_within'),
        stationary: this.hasMod('mod_station'),
        charged: this.hasMod('mod_charged'),
        torrent: this.hasMod('torrent'),
        ignoresCover: this.hasMod('ignorescover'),
        blast: this.hasMod('blast'),
        heavy: this.hasMod('heavy'),
        sustained: this.modNumber('sustained', 0),
        rapidFire: this.modNumber('rapidfire', 0),
        melta: this.modNumber('melta', 0),
        anti: this.modNumber('anti', 0),
        lethal: this.hasMod('lethal'),
        devw: this.hasMod('devw'),
      };
      const result = window.WeaponCalc.calculateProfile({ weapon: this.weapon, defense: this.defense, mods });
      const { inputs, probabilities, output, damageFlow } = result;

      this.output.hits = output.hits;
      this.output.wounds = output.wounds;
      this.output.fails = output.fails;
      this.output.dmg = output.dmg;

      const lines = [];
      if(inputs.Aeff !== inputs.A) lines.push(`<span class="pill">ATKs: Base(${inputs.A.toFixed(1)}) + Extra(${inputs.Aeff-inputs.A}) -> Total=${inputs.Aeff.toFixed(1)}</span>`);
      else lines.push(`<span class="pill">ATKs: ${inputs.Aeff.toFixed(1)}</span>`);
      lines.push(`<span class="pill">Hit%=${probabilities.pHit.toFixed(3)*100}%</span>`);
      lines.push(`<span class="pill">Crit%=${(probabilities.pCrit*100).toFixed(1)}%</span>`);
      if(mods.sustained > 0) lines.push(`<span class="pill">extra hits/ATK=${probabilities.extraHitsPerAttack.toFixed(3)}</span>`);
      lines.push(`<span class="pill">Need ${inputs.neededAfterMod}+ to Wound -> ${(probabilities.pWound*100).toFixed(1)}%</span>`);
      if(mods.anti > 0) lines.push(`<span class="pill">Anti=${mods.anti}+</span>`);
      lines.push(`<span class="pill">save need ${inputs.neededSave===7?'--':inputs.neededSave+'+'} -> pSave=${(probabilities.pSave*100).toFixed(1)}%</span>`);
      if(mods.devw) lines.push(`<span class="pill">DevW portion~${(probabilities.portionDevastating*100).toFixed(1)}%</span>`);
      if(parseFloat(this.defense.DR) > 0) lines.push(`<span class="pill">Damage Reduction ${this.defense.DR}</span>`);
      if(parseFloat(this.defense.Fnp)) lines.push(`<span class="pill">FNP ${this.defense.Fnp}+</span>`);
      if(mods.melta > 0 && mods.withinHalf) lines.push(`<span class="pill">Melta +${mods.melta}</span>`);
      lines.push(`<span class="pill">Expected Models Killed~${output.modelsKilled.toFixed(2)}</span>`);
      this.output.breakdownHtml = lines.join(' ');

      const hitExtras = [];
      if(mods.torrent || String(this.weapon.skill).trim().toLowerCase()==='auto') hitExtras.push('auto-hit');
      if(mods.forceHit) hitExtras.push(`cap ${mods.forceHit}`);
      if(mods.rrHit !== 'none') hitExtras.push(`rr ${mods.rrHit}`);
      if(mods.sustained > 0) hitExtras.push(`Sust ${mods.sustained}`);
      if(mods.heavy && mods.stationary) hitExtras.push('Heavy');

      const woundExtras = [];
      if(mods.forceWound) woundExtras.push(`cap ${mods.forceWound}`);
      if(mods.rrWound !== 'none') woundExtras.push(`rr ${mods.rrWound}`);
      if(mods.charged) woundExtras.push('Lance');
      if(mods.lethal) woundExtras.push('Lethal');
      if(mods.anti > 0) woundExtras.push(`Anti ${mods.anti}+`);
      if(mods.devw) woundExtras.push('DevW');

      const saveExtras = [];
      if(this.defense.cover && !mods.ignoresCover) saveExtras.push('cover');
      if(this.defense.Inv && String(this.defense.Inv).trim()) saveExtras.push(`inv ${String(this.defense.Inv).trim()}+`);

      const dmgExtras = [];
      if(mods.melta > 0 && mods.withinHalf) dmgExtras.push(`Melta +${mods.melta}`);
      if(parseFloat(this.defense.DR) > 0) dmgExtras.push(`-DR ${this.defense.DR}`);

      const fnpExtras = [];
      if(parseFloat(this.defense.Fnp) > 1) fnpExtras.push(String(this.defense.Fnp));

      const steps = [
        { label: this.buildStepLabel('Attacks', [`+${inputs.Aeff-inputs.A}`]), value: damageFlow.baseTotalDamage },
        { label: this.buildStepLabel('Hits', hitExtras), value: damageFlow.dmgAfterHits, percent: (damageFlow.dmgAfterHits - damageFlow.baseTotalDamage)/damageFlow.baseTotalDamage },
        { label: this.buildStepLabel('Wounds', woundExtras), value: damageFlow.dmgAfterWounds, percent: (damageFlow.dmgAfterWounds - damageFlow.dmgAfterHits)/damageFlow.dmgAfterHits },
        { label: this.buildStepLabel('After Saves', saveExtras), value: damageFlow.dmgAfterSaves, percent: (damageFlow.dmgAfterSaves - damageFlow.dmgAfterWounds)/damageFlow.dmgAfterWounds },
        { label: this.buildStepLabel('Damage Reduction', dmgExtras), value: damageFlow.dmgAfterDamageMods, percent: (damageFlow.dmgAfterDamageMods - damageFlow.dmgAfterSaves)/damageFlow.dmgAfterSaves },
        { label: this.buildStepLabel('After FNP', fnpExtras), value: output.dmg, percent: (output.dmg - damageFlow.dmgAfterDamageMods)/damageFlow.dmgAfterDamageMods },
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
      return window.ArmyImportService?.getAllSelections?.(node) || [];
    },

    extractWeaponsFromNode(node){
      return window.ArmyImportService?.extractWeaponsFromNode?.(node) || [];
    },

    extractWeaponsFromProfiles(profiles){
      return this.extractWeaponsFromNode({ profiles, number: 1 });
    },

    collectUnits(force, opts = { separateModels:false }){
      return window.ArmyImportService?.collectUnits(force, opts) || [];
    },

    isMeleeWeapon(w){
      return window.MatchupEngine.isMeleeWeapon(w);
    },
  }
}

window.weaponVsDefenseApp = weaponVsDefenseApp;
