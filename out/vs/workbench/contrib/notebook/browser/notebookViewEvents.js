/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var NotebookViewEventType;
(function (NotebookViewEventType) {
    NotebookViewEventType[NotebookViewEventType["LayoutChanged"] = 1] = "LayoutChanged";
    NotebookViewEventType[NotebookViewEventType["MetadataChanged"] = 2] = "MetadataChanged";
    NotebookViewEventType[NotebookViewEventType["CellStateChanged"] = 3] = "CellStateChanged";
})(NotebookViewEventType || (NotebookViewEventType = {}));
export class NotebookLayoutChangedEvent {
    constructor(source, value) {
        this.source = source;
        this.value = value;
        this.type = NotebookViewEventType.LayoutChanged;
    }
}
export class NotebookMetadataChangedEvent {
    constructor(source) {
        this.source = source;
        this.type = NotebookViewEventType.MetadataChanged;
    }
}
export class NotebookCellStateChangedEvent {
    constructor(source, cell) {
        this.source = source;
        this.cell = cell;
        this.type = NotebookViewEventType.CellStateChanged;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3RXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rVmlld0V2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNDaEcsTUFBTSxDQUFOLElBQVkscUJBSVg7QUFKRCxXQUFZLHFCQUFxQjtJQUNoQyxtRkFBaUIsQ0FBQTtJQUNqQix1RkFBbUIsQ0FBQTtJQUNuQix5RkFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBSlcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUloQztBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFHdEMsWUFDVSxNQUFpQyxFQUNqQyxLQUF5QjtRQUR6QixXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUNqQyxVQUFLLEdBQUwsS0FBSyxDQUFvQjtRQUpuQixTQUFJLEdBQUcscUJBQXFCLENBQUMsYUFBYSxDQUFBO0lBS3ZELENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyw0QkFBNEI7SUFHeEMsWUFBcUIsTUFBZ0M7UUFBaEMsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7UUFGckMsU0FBSSxHQUFHLHFCQUFxQixDQUFDLGVBQWUsQ0FBQTtJQUVKLENBQUM7Q0FDekQ7QUFFRCxNQUFNLE9BQU8sNkJBQTZCO0lBR3pDLFlBQ1UsTUFBcUMsRUFDckMsSUFBMkI7UUFEM0IsV0FBTSxHQUFOLE1BQU0sQ0FBK0I7UUFDckMsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFKckIsU0FBSSxHQUFHLHFCQUFxQixDQUFDLGdCQUFnQixDQUFBO0lBSzFELENBQUM7Q0FDSiJ9