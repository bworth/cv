const CACHE_NAME = 'cv-cache-v1';
const OFFLINE_URLS = ['index.html', './', './?source=pwa'];

function preferCache(request) {
	return caches.match(request).then((cachedResponse) => {
		if (cachedResponse) {
			console.log('[fetch] event serving from cache', request.url);
			return cachedResponse;
		}

		console.warn('[fetch] event unable to find cached resource, fetching from network', request.url);
		return fetch(request).then((response) => {
			caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
			return response;
		});
	});
}

function preferNetwork(request) {
	return fetch(request).catch((error) => {
		console.warn('[fetch] event failed; serving cached fallback.', error);
		return caches.open(CACHE_NAME).then((cache) => cache.match(request).then((matching) => {
			if (matching) {
				return matching;
			}

			console.warn('[fetch] event unable to find cached resource', request.url);
		}));
	});
}

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)
			.then(() => {
				const urls = requests.map((request) => request.url);
				console.log('[install] event cached resources', urls.join(', '));
				return self.skipWaiting();
			})
			.catch((error) => console.warn('[install] event precache failed.', error))
		)
	);
});

self.addEventListener('activate', (event) => {
	const activeCacheNames = [CACHE_NAME];

	event.waitUntil(
		caches.keys()
			.then((cacheNames) => cacheNames.filter((cacheName) => !activeCacheNames.includes(cacheName)))
			.then((oldCacheNames) => Promise.all(oldCacheNames.map((oldCacheName) => caches.delete(oldCacheName))))
			.then(() => {
				console.log('[activate] event claiming control with', activeCacheNames.join(', '));
				self.clients.claim();
			})
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(preferCache(request));
	}
});
