// js/ai.js — AI pick engine.
// Scoring: 0.55 * BPA + 0.35 * need + 0.10 * noise.
// QB premium for top-need-QB teams; occasional reach to mimic real GMs.
(function () {
  window.AI = {
    pickFor(team, pool, options) {
      if (!pool.length) return null;
      const randomness = (options && options.randomness != null) ? options.randomness : 0.1;
      const teamEntry = window.TEAMS_BY_ABBR[team];
      const needs = teamEntry ? teamEntry.needs : [];
      const poolSize = pool.length;

      const scored = pool.map(p => {
        const bpa  = 1 - (p.rank - 1) / Math.max(poolSize * 2, 60);
        const mapped = mapPos(p.pos);
        const needIdx = needs.indexOf(mapped);
        const need = needFactor(needIdx);
        const noise = Math.random() * randomness;
        let score = 0.55 * bpa + 0.35 * need + 0.10 * noise;

        // QB premium: top-need QB teams pounce on early-ranked QBs.
        if (needs[0] === "QB" && p.pos === "QB" && p.rank <= 10) {
          score *= 1.25;
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
