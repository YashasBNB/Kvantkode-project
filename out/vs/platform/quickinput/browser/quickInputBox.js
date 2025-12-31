/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { FindInput } from '../../../base/browser/ui/findinput/findInput.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import Severity from '../../../base/common/severity.js';
import './media/quickInput.css';
const $ = dom.$;
export class QuickInputBox extends Disposable {
    constructor(parent, inputBoxStyles, toggleStyles) {
        super();
        this.parent = parent;
        this.onDidChange = (handler) => {
            return this.findInput.onDidChange(handler);
        };
        this.container = dom.append(this.parent, $('.quick-input-box'));
        this.findInput = this._register(new FindInput(this.container, undefined, { label: '', inputBoxStyles, toggleStyles }));
        const input = this.findInput.inputBox.inputElement;
        input.role = 'textbox';
        input.ariaHasPopup = 'menu';
        input.ariaAutoComplete = 'list';
    }
    get onKeyDown() {
        return this.findInput.onKeyDown;
    }
    get onMouseDown() {
        return this.findInput.onMouseDown;
    }
    get value() {
        return this.findInput.getValue();
    }
    set value(value) {
        this.findInput.setValue(value);
    }
    select(range = null) {
        this.findInput.inputBox.select(range);
    }
    getSelection() {
        return this.findInput.inputBox.getSelection();
    }
    isSelectionAtEnd() {
        return this.findInput.inputBox.isSelectionAtEnd();
    }
    setPlaceholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get placeholder() {
        return this.findInput.inputBox.inputElement.getAttribute('placeholder') || '';
    }
    set placeholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get password() {
        return this.findInput.inputBox.inputElement.type === 'password';
    }
    set password(password) {
        this.findInput.inputBox.inputElement.type = password ? 'password' : 'text';
    }
    set enabled(enabled) {
        // We can't disable the input box because it is still used for
        // navigating the list. Instead, we disable the list and the OK
        // so that nothing can be selected.
        // TODO: should this be what we do for all find inputs? Or maybe some _other_ API
        // on findInput to change it to readonly?
        this.findInput.inputBox.inputElement.toggleAttribute('readonly', !enabled);
        // TODO: styles of the quick pick need to be moved to the CSS instead of being in line
        // so things like this can be done in CSS
        // this.findInput.inputBox.inputElement.classList.toggle('disabled', !enabled);
    }
    set toggles(toggles) {
        this.findInput.setAdditionalToggles(toggles);
    }
    hasFocus() {
        return this.findInput.inputBox.hasFocus();
    }
    setAttribute(name, value) {
        this.findInput.inputBox.inputElement.setAttribute(name, value);
    }
    removeAttribute(name) {
        this.findInput.inputBox.inputElement.removeAttribute(name);
    }
    showDecoration(decoration) {
        if (decoration === Severity.Ignore) {
            this.findInput.clearMessage();
        }
        else {
            this.findInput.showMessage({
                type: decoration === Severity.Info
                    ? 1 /* MessageType.INFO */
                    : decoration === Severity.Warning
                        ? 2 /* MessageType.WARNING */
                        : 3 /* MessageType.ERROR */,
                content: '',
            });
        }
    }
    stylesForType(decoration) {
        return this.findInput.inputBox.stylesForType(decoration === Severity.Info
            ? 1 /* MessageType.INFO */
            : decoration === Severity.Warning
                ? 2 /* MessageType.WARNING */
                : 3 /* MessageType.ERROR */);
    }
    setFocus() {
        this.findInput.focus();
    }
    layout() {
        this.findInput.inputBox.layout();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0Qm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRzNFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZixNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFJNUMsWUFDUyxNQUFtQixFQUMzQixjQUErQixFQUMvQixZQUEyQjtRQUUzQixLQUFLLEVBQUUsQ0FBQTtRQUpDLFdBQU0sR0FBTixNQUFNLENBQWE7UUF1QjVCLGdCQUFXLEdBQUcsQ0FBQyxPQUFnQyxFQUFlLEVBQUU7WUFDL0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQyxDQUFDLENBQUE7UUFwQkEsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlCLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQTtRQUNsRCxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQTtRQUN0QixLQUFLLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQTtRQUMzQixLQUFLLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFBO0lBQ2xDLENBQUM7SUFNRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUF1QixJQUFJO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDOUMsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsY0FBYyxDQUFDLFdBQW1CO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsSUFBSSxXQUFXLENBQUMsV0FBbUI7UUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFBO0lBQ2hFLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxRQUFpQjtRQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDM0UsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLE9BQWdCO1FBQzNCLDhEQUE4RDtRQUM5RCwrREFBK0Q7UUFDL0QsbUNBQW1DO1FBQ25DLGlGQUFpRjtRQUNqRix5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxRSxzRkFBc0Y7UUFDdEYseUNBQXlDO1FBQ3pDLCtFQUErRTtJQUNoRixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsT0FBNkI7UUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFZLEVBQUUsS0FBYTtRQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQVk7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsY0FBYyxDQUFDLFVBQW9CO1FBQ2xDLElBQUksVUFBVSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzlCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7Z0JBQzFCLElBQUksRUFDSCxVQUFVLEtBQUssUUFBUSxDQUFDLElBQUk7b0JBQzNCLENBQUM7b0JBQ0QsQ0FBQyxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsT0FBTzt3QkFDaEMsQ0FBQzt3QkFDRCxDQUFDLDBCQUFrQjtnQkFDdEIsT0FBTyxFQUFFLEVBQUU7YUFDWCxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxVQUFvQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDM0MsVUFBVSxLQUFLLFFBQVEsQ0FBQyxJQUFJO1lBQzNCLENBQUM7WUFDRCxDQUFDLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQyxPQUFPO2dCQUNoQyxDQUFDO2dCQUNELENBQUMsMEJBQWtCLENBQ3JCLENBQUE7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0NBQ0QifQ==