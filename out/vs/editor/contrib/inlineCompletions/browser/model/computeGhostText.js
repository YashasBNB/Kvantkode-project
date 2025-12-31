/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { getLeadingWhitespace } from '../../../../../base/common/strings.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { GhostText, GhostTextPart } from './ghostText.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
/**
 * @param previewSuffixLength Sets where to split `inlineCompletion.text`.
 * 	If the text is `hello` and the suffix length is 2, the non-preview part is `hel` and the preview-part is `lo`.
 */
export function computeGhostText(edit, model, mode, cursorPosition, previewSuffixLength = 0) {
    let e = singleTextRemoveCommonPrefix(edit, model);
    if (e.range.endLineNumber !== e.range.startLineNumber) {
        // This edit might span multiple lines, but the first lines must be a common prefix.
        return undefined;
    }
    const sourceLine = model.getLineContent(e.range.startLineNumber);
    const sourceIndentationLength = getLeadingWhitespace(sourceLine).length;
    const suggestionTouchesIndentation = e.range.startColumn - 1 <= sourceIndentationLength;
    if (suggestionTouchesIndentation) {
        // source:      ··········[······abc]
        //                         ^^^^^^^^^ inlineCompletion.range
        //              ^^^^^^^^^^ ^^^^^^ sourceIndentationLength
        //                         ^^^^^^ replacedIndentation.length
        //                               ^^^ rangeThatDoesNotReplaceIndentation
        // inlineCompletion.text: '··foo'
        //                         ^^ suggestionAddedIndentationLength
        const suggestionAddedIndentationLength = getLeadingWhitespace(e.text).length;
        const replacedIndentation = sourceLine.substring(e.range.startColumn - 1, sourceIndentationLength);
        const [startPosition, endPosition] = [e.range.getStartPosition(), e.range.getEndPosition()];
        const newStartPosition = startPosition.column + replacedIndentation.length <= endPosition.column
            ? startPosition.delta(0, replacedIndentation.length)
            : endPosition;
        const rangeThatDoesNotReplaceIndentation = Range.fromPositions(newStartPosition, endPosition);
        const suggestionWithoutIndentationChange = e.text.startsWith(replacedIndentation)
            ? // Adds more indentation without changing existing indentation: We can add ghost text for this
                e.text.substring(replacedIndentation.length)
            : // Changes or removes existing indentation. Only add ghost text for the non-indentation part.
                e.text.substring(suggestionAddedIndentationLength);
        e = new SingleTextEdit(rangeThatDoesNotReplaceIndentation, suggestionWithoutIndentationChange);
    }
    // This is a single line string
    const valueToBeReplaced = model.getValueInRange(e.range);
    const changes = cachingDiff(valueToBeReplaced, e.text);
    if (!changes) {
        // No ghost text in case the diff would be too slow to compute
        return undefined;
    }
    const lineNumber = e.range.startLineNumber;
    const parts = new Array();
    if (mode === 'prefix') {
        const filteredChanges = changes.filter((c) => c.originalLength === 0);
        if (filteredChanges.length > 1 ||
            (filteredChanges.length === 1 &&
                filteredChanges[0].originalStart !== valueToBeReplaced.length)) {
            // Prefixes only have a single change.
            return undefined;
        }
    }
    const previewStartInCompletionText = e.text.length - previewSuffixLength;
    for (const c of changes) {
        const insertColumn = e.range.startColumn + c.originalStart + c.originalLength;
        if (mode === 'subwordSmart' &&
            cursorPosition &&
            cursorPosition.lineNumber === e.range.startLineNumber &&
            insertColumn < cursorPosition.column) {
            // No ghost text before cursor
            return undefined;
        }
        if (c.originalLength > 0) {
            return undefined;
        }
        if (c.modifiedLength === 0) {
            continue;
        }
        const modifiedEnd = c.modifiedStart + c.modifiedLength;
        const nonPreviewTextEnd = Math.max(c.modifiedStart, Math.min(modifiedEnd, previewStartInCompletionText));
        const nonPreviewText = e.text.substring(c.modifiedStart, nonPreviewTextEnd);
        const italicText = e.text.substring(nonPreviewTextEnd, Math.max(c.modifiedStart, modifiedEnd));
        if (nonPreviewText.length > 0) {
            parts.push(new GhostTextPart(insertColumn, nonPreviewText, false));
        }
        if (italicText.length > 0) {
            parts.push(new GhostTextPart(insertColumn, italicText, true));
        }
    }
    return new GhostText(lineNumber, parts);
}
let lastRequest = undefined;
function cachingDiff(originalValue, newValue) {
    if (lastRequest?.originalValue === originalValue && lastRequest?.newValue === newValue) {
        return lastRequest?.changes;
    }
    else {
        let changes = smartDiff(originalValue, newValue, true);
        if (changes) {
            const deletedChars = deletedCharacters(changes);
            if (deletedChars > 0) {
                // For performance reasons, don't compute diff if there is nothing to improve
                const newChanges = smartDiff(originalValue, newValue, false);
                if (newChanges && deletedCharacters(newChanges) < deletedChars) {
                    // Disabling smartness seems to be better here
                    changes = newChanges;
                }
            }
        }
        lastRequest = {
            originalValue,
            newValue,
            changes,
        };
        return changes;
    }
}
function deletedCharacters(changes) {
    let sum = 0;
    for (const c of changes) {
        sum += c.originalLength;
    }
    return sum;
}
/**
 * When matching `if ()` with `if (f() = 1) { g(); }`,
 * align it like this:        `if (       )`
 * Not like this:			  `if (  )`
 * Also not like this:		  `if (             )`.
 *
 * The parenthesis are preprocessed to ensure that they match correctly.
 */
export function smartDiff(originalValue, newValue, smartBracketMatching) {
    if (originalValue.length > 5000 || newValue.length > 5000) {
        // We don't want to work on strings that are too big
        return undefined;
    }
    function getMaxCharCode(val) {
        let maxCharCode = 0;
        for (let i = 0, len = val.length; i < len; i++) {
            const charCode = val.charCodeAt(i);
            if (charCode > maxCharCode) {
                maxCharCode = charCode;
            }
        }
        return maxCharCode;
    }
    const maxCharCode = Math.max(getMaxCharCode(originalValue), getMaxCharCode(newValue));
    function getUniqueCharCode(id) {
        if (id < 0) {
            throw new Error('unexpected');
        }
        return maxCharCode + id + 1;
    }
    function getElements(source) {
        let level = 0;
        let group = 0;
        const characters = new Int32Array(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            // TODO support more brackets
            if (smartBracketMatching && source[i] === '(') {
                const id = group * 100 + level;
                characters[i] = getUniqueCharCode(2 * id);
                level++;
            }
            else if (smartBracketMatching && source[i] === ')') {
                level = Math.max(level - 1, 0);
                const id = group * 100 + level;
                characters[i] = getUniqueCharCode(2 * id + 1);
                if (level === 0) {
                    group++;
                }
            }
            else {
                characters[i] = source.charCodeAt(i);
            }
        }
        return characters;
    }
    const elements1 = getElements(originalValue);
    const elements2 = getElements(newValue);
    return new LcsDiff({ getElements: () => elements1 }, { getElements: () => elements2 }).ComputeDiff(false).changes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUdob3N0VGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvY29tcHV0ZUdob3N0VGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3pELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXpFOzs7R0FHRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsSUFBb0IsRUFDcEIsS0FBaUIsRUFDakIsSUFBMkMsRUFDM0MsY0FBeUIsRUFDekIsbUJBQW1CLEdBQUcsQ0FBQztJQUV2QixJQUFJLENBQUMsR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFFakQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3ZELG9GQUFvRjtRQUNwRixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFBO0lBRXZFLE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixDQUFBO0lBQ3ZGLElBQUksNEJBQTRCLEVBQUUsQ0FBQztRQUNsQyxxQ0FBcUM7UUFDckMsMkRBQTJEO1FBQzNELHlEQUF5RDtRQUN6RCw0REFBNEQ7UUFDNUQsdUVBQXVFO1FBQ3ZFLGlDQUFpQztRQUNqQyw4REFBOEQ7UUFDOUQsTUFBTSxnQ0FBZ0MsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRTVFLE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FDL0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUN2Qix1QkFBdUIsQ0FDdkIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sZ0JBQWdCLEdBQ3JCLGFBQWEsQ0FBQyxNQUFNLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxNQUFNO1lBQ3RFLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7WUFDcEQsQ0FBQyxDQUFDLFdBQVcsQ0FBQTtRQUNmLE1BQU0sa0NBQWtDLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU3RixNQUFNLGtDQUFrQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2hGLENBQUMsQ0FBQyw4RkFBOEY7Z0JBQy9GLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQztZQUM3QyxDQUFDLENBQUMsNkZBQTZGO2dCQUM5RixDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1FBRXBELENBQUMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFRCwrQkFBK0I7SUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUV4RCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXRELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLDhEQUE4RDtRQUM5RCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7SUFFMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQWlCLENBQUE7SUFFeEMsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdkIsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxJQUNDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUMxQixDQUFDLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFDNUIsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsS0FBSyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFDOUQsQ0FBQztZQUNGLHNDQUFzQztZQUN0QyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsbUJBQW1CLENBQUE7SUFFeEUsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN6QixNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUE7UUFFN0UsSUFDQyxJQUFJLEtBQUssY0FBYztZQUN2QixjQUFjO1lBQ2QsY0FBYyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWU7WUFDckQsWUFBWSxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQ25DLENBQUM7WUFDRiw4QkFBOEI7WUFDOUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLGNBQWMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLFNBQVE7UUFDVCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFBO1FBQ3RELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDakMsQ0FBQyxDQUFDLGFBQWEsRUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSw0QkFBNEIsQ0FBQyxDQUNuRCxDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRTlGLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDeEMsQ0FBQztBQUVELElBQUksV0FBVyxHQUVBLFNBQVMsQ0FBQTtBQUN4QixTQUFTLFdBQVcsQ0FBQyxhQUFxQixFQUFFLFFBQWdCO0lBQzNELElBQUksV0FBVyxFQUFFLGFBQWEsS0FBSyxhQUFhLElBQUksV0FBVyxFQUFFLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4RixPQUFPLFdBQVcsRUFBRSxPQUFPLENBQUE7SUFDNUIsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDL0MsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLDZFQUE2RTtnQkFDN0UsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzVELElBQUksVUFBVSxJQUFJLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxHQUFHLFlBQVksRUFBRSxDQUFDO29CQUNoRSw4Q0FBOEM7b0JBQzlDLE9BQU8sR0FBRyxVQUFVLENBQUE7Z0JBQ3JCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELFdBQVcsR0FBRztZQUNiLGFBQWE7WUFDYixRQUFRO1lBQ1IsT0FBTztTQUNQLENBQUE7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxPQUErQjtJQUN6RCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDWCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLEdBQUcsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLFNBQVMsQ0FDeEIsYUFBcUIsRUFDckIsUUFBZ0IsRUFDaEIsb0JBQTZCO0lBRTdCLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUMzRCxvREFBb0Q7UUFDcEQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLEdBQVc7UUFDbEMsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLElBQUksUUFBUSxHQUFHLFdBQVcsRUFBRSxDQUFDO2dCQUM1QixXQUFXLEdBQUcsUUFBUSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ3JGLFNBQVMsaUJBQWlCLENBQUMsRUFBVTtRQUNwQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sV0FBVyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLE1BQWM7UUFDbEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCw2QkFBNkI7WUFDN0IsSUFBSSxvQkFBb0IsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFBO2dCQUM5QixVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO2dCQUN6QyxLQUFLLEVBQUUsQ0FBQTtZQUNSLENBQUM7aUJBQU0sSUFBSSxvQkFBb0IsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3RELEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzlCLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFBO2dCQUM5QixVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDN0MsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pCLEtBQUssRUFBRSxDQUFBO2dCQUNSLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzVDLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUV2QyxPQUFPLElBQUksT0FBTyxDQUNqQixFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFDaEMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQ2hDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQTtBQUM3QixDQUFDIn0=