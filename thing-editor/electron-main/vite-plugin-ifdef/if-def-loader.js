const fileRegex = /\.(ts)$/

const editorImportRegex = /^import.*thing-editor\/src\/editor\//;

module.exports = function vitePluginIfDef(isDebug) {

	const processedFiles = [];

	return {
		name: 'vite-plugin-ifdef',
		enforce: 'pre',
		load(id) {
			if(id.indexOf('/thing-editor/src/editor/') >= 0) {

				let importedAt = '';
				let importPath = 'thing-editor/src/editor/' + id.split('/thing-editor/src/editor/')[1].replace(/\.ts$/, '');
				for(let a of processedFiles) {
					if(Array.isArray(a)) {
						if((a.find(l => !l.startsWith('//') && l.indexOf(importPath) >= 0))) {
							debugger;
						}
					} else {
						importedAt = a;
					}
				}
				debugger;
				throw new Error('File ' + id + ' was included in to build.');
			}
			if(fileRegex.test(id)) {
				const src = require('fs').readFileSync(id, 'utf8');


				processedFiles.push(id);

				let a = src.split('\n');
				let cuttingStack = [];
				let cuttingLevel = 0;

				a = a.map((line, i) => {
					var trimmedLine = line.trim();

					if(trimmedLine.startsWith('assert(') || trimmedLine.startsWith('@editable(') || (editorImportRegex.test(trimmedLine) && !trimmedLine.startsWith('import type'))) {
						return '///' + line;
					}

					if(trimmedLine === '/// #if EDITOR') {
						cuttingStack.push(trimmedLine);
						cuttingStack.push(i);
						cuttingLevel++;
					}

					if(trimmedLine === '/// #if DEBUG') {
						cuttingStack.push(trimmedLine);
						cuttingStack.push(i);
					}

					if(trimmedLine === '/// #endif') {
						if(cuttingStack.length === 0) {
							debugger;
							throw new Error('/// #endif without /// #if EDITOR in file ' + id + ':' + (i + 1));
						}
						cuttingStack.pop();
						if(cuttingStack.pop() === '/// #if EDITOR') {
							cuttingLevel--;
						}
					}

					if(cuttingLevel) {
						return '///' + line;
					}
					return line;
				});
				if(cuttingStack.length > 0) {
					const lineNum = cuttingStack.pop() + 1;
					debugger;
					throw new Error(cuttingStack.pop() + ' without /// #endif in file ' + id + ':' + lineNum);
				}

				processedFiles.push(a);

				return a.join('\n');

				return src;
			}
			return null;
		}
	}
}