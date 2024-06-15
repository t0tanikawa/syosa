'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';
	const GRAPHID_ATTR_NAME = '_graphid';
	const SPLASHID_ATTR_NAME = '_splashid';
	const STOPBUTTONID_ATTR_NAME = '_stopbuttonid';
	const ANALYZEMODALBUTTONID_ATTR_NAME = '_analyzemodalbuttonid';
	const ANALYZEBUTTONID_ATTR_NAME = '_analyzebuttonid';
	const KEEPPERSONCHECKBOXID_ATTR_NAME = '_keeppersoncheckboxid';
	const ADDBUTTONID_ATTR_NAME = '_addbuttonid';
	const DELETEBUTTONID_ATTR_NAME = '_deletebuttonid';
	const MERGEBUTTONID_ATTR_NAME = '_mergebuttonid';
	const SAVEMODALBUTTONID_ATTR_NAME = '_savemodalbuttonid';
	const SAVEBUTTONID_ATTR_NAME = '_savebuttonid';
	const LOADMODALID_ATTR_NAME = '_loadmodalid';
	const LOADBUTTONID_ATTR_NAME = '_loadbuttonid';
	const DRAWHUMANCHECKBOXID_ATTR_NAME = '_drawhumancheckboxid';
	const FRAMERATERANGEID_ATTR_NAME = '_frameraterangeid';
	const MAXDETECTEDRANGEID_ATTR_NAME = '_maxdetectedrangeid';
	const FACESCORERANGEID_ATTR_NAME = '_facescorerangeid';
	const SIMILARITYRANGEID_ATTR_NAME = '_similarityrangeid';

	const FRAMERATE_DEFAULT = 10;
	const MAXDETECTED_DEFAULT = 2;
	const FACESCORE_DEFAULT = 1;
	const SIMILARITY_DEFAULT = 0.5;
	const FACE_ICON_SIZE = 64;
	const ANALYZED_FILE_EXTENSION = '.syosa';
	const CLASS_HIDE = '_hide';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);
		const graph = element.getElementFromAttribute(GRAPHID_ATTR_NAME);
		const splash = element.getElementFromAttribute(SPLASHID_ATTR_NAME);
		const stopButton = element.getElementFromAttribute(STOPBUTTONID_ATTR_NAME);
		const analyzeModalButton = element.getElementFromAttribute(ANALYZEMODALBUTTONID_ATTR_NAME);
		const analyzeButton = element.getElementFromAttribute(ANALYZEBUTTONID_ATTR_NAME);
		const keepPersonCheckbox = element.getElementFromAttribute(KEEPPERSONCHECKBOXID_ATTR_NAME);
		const addButton = element.getElementFromAttribute(ADDBUTTONID_ATTR_NAME);
		const deleteButton = element.getElementFromAttribute(DELETEBUTTONID_ATTR_NAME);
		const mergeButton = element.getElementFromAttribute(MERGEBUTTONID_ATTR_NAME);
		const saveModalButton = element.getElementFromAttribute(SAVEMODALBUTTONID_ATTR_NAME);
		const saveButton = element.getElementFromAttribute(SAVEBUTTONID_ATTR_NAME);
		const loadModal = element.getElementFromAttribute(LOADMODALID_ATTR_NAME);
		const loadButton = element.getElementFromAttribute(LOADBUTTONID_ATTR_NAME);
		const drawHumanCheckbox = element.getElementFromAttribute(DRAWHUMANCHECKBOXID_ATTR_NAME);
		const framerateRange = element.getElementFromAttribute(FRAMERATERANGEID_ATTR_NAME);
		const maxDetectedRange = element.getElementFromAttribute(MAXDETECTEDRANGEID_ATTR_NAME);
		const faceScoreRange = element.getElementFromAttribute(FACESCORERANGEID_ATTR_NAME);
		const similarityRange = element.getElementFromAttribute(SIMILARITYRANGEID_ATTR_NAME);

		const canvas = element.getElementsByTagName('canvas')[0];
		const novideo = element.getElementsByTagName('span')[0];

		// nothing to do if there is no video nor canvas
		if (!video || !canvas)
			return;

		let isHumanReady = false;
		let isAnalyzing = false;
		let afterWarmupAction;
		let intervalId;
		let analyzedData;
		let analyzedFile;

		// create Human
		const human = new Human.Human({
			modelBasePath: './models',
			backend: 'webgl',
		});

		// config Human
		human.config.face.detector.rotation = true;
		human.config.body.modelPath = 'posenet.json';

		// 0. initial state
		if (analyzeModalButton)
			Static.disableInput(analyzeModalButton);

		if (addButton)
			Static.disableInput(addButton);

		if (saveModalButton)
			Static.disableInput(saveModalButton);

		// 1. when new video source is ready, resize canvas, draw first frame, hide novideo splash, and enable analyze modal button
		video.addEventListener('loadeddata', event => {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			dispatchEvent(new Event('resize'));
			drawFrame();
			if (novideo)
				novideo.classList.add(CLASS_HIDE);
			if (analyzeModalButton)
				Static.enableInput(analyzeModalButton)
			if (addButton)
				Static.enableInput(addButton)
		});

		// 2. video play and seek operation
		video.addEventListener('play', event => {
			intervalId = setInterval(() => {
				// should be decide that redraw is needed
				drawFrame();
			}, 1000 / 30);
		});

		video.addEventListener('pause', event => {
			clearInterval(intervalId);
		});

		video.addEventListener('seeked', event => {
			drawFrame();
		});

		drawHumanCheckbox.addEventListener('change', event => {
			drawFrame();
		});

		canvas.addEventListener('click', event => {
			if (video.readyState > 0) {
				if (video.paused)
					video.play();
				else
					video.pause();
			}
		});

		// 3. when analyze modal button is pressed, change enable/disable of keep person checkbox according to if person is empty or not
		if (analyzeModalButton) {
			analyzeModalButton.addEventListener('click', event => {
				if (analyzedData && analyzedData.faces?.length > 0)
					Static.enableInput(keepPersonCheckbox);
				else
					Static.disableInput(keepPersonCheckbox);
			});
		}

		// 4. when analyze button is pressed, stop and rewind video, clear results, initialize graph, fade in splash screen, and start analyzing or loading for first time
		if (analyzeButton) {
			analyzeButton.addEventListener('click', event => {
				video.pause();
				video.currentTime = 0;

				analyzedData = { faces: (keepPersonCheckbox && keepPersonCheckbox.checked && analyzedData?.faces) ? analyzedData.faces : [], results: [] };

				if (graph)
					graph.dispatchEvent(new CustomEvent(Static.EVENT_INIT, { detail: { video, keepGraph: keepPersonCheckbox && keepPersonCheckbox.checked } }));

				if (isHumanReady) {
					if (splash) {
						splash.dispatchEvent(new CustomEvent(Static.EVENT_ENABLE));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_SHOWBUTTON));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'none' } }));
					}
					startAnalyze();
				} else {
					if (splash) {
						splash.dispatchEvent(new CustomEvent(Static.EVENT_ENABLE));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_HIDEBUTTON));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'loading' } }));
					}
					afterWarmupAction = 'startanalyze';
					human.load();
					human.warmup();
				}
			});
		}

		// 5. when add button is pressed, force analyzing and add faces
		if (addButton) {
			addButton.addEventListener('click', event => {
				if (!analyzedData)
					analyzedData = { faces: [], results: [] };

				if (graph && analyzedData.faces.length == 0)
					graph.dispatchEvent(new CustomEvent(Static.EVENT_INIT, { detail: { video } }));

				if (isHumanReady) {
					analyzeFace();
				} else {
					if (splash) {
						splash.dispatchEvent(new CustomEvent(Static.EVENT_ENABLE));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_HIDEBUTTON));
						splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'loading' } }));
					}
					afterWarmupAction = 'analyzeface';
					human.load();
					human.warmup();
				}
			});
		}

		// 6. update status after loading
		human.events.addEventListener('load', event => {
			if (splash)
				splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'warmup' } }));
		});

		// 7. when preparations are complete, start analyzing
		human.events.addEventListener('warmup', event => {
			isHumanReady = true;
			switch (afterWarmupAction) {
				case 'startanalyze':
					if (splash)
						splash.dispatchEvent(new CustomEvent(Static.EVENT_SHOWBUTTON));
					startAnalyze();
					break;
				case 'analyzeface':
					analyzeFace();
					if (splash)
						splash.dispatchEvent(new CustomEvent(Static.EVENT_DISABLE));
					break;
			}
		});

		// 8. when video reached at the end, stop analyzing, fade out splash screen, draw graph and enable save modal button
		video.addEventListener('ended', event => {
			if (isAnalyzing) {
				stopAnalyze();
				if (splash)
					splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'drawing' } }));
				if (graph)
					graph.dispatchEvent(new CustomEvent(Static.EVENT_DRAWGRAPH, { detail: { analyzedData } }));
				if (splash)
					splash.dispatchEvent(new CustomEvent(Static.EVENT_DISABLE));
				if (saveModalButton)
					Static.enableInput(saveModalButton);
			}
		});

		// 9. when stop button is pressed, force ended event
		if (stopButton) {
			stopButton.addEventListener('click', event => {
				video.dispatchEvent(new Event('ended'));
			});
		}

		// 10. when delete button is pressed, process data and redraw graph
		if (deleteButton) {
			deleteButton.addEventListener('click', event => {
				if (!graph || !(graph._selections?.length && graph._selections.length > 0))
					return;

				applyName();

				const sourceIndexes = graph._selections;

				analyzedData.results.forEach(result => {
					// mark index as deleted
					sourceIndexes.forEach(sourceIndex => {
						const source = result.personResults.find(personResult => personResult.index == sourceIndex);
						if (source)
							source.index = -1;
					});

					// shift index and remove gap
					result.personResults.forEach(personResult => {
						if (personResult.index < 0)
							return;

						personResult.index -= sourceIndexes.filter(sourceIndex => sourceIndex < personResult.index).length;
					});
				});

				// remove faces
				sourceIndexes.sort((a, b) => b - a).forEach(sourceIndex => {
					analyzedData.faces.splice(sourceIndex, 1);
				});

				redrawGraph();
			});
		}

		// 11. when merge button is pressed, process data and redraw graph
		if (mergeButton) {
			mergeButton.addEventListener('click', event => {
				if (!graph || !(graph._selections?.length && graph._selections.length > 1))
					return;

				applyName();

				const targetIndex = graph._selections[0];
				const sourceIndexes = graph._selections.slice(1);

				analyzedData.results.forEach(result => {
					// remap index in first come first priority rule
					sourceIndexes.forEach(sourceIndex => {
						const source = result.personResults.find(personResult => personResult.index == sourceIndex);
						const target = result.personResults.find(personResult => personResult.index == targetIndex);
						if (source)
							source.index = target ? -1 : targetIndex;
					});

					// shift index and remove gap
					result.personResults.forEach(personResult => {
						if (personResult.index < 0)
							return;

						personResult.index -= sourceIndexes.filter(sourceIndex => sourceIndex < personResult.index).length;
					});
				});

				// remove faces
				sourceIndexes.sort((a, b) => b - a).forEach(sourceIndex => {
					analyzedData.faces.splice(sourceIndex, 1);
				});

				redrawGraph();
			});
		}

		// 12. when save button is pressed, save analyzed data
		if (saveButton) {
			saveButton.addEventListener('click', event => {
				const filename = (video._filename ? video._filename : (video.src ? video.src : analyzedFile.name)).replace(/^.*\//, '').replace(/\..*$/, '');
				if (!filename)
					return;

				applyName();

				const json = JSON.stringify(analyzedData);
				const blob = new Blob([json], { type: 'application/json' });
				const url = URL.createObjectURL(blob);

				const a = document.createElement('a');
				a.href = url;
				a.download = filename + ANALYZED_FILE_EXTENSION;
				a.click();

				URL.revokeObjectURL(url)
			});
		}

		// 13. when the analyzed file is provided, store it and display a modal
		element.addEventListener(Static.EVENT_LOAD, event => {
			analyzedFile = event.detail?.file;

			if (loadModal)
				new bootstrap.Modal(loadModal).show();
		});

		// 14. when load button is pressed, load data
		if (loadButton) {
			loadButton.addEventListener('click', event => {
				const reader = new FileReader();
				if (analyzedFile)
					reader.readAsArrayBuffer(analyzedFile);

				reader.addEventListener('load', event => {
					try {
						analyzedData = JSON.parse(new TextDecoder().decode(event.currentTarget.result));
					} catch (e) {
						console.log('JSON.parse(): Error occured:', e);
						analyzedData = { faces: [], results: [] };
					}

					redrawGraph();

					if (saveModalButton)
						Static.enableInput(saveModalButton);
				});
			});
		}

		// 15. when maxdetected range changed, update human's config
		if (maxDetectedRange) {
			maxDetectedRange.addEventListener('change', event => {
				human.config.face.detector.maxDetected = event.currentTarget.value;
				human.config.body.maxDetected = event.currentTarget.value;
			});
			maxDetectedRange.dispatchEvent(new Event('change'));
		}

		function startAnalyze() {
			// requestAnimationFrame()だけを使った場合、videoのシークの完了を待たずに解析処理が行われてしまうため正しく動作しない
			// videoのシークが完了するタイミングでフレームの解析処理を行えばrequestAnimationFrame()を使う必要はない
			/*
			animationFrameId = Static.animationFrameFactory(analyzeLoop);
			*/
			// register analyzeLoop() and kick seeking
			isAnalyzing = true;
			video.addEventListener('seeked', analyzeLoop);
			video.dispatchEvent(new Event('seeked'));
		}

		function stopAnalyze() {
			/*
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId.id);
				animationFrameId = null;
			}
			*/
			// unregister analyzeLoop()
			video.removeEventListener('seeked', analyzeLoop);
			isAnalyzing = false;
		}

		async function analyzeLoop() {
			// update progress
			if (splash)
				splash.dispatchEvent(new CustomEvent(Static.EVENT_UPDATESTATUS, { detail: { stage: 'analyzing', post: `${(video.currentTime / video.duration * 100).toFixed()}%` } }));

			// videoのシークと解析処理は同期的に行う必要がある
			//
			// do single frame analyzing
			await analyzeFrame();

			// seek video to the next frame
			video.currentTime += 1 / (framerateRange ? framerateRange.value : FRAMERATE_DEFAULT);

			// for fail safe (when video reaches at the end of video, it normally fires ended event automatically)
			if (video.currentTime >= video.duration)
				video.dispatchEvent(new Event('ended'));
		}

		async function analyzeFrame() {
			const result = await human.detect(video);

			// draw current video frame
			human.draw.canvas(result.canvas, canvas);

			const embeddings = analyzedData.faces.map(face => face.embedding);
			const personResults = [];

			// for each detected person
			result.persons.forEach(person => {
				// filter by face score
				if (person.face.faceScore < (faceScoreRange ? faceScoreRange.value : FACESCORE_DEFAULT))
					return;

				// ident person within the existing faces
				const personIdent = human.match.find(person.face.embedding, embeddings);

				// if there is no similar person in the faces or it's similarity is lower than threashold, add it as a new person
				if (personIdent.index < 0
						|| personIdent.similarity < (similarityRange ? similarityRange.value : SIMILARITY_DEFAULT)) {

					// clip face region from canvas as a DataURL
					const faceDataURL = createImageAsDataURL(canvas, person.face.box, FACE_ICON_SIZE, FACE_ICON_SIZE);

					// create new graph row
					if (graph)
						graph.dispatchEvent(new CustomEvent(Static.EVENT_ADDPERSON, { detail: { faceDataURL } }));

					// push person as a new person
					personIdent.index = analyzedData.faces.push({ embedding: person.face.embedding, image: faceDataURL }) - 1;
				}

				// push current person result
				personResults.push({ index: personIdent.index, result: structuredClone(person) });
			});

			// push whole person result of current frame
			analyzedData.results.push({ time: video.currentTime, personResults });

			// 解析中の解析結果表示は意味がないので行わない
			/*
			// draw result
			if (drawHumanCheckbox && drawHumanCheckbox.checked) {
				human.draw.face(canvas, result.face);
				human.draw.body(canvas, result.body);
				human.draw.hand(canvas, result.hand);
				human.draw.gesture(canvas, result.gesture);
			}
			*/
		}

		async function analyzeFace() {
			const result = await human.detect(video);

			// need to avoid influence of face icon from human results 
			human.draw.canvas(result.canvas, canvas);

			result.persons.forEach(person => {
				const faceDataURL = createImageAsDataURL(canvas, person.face.box, FACE_ICON_SIZE, FACE_ICON_SIZE);

				if (graph)
					graph.dispatchEvent(new CustomEvent(Static.EVENT_ADDPERSON, { detail: { faceDataURL } }));

				analyzedData.faces.push({ embedding: person.face.embedding, image: faceDataURL });
			});

			// resume current canvas
			drawFrame();
		}

		function createImageAsDataURL(canvas, region, sx, sy) {
			const imageCanvas = document.createElement('canvas');
			imageCanvas.width = sx;
			imageCanvas.height = sy;

			imageCanvas.getContext('2d').drawImage(canvas, ...region, 0, 0, imageCanvas.width, imageCanvas.height);

			return imageCanvas.toDataURL('image/png');
		}

		function drawFrame() {
			// drawFrame() is available only at idle state
			if (isAnalyzing)
				return;

			if (isHumanReady && drawHumanCheckbox && drawHumanCheckbox.checked) {
				human.detect(video).then(result => {
					human.draw.canvas(result.canvas, canvas);
					human.draw.face(canvas, result.face);
					human.draw.body(canvas, result.body);
					human.draw.hand(canvas, result.hand);
					human.draw.gesture(canvas, result.gesture);
				});
			} else {
				canvas.getContext('2d').drawImage(video, 0, 0);
			}
		}

		function redrawGraph() {
			if (graph) {
				graph.dispatchEvent(new CustomEvent(Static.EVENT_INIT, { detail: { video } }));

				analyzedData.faces.forEach(face => {
					graph.dispatchEvent(new CustomEvent(Static.EVENT_ADDPERSON, { detail: { faceDataURL: face.image, name: face.name } }));
				});

				graph.dispatchEvent(new CustomEvent(Static.EVENT_DRAWGRAPH, { detail: { analyzedData } }));
			}
		}

		function applyName() {
			graph._names.forEach((name, index) => {
				if (index < analyzedData.faces.length)
					analyzedData.faces[index].name = name;
				else
					// something is wrong
					return;
			});
		}
	});
} });
