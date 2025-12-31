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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3F1aWNrSW5wdXRVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEtBQUssS0FBSyxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXBFLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBSzFDLE1BQU0sZUFBZSxHQUEyQixFQUFFLENBQUE7QUFDbEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0FBRXRFLFNBQVMsWUFBWSxDQUFDLFFBQWdEO0lBQ3JFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLFNB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