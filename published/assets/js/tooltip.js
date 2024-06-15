'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const showTooltip = document.getElementById('chkShowTooltip');

	if (showTooltip) {
		showTooltip.addEventListener('change', event => {
			[...document.getElementsByClassName('_tooltip')].forEach(tooltip => {
				if (event.currentTarget.checked)
					tooltip.removeAttribute('_notooltip');
				else
					tooltip.setAttribute('_notooltip', '');
			});
		});
	}
} });
