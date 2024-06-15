'use strict';

document.addEventListener('DOMContentLoaded', { addonName: Static.selfJS(), handleEvent: function () {
	const UNCHECKALLBUTTONID_ATTR_NAME = '_uncheckallbuttonid';
	const RESETZOOMBUTTONID_ATTR_NAME = '_resetzoombuttonid';
	const DELETEMODALBUTTONID_ATTR_NAME = '_deletemodalbuttonid';
	const MERGEMODALBUTTONID_ATTR_NAME = '_mergemodalbuttonid';
	const SYNCGRAPHCHECKBOXID_ATTR_NAME = '_syncgraphcheckboxid';

	document.querySelectorAll(`[${Static.ADDON_ATTR_NAME}~="${this.addonName}"]`).forEach(element => {
		const uncheckAllButton = element.getElementFromAttribute(UNCHECKALLBUTTONID_ATTR_NAME);
		const resetZoomButton = element.getElementFromAttribute(RESETZOOMBUTTONID_ATTR_NAME);
		const deleteModalButton = element.getElementFromAttribute(DELETEMODALBUTTONID_ATTR_NAME);
		const mergeModalButton = element.getElementFromAttribute(MERGEMODALBUTTONID_ATTR_NAME);
		const syncGraphCheckbox = element.getElementFromAttribute(SYNCGRAPHCHECKBOXID_ATTR_NAME);
		const template = element.getElementsByTagName('template')[0];
		if (!template)
			return;

		// common options constructor for entire charts
		function ChartOptions() {
			this.aspectRatio = 3.5;
			this.scales = {
				x: {
					type: 'time',
					time: {
						unit: 'second',
						displayFormats: {
							second: 'HH:mm:ss'
						}
					},
					ticks: {
						maxTicksLimit: 15
					},
					min: absMSec(0),
					max: absMSec(video ? video.duration : 0)
				}
			};
			this.events = ['click'];
			this.onClick = event => seekVideo(event);
			this.plugins = {
				tooltip: {
					enabled: false
				},
				zoom: {
					zoom: {
						wheel: {
							enabled: true,
							modifierKey: 'shift'
						},
						drag: {
							enabled: true,
							modifierKey: 'shift'
						},
						mode: 'x',
						onZoom: event => syncGraph(event)
					},
					pan: {
						enabled: true,
						mode: 'x',
						onPan: event => syncGraph(event)
					},
					limits: {
						x: {
							minRange: 10000
						}
					}
				}
			};

			function seekVideo(event) {
				if (video && video.readyState > 0)
					video.currentTime = videoTime(event.chart.scales.x.getValueForPixel(Chart.helpers.getRelativePosition(event, event.chart).x));
			}

			function syncGraph(event) {
				if (syncGraphCheckbox && syncGraphCheckbox.checked) {
					Chart.helpers.each(Chart.instances, instance => {
						if (instance == event.chart) 
							return;

						instance.options.scales.x.min = event.chart.options.scales.x.min;
						instance.options.scales.x.max = event.chart.options.scales.x.max;
						instance.update();
					});
				}
			}
		}

		// configuration constructor for each type of chart
		function EmotionChartConfiguration() {
			const emotionChartDatasets = [];
			[
				{ tag: 'neutral', color: '#aaaaaa' },
				{ tag: 'angry', color: '#ff0000' },
				{ tag: 'happy', color: '#fbb034' },
				{ tag: 'surprise', color: '#ffdd00' },
				{ tag: 'disgust', color: '#c1d82f' },
				{ tag: 'sad', color: '#00a4e4' },
				{ tag: 'fear', color: '#665071' }
			].forEach((emotion, index) => {
				emotionChartDatasets.push({
					label: emotion.tag,
					backgroundColor: emotion.color,
					borderWidth: 0,
					showLine: false,
					pointStyle: false,
					fill: index == 0 ? 'origin' : '-1',
					data: []
				});
			});

			this.type = 'line';
			this.data = { datasets: emotionChartDatasets };
			this.options = new ChartOptions;
			this.options.scales.y = {
				stacked: true,
				min: 0,
				max: 1,
				ticks: {
					padding: 5
				}
			};
		}

		function AngleChartConfiguration() {
			const angleChartDatasets = [];
			[
				{ tag: 'yaw', color: '#709fb0' },
				{ tag: 'pitch', color: '#66cdaa' },
				{ tag: 'roll', color: '#daa520' }
			].forEach(angle => {
				const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;

				angleChartDatasets.push({
					label: angle.tag,
					borderColor: angle.color,
					borderWidth: 1,
					pointStyle: false,
					tension: 0.5,
					spanGaps: true,
					segment: {
						borderDash: ctx => skipped(ctx, [4, 4])
					},
					data: []
				});
			});

			this.type = 'line';
			this.data = { datasets: angleChartDatasets };
			this.options = new ChartOptions;
			this.options.scales.y = {
				min: -1,
				max: 1
			};
			this.options.plugins.legend = { labels: { boxHeight: 0 } };
		}

		function GestureChartConfiguration() {
			this.type = 'bar';
			this.data = { datasets: [] };
			this.options = new ChartOptions;
			this.options.indexAxis = 'y';
			this.options.scales.y = {
				stacked: true
			};
			this.options.plugins.legend = {
				display: false
			};
		}

		if (deleteModalButton)
			Static.disableInput(deleteModalButton);

		if (mergeModalButton)
			Static.disableInput(mergeModalButton);

		let video;
		let initialDuration;

		element._selections = [];
		element._names = [];
		element._emotionCharts = [];
		element._angleCharts = [];
		element._gestureCharts = [];

		element.addEventListener(Static.EVENT_INIT, event => {
			// should delete all event listeners before remove element?

			video = event.detail?.video;

			if (event.detail?.keepGraph) {
				element._emotionCharts.forEach(chart => {
					/*
					const canvas = chart.canvas;
					chart.destroy();
					chart = new Chart(canvas, new EmotionChartConfiguration);
					*/
					chart.data.labels.length = 0;
					chart.data.datasets.forEach(dataset => dataset.data.length = 0);
				});
				element._angleCharts.forEach(chart => {
					/*
					const canvas = chart.canvas;
					chart.destroy();
					chart = new Chart(canvas, new AngleChartConfiguration);
					*/
					chart.data.labels.length = 0;
					chart.data.datasets.forEach(dataset => dataset.data.length = 0);
				});
				element._gestureCharts.forEach(chart => {
					/*
					const canvas = chart.canvas;
					chart.destroy();
					chart = new Chart(canvas, new GestureChartConfiguration);
					*/
					chart.data.labels.length = 0;
					chart.data.datasets.length = 0;
				});

				Chart.helpers.each(Chart.instances, instance => {
					setInitialScale(instance, video ? video.duration : 0);
				});
			} else {
				element._emotionCharts.forEach(chart => chart.destroy());
				element._emotionCharts.length = 0;
				element._angleCharts.forEach(chart => chart.destroy());
				element._angleCharts.length = 0;
				element._gestureCharts.forEach(chart => chart.destroy());
				element._gestureCharts.length = 0;

				element._names.length = 0;

				Array.from(event.currentTarget.children).filter(child => child.tagName == 'DIV').forEach(child => child.remove());
			}

			uncheckAll();
		});

		element.addEventListener(Static.EVENT_ADDPERSON, event => {
			const index = element.childElementCount - 1;

			// duplicate a new item
			const item = template.content.firstElementChild.cloneNode(true);
			event.currentTarget.append(item);

			// add unique postfix to the item
			item.querySelectorAll('[id]').forEach(child => {
				child.id += '-' + index;
			});
			item.querySelectorAll('[for]').forEach(child => {
				child.htmlFor += '-' + index;
			});
			item.querySelectorAll('[href]').forEach(child => {
				child.href += '-' + index;
			});

			const check = item.querySelector('input[type="checkbox"]');
			if (check) {
				check._index = index;

				check.addEventListener('change', event => {
					if (event.currentTarget.checked) {
						if (!element._selections.includes(event.currentTarget._index))
							element._selections.push(event.currentTarget._index);
					} else {
						if (element._selections.includes(event.currentTarget._index))
							element._selections.splice(element._selections.findIndex(index => index == event.currentTarget._index), 1);
					}

					updateModalButton();

					element.querySelectorAll('input[type="checkbox"]').forEach(child => {
						const img = child.parentElement.getElementsByTagName('img')[0];
						if (img) {
							if (child._index >= 0 && child._index == element._selections[0])
								img.classList.add('_highlight');
							else
								img.classList.remove('_highlight');
						}
					});
				});
			}

			const nameInput = item.querySelector('input[type="text"]');
			if (nameInput) {
				nameInput._index = index;
				nameInput.value = element._names[index] = event.detail?.name ? event.detail.name : '';

				nameInput.addEventListener('change', event => {
					element._names[event.currentTarget._index] = event.currentTarget.value;
				});
			}

			const faceImage = item.getElementsByTagName('img')[0];
			if (faceImage)
				faceImage.src = event.detail?.faceDataURL;

			const emotionCanvas = item.getElementsByTagName('canvas')[0];
			if (emotionCanvas)
				element._emotionCharts[index] = new Chart(emotionCanvas, new EmotionChartConfiguration);

			const angleCanvas = item.getElementsByTagName('canvas')[1];
			if (angleCanvas)
				element._angleCharts[index] = new Chart(angleCanvas, new AngleChartConfiguration);

			const gestureCanvas = item.getElementsByTagName('canvas')[2];
			if (gestureCanvas)
				element._gestureCharts[index] = new Chart(gestureCanvas, new GestureChartConfiguration);
		});

		element.addEventListener(Static.EVENT_DRAWGRAPH, event => {
			const analyzedData = event.detail?.analyzedData;
			if (!analyzedData)
				return;

			// for each frame
			analyzedData.results.forEach((result, t) => {
				// push current frame time as new label to emotion chart and angle chart
				element._emotionCharts.forEach(chart => chart.data.labels.push(absMSec(result.time)));
				element._angleCharts.forEach(chart => chart.data.labels.push(absMSec(result.time)));

				// for each person in current frame
				result.personResults.forEach(personResult => {
					// skip deleted entry
					if (personResult.index < 0)
						return;

					// apply emotion of person to associated chart
					const emotionChart = element._emotionCharts[personResult.index];
					if (emotionChart) {
						emotionChart.data.datasets.forEach(dataset => {
							const emotion = personResult.result.face.emotion.find(emotion => emotion.emotion == dataset.label);
							dataset.data[t] = emotion ? emotion.score : 0.0;
						});
					}

					// apply face angle of person to associated chart
					const angleChart = element._angleCharts[personResult.index];
					if (angleChart) {
						angleChart.data.datasets.forEach(dataset => {
							const angle = personResult.result.face.rotation.angle[dataset.label];
							dataset.data[t] = angle != undefined ? angle : 0.0;
						});
					}

					// add gesture of person to associated chart
					const gestureChart = element._gestureCharts[personResult.index];
					if (gestureChart) {
						personResult.result.gestures.forEach(gesture => {
							if (!('body' in gesture) && !('hand' in gesture))
								return;

							let labelIndex = gestureChart.data.labels.findIndex(label => label == gesture.gesture);
							if (labelIndex < 0)
								labelIndex = gestureChart.data.labels.push(gesture.gesture) - 1;

							const next = analyzedData.results[t + 1];
							if (next) {
								const data = [];
								data[labelIndex] = [absMSec(result.time), absMSec(next.time)];
								gestureChart.data.datasets.push({ backgroundColor: '#999966', data });
							}
						});
					}
				});
			});

			Chart.helpers.each(Chart.instances, instance => {
				setInitialScale(instance, analyzedData.results.reduce((acc, val) => Math.max(acc, val.time), 0));
			});
		});

		if (uncheckAllButton) {
			uncheckAllButton.addEventListener('click', event => {
				uncheckAll();
			});
		}

		if (resetZoomButton) {
			resetZoomButton.addEventListener('click', event => {
				Chart.helpers.each(Chart.instances, instance => {
					//resetScale(instance);
					setInitialScale(instance, initialDuration);
				});
			});
		}

		function setInitialScale(chart, duration) {
			initialDuration = duration;

			chart.options.scales.x.min = absMSec(0);
			chart.options.scales.x.max = absMSec(duration);
			chart.options.plugins.zoom.limits.x.min = absMSec(0);
			chart.options.plugins.zoom.limits.x.max = absMSec(duration);
			chart.update();
		}

		function resetScale(chart) {
			chart.options.scales.x.min = absMSec(0);
			chart.options.scales.x.max = absMSec(initialDuration);
			chart.resetZoom();
		}

		function uncheckAll() {
			element.querySelectorAll('input[type="checkbox"]').forEach(child => {
				child.checked = false;

				const img = child.parentElement.getElementsByTagName('img')[0];
				if (img)
					img.classList.remove('_highlight');
			});

			element._selections.length = 0;
			updateModalButton();
		}

		function updateModalButton() {
			if (deleteModalButton) {
				if (element._selections.length > 0)
					Static.enableInput(deleteModalButton);
				else
					Static.disableInput(deleteModalButton);
			}

			if (mergeModalButton) {
				if (element._selections.length > 1)
					Static.enableInput(mergeModalButton);
				else
					Static.disableInput(mergeModalButton);
			}
		}

		function absMSec(s) {
			return new Date(0, 0, 0, 0, 0, 0, 0).getTime() + s * 1000;
		}

		function videoTime(abs) {
			return (abs - absMSec(0)) / 1000;
		}
	});
} });
