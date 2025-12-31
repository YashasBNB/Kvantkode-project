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
import * as paths from '../../../../base/common/path.js';
import { DEFAULT_TERMINAL_OSX, } from '../../../../platform/externalTerminal/common/externalTerminal.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Schemas } from '../../../../base/common/network.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IExternalTerminalService } from '../../../../platform/externalTerminal/electron-sandbox/externalTerminalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TerminalContextKeys } from '../../terminal/common/terminalContextKey.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
const OPEN_NATIVE_CONSOLE_COMMAND_ID = 'workbench.action.terminal.openNativeConsole';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
    when: TerminalContextKeys.notFocus,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor) => {
        const historyService = accessor.get(IHistoryService);
        // Open external terminal in local workspaces
        const terminalService = accessor.get(IExternalTerminalService);
        const configurationService = accessor.get(IConfigurationService);
        const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
        const root = historyService.getLastActiveWorkspaceRoot();
        const config = configurationService.getValue('terminal.external');
        // It's a local workspace, open the root
        if (root?.scheme === Schemas.file) {
            terminalService.openTerminal(config, root.fsPath);
            return;
        }
        // If it's a remote workspace, open the canonical URI if it is a local folder
        try {
            if (root?.scheme === Schemas.vscodeRemote) {
                const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(root);
                if (canonicalUri.scheme === Schemas.file) {
                    terminalService.openTerminal(config, canonicalUri.fsPath);
                    return;
                }
            }
        }
        catch { }
        // Open the current file's folder if it's local or its canonical URI is local
        // Opens current file's folder, if no folder is open in editor
        const activeFile = historyService.getLastActiveFile(Schemas.file);
        if (activeFile?.scheme === Schemas.file) {
            terminalService.openTerminal(config, paths.dirname(activeFile.fsPath));
            return;
        }
        try {
            if (activeFile?.scheme === Schemas.vscodeRemote) {
                const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(activeFile);
                if (canonicalUri.scheme === Schemas.file) {
                    terminalService.openTerminal(config, canonicalUri.fsPath);
                    return;
                }
            }
        }
        catch { }
        // Fallback to opening without a cwd which will end up using the local home path
        terminalService.openTerminal(config, undefined);
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
        title: nls.localize2('globalConsoleAction', 'Open New External Terminal'),
    },
});
let ExternalTerminalContribution = class ExternalTerminalContribution {
    constructor(_externalTerminalService) {
        this._externalTerminalService = _externalTerminalService;
        this._updateConfiguration();
    }
    async _updateConfiguration() {
        const terminals = await this._externalTerminalService.getDefaultTerminalForPlatforms();
        const configurationRegistry = Registry.as(Extensions.Configuration);
        const terminalKindProperties = {
            type: 'string',
            enum: ['integrated', 'external', 'both'],
            enumDescriptions: [
                nls.localize('terminal.kind.integrated', 'Show the integrated terminal action.'),
                nls.localize('terminal.kind.external', 'Show the external terminal action.'),
                nls.localize('terminal.kind.both', 'Show both integrated and external terminal actions.'),
            ],
            default: 'integrated',
        };
        configurationRegistry.registerConfiguration({
            id: 'externalTerminal',
            order: 100,
            title: nls.localize('terminalConfigurationTitle', 'External Terminal'),
            type: 'object',
            properties: {
                'terminal.explorerKind': {
                    ...terminalKindProperties,
                    description: nls.localize('explorer.openInTerminalKind', 'When opening a file from the Explorer in a terminal, determines what kind of terminal will be launched'),
                },
                'terminal.sourceControlRepositoriesKind': {
                    ...terminalKindProperties,
                    description: nls.localize('sourceControlRepositories.openInTerminalKind', 'When opening a repository from the Source Control Repositories view in a terminal, determines what kind of terminal will be launched'),
                },
                'terminal.external.windowsExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.windowsExec', 'Customizes which terminal to run on Windows.'),
                    default: terminals.windows,
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'terminal.external.osxExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.osxExec', 'Customizes which terminal application to run on macOS.'),
                    default: DEFAULT_TERMINAL_OSX,
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'terminal.external.linuxExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.linuxExec', 'Customizes which terminal to run on Linux.'),
                    default: terminals.linux,
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
    }
};
ExternalTerminalContribution = __decorate([
    __param(0, IExternalTerminalService)
], ExternalTerminalContribution);
export { ExternalTerminalContribution };
// Register workbench contributions
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExternalTerminalContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlcm5hbFRlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFFTixVQUFVLEdBR1YsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQTtBQUM1SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUcvRyxN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