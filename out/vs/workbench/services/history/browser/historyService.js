/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HistoryService_1, EditorNavigationStack_1;
import { localize } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorResourceAccessor, SideBySideEditor, isResourceEditorInput, isEditorInput, isSideBySideEditorInput, EditorCloseContext, isEditorPaneWithSelection, } from '../../../common/editor.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IHistoryService } from '../common/history.js';
import { FileChangesEvent, IFileService, FILES_EXCLUDE_CONFIG, FileOperationEvent, } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { dispose, Disposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { getExcludes, SEARCH_EXCLUDE_CONFIG, } from '../../search/common/search.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { coalesce, remove } from '../../../../base/common/arrays.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { addDisposableListener, EventType, EventHelper, WindowIdleValue, } from '../../../../base/browser/dom.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { Schemas } from '../../../../base/common/network.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IPathService } from '../../path/common/pathService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { mainWindow } from '../../../../base/browser/window.js';
let HistoryService = class HistoryService extends Disposable {
    static { HistoryService_1 = this; }
    static { this.MOUSE_NAVIGATION_SETTING = 'workbench.editor.mouseBackForwardToNavigate'; }
    static { this.NAVIGATION_SCOPE_SETTING = 'workbench.editor.navigationScope'; }
    constructor(editorService, editorGroupService, contextService, storageService, configurationService, fileService, workspacesService, instantiationService, layoutService, contextKeyService, logService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.contextService = contextService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.workspacesService = workspacesService;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this.activeEditorListeners = this._register(new DisposableStore());
        this.lastActiveEditor = undefined;
        //#endregion
        //#region Editor History Navigation (limit: 50)
        this._onDidChangeEditorNavigationStack = this._register(new Emitter());
        this.onDidChangeEditorNavigationStack = this._onDidChangeEditorNavigationStack.event;
        this.defaultScopedEditorNavigationStack = undefined;
        this.editorGroupScopedNavigationStacks = new Map();
        this.editorScopedNavigationStacks = new Map();
        this.editorNavigationScope = 0 /* GoScope.DEFAULT */;
        //#endregion
        //#region Navigation: Next/Previous Used Editor
        this.recentlyUsedEditorsStack = undefined;
        this.recentlyUsedEditorsStackIndex = 0;
        this.recentlyUsedEditorsInGroupStack = undefined;
        this.recentlyUsedEditorsInGroupStackIndex = 0;
        this.navigatingInRecentlyUsedEditorsStack = false;
        this.navigatingInRecentlyUsedEditorsInGroupStack = false;
        this.recentlyClosedEditors = [];
        this.ignoreEditorCloseEvent = false;
        this.history = undefined;
        this.editorHistoryListeners = new Map();
        this.resourceExcludeMatcher = this._register(new WindowIdleValue(mainWindow, () => {
            const matcher = this._register(this.instantiationService.createInstance(ResourceGlobMatcher, (root) => getExcludes(root
                ? this.configurationService.getValue({ resource: root })
                : this.configurationService.getValue()) || Object.create(null), (event) => event.affectsConfiguration(FILES_EXCLUDE_CONFIG) ||
                event.affectsConfiguration(SEARCH_EXCLUDE_CONFIG)));
            this._register(matcher.onExpressionChange(() => this.removeExcludedFromHistory()));
            return matcher;
        }));
        this.editorHelper = this.instantiationService.createInstance(EditorHelper);
        this.canNavigateBackContextKey = new RawContextKey('canNavigateBack', false, localize('canNavigateBack', 'Whether it is possible to navigate back in editor history')).bindTo(this.contextKeyService);
        this.canNavigateForwardContextKey = new RawContextKey('canNavigateForward', false, localize('canNavigateForward', 'Whether it is possible to navigate forward in editor history')).bindTo(this.contextKeyService);
        this.canNavigateBackInNavigationsContextKey = new RawContextKey('canNavigateBackInNavigationLocations', false, localize('canNavigateBackInNavigationLocations', 'Whether it is possible to navigate back in editor navigation locations history')).bindTo(this.contextKeyService);
        this.canNavigateForwardInNavigationsContextKey = new RawContextKey('canNavigateForwardInNavigationLocations', false, localize('canNavigateForwardInNavigationLocations', 'Whether it is possible to navigate forward in editor navigation locations history')).bindTo(this.contextKeyService);
        this.canNavigateToLastNavigationLocationContextKey = new RawContextKey('canNavigateToLastNavigationLocation', false, localize('canNavigateToLastNavigationLocation', 'Whether it is possible to navigate to the last editor navigation location')).bindTo(this.contextKeyService);
        this.canNavigateBackInEditsContextKey = new RawContextKey('canNavigateBackInEditLocations', false, localize('canNavigateBackInEditLocations', 'Whether it is possible to navigate back in editor edit locations history')).bindTo(this.contextKeyService);
        this.canNavigateForwardInEditsContextKey = new RawContextKey('canNavigateForwardInEditLocations', false, localize('canNavigateForwardInEditLocations', 'Whether it is possible to navigate forward in editor edit locations history')).bindTo(this.contextKeyService);
        this.canNavigateToLastEditLocationContextKey = new RawContextKey('canNavigateToLastEditLocation', false, localize('canNavigateToLastEditLocation', 'Whether it is possible to navigate to the last editor edit location')).bindTo(this.contextKeyService);
        this.canReopenClosedEditorContextKey = new RawContextKey('canReopenClosedEditor', false, localize('canReopenClosedEditor', 'Whether it is possible to reopen the last closed editor')).bindTo(this.contextKeyService);
        this.registerListeners();
        // if the service is created late enough that an editor is already opened
        // make sure to trigger the onActiveEditorChanged() to track the editor
        // properly (fixes https://github.com/microsoft/vscode/issues/59908)
        if (this.editorService.activeEditorPane) {
            this.onDidActiveEditorChange();
        }
    }
    registerListeners() {
        // Mouse back/forward support
        this.registerMouseNavigationListener();
        // Editor changes
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.editorService.onDidOpenEditorFail((event) => this.remove(event.editor)));
        this._register(this.editorService.onDidCloseEditor((event) => this.onDidCloseEditor(event)));
        this._register(this.editorService.onDidMostRecentlyActiveEditorsChange(() => this.handleEditorEventInRecentEditorsStack()));
        // Editor group changes
        this._register(this.editorGroupService.onDidRemoveGroup((e) => this.onDidRemoveGroup(e)));
        // File changes
        this._register(this.fileService.onDidFilesChange((event) => this.onDidFilesChange(event)));
        this._register(this.fileService.onDidRunOperation((event) => this.onDidFilesChange(event)));
        // Storage
        this._register(this.storageService.onWillSaveState(() => this.saveState()));
        // Configuration
        this.registerEditorNavigationScopeChangeListener();
        // Context keys
        this._register(this.onDidChangeEditorNavigationStack(() => this.updateContextKeys()));
        this._register(this.editorGroupService.onDidChangeActiveGroup(() => this.updateContextKeys()));
    }
    onDidCloseEditor(e) {
        this.handleEditorCloseEventInHistory(e);
        this.handleEditorCloseEventInReopen(e);
    }
    registerMouseNavigationListener() {
        const mouseBackForwardSupportListener = this._register(new DisposableStore());
        const handleMouseBackForwardSupport = () => {
            mouseBackForwardSupportListener.clear();
            if (this.configurationService.getValue(HistoryService_1.MOUSE_NAVIGATION_SETTING)) {
                this._register(Event.runAndSubscribe(this.layoutService.onDidAddContainer, ({ container, disposables }) => {
                    const eventDisposables = disposables.add(new DisposableStore());
                    eventDisposables.add(addDisposableListener(container, EventType.MOUSE_DOWN, (e) => this.onMouseDownOrUp(e, true)));
                    eventDisposables.add(addDisposableListener(container, EventType.MOUSE_UP, (e) => this.onMouseDownOrUp(e, false)));
                    mouseBackForwardSupportListener.add(eventDisposables);
                }, { container: this.layoutService.mainContainer, disposables: this._store }));
            }
        };
        this._register(this.configurationService.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(HistoryService_1.MOUSE_NAVIGATION_SETTING)) {
                handleMouseBackForwardSupport();
            }
        }));
        handleMouseBackForwardSupport();
    }
    onMouseDownOrUp(event, isMouseDown) {
        // Support to navigate in history when mouse buttons 4/5 are pressed
        // We want to trigger this on mouse down for a faster experience
        // but we also need to prevent mouse up from triggering the default
        // which is to navigate in the browser history.
        switch (event.button) {
            case 3:
                EventHelper.stop(event);
                if (isMouseDown) {
                    this.goBack();
                }
                break;
            case 4:
                EventHelper.stop(event);
                if (isMouseDown) {
                    this.goForward();
                }
                break;
        }
    }
    onDidRemoveGroup(group) {
        this.handleEditorGroupRemoveInNavigationStacks(group);
    }
    onDidActiveEditorChange() {
        const activeEditorGroup = this.editorGroupService.activeGroup;
        const activeEditorPane = activeEditorGroup.activeEditorPane;
        if (this.lastActiveEditor &&
            this.editorHelper.matchesEditorIdentifier(this.lastActiveEditor, activeEditorPane)) {
            return; // return if the active editor is still the same
        }
        // Remember as last active editor (can be undefined if none opened)
        this.lastActiveEditor = activeEditorPane?.input
            ? { editor: activeEditorPane.input, groupId: activeEditorPane.group.id }
            : undefined;
        // Dispose old listeners
        this.activeEditorListeners.clear();
        // Handle editor change unless the editor is transient. In that case
        // setup a listener to see if the transient editor becomes non-transient
        // (https://github.com/microsoft/vscode/issues/211769)
        if (!activeEditorPane?.group.isTransient(activeEditorPane.input)) {
            this.handleActiveEditorChange(activeEditorGroup, activeEditorPane);
        }
        else {
            this.logService.trace(`[History]: ignoring transient editor change until becoming non-transient (editor: ${activeEditorPane.input?.resource?.toString()}})`);
            const transientListener = activeEditorGroup.onDidModelChange((e) => {
                if (e.kind === 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */ &&
                    e.editor === activeEditorPane.input &&
                    !activeEditorPane.group.isTransient(activeEditorPane.input)) {
                    transientListener.dispose();
                    this.handleActiveEditorChange(activeEditorGroup, activeEditorPane);
                }
            });
            this.activeEditorListeners.add(transientListener);
        }
        // Listen to selection changes unless the editor is transient
        if (isEditorPaneWithSelection(activeEditorPane)) {
            this.activeEditorListeners.add(activeEditorPane.onDidChangeSelection((e) => {
                if (!activeEditorPane.group.isTransient(activeEditorPane.input)) {
                    this.handleActiveEditorSelectionChangeEvent(activeEditorGroup, activeEditorPane, e);
                }
                else {
                    this.logService.trace(`[History]: ignoring transient editor selection change (editor: ${activeEditorPane.input?.resource?.toString()}})`);
                }
            }));
        }
        // Context keys
        this.updateContextKeys();
    }
    onDidFilesChange(event) {
        // External file changes (watcher)
        if (event instanceof FileChangesEvent) {
            if (event.gotDeleted()) {
                this.remove(event);
            }
        }
        // Internal file changes (e.g. explorer)
        else {
            // Delete
            if (event.isOperation(1 /* FileOperation.DELETE */)) {
                this.remove(event);
            }
            // Move
            else if (event.isOperation(2 /* FileOperation.MOVE */) && event.target.isFile) {
                this.move(event);
            }
        }
    }
    handleActiveEditorChange(group, editorPane) {
        this.handleActiveEditorChangeInHistory(editorPane);
        this.handleActiveEditorChangeInNavigationStacks(group, editorPane);
    }
    handleActiveEditorSelectionChangeEvent(group, editorPane, event) {
        this.handleActiveEditorSelectionChangeInNavigationStacks(group, editorPane, event);
    }
    move(event) {
        this.moveInHistory(event);
        this.moveInEditorNavigationStacks(event);
    }
    remove(arg1) {
        this.removeFromHistory(arg1);
        this.removeFromEditorNavigationStacks(arg1);
        this.removeFromRecentlyClosedEditors(arg1);
        this.removeFromRecentlyOpened(arg1);
    }
    removeFromRecentlyOpened(arg1) {
        let resource = undefined;
        if (isEditorInput(arg1)) {
            resource = EditorResourceAccessor.getOriginalUri(arg1);
        }
        else if (arg1 instanceof FileChangesEvent) {
            // Ignore for now (recently opened are most often out of workspace files anyway for which there are no file events)
        }
        else {
            resource = arg1.resource;
        }
        if (resource) {
            this.workspacesService.removeRecentlyOpened([resource]);
        }
    }
    clear() {
        // History
        this.clearRecentlyOpened();
        // Navigation (next, previous)
        this.clearEditorNavigationStacks();
        // Recently closed editors
        this.recentlyClosedEditors = [];
        // Context Keys
        this.updateContextKeys();
    }
    updateContextKeys() {
        this.contextKeyService.bufferChangeEvents(() => {
            const activeStack = this.getStack();
            this.canNavigateBackContextKey.set(activeStack.canGoBack(0 /* GoFilter.NONE */));
            this.canNavigateForwardContextKey.set(activeStack.canGoForward(0 /* GoFilter.NONE */));
            this.canNavigateBackInNavigationsContextKey.set(activeStack.canGoBack(2 /* GoFilter.NAVIGATION */));
            this.canNavigateForwardInNavigationsContextKey.set(activeStack.canGoForward(2 /* GoFilter.NAVIGATION */));
            this.canNavigateToLastNavigationLocationContextKey.set(activeStack.canGoLast(2 /* GoFilter.NAVIGATION */));
            this.canNavigateBackInEditsContextKey.set(activeStack.canGoBack(1 /* GoFilter.EDITS */));
            this.canNavigateForwardInEditsContextKey.set(activeStack.canGoForward(1 /* GoFilter.EDITS */));
            this.canNavigateToLastEditLocationContextKey.set(activeStack.canGoLast(1 /* GoFilter.EDITS */));
            this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
        });
    }
    registerEditorNavigationScopeChangeListener() {
        const handleEditorNavigationScopeChange = () => {
            // Ensure to start fresh when setting changes
            this.disposeEditorNavigationStacks();
            // Update scope
            const configuredScope = this.configurationService.getValue(HistoryService_1.NAVIGATION_SCOPE_SETTING);
            if (configuredScope === 'editorGroup') {
                this.editorNavigationScope = 1 /* GoScope.EDITOR_GROUP */;
            }
            else if (configuredScope === 'editor') {
                this.editorNavigationScope = 2 /* GoScope.EDITOR */;
            }
            else {
                this.editorNavigationScope = 0 /* GoScope.DEFAULT */;
            }
        };
        this._register(this.configurationService.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(HistoryService_1.NAVIGATION_SCOPE_SETTING)) {
                handleEditorNavigationScopeChange();
            }
        }));
        handleEditorNavigationScopeChange();
    }
    getStack(group = this.editorGroupService.activeGroup, editor = group.activeEditor) {
        switch (this.editorNavigationScope) {
            // Per Editor
            case 2 /* GoScope.EDITOR */: {
                if (!editor) {
                    return new NoOpEditorNavigationStacks();
                }
                let stacksForGroup = this.editorScopedNavigationStacks.get(group.id);
                if (!stacksForGroup) {
                    stacksForGroup = new Map();
                    this.editorScopedNavigationStacks.set(group.id, stacksForGroup);
                }
                let stack = stacksForGroup.get(editor)?.stack;
                if (!stack) {
                    const disposable = new DisposableStore();
                    stack = disposable.add(this.instantiationService.createInstance(EditorNavigationStacks, 2 /* GoScope.EDITOR */));
                    disposable.add(stack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                    stacksForGroup.set(editor, { stack, disposable });
                }
                return stack;
            }
            // Per Editor Group
            case 1 /* GoScope.EDITOR_GROUP */: {
                let stack = this.editorGroupScopedNavigationStacks.get(group.id)?.stack;
                if (!stack) {
                    const disposable = new DisposableStore();
                    stack = disposable.add(this.instantiationService.createInstance(EditorNavigationStacks, 1 /* GoScope.EDITOR_GROUP */));
                    disposable.add(stack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                    this.editorGroupScopedNavigationStacks.set(group.id, { stack, disposable });
                }
                return stack;
            }
            // Global
            case 0 /* GoScope.DEFAULT */: {
                if (!this.defaultScopedEditorNavigationStack) {
                    this.defaultScopedEditorNavigationStack = this._register(this.instantiationService.createInstance(EditorNavigationStacks, 0 /* GoScope.DEFAULT */));
                    this._register(this.defaultScopedEditorNavigationStack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                }
                return this.defaultScopedEditorNavigationStack;
            }
        }
    }
    goForward(filter) {
        return this.getStack().goForward(filter);
    }
    goBack(filter) {
        return this.getStack().goBack(filter);
    }
    goPrevious(filter) {
        return this.getStack().goPrevious(filter);
    }
    goLast(filter) {
        return this.getStack().goLast(filter);
    }
    handleActiveEditorChangeInNavigationStacks(group, editorPane) {
        this.getStack(group, editorPane?.input).handleActiveEditorChange(editorPane);
    }
    handleActiveEditorSelectionChangeInNavigationStacks(group, editorPane, event) {
        this.getStack(group, editorPane.input).handleActiveEditorSelectionChange(editorPane, event);
    }
    handleEditorCloseEventInHistory(e) {
        const editors = this.editorScopedNavigationStacks.get(e.groupId);
        if (editors) {
            const editorStack = editors.get(e.editor);
            if (editorStack) {
                editorStack.disposable.dispose();
                editors.delete(e.editor);
            }
            if (editors.size === 0) {
                this.editorScopedNavigationStacks.delete(e.groupId);
            }
        }
    }
    handleEditorGroupRemoveInNavigationStacks(group) {
        // Global
        this.defaultScopedEditorNavigationStack?.remove(group.id);
        // Editor groups
        const editorGroupStack = this.editorGroupScopedNavigationStacks.get(group.id);
        if (editorGroupStack) {
            editorGroupStack.disposable.dispose();
            this.editorGroupScopedNavigationStacks.delete(group.id);
        }
    }
    clearEditorNavigationStacks() {
        this.withEachEditorNavigationStack((stack) => stack.clear());
    }
    removeFromEditorNavigationStacks(arg1) {
        this.withEachEditorNavigationStack((stack) => stack.remove(arg1));
    }
    moveInEditorNavigationStacks(event) {
        this.withEachEditorNavigationStack((stack) => stack.move(event));
    }
    withEachEditorNavigationStack(fn) {
        // Global
        if (this.defaultScopedEditorNavigationStack) {
            fn(this.defaultScopedEditorNavigationStack);
        }
        // Per editor group
        for (const [, entry] of this.editorGroupScopedNavigationStacks) {
            fn(entry.stack);
        }
        // Per editor
        for (const [, entries] of this.editorScopedNavigationStacks) {
            for (const [, entry] of entries) {
                fn(entry.stack);
            }
        }
    }
    disposeEditorNavigationStacks() {
        // Global
        this.defaultScopedEditorNavigationStack?.dispose();
        this.defaultScopedEditorNavigationStack = undefined;
        // Per Editor group
        for (const [, stack] of this.editorGroupScopedNavigationStacks) {
            stack.disposable.dispose();
        }
        this.editorGroupScopedNavigationStacks.clear();
        // Per Editor
        for (const [, stacks] of this.editorScopedNavigationStacks) {
            for (const [, stack] of stacks) {
                stack.disposable.dispose();
            }
        }
        this.editorScopedNavigationStacks.clear();
    }
    openNextRecentlyUsedEditor(groupId) {
        const [stack, index] = this.ensureRecentlyUsedStack((index) => index - 1, groupId);
        return this.doNavigateInRecentlyUsedEditorsStack(stack[index], groupId);
    }
    openPreviouslyUsedEditor(groupId) {
        const [stack, index] = this.ensureRecentlyUsedStack((index) => index + 1, groupId);
        return this.doNavigateInRecentlyUsedEditorsStack(stack[index], groupId);
    }
    async doNavigateInRecentlyUsedEditorsStack(editorIdentifier, groupId) {
        if (editorIdentifier) {
            const acrossGroups = typeof groupId !== 'number' || !this.editorGroupService.getGroup(groupId);
            if (acrossGroups) {
                this.navigatingInRecentlyUsedEditorsStack = true;
            }
            else {
                this.navigatingInRecentlyUsedEditorsInGroupStack = true;
            }
            const group = this.editorGroupService.getGroup(editorIdentifier.groupId) ??
                this.editorGroupService.activeGroup;
            try {
                await group.openEditor(editorIdentifier.editor);
            }
            finally {
                if (acrossGroups) {
                    this.navigatingInRecentlyUsedEditorsStack = false;
                }
                else {
                    this.navigatingInRecentlyUsedEditorsInGroupStack = false;
                }
            }
        }
    }
    ensureRecentlyUsedStack(indexModifier, groupId) {
        let editors;
        let index;
        const group = typeof groupId === 'number' ? this.editorGroupService.getGroup(groupId) : undefined;
        // Across groups
        if (!group) {
            editors =
                this.recentlyUsedEditorsStack ||
                    this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            index = this.recentlyUsedEditorsStackIndex;
        }
        // Within group
        else {
            editors =
                this.recentlyUsedEditorsInGroupStack ||
                    group
                        .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
                        .map((editor) => ({ groupId: group.id, editor }));
            index = this.recentlyUsedEditorsInGroupStackIndex;
        }
        // Adjust index
        let newIndex = indexModifier(index);
        if (newIndex < 0) {
            newIndex = 0;
        }
        else if (newIndex > editors.length - 1) {
            newIndex = editors.length - 1;
        }
        // Remember index and editors
        if (!group) {
            this.recentlyUsedEditorsStack = editors;
            this.recentlyUsedEditorsStackIndex = newIndex;
        }
        else {
            this.recentlyUsedEditorsInGroupStack = editors;
            this.recentlyUsedEditorsInGroupStackIndex = newIndex;
        }
        return [editors, newIndex];
    }
    handleEditorEventInRecentEditorsStack() {
        // Drop all-editors stack unless navigating in all editors
        if (!this.navigatingInRecentlyUsedEditorsStack) {
            this.recentlyUsedEditorsStack = undefined;
            this.recentlyUsedEditorsStackIndex = 0;
        }
        // Drop in-group-editors stack unless navigating in group
        if (!this.navigatingInRecentlyUsedEditorsInGroupStack) {
            this.recentlyUsedEditorsInGroupStack = undefined;
            this.recentlyUsedEditorsInGroupStackIndex = 0;
        }
    }
    //#endregion
    //#region File: Reopen Closed Editor (limit: 20)
    static { this.MAX_RECENTLY_CLOSED_EDITORS = 20; }
    handleEditorCloseEventInReopen(event) {
        if (this.ignoreEditorCloseEvent) {
            return; // blocked
        }
        const { editor, context } = event;
        if (context === EditorCloseContext.REPLACE || context === EditorCloseContext.MOVE) {
            return; // ignore if editor was replaced or moved
        }
        const untypedEditor = editor.toUntyped();
        if (!untypedEditor) {
            return; // we need a untyped editor to restore from going forward
        }
        const associatedResources = [];
        const editorResource = EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.BOTH,
        });
        if (URI.isUri(editorResource)) {
            associatedResources.push(editorResource);
        }
        else if (editorResource) {
            associatedResources.push(...coalesce([editorResource.primary, editorResource.secondary]));
        }
        // Remove from list of recently closed before...
        this.removeFromRecentlyClosedEditors(editor);
        // ...adding it as last recently closed
        this.recentlyClosedEditors.push({
            editorId: editor.editorId,
            editor: untypedEditor,
            resource: EditorResourceAccessor.getOriginalUri(editor),
            associatedResources,
            index: event.index,
            sticky: event.sticky,
        });
        // Bounding
        if (this.recentlyClosedEditors.length > HistoryService_1.MAX_RECENTLY_CLOSED_EDITORS) {
            this.recentlyClosedEditors.shift();
        }
        // Context
        this.canReopenClosedEditorContextKey.set(true);
    }
    async reopenLastClosedEditor() {
        // Open editor if we have one
        const lastClosedEditor = this.recentlyClosedEditors.pop();
        let reopenClosedEditorPromise = undefined;
        if (lastClosedEditor) {
            reopenClosedEditorPromise = this.doReopenLastClosedEditor(lastClosedEditor);
        }
        // Update context
        this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
        return reopenClosedEditorPromise;
    }
    async doReopenLastClosedEditor(lastClosedEditor) {
        const options = {
            pinned: true,
            sticky: lastClosedEditor.sticky,
            index: lastClosedEditor.index,
            ignoreError: true,
        };
        // Special sticky handling: remove the index property from options
        // if that would result in sticky state to not preserve or apply
        // wrongly.
        if ((lastClosedEditor.sticky &&
            !this.editorGroupService.activeGroup.isSticky(lastClosedEditor.index)) ||
            (!lastClosedEditor.sticky &&
                this.editorGroupService.activeGroup.isSticky(lastClosedEditor.index))) {
            options.index = undefined;
        }
        // Re-open editor unless already opened
        let editorPane = undefined;
        if (!this.editorGroupService.activeGroup.contains(lastClosedEditor.editor)) {
            // Fix for https://github.com/microsoft/vscode/issues/107850
            // If opening an editor fails, it is possible that we get
            // another editor-close event as a result. But we really do
            // want to ignore that in our list of recently closed editors
            //  to prevent endless loops.
            this.ignoreEditorCloseEvent = true;
            try {
                editorPane = await this.editorService.openEditor({
                    ...lastClosedEditor.editor,
                    options: {
                        ...lastClosedEditor.editor.options,
                        ...options,
                    },
                });
            }
            finally {
                this.ignoreEditorCloseEvent = false;
            }
        }
        // If no editor was opened, try with the next one
        if (!editorPane) {
            // Fix for https://github.com/microsoft/vscode/issues/67882
            // If opening of the editor fails, make sure to try the next one
            // but make sure to remove this one from the list to prevent
            // endless loops.
            remove(this.recentlyClosedEditors, lastClosedEditor);
            // Try with next one
            this.reopenLastClosedEditor();
        }
    }
    removeFromRecentlyClosedEditors(arg1) {
        this.recentlyClosedEditors = this.recentlyClosedEditors.filter((recentlyClosedEditor) => {
            if (isEditorInput(arg1) && recentlyClosedEditor.editorId !== arg1.editorId) {
                return true; // keep: different editor identifiers
            }
            if (recentlyClosedEditor.resource &&
                this.editorHelper.matchesFile(recentlyClosedEditor.resource, arg1)) {
                return false; // remove: editor matches directly
            }
            if (recentlyClosedEditor.associatedResources.some((associatedResource) => this.editorHelper.matchesFile(associatedResource, arg1))) {
                return false; // remove: an associated resource matches
            }
            return true; // keep
        });
        // Update context
        this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
    }
    //#endregion
    //#region Go to: Recently Opened Editor (limit: 200, persisted)
    static { this.MAX_HISTORY_ITEMS = 200; }
    static { this.HISTORY_STORAGE_KEY = 'history.entries'; }
    handleActiveEditorChangeInHistory(editorPane) {
        // Ensure we have not configured to exclude input and don't track invalid inputs
        const editor = editorPane?.input;
        if (!editor || editor.isDisposed() || !this.includeInHistory(editor)) {
            return;
        }
        // Remove any existing entry and add to the beginning
        this.removeFromHistory(editor);
        this.addToHistory(editor);
    }
    addToHistory(editor, insertFirst = true) {
        this.ensureHistoryLoaded(this.history);
        const historyInput = this.editorHelper.preferResourceEditorInput(editor);
        if (!historyInput) {
            return;
        }
        // Insert based on preference
        if (insertFirst) {
            this.history.unshift(historyInput);
        }
        else {
            this.history.push(historyInput);
        }
        // Respect max entries setting
        if (this.history.length > HistoryService_1.MAX_HISTORY_ITEMS) {
            this.editorHelper.clearOnEditorDispose(this.history.pop(), this.editorHistoryListeners);
        }
        // React to editor input disposing
        if (isEditorInput(editor)) {
            this.editorHelper.onEditorDispose(editor, () => this.updateHistoryOnEditorDispose(historyInput), this.editorHistoryListeners);
        }
    }
    updateHistoryOnEditorDispose(editor) {
        if (isEditorInput(editor)) {
            // Any non side-by-side editor input gets removed directly on dispose
            if (!isSideBySideEditorInput(editor)) {
                this.removeFromHistory(editor);
            }
            // Side-by-side editors get special treatment: we try to distill the
            // possibly untyped resource inputs from both sides to be able to
            // offer these entries from the history to the user still unless
            // they are excluded.
            else {
                const resourceInputs = [];
                const sideInputs = editor.primary.matches(editor.secondary)
                    ? [editor.primary]
                    : [editor.primary, editor.secondary];
                for (const sideInput of sideInputs) {
                    const candidateResourceInput = this.editorHelper.preferResourceEditorInput(sideInput);
                    if (isResourceEditorInput(candidateResourceInput) &&
                        this.includeInHistory(candidateResourceInput)) {
                        resourceInputs.push(candidateResourceInput);
                    }
                }
                // Insert the untyped resource inputs where our disposed
                // side-by-side editor input is in the history stack
                this.replaceInHistory(editor, ...resourceInputs);
            }
        }
        else {
            // Remove any editor that should not be included in history
            if (!this.includeInHistory(editor)) {
                this.removeFromHistory(editor);
            }
        }
    }
    includeInHistory(editor) {
        if (isEditorInput(editor)) {
            return true; // include any non files
        }
        return !this.resourceExcludeMatcher.value.matches(editor.resource);
    }
    removeExcludedFromHistory() {
        this.ensureHistoryLoaded(this.history);
        this.history = this.history.filter((entry) => {
            const include = this.includeInHistory(entry);
            // Cleanup any listeners associated with the input when removing from history
            if (!include) {
                this.editorHelper.clearOnEditorDispose(entry, this.editorHistoryListeners);
            }
            return include;
        });
    }
    moveInHistory(event) {
        if (event.isOperation(2 /* FileOperation.MOVE */)) {
            const removed = this.removeFromHistory(event);
            if (removed) {
                this.addToHistory({ resource: event.target.resource });
            }
        }
    }
    removeFromHistory(arg1) {
        let removed = false;
        this.ensureHistoryLoaded(this.history);
        this.history = this.history.filter((entry) => {
            const matches = this.editorHelper.matchesEditor(arg1, entry);
            // Cleanup any listeners associated with the input when removing from history
            if (matches) {
                this.editorHelper.clearOnEditorDispose(arg1, this.editorHistoryListeners);
                removed = true;
            }
            return !matches;
        });
        return removed;
    }
    replaceInHistory(editor, ...replacements) {
        this.ensureHistoryLoaded(this.history);
        let replaced = false;
        const newHistory = [];
        for (const entry of this.history) {
            // Entry matches and is going to be disposed + replaced
            if (this.editorHelper.matchesEditor(editor, entry)) {
                // Cleanup any listeners associated with the input when replacing from history
                this.editorHelper.clearOnEditorDispose(editor, this.editorHistoryListeners);
                // Insert replacements but only once
                if (!replaced) {
                    newHistory.push(...replacements);
                    replaced = true;
                }
            }
            // Entry does not match, but only add it if it didn't match
            // our replacements already
            else if (!replacements.some((replacement) => this.editorHelper.matchesEditor(replacement, entry))) {
                newHistory.push(entry);
            }
        }
        // If the target editor to replace was not found, make sure to
        // insert the replacements to the end to ensure we got them
        if (!replaced) {
            newHistory.push(...replacements);
        }
        this.history = newHistory;
    }
    clearRecentlyOpened() {
        this.history = [];
        for (const [, disposable] of this.editorHistoryListeners) {
            dispose(disposable);
        }
        this.editorHistoryListeners.clear();
    }
    getHistory() {
        this.ensureHistoryLoaded(this.history);
        return this.history;
    }
    ensureHistoryLoaded(history) {
        if (!this.history) {
            // Until history is loaded, it is just empty
            this.history = [];
            // We want to seed history from opened editors
            // too as well as previous stored state, so we
            // need to wait for the editor groups being ready
            if (this.editorGroupService.isReady) {
                this.loadHistory();
            }
            else {
                ;
                (async () => {
                    await this.editorGroupService.whenReady;
                    this.loadHistory();
                })();
            }
        }
    }
    loadHistory() {
        // Init as empty before adding - since we are about to
        // populate the history from opened editors, we capture
        // the right order here.
        this.history = [];
        // All stored editors from previous session
        const storedEditorHistory = this.loadHistoryFromStorage();
        // All restored editors from previous session
        // in reverse editor from least to most recently
        // used.
        const openedEditorsLru = [
            ...this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */),
        ].reverse();
        // We want to merge the opened editors from the last
        // session with the stored editors from the last
        // session. Because not all editors can be serialised
        // we want to make sure to include all opened editors
        // too.
        // Opened editors should always be first in the history
        const handledEditors = new Set();
        // Add all opened editors first
        for (const { editor } of openedEditorsLru) {
            if (!this.includeInHistory(editor)) {
                continue;
            }
            // Make sure to skip duplicates from the editors LRU
            if (editor.resource) {
                const historyEntryId = `${editor.resource.toString()}/${editor.editorId}`;
                if (handledEditors.has(historyEntryId)) {
                    continue; // already added
                }
                handledEditors.add(historyEntryId);
            }
            // Add into history
            this.addToHistory(editor);
        }
        // Add remaining from storage if not there already
        // We check on resource and `editorId` (from `override`)
        // to figure out if the editor has been already added.
        for (const editor of storedEditorHistory) {
            const historyEntryId = `${editor.resource.toString()}/${editor.options?.override}`;
            if (!handledEditors.has(historyEntryId) && this.includeInHistory(editor)) {
                handledEditors.add(historyEntryId);
                this.addToHistory(editor, false /* at the end */);
            }
        }
    }
    loadHistoryFromStorage() {
        const entries = [];
        const entriesRaw = this.storageService.get(HistoryService_1.HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (entriesRaw) {
            try {
                const entriesParsed = JSON.parse(entriesRaw);
                for (const entryParsed of entriesParsed) {
                    if (!entryParsed.editor || !entryParsed.editor.resource) {
                        continue; // unexpected data format
                    }
                    try {
                        entries.push({
                            ...entryParsed.editor,
                            resource: typeof entryParsed.editor.resource === 'string'
                                ? URI.parse(entryParsed.editor.resource) //  from 1.67.x: URI is stored efficiently as URI.toString()
                                : URI.from(entryParsed.editor.resource), // until 1.66.x: URI was stored very verbose as URI.toJSON()
                        });
                    }
                    catch (error) {
                        onUnexpectedError(error); // do not fail entire history when one entry fails
                    }
                }
            }
            catch (error) {
                onUnexpectedError(error); // https://github.com/microsoft/vscode/issues/99075
            }
        }
        return entries;
    }
    saveState() {
        if (!this.history) {
            return; // nothing to save because history was not used
        }
        const entries = [];
        for (const editor of this.history) {
            if (isEditorInput(editor) || !isResourceEditorInput(editor)) {
                continue; // only save resource editor inputs
            }
            entries.push({
                editor: {
                    ...editor,
                    resource: editor.resource.toString(),
                },
            });
        }
        this.storageService.store(HistoryService_1.HISTORY_STORAGE_KEY, JSON.stringify(entries), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    //#endregion
    //#region Last Active Workspace/File
    getLastActiveWorkspaceRoot(schemeFilter, authorityFilter) {
        // No Folder: return early
        const folders = this.contextService.getWorkspace().folders;
        if (folders.length === 0) {
            return undefined;
        }
        // Single Folder: return early
        if (folders.length === 1) {
            const resource = folders[0].uri;
            if ((!schemeFilter || resource.scheme === schemeFilter) &&
                (!authorityFilter || resource.authority === authorityFilter)) {
                return resource;
            }
            return undefined;
        }
        // Multiple folders: find the last active one
        for (const input of this.getHistory()) {
            if (isEditorInput(input)) {
                continue;
            }
            if (schemeFilter && input.resource.scheme !== schemeFilter) {
                continue;
            }
            if (authorityFilter && input.resource.authority !== authorityFilter) {
                continue;
            }
            const resourceWorkspace = this.contextService.getWorkspaceFolder(input.resource);
            if (resourceWorkspace) {
                return resourceWorkspace.uri;
            }
        }
        // Fallback to first workspace matching scheme filter if any
        for (const folder of folders) {
            const resource = folder.uri;
            if ((!schemeFilter || resource.scheme === schemeFilter) &&
                (!authorityFilter || resource.authority === authorityFilter)) {
                return resource;
            }
        }
        return undefined;
    }
    getLastActiveFile(filterByScheme, filterByAuthority) {
        for (const input of this.getHistory()) {
            let resource;
            if (isEditorInput(input)) {
                resource = EditorResourceAccessor.getOriginalUri(input, { filterByScheme });
            }
            else {
                resource = input.resource;
            }
            if (resource &&
                resource.scheme === filterByScheme &&
                (!filterByAuthority || resource.authority === filterByAuthority)) {
                return resource;
            }
        }
        return undefined;
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, stack] of this.editorGroupScopedNavigationStacks) {
            stack.disposable.dispose();
        }
        for (const [, editors] of this.editorScopedNavigationStacks) {
            for (const [, stack] of editors) {
                stack.disposable.dispose();
            }
        }
        for (const [, listener] of this.editorHistoryListeners) {
            listener.dispose();
        }
    }
};
HistoryService = HistoryService_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IFileService),
    __param(6, IWorkspacesService),
    __param(7, IInstantiationService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IContextKeyService),
    __param(10, ILogService)
], HistoryService);
export { HistoryService };
registerSingleton(IHistoryService, HistoryService, 0 /* InstantiationType.Eager */);
class EditorSelectionState {
    constructor(editorIdentifier, selection, reason) {
        this.editorIdentifier = editorIdentifier;
        this.selection = selection;
        this.reason = reason;
    }
    justifiesNewNavigationEntry(other) {
        if (this.editorIdentifier.groupId !== other.editorIdentifier.groupId) {
            return true; // different group
        }
        if (!this.editorIdentifier.editor.matches(other.editorIdentifier.editor)) {
            return true; // different editor
        }
        if (!this.selection || !other.selection) {
            return true; // unknown selections
        }
        const result = this.selection.compare(other.selection);
        if (result === 2 /* EditorPaneSelectionCompareResult.SIMILAR */ &&
            (other.reason === 4 /* EditorPaneSelectionChangeReason.NAVIGATION */ ||
                other.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */)) {
            // let navigation sources win even if the selection is `SIMILAR`
            // (e.g. "Go to definition" should add a history entry)
            return true;
        }
        return result === 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
}
let EditorNavigationStacks = class EditorNavigationStacks extends Disposable {
    constructor(scope, instantiationService) {
        super();
        this.scope = scope;
        this.instantiationService = instantiationService;
        this.selectionsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, this.scope));
        this.editsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 1 /* GoFilter.EDITS */, this.scope));
        this.navigationsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 2 /* GoFilter.NAVIGATION */, this.scope));
        this.stacks = [this.selectionsStack, this.editsStack, this.navigationsStack];
        this.onDidChange = Event.any(this.selectionsStack.onDidChange, this.editsStack.onDidChange, this.navigationsStack.onDidChange);
    }
    canGoForward(filter) {
        return this.getStack(filter).canGoForward();
    }
    goForward(filter) {
        return this.getStack(filter).goForward();
    }
    canGoBack(filter) {
        return this.getStack(filter).canGoBack();
    }
    goBack(filter) {
        return this.getStack(filter).goBack();
    }
    goPrevious(filter) {
        return this.getStack(filter).goPrevious();
    }
    canGoLast(filter) {
        return this.getStack(filter).canGoLast();
    }
    goLast(filter) {
        return this.getStack(filter).goLast();
    }
    getStack(filter = 0 /* GoFilter.NONE */) {
        switch (filter) {
            case 0 /* GoFilter.NONE */:
                return this.selectionsStack;
            case 1 /* GoFilter.EDITS */:
                return this.editsStack;
            case 2 /* GoFilter.NAVIGATION */:
                return this.navigationsStack;
        }
    }
    handleActiveEditorChange(editorPane) {
        // Always send to selections navigation stack
        this.selectionsStack.notifyNavigation(editorPane);
    }
    handleActiveEditorSelectionChange(editorPane, event) {
        const previous = this.selectionsStack.current;
        // Always send to selections navigation stack
        this.selectionsStack.notifyNavigation(editorPane, event);
        // Check for edits
        if (event.reason === 3 /* EditorPaneSelectionChangeReason.EDIT */) {
            this.editsStack.notifyNavigation(editorPane, event);
        }
        // Check for navigations
        //
        // Note: ignore if selections navigation stack is navigating because
        // in that case we do not want to receive repeated entries in
        // the navigation stack.
        else if ((event.reason === 4 /* EditorPaneSelectionChangeReason.NAVIGATION */ ||
            event.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */) &&
            !this.selectionsStack.isNavigating()) {
            // A "JUMP" navigation selection change always has a source and
            // target. As such, we add the previous entry of the selections
            // navigation stack so that our navigation stack receives both
            // entries unless the user is currently navigating.
            if (event.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */ &&
                !this.navigationsStack.isNavigating()) {
                if (previous) {
                    this.navigationsStack.addOrReplace(previous.groupId, previous.editor, previous.selection);
                }
            }
            this.navigationsStack.notifyNavigation(editorPane, event);
        }
    }
    clear() {
        for (const stack of this.stacks) {
            stack.clear();
        }
    }
    remove(arg1) {
        for (const stack of this.stacks) {
            stack.remove(arg1);
        }
    }
    move(event) {
        for (const stack of this.stacks) {
            stack.move(event);
        }
    }
};
EditorNavigationStacks = __decorate([
    __param(1, IInstantiationService)
], EditorNavigationStacks);
class NoOpEditorNavigationStacks {
    constructor() {
        this.onDidChange = Event.None;
    }
    canGoForward() {
        return false;
    }
    async goForward() { }
    canGoBack() {
        return false;
    }
    async goBack() { }
    async goPrevious() { }
    canGoLast() {
        return false;
    }
    async goLast() { }
    handleActiveEditorChange() { }
    handleActiveEditorSelectionChange() { }
    clear() { }
    remove() { }
    move() { }
    dispose() { }
}
let EditorNavigationStack = class EditorNavigationStack extends Disposable {
    static { EditorNavigationStack_1 = this; }
    static { this.MAX_STACK_SIZE = 50; }
    get current() {
        return this.stack[this.index];
    }
    set current(entry) {
        if (entry) {
            this.stack[this.index] = entry;
        }
    }
    constructor(filter, scope, instantiationService, editorService, editorGroupService, logService) {
        super();
        this.filter = filter;
        this.scope = scope;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.mapEditorToDisposable = new Map();
        this.mapGroupToDisposable = new Map();
        this.stack = [];
        this.index = -1;
        this.previousIndex = -1;
        this.navigating = false;
        this.currentSelectionState = undefined;
        this.editorHelper = instantiationService.createInstance(EditorHelper);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidChange(() => this.traceStack()));
        this._register(this.logService.onDidChangeLogLevel(() => this.traceStack()));
    }
    traceStack() {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        const entryLabels = [];
        for (const entry of this.stack) {
            if (typeof entry.selection?.log === 'function') {
                entryLabels.push(`- group: ${entry.groupId}, editor: ${entry.editor.resource?.toString()}, selection: ${entry.selection.log()}`);
            }
            else {
                entryLabels.push(`- group: ${entry.groupId}, editor: ${entry.editor.resource?.toString()}, selection: <none>`);
            }
        }
        if (entryLabels.length === 0) {
            this.trace(`index: ${this.index}, navigating: ${this.isNavigating()}: <empty>`);
        }
        else {
            this.trace(`index: ${this.index}, navigating: ${this.isNavigating()}
${entryLabels.join('\n')}
			`);
        }
    }
    trace(msg, editor = null, event) {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        let filterLabel;
        switch (this.filter) {
            case 0 /* GoFilter.NONE */:
                filterLabel = 'global';
                break;
            case 1 /* GoFilter.EDITS */:
                filterLabel = 'edits';
                break;
            case 2 /* GoFilter.NAVIGATION */:
                filterLabel = 'navigation';
                break;
        }
        let scopeLabel;
        switch (this.scope) {
            case 0 /* GoScope.DEFAULT */:
                scopeLabel = 'default';
                break;
            case 1 /* GoScope.EDITOR_GROUP */:
                scopeLabel = 'editorGroup';
                break;
            case 2 /* GoScope.EDITOR */:
                scopeLabel = 'editor';
                break;
        }
        if (editor !== null) {
            this.logService.trace(`[History stack ${filterLabel}-${scopeLabel}]: ${msg} (editor: ${editor?.resource?.toString()}, event: ${this.traceEvent(event)})`);
        }
        else {
            this.logService.trace(`[History stack ${filterLabel}-${scopeLabel}]: ${msg}`);
        }
    }
    traceEvent(event) {
        if (!event) {
            return '<none>';
        }
        switch (event.reason) {
            case 3 /* EditorPaneSelectionChangeReason.EDIT */:
                return 'edit';
            case 4 /* EditorPaneSelectionChangeReason.NAVIGATION */:
                return 'navigation';
            case 5 /* EditorPaneSelectionChangeReason.JUMP */:
                return 'jump';
            case 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */:
                return 'programmatic';
            case 2 /* EditorPaneSelectionChangeReason.USER */:
                return 'user';
        }
    }
    registerGroupListeners(groupId) {
        if (!this.mapGroupToDisposable.has(groupId)) {
            const group = this.editorGroupService.getGroup(groupId);
            if (group) {
                this.mapGroupToDisposable.set(groupId, group.onWillMoveEditor((e) => this.onWillMoveEditor(e)));
            }
        }
    }
    onWillMoveEditor(e) {
        this.trace('onWillMoveEditor()', e.editor);
        if (this.scope === 1 /* GoScope.EDITOR_GROUP */) {
            return; // ignore move events if our scope is group based
        }
        for (const entry of this.stack) {
            if (entry.groupId !== e.groupId) {
                continue; // not in the group that reported the event
            }
            if (!this.editorHelper.matchesEditor(e.editor, entry.editor)) {
                continue; // not the editor this event is about
            }
            // Update to target group
            entry.groupId = e.target;
        }
    }
    //#region Stack Mutation
    notifyNavigation(editorPane, event) {
        this.trace('notifyNavigation()', editorPane?.input, event);
        const isSelectionAwareEditorPane = isEditorPaneWithSelection(editorPane);
        const hasValidEditor = editorPane?.input && !editorPane.input.isDisposed();
        // Treat editor changes that happen as part of stack navigation specially
        // we do not want to add a new stack entry as a matter of navigating the
        // stack but we need to keep our currentEditorSelectionState up to date
        // with the navigtion that occurs.
        if (this.navigating) {
            this.trace(`notifyNavigation() ignoring (navigating)`, editorPane?.input, event);
            if (isSelectionAwareEditorPane && hasValidEditor) {
                this.trace('notifyNavigation() updating current selection state', editorPane?.input, event);
                this.currentSelectionState = new EditorSelectionState({ groupId: editorPane.group.id, editor: editorPane.input }, editorPane.getSelection(), event?.reason);
            }
            else {
                this.trace('notifyNavigation() dropping current selection state', editorPane?.input, event);
                this.currentSelectionState = undefined; // we navigated to a non-selection aware or disposed editor
            }
        }
        // Normal navigation not part of stack navigation
        else {
            this.trace(`notifyNavigation() not ignoring`, editorPane?.input, event);
            // Navigation inside selection aware editor
            if (isSelectionAwareEditorPane && hasValidEditor) {
                this.onSelectionAwareEditorNavigation(editorPane.group.id, editorPane.input, editorPane.getSelection(), event);
            }
            // Navigation to non-selection aware or disposed editor
            else {
                this.currentSelectionState = undefined; // at this time we have no active selection aware editor
                if (hasValidEditor) {
                    this.onNonSelectionAwareEditorNavigation(editorPane.group.id, editorPane.input);
                }
            }
        }
    }
    onSelectionAwareEditorNavigation(groupId, editor, selection, event) {
        if (this.current?.groupId === groupId &&
            !selection &&
            this.editorHelper.matchesEditor(this.current.editor, editor)) {
            return; // do not push same editor input again of same group if we have no valid selection
        }
        this.trace('onSelectionAwareEditorNavigation()', editor, event);
        const stateCandidate = new EditorSelectionState({ groupId, editor }, selection, event?.reason);
        // Add to stack if we dont have a current state or this new state justifies a push
        if (!this.currentSelectionState ||
            this.currentSelectionState.justifiesNewNavigationEntry(stateCandidate)) {
            this.doAdd(groupId, editor, stateCandidate.selection);
        }
        // Otherwise we replace the current stack entry with this one
        else {
            this.doReplace(groupId, editor, stateCandidate.selection);
        }
        // Update our current navigation editor state
        this.currentSelectionState = stateCandidate;
    }
    onNonSelectionAwareEditorNavigation(groupId, editor) {
        if (this.current?.groupId === groupId &&
            this.editorHelper.matchesEditor(this.current.editor, editor)) {
            return; // do not push same editor input again of same group
        }
        this.trace('onNonSelectionAwareEditorNavigation()', editor);
        this.doAdd(groupId, editor);
    }
    doAdd(groupId, editor, selection) {
        if (!this.navigating) {
            this.addOrReplace(groupId, editor, selection);
        }
    }
    doReplace(groupId, editor, selection) {
        if (!this.navigating) {
            this.addOrReplace(groupId, editor, selection, true /* force replace */);
        }
    }
    addOrReplace(groupId, editorCandidate, selection, forceReplace) {
        // Ensure we listen to changes in group
        this.registerGroupListeners(groupId);
        // Check whether to replace an existing entry or not
        let replace = false;
        if (this.current) {
            if (forceReplace) {
                replace = true; // replace if we are forced to
            }
            else if (this.shouldReplaceStackEntry(this.current, { groupId, editor: editorCandidate, selection })) {
                replace = true; // replace if the group & input is the same and selection indicates as such
            }
        }
        const editor = this.editorHelper.preferResourceEditorInput(editorCandidate);
        if (!editor) {
            return;
        }
        if (replace) {
            this.trace('replace()', editor);
        }
        else {
            this.trace('add()', editor);
        }
        const newStackEntry = { groupId, editor, selection };
        // Replace at current position
        const removedEntries = [];
        if (replace) {
            if (this.current) {
                removedEntries.push(this.current);
            }
            this.current = newStackEntry;
        }
        // Add to stack at current position
        else {
            // If we are not at the end of history, we remove anything after
            if (this.stack.length > this.index + 1) {
                for (let i = this.index + 1; i < this.stack.length; i++) {
                    removedEntries.push(this.stack[i]);
                }
                this.stack = this.stack.slice(0, this.index + 1);
            }
            // Insert entry at index
            this.stack.splice(this.index + 1, 0, newStackEntry);
            // Check for limit
            if (this.stack.length > EditorNavigationStack_1.MAX_STACK_SIZE) {
                removedEntries.push(this.stack.shift()); // remove first
                if (this.previousIndex >= 0) {
                    this.previousIndex--;
                }
            }
            else {
                this.setIndex(this.index + 1, true /* skip event, we fire it later */);
            }
        }
        // Clear editor listeners from removed entries
        for (const removedEntry of removedEntries) {
            this.editorHelper.clearOnEditorDispose(removedEntry.editor, this.mapEditorToDisposable);
        }
        // Remove this from the stack unless the stack input is a resource
        // that can easily be restored even when the input gets disposed
        if (isEditorInput(editor)) {
            this.editorHelper.onEditorDispose(editor, () => this.remove(editor), this.mapEditorToDisposable);
        }
        // Event
        this._onDidChange.fire();
    }
    shouldReplaceStackEntry(entry, candidate) {
        if (entry.groupId !== candidate.groupId) {
            return false; // different group
        }
        if (!this.editorHelper.matchesEditor(entry.editor, candidate.editor)) {
            return false; // different editor
        }
        if (!entry.selection) {
            return true; // always replace when we have no specific selection yet
        }
        if (!candidate.selection) {
            return false; // otherwise, prefer to keep existing specific selection over new unspecific one
        }
        // Finally, replace when selections are considered identical
        return (entry.selection.compare(candidate.selection) === 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
    }
    move(event) {
        if (event.isOperation(2 /* FileOperation.MOVE */)) {
            for (const entry of this.stack) {
                if (this.editorHelper.matchesEditor(event, entry.editor)) {
                    entry.editor = { resource: event.target.resource };
                }
            }
        }
    }
    remove(arg1) {
        const previousStackSize = this.stack.length;
        // Remove all stack entries that match `arg1`
        this.stack = this.stack.filter((entry) => {
            const matches = typeof arg1 === 'number'
                ? entry.groupId === arg1
                : this.editorHelper.matchesEditor(arg1, entry.editor);
            // Cleanup any listeners associated with the input when removing
            if (matches) {
                this.editorHelper.clearOnEditorDispose(entry.editor, this.mapEditorToDisposable);
            }
            return !matches;
        });
        if (previousStackSize === this.stack.length) {
            return; // nothing removed
        }
        // Given we just removed entries, we need to make sure
        // to remove entries that are now identical and next
        // to each other to prevent no-op navigations.
        this.flatten();
        // Reset indeces
        this.index = this.stack.length - 1;
        this.previousIndex = -1;
        // Clear group listener
        if (typeof arg1 === 'number') {
            this.mapGroupToDisposable.get(arg1)?.dispose();
            this.mapGroupToDisposable.delete(arg1);
        }
        // Event
        this._onDidChange.fire();
    }
    flatten() {
        const flattenedStack = [];
        let previousEntry = undefined;
        for (const entry of this.stack) {
            if (previousEntry && this.shouldReplaceStackEntry(entry, previousEntry)) {
                continue; // skip over entry when it is considered the same
            }
            previousEntry = entry;
            flattenedStack.push(entry);
        }
        this.stack = flattenedStack;
    }
    clear() {
        this.index = -1;
        this.previousIndex = -1;
        this.stack.splice(0);
        for (const [, disposable] of this.mapEditorToDisposable) {
            dispose(disposable);
        }
        this.mapEditorToDisposable.clear();
        for (const [, disposable] of this.mapGroupToDisposable) {
            dispose(disposable);
        }
        this.mapGroupToDisposable.clear();
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    //#endregion
    //#region Navigation
    canGoForward() {
        return this.stack.length > this.index + 1;
    }
    async goForward() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        if (!this.canGoForward()) {
            return;
        }
        this.setIndex(this.index + 1);
        return this.navigate();
    }
    canGoBack() {
        return this.index > 0;
    }
    async goBack() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        if (!this.canGoBack()) {
            return;
        }
        this.setIndex(this.index - 1);
        return this.navigate();
    }
    async goPrevious() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        // If we never navigated, just go back
        if (this.previousIndex === -1) {
            return this.goBack();
        }
        // Otherwise jump to previous stack entry
        this.setIndex(this.previousIndex);
        return this.navigate();
    }
    canGoLast() {
        return this.stack.length > 0;
    }
    async goLast() {
        if (!this.canGoLast()) {
            return;
        }
        this.setIndex(this.stack.length - 1);
        return this.navigate();
    }
    async maybeGoCurrent() {
        // When this navigation stack works with a specific
        // filter where not every selection change is added
        // to the stack, we want to first reveal the current
        // selection before attempting to navigate in the
        // stack.
        if (this.filter === 0 /* GoFilter.NONE */) {
            return false; // only applies when  we are a filterd stack
        }
        if (this.isCurrentSelectionActive()) {
            return false; // we are at the current navigation stop
        }
        // Go to current selection
        await this.navigate();
        return true;
    }
    isCurrentSelectionActive() {
        if (!this.current?.selection) {
            return false; // we need a current selection
        }
        const pane = this.editorService.activeEditorPane;
        if (!isEditorPaneWithSelection(pane)) {
            return false; // we need an active editor pane with selection support
        }
        if (pane.group.id !== this.current.groupId) {
            return false; // we need matching groups
        }
        if (!pane.input || !this.editorHelper.matchesEditor(pane.input, this.current.editor)) {
            return false; // we need matching editors
        }
        const paneSelection = pane.getSelection();
        if (!paneSelection) {
            return false; // we need a selection to compare with
        }
        return (paneSelection.compare(this.current.selection) === 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
    }
    setIndex(newIndex, skipEvent) {
        this.previousIndex = this.index;
        this.index = newIndex;
        // Event
        if (!skipEvent) {
            this._onDidChange.fire();
        }
    }
    async navigate() {
        this.navigating = true;
        try {
            if (this.current) {
                await this.doNavigate(this.current);
            }
        }
        finally {
            this.navigating = false;
        }
    }
    doNavigate(location) {
        let options = Object.create(null);
        // Apply selection if any
        if (location.selection) {
            options = location.selection.restore(options);
        }
        if (isEditorInput(location.editor)) {
            return this.editorService.openEditor(location.editor, options, location.groupId);
        }
        return this.editorService.openEditor({
            ...location.editor,
            options: {
                ...location.editor.options,
                ...options,
            },
        }, location.groupId);
    }
    isNavigating() {
        return this.navigating;
    }
};
EditorNavigationStack = EditorNavigationStack_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, ILogService)
], EditorNavigationStack);
export { EditorNavigationStack };
let EditorHelper = class EditorHelper {
    constructor(uriIdentityService, lifecycleService, fileService, pathService) {
        this.uriIdentityService = uriIdentityService;
        this.lifecycleService = lifecycleService;
        this.fileService = fileService;
        this.pathService = pathService;
    }
    preferResourceEditorInput(editor) {
        const resource = EditorResourceAccessor.getOriginalUri(editor);
        // For now, only prefer well known schemes that we control to prevent
        // issues such as https://github.com/microsoft/vscode/issues/85204
        // from being used as resource inputs
        // resource inputs survive editor disposal and as such are a lot more
        // durable across editor changes and restarts
        const hasValidResourceEditorInputScheme = resource?.scheme === Schemas.file ||
            resource?.scheme === Schemas.vscodeRemote ||
            resource?.scheme === Schemas.vscodeUserData ||
            resource?.scheme === this.pathService.defaultUriScheme;
        // Scheme is valid: prefer the untyped input
        // over the typed input if possible to keep
        // the entry across restarts
        if (hasValidResourceEditorInputScheme) {
            if (isEditorInput(editor)) {
                const untypedInput = editor.toUntyped();
                if (isResourceEditorInput(untypedInput)) {
                    return untypedInput;
                }
            }
            return editor;
        }
        // Scheme is invalid: allow the editor input
        // for as long as it is not disposed
        else {
            return isEditorInput(editor) ? editor : undefined;
        }
    }
    matchesEditor(arg1, inputB) {
        if (arg1 instanceof FileChangesEvent || arg1 instanceof FileOperationEvent) {
            if (isEditorInput(inputB)) {
                return false; // we only support this for `IResourceEditorInputs` that are file based
            }
            if (arg1 instanceof FileChangesEvent) {
                return arg1.contains(inputB.resource, 2 /* FileChangeType.DELETED */);
            }
            return this.matchesFile(inputB.resource, arg1);
        }
        if (isEditorInput(arg1)) {
            if (isEditorInput(inputB)) {
                return arg1.matches(inputB);
            }
            return this.matchesFile(inputB.resource, arg1);
        }
        if (isEditorInput(inputB)) {
            return this.matchesFile(arg1.resource, inputB);
        }
        return arg1 && inputB && this.uriIdentityService.extUri.isEqual(arg1.resource, inputB.resource);
    }
    matchesFile(resource, arg2) {
        if (arg2 instanceof FileChangesEvent) {
            return arg2.contains(resource, 2 /* FileChangeType.DELETED */);
        }
        if (arg2 instanceof FileOperationEvent) {
            return this.uriIdentityService.extUri.isEqualOrParent(resource, arg2.resource);
        }
        if (isEditorInput(arg2)) {
            const inputResource = arg2.resource;
            if (!inputResource) {
                return false;
            }
            if (this.lifecycleService.phase >= 3 /* LifecyclePhase.Restored */ &&
                !this.fileService.hasProvider(inputResource)) {
                return false; // make sure to only check this when workbench has restored (for https://github.com/microsoft/vscode/issues/48275)
            }
            return this.uriIdentityService.extUri.isEqual(inputResource, resource);
        }
        return this.uriIdentityService.extUri.isEqual(arg2?.resource, resource);
    }
    matchesEditorIdentifier(identifier, editorPane) {
        if (!editorPane?.group) {
            return false;
        }
        if (identifier.groupId !== editorPane.group.id) {
            return false;
        }
        return editorPane.input ? identifier.editor.matches(editorPane.input) : false;
    }
    onEditorDispose(editor, listener, mapEditorToDispose) {
        const toDispose = Event.once(editor.onWillDispose)(() => listener());
        let disposables = mapEditorToDispose.get(editor);
        if (!disposables) {
            disposables = new DisposableStore();
            mapEditorToDispose.set(editor, disposables);
        }
        disposables.add(toDispose);
    }
    clearOnEditorDispose(editor, mapEditorToDispose) {
        if (!isEditorInput(editor)) {
            return; // only supported when passing in an actual editor input
        }
        const disposables = mapEditorToDispose.get(editor);
        if (disposables) {
            dispose(disposables);
            mapEditorToDispose.delete(editor);
        }
    }
};
EditorHelper = __decorate([
    __param(0, IUriIdentityService),
    __param(1, ILifecycleService),
    __param(2, IFileService),
    __param(3, IPathService)
], EditorHelper);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaGlzdG9yeS9icm93c2VyL2hpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFHTixzQkFBc0IsRUFJdEIsZ0JBQWdCLEVBRWhCLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUlsQix5QkFBeUIsR0FLekIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFxQixlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsa0JBQWtCLEdBRWxCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUNOLE9BQU8sRUFDUCxVQUFVLEVBQ1YsZUFBZSxHQUVmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixXQUFXLEVBRVgscUJBQXFCLEdBQ3JCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0UsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxXQUFXLEVBQ1gsZUFBZSxHQUNmLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFpQnhELElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVOzthQUdyQiw2QkFBd0IsR0FBRyw2Q0FBNkMsQUFBaEQsQ0FBZ0Q7YUFDeEUsNkJBQXdCLEdBQUcsa0NBQWtDLEFBQXJDLENBQXFDO0lBT3JGLFlBQ2lCLGFBQWlELEVBQzNDLGtCQUF5RCxFQUNyRCxjQUF5RCxFQUNsRSxjQUFnRCxFQUMxQyxvQkFBNEQsRUFDckUsV0FBMEMsRUFDcEMsaUJBQXNELEVBQ25ELG9CQUE0RCxFQUMxRCxhQUF1RCxFQUM1RCxpQkFBc0QsRUFDN0QsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFaMEIsa0JBQWEsR0FBYixhQUFhLENBQW1CO1FBQzFCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUFDcEMsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ2pELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3BELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ25CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN6QyxrQkFBYSxHQUFiLGFBQWEsQ0FBeUI7UUFDM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUM1QyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBaEJyQywwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUN0RSxxQkFBZ0IsR0FBa0MsU0FBUyxDQUFBO1FBb1luRSxZQUFZO1FBRVosK0NBQStDO1FBRTlCLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9FLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUE7UUFFaEYsdUNBQWtDLEdBQXdDLFNBQVMsQ0FBQTtRQUMxRSxzQ0FBaUMsR0FBRyxJQUFJLEdBQUcsRUFHekQsQ0FBQTtRQUNjLGlDQUE0QixHQUFHLElBQUksR0FBRyxFQUdwRCxDQUFBO1FBRUssMEJBQXFCLDJCQUFrQjtRQXFOL0MsWUFBWTtRQUVaLCtDQUErQztRQUV2Qyw2QkFBd0IsR0FBNkMsU0FBUyxDQUFBO1FBQzlFLGtDQUE2QixHQUFHLENBQUMsQ0FBQTtRQUVqQyxvQ0FBK0IsR0FBNkMsU0FBUyxDQUFBO1FBQ3JGLHlDQUFvQyxHQUFHLENBQUMsQ0FBQTtRQUV4Qyx5Q0FBb0MsR0FBRyxLQUFLLENBQUE7UUFDNUMsZ0RBQTJDLEdBQUcsS0FBSyxDQUFBO1FBOEduRCwwQkFBcUIsR0FBNEIsRUFBRSxDQUFBO1FBQ25ELDJCQUFzQixHQUFHLEtBQUssQ0FBQTtRQTRKOUIsWUFBTyxHQUEwRCxTQUFTLENBQUE7UUFFakUsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUE7UUFFaEUsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsSUFBSSxlQUFlLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtZQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxtQkFBbUIsRUFDbkIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNSLFdBQVcsQ0FDVixJQUFJO2dCQUNILENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUF1QixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDOUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXdCLENBQzdELElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFDekIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNULEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDaEQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQ2xELENBQ0QsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVsRixPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUNGLENBQUE7UUF0NEJBLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUUxRSxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQ2pELGlCQUFpQixFQUNqQixLQUFLLEVBQ0wsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDJEQUEyRCxDQUFDLENBQ3hGLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLGFBQWEsQ0FDcEQsb0JBQW9CLEVBQ3BCLEtBQUssRUFDTCxRQUFRLENBQ1Asb0JBQW9CLEVBQ3BCLDhEQUE4RCxDQUM5RCxDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWhDLElBQUksQ0FBQyxzQ0FBc0MsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsc0NBQXNDLEVBQ3RDLEtBQUssRUFDTCxRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLGdGQUFnRixDQUNoRixDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyx5Q0FBeUMsR0FBRyxJQUFJLGFBQWEsQ0FDakUseUNBQXlDLEVBQ3pDLEtBQUssRUFDTCxRQUFRLENBQ1AseUNBQXlDLEVBQ3pDLG1GQUFtRixDQUNuRixDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyw2Q0FBNkMsR0FBRyxJQUFJLGFBQWEsQ0FDckUscUNBQXFDLEVBQ3JDLEtBQUssRUFDTCxRQUFRLENBQ1AscUNBQXFDLEVBQ3JDLDJFQUEyRSxDQUMzRSxDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWhDLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLGFBQWEsQ0FDeEQsZ0NBQWdDLEVBQ2hDLEtBQUssRUFDTCxRQUFRLENBQ1AsZ0NBQWdDLEVBQ2hDLDBFQUEwRSxDQUMxRSxDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLGFBQWEsQ0FDM0QsbUNBQW1DLEVBQ25DLEtBQUssRUFDTCxRQUFRLENBQ1AsbUNBQW1DLEVBQ25DLDZFQUE2RSxDQUM3RSxDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyx1Q0FBdUMsR0FBRyxJQUFJLGFBQWEsQ0FDL0QsK0JBQStCLEVBQy9CLEtBQUssRUFDTCxRQUFRLENBQ1AsK0JBQStCLEVBQy9CLHFFQUFxRSxDQUNyRSxDQUNELENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWhDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLGFBQWEsQ0FDdkQsdUJBQXVCLEVBQ3ZCLEtBQUssRUFDTCxRQUFRLENBQUMsdUJBQXVCLEVBQUUseURBQXlELENBQUMsQ0FDNUYsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFaEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFeEIseUVBQXlFO1FBQ3pFLHVFQUF1RTtRQUN2RSxvRUFBb0U7UUFDcEUsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsNkJBQTZCO1FBQzdCLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1FBRXRDLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsb0NBQW9DLENBQUMsR0FBRyxFQUFFLENBQzVELElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUM1QyxDQUNELENBQUE7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekYsZUFBZTtRQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0YsVUFBVTtRQUNWLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSxnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLENBQUE7UUFFbEQsZUFBZTtRQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLENBQW9CO1FBQzVDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLCtCQUErQjtRQUN0QyxNQUFNLCtCQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxFQUFFO1lBQzFDLCtCQUErQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBRXZDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxnQkFBYyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDakYsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUNwQixJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUNwQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUU7b0JBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7b0JBQy9ELGdCQUFnQixDQUFDLEdBQUcsQ0FDbkIscUJBQXFCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1RCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FDN0IsQ0FDRCxDQUFBO29CQUNELGdCQUFnQixDQUFDLEdBQUcsQ0FDbkIscUJBQXFCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMxRCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FDOUIsQ0FDRCxDQUFBO29CQUVELCtCQUErQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUN0RCxDQUFDLEVBQ0QsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FDekUsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDNUQsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsZ0JBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLDZCQUE2QixFQUFFLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCw2QkFBNkIsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFTyxlQUFlLENBQUMsS0FBaUIsRUFBRSxXQUFvQjtRQUM5RCxvRUFBb0U7UUFDcEUsZ0VBQWdFO1FBQ2hFLG1FQUFtRTtRQUNuRSwrQ0FBK0M7UUFFL0MsUUFBUSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3ZCLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDZCxDQUFDO2dCQUNELE1BQUs7WUFDTixLQUFLLENBQUM7Z0JBQ0wsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdkIsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO2dCQUNqQixDQUFDO2dCQUVELE1BQUs7UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEtBQW1CO1FBQzNDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQTtRQUM3RCxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFBO1FBRTNELElBQ0MsSUFBSSxDQUFDLGdCQUFnQjtZQUNyQixJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxFQUNqRixDQUFDO1lBQ0YsT0FBTSxDQUFDLGdEQUFnRDtRQUN4RCxDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsRUFBRSxLQUFLO1lBQzlDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUU7WUFDeEUsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVaLHdCQUF3QjtRQUN4QixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFbEMsb0VBQW9FO1FBQ3BFLHdFQUF3RTtRQUN4RSxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixxRkFBcUYsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUNySSxDQUFBO1lBRUQsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNsRSxJQUNDLENBQUMsQ0FBQyxJQUFJLG1EQUEwQztvQkFDaEQsQ0FBQyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLO29CQUNuQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQzFELENBQUM7b0JBQ0YsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBRTNCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELDZEQUE2RDtRQUM3RCxJQUFJLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUM3QixnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMzQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNqRSxJQUFJLENBQUMsc0NBQXNDLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsa0VBQWtFLGdCQUFnQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FDbEgsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxlQUFlO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEtBQTRDO1FBQ3BFLGtDQUFrQztRQUNsQyxJQUFJLEtBQUssWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUM7UUFFRCx3Q0FBd0M7YUFDbkMsQ0FBQztZQUNMLFNBQVM7WUFDVCxJQUFJLEtBQUssQ0FBQyxXQUFXLDhCQUFzQixFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkIsQ0FBQztZQUVELE9BQU87aUJBQ0YsSUFBSSxLQUFLLENBQUMsV0FBVyw0QkFBb0IsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2RSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QixDQUFDLEtBQW1CLEVBQUUsVUFBd0I7UUFDN0UsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVPLHNDQUFzQyxDQUM3QyxLQUFtQixFQUNuQixVQUFvQyxFQUNwQyxLQUFzQztRQUV0QyxJQUFJLENBQUMsbURBQW1ELENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRU8sSUFBSSxDQUFDLEtBQXlCO1FBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFLTyxNQUFNLENBQUMsSUFBeUQ7UUFDdkUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsSUFBeUQ7UUFFekQsSUFBSSxRQUFRLEdBQW9CLFNBQVMsQ0FBQTtRQUN6QyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pCLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkQsQ0FBQzthQUFNLElBQUksSUFBSSxZQUFZLGdCQUFnQixFQUFFLENBQUM7WUFDN0MsbUhBQW1IO1FBQ3BILENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDekIsQ0FBQztRQUVELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3hELENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLFVBQVU7UUFDVixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUUxQiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFFbEMsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLENBQUE7UUFFL0IsZUFBZTtRQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFpQkQsaUJBQWlCO1FBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBRW5DLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsdUJBQWUsQ0FBQyxDQUFBO1lBQ3hFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFlBQVksdUJBQWUsQ0FBQyxDQUFBO1lBRTlFLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsNkJBQXFCLENBQUMsQ0FBQTtZQUMzRixJQUFJLENBQUMseUNBQXlDLENBQUMsR0FBRyxDQUNqRCxXQUFXLENBQUMsWUFBWSw2QkFBcUIsQ0FDN0MsQ0FBQTtZQUNELElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxHQUFHLENBQ3JELFdBQVcsQ0FBQyxTQUFTLDZCQUFxQixDQUMxQyxDQUFBO1lBRUQsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyx3QkFBZ0IsQ0FBQyxDQUFBO1lBQ2hGLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFlBQVksd0JBQWdCLENBQUMsQ0FBQTtZQUN0RixJQUFJLENBQUMsdUNBQXVDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxTQUFTLHdCQUFnQixDQUFDLENBQUE7WUFFdkYsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQXFCTywyQ0FBMkM7UUFDbEQsTUFBTSxpQ0FBaUMsR0FBRyxHQUFHLEVBQUU7WUFDOUMsNkNBQTZDO1lBQzdDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1lBRXBDLGVBQWU7WUFDZixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUN6RCxnQkFBYyxDQUFDLHdCQUF3QixDQUN2QyxDQUFBO1lBQ0QsSUFBSSxlQUFlLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsK0JBQXVCLENBQUE7WUFDbEQsQ0FBQztpQkFBTSxJQUFJLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLHFCQUFxQix5QkFBaUIsQ0FBQTtZQUM1QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFCQUFxQiwwQkFBa0IsQ0FBQTtZQUM3QyxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUM1RCxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBYyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDekUsaUNBQWlDLEVBQUUsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELGlDQUFpQyxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUVPLFFBQVEsQ0FDZixLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFDM0MsTUFBTSxHQUFHLEtBQUssQ0FBQyxZQUFZO1FBRTNCLFFBQVEsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDcEMsYUFBYTtZQUNiLDJCQUFtQixDQUFDLENBQUMsQ0FBQztnQkFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNiLE9BQU8sSUFBSSwwQkFBMEIsRUFBRSxDQUFBO2dCQUN4QyxDQUFDO2dCQUVELElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNwRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3JCLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFHckIsQ0FBQTtvQkFDSCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7Z0JBRUQsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUE7Z0JBQzdDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDWixNQUFNLFVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO29CQUV4QyxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FDckIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IseUJBQWlCLENBQ2hGLENBQUE7b0JBQ0QsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBRXRGLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7Z0JBQ2xELENBQUM7Z0JBRUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsbUJBQW1CO1lBQ25CLGlDQUF5QixDQUFDLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFBO2dCQUN2RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtvQkFFeEMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQ3JCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLCtCQUF1QixDQUN0RixDQUFBO29CQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO29CQUV0RixJQUFJLENBQUMsaUNBQWlDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtnQkFDNUUsQ0FBQztnQkFFRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxTQUFTO1lBQ1QsNEJBQW9CLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLENBQUM7b0JBQzlDLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN2RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQiwwQkFBa0IsQ0FDakYsQ0FBQTtvQkFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQ3hELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLEVBQUUsQ0FDN0MsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxJQUFJLENBQUMsa0NBQWtDLENBQUE7WUFDL0MsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUFDLE1BQWlCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQWlCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRU8sMENBQTBDLENBQ2pELEtBQW1CLEVBQ25CLFVBQXdCO1FBRXhCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU8sbURBQW1ELENBQzFELEtBQW1CLEVBQ25CLFVBQW9DLEVBQ3BDLEtBQXNDO1FBRXRDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDNUYsQ0FBQztJQUVPLCtCQUErQixDQUFDLENBQW9CO1FBQzNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2hFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNoQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QixDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsNEJBQTRCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx5Q0FBeUMsQ0FBQyxLQUFtQjtRQUNwRSxTQUFTO1FBQ1QsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFekQsZ0JBQWdCO1FBQ2hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0UsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQjtRQUNsQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFTyxnQ0FBZ0MsQ0FDdkMsSUFBeUQ7UUFFekQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVPLDRCQUE0QixDQUFDLEtBQXlCO1FBQzdELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxFQUE0QztRQUNqRixTQUFTO1FBQ1QsSUFBSSxJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztZQUM3QyxFQUFFLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixLQUFLLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1lBQ2hFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEIsQ0FBQztRQUVELGFBQWE7UUFDYixLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQzdELEtBQUssTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2pDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLFNBQVM7UUFDVCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDbEQsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLFNBQVMsQ0FBQTtRQUVuRCxtQkFBbUI7UUFDbkIsS0FBSyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztZQUNoRSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFOUMsYUFBYTtRQUNiLEtBQUssTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDNUQsS0FBSyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBZUQsMEJBQTBCLENBQUMsT0FBeUI7UUFDbkQsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbEYsT0FBTyxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxPQUF5QjtRQUNqRCxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVsRixPQUFPLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQ0FBb0MsQ0FDakQsZ0JBQStDLEVBQy9DLE9BQXlCO1FBRXpCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLFlBQVksR0FBRyxPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRTlGLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxJQUFJLENBQUE7WUFDakQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQywyQ0FBMkMsR0FBRyxJQUFJLENBQUE7WUFDeEQsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUNWLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO2dCQUMxRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFBO1lBQ3BDLElBQUksQ0FBQztnQkFDSixNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEQsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxLQUFLLENBQUE7Z0JBQ2xELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsMkNBQTJDLEdBQUcsS0FBSyxDQUFBO2dCQUN6RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQzlCLGFBQXdDLEVBQ3hDLE9BQXlCO1FBRXpCLElBQUksT0FBcUMsQ0FBQTtRQUN6QyxJQUFJLEtBQWEsQ0FBQTtRQUVqQixNQUFNLEtBQUssR0FDVixPQUFPLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVwRixnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTztnQkFDTixJQUFJLENBQUMsd0JBQXdCO29CQUM3QixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsMkNBQW1DLENBQUE7WUFDakUsS0FBSyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQTtRQUMzQyxDQUFDO1FBRUQsZUFBZTthQUNWLENBQUM7WUFDTCxPQUFPO2dCQUNOLElBQUksQ0FBQywrQkFBK0I7b0JBQ3BDLEtBQUs7eUJBQ0gsVUFBVSwyQ0FBbUM7eUJBQzdDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNuRCxLQUFLLEdBQUcsSUFBSSxDQUFDLG9DQUFvQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxlQUFlO1FBQ2YsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDYixDQUFDO2FBQU0sSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyw2QkFBNkIsR0FBRyxRQUFRLENBQUE7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsK0JBQStCLEdBQUcsT0FBTyxDQUFBO1lBQzlDLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxRQUFRLENBQUE7UUFDckQsQ0FBQztRQUVELE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLHFDQUFxQztRQUM1QywwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxTQUFTLENBQUE7WUFDekMsSUFBSSxDQUFDLDZCQUE2QixHQUFHLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQseURBQXlEO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsMkNBQTJDLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUMsK0JBQStCLEdBQUcsU0FBUyxDQUFBO1lBQ2hELElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxDQUFDLENBQUE7UUFDOUMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosZ0RBQWdEO2FBRXhCLGdDQUEyQixHQUFHLEVBQUUsQUFBTCxDQUFLO0lBS2hELDhCQUE4QixDQUFDLEtBQXdCO1FBQzlELElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDakMsT0FBTSxDQUFDLFVBQVU7UUFDbEIsQ0FBQztRQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLElBQUksT0FBTyxLQUFLLGtCQUFrQixDQUFDLE9BQU8sSUFBSSxPQUFPLEtBQUssa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkYsT0FBTSxDQUFDLHlDQUF5QztRQUNqRCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3hDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFNLENBQUMseURBQXlEO1FBQ2pFLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFVLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFO1lBQ3BFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLElBQUk7U0FDeEMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDL0IsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7YUFBTSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzNCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRixDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU1Qyx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQztZQUMvQixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsTUFBTSxFQUFFLGFBQWE7WUFDckIsUUFBUSxFQUFFLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7WUFDdkQsbUJBQW1CO1lBQ25CLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDcEIsQ0FBQyxDQUFBO1FBRUYsV0FBVztRQUNYLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxnQkFBYyxDQUFDLDJCQUEyQixFQUFFLENBQUM7WUFDcEYsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25DLENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQjtRQUMzQiw2QkFBNkI7UUFDN0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDekQsSUFBSSx5QkFBeUIsR0FBOEIsU0FBUyxDQUFBO1FBQ3BFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0Qix5QkFBeUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUM1RSxDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUvRSxPQUFPLHlCQUF5QixDQUFBO0lBQ2pDLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsZ0JBQXVDO1FBQzdFLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO1lBQy9CLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLO1lBQzdCLFdBQVcsRUFBRSxJQUFJO1NBQ2pCLENBQUE7UUFFRCxrRUFBa0U7UUFDbEUsZ0VBQWdFO1FBQ2hFLFdBQVc7UUFDWCxJQUNDLENBQUMsZ0JBQWdCLENBQUMsTUFBTTtZQUN2QixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO2dCQUN4QixJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUNyRSxDQUFDO1lBQ0YsT0FBTyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUE7UUFDMUIsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxJQUFJLFVBQVUsR0FBNEIsU0FBUyxDQUFBO1FBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzVFLDREQUE0RDtZQUM1RCx5REFBeUQ7WUFDekQsMkRBQTJEO1lBQzNELDZEQUE2RDtZQUM3RCw2QkFBNkI7WUFFN0IsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtZQUNsQyxJQUFJLENBQUM7Z0JBQ0osVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUM7b0JBQ2hELEdBQUcsZ0JBQWdCLENBQUMsTUFBTTtvQkFDMUIsT0FBTyxFQUFFO3dCQUNSLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE9BQU87d0JBQ2xDLEdBQUcsT0FBTztxQkFDVjtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsMkRBQTJEO1lBQzNELGdFQUFnRTtZQUNoRSw0REFBNEQ7WUFDNUQsaUJBQWlCO1lBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUVwRCxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTywrQkFBK0IsQ0FDdEMsSUFBeUQ7UUFFekQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFO1lBQ3ZGLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzVFLE9BQU8sSUFBSSxDQUFBLENBQUMscUNBQXFDO1lBQ2xELENBQUM7WUFFRCxJQUNDLG9CQUFvQixDQUFDLFFBQVE7Z0JBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFDakUsQ0FBQztnQkFDRixPQUFPLEtBQUssQ0FBQSxDQUFDLGtDQUFrQztZQUNoRCxDQUFDO1lBRUQsSUFDQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQ3BFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUN2RCxFQUNBLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUEsQ0FBQyx5Q0FBeUM7WUFDdkQsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFBLENBQUMsT0FBTztRQUNwQixDQUFDLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDaEYsQ0FBQztJQUVELFlBQVk7SUFFWiwrREFBK0Q7YUFFdkMsc0JBQWlCLEdBQUcsR0FBRyxBQUFOLENBQU07YUFDdkIsd0JBQW1CLEdBQUcsaUJBQWlCLEFBQXBCLENBQW9CO0lBNkJ2RCxpQ0FBaUMsQ0FBQyxVQUF3QjtRQUNqRSxnRkFBZ0Y7UUFDaEYsTUFBTSxNQUFNLEdBQUcsVUFBVSxFQUFFLEtBQUssQ0FBQTtRQUNoQyxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3RFLE9BQU07UUFDUCxDQUFDO1FBRUQscURBQXFEO1FBQ3JELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFTyxZQUFZLENBQUMsTUFBMEMsRUFBRSxXQUFXLEdBQUcsSUFBSTtRQUNsRixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXRDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsOEJBQThCO1FBQzlCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsZ0JBQWMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUcsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQ2hDLE1BQU0sRUFDTixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsWUFBWSxDQUFDLEVBQ3JELElBQUksQ0FBQyxzQkFBc0IsQ0FDM0IsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sNEJBQTRCLENBQUMsTUFBMEM7UUFDOUUsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzQixxRUFBcUU7WUFDckUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMvQixDQUFDO1lBRUQsb0VBQW9FO1lBQ3BFLGlFQUFpRTtZQUNqRSxnRUFBZ0U7WUFDaEUscUJBQXFCO2lCQUNoQixDQUFDO2dCQUNMLE1BQU0sY0FBYyxHQUEyQixFQUFFLENBQUE7Z0JBQ2pELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7b0JBQzFELENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7b0JBQ2xCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNwQyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ3JGLElBQ0MscUJBQXFCLENBQUMsc0JBQXNCLENBQUM7d0JBQzdDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUM1QyxDQUFDO3dCQUNGLGNBQWMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtvQkFDNUMsQ0FBQztnQkFDRixDQUFDO2dCQUVELHdEQUF3RDtnQkFDeEQsb0RBQW9EO2dCQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsMkRBQTJEO1lBQzNELElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE1BQTBDO1FBQ2xFLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUEsQ0FBQyx3QkFBd0I7UUFDckMsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXRDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUM1QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFNUMsNkVBQTZFO1lBQzdFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUMzRSxDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxhQUFhLENBQUMsS0FBeUI7UUFDOUMsSUFBSSxLQUFLLENBQUMsV0FBVyw0QkFBb0IsRUFBRSxDQUFDO1lBQzNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGlCQUFpQixDQUNoQixJQUFnRjtRQUVoRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFFbkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV0QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRTVELDZFQUE2RTtZQUM3RSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO2dCQUN6RSxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2YsQ0FBQztZQUVELE9BQU8sQ0FBQyxPQUFPLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsTUFBMEMsRUFDMUMsR0FBRyxZQUErRDtRQUVsRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXRDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUVwQixNQUFNLFVBQVUsR0FBOEMsRUFBRSxDQUFBO1FBQ2hFLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLHVEQUF1RDtZQUN2RCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwRCw4RUFBOEU7Z0JBQzlFLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO2dCQUUzRSxvQ0FBb0M7Z0JBQ3BDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUE7b0JBQ2hDLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLENBQUM7WUFDRixDQUFDO1lBRUQsMkRBQTJEO1lBQzNELDJCQUEyQjtpQkFDdEIsSUFDSixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUN2RixDQUFDO2dCQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUM7UUFFRCw4REFBOEQ7UUFDOUQsMkRBQTJEO1FBQzNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUE7SUFDMUIsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUVqQixLQUFLLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV0QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVPLG1CQUFtQixDQUMxQixPQUE4RDtRQUU5RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtZQUVqQiw4Q0FBOEM7WUFDOUMsOENBQThDO1lBQzlDLGlEQUFpRDtZQUNqRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ25CLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxDQUFDO2dCQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7b0JBQ1osTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFBO29CQUV2QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ25CLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDTCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXO1FBQ2xCLHNEQUFzRDtRQUN0RCx1REFBdUQ7UUFDdkQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO1FBRWpCLDJDQUEyQztRQUMzQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBRXpELDZDQUE2QztRQUM3QyxnREFBZ0Q7UUFDaEQsUUFBUTtRQUNSLE1BQU0sZ0JBQWdCLEdBQUc7WUFDeEIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsMkNBQW1DO1NBQ25FLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFWCxvREFBb0Q7UUFDcEQsZ0RBQWdEO1FBQ2hELHFEQUFxRDtRQUNyRCxxREFBcUQ7UUFDckQsT0FBTztRQUNQLHVEQUF1RDtRQUV2RCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQTtRQUVsRSwrQkFBK0I7UUFDL0IsS0FBSyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLFNBQVE7WUFDVCxDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNyQixNQUFNLGNBQWMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUN6RSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztvQkFDeEMsU0FBUSxDQUFDLGdCQUFnQjtnQkFDMUIsQ0FBQztnQkFFRCxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELHdEQUF3RDtRQUN4RCxzREFBc0Q7UUFDdEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzFDLE1BQU0sY0FBYyxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFBO1lBQ2xGLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsTUFBTSxPQUFPLEdBQTJCLEVBQUUsQ0FBQTtRQUUxQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDekMsZ0JBQWMsQ0FBQyxtQkFBbUIsaUNBRWxDLENBQUE7UUFDRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQztnQkFDSixNQUFNLGFBQWEsR0FBb0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDN0UsS0FBSyxNQUFNLFdBQVcsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN6RCxTQUFRLENBQUMseUJBQXlCO29CQUNuQyxDQUFDO29CQUVELElBQUksQ0FBQzt3QkFDSixPQUFPLENBQUMsSUFBSSxDQUFDOzRCQUNaLEdBQUcsV0FBVyxDQUFDLE1BQU07NEJBQ3JCLFFBQVEsRUFDUCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVE7Z0NBQzlDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsNERBQTREO2dDQUNyRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLDREQUE0RDt5QkFDdkcsQ0FBQyxDQUFBO29CQUNILENBQUM7b0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQzt3QkFDaEIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxrREFBa0Q7b0JBQzVFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLG1EQUFtRDtZQUM3RSxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLFNBQVM7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNLENBQUMsK0NBQStDO1FBQ3ZELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBb0MsRUFBRSxDQUFBO1FBQ25ELEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDN0QsU0FBUSxDQUFDLG1DQUFtQztZQUM3QyxDQUFDO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixNQUFNLEVBQUU7b0JBQ1AsR0FBRyxNQUFNO29CQUNULFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtpQkFDcEM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLGdCQUFjLENBQUMsbUJBQW1CLEVBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGdFQUd2QixDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWixvQ0FBb0M7SUFFcEMsMEJBQTBCLENBQUMsWUFBcUIsRUFBRSxlQUF3QjtRQUN6RSwwQkFBMEI7UUFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUE7UUFDMUQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7WUFDL0IsSUFDQyxDQUFDLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDO2dCQUNuRCxDQUFDLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssZUFBZSxDQUFDLEVBQzNELENBQUM7Z0JBQ0YsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztZQUVELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN2QyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQixTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksWUFBWSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUM1RCxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksZUFBZSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUNyRSxTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDaEYsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QixPQUFPLGlCQUFpQixDQUFDLEdBQUcsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUE7WUFDM0IsSUFDQyxDQUFDLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDO2dCQUNuRCxDQUFDLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssZUFBZSxDQUFDLEVBQzNELENBQUM7Z0JBQ0YsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsaUJBQWlCLENBQUMsY0FBc0IsRUFBRSxpQkFBMEI7UUFDbkUsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN2QyxJQUFJLFFBQXlCLENBQUE7WUFDN0IsSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsUUFBUSxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1lBQzVFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQTtZQUMxQixDQUFDO1lBRUQsSUFDQyxRQUFRO2dCQUNSLFFBQVEsQ0FBQyxNQUFNLEtBQUssY0FBYztnQkFDbEMsQ0FBQyxDQUFDLGlCQUFpQixJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssaUJBQWlCLENBQUMsRUFDL0QsQ0FBQztnQkFDRixPQUFPLFFBQVEsQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxZQUFZO0lBRUgsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVmLEtBQUssTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDaEUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUM3RCxLQUFLLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUN4RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7O0FBNzBDVyxjQUFjO0lBWXhCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxXQUFXLENBQUE7R0F0QkQsY0FBYyxDQTgwQzFCOztBQUVELGlCQUFpQixDQUFDLGVBQWUsRUFBRSxjQUFjLGtDQUEwQixDQUFBO0FBRTNFLE1BQU0sb0JBQW9CO0lBQ3pCLFlBQ2tCLGdCQUFtQyxFQUMzQyxTQUEyQyxFQUNuQyxNQUFtRDtRQUZuRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQzNDLGNBQVMsR0FBVCxTQUFTLENBQWtDO1FBQ25DLFdBQU0sR0FBTixNQUFNLENBQTZDO0lBQ2xFLENBQUM7SUFFSiwyQkFBMkIsQ0FBQyxLQUEyQjtRQUN0RCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RFLE9BQU8sSUFBSSxDQUFBLENBQUMsa0JBQWtCO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUUsT0FBTyxJQUFJLENBQUEsQ0FBQyxtQkFBbUI7UUFDaEMsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sSUFBSSxDQUFBLENBQUMscUJBQXFCO1FBQ2xDLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFdEQsSUFDQyxNQUFNLHFEQUE2QztZQUNuRCxDQUFDLEtBQUssQ0FBQyxNQUFNLHVEQUErQztnQkFDM0QsS0FBSyxDQUFDLE1BQU0saURBQXlDLENBQUMsRUFDdEQsQ0FBQztZQUNGLGdFQUFnRTtZQUNoRSx1REFBdUQ7WUFDdkQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxNQUFNLHVEQUErQyxDQUFBO0lBQzdELENBQUM7Q0FDRDtBQXdCRCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFTOUMsWUFDa0IsS0FBYyxFQUNTLG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUhVLFVBQUssR0FBTCxLQUFLLENBQVM7UUFDUyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIseUJBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FDMUYsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsMEJBQWtCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FDM0YsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxxQkFBcUIsK0JBRXJCLElBQUksQ0FBQyxLQUFLLENBQ1YsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUU1RSxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzNCLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFDM0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDakMsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBaUI7UUFDN0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBaUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBaUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBaUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBaUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFTyxRQUFRLENBQUMsTUFBTSx3QkFBZ0I7UUFDdEMsUUFBUSxNQUFNLEVBQUUsQ0FBQztZQUNoQjtnQkFDQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7WUFDNUI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO1lBQ3ZCO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsd0JBQXdCLENBQUMsVUFBd0I7UUFDaEQsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELGlDQUFpQyxDQUNoQyxVQUFvQyxFQUNwQyxLQUFzQztRQUV0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQTtRQUU3Qyw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFeEQsa0JBQWtCO1FBQ2xCLElBQUksS0FBSyxDQUFDLE1BQU0saURBQXlDLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLEVBQUU7UUFDRixvRUFBb0U7UUFDcEUsNkRBQTZEO1FBQzdELHdCQUF3QjthQUNuQixJQUNKLENBQUMsS0FBSyxDQUFDLE1BQU0sdURBQStDO1lBQzNELEtBQUssQ0FBQyxNQUFNLGlEQUF5QyxDQUFDO1lBQ3ZELENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsRUFDbkMsQ0FBQztZQUNGLCtEQUErRDtZQUMvRCwrREFBK0Q7WUFDL0QsOERBQThEO1lBQzlELG1EQUFtRDtZQUVuRCxJQUNDLEtBQUssQ0FBQyxNQUFNLGlEQUF5QztnQkFDckQsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLEVBQ3BDLENBQUM7Z0JBQ0YsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzFGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUEyRTtRQUNqRixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQXlCO1FBQzdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBN0lLLHNCQUFzQjtJQVd6QixXQUFBLHFCQUFxQixDQUFBO0dBWGxCLHNCQUFzQixDQTZJM0I7QUFFRCxNQUFNLDBCQUEwQjtJQUFoQztRQUNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQXdCekIsQ0FBQztJQXRCQSxZQUFZO1FBQ1gsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsS0FBSyxDQUFDLFNBQVMsS0FBbUIsQ0FBQztJQUNuQyxTQUFTO1FBQ1IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsS0FBSyxDQUFDLE1BQU0sS0FBbUIsQ0FBQztJQUNoQyxLQUFLLENBQUMsVUFBVSxLQUFtQixDQUFDO0lBQ3BDLFNBQVM7UUFDUixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsTUFBTSxLQUFtQixDQUFDO0lBRWhDLHdCQUF3QixLQUFVLENBQUM7SUFDbkMsaUNBQWlDLEtBQVUsQ0FBQztJQUU1QyxLQUFLLEtBQVUsQ0FBQztJQUNoQixNQUFNLEtBQVUsQ0FBQztJQUNqQixJQUFJLEtBQVUsQ0FBQztJQUVmLE9BQU8sS0FBVSxDQUFDO0NBQ2xCO0FBUU0sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVOzthQUM1QixtQkFBYyxHQUFHLEVBQUUsQUFBTCxDQUFLO0lBbUIzQyxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFZLE9BQU8sQ0FBQyxLQUE4QztRQUNqRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQsWUFDa0IsTUFBZ0IsRUFDaEIsS0FBYyxFQUNSLG9CQUEyQyxFQUNsRCxhQUE4QyxFQUN4QyxrQkFBeUQsRUFDbEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFQVSxXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ2hCLFVBQUssR0FBTCxLQUFLLENBQVM7UUFFRSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUNqRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBakNyQyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFFN0IsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUE7UUFDL0QseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUE7UUFJdkUsVUFBSyxHQUFrQyxFQUFFLENBQUE7UUFFekMsVUFBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ1Ysa0JBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsQixlQUFVLEdBQVksS0FBSyxDQUFBO1FBRTNCLDBCQUFxQixHQUFxQyxTQUFTLENBQUE7UUFzQjFFLElBQUksQ0FBQyxZQUFZLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXJFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVPLFVBQVU7UUFDakIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQTtRQUNoQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE9BQU8sS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2hELFdBQVcsQ0FBQyxJQUFJLENBQ2YsWUFBWSxLQUFLLENBQUMsT0FBTyxhQUFhLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUM5RyxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsQ0FBQyxJQUFJLENBQ2YsWUFBWSxLQUFLLENBQUMsT0FBTyxhQUFhLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsQ0FDNUYsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxpQkFBaUIsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNoRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxpQkFBaUIsSUFBSSxDQUFDLFlBQVksRUFBRTtFQUNwRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNwQixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FDWixHQUFXLEVBQ1gsU0FBZ0UsSUFBSSxFQUNwRSxLQUF1QztRQUV2QyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25ELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxXQUFtQixDQUFBO1FBQ3ZCLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCO2dCQUNDLFdBQVcsR0FBRyxRQUFRLENBQUE7Z0JBQ3RCLE1BQUs7WUFDTjtnQkFDQyxXQUFXLEdBQUcsT0FBTyxDQUFBO2dCQUNyQixNQUFLO1lBQ047Z0JBQ0MsV0FBVyxHQUFHLFlBQVksQ0FBQTtnQkFDMUIsTUFBSztRQUNQLENBQUM7UUFFRCxJQUFJLFVBQWtCLENBQUE7UUFDdEIsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEI7Z0JBQ0MsVUFBVSxHQUFHLFNBQVMsQ0FBQTtnQkFDdEIsTUFBSztZQUNOO2dCQUNDLFVBQVUsR0FBRyxhQUFhLENBQUE7Z0JBQzFCLE1BQUs7WUFDTjtnQkFDQyxVQUFVLEdBQUcsUUFBUSxDQUFBO2dCQUNyQixNQUFLO1FBQ1AsQ0FBQztRQUVELElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixrQkFBa0IsV0FBVyxJQUFJLFVBQVUsTUFBTSxHQUFHLGFBQWEsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsWUFBWSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQ2xJLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtCQUFrQixXQUFXLElBQUksVUFBVSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDOUUsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVLENBQUMsS0FBdUM7UUFDekQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELFFBQVEsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RCO2dCQUNDLE9BQU8sTUFBTSxDQUFBO1lBQ2Q7Z0JBQ0MsT0FBTyxZQUFZLENBQUE7WUFDcEI7Z0JBQ0MsT0FBTyxNQUFNLENBQUE7WUFDZDtnQkFDQyxPQUFPLGNBQWMsQ0FBQTtZQUN0QjtnQkFDQyxPQUFPLE1BQU0sQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsT0FBd0I7UUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsT0FBTyxFQUNQLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3ZELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxDQUF1QjtRQUMvQyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUxQyxJQUFJLElBQUksQ0FBQyxLQUFLLGlDQUF5QixFQUFFLENBQUM7WUFDekMsT0FBTSxDQUFDLGlEQUFpRDtRQUN6RCxDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakMsU0FBUSxDQUFDLDJDQUEyQztZQUNyRCxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzlELFNBQVEsQ0FBQyxxQ0FBcUM7WUFDL0MsQ0FBQztZQUVELHlCQUF5QjtZQUN6QixLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCx3QkFBd0I7SUFFeEIsZ0JBQWdCLENBQ2YsVUFBbUMsRUFDbkMsS0FBdUM7UUFFdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTFELE1BQU0sMEJBQTBCLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDeEUsTUFBTSxjQUFjLEdBQUcsVUFBVSxFQUFFLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFMUUseUVBQXlFO1FBQ3pFLHdFQUF3RTtRQUN4RSx1RUFBdUU7UUFDdkUsa0NBQWtDO1FBQ2xDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsMENBQTBDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUVoRixJQUFJLDBCQUEwQixJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBRTNGLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLG9CQUFvQixDQUNwRCxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUMxRCxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQ3pCLEtBQUssRUFBRSxNQUFNLENBQ2IsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBRTNGLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUEsQ0FBQywyREFBMkQ7WUFDbkcsQ0FBQztRQUNGLENBQUM7UUFFRCxpREFBaUQ7YUFDNUMsQ0FBQztZQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUV2RSwyQ0FBMkM7WUFDM0MsSUFBSSwwQkFBMEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLGdDQUFnQyxDQUNwQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDbkIsVUFBVSxDQUFDLEtBQUssRUFDaEIsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUN6QixLQUFLLENBQ0wsQ0FBQTtZQUNGLENBQUM7WUFFRCx1REFBdUQ7aUJBQ2xELENBQUM7Z0JBQ0wsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQSxDQUFDLHdEQUF3RDtnQkFFL0YsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDaEYsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdDQUFnQyxDQUN2QyxPQUF3QixFQUN4QixNQUFtQixFQUNuQixTQUEyQyxFQUMzQyxLQUF1QztRQUV2QyxJQUNDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxLQUFLLE9BQU87WUFDakMsQ0FBQyxTQUFTO1lBQ1YsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQzNELENBQUM7WUFDRixPQUFNLENBQUMsa0ZBQWtGO1FBQzFGLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvRCxNQUFNLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFOUYsa0ZBQWtGO1FBQ2xGLElBQ0MsQ0FBQyxJQUFJLENBQUMscUJBQXFCO1lBQzNCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsRUFDckUsQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUVELDZEQUE2RDthQUN4RCxDQUFDO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxjQUFjLENBQUE7SUFDNUMsQ0FBQztJQUVPLG1DQUFtQyxDQUFDLE9BQXdCLEVBQUUsTUFBbUI7UUFDeEYsSUFDQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sS0FBSyxPQUFPO1lBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUMzRCxDQUFDO1lBQ0YsT0FBTSxDQUFDLG9EQUFvRDtRQUM1RCxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUUzRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRU8sS0FBSyxDQUNaLE9BQXdCLEVBQ3hCLE1BQTBDLEVBQzFDLFNBQWdDO1FBRWhDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRU8sU0FBUyxDQUNoQixPQUF3QixFQUN4QixNQUEwQyxFQUMxQyxTQUFnQztRQUVoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDeEUsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQ1gsT0FBd0IsRUFDeEIsZUFBbUQsRUFDbkQsU0FBZ0MsRUFDaEMsWUFBc0I7UUFFdEIsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVwQyxvREFBb0Q7UUFDcEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sR0FBRyxJQUFJLENBQUEsQ0FBQyw4QkFBOEI7WUFDOUMsQ0FBQztpQkFBTSxJQUNOLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFDMUYsQ0FBQztnQkFDRixPQUFPLEdBQUcsSUFBSSxDQUFBLENBQUMsMkVBQTJFO1lBQzNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBZ0MsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFBO1FBRWpGLDhCQUE4QjtRQUM5QixNQUFNLGNBQWMsR0FBa0MsRUFBRSxDQUFBO1FBQ3hELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbEIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFBO1FBQzdCLENBQUM7UUFFRCxtQ0FBbUM7YUFDOUIsQ0FBQztZQUNMLGdFQUFnRTtZQUNoRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pELGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO2dCQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDakQsQ0FBQztZQUVELHdCQUF3QjtZQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFFbkQsa0JBQWtCO1lBQ2xCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsdUJBQXFCLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzlELGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUcsQ0FBQyxDQUFBLENBQUMsZUFBZTtnQkFDeEQsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUM3QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1FBQ0YsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxLQUFLLE1BQU0sWUFBWSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN4RixDQUFDO1FBRUQsa0VBQWtFO1FBQ2xFLGdFQUFnRTtRQUNoRSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUNoQyxNQUFNLEVBQ04sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFDekIsSUFBSSxDQUFDLHFCQUFxQixDQUMxQixDQUFBO1FBQ0YsQ0FBQztRQUVELFFBQVE7UUFDUixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsS0FBa0MsRUFDbEMsU0FBc0M7UUFFdEMsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QyxPQUFPLEtBQUssQ0FBQSxDQUFDLGtCQUFrQjtRQUNoQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxLQUFLLENBQUEsQ0FBQyxtQkFBbUI7UUFDakMsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUEsQ0FBQyx3REFBd0Q7UUFDckUsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsT0FBTyxLQUFLLENBQUEsQ0FBQyxnRkFBZ0Y7UUFDOUYsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxPQUFPLENBQ04sS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyx1REFBK0MsQ0FDM0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBeUI7UUFDN0IsSUFBSSxLQUFLLENBQUMsV0FBVyw0QkFBb0IsRUFBRSxDQUFDO1lBQzNDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQTJFO1FBQ2pGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7UUFFM0MsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN4QyxNQUFNLE9BQU8sR0FDWixPQUFPLElBQUksS0FBSyxRQUFRO2dCQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxJQUFJO2dCQUN4QixDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUV2RCxnRUFBZ0U7WUFDaEUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDakYsQ0FBQztZQUVELE9BQU8sQ0FBQyxPQUFPLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLGlCQUFpQixLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0MsT0FBTSxDQUFDLGtCQUFrQjtRQUMxQixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELG9EQUFvRDtRQUNwRCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRWQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFdkIsdUJBQXVCO1FBQ3ZCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUM5QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxRQUFRO1FBQ1IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sT0FBTztRQUNkLE1BQU0sY0FBYyxHQUFrQyxFQUFFLENBQUE7UUFFeEQsSUFBSSxhQUFhLEdBQTRDLFNBQVMsQ0FBQTtRQUN0RSxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLFNBQVEsQ0FBQyxpREFBaUQ7WUFDM0QsQ0FBQztZQUVELGFBQWEsR0FBRyxLQUFLLENBQUE7WUFDckIsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUE7SUFDNUIsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2YsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwQixLQUFLLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBRWxDLEtBQUssTUFBTSxDQUFDLEVBQUUsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDeEQsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BCLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFZixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0lBRUQsWUFBWTtJQUVaLG9CQUFvQjtJQUVwQixZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVM7UUFDZCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDMUIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0IsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTTtRQUNYLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQzdDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM3QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVU7UUFDZixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTTtRQUNQLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNqQyxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO1FBQzNCLG1EQUFtRDtRQUNuRCxtREFBbUQ7UUFDbkQsb0RBQW9EO1FBQ3BELGlEQUFpRDtRQUNqRCxTQUFTO1FBRVQsSUFBSSxJQUFJLENBQUMsTUFBTSwwQkFBa0IsRUFBRSxDQUFDO1lBQ25DLE9BQU8sS0FBSyxDQUFBLENBQUMsNENBQTRDO1FBQzFELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLENBQUM7WUFDckMsT0FBTyxLQUFLLENBQUEsQ0FBQyx3Q0FBd0M7UUFDdEQsQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUVyQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDOUIsT0FBTyxLQUFLLENBQUEsQ0FBQyw4QkFBOEI7UUFDNUMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDaEQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxLQUFLLENBQUEsQ0FBQyx1REFBdUQ7UUFDckUsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEtBQUssQ0FBQSxDQUFDLDBCQUEwQjtRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN0RixPQUFPLEtBQUssQ0FBQSxDQUFDLDJCQUEyQjtRQUN6QyxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPLEtBQUssQ0FBQSxDQUFDLHNDQUFzQztRQUNwRCxDQUFDO1FBRUQsT0FBTyxDQUNOLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsdURBQStDLENBQzVGLENBQUE7SUFDRixDQUFDO0lBRU8sUUFBUSxDQUFDLFFBQWdCLEVBQUUsU0FBbUI7UUFDckQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFBO1FBRXJCLFFBQVE7UUFDUixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUFRO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBRXRCLElBQUksQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BDLENBQUM7UUFDRixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFVBQVUsQ0FBQyxRQUFxQztRQUN2RCxJQUFJLE9BQU8sR0FBbUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVqRCx5QkFBeUI7UUFDekIsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEIsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FDbkM7WUFDQyxHQUFHLFFBQVEsQ0FBQyxNQUFNO1lBQ2xCLE9BQU8sRUFBRTtnQkFDUixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTztnQkFDMUIsR0FBRyxPQUFPO2FBQ1Y7U0FDRCxFQUNELFFBQVEsQ0FBQyxPQUFPLENBQ2hCLENBQUE7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDOztBQTNwQlcscUJBQXFCO0lBaUMvQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLFdBQVcsQ0FBQTtHQXBDRCxxQkFBcUIsQ0E4cEJqQzs7QUFFRCxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0lBQ2pCLFlBQ3VDLGtCQUF1QyxFQUN6QyxnQkFBbUMsRUFDeEMsV0FBeUIsRUFDekIsV0FBeUI7UUFIbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN6QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3hDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3RELENBQUM7SUFPSix5QkFBeUIsQ0FDeEIsTUFBMEM7UUFFMUMsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlELHFFQUFxRTtRQUNyRSxrRUFBa0U7UUFDbEUscUNBQXFDO1FBQ3JDLHFFQUFxRTtRQUNyRSw2Q0FBNkM7UUFDN0MsTUFBTSxpQ0FBaUMsR0FDdEMsUUFBUSxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtZQUNqQyxRQUFRLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZO1lBQ3pDLFFBQVEsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLGNBQWM7WUFDM0MsUUFBUSxFQUFFLE1BQU0sS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFBO1FBRXZELDRDQUE0QztRQUM1QywyQ0FBMkM7UUFDM0MsNEJBQTRCO1FBQzVCLElBQUksaUNBQWlDLEVBQUUsQ0FBQztZQUN2QyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMzQixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUE7Z0JBQ3ZDLElBQUkscUJBQXFCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztvQkFDekMsT0FBTyxZQUFZLENBQUE7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBRUQsNENBQTRDO1FBQzVDLG9DQUFvQzthQUMvQixDQUFDO1lBQ0wsT0FBTyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQWdGLEVBQ2hGLE1BQTBDO1FBRTFDLElBQUksSUFBSSxZQUFZLGdCQUFnQixJQUFJLElBQUksWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQzVFLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sS0FBSyxDQUFBLENBQUMsdUVBQXVFO1lBQ3JGLENBQUM7WUFFRCxJQUFJLElBQUksWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsaUNBQXlCLENBQUE7WUFDOUQsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9DLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pCLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM1QixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELE9BQU8sSUFBSSxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRUQsV0FBVyxDQUNWLFFBQWEsRUFDYixJQUFnRjtRQUVoRixJQUFJLElBQUksWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLGlDQUF5QixDQUFBO1FBQ3ZELENBQUM7UUFFRCxJQUFJLElBQUksWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBRUQsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ25DLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsSUFDQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxtQ0FBMkI7Z0JBQ3RELENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQzNDLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUEsQ0FBQyxrSEFBa0g7WUFDaEksQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVELHVCQUF1QixDQUFDLFVBQTZCLEVBQUUsVUFBd0I7UUFDOUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxPQUFPLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQzlFLENBQUM7SUFFRCxlQUFlLENBQ2QsTUFBbUIsRUFDbkIsUUFBa0IsRUFDbEIsa0JBQXFEO1FBRXJELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFcEUsSUFBSSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUNuQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFFRCxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxvQkFBb0IsQ0FDbkIsTUFBa0YsRUFDbEYsa0JBQXFEO1FBRXJELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFNLENBQUMsd0RBQXdEO1FBQ2hFLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEIsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFKSyxZQUFZO0lBRWYsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxZQUFZLENBQUE7R0FMVCxZQUFZLENBMEpqQiJ9