/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire, register } from 'node:module';
import { product, pkg } from './bootstrap-meta.js';
import './bootstrap-node.js';
import * as performance from './vs/base/common/performance.js';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Install a hook to module resolution to map 'fs' to 'original-fs'
if (process.env['ELECTRON_RUN_AS_NODE'] || process.versions['electron']) {
    const jsCode = `
	export async function resolve(specifier, context, nextResolve) {
		if (specifier === 'fs') {
			return {
				format: 'builtin',
				shortCircuit: true,
				url: 'node:original-fs'
			};
		}

		// Defer to the next hook in the chain, which would be the
		// Node.js default resolve if this is the last user-specified loader.
		return nextResolve(specifier, context);
	}`;
    register(`data:text/javascript;base64,${Buffer.from(jsCode).toString('base64')}`, import.meta.url);
}
// Prepare globals that are needed for running
globalThis._VSCODE_PRODUCT_JSON = { ...product };
if (process.env['VSCODE_DEV']) {
    try {
        const overrides = require('../product.overrides.json');
        globalThis._VSCODE_PRODUCT_JSON = Object.assign(globalThis._VSCODE_PRODUCT_JSON, overrides);
    }
    catch (error) {
        /* ignore */
    }
}
globalThis._VSCODE_PACKAGE_JSON = { ...pkg };
globalThis._VSCODE_FILE_ROOT = __dirname;
//#region NLS helpers
let setupNLSResult = undefined;
function setupNLS() {
    if (!setupNLSResult) {
        setupNLSResult = doSetupNLS();
    }
    return setupNLSResult;
}
async function doSetupNLS() {
    performance.mark('code/willLoadNls');
    let nlsConfig = undefined;
    let messagesFile;
    if (process.env['VSCODE_NLS_CONFIG']) {
        try {
            nlsConfig = JSON.parse(process.env['VSCODE_NLS_CONFIG']);
            if (nlsConfig?.languagePack?.messagesFile) {
                messagesFile = nlsConfig.languagePack.messagesFile;
            }
            else if (nlsConfig?.defaultMessagesFile) {
                messagesFile = nlsConfig.defaultMessagesFile;
            }
            globalThis._VSCODE_NLS_LANGUAGE = nlsConfig?.resolvedLanguage;
        }
        catch (e) {
            console.error(`Error reading VSCODE_NLS_CONFIG from environment: ${e}`);
        }
    }
    if (process.env['VSCODE_DEV'] || // no NLS support in dev mode
        !messagesFile // no NLS messages file
    ) {
        return undefined;
    }
    try {
        globalThis._VSCODE_NLS_MESSAGES = JSON.parse((await fs.promises.readFile(messagesFile)).toString());
    }
    catch (error) {
        console.error(`Error reading NLS messages file ${messagesFile}: ${error}`);
        // Mark as corrupt: this will re-create the language pack cache next startup
        if (nlsConfig?.languagePack?.corruptMarkerFile) {
            try {
                await fs.promises.writeFile(nlsConfig.languagePack.corruptMarkerFile, 'corrupted');
            }
            catch (error) {
                console.error(`Error writing corrupted NLS marker file: ${error}`);
            }
        }
        // Fallback to the default message file to ensure english translation at least
        if (nlsConfig?.defaultMessagesFile && nlsConfig.defaultMessagesFile !== messagesFile) {
            try {
                globalThis._VSCODE_NLS_MESSAGES = JSON.parse((await fs.promises.readFile(nlsConfig.defaultMessagesFile)).toString());
            }
            catch (error) {
                console.error(`Error reading default NLS messages file ${nlsConfig.defaultMessagesFile}: ${error}`);
            }
        }
    }
    performance.mark('code/didLoadNls');
    return nlsConfig;
}
//#endregion
export async function bootstrapESM() {
    // NLS
    await setupNLS();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWVzbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1lc20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQTtBQUNuQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2xELE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxLQUFLLFdBQVcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUc5RCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUM5QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFOUQsbUVBQW1FO0FBQ25FLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztJQUN6RSxNQUFNLE1BQU0sR0FBRzs7Ozs7Ozs7Ozs7OztHQWFiLENBQUE7SUFDRixRQUFRLENBQUMsK0JBQStCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNuRyxDQUFDO0FBRUQsOENBQThDO0FBQzlDLFVB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