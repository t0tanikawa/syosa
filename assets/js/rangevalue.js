'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const SOURCEID_ATTR_NAME = '_sourceid';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const source = element.getElementFromAttribute(SOURCEID_ATTR_NAME);

		if (source) {
			source.addEventListener('input', event => {
				element.textContent = event.currentTarget.value;
			});
			source.dispatchEvent(new Event('input'));
		}
	});
} });
