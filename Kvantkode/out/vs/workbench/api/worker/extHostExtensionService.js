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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvd29ya2VyL2V4dEhvc3RFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWpGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEUsTUFBTSx3QkFBeUIsU0FBUSxrQkFBa0I7SUFDOUMsbUJBQW1CLEtBQUksQ0FBQztJQUVsQyxTQUFTLENBQUMsT0FBZSxFQUFFLE1BQVc7UUFDckMsS0FBSyxNQUFNLHFCQUFxQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4RCxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNsRCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixPQUFPLEdBQUcsV0FBVyxDQUFBO2dCQUNyQixNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUMsVUFB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