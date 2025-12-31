/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { assertIsDefined } from '../../base/common/types.js';
import { URI } from '../../base/common/uri.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { FileType } from '../../platform/files/common/files.js';
import { Schemas } from '../../base/common/network.js';
import { createErrorWithActions, isErrorWithActions, } from '../../base/common/errorMessage.js';
import { toAction } from '../../base/common/actions.js';
import Severity from '../../base/common/severity.js';
// Static values for editor contributions
export const EditorExtensions = {
    EditorPane: 'workbench.contributions.editors',
    EditorFactory: 'workbench.contributions.editor.inputFactories',
};
// Static information regarding the text editor
export const DEFAULT_EDITOR_ASSOCIATION = {
    id: 'default',
    displayName: localize('promptOpenWith.defaultEditor.displayName', 'Text Editor'),
    providerDisplayName: localize('builtinProviderDisplayName', 'Built-in'),
};
/**
 * Side by side editor id.
 */
export const SIDE_BY_SIDE_EDITOR_ID = 'workbench.editor.sidebysideEditor';
/**
 * Text diff editor id.
 */
export const TEXT_DIFF_EDITOR_ID = 'workbench.editors.textDiffEditor';
/**
 * Binary diff editor id.
 */
export const BINARY_DIFF_EDITOR_ID = 'workbench.editors.binaryResourceDiffEditor';
export var EditorPaneSelectionChangeReason;
(function (EditorPaneSelectionChangeReason) {
    /**
     * The selection was changed as a result of a programmatic
     * method invocation.
     *
     * For a text editor pane, this for example can be a selection
     * being restored from previous view state automatically.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["PROGRAMMATIC"] = 1] = "PROGRAMMATIC";
    /**
     * The selection was changed by the user.
     *
     * This typically means the user changed the selection
     * with mouse or keyboard.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["USER"] = 2] = "USER";
    /**
     * The selection was changed as a result of editing in
     * the editor pane.
     *
     * For a text editor pane, this for example can be typing
     * in the text of the editor pane.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["EDIT"] = 3] = "EDIT";
    /**
     * The selection was changed as a result of a navigation
     * action.
     *
     * For a text editor pane, this for example can be a result
     * of selecting an entry from a text outline view.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["NAVIGATION"] = 4] = "NAVIGATION";
    /**
     * The selection was changed as a result of a jump action
     * from within the editor pane.
     *
     * For a text editor pane, this for example can be a result
     * of invoking "Go to definition" from a symbol.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["JUMP"] = 5] = "JUMP";
})(EditorPaneSelectionChangeReason || (EditorPaneSelectionChangeReason = {}));
export var EditorPaneSelectionCompareResult;
(function (EditorPaneSelectionCompareResult) {
    /**
     * The selections are identical.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["IDENTICAL"] = 1] = "IDENTICAL";
    /**
     * The selections are similar.
     *
     * For a text editor this can mean that the one
     * selection is in close proximity to the other
     * selection.
     *
     * Upstream clients may decide in this case to
     * not treat the selection different from the
     * previous one because it is not distinct enough.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["SIMILAR"] = 2] = "SIMILAR";
    /**
     * The selections are entirely different.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["DIFFERENT"] = 3] = "DIFFERENT";
})(EditorPaneSelectionCompareResult || (EditorPaneSelectionCompareResult = {}));
export function isEditorPaneWithSelection(editorPane) {
    const candidate = editorPane;
    return (!!candidate && typeof candidate.getSelection === 'function' && !!candidate.onDidChangeSelection);
}
export function isEditorPaneWithScrolling(editorPane) {
    const candidate = editorPane;
    return (!!candidate &&
        typeof candidate.getScrollPosition === 'function' &&
        typeof candidate.setScrollPosition === 'function' &&
        !!candidate.onDidChangeScroll);
}
/**
 * Try to retrieve the view state for the editor pane that
 * has the provided editor input opened, if at all.
 *
 * This method will return `undefined` if the editor input
 * is not visible in any of the opened editor panes.
 */
export function findViewStateForEditor(input, group, editorService) {
    for (const editorPane of editorService.visibleEditorPanes) {
        if (editorPane.group.id === group && input.matches(editorPane.input)) {
            return editorPane.getViewState();
        }
    }
    return undefined;
}
export function isResourceEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return URI.isUri(candidate?.resource);
}
export function isResourceDiffEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return candidate?.original !== undefined && candidate.modified !== undefined;
}
export function isResourceMultiDiffEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    if (!candidate) {
        return false;
    }
    if (candidate.resources && !Array.isArray(candidate.resources)) {
        return false;
    }
    return !!candidate.resources || !!candidate.multiDiffSource;
}
export function isResourceSideBySideEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    if (isResourceDiffEditorInput(editor)) {
        return false; // make sure to not accidentally match on diff editors
    }
    const candidate = editor;
    return candidate?.primary !== undefined && candidate.secondary !== undefined;
}
export function isUntitledResourceEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    if (!candidate) {
        return false;
    }
    return (candidate.resource === undefined ||
        candidate.resource.scheme === Schemas.untitled ||
        candidate.forceUntitled === true);
}
export function isResourceMergeEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return (URI.isUri(candidate?.base?.resource) &&
        URI.isUri(candidate?.input1?.resource) &&
        URI.isUri(candidate?.input2?.resource) &&
        URI.isUri(candidate?.result?.resource));
}
export var Verbosity;
(function (Verbosity) {
    Verbosity[Verbosity["SHORT"] = 0] = "SHORT";
    Verbosity[Verbosity["MEDIUM"] = 1] = "MEDIUM";
    Verbosity[Verbosity["LONG"] = 2] = "LONG";
})(Verbosity || (Verbosity = {}));
export var SaveReason;
(function (SaveReason) {
    /**
     * Explicit user gesture.
     */
    SaveReason[SaveReason["EXPLICIT"] = 1] = "EXPLICIT";
    /**
     * Auto save after a timeout.
     */
    SaveReason[SaveReason["AUTO"] = 2] = "AUTO";
    /**
     * Auto save after editor focus change.
     */
    SaveReason[SaveReason["FOCUS_CHANGE"] = 3] = "FOCUS_CHANGE";
    /**
     * Auto save after window change.
     */
    SaveReason[SaveReason["WINDOW_CHANGE"] = 4] = "WINDOW_CHANGE";
})(SaveReason || (SaveReason = {}));
class SaveSourceFactory {
    constructor() {
        this.mapIdToSaveSource = new Map();
    }
    /**
     * Registers a `SaveSource` with an identifier and label
     * to the registry so that it can be used in save operations.
     */
    registerSource(id, label) {
        let sourceDescriptor = this.mapIdToSaveSource.get(id);
        if (!sourceDescriptor) {
            sourceDescriptor = { source: id, label };
            this.mapIdToSaveSource.set(id, sourceDescriptor);
        }
        return sourceDescriptor.source;
    }
    getSourceLabel(source) {
        return this.mapIdToSaveSource.get(source)?.label ?? source;
    }
}
export const SaveSourceRegistry = new SaveSourceFactory();
export var EditorInputCapabilities;
(function (EditorInputCapabilities) {
    /**
     * Signals no specific capability for the input.
     */
    EditorInputCapabilities[EditorInputCapabilities["None"] = 0] = "None";
    /**
     * Signals that the input is readonly.
     */
    EditorInputCapabilities[EditorInputCapabilities["Readonly"] = 2] = "Readonly";
    /**
     * Signals that the input is untitled.
     */
    EditorInputCapabilities[EditorInputCapabilities["Untitled"] = 4] = "Untitled";
    /**
     * Signals that the input can only be shown in one group
     * and not be split into multiple groups.
     */
    EditorInputCapabilities[EditorInputCapabilities["Singleton"] = 8] = "Singleton";
    /**
     * Signals that the input requires workspace trust.
     */
    EditorInputCapabilities[EditorInputCapabilities["RequiresTrust"] = 16] = "RequiresTrust";
    /**
     * Signals that the editor can split into 2 in the same
     * editor group.
     */
    EditorInputCapabilities[EditorInputCapabilities["CanSplitInGroup"] = 32] = "CanSplitInGroup";
    /**
     * Signals that the editor wants its description to be
     * visible when presented to the user. By default, a UI
     * component may decide to hide the description portion
     * for brevity.
     */
    EditorInputCapabilities[EditorInputCapabilities["ForceDescription"] = 64] = "ForceDescription";
    /**
     * Signals that the editor supports dropping into the
     * editor by holding shift.
     */
    EditorInputCapabilities[EditorInputCapabilities["CanDropIntoEditor"] = 128] = "CanDropIntoEditor";
    /**
     * Signals that the editor is composed of multiple editors
     * within.
     */
    EditorInputCapabilities[EditorInputCapabilities["MultipleEditors"] = 256] = "MultipleEditors";
    /**
     * Signals that the editor cannot be in a dirty state
     * and may still have unsaved changes
     */
    EditorInputCapabilities[EditorInputCapabilities["Scratchpad"] = 512] = "Scratchpad";
})(EditorInputCapabilities || (EditorInputCapabilities = {}));
export class AbstractEditorInput extends Disposable {
}
export function isEditorInput(editor) {
    return editor instanceof AbstractEditorInput;
}
function isEditorInputWithPreferredResource(editor) {
    const candidate = editor;
    return URI.isUri(candidate?.preferredResource);
}
export function isSideBySideEditorInput(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.primary) && isEditorInput(candidate?.secondary);
}
export function isDiffEditorInput(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.modified) && isEditorInput(candidate?.original);
}
export function createTooLargeFileError(group, input, options, message, preferencesService) {
    return createEditorOpenError(message, [
        toAction({
            id: 'workbench.action.openLargeFile',
            label: localize('openLargeFile', 'Open Anyway'),
            run: () => {
                const fileEditorOptions = {
                    ...options,
                    limits: {
                        size: Number.MAX_VALUE,
                    },
                };
                group.openEditor(input, fileEditorOptions);
            },
        }),
        toAction({
            id: 'workbench.action.configureEditorLargeFileConfirmation',
            label: localize('configureEditorLargeFileConfirmation', 'Configure Limit'),
            run: () => {
                return preferencesService.openUserSettings({
                    query: 'workbench.editorLargeFileConfirmation',
                });
            },
        }),
    ], {
        forceMessage: true,
        forceSeverity: Severity.Warning,
    });
}
export function isEditorInputWithOptions(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.editor);
}
export function isEditorInputWithOptionsAndGroup(editor) {
    const candidate = editor;
    return isEditorInputWithOptions(editor) && candidate?.group !== undefined;
}
export function isEditorIdentifier(identifier) {
    const candidate = identifier;
    return typeof candidate?.groupId === 'number' && isEditorInput(candidate.editor);
}
export function isEditorCommandsContext(context) {
    const candidate = context;
    return typeof candidate?.groupId === 'number';
}
/**
 * More information around why an editor was closed in the model.
 */
export var EditorCloseContext;
(function (EditorCloseContext) {
    /**
     * No specific context for closing (e.g. explicit user gesture).
     */
    EditorCloseContext[EditorCloseContext["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * The editor closed because it was replaced with another editor.
     * This can either happen via explicit replace call or when an
     * editor is in preview mode and another editor opens.
     */
    EditorCloseContext[EditorCloseContext["REPLACE"] = 1] = "REPLACE";
    /**
     * The editor closed as a result of moving it to another group.
     */
    EditorCloseContext[EditorCloseContext["MOVE"] = 2] = "MOVE";
    /**
     * The editor closed because another editor turned into preview
     * and this used to be the preview editor before.
     */
    EditorCloseContext[EditorCloseContext["UNPIN"] = 3] = "UNPIN";
})(EditorCloseContext || (EditorCloseContext = {}));
export var GroupModelChangeKind;
(function (GroupModelChangeKind) {
    /* Group Changes */
    GroupModelChangeKind[GroupModelChangeKind["GROUP_ACTIVE"] = 0] = "GROUP_ACTIVE";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_INDEX"] = 1] = "GROUP_INDEX";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_LABEL"] = 2] = "GROUP_LABEL";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_LOCKED"] = 3] = "GROUP_LOCKED";
    /* Editors Change */
    GroupModelChangeKind[GroupModelChangeKind["EDITORS_SELECTION"] = 4] = "EDITORS_SELECTION";
    /* Editor Changes */
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_OPEN"] = 5] = "EDITOR_OPEN";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_CLOSE"] = 6] = "EDITOR_CLOSE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_MOVE"] = 7] = "EDITOR_MOVE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_ACTIVE"] = 8] = "EDITOR_ACTIVE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_LABEL"] = 9] = "EDITOR_LABEL";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_CAPABILITIES"] = 10] = "EDITOR_CAPABILITIES";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_PIN"] = 11] = "EDITOR_PIN";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_TRANSIENT"] = 12] = "EDITOR_TRANSIENT";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_STICKY"] = 13] = "EDITOR_STICKY";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_DIRTY"] = 14] = "EDITOR_DIRTY";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_WILL_DISPOSE"] = 15] = "EDITOR_WILL_DISPOSE";
})(GroupModelChangeKind || (GroupModelChangeKind = {}));
export var SideBySideEditor;
(function (SideBySideEditor) {
    SideBySideEditor[SideBySideEditor["PRIMARY"] = 1] = "PRIMARY";
    SideBySideEditor[SideBySideEditor["SECONDARY"] = 2] = "SECONDARY";
    SideBySideEditor[SideBySideEditor["BOTH"] = 3] = "BOTH";
    SideBySideEditor[SideBySideEditor["ANY"] = 4] = "ANY";
})(SideBySideEditor || (SideBySideEditor = {}));
class EditorResourceAccessorImpl {
    getOriginalUri(editor, options) {
        if (!editor) {
            return undefined;
        }
        // Merge editors are handled with `merged` result editor
        if (isResourceMergeEditorInput(editor)) {
            return EditorResourceAccessor.getOriginalUri(editor.result, options);
        }
        // Optionally support side-by-side editors
        if (options?.supportSideBySide) {
            const { primary, secondary } = this.getSideEditors(editor);
            if (primary && secondary) {
                if (options?.supportSideBySide === SideBySideEditor.BOTH) {
                    return {
                        primary: this.getOriginalUri(primary, { filterByScheme: options.filterByScheme }),
                        secondary: this.getOriginalUri(secondary, { filterByScheme: options.filterByScheme }),
                    };
                }
                else if (options?.supportSideBySide === SideBySideEditor.ANY) {
                    return (this.getOriginalUri(primary, { filterByScheme: options.filterByScheme }) ??
                        this.getOriginalUri(secondary, { filterByScheme: options.filterByScheme }));
                }
                editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? primary : secondary;
            }
        }
        if (isResourceDiffEditorInput(editor) ||
            isResourceMultiDiffEditorInput(editor) ||
            isResourceSideBySideEditorInput(editor) ||
            isResourceMergeEditorInput(editor)) {
            return undefined;
        }
        // Original URI is the `preferredResource` of an editor if any
        const originalResource = isEditorInputWithPreferredResource(editor)
            ? editor.preferredResource
            : editor.resource;
        if (!originalResource || !options || !options.filterByScheme) {
            return originalResource;
        }
        return this.filterUri(originalResource, options.filterByScheme);
    }
    getSideEditors(editor) {
        if (isSideBySideEditorInput(editor) || isResourceSideBySideEditorInput(editor)) {
            return { primary: editor.primary, secondary: editor.secondary };
        }
        if (isDiffEditorInput(editor) || isResourceDiffEditorInput(editor)) {
            return { primary: editor.modified, secondary: editor.original };
        }
        return { primary: undefined, secondary: undefined };
    }
    getCanonicalUri(editor, options) {
        if (!editor) {
            return undefined;
        }
        // Merge editors are handled with `merged` result editor
        if (isResourceMergeEditorInput(editor)) {
            return EditorResourceAccessor.getCanonicalUri(editor.result, options);
        }
        // Optionally support side-by-side editors
        if (options?.supportSideBySide) {
            const { primary, secondary } = this.getSideEditors(editor);
            if (primary && secondary) {
                if (options?.supportSideBySide === SideBySideEditor.BOTH) {
                    return {
                        primary: this.getCanonicalUri(primary, { filterByScheme: options.filterByScheme }),
                        secondary: this.getCanonicalUri(secondary, { filterByScheme: options.filterByScheme }),
                    };
                }
                else if (options?.supportSideBySide === SideBySideEditor.ANY) {
                    return (this.getCanonicalUri(primary, { filterByScheme: options.filterByScheme }) ??
                        this.getCanonicalUri(secondary, { filterByScheme: options.filterByScheme }));
                }
                editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? primary : secondary;
            }
        }
        if (isResourceDiffEditorInput(editor) ||
            isResourceMultiDiffEditorInput(editor) ||
            isResourceSideBySideEditorInput(editor) ||
            isResourceMergeEditorInput(editor)) {
            return undefined;
        }
        // Canonical URI is the `resource` of an editor
        const canonicalResource = editor.resource;
        if (!canonicalResource || !options || !options.filterByScheme) {
            return canonicalResource;
        }
        return this.filterUri(canonicalResource, options.filterByScheme);
    }
    filterUri(resource, filter) {
        // Multiple scheme filter
        if (Array.isArray(filter)) {
            if (filter.some((scheme) => resource.scheme === scheme)) {
                return resource;
            }
        }
        // Single scheme filter
        else {
            if (filter === resource.scheme) {
                return resource;
            }
        }
        return undefined;
    }
}
export var EditorCloseMethod;
(function (EditorCloseMethod) {
    EditorCloseMethod[EditorCloseMethod["UNKNOWN"] = 0] = "UNKNOWN";
    EditorCloseMethod[EditorCloseMethod["KEYBOARD"] = 1] = "KEYBOARD";
    EditorCloseMethod[EditorCloseMethod["MOUSE"] = 2] = "MOUSE";
})(EditorCloseMethod || (EditorCloseMethod = {}));
export function preventEditorClose(group, editor, method, configuration) {
    if (!group.isSticky(editor)) {
        return false; // only interested in sticky editors
    }
    switch (configuration.preventPinnedEditorClose) {
        case 'keyboardAndMouse':
            return method === EditorCloseMethod.MOUSE || method === EditorCloseMethod.KEYBOARD;
        case 'mouse':
            return method === EditorCloseMethod.MOUSE;
        case 'keyboard':
            return method === EditorCloseMethod.KEYBOARD;
    }
    return false;
}
export const EditorResourceAccessor = new EditorResourceAccessorImpl();
export var CloseDirection;
(function (CloseDirection) {
    CloseDirection[CloseDirection["LEFT"] = 0] = "LEFT";
    CloseDirection[CloseDirection["RIGHT"] = 1] = "RIGHT";
})(CloseDirection || (CloseDirection = {}));
class EditorFactoryRegistry {
    constructor() {
        this.editorSerializerConstructors = new Map();
        this.editorSerializerInstances = new Map();
    }
    start(accessor) {
        const instantiationService = (this.instantiationService = accessor.get(IInstantiationService));
        for (const [key, ctor] of this.editorSerializerConstructors) {
            this.createEditorSerializer(key, ctor, instantiationService);
        }
        this.editorSerializerConstructors.clear();
    }
    createEditorSerializer(editorTypeId, ctor, instantiationService) {
        const instance = instantiationService.createInstance(ctor);
        this.editorSerializerInstances.set(editorTypeId, instance);
    }
    registerFileEditorFactory(factory) {
        if (this.fileEditorFactory) {
            throw new Error('Can only register one file editor factory.');
        }
        this.fileEditorFactory = factory;
    }
    getFileEditorFactory() {
        return assertIsDefined(this.fileEditorFactory);
    }
    registerEditorSerializer(editorTypeId, ctor) {
        if (this.editorSerializerConstructors.has(editorTypeId) ||
            this.editorSerializerInstances.has(editorTypeId)) {
            throw new Error(`A editor serializer with type ID '${editorTypeId}' was already registered.`);
        }
        if (!this.instantiationService) {
            this.editorSerializerConstructors.set(editorTypeId, ctor);
        }
        else {
            this.createEditorSerializer(editorTypeId, ctor, this.instantiationService);
        }
        return toDisposable(() => {
            this.editorSerializerConstructors.delete(editorTypeId);
            this.editorSerializerInstances.delete(editorTypeId);
        });
    }
    getEditorSerializer(arg1) {
        return this.editorSerializerInstances.get(typeof arg1 === 'string' ? arg1 : arg1.typeId);
    }
}
Registry.add(EditorExtensions.EditorFactory, new EditorFactoryRegistry());
export async function pathsToEditors(paths, fileService, logService) {
    if (!paths || !paths.length) {
        return [];
    }
    return await Promise.all(paths.map(async (path) => {
        const resource = URI.revive(path.fileUri);
        if (!resource) {
            logService.info('Cannot resolve the path because it is not valid.', path);
            return undefined;
        }
        const canHandleResource = await fileService.canHandleResource(resource);
        if (!canHandleResource) {
            logService.info('Cannot resolve the path because it cannot be handled', path);
            return undefined;
        }
        let exists = path.exists;
        let type = path.type;
        if (typeof exists !== 'boolean' || typeof type !== 'number') {
            try {
                type = (await fileService.stat(resource)).isDirectory
                    ? FileType.Directory
                    : FileType.Unknown;
                exists = true;
            }
            catch (error) {
                logService.error(error);
                exists = false;
            }
        }
        if (!exists && path.openOnlyIfExists) {
            logService.info('Cannot resolve the path because it does not exist', path);
            return undefined;
        }
        if (type === FileType.Directory) {
            logService.info('Cannot resolve the path because it is a directory', path);
            return undefined;
        }
        const options = {
            ...path.options,
            pinned: true,
        };
        if (!exists) {
            return { resource, options, forceUntitled: true };
        }
        return { resource, options };
    }));
}
export var EditorsOrder;
(function (EditorsOrder) {
    /**
     * Editors sorted by most recent activity (most recent active first)
     */
    EditorsOrder[EditorsOrder["MOST_RECENTLY_ACTIVE"] = 0] = "MOST_RECENTLY_ACTIVE";
    /**
     * Editors sorted by sequential order
     */
    EditorsOrder[EditorsOrder["SEQUENTIAL"] = 1] = "SEQUENTIAL";
})(EditorsOrder || (EditorsOrder = {}));
export function isTextEditorViewState(candidate) {
    const viewState = candidate;
    if (!viewState) {
        return false;
    }
    const diffEditorViewState = viewState;
    if (diffEditorViewState.modified) {
        return isTextEditorViewState(diffEditorViewState.modified);
    }
    const codeEditorViewState = viewState;
    return !!(codeEditorViewState.contributionsState &&
        codeEditorViewState.viewState &&
        Array.isArray(codeEditorViewState.cursorState));
}
export function isEditorOpenError(obj) {
    return isErrorWithActions(obj);
}
export function createEditorOpenError(messageOrError, actions, options) {
    const error = createErrorWithActions(messageOrError, actions);
    error.forceMessage = options?.forceMessage;
    error.forceSeverity = options?.forceSeverity;
    error.allowDialog = options?.allowDialog;
    return error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUV2QyxPQUFPLEVBQTJCLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBaUJ0RixPQUFPLEVBQ04scUJBQXFCLEdBSXJCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBSXJFLE9BQU8sRUFBRSxRQUFRLEVBQWlDLE1BQU0sc0NBQXNDLENBQUE7QUFHOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR3RELE9BQU8sRUFFTixzQkFBc0IsRUFDdEIsa0JBQWtCLEdBQ2xCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2hFLE9BQU8sUUFBUSxNQUFNLCtCQUErQixDQUFBO0FBSXBELHlDQUF5QztBQUN6QyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRztJQUMvQixVQUFVLEVBQUUsaUNBQWlDO0lBQzdDLGFBQWEsRUFBRSwrQ0FBK0M7Q0FDOUQsQ0FBQTtBQUVELCtDQUErQztBQUMvQyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRztJQUN6QyxFQUFFLEVBQUUsU0FBUztJQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsMENBQTBDLEVBQUUsYUFBYSxDQUFDO0lBQ2hGLG1CQUFtQixFQUFF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