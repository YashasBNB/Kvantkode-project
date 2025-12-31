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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJpYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9hcmlhL2FyaWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxZQUFZLENBQUE7QUFFbkIsa0lBQWtJO0FBQ2xJLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0FBQ2hDLElBQUksYUFBMEIsQ0FBQTtBQUM5QixJQUFJLGNBQTJCLENBQUE7QUFDL0IsSUFBSSxlQUE0QixDQUFBO0FBQ2hDLElBQUksZUFBNEIsQ0FBQTtBQUNoQyxJQUFJLGdCQUE2QixDQUFBO0FBQ2pDLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxNQUFtQjtJQUNuRCxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QyxhQUFhLENBQUMsU0FBUyxHQUFHLHVCQUF1QixDQUFBO0lBRWpELE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUE7UUFDbEMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckMsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0MsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUMsQ0FBQTtJQUNELGNBQWMsR0FBRyxvQkFBb0IsRUFBRSxDQUFBO0lBQ3ZDLGVBQWUsR0FBRyxvQkFBb0IsRUFBRSxDQUFBO0lBRXhDLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUE7UUFDbkMsT0FBTyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0MsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0MsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUMsQ0FBQTtJQUNELGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFBO0lBQ3pDLGdCQUFnQixHQUFHLHFCQUFxQixFQUFFLENBQUE7SUFFMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNsQyxDQUFDO0FBQ0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLEdBQVc7SUFDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU07SUFDUCxDQUFDO0lBRUQsK0ZBQStGO0lBQy9GLElBQUksY0FBYyxDQUFDLFdBQVcsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUN4QyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzlCLGFBQWEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDbkMsQ0FBQztTQUFNLENBQUM7UUFDUCxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzdCLGFBQWEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsR0FBVztJQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTTtJQUNQLENBQUM7SUFFRCxJQUFJLGVBQWUsQ0FBQyxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDekMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQy9CLGFBQWEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztTQUFNLENBQUM7UUFDUCxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzlCLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE1BQW1CLEVBQUUsR0FBVztJQUN0RCxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JCLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JDLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFDRCxNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQTtJQUV4QiwyR0FBMkc7SUFDM0csTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFBO0lBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtBQUNwQyxDQUFDIn0=