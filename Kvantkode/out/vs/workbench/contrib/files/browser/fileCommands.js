/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { isWorkspaceToOpen, } from '../../../../platform/window/common/window.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService, UNTITLED_WORKSPACE_NAME, } from '../../../../platform/workspace/common/workspace.js';
import { ExplorerFocusCondition, TextFileContentProvider, VIEWLET_ID, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLastFocusContext, FilesExplorerFocusCondition, ExplorerFolderContext, VIEW_ID, } from '../common/files.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CommandsRegistry, ICommandService, } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { getResourceForCommand, getMultiSelectedResources, getOpenEditorsViewMultiSelection, IExplorerService, } from './files.js';
import { IWorkspaceEditingService } from '../../../services/workspaces/common/workspaceEditing.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { Schemas } from '../../../../base/common/network.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { basename, joinPath, isEqual } from '../../../../base/common/resources.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toAction } from '../../../../base/common/actions.js';
import { EditorOpenSource, EditorResolution } from '../../../../platform/editor/common/editor.js';
import { hash } from '../../../../base/common/hash.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { OPEN_TO_SIDE_COMMAND_ID, COMPARE_WITH_SAVED_COMMAND_ID, SELECT_FOR_COMPARE_COMMAND_ID, ResourceSelectedForCompareContext, COMPARE_SELECTED_COMMAND_ID, COMPARE_RESOURCE_COMMAND_ID, COPY_PATH_COMMAND_ID, COPY_RELATIVE_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID, OPEN_WITH_EXPLORER_COMMAND_ID, SAVE_FILE_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID, SAVE_FILE_AS_COMMAND_ID, SAVE_ALL_COMMAND_ID, SAVE_ALL_IN_GROUP_COMMAND_ID, SAVE_FILES_COMMAND_ID, REVERT_FILE_COMMAND_ID, REMOVE_ROOT_FOLDER_COMMAND_ID, PREVIOUS_COMPRESSED_FOLDER, NEXT_COMPRESSED_FOLDER, FIRST_COMPRESSED_FOLDER, LAST_COMPRESSED_FOLDER, NEW_UNTITLED_FILE_COMMAND_ID, NEW_UNTITLED_FILE_LABEL, NEW_FILE_COMMAND_ID, } from './fileConstants.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { RemoveRootFolderAction } from '../../../browser/actions/workspaceActions.js';
import { OpenEditorsView } from './views/openEditorsView.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
export const openWindowCommand = (accessor, toOpen, options) => {
    if (Array.isArray(toOpen)) {
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(IEnvironmentService);
        // rewrite untitled: workspace URIs to the absolute path on disk
        toOpen = toOpen.map((openable) => {
            if (isWorkspaceToOpen(openable) && openable.workspaceUri.scheme === Schemas.untitled) {
                return {
                    workspaceUri: joinPath(environmentService.untitledWorkspacesHome, openable.workspaceUri.path, UNTITLED_WORKSPACE_NAME),
                };
            }
            return openable;
        });
        hostService.openWindow(toOpen, options);
    }
};
export const newWindowCommand = (accessor, options) => {
    const hostService = accessor.get(IHostService);
    hostService.openWindow(options);
};
// Command registration
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ExplorerFocusCondition,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
    },
    id: OPEN_TO_SIDE_COMMAND_ID,
    handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const explorerService = accessor.get(IExplorerService);
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IEditorGroupsService), explorerService);
        // Set side input
        if (resources.length) {
            const untitledResources = resources.filter((resource) => resource.scheme === Schemas.untitled);
            const fileResources = resources.filter((resource) => resource.scheme !== Schemas.untitled);
            const items = await Promise.all(fileResources.map(async (resource) => {
                const item = explorerService.findClosest(resource);
                if (item) {
                    // Explorer already resolved the item, no need to go to the file service #109780
                    return item;
                }
                return await fileService.stat(resource);
            }));
            const files = items.filter((i) => !i.isDirectory);
            const editors = files
                .map((f) => ({
                resource: f.resource,
                options: { pinned: true },
            }))
                .concat(...untitledResources.map((untitledResource) => ({
                resource: untitledResource,
                options: { pinned: true },
            })));
            await editorService.openEditors(editors, SIDE_GROUP);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext.toNegated()),
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
    },
    id: 'explorer.openAndPassFocus',
    handler: async (accessor, _resource) => {
        const editorService = accessor.get(IEditorService);
        const explorerService = accessor.get(IExplorerService);
        const resources = explorerService.getContext(true);
        if (resources.length) {
            await editorService.openEditors(resources.map((r) => ({
                resource: r.resource,
                options: { preserveFocus: false, pinned: true },
            })));
        }
    },
});
const COMPARE_WITH_SAVED_SCHEMA = 'showModifications';
let providerDisposables = [];
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COMPARE_WITH_SAVED_COMMAND_ID,
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 34 /* KeyCode.KeyD */),
    handler: async (accessor, resource) => {
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const listService = accessor.get(IListService);
        // Register provider at first as needed
        let registerEditorListener = false;
        if (providerDisposables.length === 0) {
            registerEditorListener = true;
            const provider = instantiationService.createInstance(TextFileContentProvider);
            providerDisposables.push(provider);
            providerDisposables.push(textModelService.registerTextModelContentProvider(COMPARE_WITH_SAVED_SCHEMA, provider));
        }
        // Open editor (only resources that can be handled by file service are supported)
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri && fileService.hasProvider(uri)) {
            const name = basename(uri);
            const editorLabel = nls.localize('modifiedLabel', '{0} (in file) ↔ {1}', name, name);
            try {
                await TextFileContentProvider.open(uri, COMPARE_WITH_SAVED_SCHEMA, editorLabel, editorService, { pinned: true });
                // Dispose once no more diff editor is opened with the scheme
                if (registerEditorListener) {
                    providerDisposables.push(editorService.onDidVisibleEditorsChange(() => {
                        if (!editorService.editors.some((editor) => !!EditorResourceAccessor.getCanonicalUri(editor, {
                            supportSideBySide: SideBySideEditor.SECONDARY,
                            filterByScheme: COMPARE_WITH_SAVED_SCHEMA,
                        }))) {
                            providerDisposables = dispose(providerDisposables);
                        }
                    }));
                }
            }
            catch {
                providerDisposables = dispose(providerDisposables);
            }
        }
    },
});
let globalResourceToCompare;
let resourceSelectedForCompareContext;
CommandsRegistry.registerCommand({
    id: SELECT_FOR_COMPARE_COMMAND_ID,
    handler: (accessor, resource) => {
        globalResourceToCompare = getResourceForCommand(resource, accessor.get(IEditorService), accessor.get(IListService));
        if (!resourceSelectedForCompareContext) {
            resourceSelectedForCompareContext = ResourceSelectedForCompareContext.bindTo(accessor.get(IContextKeyService));
        }
        resourceSelectedForCompareContext.set(true);
    },
});
CommandsRegistry.registerCommand({
    id: COMPARE_SELECTED_COMMAND_ID,
    handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
        if (resources.length === 2) {
            return editorService.openEditor({
                original: { resource: resources[0] },
                modified: { resource: resources[1] },
                options: { pinned: true },
            });
        }
        return true;
    },
});
CommandsRegistry.registerCommand({
    id: COMPARE_RESOURCE_COMMAND_ID,
    handler: (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const rightResource = getResourceForCommand(resource, editorService, accessor.get(IListService));
        if (globalResourceToCompare && rightResource) {
            editorService.openEditor({
                original: { resource: globalResourceToCompare },
                modified: { resource: rightResource },
                options: { pinned: true },
            });
        }
    },
});
async function resourcesToClipboard(resources, relative, clipboardService, labelService, configurationService) {
    if (resources.length) {
        const lineDelimiter = isWindows ? '\r\n' : '\n';
        let separator = undefined;
        const copyRelativeOrFullPathSeparatorSection = relative
            ? 'explorer.copyRelativePathSeparator'
            : 'explorer.copyPathSeparator';
        const copyRelativeOrFullPathSeparator = configurationService.getValue(copyRelativeOrFullPathSeparatorSection);
        if (copyRelativeOrFullPathSeparator === '/' || copyRelativeOrFullPathSeparator === '\\') {
            separator = copyRelativeOrFullPathSeparator;
        }
        const text = resources
            .map((resource) => labelService.getUriLabel(resource, { relative, noPrefix: true, separator }))
            .join(lineDelimiter);
        await clipboardService.writeText(text);
    }
}
const copyPathCommandHandler = async (accessor, resource) => {
    const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    await resourcesToClipboard(resources, false, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    },
    id: COPY_PATH_COMMAND_ID,
    handler: copyPathCommandHandler,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    },
    id: COPY_PATH_COMMAND_ID,
    handler: copyPathCommandHandler,
});
const copyRelativePathCommandHandler = async (accessor, resource) => {
    const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    await resourcesToClipboard(resources, true, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    win: {
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */),
    },
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    handler: copyRelativePathCommandHandler,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
    win: {
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */),
    },
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    handler: copyRelativePathCommandHandler,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 46 /* KeyCode.KeyP */),
    id: 'workbench.action.files.copyPathOfActiveFile',
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeInput = editorService.activeEditor;
        const resource = EditorResourceAccessor.getOriginalUri(activeInput, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        const resources = resource ? [resource] : [];
        await resourcesToClipboard(resources, false, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
    },
});
CommandsRegistry.registerCommand({
    id: REVEAL_IN_EXPLORER_COMMAND_ID,
    handler: async (accessor, resource) => {
        const viewService = accessor.get(IViewsService);
        const contextService = accessor.get(IWorkspaceContextService);
        const explorerService = accessor.get(IExplorerService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri && contextService.isInsideWorkspace(uri)) {
            const explorerView = await viewService.openView(VIEW_ID, false);
            if (explorerView) {
                const oldAutoReveal = explorerView.autoReveal;
                // Disable autoreveal before revealing the explorer to prevent a race betwene auto reveal + selection
                // Fixes #197268
                explorerView.autoReveal = false;
                explorerView.setExpanded(true);
                await explorerService.select(uri, 'force');
                explorerView.focus();
                explorerView.autoReveal = oldAutoReveal;
            }
        }
        else {
            // Do not reveal the open editors view if it's hidden explicitly
            // See https://github.com/microsoft/vscode/issues/227378
            const openEditorsView = viewService.getViewWithId(OpenEditorsView.ID);
            if (openEditorsView) {
                openEditorsView.setExpanded(true);
                openEditorsView.focus();
            }
        }
    },
});
CommandsRegistry.registerCommand({
    id: OPEN_WITH_EXPLORER_COMMAND_ID,
    handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri) {
            return editorService.openEditor({
                resource: uri,
                options: { override: EditorResolution.PICK, source: EditorOpenSource.USER },
            });
        }
        return undefined;
    },
});
// Save / Save As / Save All / Revert
async function saveSelectedEditors(accessor, options) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const codeEditorService = accessor.get(ICodeEditorService);
    const textFileService = accessor.get(ITextFileService);
    // Retrieve selected or active editor
    let editors = getOpenEditorsViewMultiSelection(accessor);
    if (!editors) {
        const activeGroup = editorGroupService.activeGroup;
        if (activeGroup.activeEditor) {
            editors = [];
            // Special treatment for side by side editors: if the active editor
            // has 2 sides, we consider both, to support saving both sides.
            // We only allow this when saving, not for "Save As" and not if any
            // editor is untitled which would bring up a "Save As" dialog too.
            // In addition, we require the secondary side to be modified to not
            // trigger a touch operation unexpectedly.
            //
            // See also https://github.com/microsoft/vscode/issues/4180
            // See also https://github.com/microsoft/vscode/issues/106330
            // See also https://github.com/microsoft/vscode/issues/190210
            if (activeGroup.activeEditor instanceof SideBySideEditorInput &&
                !options?.saveAs &&
                !(activeGroup.activeEditor.primary.hasCapability(4 /* EditorInputCapabilities.Untitled */) ||
                    activeGroup.activeEditor.secondary.hasCapability(4 /* EditorInputCapabilities.Untitled */)) &&
                activeGroup.activeEditor.secondary.isModified()) {
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor.primary });
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor.secondary });
            }
            else {
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor });
            }
        }
    }
    if (!editors || editors.length === 0) {
        return; // nothing to save
    }
    // Save editors
    await doSaveEditors(accessor, editors, options);
    // Special treatment for embedded editors: if we detect that focus is
    // inside an embedded code editor, we save that model as well if we
    // find it in our text file models. Currently, only textual editors
    // support embedded editors.
    const focusedCodeEditor = codeEditorService.getFocusedCodeEditor();
    if (focusedCodeEditor instanceof EmbeddedCodeEditorWidget && !focusedCodeEditor.isSimpleWidget) {
        const resource = focusedCodeEditor.getModel()?.uri;
        // Check that the resource of the model was not saved already
        if (resource &&
            !editors.some(({ editor }) => isEqual(EditorResourceAccessor.getCanonicalUri(editor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            }), resource))) {
            const model = textFileService.files.get(resource);
            if (!model?.isReadonly()) {
                await textFileService.save(resource, options);
            }
        }
    }
}
function saveDirtyEditorsOfGroups(accessor, groups, options) {
    const dirtyEditors = [];
    for (const group of groups) {
        for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (editor.isDirty()) {
                dirtyEditors.push({ groupId: group.id, editor });
            }
        }
    }
    return doSaveEditors(accessor, dirtyEditors, options);
}
async function doSaveEditors(accessor, editors, options) {
    const editorService = accessor.get(IEditorService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    try {
        await editorService.save(editors, options);
    }
    catch (error) {
        if (!isCancellationError(error)) {
            const actions = [
                toAction({
                    id: 'workbench.action.files.saveEditors',
                    label: nls.localize('retry', 'Retry'),
                    run: () => instantiationService.invokeFunction((accessor) => doSaveEditors(accessor, editors, options)),
                }),
            ];
            const editorsToRevert = editors.filter(({ editor }) => !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) /* all except untitled to prevent unexpected data-loss */);
            if (editorsToRevert.length > 0) {
                actions.push(toAction({
                    id: 'workbench.action.files.revertEditors',
                    label: editorsToRevert.length > 1
                        ? nls.localize('revertAll', 'Revert All')
                        : nls.localize('revert', 'Revert'),
                    run: () => editorService.revert(editorsToRevert),
                }));
            }
            notificationService.notify({
                id: editors.map(({ editor }) => hash(editor.resource?.toString())).join(), // ensure unique notification ID per set of editor
                severity: Severity.Error,
                message: nls.localize({
                    key: 'genericSaveError',
                    comment: ['{0} is the resource that failed to save and {1} the error message'],
                }, "Failed to save '{0}': {1}", editors.map(({ editor }) => editor.getName()).join(', '), toErrorMessage(error, false)),
                actions: { primary: actions },
            });
        }
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */,
    id: SAVE_FILE_COMMAND_ID,
    handler: (accessor) => {
        return saveSelectedEditors(accessor, {
            reason: 1 /* SaveReason.EXPLICIT */,
            force: true /* force save even when non-dirty */,
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 49 /* KeyCode.KeyS */),
    win: {
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */),
    },
    id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
    handler: (accessor) => {
        return saveSelectedEditors(accessor, {
            reason: 1 /* SaveReason.EXPLICIT */,
            force: true /* force save even when non-dirty */,
            skipSaveParticipants: true,
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: SAVE_FILE_AS_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */,
    handler: (accessor) => {
        return saveSelectedEditors(accessor, { reason: 1 /* SaveReason.EXPLICIT */, saveAs: true });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: undefined,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 49 /* KeyCode.KeyS */ },
    win: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 49 /* KeyCode.KeyS */) },
    id: SAVE_ALL_COMMAND_ID,
    handler: (accessor) => {
        return saveDirtyEditorsOfGroups(accessor, accessor.get(IEditorGroupsService).getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */), { reason: 1 /* SaveReason.EXPLICIT */ });
    },
});
CommandsRegistry.registerCommand({
    id: SAVE_ALL_IN_GROUP_COMMAND_ID,
    handler: (accessor, _, editorContext) => {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const resolvedContext = resolveCommandsContext([editorContext], accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
        let groups = undefined;
        if (!resolvedContext.groupedEditors.length) {
            groups = editorGroupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        }
        else {
            groups = resolvedContext.groupedEditors.map(({ group }) => group);
        }
        return saveDirtyEditorsOfGroups(accessor, groups, { reason: 1 /* SaveReason.EXPLICIT */ });
    },
});
CommandsRegistry.registerCommand({
    id: SAVE_FILES_COMMAND_ID,
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        const res = await editorService.saveAll({ includeUntitled: false, reason: 1 /* SaveReason.EXPLICIT */ });
        return res.success;
    },
});
CommandsRegistry.registerCommand({
    id: REVERT_FILE_COMMAND_ID,
    handler: async (accessor) => {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        // Retrieve selected or active editor
        let editors = getOpenEditorsViewMultiSelection(accessor);
        if (!editors) {
            const activeGroup = editorGroupService.activeGroup;
            if (activeGroup.activeEditor) {
                editors = [{ groupId: activeGroup.id, editor: activeGroup.activeEditor }];
            }
        }
        if (!editors || editors.length === 0) {
            return; // nothing to revert
        }
        try {
            await editorService.revert(editors.filter(({ editor }) => !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) /* all except untitled */), { force: true });
        }
        catch (error) {
            const notificationService = accessor.get(INotificationService);
            notificationService.error(nls.localize('genericRevertError', "Failed to revert '{0}': {1}", editors.map(({ editor }) => editor.getName()).join(', '), toErrorMessage(error, false)));
        }
    },
});
CommandsRegistry.registerCommand({
    id: REMOVE_ROOT_FOLDER_COMMAND_ID,
    handler: (accessor, resource) => {
        const contextService = accessor.get(IWorkspaceContextService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const workspace = contextService.getWorkspace();
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService)).filter((resource) => workspace.folders.some((folder) => uriIdentityService.extUri.isEqual(folder.uri, resource)));
        if (resources.length === 0) {
            const commandService = accessor.get(ICommandService);
            // Show a picker for the user to choose which folder to remove
            return commandService.executeCommand(RemoveRootFolderAction.ID);
        }
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        return workspaceEditingService.removeFolders(resources);
    },
});
// Compressed item navigation
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negate()),
    primary: 15 /* KeyCode.LeftArrow */,
    id: PREVIOUS_COMPRESSED_FOLDER,
    handler: (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.previousCompressedStat();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLastFocusContext.negate()),
    primary: 17 /* KeyCode.RightArrow */,
    id: NEXT_COMPRESSED_FOLDER,
    handler: (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.nextCompressedStat();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negate()),
    primary: 14 /* KeyCode.Home */,
    id: FIRST_COMPRESSED_FOLDER,
    handler: (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.firstCompressedStat();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLastFocusContext.negate()),
    primary: 13 /* KeyCode.End */,
    id: LAST_COMPRESSED_FOLDER,
    handler: (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.lastCompressedStat();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: null,
    primary: isWeb
        ? isWindows
            ? KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 44 /* KeyCode.KeyN */)
            : 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 44 /* KeyCode.KeyN */
        : 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
    secondary: isWeb ? [2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */] : undefined,
    id: NEW_UNTITLED_FILE_COMMAND_ID,
    metadata: {
        description: NEW_UNTITLED_FILE_LABEL,
        args: [
            {
                isOptional: true,
                name: 'New Untitled Text File arguments',
                description: 'The editor view type or language ID if known',
                schema: {
                    type: 'object',
                    properties: {
                        viewType: {
                            type: 'string',
                        },
                        languageId: {
                            type: 'string',
                        },
                    },
                },
            },
        ],
    },
    handler: async (accessor, args) => {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource: undefined,
            options: {
                override: args?.viewType,
                pinned: true,
            },
            languageId: args?.languageId,
        });
    },
});
CommandsRegistry.registerCommand({
    id: NEW_FILE_COMMAND_ID,
    handler: async (accessor, args) => {
        const editorService = accessor.get(IEditorService);
        const dialogService = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const createFileLocalized = nls.localize('newFileCommand.saveLabel', 'Create File');
        const defaultFileUri = joinPath(await dialogService.defaultFilePath(), args?.fileName ?? 'Untitled.txt');
        const saveUri = await dialogService.showSaveDialog({
            saveLabel: createFileLocalized,
            title: createFileLocalized,
            defaultUri: defaultFileUri,
        });
        if (!saveUri) {
            return;
        }
        await fileService.createFile(saveUri, undefined, { overwrite: true });
        await editorService.openEditor({
            resource: saveUri,
            options: {
                override: args?.viewType,
                pinned: true,
            },
            languageId: args?.languageId,
        });
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFDTixzQkFBc0IsRUFFdEIsZ0JBQWdCLEdBS2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUdOLGlCQUFpQixHQUVqQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix1QkFBdUIsR0FDdkIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHVCQUF1QixFQUN2QixVQUFVLEVBQ1YsOEJBQThCLEVBQzlCLG1DQUFtQyxFQUNuQyxrQ0FBa0MsRUFDbEMsMkJBQTJCLEVBQzNCLHFCQUFxQixFQUNyQixPQUFPLEdBQ1AsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixlQUFlLEdBQ2YsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIseUJBQXlCLEVBQ3pCLGdDQUFnQyxFQUNoQyxnQkFBZ0IsR0FDaEIsTUFBTSxZQUFZLENBQUE7QUFDbkIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUNOLGNBQWMsRUFDZCxVQUFVLEdBRVYsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sb0JBQW9CLEdBR3BCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXBHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsaUNBQWlDLEVBQ2pDLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFDM0Isb0JBQW9CLEVBQ3BCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBQzdCLG9CQUFvQixFQUNwQix1Q0FBdUMsRUFDdkMsdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUNuQiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0Qiw2QkFBNkIsRUFDN0IsMEJBQTBCLEVBQzFCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLDRCQUE0QixFQUM1Qix1QkFBdUIsRUFDdkIsbUJBQW1CLEdBQ25CLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUvRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxDQUNoQyxRQUEwQixFQUMxQixNQUF5QixFQUN6QixPQUE0QixFQUMzQixFQUFFO0lBQ0gsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUU1RCxnRUFBZ0U7UUFDaEUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNoQyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEYsT0FBTztvQkFDTixZQUFZLEVBQUUsUUFBUSxDQUNyQixrQkFBa0IsQ0FBQyxzQkFBc0IsRUFDekMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQzFCLHVCQUF1QixDQUN2QjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUFBO1FBRUYsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDeEMsQ0FBQztBQUNGLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUFpQyxFQUFFLEVBQUU7SUFDakcsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM5QyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ2hDLENBQUMsQ0FBQTtBQUVELHVCQUF1QjtBQUV2QixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsc0JBQXNCO0lBQzVCLE9BQU8sRUFBRSxpREFBOEI7SUFDdkMsR0FBRyxFQUFFO1FBQ0osT0FBTyxFQUFFLGdEQUE4QjtLQUN2QztJQUNELEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBc0IsRUFBRSxFQUFFO1FBQ25ELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEQsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQzFDLFFBQVEsRUFDUixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUMxQixhQUFhLEVBQ2IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxlQUFlLENBQ2YsQ0FBQTtRQUVELGlCQUFpQjtRQUNqQixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzlGLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRTFGLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDOUIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2xELElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsZ0ZBQWdGO29CQUNoRixPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUVELE9BQU8sTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hDLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNqRCxNQUFNLE9BQU8sR0FBRyxLQUFLO2lCQUNuQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ1osUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRO2dCQUNwQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2FBQ3pCLENBQUMsQ0FBQztpQkFDRixNQUFNLENBQ04sR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDL0MsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTthQUN6QixDQUFDLENBQUMsQ0FDSCxDQUFBO1lBRUYsTUFBTSxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN4RixPQUFPLHVCQUFlO0lBQ3RCLEdBQUcsRUFBRTtRQUNKLE9BQU8sRUFBRSxzREFBa0M7S0FDM0M7SUFDRCxFQUFFLEVBQUUsMkJBQTJCO0lBQy9CLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQXVCLEVBQUUsRUFBRTtRQUNwRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRWxELElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RCLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckIsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRO2dCQUNwQixPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7YUFDL0MsQ0FBQyxDQUFDLENBQ0gsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsTUFBTSx5QkFBeUIsR0FBRyxtQkFBbUIsQ0FBQTtBQUNyRCxJQUFJLG1CQUFtQixHQUFrQixFQUFFLENBQUE7QUFDM0MsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLDZCQUE2QjtJQUNqQyxJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLHdCQUFlO0lBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQXNCLEVBQUUsRUFBRTtRQUNuRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUN4RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUU5Qyx1Q0FBdUM7UUFDdkMsSUFBSSxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFDbEMsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEMsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO1lBRTdCLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQzdFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsQyxtQkFBbUIsQ0FBQyxJQUFJLENBQ3ZCLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxDQUN0RixDQUFBO1FBQ0YsQ0FBQztRQUVELGlGQUFpRjtRQUNqRixNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDMUIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRXBGLElBQUksQ0FBQztnQkFDSixNQUFNLHVCQUF1QixDQUFDLElBQUksQ0FDakMsR0FBRyxFQUNILHlCQUF5QixFQUN6QixXQUFXLEVBQ1gsYUFBYSxFQUNiLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUNoQixDQUFBO2dCQUNELDZEQUE2RDtnQkFDN0QsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO29CQUM1QixtQkFBbUIsQ0FBQyxJQUFJLENBQ3ZCLGFBQWEsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUU7d0JBQzVDLElBQ0MsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDMUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNWLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFOzRCQUNoRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTOzRCQUM3QyxjQUFjLEVBQUUseUJBQXlCO3lCQUN6QyxDQUFDLENBQ0gsRUFDQSxDQUFDOzRCQUNGLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO3dCQUNuRCxDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFBQyxNQUFNLENBQUM7Z0JBQ1IsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsSUFBSSx1QkFBd0MsQ0FBQTtBQUM1QyxJQUFJLGlDQUF1RCxDQUFBO0FBQzNELGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsNkJBQTZCO0lBQ2pDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFzQixFQUFFLEVBQUU7UUFDN0MsdUJBQXVCLEdBQUcscUJBQXFCLENBQzlDLFFBQVEsRUFDUixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1FBQ0QsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDeEMsaUNBQWlDLEdBQUcsaUNBQWlDLENBQUMsTUFBTSxDQUMzRSxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQ2hDLENBQUE7UUFDRixDQUFDO1FBQ0QsaUNBQWlDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLDJCQUEyQjtJQUMvQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFzQixFQUFFLEVBQUU7UUFDbkQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FDMUMsUUFBUSxFQUNSLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQzFCLGFBQWEsRUFDYixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FDOUIsQ0FBQTtRQUVELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQy9CLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BDLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsMkJBQTJCO0lBQy9CLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFzQixFQUFFLEVBQUU7UUFDN0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNoRyxJQUFJLHVCQUF1QixJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQzlDLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQ3hCLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSx1QkFBdUIsRUFBRTtnQkFDL0MsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRTtnQkFDckMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTthQUN6QixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLEtBQUssVUFBVSxvQkFBb0IsQ0FDbEMsU0FBZ0IsRUFDaEIsUUFBaUIsRUFDakIsZ0JBQW1DLEVBQ25DLFlBQTJCLEVBQzNCLG9CQUEyQztJQUUzQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRS9DLElBQUksU0FBUyxHQUEyQixTQUFTLENBQUE7UUFDakQsTUFBTSxzQ0FBc0MsR0FBRyxRQUFRO1lBQ3RELENBQUMsQ0FBQyxvQ0FBb0M7WUFDdEMsQ0FBQyxDQUFDLDRCQUE0QixDQUFBO1FBQy9CLE1BQU0sK0JBQStCLEdBQTJCLG9CQUFvQixDQUFDLFFBQVEsQ0FDNUYsc0NBQXNDLENBQ3RDLENBQUE7UUFDRCxJQUFJLCtCQUErQixLQUFLLEdBQUcsSUFBSSwrQkFBK0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6RixTQUFTLEdBQUcsK0JBQStCLENBQUE7UUFDNUMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLFNBQVM7YUFDcEIsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDakIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUMzRTthQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQixNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sc0JBQXNCLEdBQW9CLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBc0IsRUFBRSxFQUFFO0lBQzFGLE1BQU0sU0FBUyxHQUFHLHlCQUF5QixDQUMxQyxRQUFRLEVBQ1IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFDMUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQzlCLENBQUE7SUFDRCxNQUFNLG9CQUFvQixDQUN6QixTQUFTLEVBQ1QsS0FBSyxFQUNMLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFDL0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFDM0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNuQyxDQUFBO0FBQ0YsQ0FBQyxDQUFBO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUU7SUFDekMsT0FBTyxFQUFFLGdEQUEyQix3QkFBZTtJQUNuRCxHQUFHLEVBQUU7UUFDSixPQUFPLEVBQUUsOENBQXlCLHdCQUFlO0tBQ2pEO0lBQ0QsRUFBRSxFQUFFLG9CQUFvQjtJQUN4QixPQUFPLEVBQUUsc0JBQXNCO0NBQy9CLENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO0lBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsZ0RBQTJCLHdCQUFlLENBQUM7SUFDNUYsR0FBRyxFQUFFO1FBQ0osT0FBTyxFQUFFLDhDQUF5Qix3QkFBZTtLQUNqRDtJQUNELEVBQUUsRUFBRSxvQkFBb0I7SUFDeEIsT0FBTyxFQUFFLHNCQUFzQjtDQUMvQixDQUFDLENBQUE7QUFFRixNQUFNLDhCQUE4QixHQUFvQixLQUFLLEVBQzVELFFBQVEsRUFDUixRQUFzQixFQUNyQixFQUFFO0lBQ0gsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQzFDLFFBQVEsRUFDUixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUMxQixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FDOUIsQ0FBQTtJQUNELE1BQU0sb0JBQW9CLENBQ3pCLFNBQVMsRUFDVCxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUMvQixRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUMzQixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQ25DLENBQUE7QUFDRixDQUFDLENBQUE7QUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtJQUN6QyxPQUFPLEVBQUUsbURBQTZCLHVCQUFhLHdCQUFlO0lBQ2xFLEdBQUcsRUFBRTtRQUNKLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsbURBQTZCLHdCQUFlLENBQUM7S0FDOUY7SUFDRCxFQUFFLEVBQUUsNkJBQTZCO0lBQ2pDLE9BQU8sRUFBRSw4QkFBOEI7Q0FDdkMsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEtBQUs7SUFDN0IsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsaURBQTZCLEVBQzdCLG1EQUE2Qix1QkFBYSx3QkFBZSxDQUN6RDtJQUNELEdBQUcsRUFBRTtRQUNKLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsbURBQTZCLHdCQUFlLENBQUM7S0FDOUY7SUFDRCxFQUFFLEVBQUUsNkJBQTZCO0lBQ2pDLE9BQU8sRUFBRSw4QkFBOEI7Q0FDdkMsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLFNBQVM7SUFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2Qix3QkFBZTtJQUM5RCxFQUFFLEVBQUUsNkNBQTZDO0lBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDM0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFBO1FBQzlDLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUU7WUFDbkUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztTQUMzQyxDQUFDLENBQUE7UUFDRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUM1QyxNQUFNLG9CQUFvQixDQUN6QixTQUFTLEVBQ1QsS0FBSyxFQUNMLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFDL0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFDM0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNuQyxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsNkJBQTZCO0lBQ2pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQXNCLEVBQUUsRUFBRTtRQUNuRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUM3RCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFdkUsSUFBSSxHQUFHLElBQUksY0FBYyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEQsTUFBTSxZQUFZLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFlLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM3RSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFBO2dCQUM3QyxxR0FBcUc7Z0JBQ3JHLGdCQUFnQjtnQkFDaEIsWUFBWSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBQy9CLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzlCLE1BQU0sZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQzFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsZ0VBQWdFO1lBQ2hFLHdEQUF3RDtZQUN4RCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNyRSxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSw2QkFBNkI7SUFDakMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBc0IsRUFBRSxFQUFFO1FBQ25ELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxPQUFPLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQy9CLFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLElBQUksRUFBRTthQUMzRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLHFDQUFxQztBQUVyQyxLQUFLLFVBQVUsbUJBQW1CLENBQ2pDLFFBQTBCLEVBQzFCLE9BQTZCO0lBRTdCLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzdELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzFELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUV0RCxxQ0FBcUM7SUFDckMsSUFBSSxPQUFPLEdBQUcsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFBO1FBQ2xELElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzlCLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFFWixtRUFBbUU7WUFDbkUsK0RBQStEO1lBQy9ELG1FQUFtRTtZQUNuRSxrRUFBa0U7WUFDbEUsbUVBQW1FO1lBQ25FLDBDQUEwQztZQUMxQyxFQUFFO1lBQ0YsMkRBQTJEO1lBQzNELDZEQUE2RDtZQUM3RCw2REFBNkQ7WUFDN0QsSUFDQyxXQUFXLENBQUMsWUFBWSxZQUFZLHFCQUFxQjtnQkFDekQsQ0FBQyxPQUFPLEVBQUUsTUFBTTtnQkFDaEIsQ0FBQyxDQUNBLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsMENBQWtDO29CQUNoRixXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxhQUFhLDBDQUFrQyxDQUNsRjtnQkFDRCxXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFDOUMsQ0FBQztnQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDbkYsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7WUFDdEYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7WUFDNUUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE9BQU0sQ0FBQyxrQkFBa0I7SUFDMUIsQ0FBQztJQUVELGVBQWU7SUFDZixNQUFNLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRS9DLHFFQUFxRTtJQUNyRSxtRUFBbUU7SUFDbkUsbUVBQW1FO0lBQ25FLDRCQUE0QjtJQUM1QixNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUE7SUFDbEUsSUFBSSxpQkFBaUIsWUFBWSx3QkFBd0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ2hHLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQTtRQUVsRCw2REFBNkQ7UUFDN0QsSUFDQyxRQUFRO1lBQ1IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQzVCLE9BQU8sQ0FDTixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO2dCQUM5QyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO2FBQzNDLENBQUMsRUFDRixRQUFRLENBQ1IsQ0FDRCxFQUNBLENBQUM7WUFDRixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDOUMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQ2hDLFFBQTBCLEVBQzFCLE1BQStCLEVBQy9CLE9BQTZCO0lBRTdCLE1BQU0sWUFBWSxHQUF3QixFQUFFLENBQUE7SUFDNUMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxFQUFFLENBQUM7WUFDMUUsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxhQUFhLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUN0RCxDQUFDO0FBRUQsS0FBSyxVQUFVLGFBQWEsQ0FDM0IsUUFBMEIsRUFDMUIsT0FBNEIsRUFDNUIsT0FBNkI7SUFFN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNsRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUVoRSxJQUFJLENBQUM7UUFDSixNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sT0FBTyxHQUFjO2dCQUMxQixRQUFRLENBQUM7b0JBQ1IsRUFBRSxFQUFFLG9DQUFvQztvQkFDeEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztvQkFDckMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hELGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUN6QztpQkFDRixDQUFDO2FBQ0YsQ0FBQTtZQUNELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQ3JDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQ2QsQ0FBQyxNQUFNLENBQUMsYUFBYSwwQ0FFcEIsQ0FBQyx5REFBeUQsQ0FDNUQsQ0FBQTtZQUNELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQUM7b0JBQ1IsRUFBRSxFQUFFLHNDQUFzQztvQkFDMUMsS0FBSyxFQUNKLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQzt3QkFDekIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQzt3QkFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztvQkFDcEMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO2lCQUNoRCxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7WUFFRCxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7Z0JBQzFCLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLGtEQUFrRDtnQkFDN0gsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUN4QixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDcEI7b0JBQ0MsR0FBRyxFQUFFLGtCQUFrQjtvQkFDdkIsT0FBTyxFQUFFLENBQUMsbUVBQW1FLENBQUM7aUJBQzlFLEVBQ0QsMkJBQTJCLEVBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3hELGNBQWMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQzVCO2dCQUNELE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7YUFDN0IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLDZDQUFtQztJQUN6QyxPQUFPLEVBQUUsaURBQTZCO0lBQ3RDLEVBQUUsRUFBRSxvQkFBb0I7SUFDeEIsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUU7WUFDcEMsTUFBTSw2QkFBcUI7WUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxvQ0FBb0M7U0FDaEQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELElBQUksRUFBRSxTQUFTO0lBQ2YsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsd0JBQWU7SUFDOUQsR0FBRyxFQUFFO1FBQ0osT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSxtREFBNkIsd0JBQWUsQ0FBQztLQUM5RjtJQUNELEVBQUUsRUFBRSx1Q0FBdUM7SUFDM0MsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUU7WUFDcEMsTUFBTSw2QkFBcUI7WUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxvQ0FBb0M7WUFDaEQsb0JBQW9CLEVBQUUsSUFBSTtTQUMxQixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLHVCQUF1QjtJQUMzQixNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsU0FBUztJQUNmLE9BQU8sRUFBRSxtREFBNkIsd0JBQWU7SUFDckQsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLDZCQUFxQixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBMkIsd0JBQWUsRUFBRTtJQUM1RCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLGlEQUE2Qix3QkFBZSxFQUFFO0lBQ3ZFLEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsT0FBTyx3QkFBd0IsQ0FDOUIsUUFBUSxFQUNSLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxTQUFTLDBDQUFrQyxFQUM5RSxFQUFFLE1BQU0sNkJBQXFCLEVBQUUsQ0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLDRCQUE0QjtJQUNoQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBZSxFQUFFLGFBQXFDLEVBQUUsRUFBRTtRQUM3RSxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUU5RCxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FDN0MsQ0FBQyxhQUFhLENBQUMsRUFDZixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixtQkFBbUIsRUFDbkIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FDMUIsQ0FBQTtRQUVELElBQUksTUFBTSxHQUF3QyxTQUFTLENBQUE7UUFDM0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUMsTUFBTSxHQUFHLG1CQUFtQixDQUFDLFNBQVMsMENBQWtDLENBQUE7UUFDekUsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRSxDQUFDO1FBRUQsT0FBTyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsTUFBTSw2QkFBcUIsRUFBRSxDQUFDLENBQUE7SUFDbkYsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDM0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxNQUFNLEdBQUcsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQXFCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hHLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQTtJQUNuQixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxzQkFBc0I7SUFDMUIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMzQixNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM3RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRWxELHFDQUFxQztRQUNyQyxJQUFJLE9BQU8sR0FBRyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUE7WUFDbEQsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzlCLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1lBQzFFLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU0sQ0FBQyxvQkFBb0I7UUFDNUIsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FDekIsT0FBTyxDQUFDLE1BQU0sQ0FDYixDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUNkLENBQUMsTUFBTSxDQUFDLGFBQWEsMENBQWtDLENBQUMseUJBQXlCLENBQ2xGLEVBQ0QsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQ2YsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELG1CQUFtQixDQUFDLEtBQUssQ0FDeEIsR0FBRyxDQUFDLFFBQVEsQ0FDWCxvQkFBb0IsRUFDcEIsNkJBQTZCLEVBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3hELGNBQWMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQzVCLENBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSw2QkFBNkI7SUFDakMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQXNCLEVBQUUsRUFBRTtRQUM3QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDN0QsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDNUQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQy9DLE1BQU0sU0FBUyxHQUFHLHlCQUF5QixDQUMxQyxRQUFRLEVBQ1IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFDMUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQzlCLENBQUMsTUFBTSxDQUNQLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDWixTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQzVGLENBQUE7UUFFRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNwRCw4REFBOEQ7WUFDOUQsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFFRCxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxPQUFPLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsNkJBQTZCO0FBRTdCLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixtQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FDNUM7SUFDRCxPQUFPLDRCQUFtQjtJQUMxQixFQUFFLEVBQUUsMEJBQTBCO0lBQzlCLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLHNCQUFzQix1Q0FBK0IsQ0FBQTtRQUUxRixJQUFJLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsRUFBK0IsQ0FBQTtRQUM1RSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDOUIsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixrQ0FBa0MsQ0FBQyxNQUFNLEVBQUUsQ0FDM0M7SUFDRCxPQUFPLDZCQUFvQjtJQUMzQixFQUFFLEVBQUUsc0JBQXNCO0lBQzFCLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLHNCQUFzQix1Q0FBK0IsQ0FBQTtRQUUxRixJQUFJLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsRUFBK0IsQ0FBQTtRQUM1RSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDMUIsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixtQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FDNUM7SUFDRCxPQUFPLHVCQUFjO0lBQ3JCLEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDcEUsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsc0JBQXNCLHVDQUErQixDQUFBO1FBRTFGLElBQUksT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixFQUErQixDQUFBO1FBQzVFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsTUFBTSxFQUFFLDhDQUFvQyxFQUFFO0lBQzlDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QiwyQkFBMkIsRUFDM0IsOEJBQThCLEVBQzlCLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUMzQztJQUNELE9BQU8sc0JBQWE7SUFDcEIsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxzQkFBc0IsdUNBQStCLENBQUE7UUFFMUYsSUFBSSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDckMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsb0JBQW9CLEVBQStCLENBQUE7UUFDNUUsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO0lBQzFCLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsSUFBSTtJQUNWLE9BQU8sRUFBRSxLQUFLO1FBQ2IsQ0FBQyxDQUFDLFNBQVM7WUFDVixDQUFDLENBQUMsUUFBUSxDQUFDLGlEQUE2Qix3QkFBZTtZQUN2RCxDQUFDLENBQUMsZ0RBQTJCLHdCQUFlO1FBQzdDLENBQUMsQ0FBQyxpREFBNkI7SUFDaEMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxpREFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO0lBQzlELEVBQUUsRUFBRSw0QkFBNEI7SUFDaEMsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLHVCQUF1QjtRQUNwQyxJQUFJLEVBQUU7WUFDTDtnQkFDQyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsV0FBVyxFQUFFLDhDQUE4QztnQkFDM0QsTUFBTSxFQUFFO29CQUNQLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDWCxRQUFRLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFFBQVE7eUJBQ2Q7d0JBQ0QsVUFBVSxFQUFFOzRCQUNYLElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBaUQsRUFBRSxFQUFFO1FBQzlFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFbEQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQzlCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLE9BQU8sRUFBRTtnQkFDUixRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVE7Z0JBQ3hCLE1BQU0sRUFBRSxJQUFJO2FBQ1o7WUFDRCxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVU7U0FDNUIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsbUJBQW1CO0lBQ3ZCLE9BQU8sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLElBQW9FLEVBQ25FLEVBQUU7UUFDSCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRTlDLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNuRixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQzlCLE1BQU0sYUFBYSxDQUFDLGVBQWUsRUFBRSxFQUNyQyxJQUFJLEVBQUUsUUFBUSxJQUFJLGNBQWMsQ0FDaEMsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sYUFBYSxDQUFDLGNBQWMsQ0FBQztZQUNsRCxTQUFTLEVBQUUsbUJBQW1CO1lBQzlCLEtBQUssRUFBRSxtQkFBbUI7WUFDMUIsVUFBVSxFQUFFLGNBQWM7U0FDMUIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUM5QixRQUFRLEVBQUUsT0FBTztZQUNqQixPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRO2dCQUN4QixNQUFNLEVBQUUsSUFBSTthQUNaO1lBQ0QsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVO1NBQzVCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFDLENBQUEifQ==