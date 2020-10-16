const CACHE_NAME = 'cache-v1';
const OFFLINE_URLS = ['index.html', './', './?source=pwa'];

function deleteCaches(activeCacheNames) {
	return caches.keys()
		.then((cacheNames) => cacheNames.filter((cacheName) => !activeCacheNames.includes(cacheName)))
		.then((oldCacheNames) => Promise.all(oldCacheNames.map((oldCacheName) => caches.delete(oldCacheName))));
}

function fromCache(request, cacheName) {
	const match = cacheName ? caches.open(cacheName).then((cache) => cache.match(request)) : caches.match(request);
	return match.then((cachedResponse) => cachedResponse || Promise.reject(new Error('Unable to find', request.url)));
}

function fromNetwork(request, cacheName, timeout) {
	return new Promise((fulfill, reject) => {
		let timeoutID;

		if (timeout) {
			timeoutID = setTimeout(reject, timeout);
		}

		fetch(request).then((response) => {
			clearTimeout(timeoutID);

			if (cacheName) {
				caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
			}

			fulfill(response);
		}, reject);
	});
}

function precache(cacheName, requests) {
	return caches.open(cacheName).then((cache) => cache.addAll(requests)
		.then(() => {
			const urls = requests.map((request) => request.url);
			console.log('[install] event cached resources', urls.join(', '));
			return self.skipWaiting();
		})
		.catch((error) => console.warn('[install] event precache failed.', error))
	);
}

function preferCache(request, cacheName) {
	return fromCache(request, cacheName)
		.then((cachedResponse) => {
			console.log('[fetch] event serving from cache', request.url);
			return cachedResponse;
		})
		.catch((error) => {
			console.warn('[fetch] event unable to find cached resource, fetching from network.', error);
			return fromNetwork(request, cacheName);
		});
	});
}

function preferNetwork(request, cacheName, timeout) {
	return fromNetwork(request, cacheName, timeout).catch((error) => {
		console.warn('[fetch] event failed; serving cached fallback.', error);
		return fromCache(request, cacheName).catch(() => {
			console.warn('[fetch] event unable to find cached resource.', error);
		});
	});
}

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(precache(CACHE_NAME, requests));
});

self.addEventListener('activate', (event) => {
	const activeCacheNames = [CACHE_NAME];

	event.waitUntil(deleteCaches(activeCacheNames).then(() => {
		console.log('[activate] event claiming control with', activeCacheNames.join(', '));
		return self.clients.claim();
	}));
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(preferCache(request, CACHE_NAME));
	}
});
