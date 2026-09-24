// Service worker de Ma Cave : l'app s'ouvre hors connexion une fois visitée.
const CACHE = "ma-cave-__BUILD_ID__"; // remplacé à chaque build : le navigateur voit une nouvelle version
const SHELL = ["./", "./index.html", "./favicon.svg", "./manifest.webmanifest", "./icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

async function networkFirst(request, fallback) {
  try {
    // « no-cache » : revalide auprès du serveur au lieu de resservir la copie HTTP (10 min sur GitHub Pages).
    const res = await fetch(request, { cache: "no-cache" });
    if (res.ok) (await caches.open(CACHE)).put(fallback ?? request, res.clone());
    return res;
  } catch {
    return (await caches.match(fallback ?? request)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") return event.respondWith(networkFirst(request, "./index.html"));
  // Fichiers de build au nom haché et moteur OCR (chargé au premier scan) : immuables.
  if (url.pathname.includes("/assets/") || url.pathname.includes("/ocr/")) return event.respondWith(cacheFirst(request));
  event.respondWith(networkFirst(request));
});
