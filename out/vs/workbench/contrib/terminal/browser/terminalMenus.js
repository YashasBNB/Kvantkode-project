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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNZW51cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbE1lbnVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQVMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBR04sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFakYsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBNkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUczRixJQUFXLGdCQU1WO0FBTkQsV0FBVyxnQkFBZ0I7SUFDMUIsdUNBQW1CLENBQUE7SUFDbkIsbUNBQWUsQ0FBQTtJQUNmLHFDQUFpQixDQUFBO0lBQ2pCLG1DQUFlLENBQUE7SUFDZix1Q0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTlUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQU0xQjtBQUVELE1BQU0sQ0FBTixJQUFrQixvQkFLakI7QUFMRCxXQUFrQixvQkFBb0I7SUFDckMsMkNBQW1CLENBQUE7SUFDbkIscUNBQWEsQ0FBQTtJQUNiLDJDQUFtQixDQUFBO0lBQ25CLGlEQUF5QixDQUFBO0FBQzFCLENBQUMsRUFMaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUtyQztBQUVELE1BQU0sVUFBVSxrQkFBa0I7SUFDakMsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO1lBQzlCLElBQUksRUFBRTtnQkFDTCxLQUFLLDhDQUE2QjtnQkFDbEMsT0FBTyxFQUFFO29CQUNSLEVBQUUsNkRBQXVCO29CQUN6QixLQUFLLEVBQUUsUUFBUSxDQUNkLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzVELGdCQUFnQixDQUNoQjtpQkFDRDtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO1lBQzlCLElBQUksRUFBRTtnQkFDTCxLQUFLLDhDQUE2QjtnQkFDbEMsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsUUFBUSxDQUNkLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUQsa0JBQWtCLENBQ2xCO29CQUNELFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyx5REFBa0M7aUJBQ2xFO2dCQUNELEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxnQkFBZ0I7YUFDMUM7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7WUFDOUIsSUFBSSxFQUFFO2dCQUNMLEtBQUssd0NBQTBCO2dCQUMvQixPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRkFBaUM7b0JBQ25DLEtBQUssRUFBRSxRQUFRLENBQ2QsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM5RCxtQkFBbUIsQ0FDbkI7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLG1CQUFtQixDQUFDLGdCQUFnQjthQUMxQztTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUM5QixJQUFJLEVBQUU7Z0JBQ0wsS0FBSyx3Q0FBMEI7Z0JBQy9CLE9BQU8sRUFBRTtvQkFDUixFQUFFLHFGQUFtQztvQkFDckMsS0FBSyxFQUFFLFFBQVEsQ0FDZCxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ2hFLHFCQUFxQixDQUNyQjtpQkFDRDtnQkFDRCxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCO2FBQzFDO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsZUFBZSxDQUFDO1FBQzVCO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLEtBQUssMENBQXlCO2dCQUM5QixPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUs7aUJBQ2xDO2FBQ0Q7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDZEQUF1QjtvQkFDekIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxHQUFHO2lCQUMxQjtnQkFDRCxLQUFLLDBDQUF5QjthQUM5QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsdUZBQW9DO29CQUN0QyxLQUFLLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLO2lCQUNqQztnQkFDRCxLQUFLLHNDQUF1QjthQUM1QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUZBQWlDO29CQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLCtDQUErQyxFQUFFLE1BQU0sQ0FBQztpQkFDeEU7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDZGQUF1QztvQkFDekMsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxjQUFjLENBQUM7aUJBQ2hGO2dCQUNELEtBQUssc0NBQXVCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsT0FBTyxDQUFDO2lCQUNqRTtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHVCQUF1QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLE9BQU8sQ0FBQztpQkFDM0Q7Z0JBQ0QsS0FBSyx3Q0FBd0I7YUFDN0I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDJGQUFzQztvQkFDeEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyx3QkFBd0I7aUJBQy9DO2dCQUNELEtBQUssMENBQXlCO2FBQzlCO1NBQ0Q7UUFFRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsdUJBQXVCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSx5RUFBNkI7b0JBQy9CLEtBQUssRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsWUFBWSxDQUFDO2lCQUNwRTtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxLQUFLLDBDQUF5QjtnQkFDOUIsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUNsQzthQUNEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2REFBdUI7b0JBQ3pCLEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRztpQkFDMUI7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7WUFDeEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDJFQUE4QjtvQkFDaEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSztpQkFDakM7Z0JBQ0QsS0FBSyxzQ0FBdUI7YUFDNUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7WUFDeEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlGQUFpQztvQkFDbkMsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxNQUFNLENBQUM7aUJBQ3hFO2dCQUNELEtBQUssc0NBQXVCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2RkFBdUM7b0JBQ3pDLEtBQUssRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsY0FBYyxDQUFDO2lCQUNoRjtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLE9BQU8sQ0FBQztpQkFDakU7Z0JBQ0QsS0FBSyxzQ0FBdUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7WUFDeEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxPQUFPLENBQUM7aUJBQzNEO2dCQUNELEtBQUssd0NBQXdCO2FBQzdCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsNkJBQTZCO1lBQ3hDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSx5RUFBNkI7b0JBQy9CLEtBQUssRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsWUFBWSxDQUFDO2lCQUNwRTtnQkFDRCxLQUFLLHNDQUF1QjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsMkZBQXNDO29CQUN4QyxLQUFLLEVBQUUsZUFBZSxDQUFDLHdCQUF3QjtpQkFDL0M7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDNUI7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDJCQUEyQjtZQUN0QyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsbUZBQWtDO29CQUNwQyxLQUFLLEVBQUUsUUFBUSxDQUNkLGdEQUFnRCxFQUNoRCw4QkFBOEIsQ0FDOUI7aUJBQ0Q7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQywyQkFBMkI7WUFDdEMsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLDZEQUF1QjtvQkFDekIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxHQUFHO2lCQUMxQjtnQkFDRCxLQUFLLDBDQUF5QjthQUM5QjtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsMEJBQTBCO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2RkFBd0M7b0JBQzFDLEtBQUssRUFBRSxTQUFTLENBQ2YsZ0RBQWdELEVBQ2hELHdCQUF3QixDQUN4QjtpQkFDRDtnQkFDRCxLQUFLLEVBQUUsYUFBYTthQUNwQjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsNEZBQTZDO29CQUMvQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDZCQUE2QixDQUFDO2lCQUN4RjtnQkFDRCxLQUFLLEVBQUUsYUFBYTthQUNwQjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsRUFBRSxnQ0FBZ0M7b0JBQ3BDLEtBQUssRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsYUFBYSxDQUFDO2lCQUNoRTtnQkFDRCxJQUFJLEVBQUUsNkJBQTZCO2dCQUNuQyxLQUFLLEVBQUUsU0FBUztnQkFDaEIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsRUFBRSw0Q0FBNEM7b0JBQ2hELEtBQUssRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUsb0JBQW9CLENBQUM7aUJBQ25GO2dCQUNELElBQUksRUFBRSw2QkFBNkI7Z0JBQ25DLEtBQUssRUFBRSxTQUFTO2dCQUNoQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsZUFBZSxDQUFDO1FBQzVCO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxtRkFBa0M7b0JBQ3BDLEtBQUssRUFBRSxTQUFTLENBQUMsMENBQTBDLEVBQUUsaUJBQWlCLENBQUM7aUJBQy9FO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsRUFDL0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLHNFQUE2QixFQUFFLENBQUMsQ0FDN0Q7YUFDRDtTQUNEO1FBQ0Q7WUFDQyw0RUFBNEU7WUFDNUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSztpQkFDNUI7Z0JBQ0QsR0FBRyxFQUFFO29CQUNKLEVBQUUsaUVBQXlCO29CQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO29CQUNsQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGVBQWU7aUJBQzdCO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsRUFDL0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLHNFQUE2QixFQUFFLENBQUMsRUFDN0QsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsVUFBVSw0RkFBd0MsRUFBRSxFQUNwRCxnQkFBZ0IsQ0FDaEIsRUFDRCxjQUFjLENBQUMsTUFBTSxrRUFBdUMsQ0FBQyxDQUFDLENBQzlELEVBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsVUFBVSw0RkFBd0MsRUFBRSxFQUNwRCx3QkFBd0IsQ0FDeEIsRUFDRCxjQUFjLENBQUMsRUFBRSxDQUNoQixjQUFjLENBQUMsTUFBTSxrRUFBdUMsQ0FBQyxDQUFDLEVBQzlELGNBQWMsQ0FBQyxHQUFHLG1FQUFzQyxDQUN4RCxDQUNELEVBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsVUFBVSw0RkFBd0MsRUFBRSxFQUNwRCxhQUFhLENBQ2IsRUFDRCxjQUFjLENBQUMsTUFBTSxrRUFBdUMsQ0FBQyxDQUFDLENBQzlELEVBQ0QsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLDRGQUF3QyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQ3JGLENBQ0Q7YUFDRDtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLO29CQUM1QixJQUFJLEVBQUUsT0FBTyxDQUFDLGVBQWU7aUJBQzdCO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsMkJBQTJCO2FBQ3JEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsK0RBQXdCO29CQUMxQixLQUFLLEVBQUUsZUFBZSxDQUFDLElBQUk7b0JBQzNCLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztpQkFDbkI7Z0JBQ0QsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxtQkFBbUIsQ0FBQywyQkFBMkI7YUFDckQ7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2REFBdUI7b0JBQ3pCLEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRztvQkFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2lCQUNsQjtnQkFDRCxHQUFHLEVBQUU7b0JBQ0osRUFBRSxpRUFBeUI7b0JBQzNCLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUs7b0JBQ2xDLElBQUksRUFBRSxPQUFPLENBQUMsZUFBZTtpQkFDN0I7Z0JBQ0QsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxFQUMvQyxjQUFjLENBQUMsRUFBRSxDQUNoQixtQkFBbUIsQ0FBQyw4QkFBOEIsRUFDbEQsbUJBQW1CLENBQUMsZ0JBQWdCLENBQ3BDLENBQ0Q7YUFDRDtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlFQUF5QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxnQkFBZ0IsQ0FBQztvQkFDeEUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO2lCQUN0QjtnQkFDRCxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDO2dCQUNyRCxpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztZQUNwQixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUZBQWlDO29CQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGlCQUFpQixDQUFDO29CQUM3RSxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUc7aUJBQ2pCO2dCQUNELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3JELGlCQUFpQixFQUFFLElBQUk7YUFDdkI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQ3BCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxxRkFBbUM7b0JBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsMkNBQTJDLEVBQUUsbUJBQW1CLENBQUM7b0JBQ2pGLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUztpQkFDdkI7Z0JBQ0QsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztnQkFDckQsaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGVBQWUsQ0FBQztRQUM1QjtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSxtRkFBa0M7b0JBQ3BDLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUs7aUJBQ2xDO2dCQUNELEtBQUssMENBQXlCO2dCQUM5QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSwrRUFBZ0M7b0JBQ2xDLEtBQUssRUFBRSxlQUFlLENBQUMsWUFBWSxDQUFDLEtBQUs7aUJBQ3pDO2dCQUNELEtBQUssMENBQXlCO2dCQUM5QixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSx5RkFBcUM7b0JBQ3ZDLEtBQUssRUFBRSxlQUFlLENBQUMsaUJBQWlCLENBQUMsS0FBSztpQkFDOUM7Z0JBQ0QsS0FBSywwQ0FBeUI7Z0JBQzlCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLHFGQUFtQztvQkFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxXQUFXLENBQUM7aUJBQ3hFO2dCQUNELEtBQUssc0NBQXVCO2FBQzVCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSw2RkFBdUM7b0JBQ3pDLEtBQUssRUFBRSxRQUFRLENBQUMsc0NBQXNDLEVBQUUsZ0JBQWdCLENBQUM7aUJBQ3pFO2dCQUNELEtBQUssc0NBQXVCO2FBQzVCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSwrRkFBd0M7b0JBQzFDLEtBQUssRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsaUJBQWlCLENBQUM7aUJBQzNFO2dCQUNELEtBQUssc0NBQXVCO2FBQzVCO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdCLElBQUksRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1IsRUFBRSwyRkFBc0M7b0JBQ3hDLEtBQUssRUFBRSxlQUFlLENBQUMsd0JBQXdCO2lCQUMvQztnQkFDRCxLQUFLLHNDQUF1QjthQUM1QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUsaUZBQWlDO29CQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLGdCQUFnQixDQUFDO2lCQUMzRTtnQkFDRCxJQUFJLEVBQUUsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFO2dCQUMzRCxLQUFLLDBDQUF5QjthQUM5QjtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNSLEVBQUUscUVBQTJCO29CQUM3QixLQUFLLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLO2lCQUNwQztnQkFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLENBQUMscUJBQXFCLEVBQ3pDLG1CQUFtQixDQUFDLGFBQWEsQ0FDakM7Z0JBQ0QsS0FBSywwQ0FBeUI7YUFDOUI7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLE9BQU8sRUFBRTtvQkFDUixFQUFFLGlGQUFpQztvQkFDbkMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSztpQkFDakM7Z0JBQ0QsS0FBSyxzQ0FBdUI7YUFDNUI7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFO1FBQ3RELE9BQU8sRUFBRTtZQUNSLEVBQUUsNkZBQXVDO1lBQ3pDLEtBQUssRUFBRSxlQUFlLENBQUMsbUJBQW1CO1NBQzFDO1FBQ0QsSUFBSSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNqRSxLQUFLLEVBQUUsU0FBUztLQUNoQixDQUFDLENBQUE7SUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtRQUN0RCxPQUFPLEVBQUU7WUFDUixFQUFFLG1FQUEwQjtZQUM1QixLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU07U0FDN0I7UUFDRCxJQUFJLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ2pFLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQTtJQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFO1FBQ3RELE9BQU8sRUFBRTtZQUNSLEVBQUUsNkVBQStCO1lBQ2pDLEtBQUssRUFBRSxlQUFlLENBQUMsV0FBVztTQUNsQztRQUNELElBQUksRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDakUsS0FBSyxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7UUFDdEQsT0FBTyxFQUFFO1lBQ1IsRUFBRSwyRUFBOEI7WUFDaEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxVQUFVO1NBQ2pDO1FBQ0QsSUFBSSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNqRSxLQUFLLEVBQUUsU0FBUztLQUNoQixDQUFDLENBQUE7SUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtRQUN0RCxPQUFPLEVBQUU7WUFDUixFQUFFLDJGQUFzQztZQUN4QyxLQUFLLEVBQUUsZUFBZSxDQUFDLHdCQUF3QjtTQUMvQztRQUNELElBQUksRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDakUsS0FBSyxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO1FBQy9DLE9BQU8sRUFBRTtZQUNSLEVBQUUsd0dBQWlEO1lBQ25ELEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRztZQUMxQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7U0FDbEI7UUFDRCxHQUFHLEVBQUU7WUFDSixFQUFFLGlFQUF5QjtZQUMzQixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLO1lBQ2xDLElBQUksRUFBRSxPQUFPLENBQUMsZUFBZTtTQUM3QjtRQUNELEtBQUssRUFBRSxZQUFZO1FBQ25CLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztLQUNqRSxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxRQUFrQyxFQUNsQyxRQUE0QixFQUM1QixrQkFBMEIsRUFDMUIsbUJBQXlELEVBQ3pELGVBQWlDLEVBQ2pDLFlBQW1CLEVBQ25CLGVBQWdDO0lBT2hDLElBQUksZUFBZSxHQUFjLEVBQUUsQ0FBQTtJQUNuQyxJQUFJLGNBQWMsR0FBYyxFQUFFLENBQUE7SUFDbEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3BELE1BQU0sYUFBYSxHQUNsQixRQUFRLEtBQUssZ0JBQWdCLENBQUMsTUFBTTtRQUNwQyxDQUFDLE9BQU8sUUFBUSxLQUFLLFFBQVE7WUFDNUIsWUFBWSxJQUFJLFFBQVE7WUFDeEIsUUFBUSxDQUFDLFVBQVUsS0FBSyxZQUFZLENBQUM7UUFDckMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRTtRQUM1QixDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUNqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzFCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUssa0JBQWtCLENBQUE7UUFDdEQsTUFBTSxPQUFPLEdBQTJCLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUMvRCxNQUFNLFlBQVksR0FBMkIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsQ0FBQTtRQUNuRixNQUFNLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuRSxlQUFlLENBQUMsSUFBSSxDQUNuQixlQUFlLENBQUMsR0FBRyxDQUNsQixJQUFJLE1BQU0sb0ZBRVQsU0FBUztZQUNSLENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixDQUFDO1lBQzNFLENBQUMsQ0FBQyxvQkFBb0IsRUFDdkIsU0FBUyxFQUNULElBQUksRUFDSixLQUFLLElBQUksRUFBRTtZQUNWLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5RCxlQUFlLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0MsTUFBTSxlQUFlLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUM1QyxDQUFDLENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxjQUFjLENBQUMsSUFBSSxDQUNsQixlQUFlLENBQUMsR0FBRyxDQUNsQixJQUFJLE1BQU0sa0VBRVQsU0FBUztZQUNSLENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixDQUFDO1lBQzNFLENBQUMsQ0FBQyxvQkFBb0IsRUFDdkIsU0FBUyxFQUNULElBQUksRUFDSixLQUFLLElBQUksRUFBRTtZQUNWLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNuRSxlQUFlLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0MsTUFBTSxlQUFlLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUM1QyxDQUFDLENBQ0QsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxNQUFNLFdBQVcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQy9DLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxLQUFLLEtBQUssa0JBQWtCLENBQUE7UUFDMUQsTUFBTSxLQUFLLEdBQUcsU0FBUztZQUN0QixDQUFDLENBQUMsUUFBUSxDQUNSLHdCQUF3QixFQUN4QixlQUFlLEVBQ2YsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUMxQztZQUNGLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDN0MsZUFBZSxDQUFDLElBQUksQ0FDbkIsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxNQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUN0RCxlQUFlLENBQUMsY0FBYyxDQUFDO1lBQzlCLE1BQU0sRUFBRTtnQkFDUCxtQkFBbUIsRUFBRSxXQUFXLENBQUMsbUJBQW1CO2dCQUNwRCxFQUFFLEVBQUUsV0FBVyxDQUFDLEVBQUU7Z0JBQ2xCLEtBQUs7YUFDTDtZQUNELFFBQVE7U0FDUixDQUFDLENBQ0YsQ0FDRCxDQUNELENBQUE7UUFDRCxjQUFjLENBQUMsSUFBSSxDQUNsQixlQUFlLENBQUMsR0FBRyxDQUNsQixJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FDNUQsZUFBZSxDQUFDLGNBQWMsQ0FBQztZQUM5QixNQUFNLEVBQUU7Z0JBQ1AsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLG1CQUFtQjtnQkFDcEQsRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFO2dCQUNsQixLQUFLO2FBQ0w7WUFDRCxRQUFRLEVBQUUsYUFBYTtTQUN2QixDQUFDLENBQ0YsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLElBQUksb0JBQW9CLEVBQUUsQ0FBQztRQUMxQixlQUFlLEdBQUcsZUFBZTthQUMvQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxvQkFBb0IsQ0FBQzthQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxlQUFlLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNoQyxlQUFlLENBQUMsSUFBSSxDQUNuQixJQUFJLGFBQWEsQ0FDaEIsZUFBZSxFQUNmLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsRUFDM0MsY0FBYyxDQUNkLENBQ0QsQ0FBQTtRQUNELGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFDRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDekMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFcEUsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQzdGLElBQUksMkJBQTJCLEVBQUUsQ0FBQztRQUNqQyxjQUFjLEdBQUcsY0FBYzthQUM3QixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSywyQkFBMkIsQ0FBQzthQUNoRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxjQUFjLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQ3pDLElBQUksTUFBTSxDQUNULGtCQUFrQixFQUNsQixRQUFRLENBQUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLEVBQzlDLHNCQUFzQixFQUN0QixJQUFJLENBQ0osQ0FDRCxDQUFBO0lBQ0QsT0FBTztRQUNOLGNBQWM7UUFDZCxtQkFBbUIsRUFBRSxlQUFlO1FBQ3BDLFNBQVMsRUFBRSx3QkFBd0IsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtLQUM5RSxDQUFBO0FBQ0YsQ0FBQyJ9