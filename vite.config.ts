import { readFileSync, writeFileSync } from "node:fs";
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
  "fra-traineddata.wasm": "@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz",
};
const source = (name: string) => readFileSync(join(import.meta.dirname, "node_modules", OCR_FILES[name]));

function ocrAssets(): Plugin {
  return {
    name: "ocr-assets",
    configureServer(server) {
      server.middlewares.use("/ocr/", (req, res, next) => {
        const name = req.url?.slice(1).split("?")[0] ?? "";
        if (!OCR_FILES[name]) return next();
        res.setHeader("Content-Type", name.endsWith(".js") ? "text/javascript" : "application/wasm");
        res.end(source(name));
      });
    },
    generateBundle() {
      for (const name of Object.keys(OCR_FILES)) this.emitFile({ type: "asset", fileName: `ocr/${name}`, source: source(name) });
    },
  };
}

const BUILD_DATE = new Date().toISOString();

/** Estampille sw.js pour que chaque publication soit vue comme une mise à jour par les téléphones. */
function stampServiceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "stamp-sw",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const file = join(import.meta.dirname, outDir, "sw.js");
      writeFileSync(file, readFileSync(file, "utf8").replace("__BUILD_ID__", BUILD_DATE));
    },
  };
}

export default defineConfig({
  base: "./",
  define: {
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [react(), tailwindcss(), ocrAssets(), stampServiceWorker()],
});
