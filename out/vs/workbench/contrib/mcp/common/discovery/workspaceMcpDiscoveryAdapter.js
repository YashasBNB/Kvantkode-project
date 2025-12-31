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
import { DisposableMap } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { FilesystemMcpDiscovery, } from './nativeMcpDiscoveryAbstract.js';
import { claudeConfigToServerDefinition } from './nativeMcpDiscoveryAdapters.js';
let CursorWorkspaceMcpDiscoveryAdapter = class CursorWorkspaceMcpDiscoveryAdapter extends FilesystemMcpDiscovery {
    constructor(fileService, _workspaceContextService, mcpRegistry, configurationService, _remoteAgentService) {
        super(configurationService, fileService, mcpRegistry);
        this._workspaceContextService = _workspaceContextService;
        this._remoteAgentService = _remoteAgentService;
        this._collections = this._register(new DisposableMap());
    }
    start() {
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders((e) => {
            for (const removed of e.removed) {
                this._collections.deleteAndDispose(removed.uri.toString());
            }
            for (const added of e.added) {
                this.watchFolder(added);
            }
        }));
        for (const folder of this._workspaceContextService.getWorkspace().folders) {
            this.watchFolder(folder);
        }
    }
    watchFolder(folder) {
        const configFile = joinPath(folder.uri, '.cursor', 'mcp.json');
        const collection = {
            id: `cursor-workspace.${folder.index}`,
            label: `${folder.name}/.cursor/mcp.json`,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority || null,
            scope: 1 /* StorageScope.WORKSPACE */,
            isTrustedByDefault: false,
            serverDefinitions: observableValue(this, []),
            presentation: {
                origin: configFile,
                order: 0 /* McpCollectionSortOrder.WorkspaceFolder */ + 1,
            },
        };
        this._collections.set(folder.uri.toString(), this.watchFile(URI.joinPath(folder.uri, '.cursor', 'mcp.json'), collection, "cursor-workspace" /* DiscoverySource.CursorWorkspace */, (contents) => {
            const defs = claudeConfigToServerDefinition(collection.id, contents, folder.uri);
            defs?.forEach((d) => (d.roots = [folder.uri]));
            return defs;
        }));
    }
};
CursorWorkspaceMcpDiscoveryAdapter = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, IMcpRegistry),
    __param(3, IConfigurationService),
    __param(4, IRemoteAgentService)
], CursorWorkspaceMcpDiscoveryAdapter);
export { CursorWorkspaceMcpDiscoveryAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlTWNwRGlzY292ZXJ5QWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L3dvcmtzcGFjZU1jcERpc2NvdmVyeUFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU1RSxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBR3JELE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUNaLFNBQVEsc0JBQXNCO0lBSzlCLFlBQ2UsV0FBeUIsRUFDYix3QkFBbUUsRUFDL0UsV0FBeUIsRUFDaEIsb0JBQTJDLEVBQzdDLG1CQUF5RDtRQUU5RSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFB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