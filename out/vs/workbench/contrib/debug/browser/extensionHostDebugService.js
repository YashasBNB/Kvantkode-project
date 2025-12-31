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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMsK0JBQStCLEdBQy9CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlDQUFpQyxFQUNqQyxxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLHlCQUF5QixHQUN6QixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUUzRixJQUFN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