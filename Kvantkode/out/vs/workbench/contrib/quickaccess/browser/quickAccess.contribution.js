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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9xdWlja2FjY2Vzcy9icm93c2VyL3F1aWNrQWNjZXNzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLFVBQVUsR0FDVixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQiwyQkFBMkIsR0FDM0IsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLHFCQUFxQixFQUNyQix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0YsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWxGLCtCQUErQjtBQUUvQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUVyRixtQkFB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