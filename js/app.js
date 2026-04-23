// js/app.js — controller, rendering, screen routing, event wiring.
(function () {
  'use strict';

  const els = {};
  const POS_TABS = ["ALL","QB","RB","WR","TE","OT","IOL","EDGE","DT","LB","CB","S","K","P"];
  const AI_DELAY_MIN = 500;
  const AI_DELAY_MAX = 1500;
  const FAST_DELAY = 30;   // for skip/jump modes

  // Snapshot default team needs so we can restore on reset.
  const DEFAULT_NEEDS = {};
  window.TEAMS.forEach(t => DEFAULT_NEEDS[t.abbr] = [...t.needs]);

  let state = null;
  let aiTimer = null;
  let timerHandle = null;
  let fastMode = false;           // true during "skip" or "jump-to-next"
  let fastMode_target = null;     // for jump-to-next
  let pendingStack = null;        // prospect awaiting stack-warning confirm

  // ========== Boot ==========
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    state = createInitialState();
    wireGlobalEvents();
    buildPosTabs();
    renderSetup();
    if (window.Persistence.hasSave()) showResumeBanner();
    showScreen("setup");
  }

  function createInitialState() {
    return {
      screen: "setup",
      userTeams: [],
      options: {
        rounds: 7,
        timerEnabled: false,
        timerR1: 300, timerR2: 180, timerR4: 120,
        randomness: 0.10,
        aiToAiTrades: false
      },
      draftOrder: JSON.parse(JSON.stringify(window.DRAFT_ORDER)),
      picks: [],
      irlTaken: [],
      currentIndex: 0,
      trades: [],
      selectedPosFilter: "ALL",
      searchQuery: "",
      originalNeeds: null,
      viewTeam: null,
      timestamp: 0,
      grades: null
    };
  }

  function cacheElements() {
    const ids = [
      "topbar","top-round","top-overall","top-team-badge","top-team-name","top-onclock",
      "screen-setup","screen-draft","screen-results",
      "team-grid","btn-start","btn-select-all","btn-select-none","btn-about",
      "opt-rounds","opt-timer","row-timer-seconds","opt-timer-r1","opt-timer-r2","opt-timer-r4",
      "opt-randomness","opt-rand-val","opt-ai-trades",
      "resume-banner","resume-time","btn-resume","btn-discard",
      "order-list","order-done","order-total",
      "board-list","board-heading","board-sub","board-search","pos-tabs",
      "ai-thinking","ai-thinking-text",
      "my-team-name","my-team-switch","my-needs-list","my-picks-list","my-roster-list","btn-propose-trade",
      "timer-ring","timer-text","timer-progress",
      "btn-undo","btn-next-user","btn-skip-end","btn-shortcuts",
      "live-mode-btn","about-btn",
      "modal-root","modal-trade","modal-live","modal-about","modal-shortcuts","modal-stack","modal-trade-resp",
      "trade-from-team","trade-to-team","trade-give-picks","trade-get-picks",
      "trade-give-total","trade-get-total","trade-delta","trade-verdict","btn-send-trade",
      "live-search","live-list",
      "stack-body","btn-stack-confirm","trade-resp-body",
      "grades-grid","league-steals","league-reaches","league-surprises","league-recap",
      "btn-export-text","btn-export-image","btn-new-draft",
      "toast"
    ];
    ids.forEach(id => { els[id] = document.getElementById(id); });
  }

  function wireGlobalEvents() {
    // Setup
    els["btn-start"].addEventListener("click", onStartDraft);
    els["btn-select-all"].addEventListener("click", () => selectAllTeams(true));
    els["btn-select-none"].addEventListener("click", () => selectAllTeams(false));
    els["btn-about"].addEventListener("click", () => showModal("about"));
    els["about-btn"].addEventListener("click", () => showModal("about"));
    els["live-mode-btn"].addEventListener("click", openLiveMode);

    els["opt-timer"].addEventListener("change", e => {
      state.options.timerEnabled = e.target.checked;
      els["row-timer-seconds"].hidden = !e.target.checked;
    });
    els["opt-timer-r1"].addEventListener("change", e => state.options.timerR1 = +e.target.value);
    els["opt-timer-r2"].addEventListener("change", e => state.options.timerR2 = +e.target.value);
    els["opt-timer-r4"].addEventListener("change", e => state.options.timerR4 = +e.target.value);
    els["opt-randomness"].addEventListener("input", e => {
      state.options.randomness = +e.target.value;
      els["opt-rand-val"].textContent = (+e.target.value).toFixed(2);
    });
    els["opt-ai-trades"].addEventListener("change", e => state.options.aiToAiTrades = e.target.checked);
    els["opt-rounds"].addEventListener("change", e => state.options.rounds = +e.target.value);

    // Draft
    els["board-search"].addEventListener("input", e => {
      state.searchQuery = e.target.value.trim();
      renderBoard();
    });
    els["btn-propose-trade"].addEventListener("click", openTradeModal);
    els["btn-undo"].addEventListener("click", undoPick);
    els["btn-next-user"].addEventListener("click", jumpToNextUser);
    els["btn-skip-end"].addEventListener("click", skipToEnd);
    els["btn-shortcuts"].addEventListener("click", () => showModal("shortcuts"));
    els["my-team-switch"].addEventListener("change", e => {
      state.viewTeam = e.target.value;
      renderMyTeam();
    });

    // Resume banner
    els["btn-resume"].addEventListener("click", onResume);
    els["btn-discard"].addEventListener("click", onDiscardSave);

    // Results
    els["btn-export-text"].addEventListener("click", exportText);
    els["btn-export-image"].addEventListener("click", exportImage);
    els["btn-new-draft"].addEventListener("click", () => {
      if (!confirm("Start a new draft? This will clear your saved progress.")) return;
      window.Persistence.clear();
      location.reload();
    });

    // Trade modal
    els["trade-from-team"].addEventListener("change", () => { refreshToTeamOptions(); renderTradePickers(); });
    els["trade-to-team"].addEventListener("change", renderTradePickers);
    els["btn-send-trade"].addEventListener("click", sendTradeOffer);

    // Live mode
    els["live-search"].addEventListener("input", renderLiveList);

    // Stack confirm
    els["btn-stack-confirm"].addEventListener("click", () => {
      const prospect = pendingStack;
      pendingStack = null;
      hideModals();
      if (prospect) {
        completeUserPick(prospect);
      }
    });

    // Modal backdrop/close
    els["modal-root"].addEventListener("click", e => {
      if (e.target.matches(".modal-backdrop") || e.target.matches("[data-close]")) {
        hideModals();
      }
    });

    // Keyboard
    document.addEventListener("keydown", handleKey);
  }

  function buildPosTabs() {
    els["pos-tabs"].innerHTML = "";
    POS_TABS.forEach(pos => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pos-tab" + (pos === state.selectedPosFilter ? " active" : "");
      b.textContent = pos;
      b.addEventListener("click", () => {
        state.selectedPosFilter = pos;
        buildPosTabs();
        renderBoard();
      });
      els["pos-tabs"].appendChild(b);
    });
  }

  // ========== Screen routing ==========
  function showScreen(name) {
    state.screen = name;
    els["screen-setup"].hidden   = (name !== "setup");
    els["screen-draft"].hidden   = (name !== "draft");
    els["screen-results"].hidden = (name !== "results");
    els["topbar"].hidden = (name !== "draft");
  }

  // ========== Setup ==========
  function renderSetup() {
    const grid = els["team-grid"];
    grid.innerHTML = "";
    window.TEAMS.forEach(t => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "team-card";
      card.dataset.team = t.abbr;
      if (state.userTeams.includes(t.abbr)) card.classList.add("selected");
      card.style.setProperty("--team-primary", t.primary);
      card.innerHTML = `
        <span class="team-badge large" style="--team-primary:${t.primary}">${t.abbr}</span>
        <span class="tc-city">${t.city}</span>
        <span class="tc-name">${t.name}</span>
      `;
      card.addEventListener("click", () => {
        toggleUserTeam(t.abbr);
      });
      grid.appendChild(card);
    });

    // Options to state
    els["opt-rounds"].value = String(state.options.rounds);
    els["opt-timer"].checked = state.options.timerEnabled;
    els["row-timer-seconds"].hidden = !state.options.timerEnabled;
    els["opt-timer-r1"].value = state.options.timerR1;
    els["opt-timer-r2"].value = state.options.timerR2;
    els["opt-timer-r4"].value = state.options.timerR4;
    els["opt-randomness"].value = String(state.options.randomness);
    els["opt-rand-val"].textContent = state.options.randomness.toFixed(2);
    els["opt-ai-trades"].checked = state.options.aiToAiTrades;
  }

  function toggleUserTeam(abbr) {
    const idx = state.userTeams.indexOf(abbr);
    if (idx >= 0) state.userTeams.splice(idx, 1);
    else state.userTeams.push(abbr);
    renderSetup();
  }

  function selectAllTeams(on) {
    state.userTeams = on ? window.TEAMS.map(t => t.abbr) : [];
    renderSetup();
  }

  function showResumeBanner() {
    const saved = window.Persistence.load();
    if (!saved) return;
    els["resume-banner"].hidden = false;
    const dt = new Date(saved.timestamp || Date.now());
    els["resume-time"].textContent = dt.toLocaleString();
  }

  function onResume() {
    const saved = window.Persistence.load();
    if (!saved) return;
    // Rehydrate into state.
    state.userTeams = saved.userTeams || [];
    state.options = Object.assign(state.options, saved.options || {});
    state.picks = saved.picks || [];
    state.irlTaken = saved.irlTaken || [];
    state.currentIndex = saved.currentIndex || 0;
    state.trades = saved.trades || [];
    state.draftOrder = saved.draftOrder || state.draftOrder;
    state.originalNeeds = saved.originalNeeds || snapshotNeeds();
    state.viewTeam = state.userTeams[0] || null;

    // Re-apply team-needs adjustments based on picks already made.
    rebuildNeedsFromHistory();

    if (saved.screen === "results") {
      state.grades = window.Grades.compute(state);
      showScreen("results");
      renderResults();
    } else {
      showScreen("draft");
      renderDraftAll();
      processNextPick();
    }
  }

  function onDiscardSave() {
    window.Persistence.clear();
    els["resume-banner"].hidden = true;
  }

  function snapshotNeeds() {
    const snap = {};
    window.TEAMS.forEach(t => snap[t.abbr] = [...DEFAULT_NEEDS[t.abbr]]);
    return snap;
  }

  function rebuildNeedsFromHistory() {
    // Reset team needs to defaults, then re-run updateNeeds per pick.
    window.TEAMS.forEach(t => t.needs = [...DEFAULT_NEEDS[t.abbr]]);
    state.picks.forEach(pk => {
      const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
      if (!pr) return;
      window.AI.updateNeeds(pk.team, pr.pos);
    });
  }

  function onStartDraft() {
    if (state.userTeams.length === 0) {
      if (!confirm("No teams selected. The whole draft will run AI-only. Continue?")) return;
    }
    // Save needs snapshot for grading later.
    state.originalNeeds = snapshotNeeds();
    state.viewTeam = state.userTeams[0] || null;
    showScreen("draft");
    renderDraftAll();
    processNextPick();
    save();
  }

  // ========== Pool / helpers ==========
  function getPool() {
    const takenRanks = new Set(state.picks.map(p => p.prospectRank));
    state.irlTaken.forEach(r => takenRanks.add(r));
    return window.PROSPECTS.filter(p => !takenRanks.has(p.rank));
  }

  function currentPickObj() {
    return state.draftOrder[state.currentIndex] || null;
  }

  function maxPickIndex() {
    const idx = state.draftOrder.findIndex(p => p.round > state.options.rounds);
    return idx < 0 ? state.draftOrder.length : idx;
  }

  function isUserTeam(abbr) { return state.userTeams.includes(abbr); }

  function save() { window.Persistence.save(state); }

  // ========== Processing picks ==========
  function processNextPick() {
    clearAiTimer();
    stopTimer();

    if (state.currentIndex >= maxPickIndex()) {
      finishDraft();
      return;
    }
    const cur = currentPickObj();
    if (!cur) { finishDraft(); return; }

    updateTopBar(cur);
    renderOrder();
    renderMyTeam();

    // Maybe AI-to-AI trade before an AI pick (R1 only, ~once)
    if (cur.round === 1 && !isUserTeam(cur.team) && state.options.aiToAiTrades) {
      maybeAiToAiTrade();
    }

    const after = currentPickObj();
    if (!after) { finishDraft(); return; }

    if (isUserTeam(after.team)) {
      showAIThinking(false);
      renderBoard();
      if (state.options.timerEnabled) startTimer(after);
    } else {
      showAIThinking(true, after);
      const delay = fastMode ? FAST_DELAY : (AI_DELAY_MIN + Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN));
      aiTimer = setTimeout(() => aiPick(after), delay);
    }
  }

  function maybeAiToAiTrade() {
    const pool = getPool();
    const trade = window.Trades.maybeAiToAi(state, { pool });
    if (trade) {
      state.trades.push(trade);
      toast(`AI trade: ${trade.fromTeam} → ${trade.toTeam} moves up.`);
      save();
    }
  }

  function aiPick(pickObj) {
    const pool = getPool();
    let prospect = null;
    if (pool.length > 0) {
      prospect = window.AI.pickFor(pickObj.team, pool, state.options);
    }
    commitPick(pickObj, prospect, false);
  }

  function startTimer(pickObj) {
    stopTimer();
    const seconds = secondsForRound(pickObj.round);
    let remaining = seconds;
    els["timer-ring"].hidden = false;
    updateTimerUI(remaining, seconds);
    timerHandle = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopTimer();
        // Auto-pick via AI
        const pool = getPool();
        const prospect = window.AI.pickFor(pickObj.team, pool, state.options);
        commitPick(pickObj, prospect, true);
      } else {
        updateTimerUI(remaining, seconds);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    els["timer-ring"].hidden = true;
  }

  function updateTimerUI(rem, total) {
    const pct = Math.max(0, rem / total);
    const dash = 100 * (1 - pct);
    els["timer-progress"].style.strokeDashoffset = String(dash);
    els["timer-progress"].classList.toggle("warn", rem < total / 3);
    els["timer-progress"].classList.toggle("danger", rem < 20);
    const m = Math.floor(rem / 60), s = rem % 60;
    els["timer-text"].textContent = (m > 0 ? m + ":" + String(s).padStart(2,"0") : String(s));
  }

  function secondsForRound(round) {
    if (round === 1) return state.options.timerR1;
    if (round === 2 || round === 3) return state.options.timerR2;
    return state.options.timerR4;
  }

  function clearAiTimer() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
  }

  function commitPick(pickObj, prospect, wasAuto) {
    if (prospect) {
      window.AI.updateNeeds(pickObj.team, prospect.pos);
    }
    const pickRec = {
      overall: pickObj.overall,
      round: pickObj.round,
      pick: pickObj.pick,
      team: pickObj.team,
      prospectRank: prospect ? prospect.rank : null,
      wasAutoPick: !!wasAuto,
      byUser: isUserTeam(pickObj.team) && !wasAuto,
      timestamp: Date.now()
    };
    state.picks.push(pickRec);
    state.currentIndex++;
    save();
    // Render the order with the just-made pick BEFORE trying to animate —
    // animatePick's querySelector needs the new DOM row to exist.
    processNextPick();
    animatePick(pickObj, prospect);
  }

  function animatePick(pickObj, prospect) {
    // Re-render the specific order row so it gets the "just-picked" animation class.
    const row = els["order-list"].querySelector(`[data-overall="${pickObj.overall}"]`);
    if (row) {
      row.classList.add("just-picked");
      setTimeout(() => row.classList.remove("just-picked"), 800);
    }
    if (prospect && !fastMode) {
      toast(`${pickObj.team} selects ${prospect.name} (${prospect.pos}, ${prospect.school})`);
    }
  }

  // ========== User pick ==========
  function onDraftClick(prospect) {
    if (!currentPickObj()) return;
    const cur = currentPickObj();
    if (!isUserTeam(cur.team)) { toast("Not your pick."); return; }
    // Stack-warning check
    const myPicks = state.picks.filter(p => p.team === cur.team);
    const samePosCount = myPicks.filter(p => {
      const pr = window.PROSPECTS_BY_RANK[p.prospectRank];
      return pr && pr.pos === prospect.pos;
    }).length;
    const stackablePos = (prospect.pos !== "OT" && prospect.pos !== "IOL");
    if (stackablePos && samePosCount >= 2) {
      pendingStack = prospect;
      els["stack-body"].textContent = samePosCount >= 3
        ? `You already have ${samePosCount} ${prospect.pos}s. Are you sure you want a ${samePosCount+1}th?`
        : `You're stacking ${prospect.pos} (${samePosCount+1} total). Keep going?`;
      showModal("stack");
      return;
    }
    completeUserPick(prospect);
  }

  function completeUserPick(prospect) {
    const cur = currentPickObj();
    if (!cur) return;
    commitPick(cur, prospect, false);
  }

  // ========== Rendering: draft screen ==========
  function renderDraftAll() {
    renderOrder();
    renderBoard();
    renderMyTeam();
    updateTopBar(currentPickObj());
  }

  function updateTopBar(cur) {
    if (!cur) return;
    els["top-round"].textContent = `R${cur.round}`;
    els["top-overall"].textContent = `#${cur.overall}`;
    const team = window.TEAMS_BY_ABBR[cur.team];
    if (team) {
      els["top-team-badge"].textContent = cur.team;
      els["top-team-badge"].style.setProperty("--team-primary", team.primary);
      els["top-team-name"].textContent = `${team.city} ${team.name}`;
    }
    els["top-onclock"].textContent = isUserTeam(cur.team) ? "(your pick)" : "on the clock";
  }

  function renderOrder() {
    const max = maxPickIndex();
    els["order-total"].textContent = String(max);
    els["order-done"].textContent = String(state.currentIndex);
    const list = els["order-list"];
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < max; i++) {
      const p = state.draftOrder[i];
      const item = document.createElement("div");
      item.className = "order-item";
      item.dataset.overall = p.overall;
      const pk = state.picks.find(x => x.overall === p.overall);
      if (pk) item.classList.add("done");
      if (i === state.currentIndex) item.classList.add("current");
      if (isUserTeam(p.team)) item.classList.add("user");

      const team = window.TEAMS_BY_ABBR[p.team];
      const primary = team ? team.primary : "#444";
      item.innerHTML = `
        <span class="oi-overall">#${p.overall}</span>
        <span class="team-badge small" style="--team-primary:${primary}">${p.team}</span>
        <span class="oi-meta muted">R${p.round}.${p.pick}${p.note ? " · " + escapeHtml(p.note) : ""}</span>
        ${pk ? playerRowHtml(pk) : ""}
      `;
      frag.appendChild(item);
    }
    list.appendChild(frag);
    // Scroll current pick into view.
    const curItem = list.querySelector(".current");
    if (curItem) curItem.scrollIntoView({ block: "nearest", behavior: "auto" });
  }

  function playerRowHtml(pk) {
    const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
    if (!pr) return `<span class="oi-player"><b>(skipped)</b></span>`;
    const autoTag = pk.wasAutoPick ? ` <span class="muted">· auto</span>` : "";
    return `<span class="oi-player"><b>${escapeHtml(pr.name)}</b> ${pr.pos} · ${escapeHtml(pr.school)}${autoTag}</span>`;
  }

  function renderBoard() {
    const pool = getPool();
    const cur = currentPickObj();
    const onClock = cur ? cur.team : "—";
    const userOnClock = cur && isUserTeam(cur.team);

    if (cur && !userOnClock) {
      els["board-heading"].textContent = `${onClock} on the clock`;
      els["board-sub"].textContent = `AI is evaluating · ${pool.length} prospects on the board`;
    } else if (userOnClock) {
      const team = window.TEAMS_BY_ABBR[cur.team];
      els["board-heading"].textContent = `${team.city} ${team.name} — your pick`;
      els["board-sub"].textContent = `Best available · ${pool.length} prospects available`;
    } else {
      els["board-heading"].textContent = "Prospect Board";
      els["board-sub"].textContent = `${pool.length} prospects on the board`;
    }

    // Filter
    let filtered = pool;
    if (state.selectedPosFilter !== "ALL") {
      filtered = filtered.filter(p => p.pos === state.selectedPosFilter);
    }
    const q = state.searchQuery.toLowerCase();
    if (q) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q)
      );
    }

    const list = els["board-list"];
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    filtered.slice(0, 200).forEach(p => {
      const row = document.createElement("div");
      row.className = "prospect-row";
      row.innerHTML = `
        <span class="pr-rank">#${p.rank}</span>
        <span class="pr-pos ${p.pos}">${p.pos}</span>
        <span class="pr-main">
          <span class="pr-name">${escapeHtml(p.name)}</span>
          <span class="pr-meta">${escapeHtml(p.school)} &middot; ${p.ht}${p.est ? '<span class="pr-est">*</span>' : ""}, ${p.wt}${p.est ? '<span class="pr-est">*</span>' : ""} &middot; proj R${p.projRound}</span>
          <span class="pr-note">${escapeHtml(p.note || "")}</span>
        </span>
        <span class="pr-actions">
          <button type="button" class="btn-primary" data-act="draft" data-rank="${p.rank}" ${userOnClock ? "" : "disabled"}>Draft</button>
        </span>
      `;
      // Expand/collapse note on click of main area
      row.querySelector(".pr-main").addEventListener("click", () => {
        row.classList.toggle("expanded");
      });
      // Draft click
      const btn = row.querySelector("[data-act=draft]");
      if (btn) {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          onDraftClick(p);
        });
      }
      frag.appendChild(row);
    });
    list.appendChild(frag);

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.style.padding = "24px";
      empty.style.textAlign = "center";
      empty.textContent = "No prospects match your filters.";
      list.appendChild(empty);
    }
  }

  function renderMyTeam() {
    // Switcher dropdown
    const sw = els["my-team-switch"];
    sw.innerHTML = "";
    state.userTeams.forEach(abbr => {
      const o = document.createElement("option");
      o.value = abbr; o.textContent = abbr;
      if (state.viewTeam === abbr) o.selected = true;
      sw.appendChild(o);
    });
    sw.hidden = state.userTeams.length <= 1;

    const teamAbbr = state.viewTeam || state.userTeams[0];
    if (!teamAbbr) {
      els["my-team-name"].textContent = "Spectator mode";
      els["my-needs-list"].innerHTML = "";
      els["my-picks-list"].innerHTML = "";
      els["my-roster-list"].innerHTML = "";
      els["btn-propose-trade"].disabled = true;
      return;
    }
    const team = window.TEAMS_BY_ABBR[teamAbbr];
    els["my-team-name"].textContent = `${team.city} ${team.name}`;
    els["btn-propose-trade"].disabled = false;

    // Current needs (mutating list from AI.updateNeeds)
    els["my-needs-list"].innerHTML = team.needs
      .slice(0, 6)
      .map(n => `<li>${n}</li>`)
      .join("");

    // Picks owned (not yet drafted)
    const picksOwned = state.draftOrder.filter(p =>
      p.team === teamAbbr && p.overall >= currentPickObj()?.overall
    );
    els["my-picks-list"].innerHTML = picksOwned
      .map(p => `<li>#${p.overall} (R${p.round}.${p.pick})${p.note ? " · " + escapeHtml(p.note) : ""}</li>`)
      .join("") || "<li class=\"muted\">No remaining picks</li>";

    // Roster drafted
    const myPicks = state.picks
      .filter(p => p.team === teamAbbr)
      .sort((a,b) => a.overall - b.overall);
    const byPos = {};
    myPicks.forEach(pk => {
      const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
      if (!pr) return;
      (byPos[pr.pos] = byPos[pr.pos] || []).push({ pk, pr });
    });
    const rosterEl = els["my-roster-list"];
    rosterEl.innerHTML = "";
    if (myPicks.length === 0) {
      rosterEl.innerHTML = "<div class='muted'>No picks yet.</div>";
    } else {
      Object.keys(byPos).sort().forEach(pos => {
        const block = document.createElement("div");
        block.className = "rg";
        block.innerHTML = `<div class="rg-title">${pos}</div>` +
          byPos[pos].map(({ pk, pr }) =>
            `<div class="rg-entry"><span class="pick-no">#${pk.overall}</span>${escapeHtml(pr.name)} · ${escapeHtml(pr.school)}</div>`
          ).join("");
        rosterEl.appendChild(block);
      });
    }
  }

  function showAIThinking(on, pickObj) {
    els["ai-thinking"].hidden = !on;
    if (on && pickObj) {
      const team = window.TEAMS_BY_ABBR[pickObj.team];
      els["ai-thinking-text"].textContent = `${team.city} ${team.name} on the clock…`;
    }
  }

  // ========== Skip / jump / undo ==========
  function skipToEnd() {
    fastMode = true;
    clearAiTimer();
    stopTimer();
    // Run synchronous loop of AI picks until done.
    while (state.currentIndex < maxPickIndex()) {
      const cur = currentPickObj();
      if (!cur) break;
      // If user team and fastMode, auto-pick via AI
      const pool = getPool();
      const prospect = pool.length > 0 ? window.AI.pickFor(cur.team, pool, state.options) : null;
      if (prospect) window.AI.updateNeeds(cur.team, prospect.pos);
      state.picks.push({
        overall: cur.overall, round: cur.round, pick: cur.pick, team: cur.team,
        prospectRank: prospect ? prospect.rank : null,
        wasAutoPick: true, byUser: false, timestamp: Date.now()
      });
      state.currentIndex++;
    }
    fastMode = false;
    save();
    finishDraft();
  }

  function jumpToNextUser() {
    if (state.userTeams.length === 0) { toast("No user teams selected."); return; }
    fastMode = true;
    clearAiTimer();
    stopTimer();
    const max = maxPickIndex();
    while (state.currentIndex < max) {
      const cur = currentPickObj();
      if (!cur) break;
      if (isUserTeam(cur.team)) break;  // stop just before user's next pick
      const pool = getPool();
      const prospect = pool.length > 0 ? window.AI.pickFor(cur.team, pool, state.options) : null;
      if (prospect) window.AI.updateNeeds(cur.team, prospect.pos);
      state.picks.push({
        overall: cur.overall, round: cur.round, pick: cur.pick, team: cur.team,
        prospectRank: prospect ? prospect.rank : null,
        wasAutoPick: true, byUser: false, timestamp: Date.now()
      });
      state.currentIndex++;
    }
    fastMode = false;
    save();
    renderDraftAll();
    processNextPick();
  }

  function undoPick() {
    if (state.picks.length === 0) { toast("Nothing to undo."); return; }
    if (state.screen === "results") { toast("Cannot undo after results shown."); return; }
    clearAiTimer();
    stopTimer();
    state.picks.pop();
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    rebuildNeedsFromHistory();
    save();
    renderDraftAll();
    processNextPick();
    toast("Undid last pick.");
  }

  // ========== Finish / Results ==========
  function finishDraft() {
    clearAiTimer();
    stopTimer();
    state.grades = window.Grades.compute(state);
    save();
    showScreen("results");
    renderResults();
  }

  function renderResults() {
    const grid = els["grades-grid"];
    grid.innerHTML = "";
    const ranked = Object.values(state.grades.perTeam).sort((a,b) => b.score - a.score);
    ranked.forEach(bucket => {
      const team = window.TEAMS_BY_ABBR[bucket.team];
      const card = document.createElement("div");
      card.className = "grade-card";
      const letterCls = bucket.grade[0];  // A/B/C/D/F
      const top3 = bucket.picks.slice(0, 4).map(({ pk, prospect }) =>
        `<li><span class="gc-pick">#${pk.overall}</span>${escapeHtml(prospect.name)} · ${prospect.pos}</li>`
      ).join("");
      card.innerHTML = `
        <div class="gc-top">
          <span class="team-badge large" style="--team-primary:${team.primary}">${team.abbr}</span>
          <div>
            <div><b>${team.city} ${team.name}</b></div>
            <div class="muted">${bucket.picks.length} picks · score ${bucket.score.toFixed(1)}</div>
          </div>
          <span class="gc-letter ${letterCls}">${bucket.grade}</span>
        </div>
        <ul>${top3 || "<li class='muted'>No picks made.</li>"}</ul>
        <div class="gc-summary">${escapeHtml(bucket.summary || "")}</div>
      `;
      grid.appendChild(card);
    });

    const steals = els["league-steals"];
    steals.innerHTML = state.grades.steals.map(s =>
      `<li>${escapeHtml(s.prospect.name)} (${s.prospect.pos}) to ${s.pk.team} at #${s.pk.overall} · +${s.delta}</li>`
    ).join("") || "<li class='muted'>No notable steals</li>";

    const reaches = els["league-reaches"];
    reaches.innerHTML = state.grades.reaches.map(r =>
      `<li>${escapeHtml(r.prospect.name)} (${r.prospect.pos}) to ${r.pk.team} at #${r.pk.overall} · ${r.delta}</li>`
    ).join("") || "<li class='muted'>No notable reaches</li>";

    const surprises = els["league-surprises"];
    surprises.innerHTML = state.grades.surprises.map(s =>
      `<li>${escapeHtml(s.text)}</li>`
    ).join("") || "<li class='muted'>No surprises</li>";

    els["league-recap"].textContent = state.grades.recap;
  }

  function exportText() {
    const md = window.Persistence.exportText(state);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(
        () => toast("Text summary copied to clipboard."),
        () => downloadTextFallback(md)
      );
    } else {
      downloadTextFallback(md);
    }
  }
  function downloadTextFallback(md) {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mock-draft-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function exportImage() {
    toast("Rendering image…");
    window.Persistence.exportImage().then(
      () => toast("Image downloaded."),
      err => toast("Export failed: " + err.message)
    );
  }

  // ========== Trade modal ==========
  function openTradeModal() {
    if (state.userTeams.length === 0) { toast("Select a team at setup to propose trades."); return; }
    const cur = currentPickObj();
    if (!cur) { toast("Draft is over."); return; }

    const fromSel = els["trade-from-team"];
    fromSel.innerHTML = "";
    state.userTeams.forEach(t => {
      const o = document.createElement("option"); o.value = t; o.textContent = t;
      fromSel.appendChild(o);
    });
    fromSel.value = state.viewTeam || state.userTeams[0];
    refreshToTeamOptions();
    renderTradePickers();
    showModal("trade");
  }

  function refreshToTeamOptions() {
    const fromTeam = els["trade-from-team"].value;
    const toSel = els["trade-to-team"];
    const prev = toSel.value;
    toSel.innerHTML = "";
    window.TEAMS.forEach(t => {
      if (t.abbr === fromTeam) return;
      const o = document.createElement("option");
      o.value = t.abbr;
      o.textContent = `${t.abbr} — ${t.name}`;
      toSel.appendChild(o);
    });
    if (prev && prev !== fromTeam) toSel.value = prev;
  }

  function renderTradePickers() {
    const fromTeam = els["trade-from-team"].value;
    const toTeam   = els["trade-to-team"].value;
    if (!fromTeam || !toTeam) return;

    const remainIdx = state.currentIndex;
    const fromPicks = state.draftOrder.filter(p => p.team === fromTeam && state.draftOrder.indexOf(p) >= remainIdx);
    const toPicks   = state.draftOrder.filter(p => p.team === toTeam   && state.draftOrder.indexOf(p) >= remainIdx);

    els["trade-give-picks"].innerHTML = fromPicks.map(p =>
      `<label><input type="checkbox" data-overall="${p.overall}" data-val="${window.pickValue(p.overall)}">
        <b>#${p.overall}</b> R${p.round}.${p.pick} · ${window.pickValue(p.overall).toFixed(0)} pts</label>`
    ).join("") || "<div class='muted'>No remaining picks.</div>";

    els["trade-get-picks"].innerHTML = toPicks.map(p =>
      `<label><input type="checkbox" data-overall="${p.overall}" data-val="${window.pickValue(p.overall)}">
        <b>#${p.overall}</b> R${p.round}.${p.pick} · ${window.pickValue(p.overall).toFixed(0)} pts</label>`
    ).join("") || "<div class='muted'>No remaining picks.</div>";

    // Use .onchange (single-handler) so repeated renders don't accumulate listeners.
    els["trade-give-picks"].onchange = updateTradeTotals;
    els["trade-get-picks"].onchange = updateTradeTotals;
    updateTradeTotals();
  }

  function updateTradeTotals() {
    const toTeam = els["trade-to-team"].value;
    const giveTotal = Array.from(els["trade-give-picks"].querySelectorAll("input:checked"))
      .reduce((s, el) => s + parseFloat(el.dataset.val), 0);
    const getTotal = Array.from(els["trade-get-picks"].querySelectorAll("input:checked"))
      .reduce((s, el) => s + parseFloat(el.dataset.val), 0);
    els["trade-give-total"].textContent = giveTotal.toFixed(0);
    els["trade-get-total"].textContent = getTotal.toFixed(0);
    const delta = getTotal - giveTotal;
    const ratio = giveTotal > 0 ? getTotal / giveTotal : 0;
    els["trade-delta"].textContent = `Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(0)} pts (ratio ${ratio.toFixed(2)})`;
    const verdict = els["trade-verdict"];
    verdict.className = "verdict";
    if (giveTotal === 0 && getTotal === 0) { verdict.textContent = "—"; return; }
    if (ratio >= 0.95 || (ratio >= 0.88 && toHasQbNeed(toTeam))) { verdict.textContent = "likely accept"; verdict.classList.add("accept"); }
    else if (ratio >= 0.85) { verdict.textContent = "coin flip"; verdict.classList.add("maybe"); }
    else { verdict.textContent = "likely reject"; verdict.classList.add("reject"); }
  }

  function toHasQbNeed(team) {
    const t = window.TEAMS_BY_ABBR[team];
    return t && t.needs[0] === "QB";
  }

  function sendTradeOffer() {
    const fromTeam = els["trade-from-team"].value;
    const toTeam   = els["trade-to-team"].value;
    const giving = Array.from(els["trade-give-picks"].querySelectorAll("input:checked"))
      .map(el => state.draftOrder.find(p => p.overall === +el.dataset.overall))
      .filter(Boolean);
    const receiving = Array.from(els["trade-get-picks"].querySelectorAll("input:checked"))
      .map(el => state.draftOrder.find(p => p.overall === +el.dataset.overall))
      .filter(Boolean);
    if (giving.length === 0 || receiving.length === 0) {
      respondTrade("Select at least one pick on each side.");
      return;
    }
    // AI evaluates
    const pool = getPool();
    const topQB = pool.slice(0, 5).some(p => p.pos === "QB");
    const standingsRank = 16; // Simplified — could wire to 2025 standings
    const ev = window.Trades.evaluate(toTeam, receiving, giving, { topQbAvailable: topQB, standingsRank });
    if (!ev.accept) {
      respondTrade(`${toTeam} declined: ${ev.reason} (ratio ${ev.ratio.toFixed(2)})`);
      return;
    }
    const trade = window.Trades.execute(
      state.draftOrder,
      fromTeam, toTeam,
      giving.map(p => p.overall),
      receiving.map(p => p.overall)
    );
    state.trades.push(trade);
    save();
    renderDraftAll();
    processNextPick();
    hideModals();
    toast(`Trade accepted: ${fromTeam} ↔ ${toTeam}. ${ev.reason}`);
  }

  function respondTrade(msg) {
    els["trade-resp-body"].textContent = msg;
    showModal("trade-resp");
  }

  // ========== Live mode ==========
  function openLiveMode() {
    renderLiveList();
    showModal("live");
  }
  function renderLiveList() {
    const q = (els["live-search"].value || "").toLowerCase();
    const list = els["live-list"];
    const rows = window.PROSPECTS
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q))
      .slice(0, 80);
    list.innerHTML = rows.map(p => {
      const taken = state.irlTaken.includes(p.rank);
      return `<div class="live-row">
        <span><b>#${p.rank}</b> ${escapeHtml(p.name)} · ${p.pos} · ${escapeHtml(p.school)} <span class="live-meta">${taken ? "· marked taken" : ""}</span></span>
        <button type="button" class="btn-ghost" data-rank="${p.rank}">${taken ? "Restore" : "Mark taken"}</button>
      </div>`;
    }).join("");
    list.querySelectorAll("button[data-rank]").forEach(b => {
      b.addEventListener("click", () => {
        const r = +b.dataset.rank;
        const idx = state.irlTaken.indexOf(r);
        if (idx >= 0) state.irlTaken.splice(idx, 1);
        else state.irlTaken.push(r);
        save();
        renderLiveList();
        if (state.screen === "draft") renderBoard();
      });
    });
  }

  // ========== Modals ==========
  function showModal(which) {
    els["modal-root"].hidden = false;
    ["modal-trade","modal-live","modal-about","modal-shortcuts","modal-stack","modal-trade-resp"].forEach(id => {
      els[id].hidden = (id !== "modal-" + which);
    });
  }
  function hideModals() {
    els["modal-root"].hidden = true;
    ["modal-trade","modal-live","modal-about","modal-shortcuts","modal-stack","modal-trade-resp"].forEach(id => {
      els[id].hidden = true;
    });
  }

  // ========== Keyboard ==========
  function handleKey(e) {
    // Don't intercept typing in inputs
    const tag = (e.target && e.target.tagName) || "";
    if (["INPUT","TEXTAREA","SELECT"].includes(tag)) {
      if (e.key === "Escape") { hideModals(); }
      return;
    }
    switch (e.key) {
      case " ":
        if (state.screen === "draft") {
          e.preventDefault();
          const cur = currentPickObj();
          if (!cur) return;
          // BPA for whoever's on the clock
          const pool = getPool();
          const bpa = window.AI.pickFor(cur.team, pool, state.options);
          if (bpa) {
            if (isUserTeam(cur.team)) completeUserPick(bpa);
            else { clearAiTimer(); commitPick(cur, bpa, false); }
          }
        }
        break;
      case "s": case "S": if (state.screen === "draft") skipToEnd(); break;
      case "n": case "N": if (state.screen === "draft") jumpToNextUser(); break;
      case "u": case "U": if (state.screen === "draft") undoPick(); break;
      case "t": case "T": if (state.screen === "draft") openTradeModal(); break;
      case "?":          if (state.screen === "draft") showModal("shortcuts"); break;
      case "Escape":     hideModals(); break;
    }
  }

  // ========== Toast ==========
  let toastTimer = null;
  function toast(msg) {
    els["toast"].textContent = msg;
    els["toast"].hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els["toast"].hidden = true; }, 2500);
  }

  // ========== Util ==========
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
