const CACHE_NAME = 'cache-v1';
const OFFLINE_URLS = ['index.html', './', './?source=pwa'];

function cleanCaches(activeCacheNames) {
	return caches.keys()
		.then((cacheNames) => cacheNames.filter((cacheName) => !activeCacheNames.includes(cacheName)))
		.then((oldCacheNames) => Promise.all(oldCacheNames.map((oldCacheName) => caches.delete(oldCacheName))));
}

function fromCache(request, cacheName) {
	return (cacheName ? caches.open(cacheName).then((cache) => cache.match(request)) : caches.match(request))
		.then((cachedResponse) => cachedResponse || Promise.reject(
			new Error('Unable to find ' + request.url + (cacheName ? ' in ' + cacheName : ''))
		));
}

function fromNetwork(request, timeout) {
	return new Promise((fulfill, reject) => {
		const tid = timeout ? setTimeout(reject, timeout) : undefined;

		fetch(request).then((response) => {
			clearTimeout(tid);
			fulfill(response);
		}, reject);
	});
}

function precache(cacheName, requests) {
	return caches.open(cacheName).then((cache) => cache.addAll(requests)
		.then(() => {
			console.log('[install] cached resources', requests.map((request) => request.url).join(', '));
			return self.skipWaiting();
		})
		.catch((error) => console.warn('[install] precache failed.', error))
	);
}

function preferCache(request, cacheName) {
	return fromCache(request, cacheName)
		.then((cachedResponse) => {
			console.log('[fetch] serving from cache', request.url);
			return cachedResponse;
		})
		.catch((error) => {
			console.warn('[fetch] unable to find cached resource, fetching from network.', error);
			return fromNetwork(request).then((response) => updateCache(cacheName, request, response));
		});
}

function preferNetwork(request, cacheName, timeout) {
	return fromNetwork(request, timeout)
		.then((response) => updateCache(cacheName, request, response))
		.catch((error) => {
			console.warn('[fetch] failed; serving cached fallback.', error);
			return fromCache(request, cacheName).catch(() => {
				console.warn('[fetch] unable to find cached resource.', error);
			});
		});
}

function updateCache(cacheName, request, response) {
	caches.open(cacheName).then((cache) => cache.put(request, response.clone())).then(() => response);
}

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(precache(CACHE_NAME, requests));
});

self.addEventListener('activate', (event) => {
	const activeCacheNames = [CACHE_NAME];

	event.waitUntil(cleanCaches(activeCacheNames).then(() => {
		console.log('[activate] claiming control with', activeCacheNames.join(', '));
		return self.clients.claim();
	}));
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(preferCache(request, CACHE_NAME));
	}
});
