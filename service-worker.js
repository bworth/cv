const CACHE_NAME = 'cv-cache-v1';
const OFFLINE_URLS = ['index.html', './', './?source=pwa'];

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)
			.then(() => {
				const urls = requests.map((request) => request.url);
				console.log('Install event cached offline resources', urls.join(', '));
			})
			.catch((error) => console.warn('Install event failed.', error))
		)
	);
});

self.addEventListener('activate', (event) => {
	const activeCacheNames = [CACHE_NAME];

	event.waitUntil(
		caches.keys()
			.then((cacheNames) => cacheNames.filter((cacheName) => !activeCacheNames.includes(cacheName)))
			.then((oldCacheNames) => Promise.all(oldCacheNames.map((oldCacheName) => caches.delete(oldCacheName))))
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(
			fetch(request).catch((error) => {
				console.warn('Fetch event failed; serving cached offline fallback.', error);
				return caches.open(CACHE_NAME).then((cache) => cache.match(request));
			})
		);
	}
});
