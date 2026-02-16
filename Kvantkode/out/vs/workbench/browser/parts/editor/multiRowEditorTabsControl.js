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
import { Dimension } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MultiEditorTabsControl } from './multiEditorTabsControl.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { StickyEditorGroupModel, UnstickyEditorGroupModel, } from '../../../common/editor/filteredEditorGroupModel.js';
let MultiRowEditorControl = class MultiRowEditorControl extends Disposable {
    constructor(parent, editorPartsView, groupsView, groupView, model, instantiationService) {
        super();
        this.parent = parent;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.model = model;
        this.instantiationService = instantiationService;
        const stickyModel = this._register(new StickyEditorGroupModel(this.model));
        const unstickyModel = this._register(new UnstickyEditorGroupModel(this.model));
        this.stickyEditorTabsControl = this._register(this.instantiationService.createInstance(MultiEditorTabsControl, this.parent, editorPartsView, this.groupsView, this.groupView, stickyModel));
        this.unstickyEditorTabsControl = this._register(this.instantiationService.createInstance(MultiEditorTabsControl, this.parent, editorPartsView, this.groupsView, this.groupView, unstickyModel));
        this.handleTabBarsStateChange();
    }
    handleTabBarsStateChange() {
        this.activeControl = this.model.activeEditor
            ? this.getEditorTabsController(this.model.activeEditor)
            : undefined;
        this.handleTabBarsLayoutChange();
    }
    handleTabBarsLayoutChange() {
        if (this.groupView.count === 0) {
            // Do nothing as no tab bar is visible
            return;
        }
        const hadTwoTabBars = this.parent.classList.contains('two-tab-bars');
        const hasTwoTabBars = this.groupView.count !== this.groupView.stickyCount && this.groupView.stickyCount > 0;
        // Ensure action toolbar is only visible once
        this.parent.classList.toggle('two-tab-bars', hasTwoTabBars);
        if (hadTwoTabBars !== hasTwoTabBars) {
            this.groupView.relayout();
        }
    }
    didActiveControlChange() {
        return (this.activeControl !==
            (this.model.activeEditor ? this.getEditorTabsController(this.model.activeEditor) : undefined));
    }
    getEditorTabsController(editor) {
        return this.model.isSticky(editor)
            ? this.stickyEditorTabsControl
            : this.unstickyEditorTabsControl;
    }
    openEditor(editor, options) {
        const didActiveControlChange = this.didActiveControlChange();
        const didOpenEditorChange = this.getEditorTabsController(editor).openEditor(editor, options);
        const didChange = didOpenEditorChange || didActiveControlChange;
        if (didChange) {
            this.handleOpenedEditors();
        }
        return didChange;
    }
    openEditors(editors) {
        const stickyEditors = editors.filter((e) => this.model.isSticky(e));
        const unstickyEditors = editors.filter((e) => !this.model.isSticky(e));
        const didActiveControlChange = this.didActiveControlChange();
        const didChangeOpenEditorsSticky = this.stickyEditorTabsControl.openEditors(stickyEditors);
        const didChangeOpenEditorsUnSticky = this.unstickyEditorTabsControl.openEditors(unstickyEditors);
        const didChange = didChangeOpenEditorsSticky || didChangeOpenEditorsUnSticky || didActiveControlChange;
        if (didChange) {
            this.handleOpenedEditors();
        }
        return didChange;
    }
    handleOpenedEditors() {
        this.handleTabBarsStateChange();
    }
    beforeCloseEditor(editor) {
        this.getEditorTabsController(editor).beforeCloseEditor(editor);
    }
    closeEditor(editor) {
        // Has to be called on both tab bars as the editor could be either sticky or not
        this.stickyEditorTabsControl.closeEditor(editor);
        this.unstickyEditorTabsControl.closeEditor(editor);
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        const stickyEditors = editors.filter((e) => this.model.isSticky(e));
        const unstickyEditors = editors.filter((e) => !this.model.isSticky(e));
        this.stickyEditorTabsControl.closeEditors(stickyEditors);
        this.unstickyEditorTabsControl.closeEditors(unstickyEditors);
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        this.handleTabBarsStateChange();
    }
    moveEditor(editor, fromIndex, targetIndex, stickyStateChange) {
        if (stickyStateChange) {
            // If sticky state changes, move editor between tab bars
            if (this.model.isSticky(editor)) {
                this.stickyEditorTabsControl.openEditor(editor);
                this.unstickyEditorTabsControl.closeEditor(editor);
            }
            else {
                this.stickyEditorTabsControl.closeEditor(editor);
                this.unstickyEditorTabsControl.openEditor(editor);
            }
            this.handleTabBarsStateChange();
        }
        else {
            if (this.model.isSticky(editor)) {
                this.stickyEditorTabsControl.moveEditor(editor, fromIndex, targetIndex, stickyStateChange);
            }
            else {
                this.unstickyEditorTabsControl.moveEditor(editor, fromIndex - this.model.stickyCount, targetIndex - this.model.stickyCount, stickyStateChange);
            }
        }
    }
    pinEditor(editor) {
        this.getEditorTabsController(editor).pinEditor(editor);
    }
    stickEditor(editor) {
        this.unstickyEditorTabsControl.closeEditor(editor);
        this.stickyEditorTabsControl.openEditor(editor);
        this.handleTabBarsStateChange();
    }
    unstickEditor(editor) {
        this.stickyEditorTabsControl.closeEditor(editor);
        this.unstickyEditorTabsControl.openEditor(editor);
        this.handleTabBarsStateChange();
    }
    setActive(isActive) {
        this.stickyEditorTabsControl.setActive(isActive);
        this.unstickyEditorTabsControl.setActive(isActive);
    }
    updateEditorSelections() {
        this.stickyEditorTabsControl.updateEditorSelections();
        this.unstickyEditorTabsControl.updateEditorSelections();
    }
    updateEditorLabel(editor) {
        this.getEditorTabsController(editor).updateEditorLabel(editor);
    }
    updateEditorDirty(editor) {
        this.getEditorTabsController(editor).updateEditorDirty(editor);
    }
    updateOptions(oldOptions, newOptions) {
        this.stickyEditorTabsControl.updateOptions(oldOptions, newOptions);
        this.unstickyEditorTabsControl.updateOptions(oldOptions, newOptions);
    }
    layout(dimensions) {
        const stickyDimensions = this.stickyEditorTabsControl.layout(dimensions);
        const unstickyAvailableDimensions = {
            container: dimensions.container,
            available: new Dimension(dimensions.available.width, dimensions.available.height - stickyDimensions.height),
        };
        const unstickyDimensions = this.unstickyEditorTabsControl.layout(unstickyAvailableDimensions);
        return new Dimension(dimensions.container.width, stickyDimensions.height + unstickyDimensions.height);
    }
    getHeight() {
        return this.stickyEditorTabsControl.getHeight() + this.unstickyEditorTabsControl.getHeight();
    }
    dispose() {
        this.parent.classList.toggle('two-tab-bars', false);
        super.dispose();
    }
};
MultiRowEditorControl = __decorate([
    __param(5, IInstantiationService)
], MultiRowEditorControl);
export { MultiRowEditorControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlSb3dFZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL211bHRpUm93RWRpdG9yVGFic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBUWxHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHdCQUF3QixHQUN4QixNQUFNLG9EQUFvRCxDQUFBO0FBSXBELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQU1wRCxZQUNrQixNQUFtQixFQUNwQyxlQUFpQyxFQUNoQixVQUE2QixFQUM3QixTQUEyQixFQUMzQixLQUFnQyxFQUNULG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQVBVLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFbkIsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7UUFDN0IsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDM0IsVUFBSyxHQUFMLEtBQUssQ0FBMkI7UUFDVCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxD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