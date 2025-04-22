// @ts-check
import { defineConfig, passthroughImageService } from "astro/config";

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
	site: 'https://debuggingfuture.com',
	integrations: [mdx(), sitemap()],
	compressHTML: false,
	vite: {
		// @ts-ignore
		plugins: [tailwindcss({
			theme: {
				extend: {
					fontFamily: {
						serif: ['Noto Serif TC', 'serif'], // Or 'sans' if you prefer
					},
				},
			},
		})],
	},
	image: {
		service: passthroughImageService(),
	},
});
