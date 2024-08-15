'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		Static.registerElement(element);

		const template = element.getElementsByTagName('template')[0];
		if (!template)
			return;

		const list = element.getElementsByTagName('ul')[0];
		if (!list)
			return;

		let video = null;

		// default value will set immediately after DOM loaded by config
		let autoscroll = false;

		element.addEventListener(Static.EVENT_LOADTIMELINE, event => {
			if (video)
				video.removeEventListener('timeupdate', scroll);

			video = event.detail?.video;

			Array.from(list.children).filter(child => child.tagName == 'LI').forEach(child => child.remove());

			const cues = event.detail?.textTrack?.cues;
			if (!cues)
				return;

			for (const cue of cues) {
				const item = template.content.firstElementChild.cloneNode(true);
				list.append(item);

				item.getElementsByTagName('h2')[0].textContent = cue.id;
				item.getElementsByTagName('span')[0].getElementsByTagName('span')[0].textContent
						= new Date(cue.startTime * 1000).toISOString().slice(11,19);
				item.getElementsByTagName('p')[0].textContent = cue.text.replace(/(<([^>]+)>)/gi, '');
				item._cueTime = cue.startTime;
				item.getElementsByTagName('span')[0].addEventListener('click', event => {
					if (video && video.readyState > 0)
						video.currentTime = event.currentTarget.parentNode._cueTime;
				});
			}

			if (video)
				video.addEventListener('timeupdate', scroll);
		});

		element.addEventListener('config-autoscroll', event => {
			if (event.detail?.target?.checked !== undefined)
				autoscroll = event.detail.target.checked;
		});

		function scroll(event) {
			if (!autoscroll)
				return;

			const time = event.currentTarget.currentTime;

			const item = Array.from(list.children).filter(child => child.tagName == 'LI').reduce((acc, val) =>
					Math.abs(val._cueTime - time) < Math.abs(acc._cueTime - time) ? val : acc);

			item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
		}
	});
} });
