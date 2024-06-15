'use strict';

document.addEventListener('DOMContentLoaded', () => {
	const DNDEXCLUDEIDS_META_NAME = 'dndexcludeids';

	const excludeIds = document.querySelector(`meta[name="${DNDEXCLUDEIDS_META_NAME}"]`)?.getAttribute('content');
	if (!excludeIds)
		return;

	const excludeElements = [];
	excludeIds.split(/\s+/).forEach(excludeId => {
		const element = document.getElementById(excludeId);
		if (element)
			excludeElements.push(element);
	});

	addEventListener('dragover', event => {
		if (!excludeElements.includes(event.target))
			event.preventDefault();
	});

	addEventListener('drop', event => {
		if (!excludeElements.includes(event.target))
			event.preventDefault();
	});
});
