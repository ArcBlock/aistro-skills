#!/usr/bin/env node

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

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

// ─── TEST 1: Horoscope planet list ───
console.log("\n=== TEST 1: Horoscope - Planet list correctness ===");
const natal = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const starNames = natal.stars.map(s => s.star);
const expected = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
assert("Has 10 stars", natal.stars.length === 10);
assert("Contains pluto", starNames.includes("pluto"));
assert("No ascendant", !starNames.includes("ascendant"));
assert("Correct planet set", JSON.stringify(starNames) === JSON.stringify(expected));
assert("chartData has 10 planets", Object.keys(natal.chartData.planets).length === 10);
assert("chartData has Pluto key", "Pluto" in natal.chartData.planets);
assert("chartData no Ascendant key", !("Ascendant" in natal.chartData.planets));
assert("12 house cusps", natal.chartData.cusps.length === 12);

// ─── TEST 2: Star data fields ───
console.log("\n=== TEST 2: Horoscope - Star data fields ===");
for (const star of natal.stars) {
  assert(`${star.star} has sign`, typeof star.sign === "string" && star.sign.length > 0);
  assert(`${star.star} has house 1-12`, star.house >= 1 && star.house <= 12);
  assert(`${star.star} has decimalDegrees 0-360`, star.decimalDegrees >= 0 && star.decimalDegrees < 360);
  assert(`${star.star} has arcDegreesFormatted30`, typeof star.arcDegreesFormatted30 === "string");
}

// ─── TEST 3: Retrograde correctness ───
console.log("\n=== TEST 3: Retrograde - No sun/moon ===");
const retroNames = natal.retrogradeStars.map(r => r.star);
assert("No sun retrograde", !retroNames.includes("sun"));
assert("No moon retrograde", !retroNames.includes("moon"));
assert("Retrograde list non-empty", natal.retrogradeStars.length > 0);
// All retrogrades should be in the valid set
const validRetro = ["mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
for (const r of retroNames) {
  assert(`${r} is valid retrograde candidate`, validRetro.includes(r));
}

// ─── TEST 4: Different locations produce different cusps ───
console.log("\n=== TEST 4: Different locations → different cusps ===");
const beijing = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const nyc = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude -74.006 --latitude 40.7128');
const bjCusps = beijing.chartData.cusps.map(c => c.toFixed(1)).join(",");
const nycCusps = nyc.chartData.cusps.map(c => c.toFixed(1)).join(",");
assert("Beijing vs NYC have different cusps", bjCusps !== nycCusps);
// Signs should be the same (same moment, signs are ecliptic-based not location-based)
const bjSigns = beijing.stars.map(s => s.sign).join(",");
const nycSigns = nyc.stars.map(s => s.sign).join(",");
assert("Beijing vs NYC have same signs", bjSigns === nycSigns);

// ─── TEST 5: Edge dates ───
console.log("\n=== TEST 5: Edge birth dates ===");
for (const [label, date] of [["Y2K midnight", "2000-01-01T00:00:00"], ["1950", "1950-03-21T06:00:00"], ["2030 future", "2030-12-31T23:59:00"]]) {
  const d = runJSON(`node horoscope.mjs --birthDate "${date}" --longitude 116.4074 --latitude 39.9042`);
  assert(`${label}: 10 stars`, d.stars.length === 10);
  assert(`${label}: has retrogradeStars array`, Array.isArray(d.retrogradeStars));
}

// ─── TEST 6: Error handling ───
console.log("\n=== TEST 6: Horoscope error handling ===");
try { run("node horoscope.mjs 2>&1"); assert("Missing params exits 0", false); } catch { assert("Missing params exits non-zero", true); }
try { run('node horoscope.mjs --birthDate "1990-06-15T08:30:00" 2>&1'); assert("Missing coords exits 0", false); } catch { assert("Missing coords exits non-zero", true); }

// ─── TEST 7: Moon phase various dates ───
console.log("\n=== TEST 7: Moon phase - Various dates ===");
const phases = ["new_moon","waxing_crescent_moon","first_quarter_moon","waxing_gibbous_moon","full_moon","waning_gibbous_moon","last_quarter_moon","waning_crescent_moon"];
for (const date of ["2026-01-01","2026-01-14","2026-01-29","2026-02-12","2026-03-12","2026-06-21","2026-12-31"]) {
  const m = runJSON(`node moon-phase.mjs --date "${date}"`);
  assert(`${date}: valid phase (${m.phaseText})`, phases.includes(m.phaseText));
  assert(`${date}: lunarDay 0-30 (${m.lunarDay})`, m.lunarDay >= 0 && m.lunarDay <= 30);
}

// ─── TEST 8: Moon phase timezone consistency ───
console.log("\n=== TEST 8: Moon phase - Timezone consistency ===");
const tzResults = [];
for (const tz of ["UTC", "Asia/Shanghai", "America/New_York", "Europe/London"]) {
  const m = JSON.parse(execSync('node moon-phase.mjs --date "2026-03-12"', { cwd: DIR, encoding: "utf8", env: { ...process.env, TZ: tz } }));
  tzResults.push({ tz, ...m });
}
const allSamePhase = tzResults.every(r => r.phaseText === tzResults[0].phaseText);
const allSameLunar = tzResults.every(r => r.lunarDay === tzResults[0].lunarDay);
assert("All timezones same phase: " + tzResults[0].phaseText, allSamePhase);
assert("All timezones same lunarDay: " + tzResults[0].lunarDay, allSameLunar);
if (!allSamePhase || !allSameLunar) {
  tzResults.forEach(r => console.log(`    ${r.tz}: ${r.phaseText} ${r.lunarDay}`));
}

// ─── TEST 9: Moon phase edge cases ───
console.log("\n=== TEST 9: Moon phase - Edge cases ===");
for (const [label, date] of [["Far past", "1900-01-01"], ["Far future", "2100-12-31"], ["Leap day", "2024-02-29"]]) {
  const m = runJSON(`node moon-phase.mjs --date "${date}"`);
  assert(`${label}: valid phase`, phases.includes(m.phaseText));
  assert(`${label}: valid lunarDay`, m.lunarDay >= 0 && m.lunarDay <= 30);
}

// ─── TEST 10: Random score determinism ───
console.log("\n=== TEST 10: Random score - Determinism ===");
const seed = "1990-06-15:2026-03-12:career";
const scores = [];
for (let i = 0; i < 5; i++) {
  scores.push(runJSON(`node random-score.mjs --seed "${seed}" --with-category`));
}
assert("5 runs same score", scores.every(s => s.score === scores[0].score));
assert("5 runs same category", scores.every(s => s.category === scores[0].category));
assert("Score in range 40-100", scores[0].score >= 40 && scores[0].score <= 100);

// ─── TEST 11: Different seeds → different scores ───
console.log("\n=== TEST 11: Random score - Different seeds ===");
const topicScores = {};
for (const topic of ["career", "love", "wealth", "creativity", "health"]) {
  topicScores[topic] = runJSON(`node random-score.mjs --seed "1990-06-15:2026-03-12:${topic}" --with-category`);
}
const uniqueScores = new Set(Object.values(topicScores).map(s => s.score));
assert("At least 3 unique scores across 5 topics", uniqueScores.size >= 3);
for (const [t, s] of Object.entries(topicScores)) {
  assert(`${t}: score ${s.score} in range`, s.score >= 40 && s.score <= 100);
  assert(`${t}: category is powerIn or pressureIn`, ["powerIn","pressureIn"].includes(s.category));
  assert(`${t}: category matches score (${s.category} for ${s.score})`, s.score >= 65 ? s.category === "powerIn" : s.category === "pressureIn");
}

// ─── TEST 12: Different dates → different scores ───
console.log("\n=== TEST 12: Random score - Date variation ===");
const dateScores = [];
for (const date of ["2026-03-10","2026-03-11","2026-03-12","2026-03-13","2026-03-14"]) {
  dateScores.push(runJSON(`node random-score.mjs --seed "1990-06-15:${date}:career"`).score);
}
const uniqueDateScores = new Set(dateScores);
assert("Different dates produce varied scores", uniqueDateScores.size >= 3);
console.log("    Scores:", dateScores.join(", "));

// ─── TEST 13: No seed → random ───
console.log("\n=== TEST 13: Random score - No seed (random) ===");
const noSeedScores = [];
for (let i = 0; i < 10; i++) {
  noSeedScores.push(runJSON("node random-score.mjs").score);
}
assert("All scores in range", noSeedScores.every(s => s >= 40 && s <= 100));
const noSeedUnique = new Set(noSeedScores);
assert("Some variation in 10 random runs", noSeedUnique.size >= 2);

// ─── TEST 14: Synastry score order matters ───
console.log("\n=== TEST 14: Synastry score - Order matters ===");
const ab = runJSON('node random-score.mjs --seed "1990-06-15:1992-11-20:synastry"');
const ba = runJSON('node random-score.mjs --seed "1992-11-20:1990-06-15:synastry"');
assert(`A→B score: ${ab.score}, B→A score: ${ba.score}`, ab.score !== ba.score);

// ─── TEST 15: Category boundary ===
console.log("\n=== TEST 15: Category boundary (score >= 65 → powerIn) ===");
let boundaryOk = true;
for (let i = 0; i < 50; i++) {
  const r = runJSON(`node random-score.mjs --seed "boundary-test-${i}" --with-category`);
  if (r.score >= 65 && r.category !== "powerIn") { boundaryOk = false; console.log(`    BUG: score ${r.score} but category ${r.category}`); }
  if (r.score < 65 && r.category !== "pressureIn") { boundaryOk = false; console.log(`    BUG: score ${r.score} but category ${r.category}`); }
}
assert("All 50 random seeds have correct category", boundaryOk);

// ─── TEST 16: Extreme coordinates ───
console.log("\n=== TEST 16: Extreme coordinates ===");
for (const [label, lng, lat] of [["North Pole", 0, 89], ["South Pole", 0, -89], ["Date Line", 180, 0], ["Zero", 0, 0]]) {
  try {
    const d = runJSON(`node horoscope.mjs --birthDate "1990-06-15T12:00:00" --longitude ${lng} --latitude ${lat}`);
    assert(`${label} (${lng},${lat}): ${d.stars.length} stars`, d.stars.length === 10);
  } catch (e) {
    assert(`${label} (${lng},${lat}): error - ${e.message.slice(0, 60)}`, false);
  }
}

// ─── TEST 17: Full workflow simulation ───
console.log("\n=== TEST 17: Full predict workflow ===");
const natalChart = runJSON('node horoscope.mjs --birthDate "1985-12-25T03:15:00" --longitude -0.1276 --latitude 51.5074');
assert("Step 1 natal: 10 stars", natalChart.stars.length === 10);
const transitChart = runJSON('node horoscope.mjs --birthDate "2026-03-12T12:00:00" --longitude -0.1276 --latitude 51.5074');
assert("Step 2 transit: 10 stars", transitChart.stars.length === 10);
const moonPhase = runJSON('node moon-phase.mjs --date "2026-03-12"');
assert("Step 3 moon phase: valid", phases.includes(moonPhase.phaseText));
for (const topic of ["career","love","wealth","creativity","health"]) {
  const s = runJSON(`node random-score.mjs --seed "1985-12-25:2026-03-12:${topic}" --with-category`);
  assert(`Step 4 score ${topic}: ${s.score} (${s.category})`, s.score >= 40 && s.score <= 100);
}

// ─── TEST 18: Full synastry workflow ───
console.log("\n=== TEST 18: Full synastry workflow ===");
const userChart = runJSON('node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042');
const partnerChart = runJSON('node horoscope.mjs --birthDate "1992-11-20T14:00:00" --longitude 121.4737 --latitude 31.2304');
assert("User chart: 10 stars", userChart.stars.length === 10);
assert("Partner chart: 10 stars", partnerChart.stars.length === 10);
const synScore = runJSON('node random-score.mjs --seed "1990-06-15:1992-11-20:synastry"');
assert(`Synastry score: ${synScore.score}`, synScore.score >= 40 && synScore.score <= 100);

// Cross-chart aspects
let aspectCount = 0;
const relevantPlanets = ["sun","moon","mercury","venus","mars","jupiter","saturn"];
for (const u of userChart.stars.filter(s => relevantPlanets.includes(s.star))) {
  for (const p of partnerChart.stars.filter(s => relevantPlanets.includes(s.star))) {
    let diff = Math.abs(u.decimalDegrees - p.decimalDegrees);
    if (diff > 180) diff = 360 - diff;
    if (diff <= 8 || Math.abs(diff-60) <= 6 || Math.abs(diff-90) <= 8 || Math.abs(diff-120) <= 8 || Math.abs(diff-180) <= 8) {
      aspectCount++;
    }
  }
}
assert(`Cross-chart aspects found: ${aspectCount}`, aspectCount > 0);

// ─── SUMMARY ───
console.log("\n" + "=".repeat(50));
console.log(`TOTAL: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
