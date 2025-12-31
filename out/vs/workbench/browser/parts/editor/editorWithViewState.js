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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2l0aFZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JXaXRoVmlld1N0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBSU4sc0JBQXNCLEVBQ3RCLGdCQUFnQixHQUNoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHckY7O0dBRUc7QUFDSSxJQUFlLDJCQUEyQixHQUExQyxNQUFlLDJCQUE4QyxTQUFRLFVBQVU7SUFPckYsWUFDQyxFQUFVLEVBQ1YsS0FBbUIsRUFDbkIsbUJBQTJCLEVBQ1IsZ0JBQW1DLEVBQy9CLG9CQUE4RCxFQUNwRSxjQUErQixFQUVoRCxnQ0FBc0YsRUFDdkUsWUFBMkIsRUFDMUIsYUFBZ0QsRUFDMUMs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