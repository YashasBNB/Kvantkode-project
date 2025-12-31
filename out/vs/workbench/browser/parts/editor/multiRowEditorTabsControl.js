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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlSb3dFZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9tdWx0aVJvd0VkaXRvclRhYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVFsRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix3QkFBd0IsR0FDeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUlwRCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFNcEQsWUFDa0IsTUFBbUIsRUFDcEMsZUFBaUMsRUFDaEIsVUFBNkIsRUFDN0IsU0FBMkIsRUFDM0IsS0FBZ0MsRUFDVCxvQkFBMkM7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFQVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBRW5CLGVBQVUsR0FBVixVQUFVLENBQW1CO1FBQzdCLGNBQVMsR0FBVCxTQUFTLENBQWtCO1FBQzNCLFVBQUssR0FBTCxLQUFLLENBQTJCO1FBQ1QseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLElB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