import type { Geo, TwilightPhase } from "./types";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function julianDate(date: Date): number {
	return date.getTime() / 86400000 + 2440587.5;
}

// Greenwich Mean Sidereal Time (hours, 0..24)
export function gmst(jd: number): number {
	const t = (jd - 2451545.0) / 36525.0;
	let g =
		6.697374558 +
		0.06570982441908 * (jd - 2451545.0) +
		1.00273790935 * 24 * (jd - Math.floor(jd) - 0.5) +
		0.000026 * t * t;
	g = ((g % 24) + 24) % 24;
	return g;
}

export function localSiderealTime(date: Date, lon: number): number {
	const jd = julianDate(date);
	let lst = gmst(jd) + lon / 15;
	lst = ((lst % 24) + 24) % 24;
	return lst;
}

export interface SolarPosition {
	altitude: number; // degrees, +above horizon
	azimuth: number; // degrees, 0=N, 90=E, 180=S, 270=W
	rightAscension: number; // hours
	declination: number; // degrees
}

// Closed-form NOAA / Meeus simplified — accurate to ~0.01° for our purposes.
export function solarPosition(date: Date, geo: Geo): SolarPosition {
	const jd = julianDate(date);
	const n = jd - 2451545.0;

	// Mean longitude and anomaly
	const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
	const g = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * RAD;

	// Ecliptic longitude
	const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;

	// Obliquity of the ecliptic
	const epsilon = (23.439 - 0.0000004 * n) * RAD;

	// Right ascension and declination
	const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
	const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

	// Local hour angle
	const lst = localSiderealTime(date, geo.lon); // hours
	const H = (lst * 15 - ra * DEG) * RAD;
	const lat = geo.lat * RAD;

	// Horizontal coordinates
	const altitude = Math.asin(
		Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H),
	);
	const azimuth = Math.atan2(
		-Math.sin(H),
		Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H),
	);

	return {
		altitude: altitude * DEG,
		azimuth: ((azimuth * DEG) + 360) % 360,
		rightAscension: ((ra * DEG) / 15 + 24) % 24,
		declination: dec * DEG,
	};
}

export function twilightPhase(altitudeDeg: number): TwilightPhase {
	if (altitudeDeg > 6) return "day";
	if (altitudeDeg > -0.83) return "goldenHour";
	if (altitudeDeg > -6) return "civilTwilight";
	if (altitudeDeg > -12) return "nauticalTwilight";
	if (altitudeDeg > -18) return "astronomicalTwilight";
	return "night";
}

// Convert equatorial → horizontal for an arbitrary star.
// ra in hours, dec in degrees, lst in hours, lat in degrees.
export function equatorialToHorizontal(
	raHours: number,
	decDeg: number,
	lstHours: number,
	latDeg: number,
): { altitude: number; azimuth: number } {
	const H = ((lstHours - raHours) * 15) * RAD;
	const dec = decDeg * RAD;
	const lat = latDeg * RAD;

	const altitude = Math.asin(
		Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H),
	);
	const azimuth = Math.atan2(
		-Math.sin(H),
		Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H),
	);

	return {
		altitude: altitude * DEG,
		azimuth: ((azimuth * DEG) + 360) % 360,
	};
}

// Simple Conway-style moon phase. 0 = new, 0.5 = full, 1 = new again.
export function moonPhase(date: Date): { phase: number; illumination: number } {
	const jd = julianDate(date);
	const days = (jd - 2451550.1) / 29.530588853;
	const phase = ((days % 1) + 1) % 1;
	const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
	return { phase, illumination };
}

// Lunar position. Adapted from Meeus / suncalc — accurate to ~0.5°,
// which is more than enough for placing a stylized moon disk on screen.
export interface LunarPosition {
	altitude: number;
	azimuth: number;
	rightAscension: number; // hours
	declination: number; // degrees
	parallacticAngle: number; // degrees (terminator tilt)
	distance: number; // km
}

export function lunarPosition(date: Date, geo: Geo): LunarPosition {
	const jd = julianDate(date);
	const d = jd - 2451545.0; // days since J2000

	// Moon ecliptic coordinates (mean elements + first-order perturbations).
	const L = (218.316 + 13.176396 * d) * RAD; // ecliptic longitude
	const M = (134.963 + 13.064993 * d) * RAD; // mean anomaly
	const F = (93.272 + 13.229350 * d) * RAD; // distance argument

	const lng = L + 6.289 * RAD * Math.sin(M);
	const lat = 5.128 * RAD * Math.sin(F);
	const dist = 385001 - 20905 * Math.cos(M); // km

	const eps = (23.439 - 0.0000004 * d) * RAD;
	const ra = Math.atan2(
		Math.sin(lng) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps),
		Math.cos(lng),
	);
	const dec = Math.asin(
		Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lng),
	);

	const lst = localSiderealTime(date, geo.lon);
	const H = lst * 15 * RAD - ra;
	const phi = geo.lat * RAD;

	const altitude = Math.asin(
		Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H),
	);
	const azimuth = Math.atan2(
		-Math.sin(H),
		Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H),
	);
	const parallactic = Math.atan2(
		Math.sin(H),
		Math.tan(phi) * Math.cos(dec) - Math.sin(dec) * Math.cos(H),
	);

	return {
		altitude: altitude * DEG,
		azimuth: ((azimuth * DEG) + 360) % 360,
		rightAscension: ((ra * DEG) / 15 + 24) % 24,
		declination: dec * DEG,
		parallacticAngle: parallactic * DEG,
		distance: dist,
	};
}
