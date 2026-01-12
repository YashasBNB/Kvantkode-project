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
import { Event } from '../../../../base/common/event.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { EditorPane } from './editorPane.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
/**
 * Base class of editors that want to store and restore view state.
 */
let AbstractEditorWithViewState = class AbstractEditorWithViewState extends EditorPane {
    constructor(id, group, viewStateStorageKey, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService) {
        super(id, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.groupListener = this._register(new MutableDisposable());
        this.viewState = this.getEditorMemento(editorGroupService, textResourceConfigurationService, viewStateStorageKey, 100);
    }
    setEditorVisible(visible) {
        // Listen to close events to trigger `onWillCloseEditorInGroup`
        this.groupListener.value = this.group.onWillCloseEditor((e) => this.onWillCloseEditor(e));
        super.setEditorVisible(visible);
    }
    onWillCloseEditor(e) {
        const editor = e.editor;
        if (editor === this.input) {
            // React to editors closing to preserve or clear view state. This needs to happen
            // in the `onWillCloseEditor` because at that time the editor has not yet
            // been disposed and we can safely persist the view state.
            this.updateEditorViewState(editor);
        }
    }
    clearInput() {
        // Preserve current input view state before clearing
        this.updateEditorViewState(this.input);
        super.clearInput();
    }
    saveState() {
        // Preserve current input view state before shutting down
        this.updateEditorViewState(this.input);
        super.saveState();
    }
    updateEditorViewState(input) {
        if (!input || !this.tracksEditorViewState(input)) {
            return; // ensure we have an input to handle view state for
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // we need a resource
        }
        // If we are not tracking disposed editor view state
        // make sure to clear the view state once the editor
        // is disposed.
        if (!this.tracksDisposedEditorViewState()) {
            if (!this.editorViewStateDisposables) {
                this.editorViewStateDisposables = new Map();
            }
            if (!this.editorViewStateDisposables.has(input)) {
                this.editorViewStateDisposables.set(input, Event.once(input.onWillDispose)(() => {
                    this.clearEditorViewState(resource, this.group);
                    this.editorViewStateDisposables?.delete(input);
                }));
            }
        }
        // Clear the editor view state if:
        // - the editor view state should not be tracked for disposed editors
        // - the user configured to not restore view state unless the editor is still opened in the group
        if ((input.isDisposed() && !this.tracksDisposedEditorViewState()) ||
            (!this.shouldRestoreEditorViewState(input) && !this.group.contains(input))) {
            this.clearEditorViewState(resource, this.group);
        }
        // Otherwise we save the view state
        else if (!input.isDisposed()) {
            this.saveEditorViewState(resource);
        }
    }
    shouldRestoreEditorViewState(input, context) {
        // new editor: check with workbench.editor.restoreViewState setting
        if (context?.newInGroup) {
            return this.textResourceConfigurationService.getValue(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            }), 'workbench.editor.restoreViewState') === false
                ? false
                : true; /* restore by default */
        }
        // existing editor: always restore viewstate
        return true;
    }
    getViewState() {
        const input = this.input;
        if (!input || !this.tracksEditorViewState(input)) {
            return; // need valid input for view state
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // need a resource for finding view state
        }
        return this.computeEditorViewState(resource);
    }
    saveEditorViewState(resource) {
        const editorViewState = this.computeEditorViewState(resource);
        if (!editorViewState) {
            return;
        }
        this.viewState.saveEditorState(this.group, resource, editorViewState);
    }
    loadEditorViewState(input, context) {
        if (!input) {
            return undefined; // we need valid input
        }
        if (!this.tracksEditorViewState(input)) {
            return undefined; // not tracking for input
        }
        if (!this.shouldRestoreEditorViewState(input, context)) {
            return undefined; // not enabled for input
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // need a resource for finding view state
        }
        return this.viewState.loadEditorState(this.group, resource);
    }
    moveEditorViewState(source, target, comparer) {
        return this.viewState.moveEditorState(source, target, comparer);
    }
    clearEditorViewState(resource, group) {
        this.viewState.clearEditorState(resource, group);
    }
    dispose() {
        super.dispose();
        if (this.editorViewStateDisposables) {
            for (const [, disposables] of this.editorViewStateDisposables) {
                disposables.dispose();
            }
            this.editorViewStateDisposables = undefined;
        }
    }
    /**
     * Whether view state should be tracked even when the editor is
     * disposed.
     *
     * Subclasses should override this if the input can be restored
     * from the resource at a later point, e.g. if backed by files.
     */
    tracksDisposedEditorViewState() {
        return false;
    }
};
AbstractEditorWithViewState = __decorate([
    __param(3, ITelemetryService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IThemeService),
    __param(8, IEditorService),
    __param(9, IEditorGroupsService)
], AbstractEditorWithViewState);
export { AbstractEditorWithViewState };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2l0aFZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvcldpdGhWaWV3U3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFJTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdyRjs7R0FFRztBQUNJLElBQWUsMkJBQTJCLEdBQTFDLE1BQWUsMkJBQThDLFNBQVEsVUFBVTtJQU9yRixZQUNDLEVBQVUsRUFDVixLQUFtQixFQUNuQixtQkFBMkIsRUFDUixnQkFBbUMsRUFDL0Isb0JBQThELEVBQ3BFLGNBQStCLEVBRWhELGdDQUFzRixFQUN2RSxZQUEyQixFQUMxQixhQUFnRCxF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