'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';
	const FRAMERATERANGEID_ATTR_NAME = '_frameraterangeid';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);
		const framerateRange = element.getElementFromAttribute(FRAMERATERANGEID_ATTR_NAME);

		// assumes that each input element for control are layouted in a specified order
		const play = element.getElementsByTagName('input')[0];
		const prev = element.getElementsByTagName('svg')[0];
		const seek = element.getElementsByTagName('input')[1];
		const next = element.getElementsByTagName('svg')[1];
		const timecode = element.getElementsByTagName('span')[0];
		const mute = element.getElementsByTagName('input')[2];
		const volume = element.getElementsByTagName('input')[3];
		const split = element.getElementsByTagName('svg')[2];

		if (!video)
			return;

		let seekSpan = 0;

		if (play) {
			Static.disableInput(play);

			play.addEventListener('change', event => {
				if (event.currentTarget.checked)
					video.play();
				else
					video.pause();
			});

			video.addEventListener('loadeddata', event => {
				play.checked = false;
				Static.enableInput(play);
			});

			video.addEventListener('ended', event => {
				play.checked = false;
			});

			video.addEventListener('pause', event => {
				play.checked = false;
			});

			video.addEventListener('play', event => {
				play.checked = true;
			});
		}

		if (prev) {
			prev.setAttribute('disabled', '');

			prev.addEventListener('click', event => {
				if (!prev.hasAttribute('disabled') && video.paused)
					video.currentTime -= seekSpan;
			});

			video.addEventListener('loadeddata', event => {
				prev.removeAttribute('disabled');
			});
		}

		if (seek) {
			Static.disableInput(seek);
			seek.value = 0;

			seek.addEventListener('input', event => {
				video.currentTime = video.duration * event.currentTarget.value;
			});

			video.addEventListener('loadeddata', event => {
				seek.value = 0;
				Static.enableInput(seek);
			});

			video.addEventListener('timeupdate', event => {
				seek.value = event.currentTarget.currentTime / event.currentTarget.duration;
			});
		}

		if (next) {
			next.setAttribute('disabled', '');

			next.addEventListener('click', event => {
				if (!next.hasAttribute('disabled') && video.paused)
					video.currentTime += seekSpan;
			});

			video.addEventListener('loadeddata', event => {
				next.removeAttribute('disabled');
			});
		}

		if (timecode) {
			let duration = '';

			video.addEventListener('loadeddata', event => {
				duration = new Date(event.currentTarget.duration * 1000).toISOString().slice(11,19);
				event.currentTarget.dispatchEvent(new Event('timeupdate'));
			});

			video.addEventListener('timeupdate', event => {
				timecode.textContent = new Date(event.currentTarget.currentTime * 1000).toISOString().slice(11,19) + ' / ' + duration;
			});
		}

		if (mute) {
			mute.addEventListener('change', event => {
				video.muted = event.currentTarget.checked;

				if (volume) {
					if (event.currentTarget.checked)
						Static.disableInput(volume);
					else
						Static.enableInput(volume);
				}
			});
			mute.dispatchEvent(new Event('change'));
		}

		if (volume) {
			volume.addEventListener('input', event => {
				video.volume = event.currentTarget.value;
			});
			volume.dispatchEvent(new Event('input'));
		}

		if (split) {
			split.setAttribute('disabled', '');

			split.addEventListener('click', event => {
				if (!split.hasAttribute('disabled'))
					// not implemented
					return;
			});

			// do not activate until implement finished
			/*
			video.addEventListener('loadeddata', event => {
				split.removeAttribute('disabled');
			});
			*/
		}

		if (framerateRange) {
			framerateRange.addEventListener('change', event => {
				seekSpan = 1 / framerateRange.value;
			});

			video.addEventListener('loadeddata', event => {
				framerateRange.dispatchEvent(new Event('change'));
			});
		}
	});
} });
