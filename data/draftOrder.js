// data/draftOrder.js — 2026 NFL Draft, 257 picks.
// Source: ESPN "Full 2026 NFL draft order" (as of the day-of-draft publish).
// All pre-draft trades reflected in ownership. "via X" means X was the
// prior owner; multi-via chains record the full history in the note.
window.DRAFT_ORDER = (function () {
  // Round boundaries (start-overall for each round, then sentinel).
  const ROUND_STARTS = [1, 33, 65, 101, 141, 182, 217, 258];

  // One raw line per pick, in overall order (#1 → #257).
  // Format: "TEAM" | "TEAM via FROM [via FROM2 ...]" | append " (comp)".
  const RAW = `
LV
NYJ
ARI
TEN
NYG
CLE
WAS
NO
KC
NYG via CIN
MIA
DAL
LAR via ATL
BAL
TB
NYJ via IND
DET
MIN
CAR
DAL via GB
PIT
LAC
PHI
CLE via JAX
CHI
BUF
SF
HOU
KC via LAR
MIA via DEN
NE
SEA
NYJ
ARI
TEN
LV
NYG
HOU via WAS
CLE
KC
CIN
NO
MIA
NYJ via DAL
BAL
TB
IND
ATL
MIN
DET
CAR
GB
PIT
PHI
LAC
JAX
CHI
SF
HOU
CHI via BUF
LAR
DEN
NE
SEA
ARI
TEN
LV
PHI via NYJ
HOU via NYG
CLE
WAS
CIN
NO
KC
MIA
PIT via DAL
TB
IND
ATL
BAL
JAX via DET
MIN
CAR
GB
PIT
LAC
MIA via PHI
JAX
CHI
MIA via HOU
BUF
DAL via SF
LAR
MIA via DEN
NE
SEA
MIN (comp)
PHI (comp)
PIT (comp)
JAX via DET (comp)
TEN
LV
NYJ
ARI
NYG
HOU via WAS
CLE
DEN via NO
KC
CIN
DEN via MIA
DAL
IND
PHI via ATL
BAL
TB
LV via MIN via JAX
DET
CAR
GB
PIT
ATL via PHI
LAC
JAX
NE via CHI via KC
BUF
SF
DET via HOU
CHI via LAR
MIA via DEN
NE
NO via SEA
SF (comp)
LV (comp)
PIT (comp)
NO (comp)
PHI (comp)
SF (comp)
SF (comp)
NYJ (comp)
HOU via LV via CLE
TEN via NYJ via BAL
ARI
TEN via LAR
NYG
CLE
WAS
KC
CLE via CIN
NO
MIA
DAL
GB via ATL via PHI
BAL
TB
IND
DET
CAR via MIN
CAR
GB
PIT
BAL via LAC
MIN via PHI
JAX
BUF via CHI
JAX via SF via PHI
HOU via PHI
BUF
KC via LAR
DEN
NE
NO via SEA
BAL (comp)
BAL (comp)
LV (comp)
KC (comp)
DAL (comp)
PHI (comp)
NYJ (comp)
DAL (comp)
DET (comp)
BUF via NYJ via CLE via JAX via BUF
ARI
TEN
LV
NYG
WAS
SEA via CLE via JAX via DET
CIN
NO
NE via KC
NYG via MIA
NYG via DAL
TEN via BAL via NYJ
TB
MIN via IND
PHI via ATL
NE via MIA via HOU via MIN via SF
CIN via DET via CLE
CAR
GB
NE via PIT
JAX via PHI via HOU via PHI
LAC
DET via JAX
CLE via CHI
LAR via HOU via LAR via TEN
LV via BUF via NYJ
WAS via SF
KC via LAR
BAL via DEN via NYJ via MIN via PHI
NE
DET
IND via PIT (comp)
ATL via PHI (comp)
PIT (comp)
ARI
DAL via TEN
LV
BUF via NYJ
CIN via NYG via DAL
DET via CLE
WAS
PIT via NO via NE
TEN via KC via DAL
CIN
MIA
NYJ via DAL via BUF via LV
TB
PIT via IND
ATL
LAR via BAL
JAX via DET
MIN
MIN via CAR
GB
PIT
MIA via LAC via TEN via NYJ
CHI via PHI via JAX via CLE
JAX
CHI
NYJ via BUF via CLE
HOU via SF
MIN via HOU
JAX via LAR via HOU
DEN
NE
CLE via SEA
IND (comp)
BAL (comp)
LAR (comp)
LAR (comp)
BAL (comp)
IND (comp)
GB (comp)
DEN (comp)
DEN (comp)
`.trim().split("\n").map(s => s.trim());

  function roundInfo(overall) {
    for (let i = 0; i < 7; i++) {
      if (overall >= ROUND_STARTS[i] && overall < ROUND_STARTS[i + 1]) {
        return { round: i + 1, pick: overall - ROUND_STARTS[i] + 1 };
      }
    }
    return null;
  }

  function parseLine(raw) {
    let line = raw;
    let comp = false;
    if (line.endsWith("(comp)")) {
      comp = true;
      line = line.replace(/\s*\(comp\)\s*$/, "").trim();
    }
    const parts = line.split(/\s+via\s+/);
    const team = parts[0].trim();
    if (parts.length === 1) {
      return { team, from: null, note: comp ? "comp" : null };
    }
    const viaChain = parts.slice(1);
    const from = viaChain[0].trim();
    const noteBase = "via " + viaChain.join(" via ");
    return { team, from, note: comp ? noteBase + " · comp" : noteBase };
  }

  const picks = [];
  RAW.forEach((line, idx) => {
    const overall = idx + 1;
    const info = roundInfo(overall);
    const parsed = parseLine(line);
    picks.push({
      round: info.round,
      pick: info.pick,
      overall,
      team: parsed.team,
      from: parsed.from,
      note: parsed.note
    });
  });

  return picks;
})();

window.DRAFT_ORDER_BY_OVERALL = window.DRAFT_ORDER.reduce((acc, p) => {
  acc[p.overall] = p;
  return acc;
}, {});

window.PICKS_BY_TEAM = window.DRAFT_ORDER.reduce((acc, p) => {
  (acc[p.team] = acc[p.team] || []).push(p);
  return acc;
}, {});
