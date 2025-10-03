import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({
		base: "./src/content/blog",
		pattern: "**/*.{md,mdx}",
		generateId: ({ entry }) => {
			// Extract filename without extension from the entry path
			const filename = entry.split("/").pop() || entry;
			return filename.replace(/\.(md|mdx)$/, "");
		},
	}),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		// Transform string to Date object
		pubDate: z.coerce.date().optional(),

		date: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		categories: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

const hack = defineCollection({
	// Load Markdown and MDX files in the `src/content/hack/` directory.
	loader: glob({
		base: "./src/content/hack",
		pattern: "**/*.{md,mdx}",
		generateId: ({ entry }) => {
			// Extract filename without extension from the entry path
			const filename = entry.split("/").pop() || entry;
			return filename.replace(/\.(md|mdx)$/, "");
		},
	}),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		pubDate: z.coerce.date().optional(),

		date: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		thumbnail: z.string().optional(),
		heroImage: z.string().optional(),
		categories: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

const life = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: "./src/content/life", pattern: "**/*.{md,mdx}" }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		// Transform string to Date object
		pubDate: z.coerce.date().optional(),

		date: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		thumbnail: z.string().optional(),
		heroImage: z.string().optional(),
		categories: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

export const collections = { blog, life, hack };
