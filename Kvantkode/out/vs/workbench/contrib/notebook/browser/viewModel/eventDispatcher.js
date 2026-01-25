/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { NotebookViewEventType, } from '../notebookViewEvents.js';
export class NotebookEventDispatcher extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidChangeCellState = this._register(new Emitter());
        this.onDidChangeCellState = this._onDidChangeCellState.event;
    }
    emit(events) {
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case NotebookViewEventType.LayoutChanged:
                    this._onDidChangeLayout.fire(e);
                    break;
                case NotebookViewEventType.MetadataChanged:
                    this._onDidChangeMetadata.fire(e);
                    break;
                case NotebookViewEventType.CellStateChanged:
                    this._onDidChangeCellState.fire(e);
                    break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9ldmVudERpc3BhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBS04scUJBQXFCLEdBQ3JCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFBdkQ7O1FBQ2tCLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQThCLENBQUMsQ0FBQTtRQUN0RixzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBRXpDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JELElBQUksT0FBTyxFQUFnQyxDQUMzQyxDQUFBO1FBQ1Esd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQUU3QywwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN0RCxJQUFJLE9BQU8sRUFBaUMsQ0FDNUMsQ0FBQTtRQUNRLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7SUFtQmpFLENBQUM7SUFqQkEsSUFBSSxDQUFDLE1BQTJCO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbkIsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLEtBQUsscUJBQXFCLENBQUMsYUFBYTtvQkFDdkMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDL0IsTUFBSztnQkFDTixLQUFLLHFCQUFxQixDQUFDLGVBQWU7b0JBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2pDLE1BQUs7Z0JBQ04sS0FBSyxxQkFBcUIsQ0FBQyxnQkFBZ0I7b0JBQzFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2xDLE1BQUs7WUFDUCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9