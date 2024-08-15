'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const VIDEOID_ATTR_NAME = '_videoid';

	//const DRAW_PERIOD = 20;
	const FACE_ICON_SIZE = 64;
	const ANALYZED_FILE_VERSION = 1;
	const ANALYZED_FILE_EXTENSION = '.syosa';
	const CLASS_HIDE = 'd-none';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		Static.registerElement(element);

		const video = element.getElementFromAttribute(VIDEOID_ATTR_NAME);

		const canvas = element.getElementsByTagName('canvas')[0];
		const novideo = element.getElementsByTagName('span')[0];

		// nothing to do if there is no video nor canvas
		if (!video || !canvas)
			return;

		let isHumanReady = false;
		let isAnalyzing = false;
		let afterWarmupAction = '';
		let intervalId = null;
		let analyzedData = null;
		let analyzedFile = null;
		//let drawPosition = 0;

		let selections = null;
		let names = null;

		// default value will set immediately after DOM loaded by config
		let framerate = 1;
		let maxDetected = 1;
		let faceScoreThreshold = 1;
		let confidenceThreshold = 0.5;
		let positionWeight = 0;
		let drawHuman = false;
		let fullSave = false;
		let keepFaces = false;

		// create Human
		const human = new Human.Human({
			modelBasePath: './models',
			backend: 'webgl',
		});

		// config Human
		human.config.face.detector.rotation = true;
		human.config.body.modelPath = 'posenet.json';

		// 1. when new video source is ready, resize canvas, draw first frame, hide novideo splash, and enable analyze modal button
		video.addEventListener('loadeddata', event => {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			dispatchEvent(new Event('resize'));

			drawFrame();

			if (novideo)
				novideo.classList.add(CLASS_HIDE);

			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'analyzer-analyze-ready' });
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

		canvas.addEventListener('click', event => {
			if (video.readyState > 0) {
				if (video.paused)
					video.play();
				else
					video.pause();
			}
		});

		// 3. when analyze button is pressed, stop and rewind video, clear results, initialize graph, fade in splash screen, and start analyzing or loading for first time
		element.addEventListener('button-analyze', event => {
			video.pause();
			video.currentTime = 0;

			analyzedData = {
				version: ANALYZED_FILE_VERSION,
				fullSave,
				config: {
					framerate,
					maxDetected,
					faceScoreThreshold,
					confidenceThreshold,
					positionWeight
				},
				faces: (keepFaces && analyzedData?.faces) ? analyzedData.faces : [],
				results: []
			};

			Static.dispatchEvent(Static.EVENT_INITGRAPH, { video, keepGraph: keepFaces, refsCB: refs => {
				selections = refs.selections;
				names = refs.names;
			} });

			if (isHumanReady) {
				Static.dispatchEvent(Static.EVENT_SHOWSPLASH);
				Static.dispatchEvent(Static.EVENT_SHOWBUTTON);
				Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'none' });
				startAnalyze();
			} else {
				Static.dispatchEvent(Static.EVENT_SHOWSPLASH);
				Static.dispatchEvent(Static.EVENT_HIDEBUTTON);
				Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'loading' });
				afterWarmupAction = 'startanalyze';
				human.load();
				human.warmup();
			}
		});

		// 4. when add face button is pressed, force analyzing and add faces
		element.addEventListener('button-addface', event => {
			if (!analyzedData)
				analyzedData = { faces: [], results: [] };

			if (analyzedData.faces.length == 0)
				Static.dispatchEvent(Static.EVENT_INITGRAPH, { video, refsCB: refs => {
					selections = refs.selections;
					names = refs.names;
				} });


			if (isHumanReady) {
				analyzeFace();
			} else {
				Static.dispatchEvent(Static.EVENT_SHOWSPLASH);
				Static.dispatchEvent(Static.EVENT_HIDEBUTTON);
				Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'loading' });
				afterWarmupAction = 'analyzeface';
				human.load();
				human.warmup();
			}
		});

		// 5. update status after loading
		human.events.addEventListener('load', event => {
			Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'warmup' });
		});

		// 6. when preparations are complete, start analyzing
		human.events.addEventListener('warmup', event => {
			isHumanReady = true;
			switch (afterWarmupAction) {
				case 'startanalyze':
					Static.dispatchEvent(Static.EVENT_SHOWBUTTON);
					startAnalyze();
					break;
				case 'analyzeface':
					analyzeFace();
					Static.dispatchEvent(Static.EVENT_HIDESPLASH);
					break;
				case 'none':
					Static.dispatchEvent(Static.EVENT_HIDESPLASH);
					break;
			}
		});

		// 7. when video reached at the end, stop analyzing, fade out splash screen, draw graph and enable save modal button
		video.addEventListener('ended', event => {
			if (isAnalyzing) {
				stopAnalyze();
				Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'drawing' });
				Static.dispatchEvent(Static.EVENT_DRAWGRAPH, { analyzedData });
				Static.dispatchEvent(Static.EVENT_HIDESPLASH);

				updateFaceEmptyState();
			}
		});

		// 8. when cancel button is pressed, force ended event
		element.addEventListener('button-cancel', event => {
			video.dispatchEvent(new Event('ended'));
		});

		// 9. when delete face button is pressed, process data and redraw graph
		element.addEventListener('button-deleteface', event => {
			if (selections.length < 1)
				return;

			applyName();

			const sourceIndexes = selections;

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

			updateFaceEmptyState();

			redrawGraph();
		});

		// 10. when merge face button is pressed, process data and redraw graph
		element.addEventListener('button-mergeface', event => {
			if (selections.length < 2)
				return;

			applyName();

			const targetIndex = selections[0];
			const sourceIndexes = selections.slice(1);

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

			updateFaceEmptyState();

			redrawGraph();
		});

		// 11. when save button is pressed, save analyzed data
		element.addEventListener('button-save', event => {
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

		// 12. when the analyzed file is provided, store it and display a modal
		element.addEventListener(Static.EVENT_LOADANALYZEDDATA, event => {
			analyzedFile = event.detail?.file;

			Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'analyzer-file-ready' });
		});

		// 13. when load button is pressed, load data
		element.addEventListener('button-load', event => {
			const reader = new FileReader();
			if (analyzedFile)
				reader.readAsArrayBuffer(analyzedFile);

			reader.addEventListener('load', event => {
				try {
					analyzedData = JSON.parse(new TextDecoder().decode(event.currentTarget.result));
					if (analyzedData.version === undefined || analyzedData.version < ANALYZED_FILE_VERSION)
						analyzedData = null;
				} catch (e) {
					console.error('JSON.parse(): Error occured:', e);
					analyzedData = null;
				}

				if (!analyzedData) {
					Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'analyzer-file-error' });

					return;
				}

				if (!isHumanReady) {
					Static.dispatchEvent(Static.EVENT_SHOWSPLASH);
					Static.dispatchEvent(Static.EVENT_HIDEBUTTON);
					Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'loading' });
					afterWarmupAction = 'none';
					human.load();
					human.warmup();
				}

				updateFaceEmptyState();

				redrawGraph();
			});
		});

		// update parameters
		element.addEventListener('config-framerate', event => {
			if (event.detail?.target?.value !== undefined)
				framerate = Number(event.detail.target.value);
		});

		element.addEventListener('config-maxdetected', event => {
			if (event.detail?.target?.value !== undefined) {
				maxDetected = Number(event.detail.target.value);

				human.config.face.detector.maxDetected = maxDetected;
				human.config.body.maxDetected = maxDetected;
			}
		});

		element.addEventListener('config-facescore', event => {
			if (event.detail?.target?.value !== undefined)
				faceScoreThreshold = Number(event.detail.target.value);
		});

		element.addEventListener('config-confidence', event => {
			if (event.detail?.target?.value !== undefined)
				confidenceThreshold = Number(event.detail.target.value);
		});

		element.addEventListener('config-positionweight', event => {
			if (event.detail?.target?.value !== undefined)
				positionWeight = Number(event.detail.target.value);
		});

		element.addEventListener('config-drawhuman', event => {
			if (event.detail?.target?.checked !== undefined) {
				drawHuman = event.detail.target.checked;

				drawFrame();
			}
		});

		element.addEventListener('config-fullsave', event => {
			if (event.detail?.target?.checked !== undefined) {
				fullSave = event.detail.target.checked;
			}
		});

		element.addEventListener('config-keepfaces', event => {
			if (event.detail?.target?.checked !== undefined)
				keepFaces = event.detail.target.checked;
		});

		function startAnalyze() {
			// requestAnimationFrame()だけを使った場合、videoのシークの完了を待たずに解析処理が行われてしまうため正しく動作しない
			// videoのシークが完了するタイミングでフレームの解析処理を行えばrequestAnimationFrame()を使う必要はない
			/*
			animationFrameId = Static.animationFrameFactory(analyzeLoop);
			*/
			// register analyzeLoop() and kick seeking
			isAnalyzing = true;
			//drawPosition = 0;
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
			Static.dispatchEvent(Static.EVENT_UPDATESTATUS, { stage: 'analyzing', post: `${(video.currentTime / video.duration * 100).toFixed()}%` });

			// videoのシークと解析処理は同期的に行う必要がある
			//
			// do single frame analyzing
			await analyzeFrame(video.currentTime);

			// seek video to the next frame
			video.currentTime += 1 / framerate;

			/*
			// draw graph in DRAW_PERIOD interval
			if (++drawPosition % DRAW_PERIOD == 0)
				Static.dispatchEvent(Static.EVENT_DRAWGRAPH, { analyzedData });
			*/

			// for fail safe (when video reaches at the end of video, it normally fires ended event automatically)
			if (video.currentTime >= video.duration)
				video.dispatchEvent(new Event('ended'));
		}

		async function analyzeFrame(time) {
			const result = await human.detect(video);

			// draw current video frame
			human.draw.canvas(result.canvas, canvas);

			const personResults = [];
			let votes = [];

			// for each detected person
			result.persons.forEach(personResult => {
				// filter by face score
				if (personResult.face.faceScore < faceScoreThreshold)
					return;

				// ident and get person candidates within the existing faces
				const personCandidates = findCandidates(personResult.face, analyzedData.faces);

				if (personCandidates.length > 0) {
					// for each candidate
					personCandidates.forEach(candidate => {
						// vote
						votes.push({ index: candidate.index, confidence: candidate.confidence, personResult });
					});
				} else {
					// if there is no candidates, add it as a new person

					// clip face region from canvas as a DataURL
					const faceDataURL = createImageAsDataURL(canvas, personResult.face.box, FACE_ICON_SIZE, FACE_ICON_SIZE);

					// create new graph row
					Static.dispatchEvent(Static.EVENT_ADDGRAPH, { faceDataURL });

					// push person as a new person
					const index = analyzedData.faces.push({ image: faceDataURL, embedding: personResult.face.embedding, time, boxRaw: personResult.face.boxRaw, age: personResult.face.age, gender: personResult.face.gender }) - 1;
					// push current person result
					// duplicate whole or a part of current person result according to config
					// global function structuredClone() does deep copy, while local function partialClone() does limited copy
					personResults.push({ index, result: fullSave ? structuredClone(personResult) : partialClone(personResult) });
				}

				// return list of person match candidates
				function findCandidates(inputFace, faces) {
					const result = [];

					// for each embedding of faces
					faces.forEach((face, index) => {
						// calculate similarity
						const similarity = human.match.similarity(inputFace.embedding, face.embedding);

						// calculate position score based on spatial distance
						const position = 1 - Math.abs(inputFace.boxRaw[0] - face.boxRaw[0]);

						const confidence = similarity * (1 - positionWeight) + position * positionWeight;

						// filter low confidence
						if (confidence < confidenceThreshold)
							return;

						// push to the result with index
						result.push({ index, confidence });
					});

					return result;
				}
			});

			// decide person and push its result
			votes.sort((a, b) => b.confidence - a.confidence);
			while (votes[0]) {
				const index = votes[0].index;
				const personResult = votes[0].personResult;

				// push result
				personResults.push({ index, result: fullSave ? structuredClone(personResult) : partialClone(personResult) });

				// exclude decided items
				votes = votes.filter(vote => vote.index != index && vote.personResult != personResult);
			}

			// push whole person result of current frame
			analyzedData.results.push({ time, personResults });

			// 解析中の解析結果表示は意味がないので行わない
			/*
			// draw result
			if (drawHuman) {
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

			result.persons.forEach(personResult => {
				const faceDataURL = createImageAsDataURL(canvas, personResult.face.box, FACE_ICON_SIZE, FACE_ICON_SIZE);

				Static.dispatchEvent(Static.EVENT_ADDGRAPH, { faceDataURL });

				analyzedData.faces.push({ embedding: personResult.face.embedding, image: faceDataURL });
			});

			// resume current canvas
			drawFrame();

			updateFaceEmptyState();
		}

		function createImageAsDataURL(canvas, region, sx, sy) {
			const imageCanvas = document.createElement('canvas');
			imageCanvas.width = sx;
			imageCanvas.height = sy;

			imageCanvas.getContext('2d').drawImage(canvas, ...region, 0, 0, imageCanvas.width, imageCanvas.height);

			return imageCanvas.toDataURL('image/png');
		}

		function partialClone(personResult) {
			return {
				face: {
					emotion: personResult.face.emotion.slice(),
					rotation: {
						angle: {
							pitch: personResult.face.rotation.angle.pitch,
							roll: personResult.face.rotation.angle.roll,
							yaw: personResult.face.rotation.angle.yaw
						}
					}
				},
				gestures: personResult.gestures.slice()
			};
		}

		function drawFrame() {
			// drawFrame() is available only at idle state
			if (isAnalyzing)
				return;

			if (isHumanReady && drawHuman) {
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
			Static.dispatchEvent(Static.EVENT_INITGRAPH, { video, refsCB: refs => {
				selections = refs.selections;
				names = refs.names;
			} });

			if (!analyzedData)
				return;

			analyzedData.faces.forEach(face => {
				Static.dispatchEvent(Static.EVENT_ADDGRAPH, { faceDataURL: face.image, name: face.name });
			});

			Static.dispatchEvent(Static.EVENT_DRAWGRAPH, { analyzedData });
		}

		function applyName() {
			names.forEach((name, index) => {
				if (index < analyzedData.faces.length)
					analyzedData.faces[index].name = name;
				else
					// something is wrong
					return;
			});
		}

		function updateFaceEmptyState() {
			if (analyzedData && analyzedData.faces?.length > 0)
				Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'analyzer-face-unempty' });
			else
				Static.dispatchEvent(Static.EVENT_CHANGESTATE, { state: 'analyzer-face-empty' });
		}
	});
} });
