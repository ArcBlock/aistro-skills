#!/usr/bin/env node

// Moon phase calculation script — replicates the reference project's Get Moon Phase tool
// Uses the same Julian Date Number algorithm from lunarphase-calculator@1.1.0
// (package was unpublished from npm, so the calculation logic is inlined here)
//
// Usage:
//   node moon-phase.mjs --date "2026-03-12"
//
// Output: JSON with { phaseText, lunarDay }

import dayjs from "dayjs";

// Constants from lunarphase-calculator@1.1.0
const SYNODIC_MONTH = 29.53058770576;
const START_DATE = 2451550.1; // Reference Julian date for lunar cycle

const PHASE_BOUNDARIES = {
  NEW_MOON_LOWER: 0,
  WAXING_CRESCENT: 1,
  FIRST_QUARTER: 6.382647,
  WAXING_GIBBOUS: 8.382647,
  FULL_MOON: 13.765294,
  WANING_GIBBOUS: 15.765294,
  LAST_QUARTER: 21.147941,
  WANING_CRESCENT: 23.147941,
  NEW_MOON_UPPER: 28.530588,
  NEW_MOON_UPPER_END: 29.530588,
};

// Convert date to Julian Date Number (Gregorian calendar)
function toJDN(date) {
  const n = date.getUTCDate();
  const e = date.getUTCMonth() + 1;
  const a = date.getUTCFullYear();
  const s = Math.trunc((14 - e) / 12);
  const u = a + 4800 - s;
  const I = e + 12 * s - 3;
  const _ = Math.trunc((153 * I + 2) / 5);
  const o = Math.trunc(u / 4);
  const c = Math.trunc(u / 100);
  const E = Math.trunc(u / 400);
  return n + _ + 365 * u + o - c + E - 32045;
}

// Calculate lunar day (0 to ~29.53)
function getLunarDay(date) {
  const jdn = toJDN(date);
  const r = ((jdn - START_DATE) / SYNODIC_MONTH) % 1;
  return (r < 0 ? r + 1 : r) * SYNODIC_MONTH;
}

// Determine moon phase from lunar day
function getLunarPhase(lunarDay) {
  const b = PHASE_BOUNDARIES;
  if (lunarDay < b.WAXING_CRESCENT) return "new_moon";
  if (lunarDay < b.FIRST_QUARTER) return "waxing_crescent_moon";
  if (lunarDay < b.WAXING_GIBBOUS) return "first_quarter_moon";
  if (lunarDay < b.FULL_MOON) return "waxing_gibbous_moon";
  if (lunarDay < b.WANING_GIBBOUS) return "full_moon";
  if (lunarDay < b.LAST_QUARTER) return "waning_gibbous_moon";
  if (lunarDay < b.WANING_CRESCENT) return "last_quarter_moon";
  if (lunarDay < b.NEW_MOON_UPPER) return "waning_crescent_moon";
  if (lunarDay < b.NEW_MOON_UPPER_END) return "new_moon";
  throw new Error(`Invalid lunar day: ${lunarDay}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const date = getArg("date") || new Date().toISOString().substring(0, 10);
const d = new Date(date + "T00:00:00Z");
const lunarDay = getLunarDay(d);
const phaseText = getLunarPhase(lunarDay);

console.log(JSON.stringify({ phaseText, lunarDay: Math.round(lunarDay * 100) / 100 }, null, 2));
