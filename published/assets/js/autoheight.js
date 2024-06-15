'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const SOURCEID_ATTR_NAME = '_sourceid';
	const OFFSET_ATTR_NAME = '_offset';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const source = element.getElementFromAttribute(SOURCEID_ATTR_NAME);
		if (!source)
			return;

		const offset = element.getAttribute(OFFSET_ATTR_NAME) ? Number(element.getAttribute(OFFSET_ATTR_NAME)) : 0;

		addEventListener('load', event => {
			copyHeight(source, element);
		});

		addEventListener('resize', event => {
			copyHeight(source, element);
		});

		function copyHeight(source, target) {
			let height = offset;
			[...source.getElementsByClassName('row')].forEach(row => {
				height += parseInt(getComputedStyle(row).height);
			});

			target.style.height = `${height}px`;
		}
	});
} });
