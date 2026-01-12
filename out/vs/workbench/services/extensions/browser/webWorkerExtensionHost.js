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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvYnJvd3Nlci93ZWJXb3JrZXJFeHRlbnNpb25Ib3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQW1CLEdBQUcsRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbkUsT0FBTyxF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