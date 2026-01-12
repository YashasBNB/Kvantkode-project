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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9oaXN0b3J5L2Jyb3dzZXIvaGlzdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUdOLHNCQUFzQixFQUl0QixnQkFBZ0IsRUFFaEIscUJBQXFCLEVBQ3JCLGFBQWEsRUFDYix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBSWxCLHlCQUF5QixHQUt6QixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQXFCLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3pFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsWUFBWSxFQUVaLG9CQUFvQixFQUNwQixrQkFBa0IsR0FFbEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sT0FBTyxFQUNQLFVBQVUsRUFDVixlQUFlLEdBRWYsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDL0Ys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