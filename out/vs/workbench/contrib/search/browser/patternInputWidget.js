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
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import * as nls from '../../../../nls.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
let PatternInputWidget = class PatternInputWidget extends Widget {
    static { this.OPTION_CHANGE = 'optionChange'; }
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super();
        this.contextViewProvider = contextViewProvider;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this._onSubmit = this._register(new Emitter());
        this.onSubmit = this._onSubmit.event;
        this._onCancel = this._register(new Emitter());
        this.onCancel = this._onCancel.event;
        options = {
            ...{
                ariaLabel: nls.localize('defaultLabel', 'input'),
            },
            ...options,
        };
        this.width = options.width ?? 100;
        this.render(options);
        parent.appendChild(this.domNode);
    }
    dispose() {
        super.dispose();
        this.inputFocusTracker?.dispose();
    }
    setWidth(newWidth) {
        this.width = newWidth;
        this.contextViewProvider.layout();
        this.setInputWidth();
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        if (this.inputBox.value !== value) {
            this.inputBox.value = value;
        }
    }
    select() {
        this.inputBox.select();
    }
    focus() {
        this.inputBox.focus();
    }
    inputHasFocus() {
        return this.inputBox.hasFocus();
    }
    setInputWidth() {
        this.inputBox.width = this.width - this.getSubcontrolsWidth() - 2; // 2 for input box border
    }
    getSubcontrolsWidth() {
        return 0;
    }
    getHistory() {
        return this.inputBox.getHistory();
    }
    clearHistory() {
        this.inputBox.clearHistory();
    }
    prependHistory(history) {
        this.inputBox.prependHistory(history);
    }
    clear() {
        this.setValue('');
    }
    onSearchSubmit() {
        this.inputBox.addToHistory();
    }
    showNextTerm() {
        this.inputBox.showNextValue();
    }
    showPreviousTerm() {
        this.inputBox.showPreviousValue();
    }
    render(options) {
        this.domNode = document.createElement('div');
        this.domNode.classList.add('monaco-findInput');
        const history = options.history || [];
        this.inputBox = new ContextScopedHistoryInputBox(this.domNode, this.contextViewProvider, {
            placeholder: options.placeholder,
            showPlaceholderOnFocus: options.showPlaceholderOnFocus,
            tooltip: options.tooltip,
            ariaLabel: options.ariaLabel,
            validationOptions: {
                validation: undefined,
            },
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            inputBoxStyles: options.inputBoxStyles,
        }, this.contextKeyService);
        this._register(this.inputBox.onDidChange(() => this._onSubmit.fire(true)));
        this.inputFocusTracker = dom.trackFocus(this.inputBox.inputElement);
        this.onkeyup(this.inputBox.inputElement, (keyboardEvent) => this.onInputKeyUp(keyboardEvent));
        const controls = document.createElement('div');
        controls.className = 'controls';
        this.renderSubcontrols(controls);
        this.domNode.appendChild(controls);
        this.setInputWidth();
    }
    renderSubcontrols(_controlsDiv) { }
    onInputKeyUp(keyboardEvent) {
        switch (keyboardEvent.keyCode) {
            case 3 /* KeyCode.Enter */:
                this.onSearchSubmit();
                this._onSubmit.fire(false);
                return;
            case 9 /* KeyCode.Escape */:
                this._onCancel.fire();
                return;
        }
    }
};
PatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], PatternInputWidget);
export { PatternInputWidget };
let IncludePatternInputWidget = class IncludePatternInputWidget extends PatternInputWidget {
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService);
        this._onChangeSearchInEditorsBoxEmitter = this._register(new Emitter());
        this.onChangeSearchInEditorsBox = this._onChangeSearchInEditorsBoxEmitter.event;
    }
    dispose() {
        super.dispose();
        this.useSearchInEditorsBox.dispose();
    }
    onlySearchInOpenEditors() {
        return this.useSearchInEditorsBox.checked;
    }
    setOnlySearchInOpenEditors(value) {
        this.useSearchInEditorsBox.checked = value;
        this._onChangeSearchInEditorsBoxEmitter.fire();
    }
    getSubcontrolsWidth() {
        return super.getSubcontrolsWidth() + this.useSearchInEditorsBox.width();
    }
    renderSubcontrols(controlsDiv) {
        this.useSearchInEditorsBox = this._register(new Toggle({
            icon: Codicon.book,
            title: nls.localize('onlySearchInOpenEditors', 'Search only in Open Editors'),
            isChecked: false,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles,
        }));
        this._register(this.useSearchInEditorsBox.onChange((viaKeyboard) => {
            this._onChangeSearchInEditorsBoxEmitter.fire();
            if (!viaKeyboard) {
                this.inputBox.focus();
            }
        }));
        controlsDiv.appendChild(this.useSearchInEditorsBox.domNode);
        super.renderSubcontrols(controlsDiv);
    }
};
IncludePatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], IncludePatternInputWidget);
export { IncludePatternInputWidget };
let ExcludePatternInputWidget = class ExcludePatternInputWidget extends PatternInputWidget {
    constructor(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService) {
        super(parent, contextViewProvider, options, contextKeyService, configurationService, keybindingService);
        this._onChangeIgnoreBoxEmitter = this._register(new Emitter());
        this.onChangeIgnoreBox = this._onChangeIgnoreBoxEmitter.event;
    }
    dispose() {
        super.dispose();
        this.useExcludesAndIgnoreFilesBox.dispose();
    }
    useExcludesAndIgnoreFiles() {
        return this.useExcludesAndIgnoreFilesBox.checked;
    }
    setUseExcludesAndIgnoreFiles(value) {
        this.useExcludesAndIgnoreFilesBox.checked = value;
        this._onChangeIgnoreBoxEmitter.fire();
    }
    getSubcontrolsWidth() {
        return super.getSubcontrolsWidth() + this.useExcludesAndIgnoreFilesBox.width();
    }
    renderSubcontrols(controlsDiv) {
        this.useExcludesAndIgnoreFilesBox = this._register(new Toggle({
            icon: Codicon.exclude,
            actionClassName: 'useExcludesAndIgnoreFiles',
            title: nls.localize('useExcludesAndIgnoreFilesDescription', 'Use Exclude Settings and Ignore Files'),
            isChecked: true,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles,
        }));
        this._register(this.useExcludesAndIgnoreFilesBox.onChange((viaKeyboard) => {
            this._onChangeIgnoreBoxEmitter.fire();
            if (!viaKeyboard) {
                this.inputBox.focus();
            }
        }));
        controlsDiv.appendChild(this.useExcludesAndIgnoreFilesBox.domNode);
        super.renderSubcontrols(controlsDiv);
    }
};
ExcludePatternInputWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IKeybindingService)
], ExcludePatternInputWidget);
export { ExcludePatternInputWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0dGVybklucHV0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9wYXR0ZXJuSW5wdXRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFHckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUF3QixNQUFNLGtDQUFrQyxDQUFBO0FBRWhGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDakgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFZNUYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxNQUFNO2FBQ3RDLGtCQUFhLEdBQVcsY0FBYyxBQUF6QixDQUF5QjtJQWU3QyxZQUNDLE1BQW1CLEVBQ1gsbUJBQXlD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