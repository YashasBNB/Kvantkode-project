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
var BrowserExtensionHostDebugService_1;
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IExtensionHostDebugService, } from '../../../../platform/debug/common/extensionHostDebug.js';
import { ExtensionHostDebugBroadcastChannel, ExtensionHostDebugChannelClient, } from '../../../../platform/debug/common/extensionHostDebugIpc.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../../platform/window/common/window.js';
import { IWorkspaceContextService, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier, hasWorkspaceFileExtension, } from '../../../../platform/workspace/common/workspace.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let BrowserExtensionHostDebugService = class BrowserExtensionHostDebugService extends ExtensionHostDebugChannelClient {
    static { BrowserExtensionHostDebugService_1 = this; }
    static { this.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY = 'debug.lastExtensionDevelopmentWorkspace'; }
    constructor(remoteAgentService, environmentService, logService, hostService, contextService, storageService, fileService) {
        const connection = remoteAgentService.getConnection();
        let channel;
        if (connection) {
            channel = connection.getChannel(ExtensionHostDebugBroadcastChannel.ChannelName);
        }
        else {
            // Extension host debugging not supported in serverless.
            channel = { call: async () => undefined, listen: () => Event.None };
        }
        super(channel);
        this.storageService = storageService;
        this.fileService = fileService;
        if (environmentService.options && environmentService.options.workspaceProvider) {
            this.workspaceProvider = environmentService.options.workspaceProvider;
        }
        else {
            this.workspaceProvider = { open: async () => true, workspace: undefined, trusted: undefined };
            logService.warn('Extension Host Debugging not available due to missing workspace provider.');
        }
        // Reload window on reload request
        this._register(this.onReload((event) => {
            if (environmentService.isExtensionDevelopment &&
                environmentService.debugExtensionHost.debugId === event.sessionId) {
                hostService.reload();
            }
        }));
        // Close window on close request
        this._register(this.onClose((event) => {
            if (environmentService.isExtensionDevelopment &&
                environmentService.debugExtensionHost.debugId === event.sessionId) {
                hostService.close();
            }
        }));
        // Remember workspace as last used for extension development
        // (unless this is API tests) to restore for a future session
        if (environmentService.isExtensionDevelopment &&
            !environmentService.extensionTestsLocationURI) {
            const workspaceId = toWorkspaceIdentifier(contextService.getWorkspace());
            if (isSingleFolderWorkspaceIdentifier(workspaceId) || isWorkspaceIdentifier(workspaceId)) {
                const serializedWorkspace = isSingleFolderWorkspaceIdentifier(workspaceId)
                    ? { folderUri: workspaceId.uri.toJSON() }
                    : { workspaceUri: workspaceId.configPath.toJSON() };
                storageService.store(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, JSON.stringify(serializedWorkspace), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                storageService.remove(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, 0 /* StorageScope.PROFILE */);
            }
        }
    }
    async openExtensionDevelopmentHostWindow(args, _debugRenderer) {
        // Add environment parameters required for debug to work
        const environment = new Map();
        const fileUriArg = this.findArgument('file-uri', args);
        if (fileUriArg && !hasWorkspaceFileExtension(fileUriArg)) {
            environment.set('openFile', fileUriArg);
        }
        const copyArgs = [
            'extensionDevelopmentPath',
            'extensionTestsPath',
            'extensionEnvironment',
            'debugId',
            'inspect-brk-extensions',
            'inspect-extensions',
        ];
        for (const argName of copyArgs) {
            const value = this.findArgument(argName, args);
            if (value) {
                environment.set(argName, value);
            }
        }
        // Find out which workspace to open debug window on
        let debugWorkspace = undefined;
        const folderUriArg = this.findArgument('folder-uri', args);
        if (folderUriArg) {
            debugWorkspace = { folderUri: URI.parse(folderUriArg) };
        }
        else {
            const fileUriArg = this.findArgument('file-uri', args);
            if (fileUriArg && hasWorkspaceFileExtension(fileUriArg)) {
                debugWorkspace = { workspaceUri: URI.parse(fileUriArg) };
            }
        }
        const extensionTestsPath = this.findArgument('extensionTestsPath', args);
        if (!debugWorkspace && !extensionTestsPath) {
            const lastExtensionDevelopmentWorkspace = this.storageService.get(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, 0 /* StorageScope.PROFILE */);
            if (lastExtensionDevelopmentWorkspace) {
                try {
                    const serializedWorkspace = JSON.parse(lastExtensionDevelopmentWorkspace);
                    if (serializedWorkspace.workspaceUri) {
                        debugWorkspace = { workspaceUri: URI.revive(serializedWorkspace.workspaceUri) };
                    }
                    else if (serializedWorkspace.folderUri) {
                        debugWorkspace = { folderUri: URI.revive(serializedWorkspace.folderUri) };
                    }
                }
                catch (error) {
                    // ignore
                }
            }
        }
        // Validate workspace exists
        if (debugWorkspace) {
            const debugWorkspaceResource = isFolderToOpen(debugWorkspace)
                ? debugWorkspace.folderUri
                : isWorkspaceToOpen(debugWorkspace)
                    ? debugWorkspace.workspaceUri
                    : undefined;
            if (debugWorkspaceResource) {
                const workspaceExists = await this.fileService.exists(debugWorkspaceResource);
                if (!workspaceExists) {
                    debugWorkspace = undefined;
                }
            }
        }
        // Open debug window as new window. Pass arguments over.
        const success = await this.workspaceProvider.open(debugWorkspace, {
            reuse: false, // debugging always requires a new window
            payload: Array.from(environment.entries()), // mandatory properties to enable debugging
        });
        return { success };
    }
    findArgument(key, args) {
        for (const a of args) {
            const k = `--${key}=`;
            if (a.indexOf(k) === 0) {
                return a.substring(k.length);
            }
        }
        return undefined;
    }
};
BrowserExtensionHostDebugService = BrowserExtensionHostDebugService_1 = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, ILogService),
    __param(3, IHostService),
    __param(4, IWorkspaceContextService),
    __param(5, IStorageService),
    __param(6, IFileService)
], BrowserExtensionHostDebugService);
registerSingleton(IExtensionHostDebugService, BrowserExtensionHostDebugService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9leHRlbnNpb25Ib3N0RGVidWdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQywrQkFBK0IsR0FDL0IsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIseUJBQXlCLEdBQ3pCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFN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