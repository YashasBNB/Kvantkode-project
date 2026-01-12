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
import './media/editortitlecontrol.css';
import { $, Dimension, clearNode } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { BreadcrumbsControl, BreadcrumbsControlFactory } from './breadcrumbsControl.js';
import { MultiEditorTabsControl } from './multiEditorTabsControl.js';
import { SingleEditorTabsControl } from './singleEditorTabsControl.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { MultiRowEditorControl } from './multiRowEditorTabsControl.js';
import { NoEditorTabsControl } from './noEditorTabsControl.js';
let EditorTitleControl = class EditorTitleControl extends Themable {
    get breadcrumbsControl() {
        return this.breadcrumbsControlFactory?.control;
    }
    constructor(parent, editorPartsView, groupsView, groupView, model, instantiationService, themeService) {
        super(themeService);
        this.parent = parent;
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.model = model;
        this.instantiationService = instantiationService;
        this.editorTabsControlDisposable = this._register(new DisposableStore());
        this.breadcrumbsControlDisposables = this._register(new DisposableStore());
        this.editorTabsControl = this.createEditorTabsControl();
        this.breadcrumbsControlFactory = this.createBreadcrumbsControl();
    }
    createEditorTabsControl() {
        let tabsControlType;
        switch (this.groupsView.partOptions.showTabs) {
            case 'none':
                tabsControlType = NoEditorTabsControl;
                break;
            case 'single':
                tabsControlType = SingleEditorTabsControl;
                break;
            case 'multiple':
            default:
                tabsControlType = this.groupsView.partOptions.pinnedTabsOnSeparateRow
                    ? MultiRowEditorControl
                    : MultiEditorTabsControl;
                break;
        }
        const control = this.instantiationService.createInstance(tabsControlType, this.parent, this.editorPartsView, this.groupsView, this.groupView, this.model);
        return this.editorTabsControlDisposable.add(control);
    }
    createBreadcrumbsControl() {
        if (this.groupsView.partOptions.showTabs === 'single') {
            return undefined; // Single tabs have breadcrumbs inlined. No tabs have no breadcrumbs.
        }
        // Breadcrumbs container
        const breadcrumbsContainer = $('.breadcrumbs-below-tabs');
        this.parent.appendChild(breadcrumbsContainer);
        const breadcrumbsControlFactory = this.breadcrumbsControlDisposables.add(this.instantiationService.createInstance(BreadcrumbsControlFactory, breadcrumbsContainer, this.groupView, {
            showFileIcons: true,
            showSymbolIcons: true,
            showDecorationColors: false,
            showPlaceholder: true,
            dragEditor: false,
        }));
        // Breadcrumbs enablement & visibility change have an impact on layout
        // so we need to relayout the editor group when that happens.
        this.breadcrumbsControlDisposables.add(breadcrumbsControlFactory.onDidEnablementChange(() => this.groupView.relayout()));
        this.breadcrumbsControlDisposables.add(breadcrumbsControlFactory.onDidVisibilityChange(() => this.groupView.relayout()));
        return breadcrumbsControlFactory;
    }
    openEditor(editor, options) {
        const didChange = this.editorTabsControl.openEditor(editor, options);
        this.handleOpenedEditors(didChange);
    }
    openEditors(editors) {
        const didChange = this.editorTabsControl.openEditors(editors);
        this.handleOpenedEditors(didChange);
    }
    handleOpenedEditors(didChange) {
        if (didChange) {
            this.breadcrumbsControl?.update();
        }
        else {
            this.breadcrumbsControl?.revealLast();
        }
    }
    beforeCloseEditor(editor) {
        return this.editorTabsControl.beforeCloseEditor(editor);
    }
    closeEditor(editor) {
        this.editorTabsControl.closeEditor(editor);
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.editorTabsControl.closeEditors(editors);
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        if (!this.groupView.activeEditor) {
            this.breadcrumbsControl?.update();
        }
    }
    moveEditor(editor, fromIndex, targetIndex, stickyStateChange) {
        return this.editorTabsControl.moveEditor(editor, fromIndex, targetIndex, stickyStateChange);
    }
    pinEditor(editor) {
        return this.editorTabsControl.pinEditor(editor);
    }
    stickEditor(editor) {
        return this.editorTabsControl.stickEditor(editor);
    }
    unstickEditor(editor) {
        return this.editorTabsControl.unstickEditor(editor);
    }
    setActive(isActive) {
        return this.editorTabsControl.setActive(isActive);
    }
    updateEditorSelections() {
        this.editorTabsControl.updateEditorSelections();
    }
    updateEditorLabel(editor) {
        return this.editorTabsControl.updateEditorLabel(editor);
    }
    updateEditorDirty(editor) {
        return this.editorTabsControl.updateEditorDirty(editor);
    }
    updateOptions(oldOptions, newOptions) {
        // Update editor tabs control if options changed
        if (oldOptions.showTabs !== newOptions.showTabs ||
            (newOptions.showTabs !== 'single' &&
                oldOptions.pinnedTabsOnSeparateRow !== newOptions.pinnedTabsOnSeparateRow)) {
            // Clear old
            this.editorTabsControlDisposable.clear();
            this.breadcrumbsControlDisposables.clear();
            clearNode(this.parent);
            // Create new
            this.editorTabsControl = this.createEditorTabsControl();
            this.breadcrumbsControlFactory = this.createBreadcrumbsControl();
        }
        // Forward into editor tabs control
        else {
            this.editorTabsControl.updateOptions(oldOptions, newOptions);
        }
    }
    layout(dimensions) {
        // Layout tabs control
        const tabsControlDimension = this.editorTabsControl.layout(dimensions);
        // Layout breadcrumbs if visible
        let breadcrumbsControlDimension = undefined;
        if (this.breadcrumbsControl?.isHidden() === false) {
            breadcrumbsControlDimension = new Dimension(dimensions.container.width, BreadcrumbsControl.HEIGHT);
            this.breadcrumbsControl.layout(breadcrumbsControlDimension);
        }
        return new Dimension(dimensions.container.width, tabsControlDimension.height +
            (breadcrumbsControlDimension ? breadcrumbsControlDimension.height : 0));
    }
    getHeight() {
        const tabsControlHeight = this.editorTabsControl.getHeight();
        const breadcrumbsControlHeight = this.breadcrumbsControl?.isHidden() === false ? BreadcrumbsControl.HEIGHT : 0;
        return {
            total: tabsControlHeight + breadcrumbsControlHeight,
            offset: tabsControlHeight,
        };
    }
};
EditorTitleControl = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService)
], EditorTitleControl);
export { EditorTitleControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGl0bGVDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yVGl0bGVDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQVN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFldkQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxRQUFRO0lBTS9DLElBQVksa0JBQWtCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQTtJQUMvQyxDQUFDO0lBRUQsWUFDa0IsTUFBbUIsRUFDbkIsZUFBaUMsRUFDakMsVUFBNkIsRUFDN0IsU0FBMkIsRUFDM0IsS0FBZ0MsRUFDMUIsb0JBQW1ELEVBQzNELFlBQTJCO1FB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