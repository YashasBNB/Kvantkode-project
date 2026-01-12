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
import * as DOM from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { ToolBar } from '../../../../../base/browser/ui/toolbar/toolbar.js';
import { Separator } from '../../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem, } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, SubmenuItemAction, } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { NOTEBOOK_EDITOR_ID, NotebookSetting } from '../../common/notebookCommon.js';
import { NotebooKernelActionViewItem } from './notebookKernelView.js';
import { ActionViewWithLabel, UnifiedSubmenuActionView } from '../view/cellParts/cellActionView.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { disposableTimeout } from '../../../../../base/common/async.js';
import { WorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
export var RenderLabel;
(function (RenderLabel) {
    RenderLabel[RenderLabel["Always"] = 0] = "Always";
    RenderLabel[RenderLabel["Never"] = 1] = "Never";
    RenderLabel[RenderLabel["Dynamic"] = 2] = "Dynamic";
})(RenderLabel || (RenderLabel = {}));
export function convertConfiguration(value) {
    switch (value) {
        case true:
            return RenderLabel.Always;
        case false:
            return RenderLabel.Never;
        case 'always':
            return RenderLabel.Always;
        case 'never':
            return RenderLabel.Never;
        case 'dynamic':
            return RenderLabel.Dynamic;
    }
}
const ICON_ONLY_ACTION_WIDTH = 21;
const TOGGLE_MORE_ACTION_WIDTH = 21;
const ACTION_PADDING = 8;
class WorkbenchAlwaysLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(ActionViewWithLabel, action, {
                hoverDelegate: options.hoverDelegate,
            });
        }
        if (action instanceof SubmenuItemAction &&
            action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
            return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, true, {
                getActions: () => {
                    return (this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ??
                        []);
                },
            }, this.actionProvider.bind(this));
        }
        return undefined;
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map((a) => a.action),
            secondaryActions: actionOutput.secondaryActions,
        };
    }
}
class WorkbenchNeverLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                hoverDelegate: options.hoverDelegate,
            });
        }
        if (action instanceof SubmenuItemAction) {
            if (action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, false, {
                    getActions: () => {
                        return (this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ??
                            []);
                    },
                }, this.actionProvider.bind(this));
            }
            else {
                return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, {
                    hoverDelegate: options.hoverDelegate,
                });
            }
        }
        return undefined;
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map((a) => a.action),
            secondaryActions: actionOutput.secondaryActions,
        };
    }
}
class WorkbenchDynamicLabelStrategy {
    constructor(notebookEditor, editorToolbar, goToMenu, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.editorToolbar = editorToolbar;
        this.goToMenu = goToMenu;
        this.instantiationService = instantiationService;
    }
    actionProvider(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            //	this is being disposed by the consumer
            return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
        }
        const a = this.editorToolbar.primaryActions.find((a) => a.action.id === action.id);
        if (!a || a.renderLabel) {
            if (action instanceof MenuItemAction) {
                return this.instantiationService.createInstance(ActionViewWithLabel, action, {
                    hoverDelegate: options.hoverDelegate,
                });
            }
            if (action instanceof SubmenuItemAction &&
                action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, true, {
                    getActions: () => {
                        return (this.goToMenu.getActions().find(([group]) => group === 'navigation/execute')?.[1] ??
                            []);
                    },
                }, this.actionProvider.bind(this));
            }
            return undefined;
        }
        else {
            if (action instanceof MenuItemAction) {
                this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                    hoverDelegate: options.hoverDelegate,
                });
            }
            if (action instanceof SubmenuItemAction) {
                if (action.item.submenu.id === MenuId.NotebookCellExecuteGoTo.id) {
                    return this.instantiationService.createInstance(UnifiedSubmenuActionView, action, { hoverDelegate: options.hoverDelegate }, false, {
                        getActions: () => {
                            return (this.goToMenu
                                .getActions()
                                .find(([group]) => group === 'navigation/execute')?.[1] ?? []);
                        },
                    }, this.actionProvider.bind(this));
                }
                else {
                    return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, {
                        hoverDelegate: options.hoverDelegate,
                    });
                }
            }
            return undefined;
        }
    }
    calculateActions(leftToolbarContainerMaxWidth) {
        const initialPrimaryActions = this.editorToolbar.primaryActions;
        const initialSecondaryActions = this.editorToolbar.secondaryActions;
        const actionOutput = workbenchDynamicCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth);
        return {
            primaryActions: actionOutput.primaryActions.map((a) => a.action),
            secondaryActions: actionOutput.secondaryActions,
        };
    }
}
let NotebookEditorWorkbenchToolbar = class NotebookEditorWorkbenchToolbar extends Disposable {
    get primaryActions() {
        return this._primaryActions;
    }
    get secondaryActions() {
        return this._secondaryActions;
    }
    set visible(visible) {
        if (this._visible !== visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
    }
    get useGlobalToolbar() {
        return this._useGlobalToolbar;
    }
    constructor(notebookEditor, contextKeyService, notebookOptions, domNode, instantiationService, configurationService, contextMenuService, menuService, editorService, keybindingService, experimentService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyService = contextKeyService;
        this.notebookOptions = notebookOptions;
        this.domNode = domNode;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.experimentService = experimentService;
        this._useGlobalToolbar = false;
        this._renderLabel = RenderLabel.Always;
        this._visible = false;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._dimension = null;
        this._primaryActions = [];
        this._secondaryActions = [];
        this._buildBody();
        this._register(Event.debounce(this.editorService.onDidActiveEditorChange, (last, _current) => last, 200)(this._updatePerEditorChange, this));
        this._registerNotebookActionsToolbar();
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.CONTEXT_MENU, (e) => {
            const event = new StandardMouseEvent(DOM.getWindow(this.domNode), e);
            this.contextMenuService.showContextMenu({
                menuId: MenuId.NotebookToolbarContext,
                getAnchor: () => event,
            });
        }));
    }
    _buildBody() {
        this._notebookTopLeftToolbarContainer = document.createElement('div');
        this._notebookTopLeftToolbarContainer.classList.add('notebook-toolbar-left');
        this._leftToolbarScrollable = new DomScrollableElement(this._notebookTopLeftToolbarContainer, {
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            horizontal: 3 /* ScrollbarVisibility.Visible */,
            horizontalScrollbarSize: 3,
            useShadows: false,
            scrollYToX: true,
        });
        this._register(this._leftToolbarScrollable);
        DOM.append(this.domNode, this._leftToolbarScrollable.getDomNode());
        this._notebookTopRightToolbarContainer = document.createElement('div');
        this._notebookTopRightToolbarContainer.classList.add('notebook-toolbar-right');
        DOM.append(this.domNode, this._notebookTopRightToolbarContainer);
    }
    _updatePerEditorChange() {
        if (this.editorService.activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
            const notebookEditor = this.editorService.activeEditorPane.getControl();
            if (notebookEditor === this.notebookEditor) {
                // this is the active editor
                this._showNotebookActionsinEditorToolbar();
                return;
            }
        }
    }
    _registerNotebookActionsToolbar() {
        this._notebookGlobalActionsMenu = this._register(this.menuService.createMenu(this.notebookEditor.creationOptions.menuIds.notebookToolbar, this.contextKeyService));
        this._executeGoToActionsMenu = this._register(this.menuService.createMenu(MenuId.NotebookCellExecuteGoTo, this.contextKeyService));
        this._useGlobalToolbar = this.notebookOptions.getDisplayOptions().globalToolbar;
        this._renderLabel = this._convertConfiguration(this.configurationService.getValue(NotebookSetting.globalToolbarShowLabel));
        this._updateStrategy();
        const context = {
            ui: true,
            notebookEditor: this.notebookEditor,
            source: 'notebookToolbar',
        };
        const actionProvider = (action, options) => {
            if (action.id === SELECT_KERNEL_ID) {
                // this is being disposed by the consumer
                return this.instantiationService.createInstance(NotebooKernelActionViewItem, action, this.notebookEditor, options);
            }
            if (this._renderLabel !== RenderLabel.Never) {
                const a = this._primaryActions.find((a) => a.action.id === action.id);
                if (a && a.renderLabel) {
                    return action instanceof MenuItemAction
                        ? this.instantiationService.createInstance(ActionViewWithLabel, action, {
                            hoverDelegate: options.hoverDelegate,
                        })
                        : undefined;
                }
                else {
                    return action instanceof MenuItemAction
                        ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                            hoverDelegate: options.hoverDelegate,
                        })
                        : undefined;
                }
            }
            else {
                return action instanceof MenuItemAction
                    ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                        hoverDelegate: options.hoverDelegate,
                    })
                    : undefined;
            }
        };
        // Make sure both toolbars have the same hover delegate for instant hover to work
        // Due to the elements being further apart than normal toolbars, the default time limit is to short and has to be increased
        const hoverDelegate = this._register(this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, {}));
        hoverDelegate.setInstantHoverTimeLimit(600);
        const leftToolbarOptions = {
            hiddenItemStrategy: 1 /* HiddenItemStrategy.RenderInSecondaryGroup */,
            resetMenu: MenuId.NotebookToolbar,
            actionViewItemProvider: (action, options) => {
                return this._strategy.actionProvider(action, options);
            },
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            renderDropdownAsChildElement: true,
            hoverDelegate,
        };
        this._notebookLeftToolbar = this.instantiationService.createInstance(WorkbenchToolBar, this._notebookTopLeftToolbarContainer, leftToolbarOptions);
        this._register(this._notebookLeftToolbar);
        this._notebookLeftToolbar.context = context;
        this._notebookRightToolbar = new ToolBar(this._notebookTopRightToolbarContainer, this.contextMenuService, {
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            actionViewItemProvider: actionProvider,
            renderDropdownAsChildElement: true,
            hoverDelegate,
        });
        this._register(this._notebookRightToolbar);
        this._notebookRightToolbar.context = context;
        this._showNotebookActionsinEditorToolbar();
        let dropdownIsVisible = false;
        let deferredUpdate;
        this._register(this._notebookGlobalActionsMenu.onDidChange(() => {
            if (dropdownIsVisible) {
                deferredUpdate = () => this._showNotebookActionsinEditorToolbar();
                return;
            }
            if (this.notebookEditor.isVisible) {
                this._showNotebookActionsinEditorToolbar();
            }
        }));
        this._register(this._notebookLeftToolbar.onDidChangeDropdownVisibility((visible) => {
            dropdownIsVisible = visible;
            if (deferredUpdate && !visible) {
                setTimeout(() => {
                    deferredUpdate?.();
                }, 0);
                deferredUpdate = undefined;
            }
        }));
        this._register(this.notebookOptions.onDidChangeOptions((e) => {
            if (e.globalToolbar !== undefined) {
                this._useGlobalToolbar = this.notebookOptions.getDisplayOptions().globalToolbar;
                this._showNotebookActionsinEditorToolbar();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.globalToolbarShowLabel)) {
                this._renderLabel = this._convertConfiguration(this.configurationService.getValue(NotebookSetting.globalToolbarShowLabel));
                this._updateStrategy();
                const oldElement = this._notebookLeftToolbar.getElement();
                oldElement.remove();
                this._notebookLeftToolbar.dispose();
                this._notebookLeftToolbar = this.instantiationService.createInstance(WorkbenchToolBar, this._notebookTopLeftToolbarContainer, leftToolbarOptions);
                this._register(this._notebookLeftToolbar);
                this._notebookLeftToolbar.context = context;
                this._showNotebookActionsinEditorToolbar();
                return;
            }
        }));
        if (this.experimentService) {
            this.experimentService.getTreatment('nbtoolbarineditor').then((treatment) => {
                if (treatment === undefined) {
                    return;
                }
                if (this._useGlobalToolbar !== treatment) {
                    this._useGlobalToolbar = treatment;
                    this._showNotebookActionsinEditorToolbar();
                }
            });
        }
    }
    _updateStrategy() {
        switch (this._renderLabel) {
            case RenderLabel.Always:
                this._strategy = new WorkbenchAlwaysLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
            case RenderLabel.Never:
                this._strategy = new WorkbenchNeverLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
            case RenderLabel.Dynamic:
                this._strategy = new WorkbenchDynamicLabelStrategy(this.notebookEditor, this, this._executeGoToActionsMenu, this.instantiationService);
                break;
        }
    }
    _convertConfiguration(value) {
        switch (value) {
            case true:
                return RenderLabel.Always;
            case false:
                return RenderLabel.Never;
            case 'always':
                return RenderLabel.Always;
            case 'never':
                return RenderLabel.Never;
            case 'dynamic':
                return RenderLabel.Dynamic;
        }
    }
    _showNotebookActionsinEditorToolbar() {
        // when there is no view model, just ignore.
        if (!this.notebookEditor.hasModel()) {
            this._deferredActionUpdate?.dispose();
            this._deferredActionUpdate = undefined;
            this.visible = false;
            return;
        }
        if (this._deferredActionUpdate) {
            return;
        }
        if (!this._useGlobalToolbar) {
            this.domNode.style.display = 'none';
            this._deferredActionUpdate = undefined;
            this.visible = false;
        }
        else {
            this._deferredActionUpdate = disposableTimeout(async () => {
                await this._setNotebookActions();
                this.visible = true;
                this._deferredActionUpdate?.dispose();
                this._deferredActionUpdate = undefined;
            }, 50);
        }
    }
    async _setNotebookActions() {
        const groups = this._notebookGlobalActionsMenu.getActions({
            shouldForwardArgs: true,
            renderShortTitle: true,
        });
        this.domNode.style.display = 'flex';
        const primaryLeftGroups = groups.filter((group) => /^navigation/.test(group[0]));
        const primaryActions = [];
        primaryLeftGroups
            .sort((a, b) => {
            if (a[0] === 'navigation') {
                return 1;
            }
            if (b[0] === 'navigation') {
                return -1;
            }
            return 0;
        })
            .forEach((group, index) => {
            primaryActions.push(...group[1]);
            if (index < primaryLeftGroups.length - 1) {
                primaryActions.push(new Separator());
            }
        });
        const primaryRightGroup = groups.find((group) => /^status/.test(group[0]));
        const primaryRightActions = primaryRightGroup ? primaryRightGroup[1] : [];
        const secondaryActions = groups
            .filter((group) => !/^navigation/.test(group[0]) && !/^status/.test(group[0]))
            .reduce((prev, curr) => {
            prev.push(...curr[1]);
            return prev;
        }, []);
        this._notebookLeftToolbar.setActions([], []);
        this._primaryActions = primaryActions.map((action) => ({
            action: action,
            size: action instanceof Separator ? 1 : 0,
            renderLabel: true,
            visible: true,
        }));
        this._notebookLeftToolbar.setActions(primaryActions, secondaryActions);
        this._secondaryActions = secondaryActions;
        this._notebookRightToolbar.setActions(primaryRightActions, []);
        this._secondaryActions = secondaryActions;
        if (this._dimension && this._dimension.width >= 0 && this._dimension.height >= 0) {
            this._cacheItemSizes(this._notebookLeftToolbar);
        }
        this._computeSizes();
    }
    _cacheItemSizes(toolbar) {
        for (let i = 0; i < toolbar.getItemsLength(); i++) {
            const action = toolbar.getItemAction(i);
            if (action && action.id !== 'toolbar.toggle.more') {
                const existing = this._primaryActions.find((a) => a.action.id === action.id);
                if (existing) {
                    existing.size = toolbar.getItemWidth(i);
                }
            }
        }
    }
    _computeSizes() {
        const toolbar = this._notebookLeftToolbar;
        const rightToolbar = this._notebookRightToolbar;
        if (toolbar &&
            rightToolbar &&
            this._dimension &&
            this._dimension.height >= 0 &&
            this._dimension.width >= 0) {
            // compute size only if it's visible
            if (this._primaryActions.length === 0 &&
                toolbar.getItemsLength() !== this._primaryActions.length) {
                this._cacheItemSizes(this._notebookLeftToolbar);
            }
            if (this._primaryActions.length === 0) {
                return;
            }
            const kernelWidth = (rightToolbar.getItemsLength() ? rightToolbar.getItemWidth(0) : 0) + ACTION_PADDING;
            const leftToolbarContainerMaxWidth = this._dimension.width -
                kernelWidth -
                (ACTION_PADDING + TOGGLE_MORE_ACTION_WIDTH) -
                /** toolbar left margin */ ACTION_PADDING -
                /** toolbar right margin */ ACTION_PADDING;
            const calculatedActions = this._strategy.calculateActions(leftToolbarContainerMaxWidth);
            this._notebookLeftToolbar.setActions(calculatedActions.primaryActions, calculatedActions.secondaryActions);
        }
    }
    layout(dimension) {
        this._dimension = dimension;
        if (!this._useGlobalToolbar) {
            this.domNode.style.display = 'none';
        }
        else {
            this.domNode.style.display = 'flex';
        }
        this._computeSizes();
    }
    dispose() {
        this._notebookLeftToolbar.context = undefined;
        this._notebookRightToolbar.context = undefined;
        this._notebookLeftToolbar.dispose();
        this._notebookRightToolbar.dispose();
        this._notebookLeftToolbar = null;
        this._notebookRightToolbar = null;
        this._deferredActionUpdate?.dispose();
        this._deferredActionUpdate = undefined;
        super.dispose();
    }
};
NotebookEditorWorkbenchToolbar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IEditorService),
    __param(9, IKeybindingService),
    __param(10, IWorkbenchAssignmentService)
], NotebookEditorWorkbenchToolbar);
export { NotebookEditorWorkbenchToolbar };
export function workbenchCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth) {
    return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, false);
}
export function workbenchDynamicCalculateActions(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth) {
    if (initialPrimaryActions.length === 0) {
        return { primaryActions: [], secondaryActions: initialSecondaryActions };
    }
    // find true length of array, add 1 for each primary actions, ignoring an item when size = 0
    const visibleActionLength = initialPrimaryActions.filter((action) => action.size !== 0).length;
    // step 1: try to fit all primary actions
    const totalWidthWithLabels = initialPrimaryActions.map((action) => action.size).reduce((a, b) => a + b, 0) +
        (visibleActionLength - 1) * ACTION_PADDING;
    if (totalWidthWithLabels <= leftToolbarContainerMaxWidth) {
        initialPrimaryActions.forEach((action) => {
            action.renderLabel = true;
        });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, false);
    }
    // step 2: check if they fit without labels
    if (visibleActionLength * ICON_ONLY_ACTION_WIDTH + (visibleActionLength - 1) * ACTION_PADDING >
        leftToolbarContainerMaxWidth) {
        initialPrimaryActions.forEach((action) => {
            action.renderLabel = false;
        });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, true);
    }
    // step 3: render as many actions as possible with labels, rest without.
    let sum = 0;
    let lastActionWithLabel = -1;
    for (let i = 0; i < initialPrimaryActions.length; i++) {
        sum += initialPrimaryActions[i].size + ACTION_PADDING;
        if (initialPrimaryActions[i].action instanceof Separator) {
            // find group separator
            const remainingItems = initialPrimaryActions
                .slice(i + 1)
                .filter((action) => action.size !== 0); // todo: need to exclude size 0 items from this
            const newTotalSum = sum +
                (remainingItems.length === 0
                    ? 0
                    : remainingItems.length * ICON_ONLY_ACTION_WIDTH +
                        (remainingItems.length - 1) * ACTION_PADDING);
            if (newTotalSum <= leftToolbarContainerMaxWidth) {
                lastActionWithLabel = i;
            }
        }
        else {
            continue;
        }
    }
    // icons only don't fit either
    if (lastActionWithLabel < 0) {
        initialPrimaryActions.forEach((action) => {
            action.renderLabel = false;
        });
        return actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, true);
    }
    // render labels for the actions that have space
    initialPrimaryActions.slice(0, lastActionWithLabel + 1).forEach((action) => {
        action.renderLabel = true;
    });
    initialPrimaryActions.slice(lastActionWithLabel + 1).forEach((action) => {
        action.renderLabel = false;
    });
    return {
        primaryActions: initialPrimaryActions,
        secondaryActions: initialSecondaryActions,
    };
}
function actionOverflowHelper(initialPrimaryActions, initialSecondaryActions, leftToolbarContainerMaxWidth, iconOnly) {
    const renderActions = [];
    const overflow = [];
    let currentSize = 0;
    let nonZeroAction = false;
    let containerFull = false;
    if (initialPrimaryActions.length === 0) {
        return { primaryActions: [], secondaryActions: initialSecondaryActions };
    }
    for (let i = 0; i < initialPrimaryActions.length; i++) {
        const actionModel = initialPrimaryActions[i];
        const itemSize = iconOnly
            ? actionModel.size === 0
                ? 0
                : ICON_ONLY_ACTION_WIDTH
            : actionModel.size;
        // if two separators in a row, ignore the second
        if (actionModel.action instanceof Separator &&
            renderActions.length > 0 &&
            renderActions[renderActions.length - 1].action instanceof Separator) {
            continue;
        }
        // if a separator is the first nonZero action, ignore it
        if (actionModel.action instanceof Separator && !nonZeroAction) {
            continue;
        }
        if (currentSize + itemSize <= leftToolbarContainerMaxWidth && !containerFull) {
            currentSize += ACTION_PADDING + itemSize;
            renderActions.push(actionModel);
            if (itemSize !== 0) {
                nonZeroAction = true;
            }
            if (actionModel.action instanceof Separator) {
                nonZeroAction = false;
            }
        }
        else {
            containerFull = true;
            if (itemSize === 0) {
                // size 0 implies a hidden item, keep in primary to allow for Workbench to handle visibility
                renderActions.push(actionModel);
            }
            else {
                if (actionModel.action instanceof Separator) {
                    // never push a separator to overflow
                    continue;
                }
                overflow.push(actionModel.action);
            }
        }
    }
    for (let i = renderActions.length - 1; i > 0; i--) {
        const temp = renderActions[i];
        if (temp.size === 0) {
            continue;
        }
        if (temp.action instanceof Separator) {
            renderActions.splice(i, 1);
        }
        break;
    }
    if (renderActions.length && renderActions[renderActions.length - 1].action instanceof Separator) {
        renderActions.pop();
    }
    if (overflow.length !== 0) {
        overflow.push(new Separator());
    }
    if (iconOnly) {
        // if icon only mode, don't render both (+ code) and (+ markdown) buttons. remove of markdown action
        const markdownIndex = renderActions.findIndex((a) => a.action.id === 'notebook.cell.insertMarkdownCellBelow');
        if (markdownIndex !== -1) {
            renderActions.splice(markdownIndex, 1);
        }
    }
    return {
        primaryActions: renderActions,
        secondaryActions: [...overflow, ...initialSecondaryActions],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JUb29sYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0VkaXRvclRvb2xiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0UsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsMEJBQTBCLEdBQzFCLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUVOLFlBQVksRUFDWixNQUFNLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixHQUNqQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxN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