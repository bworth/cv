const CACHE_NAME = 'offline';
const OFFLINE_URLS = ['index.html', './'];
const VERSION = 1;

self.addEventListener('install', (event) => {
	const requests = OFFLINE_URLS.map((url) => new Request(url, { cache: 'reload' }));

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)
			.then(() => {
				const urls = requests.map((request) => request.url);
				console.log('Install event cached offline pages', urls.join(', '));
			})
			.catch((error) => console.warn('Install event failed.', error))
		)
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method === 'GET') {
		event.respondWith(
			fetch(request).catch((error) => {
				console.warn('Fetch event failed; serving cached offline fallback.', error);
				return caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL));
			})
		);
	}
});
