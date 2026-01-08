/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { MenuRegistry, MenuId, Action2, registerAction2, } from '../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { IsMainWindowFullscreenContext } from '../../common/contextkeys.js';
import { IsMacNativeContext, IsDevelopmentContext, IsWebContext, IsIOSContext, } from '../../../platform/contextkey/common/contextkeys.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService, } from '../../../platform/workspace/common/workspace.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { isRecentFolder, isRecentWorkspace, IWorkspacesService, } from '../../../platform/workspaces/common/workspaces.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { splitRecentLabel } from '../../../base/common/labels.js';
import { isMacintosh, isWeb, isWindows } from '../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { inQuickPickContext, getQuickNavigateHandler } from '../quickaccess.js';
import { IHostService } from '../../services/host/browser/host.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { isFolderBackupInfo, isWorkspaceBackupInfo, } from '../../../platform/backup/common/backup.js';
import { getActiveElement, getActiveWindow, isHTMLElement } from '../../../base/browser/dom.js';
export const inRecentFilesPickerContextKey = 'inRecentFilesPicker';
class BaseOpenRecentAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.removeFromRecentlyOpened = {
            iconClass: ThemeIcon.asClassName(Codicon.removeClose),
            tooltip: localize('remove', 'Remove from Recently Opened'),
        };
        this.dirtyRecentlyOpenedFolder = {
            iconClass: 'dirty-workspace ' + ThemeIcon.asClassName(Codicon.closeDirty),
            tooltip: localize('dirtyRecentlyOpenedFolder', 'Folder With Unsaved Files'),
            alwaysVisible: true,
        };
        this.dirtyRecentlyOpenedWorkspace = {
            ...this.dirtyRecentlyOpenedFolder,
            tooltip: localize('dirtyRecentlyOpenedWorkspace', 'Workspace With Unsaved Files'),
        };
    }
    async run(accessor) {
        const workspacesService = accessor.get(IWorkspacesService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextService = accessor.get(IWorkspaceContextService);
        const labelService = accessor.get(ILabelService);
        const keybindingService = accessor.get(IKeybindingService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const hostService = accessor.get(IHostService);
        const dialogService = accessor.get(IDialogService);
        const recentlyOpened = await workspacesService.getRecentlyOpened();
        const dirtyWorkspacesAndFolders = await workspacesService.getDirtyWorkspaces();
        let hasWorkspaces = false;
        // Identify all folders and workspaces with unsaved files
        const dirtyFolders = new ResourceMap();
        const dirtyWorkspaces = new ResourceMap();
        for (const dirtyWorkspace of dirtyWorkspacesAndFolders) {
            if (isFolderBackupInfo(dirtyWorkspace)) {
                dirtyFolders.set(dirtyWorkspace.folderUri, true);
            }
            else {
                dirtyWorkspaces.set(dirtyWorkspace.workspace.configPath, dirtyWorkspace.workspace);
                hasWorkspaces = true;
            }
        }
        // Identify all recently opened folders and workspaces
        const recentFolders = new ResourceMap();
        const recentWorkspaces = new ResourceMap();
        for (const recent of recentlyOpened.workspaces) {
            if (isRecentFolder(recent)) {
                recentFolders.set(recent.folderUri, true);
            }
            else {
                recentWorkspaces.set(recent.workspace.configPath, recent.workspace);
                hasWorkspaces = true;
            }
        }
        // Fill in all known recently opened workspaces
        const workspacePicks = [];
        for (const recent of recentlyOpened.workspaces) {
            const isDirty = isRecentFolder(recent)
                ? dirtyFolders.has(recent.folderUri)
                : dirtyWorkspaces.has(recent.workspace.configPath);
            workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, recent, isDirty));
        }
        // Fill any backup workspace that is not yet shown at the end
        for (const dirtyWorkspaceOrFolder of dirtyWorkspacesAndFolders) {
            if (isFolderBackupInfo(dirtyWorkspaceOrFolder) &&
                !recentFolders.has(dirtyWorkspaceOrFolder.folderUri)) {
                workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, dirtyWorkspaceOrFolder, true));
            }
            else if (isWorkspaceBackupInfo(dirtyWorkspaceOrFolder) &&
                !recentWorkspaces.has(dirtyWorkspaceOrFolder.workspace.configPath)) {
                workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, dirtyWorkspaceOrFolder, true));
            }
        }
        const filePicks = recentlyOpened.files.map((p) => this.toQuickPick(modelService, languageService, labelService, p, false));
        // focus second entry if the first recent workspace is the current workspace
        const firstEntry = recentlyOpened.workspaces[0];
        const autoFocusSecondEntry = firstEntry &&
            contextService.isCurrentWorkspace(isRecentWorkspace(firstEntry) ? firstEntry.workspace : firstEntry.folderUri);
        let keyMods;
        const workspaceSeparator = {
            type: 'separator',
            label: hasWorkspaces
                ? localize('workspacesAndFolders', 'folders & workspaces')
                : localize('folders', 'folders'),
        };
        const fileSeparator = {
            type: 'separator',
            label: localize('files', 'files'),
        };
        const picks = [workspaceSeparator, ...workspacePicks, fileSeparator, ...filePicks];
        const pick = await quickInputService.pick(picks, {
            contextKey: inRecentFilesPickerContextKey,
            activeItem: [...workspacePicks, ...filePicks][autoFocusSecondEntry ? 1 : 0],
            placeHolder: isMacintosh
                ? localize('openRecentPlaceholderMac', 'Select to open (hold Cmd-key to force new window or Option-key for same window)')
                : localize('openRecentPlaceholder', 'Select to open (hold Ctrl-key to force new window or Alt-key for same window)'),
            matchOnDescription: true,
            onKeyMods: (mods) => (keyMods = mods),
            quickNavigate: this.isQuickNavigate()
                ? { keybindings: keybindingService.lookupKeybindings(this.desc.id) }
                : undefined,
            hideInput: this.isQuickNavigate(),
            onDidTriggerItemButton: async (context) => {
                // Remove
                if (context.button === this.removeFromRecentlyOpened) {
                    await workspacesService.removeRecentlyOpened([context.item.resource]);
                    context.removeItem();
                }
                // Dirty Folder/Workspace
                else if (context.button === this.dirtyRecentlyOpenedFolder ||
                    context.button === this.dirtyRecentlyOpenedWorkspace) {
                    const isDirtyWorkspace = context.button === this.dirtyRecentlyOpenedWorkspace;
                    const { confirmed } = await dialogService.confirm({
                        title: isDirtyWorkspace
                            ? localize('dirtyWorkspace', 'Workspace with Unsaved Files')
                            : localize('dirtyFolder', 'Folder with Unsaved Files'),
                        message: isDirtyWorkspace
                            ? localize('dirtyWorkspaceConfirm', 'Do you want to open the workspace to review the unsaved files?')
                            : localize('dirtyFolderConfirm', 'Do you want to open the folder to review the unsaved files?'),
                        detail: isDirtyWorkspace
                            ? localize('dirtyWorkspaceConfirmDetail', 'Workspaces with unsaved files cannot be removed until all unsaved files have been saved or reverted.')
                            : localize('dirtyFolderConfirmDetail', 'Folders with unsaved files cannot be removed until all unsaved files have been saved or reverted.'),
                    });
                    if (confirmed) {
                        hostService.openWindow([context.item.openable], {
                            remoteAuthority: context.item.remoteAuthority || null, // local window if remoteAuthority is not set or can not be deducted from the openable
                        });
                        quickInputService.cancel();
                    }
                }
            },
        });
        if (pick) {
            return hostService.openWindow([pick.openable], {
                forceNewWindow: keyMods?.ctrlCmd,
                forceReuseWindow: keyMods?.alt,
                remoteAuthority: pick.remoteAuthority || null, // local window if remoteAuthority is not set or can not be deducted from the openable
            });
        }
    }
    toQuickPick(modelService, languageService, labelService, recent, isDirty) {
        let openable;
        let iconClasses;
        let fullLabel;
        let resource;
        let isWorkspace = false;
        // Folder
        if (isRecentFolder(recent)) {
            resource = recent.folderUri;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.FOLDER);
            openable = { folderUri: resource };
            fullLabel =
                recent.label || labelService.getWorkspaceLabel(resource, { verbose: 2 /* Verbosity.LONG */ });
        }
        // Workspace
        else if (isRecentWorkspace(recent)) {
            resource = recent.workspace.configPath;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.ROOT_FOLDER);
            openable = { workspaceUri: resource };
            fullLabel =
                recent.label ||
                    labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
            isWorkspace = true;
        }
        // File
        else {
            resource = recent.fileUri;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.FILE);
            openable = { fileUri: resource };
            fullLabel =
                recent.label || labelService.getUriLabel(resource, { appendWorkspaceSuffix: true });
        }
        const { name, parentPath } = splitRecentLabel(fullLabel);
        return {
            iconClasses,
            label: name,
            ariaLabel: isDirty
                ? isWorkspace
                    ? localize('recentDirtyWorkspaceAriaLabel', '{0}, workspace with unsaved changes', name)
                    : localize('recentDirtyFolderAriaLabel', '{0}, folder with unsaved changes', name)
                : name,
            description: parentPath,
            buttons: isDirty
                ? [isWorkspace ? this.dirtyRecentlyOpenedWorkspace : this.dirtyRecentlyOpenedFolder]
                : [this.removeFromRecentlyOpened],
            openable,
            resource,
            remoteAuthority: recent.remoteAuthority,
        };
    }
}
export class OpenRecentAction extends BaseOpenRecentAction {
    static { this.ID = 'workbench.action.openRecent'; }
    constructor() {
        super({
            id: OpenRecentAction.ID,
            title: {
                ...localize2('openRecent', 'Open Recent...'),
                mnemonicTitle: localize({ key: 'miMore', comment: ['&& denotes a mnemonic'] }, '&&More...'),
            },
            category: Categories.File,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 48 /* KeyCode.KeyR */ },
            },
            menu: {
                id: MenuId.MenubarRecentMenu,
                group: 'y_more',
                order: 1,
            },
        });
    }
    isQuickNavigate() {
        return false;
    }
}
class QuickPickRecentAction extends BaseOpenRecentAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenRecent',
            title: localize2('quickOpenRecent', 'Quick Open Recent...'),
            category: Categories.File,
            f1: false, // hide quick pickers from command palette to not confuse with the other entry that shows a input field
        });
    }
    isQuickNavigate() {
        return true;
    }
}
class ToggleFullScreenAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleFullScreen',
            title: {
                ...localize2('toggleFullScreen', 'Toggle Full Screen'),
                mnemonicTitle: localize({ key: 'miToggleFullScreen', comment: ['&& denotes a mnemonic'] }, '&&Full Screen'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 69 /* KeyCode.F11 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 36 /* KeyCode.KeyF */,
                },
            },
            precondition: IsIOSContext.toNegated(),
            toggled: IsMainWindowFullscreenContext,
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 1,
                },
            ],
        });
    }
    run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.toggleFullScreen(getActiveWindow());
    }
}
export class ReloadWindowAction extends Action2 {
    static { this.ID = 'workbench.action.reloadWindow'; }
    constructor() {
        super({
            id: ReloadWindowAction.ID,
            title: localize2('reloadWindow', 'Reload Window'),
            category: Categories.Developer,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                when: IsDevelopmentContext,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
            },
        });
    }
    async run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.reload();
    }
}
class ShowAboutDialogAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showAboutDialog',
            title: {
                ...localize2('about', 'About'),
                mnemonicTitle: localize({ key: 'miAbout', comment: ['&& denotes a mnemonic'] }, '&&About'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: 'z_about',
                order: 1,
                when: IsMacNativeContext.toNegated(),
            },
        });
    }
    run(accessor) {
        const dialogService = accessor.get(IDialogService);
        return dialogService.about();
    }
}
class NewWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.newWindow',
            title: {
                ...localize2('newWindow', 'New Window'),
                mnemonicTitle: localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, 'New &&Window'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: isWeb
                    ? isWindows
                        ? KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */)
                        : 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */
                    : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */,
                secondary: isWeb ? [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */] : undefined,
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '1_new',
                order: 3,
            },
        });
    }
    run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.openWindow({ remoteAuthority: null });
    }
}
class BlurAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.blur',
            title: localize2('blur', 'Remove keyboard focus from focused element'),
        });
    }
    run() {
        const activeElement = getActiveElement();
        if (isHTMLElement(activeElement)) {
            activeElement.blur();
        }
    }
}
// --- Actions Registration
registerAction2(NewWindowAction);
registerAction2(ToggleFullScreenAction);
registerAction2(QuickPickRecentAction);
registerAction2(OpenRecentAction);
registerAction2(ReloadWindowAction);
registerAction2(ShowAboutDialogAction);
registerAction2(BlurAction);
// --- Commands/Keybindings Registration
const recentFilesPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inRecentFilesPickerContextKey));
const quickPickNavigateNextInRecentFilesPickerId = 'workbench.action.quickOpenNavigateNextInRecentFilesPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickPickNavigateNextInRecentFilesPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickPickNavigateNextInRecentFilesPickerId, true),
    when: recentFilesPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 48 /* KeyCode.KeyR */ },
});
const quickPickNavigatePreviousInRecentFilesPicker = 'workbench.action.quickOpenNavigatePreviousInRecentFilesPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickPickNavigatePreviousInRecentFilesPicker,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickPickNavigatePreviousInRecentFilesPicker, false),
    when: recentFilesPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */ },
});
CommandsRegistry.registerCommand('workbench.action.toggleConfirmBeforeClose', (accessor) => {
    const configurationService = accessor.get(IConfigurationService);
    const setting = configurationService.inspect('window.confirmBeforeClose').userValue;
    return configurationService.updateValue('window.confirmBeforeClose', setting === 'never' ? 'keyboardOnly' : 'never');
});
// --- Menu Registration
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: 'z_ConfirmClose',
    command: {
        id: 'workbench.action.toggleConfirmBeforeClose',
        title: localize('miConfirmClose', 'Confirm Before Close'),
        toggled: ContextKeyExpr.notEquals('config.window.confirmBeforeClose', 'never'),
    },
    order: 1,
    when: IsWebContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    title: localize({ key: 'miOpenRecent', comment: ['&& denotes a mnemonic'] }, 'Open &&Recent'),
    submenu: MenuId.MenubarRecentMenu,
    group: '2_open',
    order: 4,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy93aW5kb3dBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEdBRWYsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzNFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdEYsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFFTixrQkFBa0IsR0FJbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBYSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMv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