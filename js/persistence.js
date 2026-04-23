// js/persistence.js — localStorage save/resume + export text/image.
(function () {
  const KEY = "mdsim-v1";
  let saveTimer = null;

  window.Persistence = {
    save(state) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => writeNow(state), 500);
    },
    saveNow(state) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      writeNow(state);
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    },
    hasSave() { return !!localStorage.getItem(KEY); },
    clear() { localStorage.removeItem(KEY); },
    exportText(state) { return buildTextExport(state); },
    exportImage() { return loadHtml2Canvas().then(doImageExport); }
  };

  function writeNow(state) {
    try {
      const out = JSON.stringify({
        userTeams: state.userTeams,
        options: state.options,
        picks: state.picks,
        irlTaken: state.irlTaken,
        currentIndex: state.currentIndex,
        trades: state.trades,
        draftOrder: state.draftOrder,
        originalNeeds: state.originalNeeds,
        screen: state.screen,
        timestamp: Date.now()
      });
      localStorage.setItem(KEY, out);
    } catch (e) {
      console.error("persistence.save failed", e);
    }
  }

  function buildTextExport(state) {
    const lines = [];
    lines.push("# 2026 NFL Mock Draft — Simulator Results");
    lines.push("");
    lines.push(`_Generated ${new Date().toISOString().slice(0,19).replace("T", " ")} UTC — data snapshot: Apr 21, 2026_`);
    lines.push("");
    lines.push(`User-controlled: ${state.userTeams.join(", ") || "—"}`);
    lines.push(`Rounds simulated: 1–${state.options.rounds}`);
    lines.push("");

    // Picks by team
    lines.push("## Picks by team");
    const byTeam = {};
    state.picks.forEach(pk => { (byTeam[pk.team] = byTeam[pk.team] || []).push(pk); });
    Object.keys(byTeam).sort().forEach(team => {
      const t = window.TEAMS_BY_ABBR[team];
      lines.push(`### ${t.city} ${t.name} (${team})`);
      byTeam[team]
        .sort((a,b) => a.overall - b.overall)
        .forEach(pk => {
          const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
          if (!pr) { lines.push(`- R${pk.round}.${pk.pick} (#${pk.overall}) — (skipped)`); return; }
          lines.push(`- R${pk.round}.${pk.pick} (#${pk.overall}) — ${pr.name}, ${pr.pos}, ${pr.school} (consensus #${pr.rank})`);
        });
      lines.push("");
    });

    // Grades
    if (state.grades) {
      lines.push("## Grades");
      Object.values(state.grades.perTeam)
        .sort((a,b) => b.score - a.score)
        .forEach(g => {
          lines.push(`- **${g.team}** — ${g.grade}`);
        });
      lines.push("");
      lines.push("## Top steals");
      state.grades.steals.slice(0,6).forEach(s => {
        lines.push(`- ${s.prospect.name} (${s.prospect.pos}) to ${s.pk.team} at #${s.pk.overall} — +${s.delta} slots`);
      });
      lines.push("");
      lines.push("## Top reaches");
      state.grades.reaches.slice(0,6).forEach(r => {
        lines.push(`- ${r.prospect.name} (${r.prospect.pos}) to ${r.pk.team} at #${r.pk.overall} — ${r.delta} slots (reach)`);
      });
    }

    return lines.join("\n");
  }

  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve();
      const s = document.createElement("script");
      s.src = "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("html2canvas load failed"));
      document.head.appendChild(s);
    });
  }

  function doImageExport() {
    const target = document.getElementById("screen-results");
    if (!target) return Promise.reject(new Error("results screen not rendered"));
    return window.html2canvas(target, { backgroundColor: "#0b0e13", scale: 2 })
      .then(canvas => {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `mock-draft-${new Date().toISOString().slice(0,10)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  }
})();
