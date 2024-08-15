'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const _BS_CLASS_DISABLED = 'disabled';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		Static.registerElement(element);

		element.addEventListener(Static.EVENT_CHANGESTATE, event => {
			const state = event.detail?.state;
			if (!state)
				return;

			// set state to data-enable-input or data-disable-input to change input disabled
			if (event.currentTarget.dataset.enableInput?.split(/\s+/).includes(state))
				enableInput(event.currentTarget);

			if (event.currentTarget.dataset.disableInput?.split(/\s+/).includes(state))
				disableInput(event.currentTarget);

			// set state to data-check or data-uncheck to change checkbox checked
			if (event.currentTarget.dataset.check?.split(/\s+/).includes(state))
				event.currentTarget.checked = true;

			if (event.currentTarget.dataset.uncheck?.split(/\s+/).includes(state))
				event.currentTarget.checked = false;

			// set state to data-show-modal to open Bootstrap modal
			if (event.currentTarget.dataset.showModal?.split(/\s+/).includes(state)) {
				new bootstrap.Modal(event.currentTarget).show();
			}
		});
	});

	Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'init' });

	function enableInput(element) {
		if (!element)
			return;

		element.classList.remove(_BS_CLASS_DISABLED);
		element.removeAttribute('disabled');
	}

	function disableInput(element) {
		if (!element)
			return;

		element.classList.add(_BS_CLASS_DISABLED);
		element.setAttribute('disabled', '');
	}
} });
