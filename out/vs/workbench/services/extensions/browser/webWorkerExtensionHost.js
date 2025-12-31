/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as dom from '../../../../base/browser/dom.js';
import { parentOriginHash } from '../../../../base/browser/iframe.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Barrier } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { canceled, onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { COI, FileAccess } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { getNLSLanguage, getNLSMessages } from '../../../../nls.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { UIKind, createMessageOfType, isMessageOfType, } from '../common/extensionHostProtocol.js';
let WebWorkerExtensionHost = class WebWorkerExtensionHost extends Disposable {
    constructor(runningLocation, startup, _initDataProvider, _telemetryService, _contextService, _labelService, _logService, _loggerService, _environmentService, _userDataProfilesService, _productService, _layoutService, _storageService) {
        super();
        this.runningLocation = runningLocation;
        this.startup = startup;
        this._initDataProvider = _initDataProvider;
        this._telemetryService = _telemetryService;
        this._contextService = _contextService;
        this._labelService = _labelService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._productService = _productService;
        this._layoutService = _layoutService;
        this._storageService = _storageService;
        this.pid = null;
        this.remoteAuthority = null;
        this.extensions = null;
        this._onDidExit = this._register(new Emitter());
        this.onExit = this._onDidExit.event;
        this._isTerminating = false;
        this._protocolPromise = null;
        this._protocol = null;
        this._extensionHostLogsLocation = joinPath(this._environmentService.extHostLogsPath, 'webWorker');
    }
    async _getWebWorkerExtensionHostIframeSrc() {
        const suffixSearchParams = new URLSearchParams();
        if (this._environmentService.debugExtensionHost && this._environmentService.debugRenderer) {
            suffixSearchParams.set('debugged', '1');
        }
        COI.addSearchParam(suffixSearchParams, true, true);
        const suffix = `?${suffixSearchParams.toString()}`;
        const iframeModulePath = `vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html`;
        if (platform.isWeb) {
            const webEndpointUrlTemplate = this._productService.webEndpointUrlTemplate;
            const commit = this._productService.commit;
            const quality = this._productService.quality;
            if (webEndpointUrlTemplate && commit && quality) {
                // Try to keep the web worker extension host iframe origin stable by storing it in workspace storage
                const key = 'webWorkerExtensionHostIframeStableOriginUUID';
                let stableOriginUUID = this._storageService.get(key, 1 /* StorageScope.WORKSPACE */);
                if (typeof stableOriginUUID === 'undefined') {
                    stableOriginUUID = generateUuid();
                    this._storageService.store(key, stableOriginUUID, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
                const hash = await parentOriginHash(mainWindow.origin, stableOriginUUID);
                const baseUrl = webEndpointUrlTemplate
                    .replace('{{uuid}}', `v--${hash}`) // using `v--` as a marker to require `parentOrigin`/`salt` verification
                    .replace('{{commit}}', commit)
                    .replace('{{quality}}', quality);
                const res = new URL(`${baseUrl}/out/${iframeModulePath}${suffix}`);
                res.searchParams.set('parentOrigin', mainWindow.origin);
                res.searchParams.set('salt', stableOriginUUID);
                return res.toString();
            }
            console.warn(`The web worker extension host is started in a same-origin iframe!`);
        }
        const relativeExtensionHostIframeSrc = FileAccess.asBrowserUri(iframeModulePath);
        return `${relativeExtensionHostIframeSrc.toString(true)}${suffix}`;
    }
    async start() {
        if (!this._protocolPromise) {
            this._protocolPromise = this._startInsideIframe();
            this._protocolPromise.then((protocol) => (this._protocol = protocol));
        }
        return this._protocolPromise;
    }
    async _startInsideIframe() {
        const webWorkerExtensionHostIframeSrc = await this._getWebWorkerExtensionHostIframeSrc();
        const emitter = this._register(new Emitter());
        const iframe = document.createElement('iframe');
        iframe.setAttribute('class', 'web-worker-ext-host-iframe');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.setAttribute('allow', 'usb; serial; hid; cross-origin-isolated;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.display = 'none';
        const vscodeWebWorkerExtHostId = generateUuid();
        iframe.setAttribute('src', `${webWorkerExtensionHostIframeSrc}&vscodeWebWorkerExtHostId=${vscodeWebWorkerExtHostId}`);
        const barrier = new Barrier();
        let port;
        let barrierError = null;
        let barrierHasError = false;
        let startTimeout = null;
        const rejectBarrier = (exitCode, error) => {
            barrierError = error;
            barrierHasError = true;
            onUnexpectedError(barrierError);
            clearTimeout(startTimeout);
            this._onDidExit.fire([81 /* ExtensionHostExitCode.UnexpectedError */, barrierError.message]);
            barrier.open();
        };
        const resolveBarrier = (messagePort) => {
            port = messagePort;
            clearTimeout(startTimeout);
            barrier.open();
        };
        startTimeout = setTimeout(() => {
            console.warn(`The Web Worker Extension Host did not start in 60s, that might be a problem.`);
        }, 60000);
        this._register(dom.addDisposableListener(mainWindow, 'message', (event) => {
            if (event.source !== iframe.contentWindow) {
                return;
            }
            if (event.data.vscodeWebWorkerExtHostId !== vscodeWebWorkerExtHostId) {
                return;
            }
            if (event.data.error) {
                const { name, message, stack } = event.data.error;
                const err = new Error();
                err.message = message;
                err.name = name;
                err.stack = stack;
                return rejectBarrier(81 /* ExtensionHostExitCode.UnexpectedError */, err);
            }
            if (event.data.type === 'vscode.bootstrap.nls') {
                iframe.contentWindow.postMessage({
                    type: event.data.type,
                    data: {
                        workerUrl: FileAccess.asBrowserUri('vs/workbench/api/worker/extensionHostWorkerMain.js').toString(true),
                        fileRoot: globalThis._VSCODE_FILE_ROOT,
                        nls: {
                            messages: getNLSMessages(),
                            language: getNLSLanguage(),
                        },
                    },
                }, '*');
                return;
            }
            const { data } = event.data;
            if (barrier.isOpen() || !(data instanceof MessagePort)) {
                console.warn('UNEXPECTED message', event);
                const err = new Error('UNEXPECTED message');
                return rejectBarrier(81 /* ExtensionHostExitCode.UnexpectedError */, err);
            }
            resolveBarrier(data);
        }));
        this._layoutService.mainContainer.appendChild(iframe);
        this._register(toDisposable(() => iframe.remove()));
        // await MessagePort and use it to directly communicate
        // with the worker extension host
        await barrier.wait();
        if (barrierHasError) {
            throw barrierError;
        }
        // Send over message ports for extension API
        const messagePorts = this._environmentService.options?.messagePorts ?? new Map();
        iframe.contentWindow.postMessage({ type: 'vscode.init', data: messagePorts }, '*', [
            ...messagePorts.values(),
        ]);
        port.onmessage = (event) => {
            const { data } = event;
            if (!(data instanceof ArrayBuffer)) {
                console.warn('UNKNOWN data received', data);
                this._onDidExit.fire([77, 'UNKNOWN data received']);
                return;
            }
            emitter.fire(VSBuffer.wrap(new Uint8Array(data, 0, data.byteLength)));
        };
        const protocol = {
            onMessage: emitter.event,
            send: (vsbuf) => {
                const data = vsbuf.buffer.buffer.slice(vsbuf.buffer.byteOffset, vsbuf.buffer.byteOffset + vsbuf.buffer.byteLength);
                port.postMessage(data, [data]);
            },
        };
        return this._performHandshake(protocol);
    }
    async _performHandshake(protocol) {
        // extension host handshake happens below
        // (1) <== wait for: Ready
        // (2) ==> send: init data
        // (3) <== wait for: Initialized
        await Event.toPromise(Event.filter(protocol.onMessage, (msg) => isMessageOfType(msg, 1 /* MessageType.Ready */)));
        if (this._isTerminating) {
            throw canceled();
        }
        protocol.send(VSBuffer.fromString(JSON.stringify(await this._createExtHostInitData())));
        if (this._isTerminating) {
            throw canceled();
        }
        await Event.toPromise(Event.filter(protocol.onMessage, (msg) => isMessageOfType(msg, 0 /* MessageType.Initialized */)));
        if (this._isTerminating) {
            throw canceled();
        }
        return protocol;
    }
    dispose() {
        if (this._isTerminating) {
            return;
        }
        this._isTerminating = true;
        this._protocol?.send(createMessageOfType(2 /* MessageType.Terminate */));
        super.dispose();
    }
    getInspectPort() {
        return undefined;
    }
    enableInspectPort() {
        return Promise.resolve(false);
    }
    async _createExtHostInitData() {
        const initData = await this._initDataProvider.getInitData();
        this.extensions = initData.extensions;
        const workspace = this._contextService.getWorkspace();
        const nlsBaseUrl = this._productService.extensionsGallery?.nlsBaseUrl;
        let nlsUrlWithDetails = undefined;
        // Only use the nlsBaseUrl if we are using a language other than the default, English.
        if (nlsBaseUrl && this._productService.commit && !platform.Language.isDefaultVariant()) {
            nlsUrlWithDetails = URI.joinPath(URI.parse(nlsBaseUrl), this._productService.commit, this._productService.version, platform.Language.value());
        }
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: 0,
            environment: {
                isExtensionDevelopmentDebug: this._environmentService.debugRenderer,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier ?? (platform.isWeb ? 'web' : 'desktop'),
                appUriScheme: this._productService.urlProtocol,
                appLanguage: platform.language,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
                workspaceStorageHome: this._environmentService.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel,
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
                ? undefined
                : {
                    configuration: workspace.configuration || undefined,
                    id: workspace.id,
                    name: this._labelService.getWorkspaceLabel(workspace),
                    transient: workspace.transient,
                },
            consoleForward: {
                includeStack: false,
                logNative: this._environmentService.debugRenderer,
            },
            extensions: this.extensions.toSnapshot(),
            nlsBaseUrl: nlsUrlWithDetails,
            telemetryInfo: {
                sessionId: this._telemetryService.sessionId,
                machineId: this._telemetryService.machineId,
                sqmId: this._telemetryService.sqmId,
                devDeviceId: this._telemetryService.devDeviceId,
                firstSessionDate: this._telemetryService.firstSessionDate,
                msftInternal: this._telemetryService.msftInternal,
            },
            logLevel: this._logService.getLevel(),
            loggers: [...this._loggerService.getRegisteredLoggers()],
            logsLocation: this._extensionHostLogsLocation,
            autoStart: this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */,
            remote: {
                authority: this._environmentService.remoteAuthority,
                connectionData: null,
                isRemote: false,
            },
            uiKind: platform.isWeb ? UIKind.Web : UIKind.Desktop,
        };
    }
};
WebWorkerExtensionHost = __decorate([
    __param(3, ITelemetryService),
    __param(4, IWorkspaceContextService),
    __param(5, ILabelService),
    __param(6, ILogService),
    __param(7, ILoggerService),
    __param(8, IBrowserWorkbenchEnvironmentService),
    __param(9, IUserDataProfilesService),
    __param(10, IProductService),
    __param(11, ILayoutService),
    __param(12, IStorageService)
], WebWorkerExtensionHost);
export { WebWorkerExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2Jyb3dzZXIvd2ViV29ya2VyRXh0ZW5zaW9uSG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFtQixHQUFHLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckYsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckcsT0FBTyxFQUlOLE1BQU0sRUFDTixtQkFBbUIsRUFDbkIsZUFBZSxHQUNmLE1BQU0sb0NBQW9DLENBQUE7QUFnQnBDLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQWNyRCxZQUNpQixlQUE4QyxFQUM5QyxPQUE2QixFQUM1QixpQkFBc0QsRUFDcEQsaUJBQXFELEVBQzlDLGVBQTBELEVBQ3JFLGFBQTZDLEVBQy9DLFdBQXlDLEVBQ3RDLGNBQStDLEVBRS9ELG1CQUF5RSxFQUMvQyx3QkFBbUUsRUFDNUUsZUFBaUQsRUFDbEQsY0FBK0MsRUFDOUMsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFmUyxvQkFBZSxHQUFmLGVBQWUsQ0FBK0I7UUFDOUMsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFxQztRQUNuQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzdCLG9CQUFlLEdBQWYsZUFBZSxDQUEwQjtRQUNwRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM5QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNyQixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFFOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQztRQUM5Qiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQzNELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDN0Isb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBM0JuRCxRQUFHLEdBQUcsSUFBSSxDQUFBO1FBQ1Ysb0JBQWUsR0FBRyxJQUFJLENBQUE7UUFDL0IsZUFBVSxHQUFtQyxJQUFJLENBQUE7UUFFdkMsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTJCLENBQUMsQ0FBQTtRQUNwRSxXQUFNLEdBQW1DLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBeUI3RSxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQTtRQUMzQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLElBQUksQ0FBQywwQkFBMEIsR0FBRyxRQUFRLENBQ3pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLEVBQ3hDLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQ0FBbUM7UUFDaEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ2hELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMzRixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxHQUFHLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUE7UUFFbEQsTUFBTSxnQkFBZ0IsR0FBb0IsMkVBQTJFLENBQUE7UUFDckgsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEIsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFBO1lBQzFFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFBO1lBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFBO1lBQzVDLElBQUksc0JBQXNCLElBQUksTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNqRCxvR0FBb0c7Z0JBQ3BHLE1BQU0sR0FBRyxHQUFHLDhDQUE4QyxDQUFBO2dCQUMxRCxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsaUNBQXlCLENBQUE7Z0JBQzVFLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsZ0JBQWdCLEdBQUcsWUFBWSxFQUFFLENBQUE7b0JBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUN6QixHQUFHLEVBQ0gsZ0JBQWdCLGdFQUdoQixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUE7Z0JBQ3hFLE1BQU0sT0FBTyxHQUFHLHNCQUFzQjtxQkFDcEMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsd0VBQXdFO3FCQUMxRyxPQUFPLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQztxQkFDN0IsT0FBTyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFFakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxPQUFPLFFBQVEsZ0JBQWdCLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQTtnQkFDbEUsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdkQsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUE7Z0JBQzlDLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3RCLENBQUM7WUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLG1FQUFtRSxDQUFDLENBQUE7UUFDbEYsQ0FBQztRQUVELE1BQU0sOEJBQThCLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2hGLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUE7SUFDbkUsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUFLO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFDakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCO1FBQy9CLE1BQU0sK0JBQStCLEdBQUcsTUFBTSxJQUFJLENBQUMsbUNBQW1DLEVBQUUsQ0FBQTtRQUN4RixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFZLENBQUMsQ0FBQTtRQUV2RCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLDRCQUE0QixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwwQ0FBMEMsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUU3QixNQUFNLHdCQUF3QixHQUFHLFlBQVksRUFBRSxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxZQUFZLENBQ2xCLEtBQUssRUFDTCxHQUFHLCtCQUErQiw2QkFBNkIsd0JBQXdCLEVBQUUsQ0FDekYsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFDN0IsSUFBSSxJQUFrQixDQUFBO1FBQ3RCLElBQUksWUFBWSxHQUFpQixJQUFJLENBQUE7UUFDckMsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFBO1FBQzNCLElBQUksWUFBWSxHQUFRLElBQUksQ0FBQTtRQUU1QixNQUFNLGFBQWEsR0FBRyxDQUFDLFFBQWdCLEVBQUUsS0FBWSxFQUFFLEVBQUU7WUFDeEQsWUFBWSxHQUFHLEtBQUssQ0FBQTtZQUNwQixlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQ3RCLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQy9CLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpREFBd0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDbkYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUF3QixFQUFFLEVBQUU7WUFDbkQsSUFBSSxHQUFHLFdBQVcsQ0FBQTtZQUNsQixZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDMUIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFBO1FBRUQsWUFBWSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyw4RUFBOEUsQ0FBQyxDQUFBO1FBQzdGLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVULElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMxRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUMzQyxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsS0FBSyx3QkFBd0IsRUFBRSxDQUFDO2dCQUN0RSxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7Z0JBQ2pELE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUE7Z0JBQ3ZCLEdBQUcsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO2dCQUNyQixHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDZixHQUFHLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtnQkFDakIsT0FBTyxhQUFhLGlEQUF3QyxHQUFHLENBQUMsQ0FBQTtZQUNqRSxDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNoRCxNQUFNLENBQUMsYUFBYyxDQUFDLFdBQVcsQ0FDaEM7b0JBQ0MsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSTtvQkFDckIsSUFBSSxFQUFFO3dCQUNMLFNBQVMsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUNqQyxvREFBb0QsQ0FDcEQsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO3dCQUNoQixRQUFRLEVBQUUsVUFBVSxDQUFDLGlCQUFpQjt3QkFDdEMsR0FBRyxFQUFFOzRCQUNKLFFBQVEsRUFBRSxjQUFjLEVBQUU7NEJBQzFCLFFBQVEsRUFBRSxjQUFjLEVBQUU7eUJBQzFCO3FCQUNEO2lCQUNELEVBQ0QsR0FBRyxDQUNILENBQUE7Z0JBQ0QsT0FBTTtZQUNQLENBQUM7WUFDRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUMzQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7Z0JBQzNDLE9BQU8sYUFBYSxpREFBd0MsR0FBRyxDQUFDLENBQUE7WUFDakUsQ0FBQztZQUNELGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkQsdURBQXVEO1FBQ3ZELGlDQUFpQztRQUNqQyxNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVwQixJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sWUFBWSxDQUFBO1FBQ25CLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxZQUFZLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNoRixNQUFNLENBQUMsYUFBYyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLEdBQUcsRUFBRTtZQUNuRixHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUU7U0FDeEIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzFCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUE7WUFDdEIsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtnQkFDbkQsT0FBTTtZQUNQLENBQUM7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUMsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUE0QjtZQUN6QyxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDeEIsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQ2pELENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQy9CLENBQUM7U0FDRCxDQUFBO1FBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FDOUIsUUFBaUM7UUFFakMseUNBQXlDO1FBQ3pDLDBCQUEwQjtRQUMxQiwwQkFBMEI7UUFDMUIsZ0NBQWdDO1FBRWhDLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FDcEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyw0QkFBb0IsQ0FBQyxDQUNsRixDQUFBO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsTUFBTSxRQUFRLEVBQUUsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixNQUFNLFFBQVEsRUFBRSxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLEtBQUssQ0FBQyxTQUFTLENBQ3BCLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsa0NBQTBCLENBQUMsQ0FDeEYsQ0FBQTtRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sUUFBUSxFQUFFLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDMUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLCtCQUF1QixDQUFDLENBQUE7UUFDaEUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0I7UUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDM0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDckQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUE7UUFDckUsSUFBSSxpQkFBaUIsR0FBb0IsU0FBUyxDQUFBO1FBQ2xELHNGQUFzRjtRQUN0RixJQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQ3hGLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQy9CLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQ3JCLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFDNUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPO1lBQ04sTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUNuQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPO1lBQ3JDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU87WUFDckMsU0FBUyxFQUFFLENBQUM7WUFDWixXQUFXLEVBQUU7Z0JBQ1osMkJBQTJCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWE7Z0JBQ25FLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVE7Z0JBQ3RDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3hGLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVc7Z0JBQzlDLFdBQVcsRUFBRSxRQUFRLENBQUMsUUFBUTtnQkFDOUIsK0JBQStCLEVBQUUsYUFBYSxDQUM3QyxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsbUJBQW1CLENBQ3hCO2dCQUNELCtCQUErQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQywrQkFBK0I7Z0JBQ3pGLHlCQUF5QixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUI7Z0JBQzdFLGlCQUFpQixFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCO2dCQUNqRixvQkFBb0IsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CO2dCQUNuRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCO2FBQzdEO1lBQ0QsU0FBUyxFQUNSLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUUsaUNBQXlCO2dCQUNoRSxDQUFDLENBQUMsU0FBUztnQkFDWCxDQUFDLENBQUM7b0JBQ0EsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLElBQUksU0FBUztvQkFDbkQsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFO29CQUNoQixJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUM7b0JBQ3JELFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztpQkFDOUI7WUFDSixjQUFjLEVBQUU7Z0JBQ2YsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLFNBQVMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYTthQUNqRDtZQUNELFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN4QyxVQUFVLEVBQUUsaUJBQWlCO1lBQzdCLGFBQWEsRUFBRTtnQkFDZCxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7Z0JBQzNDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztnQkFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO2dCQUNuQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVc7Z0JBQy9DLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0I7Z0JBQ3pELFlBQVksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWTthQUNqRDtZQUNELFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUNyQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUN4RCxZQUFZLEVBQUUsSUFBSSxDQUFDLDBCQUEwQjtZQUM3QyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sZ0RBQXdDO1lBQy9ELE1BQU0sRUFBRTtnQkFDUCxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWU7Z0JBQ25ELGNBQWMsRUFBRSxJQUFJO2dCQUNwQixRQUFRLEVBQUUsS0FBSzthQUNmO1lBQ0QsTUFBTSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPO1NBQ3BELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWxWWSxzQkFBc0I7SUFrQmhDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsWUFBQSxlQUFlLENBQUE7SUFDZixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsZUFBZSxDQUFBO0dBNUJMLHNCQUFzQixDQWtWbEMifQ==