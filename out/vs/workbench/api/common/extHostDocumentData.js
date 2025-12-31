/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from '../../../base/common/assert.js';
import { Schemas } from '../../../base/common/network.js';
import { regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { MirrorTextModel } from '../../../editor/common/model/mirrorTextModel.js';
import { ensureValidWordDefinition, getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { EndOfLine, Position, Range } from './extHostTypes.js';
import { equals } from '../../../base/common/arrays.js';
const _languageId2WordDefinition = new Map();
export function setWordDefinitionFor(languageId, wordDefinition) {
    if (!wordDefinition) {
        _languageId2WordDefinition.delete(languageId);
    }
    else {
        _languageId2WordDefinition.set(languageId, wordDefinition);
    }
}
function getWordDefinitionFor(languageId) {
    return _languageId2WordDefinition.get(languageId);
}
export class ExtHostDocumentData extends MirrorTextModel {
    constructor(_proxy, uri, lines, eol, versionId, _languageId, _isDirty, _encoding) {
        super(uri, lines, eol, versionId);
        this._proxy = _proxy;
        this._languageId = _languageId;
        this._isDirty = _isDirty;
        this._encoding = _encoding;
        this._isDisposed = false;
    }
    // eslint-disable-next-line local/code-must-use-super-dispose
    dispose() {
        // we don't really dispose documents but let
        // extensions still read from them. some
        // operations, live saving, will now error tho
        ok(!this._isDisposed);
        this._isDisposed = true;
        this._isDirty = false;
    }
    equalLines(lines) {
        return equals(this._lines, lines);
    }
    get document() {
        if (!this._document) {
            const that = this;
            this._document = {
                get uri() {
                    return that._uri;
                },
                get fileName() {
                    return that._uri.fsPath;
                },
                get isUntitled() {
                    return that._uri.scheme === Schemas.untitled;
                },
                get languageId() {
                    return that._languageId;
                },
                get version() {
                    return that._versionId;
                },
                get isClosed() {
                    return that._isDisposed;
                },
                get isDirty() {
                    return that._isDirty;
                },
                get encoding() {
                    return that._encoding;
                },
                save() {
                    return that._save();
                },
                getText(range) {
                    return range ? that._getTextInRange(range) : that.getText();
                },
                get eol() {
                    return that._eol === '\n' ? EndOfLine.LF : EndOfLine.CRLF;
                },
                get lineCount() {
                    return that._lines.length;
                },
                lineAt(lineOrPos) {
                    return that._lineAt(lineOrPos);
                },
                offsetAt(pos) {
                    return that._offsetAt(pos);
                },
                positionAt(offset) {
                    return that._positionAt(offset);
                },
                validateRange(ran) {
                    return that._validateRange(ran);
                },
                validatePosition(pos) {
                    return that._validatePosition(pos);
                },
                getWordRangeAtPosition(pos, regexp) {
                    return that._getWordRangeAtPosition(pos, regexp);
                },
                [Symbol.for('debug.description')]() {
                    return `TextDocument(${that._uri.toString()})`;
                },
            };
        }
        return Object.freeze(this._document);
    }
    _acceptLanguageId(newLanguageId) {
        ok(!this._isDisposed);
        this._languageId = newLanguageId;
    }
    _acceptIsDirty(isDirty) {
        ok(!this._isDisposed);
        this._isDirty = isDirty;
    }
    _acceptEncoding(encoding) {
        ok(!this._isDisposed);
        this._encoding = encoding;
    }
    _save() {
        if (this._isDisposed) {
            return Promise.reject(new Error('Document has been closed'));
        }
        return this._proxy.$trySaveDocument(this._uri);
    }
    _getTextInRange(_range) {
        const range = this._validateRange(_range);
        if (range.isEmpty) {
            return '';
        }
        if (range.isSingleLine) {
            return this._lines[range.start.line].substring(range.start.character, range.end.character);
        }
        const lineEnding = this._eol, startLineIndex = range.start.line, endLineIndex = range.end.line, resultLines = [];
        resultLines.push(this._lines[startLineIndex].substring(range.start.character));
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this._lines[i]);
        }
        resultLines.push(this._lines[endLineIndex].substring(0, range.end.character));
        return resultLines.join(lineEnding);
    }
    _lineAt(lineOrPosition) {
        let line;
        if (lineOrPosition instanceof Position) {
            line = lineOrPosition.line;
        }
        else if (typeof lineOrPosition === 'number') {
            line = lineOrPosition;
        }
        if (typeof line !== 'number' ||
            line < 0 ||
            line >= this._lines.length ||
            Math.floor(line) !== line) {
            throw new Error('Illegal value for `line`');
        }
        return new ExtHostDocumentLine(line, this._lines[line], line === this._lines.length - 1);
    }
    _offsetAt(position) {
        position = this._validatePosition(position);
        this._ensureLineStarts();
        return this._lineStarts.getPrefixSum(position.line - 1) + position.character;
    }
    _positionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        this._ensureLineStarts();
        const out = this._lineStarts.getIndexOf(offset);
        const lineLength = this._lines[out.index].length;
        // Ensure we return a valid position
        return new Position(out.index, Math.min(out.remainder, lineLength));
    }
    // ---- range math
    _validateRange(range) {
        if (!(range instanceof Range)) {
            throw new Error('Invalid argument');
        }
        const start = this._validatePosition(range.start);
        const end = this._validatePosition(range.end);
        if (start === range.start && end === range.end) {
            return range;
        }
        return new Range(start.line, start.character, end.line, end.character);
    }
    _validatePosition(position) {
        if (!(position instanceof Position)) {
            throw new Error('Invalid argument');
        }
        if (this._lines.length === 0) {
            return position.with(0, 0);
        }
        let { line, character } = position;
        let hasChanged = false;
        if (line < 0) {
            line = 0;
            character = 0;
            hasChanged = true;
        }
        else if (line >= this._lines.length) {
            line = this._lines.length - 1;
            character = this._lines[line].length;
            hasChanged = true;
        }
        else {
            const maxCharacter = this._lines[line].length;
            if (character < 0) {
                character = 0;
                hasChanged = true;
            }
            else if (character > maxCharacter) {
                character = maxCharacter;
                hasChanged = true;
            }
        }
        if (!hasChanged) {
            return position;
        }
        return new Position(line, character);
    }
    _getWordRangeAtPosition(_position, regexp) {
        const position = this._validatePosition(_position);
        if (!regexp) {
            // use default when custom-regexp isn't provided
            regexp = getWordDefinitionFor(this._languageId);
        }
        else if (regExpLeadsToEndlessLoop(regexp)) {
            // use default when custom-regexp is bad
            throw new Error(`[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`);
        }
        const wordAtText = getWordAtText(position.character + 1, ensureValidWordDefinition(regexp), this._lines[position.line], 0);
        if (wordAtText) {
            return new Range(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
        }
        return undefined;
    }
}
export class ExtHostDocumentLine {
    constructor(line, text, isLastLine) {
        this._line = line;
        this._text = text;
        this._isLastLine = isLastLine;
    }
    get lineNumber() {
        return this._line;
    }
    get text() {
        return this._text;
    }
    get range() {
        return new Range(this._line, 0, this._line, this._text.length);
    }
    get rangeIncludingLineBreak() {
        if (this._isLastLine) {
            return this.range;
        }
        return new Range(this._line, 0, this._line + 1, 0);
    }
    get firstNonWhitespaceCharacterIndex() {
        //TODO@api, rename to 'leadingWhitespaceLength'
        return /^(\s*)/.exec(this._text)[1].length;
    }
    get isEmptyOrWhitespace() {
        return this.firstNonWhitespaceCharacterIndex === this._text.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50RGF0YS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDakYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXBHLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRTlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2RCxNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0FBQzVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLGNBQWtDO0lBQzFGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQiwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDOUMsQ0FBQztTQUFNLENBQUM7UUFDUCwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzNELENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxVQUFrQjtJQUMvQyxPQUFPLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtBQUNsRCxDQUFDO0FBRUQsTUFBTSxPQUFPLG1C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