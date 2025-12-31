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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3RXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va1ZpZXdFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFzQ2hHLE1BQU0sQ0FBTixJQUFZLHFCQUlYO0FBSkQsV0FBWSxxQkFBcUI7SUFDaEMsbUZBQWlCLENBQUE7SUFDakIsdUZBQW1CLENBQUE7SUFDbkIseUZBQW9CLENBQUE7QUFDckIsQ0FBQyxFQUpXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJaEM7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBR3RDLFlBQ1UsTUFBaUMsRUFDakMsS0FBeUI7UUFEekIsV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFDakMsVUFBSyxHQUFMLEtBQUssQ0FBb0I7UUFKbkIsU0FBSSxHQUFHLHFCQUFxQixDQUFDLGFBQWEsQ0FBQTtJQUt2RCxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBR3hDLFlBQXFCLE1BQWdDO1FBQWhDLFdBQU0sR0FBTixNQUFNLENBQTBCO1FBRnJDLFNBQUksR0FBRyxxQkFBcUIsQ0FBQyxlQUFlLENBQUE7SUFFSixDQUFDO0NBQ3pEO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQUd6QyxZQUNVLE1BQXFDLEVBQ3JDLElBQTJCO1FBRDNCLFdBQU0sR0FBTixNQUFNLENBQStCO1FBQ3JDLFNBQUksR0FBSixJQUFJLENBQXVCO1FBSnJCLFNBQUksR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQTtJQUsxRCxDQUFDO0NBQ0oifQ==