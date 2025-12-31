/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { Disposable } from '../../../common/lifecycle.js';
import './hoverWidget.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
export var HoverPosition;
(function (HoverPosition) {
    HoverPosition[HoverPosition["LEFT"] = 0] = "LEFT";
    HoverPosition[HoverPosition["RIGHT"] = 1] = "RIGHT";
    HoverPosition[HoverPosition["BELOW"] = 2] = "BELOW";
    HoverPosition[HoverPosition["ABOVE"] = 3] = "ABOVE";
})(HoverPosition || (HoverPosition = {}));
export class HoverWidget extends Disposable {
    constructor(fadeIn) {
        super();
        this.containerDomNode = document.createElement('div');
        this.containerDomNode.className = 'monaco-hover';
        this.containerDomNode.classList.toggle('fade-in', !!fadeIn);
        this.containerDomNode.tabIndex = 0;
        this.containerDomNode.setAttribute('role', 'tooltip');
        this.contentsDomNode = document.createElement('div');
        this.contentsDomNode.className = 'monaco-hover-content';
        this.scrollbar = this._register(new DomScrollableElement(this.contentsDomNode, {
            consumeMouseWheelIfScrollbarIsNeeded: true,
        }));
        this.containerDomNode.appendChild(this.scrollbar.getDomNode());
    }
    onContentsChanged() {
        this.scrollbar.scanDomNode();
    }
}
export class HoverAction extends Disposable {
    static render(parent, actionOptions, keybindingLabel) {
        return new HoverAction(parent, actionOptions, keybindingLabel);
    }
    constructor(parent, actionOptions, keybindingLabel) {
        super();
        this.actionLabel = actionOptions.label;
        this.actionKeybindingLabel = keybindingLabel;
        this.actionContainer = dom.append(parent, $('div.action-container'));
        this.actionContainer.setAttribute('tabindex', '0');
        this.action = dom.append(this.actionContainer, $('a.action'));
        this.action.setAttribute('role', 'button');
        if (actionOptions.iconClass) {
            dom.append(this.action, $(`span.icon.${actionOptions.iconClass}`));
        }
        this.actionRenderedLabel = keybindingLabel
            ? `${actionOptions.label} (${keybindingLabel})`
            : actionOptions.label;
        const label = dom.append(this.action, $('span'));
        label.textContent = this.actionRenderedLabel;
        this._store.add(new ClickAction(this.actionContainer, actionOptions.run));
        this._store.add(new KeyDownAction(this.actionContainer, actionOptions.run, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        this.setEnabled(true);
    }
    setEnabled(enabled) {
        if (enabled) {
            this.actionContainer.classList.remove('disabled');
            this.actionContainer.removeAttribute('aria-disabled');
        }
        else {
            this.actionContainer.classList.add('disabled');
            this.actionContainer.setAttribute('aria-disabled', 'true');
        }
    }
}
export function getHoverAccessibleViewHint(shouldHaveHint, keybinding) {
    return shouldHaveHint && keybinding
        ? localize('acessibleViewHint', 'Inspect this in the accessible view with {0}.', keybinding)
        : shouldHaveHint
            ? localize('acessibleViewHintNoKbOpen', 'Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.')
            : '';
}
export class ClickAction extends Disposable {
    constructor(container, run) {
        super();
        this._register(dom.addDisposableListener(container, dom.EventType.CLICK, (e) => {
            e.stopPropagation();
            e.preventDefault();
            run(container);
        }));
    }
}
export class KeyDownAction extends Disposable {
    constructor(container, run, keyCodes) {
        super();
        this._register(dom.addDisposableListener(container, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (keyCodes.some((keyCode) => event.equals(keyCode))) {
                e.stopPropagation();
                e.preventDefault();
                run(container);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaG92ZXIvaG92ZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pELE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZixNQUFNLENBQU4sSUFBa0IsYUFLakI7QUFMRCxXQUFrQixhQUFhO0lBQzlCLGlEQUFJLENBQUE7SUFDSixtREFBSyxDQUFBO0lBQ0wsbURBQUssQ0FBQTtJQUNMLG1EQUFLLENBQUE7QUFDTixDQUFDLEVBTGlCLGFBQWEsS0FBYixhQUFhLFFBSzlCO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxVQUFVO0lBSzFDLFlBQVksTUFBZTtRQUMxQixLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO1FBQ2hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFB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