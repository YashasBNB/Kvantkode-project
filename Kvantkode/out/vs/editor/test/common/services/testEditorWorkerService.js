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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEVkaXRvcldvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy90ZXN0RWRpdG9yV29ya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFCaEcsTUFBTSxPQUFPLHVCQUF1QjtJQUduQywyQkFBMkIsQ0FBQyxHQUFRO1FBQ25DLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxHQUFRO1FBQ3ZDLE9BQU87WUFDTixNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU8sRUFBRSxLQUFLO1lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztZQUMxQix1QkFBdUIsRUFBRSxDQUFDO1lBQzFCLDJCQUEyQixFQUFFLENBQUM7U0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFDRCxLQUFLLENBQUMsV0FBVyxDQUNoQixRQUFhLEVBQ2IsUUFBYSxFQUNiLE9BQXFDLEVBQ3JDLFNBQTRCO1FBRTVCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELG1CQUFtQixDQUFDLFFBQWEsRUFBRSxRQUFhO1FBQy9DLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxnQkFBZ0IsQ0FDckIsUUFBYSxFQUNiLFFBQWEsRUFDYixvQkFBNkI7UUFFN0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsS0FBSyxDQUFDLHVCQUF1QixDQUM1QixRQUFhLEVBQ2IsS0FBb0M7UUFFcEMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyx3QkFBd0IsQ0FDN0IsUUFBYSxFQUNiLEtBQW9DO1FBRXBDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxvQkFBb0IsQ0FBQyxRQUFhO1FBQ2pDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxpQkFBaUIsQ0FDdEIsUUFBYSxFQUNiLEtBQWE7UUFFYixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxtQkFBbUIsQ0FBQyxRQUFhO1FBQ2hDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxnQkFBZ0IsQ0FDckIsUUFBYSxFQUNiLEtBQWEsRUFDYixFQUFXO1FBRVgsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQVE7UUFDaEMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEdBQVE7UUFDMUMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0QifQ==