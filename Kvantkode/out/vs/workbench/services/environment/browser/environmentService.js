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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZW52aXJvbm1lbnQvYnJvd3Nlci9lbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUVOLG1CQUFtQixHQUVuQixNQUFNLHdEQUF3RCxDQUFBO0FBSy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbkcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFbkgsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsc0JBQXNCLENBR3ZFLG1CQUFtQixDQUFDLENBQUE7QUFrQnRCLE1BQU0sT0FBTyxrQ0FBa0M7SUFJOUMsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUE7SUFDcEMsQ0FBQztJQUdELElBQUks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