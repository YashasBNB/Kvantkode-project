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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZENlbnRlckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3RpdGxlYmFyL2NvbW1hbmRDZW50ZXJDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekUsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRW5HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRixPQUFPLEVBQVcsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLGdCQUFnQixHQUNoQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGlCQUFpQixHQUNqQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFz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