/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	interface Locals extends Runtime {
		geo: {
			lat: number;
			lon: number;
			tz?: string;
			name?: string;
			country?: string;
			source: "cf" | "fallback";
		};
	}
}

interface Env {}
