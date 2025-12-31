/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createApiFactoryAndRegisterActors } from '../common/extHost.api.impl.js';
import { AbstractExtHostExtensionService } from '../common/extHostExtensionService.js';
import { URI } from '../../../base/common/uri.js';
import { RequireInterceptor } from '../common/extHostRequireInterceptor.js';
import { ExtensionRuntime } from '../common/extHostTypes.js';
import { timeout } from '../../../base/common/async.js';
import { ExtHostConsoleForwarder } from './extHostConsoleForwarder.js';
class WorkerRequireInterceptor extends RequireInterceptor {
    _installInterceptor() { }
    getModule(request, parent) {
        for (const alternativeModuleName of this._alternatives) {
            const alternative = alternativeModuleName(request);
            if (alternative) {
                request = alternative;
                break;
            }
        }
        if (this._factories.has(request)) {
            return this._factories.get(request).load(request, parent, () => {
                throw new Error('CANNOT LOAD MODULE from here.');
            });
        }
        return undefined;
    }
}
export class ExtHostExtensionService extends AbstractExtHostExtensionService {
    constructor() {
        super(...arguments);
        this.extensionRuntime = ExtensionRuntime.Webworker;
    }
    async _beforeAlmostReadyToRunExtensions() {
        // make sure console.log calls make it to the render
        this._instaService.createInstance(ExtHostConsoleForwarder);
        // initialize API and register actors
        const apiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
        this._fakeModules = this._instaService.createInstance(WorkerRequireInterceptor, apiFactory, {
            mine: this._myRegistry,
            all: this._globalRegistry,
        });
        await this._fakeModules.install();
        performance.mark('code/extHost/didInitAPI');
        await this._waitForDebuggerAttachment();
    }
    _getEntryPoint(extensionDescription) {
        return extensionDescription.browser;
    }
    async _loadCommonJSModule(extension, module, activationTimesBuilder) {
        module = module.with({ path: ensureSuffix(module.path, '.js') });
        const extensionId = extension?.identifier.value;
        if (extensionId) {
            performance.mark(`code/extHost/willFetchExtensionCode/${extensionId}`);
        }
        // First resolve the extension entry point URI to something we can load using `fetch`
        // This needs to be done on the main thread due to a potential `resourceUriProvider` (workbench api)
        // which is only available in the main thread
        const browserUri = URI.revive(await this._mainThreadExtensionsProxy.$asBrowserUri(module));
        const response = await fetch(browserUri.toString(true));
        if (extensionId) {
            performance.mark(`code/extHost/didFetchExtensionCode/${extensionId}`);
        }
        if (response.status !== 200) {
            throw new Error(response.statusText);
        }
        // fetch JS sources as text and create a new function around it
        const source = await response.text();
        // Here we append #vscode-extension to serve as a marker, such that source maps
        // can be adjusted for the extra wrapping function.
        const sourceURL = `${module.toString(true)}#vscode-extension`;
        const fullSource = `${source}\n//# sourceURL=${sourceURL}`;
        let initFn;
        try {
            initFn = new Function('module', 'exports', 'require', fullSource); // CodeQL [SM01632] js/eval-call there is no alternative until we move to ESM
        }
        catch (err) {
            if (extensionId) {
                console.error(`Loading code for extension ${extensionId} failed: ${err.message}`);
            }
            else {
                console.error(`Loading code failed: ${err.message}`);
            }
            console.error(`${module.toString(true)}${typeof err.line === 'number' ? ` line ${err.line}` : ''}${typeof err.column === 'number' ? ` column ${err.column}` : ''}`);
            console.error(err);
            throw err;
        }
        if (extension) {
            await this._extHostLocalizationService.initializeLocalizedMessages(extension);
        }
        // define commonjs globals: `module`, `exports`, and `require`
        const _exports = {};
        const _module = { exports: _exports };
        const _require = (request) => {
            const result = this._fakeModules.getModule(request, module);
            if (result === undefined) {
                throw new Error(`Cannot load module '${request}'`);
            }
            return result;
        };
        try {
            activationTimesBuilder.codeLoadingStart();
            if (extensionId) {
                performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
            }
            initFn(_module, _exports, _require);
            return (_module.exports !== _exports ? _module.exports : _exports);
        }
        finally {
            if (extensionId) {
                performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
            }
            activationTimesBuilder.codeLoadingStop();
        }
    }
    async $setRemoteEnvironment(_env) {
        return;
    }
    async _waitForDebuggerAttachment(waitTimeout = 5000) {
        // debugger attaches async, waiting for it fixes #106698 and #99222
        if (!this._initData.environment.isExtensionDevelopmentDebug) {
            return;
        }
        const deadline = Date.now() + waitTimeout;
        while (Date.now() < deadline && !('__jsDebugIsReady' in globalThis)) {
            await timeout(10);
        }
    }
}
function ensureSuffix(path, suffix) {
    return path.endsWith(suffix) ? path : path + suffix;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3dvcmtlci9leHRIb3N0RXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLE1BQU0sd0JBQXlCLFNBQVEsa0JBQWtCO0lBQzlDLG1CQUFtQixLQUFJLENBQUM7SUFFbEMsU0FBUyxDQUFDLE9BQWUsRUFBRSxNQUFXO1FBQ3JDLEtBQUssTUFBTSxxQkFBcUIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEQsTUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxHQUFHLFdBQVcsQ0FBQTtnQkFDckIsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxD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