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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQW5jaG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdE1hcmtkb3duQW5jaG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0YsT0FBTyxFQUNOLFVBQVUsRUFFVixrQkFBa0IsRUFDbEIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRy9GLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsMkJBQTJCLENBQzNCLENBQUE7QUFhRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUF6RDs7UUFHUyxhQUFRLEdBQXlCLEVBQUUsQ0FBQTtRQUNuQyx1QkFBa0IsR0FBbUMsU0FBUyxDQUFBO0lBbUN2RSxDQUFDO0lBakNBLElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFBO0lBQy9CLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxNQUFzQztRQUNoRSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBMEI7UUFDbEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDckQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFMUIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXZDLG9DQUFvQztRQUNwQyxJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsT0FBTyxrQkFBa0IsQ0FDeEIscUJBQXFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDOUUsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzFFLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQzNDLElBQUksSUFBSSxDQUFDLGtCQUFrQixLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==