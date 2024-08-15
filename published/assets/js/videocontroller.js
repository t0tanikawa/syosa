'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		Static.registerElement(element);

		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);

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

		let duration = '';
		let isSeeking = false;

		// default value will set immediately after DOM loaded by config
		let framerate = 1;

		element.addEventListener('config-framerate', event => {
			if (event.detail?.target?.value !== undefined)
				framerate = Number(event.detail.target.value);
		});

		video.addEventListener('loadeddata', event => {
			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-video-ready' });
			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-video-stop' });

			event.currentTarget.currentTime = 0;

			if (timecode)
				duration = new Date(event.currentTarget.duration * 1000).toISOString().slice(11,19);
		});

		video.addEventListener('ended', event => {
			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-video-stop' });

			if (!isSeeking)
				event.currentTarget.currentTime = 0;
		});

		video.addEventListener('pause', event => {
			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-video-stop' });
		});

		video.addEventListener('play', event => {
			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-video-play' });
		});

		video.addEventListener('timeupdate', event => {
			if (seek)
				seek.value = event.currentTarget.currentTime / event.currentTarget.duration;

			if (timecode)
				timecode.textContent = new Date(event.currentTarget.currentTime * 1000).toISOString().slice(11,19) + ' / ' + duration;
		});

		if (play) {
			play.addEventListener('change', event => {
				if (event.currentTarget.checked)
					video.play();
				else
					video.pause();
			});
		}

		if (prev) {
			prev.addEventListener('click', event => {
				if (!prev.hasAttribute('disabled') && video.paused)
					video.currentTime -= 1 / framerate;
			});
		}

		if (seek) {
			seek.value = 0;

			seek.addEventListener('input', event => {
				video.currentTime = video.duration * event.currentTarget.value;
			});

			seek.addEventListener('mousedown', event => {
				isSeeking = true;
			});

			seek.addEventListener('mouseup', event => {
				isSeeking = false;
			});

			seek.addEventListener('keydown', event => {
				isSeeking = true;
			});

			seek.addEventListener('keyup', event => {
				isSeeking = false;
			});
		}

		if (next) {
			next.addEventListener('click', event => {
				if (!next.hasAttribute('disabled') && video.paused)
					video.currentTime += 1 / framerate;
			});
		}

		if (mute) {
			mute.addEventListener('change', event => {
				video.muted = event.currentTarget.checked;

				if (volume) {
					if (event.currentTarget.checked)
						Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-mute' });
					else
						Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'videocontroller-unmute' });
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
			split.addEventListener('click', event => {
				if (!split.hasAttribute('disabled'))
					// not implemented
					return;
			});
		}
	});
} });
