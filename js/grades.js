// js/grades.js — post-draft team grades + steals/reaches/surprises + recap.
(function () {
  const POS_VALUE = {
    QB: 1.50, EDGE: 1.30, OT: 1.25, CB: 1.20, WR: 1.15,
    DT: 1.05, S: 1.05, IOL: 1.00, LB: 1.00, TE: 1.00,
    RB: 0.85, K: 0.60, P: 0.60, LS: 0.50
  };

  window.Grades = {
    compute(state) {
      const originalNeeds = state.originalNeeds || {};
      const perTeam = {};
      window.TEAMS.forEach(t => {
        perTeam[t.abbr] = {
          team: t.abbr,
          picks: [],
          value: 0,
          needFitCount: 0,
          penalty: 0,
          score: 0,
          grade: "-",
          summary: ""
        };
      });

      state.picks.forEach(pk => {
        const prospect = window.PROSPECTS_BY_RANK[pk.prospectRank];
        if (!prospect) return;
        const bucket = perTeam[pk.team];
        if (!bucket) return;
        bucket.picks.push({ pk, prospect });

        const delta = prospect.rank - pk.overall;
        const posVal = POS_VALUE[prospect.pos] || 1.0;
        bucket.value += delta * posVal;

        const needs = originalNeeds[pk.team] || [];
        const mapped = mapPos(prospect.pos);
        const nIdx = needs.indexOf(mapped);
        if (nIdx >= 0 && nIdx < 4) bucket.needFitCount++;
      });

      // Position-stack penalties.
      Object.values(perTeam).forEach(bucket => {
        const counts = {};
        bucket.picks.forEach(({ prospect }) => {
          const k = (prospect.pos === "OT" || prospect.pos === "IOL") ? "OL" : prospect.pos;
          counts[k] = (counts[k] || 0) + 1;
        });
        Object.entries(counts).forEach(([pos, count]) => {
          if (pos === "OL") return; // OL stacking is fine
          if (count === 3)  bucket.penalty -= 5;
          if (count >= 4)   bucket.penalty -= 10;
        });

        // Missed top-3 need in first 3 rounds.
        const origNeeds = (originalNeeds[bucket.team] || []).slice(0, 3);
        const early = bucket.picks.filter(x => x.pk.round <= 3);
        const earlyPosSet = new Set(early.map(x => mapPos(x.prospect.pos)));
        const missedNeed = origNeeds.find(n => !earlyPosSet.has(n));
        if (missedNeed && early.length > 0) bucket.penalty -= 6;

        // Final normalized score.
        const n = Math.max(bucket.picks.length, 1);
        const needFitPct = bucket.needFitCount / n;
        bucket.score = (bucket.value / n) + needFitPct * 20 + bucket.penalty;
      });

      // Letter grades curved across the league.
      const ranked = Object.values(perTeam)
        .slice()
        .sort((a, b) => b.score - a.score);
      ranked.forEach((bucket, rank) => {
        if (rank < 3)        bucket.grade = "A+";
        else if (rank < 8)   bucket.grade = "A";
        else if (rank < 14)  bucket.grade = "B+";
        else if (rank < 20)  bucket.grade = "B";
        else if (rank < 26)  bucket.grade = "C";
        else                 bucket.grade = "D";
      });

      // Summary line per team.
      Object.values(perTeam).forEach(bucket => {
        if (!bucket.picks.length) { bucket.summary = "No picks made."; return; }
        const best = bucket.picks.slice().sort((a,b) => a.prospect.rank - b.prospect.rank)[0];
        const bestSteal = bucket.picks
          .map(x => ({ x, delta: x.prospect.rank - x.pk.overall }))
          .sort((a,b) => b.delta - a.delta)[0];
        const headline = best ? `Headlined by ${best.prospect.name}.` : "";
        const steal = bestSteal && bestSteal.delta >= 12
          ? ` Stole ${bestSteal.x.prospect.name} (+${bestSteal.delta}).`
          : "";
        bucket.summary = headline + steal;
      });

      // League steals, reaches, surprises.
      const steals = [];
      const reaches = [];
      const surprises = [];
      state.picks.forEach(pk => {
        const prospect = window.PROSPECTS_BY_RANK[pk.prospectRank];
        if (!prospect) return;
        const delta = prospect.rank - pk.overall;
        if (delta >= 12) steals.push({ pk, prospect, delta });
        if (delta <= -12) reaches.push({ pk, prospect, delta });
      });
      steals.sort((a,b) => b.delta - a.delta);
      reaches.sort((a,b) => a.delta - b.delta);

      // QB taken with another team already filling the need
      const qbPicks = state.picks.filter(pk => {
        const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
        return pr && pr.pos === "QB";
      });
      qbPicks.forEach(pk => {
        if (pk.overall <= 10) {
          const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
          surprises.push({
            pk, prospect: pr,
            text: `Top-10 QB selection: ${pr.name} to ${pk.team}.`
          });
        }
      });
      // Position runs
      const r1 = state.picks.filter(pk => pk.round === 1);
      const r1PosCount = {};
      r1.forEach(pk => {
        const pr = window.PROSPECTS_BY_RANK[pk.prospectRank];
        if (!pr) return;
        r1PosCount[pr.pos] = (r1PosCount[pr.pos] || 0) + 1;
      });
      Object.entries(r1PosCount).forEach(([pos, c]) => {
        if (c >= 5) surprises.push({ text: `${pos} run: ${c} taken in round 1.` });
      });

      const recap = buildRecap(perTeam, steals, reaches);

      return {
        perTeam,
        steals: steals.slice(0, 6),
        reaches: reaches.slice(0, 6),
        surprises: surprises.slice(0, 6),
        recap
      };
    }
  };

  function buildRecap(perTeam, steals, reaches) {
    const ranked = Object.values(perTeam).sort((a,b) => b.score - a.score);
    const top = ranked.slice(0, 3).map(t => t.team).join(", ");
    const bottom = ranked.slice(-3).map(t => t.team).join(", ");
    const topSteal = steals[0];
    const topReach = reaches[0];
    const parts = [
      `The class leaders: ${top}. Lagging behind: ${bottom}.`
    ];
    if (topSteal) parts.push(
      `Biggest steal — ${topSteal.prospect.name} (${topSteal.prospect.pos}) ` +
      `to ${topSteal.pk.team} at #${topSteal.pk.overall}, ${topSteal.delta} slots past consensus.`
    );
    if (topReach) parts.push(
      `Biggest reach — ${topReach.prospect.name} (${topReach.prospect.pos}) ` +
      `to ${topReach.pk.team} at #${topReach.pk.overall}, ${Math.abs(topReach.delta)} slots early.`
    );
    return parts.join(" ");
  }

  function mapPos(pos) {
    if (pos === "OT" || pos === "IOL") return "OL";
    if (pos === "CB" || pos === "S")   return "DB";
    return pos;
  }
})();
