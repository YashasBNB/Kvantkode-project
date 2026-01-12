/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IWorkingCopyHistoryService, } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { LocalHistoryFileSystemProvider } from './localHistoryFileSystemProvider.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { registerAction2, Action2, MenuId, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { basename, basenameOrAuthority, dirname } from '../../../../base/common/resources.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { EditorResourceAccessor, SaveSourceRegistry, SideBySideEditor, } from '../../../common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ActiveEditorContext, ResourceContextKey } from '../../../common/contextkeys.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { getLocalHistoryDateFormatter, LOCAL_HISTORY_ICON_RESTORE, LOCAL_HISTORY_MENU_CONTEXT_KEY, } from './localHistory.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
const LOCAL_HISTORY_CATEGORY = localize2('localHistory.category', 'Local History');
const CTX_LOCAL_HISTORY_ENABLED = ContextKeyExpr.has('config.workbench.localHistory.enabled');
//#region Compare with File
export const COMPARE_WITH_FILE_LABEL = localize2('localHistory.compareWithFile', 'Compare with File');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithFile',
            title: COMPARE_WITH_FILE_LABEL,
            menu: {
                id: MenuId.TimelineItemContext,
                group: '1_compare',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const commandService = accessor.get(ICommandService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(entry, entry.workingCopy.resource));
        }
    }
});
//#endregion
//#region Compare with Previous
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithPrevious',
            title: localize2('localHistory.compareWithPrevious', 'Compare with Previous'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '1_compare',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const commandService = accessor.get(ICommandService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const { entry, previous } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            // Without a previous entry, just show the entry directly
            if (!previous) {
                return openEntry(entry, editorService);
            }
            // Open real diff editor
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(previous, entry));
        }
    }
});
//#endregion
//#region Select for Compare / Compare with Selected
let itemSelectedForCompare = undefined;
const LocalHistoryItemSelectedForCompare = new RawContextKey('localHistoryItemSelectedForCompare', false, true);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.selectForCompare',
            title: localize2('localHistory.selectForCompare', 'Select for Compare'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '2_compare_with',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const contextKeyService = accessor.get(IContextKeyService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            itemSelectedForCompare = item;
            LocalHistoryItemSelectedForCompare.bindTo(contextKeyService).set(true);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithSelected',
            title: localize2('localHistory.compareWithSelected', 'Compare with Selected'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '2_compare_with',
                order: 1,
                when: ContextKeyExpr.and(LOCAL_HISTORY_MENU_CONTEXT_KEY, LocalHistoryItemSelectedForCompare),
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const commandService = accessor.get(ICommandService);
        if (!itemSelectedForCompare) {
            return;
        }
        const selectedEntry = (await findLocalHistoryEntry(workingCopyHistoryService, itemSelectedForCompare)).entry;
        if (!selectedEntry) {
            return;
        }
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(selectedEntry, entry));
        }
    }
});
//#endregion
//#region Show Contents
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.open',
            title: localize2('localHistory.open', 'Show Contents'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '3_contents',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return openEntry(entry, editorService);
        }
    }
});
//#region Restore Contents
const RESTORE_CONTENTS_LABEL = localize2('localHistory.restore', 'Restore Contents');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restoreViaEditor',
            title: RESTORE_CONTENTS_LABEL,
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                order: -10,
                when: ResourceContextKey.Scheme.isEqualTo(LocalHistoryFileSystemProvider.SCHEMA),
            },
            icon: LOCAL_HISTORY_ICON_RESTORE,
        });
    }
    async run(accessor, uri) {
        const { associatedResource, location } = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(uri);
        return restore(accessor, { uri: associatedResource, handle: basenameOrAuthority(location) });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restore',
            title: RESTORE_CONTENTS_LABEL,
            menu: {
                id: MenuId.TimelineItemContext,
                group: '3_contents',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        return restore(accessor, item);
    }
});
const restoreSaveSource = SaveSourceRegistry.registerSource('localHistoryRestore.source', localize('localHistoryRestore.source', 'File Restored'));
async function restore(accessor, item) {
    const fileService = accessor.get(IFileService);
    const dialogService = accessor.get(IDialogService);
    const workingCopyService = accessor.get(IWorkingCopyService);
    const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
    const editorService = accessor.get(IEditorService);
    const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
    if (entry) {
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmRestoreMessage', "Do you want to restore the contents of '{0}'?", basename(entry.workingCopy.resource)),
            detail: localize('confirmRestoreDetail', 'Restoring will discard any unsaved changes.'),
            primaryButton: localize({ key: 'restoreButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Restore'),
        });
        if (!confirmed) {
            return;
        }
        // Revert all dirty working copies for target
        const workingCopies = workingCopyService.getAll(entry.workingCopy.resource);
        if (workingCopies) {
            for (const workingCopy of workingCopies) {
                if (workingCopy.isDirty()) {
                    await workingCopy.revert({ soft: true });
                }
            }
        }
        // Replace target with contents of history entry
        try {
            await fileService.cloneFile(entry.location, entry.workingCopy.resource);
        }
        catch (error) {
            // It is possible that we fail to copy the history entry to the
            // destination, for example when the destination is write protected.
            // In that case tell the user and return, it is still possible for
            // the user to manually copy the changes over from the diff editor.
            await dialogService.error(localize('unableToRestore', "Unable to restore '{0}'.", basename(entry.workingCopy.resource)), toErrorMessage(error));
            return;
        }
        // Restore all working copies for target
        if (workingCopies) {
            for (const workingCopy of workingCopies) {
                await workingCopy.revert({ force: true });
            }
        }
        // Open target
        await editorService.openEditor({ resource: entry.workingCopy.resource });
        // Add new entry
        await workingCopyHistoryService.addEntry({
            resource: entry.workingCopy.resource,
            source: restoreSaveSource,
        }, CancellationToken.None);
        // Close source
        await closeEntry(entry, editorService);
    }
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restoreViaPicker',
            title: localize2('localHistory.restoreViaPicker', 'Find Entry to Restore'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: CTX_LOCAL_HISTORY_ENABLED,
        });
    }
    async run(accessor) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const labelService = accessor.get(ILabelService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const commandService = accessor.get(ICommandService);
        const historyService = accessor.get(IHistoryService);
        // Show all resources with associated history entries in picker
        // with progress because this operation will take longer the more
        // files have been saved overall.
        //
        // Sort the resources by history to put more relevant entries
        // to the top.
        const resourcePickerDisposables = new DisposableStore();
        const resourcePicker = resourcePickerDisposables.add(quickInputService.createQuickPick());
        let cts = new CancellationTokenSource();
        resourcePickerDisposables.add(resourcePicker.onDidHide(() => cts.dispose(true)));
        resourcePicker.busy = true;
        resourcePicker.show();
        const resources = new ResourceSet(await workingCopyHistoryService.getAll(cts.token));
        const recentEditorResources = new ResourceSet(coalesce(historyService.getHistory().map(({ resource }) => resource)));
        const resourcesSortedByRecency = [];
        for (const resource of recentEditorResources) {
            if (resources.has(resource)) {
                resourcesSortedByRecency.push(resource);
                resources.delete(resource);
            }
        }
        resourcesSortedByRecency.push(...[...resources].sort((r1, r2) => (r1.fsPath < r2.fsPath ? -1 : 1)));
        resourcePicker.busy = false;
        resourcePicker.placeholder = localize('restoreViaPicker.filePlaceholder', 'Select the file to show local history for');
        resourcePicker.matchOnLabel = true;
        resourcePicker.matchOnDescription = true;
        resourcePicker.items = [...resourcesSortedByRecency].map((resource) => ({
            resource,
            label: basenameOrAuthority(resource),
            description: labelService.getUriLabel(dirname(resource), { relative: true }),
            iconClasses: getIconClasses(modelService, languageService, resource),
        }));
        await Event.toPromise(resourcePicker.onDidAccept);
        resourcePickerDisposables.dispose();
        const resource = resourcePicker.selectedItems.at(0)?.resource;
        if (!resource) {
            return;
        }
        // Show all entries for the picked resource in another picker
        // and open the entry in the end that was selected by the user
        const entryPickerDisposables = new DisposableStore();
        const entryPicker = entryPickerDisposables.add(quickInputService.createQuickPick());
        cts = new CancellationTokenSource();
        entryPickerDisposables.add(entryPicker.onDidHide(() => cts.dispose(true)));
        entryPicker.busy = true;
        entryPicker.show();
        const entries = await workingCopyHistoryService.getEntries(resource, cts.token);
        entryPicker.busy = false;
        entryPicker.canAcceptInBackground = true;
        entryPicker.placeholder = localize('restoreViaPicker.entryPlaceholder', 'Select the local history entry to open');
        entryPicker.matchOnLabel = true;
        entryPicker.matchOnDescription = true;
        entryPicker.items = Array.from(entries)
            .reverse()
            .map((entry) => ({
            entry,
            label: `$(circle-outline) ${SaveSourceRegistry.getSourceLabel(entry.source)}`,
            description: toLocalHistoryEntryDateLabel(entry.timestamp),
        }));
        entryPickerDisposables.add(entryPicker.onDidAccept(async (e) => {
            if (!e.inBackground) {
                entryPickerDisposables.dispose();
            }
            const selectedItem = entryPicker.selectedItems.at(0);
            if (!selectedItem) {
                return;
            }
            const resourceExists = await fileService.exists(selectedItem.entry.workingCopy.resource);
            if (resourceExists) {
                return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(selectedItem.entry, selectedItem.entry.workingCopy.resource, { preserveFocus: e.inBackground }));
            }
            return openEntry(selectedItem.entry, editorService, { preserveFocus: e.inBackground });
        }));
    }
});
MenuRegistry.appendMenuItem(MenuId.TimelineTitle, {
    command: {
        id: 'workbench.action.localHistory.restoreViaPicker',
        title: localize2('localHistory.restoreViaPickerMenu', 'Local History: Find Entry to Restore...'),
    },
    group: 'submenu',
    order: 1,
    when: CTX_LOCAL_HISTORY_ENABLED,
});
//#endregion
//#region Rename
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.rename',
            title: localize2('localHistory.rename', 'Rename'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '5_edit',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            const disposables = new DisposableStore();
            const inputBox = disposables.add(quickInputService.createInputBox());
            inputBox.title = localize('renameLocalHistoryEntryTitle', 'Rename Local History Entry');
            inputBox.ignoreFocusOut = true;
            inputBox.placeholder = localize('renameLocalHistoryPlaceholder', 'Enter the new name of the local history entry');
            inputBox.value = SaveSourceRegistry.getSourceLabel(entry.source);
            inputBox.show();
            disposables.add(inputBox.onDidAccept(() => {
                if (inputBox.value) {
                    workingCopyHistoryService.updateEntry(entry, { source: inputBox.value }, CancellationToken.None);
                }
                disposables.dispose();
            }));
        }
    }
});
//#endregion
//#region Delete
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.delete',
            title: localize2('localHistory.delete', 'Delete'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '5_edit',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY,
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const dialogService = accessor.get(IDialogService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            // Ask for confirmation
            const { confirmed } = await dialogService.confirm({
                type: 'warning',
                message: localize('confirmDeleteMessage', "Do you want to delete the local history entry of '{0}' from {1}?", entry.workingCopy.name, toLocalHistoryEntryDateLabel(entry.timestamp)),
                detail: localize('confirmDeleteDetail', 'This action is irreversible!'),
                primaryButton: localize({ key: 'deleteButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Delete'),
            });
            if (!confirmed) {
                return;
            }
            // Remove via service
            await workingCopyHistoryService.removeEntry(entry, CancellationToken.None);
            // Close any opened editors
            await closeEntry(entry, editorService);
        }
    }
});
//#endregion
//#region Delete All
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.deleteAll',
            title: localize2('localHistory.deleteAll', 'Delete All'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: CTX_LOCAL_HISTORY_ENABLED,
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmDeleteAllMessage', 'Do you want to delete all entries of all files in local history?'),
            detail: localize('confirmDeleteAllDetail', 'This action is irreversible!'),
            primaryButton: localize({ key: 'deleteAllButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Delete All'),
        });
        if (!confirmed) {
            return;
        }
        // Remove via service
        await workingCopyHistoryService.removeAll(CancellationToken.None);
    }
});
//#endregion
//#region Create
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.create',
            title: localize2('localHistory.create', 'Create Entry'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: ContextKeyExpr.and(CTX_LOCAL_HISTORY_ENABLED, ActiveEditorContext),
        });
    }
    async run(accessor) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const labelService = accessor.get(ILabelService);
        const pathService = accessor.get(IPathService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (resource?.scheme !== pathService.defaultUriScheme &&
            resource?.scheme !== Schemas.vscodeUserData) {
            return; // only enable for selected schemes
        }
        const disposables = new DisposableStore();
        const inputBox = disposables.add(quickInputService.createInputBox());
        inputBox.title = localize('createLocalHistoryEntryTitle', 'Create Local History Entry');
        inputBox.ignoreFocusOut = true;
        inputBox.placeholder = localize('createLocalHistoryPlaceholder', "Enter the new name of the local history entry for '{0}'", labelService.getUriBasenameLabel(resource));
        inputBox.show();
        disposables.add(inputBox.onDidAccept(async () => {
            const entrySource = inputBox.value;
            disposables.dispose();
            if (entrySource) {
                await workingCopyHistoryService.addEntry({ resource, source: inputBox.value }, CancellationToken.None);
            }
        }));
    }
});
//#endregion
//#region Helpers
async function openEntry(entry, editorService, options) {
    const resource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({
        location: entry.location,
        associatedResource: entry.workingCopy.resource,
    });
    await editorService.openEditor({
        resource,
        label: localize('localHistoryEditorLabel', '{0} ({1} • {2})', entry.workingCopy.name, SaveSourceRegistry.getSourceLabel(entry.source), toLocalHistoryEntryDateLabel(entry.timestamp)),
        options,
    });
}
async function closeEntry(entry, editorService) {
    const resource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({
        location: entry.location,
        associatedResource: entry.workingCopy.resource,
    });
    const editors = editorService.findEditors(resource, { supportSideBySide: SideBySideEditor.ANY });
    await editorService.closeEditors(editors, { preserveFocus: true });
}
export function toDiffEditorArguments(arg1, arg2, options) {
    // Left hand side is always a working copy history entry
    const originalResource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({
        location: arg1.location,
        associatedResource: arg1.workingCopy.resource,
    });
    let label;
    // Right hand side depends on how the method was called
    // and is either another working copy history entry
    // or the file on disk.
    let modifiedResource;
    // Compare with file on disk
    if (URI.isUri(arg2)) {
        const resource = arg2;
        modifiedResource = resource;
        label = localize('localHistoryCompareToFileEditorLabel', '{0} ({1} • {2}) ↔ {3}', arg1.workingCopy.name, SaveSourceRegistry.getSourceLabel(arg1.source), toLocalHistoryEntryDateLabel(arg1.timestamp), arg1.workingCopy.name);
    }
    // Compare with another entry
    else {
        const modified = arg2;
        modifiedResource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({
            location: modified.location,
            associatedResource: modified.workingCopy.resource,
        });
        label = localize('localHistoryCompareToPreviousEditorLabel', '{0} ({1} • {2}) ↔ {3} ({4} • {5})', arg1.workingCopy.name, SaveSourceRegistry.getSourceLabel(arg1.source), toLocalHistoryEntryDateLabel(arg1.timestamp), modified.workingCopy.name, SaveSourceRegistry.getSourceLabel(modified.source), toLocalHistoryEntryDateLabel(modified.timestamp));
    }
    return [originalResource, modifiedResource, label, options ? [undefined, options] : undefined];
}
export async function findLocalHistoryEntry(workingCopyHistoryService, descriptor) {
    const entries = await workingCopyHistoryService.getEntries(descriptor.uri, CancellationToken.None);
    let currentEntry = undefined;
    let previousEntry = undefined;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.id === descriptor.handle) {
            currentEntry = entry;
            previousEntry = entries[i - 1];
            break;
        }
    }
    return {
        entry: currentEntry,
        previous: previousEntry,
    };
}
const SEP = /\//g;
function toLocalHistoryEntryDateLabel(timestamp) {
    return `${getLocalHistoryDateFormatter().format(timestamp).replace(SEP, '-')}`; // preserving `/` will break editor labels, so replace it with a non-path symbol
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsSGlzdG9yeS9icm93c2VyL2xvY2FsSGlzdG9yeUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRixPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFDUCxNQUFNLEVBQ04sWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYs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