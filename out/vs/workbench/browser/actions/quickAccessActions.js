/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService, ItemActivation, } from '../../../platform/quickinput/common/quickInput.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { inQuickPickContext, defaultQuickAccessContext, getQuickNavigateHandler, } from '../quickaccess.js';
import { Codicon } from '../../../base/common/codicons.js';
//#region Quick access management commands and keys
const globalQuickAccessKeybinding = {
    primary: 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */],
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */, secondary: undefined },
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.closeQuickOpen',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.cancel();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.acceptSelectedQuickOpenItem',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.accept();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.alternativeAcceptSelectedQuickOpenItem',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.accept({ ctrlCmd: true, alt: false });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.focusQuickOpen',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.focus();
    },
});
const quickAccessNavigateNextInFilePickerId = 'workbench.action.quickOpenNavigateNextInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigateNextInFilePickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInFilePickerId, true),
    when: defaultQuickAccessContext,
    primary: globalQuickAccessKeybinding.primary,
    secondary: globalQuickAccessKeybinding.secondary,
    mac: globalQuickAccessKeybinding.mac,
});
const quickAccessNavigatePreviousInFilePickerId = 'workbench.action.quickOpenNavigatePreviousInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigatePreviousInFilePickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInFilePickerId, false),
    when: defaultQuickAccessContext,
    primary: globalQuickAccessKeybinding.primary | 1024 /* KeyMod.Shift */,
    secondary: [globalQuickAccessKeybinding.secondary[0] | 1024 /* KeyMod.Shift */],
    mac: {
        primary: globalQuickAccessKeybinding.mac.primary | 1024 /* KeyMod.Shift */,
        secondary: undefined,
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.quickPickManyToggle',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggle();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.quickInputBack',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    when: inQuickPickContext,
    primary: 0,
    win: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 88 /* KeyCode.Minus */ },
    linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 88 /* KeyCode.Minus */ },
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.back();
    },
});
registerAction2(class QuickAccessAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.quickOpen',
            title: localize2('quickOpen', 'Go to File...'),
            metadata: {
                description: `Quick access`,
                args: [
                    {
                        name: 'prefix',
                        schema: {
                            type: 'string',
                        },
                    },
                ],
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: globalQuickAccessKeybinding.primary,
                secondary: globalQuickAccessKeybinding.secondary,
                mac: globalQuickAccessKeybinding.mac,
            },
            f1: true,
        });
    }
    run(accessor, prefix) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(typeof prefix === 'string' ? prefix : undefined, {
            preserveValue: typeof prefix === 'string' /* preserve as is if provided */,
        });
    }
});
registerAction2(class QuickAccessAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.quickOpenWithModes',
            title: localize('quickOpenWithModes', 'Quick Open'),
            icon: Codicon.search,
            menu: {
                id: MenuId.CommandCenterCenter,
                order: 100,
            },
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const providerOptions = {
            includeHelp: true,
            from: 'commandCenter',
        };
        quickInputService.quickAccess.show(undefined, {
            preserveValue: true,
            providerOptions,
        });
    }
});
CommandsRegistry.registerCommand('workbench.action.quickOpenPreviousEditor', async (accessor) => {
    const quickInputService = accessor.get(IQuickInputService);
    quickInputService.quickAccess.show('', { itemActivation: ItemActivation.SECOND });
});
//#endregion
//#region Workbench actions
class BaseQuickAccessNavigateAction extends Action2 {
    constructor(id, title, next, quickNavigate, keybinding) {
        super({ id, title, f1: true, keybinding });
        this.id = id;
        this.next = next;
        this.quickNavigate = quickNavigate;
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(this.id);
        const quickNavigate = this.quickNavigate ? { keybindings: keys } : undefined;
        quickInputService.navigate(this.next, quickNavigate);
    }
}
class QuickAccessNavigateNextAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenNavigateNext', localize2('quickNavigateNext', 'Navigate Next in Quick Open'), true, true);
    }
}
class QuickAccessNavigatePreviousAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenNavigatePrevious', localize2('quickNavigatePrevious', 'Navigate Previous in Quick Open'), false, true);
    }
}
class QuickAccessSelectNextAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenSelectNext', localize2('quickSelectNext', 'Select Next in Quick Open'), true, false, {
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
            when: inQuickPickContext,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */ },
        });
    }
}
class QuickAccessSelectPreviousAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenSelectPrevious', localize2('quickSelectPrevious', 'Select Previous in Quick Open'), false, false, {
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
            when: inQuickPickContext,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */ },
        });
    }
}
registerAction2(QuickAccessSelectNextAction);
registerAction2(QuickAccessSelectPreviousAction);
registerAction2(QuickAccessNavigateNextAction);
registerAction2(QuickAccessNavigatePreviousAction);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3NBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy9xdWlja0FjY2Vzc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU5RixPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixjQUFjLEdBQ2QsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVoRixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHlCQUF5QixFQUN6Qix1QkFBdUIsR0FDdkIsTUFBTSxtQkFBbUIsQ0FBQTtBQUcxQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsbURBQW1EO0FBRW5ELE1BQU0sMkJBQTJCLEdBQUc7SUFDbkMsT0FBTyxFQUFFLGlEQUE2QjtJQUN0QyxTQUFTLEVBQUUsQ0FBQyxpREFBNkIsQ0FBQztJQUMxQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsaURBQTZCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtDQUNyRSxDQUFBO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLGlDQUFpQztJQUNyQyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsa0JBQWtCO0lBQ3hCLE9BQU8s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