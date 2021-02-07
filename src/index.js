import onLoad from './onLoad';

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js');
}

window.addEventListener('DOMContentLoaded', onLoad);
