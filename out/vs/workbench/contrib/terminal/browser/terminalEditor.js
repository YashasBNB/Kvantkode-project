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
import * as dom from '../../../../base/browser/dom.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalService, terminalEditorId, } from './terminal.js';
import { getTerminalActionBarArgs } from './terminalMenus.js';
import { ITerminalProfileResolverService, ITerminalProfileService, } from '../common/terminal.js';
import { openContextMenu } from './terminalContextMenu.js';
import { ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
let TerminalEditor = class TerminalEditor extends EditorPane {
    constructor(group, telemetryService, themeService, storageService, _terminalEditorService, _terminalProfileResolverService, _terminalService, _terminalConfigurationService, contextKeyService, menuService, _instantiationService, _contextMenuService, _terminalProfileService, _workbenchLayoutService) {
        super(terminalEditorId, group, telemetryService, themeService, storageService);
        this._terminalEditorService = _terminalEditorService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._terminalProfileService = _terminalProfileService;
        this._workbenchLayoutService = _workbenchLayoutService;
        this._editorInput = undefined;
        this._cancelContextMenu = false;
        this._newDropdown = this._register(new MutableDisposable());
        this._disposableStore = this._register(new DisposableStore());
        this._dropdownMenu = this._register(menuService.createMenu(MenuId.TerminalNewDropdownContext, contextKeyService));
        this._instanceMenu = this._register(menuService.createMenu(MenuId.TerminalInstanceContext, contextKeyService));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles((profiles) => this._updateTabActionBar(profiles)));
    }
    async setInput(newInput, options, context, token) {
        this._editorInput?.terminalInstance?.detachFromElement();
        this._editorInput = newInput;
        await super.setInput(newInput, options, context, token);
        this._editorInput.terminalInstance?.attachToElement(this._overflowGuardElement);
        if (this._lastDimension) {
            this.layout(this._lastDimension);
        }
        this._editorInput.terminalInstance?.setVisible(this.isVisible() && this._workbenchLayoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, this.window));
        if (this._editorInput.terminalInstance) {
            // since the editor does not monitor focus changes, for ex. between the terminal
            // panel and the editors, this is needed so that the active instance gets set
            // when focus changes between them.
            this._register(this._editorInput.terminalInstance.onDidFocus(() => this._setActiveInstance()));
            this._editorInput.setCopyLaunchConfig(this._editorInput.terminalInstance.shellLaunchConfig);
        }
    }
    clearInput() {
        super.clearInput();
        if (this._overflowGuardElement &&
            this._editorInput?.terminalInstance?.domElement.parentElement === this._overflowGuardElement) {
            this._editorInput.terminalInstance?.detachFromElement();
        }
        this._editorInput = undefined;
    }
    _setActiveInstance() {
        if (!this._editorInput?.terminalInstance) {
            return;
        }
        this._terminalEditorService.setActiveInstance(this._editorInput.terminalInstance);
    }
    focus() {
        super.focus();
        this._editorInput?.terminalInstance?.focus(true);
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    createEditor(parent) {
        this._editorInstanceElement = parent;
        this._overflowGuardElement = dom.$('.terminal-overflow-guard.terminal-editor');
        this._editorInstanceElement.appendChild(this._overflowGuardElement);
        this._registerListeners();
    }
    _registerListeners() {
        if (!this._editorInstanceElement) {
            return;
        }
        this._register(dom.addDisposableListener(this._editorInstanceElement, 'mousedown', async (event) => {
            const terminal = this._terminalEditorService.activeInstance;
            if (this._terminalEditorService.instances.length > 0 && terminal) {
                const result = await terminal.handleMouseEvent(event, this._instanceMenu);
                if (typeof result === 'object' && result.cancelContextMenu) {
                    this._cancelContextMenu = true;
                }
            }
        }));
        this._register(dom.addDisposableListener(this._editorInstanceElement, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this._cancelContextMenu = false;
                return;
            }
            else if (!this._cancelContextMenu &&
                rightClickBehavior !== 'copyPaste' &&
                rightClickBehavior !== 'paste') {
                if (!this._cancelContextMenu) {
                    openContextMenu(this.window, event, this._editorInput?.terminalInstance, this._instanceMenu, this._contextMenuService);
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                this._cancelContextMenu = false;
            }
        }));
    }
    _updateTabActionBar(profiles) {
        const actions = getTerminalActionBarArgs(TerminalLocation.Editor, profiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
        this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
    }
    layout(dimension) {
        const instance = this._editorInput?.terminalInstance;
        if (instance) {
            instance.attachToElement(this._overflowGuardElement);
            instance.layout(dimension);
        }
        this._lastDimension = dimension;
    }
    setVisible(visible) {
        super.setVisible(visible);
        this._editorInput?.terminalInstance?.setVisible(visible && this._workbenchLayoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, this.window));
    }
    getActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */: {
                if (action instanceof MenuItemAction) {
                    const location = { viewColumn: ACTIVE_GROUP };
                    this._disposableStore.clear();
                    const actions = getTerminalActionBarArgs(location, this._terminalProfileService.availableProfiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
                    this._newDropdown.value = this._instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, actions.dropdownAction, actions.dropdownMenuActions, actions.className, { hoverDelegate: options.hoverDelegate });
                    this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
                    return this._newDropdown.value;
                }
            }
        }
        return super.getActionViewItem(action, options);
    }
    _getDefaultProfileName() {
        let defaultProfileName;
        try {
            defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        }
        catch (e) {
            defaultProfileName = this._terminalProfileResolverService.defaultProfileName;
        }
        return defaultProfileName;
    }
};
TerminalEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, ITerminalEditorService),
    __param(5, ITerminalProfileResolverService),
    __param(6, ITerminalService),
    __param(7, ITerminalConfigurationService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IInstantiationService),
    __param(11, IContextMenuService),
    __param(12, ITerminalProfileService),
    __param(13, IWorkbenchLayoutService)
], TerminalEditor);
export { TerminalEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFJdEQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDN0gsT0FBTyxFQUVOLFlBQVksRUFDWixNQUFNLEVBQ04sY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFeEUsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLGVBQWUsQ0FBQTtBQUV0QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLHVCQUF1QixHQUV2QixNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FB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