import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built into the learn site at /my-day/timetable/ (relative paths, so the
// folder can move). `npm run build` writes straight into site/; commit both.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../../site/my-day/timetable",
    emptyOutDir: true,
  },
});
