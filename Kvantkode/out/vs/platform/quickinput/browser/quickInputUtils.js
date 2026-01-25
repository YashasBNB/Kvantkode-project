/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { Event } from '../../../base/common/event.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Gesture, EventType as GestureEventType } from '../../../base/browser/touch.js';
import { renderLabelWithIcons } from '../../../base/browser/ui/iconLabel/iconLabels.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import { parseLinkedText } from '../../../base/common/linkedText.js';
import './media/quickInput.css';
import { localize } from '../../../nls.js';
const iconPathToClass = {};
const iconClassGenerator = new IdGenerator('quick-input-button-icon-');
function getIconClass(iconPath) {
    if (!iconPath) {
        return undefined;
    }
    let iconClass;
    const key = iconPath.dark.toString();
    if (iconPathToClass[key]) {
        iconClass = iconPathToClass[key];
    }
    else {
        iconClass = iconClassGenerator.nextId();
        domStylesheetsJs.createCSSRule(`.${iconClass}, .hc-light .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.light || iconPath.dark)}`);
        domStylesheetsJs.createCSSRule(`.vs-dark .${iconClass}, .hc-black .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.dark)}`);
        iconPathToClass[key] = iconClass;
    }
    return iconClass;
}
export function quickInputButtonToAction(button, id, run) {
    let cssClasses = button.iconClass || getIconClass(button.iconPath);
    if (button.alwaysVisible) {
        cssClasses = cssClasses ? `${cssClasses} always-visible` : 'always-visible';
    }
    return {
        id,
        label: '',
        tooltip: button.tooltip || '',
        class: cssClasses,
        enabled: true,
        run,
    };
}
export function renderQuickInputDescription(description, container, actionHandler) {
    dom.reset(container);
    const parsed = parseLinkedText(description);
    let tabIndex = 0;
    for (const node of parsed.nodes) {
        if (typeof node === 'string') {
            container.append(...renderLabelWithIcons(node));
        }
        else {
            let title = node.title;
            if (!title && node.href.startsWith('command:')) {
                title = localize('executeCommand', "Click to execute command '{0}'", node.href.substring('command:'.length));
            }
            else if (!title) {
                title = node.href;
            }
            const anchor = dom.$('a', { href: node.href, title, tabIndex: tabIndex++ }, node.label);
            anchor.style.textDecoration = 'underline';
            const handleOpen = (e) => {
                if (dom.isEventLike(e)) {
                    dom.EventHelper.stop(e, true);
                }
                actionHandler.callback(node.href);
            };
            const onClick = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.CLICK)).event;
            const onKeydown = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.KEY_DOWN)).event;
            const onSpaceOrEnter = Event.chain(onKeydown, ($) => $.filter((e) => {
                const event = new StandardKeyboardEvent(e);
                return event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */);
            }));
            actionHandler.disposables.add(Gesture.addTarget(anchor));
            const onTap = actionHandler.disposables.add(new DomEmitter(anchor, GestureEventType.Tap)).event;
            Event.any(onClick, onTap, onSpaceOrEnter)(handleOpen, null, actionHandler.disposables);
            container.appendChild(anchor);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFcEUsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFLMUMsTUFBTSxlQUFlLEdBQTJCLEVBQUUsQ0FBQTtBQUNsRCxNQUFNLGtCQUFrQixHQUFHLElBQUksV0FBVyxDQUFDLDBCQUEwQixDQUFDLENBQUE7QUFFdEUsU0FBUyxZQUFZLENBQUMsUUFBZ0Q7SUFDckUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElB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