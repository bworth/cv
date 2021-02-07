function setDetailsHeightProperties(details) {
	// First remove properties which could be affecting rendered height, also prevents transition on resize
	details.style.removeProperty('--height-closed');
	details.style.removeProperty('--height-open');
	details.style.setProperty('--height-closed', details.querySelector('summary').scrollHeight);
	// If closed this will set the open height to the closed height, this will be corrected on toggle
	details.style.setProperty('--height-open', details.scrollHeight);
}

function toggleDetails(details) {
	// Correct height for open/closed state can only be set when in that state
	if (details.open) {
		// Requires `overflow: hidden;` to calculate height, but setting this permanently in CSS obscures the focus ring
		details.style.overflow = 'hidden';
		details.style.setProperty('--height-open', details.scrollHeight);
		details.style.overflow = '';
	} else {
		details.style.setProperty('--height-closed', details.querySelector('summary').scrollHeight);
	}
}

export default function onLoad() {
	const isSmallDevice = Math.max(screen.availWidth, screen.availHeight) < 760;
	const externalLinks = document.querySelectorAll('a[href^="https://"]');
	const timelineDetails = document.querySelectorAll('.timeline details');

	externalLinks.forEach((a) => {
		a.setAttribute('target', '_blank');
		a.setAttribute('rel', 'nofollow noopener noreferrer');

		if (!a.hasAttribute('title')) {
			a.setAttribute('title', 'This link will open in a new window');
		}
	});

	timelineDetails.forEach((details) => {
		details.addEventListener('toggle', () => toggleDetails(details));
		// Prevent focus ring persistence (can be removed once `:focus-visible` becomes more prevalent)
		details.querySelector('summary').addEventListener('mouseup', (event) => event.currentTarget.blur());

		if (isSmallDevice) {
			// Set initial state of `<details>` to closed for small screen devices
			details.removeAttribute('open');
		}

		setDetailsHeightProperties(details);
	});

	window.addEventListener('beforeprint', () => {
		timelineDetails.forEach((details) => details.setAttribute('open', true));
	});

	window.addEventListener('resize', () => {
		timelineDetails.forEach(setDetailsHeightProperties);
	});

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			timelineDetails.forEach(setDetailsHeightProperties);
		}
	});
}
