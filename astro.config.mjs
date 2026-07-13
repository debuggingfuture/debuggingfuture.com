// @ts-check
import { defineConfig, passthroughImageService } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "rehype-external-links";
import remarkBreaks from "remark-breaks";

// https://astro.build/config
export default defineConfig({
	site: "https://debuggingfuture.com",
	output: "static",
	// The two voyage maps were folded into the single tabbed /bucket page.
	redirects: {
		"/bucket-list-life": "/bucket",
		"/bucket-list-work": "/bucket",
	},
	adapter: cloudflare({
		platformProxy: { enabled: true },
		imageService: "passthrough",
	}),
	experimental: { session: true },
	integrations: [
		mdx({
			remarkPlugins: [remarkBreaks],
			rehypePlugins: [
				[
					rehypeExternalLinks,
					{
						target: "_blank",
						rel: ["noopener", "noreferrer"],
					},
				],
			],
		}),
		// The /bucket voyages are direct-URL-only — keep them (and the old
		// /bucket-list-* redirect stubs) out of the sitemap.
		sitemap({ filter: (page) => !page.includes("/bucket") }),
	],
	markdown: {
		smartypants: false,
		remarkPlugins: [remarkBreaks],
		rehypePlugins: [
			[
				rehypeExternalLinks,
				{
					target: "_blank",
					rel: ["noopener", "noreferrer"],
				},
			],
		],
	},
	compressHTML: false,
	vite: {
		server: {
			allowedHosts: [".ts.net"],
		},
		// @ts-ignore
		plugins: [
			tailwindcss({
				theme: {
					extend: {
						fontFamily: {
							serif: ["Noto Serif TC", "serif"], // Or 'sans' if you prefer
							bauhaus: ["BAUHAUS", "Arial", "sans-serif"],
						},
					},
				},
			}),
		],
	},
	image: {
		service: passthroughImageService(),
	},
});
