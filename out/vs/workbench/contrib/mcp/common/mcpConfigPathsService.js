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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlnUGF0aHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcENvbmZpZ1BhdGhzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFHTixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUJBQW1CLEdBQ25CLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7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