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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0dGVybklucHV0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvcGF0dGVybklucHV0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBR3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBd0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVoRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ2pILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBWTVGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsTUFBTTthQUN0QyxrQkFBYSxHQUFXLGNBQWMsQUFBekIsQ0FBeUI7SUFlN0MsWUFDQyxNQUFtQixFQUNYLG1CQUF5QyxFQUNq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