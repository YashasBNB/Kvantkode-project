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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLGdCQUFnQixHQUtoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZGLE9BQU8sRUFHTixpQkFBaUIsR0FFakIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJBQXVCLEdBQ3ZCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsVUFBVSxFQUNWLDhCQUE4QixFQUM5QixtQ0FBbUMsRUFDbkMsa0NBQWtDLEVBQ2xDLDJCQUEyQixFQUMzQixxQkFBcUIsRUFDckIsT0FBTyxHQUNQLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsZUFBZSxHQUNmLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFB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