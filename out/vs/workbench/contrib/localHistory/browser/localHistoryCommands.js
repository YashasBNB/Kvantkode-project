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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbEhpc3RvcnkvYnJvd3Nlci9sb2NhbEhpc3RvcnlDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDakcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEYsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEVBQ1AsTUFBTSxFQUNOLFlBQVksR0FDWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8s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