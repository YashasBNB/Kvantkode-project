/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestEditorWorkerService {
    canComputeUnicodeHighlights(uri) {
        return false;
    }
    async computedUnicodeHighlights(uri) {
        return {
            ranges: [],
            hasMore: false,
            ambiguousCharacterCount: 0,
            invisibleCharacterCount: 0,
            nonBasicAsciiCharacterCount: 0,
        };
    }
    async computeDiff(original, modified, options, algorithm) {
        return null;
    }
    canComputeDirtyDiff(original, modified) {
        return false;
    }
    async computeDirtyDiff(original, modified, ignoreTrimWhitespace) {
        return null;
    }
    async computeMoreMinimalEdits(resource, edits) {
        return undefined;
    }
    async computeHumanReadableDiff(resource, edits) {
        return undefined;
    }
    canComputeWordRanges(resource) {
        return false;
    }
    async computeWordRanges(resource, range) {
        return null;
    }
    canNavigateValueSet(resource) {
        return false;
    }
    async navigateValueSet(resource, range, up) {
        return null;
    }
    async findSectionHeaders(uri) {
        return [];
    }
    async computeDefaultDocumentColors(uri) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEVkaXRvcldvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvdGVzdEVkaXRvcldvcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxQmhHLE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsMkJBQTJCLENBQUMsR0FBUTtRQUNuQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMseUJBQXlCLENBQUMsR0FBUTtRQUN2QyxPQUFPO1lBQ04sTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPLEVBQUUsS0FBSztZQUNkLHVCQUF1QixFQUFFLENBQUM7WUFDMUIsdUJBQXVCLEVBQUUsQ0FBQztZQUMxQiwyQkFBMkIsRUFBRSxDQUFDO1NBQzlCLENBQUE7SUFDRixDQUFDO0lBQ0QsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsUUFBYSxFQUNiLFFBQWEsRUFDYixPQUFxQyxFQUNyQyxTQUE0QjtRQUU1QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxtQkFBbUIsQ0FBQyxRQUFhLEVBQUUsUUFBYTtRQUMvQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLFFBQWEsRUFDYixRQUFhLEVBQ2Isb0JBQTZCO1FBRTdCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELEtBQUssQ0FBQyx1QkFBdUIsQ0FDNUIsUUFBYSxFQUNiLEtBQW9DO1FBRXBDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsd0JBQXdCLENBQzdCLFFBQWEsRUFDYixLQUFvQztRQUVwQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0Qsb0JBQW9CLENBQUMsUUFBYTtRQUNqQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsaUJBQWlCLENBQ3RCLFFBQWEsRUFDYixLQUFhO1FBRWIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsbUJBQW1CLENBQUMsUUFBYTtRQUNoQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLFFBQWEsRUFDYixLQUFhLEVBQ2IsRUFBVztRQUVYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRO1FBQ2hDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxHQUFRO1FBQzFDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEIn0=