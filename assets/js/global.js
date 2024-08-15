'use strict';

// static definitions
class Static {
	// common attribute names
	static ADDON_ATTR_NAME = '_addon';

	// custom event names
	static EVENT_SHOWSPLASH = '_showsplash';
	static EVENT_HIDESPLASH = '_hidesplash';
	static EVENT_SHOWBUTTON = '_showbutton';
	static EVENT_HIDEBUTTON = '_hidebutton';
	static EVENT_UPDATESTATUS = '_updatestatus';
	static EVENT_LOADANALYZEDDATA = '_loadanalyzeddata';
	static EVENT_LOADTIMELINE = '_loadtimeline';
	static EVENT_INITGRAPH = '_initgraph';
	static EVENT_ADDGRAPH = '_addgraph';
	static EVENT_DRAWGRAPH = '_drawgraph';
	static EVENT_CHANGESTATE = '_changestate';

	static selfJS() {
		if (document.currentScript) {
			return extract(document.currentScript.src);
		} else {
			const scripts = document.getElementsByTagName('script');
			const script = scripts[scripts.length - 1];
			if (script.src)
				return extract(script.src);
		}

		function extract(path) {
			return path.replace(/^.*\//, '').replace(/\..*$/, '');
		}
	}

	static _dispatchTargets = [];
	static _events = [];

	static registerElement(element) {
		this._dispatchTargets.push(element);
	}

	static unregisterElement(element) {
		this._dispatchTargets = this._dispatchTargets.filter(target => target != element);
	}

	static dispatchEvent(type, detail) {
		if (!type) {
			console.warn('Static.dispatchEvent(): Type of CustomEvent not defined.');
			return;
		}

		this._dispatchTargets.forEach(target => {
			target.dispatchEvent(new CustomEvent(type, { detail }));
		});
	}

	static animationFrameFactory(func) {
		const id = {};
		const callback = function () {
			func();
			id.id = requestAnimationFrame(callback);
		};
		id.id = requestAnimationFrame(callback);
		return id;
	};
}

// class extensions
Element.prototype.getElementFromAttribute = function (attributeName) {
	const id = this.getAttribute(attributeName);
	if (!id) {
		console.warn(`${this.nodeName}: Attribute ${attributeName} not defined.`);
		return;
	}

	const element = document.getElementById(id);
	if (!element) {
		console.warn(`${this.nodeName}: Element not found: ${id}`);
		return;
	}

	return element;
};

Element.prototype.getElementsFromAttribute = function (attributeName) {
	const ids = this.getAttribute(attributeName);
	if (!ids) {
		console.warn(`${this.nodeName}: Attribute ${attributeName} not defined.`);
		return;
	}

	const elements = [];
	ids.split(/\s+/).forEach(id => {
		const element = document.getElementById(id);
		if (element)
			elements.push(element);
	});

	return elements;
};
