// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // site: "https://akreation.in",
  site: "https://gauravkumar-tech.github.io/",
  base: "akreation-web/", //only required for github pages -- for normal website just give /
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
