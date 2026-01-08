/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export var NotebookDiffViewEventType;
(function (NotebookDiffViewEventType) {
    NotebookDiffViewEventType[NotebookDiffViewEventType["LayoutChanged"] = 1] = "LayoutChanged";
    NotebookDiffViewEventType[NotebookDiffViewEventType["CellLayoutChanged"] = 2] = "CellLayoutChanged";
    // MetadataChanged = 2,
    // CellStateChanged = 3
})(NotebookDiffViewEventType || (NotebookDiffViewEventType = {}));
export class NotebookDiffLayoutChangedEvent {
    constructor(source, value) {
        this.source = source;
        this.value = value;
        this.type = NotebookDiffViewEventType.LayoutChanged;
    }
}
export class NotebookCellLayoutChangedEvent {
    constructor(source) {
        this.source = source;
        this.type = NotebookDiffViewEventType.CellLayoutChanged;
    }
}
export class NotebookDiffEditorEventDispatcher extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeCellLayout = this._register(new Emitter());
        this.onDidChangeCellLayout = this._onDidChangeCellLayout.event;
    }
    emit(events) {
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case NotebookDiffViewEventType.LayoutChanged:
                    this._onDidChangeLayout.fire(e);
                    break;
                case NotebookDiffViewEventType.CellLayoutChanged:
                    this._onDidChangeCellLayout.fire(e);
                    break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZXZlbnREaXNwYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJcEUsTUFBTSxDQUFOLElBQVkseUJBS1g7QUFMRCxXQUFZLHlCQUF5QjtJQUNwQywyRkFBaUIsQ0FBQTtJQUNqQixtR0FBcUIsQ0FBQTtJQUNyQix1QkFBdUI7SUFDdkIsdUJBQXVCO0FBQ3hCLENBQUMsRUFMVyx5QkFBeUIsS0FBekIseUJBQXlCLFFBS3BDO0FBRUQsTUFBTSxPQUFPLDhCQUE4QjtJQUcxQyxZQUNVLE1BQWlDLEVBQ2pDLEtBQXlCO1FBRHpCLFdBQU0sR0FBTixNQUFNLENBQTJCO1FBQ2pDLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBSm5CLFNBQUksR0FBRyx5QkFBeUIsQ0FBQyxhQUFhLENBQUE7SUFLM0QsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLDhCQUE4QjtJQUcxQyxZQUFxQixNQUE4QjtRQUE5QixXQUFNLEdBQU4sTUFBTSxDQUF3QjtRQUZuQyxTQUFJLEdBQUcseUJBQXlCLENBQUMsaUJBQWlCLENBQUE7SUFFWixDQUFDO0NBQ3ZEO0FBSUQsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLFVBQVU7SUFBakU7O1FBQ29CLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JELElBQUksT0FBTyxFQUFrQyxDQUM3QyxDQUFBO1FBQ1Esc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUV2QywyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6RCxJQUFJLE9BQU8sRUFBa0MsQ0FDN0MsQ0FBQTtRQUNRLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7SUFnQm5FLENBQUM7SUFkQSxJQUFJLENBQUMsTUFBK0I7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVuQixRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEIsS0FBSyx5QkFBeUIsQ0FBQyxhQUFhO29CQUMzQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUMvQixNQUFLO2dCQUNOLEtBQUsseUJBQXlCLENBQUMsaUJBQWlCO29CQUMvQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNuQyxNQUFLO1lBQ1AsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==