'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const CLASS_HIDE = 'd-none';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		Static.registerElement(element);

		const button = element.getElementsByTagName('button')[0];
		const statusText = element.getElementsByTagName('span')[0];

		element.addEventListener(Static.EVENT_SHOWSPLASH, event => {
			event.currentTarget.classList.remove(CLASS_HIDE);
			event.currentTarget.classList.remove('_fade-out');
			event.currentTarget.classList.add('_fade-in');
		});

		element.addEventListener(Static.EVENT_HIDESPLASH, event => {
			event.currentTarget.classList.remove('_fade-in');
			event.currentTarget.classList.add('_fade-out');
			setTimeout(target => target.classList.add(CLASS_HIDE), 1000, event.currentTarget);
		});

		if (button) {
			element.addEventListener(Static.EVENT_SHOWBUTTON, event => {
				button.classList.remove(CLASS_HIDE);
			});

			element.addEventListener(Static.EVENT_HIDEBUTTON, event => {
				button.classList.add(CLASS_HIDE);
			});
		}

		if (statusText) {
			element.addEventListener(Static.EVENT_UPDATESTATUS, event => {
				const stage = event.detail?.stage;
				if (!stage)
					return;

				const post = event.detail?.post ? event.detail.post : '';
				const text = statusText.dataset[stage] ? statusText.dataset[stage] : '';

				statusText.textContent = text + post;
			});
		}
	});
} });
