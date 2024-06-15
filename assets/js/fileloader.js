'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';
	const TIMELINEID_ATTR_NAME = '_timelineid';
	const ANALYZERID_ATTR_NAME = '_analyzerid';
	const BUTTONID_ATTR_NAME = '_buttonid';

	const VIDEO_FILE_EXTENSIONS = 'mp4|webm|ogv';
	const VTT_FILE_EXTENSIONS = 'vtt';
	const ANALYZED_FILE_EXTENSIONS = 'syosa';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);
		const timeline = element.getElementFromAttribute(TIMELINEID_ATTR_NAME);
		const analyzer = element.getElementFromAttribute(ANALYZERID_ATTR_NAME);

		// for Drag and Drop File Input Component
		if (element.tagName == 'INPUT' && element.type == 'file') {
			element.addEventListener('change', event => {
				if (!event.currentTarget.files)
					return;

				const files = Array.from(event.currentTarget.files);

				const videoFile = files.find(file => file.name.match(`.(${VIDEO_FILE_EXTENSIONS})$`));
				if (videoFile && video) {
					video.src = URL.createObjectURL(videoFile);
					video._filename = videoFile.name;
				}

				const vttFile = files.find(file => file.name.match(`.(${VTT_FILE_EXTENSIONS})$`));
				if (vttFile)
					handleTrack(URL.createObjectURL(vttFile));

				const analyzedFile = files.find(file => file.name.match(`.(${ANALYZED_FILE_EXTENSIONS})$`));
				if (analyzedFile && analyzer)
					analyzer.dispatchEvent(new CustomEvent(Static.EVENT_LOAD, { detail: { file: analyzedFile } }));
			});
		}

		// for url input field (need button)
		if (element.tagName == 'INPUT' && element.type == 'url') {
			const button = element.getElementFromAttribute(BUTTONID_ATTR_NAME);
			if (!button)
				return;

			button.addEventListener('click', event => {
				const URLs = [];
				URLs.push(element.value);

				const videoURL = URLs.find(URL => URL.match(`.(${VIDEO_FILE_EXTENSIONS})$`));
				if (videoURL && video)
					video.src = videoURL;

				const vttURL = URLs.find(URL => URL.match(`.(${VTT_FILE_EXTENSIONS})$`));
				if (vttURL)
					handleTrack(vttURL);

				/*
				// currently, analyzed data from the network is not supported
				const analyzedURL = URLs.find(URL => URL.match(`.(${ANALYZED_FILE_EXTENSIONS})$`));
				if (analyzedURL && analyzer)
					analyzer.dispatchEvent(new CustomEvent(Static.EVENT_LOAD, { detail: { src: analyzedURL } }));
				*/
			});
		}

		function handleTrack(src) {
			const track = document.createElement('track');

			Object.assign(track, {
				src,
				kind: 'captions',
				label: 'captions',
				default: true
			});

			const textTrack = track.track;

			// video要素に既に表示されている字幕がある場合、新しい字幕を追加するとdefaultがtrueであるにも関わらず非表示になる
			// その対策として字幕のmodeを強制的にshowingに設定する
			textTrack.mode = 'showing';

			if (timeline) {
				track.addEventListener('load', event => {
					timeline.dispatchEvent(new CustomEvent(Static.EVENT_LOAD, { detail: { textTrack, video } }));
				}, { once: true });
			}

			if (video) {
				Array.from(video.children).filter(child => child.tagName == 'TRACK').forEach(child => child.remove());
				video.appendChild(track);
			}
		}
	});
} });
