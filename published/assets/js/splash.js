'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const button = element.getElementsByTagName('button')[0];
		const statusText = element.getElementsByTagName('span')[0];

		element.addEventListener(Static.EVENT_ENABLE, event => {
			event.currentTarget.classList.remove('_hide');
			event.currentTarget.classList.remove('_fade-out');
			event.currentTarget.classList.add('_fade-in');
		});

		element.addEventListener(Static.EVENT_DISABLE, event => {
			event.currentTarget.classList.remove('_fade-in');
			event.currentTarget.classList.add('_fade-out');
			setTimeout(target => target.classList.add('_hide'), 1000, event.currentTarget);
		});

		if (button) {
			element.addEventListener(Static.EVENT_SHOWBUTTON, event => {
				button.classList.remove('_hide');
			});

			element.addEventListener(Static.EVENT_HIDEBUTTON, event => {
				button.classList.add('_hide');
			});
		}

		if (statusText) {
			element.addEventListener(Static.EVENT_UPDATESTATUS, event => {
				const stage = event.detail?.stage;
				if (!stage)
					return;

				const post = event.detail?.post ? event.detail.post : '';

				statusText.textContent = statusText.dataset[stage] + post;
			});
		}
	});
} });
