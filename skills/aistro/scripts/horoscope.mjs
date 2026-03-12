#!/usr/bin/env node

// Horoscope calculation script — replicates the reference project's Get Horoscope tool
// Uses circular-natal-horoscope-js (Moshier ephemeris) for precise astronomical calculations
//
// Usage:
//   node horoscope.mjs --birthDate "1990-06-15T08:30:00" --longitude 116.4074 --latitude 39.9042
//
// Output: JSON with { stars, chartData, retrogradeStars }

import pkg from "circular-natal-horoscope-js";
const { Horoscope, Origin } = pkg;
import dayjs from "dayjs";

const STARS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const RETROGRADE_STARS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

function getHoroscope({ birthDate, longitude, latitude }) {
  const d = dayjs(birthDate);

  return new Horoscope({
    origin: new Origin({
      year: d.year(),
      month: d.month(),
      date: d.date(),
      hour: d.hour(),
      minute: d.minute(),
      second: d.second(),
      latitude,
      longitude,
    }),
  });
}

function getHoroscopeData(horoscope) {
  const all = horoscope.CelestialBodies.all;
  const m = Object.fromEntries(all.map((i) => [i.key, i]));
  const bodies = STARS.map((star) => m[star]).filter(Boolean);

  const stars = bodies.map((i) => ({
    star: i.key,
    sign: i.Sign?.key,
    house: i.House?.id ?? 1,
    decimalDegrees: i.ChartPosition?.Ecliptic?.DecimalDegrees,
    arcDegreesFormatted30: i.ChartPosition?.Ecliptic?.ArcDegreesFormatted30?.replace(
      /\d+'{2,}$/,
      ""
    ).replace(/\s+/g, ""),
  }));

  const chartData = {
    planets: Object.assign(
      {},
      ...bodies.map((body) => {
        const key = body.key.charAt(0).toUpperCase() + body.key.slice(1);
        return { [key]: [body.ChartPosition.Ecliptic.DecimalDegrees] };
      })
    ),
    cusps: horoscope.Houses.map(
      (i) => i.ChartPosition.StartPosition.Ecliptic.DecimalDegrees
    ),
  };

  return { stars, chartData };
}

function getRetrogradeStars(horoscope) {
  const all = horoscope.CelestialBodies.all;
  const m = Object.fromEntries(all.map((i) => [i.key, i]));
  const bodies = RETROGRADE_STARS.map((star) => m[star]).filter(Boolean);
  return bodies
    .filter((i) => i.isRetrograde)
    .map((i) => ({ star: i.key }));
}

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const birthDate = getArg("birthDate");
const longitude = parseFloat(getArg("longitude"));
const latitude = parseFloat(getArg("latitude"));

if (!birthDate || isNaN(longitude) || isNaN(latitude)) {
  console.error(
    "Usage: node horoscope.mjs --birthDate <ISO date> --longitude <number> --latitude <number>"
  );
  process.exit(1);
}

const horoscope = getHoroscope({ birthDate, longitude, latitude });

const result = {
  ...getHoroscopeData(horoscope),
  retrogradeStars: getRetrogradeStars(horoscope),
};

console.log(JSON.stringify(result, null, 2));
