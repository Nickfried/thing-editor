import { Container } from "pixi.js";
import type { KeyedMap, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import makePathForKeyframeAutoSelect from "thing-editor/src/editor/utils/movie-clip-keyframe-select-path";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import type { TimelineData } from "thing-editor/src/engine/lib/movie-clip/field-player";
import MovieClip from "thing-editor/src/engine/lib/movie-clip/movie-clip.c";
import { getLatestSceneNodeBypath, getLatestSceneNodesByComplexPath } from "thing-editor/src/engine/utils/get-value-by-path";

/** data about objects, all not empty data-path properties reference to */
let refs: Map<Container, KeyedMap<ReferencesData>>;

export default class DataPathFixer {

	static rememberPathReferences() {
		if(beforeNameEditOldValues) {
			DataPathFixer.onNameBlur();
		}
		_validateRefEntryOldNames = undefined;
		_validateRefEntryNewName = undefined;
		if(game.currentScene) {
			game.currentScene._refreshAllObjectRefs();
		}
		refs = new Map();
		_rememberPathReference(game.currentContainer);
		game.currentContainer.forAllChildren(_rememberPathReference);
	}

	static validatePathReferences(oldNames?: (string | null)[], newName?: string) {
		_validateRefEntryOldNames = oldNames;
		_validateRefEntryNewName = newName;
		if(game.currentScene) {
			game.currentScene._refreshAllObjectRefs();
		}
		refs.forEach(validateRefEntry);
	}

	static beforeNameEdit(newName: string) {
		nameEditNewName = newName;
		if(!beforeNameEditOldValues) {
			DataPathFixer.rememberPathReferences();
			beforeNameEditOldValues = game.editor.selection.map(o => o.name);
		}
	}

	static onNameBlur() {
		if(beforeNameEditOldValues) {
			DataPathFixer.validatePathReferences(beforeNameEditOldValues, nameEditNewName);
			beforeNameEditOldValues = undefined;
		}
	}
}

let nameEditNewName: string;
let beforeNameEditOldValues: (string | null)[] | undefined;

let _validateRefEntryOldNames: (string | null)[] | undefined;
let _validateRefEntryNewName: string | undefined;

const tryToFixDataPath = (node: Container, fieldname: string, path_: string, oldRefs: ReferencesOfDataPath, currentRefs: ReferencesOfDataPath) => {

	let pathes = path_.split(/[,|`]/);
	let atLeastOnePartFixed = false;

	assert(pathes.length === oldRefs.length, "DataPathFixer refs count does not match.");

	let clones: Container[] = [];
	game.currentContainer.forAllChildren((o) => {
		if(o.__nodeExtendData.__isJustCloned) {
			if(o.name) {
				clones.push(o);
			}
			o.forAllChildren((c) => {
				if(c.name) {
					clones.push(c);
				}
			});
		}
	});

	for(let j = 0; j < oldRefs.length; j++) {

		let currentRef = currentRefs[j];
		let oldRef = oldRefs[j];
		if(currentRef === oldRef) {
			continue;
		}

		let path = pathes[j];

		if(!oldRef || !oldRef.parent) {
			return;
		}

		let repairNode;
		let newPath = path;


		if(clones.length) { //is was clone or paste. try to rename cloned nodes to fix ref
			for(let c of clones) {
				let tmpName = c.name;
				c.name += '-copy';
				game.currentScene._refreshAllObjectRefs();
				repairNode = getLatestSceneNodeBypath(newPath, node);
				if(repairNode === oldRef) {
					break;
				}
				c.name = tmpName;
			}
		}
		if(repairNode !== oldRef) {
			if(_validateRefEntryOldNames) { //it is was renaming. try to fix .#names
				for(let oldName of _validateRefEntryOldNames) {
					if(oldName) {
						oldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						let pathFixer = new RegExp('\\.#' + oldName + '(\\.|$)');
						let pathFixer2 = new RegExp('(\\.all\\.)' + oldName + '(\\.|$)');
						let pathFixer3 = new RegExp('^all\\.' + oldName + '(\\.|$)');
						newPath = newPath.replace(pathFixer, '.#' + _validateRefEntryNewName + '$1');
						newPath = newPath.replace(pathFixer2, '$1' + _validateRefEntryNewName + '$2');
						newPath = newPath.replace(pathFixer3, 'all.' + _validateRefEntryNewName + '$1');
					}
				}
				repairNode = getLatestSceneNodeBypath(newPath, node);
			} else { //node added or removed

				let pathParts = path.split('.');
				for(let i = 0; i < pathParts.length;) { //try to remove one of the part of chain
					i++;
					let a = pathParts.slice(0);
					a.splice(i, 1);
					newPath = a.join('.');
					repairNode = getLatestSceneNodeBypath(newPath, node, true);
					if(repairNode === oldRef) {
						break;
					}
				}

				if(repairNode !== oldRef) { //try to insert "parent" somwhere in chain
					for(let i = 0; i < pathParts.length;) {
						i++;
						let a = pathParts.slice(0);
						a.splice(i, 0, 'parent');
						newPath = a.join('.');
						repairNode = getLatestSceneNodeBypath(newPath, node, true);
						if(repairNode === oldRef) {
							break;
						}
					}
				}

				if(repairNode !== oldRef) { //try to insert new name somewhere in chain
					let changedNode = game.editor.selection[0];
					let changedName = changedNode.name;
					if(!changedName) {
						changedName = 'new' + changedNode.constructor.name;
						let i = 1;
						while(changedNode.parent.getChildByName(changedName + i)) {
							i++;
						}
						changedName += i;
						changedNode.name = changedName;
						Lib.__invalidateSerializationCache(changedNode);
						setTimeout(() => {
							game.editor.ui.propsEditor.selectField('name', true, true);
						}, 1);
					}
					changedName = '#' + changedName;
					for(let i = 0; i < pathParts.length;) {
						i++;
						let a = pathParts.slice(0);
						a.splice(i, 0, changedName);
						newPath = a.join('.');
						repairNode = getLatestSceneNodeBypath(newPath, node, true);
						if(repairNode === oldRef) {
							break;
						}
					}
				}
			}
		}
		if(repairNode === oldRef) {
			pathes[j] = newPath;
			atLeastOnePartFixed = true;
		} else {
			return;
		}
	}
	assert(atLeastOnePartFixed, "Path fixing error.");

	//apply fixed path

	let finalPath = pathes.shift();
	if(pathes.length > 0) {
		finalPath += '`' + pathes.join(',');
	}

	let fn = fieldname.split(',');
	let keyframe;
	if(fn.length > 1) {
		//it is keyframe action
		const movieClip = node as MovieClip;
		for(let f of movieClip._timelineData.f) {
			if(f.n === fn[1]) {
				let targetTime = parseInt(fn[2]);
				for(let kf of f.t) {
					if(kf.t == targetTime) {
						keyframe = kf;
						break;
					}
				}
				break;
			}
		}
	}

	if(keyframe) {
		keyframe.a = finalPath;
	} else {
		(node as KeyedObject)[fieldname] = finalPath;
	}
	Lib.__invalidateSerializationCache(node);
	if((node as KeyedObject).__invalidateSerializeCache) {
		(node as KeyedObject).__invalidateSerializeCache();
	}
	return true;

};

type ReferencesOfDataPath = (Container | null)[];

interface ReferencesData {
	targetNodes: ReferencesOfDataPath,
	path: string,
}

function _rememberPathReference(o: Container) {
	let props = (o.constructor as SourceMappedConstructor).__editableProps;
	let m: KeyedMap<ReferencesData> | null = null;

	const rememberRef = (path: string, name: string) => {
		if(path) {
			let targetNodes = getLatestSceneNodesByComplexPath(path, o);

			if(!m) {
				m = {};
				refs.set(o, m);
			}
			m[name] = { targetNodes, path };
		}
	};

	for(let p of props) {
		if(p.type === 'data-path' || p.type === 'callback') {
			rememberRef((o as KeyedObject)[p.name], p.name);
		} else if(p.type === 'timeline') {
			let timeline = (o as KeyedObject)[p.name] as TimelineData;
			if(timeline) {
				for(let field of timeline.f) {
					for(let k of field.t) {
						if(k.a) {
							rememberRef(k.a, makePathForKeyframeAutoSelect(p, field, k));
						}
					}
				}
			}
		}
	}
}

const validateRefEntry = (m: KeyedMap<ReferencesData>, o: Container) => {
	if(o.parent) {
		for(let fieldname in m) {

			let item = m[fieldname];
			let path = item.path;
			let oldRefs = item.targetNodes;
			let currentRefs = getLatestSceneNodesByComplexPath(path, o);

			for(let i = 0; i < oldRefs.length; i++) {
				if(oldRefs[i] !== currentRefs[i]) {
					if(!tryToFixDataPath(o, fieldname, path, oldRefs, currentRefs)) {

						let oldRef = oldRefs[i];
						let currentRef = currentRefs[i];

						let was;
						if(oldRef instanceof Container) {
							was = R.sceneNode(oldRef);
						} else {
							was = '' + oldRef;
						}
						let become;
						if(currentRef instanceof Container) {
							become = R.sceneNode(currentRef);
						} else {
							become = '' + currentRef;
						}

						let pathParts = path.split(/[,|`]/);
						let splitter = '`';

						game.editor.ui.status.warn(R.span(null, 'Path reference (', pathParts.map((pathPart: string, partNum: number) => {
							let ret = ((oldRefs[partNum] !== currentRefs[partNum]) ? R.b : R.span)({ key: partNum }, pathPart, partNum < (pathParts.length - 1) ? splitter : undefined);
							splitter = ',';
							return ret;
						}), ') is affected:', R.br(), ' Was: ', was, R.br(), ' Become: ', become), 32016, o, fieldname);
					}
				}
			}
		}
	}
};

