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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRlbnNpb25Ib3N0TWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR2pELE9BQU8sRUFBRSxXQUFXLEVBQTBCLE1BQU0sdUJBQXVCLENBQUE7QUFFM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzdFLE9BQU8sRUFDTixjQUFjLEdBR2QsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFLckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBV3pELE1BQU0sT0FB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