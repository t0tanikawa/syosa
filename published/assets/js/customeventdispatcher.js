'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const listen = element.dataset.listen;
		if (!listen)
			return;

		const type = element.dataset.type;
		if (!type)
			return;

		element.addEventListener(listen, event => {
			Static.dispatchEvent(type, { target: event.currentTarget });
		});

		if (element.dataset.dispatchOnLoad !== undefined)
			element.dispatchEvent(new Event(listen));
	});
} });
