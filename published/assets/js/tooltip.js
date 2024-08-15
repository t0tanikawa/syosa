'use strict';

document.addEventListener('DOMContentLoaded', () => {
	[...document.getElementsByClassName('_tooltip')].forEach(tooltip => {
		Static.registerElement(tooltip);

		tooltip.addEventListener('config-showtooltip', event => {
			if (event.detail?.target?.checked !== undefined) {
				if (event.detail.target.checked)
					tooltip.removeAttribute('_notooltip');
				else
					tooltip.setAttribute('_notooltip', '');
			}
		});
	});
});
