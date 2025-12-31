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
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService, } from '../../../../platform/environment/common/environment.js';
import { memoize } from '../../../../base/common/decorators.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { parseLineAndColumnAware } from '../../../../base/common/extpath.js';
import { LogLevelToString } from '../../../../platform/log/common/log.js';
import { isUndefined } from '../../../../base/common/types.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { EXTENSION_IDENTIFIER_WITH_LOG_REGEX } from '../../../../platform/environment/common/environmentService.js';
export const IBrowserWorkbenchEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class BrowserWorkbenchEnvironmentService {
    get remoteAuthority() {
        return this.options.remoteAuthority;
    }
    get expectsResolverExtension() {
        return !!this.options.remoteAuthority?.includes('+') && !this.options.webSocketFactory;
    }
    get isBuilt() {
        return !!this.productService.commit;
    }
    get logLevel() {
        const logLevelFromPayload = this.payload?.get('logLevel');
        if (logLevelFromPayload) {
            return logLevelFromPayload
                .split(',')
                .find((entry) => !EXTENSION_IDENTIFIER_WITH_LOG_REGEX.test(entry));
        }
        return this.options.developmentOptions?.logLevel !== undefined
            ? LogLevelToString(this.options.developmentOptions?.logLevel)
            : undefined;
    }
    get extensionLogLevel() {
        const logLevelFromPayload = this.payload?.get('logLevel');
        if (logLevelFromPayload) {
            const result = [];
            for (const entry of logLevelFromPayload.split(',')) {
                const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(entry);
                if (matches && matches[1] && matches[2]) {
                    result.push([matches[1], matches[2]]);
                }
            }
            return result.length ? result : undefined;
        }
        return this.options.developmentOptions?.extensionLogLevel !== undefined
            ? this.options.developmentOptions?.extensionLogLevel.map(([extension, logLevel]) => [
                extension,
                LogLevelToString(logLevel),
            ])
            : undefined;
    }
    get profDurationMarkers() {
        const profDurationMarkersFromPayload = this.payload?.get('profDurationMarkers');
        if (profDurationMarkersFromPayload) {
            const result = [];
            for (const entry of profDurationMarkersFromPayload.split(',')) {
                result.push(entry);
            }
            return result.length === 2 ? result : undefined;
        }
        return undefined;
    }
    get windowLogsPath() {
        return this.logsHome;
    }
    get logFile() {
        return joinPath(this.windowLogsPath, 'window.log');
    }
    get userRoamingDataHome() {
        return URI.file('/User').with({ scheme: Schemas.vscodeUserData });
    }
    get argvResource() {
        return joinPath(this.userRoamingDataHome, 'argv.json');
    }
    get cacheHome() {
        return joinPath(this.userRoamingDataHome, 'caches');
    }
    get workspaceStorageHome() {
        return joinPath(this.userRoamingDataHome, 'workspaceStorage');
    }
    get localHistoryHome() {
        return joinPath(this.userRoamingDataHome, 'History');
    }
    get stateResource() {
        return joinPath(this.userRoamingDataHome, 'State', 'storage.json');
    }
    /**
     * In Web every workspace can potentially have scoped user-data
     * and/or extensions and if Sync state is shared then it can make
     * Sync error prone - say removing extensions from another workspace.
     * Hence scope Sync state per workspace. Sync scoped to a workspace
     * is capable of handling opening same workspace in multiple windows.
     */
    get userDataSyncHome() {
        return joinPath(this.userRoamingDataHome, 'sync', this.workspaceId);
    }
    get sync() {
        return undefined;
    }
    get keyboardLayoutResource() {
        return joinPath(this.userRoamingDataHome, 'keyboardLayout.json');
    }
    get untitledWorkspacesHome() {
        return joinPath(this.userRoamingDataHome, 'Workspaces');
    }
    get serviceMachineIdResource() {
        return joinPath(this.userRoamingDataHome, 'machineid');
    }
    get extHostLogsPath() {
        return joinPath(this.logsHome, 'exthost');
    }
    get debugExtensionHost() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.params;
    }
    get isExtensionDevelopment() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.isExtensionDevelopment;
    }
    get extensionDevelopmentLocationURI() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionDevelopmentLocationURI;
    }
    get extensionDevelopmentLocationKind() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionDevelopmentKind;
    }
    get extensionTestsLocationURI() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionTestsLocationURI;
    }
    get extensionEnabledProposedApi() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionEnabledProposedApi;
    }
    get debugRenderer() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.debugRenderer;
    }
    get enableSmokeTestDriver() {
        return this.options.developmentOptions?.enableSmokeTestDriver;
    }
    get disableExtensions() {
        return this.payload?.get('disableExtensions') === 'true';
    }
    get enableExtensions() {
        return this.options.enabledExtensions;
    }
    get webviewExternalEndpoint() {
        const endpoint = this.options.webviewEndpoint ||
            this.productService.webviewContentExternalBaseUrlTemplate ||
            'https://{{uuid}}.vscode-cdn.net/{{quality}}/{{commit}}/out/vs/workbench/contrib/webview/browser/pre/';
        const webviewExternalEndpointCommit = this.payload?.get('webviewExternalEndpointCommit');
        return endpoint
            .replace('{{commit}}', webviewExternalEndpointCommit ??
            this.productService.commit ??
            'ef65ac1ba57f57f2a3961bfe94aa20481caca4c6')
            .replace('{{quality}}', (webviewExternalEndpointCommit ? 'insider' : this.productService.quality) ?? 'insider');
    }
    get extensionTelemetryLogResource() {
        return joinPath(this.logsHome, 'extensionTelemetry.log');
    }
    get disableTelemetry() {
        return false;
    }
    get verbose() {
        return this.payload?.get('verbose') === 'true';
    }
    get logExtensionHostCommunication() {
        return this.payload?.get('logExtensionHostCommunication') === 'true';
    }
    get skipReleaseNotes() {
        return this.payload?.get('skipReleaseNotes') === 'true';
    }
    get skipWelcome() {
        return this.payload?.get('skipWelcome') === 'true';
    }
    get disableWorkspaceTrust() {
        return !this.options.enableWorkspaceTrust;
    }
    get profile() {
        return this.payload?.get('profile');
    }
    get editSessionId() {
        return this.options.editSessionId;
    }
    constructor(workspaceId, logsHome, options, productService) {
        this.workspaceId = workspaceId;
        this.logsHome = logsHome;
        this.options = options;
        this.productService = productService;
        this.extensionHostDebugEnvironment = undefined;
        if (options.workspaceProvider && Array.isArray(options.workspaceProvider.payload)) {
            try {
                this.payload = new Map(options.workspaceProvider.payload);
            }
            catch (error) {
                onUnexpectedError(error); // possible invalid payload for map
            }
        }
    }
    resolveExtensionHostDebugEnvironment() {
        const extensionHostDebugEnvironment = {
            params: {
                port: null,
                break: false,
            },
            debugRenderer: false,
            isExtensionDevelopment: false,
            extensionDevelopmentLocationURI: undefined,
            extensionDevelopmentKind: undefined,
        };
        // Fill in selected extra environmental properties
        if (this.payload) {
            for (const [key, value] of this.payload) {
                switch (key) {
                    case 'extensionDevelopmentPath':
                        if (!extensionHostDebugEnvironment.extensionDevelopmentLocationURI) {
                            extensionHostDebugEnvironment.extensionDevelopmentLocationURI = [];
                        }
                        extensionHostDebugEnvironment.extensionDevelopmentLocationURI.push(URI.parse(value));
                        extensionHostDebugEnvironment.isExtensionDevelopment = true;
                        break;
                    case 'extensionDevelopmentKind':
                        extensionHostDebugEnvironment.extensionDevelopmentKind = [value];
                        break;
                    case 'extensionTestsPath':
                        extensionHostDebugEnvironment.extensionTestsLocationURI = URI.parse(value);
                        break;
                    case 'debugRenderer':
                        extensionHostDebugEnvironment.debugRenderer = value === 'true';
                        break;
                    case 'debugId':
                        extensionHostDebugEnvironment.params.debugId = value;
                        break;
                    case 'inspect-brk-extensions':
                        extensionHostDebugEnvironment.params.port = parseInt(value);
                        extensionHostDebugEnvironment.params.break = true;
                        break;
                    case 'inspect-extensions':
                        extensionHostDebugEnvironment.params.port = parseInt(value);
                        break;
                    case 'enableProposedApi':
                        extensionHostDebugEnvironment.extensionEnabledProposedApi = [];
                        break;
                }
            }
        }
        const developmentOptions = this.options.developmentOptions;
        if (developmentOptions && !extensionHostDebugEnvironment.isExtensionDevelopment) {
            if (developmentOptions.extensions?.length) {
                extensionHostDebugEnvironment.extensionDevelopmentLocationURI =
                    developmentOptions.extensions.map((e) => URI.revive(e));
                extensionHostDebugEnvironment.isExtensionDevelopment = true;
            }
            if (developmentOptions.extensionTestsPath) {
                extensionHostDebugEnvironment.extensionTestsLocationURI = URI.revive(developmentOptions.extensionTestsPath);
            }
        }
        return extensionHostDebugEnvironment;
    }
    get filesToOpenOrCreate() {
        if (this.payload) {
            const fileToOpen = this.payload.get('openFile');
            if (fileToOpen) {
                const fileUri = URI.parse(fileToOpen);
                // Support: --goto parameter to open on line/col
                if (this.payload.has('gotoLineMode')) {
                    const pathColumnAware = parseLineAndColumnAware(fileUri.path);
                    return [
                        {
                            fileUri: fileUri.with({ path: pathColumnAware.path }),
                            options: {
                                selection: !isUndefined(pathColumnAware.line)
                                    ? {
                                        startLineNumber: pathColumnAware.line,
                                        startColumn: pathColumnAware.column || 1,
                                    }
                                    : undefined,
                            },
                        },
                    ];
                }
                return [{ fileUri }];
            }
        }
        return undefined;
    }
    get filesToDiff() {
        if (this.payload) {
            const fileToDiffPrimary = this.payload.get('diffFilePrimary');
            const fileToDiffSecondary = this.payload.get('diffFileSecondary');
            if (fileToDiffPrimary && fileToDiffSecondary) {
                return [
                    { fileUri: URI.parse(fileToDiffSecondary) },
                    { fileUri: URI.parse(fileToDiffPrimary) },
                ];
            }
        }
        return undefined;
    }
    get filesToMerge() {
        if (this.payload) {
            const fileToMerge1 = this.payload.get('mergeFile1');
            const fileToMerge2 = this.payload.get('mergeFile2');
            const fileToMergeBase = this.payload.get('mergeFileBase');
            const fileToMergeResult = this.payload.get('mergeFileResult');
            if (fileToMerge1 && fileToMerge2 && fileToMergeBase && fileToMergeResult) {
                return [
                    { fileUri: URI.parse(fileToMerge1) },
                    { fileUri: URI.parse(fileToMerge2) },
                    { fileUri: URI.parse(fileToMergeBase) },
                    { fileUri: URI.parse(fileToMergeResult) },
                ];
            }
        }
        return undefined;
    }
}
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "remoteAuthority", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "expectsResolverExtension", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "isBuilt", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logLevel", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "windowLogsPath", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logFile", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "userRoamingDataHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "argvResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "cacheHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "workspaceStorageHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "localHistoryHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "stateResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "userDataSyncHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "sync", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "keyboardLayoutResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "untitledWorkspacesHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "serviceMachineIdResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extHostLogsPath", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "debugExtensionHost", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "isExtensionDevelopment", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionDevelopmentLocationURI", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionDevelopmentLocationKind", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionTestsLocationURI", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionEnabledProposedApi", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "debugRenderer", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "enableSmokeTestDriver", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableExtensions", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "enableExtensions", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "webviewExternalEndpoint", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionTelemetryLogResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableTelemetry", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "verbose", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logExtensionHostCommunication", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "skipReleaseNotes", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "skipWelcome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableWorkspaceTrust", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "profile", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "editSessionId", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToOpenOrCreate", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToDiff", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToMerge", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Vudmlyb25tZW50L2Jyb3dzZXIvZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFFTixtQkFBbUIsR0FFbkIsTUFBTSx3REFBd0QsQ0FBQTtBQUsvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRW5HLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRW5ILE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLHNCQUFzQixDQUd2RSxtQkFBbUIsQ0FBQyxDQUFBO0FBa0J0QixNQUFNLE9BQU8sa0NBQWtDO0lBSTlDLElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFBO0lBQ3BDLENBQUM7SUFHRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLENBQUMs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