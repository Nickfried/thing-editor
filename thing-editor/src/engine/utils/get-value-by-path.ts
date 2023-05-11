import assert from "thing-editor/src/engine/debug/assert.js";
import game from "../game.js";

import { stringToCallData } from "./call-by-path.js";
import { KeyedMap, ValuePath } from "thing-editor/src/editor/env.js";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags.js";
import { Container } from "pixi.js";
/// #if EDITOR
let latestDetectedSceneNode;
/// #endif
const getValueByPath = (valuePath: ValuePath, this_: any
	/// #if EDITOR
	, isLatestNodeGetting = false
	/// #endif
) => {
	assert(this_, "'this' argument is not provided in to 'getValueByPath'", 10028);
	assert(valuePath, "Empty data source path string.", 10029);
	let data = stringToCallData(valuePath);
	let path = data.p;
	let c: any;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	if(!isLatestNodeGetting) {
		pathDebugging(this_, valuePath);
	}
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!isLatestNodeGetting && !(rootName in game)) {
			game.editor.logError("Unknown root element name '" + rootName + "' in '" + valuePath + "'.", 30025, this_, game.editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = (game as KeyedMap<any>)[rootName];
	}
	let i = 1;
	let fOwner;

	/// #if EDITOR
	if(!c && isLatestNodeGetting) {
		return c;
	}
	/// #endif

	while(i < path.length) {
		let n = path[i];
		fOwner = c;
		if(typeof n === 'string') {
			c = c[n];
		} else {
			/// #if EDITOR
			if(!c.getChildByName) {
				return "getChildByName for not a Container.";
			}
			/// #endif
			c = c.getChildByName(n.s
				/// #if EDITOR
				, this_
				/// #endif
			);
		}
		if(!c) {
			return c;
		}
		/// #if EDITOR
		if(c instanceof Container) {
			latestDetectedSceneNode = c;
		}
		/// #endif

		i++;
	}

	/// #if EDITOR
	if(isLatestNodeGetting) {
		return c;
	}
	/// #endif

	if(typeof c === "function") {
		return c.apply(fOwner, data.v);
	}
	return c;
};

const setValueByPath = (valuePath: string, val: any, this_: any) => {
	assert(this_, "'this' object is not provided in to 'setValueByPath'", 10030);
	assert(valuePath, "Empty setValueByPath string.", 10031);
	let path = stringToCallData(valuePath).p;
	let c;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	pathDebugging(this_, valuePath);
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!(rootName in game)) {
			game.editor.logError("Unknown root element name '" + rootName + "' in '" + valuePath + "'.", 32015, this_, game.editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = (game as KeyedMap<any>)[rootName];
	}

	let i = 1;
	while(i < path.length - 1) {
		let n = path[i];
		if(typeof n === 'string') {
			c = c[n];
		} else {
			/// #if EDITOR
			if(!c.getChildByName) {
				return "getChildByName for not a Container.";
			}
			/// #endif
			c = c.getChildByName(n.s);
		}
		if(!c) {
			return;
		}
		i++;
	}
	let n = path[i] as string;
	if(c[n] !== val) {
		assert(typeof c[n] !== 'function', "Attempt to override function in setValueByPath", 10069);
		c[n] = val;
	}
};

/// #if EDITOR
setValueByPath.___EDITOR_isGoodForCallbackChooser = true;

const getLatestSceneNodeBypath = (path: string, _this: any, suspendWarning = false) => {
	latestDetectedSceneNode = null;
	EDITOR_FLAGS.rememberTryTime();
	try {
		getValueByPath(path, _this, true);
	} catch(er) {
		EDITOR_FLAGS.checkTryTime();
		if(!suspendWarning) {
			console.warn('path validation exception: (' + path + '): ' + _this.___info + ' ' + ((typeof er) === 'object' ? (er as any).message : er));
		}
	}
	return latestDetectedSceneNode;
};

const getLatestSceneNodesByComplexPath = (path: string, o: Container) => {
	let ret = [];
	let pathsParts = path.split(/[,|`]/);
	for(let p of pathsParts) {
		if(!p) {
			ret.push(null);
		} else {
			ret.push(getLatestSceneNodeBypath(p, o));
		}
	}
	return ret;
};

const pathDebugging = (o: Container, path: string) => {
	if(o instanceof Container) {
		if(o.hasOwnProperty('___pathBreakpoint') && o.___pathBreakpoint === path) {
			//data-path breakpoint activated
			debugger; // eslint-disable-line no-debugger
			delete o.___pathBreakpoint;
		}
	}
};

/* TODO: 
setValueByPath.___EDITOR_callbackParameterChooserFunction = () => {
	return new Promise((resolve) => {
		editor.ui.modal.showPrompt('Enter data path', '').then((enteredText1) => {
			if(enteredText1) {
				editor.ui.modal.showPrompt('Enter value', '').then((enteredText2) => {
					resolve([enteredText1, enteredText2]);
				});
			}
		});
	});
};*/
/// #endif


export default getValueByPath;
export {
	setValueByPath
	/// #if EDITOR
	, getLatestSceneNodeBypath,
	getLatestSceneNodesByComplexPath,
	pathDebugging
	/// #endif
};