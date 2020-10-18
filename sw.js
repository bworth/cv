const CACHE_NAME = 'cache-v1';
const OFFLINE_URLS = ['index.html', './', './?source=pwa'];

function responseFallback(title) {
	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" stroke-linejoin="round">
			<title>${ title }</title>
			<path stroke="#ddd" stroke-width="25" d="M99 18L15 162h168z"/>
			<path fill="#fff" stroke="#eee" stroke-width="17" d="M99 18L15 162h168z"/>
			<g fill="#aaa">
				<path d="M91 70a9 9 0 0118 0l-5 50a4 4 0 01-8 0z"/>
				<circle cx="100" cy="138" r="9"/>
			</g>
		</svg>
	`;
}

function cacheMatchError(request, cacheName) {
	return new Error(`Unable to find ${ request.url } in ${ cacheName || 'caches' }`);
}

function networkStatusError(request, response) {
	return new Error(`${ request.url } responded with status ${ response.status }`);
}

function networkTimeoutError(request, timeout) {
	return new Error(`${ request.url } timed out after ${ timeout }ms`);
}

function deleteOldCaches(activeCacheNames) {
	return caches.keys()
		.then((cacheNames) => cacheNames.filter((cacheName) => !activeCacheNames.includes(cacheName)))
		.then((oldCacheNames) => Promise.all(oldCacheNames.map((oldCacheName) => caches.delete(oldCacheName))));
}

function fromCache(request, cacheName) {
	return (cacheName ? caches.open(cacheName).then((cache) => cache.match(request)) : caches.match(request))
		.then((cachedResponse) => cachedResponse || Promise.reject(cacheMatchError(request, cacheName)));
}

function fromNetwork(request, timeout) {
	return new Promise((fulfill, reject) => {
		const tid = timeout ? setTimeout(() => reject(networkTimeoutError(request, timeout)), timeout) : undefined;

		fetch(request).then((response) => {
			clearTimeout(tid);

			if (response.ok) {
				fulfill(response);
			} else {
				reject(networkStatusError(request, response));
			}
		}, reject);
	});
}

function precache(cacheName, requests) {
	return caches.open(cacheName).then((cache) => cache.addAll(requests));
}

function preferCache(request, cacheName) {
	return fromCache(request, cacheName).catch((error) => {
		console.warn(error);

		return fromNetwork(request);
	});
}

function preferNetwork(request, cacheName, timeout) {
	return fromNetwork(request, timeout)
		.then((response) => {
			updateCache(cacheName, request, response.clone());

			return response;
		})
		.catch((error) => {
			console.warn(error);

			return fromCache(request, cacheName);
		});
}

function updateCache(cacheName, request, response) {
	caches.open(cacheName).then((cache) => cache.put(request, response));
}

function useFallback(title) {
	return Promise.resolve(new Response(responseFallback(title), { headers: { 'Content-Type': 'image/svg+xml' } }));
}

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(precache(CACHE_NAME, requests).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	const activeCacheNames = [CACHE_NAME];

	event.waitUntil(deleteOldCaches(activeCacheNames).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method === 'GET') {
		event.respondWith(preferCache(request, CACHE_NAME).catch(() => useFallback('Network error')));
		event.waitUntil(fromNetwork(request).then((response) => updateCache(CACHE_NAME, request, response)));
	}
});