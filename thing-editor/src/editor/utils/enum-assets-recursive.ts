import { KeyedMap, SerializedObject } from "thing-editor/src/editor/env";
import fs, { AssetType, FileDesc } from "thing-editor/src/editor/fs";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const addImageToAssetsList = (imageName: string, ret: Set<FileDesc>) => {
	if(imageName) {
		const file = fs.getFileByAssetName(imageName, AssetType.IMAGE);
		assert(file, "Wrong image name.");
		if(!Lib.__isSystemTexture(file.asset)) {
			ret.add(file);
		}
	}
}

const addSoundToAssetsList = (soundName: string, ret: Set<FileDesc>) => {
	if(soundName) {
		const file = fs.getFileByAssetName(soundName, AssetType.SOUND);
		assert(file, "Wrong sound name.");
		ret.add(file);
	}
}

const addPrefabToAssetsList = (prefabName: string, ret: Set<FileDesc>) => {
	if(prefabName) {
		const file = fs.getFileByAssetName(prefabName, AssetType.PREFAB);
		assert(file, "Wrong prefab name.");
		ret.add(file);
	}
}

const enumAssetsPropsRecursive = (o: SerializedObject, ret: Set<FileDesc>) => {
	if(o.c) {
		const constr = game.classes[o.c];

		let props = constr.__editableProps;
		let imageFields: KeyedMap<true> = {};
		for(let field of props) {
			if(field.type === 'image') {
				imageFields[field.name] = true;
				addImageToAssetsList(o.p[field.name], ret);
			}/* TODO else if(field.__isResourceSelector) {
				let resourceName = o.p[field.name];
				if(resourceName && Lib.resources[resourceName]) {
					addResourceToAssetsList(Lib.resources[resourceName], ret);
				}
			} else if(field.isTranslatableKey) {
				let key = o.p[field.name];
				if(key && L.has(key)) {
					let array = [key, L(key)];
					let prefix = game.projectDesc.__localesNewKeysPrefix;
					if(prefix && key.startsWith(prefix)) {
						array.push(key.replace(prefix, LOCALES_PREFIX_HOLDER));
					}
					ret.add(array.join(LOCALES_SPLITTER));
				}
			} */
			else if(field.type === 'prefab') {
				let prefabName = o.p[field.name];
				if(Lib.hasPrefab(prefabName)) {
					addPrefabToAssetsList(prefabName, ret);
					enumAssetsPropsRecursive(Lib.prefabs[prefabName], ret);
				}
			} else if(field.type === 'sound') {
				let soundName = o.p[field.name];
				if(Lib.hasSound(soundName)) {
					addSoundToAssetsList(soundName, ret);
				}
			} else if(field.type === 'callback') {
				let action = o.p[field.name];
				if(action && action.indexOf('`') > 0) {
					let params = action.split('`')[1].split(',');
					for(let p of params) {
						if(p.endsWith('.png') || p.endsWith('.jpg')) {
							addImageToAssetsList(p, ret);
						}
					}
				}
			}
		}
		if(((constr as any === game.classes.MovieClip) || (constr.prototype instanceof game.classes.MovieClip)) && o.p.timeline) {
			for(let f of o.p.timeline.f) {
				for(let keyframe of f.t) {
					if(imageFields[f.n]) {
						addImageToAssetsList(keyframe.v, ret);
					}
					let a = keyframe.a;
					if(a && (a.indexOf('Sound.play`') >= 0 || a.indexOf('Sound.playPitched`') >= 0)) {
						let sndName = a.split('`')[1].split(',')[0];
						if(Lib.hasSound(sndName)) {
							addSoundToAssetsList(sndName, ret);
						}
					}
				}
			}
		}
	} else {
		addPrefabToAssetsList(o.r!, ret);
		enumAssetsPropsRecursive(Lib.prefabs[o.r!], ret);
	}
	if(o[':']) {
		for(let c of o[':']) {
			enumAssetsPropsRecursive(c, ret);
		}
	}
}

export default enumAssetsPropsRecursive