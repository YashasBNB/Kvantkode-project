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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGluZXNPcGVyYXRpb25zL2Jyb3dzZXIvbW92ZUxpbmVzQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBTzdELE9BQU8sRUFFTixZQUFZLEdBQ1osTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUxRyxPQUFPLEtBQUssV0FBVyxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsaUJBQWlCLEdBR2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxFLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBUzVCLFlBQ0MsU0FBb0IsRUFDcEIsWUFBcUIsRUFDckIsVUFBb0MsRUFFbkIsNkJBQTREO1FBQTVELGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBK0I7UUFFN0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJ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