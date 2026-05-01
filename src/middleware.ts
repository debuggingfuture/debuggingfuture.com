import { defineMiddleware } from "astro:middleware";
import { SITE_GEO } from "./astronomy/geo";

const round1 = (n: number) => Math.round(n);

export const onRequest = defineMiddleware(async (ctx, next) => {
	const cf = (ctx.locals as { runtime?: { cf?: Record<string, string | undefined> } })
		?.runtime?.cf;

	const latRaw = cf?.latitude;
	const lonRaw = cf?.longitude;
	const lat = latRaw ? Number.parseFloat(latRaw) : Number.NaN;
	const lon = lonRaw ? Number.parseFloat(lonRaw) : Number.NaN;

	if (Number.isFinite(lat) && Number.isFinite(lon)) {
		ctx.locals.geo = {
			lat: round1(lat),
			lon: round1(lon),
			tz: cf?.timezone,
			name: cf?.city ?? cf?.country ?? "your sky",
			country: cf?.country,
			source: "cf",
		};
	} else {
		ctx.locals.geo = { ...SITE_GEO, source: "fallback" };
	}

	const res = await next();
	res.headers.set("Cache-Control", "private, max-age=300");
	return res;
});
