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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ob3Zlci9ob3ZlcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVmLE1BQU0sQ0FBTixJQUFrQixhQUtqQjtBQUxELFdBQWtCLGFBQWE7SUFDOUIsaURBQUksQ0FBQTtJQUNKLG1EQUFLLENBQUE7SUFDTCxtREFBSyxDQUFBO0lBQ0wsbURBQUssQ0FBQTtBQUNOLENBQUMsRUFMaUIsYUFBYSxLQUFiLGFBQWEsUUFLOUI7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLFVBQVU7SUFLMUMsWUFBWSxNQUFlO1FBQzFCLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUE7UUFDaEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzRCxJQUFJLENBQUMsZ0JBQWdCLENB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