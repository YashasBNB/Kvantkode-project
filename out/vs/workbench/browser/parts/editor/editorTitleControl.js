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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGl0bGVDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclRpdGxlQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFTdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBZXZELElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsUUFBUTtJQU0vQyxJQUFZLGtCQUFrQjtRQUM3QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLENBQUE7SUFDL0MsQ0FBQztJQUVELFlBQ2tCLE1BQW1CLEVBQ25CLGVBQWlDLEVBQ2pDLFVBQTZCLEVBQzdCLFNBQTJCLEVBQzNCLEtBQWdDLEVBQzFCLG9CQUFtRCxFQUMzRCxZQUEyQjtRQUUxQyxL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