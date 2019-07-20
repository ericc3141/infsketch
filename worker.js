// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// https://serviceworke.rs

const CACHE = "v1";

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE).then((cache) => {
            return cache.addAll([
                "./",
                "./main.js"
            ]);
        })
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(fromCache(e.request));
    e.waitUntil(updateCache(e.request));
})

/* Simple attempt to return from cache.
 */
function fromCache(request) {
    return caches.match(request).then((resp) => {
        return resp || fetch(request);
    });
}

/* Fetch request from network,
 * and put in cache
 */
function updateCache(request) {
    return caches.open(CACHE).then((cache) => {
        return fetch(request, {mode:"no-cors"}).then((response) => {
            if (response.status != 200 && response.type !== "opaque") {
                return;
            }
            return cache.put(request, response);
        });
    });
}
