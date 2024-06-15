'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';
	const AUTOSCROLLCHECKBOXID_ATTR_NAME = '_autoscrollcheckboxid';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);
		const autoscroll = element.getElementFromAttribute(AUTOSCROLLCHECKBOXID_ATTR_NAME);

		if (video && autoscroll) {
			video.addEventListener('timeupdate', event => {
				if (autoscroll.checked)
					element.dispatchEvent(new CustomEvent(Static.EVENT_SCROLL, { detail: { time: event.currentTarget.currentTime } }));
			});
		}
	});
} });
