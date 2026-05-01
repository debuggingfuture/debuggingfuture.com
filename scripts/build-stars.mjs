// Bake the HYG star catalog into a compact JSON the site bundles.
// Run once to refresh: `node scripts/build-stars.mjs`.
//
// Output: src/astronomy/data/stars-hyg.json
//   - parallel arrays (ra/dec/mag/ci) for tight packing
//   - magnitude limit configurable
//   - 2-decimal precision (sub-pixel for our purposes; halves bundle size)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SRC = process.env.HYG_CSV ?? "/tmp/hyg.csv";
const OUT = resolve(ROOT, "src/astronomy/data/stars-hyg.json");
const MAG_LIMIT = Number(process.env.MAG_LIMIT ?? "5.5");

console.log(`Reading ${SRC} (mag <= ${MAG_LIMIT})…`);
const csv = readFileSync(SRC, "utf8");
const lines = csv.split("\n");
const headers = parseCsvLine(lines[0]);

const idx = (name) => {
	const i = headers.indexOf(name);
	if (i < 0) throw new Error(`column not found: ${name}`);
	return i;
};
const iRa = idx("ra");
const iDec = idx("dec");
const iMag = idx("mag");
const iCi = idx("ci");
const iProper = idx("proper");
const iBayer = idx("bayer");
const iCon = idx("con");

const ra = [];
const dec = [];
const mag = [];
const ci = [];
const named = {}; // index → display name

for (let li = 1; li < lines.length; li++) {
	const line = lines[li];
	if (!line) continue;
	const cols = parseCsvLine(line);
	const m = Number(cols[iMag]);
	if (!Number.isFinite(m) || m > MAG_LIMIT) continue;
	const r = Number(cols[iRa]);
	const d = Number(cols[iDec]);
	if (!Number.isFinite(r) || !Number.isFinite(d)) continue;
	const c = Number(cols[iCi]);
	const cTrim = Number.isFinite(c) ? round(c, 2) : 0;
	const i = ra.length;
	ra.push(round(r, 4));
	dec.push(round(d, 3));
	mag.push(round(m, 2));
	ci.push(cTrim);
	const proper = cols[iProper] ?? "";
	if (proper && proper !== "Sol") named[i] = proper;
	else if (m <= 3.0) {
		const bayer = cols[iBayer] ?? "";
		const con = cols[iCon] ?? "";
		if (bayer && con) named[i] = `${bayer} ${con}`;
	}
}

const out = { ra, dec, mag, ci, named };
writeFileSync(OUT, JSON.stringify(out));
const bytes = Buffer.byteLength(JSON.stringify(out), "utf8");
console.log(`Wrote ${ra.length} stars to ${OUT}`);
console.log(`Size: ${(bytes / 1024).toFixed(1)} KB (uncompressed)`);

function round(n, digits) {
	const m = 10 ** digits;
	return Math.round(n * m) / m;
}

// Minimal CSV parser — handles quoted fields with embedded commas/quotes.
function parseCsvLine(line) {
	const out = [];
	let cur = "";
	let inQuote = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (inQuote) {
			if (c === '"') {
				if (line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuote = false;
				}
			} else {
				cur += c;
			}
		} else {
			if (c === ",") {
				out.push(cur);
				cur = "";
			} else if (c === '"') {
				inQuote = true;
			} else {
				cur += c;
			}
		}
	}
	out.push(cur);
	return out;
}
