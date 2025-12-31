/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import * as nls from '../../../../nls.js';
export class PagedScreenReaderStrategy {
    static _getPageOfLine(lineNumber, linesPerPage) {
        return Math.floor((lineNumber - 1) / linesPerPage);
    }
    static _getRangeForPage(page, linesPerPage) {
        const offset = page * linesPerPage;
        const startLineNumber = offset + 1;
        const endLineNumber = offset + linesPerPage;
        return new Range(startLineNumber, 1, endLineNumber + 1, 1);
    }
    static fromEditorSelection(model, selection, linesPerPage, trimLongText) {
        // Chromium handles very poorly text even of a few thousand chars
        // Cut text to avoid stalling the entire UI
        const LIMIT_CHARS = 500;
        const selectionStartPage = PagedScreenReaderStrategy._getPageOfLine(selection.startLineNumber, linesPerPage);
        const selectionStartPageRange = PagedScreenReaderStrategy._getRangeForPage(selectionStartPage, linesPerPage);
        const selectionEndPage = PagedScreenReaderStrategy._getPageOfLine(selection.endLineNumber, linesPerPage);
        const selectionEndPageRange = PagedScreenReaderStrategy._getRangeForPage(selectionEndPage, linesPerPage);
        let pretextRange = selectionStartPageRange.intersectRanges(new Range(1, 1, selection.startLineNumber, selection.startColumn));
        if (trimLongText &&
            model.getValueLengthInRange(pretextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const pretextStart = model.modifyPosition(pretextRange.getEndPosition(), -LIMIT_CHARS);
            pretextRange = Range.fromPositions(pretextStart, pretextRange.getEndPosition());
        }
        const pretext = model.getValueInRange(pretextRange, 1 /* EndOfLinePreference.LF */);
        const lastLine = model.getLineCount();
        const lastLineMaxColumn = model.getLineMaxColumn(lastLine);
        let posttextRange = selectionEndPageRange.intersectRanges(new Range(selection.endLineNumber, selection.endColumn, lastLine, lastLineMaxColumn));
        if (trimLongText &&
            model.getValueLengthInRange(posttextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const posttextEnd = model.modifyPosition(posttextRange.getStartPosition(), LIMIT_CHARS);
            posttextRange = Range.fromPositions(posttextRange.getStartPosition(), posttextEnd);
        }
        const posttext = model.getValueInRange(posttextRange, 1 /* EndOfLinePreference.LF */);
        let text;
        if (selectionStartPage === selectionEndPage || selectionStartPage + 1 === selectionEndPage) {
            // take full selection
            text = model.getValueInRange(selection, 1 /* EndOfLinePreference.LF */);
        }
        else {
            const selectionRange1 = selectionStartPageRange.intersectRanges(selection);
            const selectionRange2 = selectionEndPageRange.intersectRanges(selection);
            text =
                model.getValueInRange(selectionRange1, 1 /* EndOfLinePreference.LF */) +
                    String.fromCharCode(8230) +
                    model.getValueInRange(selectionRange2, 1 /* EndOfLinePreference.LF */);
        }
        if (trimLongText && text.length > 2 * LIMIT_CHARS) {
            text =
                text.substring(0, LIMIT_CHARS) +
                    String.fromCharCode(8230) +
                    text.substring(text.length - LIMIT_CHARS, text.length);
        }
        return {
            value: pretext + text + posttext,
            selection: selection,
            selectionStart: pretext.length,
            selectionEnd: pretext.length + text.length,
            startPositionWithinEditor: pretextRange.getStartPosition(),
            newlineCountBeforeSelection: pretextRange.endLineNumber - pretextRange.startLineNumber,
        };
    }
}
export function ariaLabelForScreenReaderContent(options, keybindingService) {
    const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
    if (accessibilitySupport === 1 /* AccessibilitySupport.Disabled */) {
        const toggleKeybindingLabel = keybindingService
            .lookupKeybinding('editor.action.toggleScreenReaderAccessibilityMode')
            ?.getAriaLabel();
        const runCommandKeybindingLabel = keybindingService
            .lookupKeybinding('workbench.action.showCommands')
            ?.getAriaLabel();
        const keybindingEditorKeybindingLabel = keybindingService
            .lookupKeybinding('workbench.action.openGlobalKeybindings')
            ?.getAriaLabel();
        const editorNotAccessibleMessage = nls.localize('accessibilityModeOff', 'The editor is not accessible at this time.');
        if (toggleKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabel', '{0} To enable screen reader optimized mode, use {1}', editorNotAccessibleMessage, toggleKeybindingLabel);
        }
        else if (runCommandKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKb', '{0} To enable screen reader optimized mode, open the quick pick with {1} and run the command Toggle Screen Reader Accessibility Mode, which is currently not triggerable via keyboard.', editorNotAccessibleMessage, runCommandKeybindingLabel);
        }
        else if (keybindingEditorKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKbs', '{0} Please assign a keybinding for the command Toggle Screen Reader Accessibility Mode by accessing the keybindings editor with {1} and run it.', editorNotAccessibleMessage, keybindingEditorKeybindingLabel);
        }
        else {
            // SOS
            return editorNotAccessibleMessage;
        }
    }
    return options.get(4 /* EditorOption.ariaLabel */);
}
export function newlinecount(text) {
    let result = 0;
    let startIndex = -1;
    do {
        startIndex = text.indexOf('\n', startIndex + 1);
        if (startIndex === -1) {
            break;
        }
        result++;
    } while (true);
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L3NjcmVlblJlYWRlclV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUlyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBNkJ6QyxNQUFNLE9BQU8seUJBQXlCO0lBQzdCLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBa0IsRUFBRSxZQUFvQjtRQUNyRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsWUFBb0I7UUFDakUsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLFlBQVksQ0FBQTtRQUNsQyxNQUFNLGVBQWUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLE1BQU0sR0FBRyxZQUFZLENBQUE7UUFDM0MsT0FBTyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsS0FBbUIsRUFDbkIsU0FBZ0IsRUFDaEIsWUFBb0IsRUFDcEIsWUFBcUI7UUFFckIsaUVBQWlFO1FBQ2pFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUE7UUFFdkIsTUFBTSxrQkFBa0IsR0FBRyx5QkFBeUIsQ0FBQyxjQUFjLENBQ2xFLFNBQVMsQ0FBQyxlQUFlLEVB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