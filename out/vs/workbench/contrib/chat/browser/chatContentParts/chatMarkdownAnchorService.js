/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, isActiveElement } from '../../../../../base/browser/dom.js';
import { Disposable, combinedDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IChatMarkdownAnchorService = createDecorator('chatMarkdownAnchorService');
export class ChatMarkdownAnchorService extends Disposable {
    constructor() {
        super(...arguments);
        this._widgets = [];
        this._lastFocusedWidget = undefined;
    }
    get lastFocusedAnchor() {
        return this._lastFocusedWidget;
    }
    setLastFocusedList(widget) {
        this._lastFocusedWidget = widget;
    }
    register(widget) {
        if (this._widgets.some((other) => other === widget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        // Keep in our lists list
        this._widgets.push(widget);
        const element = widget.getHTMLElement();
        // Check for currently being focused
        if (isActiveElement(element)) {
            this.setLastFocusedList(widget);
        }
        return combinedDisposable(addDisposableListener(element, 'focus', () => this.setLastFocusedList(widget)), toDisposable(() => this._widgets.splice(this._widgets.indexOf(widget), 1)), addDisposableListener(element, 'blur', () => {
            if (this._lastFocusedWidget === widget) {
                this.setLastFocusedList(undefined);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQW5jaG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRNYXJrZG93bkFuY2hvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNGLE9BQU8sRUFDTixVQUFVLEVBRVYsa0JBQWtCLEVBQ2xCLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUcvRixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDJCQUEyQixDQUMzQixDQUFBO0FBYUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFBekQ7O1FBR1MsYUFBUSxHQUF5QixFQUFFLENBQUE7UUFDbkMsdUJBQWtCLEdBQW1DLFNBQVMsQ0FBQTtJQW1DdkUsQ0FBQztJQWpDQSxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtJQUMvQixDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBc0M7UUFDaEUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQTtJQUNqQyxDQUFDO0lBRUQsUUFBUSxDQUFDLE1BQTBCO1FBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3JELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQTtRQUNsRSxDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUV2QyxvQ0FBb0M7UUFDcEMsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUVELE9BQU8sa0JBQWtCLENBQ3hCLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQzlFLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUMxRSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUMzQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=