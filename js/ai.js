// js/ai.js — AI pick engine.
// Scoring: 0.55 * BPA + 0.35 * need + 0.10 * noise.
// QB premium applies only to a legitimate top-tier QB; once one QB has gone
// inside the top 20, remaining QBs are suppressed there — post-Feb-15-2026
// consensus (post-combine/pro-day) only grades one QB as a true top-20 talent.
(function () {
  window.AI = {
    pickFor(team, pool, options, context) {
      if (!pool.length) return null;
      const randomness = (options && options.randomness != null) ? options.randomness : 0.1;
      const teamEntry = window.TEAMS_BY_ABBR[team];
      const needs = teamEntry ? teamEntry.needs : [];
      const poolSize = pool.length;
      const overall = context && context.overall;
      const qbsDrafted = (context && context.qbsDrafted) || 0;

      const scored = pool.map(p => {
        const bpa  = 1 - (p.rank - 1) / Math.max(poolSize * 2, 60);
        const mapped = mapPos(p.pos);
        const needIdx = needs.indexOf(mapped);
        const need = needFactor(needIdx);
        const noise = Math.random() * randomness;
        let score = 0.55 * bpa + 0.35 * need + 0.10 * noise;

        if (p.pos === "QB") {
          // Top-tier QB premium only for a true blue-chip (rank <= 5) with QB need.
          if (needs[0] === "QB" && p.rank <= 5) {
            score *= 1.25;
          }
          // Cap top-20 QBs at 1: heavy penalty if a QB already went inside #20.
          if (overall && overall <= 20 && qbsDrafted >= 1) {
            score *= 0.08;
          }
          // Even before one goes, a non-top-tier QB (rank > 15) shouldn't crash the top 20.
          if (overall && overall <= 20 && p.rank > 15) {
            score *= 0.35;
          }
        }
        // De-emphasize K/P/LS until very late.
        if (["K","P","LS"].includes(p.pos)) {
          score *= 0.2;
        }
        return { p, score };
      });

      scored.sort((a,b) => b.score - a.score);

      // 3% reach chance: pick 3rd-5th best instead of the top-scored.
      if (scored.length >= 5 && Math.random() < 0.03) {
        const idx = 2 + Math.floor(Math.random() * 3);
        return scored[idx].p;
      }
      return scored[0].p;
    },

    // After a team drafts a position, demote that position-category on
    // their needs list. We push to end rather than remove entirely so
    // teams can still double-dip on a true need (WR2, CB2, etc).
    updateNeeds(team, pos) {
      const t = window.TEAMS_BY_ABBR[team];
      if (!t) return;
      const mapped = mapPos(pos);
      const idx = t.needs.indexOf(mapped);
      if (idx >= 0) {
        t.needs.splice(idx, 1);
        t.needs.push(mapped);
      }
    }
  };

  function needFactor(idx) {
    if (idx < 0)  return 0.02;
    if (idx === 0) return 1.0;
    if (idx === 1) return 0.75;
    if (idx === 2) return 0.55;
    if (idx === 3) return 0.35;
    if (idx <= 7) return 0.20;
    return 0.05;
  }

  // Translate prospect position -> team-needs category (OL/DB are grouped).
  function mapPos(pos) {
    if (pos === "OT" || pos === "IOL") return "OL";
    if (pos === "CB" || pos === "S")   return "DB";
    return pos;
  }
  window.AI.mapPos = mapPos;
})();
