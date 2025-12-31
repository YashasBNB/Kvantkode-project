/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { TaskExecutionSupportedContext } from '../../tasks/common/taskService.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
var ContextMenuGroup;
(function (ContextMenuGroup) {
    ContextMenuGroup["Create"] = "1_create";
    ContextMenuGroup["Edit"] = "3_edit";
    ContextMenuGroup["Clear"] = "5_clear";
    ContextMenuGroup["Kill"] = "7_kill";
    ContextMenuGroup["Config"] = "9_config";
})(ContextMenuGroup || (ContextMenuGroup = {}));
export var TerminalMenuBarGroup;
(function (TerminalMenuBarGroup) {
    TerminalMenuBarGroup["Create"] = "1_create";
    TerminalMenuBarGroup["Run"] = "3_run";
    TerminalMenuBarGroup["Manage"] = "5_manage";
    TerminalMenuBarGroup["Configure"] = "7_configure";
})(TerminalMenuBarGroup || (TerminalMenuBarGroup = {}));
export function setupTerminalMenus() {
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: localize({ key: 'miNewTerminal', comment: ['&& denotes a mnemonic'] }, '&&New Terminal'),
                },
                order: 1,
            },
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: localize({ key: 'miSplitTerminal', comment: ['&& denotes a mnemonic'] }, '&&Split Terminal'),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */),
                },
                order: 2,
                when: TerminalContextKeys.processSupported,
            },
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize({ key: 'miRunActiveFile', comment: ['&& denotes a mnemonic'] }, 'Run &&Active File'),
                },
                order: 3,
                when: TerminalContextKeys.processSupported,
            },
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize({ key: 'miRunSelectedText', comment: ['&& denotes a mnemonic'] }, 'Run &&Selected Text'),
                },
                order: 4,
                when: TerminalContextKeys.processSupported,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                group: "1_create" /* ContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                },
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* ContextMenuGroup.Kill */,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', 'Copy'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 1,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', 'Copy as HTML'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 2,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', 'Paste'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', 'Clear'),
                },
                group: "5_clear" /* ContextMenuGroup.Clear */,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth,
                },
                group: "9_config" /* ContextMenuGroup.Config */,
            },
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', 'Select All'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                group: "1_create" /* ContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                },
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* ContextMenuGroup.Kill */,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', 'Copy'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 1,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', 'Copy as HTML'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 2,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', 'Paste'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', 'Clear'),
                },
                group: "5_clear" /* ContextMenuGroup.Clear */,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', 'Select All'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
                order: 3,
            },
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth,
                },
                group: "9_config" /* ContextMenuGroup.Config */,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    title: localize('workbench.action.terminal.newWithProfile.short', 'New Terminal With Profile...'),
                },
                group: "1_create" /* ContextMenuGroup.Create */,
            },
        },
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
                    title: localize2('workbench.action.terminal.selectDefaultProfile', 'Select Default Profile'),
                },
                group: '3_configure',
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
                    title: localize('workbench.action.terminal.openSettings', 'Configure Terminal Settings'),
                },
                group: '3_configure',
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.runTask',
                    title: localize('workbench.action.tasks.runTask', 'Run Task...'),
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 1,
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.configureTaskRunner',
                    title: localize('workbench.action.tasks.configureTaskRunner', 'Configure Tasks...'),
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 2,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
                    title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal'),
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`)),
            },
        },
        {
            // This is used to show instead of tabs when there is only a single terminal
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
                    title: terminalStrings.focus,
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal,
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.has(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'always'))),
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split,
                    icon: Codicon.splitHorizontal,
                },
                group: 'navigation',
                order: 2,
                when: TerminalContextKeys.shouldShowViewInlineActions,
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
                    title: terminalStrings.kill,
                    icon: Codicon.trash,
                },
                group: 'navigation',
                order: 3,
                when: TerminalContextKeys.shouldShowViewInlineActions,
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                    icon: Codicon.plus,
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal,
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.or(TerminalContextKeys.webExtensionContributedProfile, TerminalContextKeys.processSupported)),
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clearLong', 'Clear Terminal'),
                    icon: Codicon.clearAll,
                },
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true,
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize('workbench.action.terminal.runActiveFile', 'Run Active File'),
                    icon: Codicon.run,
                },
                group: 'navigation',
                order: 5,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true,
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize('workbench.action.terminal.runSelectedText', 'Run Selected Text'),
                    icon: Codicon.selection,
                },
                group: 'navigation',
                order: 6,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true,
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
                    title: terminalStrings.split.value,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 1,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
                    title: terminalStrings.moveToEditor.value,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 2,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
                    title: terminalStrings.moveIntoNewWindow.value,
                },
                group: "1_create" /* ContextMenuGroup.Create */,
                order: 2,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
                    title: localize('workbench.action.terminal.renameInstance', 'Rename...'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
                    title: localize('workbench.action.terminal.changeIcon', 'Change Icon...'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
                    title: localize('workbench.action.terminal.changeColor', 'Change Color...'),
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth,
                },
                group: "3_edit" /* ContextMenuGroup.Edit */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
                    title: localize('workbench.action.terminal.joinInstance', 'Join Terminals'),
                },
                when: TerminalContextKeys.tabsSingularSelection.toNegated(),
                group: "9_config" /* ContextMenuGroup.Config */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
                    title: terminalStrings.unsplit.value,
                },
                when: ContextKeyExpr.and(TerminalContextKeys.tabsSingularSelection, TerminalContextKeys.splitTerminal),
                group: "9_config" /* ContextMenuGroup.Config */,
            },
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* ContextMenuGroup.Kill */,
            },
        },
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
            title: terminalStrings.moveToTerminalPanel,
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files',
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
            title: terminalStrings.rename,
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files',
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
            title: terminalStrings.changeColor,
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files',
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
            title: terminalStrings.changeIcon,
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files',
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
            title: terminalStrings.toggleSizeToContentWidth,
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files',
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new,
            icon: Codicon.plus,
        },
        alt: {
            id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
            title: terminalStrings.split.value,
            icon: Codicon.splitHorizontal,
        },
        group: 'navigation',
        order: 0,
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
    });
}
export function getTerminalActionBarArgs(location, profiles, defaultProfileName, contributedProfiles, terminalService, dropdownMenu, disposableStore) {
    let dropdownActions = [];
    let submenuActions = [];
    profiles = profiles.filter((e) => !e.isAutoDetected);
    const splitLocation = location === TerminalLocation.Editor ||
        (typeof location === 'object' &&
            'viewColumn' in location &&
            location.viewColumn === ACTIVE_GROUP)
        ? { viewColumn: SIDE_GROUP }
        : { splitActiveTerminal: true };
    for (const p of profiles) {
        const isDefault = p.profileName === defaultProfileName;
        const options = { config: p, location };
        const splitOptions = { config: p, location: splitLocation };
        const sanitizedProfileName = p.profileName.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */, isDefault
            ? localize('defaultTerminalProfile', '{0} (Default)', sanitizedProfileName)
            : sanitizedProfileName, undefined, true, async () => {
            const instance = await terminalService.createTerminal(options);
            terminalService.setActiveInstance(instance);
            await terminalService.focusActiveInstance();
        })));
        submenuActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, isDefault
            ? localize('defaultTerminalProfile', '{0} (Default)', sanitizedProfileName)
            : sanitizedProfileName, undefined, true, async () => {
            const instance = await terminalService.createTerminal(splitOptions);
            terminalService.setActiveInstance(instance);
            await terminalService.focusActiveInstance();
        })));
    }
    for (const contributed of contributedProfiles) {
        const isDefault = contributed.title === defaultProfileName;
        const title = isDefault
            ? localize('defaultTerminalProfile', '{0} (Default)', contributed.title.replace(/[\n\r\t]/g, ''))
            : contributed.title.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action('contributed', title, undefined, true, () => terminalService.createTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title,
            },
            location,
        }))));
        submenuActions.push(disposableStore.add(new Action('contributed-split', title, undefined, true, () => terminalService.createTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title,
            },
            location: splitLocation,
        }))));
    }
    const defaultProfileAction = dropdownActions.find((d) => d.label.endsWith('(Default)'));
    if (defaultProfileAction) {
        dropdownActions = dropdownActions
            .filter((d) => d !== defaultProfileAction)
            .sort((a, b) => a.label.localeCompare(b.label));
        dropdownActions.unshift(defaultProfileAction);
    }
    if (dropdownActions.length > 0) {
        dropdownActions.push(new SubmenuAction('split.profile', localize('splitTerminal', 'Split Terminal'), submenuActions));
        dropdownActions.push(new Separator());
    }
    const actions = dropdownMenu.getActions();
    dropdownActions.push(...Separator.join(...actions.map((a) => a[1])));
    const defaultSubmenuProfileAction = submenuActions.find((d) => d.label.endsWith('(Default)'));
    if (defaultSubmenuProfileAction) {
        submenuActions = submenuActions
            .filter((d) => d !== defaultSubmenuProfileAction)
            .sort((a, b) => a.label.localeCompare(b.label));
        submenuActions.unshift(defaultSubmenuProfileAction);
    }
    const dropdownAction = disposableStore.add(new Action('refresh profiles', localize('launchProfile', 'Launch Profile...'), 'codicon-chevron-down', true));
    return {
        dropdownAction,
        dropdownMenuActions: dropdownActions,
        className: `terminal-tab-actions-${terminalService.resolveLocation(location)}`,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNZW51cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxNZW51cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFTLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUdOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRWpGLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQTZCLE1BQU0saUNBQWlDLENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHM0YsSUFBVyxnQkFNVjtBQU5ELFdBQVcsZ0JBQWdCO0lBQzFCLHVDQUFtQixDQUFBO0lBQ25CLG1DQUFlLENBQUE7SUFDZixxQ0FBaUIsQ0FBQTtJQUNqQixtQ0FBZSxDQUFBO0lBQ2YsdUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQU5VLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFNMUI7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBS2pCO0FBTEQsV0FBa0Isb0JBQW9CO0lBQ3JDLDJDQUFtQixDQUFBO0lBQ25CLHFDQUFhLENBQUE7SUFDYiwyQ0FBbUIsQ0FBQTtJQUNuQixpREFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBTGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFLckM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCO0lBQ2pDLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDNUI7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUM5QixJQUFJLEVBQUU7Z0JBQ0wsS0FBSyw4Q0FBNkI7Z0JBQ2xDLE9BQU8sRUFBRTtvQkFDUixFQUFFLDZEQUF1QjtvQkFDekIsS0FBSyxFQUFFLFFBQVEsQ0FDZCxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM1RCxnQkFBZ0IsQ0FDaEI7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUM5QixJQUFJLEVBQUU7Z0JBQ0wsS0FBSyw4Q0FBNkI7Z0JBQ2xDLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FDZCxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzlELGtCQUFrQixDQUNsQjtvQkFDRCxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcseURBQWtDO2lCQUNsRTtnQkFDRCxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCO2FBQzFDO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO1lBQzlCLElBQUksRUFBRTtnQkFDTCxLQUFLLHdDQUEwQjtnQkFDL0IsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUZBQWlDO29CQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUNkLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUQsbUJBQW1CLENBQ25CO2lCQUNEO2dCQUNELEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxnQkFBZ0I7YUFDMUM7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7WUFDOUIsSUFBSSxFQUFFO2dCQUNMLEtBQUssd0NBQTBCO2dCQUMvQixPQUFPLEVBQUU7b0JBQ1IsRUFBRSxxRkFBbUM7b0JBQ3JDLEtBQUssRUFBRSxRQUFRLENBQ2QsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNoRSxxQkFBcUIsQ0FDckI7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLG1CQUFtQixDQUFDLGdCQUFnQjthQUMxQztTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxLQUFLLDBDQUF5QjtnQkFDOUIsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUNsQzthQUNEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2REFBdUI7b0JBQ3pCLEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRztpQkFDMUI7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLHVGQUFvQztvQkFDdEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSztpQkFDakM7Z0JBQ0QsS0FBSyxzQ0FBdUI7YUFDNUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlGQUFpQztvQkFDbkMsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxNQUFNLENBQUM7aUJBQ3hFO2dCQUNELEtBQUssc0NBQXVCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2RkFBdUM7b0JBQ3pDLEtBQUssRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsY0FBYyxDQUFDO2lCQUNoRjtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLE9BQU8sQ0FBQztpQkFDakU7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxPQUFPLENBQUM7aUJBQzNEO2dCQUNELEtBQUssd0NBQXdCO2FBQzdCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSwyRkFBc0M7b0JBQ3hDLEtBQUssRUFBRSxlQUFlLENBQUMsd0JBQXdCO2lCQUMvQztnQkFDRCxLQUFLLDBDQUF5QjthQUM5QjtTQUNEO1FBRUQ7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUseUVBQTZCO29CQUMvQixLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLFlBQVksQ0FBQztpQkFDcEU7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDNUI7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsS0FBSywwQ0FBeUI7Z0JBQzlCLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSztpQkFDbEM7YUFDRDtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkRBQXVCO29CQUN6QixLQUFLLEVBQUUsZUFBZSxDQUFDLEdBQUc7aUJBQzFCO2dCQUNELEtBQUssMENBQXlCO2FBQzlCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSwyRUFBOEI7b0JBQ2hDLEtBQUssRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUs7aUJBQ2pDO2dCQUNELEtBQUssc0NBQXVCO2FBQzVCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRkFBaUM7b0JBQ25DLEtBQUssRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsTUFBTSxDQUFDO2lCQUN4RTtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkZBQXVDO29CQUN6QyxLQUFLLEVBQUUsUUFBUSxDQUFDLCtDQUErQyxFQUFFLGNBQWMsQ0FBQztpQkFDaEY7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7WUFDeEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxPQUFPLENBQUM7aUJBQ2pFO2dCQUNELEtBQUssc0NBQXVCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDO2lCQUMzRDtnQkFDRCxLQUFLLHdDQUF3QjthQUM3QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUseUVBQTZCO29CQUMvQixLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLFlBQVksQ0FBQztpQkFDcEU7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7WUFDeEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDJGQUFzQztvQkFDeEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyx3QkFBd0I7aUJBQy9DO2dCQUNELEtBQUssMENBQXlCO2FBQzlCO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsZUFBZSxDQUFDO1FBQzVCO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQywyQkFBMkI7WUFDdEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLG1GQUFrQztvQkFDcEMsS0FBSyxFQUFFLFFBQVEsQ0FDZCxnREFBZ0QsRUFDaEQsOEJBQThCLENBQzlCO2lCQUNEO2dCQUNELEtBQUssMENBQXlCO2FBQzlCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsMkJBQTJCO1lBQ3RDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2REFBdUI7b0JBQ3pCLEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRztpQkFDMUI7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDNUI7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkZBQXdDO29CQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUNmLGdEQUFnRCxFQUNoRCx3QkFBd0IsQ0FDeEI7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLGFBQWE7YUFDcEI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7WUFDckMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDRGQUE2QztvQkFDL0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSw2QkFBNkIsQ0FBQztpQkFDeEY7Z0JBQ0QsS0FBSyxFQUFFLGFBQWE7YUFDcEI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7WUFDckMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLEVBQUUsZ0NBQWdDO29CQUNwQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGFBQWEsQ0FBQztpQkFDaEU7Z0JBQ0QsSUFBSSxFQUFFLDZCQUE2QjtnQkFDbkMsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7WUFDckMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLEVBQUUsNENBQTRDO29CQUNoRCxLQUFLLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLG9CQUFvQixDQUFDO2lCQUNuRjtnQkFDRCxJQUFJLEVBQUUsNkJBQTZCO2dCQUNuQyxLQUFLLEVBQUUsU0FBUztnQkFDaEIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsbUZBQWtDO29CQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDBDQUEwQyxFQUFFLGlCQUFpQixDQUFDO2lCQUMvRTtnQkFDRCxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLEVBQy9DLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxzRUFBNkIsRUFBRSxDQUFDLENBQzdEO2FBQ0Q7U0FDRDtRQUNEO1lBQ0MsNEVBQTRFO1lBQzVFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUs7aUJBQzVCO2dCQUNELEdBQUcsRUFBRTtvQkFDSixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSztvQkFDbEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxlQUFlO2lCQUM3QjtnQkFDRCxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLEVBQy9DLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxzRUFBNkIsRUFBRSxDQUFDLEVBQzdELGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLENBQ3BCLFVBQVUsNEZBQXdDLEVBQUUsRUFDcEQsZ0JBQWdCLENBQ2hCLEVBQ0QsY0FBYyxDQUFDLE1BQU0sa0VBQXVDLENBQUMsQ0FBQyxDQUM5RCxFQUNELGNBQWMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLENBQ3BCLFVBQVUsNEZBQXdDLEVBQUUsRUFDcEQsd0JBQXdCLENBQ3hCLEVBQ0QsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsY0FBYyxDQUFDLE1BQU0sa0VBQXVDLENBQUMsQ0FBQyxFQUM5RCxjQUFjLENBQUMsR0FBRyxtRUFBc0MsQ0FDeEQsQ0FDRCxFQUNELGNBQWMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLENBQ3BCLFVBQVUsNEZBQXdDLEVBQUUsRUFDcEQsYUFBYSxDQUNiLEVBQ0QsY0FBYyxDQUFDLE1BQU0sa0VBQXVDLENBQUMsQ0FBQyxDQUM5RCxFQUNELGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSw0RkFBd0MsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUNyRixDQUNEO2FBQ0Q7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSztvQkFDNUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxlQUFlO2lCQUM3QjtnQkFDRCxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLG1CQUFtQixDQUFDLDJCQUEyQjthQUNyRDtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLCtEQUF3QjtvQkFDMUIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJO29CQUMzQixJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7aUJBQ25CO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsMkJBQTJCO2FBQ3JEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkRBQXVCO29CQUN6QixLQUFLLEVBQUUsZUFBZSxDQUFDLEdBQUc7b0JBQzFCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtpQkFDbEI7Z0JBQ0QsR0FBRyxFQUFFO29CQUNKLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO29CQUNsQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGVBQWU7aUJBQzdCO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsRUFDL0MsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsbUJBQW1CLENBQUMsOEJBQThCLEVBQ2xELG1CQUFtQixDQUFDLGdCQUFnQixDQUNwQyxDQUNEO2FBQ0Q7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsZ0JBQWdCLENBQUM7b0JBQ3hFLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtpQkFDdEI7Z0JBQ0QsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztnQkFDckQsaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlGQUFpQztvQkFDbkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxpQkFBaUIsQ0FBQztvQkFDN0UsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHO2lCQUNqQjtnQkFDRCxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDO2dCQUNyRCxpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUscUZBQW1DO29CQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLG1CQUFtQixDQUFDO29CQUNqRixJQUFJLEVBQUUsT0FBTyxDQUFDLFNBQVM7aUJBQ3ZCO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3JELGlCQUFpQixFQUFFLElBQUk7YUFDdkI7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDNUI7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsbUZBQWtDO29CQUNwQyxLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUNsQztnQkFDRCxLQUFLLDBDQUF5QjtnQkFDOUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsK0VBQWdDO29CQUNsQyxLQUFLLEVBQUUsZUFBZSxDQUFDLFlBQVksQ0FBQyxLQUFLO2lCQUN6QztnQkFDRCxLQUFLLDBDQUF5QjtnQkFDOUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUseUZBQXFDO29CQUN2QyxLQUFLLEVBQUUsZUFBZSxDQUFDLGlCQUFpQixDQUFDLEtBQUs7aUJBQzlDO2dCQUNELEtBQUssMENBQXlCO2dCQUM5QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxxRkFBbUM7b0JBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsMENBQTBDLEVBQUUsV0FBVyxDQUFDO2lCQUN4RTtnQkFDRCxLQUFLLHNDQUF1QjthQUM1QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkZBQXVDO29CQUN6QyxLQUFLLEVBQUUsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLGdCQUFnQixDQUFDO2lCQUN6RTtnQkFDRCxLQUFLLHNDQUF1QjthQUM1QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsK0ZBQXdDO29CQUMxQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLGlCQUFpQixDQUFDO2lCQUMzRTtnQkFDRCxLQUFLLHNDQUF1QjthQUM1QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsMkZBQXNDO29CQUN4QyxLQUFLLEVBQUUsZUFBZSxDQUFDLHdCQUF3QjtpQkFDL0M7Z0JBQ0QsS0FBSyxzQ0FBdUI7YUFDNUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlGQUFpQztvQkFDbkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxnQkFBZ0IsQ0FBQztpQkFDM0U7Z0JBQ0QsSUFBSSxFQUFFLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRTtnQkFDM0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLHFFQUEyQjtvQkFDN0IsS0FBSyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSztpQkFDcEM7Z0JBQ0QsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLG1CQUFtQixDQUFDLHFCQUFxQixFQUN6QyxtQkFBbUIsQ0FBQyxhQUFhLENBQ2pDO2dCQUNELEtBQUssMENBQXlCO2FBQzlCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRkFBaUM7b0JBQ25DLEtBQUssRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUs7aUJBQ2pDO2dCQUNELEtBQUssc0NBQXVCO2FBQzVCO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtRQUN0RCxPQUFPLEVBQUU7WUFDUixFQUFFLDZGQUF1QztZQUN6QyxLQUFLLEVBQUUsZUFBZSxDQUFDLG1CQUFtQjtTQUMxQztRQUNELElBQUksRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDakUsS0FBSyxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7UUFDdEQsT0FBTyxFQUFFO1lBQ1IsRUFBRSxtRUFBMEI7WUFDNUIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxNQUFNO1NBQzdCO1FBQ0QsSUFBSSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNqRSxLQUFLLEVBQUUsU0FBUztLQUNoQixDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtRQUN0RCxPQUFPLEVBQUU7WUFDUixFQUFFLDZFQUErQjtZQUNqQyxLQUFLLEVBQUUsZUFBZSxDQUFDLFdBQVc7U0FDbEM7UUFDRCxJQUFJLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ2pFLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFO1FBQ3RELE9BQU8sRUFBRTtZQUNSLEVBQUUsMkVBQThCO1lBQ2hDLEtBQUssRUFBRSxlQUFlLENBQUMsVUFBVTtTQUNqQztRQUNELElBQUksRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDakUsS0FBSyxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7UUFDdEQsT0FBTyxFQUFFO1lBQ1IsRUFBRSwyRkFBc0M7WUFDeEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyx3QkFBd0I7U0FDL0M7UUFDRCxJQUFJLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ2pFLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtRQUMvQyxPQUFPLEVBQUU7WUFDUixFQUFFLHdHQUFpRDtZQUNuRCxLQUFLLEVBQUUsZUFBZSxDQUFDLEdBQUc7WUFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1NBQ2xCO1FBQ0QsR0FBRyxFQUFFO1lBQ0osRUFBRSxpRUFBeUI7WUFDM0IsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUNsQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGVBQWU7U0FDN0I7UUFDRCxLQUFLLEVBQUUsWUFBWTtRQUNuQixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7S0FDakUsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsUUFBa0MsRUFDbEMsUUFBNEIsRUFDNUIsa0JBQTBCLEVBQzFCLG1CQUF5RCxFQUN6RCxlQUFpQyxFQUNqQyxZQUFtQixFQUNuQixlQUFnQztJQU9oQyxJQUFJLGVBQWUsR0FBYyxFQUFFLENBQUE7SUFDbkMsSUFBSSxjQUFjLEdBQWMsRUFBRSxDQUFBO0lBQ2xDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNwRCxNQUFNLGFBQWEsR0FDbEIsUUFBUSxLQUFLLGdCQUFnQixDQUFDLE1BQU07UUFDcEMsQ0FBQyxPQUFPLFFBQVEsS0FBSyxRQUFRO1lBQzVCLFlBQVksSUFBSSxRQUFRO1lBQ3hCLFFBQVEsQ0FBQyxVQUFVLEtBQUssWUFBWSxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUU7UUFDNUIsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDakMsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUMxQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsV0FBVyxLQUFLLGtCQUFrQixDQUFBO1FBQ3RELE1BQU0sT0FBTyxHQUEyQixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDL0QsTUFBTSxZQUFZLEdBQTJCLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLENBQUE7UUFDbkYsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkUsZUFBZSxDQUFDLElBQUksQ0FDbkIsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxNQUFNLG9GQUVULFNBQVM7WUFDUixDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQztZQUMzRSxDQUFDLENBQUMsb0JBQW9CLEVBQ3ZCLFNBQVMsRUFDVCxJQUFJLEVBQ0osS0FBSyxJQUFJLEVBQUU7WUFDVixNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQWUsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUQsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sZUFBZSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDNUMsQ0FBQyxDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0QsY0FBYyxDQUFDLElBQUksQ0FDbEIsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxNQUFNLGtFQUVULFNBQVM7WUFDUixDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQztZQUMzRSxDQUFDLENBQUMsb0JBQW9CLEVBQ3ZCLFNBQVMsRUFDVCxJQUFJLEVBQ0osS0FBSyxJQUFJLEVBQUU7WUFDVixNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQWUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbkUsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sZUFBZSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDNUMsQ0FBQyxDQUNELENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssTUFBTSxXQUFXLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUMvQyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxLQUFLLGtCQUFrQixDQUFBO1FBQzFELE1BQU0sS0FBSyxHQUFHLFNBQVM7WUFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FDUix3QkFBd0IsRUFDeEIsZUFBZSxFQUNmLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FDMUM7WUFDRixDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdDLGVBQWUsQ0FBQyxJQUFJLENBQ25CLGVBQWUsQ0FBQyxHQUFHLENBQ2xCLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FDdEQsZUFBZSxDQUFDLGNBQWMsQ0FBQztZQUM5QixNQUFNLEVBQUU7Z0JBQ1AsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLG1CQUFtQjtnQkFDcEQsRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFO2dCQUNsQixLQUFLO2FBQ0w7WUFDRCxRQUFRO1NBQ1IsQ0FBQyxDQUNGLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsY0FBYyxDQUFDLElBQUksQ0FDbEIsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxNQUFNLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQzVELGVBQWUsQ0FBQyxjQUFjLENBQUM7WUFDOUIsTUFBTSxFQUFFO2dCQUNQLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxtQkFBbUI7Z0JBQ3BELEVBQUUsRUFBRSxXQUFXLENBQUMsRUFBRTtnQkFDbEIsS0FBSzthQUNMO1lBQ0QsUUFBUSxFQUFFLGFBQWE7U0FDdkIsQ0FBQyxDQUNGLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUN2RixJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFDMUIsZUFBZSxHQUFHLGVBQWU7YUFDL0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssb0JBQW9CLENBQUM7YUFDekMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDaEQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDaEMsZUFBZSxDQUFDLElBQUksQ0FDbkIsSUFBSSxhQUFhLENBQ2hCLGVBQWUsRUFDZixRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLEVBQzNDLGNBQWMsQ0FDZCxDQUNELENBQUE7UUFDRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBQ0QsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3pDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRXBFLE1BQU0sMkJBQTJCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUM3RixJQUFJLDJCQUEyQixFQUFFLENBQUM7UUFDakMsY0FBYyxHQUFHLGNBQWM7YUFDN0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssMkJBQTJCLENBQUM7YUFDaEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDaEQsY0FBYyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUN6QyxJQUFJLE1BQU0sQ0FDVCxrQkFBa0IsRUFDbEIsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxFQUM5QyxzQkFBc0IsRUFDdEIsSUFBSSxDQUNKLENBQ0QsQ0FBQTtJQUNELE9BQU87UUFDTixjQUFjO1FBQ2QsbUJBQW1CLEVBQUUsZUFBZTtRQUNwQyxTQUFTLEVBQUUsd0JBQXdCLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUU7S0FDOUUsQ0FBQTtBQUNGLENBQUMifQ==