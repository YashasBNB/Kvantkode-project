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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUdob3N0VGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9jb21wdXRlR2hvc3RUZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDekQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFekU7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixJQUFvQixFQUNwQixLQUFpQixFQUNqQixJQUEyQyxFQUMzQyxjQUF5QixFQUN6QixtQkFBbUIsR0FBRyxDQUFDO0lBRXZCLElBQUksQ0FBQyxHQUFHLDRCQUE0QixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUVqRCxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdkQsb0ZBQW9GO1FBQ3BGLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDaEUsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyxVQUFV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