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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd2luZG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRXJELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixPQUFPLEVBQ1AsZUFBZSxHQUVmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sa0JBQWtCLEdBSWxCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQWEsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FB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