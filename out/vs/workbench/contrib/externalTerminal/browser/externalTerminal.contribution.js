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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlcm5hbFRlcm1pbmFsL2Jyb3dzZXIvZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQWEsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGdCQUFnQixJQUFJLDBCQUEwQixHQUM5QyxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBR04sVUFBVSxJQUFJLG1CQUFt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