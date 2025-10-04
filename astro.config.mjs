// @ts-check
import { defineConfig, passthroughImageService } from "astro/config";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "rehype-external-links";
import remarkBreaks from "remark-breaks";

// https://astro.build/config
export default defineConfig({
	site: "https://debuggingfuture.com",
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
