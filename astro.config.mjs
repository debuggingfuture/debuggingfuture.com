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
		sitemap(),
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
