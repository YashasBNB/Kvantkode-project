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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { observableValue, } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { FOLDER_SETTINGS_PATH, IPreferencesService, } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { mcpConfigurationSection } from './mcpConfiguration.js';
export const IMcpConfigPathsService = createDecorator('IMcpConfigPathsService');
let McpConfigPathsService = class McpConfigPathsService extends Disposable {
    get paths() {
        return this._paths;
    }
    constructor(workspaceContextService, productService, labelService, _environmentService, remoteAgentService, preferencesService) {
        super();
        this._environmentService = _environmentService;
        const workspaceConfig = workspaceContextService.getWorkspace().configuration;
        const initialPaths = [
            {
                id: 'usrlocal',
                key: 'userLocalValue',
                target: 3 /* ConfigurationTarget.USER_LOCAL */,
                label: localize('mcp.configuration.userLocalValue', 'Global in {0}', productService.nameShort),
                scope: 0 /* StorageScope.PROFILE */,
                order: 200 /* McpCollectionSortOrder.User */,
                uri: preferencesService.userSettingsResource,
                section: [mcpConfigurationSection],
            },
            workspaceConfig && {
                id: 'workspace',
                key: 'workspaceValue',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
                label: basename(workspaceConfig),
                scope: 1 /* StorageScope.WORKSPACE */,
                order: 100 /* McpCollectionSortOrder.Workspace */,
                remoteAuthority: _environmentService.remoteAuthority,
                uri: workspaceConfig,
                section: ['settings', mcpConfigurationSection],
            },
            ...workspaceContextService.getWorkspace().folders.map((wf) => this._fromWorkspaceFolder(wf)),
        ];
        this._paths = observableValue('mcpConfigPaths', initialPaths.filter(isDefined));
        remoteAgentService.getEnvironment().then((env) => {
            const label = _environmentService.remoteAuthority
                ? labelService.getHostLabel(Schemas.vscodeRemote, _environmentService.remoteAuthority)
                : 'Remote';
            this._paths.set([
                ...this.paths.get(),
                {
                    id: 'usrremote',
                    key: 'userRemoteValue',
                    target: 4 /* ConfigurationTarget.USER_REMOTE */,
                    label,
                    scope: 0 /* StorageScope.PROFILE */,
                    order: 200 /* McpCollectionSortOrder.User */ + -50 /* McpCollectionSortOrder.RemoteBoost */,
                    uri: env?.settingsPath,
                    remoteAuthority: _environmentService.remoteAuthority,
                    section: [mcpConfigurationSection],
                },
            ], undefined);
        });
        this._register(workspaceContextService.onDidChangeWorkspaceFolders((e) => {
            const next = this._paths.get().slice();
            for (const folder of e.added) {
                next.push(this._fromWorkspaceFolder(folder));
            }
            for (const folder of e.removed) {
                const idx = next.findIndex((c) => c.workspaceFolder === folder);
                if (idx !== -1) {
                    next.splice(idx, 1);
                }
            }
            this._paths.set(next, undefined);
        }));
    }
    _fromWorkspaceFolder(workspaceFolder) {
        return {
            id: `wf${workspaceFolder.index}`,
            key: 'workspaceFolderValue',
            target: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
            label: `${workspaceFolder.name}/.vscode/mcp.json`,
            scope: 1 /* StorageScope.WORKSPACE */,
            remoteAuthority: this._environmentService.remoteAuthority,
            order: 0 /* McpCollectionSortOrder.WorkspaceFolder */,
            uri: URI.joinPath(workspaceFolder.uri, FOLDER_SETTINGS_PATH, '../mcp.json'),
            workspaceFolder,
        };
    }
};
McpConfigPathsService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IProductService),
    __param(2, ILabelService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IRemoteAgentService),
    __param(5, IPreferencesService)
], McpConfigPathsService);
export { McpConfigPathsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlnUGF0aHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BDb25maWdQYXRoc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBR04sZUFBZSxHQUNmLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBZ0Mv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