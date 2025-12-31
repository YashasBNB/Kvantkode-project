/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { Action2, MenuId } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IsDevelopmentContext } from '../../../platform/contextkey/common/contextkeys.js';
import { INativeWorkbenchEnvironmentService } from '../../services/environment/electron-sandbox/environmentService.js';
import { URI } from '../../../base/common/uri.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
export class ToggleDevToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleDevTools',
            title: localize2('toggleDevTools', 'Toggle Developer Tools'),
            category: Categories.Developer,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                when: IsDevelopmentContext,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */ },
            },
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '5_tools',
                order: 1,
            },
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        return nativeHostService.toggleDevTools({ targetWindowId: getActiveWindow().vscodeWindowId });
    }
}
export class ConfigureRuntimeArgumentsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.configureRuntimeArguments',
            title: localize2('configureRuntimeArguments', 'Configure Runtime Arguments'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        await editorService.openEditor({
            resource: environmentService.argvResource,
            options: { pinned: true },
        });
    }
}
export class ReloadWindowWithExtensionsDisabledAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.reloadWindowWithExtensionsDisabled',
            title: localize2('reloadWindowWithExtensionsDisabled', 'Reload with Extensions Disabled'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(INativeHostService).reload({ disableExtensions: true });
    }
}
export class OpenUserDataFolderAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.revealUserDataFolder',
            title: localize2('revealUserDataFolder', 'Reveal User Data Folder'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        return nativeHostService.showItemInFolder(URI.file(environmentService.userDataPath).fsPath);
    }
}
export class ShowGPUInfoAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showGPUInfo',
            title: localize2('showGPUInfo', 'Show GPU Info'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        nativeHostService.openGPUInfoWindow();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2ZWxvcGVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L2FjdGlvbnMvZGV2ZWxvcGVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDM0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRXRHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3RILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFOUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLE9BQU87SUFDaEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsaUNBQWlDO1lBQ3JDLEtBQUssRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUM7WUFDNUQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtnQkFDOUMsSUFBSSxFQUFFLG9C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