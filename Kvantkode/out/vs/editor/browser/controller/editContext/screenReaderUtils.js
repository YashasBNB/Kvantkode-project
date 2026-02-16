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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvc2NyZWVuUmVhZGVyVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXJELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUE2QnpDLE1BQU0sT0FBTyx5QkFBeUI7SUFDN0IsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFrQixFQUFFLFlBQW9CO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQVksRUFBRSxZQUFvQjtRQUNqRSxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsWUFBWSxDQUFBO1FBQ2xDLE1BQU0sZUFBZSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDbEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxHQUFHLFlBQVksQ0FBQTtRQUMzQyxPQUFPLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRU0sTUFBTSxDQUFDLG1CQUFtQixDQUNoQyxLQUFtQixFQUNuQixTQUFnQixFQUNoQixZQUFvQixFQUNwQixZQUFxQjtRQUVyQixpRUFBaUU7UUFDakUsMkNBQTJDO1FBQzNDLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQTtRQUV2QixNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFDLGNBQWMs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