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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9pY29uU2VsZWN0Qm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sYUFBYSxHQUNiLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFFdEUsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsSUFBSSxhQUFhLENBQ3JFLG9CQUFvQixFQUNwQixJQUFJLENBQ0osQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDBDQUEwQyxHQUFHLElBQUksYUFBYSxDQUMxRSx5QkFBeUIsRUFDekIsSUFBSSxDQUNKLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSwwQ0FBMEMsR0FBRyxJQUFJLGFBQWEsQ0FDMUUseUJBQXlCLEVBQ3pCLElBQUksQ0FDSixDQUFBO0FBRU0sSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxhQUFhOztJQUV4RCxNQUFNLENBQUMsZ0JBQWdCO1FBQ3RCLE9BQU8sd0JBQXNCLENBQUMsYUFBYSxDQUFBO0lBQzVDLENBQUM7SUFNRCxZQUNDLE9BQThCLEVBQ1YsaUJBQXFDO1FBRXpELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FB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