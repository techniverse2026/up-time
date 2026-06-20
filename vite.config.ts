import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Host-agnostic base path.
// - GitHub Pages project site: set BASE_PATH=/<repo-name>/ (done in deploy.yml).
// - Vercel/Netlify or a custom domain at the root: leave it as "/".
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
});
