/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as errors from '../../../base/common/errors.js';
import * as performance from '../../../base/common/performance.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { RPCProtocol } from '../../services/extensions/common/rpcProtocol.js';
import { ExtensionError, } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { getSingletonServiceDescriptors } from '../../../platform/instantiation/common/extensions.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { IExtHostRpcService, ExtHostRpcService } from './extHostRpcService.js';
import { IURITransformerService, URITransformerService } from './extHostUriTransformerService.js';
import { IExtHostExtensionService, IHostUtils } from './extHostExtensionService.js';
import { IExtHostTelemetry } from './extHostTelemetry.js';
export class ErrorHandler {
    static async installEarlyHandler(accessor) {
        // increase number of stack frames (from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
        Error.stackTraceLimit = 100;
        // does NOT dependent of extension information, can be installed immediately, and simply forwards
        // to the log service and main thread errors
        const logService = accessor.get(ILogService);
        const rpcService = accessor.get(IExtHostRpcService);
        const mainThreadErrors = rpcService.getProxy(MainContext.MainThreadErrors);
        errors.setUnexpectedErrorHandler((err) => {
            logService.error(err);
            const data = errors.transformErrorForSerialization(err);
            mainThreadErrors.$onUnexpectedError(data);
        });
    }
    static async installFullHandler(accessor) {
        // uses extension knowledges to correlate errors with extensions
        const logService = accessor.get(ILogService);
        const rpcService = accessor.get(IExtHostRpcService);
        const extensionService = accessor.get(IExtHostExtensionService);
        const extensionTelemetry = accessor.get(IExtHostTelemetry);
        const mainThreadExtensions = rpcService.getProxy(MainContext.MainThreadExtensionService);
        const mainThreadErrors = rpcService.getProxy(MainContext.MainThreadErrors);
        const map = await extensionService.getExtensionPathIndex();
        const extensionErrors = new WeakMap();
        // PART 1
        // set the prepareStackTrace-handle and use it as a side-effect to associate errors
        // with extensions - this works by looking up callsites in the extension path index
        function prepareStackTraceAndFindExtension(error, stackTrace) {
            if (extensionErrors.has(error)) {
                return extensionErrors.get(error).stack;
            }
            let stackTraceMessage = '';
            let extension;
            let fileName;
            for (const call of stackTrace) {
                stackTraceMessage += `\n\tat ${call.toString()}`;
                fileName = call.getFileName();
                if (!extension && fileName) {
                    extension = map.findSubstr(URI.file(fileName));
                }
            }
            const result = `${error.name || 'Error'}: ${error.message || ''}${stackTraceMessage}`;
            extensionErrors.set(error, { extensionIdentifier: extension?.identifier, stack: result });
            return result;
        }
        const _wasWrapped = Symbol('prepareStackTrace wrapped');
        let _prepareStackTrace = prepareStackTraceAndFindExtension;
        Object.defineProperty(Error, 'prepareStackTrace', {
            configurable: false,
            get() {
                return _prepareStackTrace;
            },
            set(v) {
                if (v === prepareStackTraceAndFindExtension || !v || v[_wasWrapped]) {
                    _prepareStackTrace = v || prepareStackTraceAndFindExtension;
                    return;
                }
                _prepareStackTrace = function (error, stackTrace) {
                    prepareStackTraceAndFindExtension(error, stackTrace);
                    return v.call(Error, error, stackTrace);
                };
                Object.assign(_prepareStackTrace, { [_wasWrapped]: true });
            },
        });
        // PART 2
        // set the unexpectedErrorHandler and check for extensions that have been identified as
        // having caused the error. Note that the runtime order is actually reversed, the code
        // below accesses the stack-property which triggers the code above
        errors.setUnexpectedErrorHandler((err) => {
            logService.error(err);
            const errorData = errors.transformErrorForSerialization(err);
            let extension;
            if (err instanceof ExtensionError) {
                extension = err.extension;
            }
            else {
                const stackData = extensionErrors.get(err);
                extension = stackData?.extensionIdentifier;
            }
            if (extension) {
                mainThreadExtensions.$onExtensionRuntimeError(extension, errorData);
                const reported = extensionTelemetry.onExtensionError(extension, err);
                logService.trace('forwarded error to extension?', reported, extension);
            }
        });
        errors.errorHandler.addListener((err) => {
            mainThreadErrors.$onUnexpectedError(err);
        });
    }
}
export class ExtensionHostMain {
    constructor(protocol, initData, hostUtils, uriTransformer, messagePorts) {
        this._hostUtils = hostUtils;
        this._rpcProtocol = new RPCProtocol(protocol, null, uriTransformer);
        // ensure URIs are transformed and revived
        initData = ExtensionHostMain._transform(initData, this._rpcProtocol);
        // bootstrap services
        const services = new ServiceCollection(...getSingletonServiceDescriptors());
        services.set(IExtHostInitDataService, { _serviceBrand: undefined, ...initData, messagePorts });
        services.set(IExtHostRpcService, new ExtHostRpcService(this._rpcProtocol));
        services.set(IURITransformerService, new URITransformerService(uriTransformer));
        services.set(IHostUtils, hostUtils);
        const instaService = new InstantiationService(services, true);
        instaService.invokeFunction(ErrorHandler.installEarlyHandler);
        // ugly self - inject
        this._logService = instaService.invokeFunction((accessor) => accessor.get(ILogService));
        performance.mark(`code/extHost/didCreateServices`);
        if (this._hostUtils.pid) {
            this._logService.info(`Extension host with pid ${this._hostUtils.pid} started`);
        }
        else {
            this._logService.info(`Extension host started`);
        }
        this._logService.trace('initData', initData);
        // ugly self - inject
        // must call initialize *after* creating the extension service
        // because `initialize` itself creates instances that depend on it
        this._extensionService = instaService.invokeFunction((accessor) => accessor.get(IExtHostExtensionService));
        this._extensionService.initialize();
        // install error handler that is extension-aware
        instaService.invokeFunction(ErrorHandler.installFullHandler);
    }
    async asBrowserUri(uri) {
        const mainThreadExtensionsProxy = this._rpcProtocol.getProxy(MainContext.MainThreadExtensionService);
        return URI.revive(await mainThreadExtensionsProxy.$asBrowserUri(uri));
    }
    terminate(reason) {
        this._extensionService.terminate(reason);
    }
    static _transform(initData, rpcProtocol) {
        initData.extensions.allExtensions.forEach((ext) => {
            ;
            ext.extensionLocation = URI.revive(rpcProtocol.transformIncomingURIs(ext.extensionLocation));
        });
        initData.environment.appRoot = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.appRoot));
        const extDevLocs = initData.environment.extensionDevelopmentLocationURI;
        if (extDevLocs) {
            initData.environment.extensionDevelopmentLocationURI = extDevLocs.map((url) => URI.revive(rpcProtocol.transformIncomingURIs(url)));
        }
        initData.environment.extensionTestsLocationURI = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.extensionTestsLocationURI));
        initData.environment.globalStorageHome = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.globalStorageHome));
        initData.environment.workspaceStorageHome = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.workspaceStorageHome));
        initData.nlsBaseUrl = URI.revive(rpcProtocol.transformIncomingURIs(initData.nlsBaseUrl));
        initData.logsLocation = URI.revive(rpcProtocol.transformIncomingURIs(initData.logsLocation));
        initData.workspace = rpcProtocol.transformIncomingURIs(initData.workspace);
        return initData;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dGVuc2lvbkhvc3RNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEQsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHakQsT0FBTyxFQUFFLFdBQVcsRUFBMEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0UsT0FBTyxFQUNOLGNBQWMsR0FHZCxNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUtyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFXekQsTUFB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