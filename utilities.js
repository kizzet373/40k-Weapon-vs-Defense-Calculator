function weaponVsDefenseApp(){
  return {
    // ---------------- UI ----------------
    sidebarCollapsed: false,
    matchupOptionsCollapsed: false,
    jsonPaste: '',
    importStatus: { type: '', text: '' },

    // ---------------- Matchups ----------------
    matchupModalOpen: false,
    matchup: {
      loading:false,
      attackerRosterIdx: 0,
      attackerForceIdx: 0,
      defenderRosterIdx: 0,
      defenderForceIdx: 0,
      sortAttackers: 'score',
      sortAttackersDirection: 'desc',
      sortAttackersColumnKey: '',
      sortDefenders: 'score',
      sortDefendersDirection: 'desc',
      sortDefendersRowKey: '',
      combineShootingProfiles: true,
      conditionsMet: false,
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
      scoreMaps: { attackers: {}, defenders: {} },
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
    unitCustomModifierState: {},
    matchupClipboardStatus: '',
    matchupExportFormat: 'visible',
    matchupActionMenu: '',
    matchupComputationCache: { weaponModifiers: {}, defenses: {}, ruleNames: {}, sharedRuleNames: {}, modifierNames: {} },
    matchupMerge: {
      attackerFrom: '',
      attackerTo: '',
      defenderFrom: '',
      defenderTo: '',
    },
    profileModalOpen: false,
    profileModalRole: '',
    profileUnit: null,
    profileCustomModifierText: '',
    formulaModalOpen: false,
    formulaCell: null,
    formulaAttacker: null,
    formulaDefender: null,
    ruleDescriptionModalOpen: false,
    ruleDescription: { title: '', type: '', description: '', source: '' },

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
      this.addBaseProfilesRoster();
      this.syncModValueDefault();
      this.renderBreakdownChart(null);

      window.addEventListener('resize', () => {
        if (this.output && Number.isFinite(this.output.dmg)) this.calculate();
        else this.renderBreakdownChart(null);
      });
    },

    baseProfilesRosterData(){
      const profiles = [
        ['Light Infantry',      60,  { T: 3,  Sv: 5, W: 1,  models: 10 }, [
          ['Basic rifle', '24', '10', '4', '3', '0', '1', 'ranged'],
          ['Close combat weapons', 'Melee', '10', '4', '3', '0', '1', 'melee'],
        ]],
        ['Armored Infantry',    100, { T: 3,  Sv: 4, W: 1,  models: 10 }, [
          ['Carbine', '24', '10', '4', '4', '0', '1', 'ranged'],
          ['Close combat weapons', 'Melee', '10', '4', '3', '0', '1', 'melee'],
        ]],
        ['Power Armour',        90,  { T: 4,  Sv: 3, W: 2,  models: 5 }, [
          ['Bolt rifle', '24', '10', '3', '4', '1', '1', 'ranged'],
          ['Combat blades', 'Melee', '10', '3', '4', '0', '1', 'melee'],
        ]],
        ['Tough Infantry',      80,  { T: 5,  Sv: 5, W: 1,  models: 10 }, [
          ['Scrap guns', '18', '10', '4', '4', '0', '1', 'ranged'],
          ['Heavy close combat weapons', 'Melee', '20', '4', '4', '0', '1', 'melee'],
        ]],
        ['Elite Infantry',      90,  { T: 5,  Sv: 3, W: 3,  models: 3 }, [
          ['Elite rifle', '24', '6', '3', '5', '1', '2', 'ranged'],
          ['Power weapons', 'Melee', '9', '3', '5', '2', '1', 'melee'],
        ]],
        ['Terminators',         180, { T: 5,  Sv: 2, Inv: 4, W: 3,  models: 5 }, [
          ['Storm bolters', '24', '20', '3', '4', '0', '1', 'ranged'],
          ['Power fists', 'Melee', '15', '3', '8', '2', '2', 'melee'],
        ]],
        ['Gravis Armour',       120, { T: 6,  Sv: 3, W: 3,  models: 3 }, [
          ['Heavy bolt rifles', '30', '6', '3', '5', '1', '2', 'ranged'],
          ['Heavy fists', 'Melee', '9', '3', '5', '1', '1', 'melee'],
        ]],
        ['Light Vehicle',       80,  { T: 9,  Sv: 3, W: 10, models: 1 }, [
          ['Autocannon', '48', '4', '4', '9', '1', '3', 'ranged'],
          ['Hull weapon', '36', '3', '4', '5', '0', '1', 'ranged'],
          ['Armoured hull', 'Melee', '3', '4', '6', '0', '1', 'melee'],
        ]],
        ['Battle Tank',         150, { T: 10, Sv: 3, W: 12, models: 1 }, [
          ['Battle cannon', '72', 'D6+3', '4', '10', '1', '3', 'ranged'],
          ['Heavy bolter', '36', '3', '4', '5', '1', '2', 'ranged'],
          ['Armoured tracks', 'Melee', '3', '4', '7', '0', '1', 'melee'],
        ]],
        ['Titanic Target',      400, { T: 12, Sv: 2, Inv: 5, W: 22, models: 1 }, [
          ['Titanic cannon', '72', '8', '3', '12', '2', '4', 'ranged'],
          ['Secondary guns', '36', '12', '3', '5', '1', '1', 'ranged'],
          ['Titanic feet', 'Melee', '6', '3', '8', '2', '3', 'melee'],
        ]],
      ];
      const weaponsForProfile = (entries, unitIndex) => entries.map(([name, range, A, skill, S, AP, D, mode], weaponIndex) => ({
        name,
        range,
        A,
        skill,
        S,
        AP,
        D,
        modifiers: '',
        mode,
        _profileCount: 1,
        _count: 1,
        _weaponKey: `base-profile-${unitIndex + 1}|weapon-${weaponIndex + 1}`,
      }));
      return {
        roster: {
          name: 'Base Profiles',
          forces: [{
            name: 'Common defensive profiles',
            _importedUnits: profiles.map(([label, points, defense, weapons], index) => ({
              label,
              weapons: weaponsForProfile(weapons || [], index),
              defense: {
                ...defense,
                totalWounds: (parseFloat(defense.W) || 0) * (parseInt(defense.models, 10) || 1),
              },
              abilities: [],
              source: 'Base Profiles',
              _unitKey: `base-profile-${index + 1}`,
              _groupId: `base-profile-${index + 1}`,
              _children: [],
              _keywords: [],
              _points: points,
              _enhancements: [],
              _upgrades: [],
            })),
            _unitMerges: [],
          }],
        },
        _sourceFormat: 'base-profiles',
      };
    },

    addBaseProfilesRoster(){
      if((this.rosters || []).some(roster => roster?.data?._sourceFormat === 'base-profiles')) return;
      this.addRoster(this.baseProfilesRosterData(), 'Base Profiles');
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

    weaponKeywordList(w){
      return window.ArmyImportService?.splitModifiers(w?.modifiers) || [];
    },

    fmtProfileNumber(value){
      const n = Number(value);
      if(!Number.isFinite(n)) return String(value ?? '');
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
    },

    weaponEffectiveStats(w, unit=null, defender=null){
      const modifierText = this.effectiveWeaponModifiers(w, unit || this.activeUnit, defender);
      const kw = window.WeaponCalc.parseWeaponKeywords(modifierText || '', w);
      const base = {
        range: String(w?.range || ''),
        A: String(w?.A || ''),
        skill: String(w?.skill || ''),
        S: String(w?.S || ''),
        AP: String(w?.AP || ''),
        D: String(w?.D || ''),
      };
      const diceMean = value => window.WeaponCalc.parseNdX(value).mean || 0;
      const numeric = value => parseFloat(String(value ?? '').replace('+', ''));
      const profileValue = (field, effective, baseText=base[field], comparableBase=baseText) => {
        const text = this.fmtProfileNumber(effective);
        const baseComparable = this.fmtProfileNumber(comparableBase);
        return {
          text,
          base: baseText,
          changed: text !== baseComparable && String(baseText ?? '') !== '',
        };
      };

      return {
        range: { text: base.range, base: base.range, changed: false },
        A: profileValue('A', Math.max(0, diceMean(w?.A) + (kw.attacksAdd || 0))),
        skill: profileValue('skill', Math.max(0, (numeric(w?.skill) || 0) + (kw.skillTargetMod || 0))),
        S: profileValue('S', Math.max(0, (numeric(w?.S) || 0) + (kw.strengthAdd || 0))),
        AP: profileValue('AP', Math.max(0, Math.abs(numeric(w?.AP) || 0) + (kw.apAdd || 0)), base.AP, Math.abs(numeric(w?.AP) || 0)),
        D: profileValue('D', Math.max(0, diceMean(w?.D) + (kw.damageAdd || 0))),
      };
    },

    weaponEffectiveStat(w, field, unit=null, defender=null){
      return this.weaponEffectiveStats(w, unit, defender)?.[field] || { text: '', base: '', changed: false };
    },

    weaponEffectiveKeywordList(w, unit=null, defender=null){
      const modifierText = this.effectiveWeaponModifiers(w, unit || this.activeUnit, defender);
      const tokens = window.ArmyImportService?.splitModifiers(modifierText) || [];
      const seen = new Set();
      return tokens
        .map(token => String(token || '').replace(/^(?:Melee|Ranged|Shooting):\s*/i, '').trim())
        .filter(Boolean)
        .filter(token => {
          const key = token.toLowerCase();
          if(seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    },

    get activeForce(){
      return this.forces?.[this.selectedForceIdx] || null;
    },

    // ---------------- Roster loading ----------------
    setImportStatus(type, name){
      const fallback = name || 'army';
      this.importStatus = {
        type,
        text: type === 'success'
          ? `successfully imported ${fallback}`
          : `unsuccessfully imported ${fallback}`,
      };
    },

    importNameFromText(text, fallback='pasted JSON'){
      try{
        const obj = JSON.parse(text);
        const normalized = window.ArmyImportService?.normalizeRosterData(obj, fallback) || obj;
        return (normalized?.roster?.name || normalized?.name || fallback || 'army').trim();
      }catch(_err){
        const match = String(text || '').match(/"name"\s*:\s*"([^"]+)"/i);
        return match?.[1] || fallback || 'army';
      }
    },

    importRoster(){
      if((this.jsonPaste || '').trim()){
        this.loadPastedRoster();
        return;
      }
      this.$refs?.rosterFileInput?.click?.();
    },

    async onRosterFile(evt){
      const f = evt.target.files?.[0];
      if(!f) return;
      const text = await f.text();
      try{
        const obj = JSON.parse(text);
        const label = this.addRoster(obj, f?.name || 'Uploaded JSON');
        this.setImportStatus('success', label);
        if(evt?.target) evt.target.value = '';
      }catch(e){
        this.setImportStatus('error', f?.name || 'army file');
        alert('Invalid JSON');
        console.error(e);
      }
    },

    loadPastedRoster(){
      const t = (this.jsonPaste || '').trim();
      if(!t){ alert('Paste JSON first.'); return; }
      const importName = this.importNameFromText(t, 'pasted JSON');
      try{
        const label = this.addRoster(JSON.parse(t), 'Pasted JSON');
        this.setImportStatus('success', label || importName);
      }catch(e){
        this.setImportStatus('error', importName);
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
      return label;
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

    sourceUnitKey(unit){
      return String(unit?._baseUnit?._unitKey || unit?._unitKey || unit?._groupId || unit?.label || '');
    },

    refreshUnitsPreservingSelection(preferredKey=null){
      const previousKey = preferredKey || this.sourceUnitKey(this.activeUnit);
      const previousIndex = this.selectedUnitIdx;
      const force = this.getForceByIdx(this.selectedForceIdx);
      this.units = force ? this.collectUnits(force) : [];
      const nextIndex = previousKey
        ? this.units.findIndex(unit => this.sourceUnitKey(unit) === previousKey)
        : -1;
      this.selectedUnitIdx = nextIndex >= 0
        ? nextIndex
        : (this.units.length ? this.clamp(previousIndex, 0, this.units.length - 1) : 0);
    },

    rosterForces(){
      return (this.rosters || []).flatMap(roster => (roster?.data?.roster?.forces) || (roster?.data?.forces) || []);
    },

    flattenUnitTree(units){
      const out = [];
      (units || []).forEach(unit => {
        out.push(unit);
        out.push(...this.flattenUnitTree(unit?._children || []));
      });
      return out;
    },

    findDisplayedUnitBySourceKey(sourceKey){
      if(!sourceKey) return null;
      for(const force of this.rosterForces()){
        const found = this.flattenUnitTree(this.collectUnits(force)).find(unit => this.sourceUnitKey(unit) === sourceKey);
        if(found) return found;
      }
      return null;
    },

    refreshAfterRosterUnitChange(preferredKey=null, profileKey=null){
      this.refreshUnitsPreservingSelection(preferredKey);
      if(profileKey && this.profileModalOpen){
        const refreshedProfile = this.findDisplayedUnitBySourceKey(profileKey);
        if(refreshedProfile) this.profileUnit = refreshedProfile;
      }
      this.onUnitChanged();
      this.clearMatchupComputationCache();
      if(this.matchupModalOpen) this.rebuildMatchup();
    },

    renameUnit(unit, newLabel){
      const label = String(newLabel || '').trim();
      if(!unit || !label) return false;
      const profileKey = this.sourceUnitKey(unit);
      const currentProfileKey = this.sourceUnitKey(this.profileUnit);
      const selectedKey = this.sourceUnitKey(this.activeUnit);
      let changed = false;
      this.rosterForces().forEach(force => {
        if(window.ArmyImportService?.renameUnit(force, unit, label)) changed = true;
      });
      if(!changed) unit.label = label;
      this.refreshAfterRosterUnitChange(selectedKey, currentProfileKey);
      if(this.profileUnit && this.sourceUnitKey(this.profileUnit) === profileKey) this.profileUnit.label = label;
      return true;
    },

    promptRenameUnit(unit=null){
      const target = unit || this.activeUnit;
      if(!target) return;
      const current = this.unitLabelText(target, 'Unit');
      const next = window.prompt('Rename unit/model', current);
      if(next == null) return;
      this.renameUnit(target, next);
    },

    duplicateSelectedUnit(){
      const unit = this.activeUnit;
      const force = this.getForceByIdx(this.selectedForceIdx);
      if(!unit || !force) return;

      const duplicated = window.ArmyImportService?.duplicateUnit(force, unit);
      if(!duplicated) return;

      this.units = this.collectUnits(force);
      const duplicateKey = String(duplicated._unitKey || duplicated.key || '');
      const duplicateIndex = this.units.findIndex(candidate => String(candidate?._unitKey || '') === duplicateKey);
      this.selectedUnitIdx = duplicateIndex >= 0 ? duplicateIndex : Math.max(0, this.units.length - 1);
      this.onUnitChanged();
      this.clearMatchupComputationCache();
      if(this.matchupModalOpen) this.rebuildMatchup();
    },

    deleteSelectedUnit(){
      const unit = this.activeUnit;
      const force = this.getForceByIdx(this.selectedForceIdx);
      if(!unit || !force) return;

      const oldIndex = this.selectedUnitIdx;
      const deleted = window.ArmyImportService?.removeUnit(force, unit);
      if(!deleted) return;

      this.units = this.collectUnits(force);
      this.selectedUnitIdx = this.units.length
        ? this.clamp(oldIndex, 0, this.units.length - 1)
        : 0;
      this.onUnitChanged();
      this.clearMatchupComputationCache();
      if(this.matchupModalOpen) this.rebuildMatchup();
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

      this.onMatchupRosterChanged('attacker', false);
      this.onMatchupRosterChanged('defender', false);
      this.rebuildMatchup();
    },

    closeMatchupModal(){
      this.matchupModalOpen = false;
      this.closeMatchupFormula();
    },

    swapMatchupSides(){
      const aR = this.matchup.attackerRosterIdx;
      const aF = this.matchup.attackerForceIdx;
      this.matchup.attackerRosterIdx = this.matchup.defenderRosterIdx;
      this.matchup.attackerForceIdx  = this.matchup.defenderForceIdx;
      this.matchup.defenderRosterIdx = aR;
      this.matchup.defenderForceIdx  = aF;
      this.onMatchupRosterChanged('attacker', false);
      this.onMatchupRosterChanged('defender', false);
      this.rebuildMatchup();
    },

    getForcesForRoster(rosterIdx){
      const r = this.rosters?.[rosterIdx];
      const obj = r?.data || null;
      return (obj?.roster?.forces) || (obj?.forces) || [];
    },

    onMatchupRosterChanged(side, rebuild=true){
      if(side === 'attacker'){
        this.matchupAttackerForces = this.getForcesForRoster(this.matchup.attackerRosterIdx);
        this.matchup.attackerForceIdx = this.clamp(this.matchup.attackerForceIdx, 0, Math.max(0, this.matchupAttackerForces.length-1));
      }else{
        this.matchupDefenderForces = this.getForcesForRoster(this.matchup.defenderRosterIdx);
        this.matchup.defenderForceIdx = this.clamp(this.matchup.defenderForceIdx, 0, Math.max(0, this.matchupDefenderForces.length-1));
      }
      if(rebuild && this.matchupModalOpen) this.rebuildMatchup();
    },

    matchupDefenseLabel(u){
      const d = this.effectiveDefense(u);
      return this.matchupDefenseProfileLine(d, d.models ?? u?.size ?? null);
    },

    matchupDefenseHeaderLabel(u){
      return this.matchupDefenseProfileLines(u).join('\n');
    },

    defenseProfileLineHtml(line){
      return this.htmlCell(line).replace(/\s\|\s/g, ' <span class="defenseProfileSeparator">|</span> ');
    },

    defenseProfileTextHtml(text){
      return String(text || '')
        .split('\n')
        .map(line => this.defenseProfileLineHtml(line))
        .join('<br>');
    },

    profileChildSummaryHtml(child){
      return `${this.defenseProfileTextHtml(this.matchupDefenseHeaderLabel(child))} <span class="profileSummarySeparator">·</span> ${this.htmlCell(this.matchupWeaponSummary(child))}`;
    },

    matchupDefenseProfileLines(u){
      const profileUnits = (Array.isArray(u?._children) && u._children.length) ? u._children : [u];
      const order = [];
      const profiles = new Map();
      profileUnits.forEach(profileUnit => {
        const d = this.effectiveDefense(profileUnit);
        const key = [
          d.T ?? '',
          d.Sv ?? '',
          d.Inv ?? '',
          d.Fnp ?? '',
          d.cover ? 'cover' : '',
          d.W ?? '',
        ].join('|');
        const models = parseFloat(d.models ?? profileUnit?.size ?? 1);
        if(!profiles.has(key)){
          profiles.set(key, { unit: profileUnit, models: 0 });
          order.push(key);
        }
        profiles.get(key).models += Number.isFinite(models) && models > 0 ? models : 1;
      });

      return order.map(key => {
        const entry = profiles.get(key);
        return this.matchupDefenseProfileLineForUnit(entry.unit, entry.models);
      }).filter(Boolean);
    },

    changedDefensePart(label, effective, base, formatter=value => String(value)){
      if(effective == null || effective === '') return '';
      const effectiveText = formatter(effective);
      if(base == null || base === '') return `${label}${effectiveText}`;
      const baseText = formatter(base);
      if(String(effectiveText) === String(baseText)) return `${label}${effectiveText}`;
      const effectiveNumber = parseFloat(effective);
      const baseNumber = parseFloat(base);
      const deltaText = Number.isFinite(effectiveNumber) && Number.isFinite(baseNumber)
        ? ` (${effectiveNumber - baseNumber > 0 ? '+' : ''}${this.fmtProfileNumber(effectiveNumber - baseNumber)})`
        : '';
      return `${label}${effectiveText} from ${baseText}${deltaText}`;
    },

    matchupDefenseProfileLineForUnit(unit, modelsOverride=null){
      const d = this.effectiveDefense(unit);
      const base = unit?.defense || {};
      const t = (d.T!=null) ? this.changedDefensePart('T', d.T, base.T) : '';
      const sv = (d.Sv!=null && d.Sv!=='') ? this.changedDefensePart('', d.Sv, base.Sv, value => `${value}+`) : '';
      const inv = (d.Inv!=null && d.Inv!=='') ? this.changedDefensePart('', d.Inv, base.Inv, value => `${value}++`) : '';
      const saves = [sv, inv].filter(Boolean).join(' ');
      const w = (d.W!=null) ? this.changedDefensePart('W', d.W, base.W) : '';
      const fnp = (d.Fnp!=null && d.Fnp!=='') ? this.changedDefensePart('FNP ', d.Fnp, base.Fnp, value => `${value}+`) : '';
      const cover = d.cover ? 'Cover' : '';
      const models = modelsOverride ?? d.models ?? null;
      const size = (models!=null) ? `${models} models` : '';
      return [t, saves, w, fnp, cover, size].filter(Boolean).join(' | ');
    },

    matchupDefenseProfileLine(d, modelsOverride=null){
      const t = (d.T!=null) ? `T${d.T}` : '';
      const saves = [
        (d.Sv!=null && d.Sv!=='') ? `${d.Sv}+` : '',
        (d.Inv!=null && d.Inv!=='') ? `${d.Inv}++` : '',
      ].filter(Boolean).join(' ');
      const w = (d.W!=null) ? `W${d.W}` : '';
      const fnp = (d.Fnp!=null && d.Fnp!=='') ? `FNP ${d.Fnp}+` : '';
      const cover = d.cover ? 'Cover' : '';
      const models = modelsOverride ?? d.models ?? null;
      const size = (models!=null) ? `${models} models` : '';
      return [t, saves, w, fnp, cover, size].filter(Boolean).join(' | ');
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

    matchupWeaponTypeSummary(u){
      const attackMode = u?._attackMode || 'all';
      const filtered = (u?.weapons || [])
        .filter(w => this.isWeaponEnabledByToggles(w))
        .filter(w => this.weaponMatchesAttackMode(w, attackMode));
      const hasMelee = filtered.some(w => this.isMeleeWeapon(w));
      const hasShooting = filtered.some(w => !this.isMeleeWeapon(w));
      const parts = [];
      if(hasMelee) parts.push('melee');
      if(hasShooting) parts.push('shoot');
      return parts.length ? parts.join(' / ') : 'No weapons';
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

    unitPointValue(unit){
      const direct = parseFloat(unit?._points);
      if(Number.isFinite(direct) && direct > 0) return direct;

      const base = unit?._baseUnit || null;
      if(base && base !== unit){
        const basePoints = this.unitPointValue(base);
        if(Number.isFinite(basePoints) && basePoints > 0) return basePoints;
      }
      return null;
    },

    averageFinite(values){
      const finite = (values || []).filter(value => Number.isFinite(value));
      if(!finite.length) return null;
      return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    },

    rawEfficiencyScores(items){
      const finite = (items || []).filter(item => Number.isFinite(item.raw));
      const scores = {};
      finite.forEach(item => {
        scores[item.key] = item.raw;
        if(item.stableKey) scores[item.stableKey] = scores[item.key];
      });
      return scores;
    },

    efficiencyScoreMultiplier(side){
      const mode = this.matchup.metric || 'damage';
      if(side === 'defender'){
        if(mode === 'damage') return 38400;
        if(mode === 'unitKill') return 11520;
        return 4800;
      }
      if(mode === 'damage') return 1800;
      if(mode === 'unitKill') return 28800;
      return 11700;
    },

    updateMatchupScoreMaps(rows=this.matchup.visibleRows || [], defenders=this.matchup.visibleDefenders || []){
      const attackerItems = (rows || []).map(row => {
        const points = this.unitPointValue(row.unit);
        const avgMetric = this.averageFinite((row.cells || []).map(cell => this.matchupCellMetric(cell)));
        return {
          key: this.unitKey(row.unit),
          stableKey: String(row.unit?._unitKey || ''),
          raw: points && avgMetric != null ? (avgMetric / points) * this.efficiencyScoreMultiplier('attacker') : null,
        };
      });

      const defenderItems = (defenders || []).map((col, colIndex) => {
        const points = this.unitPointValue(col.unit);
        const avgIncoming = this.averageFinite((rows || []).map(row => this.matchupCellMetric(row.cells?.[colIndex])));
        const raw = (() => {
          if(!points || avgIncoming == null || avgIncoming <= 0) return null;
          if((this.matchup.metric || 'damage') === 'unitKill'){
            const survivalRate = Math.max(0, 1 - Math.min(avgIncoming, 1));
            return (survivalRate / points) * this.efficiencyScoreMultiplier('defender');
          }
          return (1 / (avgIncoming * points)) * this.efficiencyScoreMultiplier('defender');
        })();
        return {
          key: this.unitKey(col.unit),
          stableKey: String(col.unit?._unitKey || ''),
          raw,
        };
      });

      this.matchup.scoreMaps = {
        attackers: this.rawEfficiencyScores(attackerItems),
        defenders: this.rawEfficiencyScores(defenderItems),
      };
      return this.matchup.scoreMaps;
    },

    formatEfficiencyScore(value){
      if(!Number.isFinite(value)) return '—';
      return String(Math.round(value));
    },

    matchupHeaderScore(unit, side){
      const map = side === 'defender' ? this.matchup.scoreMaps?.defenders : this.matchup.scoreMaps?.attackers;
      const value = map?.[this.unitKey(unit)];
      return this.formatEfficiencyScore(value);
    },

    matchupHeaderMeta(unit, side){
      const points = this.unitPointsText(unit) || '(— pts)';
      return `${points} - Score: ${this.matchupHeaderScore(unit, side)}`;
    },

    profileScoreBaseUnit(unit){
      return unit?._baseUnit || unit || null;
    },

    profileScoreDefenders(){
      const visible = this.matchupVisibleDefenders?.() || [];
      if(visible.length) return visible.map(col => col.unit).filter(Boolean);
      return (this.matchupDefenderUnits || []).filter(Boolean);
    },

    profileScoreAttackers(){
      const visible = this.matchupVisibleRows?.() || [];
      if(visible.length) return visible.map(row => row.unit).filter(Boolean);
      return (this.matchupAttackerUnits || []).filter(Boolean);
    },

    profileScoreCell(attackerUnit, defenderUnit, overrides={}){
      if(!Object.keys(overrides || {}).length) return this.cachedMatchupCell(attackerUnit, defenderUnit);
      return window.MatchupEngine.computeCell(attackerUnit, defenderUnit, {
        combineShootingProfiles: overrides.combineShootingProfiles ?? !!this.matchup.combineShootingProfiles,
        conditionsMet: !!this.matchup.conditionsMet,
        isWeaponEnabled: w => this.isWeaponEnabledByToggles(w),
        isMeleeEnabled: () => !!this.matchup.showMelee,
        effectiveWeaponModifiers: (w, unit, defender) => this.effectiveWeaponModifiers(w, unit, defender),
        effectiveDefense: (unit, opposingUnit) => this.effectiveDefense(unit, opposingUnit),
        isAbilityEnabled: (unit, ability) => this.isUnitAbilityEnabled(unit, ability),
        isEnhancementEnabled: (unit, enhancement) => this.isUnitEnhancementEnabled(unit, enhancement),
      });
    },

    profileOffensiveScoreRaw(unit, attackMode='all'){
      const base = this.profileScoreBaseUnit(unit);
      const defenders = this.profileScoreDefenders();
      const points = this.unitPointValue(base);
      if(!base || !points || !defenders.length) return null;
      const attacker = attackMode && attackMode !== 'all' ? this.attackModeVariant(base, attackMode) : base;
      if(!this.hasMatchupWeaponProfiles(attacker)) return null;
      const avgMetric = this.averageFinite(defenders.map(defender => this.matchupCellMetric(
        this.profileScoreCell(attacker, defender, attackMode && attackMode !== 'all' ? { combineShootingProfiles: true } : {})
      )));
      return avgMetric != null ? (avgMetric / points) * this.efficiencyScoreMultiplier('attacker') : null;
    },

    profileDefensiveScoreRaw(unit){
      const base = this.profileScoreBaseUnit(unit);
      const attackers = this.profileScoreAttackers();
      const points = this.unitPointValue(base);
      if(!base || !points || !attackers.length) return null;
      const avgIncoming = this.averageFinite(attackers.map(attacker => this.matchupCellMetric(
        this.profileScoreCell(attacker, base)
      )));
      if(avgIncoming == null || avgIncoming <= 0) return null;
      if((this.matchup.metric || 'damage') === 'unitKill'){
        const survivalRate = Math.max(0, 1 - Math.min(avgIncoming, 1));
        return (survivalRate / points) * this.efficiencyScoreMultiplier('defender');
      }
      return (1 / (avgIncoming * points)) * this.efficiencyScoreMultiplier('defender');
    },

    profileOverallScoreRaw(unit){
      return this.averageFinite([
        this.profileOffensiveScoreRaw(unit),
        this.profileDefensiveScoreRaw(unit),
      ]);
    },

    profileOffensiveScoreText(unit){
      const offense = this.formatEfficiencyScore(this.profileOffensiveScoreRaw(unit));
      const melee = this.formatEfficiencyScore(this.profileOffensiveScoreRaw(unit, 'melee'));
      const shooting = this.formatEfficiencyScore(this.profileOffensiveScoreRaw(unit, 'shooting'));
      return `Offensive Score: ${offense} (Melee: ${melee} / Shooting: ${shooting})`;
    },

    profileDefensiveScoreText(unit){
      return `Defensive Score: ${this.formatEfficiencyScore(this.profileDefensiveScoreRaw(unit))}`;
    },

    profileOverallScoreText(unit){
      return `Overall Score: ${this.formatEfficiencyScore(this.profileOverallScoreRaw(unit))}`;
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
      this.updateMatchupScoreMaps(rows, defenders);
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
      const summary = unit => summaries.get(this.unitKey(unit)) || { maxMetric:0, totalMetric:0, focusMetric:0, score:0 };
      const direction = this.matchup.sortDefendersDirection || 'desc';
      const metricSort = (getter, fallback=sortAlpha) => (a, b) => this.compareSortValues(getter(a), getter(b), direction) || fallback(a, b);
      const byDmg = metricSort(unit => summary(unit).maxMetric);
      const byOverallDmg = metricSort(unit => summary(unit).totalMetric, byDmg);
      const byScore = metricSort(unit => summary(unit).score, byOverallDmg);
      const byLeastDmg = metricSort(unit => summary(unit).focusMetric, (a, b) => this.compareSortValues(summary(a).totalMetric, summary(b).totalMetric, direction) || sortAlpha(a, b));
      const byRow = metricSort(unit => {
        const attacker = this.sortAnchorAttacker();
        return attacker ? this.matchupCellMetric(this.cachedMatchupCell(attacker, unit)) : summary(unit).focusMetric;
      }, byOverallDmg);
      const mode = this.matchup.sortDefenders || 'alpha';
      if(mode === 'leastDamage') return list.sort(byLeastDmg);
      if(mode === 'row') return list.sort(byRow);
      if(mode === 'score') return list.sort(byScore);
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
      const points = this.unitPointValue(unit);
      const rowCount = (this.matchup.rows || []).length;
      const avgIncoming = rowCount ? totalMetric / rowCount : 0;
      const score = (() => {
        if(!points || !Number.isFinite(avgIncoming) || avgIncoming <= 0) return 0;
        if((this.matchup.metric || 'damage') === 'unitKill'){
          const survivalRate = Math.max(0, 1 - Math.min(avgIncoming, 1));
          return (survivalRate / points) * this.efficiencyScoreMultiplier('defender');
        }
        return (1 / (avgIncoming * points)) * this.efficiencyScoreMultiplier('defender');
      })();
      return { maxMetric, totalMetric, focusMetric, score };
    },

    mergeOptionsForSide(side){
      return side === 'attacker' ? (this.matchupAttackerBaseUnits || this.matchupAttackerUnits || []) : (this.matchupDefenderUnits || []);
    },

    unitDropdownLabel(unit){
      const label = this.unitLabelText(unit);
      const models = parseInt(unit?.defense?.models ?? unit?.size, 10);
      return Number.isFinite(models) && models > 0 ? `${label} (${models})` : label;
    },

    mergeOptionLabel(unit){
      return this.unitDropdownLabel(unit);
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
      const selectedKey = this.sourceUnitKey(this.activeUnit);
      const ok = window.ArmyImportService?.mergeUnits(force, fromKey, toKey);
      if(!ok){ alert('Choose two different units to merge.'); return; }
      if(side === 'attacker'){
        this.matchupMerge.attackerFrom = '';
        this.matchupMerge.attackerTo = '';
      }else{
        this.matchupMerge.defenderFrom = '';
        this.matchupMerge.defenderTo = '';
      }
      this.refreshUnitsPreservingSelection(selectedKey === fromKey ? toKey : selectedKey);
      this.onUnitChanged();
      this.rebuildMatchup();
    },

    clearManualMerges(side){
      const force = this.forceForMatchupSide(side);
      const selectedKey = this.sourceUnitKey(this.activeUnit);
      window.ArmyImportService?.clearMerges(force);
      this.refreshUnitsPreservingSelection(selectedKey);
      this.onUnitChanged();
      this.rebuildMatchup();
    },

    unmergeSelectedUnit(side){
      const targetKey = side === 'attacker' ? this.matchupMerge.attackerTo : this.matchupMerge.defenderTo;
      const force = this.forceForMatchupSide(side);
      const selectedKey = this.sourceUnitKey(this.activeUnit);
      const ok = window.ArmyImportService?.unmergeUnit(force, targetKey);
      if(!ok){ alert('No uniquely named models or merges found for that unit.'); return; }
      if(side === 'attacker'){
        this.matchupMerge.attackerFrom = '';
        this.matchupMerge.attackerTo = '';
      }else{
        this.matchupMerge.defenderFrom = '';
        this.matchupMerge.defenderTo = '';
      }
      this.refreshUnitsPreservingSelection(selectedKey || targetKey);
      this.onUnitChanged();
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
      this.clearMatchupComputationCache();

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
        (unit._children || []).forEach((child, index) => {
          Object.defineProperty(child, '_parentUnit', {
            value: unit,
            enumerable: false,
            configurable: true,
            writable: true,
          });
          decorate(child, `${path}.${index}`);
        });
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
      const rowAverage = attacker => defenders.length ? rowTotal(attacker) / defenders.length : 0;
      const colAverage = defender => attackers.length ? colTotal(defender) / attackers.length : 0;
      const rowScore = attacker => {
        const points = this.unitPointValue(attacker);
        const avgMetric = rowAverage(attacker);
        return points && Number.isFinite(avgMetric) ? (avgMetric / points) * this.efficiencyScoreMultiplier('attacker') : null;
      };
      const colScore = defender => {
        const points = this.unitPointValue(defender);
        const avgIncoming = colAverage(defender);
        if(!points || !Number.isFinite(avgIncoming) || avgIncoming <= 0) return null;
        if((this.matchup.metric || 'damage') === 'unitKill'){
          const survivalRate = Math.max(0, 1 - Math.min(avgIncoming, 1));
          return (survivalRate / points) * this.efficiencyScoreMultiplier('defender');
        }
        return (1 / (avgIncoming * points)) * this.efficiencyScoreMultiplier('defender');
      };
      const maxRow = attacker => Math.max(0, ...defenders.map(defender => metricFor(attacker, defender)).filter(Number.isFinite));
      const maxCol = defender => Math.max(0, ...attackers.map(attacker => metricFor(attacker, defender)).filter(Number.isFinite));

      const rowDirection = this.matchup.sortAttackersDirection || 'desc';
      const colDirection = this.matchup.sortDefendersDirection || 'desc';
      const rowMode = this.matchup.sortAttackers || 'score';
      const colMode = this.matchup.sortDefenders || 'score';
      const rowAnchor = this.sortAnchorDefender();
      const colAnchor = this.sortAnchorAttacker();

      attackers.sort((a, b) => {
        if(rowMode === 'alpha') return alpha(rowDirection)(a, b);
        if(rowMode === 'column' && rowAnchor){
          return this.compareSortValues(metricFor(a, rowAnchor), metricFor(b, rowAnchor), rowDirection) || alpha('asc')(a, b);
        }
        if(rowMode === 'score'){
          return this.compareSortValues(rowScore(a), rowScore(b), rowDirection) || alpha('asc')(a, b);
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
        if(colMode === 'score'){
          return this.compareSortValues(colScore(a), colScore(b), colDirection) || alpha('asc')(a, b);
        }
        if(colMode === 'overallDamage'){
          return this.compareSortValues(colTotal(a), colTotal(b), colDirection) || alpha('asc')(a, b);
        }
        if(colMode === 'dmg' || colMode === 'pkill'){
          return this.compareSortValues(maxCol(a), maxCol(b), colDirection) || alpha('asc')(a, b);
        }
        if(colMode === 'leastDamage' && focusAttacker){
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
        this.matchup.sortAttackers = this.matchup.sortAttackers || 'score';
        this.matchup.sortAttackersDirection = this.matchup.sortAttackersDirection || 'desc';
      }else if(side === 'defender'){
        this.matchup.sortDefenders = this.matchup.sortDefenders || 'score';
        this.matchup.sortDefendersDirection = this.matchup.sortDefendersDirection || 'desc';
      }
      this.refreshMatchupPresentation();
    },

    normalizeMatchupSideSortMode(mode){
      if(mode === 'alpha' || mode === 'overallDamage' || mode === 'score') return mode;
      return 'score';
    },

    setMatchupSideSortMode(side, mode){
      const isAttacker = side === 'attacker';
      const modeKey = isAttacker ? 'sortAttackers' : 'sortDefenders';
      const anchorKey = isAttacker ? 'sortAttackersColumnKey' : 'sortDefendersRowKey';
      this.matchup[modeKey] = this.normalizeMatchupSideSortMode(mode);
      this.matchup[anchorKey] = '';
      this.refreshMatchupPresentation();
    },

    cycleMatchupSideSort(side){
      const isAttacker = side === 'attacker';
      const directionKey = isAttacker ? 'sortAttackersDirection' : 'sortDefendersDirection';
      const defaultDirection = 'desc';
      const direction = this.matchup[directionKey] || defaultDirection;
      this.matchup[directionKey] = direction === 'asc' ? 'desc' : 'asc';
      this.refreshMatchupPresentation();
    },

    matchupSideSortLabel(side){
      const isAttacker = side === 'attacker';
      const direction = isAttacker ? this.matchup.sortAttackersDirection : this.matchup.sortDefendersDirection;
      return direction === 'asc' ? '↑' : '↓';
    },

    matchupSideSortTitle(side){
      const label = side === 'attacker' ? 'attackers' : 'defenders';
      const current = this.matchupSideSortLabel(side);
      const mode = side === 'attacker' ? this.matchup.sortAttackers : this.matchup.sortDefenders;
      const modeLabel = this.matchupSideSortModeLabel(mode);
      return `Sort ${label}: ${modeLabel} ${current}`;
    },

    matchupSideSortModeLabel(mode){
      const normalized = this.normalizeMatchupSideSortMode(mode);
      if(normalized === 'overallDamage') return 'Total';
      if(normalized === 'alpha') return 'Name';
      return 'Score';
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

    setMatchupRecomputeOption(key, value){
      if(!(key in this.matchup)) return;
      this.matchup[key] = !!value;
      this.rebuildMatchup();
    },

    computeMatchupCell(attackerUnit, defenderUnit, options={}){
      return window.MatchupEngine.computeCell(attackerUnit, defenderUnit, {
        includeFormula: !!options.includeFormula,
        combineShootingProfiles: !!this.matchup.combineShootingProfiles,
        conditionsMet: !!this.matchup.conditionsMet,
        isWeaponEnabled: w => this.isWeaponEnabledByToggles(w),
        isMeleeEnabled: () => !!this.matchup.showMelee,
        effectiveWeaponModifiers: (w, unit, defender) => this.effectiveWeaponModifiers(w, unit, defender),
        effectiveDefense: (unit, opposingUnit) => this.effectiveDefense(unit, opposingUnit),
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

    htmlCell(value){
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    matchupMetricLabel(){
      const mode = this.matchup.metric || 'damage';
      if(mode === 'modelWounds') return 'Damage %';
      if(mode === 'unitKill') return 'Chance to Kill';
      return 'Damage';
    },

    matchupCopyHeader(unit, item=null){
      const prefix = item?.isChild ? '↳ ' : '';
      return this.tsvCell([
        `${prefix}${this.unitLabelText(unit)}`,
        this.matchupHeaderMeta(unit, 'defender'),
        this.matchupDefenseLabel(unit),
      ].filter(Boolean).join(' '));
    },

    matchupCopyRowHeader(unit, item=null){
      const prefix = item?.isChild ? '↳ ' : '';
      return this.tsvCell([
        `${prefix}${this.unitLabelText(unit)}`,
        this.matchupHeaderMeta(unit, 'attacker'),
        this.matchupWeaponSummary(unit),
      ].filter(Boolean).join(' '));
    },

    matchupCellCopyText(cell){
      const weapons = cell?.weaponName ? ` - ${cell.weaponName}` : '';
      return this.tsvCell(`${this.formatMatchupMetric(cell)}${weapons}`);
    },

    normalizedMatchupExportFormat(format=this.matchupExportFormat){
      const value = String(format || '');
      if(value.startsWith('import:')) return value;
      if(value === 'excel') return value;
      return 'visible';
    },

    matchupExportOptions(){
      const base = [
        { value: 'visible', label: 'Visible Grid' },
        { value: 'excel', label: 'Excel Detailed' },
      ];
      const seen = new Set();
      ['attacker', 'defender'].forEach(side => {
        const payload = this.matchupSidePayload(side);
        const key = `${payload.rosterIndex}:${payload.forceIndex}:${payload.rosterLabel}`;
        if(seen.has(key)) return;
        seen.add(key);
        const label = payload.rosterLabel || (side === 'attacker' ? 'Attacker roster' : 'Defender roster');
        base.push({ value: `import:${side}`, label: `${label} import` });
      });
      return base;
    },

    toggleMatchupActionMenu(menu){
      this.matchupActionMenu = this.matchupActionMenu === menu ? '' : menu;
    },

    childAttackerRows(unit, rowIndex){
      return (unit?._children || [])
        .filter(child => this.hasMatchupWeaponProfiles(child))
        .map((child, childIndex) => ({
          unit: child,
          rowIndex,
          childIndex,
          depth: 1,
          isChild: true,
          isSubtotal: false,
          parentKey: this.unitKey(unit),
        }));
    },

    childDefenderColumns(unit, colIndex){
      return this.sortedDefenderChildren(unit?._children || [])
        .map((child, childIndex) => ({
          unit: child,
          colIndex,
          childIndex,
          depth: 1,
          isChild: true,
          isSubtotal: false,
          parentKey: this.unitKey(unit),
        }));
    },

    matchupExportRows(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const rows = [];
      (this.matchup.rows || []).forEach((row, rowIndex) => {
        rows.push({
          unit: row.unit,
          rowIndex,
          depth: 0,
          isChild: false,
          isSubtotal: true,
          parentKey: '',
        });
        if(mode !== 'visible') rows.push(...this.childAttackerRows(row.unit, rowIndex));
      });
      return rows.map(row => ({
        ...row,
        cells: this.matchupExportColumns(mode).map(col => this.cachedMatchupCell(row.unit, col.unit)),
      }));
    },

    matchupExportColumns(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const cols = [];
      (this.matchupDefenderUnits || []).forEach((unit, colIndex) => {
        cols.push({ unit, colIndex, depth: 0, isChild: false, isSubtotal: true, parentKey: '' });
        if(mode !== 'visible') cols.push(...this.childDefenderColumns(unit, colIndex));
      });
      return cols;
    },

    matchupExportGrid(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const columns = this.matchupExportColumns(mode);
      const rows = [];
      (this.matchup.rows || []).forEach((row, rowIndex) => {
        const parentRow = {
          unit: row.unit,
          rowIndex,
          depth: 0,
          isChild: false,
          isSubtotal: true,
        };
        rows.push(parentRow);
        if(mode !== 'visible') rows.push(...this.childAttackerRows(row.unit, rowIndex));
      });
      const shapedRows = rows.map(row => ({
        ...row,
        cells: columns.map(col => this.cachedMatchupCell(row.unit, col.unit)),
      }));
      const range = window.MatchupEngine.metricRange(shapedRows, this.matchup.metric || 'damage');
      return { format: mode, rows: shapedRows, columns, range };
    },

    matchupCurrentVisibleGrid(){
      const columns = this.matchupVisibleDefenders();
      const rows = (this.matchupVisibleRows() || []).map(row => ({
        ...row,
        isSubtotal: !row.isChild,
        cells: columns.map(col => this.cachedMatchupCell(row.unit, col.unit)),
      }));
      const range = window.MatchupEngine.metricRange(rows, this.matchup.metric || 'damage');
      return { format: 'visible-current', rows, columns, range };
    },

    visibleElementText(el){
      if(!el) return '';
      if(typeof window !== 'undefined' && window.getComputedStyle){
        const style = window.getComputedStyle(el);
        if(style.display === 'none' || style.visibility === 'hidden') return '';
      }
      return String(el.textContent || '').replace(/\s+/g, ' ').trim();
    },

    matchupDisplayLinesForCell(cell){
      if(!cell) return [];
      const lines = [];
      const add = value => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if(text) lines.push(text);
      };

      if(cell.classList?.contains('matchupCell')){
        add(this.visibleElementText(cell.querySelector('.matchupCellValue')));
        add(this.visibleElementText(cell.querySelector('.matchupCellNote')));
        return lines;
      }

      const corner = cell.querySelector?.('.matchupCornerHeader > div');
      if(corner){
        String(corner.innerText || corner.textContent || '')
          .split(/\r?\n/)
          .forEach(add);
        return lines;
      }

      const headerLink = cell.querySelector?.('.matchupHeaderProfileLink');
      if(headerLink){
        add(this.visibleElementText(headerLink.querySelector('.profileNameText')));
        add(this.visibleElementText(headerLink.querySelector('.profileMetaText')));
        headerLink.querySelectorAll('.matchupWeaponTypeText,.matchupDefenseText').forEach(el => add(this.visibleElementText(el)));
        return lines;
      }

      add(this.visibleElementText(cell));
      return lines;
    },

    matchupDisplayedGridData(){
      if(typeof document === 'undefined') return null;
      const table = document.querySelector('.matchupGrid');
      if(!table) return null;
      const readCell = cell => {
        const computed = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(cell) : null;
        return {
          tag: cell.tagName?.toLowerCase() || 'td',
          isDataCell: cell.classList?.contains('matchupCell') || false,
          classes: cell.className || '',
          lines: this.matchupDisplayLinesForCell(cell),
          style: computed ? {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            fontWeight: computed.fontWeight,
            textAlign: computed.textAlign,
          } : {},
        };
      };
      const headerRows = [...(table.tHead?.rows || [])].map(row => [...row.cells].map(readCell));
      const bodyRows = [...(table.tBodies?.[0]?.rows || [])].map(row => [...row.cells].map(readCell));
      if(!headerRows.length && !bodyRows.length) return null;
      return { headerRows, bodyRows };
    },

    displayedCellPlainText(cell){
      const lines = (cell?.lines || []).filter(Boolean);
      if(cell?.isDataCell && lines.length > 1) return `${lines[0]} - ${lines.slice(1).join(' - ')}`;
      return lines.join(' ');
    },

    displayedGridTsv(grid){
      if(!grid) return '';
      const rows = [...(grid.headerRows || []), ...(grid.bodyRows || [])];
      return rows
        .map(row => row.map(cell => this.tsvCell(this.displayedCellPlainText(cell))).join('\t'))
        .join('\n');
    },

    displayedCellStyle(cell){
      const style = cell?.style || {};
      const out = [];
      if(style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') out.push(`background-color:${style.backgroundColor}`);
      if(style.color) out.push(`color:${style.color}`);
      if(style.textAlign) out.push(`text-align:${style.textAlign}`);
      if(style.fontWeight) out.push(`font-weight:${style.fontWeight}`);
      return out.join(';');
    },

    displayedGridHtml(grid){
      if(!grid) return '';
      const styles = [
        'table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}',
        'th,td{border:1px solid #a6a6a6;padding:5px 7px;vertical-align:top;white-space:normal}',
        '.cellValue{font-weight:700}',
        '.cellNote{font-size:10px;color:#1f2937}',
      ].join('');
      const excelOptions = [
        '<!--[if gte mso 9]><xml>',
        '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>',
        '<x:Name>Matchups</x:Name>',
        '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>',
        '</xml><![endif]-->',
      ].join('');
      const renderCell = cell => {
        const tag = cell.tag === 'th' ? 'th' : 'td';
        const style = this.htmlCell(this.displayedCellStyle(cell));
        const content = (() => {
          const lines = (cell.lines || []).filter(Boolean);
          if(cell.isDataCell && lines.length > 1){
            return `<span class="cellValue">${this.htmlCell(lines[0])}</span><span class="cellNote"> - ${this.htmlCell(lines.slice(1).join(' - '))}</span>`;
          }
          return lines.map(line => this.htmlCell(line)).join('<br>');
        })();
        return `<${tag} style="${style}">${content}</${tag}>`;
      };
      const renderRows = rows => (rows || []).map(row => `<tr>${row.map(renderCell).join('')}</tr>`).join('');
      return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">${excelOptions}<style>${styles}</style></head><body><table><thead>${renderRows(grid.headerRows)}</thead><tbody>${renderRows(grid.bodyRows)}</tbody></table></body></html>`;
    },

    matchupGridTsv(format='visible'){
      const displayed = this.matchupDisplayedGridData();
      if(displayed) return this.displayedGridTsv(displayed);
      const grid = this.matchupCurrentVisibleGrid();
      const header = ['Attacker \\ Defender', ...grid.columns.map(col => this.matchupCopyHeader(col.unit, col))];
      const body = grid.rows.map(row => [
        this.matchupCopyRowHeader(row.unit, row),
        ...(row.cells || []).map(cell => this.matchupCellCopyText(cell)),
      ]);
      return [header, ...body].map(line => line.map(value => this.tsvCell(value)).join('\t')).join('\n');
    },

    matchupCellStyleForExport(cell, range){
      const color = window.MatchupEngine.colorHexForValue(this.matchupCellMetric(cell), range || this.matchupMetricRange());
      return color ? `background-color:${color}; color:#071016; mso-pattern:auto none;` : '';
    },

    excelOutlineStyle(item, collapsed=false){
      if(!item?.isChild) return 'mso-outline-level:1;';
      return collapsed ? 'mso-outline-level:2; display:none;' : 'mso-outline-level:2;';
    },

    matchupGridHtml(format='excel'){
      const displayed = this.matchupDisplayedGridData();
      if(displayed) return this.displayedGridHtml(displayed);
      const grid = this.matchupCurrentVisibleGrid();
      const metric = this.htmlCell(this.matchupMetricLabel());
      const styles = [
        'table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}',
        'th,td{border:1px solid #a6a6a6;padding:5px 7px;vertical-align:top;white-space:normal}',
        'th{background:#1f2937;color:#ffffff;font-weight:700}',
        '.subtotal th,.subtotal td{font-weight:700}',
        '.child th{font-weight:400;padding-left:22px;background:#dbeafe}',
        '.childCol{font-weight:400;background:#dbeafe;color:#071016}',
        '.cellValue{font-weight:700}',
        '.cellNote{font-size:10px;color:#1f2937}',
      ].join('');
      const excelOptions = [
        '<!--[if gte mso 9]><xml>',
        '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>',
        '<x:Name>Matchups</x:Name>',
        '<x:WorksheetOptions><x:Outline><x:SummaryBelow>False</x:SummaryBelow><x:SummaryRight>False</x:SummaryRight></x:Outline></x:WorksheetOptions>',
        '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>',
        '</xml><![endif]-->',
      ].join('');
      const colgroup = [
        '<col style="width:260px">',
        ...grid.columns.map(col => `<col style="width:150px; ${this.excelOutlineStyle(col)}">`),
      ].join('');
      const headerCells = grid.columns.map(col => {
        const label = `${col.isChild ? '↳ ' : ''}${this.unitLabelText(col.unit)}\n${this.matchupHeaderMeta(col.unit, 'defender')}\n${this.matchupDefenseLabel(col.unit)}`;
        const cls = col.isChild ? ' class="childHeader childCol"' : '';
        return `<th${cls} style="${this.htmlCell(this.excelOutlineStyle(col))}">${this.htmlCell(label).replace(/\n/g, '<br>')}</th>`;
      }).join('');
      const bodyRows = grid.rows.map(row => {
        const rowClass = row.isChild ? 'child' : 'subtotal';
        const rowLabel = `${row.isChild ? '↳ ' : ''}${this.unitLabelText(row.unit)}\n${this.matchupHeaderMeta(row.unit, 'attacker')}\n${this.matchupWeaponSummary(row.unit)}`;
        const cells = row.cells.map((cell, index) => {
          const col = grid.columns[index];
          const style = `${this.matchupCellStyleForExport(cell, grid.range)} ${this.excelOutlineStyle(col)}`;
          const note = cell?.weaponName ? `<span class="cellNote"> - ${this.htmlCell(cell.weaponName)}</span>` : '';
          return `<td style="${this.htmlCell(style)}"><span class="cellValue">${this.htmlCell(this.formatMatchupMetric(cell))}</span>${note}</td>`;
        }).join('');
        return `<tr class="${rowClass}" style="${this.htmlCell(this.excelOutlineStyle(row))}"><th>${this.htmlCell(rowLabel).replace(/\n/g, '<br>')}</th>${cells}</tr>`;
      }).join('');
      return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">${excelOptions}<style>${styles}</style></head><body><table><colgroup>${colgroup}</colgroup><caption>${metric} Matchup Grid</caption><thead><tr><th>Attacker \\ Defender</th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
    },

    matchupExportUnit(unit){
      const cleanWeapons = (unit?.weapons || []).map(w => ({
        name: w.name || '',
        count: window.MatchupEngine.weaponProfileCount(w),
        range: w.range || '',
        A: w.A || '',
        skill: w.skill || '',
        S: w.S || '',
        AP: w.AP || '',
        D: w.D || '',
        modifiers: w.modifiers || '',
        mode: w.mode || '',
      }));
      return {
        key: String(unit?._unitKey || this.unitKey(unit)),
        viewKey: this.unitKey(unit),
        label: this.unitLabelText(unit),
        points: parseFloat(unit?._points) || 0,
        defense: { ...(unit?.defense || {}) },
        weapons: cleanWeapons,
        abilities: [...(unit?.abilities || [])],
        abilityDescriptions: { ...(unit?._abilityDescriptions || {}) },
        enhancements: [...(unit?._enhancements || [])],
        keywords: [...(unit?._keywords || [])],
        isCharacterUnit: !!unit?._isCharacterUnit,
        isCharacterModel: !!unit?._isCharacterModel,
        isLeaderModel: !!unit?._isLeaderModel,
        children: (unit?._children || []).map(child => this.matchupExportUnit(child)),
      };
    },

    matchupSidePayload(side){
      const rosterIdx = side === 'attacker' ? this.matchup.attackerRosterIdx : this.matchup.defenderRosterIdx;
      const forceIdx = side === 'attacker' ? this.matchup.attackerForceIdx : this.matchup.defenderForceIdx;
      const roster = this.rosters?.[rosterIdx] || null;
      const force = this.getForcesForRoster(rosterIdx)?.[forceIdx] || null;
      const baseUnits = side === 'attacker' ? (this.matchupAttackerBaseUnits || []) : (this.matchupDefenderUnits || []);
      const gridUnits = side === 'attacker' ? (this.matchupAttackerUnits || []) : (this.matchupDefenderUnits || []);
      return {
        rosterIndex: rosterIdx,
        forceIndex: forceIdx,
        rosterLabel: roster?.label || '',
        forceName: force?.name || force?.label || '',
        sourceRoster: roster?.data || null,
        manualMerges: [...(force?._unitMerges || [])],
        postMergeUnits: baseUnits.map(unit => this.matchupExportUnit(unit)),
        gridUnits: gridUnits.map(unit => this.matchupExportUnit(unit)),
      };
    },

    matchupRosterImportPayload(side){
      const normalizedSide = side === 'defender' ? 'defender' : 'attacker';
      const payload = this.matchupSidePayload(normalizedSide);
      return {
        schema: '40k-roster-matchup-import',
        version: 1,
        exportedAt: new Date().toISOString(),
        side: normalizedSide,
        rosterLabel: payload.rosterLabel,
        forceName: payload.forceName,
        sourceRoster: payload.sourceRoster,
        manualMerges: payload.manualMerges,
        postMergeUnits: payload.postMergeUnits,
        gridUnits: payload.gridUnits,
        options: {
          combineShootingProfiles: !!this.matchup.combineShootingProfiles,
          conditionsMet: !!this.matchup.conditionsMet,
          showShooting: !!this.matchup.showShooting,
          showMelee: !!this.matchup.showMelee,
        },
      };
    },

    matchupImportPayload(){
      const grid = this.matchupExportGrid('full');
      const rosters = {
        attacker: this.matchupSidePayload('attacker'),
        defender: this.matchupSidePayload('defender'),
      };
      return {
        schema: '40k-matchup-grid',
        version: 1,
        exportedAt: new Date().toISOString(),
        metric: this.matchup.metric || 'damage',
        metricLabel: this.matchupMetricLabel(),
        options: {
          combineShootingProfiles: !!this.matchup.combineShootingProfiles,
          conditionsMet: !!this.matchup.conditionsMet,
          showShooting: !!this.matchup.showShooting,
          showMelee: !!this.matchup.showMelee,
        },
        rosters,
        attackerRoster: rosters.attacker.rosterLabel,
        defenderRoster: rosters.defender.rosterLabel,
        attackers: grid.rows.map(row => ({
          key: this.unitKey(row.unit),
          parentKey: row.parentKey || '',
          depth: row.depth || 0,
          isChild: !!row.isChild,
          unit: this.matchupExportUnit(row.unit),
        })),
        defenders: grid.columns.map(col => ({
          key: this.unitKey(col.unit),
          parentKey: col.parentKey || '',
          depth: col.depth || 0,
          isChild: !!col.isChild,
          unit: this.matchupExportUnit(col.unit),
        })),
        cells: grid.rows.map(row => ({
          attackerKey: this.unitKey(row.unit),
          values: grid.columns.map(col => {
            const cell = this.cachedMatchupCell(row.unit, col.unit);
            return {
              defenderKey: this.unitKey(col.unit),
              display: this.formatMatchupMetric(cell),
              damage: cell?.dmg || 0,
              damagePct: cell?.pctModelWounds ?? null,
              chanceToKill: cell?.pctUnitKilled ?? null,
              kills: cell?.kills || 0,
              weaponName: cell?.weaponName || '',
              profilesUsed: cell?.profilesUsed || [],
              style: this.matchupCellStyleForExport(cell, grid.range),
            };
          }),
        })),
      };
    },

    matchupExportText(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      if(mode.startsWith('import:')) return JSON.stringify(this.matchupRosterImportPayload(mode.split(':')[1]), null, 2);
      return this.matchupGridTsv(mode);
    },

    async writeClipboardText(text, html=''){
      if(html && typeof ClipboardItem !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard?.write){
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
        return;
      }
      if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return;
      }
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    },

    async copyMatchupGrid(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const text = this.matchupExportText(mode);
      const html = mode === 'excel' ? this.matchupGridHtml('excel') : '';
      try{
        await this.writeClipboardText(text, html);
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

    matchupExportFilename(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if(mode === 'excel') return `matchup-grid-${stamp}.xls`;
      if(mode.startsWith('import:')){
        const side = mode.split(':')[1] === 'defender' ? 'defender' : 'attacker';
        const label = (this.matchupSidePayload(side).rosterLabel || side)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || side;
        return `${label}-import-${stamp}.json`;
      }
      return `matchup-grid-${mode}-${stamp}.tsv`;
    },

    exportMatchupGrid(format=this.matchupExportFormat){
      const mode = this.normalizedMatchupExportFormat(format);
      const content = mode === 'excel' ? this.matchupGridHtml('excel') : this.matchupExportText(mode);
      const type = mode === 'excel'
        ? 'application/vnd.ms-excel;charset=utf-8'
        : (mode.startsWith('import:') ? 'application/json;charset=utf-8' : 'text/tab-separated-values;charset=utf-8');
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.matchupExportFilename(mode);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.matchupClipboardStatus = 'Exported';
      setTimeout(() => {
        if(this.matchupClipboardStatus === 'Exported') this.matchupClipboardStatus = '';
      }, 1600);
    },

    unitLabelText(unit, fallback='Unit'){
      return unit?.label || fallback;
    },

    clearMatchupComputationCache(){
      this.matchupComputationCache = { weaponModifiers: {}, defenses: {}, ruleNames: {}, sharedRuleNames: {}, modifierNames: {} };
      if(this.matchup){
        this.matchup.cellCache = {};
        this.matchup.cacheWarmToken = (this.matchup.cacheWarmToken || 0) + 1;
      }
    },

    clearMatchupDerivedCaches(){
      this.matchupComputationCache = { weaponModifiers: {}, defenses: {}, ruleNames: {}, sharedRuleNames: {}, modifierNames: {} };
      if(this.matchup) this.matchup.cacheWarmToken = (this.matchup.cacheWarmToken || 0) + 1;
    },

    relatedUnitKeys(unit){
      const keys = new Set();
      const add = entry => {
        if(!entry) return;
        const key = this.unitKey(entry);
        if(key) keys.add(key);
      };
      add(unit);
      add(unit?._baseUnit);
      add(unit?._parentUnit);
      if(unit?._parentUnit){
        (unit._parentUnit._children || []).forEach(add);
      }
      (unit?._children || []).forEach(add);
      this.attackModeVariants(unit || {}).forEach(add);
      return keys;
    },

    invalidateMatchupForUnit(unit, scope='both'){
      this.clearMatchupDerivedCaches();
      if(!this.matchup?.cellCache) return;
      const keys = this.relatedUnitKeys(unit);
      Object.keys(this.matchup.cellCache).forEach(cacheKey => {
        const [attackerKey, defenderKey] = cacheKey.split('=>');
        if((scope !== 'defender' && keys.has(attackerKey)) || (scope !== 'attacker' && keys.has(defenderKey))){
          delete this.matchup.cellCache[cacheKey];
        }
      });
      if(this.matchupModalOpen) this.refreshMatchupPresentation();
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

    ruleLookupName(value){
      if(window.AbilityModifierService?.normalizeRuleName){
        return window.AbilityModifierService.normalizeRuleName(value);
      }
      return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    },

    unitAbilityDescription(unit, ability){
      const wanted = this.ruleLookupName(ability);
      const maps = [
        unit?._abilityDescriptions || {},
        unit?._parentUnit?._abilityDescriptions || {},
        unit?._baseUnit?._abilityDescriptions || {},
        unit?._baseUnit?._parentUnit?._abilityDescriptions || {},
      ];
      for(const map of maps){
        const found = Object.entries(map || {}).find(([name]) => this.ruleLookupName(name) === wanted);
        if(found && found[1]) return String(found[1]);
      }
      return '';
    },

    ruleModifierDescription(name){
      const modifiers = this.ruleModifierNames(name);
      return modifiers.length ? `Damage calculation modifiers: ${modifiers.join('; ')}` : '';
    },

    weaponModifierDescription(modifier){
      const definition = window.KeywordDefinitionService?.definitionForKeyword?.(modifier);
      if(definition?.description) return definition.description;
      return 'No local keyword definition has been added yet.';
    },

    customModifierDescription(modifier){
      return `Custom damage calculation modifier: ${this.customModifierLabel(modifier)}`;
    },

    openRuleDescription(payload={}){
      const type = payload.type || 'Rule';
      const unit = payload.unit || this.profileUnit || null;
      const title = payload.title || payload.name || 'Rule';
      const description = (() => {
        if(type === 'Ability') return this.unitAbilityDescription(unit, payload.name) || this.ruleModifierDescription(payload.name);
        if(type === 'Enhancement') return payload.enhancement?.description || this.unitAbilityDescription(unit, payload.enhancement?.name || payload.name) || this.ruleModifierDescription(payload.enhancement?.name || payload.name);
        if(type === 'Keyword' || type === 'Modifier') return this.weaponModifierDescription(payload.name);
        if(type === 'Custom Modifier') return this.customModifierDescription(payload.modifier || payload.name);
        return payload.description || '';
      })();
      this.ruleDescription = {
        title,
        type,
        description: description || 'No description was included in the imported roster data.',
        source: payload.source || (type === 'Keyword' || type === 'Modifier' ? 'Local keyword definition' : 'Imported roster data'),
      };
      this.ruleDescriptionModalOpen = true;
    },

    closeRuleDescription(){
      this.ruleDescriptionModalOpen = false;
      this.ruleDescription = { title: '', type: '', description: '', source: '' };
    },

    openMatchupFormula(cell, attacker, defender){
      this.formulaCell = attacker && defender ? this.computeMatchupCell(attacker, defender, { includeFormula: true }) : (cell || null);
      this.formulaAttacker = attacker || null;
      this.formulaDefender = defender || null;
      this.formulaModalOpen = true;
    },

    closeMatchupFormula(){
      this.formulaModalOpen = false;
      this.formulaCell = null;
      this.formulaAttacker = null;
      this.formulaDefender = null;
    },

    formulaTitle(){
      return `${this.unitLabelText(this.formulaAttacker, 'Attacker')} into ${this.unitLabelText(this.formulaDefender, 'Defender')}`;
    },

    formulaNumber(value, digits=3){
      const n = Number(value);
      if(!Number.isFinite(n)) return '0';
      return n.toFixed(digits).replace(/\.?0+$/, '');
    },

    formulaPercent(value){
      const n = Number(value);
      if(!Number.isFinite(n)) return '0%';
      return `${(n * 100).toFixed(1)}%`;
    },

    formulaDefenseText(defense={}){
      return this.matchupDefenseProfileLine({
        T: defense.T,
        Sv: defense.sv,
        Inv: defense.inv,
        W: defense.W,
        Fnp: defense.Fnp,
        cover: defense.cover,
        models: 1,
      }, 1);
    },

    escapeFormulaHtml(value){
      return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[ch]));
    },

    formulaLineEntry(label, body='', result=''){
      const text = `${label}${body ? `: ${body}` : ''}${result ? ` = ${result}` : ''}`;
      const html = [
        `<span class="formulaStepName">${this.escapeFormulaHtml(label)}</span>`,
        body ? `: ${this.escapeFormulaHtml(body)}` : '',
        result ? ` = <span class="formulaStepResult">${this.escapeFormulaHtml(result)}</span>` : '',
      ].join('');
      return { text, html };
    },

    formulaLineHtml(line){
      if(line && typeof line === 'object' && line.html) return line.html;
      return this.escapeFormulaHtml(line?.text ?? line ?? '');
    },

    formulaItemTitle(item, index=0){
      const firstFormula = (item?.lines || []).find(line => line?.formula)?.formula || {};
      const skillText = Number(firstFormula.skill) === 0 ? 'auto' : this.formulaNumber(firstFormula.skill);
      const statText = firstFormula.attacks != null
        ? ` - A:${this.formulaNumber(firstFormula.attacks)} Skill:${skillText} S:${this.formulaNumber(firstFormula.strength)} AP:${this.formulaNumber(firstFormula.ap)} D:${this.formulaNumber(firstFormula.damage)}`
        : '';
      const count = Math.max(1, parseInt(item?.profileCount ?? 1, 10) || 1);
      return `${index + 1}. ${item?.weaponName || `Profile ${index + 1}`} (x${count})${statText}`;
    },

    formulaItemDamage(item){
      const value = Number(item?.totalDamage);
      if(Number.isFinite(value)) return value;
      return (item?.lines || []).reduce((sum, line) => sum + (Number(line?.appliedDamage) || 0), 0);
    },

    formulaRerollLabel(kind, mode, strategy){
      const rollName = kind === 'hit' ? 'Hits' : 'Wounds';
      const rerollMode = String(mode || 'none').toLowerCase();
      if(rerollMode === 'ones') return `Reroll ${rollName} of 1`;
      if(rerollMode !== 'all') return '';
      const strategyText = strategy === 'crits'
        ? 'crits'
        : (strategy === 'failures' ? 'failures' : '');
      return [`Reroll ${rollName}`, strategyText].filter(Boolean).join(' - ');
    },

    formulaItemLines(item, index=0){
      const lines = [];
      (item?.lines || []).forEach((line, lineIndex) => {
        const f = line?.formula || {};
        const probs = f.probabilities || {};
        const totals = f.totals || {};
        const scale = Number(line.damageFraction) > 0 ? Number(line.damageFraction) : 1;
        const prefix = (item.lines || []).length > 1 ? `Target ${lineIndex + 1}: ${line.targetName || 'Defender'} - ` : '';
        if(f.defense) lines.push({
          text: `${prefix}~ ${this.formulaDefenseText(f.defense)} ~`,
          html: `${this.escapeFormulaHtml(prefix)}~ ${this.escapeFormulaHtml(this.formulaDefenseText(f.defense))} ~`,
        });
        if(line.damageFraction != null && Math.abs(line.damageFraction - 1) > 1e-9){
          lines.push(this.formulaLineEntry(`${prefix}Remaining allocation`, this.formulaPercent(line.damageFraction)));
        }
        if(f.attacks != null){
          const hitReroll = this.formulaRerollLabel('hit', probs.hitRerollMode, probs.hitRerollStrategy);
          const attacks = (Number(f.attacks) || 0) * scale;
          const hits = (Number(totals.expectedHits) || 0) * scale;
          const sustainedExtra = (Number(f?.totals?.expectedHits) || 0) / Math.max(Number(f.attacks) || 1, 1) - (Number(probs.pHit) || 0);
          const hitParts = [`${this.formulaPercent(probs.pHit)} hit`];
          if(sustainedExtra > 1e-9) hitParts.push(`${this.formulaNumber(sustainedExtra, 3)} sustained extra`);
          lines.push(this.formulaLineEntry(
            `${prefix}Hits${hitReroll ? ` (${hitReroll})` : ''}`,
            `${this.formulaNumber(attacks)} attacks x (${hitParts.join(' + ')})`,
            `${this.formulaNumber(hits)} hits`
          ));
        }
        if(totals.expectedWounds != null){
          const woundReroll = this.formulaRerollLabel('wound', probs.woundRerollMode, probs.woundRerollStrategy);
          const woundRate = Number(probs.pWound) || 0;
          const lethal = (Number(totals.lethalWounds) || 0) * scale;
          const woundRollHits = woundRate > 1e-9 ? ((Number(totals.expectedWoundsFromRolls) || 0) / woundRate) * scale : 0;
          const wounds = (Number(totals.expectedWounds) || 0) * scale;
          const woundBody = lethal > 1e-9
            ? `${this.formulaNumber(lethal)} lethal + ${this.formulaNumber(woundRollHits)} hits x ${this.formulaPercent(woundRate)} wound rate`
            : `${this.formulaNumber(woundRollHits)} hits x ${this.formulaPercent(woundRate)} wound rate`;
          lines.push(this.formulaLineEntry(
            `${prefix}Wounds${woundReroll ? ` (${woundReroll})` : ''}`,
            woundBody,
            `${this.formulaNumber(wounds)} wounds`
          ));
        }
        if(totals.unsavedNormal != null){
          const normalWounds = (Number(totals.normalWounds) || 0) * scale;
          const unsaved = (Number(totals.unsavedNormal) || 0) * scale;
          lines.push(this.formulaLineEntry(
            `${prefix}Saves`,
            `${this.formulaNumber(normalWounds)} normal wounds x ${this.formulaPercent(1 - (probs.pSave || 0))} failed saves`,
            `${this.formulaNumber(unsaved)} unsaved`
          ));
        }
        if(f.cappedDamage != null){
          const allocation = line.allocation || {};
          const unsaved = (Number(totals.unsavedNormal) || 0) * scale;
          const mortals = (Number(totals.mortals) || 0) * scale;
          const parts = [`${this.formulaNumber(unsaved)} x ${this.formulaNumber(f.cappedDamage)} capped damage`];
          if(mortals > 1e-9) parts.push(`${this.formulaNumber(mortals)} x ${this.formulaNumber(f.damage)} spill damage`);
          if((Number(probs.pFnp) || 0) > 1e-9) parts.push(`x ${this.formulaPercent(1 - (probs.pFnp || 0))} after FNP`);
          if((Number(allocation.allocationLoss) || 0) > 1e-9) parts.push(`- ${this.formulaNumber(allocation.allocationLoss)} allocation spill loss`);
          const damageResult = `${this.formulaNumber(line.appliedDamage ?? allocation.appliedDamage ?? totals.totalDamage)} damage`;
          lines.push(this.formulaLineEntry(`${prefix}Damage`, parts.join(' '), damageResult));
        }else if(line.appliedDamage != null){
          lines.push(this.formulaLineEntry(`${prefix}Applied damage`, '', this.formulaNumber(line.appliedDamage)));
        }
      });
      if(item?.totalDamage != null){
        const killed = (item?.lines || []).reduce((sum, line) => sum + (Number(line?.allocation?.killedModels) || 0), 0);
        const result = `${this.formulaNumber(item.totalDamage)} damage (${this.formulaNumber(killed, 0)} models killed)`;
        lines.push({
          text: `Profile total: ${result}`,
          html: `<span class="formulaStepName">Profile total</span>: <span class="formulaStepResult">${this.escapeFormulaHtml(result)}</span>`,
        });
      }
      return lines;
    },

    formulaSummaryLines(){
      const cell = this.formulaCell || {};
      const lines = [
        `${this.matchupMetricLabel()}: ${this.formatMatchupMetric(cell)}`,
        `Total average damage: ${this.formulaNumber(cell.dmg, 2)}`,
        `Damage %: ${cell.pctModelWounds == null ? '—' : this.formulaPercent(cell.pctModelWounds)}`,
        `Chance to Kill: ${cell.pctUnitKilled == null ? '—' : this.formulaPercent(Math.min(cell.pctUnitKilled, 0.999))}`,
      ];
      if(cell.weaponName) lines.push(`Profiles used: ${cell.weaponName}`);
      return lines;
    },

    matchupFormulaSections(){
      return (this.formulaCell?.formulaItems || []).map((item, index) => ({
        title: this.formulaItemTitle(item, index),
        modifiers: item?.modifierText ? `Modifiers: ${item.modifierText}` : '',
        lines: this.formulaItemLines(item, index),
        damage: this.formulaItemDamage(item),
      }));
    },

    formulaTotalEquation(){
      const sections = this.matchupFormulaSections();
      const values = sections
        .map(section => Number(section.damage))
        .filter(value => Number.isFinite(value));
      const sum = values.reduce((total, value) => total + value, 0);
      const shownTotal = Number.isFinite(Number(this.formulaCell?.dmg)) ? Number(this.formulaCell.dmg) : sum;
      const left = values.length ? values.map(value => this.formulaNumber(value, 2)).join(' + ') : '0';
      return `${left} = ${this.formulaNumber(shownTotal, 2)} total average damage`;
    },

    matchupFormulaLines(){
      const sectionLines = this.matchupFormulaSections().flatMap(section => [
        section.title,
        ...(section.modifiers ? [section.modifiers] : []),
        ...section.lines.map(line => line?.text ?? line),
      ]);
      return [...this.formulaSummaryLines(), ...sectionLines, `Total result: ${this.formulaTotalEquation()}`];
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

    toggleWeaponModifier(w, mod, unit=null){
      if(!w) return;
      const state = this.ensureModifierState(w);
      state[mod] = !this.isWeaponModifierEnabled(w, mod);
      this.invalidateMatchupForUnit(unit || this.profileUnit || this.activeUnit, 'attacker');
    },

    unitModifierRuleNames(unit){
      const cacheKey = this.unitKey(unit);
      if(cacheKey && this.matchupComputationCache.ruleNames?.[cacheKey]){
        return this.matchupComputationCache.ruleNames[cacheKey];
      }
      const names = [];
      this.unitAbilityNames(unit).forEach(name => {
        if(this.isUnitAbilityEnabled(unit, name)) names.push(name);
      });
      this.unitEnhancementNames(unit).forEach(name => {
        if(this.isUnitEnhancementEnabled(unit, name)) names.push(name);
      });
      this.sharedUnitAbilityRuleNames(unit).forEach(name => names.push(name));
      const result = [...new Set(names)];
      if(cacheKey) this.matchupComputationCache.ruleNames[cacheKey] = result;
      return result;
    },

    normalizeMatchupName(value){
      return String(value || '')
        .replace(/[\u2018\u2019]/g, "'")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .filter(word => word && word !== 's')
        .map(word => word.length > 3 ? word.replace(/s$/, '') : word)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    normalizeKeyword(value){
      return this.normalizeMatchupName(value).replace(/\s+/g, '').replace(/s$/, '');
    },

    unitHasKeyword(unit, keyword){
      const wanted = this.normalizeKeyword(keyword);
      if(!wanted) return true;
      const values = [
        ...(unit?._keywords || []),
        ...(unit?.keywords || []),
        ...(unit?.defense?.keywords || []),
        ...(unit?.defense?._keywords || []),
      ].map(value => this.normalizeKeyword(value));
      return values.includes(wanted);
    },

    weaponHasKeyword(weapon, keyword){
      const wanted = this.normalizeKeyword(keyword);
      if(!wanted) return true;
      const text = [
        weapon?.name,
        weapon?.modifiers,
        weapon?.keywords,
        ...(Array.isArray(weapon?._keywords) ? weapon._keywords : []),
      ].join(' ');
      return this.normalizeKeyword(text).includes(wanted);
    },

    weaponNameMatchesScope(weapon, scope){
      const rawScope = String(scope || '').trim();
      if(rawScope && rawScope === this.weaponStateKey(weapon)) return true;
      const weaponName = this.normalizeMatchupName(weapon?.name);
      const wanted = this.normalizeMatchupName(rawScope);
      if(!wanted) return true;
      return weaponName.includes(wanted) || wanted.includes(weaponName);
    },

    ruleModifierSpecs(name){
      const service = window.AbilityModifierService;
      if(!service?.modifiersForRule) return [];
      return service.modifiersForRule(name);
    },

    parsedModifierSpec(spec){
      const service = window.AbilityModifierService;
      if(service?.parseModifierSpec) return service.parseModifierSpec(spec);
      return { raw: spec, meta: { kind: 'weapon' }, modifiers: [spec] };
    },

    modifierSpecApplies(parsed, context={}){
      const meta = parsed?.meta || {};
      if(meta.conditional && !this.matchup.conditionsMet) return false;
      if(!this.modifierSpecBenefitsOwner(parsed)) return false;
      if(meta.weapons?.length && !meta.weapons.some(scope => this.weaponNameMatchesScope(context.weapon, scope))) return false;
      if(meta.weaponKeywords?.length && !meta.weaponKeywords.some(keyword => this.weaponHasKeyword(context.weapon, keyword))) return false;
      if(meta.targets?.length && !meta.targets.some(keyword => this.unitHasKeyword(context.defender, keyword))) return false;
      if(meta.targetOnObjective && !this.matchup.conditionsMet) return false;
      if(meta.strengthGreaterThanToughness){
        const strength = parseFloat(context.weapon?.S);
        const toughness = parseFloat(this.effectiveDefense(context.defender, null, { includeTargetDebuffs: false })?.T);
        if(!Number.isFinite(strength) || !Number.isFinite(toughness) || strength <= toughness) return false;
      }
      return true;
    },

    modifierTextHasPenalty(text){
      return [
        /\b(?:Hit|Wound)\s+Rolls?\s*-\d+/i,
        /\b(?:Attacks?|Strength|Damage|AP|Armou?r Penetration)\s*-\d+/i,
        /\b(?:T|Toughness|W|Wounds?)\s*-\d+/i,
      ].some(pattern => pattern.test(text));
    },

    modifierTextHasBonus(text){
      return [
        /\b(?:Hit|Wound)\s+Rolls?\s*\+\d+/i,
        /\b(?:Attacks?|Strength|Damage|AP|Armou?r Penetration)\s*\+\d+/i,
        /\b(?:T|Toughness|W|Wounds?)\s*\+\d+/i,
        /\b(?:Cover|Invulnerable Save|Feel No Pain|FNP|Reroll|Lethal Hits|Sustained Hits|Devastating Wounds|Precision|Lance|Ignores Cover)\b/i,
      ].some(pattern => pattern.test(text));
    },

    modifierSpecBenefitsOwner(parsed){
      const meta = parsed?.meta || {};
      const kind = meta.kind || 'weapon';
      if(kind === 'special') return true;
      const text = (parsed?.modifiers || []).join(', ');
      const hasPenalty = this.modifierTextHasPenalty(text);
      const hasBonus = this.modifierTextHasBonus(text);
      if(kind === 'defenseAttack' || kind === 'targetDefense') return hasPenalty || !hasBonus;
      return !hasPenalty;
    },

    modifierAppliesToWeaponMode(modifier, weapon){
      if(!weapon) return true;
      const mode = String(weapon?.mode || '').toLowerCase();
      const text = String(modifier || '').trim();
      if(/^Melee\s*:/i.test(text)) return mode === 'melee';
      if(/^Ranged\s*:/i.test(text)) return mode === 'ranged';
      return true;
    },

    modifierNamesForParsedSpec(parsed, context={}){
      const modifiers = parsed?.modifiers || [];
      return modifiers.filter(mod => this.modifierAppliesToWeaponMode(mod, context.weapon));
    },

    modifiersFromRuleNames(ruleNames, context={}){
      const kind = context.kind || 'weapon';
      const cacheKey = [
        this.matchup.conditionsMet ? 1 : 0,
        kind,
        (ruleNames || []).join('~'),
        context.weapon ? this.weaponStateKey(context.weapon) : '',
        context.defender ? this.unitKey(context.defender) : '',
        context.attacker ? this.unitKey(context.attacker) : '',
      ].join('|');
      if(this.matchupComputationCache.modifierNames?.[cacheKey]){
        return this.matchupComputationCache.modifierNames[cacheKey];
      }
      const out = [];
      (ruleNames || []).forEach(name => {
        this.ruleModifierSpecs(name).forEach(spec => {
          const parsed = this.parsedModifierSpec(spec);
          if((parsed.meta?.kind || 'weapon') !== kind) return;
          if(!this.modifierSpecApplies(parsed, context)) return;
          out.push(...this.modifierNamesForParsedSpec(parsed, context));
        });
      });
      const seen = new Set();
      const result = out.filter(mod => {
        const key = String(mod || '').trim().toLowerCase();
        if(!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.matchupComputationCache.modifierNames[cacheKey] = result;
      return result;
    },

    modifierNamesFromSpecs(specs, context={}){
      const kind = context.kind || 'weapon';
      const out = [];
      (specs || []).forEach(spec => {
        const parsed = this.parsedModifierSpec(spec);
        if((parsed.meta?.kind || 'weapon') !== kind) return;
        if(!this.modifierSpecApplies(parsed, context)) return;
        out.push(...this.modifierNamesForParsedSpec(parsed, context));
      });
      const seen = new Set();
      return out.filter(mod => {
        const key = String(mod || '').trim().toLowerCase();
        if(!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    unitFamilyRoot(unit){
      if(!unit) return null;
      return unit._parentUnit || unit._baseUnit?._parentUnit || (Array.isArray(unit._children) && unit._children.length ? unit : null);
    },

    unitFamilyMembers(unit){
      const root = this.unitFamilyRoot(unit);
      if(!root) return [];
      return [root, ...(root._children || [])];
    },

    sharedUnitAbilityRuleNames(unit){
      const cacheKey = this.unitKey(unit);
      if(cacheKey && this.matchupComputationCache.sharedRuleNames?.[cacheKey]){
        return this.matchupComputationCache.sharedRuleNames[cacheKey];
      }
      const members = this.unitFamilyMembers(unit);
      if(!members.length) return [];
      const service = window.AbilityModifierService;
      const result = [...new Set(members.flatMap(member => this.unitAbilityNames(member)
        .filter(name => this.isUnitAbilityEnabled(member, name))
        .filter(name => service?.ruleHasUnitWideModifier ? service.ruleHasUnitWideModifier(name) : service?.modifiersForRule?.(name).length)
      ))];
      if(cacheKey) this.matchupComputationCache.sharedRuleNames[cacheKey] = result;
      return result;
    },

    abilityModifierNamesForUnit(unit, context={}){
      const resolvedContext = { ...context, kind: context.kind || 'weapon' };
      return [
        ...this.modifiersFromRuleNames(this.unitModifierRuleNames(unit), resolvedContext),
        ...this.modifierNamesFromSpecs(this.enabledUnitCustomModifierSpecs(unit), resolvedContext),
      ];
    },

    ruleModifierNames(name){
      return this.ruleModifierSpecs(name)
        .filter(spec => this.modifierSpecBenefitsOwner(this.parsedModifierSpec(spec)));
    },

    unitAbilityModifierNames(ability){
      return this.ruleModifierNames(ability);
    },

    unitEnhancementModifierNames(enhancement){
      const name = typeof enhancement === 'string' ? enhancement : enhancement?.name;
      return this.ruleModifierNames(name);
    },

    isDefenseModifier(modifier){
      return /^(?:Defense|Defensive):/i.test(String(modifier || '').trim());
    },

    defenseModifierNamesForUnit(unit){
      const context = { kind: 'defenseProfile', defender: unit };
      return [
        ...this.modifiersFromRuleNames(this.unitModifierRuleNames(unit), context),
        ...this.modifierNamesFromSpecs(this.enabledUnitCustomModifierSpecs(unit), context),
      ];
    },

    defenseAttackModifierNamesForUnit(unit, context={}){
      const resolvedContext = { ...context, kind: 'defenseAttack', defender: unit };
      return [
        ...this.modifiersFromRuleNames(this.unitModifierRuleNames(unit), resolvedContext),
        ...this.modifierNamesFromSpecs(this.enabledUnitCustomModifierSpecs(unit), resolvedContext),
      ];
    },

    targetDefenseModifierNamesForUnit(attacker, defender){
      const context = { kind: 'targetDefense', attacker, defender };
      return [
        ...this.modifiersFromRuleNames(this.unitModifierRuleNames(attacker), context),
        ...this.modifierNamesFromSpecs(this.enabledUnitCustomModifierSpecs(attacker), context),
      ];
    },

    applyDefenseModifiers(defense, modifiers=[]){
      const next = { ...(defense || {}) };
      const numeric = key => {
        const value = parseFloat(next[key]);
        return Number.isFinite(value) ? value : null;
      };
      const setIfFinite = (key, value) => {
        if(Number.isFinite(value)) next[key] = value;
      };
      const bestSave = (current, candidate) => {
        const c = parseFloat(current);
        const n = parseFloat(candidate);
        if(!Number.isFinite(n)) return current;
        if(!Number.isFinite(c) || c <= 0) return n;
        return Math.min(c, n);
      };

      (modifiers || []).forEach(modifier => {
        const text = String(modifier || '').replace(/^(?:Defense|Defensive):\s*/i, '').trim();
        if(!text) return;

        let match = text.match(/\b(?:T|Toughness)\s*([+-]\d+(?:\.\d+)?)\b/i);
        if(match){
          setIfFinite('T', Math.max(0, (numeric('T') || 0) + parseFloat(match[1])));
          return;
        }
        match = text.match(/\b(?:T|Toughness)\s*(\d+(?:\.\d+)?)\b/i);
        if(match){
          setIfFinite('T', parseFloat(match[1]));
          return;
        }

        match = text.match(/\b(?:W|Wounds?)\s*([+-]\d+(?:\.\d+)?)\b/i);
        if(match){
          setIfFinite('W', Math.max(0, (numeric('W') || 0) + parseFloat(match[1])));
          return;
        }
        match = text.match(/\b(?:W|Wounds?)\s*(\d+(?:\.\d+)?)\b/i);
        if(match){
          setIfFinite('W', parseFloat(match[1]));
          return;
        }

        match = text.match(/\b(?:Invulnerable Save|Invuln|Inv)\s*(\d)\+/i);
        if(match){
          next.Inv = bestSave(next.Inv, parseFloat(match[1]));
          return;
        }

        match = text.match(/\b(?:Feel No Pain|FNP)\s*(\d)\+/i);
        if(match){
          next.Fnp = bestSave(next.Fnp, parseFloat(match[1]));
          return;
        }

        match = text.match(/\b(?:Sv|Save|Armou?r Save)\s*([+-]\d+(?:\.\d+)?)\b/i);
        if(match){
          const current = numeric('Sv');
          if(current != null) setIfFinite('Sv', this.clamp(current - parseFloat(match[1]), 2, 7));
          return;
        }
        match = text.match(/\b(?:Sv|Save|Armou?r Save)\s*(\d)\+/i);
        if(match){
          next.Sv = bestSave(next.Sv, parseFloat(match[1]));
          return;
        }

        if(/\b(?:Benefit of )?Cover\b/i.test(text)){
          next.cover = true;
        }
      });
      return next;
    },

    effectiveDefense(unit, opposingUnit=null, options={}){
      const cacheAllowed = options.includeOwnModifiers !== false && options.includeTargetDebuffs !== false;
      const cacheKey = cacheAllowed
        ? `${this.matchup.conditionsMet ? 1 : 0}|${this.unitKey(unit)}|${opposingUnit ? this.unitKey(opposingUnit) : ''}`
        : '';
      if(cacheKey && this.matchupComputationCache.defenses?.[cacheKey]){
        return this.matchupComputationCache.defenses[cacheKey];
      }
      const defense = { ...(unit?.defense || {}) };
      const ownModifiers = options.includeOwnModifiers === false ? [] : this.defenseModifierNamesForUnit(unit);
      const targetDebuffs = options.includeTargetDebuffs === false || !opposingUnit ? [] : this.targetDefenseModifierNamesForUnit(opposingUnit, unit);
      const result = this.applyDefenseModifiers(defense, [...ownModifiers, ...targetDebuffs]);
      if(cacheKey) this.matchupComputationCache.defenses[cacheKey] = result;
      return result;
    },

    effectiveWeaponModifiers(w, unit=null, defender=null){
      const cacheKey = `${this.matchup.conditionsMet ? 1 : 0}|${this.unitKey(unit)}|${this.weaponStateKey(w)}|${this.unitKey(defender)}|${w?.modifiers || ''}`;
      if(this.matchupComputationCache.weaponModifiers?.[cacheKey] != null){
        return this.matchupComputationCache.weaponModifiers[cacheKey];
      }
      const names = [
        ...this.weaponModifierNames(w).filter(mod => this.isWeaponModifierEnabled(w, mod)),
        ...this.abilityModifierNamesForUnit(unit, { weapon: w, attacker: unit, defender }),
        ...this.defenseAttackModifierNamesForUnit(defender, { weapon: w, attacker: unit, defender }),
      ];
      const result = window.ArmyImportService?.serializeModifiers(names) || names.join(', ');
      this.matchupComputationCache.weaponModifiers[cacheKey] = result;
      return result;
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
      this.invalidateMatchupForUnit(unit, 'both');
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
      this.invalidateMatchupForUnit(unit, 'both');
    },

    customModifierSeedOptions(){
      return [
        { label: '+1 to Hit', value: 'Hit Rolls +1' },
        { label: '-1 to Hit', value: 'Hit Rolls -1' },
        { label: '+1 to Wound', value: 'Wound Rolls +1' },
        { label: '-1 to Wound', value: 'Wound Rolls -1' },
        { label: 'Reroll Hits', value: 'Reroll Hits' },
        { label: 'Reroll Hits of 1', value: 'Reroll Hits 1' },
        { label: 'Reroll Wounds', value: 'Reroll Wounds' },
        { label: 'Reroll Wounds of 1', value: 'Reroll Wounds 1' },
        { label: 'Lethal Hits', value: 'Lethal Hits' },
        { label: 'Sustained Hits 1', value: 'Sustained Hits 1' },
        { label: 'Sustained Hits D3', value: 'Sustained Hits D3' },
        { label: 'Choose Best: Lethal/Sustained', value: 'Choose Best: Lethal Hits; Sustained Hits 1' },
        { label: 'Devastating Wounds', value: 'Devastating Wounds' },
        { label: 'Lance', value: 'Lance' },
        { label: 'Precision', value: 'Precision' },
        { label: 'Ignores Cover', value: 'Ignores Cover' },
        { label: 'Ignore Hit Penalties', value: 'Ignore Hit Penalties' },
        { label: 'Critical Hits 5+', value: 'Critical Hits 5+' },
        { label: 'Attacks +1', value: 'Attacks +1' },
        { label: 'Attacks -1', value: 'Attacks -1' },
        { label: 'Strength +1', value: 'Strength +1' },
        { label: 'Strength +2', value: 'Strength +2' },
        { label: 'Strength -1', value: 'Strength -1' },
        { label: 'AP +1', value: 'AP +1' },
        { label: 'AP -1', value: 'AP -1' },
        { label: 'Damage +1', value: 'Damage +1' },
        { label: 'Damage -1', value: 'Damage -1' },
        { label: 'Skill +1', value: 'Skill +1' },
        { label: 'Skill -1', value: 'Skill -1' },
        { label: 'Melee: +1 to Hit', value: 'Melee: Hit Rolls +1' },
        { label: 'Melee: +1 to Wound', value: 'Melee: Wound Rolls +1' },
        { label: 'Melee: Strength +1', value: 'Melee: Strength +1' },
        { label: 'Melee: AP +1', value: 'Melee: AP +1' },
        { label: 'Melee: Damage +1', value: 'Melee: Damage +1' },
        { label: 'Ranged: +1 to Hit', value: 'Ranged: Hit Rolls +1' },
        { label: 'Ranged: +1 to Wound', value: 'Ranged: Wound Rolls +1' },
        { label: 'Ranged: Strength +1', value: 'Ranged: Strength +1' },
        { label: 'Ranged: AP +1', value: 'Ranged: AP +1' },
        { label: 'Ranged: Damage +1', value: 'Ranged: Damage +1' },
        { label: 'Defense: Cover', value: 'Defense: Cover' },
        { label: 'Defense: Toughness +1', value: 'Defense: Toughness +1' },
        { label: 'Defense: Toughness -1', value: 'Defense: Toughness -1' },
        { label: 'Defense: Save +1', value: 'Defense: Save +1' },
        { label: 'Defense: Save -1', value: 'Defense: Save -1' },
        { label: 'Defense: Invulnerable Save 6+', value: 'Defense: Invulnerable Save 6+' },
        { label: 'Defense: Invulnerable Save 5+', value: 'Defense: Invulnerable Save 5+' },
        { label: 'Defense: Invulnerable Save 4+', value: 'Defense: Invulnerable Save 4+' },
        { label: 'Defense: Feel No Pain 6+', value: 'Defense: Feel No Pain 6+' },
        { label: 'Defense: Feel No Pain 5+', value: 'Defense: Feel No Pain 5+' },
        { label: 'Defense: Feel No Pain 4+', value: 'Defense: Feel No Pain 4+' },
        { label: 'Incoming Attacks: -1 to Hit', value: 'Defense Attack: Hit Rolls -1' },
        { label: 'Incoming Attacks: -1 to Wound', value: 'Defense Attack: Wound Rolls -1' },
        { label: 'Incoming Attacks: Damage -1', value: 'Defense Attack: Damage -1' },
        { label: 'Incoming Attacks: Damage /2', value: 'Defense Attack: Damage /2' },
        { label: 'Target Defense: Toughness -1', value: 'Target Defense: Toughness -1' },
      ];
    },

    customModifierValueFromParsed(parsed){
      const meta = parsed?.meta || {};
      if(meta.special) return '';
      const kind = meta.kind || 'weapon';
      const modifiers = parsed?.modifiers || [];
      if(!modifiers.length) return '';
      const body = modifiers.join(', ');
      if(kind === 'defenseProfile') return `Defense: ${body}`;
      if(kind === 'defenseAttack') return `Defense Attack: ${body}`;
      if(kind === 'targetDefense') return `Target Defense: ${body}`;
      if(kind === 'special') return '';
      return body;
    },

    customModifierAutoOptions(){
      const map = window.AbilityModifierMap || {};
      return Object.values(map)
        .flatMap(specs => specs || [])
        .map(spec => this.customModifierValueFromParsed(this.parsedModifierSpec(spec)))
        .filter(Boolean)
        .map(value => ({ label: this.customModifierOptionLabel(value), value }));
    },

    customModifierOptionLabel(value){
      let text = String(value || '').trim();
      const prefixMatch = text.match(/^(Melee|Ranged|Shooting|Defense|Defense Attack|Target Defense):\s*(.+)$/i);
      const prefix = prefixMatch ? prefixMatch[1].replace(/^Defense Attack$/i, 'Incoming Attacks').replace(/^Target Defense$/i, 'Target Defense') : '';
      if(prefixMatch) text = prefixMatch[2].trim();
      text = text
        .replace(/^Hit Rolls \+1$/i, '+1 to Hit')
        .replace(/^Hit Rolls -1$/i, '-1 to Hit')
        .replace(/^Wound Rolls \+1$/i, '+1 to Wound')
        .replace(/^Wound Rolls -1$/i, '-1 to Wound')
        .replace(/^Reroll Hits 1$/i, 'Reroll Hits of 1')
        .replace(/^Reroll Wounds 1$/i, 'Reroll Wounds of 1');
      return prefix ? `${prefix}: ${text}` : text;
    },

    cleanWeaponCustomModifierValue(value){
      return String(value || '').trim().replace(/^(?:Melee|Ranged|Shooting):\s*/i, '');
    },

    dedupeCustomModifierOptions(options){
      const seen = new Set();
      return (options || [])
        .map(option => ({
          label: option.label || this.customModifierOptionLabel(option.value),
          value: String(option.value || '').trim(),
        }))
        .filter(option => {
          const key = option.value.toLowerCase();
          if(!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },

    unitCustomModifierOptions(){
      return this.dedupeCustomModifierOptions([
        ...this.customModifierSeedOptions(),
        ...this.customModifierAutoOptions(),
      ]);
    },

    weaponCustomModifierOptions(){
      const options = this.unitCustomModifierOptions()
        .filter(option => !/^(?:Defense|Defense Attack|Target Defense):/i.test(option.value))
        .map(option => {
          const value = this.cleanWeaponCustomModifierValue(option.value);
          return { label: this.customModifierOptionLabel(value), value };
        });
      return this.dedupeCustomModifierOptions(options);
    },

    scopedWeaponModifierText(w, value){
      const effect = this.cleanWeaponCustomModifierValue(value);
      if(!w || !effect) return effect;
      return `Weapon: ${this.weaponStateKey(w)} | ${effect}`;
    },

    unitCustomModifiers(unit){
      const key = this.unitStateKey(unit);
      if(!key) return [];
      if(!Array.isArray(this.unitCustomModifierState[key])) this.unitCustomModifierState[key] = [];
      return this.unitCustomModifierState[key];
    },

    enabledUnitCustomModifierSpecs(unit){
      const specs = [];
      let cursor = unit || null;
      while(cursor){
        specs.push(...this.unitCustomModifiers(cursor));
        cursor = cursor._parentUnit || cursor._baseUnit?._parentUnit || null;
      }
      return specs
        .filter(mod => mod?.enabled !== false && String(mod?.text || '').trim())
        .map(mod => mod.text.trim());
    },

    addCustomModifier(unit){
      const text = String(this.profileCustomModifierText || '').trim();
      this.addCustomModifierSpec(unit, text, this.customModifierOptionLabel(text));
      this.profileCustomModifierText = '';
    },

    addCustomModifierSpec(unit, text, label=''){
      const value = String(text || '').trim();
      if(!unit || !value) return;
      const existing = this.unitCustomModifiers(unit).find(entry => String(entry?.text || '').trim().toLowerCase() === value.toLowerCase());
      if(existing){
        existing.enabled = true;
        this.invalidateMatchupForUnit(unit, 'both');
        return;
      }
      this.unitCustomModifiers(unit).push({
        id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        text: value,
        label: label || this.customModifierOptionLabel(value),
        enabled: true,
      });
      this.invalidateMatchupForUnit(unit, 'both');
    },

    addCustomModifierFromSelect(unit, value){
      const option = this.unitCustomModifierOptions().find(entry => entry.value === value);
      this.addCustomModifierSpec(unit, value, option?.label || this.customModifierOptionLabel(value));
    },

    addWeaponCustomModifier(unit, weapon, value){
      if(!unit || !weapon || !value) return;
      const option = this.weaponCustomModifierOptions(weapon).find(entry => entry.value === value);
      const scoped = this.scopedWeaponModifierText(weapon, value);
      const weaponName = weapon?.name || 'Weapon profile';
      const label = `${weaponName}: ${option?.label || this.customModifierOptionLabel(value)}`;
      this.addCustomModifierSpec(unit, scoped, label);
    },

    customModifierLabel(mod){
      return mod?.label || this.customModifierOptionLabel(mod?.text || '');
    },

    toggleCustomModifier(unit, id){
      const mod = this.unitCustomModifiers(unit).find(entry => entry.id === id);
      if(!mod) return;
      mod.enabled = !mod.enabled;
      this.invalidateMatchupForUnit(unit, 'both');
    },

    removeCustomModifier(unit, id){
      const key = this.unitStateKey(unit);
      if(!key || !Array.isArray(this.unitCustomModifierState[key])) return;
      this.unitCustomModifierState[key] = this.unitCustomModifierState[key].filter(entry => entry.id !== id);
      this.invalidateMatchupForUnit(unit, 'both');
    },

    parseWeaponKeywords(txt){
      return window.WeaponCalc.parseWeaponKeywords(txt);
    },

    matchupCalcOneWeapon(w, def){
      return window.WeaponCalc.calcOneWeapon(w, def, this.effectiveWeaponModifiers(w, this.units?.[this.selectedUnitIdx] || null));
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
      const def = this.effectiveDefense(u) || {};
      this.defense.T = def.T ?? '';
      this.defense.Sv = def.Sv ?? '';
      this.defense.Inv = def.Inv ?? '';
      this.defense.W = def.W ?? '';
      this.defense.Fnp = def.Fnp ?? '';
      this.defense.DR = def.DR ?? 0;
      this.defense.models = def.models ?? 1;
      this.defense.cover = !!def.cover;
    },

    renderDefensePills(def){
      if(!def) return '<div class="muted">No defensive data.</div>';
      const line = this.matchupDefenseProfileLine(def, def.models ?? null);
      return line ? `<div class="defenseProfileLine">${this.defenseProfileLineHtml(line)}</div>` : '<div class="muted">No defensive data.</div>';
    },

    unitDefenseModifierList(unit){
      const units = (Array.isArray(unit?._children) && unit._children.length) ? [unit, ...unit._children] : [unit];
      const seen = new Set();
      return units
        .flatMap(entry => this.defenseModifierNamesForUnit(entry))
        .filter(mod => {
          const key = String(mod || '').trim().toLowerCase();
          if(!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    },

    renderUnitDefenseProfiles(unit){
      if(!unit) return '<div class="muted">No defensive data.</div>';
      const lines = this.matchupDefenseProfileLines(unit);
      const modifiers = this.unitDefenseModifierList(unit);
      const modifierHtml = modifiers.length
        ? `<div class="defenseProfileModifiers">${modifiers.map(mod => `<span class="modifier">${this.htmlCell(mod)}</span>`).join('')}</div>`
        : '';
      if(!lines.length) return `${this.renderDefensePills(this.effectiveDefense(unit))}${modifierHtml}`;
      return `<div class="defenseProfileList">${
        lines.map(line => `<div class="defenseProfileLine">${this.defenseProfileLineHtml(line)}</div>`).join('')
      }</div>${modifierHtml}`;
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
