/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess, nodeModulesAsarPath, nodeModulesPath, Schemas, VSCODE_AUTHORITY, } from './base/common/network.js';
import * as platform from './base/common/platform.js';
import { URI } from './base/common/uri.js';
import { generateUuid } from './base/common/uuid.js';
export const canASAR = false; // TODO@esm: ASAR disabled in ESM
class DefineCall {
    constructor(id, dependencies, callback) {
        this.id = id;
        this.dependencies = dependencies;
        this.callback = callback;
    }
}
var AMDModuleImporterState;
(function (AMDModuleImporterState) {
    AMDModuleImporterState[AMDModuleImporterState["Uninitialized"] = 1] = "Uninitialized";
    AMDModuleImporterState[AMDModuleImporterState["InitializedInternal"] = 2] = "InitializedInternal";
    AMDModuleImporterState[AMDModuleImporterState["InitializedExternal"] = 3] = "InitializedExternal";
})(AMDModuleImporterState || (AMDModuleImporterState = {}));
class AMDModuleImporter {
    static { this.INSTANCE = new AMDModuleImporter(); }
    constructor() {
        this._isWebWorker = typeof self === 'object' &&
            self.constructor &&
            self.constructor.name === 'DedicatedWorkerGlobalScope';
        this._isRenderer = typeof document === 'object';
        this._defineCalls = [];
        this._state = AMDModuleImporterState.Uninitialized;
    }
    _initialize() {
        if (this._state === AMDModuleImporterState.Uninitialized) {
            if (globalThis.define) {
                this._state = AMDModuleImporterState.InitializedExternal;
                return;
            }
        }
        else {
            return;
        }
        this._state = AMDModuleImporterState.InitializedInternal;
        globalThis.define = (id, dependencies, callback) => {
            if (typeof id !== 'string') {
                callback = dependencies;
                dependencies = id;
                id = null;
            }
            if (typeof dependencies !== 'object' || !Array.isArray(dependencies)) {
                callback = dependencies;
                dependencies = null;
            }
            // if (!dependencies) {
            // 	dependencies = ['require', 'exports', 'module'];
            // }
            this._defineCalls.push(new DefineCall(id, dependencies, callback));
        };
        globalThis.define.amd = true;
        if (this._isRenderer) {
            this._amdPolicy =
                globalThis._VSCODE_WEB_PACKAGE_TTP ??
                    window.trustedTypes?.createPolicy('amdLoader', {
                        createScriptURL(value) {
                            if (value.startsWith(window.location.origin)) {
                                return value;
                            }
                            if (value.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}`)) {
                                return value;
                            }
                            throw new Error(`[trusted_script_src] Invalid script url: ${value}`);
                        },
                    });
        }
        else if (this._isWebWorker) {
            this._amdPolicy =
                globalThis._VSCODE_WEB_PACKAGE_TTP ??
                    globalThis.trustedTypes?.createPolicy('amdLoader', {
                        createScriptURL(value) {
                            return value;
                        },
                    });
        }
    }
    async load(scriptSrc) {
        this._initialize();
        if (this._state === AMDModuleImporterState.InitializedExternal) {
            return new Promise((resolve) => {
                const tmpModuleId = generateUuid();
                globalThis.define(tmpModuleId, [scriptSrc], function (moduleResult) {
                    resolve(moduleResult);
                });
            });
        }
        const defineCall = await (this._isWebWorker
            ? this._workerLoadScript(scriptSrc)
            : this._isRenderer
                ? this._rendererLoadScript(scriptSrc)
                : this._nodeJSLoadScript(scriptSrc));
        if (!defineCall) {
            console.warn(`Did not receive a define call from script ${scriptSrc}`);
            return undefined;
        }
        // TODO@esm require, module
        const exports = {};
        const dependencyObjs = [];
        const dependencyModules = [];
        if (Array.isArray(defineCall.dependencies)) {
            for (const mod of defineCall.dependencies) {
                if (mod === 'exports') {
                    dependencyObjs.push(exports);
                }
                else {
                    dependencyModules.push(mod);
                }
            }
        }
        if (dependencyModules.length > 0) {
            throw new Error(`Cannot resolve dependencies for script ${scriptSrc}. The dependencies are: ${dependencyModules.join(', ')}`);
        }
        if (typeof defineCall.callback === 'function') {
            return defineCall.callback(...dependencyObjs) ?? exports;
        }
        else {
            return defineCall.callback;
        }
    }
    _rendererLoadScript(scriptSrc) {
        return new Promise((resolve, reject) => {
            const scriptElement = document.createElement('script');
            scriptElement.setAttribute('async', 'async');
            scriptElement.setAttribute('type', 'text/javascript');
            const unbind = () => {
                scriptElement.removeEventListener('load', loadEventListener);
                scriptElement.removeEventListener('error', errorEventListener);
            };
            const loadEventListener = (e) => {
                unbind();
                resolve(this._defineCalls.pop());
            };
            const errorEventListener = (e) => {
                unbind();
                reject(e);
            };
            scriptElement.addEventListener('load', loadEventListener);
            scriptElement.addEventListener('error', errorEventListener);
            if (this._amdPolicy) {
                scriptSrc = this._amdPolicy.createScriptURL(scriptSrc);
            }
            scriptElement.setAttribute('src', scriptSrc);
            window.document.getElementsByTagName('head')[0].appendChild(scriptElement);
        });
    }
    async _workerLoadScript(scriptSrc) {
        if (this._amdPolicy) {
            scriptSrc = this._amdPolicy.createScriptURL(scriptSrc);
        }
        await import(scriptSrc);
        return this._defineCalls.pop();
    }
    async _nodeJSLoadScript(scriptSrc) {
        try {
            const fs = (await import(`${'fs'}`)).default;
            const vm = (await import(`${'vm'}`)).default;
            const module = (await import(`${'module'}`)).default;
            const filePath = URI.parse(scriptSrc).fsPath;
            const content = fs.readFileSync(filePath).toString();
            const scriptSource = module.wrap(content.replace(/^#!.*/, ''));
            const script = new vm.Script(scriptSource);
            const compileWrapper = script.runInThisContext();
            compileWrapper.apply();
            return this._defineCalls.pop();
        }
        catch (error) {
            throw error;
        }
    }
}
const cache = new Map();
/**
 * Utility for importing an AMD node module. This util supports AMD and ESM contexts and should be used while the ESM adoption
 * is on its way.
 *
 * e.g. pass in `vscode-textmate/release/main.js`
 */
export async function importAMDNodeModule(nodeModuleName, pathInsideNodeModule, isBuilt) {
    if (isBuilt === undefined) {
        const product = globalThis._VSCODE_PRODUCT_JSON;
        isBuilt = Boolean((product ?? globalThis.vscode?.context?.configuration()?.product)?.commit);
    }
    const nodeModulePath = pathInsideNodeModule
        ? `${nodeModuleName}/${pathInsideNodeModule}`
        : nodeModuleName;
    if (cache.has(nodeModulePath)) {
        return cache.get(nodeModulePath);
    }
    let scriptSrc;
    if (/^\w[\w\d+.-]*:\/\//.test(nodeModulePath)) {
        // looks like a URL
        // bit of a special case for: src/vs/workbench/services/languageDetection/browser/languageDetectionWebWorker.ts
        scriptSrc = nodeModulePath;
    }
    else {
        const useASAR = canASAR && isBuilt && !platform.isWeb;
        const actualNodeModulesPath = useASAR ? nodeModulesAsarPath : nodeModulesPath;
        const resourcePath = `${actualNodeModulesPath}/${nodeModulePath}`;
        scriptSrc = FileAccess.asBrowserUri(resourcePath).toString(true);
    }
    const result = AMDModuleImporter.INSTANCE.load(scriptSrc);
    cache.set(nodeModulePath, result);
    return result;
}
export function resolveAmdNodeModulePath(nodeModuleName, pathInsideNodeModule) {
    const product = globalThis._VSCODE_PRODUCT_JSON;
    const isBuilt = Boolean((product ?? globalThis.vscode?.context?.configuration()?.product)?.commit);
    const useASAR = canASAR && isBuilt && !platform.isWeb;
    const nodeModulePath = `${nodeModuleName}/${pathInsideNodeModule}`;
    const actualNodeModulesPath = useASAR ? nodeModulesAsarPath : nodeModulesPath;
    const resourcePath = `${actualNodeModulesPath}/${nodeModulePath}`;
    return FileAccess.asBrowserUri(resourcePath).toString(true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1kWC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2FtZFgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLFVBQVUsRUFDVixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLE9BQU8sRUFDUCxnQkFBZ0IsR0FDaEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEtBQUssUUFBUSxNQUFNLDJCQUEyQixDQUFBO0FBRXJELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFcEQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQSxDQUFDLGlDQUFpQztBQUU5RCxNQUFNLFVBQVU7SUFDZixZQUNpQixFQUE2QixFQUM3QixZQUF5QyxFQUN6QyxRQUFhO1FBRmIsT0FBRSxHQUFGLEVBQUUsQ0FBMkI7UUFDN0IsaUJBQVksR0FBWixZQUFZLENBQTZCO1FBQ3pDLGFBQVEsR0FBUixRQUFRLENBQUs7SUFDM0IsQ0FBQztDQUNKO0FBRUQsSUFBSyxzQkFJSjtBQUpELFdBQUssc0JBQXNCO0lBQzFCLHFGQUFpQixDQUFBO0lBQ2pCLGlHQUFtQixDQUFBO0lBQ25CLGlHQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFKSSxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBSTFCO0FBRUQsTUFBTSxpQkFBaUI7YUFDUixhQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxBQUExQixDQUEwQjtJQW1CaEQ7UUFqQmlCLGlCQUFZLEdBQzVCLE9BQU8sSUFBSSxLQUFLLFFBQVE7WUFDeEIsSUFBSSxDQUFDLFdBQVc7WUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssNEJBQTRCLENBQUE7UUFDdEMsZ0JBQVcsR0FBRyxPQUFPLFFB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