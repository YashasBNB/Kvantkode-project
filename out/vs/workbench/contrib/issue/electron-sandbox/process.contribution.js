/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { MenuRegistry, MenuId, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { IWorkbenchProcessService } from '../common/issue.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IProcessMainService } from '../../../../platform/process/common/process.js';
import './processService.js';
import './processMainService.js';
//#region Commands
class OpenProcessExplorer extends Action2 {
    static { this.ID = 'workbench.action.openProcessExplorer'; }
    constructor() {
        super({
            id: OpenProcessExplorer.ID,
            title: localize2('openProcessExplorer', 'Open Process Explorer'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const processService = accessor.get(IWorkbenchProcessService);
        return processService.openProcessExplorer();
    }
}
registerAction2(OpenProcessExplorer);
MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
    group: '5_tools',
    command: {
        id: OpenProcessExplorer.ID,
        title: localize({ key: 'miOpenProcessExplorerer', comment: ['&& denotes a mnemonic'] }, 'Open &&Process Explorer'),
    },
    order: 2,
});
class StopTracing extends Action2 {
    static { this.ID = 'workbench.action.stopTracing'; }
    constructor() {
        super({
            id: StopTracing.ID,
            title: localize2('stopTracing', 'Stop Tracing'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const processService = accessor.get(IProcessMainService);
        const environmentService = accessor.get(INativeEnvironmentService);
        const dialogService = accessor.get(IDialogService);
        const nativeHostService = accessor.get(INativeHostService);
        const progressService = accessor.get(IProgressService);
        if (!environmentService.args.trace) {
            const { confirmed } = await dialogService.confirm({
                message: localize('stopTracing.message', "Tracing requires to launch with a '--trace' argument"),
                primaryButton: localize({ key: 'stopTracing.button', comment: ['&& denotes a mnemonic'] }, '&&Relaunch and Enable Tracing'),
            });
            if (confirmed) {
                return nativeHostService.relaunch({ addArgs: ['--trace'] });
            }
        }
        await progressService.withProgress({
            location: 20 /* ProgressLocation.Dialog */,
            title: localize('stopTracing.title', 'Creating trace file...'),
            cancellable: false,
            detail: localize('stopTracing.detail', 'This can take up to one minute to complete.'),
        }, () => processService.stopTracing());
    }
}
registerAction2(StopTracing);
CommandsRegistry.registerCommand('_issues.getSystemStatus', (accessor) => {
    return accessor.get(IProcessMainService).getSystemStatus();
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9lbGVjdHJvbi1zYW5kYm94L3Byb2Nlc3MuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxFQUNmLE9BQU8sR0FDUCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUV6RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BGLE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyxrQkFBa0I7QUFFbEIsTUFBTSxtQkFBb0IsU0FBUSxPQUFPO2FBQ3hCLE9BQUUsR0FBRyxzQ0FBc0MsQ0FBQTtJQUUzRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO1lBQzFCLEtBQUssRUFBRSxTQUFTLENB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