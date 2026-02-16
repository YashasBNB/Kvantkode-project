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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRXZDLE9BQU8sRUFBMkIsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFpQnRGLE9BQU8sRUFDTixxQkFBcUIsR0FJckIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFJckUsT0FBTyxFQUFFLFFBQVEsRUFBaUMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHdEQsT0FBTyxFQUVOLHNCQUFzQixFQUN0QixrQkFBa0IsR0FDbEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxRQUFRLE1BQU0sK0JBQStCLENBQUE7QUFJcEQseUNBQXlDO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHO0lBQy9CLFVBQVUsRUFBRSxpQ0FBaUM7SUFDN0MsYUFBYSxFQUFFLCtDQUErQztDQUM5RCxDQUFBO0FBRUQsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHO0lBQ3pDLEVBQUUsRUFBRSxTQUFTO0lBQ2IsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxhQUFh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