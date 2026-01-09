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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsRWxlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsRWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixlQUF1QixFQUN2QixhQUFxQjtRQURyQixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtJQUNuQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUN6QjtJQUNDOztPQUVHO0lBQ2EsS0FBOEI7SUFDOUM7O09BRUc7SUFDYSxRQUF5QjtJQUN6Qzs7T0FFRztJQUNhLE1BQWlDO1FBUmpDLFVBQUssR0FBTCxLQUFLLENBQXlCO1FBSTlCLGFBQVEsR0FBUixRQUFRLENBQWlCO1FBSXpCLFdBQU0sR0FBTixNQUFNLENBQTJCO0lBQy9DLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ1UsR0FBUSxFQUNSLE9BQWUsRUFDZixPQUFrQyxFQUNsQyxpQkFBcUM7UUFIckMsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBQzVDLENBQUM7Q0FDSiJ9