/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import './aria.css';
// Use a max length since we are inserting the whole msg in the DOM and that can cause browsers to freeze for long messages #94233
const MAX_MESSAGE_LENGTH = 20000;
let ariaContainer;
let alertContainer;
let alertContainer2;
let statusContainer;
let statusContainer2;
export function setARIAContainer(parent) {
    ariaContainer = document.createElement('div');
    ariaContainer.className = 'monaco-aria-container';
    const createAlertContainer = () => {
        const element = document.createElement('div');
        element.className = 'monaco-alert';
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-atomic', 'true');
        ariaContainer.appendChild(element);
        return element;
    };
    alertContainer = createAlertContainer();
    alertContainer2 = createAlertContainer();
    const createStatusContainer = () => {
        const element = document.createElement('div');
        element.className = 'monaco-status';
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        ariaContainer.appendChild(element);
        return element;
    };
    statusContainer = createStatusContainer();
    statusContainer2 = createStatusContainer();
    parent.appendChild(ariaContainer);
}
/**
 * Given the provided message, will make sure that it is read as alert to screen readers.
 */
export function alert(msg) {
    if (!ariaContainer) {
        return;
    }
    // Use alternate containers such that duplicated messages get read out by screen readers #99466
    if (alertContainer.textContent !== msg) {
        dom.clearNode(alertContainer2);
        insertMessage(alertContainer, msg);
    }
    else {
        dom.clearNode(alertContainer);
        insertMessage(alertContainer2, msg);
    }
}
/**
 * Given the provided message, will make sure that it is read as status to screen readers.
 */
export function status(msg) {
    if (!ariaContainer) {
        return;
    }
    if (statusContainer.textContent !== msg) {
        dom.clearNode(statusContainer2);
        insertMessage(statusContainer, msg);
    }
    else {
        dom.clearNode(statusContainer);
        insertMessage(statusContainer2, msg);
    }
}
function insertMessage(target, msg) {
    dom.clearNode(target);
    if (msg.length > MAX_MESSAGE_LENGTH) {
        msg = msg.substr(0, MAX_MESSAGE_LENGTH);
    }
    target.textContent = msg;
    // See https://www.paciellogroup.com/blog/2012/06/html5-accessibility-chops-aria-rolealert-browser-support/
    target.style.visibility = 'hidden';
    target.style.visibility = 'visible';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJpYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2FyaWEvYXJpYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLFlBQVksQ0FBQTtBQUVuQixrSUFBa0k7QUFDbEksTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7QUFDaEMsSUFBSSxhQUEwQixDQUFBO0FBQzlCLElBQUksY0FBMkIsQ0FBQTtBQUMvQixJQUFJLGVBQTRCLENBQUE7QUFDaEMsSUFBSSxlQUE0QixDQUFBO0FBQ2hDLElBQUksZ0JBQTZCLENBQUE7QUFDakMsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE1BQW1CO0lBQ25ELGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsdUJBQXVCLENBQUE7SUFFakQsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLEVBQUU7UUFDakMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxPQUFPLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQTtRQUNsQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2xDLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQyxDQUFBO0lBQ0QsY0FBYyxHQUFHLG9CQUFvQixFQUFFLENBQUE7SUFDdkMsZUFBZSxHQUFHLG9CQUFvQixFQUFFLENBQUE7SUFFeEMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLEVBQUU7UUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxPQUFPLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQTtRQUNuQyxPQUFPLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMzQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2xDLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQyxDQUFBO0lBQ0QsZUFBZSxHQUFHLHFCQUFxQixFQUFFLENBQUE7SUFDekMsZ0JBQWdCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQTtJQUUxQyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFDRDs7R0FFRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQUMsR0FBVztJQUNoQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTTtJQUNQLENBQUM7SUFFRCwrRkFBK0Y7SUFDL0YsSUFBSSxjQUFjLENBQUMsV0FBVyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDOUIsYUFBYSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNuQyxDQUFDO1NBQU0sQ0FBQztRQUNQLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDN0IsYUFBYSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FBQyxHQUFXO0lBQ2pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNwQixPQUFNO0lBQ1AsQ0FBQztJQUVELElBQUksZUFBZSxDQUFDLFdBQVcsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUN6QyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDL0IsYUFBYSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNwQyxDQUFDO1NBQU0sQ0FBQztRQUNQLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDOUIsYUFBYSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsTUFBbUIsRUFBRSxHQUFXO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDckIsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDckMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUNELE1BQU0sQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFBO0lBRXhCLDJHQUEyRztJQUMzRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUE7SUFDbEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0FBQ3BDLENBQUMifQ==