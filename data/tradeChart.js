// data/tradeChart.js — Jimmy Johnson pick-value chart (1-224)
// plus linear extrapolation to 0 for picks 225-257.
// Used by js/trades.js for both user-proposed and AI-to-AI trades.
window.JJ_CHART = (function () {
  const values = [
    null, // index 0 unused so chart[n] === value of pick n
    3000,2600,2200,1800,1700,1600,1500,1400,1350,1300,
    1250,1200,1150,1100,1050,1000, 950, 900, 875, 850,
     800, 780, 760, 740, 720, 700, 680, 660, 640, 620,
     600, 590, 580, 560, 550, 540, 530, 520, 510, 500,
     490, 480, 470, 460, 450, 440, 430, 420, 410, 400,
     390, 380, 370, 360, 350, 340, 330, 320, 310, 300,
     292, 284, 276, 270, 265, 261, 257, 253, 249, 245,
     241, 237, 233, 229, 225, 221, 217, 213, 209, 205,
     201, 197, 194, 191, 188, 185, 182, 179, 176, 173,
     170, 167, 164, 161, 158, 155, 152, 149, 146, 144,
     142, 140, 138, 136, 134, 132, 130, 128, 126, 124,
     122, 120, 118, 116, 114, 112, 110, 108, 106, 104,
     102, 100,  98,  96,  94,  92,  90,  88,  86,  84,
      82,  80,  78,  76,  74,  72,  70,  68,  66,  64,
      62,  60,  58,  56,  54,  52,  50,  49,  48,  47,
      46,  45,  44,  43,  42,  41,  40,39.5,  39,  38,
      37,  36,  35,  34,  33,  32,  31,  30,29.5,  29,
      28,  27,26.5,  26,  25,24.5,  24,  23,22.5,  22,
    21.5,  21,20.5,  20,19.5,  19,18.5,  18,17.5,  17,
    16.5,  16,15.5,  15,14.5,  14,13.5,  13,12.5,  12,
    11.6,11.2,10.8,10.4,  10, 9.6, 9.2, 8.8, 8.4,   8,
     7.6, 7.2, 6.8, 6.4,   6, 5.6, 5.2, 4.8, 4.4,   4,
     3.6, 3.2, 2.8, 2.4 // picks 221-224
  ];
  // Linear extrapolation for picks 225-257 (end at ~0.05).
  const start = 2.4;
  const end = 0.1;
  const span = 257 - 224;
  for (let n = 225; n <= 257; n++) {
    const frac = (n - 224) / span;
    values[n] = +(start + (end - start) * frac).toFixed(2);
  }
  return values;
})();

// Pick value lookup — safe for any overall pick number.
window.pickValue = function (overallPick) {
  if (!overallPick) return 0;
  return window.JJ_CHART[overallPick] || 0;
};

// Sum value for an array of pick objects (or overall numbers).
window.picksValue = function (picks) {
  return picks.reduce((sum, p) => {
    const n = typeof p === "number" ? p : p.overall;
    return sum + window.pickValue(n);
  }, 0);
};

// Future-year discount: 12% per year.
window.futureDiscount = function (yearsOut) {
  return Math.pow(0.88, yearsOut);
};
