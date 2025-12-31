/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Composite } from '../../composite.js';
import { isEditorInput, } from '../../../common/editor.js';
import { LRUCache } from '../../../../base/common/map.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from './editor.js';
import { joinPath, isEqual } from '../../../../base/common/resources.js';
import { indexOfPath } from '../../../../base/common/extpath.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getWindowById } from '../../../../base/browser/dom.js';
/**
 * The base class of editors in the workbench. Editors register themselves for specific editor inputs.
 * Editors are layed out in the editor part of the workbench in editor groups. Multiple editors can be
 * open at the same time. Each editor has a minimized representation that is good enough to provide some
 * information about the state of the editor data.
 *
 * The workbench will keep an editor alive after it has been created and show/hide it based on
 * user interaction. The lifecycle of a editor goes in the order:
 *
 * - `createEditor()`
 * - `setEditorVisible()`
 * - `layout()`
 * - `setInput()`
 * - `focus()`
 * - `dispose()`: when the editor group the editor is in closes
 *
 * During use of the workbench, a editor will often receive a `clearInput()`, `setEditorVisible()`, `layout()` and
 * `focus()` calls, but only one `create()` and `dispose()` call.
 *
 * This class is only intended to be subclassed and not instantiated.
 */
export class EditorPane extends Composite {
    //#endregion
    static { this.EDITOR_MEMENTOS = new Map(); }
    get minimumWidth() {
        return DEFAULT_EDITOR_MIN_DIMENSIONS.width;
    }
    get maximumWidth() {
        return DEFAULT_EDITOR_MAX_DIMENSIONS.width;
    }
    get minimumHeight() {
        return DEFAULT_EDITOR_MIN_DIMENSIONS.height;
    }
    get maximumHeight() {
        return DEFAULT_EDITOR_MAX_DIMENSIONS.height;
    }
    get input() {
        return this._input;
    }
    get options() {
        return this._options;
    }
    get window() {
        return getWindowById(this.group.windowId, true).window;
    }
    /**
     * Should be overridden by editors that have their own ScopedContextKeyService
     */
    get scopedContextKeyService() {
        return undefined;
    }
    constructor(id, group, telemetryService, themeService, storageService) {
        super(id, telemetryService, themeService, storageService);
        this.group = group;
        //#region Events
        this.onDidChangeSizeConstraints = Event.None;
        this._onDidChangeControl = this._register(new Emitter());
        this.onDidChangeControl = this._onDidChangeControl.event;
    }
    create(parent) {
        super.create(parent);
        // Create Editor
        this.createEditor(parent);
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Sets the given input with the options to the editor. The input is guaranteed
     * to be different from the previous input that was set using the `input.matches()`
     * method.
     *
     * The provided context gives more information around how the editor was opened.
     *
     * The provided cancellation token should be used to test if the operation
     * was cancelled.
     */
    async setInput(input, options, context, token) {
        this._input = input;
        this._options = options;
    }
    /**
     * Called to indicate to the editor that the input should be cleared and
     * resources associated with the input should be freed.
     *
     * This method can be called based on different contexts, e.g. when opening
     * a different input or different editor control or when closing all editors
     * in a group.
     *
     * To monitor the lifecycle of editor inputs, you should not rely on this
     * method, rather refer to the listeners on `IEditorGroup` via `IEditorGroupsService`.
     */
    clearInput() {
        this._input = undefined;
        this._options = undefined;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Sets the given options to the editor. Clients should apply the options
     * to the current input.
     */
    setOptions(options) {
        this._options = options;
    }
    setVisible(visible) {
        super.setVisible(visible);
        // Propagate to Editor
        this.setEditorVisible(visible);
    }
    /**
     * Indicates that the editor control got visible or hidden.
     *
     * @param visible the state of visibility of this editor
     */
    setEditorVisible(visible) {
        // Subclasses can implement
    }
    setBoundarySashes(_sashes) {
        // Subclasses can implement
    }
    getEditorMemento(editorGroupService, configurationService, key, limit = 10) {
        const mementoKey = `${this.getId()}${key}`;
        let editorMemento = EditorPane.EDITOR_MEMENTOS.get(mementoKey);
        if (!editorMemento) {
            editorMemento = this._register(new EditorMemento(this.getId(), key, this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */), limit, editorGroupService, configurationService));
            EditorPane.EDITOR_MEMENTOS.set(mementoKey, editorMemento);
        }
        return editorMemento;
    }
    getViewState() {
        // Subclasses to override
        return undefined;
    }
    saveState() {
        // Save all editor memento for this editor type
        for (const [, editorMemento] of EditorPane.EDITOR_MEMENTOS) {
            if (editorMemento.id === this.getId()) {
                editorMemento.saveState();
            }
        }
        super.saveState();
    }
    dispose() {
        this._input = undefined;
        this._options = undefined;
        super.dispose();
    }
}
export class EditorMemento extends Disposable {
    static { this.SHARED_EDITOR_STATE = -1; } // pick a number < 0 to be outside group id range
    constructor(id, key, memento, limit, editorGroupService, configurationService) {
        super();
        this.id = id;
        this.key = key;
        this.memento = memento;
        this.limit = limit;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.cleanedUp = false;
        this.shareEditorState = false;
        this.updateConfiguration(undefined);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.updateConfiguration(e)));
    }
    updateConfiguration(e) {
        if (!e || e.affectsConfiguration(undefined, 'workbench.editor.sharedViewState')) {
            this.shareEditorState =
                this.configurationService.getValue(undefined, 'workbench.editor.sharedViewState') === true;
        }
    }
    saveEditorState(group, resourceOrEditor, state) {
        const resource = this.doGetResource(resourceOrEditor);
        if (!resource || !group) {
            return; // we are not in a good state to save any state for a resource
        }
        const cache = this.doLoad();
        // Ensure mementos for resource map
        let mementosForResource = cache.get(resource.toString());
        if (!mementosForResource) {
            mementosForResource = Object.create(null);
            cache.set(resource.toString(), mementosForResource);
        }
        // Store state for group
        mementosForResource[group.id] = state;
        // Store state as most recent one based on settings
        if (this.shareEditorState) {
            mementosForResource[EditorMemento.SHARED_EDITOR_STATE] = state;
        }
        // Automatically clear when editor input gets disposed if any
        if (isEditorInput(resourceOrEditor)) {
            this.clearEditorStateOnDispose(resource, resourceOrEditor);
        }
    }
    loadEditorState(group, resourceOrEditor) {
        const resource = this.doGetResource(resourceOrEditor);
        if (!resource || !group) {
            return; // we are not in a good state to load any state for a resource
        }
        const cache = this.doLoad();
        const mementosForResource = cache.get(resource.toString());
        if (mementosForResource) {
            const mementoForResourceAndGroup = mementosForResource[group.id];
            // Return state for group if present
            if (mementoForResourceAndGroup) {
                return mementoForResourceAndGroup;
            }
            // Return most recent state based on settings otherwise
            if (this.shareEditorState) {
                return mementosForResource[EditorMemento.SHARED_EDITOR_STATE];
            }
        }
        return undefined;
    }
    clearEditorState(resourceOrEditor, group) {
        if (isEditorInput(resourceOrEditor)) {
            this.editorDisposables?.delete(resourceOrEditor);
        }
        const resource = this.doGetResource(resourceOrEditor);
        if (resource) {
            const cache = this.doLoad();
            // Clear state for group
            if (group) {
                const mementosForResource = cache.get(resource.toString());
                if (mementosForResource) {
                    delete mementosForResource[group.id];
                    if (isEmptyObject(mementosForResource)) {
                        cache.delete(resource.toString());
                    }
                }
            }
            // Clear state across all groups for resource
            else {
                cache.delete(resource.toString());
            }
        }
    }
    clearEditorStateOnDispose(resource, editor) {
        if (!this.editorDisposables) {
            this.editorDisposables = new Map();
        }
        if (!this.editorDisposables.has(editor)) {
            this.editorDisposables.set(editor, Event.once(editor.onWillDispose)(() => {
                this.clearEditorState(resource);
                this.editorDisposables?.delete(editor);
            }));
        }
    }
    moveEditorState(source, target, comparer) {
        const cache = this.doLoad();
        // We need a copy of the keys to not iterate over
        // newly inserted elements.
        const cacheKeys = [...cache.keys()];
        for (const cacheKey of cacheKeys) {
            const resource = URI.parse(cacheKey);
            if (!comparer.isEqualOrParent(resource, source)) {
                continue; // not matching our resource
            }
            // Determine new resulting target resource
            let targetResource;
            if (isEqual(source, resource)) {
                targetResource = target; // file got moved
            }
            else {
                const index = indexOfPath(resource.path, source.path);
                targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
            }
            // Don't modify LRU state
            const value = cache.get(cacheKey, 0 /* Touch.None */);
            if (value) {
                cache.delete(cacheKey);
                cache.set(targetResource.toString(), value);
            }
        }
    }
    doGetResource(resourceOrEditor) {
        if (isEditorInput(resourceOrEditor)) {
            return resourceOrEditor.resource;
        }
        return resourceOrEditor;
    }
    doLoad() {
        if (!this.cache) {
            this.cache = new LRUCache(this.limit);
            // Restore from serialized map state
            const rawEditorMemento = this.memento[this.key];
            if (Array.isArray(rawEditorMemento)) {
                this.cache.fromJSON(rawEditorMemento);
            }
        }
        return this.cache;
    }
    saveState() {
        const cache = this.doLoad();
        // Cleanup once during session
        if (!this.cleanedUp) {
            this.cleanUp();
            this.cleanedUp = true;
        }
        this.memento[this.key] = cache.toJSON();
    }
    cleanUp() {
        const cache = this.doLoad();
        // Remove groups from states that no longer exist. Since we modify the
        // cache and its is a LRU cache make a copy to ensure iteration succeeds
        const entries = [...cache.entries()];
        for (const [resource, mapGroupToMementos] of entries) {
            for (const group of Object.keys(mapGroupToMementos)) {
                const groupId = Number(group);
                if (groupId === EditorMemento.SHARED_EDITOR_STATE && this.shareEditorState) {
                    continue; // skip over shared entries if sharing is enabled
                }
                if (!this.editorGroupService.getGroup(groupId)) {
                    delete mapGroupToMementos[groupId];
                    if (isEmptyObject(mapGroupToMementos)) {
                        cache.delete(resource);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBS04sYUFBYSxHQUNiLE1BQU0sMkJBQTJCLENBQUE7QUFjbEMsT0FBTyxFQUFFLFFBQVEsRUFBUyxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFMUYsT0FBTyxFQUFFLFFBQVEsRUFBVyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBUTlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUvRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSCxNQUFNLE9BQWdCLFVBQVcsU0FBUSxTQUFTO0lBUWpELFlBQVk7YUFFWSxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUE4QixBQUF4QyxDQUF3QztJQUUvRSxJQUFJLFlBQVk7UUFDZixPQUFPLDZCQUE2QixDQUFDLEtBQUssQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsSUFBSSxZQUFZO1FBQ2YsT0FB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