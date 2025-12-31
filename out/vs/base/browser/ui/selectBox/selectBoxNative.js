/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { EventType, Gesture } from '../../touch.js';
import * as arrays from '../../../common/arrays.js';
import { Emitter } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
export class SelectBoxNative extends Disposable {
    constructor(options, selected, styles, selectBoxOptions) {
        super();
        this.selected = 0;
        this.selectBoxOptions = selectBoxOptions || Object.create(null);
        this.options = [];
        this.selectElement = document.createElement('select');
        this.selectElement.className = 'monaco-select-box';
        if (typeof this.selectBoxOptions.ariaLabel === 'string') {
            this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
        }
        if (typeof this.selectBoxOptions.ariaDescription === 'string') {
            this.selectElement.setAttribute('aria-description', this.selectBoxOptions.ariaDescription);
        }
        this._onDidSelect = this._register(new Emitter());
        this.styles = styles;
        this.registerListeners();
        this.setOptions(options, selected);
    }
    registerListeners() {
        this._register(Gesture.addTarget(this.selectElement));
        [EventType.Tap].forEach((eventType) => {
            this._register(dom.addDisposableListener(this.selectElement, eventType, (e) => {
                this.selectElement.focus();
            }));
        });
        this._register(dom.addStandardDisposableListener(this.selectElement, 'click', (e) => {
            dom.EventHelper.stop(e, true);
        }));
        this._register(dom.addStandardDisposableListener(this.selectElement, 'change', (e) => {
            this.selectElement.title = e.target.value;
            this._onDidSelect.fire({
                index: e.target.selectedIndex,
                selected: e.target.value,
            });
        }));
        this._register(dom.addStandardDisposableListener(this.selectElement, 'keydown', (e) => {
            let showSelect = false;
            if (isMacintosh) {
                if (e.keyCode === 18 /* KeyCode.DownArrow */ ||
                    e.keyCode === 16 /* KeyCode.UpArrow */ ||
                    e.keyCode === 10 /* KeyCode.Space */) {
                    showSelect = true;
                }
            }
            else {
                if ((e.keyCode === 18 /* KeyCode.DownArrow */ && e.altKey) ||
                    e.keyCode === 10 /* KeyCode.Space */ ||
                    e.keyCode === 3 /* KeyCode.Enter */) {
                    showSelect = true;
                }
            }
            if (showSelect) {
                // Space, Enter, is used to expand select box, do not propagate it (prevent action bar action run)
                e.stopPropagation();
            }
        }));
    }
    get onDidSelect() {
        return this._onDidSelect.event;
    }
    setOptions(options, selected) {
        if (!this.options || !arrays.equals(this.options, options)) {
            this.options = options;
            this.selectElement.options.length = 0;
            this.options.forEach((option, index) => {
                this.selectElement.add(this.createOption(option.text, index, option.isDisabled));
            });
        }
        if (selected !== undefined) {
            this.select(selected);
        }
    }
    select(index) {
        if (this.options.length === 0) {
            this.selected = 0;
        }
        else if (index >= 0 && index < this.options.length) {
            this.selected = index;
        }
        else if (index > this.options.length - 1) {
            // Adjust index to end of list
            // This could make client out of sync with the select
            this.select(this.options.length - 1);
        }
        else if (this.selected < 0) {
            this.selected = 0;
        }
        this.selectElement.selectedIndex = this.selected;
        if (this.selected < this.options.length &&
            typeof this.options[this.selected].text === 'string') {
            this.selectElement.title = this.options[this.selected].text;
        }
        else {
            this.selectElement.title = '';
        }
    }
    setAriaLabel(label) {
        this.selectBoxOptions.ariaLabel = label;
        this.selectElement.setAttribute('aria-label', label);
    }
    focus() {
        if (this.selectElement) {
            this.selectElement.tabIndex = 0;
            this.selectElement.focus();
        }
    }
    blur() {
        if (this.selectElement) {
            this.selectElement.tabIndex = -1;
            this.selectElement.blur();
        }
    }
    setEnabled(enable) {
        this.selectElement.disabled = !enable;
    }
    setFocusable(focusable) {
        this.selectElement.tabIndex = focusable ? 0 : -1;
    }
    render(container) {
        container.classList.add('select-container');
        container.appendChild(this.selectElement);
        this.setOptions(this.options, this.selected);
        this.applyStyles();
    }
    style(styles) {
        this.styles = styles;
        this.applyStyles();
    }
    applyStyles() {
        // Style native select
        if (this.selectElement) {
            this.selectElement.style.backgroundColor = this.styles.selectBackground ?? '';
            this.selectElement.style.color = this.styles.selectForeground ?? '';
            this.selectElement.style.borderColor = this.styles.selectBorder ?? '';
        }
    }
    createOption(value, index, disabled) {
        const option = document.createElement('option');
        option.value = value;
        option.text = value;
        option.disabled = !!disabled;
        return option;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94TmF0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3NlbGVjdEJveC9zZWxlY3RCb3hOYXRpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQVFuRCxPQUFPLEtBQUssTUFBTSxNQUFNLDJCQUEyQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFROUMsWUFDQyxPQUE0QixFQUM1QixRQUFnQixFQUNoQixNQUF3QixFQUN4QixnQkFBb0M7UUFFcEMsS0FBSyxFQUFFLENBQUE7UUFWQSxhQUFRLEdBQUcsQ0FBQyxDQUFBO1FBV25CLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRS9ELElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO1FBRWpCLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVyRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQTtRQUVsRCxJQUFJLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9FLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUE7UUFFOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFFcEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQ3BEO1FBQUEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDOUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyRSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQTtZQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDdEIsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSzthQUN4QixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0RSxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7WUFFdEIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFDQyxDQUFDLENBQUMsT0FBTywrQkFBc0I7b0JBQy9CLENBQUMsQ0FBQyxPQUFPLDZCQUFvQjtvQkFDN0IsQ0FBQyxDQUFDLE9BQU8sMkJBQWtCLEVBQzFCLENBQUM7b0JBQ0YsVUFBVSxHQUFHLElBQUksQ0FBQTtnQkFDbEIsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUNDLENBQUMsQ0FBQyxDQUFDLE9BQU8sK0JBQXNCLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFDN0MsQ0FBQyxDQUFDLE9BQU8sMkJBQWtCO29CQUMzQixDQUFDLENBQUMsT0FBTywwQkFBa0IsRUFDMUIsQ0FBQztvQkFDRixVQUFVLEdBQUcsSUFBSSxDQUFBO2dCQUNsQixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLGtHQUFrRztnQkFDbEcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQVcsV0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO0lBQy9CLENBQUM7SUFFTSxVQUFVLENBQUMsT0FBNEIsRUFBRSxRQUFpQjtRQUNoRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFFckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDakYsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFhO1FBQzFCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDbEIsQ0FBQzthQUFNLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUN0QixDQUFDO2FBQU0sSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsOEJBQThCO1lBQzlCLHFEQUFxRDtZQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDaEQsSUFDQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUNuQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQ25ELENBQUM7WUFDRixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDNUQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTSxZQUFZLENBQUMsS0FBYTtRQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7WUFDL0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRU0sVUFBVSxDQUFDLE1BQWU7UUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUE7SUFDdEMsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUFrQjtRQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxTQUFzQjtRQUNuQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzNDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFTSxLQUFLLENBQUMsTUFBd0I7UUFDcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFTSxXQUFXO1FBQ2pCLHNCQUFzQjtRQUN0QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUE7WUFDN0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFBO1lBQ25FLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUE7UUFDdEUsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsS0FBYSxFQUFFLEtBQWEsRUFBRSxRQUFrQjtRQUNwRSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFBO1FBQ25CLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUU1QixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9