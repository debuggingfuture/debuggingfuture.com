import type { StarRecord } from "./types";

// Hand-curated brightest stars (mag <= ~3.5) plus those needed for iconic
// constellations. RA in hours, Dec in degrees, mag = apparent magnitude,
// ci = B-V color index (drives star color).
// Source: Yale Bright Star Catalog (public domain), J2000 positions.
export const BRIGHT_STARS: ReadonlyArray<StarRecord> = [
	// Brightest stars
	{ name: "Sirius", ra: 6.7525, dec: -16.7161, mag: -1.46, ci: 0.0 },
	{ name: "Canopus", ra: 6.3992, dec: -52.6957, mag: -0.74, ci: 0.15 },
	{ name: "Arcturus", ra: 14.261, dec: 19.1825, mag: -0.05, ci: 1.23 },
	{ name: "Vega", ra: 18.6156, dec: 38.7837, mag: 0.03, ci: 0.0 },
	{ name: "Capella", ra: 5.2782, dec: 45.9981, mag: 0.08, ci: 0.8 },
	{ name: "Rigel", ra: 5.2423, dec: -8.2017, mag: 0.13, ci: -0.03 },
	{ name: "Procyon", ra: 7.6551, dec: 5.225, mag: 0.34, ci: 0.42 },
	{ name: "Achernar", ra: 1.6286, dec: -57.2367, mag: 0.46, ci: -0.16 },
	{ name: "Betelgeuse", ra: 5.9195, dec: 7.4071, mag: 0.5, ci: 1.85 },
	{ name: "Hadar", ra: 14.0637, dec: -60.373, mag: 0.61, ci: -0.23 },
	{ name: "Altair", ra: 19.8463, dec: 8.8683, mag: 0.77, ci: 0.22 },
	{ name: "Acrux", ra: 12.4433, dec: -63.0991, mag: 0.77, ci: -0.24 },
	{ name: "Gacrux", ra: 12.5194, dec: -57.1133, mag: 1.63, ci: 1.59 },
	{ name: "Aldebaran", ra: 4.5987, dec: 16.5093, mag: 0.85, ci: 1.54 },
	{ name: "Antares", ra: 16.4901, dec: -26.4319, mag: 1.09, ci: 1.83 },
	{ name: "Spica", ra: 13.4199, dec: -11.1614, mag: 1.04, ci: -0.24 },
	{ name: "Pollux", ra: 7.7553, dec: 28.0262, mag: 1.14, ci: 1.0 },
	{ name: "Fomalhaut", ra: 22.9608, dec: -29.6222, mag: 1.16, ci: 0.09 },
	{ name: "Deneb", ra: 20.6905, dec: 45.2803, mag: 1.25, ci: 0.09 },
	{ name: "Mimosa", ra: 12.7953, dec: -59.6886, mag: 1.25, ci: -0.23 },
	{ name: "Regulus", ra: 10.1395, dec: 11.9672, mag: 1.4, ci: -0.1 },
	{ name: "Adhara", ra: 6.9771, dec: -28.9722, mag: 1.5, ci: -0.21 },
	{ name: "Castor", ra: 7.5766, dec: 31.8884, mag: 1.58, ci: 0.03 },
	{ name: "Shaula", ra: 17.5601, dec: -37.1037, mag: 1.62, ci: -0.22 },
	{ name: "Bellatrix", ra: 5.4188, dec: 6.3497, mag: 1.64, ci: -0.22 },
	{ name: "Elnath", ra: 5.4382, dec: 28.6075, mag: 1.65, ci: -0.13 },
	{ name: "Miaplacidus", ra: 9.22, dec: -69.7172, mag: 1.67, ci: 0.07 },
	{ name: "Alnilam", ra: 5.6036, dec: -1.2019, mag: 1.69, ci: -0.18 },
	{ name: "Alnair", ra: 22.1372, dec: -46.9609, mag: 1.74, ci: -0.13 },
	{ name: "Alioth", ra: 12.9005, dec: 55.9598, mag: 1.77, ci: -0.02 },
	{ name: "Mirfak", ra: 3.4054, dec: 49.8612, mag: 1.79, ci: 0.48 },
	{ name: "Dubhe", ra: 11.0621, dec: 61.7508, mag: 1.79, ci: 1.07 },
	{ name: "Alnitak", ra: 5.6793, dec: -1.9426, mag: 1.79, ci: -0.2 },
	{ name: "Alkaid", ra: 13.7923, dec: 49.3133, mag: 1.85, ci: -0.1 },
	{ name: "Polaris", ra: 2.5302, dec: 89.2641, mag: 1.97, ci: 0.6 },
	{ name: "Mizar", ra: 13.3988, dec: 54.9254, mag: 2.04, ci: 0.06 },
	{ name: "Saiph", ra: 5.7959, dec: -9.6696, mag: 2.09, ci: -0.17 },
	{ name: "Mintaka", ra: 5.5334, dec: -0.2991, mag: 2.23, ci: -0.18 },
	{ name: "Schedar", ra: 0.6751, dec: 56.5373, mag: 2.24, ci: 1.17 },
	{ name: "Caph", ra: 0.153, dec: 59.1497, mag: 2.27, ci: 0.34 },
	{ name: "Merak", ra: 11.0307, dec: 56.3824, mag: 2.37, ci: 0.03 },
	{ name: "Phecda", ra: 11.8972, dec: 53.6948, mag: 2.41, ci: 0.04 },
	{ name: "GammaCas", ra: 0.9451, dec: 60.7167, mag: 2.47, ci: -0.15 },
	{ name: "Ruchbah", ra: 1.4302, dec: 60.2353, mag: 2.66, ci: 0.13 },
	{ name: "Algol", ra: 3.1361, dec: 40.9556, mag: 2.12, ci: -0.05 },
	{ name: "Megrez", ra: 12.2571, dec: 57.0326, mag: 3.31, ci: 0.08 },
	{ name: "Segin", ra: 1.9067, dec: 63.6701, mag: 3.35, ci: -0.15 },
	// Lyra harp
	{ name: "Sheliak", ra: 18.8347, dec: 33.3625, mag: 3.52, ci: 0.0 },
	{ name: "Sulafat", ra: 18.9836, dec: 32.6896, mag: 3.24, ci: -0.05 },
	// Cygnus cross
	{ name: "Sadr", ra: 20.3705, dec: 40.2566, mag: 2.23, ci: 0.67 },
	{ name: "Gienah", ra: 20.7702, dec: 33.9703, mag: 2.48, ci: 1.03 },
	{ name: "Albireo", ra: 19.5121, dec: 27.9597, mag: 3.18, ci: 1.13 },
	// Leo
	{ name: "Denebola", ra: 11.8177, dec: 14.5722, mag: 2.13, ci: 0.09 },
	{ name: "Algieba", ra: 10.3329, dec: 19.8415, mag: 2.28, ci: 1.13 },
	// Scorpius
	{ name: "Sargas", ra: 17.6222, dec: -42.9978, mag: 1.86, ci: 0.4 },
	{ name: "Dschubba", ra: 16.0056, dec: -22.6217, mag: 2.29, ci: -0.12 },
];

const NAME_TO_INDEX: Record<string, number> = {};
BRIGHT_STARS.forEach((s, i) => {
	NAME_TO_INDEX[s.name] = i;
});

export function starIndex(name: string): number {
	const i = NAME_TO_INDEX[name];
	if (i === undefined) throw new Error(`Star not in catalog: ${name}`);
	return i;
}

// Stick-figure constellation lines: pairs of star names.
export const CONSTELLATIONS: Record<string, ReadonlyArray<readonly [string, string]>> = {
	"Big Dipper": [
		["Dubhe", "Merak"],
		["Merak", "Phecda"],
		["Phecda", "Megrez"],
		["Megrez", "Dubhe"],
		["Megrez", "Alioth"],
		["Alioth", "Mizar"],
		["Mizar", "Alkaid"],
	],
	"Orion": [
		["Betelgeuse", "Bellatrix"],
		["Betelgeuse", "Alnitak"],
		["Bellatrix", "Mintaka"],
		["Mintaka", "Alnilam"],
		["Alnilam", "Alnitak"],
		["Alnitak", "Saiph"],
		["Mintaka", "Rigel"],
		["Saiph", "Rigel"],
	],
	"Cassiopeia": [
		["Caph", "Schedar"],
		["Schedar", "GammaCas"],
		["GammaCas", "Ruchbah"],
		["Ruchbah", "Segin"],
	],
	"Southern Cross": [
		["Acrux", "Mimosa"],
		["Acrux", "Gacrux"],
	],
	"Cygnus": [
		["Deneb", "Sadr"],
		["Sadr", "Albireo"],
		["Sadr", "Gienah"],
		["Sadr", "Sheliak"],
	],
	"Leo": [
		["Regulus", "Algieba"],
		["Algieba", "Denebola"],
	],
};

// B-V color index → CSS color (Ballesteros 2012, simplified).
export function starColor(ci: number): string {
	// Map B-V (-0.4 .. 2.0) to a temperature, then to RGB.
	const t = 4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62));
	// Clamp to plausible range
	const T = Math.max(2000, Math.min(40000, t));
	// Simple blackbody approximation (Tanner Helland's algorithm).
	const x = T / 100;
	let r: number;
	let g: number;
	let b: number;
	if (x <= 66) {
		r = 255;
		g = 99.4708 * Math.log(x) - 161.1196;
	} else {
		r = 329.6987 * (x - 60) ** -0.1332;
		g = 288.1222 * (x - 60) ** -0.0755;
	}
	if (x >= 66) b = 255;
	else if (x <= 19) b = 0;
	else b = 138.5177 * Math.log(x - 10) - 305.0448;
	const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
	return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}
