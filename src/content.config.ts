import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default("A K Studio"),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z
      .enum(["wedding", "pre-wedding", "engagement", "tips", "behind-the-scenes"])
      .default("wedding"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
