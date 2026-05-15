#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { argv, exit } from "node:process";

const distDir = argv[2] ?? "dist";

const requiredFiles = [
	"index.html",
	"about/index.html",
	"blog/index.html",
	"hack/index.html",
	"life/index.html",
	"rss.xml",
	"sitemap-index.xml",
	"_worker.js/index.js",
	"_routes.json",
];

const contentChecks = [
	{
		file: "index.html",
		needle: "<title>Debug 未來</title>",
		label: "homepage title",
	},
	{
		file: "rss.xml",
		needle: "</rss>",
		label: "rss closing tag",
	},
];

const failures = [];

for (const rel of requiredFiles) {
	const path = `${distDir}/${rel}`;
	try {
		const s = await stat(path);
		if (!s.isFile() || s.size === 0) {
			failures.push(`empty or not a file: ${path}`);
		}
	} catch {
		failures.push(`missing: ${path}`);
	}
}

for (const { file, needle, label } of contentChecks) {
	const path = `${distDir}/${file}`;
	try {
		const body = await readFile(path, "utf8");
		if (!body.includes(needle)) {
			failures.push(`${label} not found in ${path} (expected substring: ${needle})`);
		}
	} catch (err) {
		failures.push(`could not read ${path}: ${err.message}`);
	}
}

if (failures.length > 0) {
	for (const f of failures) console.error(`smoke: ${f}`);
	console.error(`smoke: ${failures.length} check(s) failed`);
	exit(1);
}

console.log(`smoke: ${requiredFiles.length} files + ${contentChecks.length} content checks passed`);
