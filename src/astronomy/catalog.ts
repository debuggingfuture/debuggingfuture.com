import type { StarRecord } from "./types";
import hygJson from "./data/stars-hyg.json";

interface PackedCatalog {
	ra: number[];
	dec: number[];
	mag: number[];
	ci: number[];
	named: Record<string, string>;
}

const packed = hygJson as PackedCatalog;

let unpacked: StarRecord[] | null = null;

// Lazy unpack on first access. Stays as parallel arrays in memory until needed.
export function loadHygStars(): StarRecord[] {
	if (unpacked) return unpacked;
	const out: StarRecord[] = new Array(packed.ra.length);
	for (let i = 0; i < packed.ra.length; i++) {
		out[i] = {
			name: packed.named[String(i)] ?? `s${i}`,
			ra: packed.ra[i],
			dec: packed.dec[i],
			mag: packed.mag[i],
			ci: packed.ci[i] ?? 0,
		};
	}
	unpacked = out;
	return out;
}

export function hygStarCount(): number {
	return packed.ra.length;
}
