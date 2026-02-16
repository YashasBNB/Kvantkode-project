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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvckNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZDLE9BQU8sRUFBYyxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQU0zRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBVTFDOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFrQixpQkFPakI7QUFQRCxXQUFrQixpQkFBaUI7SUFDbEMsMkRBQVMsQ0FBQTtJQUNULHlFQUFnQixDQUFBO0lBQ2hCLDJFQUFpQixDQUFBO0lBQ2pCLHVFQUFlLENBQUE7SUFDZixpRkFBb0IsQ0FBQTtJQUNwQiw2RkFBMEIsQ0FBQTtBQUMzQixDQUFDLEVBUGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFPbEM7QUFNRCxNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUE7QUFDbEMsTUFBTSxjQUFjLEdBQUcsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFBO0FBQ2xDLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQTtBQUU5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