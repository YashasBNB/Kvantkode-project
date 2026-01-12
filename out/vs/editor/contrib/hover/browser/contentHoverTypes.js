/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ContentHoverResult {
    constructor(hoverParts, isComplete, options) {
        this.hoverParts = hoverParts;
        this.isComplete = isComplete;
        this.options = options;
    }
    filter(anchor) {
        const filteredHoverParts = this.hoverParts.filter((m) => m.isValidForHoverAnchor(anchor));
        if (filteredHoverParts.length === this.hoverParts.length) {
            return this;
        }
        return new FilteredContentHoverResult(this, filteredHoverParts, this.isComplete, this.options);
    }
}
export class FilteredContentHoverResult extends ContentHoverResult {
    constructor(original, messages, isComplete, options) {
        super(messages, isComplete, options);
        this.original = original;
    }
    filter(anchor) {
        return this.original.filter(anchor);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvY29udGVudEhvdmVyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixZQUNpQixVQUF3QixFQUN4QixVQUFtQixFQUNuQixPQUFvQztRQUZwQyxlQUFVLEdBQVYsVUFBVSxDQUFjO1FBQ3hCLGVBQVUsR0FBVixVQUFVLENBQVM7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7SUFDbEQsQ0FBQztJQUVHLE1BQU0sQ0FBQyxNQUFtQjtRQUNoQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN6RixJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGtCQUFrQjtJQUNqRSxZQUNrQixRQUE0QixFQUM3QyxRQUFzQixFQUN0QixVQUFtQixFQUNuQixPQUFvQztRQUVwQyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUxuQixhQUFRLEdBQVIsUUFBUSxDQUFvQjtJQU05QyxDQUFDO0lBRWUsTUFBTSxDQUFDLE1BQW1CO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUNEIn0=