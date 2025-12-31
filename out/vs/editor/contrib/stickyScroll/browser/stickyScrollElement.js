/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StickyRange {
    constructor(startLineNumber, endLineNumber) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
}
export class StickyElement {
    constructor(
    /**
     * Range of line numbers spanned by the current scope
     */
    range, 
    /**
     * Must be sorted by start line number
     */
    children, 
    /**
     * Parent sticky outline element
     */
    parent) {
        this.range = range;
        this.children = children;
        this.parent = parent;
    }
}
export class StickyModel {
    constructor(uri, version, element, outlineProviderId) {
        this.uri = uri;
        this.version = version;
        this.element = element;
        this.outlineProviderId = outlineProviderId;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsRWxlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3N0aWNreVNjcm9sbEVsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsZUFBdUIsRUFDdkIsYUFBcUI7UUFEckIsb0JBQWUsR0FBZixlQUFlLENBQVE7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQVE7SUFDbkMsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFDekI7SUFDQzs7T0FFRztJQUNhLEtBQThCO0lBQzlDOztPQUVHO0lBQ2EsUUFBeUI7SUFDekM7O09BRUc7SUFDYSxNQUFpQztRQVJqQyxVQUFLLEdBQUwsS0FBSyxDQUF5QjtRQUk5QixhQUFRLEdBQVIsUUFBUSxDQUFpQjtRQUl6QixXQUFNLEdBQU4sTUFBTSxDQUEyQjtJQUMvQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNVLEdBQVEsRUFDUixPQUFlLEVBQ2YsT0FBa0MsRUFDbEMsaUJBQXFDO1FBSHJDLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7UUFDbEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUM1QyxDQUFDO0NBQ0oifQ==