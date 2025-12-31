/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { Toggle } from '../toggle/toggle.js';
import { HistoryInputBox, } from '../inputbox/inputBox.js';
import { Widget } from '../widget.js';
import { Codicon } from '../../../common/codicons.js';
import { Emitter } from '../../../common/event.js';
import './findInput.css';
import * as nls from '../../../../nls.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
const NLS_DEFAULT_LABEL = nls.localize('defaultLabel', 'input');
const NLS_PRESERVE_CASE_LABEL = nls.localize('label.preserveCaseToggle', 'Preserve Case');
class PreserveCaseToggle extends Toggle {
    constructor(opts) {
        super({
            // TODO: does this need its own icon?
            icon: Codicon.preserveCase,
            title: NLS_PRESERVE_CASE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
        });
    }
}
export class ReplaceInput extends Widget {
    static { this.OPTION_CHANGE = 'optionChange'; }
    constructor(parent, contextViewProvider, _showOptionButtons, options) {
        super();
        this._showOptionButtons = _showOptionButtons;
        this.fixFocusOnOptionClickEnabled = true;
        this.cachedOptionsWidth = 0;
        this._onDidOptionChange = this._register(new Emitter());
        this.onDidOptionChange = this._onDidOptionChange.event;
        this._onKeyDown = this._register(new Emitter());
        this.onKeyDown = this._onKeyDown.event;
        this._onMouseDown = this._register(new Emitter());
        this.onMouseDown = this._onMouseDown.event;
        this._onInput = this._register(new Emitter());
        this.onInput = this._onInput.event;
        this._onKeyUp = this._register(new Emitter());
        this.onKeyUp = this._onKeyUp.event;
        this._onPreserveCaseKeyDown = this._register(new Emitter());
        this.onPreserveCaseKeyDown = this._onPreserveCaseKeyDown.event;
        this._lastHighlightFindOptions = 0;
        this.contextViewProvider = contextViewProvider;
        this.placeholder = options.placeholder || '';
        this.validation = options.validation;
        this.label = options.label || NLS_DEFAULT_LABEL;
        const appendPreserveCaseLabel = options.appendPreserveCaseLabel || '';
        const history = options.history || new Set([]);
        const flexibleHeight = !!options.flexibleHeight;
        const flexibleWidth = !!options.flexibleWidth;
        const flexibleMaxHeight = options.flexibleMaxHeight;
        this.domNode = document.createElement('div');
        this.domNode.classList.add('monaco-findInput');
        this.inputBox = this._register(new HistoryInputBox(this.domNode, this.contextViewProvider, {
            ariaLabel: this.label || '',
            placeholder: this.placeholder || '',
            validationOptions: {
                validation: this.validation,
            },
            history,
            showHistoryHint: options.showHistoryHint,
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight,
            inputBoxStyles: options.inputBoxStyles,
        }));
        this.preserveCase = this._register(new PreserveCaseToggle({
            appendTitle: appendPreserveCaseLabel,
            isChecked: false,
            ...options.toggleStyles,
        }));
        this._register(this.preserveCase.onChange((viaKeyboard) => {
            this._onDidOptionChange.fire(viaKeyboard);
            if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                this.inputBox.focus();
            }
            this.validate();
        }));
        this._register(this.preserveCase.onKeyDown((e) => {
            this._onPreserveCaseKeyDown.fire(e);
        }));
        if (this._showOptionButtons) {
            this.cachedOptionsWidth = this.preserveCase.width();
        }
        else {
            this.cachedOptionsWidth = 0;
        }
        // Arrow-Key support to navigate between options
        const indexes = [this.preserveCase.domNode];
        this.onkeydown(this.domNode, (event) => {
            if (event.equals(15 /* KeyCode.LeftArrow */) ||
                event.equals(17 /* KeyCode.RightArrow */) ||
                event.equals(9 /* KeyCode.Escape */)) {
                const index = indexes.indexOf(this.domNode.ownerDocument.activeElement);
                if (index >= 0) {
                    let newIndex = -1;
                    if (event.equals(17 /* KeyCode.RightArrow */)) {
                        newIndex = (index + 1) % indexes.length;
                    }
                    else if (event.equals(15 /* KeyCode.LeftArrow */)) {
                        if (index === 0) {
                            newIndex = indexes.length - 1;
                        }
                        else {
                            newIndex = index - 1;
                        }
                    }
                    if (event.equals(9 /* KeyCode.Escape */)) {
                        indexes[index].blur();
                        this.inputBox.focus();
                    }
                    else if (newIndex >= 0) {
                        indexes[newIndex].focus();
                    }
                    dom.EventHelper.stop(event, true);
                }
            }
        });
        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.style.display = this._showOptionButtons ? 'block' : 'none';
        controls.appendChild(this.preserveCase.domNode);
        this.domNode.appendChild(controls);
        parent?.appendChild(this.domNode);
        this.onkeydown(this.inputBox.inputElement, (e) => this._onKeyDown.fire(e));
        this.onkeyup(this.inputBox.inputElement, (e) => this._onKeyUp.fire(e));
        this.oninput(this.inputBox.inputElement, (e) => this._onInput.fire());
        this.onmousedown(this.inputBox.inputElement, (e) => this._onMouseDown.fire(e));
    }
    enable() {
        this.domNode.classList.remove('disabled');
        this.inputBox.enable();
        this.preserveCase.enable();
    }
    disable() {
        this.domNode.classList.add('disabled');
        this.inputBox.disable();
        this.preserveCase.disable();
    }
    setFocusInputOnOptionClick(value) {
        this.fixFocusOnOptionClickEnabled = value;
    }
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    clear() {
        this.clearValidation();
        this.setValue('');
        this.focus();
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        if (this.inputBox.value !== value) {
            this.inputBox.value = value;
        }
    }
    onSearchSubmit() {
        this.inputBox.addToHistory();
    }
    applyStyles() { }
    select() {
        this.inputBox.select();
    }
    focus() {
        this.inputBox.focus();
    }
    getPreserveCase() {
        return this.preserveCase.checked;
    }
    setPreserveCase(value) {
        this.preserveCase.checked = value;
    }
    focusOnPreserve() {
        this.preserveCase.focus();
    }
    highlightFindOptions() {
        this.domNode.classList.remove('highlight-' + this._lastHighlightFindOptions);
        this._lastHighlightFindOptions = 1 - this._lastHighlightFindOptions;
        this.domNode.classList.add('highlight-' + this._lastHighlightFindOptions);
    }
    validate() {
        this.inputBox?.validate();
    }
    showMessage(message) {
        this.inputBox?.showMessage(message);
    }
    clearMessage() {
        this.inputBox?.hideMessage();
    }
    clearValidation() {
        this.inputBox?.hideMessage();
    }
    set width(newWidth) {
        this.inputBox.paddingRight = this.cachedOptionsWidth;
        this.domNode.style.width = newWidth + 'px';
    }
    dispose() {
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUlucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ZpbmRpbnB1dC9yZXBsYWNlSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFHbkMsT0FBTyxFQUFpQixNQUFNLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUczRCxPQUFPLEVBQ04sZUFBZSxHQUlmLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFBO0FBRXpELE9BQU8saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQW1CMUUsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUMvRCxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsZUFBZSxDQUFDLENBQUE7QUFFekYsTUFBTSxrQkFBbUIsU0FBUSxNQUFNO0lBQ3RDLFlBQVksSUFBMEI7UUFDckMsS0FBSyxDQUFDO1lBQ0wscUNBQXFDO1lBQ3JDLElBQUksRUFBRSxPQUFPLENBQUMsWUFBWTtZQUMxQixLQUFLLEVBQUUsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFdBQVc7WUFDakQsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQztZQUN2RSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQ3JELDJCQUEyQixFQUFFLElBQUksQ0FBQywyQkFBMkI7WUFDN0QsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQjtTQUM3RCxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sWUFBYSxTQUFRLE1BQU07YUFDdkIsa0JBQWEsR0FBVyxjQUFjLEFBQXpCLENBQXlCO0lBZ0N0RCxZQUNDLE1BQTBCLEVBQzFCLG1CQUFxRCxFQUNwQyxrQkFBMkIsRUFDNUMsT0FBNkI7UUFFN0IsS0FBSyxFQUFFLENBQUE7UUFIVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVM7UUE3QnJDLGlDQUE0QixHQUFHLElBQUksQ0FBQTtRQUduQyx1QkFBa0IsR0FBVyxDQUFDLENBQUE7UUFJckIsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDNUQsc0JBQWlCLEdBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFFYixlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBa0IsQ0FBQyxDQUFBO1FBQzNELGNBQVMsR0FBMEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUE7UUFFdkQsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtRQUMxRCxnQkFBVyxHQUF1QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUV4RCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0MsWUFBTyxHQUFnQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUV6QyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBa0IsQ0FBQyxDQUFBO1FBQ3pELFlBQU8sR0FBMEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFFNUQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBa0IsQ0FBQyxDQUFBO1FBQzlELDBCQUFxQixHQUEwQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBcUx4Riw4QkFBeUIsR0FBVyxDQUFDLENBQUE7UUE1SzVDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQTtRQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksaUJBQWlCLENBQUE7UUFFL0MsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUMsdUJBQXVCLElBQUksRUFBRSxDQUFBO1FBQ3JFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUE7UUFDL0MsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUE7UUFFbkQsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTlDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0IsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDM0QsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFO1lBQ25DLGlCQUFpQixFQUFFO2dCQUNsQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7YUFDM0I7WUFDRCxPQUFPO1lBQ1AsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1lBQ3hDLGNBQWM7WUFDZCxhQUFhO1lBQ2IsaUJBQWlCO1lBQ2pCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYztTQUN0QyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSxrQkFBa0IsQ0FBQztZQUN0QixXQUFXLEVBQUUsdUJBQXVCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLEdBQUcsT0FBTyxDQUFDLFlBQVk7U0FDdkIsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3RCLENBQUM7WUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFxQixFQUFFLEVBQUU7WUFDdEQsSUFDQyxLQUFLLENBQUMsTUFBTSw0QkFBbUI7Z0JBQy9CLEtBQUssQ0FBQyxNQUFNLDZCQUFvQjtnQkFDaEMsS0FBSyxDQUFDLE1BQU0sd0JBQWdCLEVBQzNCLENBQUM7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDcEYsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2hCLElBQUksUUFBUSxHQUFXLENBQUMsQ0FBQyxDQUFBO29CQUN6QixJQUFJLEtBQUssQ0FBQyxNQUFNLDZCQUFvQixFQUFFLENBQUM7d0JBQ3RDLFFBQVEsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO29CQUN4QyxDQUFDO3lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sNEJBQW1CLEVBQUUsQ0FBQzt3QkFDNUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ2pCLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTt3QkFDOUIsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLFFBQVEsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFBO3dCQUNyQixDQUFDO29CQUNGLENBQUM7b0JBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZ0IsRUFBRSxDQUFDO3dCQUNsQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7d0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3RCLENBQUM7eUJBQU0sSUFBSSxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzFCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFDMUIsQ0FBQztvQkFFRCxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFBO1FBQy9CLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDbkUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRS9DLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRWpDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFTSwwQkFBMEIsQ0FBQyxLQUFjO1FBQy9DLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxLQUFLLENBQUE7SUFDMUMsQ0FBQztJQUVNLFVBQVUsQ0FBQyxPQUFnQjtRQUNqQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNqQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFhO1FBQzVCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRU0sY0FBYztRQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFUyxXQUFXLEtBQVUsQ0FBQztJQUV6QixNQUFNO1FBQ1osSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVNLGVBQWU7UUFDckIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQTtJQUNqQyxDQUFDO0lBRU0sZUFBZSxDQUFDLEtBQWM7UUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO0lBQ2xDLENBQUM7SUFFTSxlQUFlO1FBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUdNLG9CQUFvQjtRQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFBO1FBQ25FLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVNLFFBQVE7UUFDZCxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTSxXQUFXLENBQUMsT0FBd0I7UUFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVNLFlBQVk7UUFDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxJQUFXLEtBQUssQ0FBQyxRQUFnQjtRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUE7UUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUE7SUFDM0MsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMifQ==