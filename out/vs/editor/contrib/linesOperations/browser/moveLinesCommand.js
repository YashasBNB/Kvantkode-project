/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as strings from '../../../../base/common/strings.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { IndentAction, } from '../../../common/languages/languageConfiguration.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import * as indentUtils from '../../indentation/common/indentUtils.js';
import { getGoodIndentForLine, getIndentMetadata, } from '../../../common/languages/autoIndent.js';
import { getEnterAction } from '../../../common/languages/enterAction.js';
let MoveLinesCommand = class MoveLinesCommand {
    constructor(selection, isMovingDown, autoIndent, _languageConfigurationService) {
        this._languageConfigurationService = _languageConfigurationService;
        this._selection = selection;
        this._isMovingDown = isMovingDown;
        this._autoIndent = autoIndent;
        this._selectionId = null;
        this._moveEndLineSelectionShrink = false;
    }
    getEditOperations(model, builder) {
        const getLanguageId = () => {
            return model.getLanguageId();
        };
        const getLanguageIdAtPosition = (lineNumber, column) => {
            return model.getLanguageIdAtPosition(lineNumber, column);
        };
        const modelLineCount = model.getLineCount();
        if (this._isMovingDown && this._selection.endLineNumber === modelLineCount) {
            this._selectionId = builder.trackSelection(this._selection);
            return;
        }
        if (!this._isMovingDown && this._selection.startLineNumber === 1) {
            this._selectionId = builder.trackSelection(this._selection);
            return;
        }
        this._moveEndPositionDown = false;
        let s = this._selection;
        if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
            this._moveEndPositionDown = true;
            s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
        }
        const { tabSize, indentSize, insertSpaces } = model.getOptions();
        const indentConverter = this.buildIndentConverter(tabSize, indentSize, insertSpaces);
        if (s.startLineNumber === s.endLineNumber && model.getLineMaxColumn(s.startLineNumber) === 1) {
            // Current line is empty
            const lineNumber = s.startLineNumber;
            const otherLineNumber = this._isMovingDown ? lineNumber + 1 : lineNumber - 1;
            if (model.getLineMaxColumn(otherLineNumber) === 1) {
                // Other line number is empty too, so no editing is needed
                // Add a no-op to force running by the model
                builder.addEditOperation(new Range(1, 1, 1, 1), null);
            }
            else {
                // Type content from other line number on line number
                builder.addEditOperation(new Range(lineNumber, 1, lineNumber, 1), model.getLineContent(otherLineNumber));
                // Remove content from other line number
                builder.addEditOperation(new Range(otherLineNumber, 1, otherLineNumber, model.getLineMaxColumn(otherLineNumber)), null);
            }
            // Track selection at the other line number
            s = new Selection(otherLineNumber, 1, otherLineNumber, 1);
        }
        else {
            let movingLineNumber;
            let movingLineText;
            if (this._isMovingDown) {
                movingLineNumber = s.endLineNumber + 1;
                movingLineText = model.getLineContent(movingLineNumber);
                // Delete line that needs to be moved
                builder.addEditOperation(new Range(movingLineNumber - 1, model.getLineMaxColumn(movingLineNumber - 1), movingLineNumber, model.getLineMaxColumn(movingLineNumber)), null);
                let insertingText = movingLineText;
                if (this.shouldAutoIndent(model, s)) {
                    const movingLineMatchResult = this.matchEnterRule(model, indentConverter, tabSize, movingLineNumber, s.startLineNumber - 1);
                    // if s.startLineNumber - 1 matches onEnter rule, we still honor that.
                    if (movingLineMatchResult !== null) {
                        const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumber));
                        const newSpaceCnt = movingLineMatchResult + indentUtils.getSpaceCnt(oldIndentation, tabSize);
                        const newIndentation = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                        insertingText = newIndentation + this.trimStart(movingLineText);
                    }
                    else {
                        // no enter rule matches, let's check indentatin rules then.
                        const virtualModel = {
                            tokenization: {
                                getLineTokens: (lineNumber) => {
                                    if (lineNumber === s.startLineNumber) {
                                        return model.tokenization.getLineTokens(movingLineNumber);
                                    }
                                    else {
                                        return model.tokenization.getLineTokens(lineNumber);
                                    }
                                },
                                getLanguageId,
                                getLanguageIdAtPosition,
                            },
                            getLineContent: (lineNumber) => {
                                if (lineNumber === s.startLineNumber) {
                                    return model.getLineContent(movingLineNumber);
                                }
                                else {
                                    return model.getLineContent(lineNumber);
                                }
                            },
                        };
                        const indentOfMovingLine = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(movingLineNumber, 1), s.startLineNumber, indentConverter, this._languageConfigurationService);
                        if (indentOfMovingLine !== null) {
                            const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(movingLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(indentOfMovingLine, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const newIndentation = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                                insertingText = newIndentation + this.trimStart(movingLineText);
                            }
                        }
                    }
                    // add edit operations for moving line first to make sure it's executed after we make indentation change
                    // to s.startLineNumber
                    builder.addEditOperation(new Range(s.startLineNumber, 1, s.startLineNumber, 1), insertingText + '\n');
                    const ret = this.matchEnterRuleMovingDown(model, indentConverter, tabSize, s.startLineNumber, movingLineNumber, insertingText);
                    // check if the line being moved before matches onEnter rules, if so let's adjust the indentation by onEnter rules.
                    if (ret !== null) {
                        if (ret !== 0) {
                            this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, ret);
                        }
                    }
                    else {
                        // it doesn't match onEnter rules, let's check indentation rules then.
                        const virtualModel = {
                            tokenization: {
                                getLineTokens: (lineNumber) => {
                                    if (lineNumber === s.startLineNumber) {
                                        // TODO@aiday-mar: the tokens here don't correspond exactly to the corresponding content (after indentation adjustment), have to fix this.
                                        return model.tokenization.getLineTokens(movingLineNumber);
                                    }
                                    else if (lineNumber >= s.startLineNumber + 1 &&
                                        lineNumber <= s.endLineNumber + 1) {
                                        return model.tokenization.getLineTokens(lineNumber - 1);
                                    }
                                    else {
                                        return model.tokenization.getLineTokens(lineNumber);
                                    }
                                },
                                getLanguageId,
                                getLanguageIdAtPosition,
                            },
                            getLineContent: (lineNumber) => {
                                if (lineNumber === s.startLineNumber) {
                                    return insertingText;
                                }
                                else if (lineNumber >= s.startLineNumber + 1 &&
                                    lineNumber <= s.endLineNumber + 1) {
                                    return model.getLineContent(lineNumber - 1);
                                }
                                else {
                                    return model.getLineContent(lineNumber);
                                }
                            },
                        };
                        const newIndentatOfMovingBlock = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(movingLineNumber, 1), s.startLineNumber + 1, indentConverter, this._languageConfigurationService);
                        if (newIndentatOfMovingBlock !== null) {
                            const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(newIndentatOfMovingBlock, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const spaceCntOffset = newSpaceCnt - oldSpaceCnt;
                                this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, spaceCntOffset);
                            }
                        }
                    }
                }
                else {
                    // Insert line that needs to be moved before
                    builder.addEditOperation(new Range(s.startLineNumber, 1, s.startLineNumber, 1), insertingText + '\n');
                }
            }
            else {
                movingLineNumber = s.startLineNumber - 1;
                movingLineText = model.getLineContent(movingLineNumber);
                // Delete line that needs to be moved
                builder.addEditOperation(new Range(movingLineNumber, 1, movingLineNumber + 1, 1), null);
                // Insert line that needs to be moved after
                builder.addEditOperation(new Range(s.endLineNumber, model.getLineMaxColumn(s.endLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), '\n' + movingLineText);
                if (this.shouldAutoIndent(model, s)) {
                    const virtualModel = {
                        tokenization: {
                            getLineTokens: (lineNumber) => {
                                if (lineNumber === movingLineNumber) {
                                    return model.tokenization.getLineTokens(s.startLineNumber);
                                }
                                else {
                                    return model.tokenization.getLineTokens(lineNumber);
                                }
                            },
                            getLanguageId,
                            getLanguageIdAtPosition,
                        },
                        getLineContent: (lineNumber) => {
                            if (lineNumber === movingLineNumber) {
                                return model.getLineContent(s.startLineNumber);
                            }
                            else {
                                return model.getLineContent(lineNumber);
                            }
                        },
                    };
                    const ret = this.matchEnterRule(model, indentConverter, tabSize, s.startLineNumber, s.startLineNumber - 2);
                    // check if s.startLineNumber - 2 matches onEnter rules, if so adjust the moving block by onEnter rules.
                    if (ret !== null) {
                        if (ret !== 0) {
                            this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, ret);
                        }
                    }
                    else {
                        // it doesn't match any onEnter rule, let's check indentation rules then.
                        const indentOfFirstLine = getGoodIndentForLine(this._autoIndent, virtualModel, model.getLanguageIdAtPosition(s.startLineNumber, 1), movingLineNumber, indentConverter, this._languageConfigurationService);
                        if (indentOfFirstLine !== null) {
                            // adjust the indentation of the moving block
                            const oldIndent = strings.getLeadingWhitespace(model.getLineContent(s.startLineNumber));
                            const newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, tabSize);
                            const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndent, tabSize);
                            if (newSpaceCnt !== oldSpaceCnt) {
                                const spaceCntOffset = newSpaceCnt - oldSpaceCnt;
                                this.getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, spaceCntOffset);
                            }
                        }
                    }
                }
            }
        }
        this._selectionId = builder.trackSelection(s);
    }
    buildIndentConverter(tabSize, indentSize, insertSpaces) {
        return {
            shiftIndent: (indentation) => {
                return ShiftCommand.shiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
            unshiftIndent: (indentation) => {
                return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
        };
    }
    parseEnterResult(model, indentConverter, tabSize, line, enter) {
        if (enter) {
            let enterPrefix = enter.indentation;
            if (enter.indentAction === IndentAction.None) {
                enterPrefix = enter.indentation + enter.appendText;
            }
            else if (enter.indentAction === IndentAction.Indent) {
                enterPrefix = enter.indentation + enter.appendText;
            }
            else if (enter.indentAction === IndentAction.IndentOutdent) {
                enterPrefix = enter.indentation;
            }
            else if (enter.indentAction === IndentAction.Outdent) {
                enterPrefix = indentConverter.unshiftIndent(enter.indentation) + enter.appendText;
            }
            const movingLineText = model.getLineContent(line);
            if (this.trimStart(movingLineText).indexOf(this.trimStart(enterPrefix)) >= 0) {
                const oldIndentation = strings.getLeadingWhitespace(model.getLineContent(line));
                let newIndentation = strings.getLeadingWhitespace(enterPrefix);
                const indentMetadataOfMovelingLine = getIndentMetadata(model, line, this._languageConfigurationService);
                if (indentMetadataOfMovelingLine !== null &&
                    indentMetadataOfMovelingLine & 2 /* IndentConsts.DECREASE_MASK */) {
                    newIndentation = indentConverter.unshiftIndent(newIndentation);
                }
                const newSpaceCnt = indentUtils.getSpaceCnt(newIndentation, tabSize);
                const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                return newSpaceCnt - oldSpaceCnt;
            }
        }
        return null;
    }
    /**
     *
     * @param model
     * @param indentConverter
     * @param tabSize
     * @param line the line moving down
     * @param futureAboveLineNumber the line which will be at the `line` position
     * @param futureAboveLineText
     */
    matchEnterRuleMovingDown(model, indentConverter, tabSize, line, futureAboveLineNumber, futureAboveLineText) {
        if (strings.lastNonWhitespaceIndex(futureAboveLineText) >= 0) {
            // break
            const maxColumn = model.getLineMaxColumn(futureAboveLineNumber);
            const enter = getEnterAction(this._autoIndent, model, new Range(futureAboveLineNumber, maxColumn, futureAboveLineNumber, maxColumn), this._languageConfigurationService);
            return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
        }
        else {
            // go upwards, starting from `line - 1`
            let validPrecedingLine = line - 1;
            while (validPrecedingLine >= 1) {
                const lineContent = model.getLineContent(validPrecedingLine);
                const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineContent);
                if (nonWhitespaceIdx >= 0) {
                    break;
                }
                validPrecedingLine--;
            }
            if (validPrecedingLine < 1 || line > model.getLineCount()) {
                return null;
            }
            const maxColumn = model.getLineMaxColumn(validPrecedingLine);
            const enter = getEnterAction(this._autoIndent, model, new Range(validPrecedingLine, maxColumn, validPrecedingLine, maxColumn), this._languageConfigurationService);
            return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
        }
    }
    matchEnterRule(model, indentConverter, tabSize, line, oneLineAbove, previousLineText) {
        let validPrecedingLine = oneLineAbove;
        while (validPrecedingLine >= 1) {
            // ship empty lines as empty lines just inherit indentation
            let lineContent;
            if (validPrecedingLine === oneLineAbove && previousLineText !== undefined) {
                lineContent = previousLineText;
            }
            else {
                lineContent = model.getLineContent(validPrecedingLine);
            }
            const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineContent);
            if (nonWhitespaceIdx >= 0) {
                break;
            }
            validPrecedingLine--;
        }
        if (validPrecedingLine < 1 || line > model.getLineCount()) {
            return null;
        }
        const maxColumn = model.getLineMaxColumn(validPrecedingLine);
        const enter = getEnterAction(this._autoIndent, model, new Range(validPrecedingLine, maxColumn, validPrecedingLine, maxColumn), this._languageConfigurationService);
        return this.parseEnterResult(model, indentConverter, tabSize, line, enter);
    }
    trimStart(str) {
        return str.replace(/^\s+/, '');
    }
    shouldAutoIndent(model, selection) {
        if (this._autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
            return false;
        }
        // if it's not easy to tokenize, we stop auto indent.
        if (!model.tokenization.isCheapToTokenize(selection.startLineNumber)) {
            return false;
        }
        const languageAtSelectionStart = model.getLanguageIdAtPosition(selection.startLineNumber, 1);
        const languageAtSelectionEnd = model.getLanguageIdAtPosition(selection.endLineNumber, 1);
        if (languageAtSelectionStart !== languageAtSelectionEnd) {
            return false;
        }
        if (this._languageConfigurationService.getLanguageConfiguration(languageAtSelectionStart)
            .indentRulesSupport === null) {
            return false;
        }
        return true;
    }
    getIndentEditsOfMovingBlock(model, builder, s, tabSize, insertSpaces, offset) {
        for (let i = s.startLineNumber; i <= s.endLineNumber; i++) {
            const lineContent = model.getLineContent(i);
            const originalIndent = strings.getLeadingWhitespace(lineContent);
            const originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, tabSize);
            const newSpacesCnt = originalSpacesCnt + offset;
            const newIndent = indentUtils.generateIndent(newSpacesCnt, tabSize, insertSpaces);
            if (newIndent !== originalIndent) {
                builder.addEditOperation(new Range(i, 1, i, originalIndent.length + 1), newIndent);
                if (i === s.endLineNumber && s.endColumn <= originalIndent.length + 1 && newIndent === '') {
                    // as users select part of the original indent white spaces
                    // when we adjust the indentation of endLine, we should adjust the cursor position as well.
                    this._moveEndLineSelectionShrink = true;
                }
            }
        }
    }
    computeCursorState(model, helper) {
        let result = helper.getTrackedSelection(this._selectionId);
        if (this._moveEndPositionDown) {
            result = result.setEndPosition(result.endLineNumber + 1, 1);
        }
        if (this._moveEndLineSelectionShrink && result.startLineNumber < result.endLineNumber) {
            result = result.setEndPosition(result.endLineNumber, 2);
        }
        return result;
    }
};
MoveLinesCommand = __decorate([
    __param(3, ILanguageConfigurationService)
], MoveLinesCommand);
export { MoveLinesCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmVzT3BlcmF0aW9ucy9icm93c2VyL21vdmVMaW5lc0NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU83RCxPQUFPLEVBRU4sWUFBWSxHQUNaLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFMUcsT0FBTyxLQUFLLFdBQVcsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGlCQUFpQixHQUdqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQVM1QixZQUNDLFNBQW9CLEVBQ3BCLFlBQXFCLEVBQ3JCLFVBQW9DLEVBRW5CLDZCQUE0RDtRQUE1RCxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBRTdFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FB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