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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JUb29sYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tFZGl0b3JUb29sYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNFLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLDBCQUEwQixHQUMxQixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFFTixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsRUFDZCxpQkFBaUIsR0FDakIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4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