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
import { FindInput } from '../../../base/browser/ui/findinput/findInput.js';
import { ReplaceInput, } from '../../../base/browser/ui/findinput/replaceInput.js';
import { HistoryInputBox, } from '../../../base/browser/ui/inputbox/inputBox.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../keybinding/common/keybindingsRegistry.js';
import { localize } from '../../../nls.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { isActiveElement } from '../../../base/browser/dom.js';
export const historyNavigationVisible = new RawContextKey('suggestWidgetVisible', false, localize('suggestWidgetVisible', 'Whether suggestion are visible'));
const HistoryNavigationWidgetFocusContext = 'historyNavigationWidgetFocus';
const HistoryNavigationForwardsEnablementContext = 'historyNavigationForwardsEnabled';
const HistoryNavigationBackwardsEnablementContext = 'historyNavigationBackwardsEnabled';
let lastFocusedWidget = undefined;
const widgets = [];
export function registerAndCreateHistoryNavigationContext(scopedContextKeyService, widget) {
    if (widgets.includes(widget)) {
        throw new Error('Cannot register the same widget multiple times');
    }
    widgets.push(widget);
    const disposableStore = new DisposableStore();
    const historyNavigationWidgetFocus = new RawContextKey(HistoryNavigationWidgetFocusContext, false).bindTo(scopedContextKeyService);
    const historyNavigationForwardsEnablement = new RawContextKey(HistoryNavigationForwardsEnablementContext, true).bindTo(scopedContextKeyService);
    const historyNavigationBackwardsEnablement = new RawContextKey(HistoryNavigationBackwardsEnablementContext, true).bindTo(scopedContextKeyService);
    const onDidFocus = () => {
        historyNavigationWidgetFocus.set(true);
        lastFocusedWidget = widget;
    };
    const onDidBlur = () => {
        historyNavigationWidgetFocus.set(false);
        if (lastFocusedWidget === widget) {
            lastFocusedWidget = undefined;
        }
    };
    // Check for currently being focused
    if (isActiveElement(widget.element)) {
        onDidFocus();
    }
    disposableStore.add(widget.onDidFocus(() => onDidFocus()));
    disposableStore.add(widget.onDidBlur(() => onDidBlur()));
    disposableStore.add(toDisposable(() => {
        widgets.splice(widgets.indexOf(widget), 1);
        onDidBlur();
    }));
    return {
        historyNavigationForwardsEnablement,
        historyNavigationBackwardsEnablement,
        dispose() {
            disposableStore.dispose();
        },
    };
}
let ContextScopedHistoryInputBox = class ContextScopedHistoryInputBox extends HistoryInputBox {
    constructor(container, contextViewProvider, options, contextKeyService) {
        super(container, contextViewProvider, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this));
    }
};
ContextScopedHistoryInputBox = __decorate([
    __param(3, IContextKeyService)
], ContextScopedHistoryInputBox);
export { ContextScopedHistoryInputBox };
let ContextScopedFindInput = class ContextScopedFindInput extends FindInput {
    constructor(container, contextViewProvider, options, contextKeyService) {
        super(container, contextViewProvider, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.inputBox.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this.inputBox));
    }
};
ContextScopedFindInput = __decorate([
    __param(3, IContextKeyService)
], ContextScopedFindInput);
export { ContextScopedFindInput };
let ContextScopedReplaceInput = class ContextScopedReplaceInput extends ReplaceInput {
    constructor(container, contextViewProvider, options, contextKeyService, showReplaceOptions = false) {
        super(container, contextViewProvider, showReplaceOptions, options);
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.inputBox.element));
        this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this.inputBox));
    }
};
ContextScopedReplaceInput = __decorate([
    __param(3, IContextKeyService)
], ContextScopedReplaceInput);
export { ContextScopedReplaceInput };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'history.showPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetFocusContext), ContextKeyExpr.equals(HistoryNavigationBackwardsEnablementContext, true), ContextKeyExpr.not('isComposing'), historyNavigationVisible.isEqualTo(false)),
    primary: 16 /* KeyCode.UpArrow */,
    secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
    handler: (accessor) => {
        lastFocusedWidget?.showPreviousValue();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'history.showNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetFocusContext), ContextKeyExpr.equals(HistoryNavigationForwardsEnablementContext, true), ContextKeyExpr.not('isComposing'), historyNavigationVisible.isEqualTo(false)),
    primary: 18 /* KeyCode.DownArrow */,
    secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
    handler: (accessor) => {
        lastFocusedWidget?.showNextValue();
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dFNjb3BlZEhpc3RvcnlXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9oaXN0b3J5L2Jyb3dzZXIvY29udGV4dFNjb3BlZEhpc3RvcnlXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFNBQVMsRUFBcUIsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RixPQUFPLEVBRU4sWUFBWSxHQUNaLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFOUQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxhQUFhLENBQ3hELHNCQUFzQixFQUN0QixLQUFLLEVBQ0wsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGdDQUFnQyxDQUFDLENBQ2xFLENBQUE7QUFFRCxNQUFNLG1DQUFtQyxHQUFHLDhCQUE4QixDQUFBO0FBQzFFLE1BQU0sMENBQTBDLEdBQUcsa0NBQWtDLENBQUE7QUFDckYsTUFBTSwyQ0FBMkMsR0FBRyxtQ0FBbUMsQ0FBQTtBQU92RixJQUFJLGlCQUFpQixHQUF5QyxTQUFTLENBQUE7QUFDdkUsTUFBTSxPQUFPLEdBQStCLEVBQUUsQ0FBQTtB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