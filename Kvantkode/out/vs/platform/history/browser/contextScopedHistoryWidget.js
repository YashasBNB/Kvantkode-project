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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dFNjb3BlZEhpc3RvcnlXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2hpc3RvcnkvYnJvd3Nlci9jb250ZXh0U2NvcGVkSGlzdG9yeVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsU0FBUyxFQUFxQixNQUFNLGlEQUFpRCxDQUFBO0FBQzlGLE9BQU8sRUFFTixZQUFZLEdBQ1osTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sK0NBQStDLENBQUE7QUFFdEQsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLGFBQWEsQ0FDeEQsc0JBQXNCLEVBQ3RCLEtBQUssRUFDTCxRQUFRLENBQUMsc0JBQXNCLEVBQUUsZ0NBQWdDLENBQUMsQ0FDbEUsQ0FBQTtBQUVELE1BQU0sbUNBQW1DLEdBQUcsOEJBQThCLENBQUE7QUFDMUUsTUFBTSwwQ0FBMEMsR0FBRyxrQ0FBa0MsQ0FBQTtBQUNyRixNQUFNLDJDQUEyQyxHQUFHLG1DQUFtQyxDQUFBO0FBT3ZGLElBQUksaUJBQWlCLEdBQXlDLFNBQVMsQ0FBQTtBQUN2RSxNQUFNLE9BQU8sR0FBK0IsRUFBRSxD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