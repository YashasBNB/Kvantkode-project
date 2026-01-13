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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1kWC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYW1kWC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sVUFBVSxFQUNWLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsT0FBTyxFQUNQLGdCQUFnQixHQUNoQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sS0FBSyxRQUFRLE1BQU0sMkJBQTJCLENBQUE7QUFFckQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVwRCxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFBLENBQUMsaUNBQWlDO0FBRTlELE1BQU0sVUFBVTtJQUNmLFlBQ2lCLEVBQTZCLEVBQzdCLFlBQXlDLEVBQ3pDLFFBQWE7UUFGYixPQUFFLEdBQUYsRUFBRSxDQUEyQjtRQUM3QixpQkFBWSxHQUFaLFlBQVksQ0FBNkI7UUFDekMsYUFBUSxHQUFSLFFBQVEsQ0FBSztJQUMzQixDQUFDO0NBQ0o7QUFFRCxJQUFLLHNCQUlKO0FBSkQsV0FBSyxzQkFBc0I7SUFDMUIscUZBQWlCLENBQUE7SUFDakIsaUdBQW1CLENBQUE7SUFDbkIsaUdBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUpJLHNCQUFzQixLQUF0QixzQkFBc0IsUUFJMUI7QUFFRCxNQUFNLGlCQUFpQjthQUNSLGFBQVEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLEFBQTFCLENBQTBCO0lBbUJoRDtRQWpCaUIsaUJBQVksR0FDNUIsT0FBTyxJQUFJLEtBQUssUUFBUTtZQUN4QixJQUFJLENBQUMsV0FBVztZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyw0QkFBNEIsQ0FBQTtR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