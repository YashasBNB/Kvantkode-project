/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { HelpQuickAccessProvider } from '../../../../platform/quickinput/browser/helpQuickAccess.js';
import { ViewQuickAccessProvider, OpenViewPickerAction, QuickAccessViewPickerAction, } from './viewQuickAccess.js';
import { CommandsQuickAccessProvider, ShowAllCommandsAction, ClearCommandHistoryAction, } from './commandsQuickAccess.js';
import { MenuRegistry, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { inQuickPickContext, getQuickNavigateHandler } from '../../../browser/quickaccess.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
//#region Quick Access Proviers
const quickAccessRegistry = Registry.as(Extensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: HelpQuickAccessProvider,
    prefix: HelpQuickAccessProvider.PREFIX,
    placeholder: localize('helpQuickAccessPlaceholder', "Type '{0}' to get help on the actions you can take from here.", HelpQuickAccessProvider.PREFIX),
    helpEntries: [
        {
            description: localize('helpQuickAccess', 'Show all Quick Access Providers'),
            commandCenterOrder: 70,
            commandCenterLabel: localize('more', 'More'),
        },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: ViewQuickAccessProvider,
    prefix: ViewQuickAccessProvider.PREFIX,
    contextKey: 'inViewsPicker',
    placeholder: localize('viewQuickAccessPlaceholder', 'Type the name of a view, output channel or terminal to open.'),
    helpEntries: [
        { description: localize('viewQuickAccess', 'Open View'), commandId: OpenViewPickerAction.ID },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: CommandsQuickAccessProvider,
    prefix: CommandsQuickAccessProvider.PREFIX,
    contextKey: 'inCommandsPicker',
    placeholder: localize('commandsQuickAccessPlaceholder', 'Type the name of a command to run.'),
    helpEntries: [
        {
            description: localize('commandsQuickAccess', 'Show and Run Commands'),
            commandId: ShowAllCommandsAction.ID,
            commandCenterOrder: 20,
        },
    ],
});
//#endregion
//#region Menu contributions
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '1_open',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize({ key: 'miCommandPalette', comment: ['&& denotes a mnemonic'] }, '&&Command Palette...'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
    group: '1_welcome',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize({ key: 'miShowAllCommands', comment: ['&& denotes a mnemonic'] }, 'Show All Commands'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '1_open',
    command: {
        id: OpenViewPickerAction.ID,
        title: localize({ key: 'miOpenView', comment: ['&& denotes a mnemonic'] }, '&&Open View...'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '5_infile_nav',
    command: {
        id: 'workbench.action.gotoLine',
        title: localize({ key: 'miGotoLine', comment: ['&& denotes a mnemonic'] }, 'Go to &&Line/Column...'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    group: '1_command',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize('commandPalette', 'Command Palette...'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    group: 'z_commands',
    when: EditorContextKeys.editorSimpleInput.toNegated(),
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize('commandPalette', 'Command Palette...'),
    },
    order: 1,
});
//#endregion
//#region Workbench actions and commands
registerAction2(ClearCommandHistoryAction);
registerAction2(ShowAllCommandsAction);
registerAction2(OpenViewPickerAction);
registerAction2(QuickAccessViewPickerAction);
const inViewsPickerContextKey = 'inViewsPicker';
const inViewsPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inViewsPickerContextKey));
const viewPickerKeybinding = QuickAccessViewPickerAction.KEYBINDING;
const quickAccessNavigateNextInViewPickerId = 'workbench.action.quickOpenNavigateNextInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigateNextInViewPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInViewPickerId, true),
    when: inViewsPickerContext,
    primary: viewPickerKeybinding.primary,
    linux: viewPickerKeybinding.linux,
    mac: viewPickerKeybinding.mac,
});
const quickAccessNavigatePreviousInViewPickerId = 'workbench.action.quickOpenNavigatePreviousInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigatePreviousInViewPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInViewPickerId, false),
    when: inViewsPickerContext,
    primary: viewPickerKeybinding.primary | 1024 /* KeyMod.Shift */,
    linux: viewPickerKeybinding.linux,
    mac: {
        primary: viewPickerKeybinding.mac.primary | 1024 /* KeyMod.Shift */,
    },
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcXVpY2thY2Nlc3MvYnJvd3Nlci9xdWlja0FjY2Vzcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixVQUFVLEdBQ1YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDcEcsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixvQkFBb0IsRUFDcEIsMkJBQTJCLEdBQzNCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixxQkFBcUIsRUFDckIseUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRiwrQkFBK0I7QUFFL0IsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7QUFFckYsbUJBQW1CLENB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