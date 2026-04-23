// data/teams.js — 32 NFL teams with colors + 2026 positional needs
// Needs ordered top-to-bottom (index 0 = biggest need). Sources: CBS Sports
// team-needs tracker, Yahoo Sports, SI draft guides (as of Apr 21, 2026).
// Data is pre-2026-draft; real picks/needs may differ by the time you run this.
window.TEAMS = [
  { abbr: "ARI", city: "Arizona",      name: "Cardinals",  conf: "NFC", div: "West",  primary: "#97233F", secondary: "#000000", needs: ["EDGE","OL","DB","WR","LB","DT","TE","RB"] },
  { abbr: "ATL", city: "Atlanta",      name: "Falcons",    conf: "NFC", div: "South", primary: "#A71930", secondary: "#000000", needs: ["EDGE","DT","DB","LB","OL","WR","QB","TE"] },
  { abbr: "BAL", city: "Baltimore",    name: "Ravens",     conf: "AFC", div: "North", primary: "#241773", secondary: "#9E7C0C", needs: ["OL","WR","EDGE","DB","DT","LB","TE","RB"] },
  { abbr: "BUF", city: "Buffalo",      name: "Bills",      conf: "AFC", div: "East",  primary: "#00338D", secondary: "#C60C30", needs: ["WR","DT","EDGE","DB","OL","LB","TE","RB"] },
  { abbr: "CAR", city: "Carolina",     name: "Panthers",   conf: "NFC", div: "South", primary: "#0085CA", secondary: "#101820", needs: ["EDGE","LB","DB","WR","DT","OL","TE","RB"] },
  { abbr: "CHI", city: "Chicago",      name: "Bears",      conf: "NFC", div: "North", primary: "#0B162A", secondary: "#C83803", needs: ["OL","EDGE","DT","DB","WR","LB","TE","RB"] },
  { abbr: "CIN", city: "Cincinnati",   name: "Bengals",    conf: "AFC", div: "North", primary: "#FB4F14", secondary: "#000000", needs: ["DB","LB","EDGE","OL","TE","DT","WR","RB"] },
  { abbr: "CLE", city: "Cleveland",    name: "Browns",     conf: "AFC", div: "North", primary: "#311D00", secondary: "#FF3C00", needs: ["QB","WR","OL","LB","TE","DB","RB","DT"] },
  { abbr: "DAL", city: "Dallas",       name: "Cowboys",    conf: "NFC", div: "East",  primary: "#003594", secondary: "#869397", needs: ["DT","DB","LB","WR","OL","RB","TE","EDGE"] },
  { abbr: "DEN", city: "Denver",       name: "Broncos",    conf: "AFC", div: "West",  primary: "#FB4F14", secondary: "#002244", needs: ["WR","LB","TE","DT","RB","DB","OL","EDGE"] },
  { abbr: "DET", city: "Detroit",      name: "Lions",      conf: "NFC", div: "North", primary: "#0076B6", secondary: "#B0B7BC", needs: ["EDGE","DT","DB","LB","WR","OL","TE","RB"] },
  { abbr: "GB",  city: "Green Bay",    name: "Packers",    conf: "NFC", div: "North", primary: "#203731", secondary: "#FFB612", needs: ["EDGE","DB","OL","DT","LB","WR","TE","RB"] },
  { abbr: "HOU", city: "Houston",      name: "Texans",     conf: "AFC", div: "South", primary: "#03202F", secondary: "#A71930", needs: ["OL","RB","DT","LB","TE","DB","WR","EDGE"] },
  { abbr: "IND", city: "Indianapolis", name: "Colts",      conf: "AFC", div: "South", primary: "#002C5F", secondary: "#A2AAAD", needs: ["QB","DB","EDGE","OL","LB","TE","DT","WR"] },
  { abbr: "JAX", city: "Jacksonville", name: "Jaguars",    conf: "AFC", div: "South", primary: "#006778", secondary: "#9F792C", needs: ["DB","LB","OL","DT","WR","TE","EDGE","RB"] },
  { abbr: "KC",  city: "Kansas City",  name: "Chiefs",     conf: "AFC", div: "West",  primary: "#E31837", secondary: "#FFB81C", needs: ["OL","WR","DB","EDGE","DT","RB","LB","TE"] },
  { abbr: "LAC", city: "Los Angeles",  name: "Chargers",   conf: "AFC", div: "West",  primary: "#0080C6", secondary: "#FFC20E", needs: ["WR","DT","DB","EDGE","OL","LB","TE","RB"] },
  { abbr: "LAR", city: "Los Angeles",  name: "Rams",       conf: "NFC", div: "West",  primary: "#003594", secondary: "#FFA300", needs: ["DB","LB","OL","WR","TE","EDGE","DT","RB"] },
  { abbr: "LV",  city: "Las Vegas",    name: "Raiders",    conf: "AFC", div: "West",  primary: "#000000", secondary: "#A5ACAF", needs: ["QB","OL","DB","WR","LB","DT","EDGE","TE"] },
  { abbr: "MIA", city: "Miami",        name: "Dolphins",   conf: "AFC", div: "East",  primary: "#008E97", secondary: "#FC4C02", needs: ["OL","DT","LB","DB","TE","RB","EDGE","WR"] },
  { abbr: "MIN", city: "Minnesota",    name: "Vikings",    conf: "NFC", div: "North", primary: "#4F2683", secondary: "#FFC62F", needs: ["DT","OL","DB","EDGE","LB","RB","WR","TE"] },
  { abbr: "NE",  city: "New England",  name: "Patriots",   conf: "AFC", div: "East",  primary: "#002244", secondary: "#C60C30", needs: ["WR","EDGE","OL","TE","DB","LB","DT","RB"] },
  { abbr: "NO",  city: "New Orleans",  name: "Saints",     conf: "NFC", div: "South", primary: "#D3BC8D", secondary: "#101820", needs: ["QB","DB","EDGE","OL","LB","DT","WR","TE"] },
  { abbr: "NYG", city: "New York",     name: "Giants",     conf: "NFC", div: "East",  primary: "#0B2265", secondary: "#A71930", needs: ["QB","WR","DB","LB","OL","TE","DT","EDGE"] },
  { abbr: "NYJ", city: "New York",     name: "Jets",       conf: "AFC", div: "East",  primary: "#125740", secondary: "#000000", needs: ["QB","OL","TE","DT","DB","LB","EDGE","WR"] },
  { abbr: "PHI", city: "Philadelphia", name: "Eagles",     conf: "NFC", div: "East",  primary: "#004C54", secondary: "#A5ACAF", needs: ["LB","DB","DT","EDGE","OL","TE","WR","RB"] },
  { abbr: "PIT", city: "Pittsburgh",   name: "Steelers",   conf: "AFC", div: "North", primary: "#FFB612", secondary: "#101820", needs: ["QB","WR","DT","DB","OL","LB","TE","EDGE"] },
  { abbr: "SF",  city: "San Francisco",name: "49ers",      conf: "NFC", div: "West",  primary: "#AA0000", secondary: "#B3995D", needs: ["OL","DB","LB","DT","EDGE","WR","TE","RB"] },
  { abbr: "SEA", city: "Seattle",      name: "Seahawks",   conf: "NFC", div: "West",  primary: "#002244", secondary: "#69BE28", needs: ["OL","DT","DB","LB","EDGE","WR","TE","RB"] },
  { abbr: "TB",  city: "Tampa Bay",    name: "Buccaneers", conf: "NFC", div: "South", primary: "#D50A0A", secondary: "#34302B", needs: ["LB","DB","DT","EDGE","OL","WR","TE","RB"] },
  { abbr: "TEN", city: "Tennessee",    name: "Titans",     conf: "AFC", div: "South", primary: "#0C2340", secondary: "#4B92DB", needs: ["EDGE","DB","OL","WR","LB","TE","DT","RB"] },
  { abbr: "WAS", city: "Washington",   name: "Commanders", conf: "NFC", div: "East",  primary: "#5A1414", secondary: "#FFB612", needs: ["OL","EDGE","DB","DT","LB","WR","TE","RB"] }
];

window.TEAMS_BY_ABBR = window.TEAMS.reduce((acc, t) => { acc[t.abbr] = t; return acc; }, {});
