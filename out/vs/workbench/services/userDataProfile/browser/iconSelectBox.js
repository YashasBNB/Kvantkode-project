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
var WorkbenchIconSelectBox_1;
import { IconSelectBox, } from '../../../../base/browser/ui/icons/iconSelectBox.js';
import * as dom from '../../../../base/browser/dom.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
export const WorkbenchIconSelectBoxFocusContextKey = new RawContextKey('iconSelectBoxFocus', true);
export const WorkbenchIconSelectBoxInputFocusContextKey = new RawContextKey('iconSelectBoxInputFocus', true);
export const WorkbenchIconSelectBoxInputEmptyContextKey = new RawContextKey('iconSelectBoxInputEmpty', true);
let WorkbenchIconSelectBox = class WorkbenchIconSelectBox extends IconSelectBox {
    static { WorkbenchIconSelectBox_1 = this; }
    static getFocusedWidget() {
        return WorkbenchIconSelectBox_1.focusedWidget;
    }
    constructor(options, contextKeyService) {
        super(options);
        this.contextKeyService = this._register(contextKeyService.createScoped(this.domNode));
        WorkbenchIconSelectBoxFocusContextKey.bindTo(this.contextKeyService);
        this.inputFocusContextKey = WorkbenchIconSelectBoxInputFocusContextKey.bindTo(this.contextKeyService);
        this.inputEmptyContextKey = WorkbenchIconSelectBoxInputEmptyContextKey.bindTo(this.contextKeyService);
        if (this.inputBox) {
            const focusTracker = this._register(dom.trackFocus(this.inputBox.inputElement));
            this._register(focusTracker.onDidFocus(() => this.inputFocusContextKey.set(true)));
            this._register(focusTracker.onDidBlur(() => this.inputFocusContextKey.set(false)));
            this._register(this.inputBox.onDidChange(() => this.inputEmptyContextKey.set(this.inputBox?.value.length === 0)));
        }
    }
    focus() {
        super.focus();
        WorkbenchIconSelectBox_1.focusedWidget = this;
    }
};
WorkbenchIconSelectBox = WorkbenchIconSelectBox_1 = __decorate([
    __param(1, IContextKeyService)
], WorkbenchIconSelectBox);
export { WorkbenchIconSelectBox };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 16 /* KeyCode.UpArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusPreviousRow();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 18 /* KeyCode.DownArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusNextRow();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchIconSelectBoxFocusContextKey, ContextKeyExpr.or(WorkbenchIconSelectBoxInputEmptyContextKey, WorkbenchIconSelectBoxInputFocusContextKey.toNegated())),
    primary: 17 /* KeyCode.RightArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusNext();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchIconSelectBoxFocusContextKey, ContextKeyExpr.or(WorkbenchIconSelectBoxInputEmptyContextKey, WorkbenchIconSelectBoxInputFocusContextKey.toNegated())),
    primary: 15 /* KeyCode.LeftArrow */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.focusPrevious();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'iconSelectBox.selectFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchIconSelectBoxFocusContextKey,
    primary: 3 /* KeyCode.Enter */,
    handler: () => {
        const selectBox = WorkbenchIconSelectBox.getFocusedWidget();
        if (selectBox) {
            selectBox.setSelection(selectBox.getFocus()[0]);
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL2ljb25TZWxlY3RCb3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixhQUFhLEdBQ2IsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyxJQUFJLGFBQWEsQ0FDckUsb0JBQW9CLEVBQ3BCLElBQUksQ0FDSixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sMENBQTBDLEdBQUcsSUFBSSxhQUFhLENBQzFFLHlCQUF5QixFQUN6QixJQUFJLENBQ0osQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDBDQUEwQyxHQUFHLElBQUksYUFBYSxDQUMxRSx5QkFBeUIsRUFDekIsSUFBSSxDQUNKLENBQUE7QUFFTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLGFBQWE7O0lBRXhELE1BQU0sQ0FBQyxnQkFBZ0I7UUFDdEIsT0FBTyx3QkFBc0IsQ0FBQyxhQUFhLENBQUE7SUFDNUMsQ0FBQztJQU1ELFlBQ0MsT0FBOEIsRUFDVixpQkFBcUM7UUFFekQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMs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