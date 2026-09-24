import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Moteur OCR et données de langue servis par l'app elle-même : lecture d'étiquette hors connexion, sans CDN. */
const OCR_FILES: Record<string, string> = {
  "worker.min.js": "tesseract.js/dist/worker.min.js",
  "tesseract-core-lstm.wasm.js": "tesseract.js-core/tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js": "tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js": "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
  "fra.traineddata.gz": "@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz",
};
const source = (name: string) => readFileSync(join(import.meta.dirname, "node_modules", OCR_FILES[name]));

function ocrAssets(): Plugin {
  return {
    name: "ocr-assets",
    configureServer(server) {
      server.middlewares.use("/ocr/", (req, res, next) => {
        const name = req.url?.slice(1).split("?")[0] ?? "";
        if (!OCR_FILES[name]) return next();
        res.setHeader("Content-Type", name.endsWith(".js") ? "text/javascript" : "application/octet-stream");
        res.end(source(name));
      });
    },
    generateBundle() {
      for (const name of Object.keys(OCR_FILES)) this.emitFile({ type: "asset", fileName: `ocr/${name}`, source: source(name) });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), ocrAssets()],
});
