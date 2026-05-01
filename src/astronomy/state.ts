import { equatorialToHorizontal, localSiderealTime, lunarPosition, moonPhase, solarPosition, twilightPhase } from "./sun";
import { BRIGHT_STARS, starColor } from "./stars";
import { loadHygStars } from "./catalog";
import { MILKY_WAY, MILKY_WAY_BULGE } from "./milkyway";
import type { Geo, SkyState, StarRender, StarRecord, TwilightPhase } from "./types";

const RAD = Math.PI / 180;

// Twilight-phase → palette keyframe. Tuned by eye against reference photos.
// Each entry produces a CSS variable bundle the renderers consume.
export const PALETTES: Record<TwilightPhase, Record<string, string>> = {
	day: {
		"--sky-zenith": "#3e7cb1",
		"--sky-mid": "#7fb6db",
		"--sky-horizon": "#cae9ff",
		"--sky-glow": "rgba(255, 235, 180, 0.0)",
		"--sky-tint": "#a3c9e2",
		"--star-visibility": "0",
		"--content-bg": "rgba(255, 255, 255, 0.88)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.06)",
		"--phase-name": '"Day"',
	},
	goldenHour: {
		"--sky-zenith": "#1f3b66",
		"--sky-mid": "#7a6a8a",
		"--sky-horizon": "#f4a261",
		"--sky-glow": "rgba(255, 214, 165, 0.85)",
		"--sky-tint": "#5a4a6f",
		"--star-visibility": "0.15",
		"--content-bg": "rgba(255, 252, 246, 0.90)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.08)",
		"--phase-name": '"Golden hour"',
	},
	civilTwilight: {
		"--sky-zenith": "#1a2a4a",
		"--sky-mid": "#3b3556",
		"--sky-horizon": "#e08a5e",
		"--sky-glow": "rgba(224, 138, 94, 0.55)",
		"--sky-tint": "#3b3556",
		"--star-visibility": "0.45",
		"--content-bg": "rgba(245, 246, 250, 0.92)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.10)",
		"--phase-name": '"Civil twilight"',
	},
	nauticalTwilight: {
		"--sky-zenith": "#0e1a36",
		"--sky-mid": "#1f2a4d",
		"--sky-horizon": "#7a4a6a",
		"--sky-glow": "rgba(122, 74, 106, 0.35)",
		"--sky-tint": "#1f2a4d",
		"--star-visibility": "0.75",
		"--content-bg": "rgba(248, 248, 252, 0.93)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.12)",
		"--phase-name": '"Nautical twilight"',
	},
	astronomicalTwilight: {
		"--sky-zenith": "#070d22",
		"--sky-mid": "#10153a",
		"--sky-horizon": "#1f1d3a",
		"--sky-glow": "rgba(31, 29, 58, 0.0)",
		"--sky-tint": "#10153a",
		"--star-visibility": "0.95",
		"--content-bg": "rgba(248, 248, 252, 0.93)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.12)",
		"--phase-name": '"Astronomical twilight"',
	},
	night: {
		"--sky-zenith": "#03060f",
		"--sky-mid": "#06091a",
		"--sky-horizon": "#0a1023",
		"--sky-glow": "rgba(0, 0, 0, 0.0)",
		"--sky-tint": "#06091a",
		"--star-visibility": "1",
		"--content-bg": "rgba(248, 248, 252, 0.94)",
		"--content-fg": "#0f1219",
		"--content-border": "rgba(15, 18, 25, 0.14)",
		"--phase-name": '"Night"',
	},
};

// Compute everything a renderer needs from (time, geo).
export function computeSkyState(time: Date, geo: Geo): SkyState {
	const sun = solarPosition(time, geo);
	const tw = twilightPhase(sun.altitude);
	const lst = localSiderealTime(time, geo.lon);
	const moonP = moonPhase(time);
	const moonPos = lunarPosition(time, geo);
	const sunAzCss = `${(sun.azimuth + 180) % 360}deg`;
	const palette = PALETTES[tw];

	const cssVars: Record<string, string> = {
		...palette,
		"--sun-az-deg": `${sun.azimuth.toFixed(2)}deg`,
		"--sun-alt-deg": `${sun.altitude.toFixed(2)}deg`,
		"--sun-x":
			sun.azimuth >= 90 && sun.azimuth <= 270
				? `${((sun.azimuth - 90) / 180) * 100}%`
				: sun.azimuth < 90
					? "0%"
					: "100%",
		"--sun-y": `${100 - Math.max(-20, Math.min(90, sun.altitude)) * 1.0}%`,
		"--sun-az-css": sunAzCss,
		"--moon-illum": moonP.illumination.toFixed(3),
		"--moon-phase": moonP.phase.toFixed(3),
		"--moon-alt-deg": `${moonPos.altitude.toFixed(2)}deg`,
		"--moon-az-deg": `${moonPos.azimuth.toFixed(2)}deg`,
	};

	return {
		time,
		geo,
		sun: { altitude: sun.altitude, azimuth: sun.azimuth },
		moon: {
			altitude: moonPos.altitude,
			azimuth: moonPos.azimuth,
			phase: moonP.phase,
			illumination: moonP.illumination,
			angle: moonPos.parallacticAngle,
			distance: moonPos.distance,
		},
		twilight: tw,
		localSiderealTime: lst,
		cssVars,
	};
}

// Project (alt, az) to a viewport-fraction (x, y) using a horizon-anchored,
// looking-south wide-angle projection. North is behind the viewer and culled.
// Northern hemisphere observers get a south-facing view; southern hemisphere
// flips automatically since key bright stars sit in their visible hemisphere.
export function projectStar(
	altDeg: number,
	azDeg: number,
	opts: { facing?: number; fov?: number } = {},
): { x: number; y: number; visible: boolean } {
	const facing = opts.facing ?? 180; // looking south by default
	const fov = opts.fov ?? 200; // horizontal field-of-view in degrees

	if (altDeg < -2) return { x: 0, y: 1.2, visible: false };

	// Signed offset from facing direction, wrapped to [-180, 180]
	let dAz = azDeg - facing;
	while (dAz > 180) dAz -= 360;
	while (dAz < -180) dAz += 360;

	if (Math.abs(dAz) > fov / 2) {
		return { x: 0, y: 0, visible: false };
	}

	const x = 0.5 + dAz / fov;
	// Altitude maps to y: 90° = top (0), 0° = horizon (0.95), -2° barely off-screen
	const y = 1 - (altDeg + 2) / 92;
	return { x, y, visible: true };
}

// Atmospheric extinction in magnitudes.
// Approximation: dust + Rayleigh, dimming stars near the horizon.
// Reference: Schaefer (1990); simplified.
export function atmosphericExtinction(altDeg: number): number {
	if (altDeg <= 0) return 99;
	const z = (90 - altDeg) * (Math.PI / 180);
	// Airmass via Kasten-Young (1989), capped to avoid blowups.
	const cosZ = Math.cos(z);
	const X = 1 / (cosZ + 0.50572 * (96.07995 - z * 180 / Math.PI) ** -1.6364);
	// k = 0.28 mag/airmass typical for a dark site.
	return 0.28 * (X - 1);
}

export function renderStars(
	state: SkyState,
	opts: {
		facing?: number;
		fov?: number;
		magLimit?: number;
		catalog?: "bright" | "hyg";
		applyExtinction?: boolean;
	} = {},
): StarRender[] {
	// Twilight-aware visible magnitude limit.
	const baseMagLimit =
		opts.magLimit ??
		({
			day: -2,
			goldenHour: 1.5,
			civilTwilight: 2.8,
			nauticalTwilight: 4.0,
			astronomicalTwilight: 5.2,
			night: 5.5,
		} satisfies Record<TwilightPhase, number>)[state.twilight];

	const cat: ReadonlyArray<StarRecord> =
		opts.catalog === "hyg" ? loadHygStars() : BRIGHT_STARS;
	const apply = opts.applyExtinction ?? true;

	const out: StarRender[] = [];
	for (const s of cat) {
		if (s.mag > baseMagLimit + 1.0) continue; // quick reject before full math
		const horiz = equatorialToHorizontal(s.ra, s.dec, state.localSiderealTime, state.geo.lat);
		if (horiz.altitude < -2) continue;
		const ext = apply ? atmosphericExtinction(horiz.altitude) : 0;
		const apparentMag = s.mag + ext;
		if (apparentMag > baseMagLimit) continue;
		const proj = projectStar(horiz.altitude, horiz.azimuth, opts);
		out.push({
			...s,
			mag: apparentMag,
			altitude: horiz.altitude,
			azimuth: horiz.azimuth,
			x: proj.x,
			y: proj.y,
			color: starColor(s.ci),
			visible: proj.visible,
		});
	}
	return out;
}

// Project the Milky Way band (galactic equator points) for the current state.
export function renderMilkyWay(
	state: SkyState,
	opts: { facing?: number; fov?: number } = {},
): Array<{ x: number; y: number; intensity: number; visible: boolean }> {
	const out: Array<{ x: number; y: number; intensity: number; visible: boolean }> = [];
	for (const p of MILKY_WAY) {
		const horiz = equatorialToHorizontal(p.ra, p.dec, state.localSiderealTime, state.geo.lat);
		const proj = projectStar(horiz.altitude, horiz.azimuth, opts);
		out.push({
			x: proj.x,
			y: proj.y,
			intensity: p.intensity,
			visible: proj.visible && horiz.altitude > -1,
		});
	}
	return out;
}

// A scattering of fainter "bulge" points (galactic core) — denser than the band.
export function renderMilkyWayBulge(
	state: SkyState,
	opts: { facing?: number; fov?: number } = {},
): Array<{ x: number; y: number; intensity: number; visible: boolean }> {
	const out: Array<{ x: number; y: number; intensity: number; visible: boolean }> = [];
	for (const p of MILKY_WAY_BULGE) {
		const horiz = equatorialToHorizontal(p.ra, p.dec, state.localSiderealTime, state.geo.lat);
		const proj = projectStar(horiz.altitude, horiz.azimuth, opts);
		out.push({
			x: proj.x,
			y: proj.y,
			intensity: p.intensity,
			visible: proj.visible && horiz.altitude > -1,
		});
	}
	return out;
}

// Human-readable description for the caption.
export function describeSky(state: SkyState): string {
	const sun = state.sun;
	const azCardinal = (() => {
		const az = sun.azimuth;
		if (az < 22.5 || az >= 337.5) return "north";
		if (az < 67.5) return "northeast";
		if (az < 112.5) return "east";
		if (az < 157.5) return "southeast";
		if (az < 202.5) return "south";
		if (az < 247.5) return "southwest";
		if (az < 292.5) return "west";
		return "northwest";
	})();

	const phaseLabel = {
		day: "Daylight.",
		goldenHour: "Golden hour.",
		civilTwilight: "Civil twilight.",
		nauticalTwilight: "Nautical twilight.",
		astronomicalTwilight: "Astronomical twilight.",
		night: "Night.",
	}[state.twilight];

	const sunBit =
		state.twilight === "night"
			? `Sun is ${Math.abs(sun.altitude).toFixed(0)}° below the horizon to the ${azCardinal}.`
			: state.twilight === "day"
				? `Sun is ${sun.altitude.toFixed(0)}° above the horizon to the ${azCardinal}.`
				: sun.altitude >= 0
					? `Sun is ${sun.altitude.toFixed(1)}° above the horizon to the ${azCardinal}.`
					: `Sun is ${Math.abs(sun.altitude).toFixed(1)}° below the horizon to the ${azCardinal}.`;

	return `${phaseLabel} ${sunBit}`;
}
