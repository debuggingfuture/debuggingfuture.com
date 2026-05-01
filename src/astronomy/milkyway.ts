// Galactic-to-equatorial transformation for the Milky Way band.
// We pre-compute equatorial coordinates of the galactic equator at 1° steps,
// then project at runtime against the current local sidereal time.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// J2000 rotation matrix: galactic Cartesian → equatorial Cartesian
// (Reid & Brunthaler 2004 / IAU 1958 with J2000 frame.)
const G2E = [
	[-0.0548755604, -0.873437109, -0.4838350155],
	[0.4941094279, -0.4448296299, 0.7469822445],
	[-0.8676661489, -0.1980763734, 0.4559837762],
];

export interface GalacticPoint {
	l: number; // galactic longitude in degrees
	ra: number; // hours
	dec: number; // degrees
	intensity: number; // 0..1, brighter near Sagittarius (l=0), dimmer at l=180
}

function galacticToEquatorial(
	lDeg: number,
	bDeg: number,
): { ra: number; dec: number } {
	const l = lDeg * RAD;
	const b = bDeg * RAD;
	const x = Math.cos(b) * Math.cos(l);
	const y = Math.cos(b) * Math.sin(l);
	const z = Math.sin(b);
	const xe = G2E[0][0] * x + G2E[0][1] * y + G2E[0][2] * z;
	const ye = G2E[1][0] * x + G2E[1][1] * y + G2E[1][2] * z;
	const ze = G2E[2][0] * x + G2E[2][1] * y + G2E[2][2] * z;
	const ra = ((Math.atan2(ye, xe) * DEG) / 15 + 24) % 24;
	const dec = Math.asin(ze) * DEG;
	return { ra, dec };
}

// Galactic-equator points at 2° resolution, pre-computed at module load.
export const MILKY_WAY: ReadonlyArray<GalacticPoint> = (() => {
	const pts: GalacticPoint[] = [];
	for (let l = 0; l < 360; l += 2) {
		const { ra, dec } = galacticToEquatorial(l, 0);
		// Brightness profile: peaks near Sagittarius (l≈0..30) and dims outward.
		// A simple cosine-like profile, with modest floor.
		const lWrap = l > 180 ? 360 - l : l;
		const intensity = 0.25 + 0.75 * Math.exp(-((lWrap / 90) ** 2));
		pts.push({ l, ra, dec, intensity });
	}
	return pts;
})();

// A second band of bulge stars to evoke the brightest Sagittarius region.
export const MILKY_WAY_BULGE: ReadonlyArray<GalacticPoint> = (() => {
	const pts: GalacticPoint[] = [];
	for (let l = -25; l <= 25; l += 1) {
		for (const b of [-3, 0, 3]) {
			const { ra, dec } = galacticToEquatorial((l + 360) % 360, b);
			const intensity = 0.7 * Math.exp(-((l / 18) ** 2)) * (b === 0 ? 1 : 0.6);
			pts.push({ l, ra, dec, intensity });
		}
	}
	return pts;
})();
