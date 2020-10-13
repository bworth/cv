self.addEventListener('install', (event) => {
	const offlineRequest = new Request('index.html');

	event.waitUntil(
		fetch(offlineRequest).then((response) => {
			return caches.open('offline').then((cache) => {
				console.log('[oninstall] Cached offline page', response.url);
				return cache.put(offlineRequest, response);
			});
		})
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(
			fetch(request).catch((error) => {
				console.error('[onfetch] Failed. Serving cached offline fallback ' + error);
				return caches.open('offline').then((cache) => {
					return cache.match('index.html');
				});
			})
		);
	}
});
