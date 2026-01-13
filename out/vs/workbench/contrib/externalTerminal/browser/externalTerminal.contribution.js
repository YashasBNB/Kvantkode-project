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
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { URI } from '../../../../base/common/uri.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ITerminalGroupService, ITerminalService as IIntegratedTerminalService, } from '../../terminal/browser/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { getMultiSelectedResources, IExplorerService } from '../../files/browser/files.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { distinct } from '../../../../base/common/arrays.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../base/common/platform.js';
import { dirname, basename } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IExternalTerminalService, } from '../../../../platform/externalTerminal/common/externalTerminal.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
const OPEN_IN_TERMINAL_COMMAND_ID = 'openInTerminal';
const OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID = 'openInIntegratedTerminal';
function registerOpenTerminalCommand(id, explorerKind) {
    CommandsRegistry.registerCommand({
        id: id,
        handler: async (accessor, resource) => {
            const configurationService = accessor.get(IConfigurationService);
            const fileService = accessor.get(IFileService);
            const integratedTerminalService = accessor.get(IIntegratedTerminalService);
            const remoteAgentService = accessor.get(IRemoteAgentService);
            const terminalGroupService = accessor.get(ITerminalGroupService);
            let externalTerminalService = undefined;
            try {
                externalTerminalService = accessor.get(IExternalTerminalService);
            }
            catch { }
            const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
            return fileService.resolveAll(resources.map((r) => ({ resource: r }))).then(async (stats) => {
                // Always use integrated terminal when using a remote
                const config = configurationService.getValue();
                const useIntegratedTerminal = remoteAgentService.getConnection() || explorerKind === 'integrated';
                const targets = distinct(stats.filter((data) => data.success));
                if (useIntegratedTerminal) {
                    // TODO: Use uri for cwd in createterminal
                    const opened = {};
                    const cwds = targets.map(({ stat }) => {
                        const resource = stat.resource;
                        if (stat.isDirectory) {
                            return resource;
                        }
                        return URI.from({
                            scheme: resource.scheme,
                            authority: resource.authority,
                            fragment: resource.fragment,
                            query: resource.query,
                            path: dirname(resource.path),
                        });
                    });
                    for (const cwd of cwds) {
                        if (opened[cwd.path]) {
                            return;
                        }
                        opened[cwd.path] = true;
                        const instance = await integratedTerminalService.createTerminal({ config: { cwd } });
                        if (instance &&
                            instance.target !== TerminalLocation.Editor &&
                            (resources.length === 1 ||
                                !resource ||
                                cwd.path === resource.path ||
                                cwd.path === dirname(resource.path))) {
                            integratedTerminalService.setActiveInstance(instance);
                            terminalGroupService.showPanel(true);
                        }
                    }
                }
                else if (externalTerminalService) {
                    distinct(targets.map(({ stat }) => stat.isDirectory ? stat.resource.fsPath : dirname(stat.resource.fsPath))).forEach((cwd) => {
                        externalTerminalService.openTerminal(config.terminal.external, cwd);
                    });
                }
            });
        },
    });
}
registerOpenTerminalCommand(OPEN_IN_TERMINAL_COMMAND_ID, 'external');
registerOpenTerminalCommand(OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID, 'integrated');
let ExternalTerminalContribution = class ExternalTerminalContribution extends Disposable {
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        const shouldShowIntegratedOnLocal = ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'integrated'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')));
        const shouldShowExternalKindOnLocal = ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'external'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')));
        this._openInIntegratedTerminalMenuItem = {
            group: 'navigation',
            order: 30,
            command: {
                id: OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID,
                title: nls.localize('scopedConsoleAction.Integrated', 'Open in Integrated Terminal'),
            },
            when: ContextKeyExpr.or(shouldShowIntegratedOnLocal, ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote)),
        };
        this._openInTerminalMenuItem = {
            group: 'navigation',
            order: 31,
            command: {
                id: OPEN_IN_TERMINAL_COMMAND_ID,
                title: nls.localize('scopedConsoleAction.external', 'Open in External Terminal'),
            },
            when: shouldShowExternalKindOnLocal,
        };
        MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInTerminalMenuItem);
        MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInIntegratedTerminalMenuItem);
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('terminal.explorerKind') ||
                e.affectsConfiguration('terminal.external')) {
                this._refreshOpenInTerminalMenuItemTitle();
            }
        }));
        this._refreshOpenInTerminalMenuItemTitle();
    }
    isWindows() {
        const config = this._configurationService.getValue().terminal;
        if (isWindows && config.external?.windowsExec) {
            const file = basename(config.external.windowsExec);
            if (file === 'wt' || file === 'wt.exe') {
                return true;
            }
        }
        return false;
    }
    _refreshOpenInTerminalMenuItemTitle() {
        if (this.isWindows()) {
            this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.wt', 'Open in Windows Terminal');
        }
    }
};
ExternalTerminalContribution = __decorate([
    __param(0, IConfigurationService)
], ExternalTerminalContribution);
export { ExternalTerminalContribution };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExternalTerminalContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVybmFsVGVybWluYWwvYnJvd3Nlci9leHRlcm5hbFRlcm1pbmFsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBYSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZ0JBQWdCLElBQUksMEJBQTBCLEdBQzlDLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9B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