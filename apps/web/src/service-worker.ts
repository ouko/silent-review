/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "silent-review-v2";
const UPLOAD_CACHE_NAME = "silent-review-uploads-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/vite.svg",
];

const UPLOAD_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const UPLOAD_MAX_BYTES = 200 * 1024 * 1024; // 200 MB
const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024; // skip individual files > 10 MB

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== UPLOAD_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimUploadCache() {
  const cache = await caches.open(UPLOAD_CACHE_NAME);
  const requests = await cache.keys();
  const entries: { request: Request; response: Response; accessed: number; size: number }[] = [];
  let totalBytes = 0;
  const now = Date.now();

  for (const req of requests) {
    const res = await cache.match(req);
    if (!res) continue;
    const accessed = Number(res.headers.get("x-sw-accessed") || now);
    const size = Number(res.headers.get("content-length") || 0);
    entries.push({ request: req, response: res, accessed, size });
    totalBytes += size;
  }

  entries.sort((a, b) => a.accessed - b.accessed);

  for (const entry of entries) {
    if (totalBytes <= UPLOAD_MAX_BYTES && now - entry.accessed < UPLOAD_MAX_AGE_MS) break;
    await cache.delete(entry.request);
    totalBytes -= entry.size;
  }
}

async function cacheUpload(request: Request, response: Response): Promise<Response> {
  if (request.headers.has("range")) return response;
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!contentLength || contentLength > UPLOAD_MAX_FILE_BYTES) return response;

  const cache = await caches.open(UPLOAD_CACHE_NAME);
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set("x-sw-accessed", String(Date.now()));
  const body = await cloned.blob();
  await cache.put(request, new Response(body, { status: cloned.status, statusText: cloned.statusText, headers }));
  trimUploadCache().catch(() => {});
  return response;
}

async function handleUploadFetch(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    if (network.ok) {
      return cacheUpload(request, network);
    }
    return network;
  } catch {
    return (await caches.match(request)) as Response;
  }
}

async function handleFeedFetch(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  try {
    const network = await fetch(request);
    if (network.ok) {
      const clone = network.clone();
      cache.put(request, clone).catch(() => {});
    }
    return network;
  } catch {
    return cached ?? Response.json({ reviews: [], nextCursor: undefined }, { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(handleUploadFetch(request));
    return;
  }

  if (url.pathname.startsWith("/api/feed")) {
    event.respondWith(handleFeedFetch(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html") as Promise<Response>)
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

export {};
