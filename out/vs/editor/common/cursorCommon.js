/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './core/position.js';
import { Range } from './core/range.js';
import { Selection } from './core/selection.js';
import { createScopedLineTokens } from './languages/supports.js';
import { CursorColumns } from './core/cursorColumns.js';
import { normalizeIndentation } from './core/indentation.js';
import { InputMode } from './inputMode.js';
/**
 * This is an operation type that will be recorded for undo/redo purposes.
 * The goal is to introduce an undo stop when the controller switches between different operation types.
 */
export var EditOperationType;
(function (EditOperationType) {
    EditOperationType[EditOperationType["Other"] = 0] = "Other";
    EditOperationType[EditOperationType["DeletingLeft"] = 2] = "DeletingLeft";
    EditOperationType[EditOperationType["DeletingRight"] = 3] = "DeletingRight";
    EditOperationType[EditOperationType["TypingOther"] = 4] = "TypingOther";
    EditOperationType[EditOperationType["TypingFirstSpace"] = 5] = "TypingFirstSpace";
    EditOperationType[EditOperationType["TypingConsecutiveSpace"] = 6] = "TypingConsecutiveSpace";
})(EditOperationType || (EditOperationType = {}));
const autoCloseAlways = () => true;
const autoCloseNever = () => false;
const autoCloseBeforeWhitespace = (chr) => chr === ' ' || chr === '\t';
export class CursorConfiguration {
    static shouldRecreate(e) {
        return (e.hasChanged(151 /* EditorOption.layoutInfo */) ||
            e.hasChanged(136 /* EditorOption.wordSeparators */) ||
            e.hasChanged(38 /* EditorOption.emptySelectionClipboard */) ||
            e.hasChanged(78 /* EditorOption.multiCursorMergeOverlapping */) ||
            e.hasChanged(80 /* EditorOption.multiCursorPaste */) ||
            e.hasChanged(81 /* EditorOption.multiCursorLimit */) ||
            e.hasChanged(6 /* EditorOption.autoClosingBrackets */) ||
            e.hasChanged(7 /* EditorOption.autoClosingComments */) ||
            e.hasChanged(11 /* EditorOption.autoClosingQuotes */) ||
            e.hasChanged(9 /* EditorOption.autoClosingDelete */) ||
            e.hasChanged(10 /* EditorOption.autoClosingOvertype */) ||
            e.hasChanged(14 /* EditorOption.autoSurround */) ||
            e.hasChanged(133 /* EditorOption.useTabStops */) ||
            e.hasChanged(52 /* EditorOption.fontInfo */) ||
            e.hasChanged(96 /* EditorOption.readOnly */) ||
            e.hasChanged(135 /* EditorOption.wordSegmenterLocales */) ||
            e.hasChanged(85 /* EditorOption.overtypeOnPaste */));
    }
    constructor(languageId, modelOptions, configuration, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._cursorMoveConfigurationBrand = undefined;
        this._languageId = languageId;
        const options = configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this.readOnly = options.get(96 /* EditorOption.readOnly */);
        this.tabSize = modelOptions.tabSize;
        this.indentSize = modelOptions.indentSize;
        this.insertSpaces = modelOptions.insertSpaces;
        this.stickyTabStops = options.get(121 /* EditorOption.stickyTabStops */);
        this.lineHeight = fontInfo.lineHeight;
        this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this.pageSize = Math.max(1, Math.floor(layoutInfo.height / this.lineHeight) - 2);
        this.useTabStops = options.get(133 /* EditorOption.useTabStops */);
        this.wordSeparators = options.get(136 /* EditorOption.wordSeparators */);
        this.emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
        this.copyWithSyntaxHighlighting = options.get(25 /* EditorOption.copyWithSyntaxHighlighting */);
        this.multiCursorMergeOverlapping = options.get(78 /* EditorOption.multiCursorMergeOverlapping */);
        this.multiCursorPaste = options.get(80 /* EditorOption.multiCursorPaste */);
        this.multiCursorLimit = options.get(81 /* EditorOption.multiCursorLimit */);
        this.autoClosingBrackets = options.get(6 /* EditorOption.autoClosingBrackets */);
        this.autoClosingComments = options.get(7 /* EditorOption.autoClosingComments */);
        this.autoClosingQuotes = options.get(11 /* EditorOption.autoClosingQuotes */);
        this.autoClosingDelete = options.get(9 /* EditorOption.autoClosingDelete */);
        this.autoClosingOvertype = options.get(10 /* EditorOption.autoClosingOvertype */);
        this.autoSurround = options.get(14 /* EditorOption.autoSurround */);
        this.autoIndent = options.get(12 /* EditorOption.autoIndent */);
        this.wordSegmenterLocales = options.get(135 /* EditorOption.wordSegmenterLocales */);
        this.overtypeOnPaste = options.get(85 /* EditorOption.overtypeOnPaste */);
        this.surroundingPairs = {};
        this._electricChars = null;
        this.shouldAutoCloseBefore = {
            quote: this._getShouldAutoClose(languageId, this.autoClosingQuotes, true),
            comment: this._getShouldAutoClose(languageId, this.autoClosingComments, false),
            bracket: this._getShouldAutoClose(languageId, this.autoClosingBrackets, false),
        };
        this.autoClosingPairs = this.languageConfigurationService
            .getLanguageConfiguration(languageId)
            .getAutoClosingPairs();
        const surroundingPairs = this.languageConfigurationService
            .getLanguageConfiguration(languageId)
            .getSurroundingPairs();
        if (surroundingPairs) {
            for (const pair of surroundingPairs) {
                this.surroundingPairs[pair.open] = pair.close;
            }
        }
        const commentsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        this.blockCommentStartToken = commentsConfiguration?.blockCommentStartToken ?? null;
    }
    get electricChars() {
        if (!this._electricChars) {
            this._electricChars = {};
            const electricChars = this.languageConfigurationService
                .getLanguageConfiguration(this._languageId)
                .electricCharacter?.getElectricCharacters();
            if (electricChars) {
                for (const char of electricChars) {
                    this._electricChars[char] = true;
                }
            }
        }
        return this._electricChars;
    }
    get inputMode() {
        return InputMode.getInputMode();
    }
    /**
     * Should return opening bracket type to match indentation with
     */
    onElectricCharacter(character, context, column) {
        const scopedLineTokens = createScopedLineTokens(context, column - 1);
        const electricCharacterSupport = this.languageConfigurationService.getLanguageConfiguration(scopedLineTokens.languageId).electricCharacter;
        if (!electricCharacterSupport) {
            return null;
        }
        return electricCharacterSupport.onElectricCharacter(character, scopedLineTokens, column - scopedLineTokens.firstCharOffset);
    }
    normalizeIndentation(str) {
        return normalizeIndentation(str, this.indentSize, this.insertSpaces);
    }
    _getShouldAutoClose(languageId, autoCloseConfig, forQuotes) {
        switch (autoCloseConfig) {
            case 'beforeWhitespace':
                return autoCloseBeforeWhitespace;
            case 'languageDefined':
                return this._getLanguageDefinedShouldAutoClose(languageId, forQuotes);
            case 'always':
                return autoCloseAlways;
            case 'never':
                return autoCloseNever;
        }
    }
    _getLanguageDefinedShouldAutoClose(languageId, forQuotes) {
        const autoCloseBeforeSet = this.languageConfigurationService
            .getLanguageConfiguration(languageId)
            .getAutoCloseBeforeSet(forQuotes);
        return (c) => autoCloseBeforeSet.indexOf(c) !== -1;
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    visibleColumnFromColumn(model, position) {
        return CursorColumns.visibleColumnFromColumn(model.getLineContent(position.lineNumber), position.column, this.tabSize);
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    columnFromVisibleColumn(model, lineNumber, visibleColumn) {
        const result = CursorColumns.columnFromVisibleColumn(model.getLineContent(lineNumber), visibleColumn, this.tabSize);
        const minColumn = model.getLineMinColumn(lineNumber);
        if (result < minColumn) {
            return minColumn;
        }
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (result > maxColumn) {
            return maxColumn;
        }
        return result;
    }
}
export class CursorState {
    static fromModelState(modelState) {
        return new PartialModelCursorState(modelState);
    }
    static fromViewState(viewState) {
        return new PartialViewCursorState(viewState);
    }
    static fromModelSelection(modelSelection) {
        const selection = Selection.liftSelection(modelSelection);
        const modelState = new SingleCursorState(Range.fromPositions(selection.getSelectionStart()), 0 /* SelectionStartKind.Simple */, 0, selection.getPosition(), 0);
        return CursorState.fromModelState(modelState);
    }
    static fromModelSelections(modelSelections) {
        const states = [];
        for (let i = 0, len = modelSelections.length; i < len; i++) {
            states[i] = this.fromModelSelection(modelSelections[i]);
        }
        return states;
    }
    constructor(modelState, viewState) {
        this._cursorStateBrand = undefined;
        this.modelState = modelState;
        this.viewState = viewState;
    }
    equals(other) {
        return this.viewState.equals(other.viewState) && this.modelState.equals(other.modelState);
    }
}
export class PartialModelCursorState {
    constructor(modelState) {
        this.modelState = modelState;
        this.viewState = null;
    }
}
export class PartialViewCursorState {
    constructor(viewState) {
        this.modelState = null;
        this.viewState = viewState;
    }
}
export var SelectionStartKind;
(function (SelectionStartKind) {
    SelectionStartKind[SelectionStartKind["Simple"] = 0] = "Simple";
    SelectionStartKind[SelectionStartKind["Word"] = 1] = "Word";
    SelectionStartKind[SelectionStartKind["Line"] = 2] = "Line";
})(SelectionStartKind || (SelectionStartKind = {}));
/**
 * Represents the cursor state on either the model or on the view model.
 */
export class SingleCursorState {
    constructor(selectionStart, selectionStartKind, selectionStartLeftoverVisibleColumns, position, leftoverVisibleColumns) {
        this.selectionStart = selectionStart;
        this.selectionStartKind = selectionStartKind;
        this.selectionStartLeftoverVisibleColumns = selectionStartLeftoverVisibleColumns;
        this.position = position;
        this.leftoverVisibleColumns = leftoverVisibleColumns;
        this._singleCursorStateBrand = undefined;
        this.selection = SingleCursorState._computeSelection(this.selectionStart, this.position);
    }
    equals(other) {
        return (this.selectionStartLeftoverVisibleColumns === other.selectionStartLeftoverVisibleColumns &&
            this.leftoverVisibleColumns === other.leftoverVisibleColumns &&
            this.selectionStartKind === other.selectionStartKind &&
            this.position.equals(other.position) &&
            this.selectionStart.equalsRange(other.selectionStart));
    }
    hasSelection() {
        return !this.selection.isEmpty() || !this.selectionStart.isEmpty();
    }
    move(inSelectionMode, lineNumber, column, leftoverVisibleColumns) {
        if (inSelectionMode) {
            // move just position
            return new SingleCursorState(this.selectionStart, this.selectionStartKind, this.selectionStartLeftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
        else {
            // move everything
            return new SingleCursorState(new Range(lineNumber, column, lineNumber, column), 0 /* SelectionStartKind.Simple */, leftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
    }
    static _computeSelection(selectionStart, position) {
        if (selectionStart.isEmpty() || !position.isBeforeOrEqual(selectionStart.getStartPosition())) {
            return Selection.fromPositions(selectionStart.getStartPosition(), position);
        }
        else {
            return Selection.fromPositions(selectionStart.getEndPosition(), position);
        }
    }
}
export class EditOperationResult {
    constructor(type, commands, opts) {
        this._editOperationResultBrand = undefined;
        this.type = type;
        this.commands = commands;
        this.shouldPushStackElementBefore = opts.shouldPushStackElementBefore;
        this.shouldPushStackElementAfter = opts.shouldPushStackElementAfter;
    }
}
export function isQuote(ch) {
    return ch === "'" || ch === '"' || ch === '`';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3JDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN2QyxPQUFPLEVBQWMsU0FBUyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFNM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQVUxQzs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBa0IsaUJBT2pCO0FBUEQsV0FBa0IsaUJBQWlCO0lBQ2xDLDJEQUFTLENBQUE7SUFDVCx5RUFBZ0IsQ0FBQTtJQUNoQiwyRUFBaUIsQ0FBQTtJQUNqQix1RUFBZSxDQUFBO0lBQ2YsaUZBQW9CLENBQUE7SUFDcEIsNkZBQTBCLENBQUE7QUFDM0IsQ0FBQyxFQVBpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBT2xDO0FBTUQsTUFBTSxlQUFlLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFBO0FBQ2xDLE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQTtBQUNsQyxNQUFNLHlCQUF5QixHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUE7QUFFOUUsTUFBTSxPQUFPLG1CQUFtQjtJQXVDeEIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUE0QjtRQUN4RCxPQUFPLENBQ04sQ0FBQyxDQUFDLFVBQVUsbUNBQXlCO1lBQ3JDLENBQUMsQ0FBQyxVQUFVLHVDQUE2QjtZQUN6QyxDQUFDLENBQUMsVUFBVSwrQ0FBc0M7WUFDbEQsQ0FBQyxDQUFDLFVBQVUsbURBQTBDO1lBQ3RELENBQUMsQ0FBQyxVQUFVLHdDQUErQjtZQUMzQyxDQUFDLENBQUMsVUFBVSx3Q0FBK0I7WUFDM0MsQ0FBQyxDQUFDLFVBQVUsMENBQWtDO1lBQzlDLENBQUMsQ0FBQyxVQUFVLDBDQUFrQztZQUM5QyxDQUFDLENBQUMsVUFBVSx5Q0FBZ0M7WUFDNUMsQ0FBQyxDQUFDLFVBQVUsd0NBQWdDO1lBQzVDLENBQUMsQ0FBQyxVQUFVLDJDQUFrQztZQUM5QyxDQUFDLENBQUMsVUFBVSxvQ0FBMkI7WUFDdkMsQ0FBQyxDQUFDLFVBQVUsb0NBQTBCO1lBQ3RDLENBQUMsQ0FBQyxVQUFVLGdDQUF1QjtZQUNuQyxDQUFDLENBQUMsVUFBVSxnQ0FBdUI7WUFDbkMsQ0FBQyxDQUFDLFVBQVUsNkNBQW1DO1lBQy9DLENBQUMsQ0FBQyxVQUFVLHVDQUE4QixDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQ0MsVUFBa0IsRUFDbEIsWUFBc0MsRUFDdEMsYUFBbUMsRUFDbkIsNEJBQTJEO1FBQTNELGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFoRTVFLGtDQUE2QixHQUFTLFNBQVMsQ0FBQTtRQWtFOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFFN0IsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNyQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQTtRQUN2RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQTtRQUVuRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFBO1FBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtRQUNuQyxJQUFJLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUE7UUFDekMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFBO1FBQzdDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsdUNBQTZCLENBQUE7UUFDOUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQ3JDLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxRQUFRLENBQUMsOEJBQThCLENBQUE7UUFDN0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsb0NBQTBCLENBQUE7UUFDeEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyx1Q0FBNkIsQ0FBQTtRQUM5RCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0NBQXNDLENBQUE7UUFDaEYsSUFBSSxDQUFDLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGtEQUF5QyxDQUFBO1FBQ3RGLElBQUksQ0FBQywyQkFBMkIsR0FBRyxPQUFPLENBQUMsR0FBRyxtREFBMEMsQ0FBQTtRQUN4RixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsd0NBQStCLENBQUE7UUFDbEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHdDQUErQixDQUFBO1FBQ2xFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRywwQ0FBa0MsQ0FBQTtRQUN4RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsMENBQWtDLENBQUE7UUFDeEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHlDQUFnQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyx3Q0FBZ0MsQ0FBQTtRQUNwRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsMkNBQWtDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxvQ0FBMkIsQ0FBQTtRQUMxRCxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3RELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyw2Q0FBbUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLHVDQUE4QixDQUFBO1FBRWhFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFFMUIsSUFBSSxDQUFDLHFCQUFxQixHQUFHO1lBQzVCLEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUM7WUFDekUsT0FBTyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQztZQUM5RSxPQUFPLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDO1NBQzlFLENBQUE7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QjthQUN2RCx3QkFBd0IsQ0FBQyxVQUFVLENBQUM7YUFDcEMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV2QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyw0QkFBNEI7YUFDeEQsd0JBQXdCLENBQUMsVUFBVSxDQUFDO2FBQ3BDLG1CQUFtQixFQUFFLENBQUE7UUFDdkIsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLEtBQUssTUFBTSxJQUFJLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FDMUIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUNoRixJQUFJLENBQUMsc0JBQXNCLEdBQUcscUJBQXFCLEVBQUUsc0JBQXNCLElBQUksSUFBSSxDQUFBO0lBQ3BGLENBQUM7SUFFRCxJQUFXLGFBQWE7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQTtZQUN4QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsNEJBQTRCO2lCQUNyRCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUMxQyxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFBO1lBQzVDLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLEtBQUssTUFBTSxJQUFJLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQVcsU0FBUztRQUNuQixPQUFPLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxtQkFBbUIsQ0FDekIsU0FBaUIsRUFDakIsT0FBbUIsRUFDbkIsTUFBYztRQUVkLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FDMUYsZ0JBQWdCLENBQUMsVUFBVSxDQUMzQixDQUFDLGlCQUFpQixDQUFBO1FBQ25CLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sd0JBQXdCLENBQUMsbUJBQW1CLENBQ2xELFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsTUFBTSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FDekMsQ0FBQTtJQUNGLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxHQUFXO1FBQ3RDLE9BQU8sb0JBQW9CLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTyxtQkFBbUIsQ0FDMUIsVUFBa0IsRUFDbEIsZUFBMEMsRUFDMUMsU0FBa0I7UUFFbEIsUUFBUSxlQUFlLEVBQUUsQ0FBQztZQUN6QixLQUFLLGtCQUFrQjtnQkFDdEIsT0FBTyx5QkFBeUIsQ0FBQTtZQUNqQyxLQUFLLGlCQUFpQjtnQkFDckIsT0FBTyxJQUFJLENBQUMsa0NBQWtDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3RFLEtBQUssUUFBUTtnQkFDWixPQUFPLGVBQWUsQ0FBQTtZQUN2QixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxjQUFjLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFTyxrQ0FBa0MsQ0FDekMsVUFBa0IsRUFDbEIsU0FBa0I7UUFFbEIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsNEJBQTRCO2FBQzFELHdCQUF3QixDQUFDLFVBQVUsQ0FBQzthQUNwQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNsQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVEOzs7T0FHRztJQUNJLHVCQUF1QixDQUFDLEtBQXlCLEVBQUUsUUFBa0I7UUFDM0UsT0FBTyxhQUFhLENBQUMsdUJBQXVCLENBQzNDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUN6QyxRQUFRLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxPQUFPLENBQ1osQ0FBQTtJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSSx1QkFBdUIsQ0FDN0IsS0FBeUIsRUFDekIsVUFBa0IsRUFDbEIsYUFBcUI7UUFFckIsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixDQUNuRCxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUNoQyxhQUFhLEVBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FDWixDQUFBO1FBRUQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BELElBQUksTUFBTSxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEQsSUFBSSxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7WUFDeEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEO0FBdUJELE1BQU0sT0FBTyxXQUFXO0lBR2hCLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBNkI7UUFDekQsT0FBTyxJQUFJLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTSxNQUFNLENBQUMsYUFBYSxDQUFDLFNBQTRCO1FBQ3ZELE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLGNBQTBCO1FBQzFELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSxpQkFBaUIsQ0FDdkMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxxQ0FFbEQsQ0FBQyxFQUNELFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFDdkIsQ0FBQyxDQUNELENBQUE7UUFDRCxPQUFPLFdBQVcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsZUFBc0M7UUFFdEMsTUFBTSxNQUFNLEdBQThCLEVBQUUsQ0FBQTtRQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBS0QsWUFBWSxVQUE2QixFQUFFLFNBQTRCO1FBbkN2RSxzQkFBaUIsR0FBUyxTQUFTLENBQUE7UUFvQ2xDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQzNCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBa0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzFGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFJbkMsWUFBWSxVQUE2QjtRQUN4QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtJQUN0QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sc0JBQXNCO0lBSWxDLFlBQVksU0FBNEI7UUFDdkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQUlqQjtBQUpELFdBQWtCLGtCQUFrQjtJQUNuQywrREFBTSxDQUFBO0lBQ04sMkRBQUksQ0FBQTtJQUNKLDJEQUFJLENBQUE7QUFDTCxDQUFDLEVBSmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFJbkM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFLN0IsWUFDaUIsY0FBcUIsRUFDckIsa0JBQXNDLEVBQ3RDLG9DQUE0QyxFQUM1QyxRQUFrQixFQUNsQixzQkFBOEI7UUFKOUIsbUJBQWMsR0FBZCxjQUFjLENBQU87UUFDckIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN0Qyx5Q0FBb0MsR0FBcEMsb0NBQW9DLENBQVE7UUFDNUMsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVE7UUFUL0MsNEJBQXVCLEdBQVMsU0FBUyxDQUFBO1FBV3hDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDekYsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUF3QjtRQUNyQyxPQUFPLENBQ04sSUFBSSxDQUFDLG9DQUFvQyxLQUFLLEtBQUssQ0FBQyxvQ0FBb0M7WUFDeEYsSUFBSSxDQUFDLHNCQUFzQixLQUFLLEtBQUssQ0FBQyxzQkFBc0I7WUFDNUQsSUFBSSxDQUFDLGtCQUFrQixLQUFLLEtBQUssQ0FBQyxrQkFBa0I7WUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztZQUNwQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQ3JELENBQUE7SUFDRixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkUsQ0FBQztJQUVNLElBQUksQ0FDVixlQUF3QixFQUN4QixVQUFrQixFQUNsQixNQUFjLEVBQ2Qsc0JBQThCO1FBRTlCLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIscUJBQXFCO1lBQ3JCLE9BQU8sSUFBSSxpQkFBaUIsQ0FDM0IsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsb0NBQW9DLEVBQ3pDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFDaEMsc0JBQXNCLENBQ3RCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQjtZQUNsQixPQUFPLElBQUksaUJBQWlCLENBQzNCLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxxQ0FFakQsc0JBQXNCLEVBQ3RCLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFDaEMsc0JBQXNCLENBQ3RCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxjQUFxQixFQUFFLFFBQWtCO1FBQ3pFLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDOUYsT0FBTyxTQUFTLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxTQUFTLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRSxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjtJQVEvQixZQUNDLElBQXVCLEVBQ3ZCLFFBQWdDLEVBQ2hDLElBR0M7UUFiRiw4QkFBeUIsR0FBUyxTQUFTLENBQUE7UUFlMUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFDeEIsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQTtRQUNyRSxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFBO0lBQ3BFLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxPQUFPLENBQUMsRUFBVTtJQUNqQyxPQUFPLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEtBQUssR0FBRyxDQUFBO0FBQzlDLENBQUMifQ==