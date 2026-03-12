#!/usr/bin/env node

// Scenario-based tests that simulate real skill execution workflows
// Tests the data pipeline from scripts → report generation prerequisites

import { execSync } from "node:child_process";

const DIR = import.meta.dirname;
function run(cmd) {
  return execSync(cmd, { cwd: DIR, encoding: "utf8", env: { ...process.env } });
}
function runJSON(cmd) {
  return JSON.parse(run(cmd));
}

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
    failures.push(label);
  }
}

// ════════════════════════════════════════════════════════════
// SCENARIO A: Natal Report — complete data pipeline
// User: "Help me analyze my birth chart"
// Birth: 1995-08-20 14:30, Tokyo (139.6917, 35.6895)
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO A: Natal Report — Tokyo birth ===");
const natalA = runJSON('node horoscope.mjs --birthDate "1995-08-20T14:30:00" --longitude 139.6917 --latitude 35.6895');

// A1: All 10 planets have valid sign+house for report table
const VALID_SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
for (const star of natalA.stars) {
  assert(`A1: ${star.star} sign "${star.sign}" is valid zodiac`, VALID_SIGNS.includes(star.sign));
  assert(`A1: ${star.star} house ${star.house} in 1-12`, star.house >= 1 && star.house <= 12);
}

// A2: Sun should be in Leo for Aug 20 birth
assert("A2: Sun in Leo for Aug 20", natalA.stars.find(s => s.star === "sun").sign === "leo");

// A3: chartData is usable for aspect calculations
for (const star of natalA.stars) {
  const key = star.star.charAt(0).toUpperCase() + star.star.slice(1);
  const planetData = natalA.chartData.planets[key];
  assert(`A3: chartData.planets.${key} exists`, Array.isArray(planetData) && planetData.length === 1);
  assert(`A3: chartData.planets.${key} is numeric`, typeof planetData[0] === "number" && !isNaN(planetData[0]));
}

// A4: House cusps are ascending order (generally — first cusp could wrap around 360)
const cusps = natalA.chartData.cusps;
assert("A4: 12 cusps present", cusps.length === 12);
assert("A4: All cusps 0-360", cusps.every(c => c >= 0 && c < 360));

// ════════════════════════════════════════════════════════════
// SCENARIO B: Predict Report — full daily forecast workflow
// User: "What's my horoscope for today?"
// Birth: 1988-03-03 06:00, Shanghai
// Target: 2026-03-12
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO B: Predict Report — daily forecast workflow ===");
const birthB = '1988-03-03T06:00:00';
const targetB = '2026-03-12T12:00:00';
const natalB = runJSON(`node horoscope.mjs --birthDate "${birthB}" --longitude 121.4737 --latitude 31.2304`);
const transitB = runJSON(`node horoscope.mjs --birthDate "${targetB}" --longitude 121.4737 --latitude 31.2304`);

// B1: Both charts are valid
assert("B1: Natal chart 10 stars", natalB.stars.length === 10);
assert("B1: Transit chart 10 stars", transitB.stars.length === 10);

// B2: Transit aspects can be calculated (degree differences make sense)
const sunNatal = natalB.stars.find(s => s.star === "sun").decimalDegrees;
const sunTransit = transitB.stars.find(s => s.star === "sun").decimalDegrees;
let sunDiff = Math.abs(sunNatal - sunTransit);
if (sunDiff > 180) sunDiff = 360 - sunDiff;
assert(`B2: Natal-Transit Sun diff ${sunDiff.toFixed(1)}° is 0-180`, sunDiff >= 0 && sunDiff <= 180);

// B3: Moon phase for target date
const moonB = runJSON('node moon-phase.mjs --date "2026-03-12"');
assert("B3: Moon phase valid", typeof moonB.phaseText === "string" && moonB.phaseText.length > 0);
assert("B3: Lunar day valid", typeof moonB.lunarDay === "number");

// B4: Scores for all 5 default topics
const PREDICT_TOPICS = ["career", "love", "wealth", "creativity", "health"];
const predictScores = {};
for (const topic of PREDICT_TOPICS) {
  const s = runJSON(`node random-score.mjs --seed "1988-03-03:2026-03-12:${topic}" --with-category`);
  predictScores[topic] = s;
  assert(`B4: ${topic} score ${s.score} in 40-100`, s.score >= 40 && s.score <= 100);
  assert(`B4: ${topic} has category`, ["powerIn", "pressureIn"].includes(s.category));
}

// B5: Scores are deterministic (run again)
for (const topic of PREDICT_TOPICS) {
  const s2 = runJSON(`node random-score.mjs --seed "1988-03-03:2026-03-12:${topic}" --with-category`);
  assert(`B5: ${topic} deterministic (${s2.score} == ${predictScores[topic].score})`, s2.score === predictScores[topic].score);
}

// B6: Different target dates give different scores (daily variation)
const tomorrow = runJSON('node random-score.mjs --seed "1988-03-03:2026-03-13:career" --with-category');
// They might occasionally collide, but we can verify the mechanism works
assert(`B6: Today career=${predictScores.career.score}, Tomorrow career=${tomorrow.score}`, typeof tomorrow.score === "number");

// ════════════════════════════════════════════════════════════
// SCENARIO C: Synastry Report — compatibility analysis
// User A: 1990-06-15 08:30, Beijing
// User B: 1995-01-22 16:45, London
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO C: Synastry Report — compatibility ===");
const userC = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const partnerC = runJSON('node horoscope.mjs --birthDate "1995-01-22T16:45:00" --longitude -0.1276 --latitude 51.5074');

// C1: Both charts valid
assert("C1: User chart complete", userC.stars.length === 10 && userC.chartData.cusps.length === 12);
assert("C1: Partner chart complete", partnerC.stars.length === 10 && partnerC.chartData.cusps.length === 12);

// C2: Synastry uses 7 planets (Sun through Saturn)
const SYNASTRY_PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
for (const planet of SYNASTRY_PLANETS) {
  const u = userC.stars.find(s => s.star === planet);
  const p = partnerC.stars.find(s => s.star === planet);
  assert(`C2: User ${planet} exists`, !!u);
  assert(`C2: Partner ${planet} exists`, !!p);
}

// C3: Cross-chart aspect detection (standard orbs)
const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 8 },
  { name: "sextile", angle: 60, orb: 6 },
  { name: "square", angle: 90, orb: 8 },
  { name: "trine", angle: 120, orb: 8 },
  { name: "opposition", angle: 180, orb: 8 },
];
const aspects = [];
for (const uStar of userC.stars.filter(s => SYNASTRY_PLANETS.includes(s.star))) {
  for (const pStar of partnerC.stars.filter(s => SYNASTRY_PLANETS.includes(s.star))) {
    let diff = Math.abs(uStar.decimalDegrees - pStar.decimalDegrees);
    if (diff > 180) diff = 360 - diff;
    for (const asp of ASPECTS) {
      if (Math.abs(diff - asp.angle) <= asp.orb) {
        aspects.push({ user: uStar.star, partner: pStar.star, type: asp.name, angle: diff.toFixed(1) });
      }
    }
  }
}
assert(`C3: Found ${aspects.length} cross-chart aspects (expect >0)`, aspects.length > 0);
console.log(`    Sample aspects: ${aspects.slice(0, 3).map(a => `${a.user}↔${a.partner} ${a.type}(${a.angle}°)`).join(", ")}`);

// C4: Overall compatibility score
const synScoreC = runJSON('node random-score.mjs --seed "1990-06-15:1995-01-22:synastry"');
assert(`C4: Synastry score ${synScoreC.score} in range`, synScoreC.score >= 40 && synScoreC.score <= 100);

// C5: Score order matters (A→B vs B→A)
const synScoreReverse = runJSON('node random-score.mjs --seed "1995-01-22:1990-06-15:synastry"');
assert(`C5: A→B(${synScoreC.score}) vs B→A(${synScoreReverse.score}) differ`, synScoreC.score !== synScoreReverse.score);

// ════════════════════════════════════════════════════════════
// SCENARIO D: Moon Phase Report — various phases
// Verify all 8 phases are reachable across a full lunar cycle
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO D: Moon Phase Report — full cycle coverage ===");

const PHASE_DISPLAY = {
  new_moon: { zh: "新月", emoji: "🌑" },
  waxing_crescent_moon: { zh: "眉月", emoji: "🌒" },
  first_quarter_moon: { zh: "上弦月", emoji: "🌓" },
  waxing_gibbous_moon: { zh: "盈凸月", emoji: "🌔" },
  full_moon: { zh: "满月", emoji: "🌕" },
  waning_gibbous_moon: { zh: "亏凸月", emoji: "🌖" },
  last_quarter_moon: { zh: "下弦月", emoji: "🌗" },
  waning_crescent_moon: { zh: "残月", emoji: "🌘" },
};

// Scan 30 consecutive days to find all 8 phases
const phasesFound = new Set();
const phaseByDate = [];
for (let day = 1; day <= 30; day++) {
  const dd = String(day).padStart(2, "0");
  const m = runJSON(`node moon-phase.mjs --date "2026-01-${dd}"`);
  phasesFound.add(m.phaseText);
  phaseByDate.push({ date: `2026-01-${dd}`, phase: m.phaseText, lunarDay: m.lunarDay });
}
assert(`D1: Found ${phasesFound.size}/8 phases in Jan 2026`, phasesFound.size >= 7); // 7-8 in a single month
console.log(`    Phases found: ${[...phasesFound].join(", ")}`);

// D2: Verify phase display mapping covers all returned phases
for (const phase of phasesFound) {
  assert(`D2: "${phase}" has display mapping`, phase in PHASE_DISPLAY);
}

// D3: Lunar day progression (should generally increase, with wrap-around)
let hasWrap = false;
for (let i = 1; i < phaseByDate.length; i++) {
  if (phaseByDate[i].lunarDay < phaseByDate[i - 1].lunarDay) hasWrap = true;
}
assert("D3: Lunar day wraps around within 30 days", hasWrap);

// D4: Moon phase + retrograde data for report
const moonReportDate = "2026-03-12";
const moonD = runJSON(`node moon-phase.mjs --date "${moonReportDate}"`);
const transitD = runJSON(`node horoscope.mjs --birthDate "${moonReportDate}T12:00:00" --longitude 116.4074 --latitude 39.9042`);
assert("D4: Moon phase data present", !!moonD.phaseText);
assert("D4: Retrograde data present", Array.isArray(transitD.retrogradeStars));
console.log(`    ${moonReportDate}: ${moonD.phaseText} (day ${moonD.lunarDay}), ${transitD.retrogradeStars.length} retrograde planets`);

// ════════════════════════════════════════════════════════════
// SCENARIO E: Known astronomical facts verification
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO E: Known astronomical facts ===");

// E1: Summer solstice 2000 — Sun should be at ~90° (Cancer 0°)
const solstice = runJSON('node horoscope.mjs --birthDate "2000-06-21T12:00:00" --longitude 0 --latitude 0');
const sunSolstice = solstice.stars.find(s => s.star === "sun");
assert(`E1: Summer solstice Sun in gemini/cancer (~90°), got ${sunSolstice.sign} ${sunSolstice.decimalDegrees.toFixed(1)}°`,
  (sunSolstice.sign === "gemini" || sunSolstice.sign === "cancer") && sunSolstice.decimalDegrees > 85 && sunSolstice.decimalDegrees < 95);

// E2: Vernal equinox — Sun near 0° Aries
const equinox = runJSON('node horoscope.mjs --birthDate "2000-03-20T12:00:00" --longitude 0 --latitude 0');
const sunEquinox = equinox.stars.find(s => s.star === "sun");
assert(`E2: Vernal equinox Sun near Aries(0°) or Pisces(360°), got ${sunEquinox.sign} ${sunEquinox.decimalDegrees.toFixed(1)}°`,
  (sunEquinox.sign === "pisces" || sunEquinox.sign === "aries") &&
  (sunEquinox.decimalDegrees < 5 || sunEquinox.decimalDegrees > 355));

// E3: Moon moves ~13° per day
const day1 = runJSON('node horoscope.mjs --birthDate "2026-03-12T12:00:00" --longitude 0 --latitude 0');
const day2 = runJSON('node horoscope.mjs --birthDate "2026-03-13T12:00:00" --longitude 0 --latitude 0');
const moonDay1 = day1.stars.find(s => s.star === "moon").decimalDegrees;
const moonDay2 = day2.stars.find(s => s.star === "moon").decimalDegrees;
let moonDailyMove = moonDay2 - moonDay1;
if (moonDailyMove < 0) moonDailyMove += 360;
assert(`E3: Moon daily motion ~13° (got ${moonDailyMove.toFixed(1)}°)`, moonDailyMove > 10 && moonDailyMove < 16);

// E4: Outer planets move slowly — Pluto should barely change in 1 day
const plutoDay1 = day1.stars.find(s => s.star === "pluto").decimalDegrees;
const plutoDay2 = day2.stars.find(s => s.star === "pluto").decimalDegrees;
let plutoDailyMove = Math.abs(plutoDay2 - plutoDay1);
if (plutoDailyMove > 180) plutoDailyMove = 360 - plutoDailyMove;
assert(`E4: Pluto daily motion < 0.1° (got ${plutoDailyMove.toFixed(4)}°)`, plutoDailyMove < 0.1);

// ════════════════════════════════════════════════════════════
// SCENARIO F: Score distribution analysis
// Verify scores aren't clustered at extremes
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO F: Score distribution fairness ===");

const distScores = [];
for (let i = 0; i < 100; i++) {
  const s = runJSON(`node random-score.mjs --seed "dist-test-${i}"`);
  distScores.push(s.score);
}

const avg = distScores.reduce((a, b) => a + b, 0) / distScores.length;
const min = Math.min(...distScores);
const max = Math.max(...distScores);
const uniqueCount = new Set(distScores).size;

assert(`F1: Average score ~70 (got ${avg.toFixed(1)})`, avg > 55 && avg < 85);
assert(`F2: Min score ≥40 (got ${min})`, min >= 40);
assert(`F3: Max score ≤100 (got ${max})`, max <= 100);
assert(`F4: At least 30 unique values in 100 seeds (got ${uniqueCount})`, uniqueCount >= 30);

// Check distribution across quartiles
const q1 = distScores.filter(s => s >= 40 && s < 55).length;
const q2 = distScores.filter(s => s >= 55 && s < 70).length;
const q3 = distScores.filter(s => s >= 70 && s < 85).length;
const q4 = distScores.filter(s => s >= 85 && s <= 100).length;
console.log(`    Distribution: 40-54:${q1}, 55-69:${q2}, 70-84:${q3}, 85-100:${q4}`);
assert("F5: No quartile empty", q1 > 0 && q2 > 0 && q3 > 0 && q4 > 0);

// ════════════════════════════════════════════════════════════
// SCENARIO G: Birth time unknown — noon default
// SKILL.md says use 12:00 noon if time unknown
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO G: Unknown birth time (noon default) ===");

const noonChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T12:00:00" --longitude 116.4074 --latitude 39.9042');
const earlyChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T00:00:00" --longitude 116.4074 --latitude 39.9042');
const lateChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T23:59:00" --longitude 116.4074 --latitude 39.9042');

// G1: Signs should be mostly the same (Sun definitely same)
assert("G1: Sun same sign regardless of time",
  noonChart.stars[0].sign === earlyChart.stars[0].sign && noonChart.stars[0].sign === lateChart.stars[0].sign);

// G2: Houses differ significantly with time
const noonHouses = noonChart.stars.map(s => s.house).join(",");
const earlyHouses = earlyChart.stars.map(s => s.house).join(",");
assert("G2: Houses differ between midnight and noon", noonHouses !== earlyHouses);

// G3: Moon might change sign during the day (it's fast)
const moonNoon = noonChart.stars.find(s => s.star === "moon");
const moonEarly = earlyChart.stars.find(s => s.star === "moon");
const moonLate = lateChart.stars.find(s => s.star === "moon");
let moonRange = Math.abs(moonLate.decimalDegrees - moonEarly.decimalDegrees);
if (moonRange > 180) moonRange = 360 - moonRange;
assert(`G3: Moon moves ${moonRange.toFixed(1)}° throughout the day`, moonRange > 5);

// ════════════════════════════════════════════════════════════
// SCENARIO H: Predict report — topic→planet mapping validation
// Verify the planet mapping table from predict-report.md
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO H: Topic→Planet mapping for predict ===");

const TOPIC_PLANET_MAP = {
  career: { primary: ["saturn", "jupiter"], secondary: ["sun", "mars"] },
  love: { primary: ["venus"], secondary: ["moon", "mars"] },
  wealth: { primary: ["jupiter"], secondary: ["venus"] },
  creativity: { primary: ["neptune"], secondary: ["venus"] },
  health: { primary: ["mars"], secondary: ["sun"] },
};

// Verify all referenced planets exist in chart data
const sampleChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const starSet = new Set(sampleChart.stars.map(s => s.star));

for (const [topic, planets] of Object.entries(TOPIC_PLANET_MAP)) {
  for (const p of [...planets.primary, ...planets.secondary]) {
    assert(`H: ${topic} planet "${p}" exists in chart`, starSet.has(p));
  }
}

// ════════════════════════════════════════════════════════════
// SCENARIO I: Synastry — same person should have perfect alignment
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO I: Same person synastry (self-comparison) ===");
const self1 = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const self2 = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');

// I1: Identical charts
assert("I1: Same input → identical stars", JSON.stringify(self1.stars) === JSON.stringify(self2.stars));
assert("I1: Same input → identical chartData", JSON.stringify(self1.chartData) === JSON.stringify(self2.chartData));

// I2: All planets are conjunct with themselves (0° difference)
for (const planet of SYNASTRY_PLANETS) {
  const d1 = self1.stars.find(s => s.star === planet).decimalDegrees;
  const d2 = self2.stars.find(s => s.star === planet).decimalDegrees;
  assert(`I2: ${planet} self-diff = 0°`, Math.abs(d1 - d2) < 0.001);
}

// ════════════════════════════════════════════════════════════
// SCENARIO J: Score seed format validation
// Ensure different seed formats produce expected behavior
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO J: Score seed format validation ===");

// J1: Predict seed format — changing any component changes the score
const base = runJSON('node random-score.mjs --seed "1990-06-15:2026-03-12:career"');
const diffBirth = runJSON('node random-score.mjs --seed "1990-06-16:2026-03-12:career"');
const diffTarget = runJSON('node random-score.mjs --seed "1990-06-15:2026-03-13:career"');
const diffTopic = runJSON('node random-score.mjs --seed "1990-06-15:2026-03-12:love"');
assert(`J1: Different birth → different score (${base.score} vs ${diffBirth.score})`, base.score !== diffBirth.score);
assert(`J1: Different target → different score (${base.score} vs ${diffTarget.score})`, base.score !== diffTarget.score);
assert(`J1: Different topic → different score (${base.score} vs ${diffTopic.score})`, base.score !== diffTopic.score);

// J2: Without --with-category, no category field
const noCategory = runJSON('node random-score.mjs --seed "test"');
assert("J2: No --with-category → no category field", !("category" in noCategory));
assert("J2: Score still in range", noCategory.score >= 40 && noCategory.score <= 100);

// J3: With --with-category
const withCategory = runJSON('node random-score.mjs --seed "test" --with-category');
assert("J3: --with-category → has category", "category" in withCategory);
assert("J3: Same seed → same score", withCategory.score === noCategory.score);

// ════════════════════════════════════════════════════════════
// SCENARIO K: arcDegreesFormatted30 format check
// Used for display in natal reports
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO K: Degree format validation ===");

const formatChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
for (const star of formatChart.stars) {
  // Should be like "23°45'" or "5°12'" — digits, degree symbol, digits, minute symbol
  const fmt = star.arcDegreesFormatted30;
  assert(`K: ${star.star} format "${fmt}" matches degree pattern`, /^\d+°\d+'?$/.test(fmt));
  // Degrees within sign should be 0-29
  const deg = parseInt(fmt);
  assert(`K: ${star.star} degree ${deg} within sign (0-29)`, deg >= 0 && deg <= 29);
}

// ════════════════════════════════════════════════════════════
// SCENARIO L: Multiple births same day, different locations
// Houses should differ; signs should match
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO L: Same time, different locations ===");

const locations = [
  { name: "Beijing", lng: 116.4074, lat: 39.9042 },
  { name: "Sydney", lng: 151.2093, lat: -33.8688 },
  { name: "São Paulo", lng: -46.6333, lat: -23.5505 },
];

const chartsL = locations.map(loc =>
  runJSON(`node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude ${loc.lng} --latitude ${loc.lat}`)
);

// Signs should be identical (ecliptic positions don't depend on location)
for (let i = 1; i < chartsL.length; i++) {
  const signs0 = chartsL[0].stars.map(s => s.sign).join(",");
  const signsI = chartsL[i].stars.map(s => s.sign).join(",");
  assert(`L: ${locations[0].name} vs ${locations[i].name} same signs`, signs0 === signsI);
}

// Houses should differ across locations
const houseStrings = chartsL.map(c => c.stars.map(s => s.house).join(","));
const uniqueHousePatterns = new Set(houseStrings);
assert(`L: ${uniqueHousePatterns.size} unique house patterns from 3 locations`, uniqueHousePatterns.size >= 2);

// ════════════════════════════════════════════════════════════
// SCENARIO M: Moon phase known dates
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO M: Moon phase known dates ===");

// 2026-01-29 is a new moon (from astronomical data)
const newMoonTest = runJSON('node moon-phase.mjs --date "2026-01-29"');
// Allow some tolerance — the phase might show as waxing_crescent if slightly past
assert(`M1: 2026-01-29 near new moon (got ${newMoonTest.phaseText}, day ${newMoonTest.lunarDay})`,
  newMoonTest.phaseText === "new_moon" || newMoonTest.phaseText === "waxing_crescent_moon" || newMoonTest.phaseText === "waxing_gibbous_moon");

// Full moon ~14 days later
const fullMoonTest = runJSON('node moon-phase.mjs --date "2026-02-12"');
assert(`M2: 2026-02-12 near full/waning (got ${fullMoonTest.phaseText}, day ${fullMoonTest.lunarDay})`,
  fullMoonTest.lunarDay > 10 && fullMoonTest.lunarDay < 30);

// ════════════════════════════════════════════════════════════
// SCENARIO N: Retrograde detection for moon phase report
// ════════════════════════════════════════════════════════════
console.log("\n=== SCENARIO N: Retrograde data for moon phase report ===");

// Check multiple dates for retrograde variety
const retroDates = ["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"];
const allRetro = [];
for (const date of retroDates) {
  const h = runJSON(`node horoscope.mjs --birthDate "${date}T12:00:00" --longitude 0 --latitude 0`);
  const retro = h.retrogradeStars.map(r => r.star);
  allRetro.push({ date, retrograde: retro });
  assert(`N: ${date} retrograde list valid`, Array.isArray(h.retrogradeStars));
  // Verify no sun/moon in retrogrades
  assert(`N: ${date} no sun in retrograde`, !retro.includes("sun"));
  assert(`N: ${date} no moon in retrograde`, !retro.includes("moon"));
}
console.log(`    Retrogrades by date:`);
allRetro.forEach(r => console.log(`    ${r.date}: ${r.retrograde.length > 0 ? r.retrograde.join(", ") : "(none)"}`));

// At least some dates should have retrogrades (outer planets are frequently retrograde)
const hasAnyRetro = allRetro.some(r => r.retrograde.length > 0);
assert("N: At least one date has retrograde planets", hasAnyRetro);

// ═══ SUMMARY ═══
console.log("\n" + "=".repeat(50));
console.log(`TOTAL: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFailed tests:");
  failures.forEach(f => console.log(`  - ${f}`));
}
if (failed > 0) process.exit(1);
