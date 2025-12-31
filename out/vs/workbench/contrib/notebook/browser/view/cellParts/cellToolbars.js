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
import * as DOM from '../../../../../../base/browser/dom.js';
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { createActionViewItem, getActionBarActions, MenuEntryActionViewItem, } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction, } from '../../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { CodiconActionViewItem } from './cellActionView.js';
import { CellOverlayPart } from '../cellPart.js';
import { registerCellToolbarStickyScroll } from './cellToolbarStickyScroll.js';
import { WorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { createInstantHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
let BetweenCellToolbar = class BetweenCellToolbar extends CellOverlayPart {
    constructor(_notebookEditor, _titleToolbarContainer, _bottomCellToolbarContainer, instantiationService, contextMenuService, contextKeyService, menuService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._bottomCellToolbarContainer = _bottomCellToolbarContainer;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
    }
    _initialize() {
        if (this._betweenCellToolbar) {
            return this._betweenCellToolbar;
        }
        const betweenCellToolbar = this._register(new ToolBar(this._bottomCellToolbarContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    if (this._notebookEditor.notebookOptions.getDisplayOptions().insertToolbarAlignment ===
                        'center') {
                        return this.instantiationService.createInstance(CodiconActionViewItem, action, {
                            hoverDelegate: options.hoverDelegate,
                        });
                    }
                    else {
                        return this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                            hoverDelegate: options.hoverDelegate,
                        });
                    }
                }
                return undefined;
            },
        }));
        this._betweenCellToolbar = betweenCellToolbar;
        const menu = this._register(this.menuService.createMenu(this._notebookEditor.creationOptions.menuIds.cellInsertToolbar, this.contextKeyService));
        const updateActions = () => {
            const actions = getCellToolbarActions(menu);
            betweenCellToolbar.setActions(actions.primary, actions.secondary);
        };
        this._register(menu.onDidChange(() => updateActions()));
        this._register(this._notebookEditor.notebookOptions.onDidChangeOptions((e) => {
            if (e.insertToolbarAlignment) {
                updateActions();
            }
        }));
        updateActions();
        return betweenCellToolbar;
    }
    didRenderCell(element) {
        const betweenCellToolbar = this._initialize();
        if (this._notebookEditor.hasModel()) {
            betweenCellToolbar.context = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                source: 'insertToolbar',
                $mid: 13 /* MarshalledId.NotebookCellActionContext */,
            };
        }
        this.updateInternalLayoutNow(element);
    }
    updateInternalLayoutNow(element) {
        const bottomToolbarOffset = element.layoutInfo.bottomToolbarOffset;
        this._bottomCellToolbarContainer.style.transform = `translateY(${bottomToolbarOffset}px)`;
    }
};
BetweenCellToolbar = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IMenuService)
], BetweenCellToolbar);
export { BetweenCellToolbar };
let CellTitleToolbarPart = class CellTitleToolbarPart extends CellOverlayPart {
    get hasActions() {
        if (!this._model) {
            return false;
        }
        return (this._model.actions.primary.length +
            this._model.actions.secondary.length +
            this._model.deleteActions.primary.length +
            this._model.deleteActions.secondary.length >
            0);
    }
    constructor(toolbarContainer, _rootClassDelegate, toolbarId, deleteToolbarId, _notebookEditor, contextKeyService, menuService, instantiationService) {
        super();
        this.toolbarContainer = toolbarContainer;
        this._rootClassDelegate = _rootClassDelegate;
        this.toolbarId = toolbarId;
        this.deleteToolbarId = deleteToolbarId;
        this._notebookEditor = _notebookEditor;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.instantiationService = instantiationService;
        this._onDidUpdateActions = this._register(new Emitter());
        this.onDidUpdateActions = this._onDidUpdateActions.event;
    }
    _initializeModel() {
        if (this._model) {
            return this._model;
        }
        const titleMenu = this._register(this.menuService.createMenu(this.toolbarId, this.contextKeyService));
        const deleteMenu = this._register(this.menuService.createMenu(this.deleteToolbarId, this.contextKeyService));
        const actions = getCellToolbarActions(titleMenu);
        const deleteActions = getCellToolbarActions(deleteMenu);
        this._model = {
            titleMenu,
            actions,
            deleteMenu,
            deleteActions,
        };
        return this._model;
    }
    _initialize(model, element) {
        if (this._view) {
            return this._view;
        }
        const hoverDelegate = this._register(createInstantHoverDelegate());
        const toolbar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, this.toolbarContainer, {
            actionViewItemProvider: (action, options) => {
                return createActionViewItem(this.instantiationService, action, options);
            },
            renderDropdownAsChildElement: true,
            hoverDelegate,
        }));
        const deleteToolbar = this._register(this.instantiationService.invokeFunction((accessor) => createDeleteToolbar(accessor, this.toolbarContainer, hoverDelegate, 'cell-delete-toolbar')));
        if (model.deleteActions.primary.length !== 0 || model.deleteActions.secondary.length !== 0) {
            deleteToolbar.setActions(model.deleteActions.primary, model.deleteActions.secondary);
        }
        this.setupChangeListeners(toolbar, model.titleMenu, model.actions);
        this.setupChangeListeners(deleteToolbar, model.deleteMenu, model.deleteActions);
        this._view = {
            toolbar,
            deleteToolbar,
        };
        return this._view;
    }
    prepareRenderCell(element) {
        this._initializeModel();
    }
    didRenderCell(element) {
        const model = this._initializeModel();
        const view = this._initialize(model, element);
        this.cellDisposables.add(registerCellToolbarStickyScroll(this._notebookEditor, element, this.toolbarContainer, {
            extraOffset: 4,
            min: -14,
        }));
        if (this._notebookEditor.hasModel()) {
            const toolbarContext = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                source: 'cellToolbar',
                $mid: 13 /* MarshalledId.NotebookCellActionContext */,
            };
            this.updateContext(view, toolbarContext);
        }
    }
    updateContext(view, toolbarContext) {
        view.toolbar.context = toolbarContext;
        view.deleteToolbar.context = toolbarContext;
    }
    setupChangeListeners(toolbar, menu, initActions) {
        // #103926
        let dropdownIsVisible = false;
        let deferredUpdate;
        this.updateActions(toolbar, initActions);
        this._register(menu.onDidChange(() => {
            if (dropdownIsVisible) {
                const actions = getCellToolbarActions(menu);
                deferredUpdate = () => this.updateActions(toolbar, actions);
                return;
            }
            const actions = getCellToolbarActions(menu);
            this.updateActions(toolbar, actions);
        }));
        this._rootClassDelegate.toggle('cell-toolbar-dropdown-active', false);
        this._register(toolbar.onDidChangeDropdownVisibility((visible) => {
            dropdownIsVisible = visible;
            this._rootClassDelegate.toggle('cell-toolbar-dropdown-active', visible);
            if (deferredUpdate && !visible) {
                disposableTimeout(() => {
                    deferredUpdate?.();
                }, 0, this._store);
                deferredUpdate = undefined;
            }
        }));
    }
    updateActions(toolbar, actions) {
        const hadFocus = DOM.isAncestorOfActiveElement(toolbar.getElement());
        toolbar.setActions(actions.primary, actions.secondary);
        if (hadFocus) {
            this._notebookEditor.focus();
        }
        if (actions.primary.length || actions.secondary.length) {
            this._rootClassDelegate.toggle('cell-has-toolbar-actions', true);
            this._onDidUpdateActions.fire();
        }
        else {
            this._rootClassDelegate.toggle('cell-has-toolbar-actions', false);
            this._onDidUpdateActions.fire();
        }
    }
};
CellTitleToolbarPart = __decorate([
    __param(5, IContextKeyService),
    __param(6, IMenuService),
    __param(7, IInstantiationService)
], CellTitleToolbarPart);
export { CellTitleToolbarPart };
function getCellToolbarActions(menu) {
    return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), (g) => /^inline/.test(g));
}
function createDeleteToolbar(accessor, container, hoverDelegate, elementClass) {
    const contextMenuService = accessor.get(IContextMenuService);
    const keybindingService = accessor.get(IKeybindingService);
    const instantiationService = accessor.get(IInstantiationService);
    const toolbar = new ToolBar(container, contextMenuService, {
        getKeyBinding: (action) => keybindingService.lookupKeybinding(action.id),
        actionViewItemProvider: (action, options) => {
            return createActionViewItem(instantiationService, action, options);
        },
        renderDropdownAsChildElement: true,
        hoverDelegate,
    });
    if (elementClass) {
        toolbar.getElement().classList.add(elementClass);
    }
    return toolbar;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFRvb2xiYXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsVG9vbGJhcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFBO0FBR3ZFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLHVCQUF1QixHQUV2QixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFFTixZQUFZLEVBRVosY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSwwQkFB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