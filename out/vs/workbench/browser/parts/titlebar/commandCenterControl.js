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
var CommandCenterCenterViewItem_1;
import { isActiveDocument, reset } from '../../../../base/browser/dom.js';
import { BaseActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar, WorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuRegistry, SubmenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let CommandCenterControl = class CommandCenterControl {
    constructor(windowTitle, hoverDelegate, instantiationService, quickInputService) {
        this._disposables = new DisposableStore();
        this._onDidChangeVisibility = this._disposables.add(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.element = document.createElement('div');
        this.element.classList.add('command-center');
        const titleToolbar = instantiationService.createInstance(MenuWorkbenchToolBar, this.element, MenuId.CommandCenter, {
            contextMenu: MenuId.TitleBarContext,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: {
                primaryGroup: () => true,
            },
            telemetrySource: 'commandCenter',
            actionViewItemProvider: (action, options) => {
                if (action instanceof SubmenuItemAction &&
                    action.item.submenu === MenuId.CommandCenterCenter) {
                    return instantiationService.createInstance(CommandCenterCenterViewItem, action, windowTitle, { ...options, hoverDelegate });
                }
                else {
                    return createActionViewItem(instantiationService, action, { ...options, hoverDelegate });
                }
            },
        });
        this._disposables.add(Event.filter(quickInputService.onShow, () => isActiveDocument(this.element), this._disposables)(this._setVisibility.bind(this, false)));
        this._disposables.add(quickInputService.onHide(this._setVisibility.bind(this, true)));
        this._disposables.add(titleToolbar);
    }
    _setVisibility(show) {
        this.element.classList.toggle('hide', !show);
        this._onDidChangeVisibility.fire();
    }
    dispose() {
        this._disposables.dispose();
    }
};
CommandCenterControl = __decorate([
    __param(2, IInstantiationService),
    __param(3, IQuickInputService)
], CommandCenterControl);
export { CommandCenterControl };
let CommandCenterCenterViewItem = class CommandCenterCenterViewItem extends BaseActionViewItem {
    static { CommandCenterCenterViewItem_1 = this; }
    static { this._quickOpenCommandId = 'workbench.action.quickOpenWithModes'; }
    constructor(_submenu, _windowTitle, options, _hoverService, _keybindingService, _instaService, _editorGroupService) {
        super(undefined, _submenu.actions.find((action) => action.id === 'workbench.action.quickOpenWithModes') ??
            _submenu.actions[0], options);
        this._submenu = _submenu;
        this._windowTitle = _windowTitle;
        this._hoverService = _hoverService;
        this._keybindingService = _keybindingService;
        this._instaService = _instaService;
        this._editorGroupService = _editorGroupService;
        this._hoverDelegate = options.hoverDelegate ?? getDefaultHoverDelegate('mouse');
    }
    render(container) {
        super.render(container);
        container.classList.add('command-center-center');
        container.classList.toggle('multiple', this._submenu.actions.length > 1);
        const hover = this._store.add(this._hoverService.setupManagedHover(this._hoverDelegate, container, this.getTooltip()));
        // update label & tooltip when window title changes
        this._store.add(this._windowTitle.onDidChange(() => {
            hover.update(this.getTooltip());
        }));
        const groups = [];
        for (const action of this._submenu.actions) {
            if (action instanceof SubmenuAction) {
                groups.push(action.actions);
            }
            else {
                groups.push([action]);
            }
        }
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            // nested toolbar
            const toolbar = this._instaService.createInstance(WorkbenchToolBar, container, {
                hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
                telemetrySource: 'commandCenterCenter',
                actionViewItemProvider: (action, options) => {
                    options = {
                        ...options,
                        hoverDelegate: this._hoverDelegate,
                    };
                    if (action.id !== CommandCenterCenterViewItem_1._quickOpenCommandId) {
                        return createActionViewItem(this._instaService, action, options);
                    }
                    const that = this;
                    return this._instaService.createInstance(class CommandCenterQuickPickItem extends BaseActionViewItem {
                        constructor() {
                            super(undefined, action, options);
                        }
                        render(container) {
                            super.render(container);
                            container.classList.toggle('command-center-quick-pick');
                            container.role = 'button';
                            const action = this.action;
                            // icon (search)
                            const searchIcon = document.createElement('span');
                            searchIcon.ariaHidden = 'true';
                            searchIcon.className = action.class ?? '';
                            searchIcon.classList.add('search-icon');
                            // label: just workspace name and optional decorations
                            const label = this._getLabel();
                            const labelElement = document.createElement('span');
                            labelElement.classList.add('search-label');
                            labelElement.innerText = label;
                            reset(container, searchIcon, labelElement);
                            const hover = this._store.add(that._hoverService.setupManagedHover(that._hoverDelegate, container, this.getTooltip()));
                            // update label & tooltip when window title changes
                            this._store.add(that._windowTitle.onDidChange(() => {
                                hover.update(this.getTooltip());
                                labelElement.innerText = this._getLabel();
                            }));
                            // update label & tooltip when tabs visibility changes
                            this._store.add(that._editorGroupService.onDidChangeEditorPartOptions(({ newPartOptions, oldPartOptions }) => {
                                if (newPartOptions.showTabs !== oldPartOptions.showTabs) {
                                    hover.update(this.getTooltip());
                                    labelElement.innerText = this._getLabel();
                                }
                            }));
                        }
                        getTooltip() {
                            return that.getTooltip();
                        }
                        _getLabel() {
                            const { prefix, suffix } = that._windowTitle.getTitleDecorations();
                            let label = that._windowTitle.workspaceName;
                            if (that._windowTitle.isCustomTitleFormat()) {
                                label = that._windowTitle.getWindowTitle();
                            }
                            else if (that._editorGroupService.partOptions.showTabs === 'none') {
                                label = that._windowTitle.fileName ?? label;
                            }
                            if (!label) {
                                label = localize('label.dfl', 'Search');
                            }
                            if (prefix) {
                                label = localize('label1', '{0} {1}', prefix, label);
                            }
                            if (suffix) {
                                label = localize('label2', '{0} {1}', label, suffix);
                            }
                            return label.replaceAll(/\r\n|\r|\n/g, '\u23CE');
                        }
                    });
                },
            });
            toolbar.setActions(group);
            this._store.add(toolbar);
            // spacer
            if (i < groups.length - 1) {
                const icon = renderIcon(Codicon.circleSmallFilled);
                icon.style.padding = '0 12px';
                icon.style.height = '100%';
                icon.style.opacity = '0.5';
                container.appendChild(icon);
            }
        }
    }
    getTooltip() {
        // tooltip: full windowTitle
        const kb = this._keybindingService.lookupKeybinding(this.action.id)?.getLabel();
        const title = kb
            ? localize('title', 'Search {0} ({1}) \u2014 {2}', this._windowTitle.workspaceName, kb, this._windowTitle.value)
            : localize('title2', 'Search {0} \u2014 {1}', this._windowTitle.workspaceName, this._windowTitle.value);
        return title;
    }
};
CommandCenterCenterViewItem = CommandCenterCenterViewItem_1 = __decorate([
    __param(3, IHoverService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IEditorGroupsService)
], CommandCenterCenterViewItem);
MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.CommandCenterCenter,
    title: localize('title3', 'Command Center'),
    icon: Codicon.shield,
    order: 101,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZENlbnRlckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci9jb21tYW5kQ2VudGVyQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEYsT0FBTyxFQUFXLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUVOLG9CQUFvQixFQUNwQixnQkFBZ0IsR0FDaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixpQkFBaUIsR0FDakIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FB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