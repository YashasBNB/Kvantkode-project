/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as performance from '../../../base/common/performance.js';
import { createApiFactoryAndRegisterActors } from '../common/extHost.api.impl.js';
import { RequireInterceptor } from '../common/extHostRequireInterceptor.js';
import { connectProxyResolver } from './proxyResolver.js';
import { AbstractExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostDownloadService } from './extHostDownloadService.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { ExtensionRuntime } from '../common/extHostTypes.js';
import { CLIServer } from './extHostCLIServer.js';
import { realpathSync } from '../../../base/node/extpath.js';
import { ExtHostConsoleForwarder } from './extHostConsoleForwarder.js';
import { ExtHostDiskFileSystemProvider } from './extHostDiskFileSystemProvider.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
class NodeModuleRequireInterceptor extends RequireInterceptor {
    _installInterceptor() {
        const that = this;
        const node_module = require('module');
        const originalLoad = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            request = applyAlternatives(request);
            if (!that._factories.has(request)) {
                return originalLoad.apply(this, arguments);
            }
            return that._factories
                .get(request)
                .load(request, URI.file(realpathSync(parent.filename)), (request) => originalLoad.apply(this, [request, parent, isMain]));
        };
        const originalLookup = node_module._resolveLookupPaths;
        node_module._resolveLookupPaths = (request, parent) => {
            return originalLookup.call(this, applyAlternatives(request), parent);
        };
        const originalResolveFilename = node_module._resolveFilename;
        node_module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
            if (request === 'vsda' && Array.isArray(options?.paths) && options.paths.length === 0) {
                // ESM: ever since we moved to ESM, `require.main` will be `undefined` for extensions
                // Some extensions have been using `require.resolve('vsda', { paths: require.main.paths })`
                // to find the `vsda` module in our app root. To be backwards compatible with this pattern,
                // we help by filling in the `paths` array with the node modules paths of the current module.
                options.paths = node_module._nodeModulePaths(import.meta.dirname);
            }
            return originalResolveFilename.call(this, request, parent, isMain, options);
        };
        const applyAlternatives = (request) => {
            for (const alternativeModuleName of that._alternatives) {
                const alternative = alternativeModuleName(request);
                if (alternative) {
                    request = alternative;
                    break;
                }
            }
            return request;
        };
    }
}
export class ExtHostExtensionService extends AbstractExtHostExtensionService {
    constructor() {
        super(...arguments);
        this.extensionRuntime = ExtensionRuntime.Node;
    }
    async _beforeAlmostReadyToRunExtensions() {
        // make sure console.log calls make it to the render
        this._instaService.createInstance(ExtHostConsoleForwarder);
        // initialize API and register actors
        const extensionApiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
        // Register Download command
        this._instaService.createInstance(ExtHostDownloadService);
        // Register CLI Server for ipc
        if (this._initData.remote.isRemote && this._initData.remote.authority) {
            const cliServer = this._instaService.createInstance(CLIServer);
            process.env['VSCODE_IPC_HOOK_CLI'] = cliServer.ipcHandlePath;
        }
        // Register local file system shortcut
        this._instaService.createInstance(ExtHostDiskFileSystemProvider);
        // Module loading tricks
        const interceptor = this._instaService.createInstance(NodeModuleRequireInterceptor, extensionApiFactory, { mine: this._myRegistry, all: this._globalRegistry });
        await interceptor.install();
        performance.mark('code/extHost/didInitAPI');
        // Do this when extension service exists, but extensions are not being activated yet.
        const configProvider = await this._extHostConfiguration.getConfigProvider();
        await connectProxyResolver(this._extHostWorkspace, configProvider, this, this._logService, this._mainThreadTelemetryProxy, this._initData, this._store);
        performance.mark('code/extHost/didInitProxyResolver');
    }
    _getEntryPoint(extensionDescription) {
        return extensionDescription.main;
    }
    async _loadCommonJSModule(extension, module, activationTimesBuilder) {
        if (module.scheme !== Schemas.file) {
            throw new Error(`Cannot load URI: '${module}', must be of file-scheme`);
        }
        let r = null;
        activationTimesBuilder.codeLoadingStart();
        this._logService.trace(`ExtensionService#loadCommonJSModule ${module.toString(true)}`);
        this._logService.flush();
        const extensionId = extension?.identifier.value;
        if (extension) {
            await this._extHostLocalizationService.initializeLocalizedMessages(extension);
        }
        try {
            if (extensionId) {
                performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
            }
            r = require(module.fsPath);
        }
        finally {
            if (extensionId) {
                performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
            }
            activationTimesBuilder.codeLoadingStop();
        }
        return r;
    }
    async $setRemoteEnvironment(env) {
        if (!this._initData.remote.isRemote) {
            return;
        }
        for (const key in env) {
            const value = env[key];
            if (value === null) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUMzQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUU5QyxNQUFNLDRC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