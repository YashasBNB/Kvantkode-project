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
import { localize, localize2 } from '../../../../nls.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Action } from '../../../../base/common/actions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { StatusBarFocused } from '../../../common/contextkeys.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export class ToggleStatusbarEntryVisibilityAction extends Action {
    constructor(id, label, model) {
        super(id, label, undefined, true);
        this.model = model;
        this.checked = !model.isHidden(id);
    }
    async run() {
        if (this.model.isHidden(this.id)) {
            this.model.show(this.id);
        }
        else {
            this.model.hide(this.id);
        }
    }
}
export class HideStatusbarEntryAction extends Action {
    constructor(id, name, model) {
        super(id, localize('hide', "Hide '{0}'", name), undefined, true);
        this.model = model;
    }
    async run() {
        this.model.hide(this.id);
    }
}
let ManageExtensionAction = class ManageExtensionAction extends Action {
    constructor(extensionId, commandService) {
        super('statusbar.manage.extension', localize('manageExtension', 'Manage Extension'));
        this.extensionId = extensionId;
        this.commandService = commandService;
    }
    run() {
        return this.commandService.executeCommand('_extensions.manage', this.extensionId);
    }
};
ManageExtensionAction = __decorate([
    __param(1, ICommandService)
], ManageExtensionAction);
export { ManageExtensionAction };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [16 /* KeyCode.UpArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusPreviousEntry();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusNextEntry();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 14 /* KeyCode.Home */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusNextEntry();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 13 /* KeyCode.End */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusPreviousEntry();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.clearFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 9 /* KeyCode.Escape */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        const editorService = accessor.get(IEditorService);
        if (statusBarService.isEntryFocused()) {
            statusBarService.focus(false);
        }
        else if (editorService.activeEditorPane) {
            editorService.activeEditorPane.focus();
        }
    },
});
class FocusStatusBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusStatusBar',
            title: localize2('focusStatusBar', 'Focus Status Bar'),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, getActiveWindow());
    }
}
registerAction2(FocusStatusBarAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3N0YXR1c2Jhci9zdGF0dXNiYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBUyx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWxHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixNQUFNLE9BQU8sb0NBQXFDLFNBQVEsTUFBTTtJQUMvRCxZQUNDLEVBQVUsRUFDVixLQUFhLEVBQ0wsS0FBeUI7UUFFakMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRnpCLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBSWpDLElBQUksQ0FBQyxPQUFP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