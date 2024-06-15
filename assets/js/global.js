'use strict';

// static definitions
class Static {
	// common attribute names
	static ADDON_ATTR_NAME = '_addon';

	static _BS_CLASS_DISABLED = 'disabled';

	// custom event names
	static EVENT_ENABLE = '_enable';
	static EVENT_DISABLE = '_disable';
	static EVENT_SHOWBUTTON = '_showbutton';
	static EVENT_HIDEBUTTON = '_hidebutton';
	static EVENT_UPDATESTATUS = '_updatestatus';
	static EVENT_LOAD = '_load';
	static EVENT_SCROLL = '_scroll';
	static EVENT_INIT = '_init';
	static EVENT_ADDPERSON = '_addperson';
	static EVENT_DRAWGRAPH = '_drawgraph';

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

	static animationFrameFactory = function (func) {
		const id = {};
		const callback = function () {
			func();
			id.id = requestAnimationFrame(callback);
		};
		id.id = requestAnimationFrame(callback);
		return id;
	};

	static enableInput = function (element) {
		if (!element)
			return;

		element.classList.remove(this._BS_CLASS_DISABLED);
		element.disabled = false;
	};

	static disableInput = function (element) {
		if (!element)
			return;

		element.classList.add(this._BS_CLASS_DISABLED);
		element.disabled = true;
	};
}

// class extensions
Element.prototype.getElementFromAttribute = function (attributeName) {
	const id = this.getAttribute(attributeName);
	if (!id) {
		console.log(`${this.nodeName}: Attribute ${attributeName} not defined.`);
		return;
	}

	const element = document.getElementById(id);
	if (!element) {
		console.log(`${this.nodeName}: Element not found: ${id}`);
		return;
	}

	return element;
};

Element.prototype.getElementsFromAttribute = function (attributeName) {
	const ids = this.getAttribute(attributeName);
	if (!ids) {
		console.log(`${this.nodeName}: Attribute ${attributeName} not defined.`);
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
