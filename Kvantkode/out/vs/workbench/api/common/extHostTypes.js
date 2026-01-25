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
var Disposable_1, Position_1, Range_1, Selection_1, TextEdit_1, NotebookEdit_1, SnippetString_1, Location_1, SymbolInformation_1, DocumentSymbol_1, CodeActionKind_1, MarkdownString_1, TaskGroup_1, Task_1, TreeItem_1, FileSystemError_1, TestMessage_1;
import { asArray, coalesceInPlace, equals } from '../../../base/common/arrays.js';
import { illegalArgument } from '../../../base/common/errors.js';
import { MarkdownString as BaseMarkdownString, } from '../../../base/common/htmlContent.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Mimes, normalizeMimeType } from '../../../base/common/mime.js';
import { nextCharLength } from '../../../base/common/strings.js';
import { isNumber, isObject, isString, isStringArray } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { FileSystemProviderErrorCode, markAsFileSystemProviderError, } from '../../../platform/files/common/files.js';
import { RemoteAuthorityResolverErrorCode } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { isTextStreamMime, } from '../../contrib/notebook/common/notebookCommon.js';
/**
 * @deprecated
 *
 * This utility ensures that old JS code that uses functions for classes still works. Existing usages cannot be removed
 * but new ones must not be added
 * */
function es5ClassCompat(target) {
    const interceptFunctions = {
        apply: function (...args) {
            if (args.length === 0) {
                return Reflect.construct(target, []);
            }
            else {
                const argsList = args.length === 1 ? [] : args[1];
                return Reflect.construct(target, argsList, args[0].constructor);
            }
        },
        call: function (...args) {
            if (args.length === 0) {
                return Reflect.construct(target, []);
            }
            else {
                const [thisArg, ...restArgs] = args;
                return Reflect.construct(target, restArgs, thisArg.constructor);
            }
        },
    };
    return Object.assign(target, interceptFunctions);
}
export var TerminalOutputAnchor;
(function (TerminalOutputAnchor) {
    TerminalOutputAnchor[TerminalOutputAnchor["Top"] = 0] = "Top";
    TerminalOutputAnchor[TerminalOutputAnchor["Bottom"] = 1] = "Bottom";
})(TerminalOutputAnchor || (TerminalOutputAnchor = {}));
export var TerminalQuickFixType;
(function (TerminalQuickFixType) {
    TerminalQuickFixType[TerminalQuickFixType["TerminalCommand"] = 0] = "TerminalCommand";
    TerminalQuickFixType[TerminalQuickFixType["Opener"] = 1] = "Opener";
    TerminalQuickFixType[TerminalQuickFixType["Command"] = 3] = "Command";
})(TerminalQuickFixType || (TerminalQuickFixType = {}));
let Disposable = Disposable_1 = class Disposable {
    static from(...inDisposables) {
        let disposables = inDisposables;
        return new Disposable_1(function () {
            if (disposables) {
                for (const disposable of disposables) {
                    if (disposable && typeof disposable.dispose === 'function') {
                        disposable.dispose();
                    }
                }
                disposables = undefined;
            }
        });
    }
    #callOnDispose;
    constructor(callOnDispose) {
        this.#callOnDispose = callOnDispose;
    }
    dispose() {
        if (typeof this.#callOnDispose === 'function') {
            this.#callOnDispose();
            this.#callOnDispose = undefined;
        }
    }
};
Disposable = Disposable_1 = __decorate([
    es5ClassCompat
], Disposable);
export { Disposable };
let Position = Position_1 = class Position {
    static Min(...positions) {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isBefore(result)) {
                result = p;
            }
        }
        return result;
    }
    static Max(...positions) {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isAfter(result)) {
                result = p;
            }
        }
        return result;
    }
    static isPosition(other) {
        if (!other) {
            return false;
        }
        if (other instanceof Position_1) {
            return true;
        }
        const { line, character } = other;
        if (typeof line === 'number' && typeof character === 'number') {
            return true;
        }
        return false;
    }
    static of(obj) {
        if (obj instanceof Position_1) {
            return obj;
        }
        else if (this.isPosition(obj)) {
            return new Position_1(obj.line, obj.character);
        }
        throw new Error('Invalid argument, is NOT a position-like object');
    }
    get line() {
        return this._line;
    }
    get character() {
        return this._character;
    }
    constructor(line, character) {
        if (line < 0) {
            throw illegalArgument('line must be non-negative');
        }
        if (character < 0) {
            throw illegalArgument('character must be non-negative');
        }
        this._line = line;
        this._character = character;
    }
    isBefore(other) {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character < other._character;
    }
    isBeforeOrEqual(other) {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character <= other._character;
    }
    isAfter(other) {
        return !this.isBeforeOrEqual(other);
    }
    isAfterOrEqual(other) {
        return !this.isBefore(other);
    }
    isEqual(other) {
        return this._line === other._line && this._character === other._character;
    }
    compareTo(other) {
        if (this._line < other._line) {
            return -1;
        }
        else if (this._line > other.line) {
            return 1;
        }
        else {
            // equal line
            if (this._character < other._character) {
                return -1;
            }
            else if (this._character > other._character) {
                return 1;
            }
            else {
                // equal line and character
                return 0;
            }
        }
    }
    translate(lineDeltaOrChange, characterDelta = 0) {
        if (lineDeltaOrChange === null || characterDelta === null) {
            throw illegalArgument();
        }
        let lineDelta;
        if (typeof lineDeltaOrChange === 'undefined') {
            lineDelta = 0;
        }
        else if (typeof lineDeltaOrChange === 'number') {
            lineDelta = lineDeltaOrChange;
        }
        else {
            lineDelta = typeof lineDeltaOrChange.lineDelta === 'number' ? lineDeltaOrChange.lineDelta : 0;
            characterDelta =
                typeof lineDeltaOrChange.characterDelta === 'number' ? lineDeltaOrChange.characterDelta : 0;
        }
        if (lineDelta === 0 && characterDelta === 0) {
            return this;
        }
        return new Position_1(this.line + lineDelta, this.character + characterDelta);
    }
    with(lineOrChange, character = this.character) {
        if (lineOrChange === null || character === null) {
            throw illegalArgument();
        }
        let line;
        if (typeof lineOrChange === 'undefined') {
            line = this.line;
        }
        else if (typeof lineOrChange === 'number') {
            line = lineOrChange;
        }
        else {
            line = typeof lineOrChange.line === 'number' ? lineOrChange.line : this.line;
            character =
                typeof lineOrChange.character === 'number' ? lineOrChange.character : this.character;
        }
        if (line === this.line && character === this.character) {
            return this;
        }
        return new Position_1(line, character);
    }
    toJSON() {
        return { line: this.line, character: this.character };
    }
    [Symbol.for('debug.description')]() {
        return `(${this.line}:${this.character})`;
    }
};
Position = Position_1 = __decorate([
    es5ClassCompat
], Position);
export { Position };
let Range = Range_1 = class Range {
    static isRange(thing) {
        if (thing instanceof Range_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Position.isPosition(thing.start) && Position.isPosition(thing.end);
    }
    static of(obj) {
        if (obj instanceof Range_1) {
            return obj;
        }
        if (this.isRange(obj)) {
            return new Range_1(obj.start, obj.end);
        }
        throw new Error('Invalid argument, is NOT a range-like object');
    }
    get start() {
        return this._start;
    }
    get end() {
        return this._end;
    }
    constructor(startLineOrStart, startColumnOrEnd, endLine, endColumn) {
        let start;
        let end;
        if (typeof startLineOrStart === 'number' &&
            typeof startColumnOrEnd === 'number' &&
            typeof endLine === 'number' &&
            typeof endColumn === 'number') {
            start = new Position(startLineOrStart, startColumnOrEnd);
            end = new Position(endLine, endColumn);
        }
        else if (Position.isPosition(startLineOrStart) && Position.isPosition(startColumnOrEnd)) {
            start = Position.of(startLineOrStart);
            end = Position.of(startColumnOrEnd);
        }
        if (!start || !end) {
            throw new Error('Invalid arguments');
        }
        if (start.isBefore(end)) {
            this._start = start;
            this._end = end;
        }
        else {
            this._start = end;
            this._end = start;
        }
    }
    contains(positionOrRange) {
        if (Range_1.isRange(positionOrRange)) {
            return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
        }
        else if (Position.isPosition(positionOrRange)) {
            if (Position.of(positionOrRange).isBefore(this._start)) {
                return false;
            }
            if (this._end.isBefore(positionOrRange)) {
                return false;
            }
            return true;
        }
        return false;
    }
    isEqual(other) {
        return this._start.isEqual(other._start) && this._end.isEqual(other._end);
    }
    intersection(other) {
        const start = Position.Max(other.start, this._start);
        const end = Position.Min(other.end, this._end);
        if (start.isAfter(end)) {
            // this happens when there is no overlap:
            // |-----|
            //          |----|
            return undefined;
        }
        return new Range_1(start, end);
    }
    union(other) {
        if (this.contains(other)) {
            return this;
        }
        else if (other.contains(this)) {
            return other;
        }
        const start = Position.Min(other.start, this._start);
        const end = Position.Max(other.end, this.end);
        return new Range_1(start, end);
    }
    get isEmpty() {
        return this._start.isEqual(this._end);
    }
    get isSingleLine() {
        return this._start.line === this._end.line;
    }
    with(startOrChange, end = this.end) {
        if (startOrChange === null || end === null) {
            throw illegalArgument();
        }
        let start;
        if (!startOrChange) {
            start = this.start;
        }
        else if (Position.isPosition(startOrChange)) {
            start = startOrChange;
        }
        else {
            start = startOrChange.start || this.start;
            end = startOrChange.end || this.end;
        }
        if (start.isEqual(this._start) && end.isEqual(this.end)) {
            return this;
        }
        return new Range_1(start, end);
    }
    toJSON() {
        return [this.start, this.end];
    }
    [Symbol.for('debug.description')]() {
        return getDebugDescriptionOfRange(this);
    }
};
Range = Range_1 = __decorate([
    es5ClassCompat
], Range);
export { Range };
let Selection = Selection_1 = class Selection extends Range {
    static isSelection(thing) {
        if (thing instanceof Selection_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return (Range.isRange(thing) &&
            Position.isPosition(thing.anchor) &&
            Position.isPosition(thing.active) &&
            typeof thing.isReversed === 'boolean');
    }
    get anchor() {
        return this._anchor;
    }
    get active() {
        return this._active;
    }
    constructor(anchorLineOrAnchor, anchorColumnOrActive, activeLine, activeColumn) {
        let anchor;
        let active;
        if (typeof anchorLineOrAnchor === 'number' &&
            typeof anchorColumnOrActive === 'number' &&
            typeof activeLine === 'number' &&
            typeof activeColumn === 'number') {
            anchor = new Position(anchorLineOrAnchor, anchorColumnOrActive);
            active = new Position(activeLine, activeColumn);
        }
        else if (Position.isPosition(anchorLineOrAnchor) &&
            Position.isPosition(anchorColumnOrActive)) {
            anchor = Position.of(anchorLineOrAnchor);
            active = Position.of(anchorColumnOrActive);
        }
        if (!anchor || !active) {
            throw new Error('Invalid arguments');
        }
        super(anchor, active);
        this._anchor = anchor;
        this._active = active;
    }
    get isReversed() {
        return this._anchor === this._end;
    }
    toJSON() {
        return {
            start: this.start,
            end: this.end,
            active: this.active,
            anchor: this.anchor,
        };
    }
    [Symbol.for('debug.description')]() {
        return getDebugDescriptionOfSelection(this);
    }
};
Selection = Selection_1 = __decorate([
    es5ClassCompat
], Selection);
export { Selection };
export function getDebugDescriptionOfRange(range) {
    return range.isEmpty
        ? `[${range.start.line}:${range.start.character})`
        : `[${range.start.line}:${range.start.character} -> ${range.end.line}:${range.end.character})`;
}
export function getDebugDescriptionOfSelection(selection) {
    let rangeStr = getDebugDescriptionOfRange(selection);
    if (!selection.isEmpty) {
        if (selection.active.isEqual(selection.start)) {
            rangeStr = `|${rangeStr}`;
        }
        else {
            rangeStr = `${rangeStr}|`;
        }
    }
    return rangeStr;
}
const validateConnectionToken = (connectionToken) => {
    if (typeof connectionToken !== 'string' ||
        connectionToken.length === 0 ||
        !/^[0-9A-Za-z_\-]+$/.test(connectionToken)) {
        throw illegalArgument('connectionToken');
    }
};
export class ResolvedAuthority {
    static isResolvedAuthority(resolvedAuthority) {
        return (resolvedAuthority &&
            typeof resolvedAuthority === 'object' &&
            typeof resolvedAuthority.host === 'string' &&
            typeof resolvedAuthority.port === 'number' &&
            (resolvedAuthority.connectionToken === undefined ||
                typeof resolvedAuthority.connectionToken === 'string'));
    }
    constructor(host, port, connectionToken) {
        if (typeof host !== 'string' || host.length === 0) {
            throw illegalArgument('host');
        }
        if (typeof port !== 'number' || port === 0 || Math.round(port) !== port) {
            throw illegalArgument('port');
        }
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
        this.host = host;
        this.port = Math.round(port);
        this.connectionToken = connectionToken;
    }
}
export class ManagedResolvedAuthority {
    static isManagedResolvedAuthority(resolvedAuthority) {
        return (resolvedAuthority &&
            typeof resolvedAuthority === 'object' &&
            typeof resolvedAuthority.makeConnection === 'function' &&
            (resolvedAuthority.connectionToken === undefined ||
                typeof resolvedAuthority.connectionToken === 'string'));
    }
    constructor(makeConnection, connectionToken) {
        this.makeConnection = makeConnection;
        this.connectionToken = connectionToken;
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
    }
}
export class RemoteAuthorityResolverError extends Error {
    static NotAvailable(message, handled) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.NotAvailable, handled);
    }
    static TemporarilyNotAvailable(message) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable);
    }
    constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
        super(message);
        this._message = message;
        this._code = code;
        this._detail = detail;
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
    }
}
export var EndOfLine;
(function (EndOfLine) {
    EndOfLine[EndOfLine["LF"] = 1] = "LF";
    EndOfLine[EndOfLine["CRLF"] = 2] = "CRLF";
})(EndOfLine || (EndOfLine = {}));
export var EnvironmentVariableMutatorType;
(function (EnvironmentVariableMutatorType) {
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Replace"] = 1] = "Replace";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Append"] = 2] = "Append";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Prepend"] = 3] = "Prepend";
})(EnvironmentVariableMutatorType || (EnvironmentVariableMutatorType = {}));
let TextEdit = TextEdit_1 = class TextEdit {
    static isTextEdit(thing) {
        if (thing instanceof TextEdit_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing) && typeof thing.newText === 'string';
    }
    static replace(range, newText) {
        return new TextEdit_1(range, newText);
    }
    static insert(position, newText) {
        return TextEdit_1.replace(new Range(position, position), newText);
    }
    static delete(range) {
        return TextEdit_1.replace(range, '');
    }
    static setEndOfLine(eol) {
        const ret = new TextEdit_1(new Range(new Position(0, 0), new Position(0, 0)), '');
        ret.newEol = eol;
        return ret;
    }
    get range() {
        return this._range;
    }
    set range(value) {
        if (value && !Range.isRange(value)) {
            throw illegalArgument('range');
        }
        this._range = value;
    }
    get newText() {
        return this._newText || '';
    }
    set newText(value) {
        if (value && typeof value !== 'string') {
            throw illegalArgument('newText');
        }
        this._newText = value;
    }
    get newEol() {
        return this._newEol;
    }
    set newEol(value) {
        if (value && typeof value !== 'number') {
            throw illegalArgument('newEol');
        }
        this._newEol = value;
    }
    constructor(range, newText) {
        this._range = range;
        this._newText = newText;
    }
    toJSON() {
        return {
            range: this.range,
            newText: this.newText,
            newEol: this._newEol,
        };
    }
};
TextEdit = TextEdit_1 = __decorate([
    es5ClassCompat
], TextEdit);
export { TextEdit };
let NotebookEdit = NotebookEdit_1 = class NotebookEdit {
    static isNotebookCellEdit(thing) {
        if (thing instanceof NotebookEdit_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return (NotebookRange.isNotebookRange(thing) &&
            Array.isArray(thing.newCells));
    }
    static replaceCells(range, newCells) {
        return new NotebookEdit_1(range, newCells);
    }
    static insertCells(index, newCells) {
        return new NotebookEdit_1(new NotebookRange(index, index), newCells);
    }
    static deleteCells(range) {
        return new NotebookEdit_1(range, []);
    }
    static updateCellMetadata(index, newMetadata) {
        const edit = new NotebookEdit_1(new NotebookRange(index, index), []);
        edit.newCellMetadata = newMetadata;
        return edit;
    }
    static updateNotebookMetadata(newMetadata) {
        const edit = new NotebookEdit_1(new NotebookRange(0, 0), []);
        edit.newNotebookMetadata = newMetadata;
        return edit;
    }
    constructor(range, newCells) {
        this.range = range;
        this.newCells = newCells;
    }
};
NotebookEdit = NotebookEdit_1 = __decorate([
    es5ClassCompat
], NotebookEdit);
export { NotebookEdit };
export class SnippetTextEdit {
    static isSnippetTextEdit(thing) {
        if (thing instanceof SnippetTextEdit) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return (Range.isRange(thing.range) &&
            SnippetString.isSnippetString(thing.snippet));
    }
    static replace(range, snippet) {
        return new SnippetTextEdit(range, snippet);
    }
    static insert(position, snippet) {
        return SnippetTextEdit.replace(new Range(position, position), snippet);
    }
    constructor(range, snippet) {
        this.range = range;
        this.snippet = snippet;
    }
}
export var FileEditType;
(function (FileEditType) {
    FileEditType[FileEditType["File"] = 1] = "File";
    FileEditType[FileEditType["Text"] = 2] = "Text";
    FileEditType[FileEditType["Cell"] = 3] = "Cell";
    FileEditType[FileEditType["CellReplace"] = 5] = "CellReplace";
    FileEditType[FileEditType["Snippet"] = 6] = "Snippet";
})(FileEditType || (FileEditType = {}));
let WorkspaceEdit = class WorkspaceEdit {
    constructor() {
        this._edits = [];
    }
    _allEntries() {
        return this._edits;
    }
    // --- file
    renameFile(from, to, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from, to, options, metadata });
    }
    createFile(uri, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from: undefined, to: uri, options, metadata });
    }
    deleteFile(uri, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from: uri, to: undefined, options, metadata });
    }
    // --- notebook
    replaceNotebookMetadata(uri, value, metadata) {
        this._edits.push({
            _type: 3 /* FileEditType.Cell */,
            metadata,
            uri,
            edit: { editType: 5 /* CellEditType.DocumentMetadata */, metadata: value },
        });
    }
    replaceNotebookCells(uri, startOrRange, cellData, metadata) {
        const start = startOrRange.start;
        const end = startOrRange.end;
        if (start !== end || cellData.length > 0) {
            this._edits.push({
                _type: 5 /* FileEditType.CellReplace */,
                uri,
                index: start,
                count: end - start,
                cells: cellData,
                metadata,
            });
        }
    }
    replaceNotebookCellMetadata(uri, index, cellMetadata, metadata) {
        this._edits.push({
            _type: 3 /* FileEditType.Cell */,
            metadata,
            uri,
            edit: { editType: 3 /* CellEditType.Metadata */, index, metadata: cellMetadata },
        });
    }
    // --- text
    replace(uri, range, newText, metadata) {
        this._edits.push({
            _type: 2 /* FileEditType.Text */,
            uri,
            edit: new TextEdit(range, newText),
            metadata,
        });
    }
    insert(resource, position, newText, metadata) {
        this.replace(resource, new Range(position, position), newText, metadata);
    }
    delete(resource, range, metadata) {
        this.replace(resource, range, '', metadata);
    }
    // --- text (Maplike)
    has(uri) {
        return this._edits.some((edit) => edit._type === 2 /* FileEditType.Text */ && edit.uri.toString() === uri.toString());
    }
    set(uri, edits) {
        if (!edits) {
            // remove all text, snippet, or notebook edits for `uri`
            for (let i = 0; i < this._edits.length; i++) {
                const element = this._edits[i];
                switch (element._type) {
                    case 2 /* FileEditType.Text */:
                    case 6 /* FileEditType.Snippet */:
                    case 3 /* FileEditType.Cell */:
                    case 5 /* FileEditType.CellReplace */:
                        if (element.uri.toString() === uri.toString()) {
                            this._edits[i] = undefined; // will be coalesced down below
                        }
                        break;
                }
            }
            coalesceInPlace(this._edits);
        }
        else {
            // append edit to the end
            for (const editOrTuple of edits) {
                if (!editOrTuple) {
                    continue;
                }
                let edit;
                let metadata;
                if (Array.isArray(editOrTuple)) {
                    edit = editOrTuple[0];
                    metadata = editOrTuple[1];
                }
                else {
                    edit = editOrTuple;
                }
                if (NotebookEdit.isNotebookCellEdit(edit)) {
                    if (edit.newCellMetadata) {
                        this.replaceNotebookCellMetadata(uri, edit.range.start, edit.newCellMetadata, metadata);
                    }
                    else if (edit.newNotebookMetadata) {
                        this.replaceNotebookMetadata(uri, edit.newNotebookMetadata, metadata);
                    }
                    else {
                        this.replaceNotebookCells(uri, edit.range, edit.newCells, metadata);
                    }
                }
                else if (SnippetTextEdit.isSnippetTextEdit(edit)) {
                    this._edits.push({
                        _type: 6 /* FileEditType.Snippet */,
                        uri,
                        range: edit.range,
                        edit: edit.snippet,
                        metadata,
                        keepWhitespace: edit.keepWhitespace,
                    });
                }
                else {
                    this._edits.push({ _type: 2 /* FileEditType.Text */, uri, edit, metadata });
                }
            }
        }
    }
    get(uri) {
        const res = [];
        for (const candidate of this._edits) {
            if (candidate._type === 2 /* FileEditType.Text */ && candidate.uri.toString() === uri.toString()) {
                res.push(candidate.edit);
            }
        }
        return res;
    }
    entries() {
        const textEdits = new ResourceMap();
        for (const candidate of this._edits) {
            if (candidate._type === 2 /* FileEditType.Text */) {
                let textEdit = textEdits.get(candidate.uri);
                if (!textEdit) {
                    textEdit = [candidate.uri, []];
                    textEdits.set(candidate.uri, textEdit);
                }
                textEdit[1].push(candidate.edit);
            }
        }
        return [...textEdits.values()];
    }
    get size() {
        return this.entries().length;
    }
    toJSON() {
        return this.entries();
    }
};
WorkspaceEdit = __decorate([
    es5ClassCompat
], WorkspaceEdit);
export { WorkspaceEdit };
let SnippetString = SnippetString_1 = class SnippetString {
    static isSnippetString(thing) {
        if (thing instanceof SnippetString_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return typeof thing.value === 'string';
    }
    static _escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    constructor(value) {
        this._tabstop = 1;
        this.value = value || '';
    }
    appendText(string) {
        this.value += SnippetString_1._escape(string);
        return this;
    }
    appendTabstop(number = this._tabstop++) {
        this.value += '$';
        this.value += number;
        return this;
    }
    appendPlaceholder(value, number = this._tabstop++) {
        if (typeof value === 'function') {
            const nested = new SnippetString_1();
            nested._tabstop = this._tabstop;
            value(nested);
            this._tabstop = nested._tabstop;
            value = nested.value;
        }
        else {
            value = SnippetString_1._escape(value);
        }
        this.value += '${';
        this.value += number;
        this.value += ':';
        this.value += value;
        this.value += '}';
        return this;
    }
    appendChoice(values, number = this._tabstop++) {
        const value = values.map((s) => s.replaceAll(/[|\\,]/g, '\\$&')).join(',');
        this.value += '${';
        this.value += number;
        this.value += '|';
        this.value += value;
        this.value += '|}';
        return this;
    }
    appendVariable(name, defaultValue) {
        if (typeof defaultValue === 'function') {
            const nested = new SnippetString_1();
            nested._tabstop = this._tabstop;
            defaultValue(nested);
            this._tabstop = nested._tabstop;
            defaultValue = nested.value;
        }
        else if (typeof defaultValue === 'string') {
            defaultValue = defaultValue.replace(/\$|}/g, '\\$&'); // CodeQL [SM02383] I do not want to escape backslashes here
        }
        this.value += '${';
        this.value += name;
        if (defaultValue) {
            this.value += ':';
            this.value += defaultValue;
        }
        this.value += '}';
        return this;
    }
};
SnippetString = SnippetString_1 = __decorate([
    es5ClassCompat
], SnippetString);
export { SnippetString };
export var DiagnosticTag;
(function (DiagnosticTag) {
    DiagnosticTag[DiagnosticTag["Unnecessary"] = 1] = "Unnecessary";
    DiagnosticTag[DiagnosticTag["Deprecated"] = 2] = "Deprecated";
})(DiagnosticTag || (DiagnosticTag = {}));
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
let Location = Location_1 = class Location {
    static isLocation(thing) {
        if (thing instanceof Location_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing.range) && URI.isUri(thing.uri);
    }
    constructor(uri, rangeOrPosition) {
        this.uri = uri;
        if (!rangeOrPosition) {
            //that's OK
        }
        else if (Range.isRange(rangeOrPosition)) {
            this.range = Range.of(rangeOrPosition);
        }
        else if (Position.isPosition(rangeOrPosition)) {
            this.range = new Range(rangeOrPosition, rangeOrPosition);
        }
        else {
            throw new Error('Illegal argument');
        }
    }
    toJSON() {
        return {
            uri: this.uri,
            range: this.range,
        };
    }
};
Location = Location_1 = __decorate([
    es5ClassCompat
], Location);
export { Location };
let DiagnosticRelatedInformation = class DiagnosticRelatedInformation {
    static is(thing) {
        if (!thing) {
            return false;
        }
        return (typeof thing.message === 'string' &&
            thing.location &&
            Range.isRange(thing.location.range) &&
            URI.isUri(thing.location.uri));
    }
    constructor(location, message) {
        this.location = location;
        this.message = message;
    }
    static isEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return (a.message === b.message &&
            a.location.range.isEqual(b.location.range) &&
            a.location.uri.toString() === b.location.uri.toString());
    }
};
DiagnosticRelatedInformation = __decorate([
    es5ClassCompat
], DiagnosticRelatedInformation);
export { DiagnosticRelatedInformation };
let Diagnostic = class Diagnostic {
    constructor(range, message, severity = DiagnosticSeverity.Error) {
        if (!Range.isRange(range)) {
            throw new TypeError('range must be set');
        }
        if (!message) {
            throw new TypeError('message must be set');
        }
        this.range = range;
        this.message = message;
        this.severity = severity;
    }
    toJSON() {
        return {
            severity: DiagnosticSeverity[this.severity],
            message: this.message,
            range: this.range,
            source: this.source,
            code: this.code,
        };
    }
    static isEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return (a.message === b.message &&
            a.severity === b.severity &&
            a.code === b.code &&
            a.severity === b.severity &&
            a.source === b.source &&
            a.range.isEqual(b.range) &&
            equals(a.tags, b.tags) &&
            equals(a.relatedInformation, b.relatedInformation, DiagnosticRelatedInformation.isEqual));
    }
};
Diagnostic = __decorate([
    es5ClassCompat
], Diagnostic);
export { Diagnostic };
let Hover = class Hover {
    constructor(contents, range) {
        if (!contents) {
            throw new Error('Illegal argument, contents must be defined');
        }
        if (Array.isArray(contents)) {
            this.contents = contents;
        }
        else {
            this.contents = [contents];
        }
        this.range = range;
    }
};
Hover = __decorate([
    es5ClassCompat
], Hover);
export { Hover };
let VerboseHover = class VerboseHover extends Hover {
    constructor(contents, range, canIncreaseVerbosity, canDecreaseVerbosity) {
        super(contents, range);
        this.canIncreaseVerbosity = canIncreaseVerbosity;
        this.canDecreaseVerbosity = canDecreaseVerbosity;
    }
};
VerboseHover = __decorate([
    es5ClassCompat
], VerboseHover);
export { VerboseHover };
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
let DocumentHighlight = class DocumentHighlight {
    constructor(range, kind = DocumentHighlightKind.Text) {
        this.range = range;
        this.kind = kind;
    }
    toJSON() {
        return {
            range: this.range,
            kind: DocumentHighlightKind[this.kind],
        };
    }
};
DocumentHighlight = __decorate([
    es5ClassCompat
], DocumentHighlight);
export { DocumentHighlight };
let MultiDocumentHighlight = class MultiDocumentHighlight {
    constructor(uri, highlights) {
        this.uri = uri;
        this.highlights = highlights;
    }
    toJSON() {
        return {
            uri: this.uri,
            highlights: this.highlights.map((h) => h.toJSON()),
        };
    }
};
MultiDocumentHighlight = __decorate([
    es5ClassCompat
], MultiDocumentHighlight);
export { MultiDocumentHighlight };
export var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
let SymbolInformation = SymbolInformation_1 = class SymbolInformation {
    static validate(candidate) {
        if (!candidate.name) {
            throw new Error('name must not be falsy');
        }
    }
    constructor(name, kind, rangeOrContainer, locationOrUri, containerName) {
        this.name = name;
        this.kind = kind;
        this.containerName = containerName;
        if (typeof rangeOrContainer === 'string') {
            this.containerName = rangeOrContainer;
        }
        if (locationOrUri instanceof Location) {
            this.location = locationOrUri;
        }
        else if (rangeOrContainer instanceof Range) {
            this.location = new Location(locationOrUri, rangeOrContainer);
        }
        SymbolInformation_1.validate(this);
    }
    toJSON() {
        return {
            name: this.name,
            kind: SymbolKind[this.kind],
            location: this.location,
            containerName: this.containerName,
        };
    }
};
SymbolInformation = SymbolInformation_1 = __decorate([
    es5ClassCompat
], SymbolInformation);
export { SymbolInformation };
let DocumentSymbol = DocumentSymbol_1 = class DocumentSymbol {
    static validate(candidate) {
        if (!candidate.name) {
            throw new Error('name must not be falsy');
        }
        if (!candidate.range.contains(candidate.selectionRange)) {
            throw new Error('selectionRange must be contained in fullRange');
        }
        candidate.children?.forEach(DocumentSymbol_1.validate);
    }
    constructor(name, detail, kind, range, selectionRange) {
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
        this.children = [];
        DocumentSymbol_1.validate(this);
    }
};
DocumentSymbol = DocumentSymbol_1 = __decorate([
    es5ClassCompat
], DocumentSymbol);
export { DocumentSymbol };
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    CodeActionTriggerKind[CodeActionTriggerKind["Invoke"] = 1] = "Invoke";
    CodeActionTriggerKind[CodeActionTriggerKind["Automatic"] = 2] = "Automatic";
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
let CodeAction = class CodeAction {
    constructor(title, kind) {
        this.title = title;
        this.kind = kind;
    }
};
CodeAction = __decorate([
    es5ClassCompat
], CodeAction);
export { CodeAction };
let CodeActionKind = class CodeActionKind {
    static { CodeActionKind_1 = this; }
    static { this.sep = '.'; }
    constructor(value) {
        this.value = value;
    }
    append(parts) {
        return new CodeActionKind_1(this.value ? this.value + CodeActionKind_1.sep + parts : parts);
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    contains(other) {
        return this.value === other.value || other.value.startsWith(this.value + CodeActionKind_1.sep);
    }
};
CodeActionKind = CodeActionKind_1 = __decorate([
    es5ClassCompat
], CodeActionKind);
export { CodeActionKind };
CodeActionKind.Empty = new CodeActionKind('');
CodeActionKind.QuickFix = CodeActionKind.Empty.append('quickfix');
CodeActionKind.Refactor = CodeActionKind.Empty.append('refactor');
CodeActionKind.RefactorExtract = CodeActionKind.Refactor.append('extract');
CodeActionKind.RefactorInline = CodeActionKind.Refactor.append('inline');
CodeActionKind.RefactorMove = CodeActionKind.Refactor.append('move');
CodeActionKind.RefactorRewrite = CodeActionKind.Refactor.append('rewrite');
CodeActionKind.Source = CodeActionKind.Empty.append('source');
CodeActionKind.SourceOrganizeImports = CodeActionKind.Source.append('organizeImports');
CodeActionKind.SourceFixAll = CodeActionKind.Source.append('fixAll');
CodeActionKind.Notebook = CodeActionKind.Empty.append('notebook');
let SelectionRange = class SelectionRange {
    constructor(range, parent) {
        this.range = range;
        this.parent = parent;
        if (parent && !parent.range.contains(this.range)) {
            throw new Error('Invalid argument: parent must contain this range');
        }
    }
};
SelectionRange = __decorate([
    es5ClassCompat
], SelectionRange);
export { SelectionRange };
export class CallHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
export class CallHierarchyIncomingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.from = item;
    }
}
export class CallHierarchyOutgoingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.to = item;
    }
}
export var LanguageStatusSeverity;
(function (LanguageStatusSeverity) {
    LanguageStatusSeverity[LanguageStatusSeverity["Information"] = 0] = "Information";
    LanguageStatusSeverity[LanguageStatusSeverity["Warning"] = 1] = "Warning";
    LanguageStatusSeverity[LanguageStatusSeverity["Error"] = 2] = "Error";
})(LanguageStatusSeverity || (LanguageStatusSeverity = {}));
let CodeLens = class CodeLens {
    constructor(range, command) {
        this.range = range;
        this.command = command;
    }
    get isResolved() {
        return !!this.command;
    }
};
CodeLens = __decorate([
    es5ClassCompat
], CodeLens);
export { CodeLens };
let MarkdownString = MarkdownString_1 = class MarkdownString {
    #delegate;
    static isMarkdownString(thing) {
        if (thing instanceof MarkdownString_1) {
            return true;
        }
        return (thing &&
            thing.appendCodeblock &&
            thing.appendMarkdown &&
            thing.appendText &&
            thing.value !== undefined);
    }
    constructor(value, supportThemeIcons = false) {
        this.#delegate = new BaseMarkdownString(value, { supportThemeIcons });
    }
    get value() {
        return this.#delegate.value;
    }
    set value(value) {
        this.#delegate.value = value;
    }
    get isTrusted() {
        return this.#delegate.isTrusted;
    }
    set isTrusted(value) {
        this.#delegate.isTrusted = value;
    }
    get supportThemeIcons() {
        return this.#delegate.supportThemeIcons;
    }
    set supportThemeIcons(value) {
        this.#delegate.supportThemeIcons = value;
    }
    get supportHtml() {
        return this.#delegate.supportHtml;
    }
    set supportHtml(value) {
        this.#delegate.supportHtml = value;
    }
    get baseUri() {
        return this.#delegate.baseUri;
    }
    set baseUri(value) {
        this.#delegate.baseUri = value;
    }
    appendText(value) {
        this.#delegate.appendText(value);
        return this;
    }
    appendMarkdown(value) {
        this.#delegate.appendMarkdown(value);
        return this;
    }
    appendCodeblock(value, language) {
        this.#delegate.appendCodeblock(language ?? '', value);
        return this;
    }
};
MarkdownString = MarkdownString_1 = __decorate([
    es5ClassCompat
], MarkdownString);
export { MarkdownString };
let ParameterInformation = class ParameterInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
    }
};
ParameterInformation = __decorate([
    es5ClassCompat
], ParameterInformation);
export { ParameterInformation };
let SignatureInformation = class SignatureInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
        this.parameters = [];
    }
};
SignatureInformation = __decorate([
    es5ClassCompat
], SignatureInformation);
export { SignatureInformation };
let SignatureHelp = class SignatureHelp {
    constructor() {
        this.activeSignature = 0;
        this.activeParameter = 0;
        this.signatures = [];
    }
};
SignatureHelp = __decorate([
    es5ClassCompat
], SignatureHelp);
export { SignatureHelp };
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
let InlayHintLabelPart = class InlayHintLabelPart {
    constructor(value) {
        this.value = value;
    }
};
InlayHintLabelPart = __decorate([
    es5ClassCompat
], InlayHintLabelPart);
export { InlayHintLabelPart };
let InlayHint = class InlayHint {
    constructor(position, label, kind) {
        this.position = position;
        this.label = label;
        this.kind = kind;
    }
};
InlayHint = __decorate([
    es5ClassCompat
], InlayHint);
export { InlayHint };
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Text"] = 0] = "Text";
    CompletionItemKind[CompletionItemKind["Method"] = 1] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 2] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 3] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 4] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 5] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 6] = "Class";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Unit"] = 10] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 11] = "Value";
    CompletionItemKind[CompletionItemKind["Enum"] = 12] = "Enum";
    CompletionItemKind[CompletionItemKind["Keyword"] = 13] = "Keyword";
    CompletionItemKind[CompletionItemKind["Snippet"] = 14] = "Snippet";
    CompletionItemKind[CompletionItemKind["Color"] = 15] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 16] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 17] = "Reference";
    CompletionItemKind[CompletionItemKind["Folder"] = 18] = "Folder";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 19] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Constant"] = 20] = "Constant";
    CompletionItemKind[CompletionItemKind["Struct"] = 21] = "Struct";
    CompletionItemKind[CompletionItemKind["Event"] = 22] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 23] = "Operator";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
let CompletionItem = class CompletionItem {
    constructor(label, kind) {
        this.label = label;
        this.kind = kind;
    }
    toJSON() {
        return {
            label: this.label,
            kind: this.kind && CompletionItemKind[this.kind],
            detail: this.detail,
            documentation: this.documentation,
            sortText: this.sortText,
            filterText: this.filterText,
            preselect: this.preselect,
            insertText: this.insertText,
            textEdit: this.textEdit,
        };
    }
};
CompletionItem = __decorate([
    es5ClassCompat
], CompletionItem);
export { CompletionItem };
let CompletionList = class CompletionList {
    constructor(items = [], isIncomplete = false) {
        this.items = items;
        this.isIncomplete = isIncomplete;
    }
};
CompletionList = __decorate([
    es5ClassCompat
], CompletionList);
export { CompletionList };
let InlineSuggestion = class InlineSuggestion {
    constructor(insertText, range, command) {
        this.insertText = insertText;
        this.range = range;
        this.command = command;
    }
};
InlineSuggestion = __decorate([
    es5ClassCompat
], InlineSuggestion);
export { InlineSuggestion };
let InlineSuggestionList = class InlineSuggestionList {
    constructor(items) {
        this.commands = undefined;
        this.suppressSuggestions = undefined;
        this.items = items;
    }
};
InlineSuggestionList = __decorate([
    es5ClassCompat
], InlineSuggestionList);
export { InlineSuggestionList };
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Unknown"] = 0] = "Unknown";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 1] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 2] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 3] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var ViewColumn;
(function (ViewColumn) {
    ViewColumn[ViewColumn["Active"] = -1] = "Active";
    ViewColumn[ViewColumn["Beside"] = -2] = "Beside";
    ViewColumn[ViewColumn["One"] = 1] = "One";
    ViewColumn[ViewColumn["Two"] = 2] = "Two";
    ViewColumn[ViewColumn["Three"] = 3] = "Three";
    ViewColumn[ViewColumn["Four"] = 4] = "Four";
    ViewColumn[ViewColumn["Five"] = 5] = "Five";
    ViewColumn[ViewColumn["Six"] = 6] = "Six";
    ViewColumn[ViewColumn["Seven"] = 7] = "Seven";
    ViewColumn[ViewColumn["Eight"] = 8] = "Eight";
    ViewColumn[ViewColumn["Nine"] = 9] = "Nine";
})(ViewColumn || (ViewColumn = {}));
export var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
})(StatusBarAlignment || (StatusBarAlignment = {}));
export function asStatusBarItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Off"] = 0] = "Off";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["On"] = 1] = "On";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Relative"] = 2] = "Relative";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Interval"] = 3] = "Interval";
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    TextDocumentSaveReason[TextDocumentSaveReason["Manual"] = 1] = "Manual";
    TextDocumentSaveReason[TextDocumentSaveReason["AfterDelay"] = 2] = "AfterDelay";
    TextDocumentSaveReason[TextDocumentSaveReason["FocusOut"] = 3] = "FocusOut";
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
export var TextEditorSelectionChangeKind;
(function (TextEditorSelectionChangeKind) {
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Keyboard"] = 1] = "Keyboard";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Mouse"] = 2] = "Mouse";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Command"] = 3] = "Command";
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var TextEditorChangeKind;
(function (TextEditorChangeKind) {
    TextEditorChangeKind[TextEditorChangeKind["Addition"] = 1] = "Addition";
    TextEditorChangeKind[TextEditorChangeKind["Deletion"] = 2] = "Deletion";
    TextEditorChangeKind[TextEditorChangeKind["Modification"] = 3] = "Modification";
})(TextEditorChangeKind || (TextEditorChangeKind = {}));
export var TextDocumentChangeReason;
(function (TextDocumentChangeReason) {
    TextDocumentChangeReason[TextDocumentChangeReason["Undo"] = 1] = "Undo";
    TextDocumentChangeReason[TextDocumentChangeReason["Redo"] = 2] = "Redo";
})(TextDocumentChangeReason || (TextDocumentChangeReason = {}));
/**
 * These values match very carefully the values of `TrackedRangeStickiness`
 */
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    /**
     * TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenOpen"] = 0] = "OpenOpen";
    /**
     * TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedClosed"] = 1] = "ClosedClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenClosed"] = 2] = "OpenClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingAfter
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedOpen"] = 3] = "ClosedOpen";
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
(function (TextEditorSelectionChangeKind) {
    function fromValue(s) {
        switch (s) {
            case 'keyboard':
                return TextEditorSelectionChangeKind.Keyboard;
            case 'mouse':
                return TextEditorSelectionChangeKind.Mouse;
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */:
            case "code.jump" /* TextEditorSelectionSource.JUMP */:
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */:
                return TextEditorSelectionChangeKind.Command;
        }
        return undefined;
    }
    TextEditorSelectionChangeKind.fromValue = fromValue;
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var SyntaxTokenType;
(function (SyntaxTokenType) {
    SyntaxTokenType[SyntaxTokenType["Other"] = 0] = "Other";
    SyntaxTokenType[SyntaxTokenType["Comment"] = 1] = "Comment";
    SyntaxTokenType[SyntaxTokenType["String"] = 2] = "String";
    SyntaxTokenType[SyntaxTokenType["RegEx"] = 3] = "RegEx";
})(SyntaxTokenType || (SyntaxTokenType = {}));
(function (SyntaxTokenType) {
    function toString(v) {
        switch (v) {
            case SyntaxTokenType.Other:
                return 'other';
            case SyntaxTokenType.Comment:
                return 'comment';
            case SyntaxTokenType.String:
                return 'string';
            case SyntaxTokenType.RegEx:
                return 'regex';
        }
        return 'other';
    }
    SyntaxTokenType.toString = toString;
})(SyntaxTokenType || (SyntaxTokenType = {}));
let DocumentLink = class DocumentLink {
    constructor(range, target) {
        if (target && !URI.isUri(target)) {
            throw illegalArgument('target');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.target = target;
    }
};
DocumentLink = __decorate([
    es5ClassCompat
], DocumentLink);
export { DocumentLink };
let Color = class Color {
    constructor(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
};
Color = __decorate([
    es5ClassCompat
], Color);
export { Color };
let ColorInformation = class ColorInformation {
    constructor(range, color) {
        if (color && !(color instanceof Color)) {
            throw illegalArgument('color');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.color = color;
    }
};
ColorInformation = __decorate([
    es5ClassCompat
], ColorInformation);
export { ColorInformation };
let ColorPresentation = class ColorPresentation {
    constructor(label) {
        if (!label || typeof label !== 'string') {
            throw illegalArgument('label');
        }
        this.label = label;
    }
};
ColorPresentation = __decorate([
    es5ClassCompat
], ColorPresentation);
export { ColorPresentation };
export var ColorFormat;
(function (ColorFormat) {
    ColorFormat[ColorFormat["RGB"] = 0] = "RGB";
    ColorFormat[ColorFormat["HEX"] = 1] = "HEX";
    ColorFormat[ColorFormat["HSL"] = 2] = "HSL";
})(ColorFormat || (ColorFormat = {}));
export var SourceControlInputBoxValidationType;
(function (SourceControlInputBoxValidationType) {
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Error"] = 0] = "Error";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Warning"] = 1] = "Warning";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Information"] = 2] = "Information";
})(SourceControlInputBoxValidationType || (SourceControlInputBoxValidationType = {}));
export var TerminalExitReason;
(function (TerminalExitReason) {
    TerminalExitReason[TerminalExitReason["Unknown"] = 0] = "Unknown";
    TerminalExitReason[TerminalExitReason["Shutdown"] = 1] = "Shutdown";
    TerminalExitReason[TerminalExitReason["Process"] = 2] = "Process";
    TerminalExitReason[TerminalExitReason["User"] = 3] = "User";
    TerminalExitReason[TerminalExitReason["Extension"] = 4] = "Extension";
})(TerminalExitReason || (TerminalExitReason = {}));
export var TerminalShellExecutionCommandLineConfidence;
(function (TerminalShellExecutionCommandLineConfidence) {
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Low"] = 0] = "Low";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Medium"] = 1] = "Medium";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["High"] = 2] = "High";
})(TerminalShellExecutionCommandLineConfidence || (TerminalShellExecutionCommandLineConfidence = {}));
export var TerminalShellType;
(function (TerminalShellType) {
    TerminalShellType[TerminalShellType["Sh"] = 1] = "Sh";
    TerminalShellType[TerminalShellType["Bash"] = 2] = "Bash";
    TerminalShellType[TerminalShellType["Fish"] = 3] = "Fish";
    TerminalShellType[TerminalShellType["Csh"] = 4] = "Csh";
    TerminalShellType[TerminalShellType["Ksh"] = 5] = "Ksh";
    TerminalShellType[TerminalShellType["Zsh"] = 6] = "Zsh";
    TerminalShellType[TerminalShellType["CommandPrompt"] = 7] = "CommandPrompt";
    TerminalShellType[TerminalShellType["GitBash"] = 8] = "GitBash";
    TerminalShellType[TerminalShellType["PowerShell"] = 9] = "PowerShell";
    TerminalShellType[TerminalShellType["Python"] = 10] = "Python";
    TerminalShellType[TerminalShellType["Julia"] = 11] = "Julia";
    TerminalShellType[TerminalShellType["NuShell"] = 12] = "NuShell";
    TerminalShellType[TerminalShellType["Node"] = 13] = "Node";
})(TerminalShellType || (TerminalShellType = {}));
export class TerminalLink {
    constructor(startIndex, length, tooltip) {
        this.startIndex = startIndex;
        this.length = length;
        this.tooltip = tooltip;
        if (typeof startIndex !== 'number' || startIndex < 0) {
            throw illegalArgument('startIndex');
        }
        if (typeof length !== 'number' || length < 1) {
            throw illegalArgument('length');
        }
        if (tooltip !== undefined && typeof tooltip !== 'string') {
            throw illegalArgument('tooltip');
        }
    }
}
export class TerminalQuickFixOpener {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TerminalQuickFixCommand {
    constructor(terminalCommand) {
        this.terminalCommand = terminalCommand;
    }
}
export var TerminalLocation;
(function (TerminalLocation) {
    TerminalLocation[TerminalLocation["Panel"] = 1] = "Panel";
    TerminalLocation[TerminalLocation["Editor"] = 2] = "Editor";
})(TerminalLocation || (TerminalLocation = {}));
export class TerminalProfile {
    constructor(options) {
        this.options = options;
        if (typeof options !== 'object') {
            throw illegalArgument('options');
        }
    }
}
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
export class TerminalCompletionItem {
    constructor(label, icon, detail, documentation, isFile, isDirectory, isKeyword, replacementIndex, replacementLength) {
        this.label = label;
        this.icon = icon;
        this.detail = detail;
        this.documentation = documentation;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.isKeyword = isKeyword;
        this.replacementIndex = replacementIndex ?? 0;
        this.replacementLength = replacementLength ?? 0;
    }
}
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items ?? [];
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
export var TaskRevealKind;
(function (TaskRevealKind) {
    TaskRevealKind[TaskRevealKind["Always"] = 1] = "Always";
    TaskRevealKind[TaskRevealKind["Silent"] = 2] = "Silent";
    TaskRevealKind[TaskRevealKind["Never"] = 3] = "Never";
})(TaskRevealKind || (TaskRevealKind = {}));
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates the task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates the task's problem matcher has ended without errors */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates the task's problem matcher has ended with errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
export var TaskPanelKind;
(function (TaskPanelKind) {
    TaskPanelKind[TaskPanelKind["Shared"] = 1] = "Shared";
    TaskPanelKind[TaskPanelKind["Dedicated"] = 2] = "Dedicated";
    TaskPanelKind[TaskPanelKind["New"] = 3] = "New";
})(TaskPanelKind || (TaskPanelKind = {}));
let TaskGroup = class TaskGroup {
    static { TaskGroup_1 = this; }
    static { this.Clean = new TaskGroup_1('clean', 'Clean'); }
    static { this.Build = new TaskGroup_1('build', 'Build'); }
    static { this.Rebuild = new TaskGroup_1('rebuild', 'Rebuild'); }
    static { this.Test = new TaskGroup_1('test', 'Test'); }
    static from(value) {
        switch (value) {
            case 'clean':
                return TaskGroup_1.Clean;
            case 'build':
                return TaskGroup_1.Build;
            case 'rebuild':
                return TaskGroup_1.Rebuild;
            case 'test':
                return TaskGroup_1.Test;
            default:
                return undefined;
        }
    }
    constructor(id, label) {
        this.label = label;
        if (typeof id !== 'string') {
            throw illegalArgument('name');
        }
        if (typeof label !== 'string') {
            throw illegalArgument('name');
        }
        this._id = id;
    }
    get id() {
        return this._id;
    }
};
TaskGroup = TaskGroup_1 = __decorate([
    es5ClassCompat
], TaskGroup);
export { TaskGroup };
function computeTaskExecutionId(values) {
    let id = '';
    for (let i = 0; i < values.length; i++) {
        id += values[i].replace(/,/g, ',,') + ',';
    }
    return id;
}
let ProcessExecution = class ProcessExecution {
    constructor(process, varg1, varg2) {
        if (typeof process !== 'string') {
            throw illegalArgument('process');
        }
        this._args = [];
        this._process = process;
        if (varg1 !== undefined) {
            if (Array.isArray(varg1)) {
                this._args = varg1;
                this._options = varg2;
            }
            else {
                this._options = varg1;
            }
        }
    }
    get process() {
        return this._process;
    }
    set process(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('process');
        }
        this._process = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        if (!Array.isArray(value)) {
            value = [];
        }
        this._args = value;
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('process');
        if (this._process !== undefined) {
            props.push(this._process);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(arg);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ProcessExecution = __decorate([
    es5ClassCompat
], ProcessExecution);
export { ProcessExecution };
let ShellExecution = class ShellExecution {
    constructor(arg0, arg1, arg2) {
        this._args = [];
        if (Array.isArray(arg1)) {
            if (!arg0) {
                throw illegalArgument("command can't be undefined or null");
            }
            if (typeof arg0 !== 'string' && typeof arg0.value !== 'string') {
                throw illegalArgument('command');
            }
            this._command = arg0;
            if (arg1) {
                this._args = arg1;
            }
            this._options = arg2;
        }
        else {
            if (typeof arg0 !== 'string') {
                throw illegalArgument('commandLine');
            }
            this._commandLine = arg0;
            this._options = arg1;
        }
    }
    get commandLine() {
        return this._commandLine;
    }
    set commandLine(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('commandLine');
        }
        this._commandLine = value;
    }
    get command() {
        return this._command ? this._command : '';
    }
    set command(value) {
        if (typeof value !== 'string' && typeof value.value !== 'string') {
            throw illegalArgument('command');
        }
        this._command = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        this._args = value || [];
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('shell');
        if (this._commandLine !== undefined) {
            props.push(this._commandLine);
        }
        if (this._command !== undefined) {
            props.push(typeof this._command === 'string' ? this._command : this._command.value);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(typeof arg === 'string' ? arg : arg.value);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ShellExecution = __decorate([
    es5ClassCompat
], ShellExecution);
export { ShellExecution };
export var ShellQuoting;
(function (ShellQuoting) {
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
export var TaskScope;
(function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
})(TaskScope || (TaskScope = {}));
export class CustomExecution {
    constructor(callback) {
        this._callback = callback;
    }
    computeId() {
        return 'customExecution' + generateUuid();
    }
    set callback(value) {
        this._callback = value;
    }
    get callback() {
        return this._callback;
    }
}
let Task = class Task {
    static { Task_1 = this; }
    static { this.ExtensionCallbackType = 'customExecution'; }
    static { this.ProcessType = 'process'; }
    static { this.ShellType = 'shell'; }
    static { this.EmptyType = '$empty'; }
    constructor(definition, arg2, arg3, arg4, arg5, arg6) {
        this.__deprecated = false;
        this._definition = this.definition = definition;
        let problemMatchers;
        if (typeof arg2 === 'string') {
            this._name = this.name = arg2;
            this._source = this.source = arg3;
            this.execution = arg4;
            problemMatchers = arg5;
            this.__deprecated = true;
        }
        else if (arg2 === TaskScope.Global || arg2 === TaskScope.Workspace) {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        else {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        if (typeof problemMatchers === 'string') {
            this._problemMatchers = [problemMatchers];
            this._hasDefinedMatchers = true;
        }
        else if (Array.isArray(problemMatchers)) {
            this._problemMatchers = problemMatchers;
            this._hasDefinedMatchers = true;
        }
        else {
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
        }
        this._isBackground = false;
        this._presentationOptions = Object.create(null);
        this._runOptions = Object.create(null);
    }
    get _id() {
        return this.__id;
    }
    set _id(value) {
        this.__id = value;
    }
    get _deprecated() {
        return this.__deprecated;
    }
    clear() {
        if (this.__id === undefined) {
            return;
        }
        this.__id = undefined;
        this._scope = undefined;
        this.computeDefinitionBasedOnExecution();
    }
    computeDefinitionBasedOnExecution() {
        if (this._execution instanceof ProcessExecution) {
            this._definition = {
                type: Task_1.ProcessType,
                id: this._execution.computeId(),
            };
        }
        else if (this._execution instanceof ShellExecution) {
            this._definition = {
                type: Task_1.ShellType,
                id: this._execution.computeId(),
            };
        }
        else if (this._execution instanceof CustomExecution) {
            this._definition = {
                type: Task_1.ExtensionCallbackType,
                id: this._execution.computeId(),
            };
        }
        else {
            this._definition = {
                type: Task_1.EmptyType,
                id: generateUuid(),
            };
        }
    }
    get definition() {
        return this._definition;
    }
    set definition(value) {
        if (value === undefined || value === null) {
            throw illegalArgument("Kind can't be undefined or null");
        }
        this.clear();
        this._definition = value;
    }
    get scope() {
        return this._scope;
    }
    set target(value) {
        this.clear();
        this._scope = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('name');
        }
        this.clear();
        this._name = value;
    }
    get execution() {
        return this._execution;
    }
    set execution(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._execution = value;
        const type = this._definition.type;
        if (Task_1.EmptyType === type ||
            Task_1.ProcessType === type ||
            Task_1.ShellType === type ||
            Task_1.ExtensionCallbackType === type) {
            this.computeDefinitionBasedOnExecution();
        }
    }
    get problemMatchers() {
        return this._problemMatchers;
    }
    set problemMatchers(value) {
        if (!Array.isArray(value)) {
            this.clear();
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
            return;
        }
        else {
            this.clear();
            this._problemMatchers = value;
            this._hasDefinedMatchers = true;
        }
    }
    get hasDefinedMatchers() {
        return this._hasDefinedMatchers;
    }
    get isBackground() {
        return this._isBackground;
    }
    set isBackground(value) {
        if (value !== true && value !== false) {
            value = false;
        }
        this.clear();
        this._isBackground = value;
    }
    get source() {
        return this._source;
    }
    set source(value) {
        if (typeof value !== 'string' || value.length === 0) {
            throw illegalArgument('source must be a string of length > 0');
        }
        this.clear();
        this._source = value;
    }
    get group() {
        return this._group;
    }
    set group(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._group = value;
    }
    get detail() {
        return this._detail;
    }
    set detail(value) {
        if (value === null) {
            value = undefined;
        }
        this._detail = value;
    }
    get presentationOptions() {
        return this._presentationOptions;
    }
    set presentationOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._presentationOptions = value;
    }
    get runOptions() {
        return this._runOptions;
    }
    set runOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._runOptions = value;
    }
};
Task = Task_1 = __decorate([
    es5ClassCompat
], Task);
export { Task };
export var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["SourceControl"] = 1] = "SourceControl";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
})(ProgressLocation || (ProgressLocation = {}));
export var ViewBadge;
(function (ViewBadge) {
    function isViewBadge(thing) {
        const viewBadgeThing = thing;
        if (!isNumber(viewBadgeThing.value)) {
            console.log('INVALID view badge, invalid value', viewBadgeThing.value);
            return false;
        }
        if (viewBadgeThing.tooltip && !isString(viewBadgeThing.tooltip)) {
            console.log('INVALID view badge, invalid tooltip', viewBadgeThing.tooltip);
            return false;
        }
        return true;
    }
    ViewBadge.isViewBadge = isViewBadge;
})(ViewBadge || (ViewBadge = {}));
let TreeItem = TreeItem_1 = class TreeItem {
    static isTreeItem(thing, extension) {
        const treeItemThing = thing;
        if (treeItemThing.checkboxState !== undefined) {
            const checkbox = isNumber(treeItemThing.checkboxState)
                ? treeItemThing.checkboxState
                : isObject(treeItemThing.checkboxState) && isNumber(treeItemThing.checkboxState.state)
                    ? treeItemThing.checkboxState.state
                    : undefined;
            const tooltip = !isNumber(treeItemThing.checkboxState) && isObject(treeItemThing.checkboxState)
                ? treeItemThing.checkboxState.tooltip
                : undefined;
            if (checkbox === undefined ||
                (checkbox !== TreeItemCheckboxState.Checked &&
                    checkbox !== TreeItemCheckboxState.Unchecked) ||
                (tooltip !== undefined && !isString(tooltip))) {
                console.log('INVALID tree item, invalid checkboxState', treeItemThing.checkboxState);
                return false;
            }
        }
        if (thing instanceof TreeItem_1) {
            return true;
        }
        if (treeItemThing.label !== undefined &&
            !isString(treeItemThing.label) &&
            !treeItemThing.label?.label) {
            console.log('INVALID tree item, invalid label', treeItemThing.label);
            return false;
        }
        if (treeItemThing.id !== undefined && !isString(treeItemThing.id)) {
            console.log('INVALID tree item, invalid id', treeItemThing.id);
            return false;
        }
        if (treeItemThing.iconPath !== undefined &&
            !isString(treeItemThing.iconPath) &&
            !URI.isUri(treeItemThing.iconPath) &&
            (!treeItemThing.iconPath || !isString(treeItemThing.iconPath.id))) {
            const asLightAndDarkThing = treeItemThing.iconPath;
            if (!asLightAndDarkThing ||
                (!isString(asLightAndDarkThing.light) &&
                    !URI.isUri(asLightAndDarkThing.light) &&
                    !isString(asLightAndDarkThing.dark) &&
                    !URI.isUri(asLightAndDarkThing.dark))) {
                console.log('INVALID tree item, invalid iconPath', treeItemThing.iconPath);
                return false;
            }
        }
        if (treeItemThing.description !== undefined &&
            !isString(treeItemThing.description) &&
            typeof treeItemThing.description !== 'boolean') {
            console.log('INVALID tree item, invalid description', treeItemThing.description);
            return false;
        }
        if (treeItemThing.resourceUri !== undefined && !URI.isUri(treeItemThing.resourceUri)) {
            console.log('INVALID tree item, invalid resourceUri', treeItemThing.resourceUri);
            return false;
        }
        if (treeItemThing.tooltip !== undefined &&
            !isString(treeItemThing.tooltip) &&
            !(treeItemThing.tooltip instanceof MarkdownString)) {
            console.log('INVALID tree item, invalid tooltip', treeItemThing.tooltip);
            return false;
        }
        if (treeItemThing.command !== undefined && !treeItemThing.command.command) {
            console.log('INVALID tree item, invalid command', treeItemThing.command);
            return false;
        }
        if (treeItemThing.collapsibleState !== undefined &&
            treeItemThing.collapsibleState < TreeItemCollapsibleState.None &&
            treeItemThing.collapsibleState > TreeItemCollapsibleState.Expanded) {
            console.log('INVALID tree item, invalid collapsibleState', treeItemThing.collapsibleState);
            return false;
        }
        if (treeItemThing.contextValue !== undefined && !isString(treeItemThing.contextValue)) {
            console.log('INVALID tree item, invalid contextValue', treeItemThing.contextValue);
            return false;
        }
        if (treeItemThing.accessibilityInformation !== undefined &&
            !treeItemThing.accessibilityInformation?.label) {
            console.log('INVALID tree item, invalid accessibilityInformation', treeItemThing.accessibilityInformation);
            return false;
        }
        return true;
    }
    constructor(arg1, collapsibleState = TreeItemCollapsibleState.None) {
        this.collapsibleState = collapsibleState;
        if (URI.isUri(arg1)) {
            this.resourceUri = arg1;
        }
        else {
            this.label = arg1;
        }
    }
};
TreeItem = TreeItem_1 = __decorate([
    es5ClassCompat
], TreeItem);
export { TreeItem };
export var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
export var TreeItemCheckboxState;
(function (TreeItemCheckboxState) {
    TreeItemCheckboxState[TreeItemCheckboxState["Unchecked"] = 0] = "Unchecked";
    TreeItemCheckboxState[TreeItemCheckboxState["Checked"] = 1] = "Checked";
})(TreeItemCheckboxState || (TreeItemCheckboxState = {}));
let DataTransferItem = class DataTransferItem {
    async asString() {
        return typeof this.value === 'string' ? this.value : JSON.stringify(this.value);
    }
    asFile() {
        return undefined;
    }
    constructor(value) {
        this.value = value;
    }
};
DataTransferItem = __decorate([
    es5ClassCompat
], DataTransferItem);
export { DataTransferItem };
/**
 * A data transfer item that has been created by VS Code instead of by a extension.
 *
 * Intentionally not exported to extensions.
 */
export class InternalDataTransferItem extends DataTransferItem {
}
/**
 * A data transfer item for a file.
 *
 * Intentionally not exported to extensions as only we can create these.
 */
export class InternalFileDataTransferItem extends InternalDataTransferItem {
    #file;
    constructor(file) {
        super('');
        this.#file = file;
    }
    asFile() {
        return this.#file;
    }
}
/**
 * Intentionally not exported to extensions
 */
export class DataTransferFile {
    constructor(name, uri, itemId, getData) {
        this.name = name;
        this.uri = uri;
        this._itemId = itemId;
        this._getData = getData;
    }
    data() {
        return this._getData();
    }
}
let DataTransfer = class DataTransfer {
    #items = new Map();
    constructor(init) {
        for (const [mime, item] of init ?? []) {
            const existing = this.#items.get(this.#normalizeMime(mime));
            if (existing) {
                existing.push(item);
            }
            else {
                this.#items.set(this.#normalizeMime(mime), [item]);
            }
        }
    }
    get(mimeType) {
        return this.#items.get(this.#normalizeMime(mimeType))?.[0];
    }
    set(mimeType, value) {
        // This intentionally overwrites all entries for a given mimetype.
        // This is similar to how the DOM DataTransfer type works
        this.#items.set(this.#normalizeMime(mimeType), [value]);
    }
    forEach(callbackfn, thisArg) {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                callbackfn.call(thisArg, item, mime, this);
            }
        }
    }
    *[Symbol.iterator]() {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                yield [mime, item];
            }
        }
    }
    #normalizeMime(mimeType) {
        return mimeType.toLowerCase();
    }
};
DataTransfer = __decorate([
    es5ClassCompat
], DataTransfer);
export { DataTransfer };
let DocumentDropEdit = class DocumentDropEdit {
    constructor(insertText, title, kind) {
        this.insertText = insertText;
        this.title = title;
        this.kind = kind;
    }
};
DocumentDropEdit = __decorate([
    es5ClassCompat
], DocumentDropEdit);
export { DocumentDropEdit };
export var DocumentPasteTriggerKind;
(function (DocumentPasteTriggerKind) {
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["Automatic"] = 0] = "Automatic";
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
export class DocumentDropOrPasteEditKind {
    static { this.sep = '.'; }
    constructor(value) {
        this.value = value;
    }
    append(...parts) {
        return new DocumentDropOrPasteEditKind((this.value ? [this.value, ...parts] : parts).join(DocumentDropOrPasteEditKind.sep));
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    contains(other) {
        return (this.value === other.value ||
            other.value.startsWith(this.value + DocumentDropOrPasteEditKind.sep));
    }
}
DocumentDropOrPasteEditKind.Empty = new DocumentDropOrPasteEditKind('');
DocumentDropOrPasteEditKind.Text = new DocumentDropOrPasteEditKind('text');
DocumentDropOrPasteEditKind.TextUpdateImports =
    DocumentDropOrPasteEditKind.Text.append('updateImports');
export class DocumentPasteEdit {
    constructor(insertText, title, kind) {
        this.title = title;
        this.insertText = insertText;
        this.kind = kind;
    }
}
let ThemeIcon = class ThemeIcon {
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }
    static isThemeIcon(thing) {
        if (typeof thing.id !== 'string') {
            console.log('INVALID ThemeIcon, invalid id', thing.id);
            return false;
        }
        return true;
    }
};
ThemeIcon = __decorate([
    es5ClassCompat
], ThemeIcon);
export { ThemeIcon };
ThemeIcon.File = new ThemeIcon('file');
ThemeIcon.Folder = new ThemeIcon('folder');
let ThemeColor = class ThemeColor {
    constructor(id) {
        this.id = id;
    }
};
ThemeColor = __decorate([
    es5ClassCompat
], ThemeColor);
export { ThemeColor };
export var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
    ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
    ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
})(ConfigurationTarget || (ConfigurationTarget = {}));
let RelativePattern = class RelativePattern {
    get base() {
        return this._base;
    }
    set base(base) {
        this._base = base;
        this._baseUri = URI.file(base);
    }
    get baseUri() {
        return this._baseUri;
    }
    set baseUri(baseUri) {
        this._baseUri = baseUri;
        this._base = baseUri.fsPath;
    }
    constructor(base, pattern) {
        if (typeof base !== 'string') {
            if (!base || (!URI.isUri(base) && !URI.isUri(base.uri))) {
                throw illegalArgument('base');
            }
        }
        if (typeof pattern !== 'string') {
            throw illegalArgument('pattern');
        }
        if (typeof base === 'string') {
            this.baseUri = URI.file(base);
        }
        else if (URI.isUri(base)) {
            this.baseUri = base;
        }
        else {
            this.baseUri = base.uri;
        }
        this.pattern = pattern;
    }
    toJSON() {
        return {
            pattern: this.pattern,
            base: this.base,
            baseUri: this.baseUri.toJSON(),
        };
    }
};
RelativePattern = __decorate([
    es5ClassCompat
], RelativePattern);
export { RelativePattern };
const breakpointIds = new WeakMap();
/**
 * We want to be able to construct Breakpoints internally that have a particular id, but we don't want extensions to be
 * able to do this with the exposed Breakpoint classes in extension API.
 * We also want "instanceof" to work with debug.breakpoints and the exposed breakpoint classes.
 * And private members will be renamed in the built js, so casting to any and setting a private member is not safe.
 * So, we store internal breakpoint IDs in a WeakMap. This function must be called after constructing a Breakpoint
 * with a known id.
 */
export function setBreakpointId(bp, id) {
    breakpointIds.set(bp, id);
}
let Breakpoint = class Breakpoint {
    constructor(enabled, condition, hitCondition, logMessage, mode) {
        this.enabled = typeof enabled === 'boolean' ? enabled : true;
        if (typeof condition === 'string') {
            this.condition = condition;
        }
        if (typeof hitCondition === 'string') {
            this.hitCondition = hitCondition;
        }
        if (typeof logMessage === 'string') {
            this.logMessage = logMessage;
        }
        if (typeof mode === 'string') {
            this.mode = mode;
        }
    }
    get id() {
        if (!this._id) {
            this._id = breakpointIds.get(this) ?? generateUuid();
        }
        return this._id;
    }
};
Breakpoint = __decorate([
    es5ClassCompat
], Breakpoint);
export { Breakpoint };
let SourceBreakpoint = class SourceBreakpoint extends Breakpoint {
    constructor(location, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (location === null) {
            throw illegalArgument('location');
        }
        this.location = location;
    }
};
SourceBreakpoint = __decorate([
    es5ClassCompat
], SourceBreakpoint);
export { SourceBreakpoint };
let FunctionBreakpoint = class FunctionBreakpoint extends Breakpoint {
    constructor(functionName, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        this.functionName = functionName;
    }
};
FunctionBreakpoint = __decorate([
    es5ClassCompat
], FunctionBreakpoint);
export { FunctionBreakpoint };
let DataBreakpoint = class DataBreakpoint extends Breakpoint {
    constructor(label, dataId, canPersist, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (!dataId) {
            throw illegalArgument('dataId');
        }
        this.label = label;
        this.dataId = dataId;
        this.canPersist = canPersist;
    }
};
DataBreakpoint = __decorate([
    es5ClassCompat
], DataBreakpoint);
export { DataBreakpoint };
let DebugAdapterExecutable = class DebugAdapterExecutable {
    constructor(command, args, options) {
        this.command = command;
        this.args = args || [];
        this.options = options;
    }
};
DebugAdapterExecutable = __decorate([
    es5ClassCompat
], DebugAdapterExecutable);
export { DebugAdapterExecutable };
let DebugAdapterServer = class DebugAdapterServer {
    constructor(port, host) {
        this.port = port;
        this.host = host;
    }
};
DebugAdapterServer = __decorate([
    es5ClassCompat
], DebugAdapterServer);
export { DebugAdapterServer };
let DebugAdapterNamedPipeServer = class DebugAdapterNamedPipeServer {
    constructor(path) {
        this.path = path;
    }
};
DebugAdapterNamedPipeServer = __decorate([
    es5ClassCompat
], DebugAdapterNamedPipeServer);
export { DebugAdapterNamedPipeServer };
let DebugAdapterInlineImplementation = class DebugAdapterInlineImplementation {
    constructor(impl) {
        this.implementation = impl;
    }
};
DebugAdapterInlineImplementation = __decorate([
    es5ClassCompat
], DebugAdapterInlineImplementation);
export { DebugAdapterInlineImplementation };
export class DebugStackFrame {
    constructor(session, threadId, frameId) {
        this.session = session;
        this.threadId = threadId;
        this.frameId = frameId;
    }
}
export class DebugThread {
    constructor(session, threadId) {
        this.session = session;
        this.threadId = threadId;
    }
}
let EvaluatableExpression = class EvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
EvaluatableExpression = __decorate([
    es5ClassCompat
], EvaluatableExpression);
export { EvaluatableExpression };
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Invoke"] = 0] = "Invoke";
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
let InlineValueText = class InlineValueText {
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
};
InlineValueText = __decorate([
    es5ClassCompat
], InlineValueText);
export { InlineValueText };
let InlineValueVariableLookup = class InlineValueVariableLookup {
    constructor(range, variableName, caseSensitiveLookup = true) {
        this.range = range;
        this.variableName = variableName;
        this.caseSensitiveLookup = caseSensitiveLookup;
    }
};
InlineValueVariableLookup = __decorate([
    es5ClassCompat
], InlineValueVariableLookup);
export { InlineValueVariableLookup };
let InlineValueEvaluatableExpression = class InlineValueEvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
InlineValueEvaluatableExpression = __decorate([
    es5ClassCompat
], InlineValueEvaluatableExpression);
export { InlineValueEvaluatableExpression };
let InlineValueContext = class InlineValueContext {
    constructor(frameId, range) {
        this.frameId = frameId;
        this.stoppedLocation = range;
    }
};
InlineValueContext = __decorate([
    es5ClassCompat
], InlineValueContext);
export { InlineValueContext };
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
export class NewSymbolName {
    constructor(newSymbolName, tags) {
        this.newSymbolName = newSymbolName;
        this.tags = tags;
    }
}
//#region file api
export var FileChangeType;
(function (FileChangeType) {
    FileChangeType[FileChangeType["Changed"] = 1] = "Changed";
    FileChangeType[FileChangeType["Created"] = 2] = "Created";
    FileChangeType[FileChangeType["Deleted"] = 3] = "Deleted";
})(FileChangeType || (FileChangeType = {}));
let FileSystemError = FileSystemError_1 = class FileSystemError extends Error {
    static FileExists(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileExists, FileSystemError_1.FileExists);
    }
    static FileNotFound(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotFound, FileSystemError_1.FileNotFound);
    }
    static FileNotADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotADirectory, FileSystemError_1.FileNotADirectory);
    }
    static FileIsADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileIsADirectory, FileSystemError_1.FileIsADirectory);
    }
    static NoPermissions(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.NoPermissions, FileSystemError_1.NoPermissions);
    }
    static Unavailable(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.Unavailable, FileSystemError_1.Unavailable);
    }
    constructor(uriOrMessage, code = FileSystemProviderErrorCode.Unknown, terminator) {
        super(URI.isUri(uriOrMessage) ? uriOrMessage.toString(true) : uriOrMessage);
        this.code = terminator?.name ?? 'Unknown';
        // mark the error as file system provider error so that
        // we can extract the error code on the receiving side
        markAsFileSystemProviderError(this, code);
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, FileSystemError_1.prototype);
        if (typeof Error.captureStackTrace === 'function' && typeof terminator === 'function') {
            // nice stack traces
            Error.captureStackTrace(this, terminator);
        }
    }
};
FileSystemError = FileSystemError_1 = __decorate([
    es5ClassCompat
], FileSystemError);
export { FileSystemError };
//#endregion
//#region folding api
let FoldingRange = class FoldingRange {
    constructor(start, end, kind) {
        this.start = start;
        this.end = end;
        this.kind = kind;
    }
};
FoldingRange = __decorate([
    es5ClassCompat
], FoldingRange);
export { FoldingRange };
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    FoldingRangeKind[FoldingRangeKind["Comment"] = 1] = "Comment";
    FoldingRangeKind[FoldingRangeKind["Imports"] = 2] = "Imports";
    FoldingRangeKind[FoldingRangeKind["Region"] = 3] = "Region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
//#endregion
//#region Comment
export var CommentThreadCollapsibleState;
(function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
export var CommentMode;
(function (CommentMode) {
    CommentMode[CommentMode["Editing"] = 0] = "Editing";
    CommentMode[CommentMode["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
export var CommentState;
(function (CommentState) {
    CommentState[CommentState["Published"] = 0] = "Published";
    CommentState[CommentState["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
export var CommentThreadState;
(function (CommentThreadState) {
    CommentThreadState[CommentThreadState["Unresolved"] = 0] = "Unresolved";
    CommentThreadState[CommentThreadState["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
export var CommentThreadApplicability;
(function (CommentThreadApplicability) {
    CommentThreadApplicability[CommentThreadApplicability["Current"] = 0] = "Current";
    CommentThreadApplicability[CommentThreadApplicability["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
export var CommentThreadFocus;
(function (CommentThreadFocus) {
    CommentThreadFocus[CommentThreadFocus["Reply"] = 1] = "Reply";
    CommentThreadFocus[CommentThreadFocus["Comment"] = 2] = "Comment";
})(CommentThreadFocus || (CommentThreadFocus = {}));
//#endregion
//#region Semantic Coloring
export class SemanticTokensLegend {
    constructor(tokenTypes, tokenModifiers = []) {
        this.tokenTypes = tokenTypes;
        this.tokenModifiers = tokenModifiers;
    }
}
function isStrArrayOrUndefined(arg) {
    return typeof arg === 'undefined' || isStringArray(arg);
}
export class SemanticTokensBuilder {
    constructor(legend) {
        this._prevLine = 0;
        this._prevChar = 0;
        this._dataIsSortedAndDeltaEncoded = true;
        this._data = [];
        this._dataLen = 0;
        this._tokenTypeStrToInt = new Map();
        this._tokenModifierStrToInt = new Map();
        this._hasLegend = false;
        if (legend) {
            this._hasLegend = true;
            for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
                this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
            }
            for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
                this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
            }
        }
    }
    push(arg0, arg1, arg2, arg3, arg4) {
        if (typeof arg0 === 'number' &&
            typeof arg1 === 'number' &&
            typeof arg2 === 'number' &&
            typeof arg3 === 'number' &&
            (typeof arg4 === 'number' || typeof arg4 === 'undefined')) {
            if (typeof arg4 === 'undefined') {
                arg4 = 0;
            }
            // 1st overload
            return this._pushEncoded(arg0, arg1, arg2, arg3, arg4);
        }
        if (Range.isRange(arg0) && typeof arg1 === 'string' && isStrArrayOrUndefined(arg2)) {
            // 2nd overload
            return this._push(arg0, arg1, arg2);
        }
        throw illegalArgument();
    }
    _push(range, tokenType, tokenModifiers) {
        if (!this._hasLegend) {
            throw new Error('Legend must be provided in constructor');
        }
        if (range.start.line !== range.end.line) {
            throw new Error('`range` cannot span multiple lines');
        }
        if (!this._tokenTypeStrToInt.has(tokenType)) {
            throw new Error('`tokenType` is not in the provided legend');
        }
        const line = range.start.line;
        const char = range.start.character;
        const length = range.end.character - range.start.character;
        const nTokenType = this._tokenTypeStrToInt.get(tokenType);
        let nTokenModifiers = 0;
        if (tokenModifiers) {
            for (const tokenModifier of tokenModifiers) {
                if (!this._tokenModifierStrToInt.has(tokenModifier)) {
                    throw new Error('`tokenModifier` is not in the provided legend');
                }
                const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier);
                nTokenModifiers |= (1 << nTokenModifier) >>> 0;
            }
        }
        this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
    }
    _pushEncoded(line, char, length, tokenType, tokenModifiers) {
        if (this._dataIsSortedAndDeltaEncoded &&
            (line < this._prevLine || (line === this._prevLine && char < this._prevChar))) {
            // push calls were ordered and are no longer ordered
            this._dataIsSortedAndDeltaEncoded = false;
            // Remove delta encoding from data
            const tokenCount = (this._data.length / 5) | 0;
            let prevLine = 0;
            let prevChar = 0;
            for (let i = 0; i < tokenCount; i++) {
                let line = this._data[5 * i];
                let char = this._data[5 * i + 1];
                if (line === 0) {
                    // on the same line as previous token
                    line = prevLine;
                    char += prevChar;
                }
                else {
                    // on a different line than previous token
                    line += prevLine;
                }
                this._data[5 * i] = line;
                this._data[5 * i + 1] = char;
                prevLine = line;
                prevChar = char;
            }
        }
        let pushLine = line;
        let pushChar = char;
        if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
            pushLine -= this._prevLine;
            if (pushLine === 0) {
                pushChar -= this._prevChar;
            }
        }
        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;
        this._prevLine = line;
        this._prevChar = char;
    }
    static _sortAndDeltaEncode(data) {
        const pos = [];
        const tokenCount = (data.length / 5) | 0;
        for (let i = 0; i < tokenCount; i++) {
            pos[i] = i;
        }
        pos.sort((a, b) => {
            const aLine = data[5 * a];
            const bLine = data[5 * b];
            if (aLine === bLine) {
                const aChar = data[5 * a + 1];
                const bChar = data[5 * b + 1];
                return aChar - bChar;
            }
            return aLine - bLine;
        });
        const result = new Uint32Array(data.length);
        let prevLine = 0;
        let prevChar = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 5 * pos[i];
            const line = data[srcOffset + 0];
            const char = data[srcOffset + 1];
            const length = data[srcOffset + 2];
            const tokenType = data[srcOffset + 3];
            const tokenModifiers = data[srcOffset + 4];
            const pushLine = line - prevLine;
            const pushChar = pushLine === 0 ? char - prevChar : char;
            const dstOffset = 5 * i;
            result[dstOffset + 0] = pushLine;
            result[dstOffset + 1] = pushChar;
            result[dstOffset + 2] = length;
            result[dstOffset + 3] = tokenType;
            result[dstOffset + 4] = tokenModifiers;
            prevLine = line;
            prevChar = char;
        }
        return result;
    }
    build(resultId) {
        if (!this._dataIsSortedAndDeltaEncoded) {
            return new SemanticTokens(SemanticTokensBuilder._sortAndDeltaEncode(this._data), resultId);
        }
        return new SemanticTokens(new Uint32Array(this._data), resultId);
    }
}
export class SemanticTokens {
    constructor(data, resultId) {
        this.resultId = resultId;
        this.data = data;
    }
}
export class SemanticTokensEdit {
    constructor(start, deleteCount, data) {
        this.start = start;
        this.deleteCount = deleteCount;
        this.data = data;
    }
}
export class SemanticTokensEdits {
    constructor(edits, resultId) {
        this.resultId = resultId;
        this.edits = edits;
    }
}
//#endregion
//#region debug
export var DebugConsoleMode;
(function (DebugConsoleMode) {
    /**
     * Debug session should have a separate debug console.
     */
    DebugConsoleMode[DebugConsoleMode["Separate"] = 0] = "Separate";
    /**
     * Debug session should share debug console with its parent session.
     * This value has no effect for sessions which do not have a parent session.
     */
    DebugConsoleMode[DebugConsoleMode["MergeWithParent"] = 1] = "MergeWithParent";
})(DebugConsoleMode || (DebugConsoleMode = {}));
export class DebugVisualization {
    constructor(name) {
        this.name = name;
    }
}
//#endregion
export var QuickInputButtonLocation;
(function (QuickInputButtonLocation) {
    QuickInputButtonLocation[QuickInputButtonLocation["Title"] = 1] = "Title";
    QuickInputButtonLocation[QuickInputButtonLocation["Inline"] = 2] = "Inline";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
let QuickInputButtons = class QuickInputButtons {
    static { this.Back = { iconPath: new ThemeIcon('arrow-left') }; }
    constructor() { }
};
QuickInputButtons = __decorate([
    es5ClassCompat
], QuickInputButtons);
export { QuickInputButtons };
export var QuickPickItemKind;
(function (QuickPickItemKind) {
    QuickPickItemKind[QuickPickItemKind["Separator"] = -1] = "Separator";
    QuickPickItemKind[QuickPickItemKind["Default"] = 0] = "Default";
})(QuickPickItemKind || (QuickPickItemKind = {}));
export var InputBoxValidationSeverity;
(function (InputBoxValidationSeverity) {
    InputBoxValidationSeverity[InputBoxValidationSeverity["Info"] = 1] = "Info";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Warning"] = 2] = "Warning";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Error"] = 3] = "Error";
})(InputBoxValidationSeverity || (InputBoxValidationSeverity = {}));
export var ExtensionKind;
(function (ExtensionKind) {
    ExtensionKind[ExtensionKind["UI"] = 1] = "UI";
    ExtensionKind[ExtensionKind["Workspace"] = 2] = "Workspace";
})(ExtensionKind || (ExtensionKind = {}));
export class FileDecoration {
    static validate(d) {
        if (typeof d.badge === 'string') {
            let len = nextCharLength(d.badge, 0);
            if (len < d.badge.length) {
                len += nextCharLength(d.badge, len);
            }
            if (d.badge.length > len) {
                throw new Error(`The 'badge'-property must be undefined or a short character`);
            }
        }
        else if (d.badge) {
            if (!ThemeIcon.isThemeIcon(d.badge)) {
                throw new Error(`The 'badge'-property is not a valid ThemeIcon`);
            }
        }
        if (!d.color && !d.badge && !d.tooltip) {
            throw new Error(`The decoration is empty`);
        }
        return true;
    }
    constructor(badge, tooltip, color) {
        this.badge = badge;
        this.tooltip = tooltip;
        this.color = color;
    }
}
//#region Theming
let ColorTheme = class ColorTheme {
    constructor(kind) {
        this.kind = kind;
    }
};
ColorTheme = __decorate([
    es5ClassCompat
], ColorTheme);
export { ColorTheme };
export var ColorThemeKind;
(function (ColorThemeKind) {
    ColorThemeKind[ColorThemeKind["Light"] = 1] = "Light";
    ColorThemeKind[ColorThemeKind["Dark"] = 2] = "Dark";
    ColorThemeKind[ColorThemeKind["HighContrast"] = 3] = "HighContrast";
    ColorThemeKind[ColorThemeKind["HighContrastLight"] = 4] = "HighContrastLight";
})(ColorThemeKind || (ColorThemeKind = {}));
//#endregion Theming
//#region Notebook
export class NotebookRange {
    static isNotebookRange(thing) {
        if (thing instanceof NotebookRange) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return (typeof thing.start === 'number' &&
            typeof thing.end === 'number');
    }
    get start() {
        return this._start;
    }
    get end() {
        return this._end;
    }
    get isEmpty() {
        return this._start === this._end;
    }
    constructor(start, end) {
        if (start < 0) {
            throw illegalArgument('start must be positive');
        }
        if (end < 0) {
            throw illegalArgument('end must be positive');
        }
        if (start <= end) {
            this._start = start;
            this._end = end;
        }
        else {
            this._start = end;
            this._end = start;
        }
    }
    with(change) {
        let start = this._start;
        let end = this._end;
        if (change.start !== undefined) {
            start = change.start;
        }
        if (change.end !== undefined) {
            end = change.end;
        }
        if (start === this._start && end === this._end) {
            return this;
        }
        return new NotebookRange(start, end);
    }
}
export class NotebookCellData {
    static validate(data) {
        if (typeof data.kind !== 'number') {
            throw new Error("NotebookCellData MUST have 'kind' property");
        }
        if (typeof data.value !== 'string') {
            throw new Error("NotebookCellData MUST have 'value' property");
        }
        if (typeof data.languageId !== 'string') {
            throw new Error("NotebookCellData MUST have 'languageId' property");
        }
    }
    static isNotebookCellDataArray(value) {
        return (Array.isArray(value) &&
            value.every((elem) => NotebookCellData.isNotebookCellData(elem)));
    }
    static isNotebookCellData(value) {
        // return value instanceof NotebookCellData;
        return true;
    }
    constructor(kind, value, languageId, mime, outputs, metadata, executionSummary) {
        this.kind = kind;
        this.value = value;
        this.languageId = languageId;
        this.mime = mime;
        this.outputs = outputs ?? [];
        this.metadata = metadata;
        this.executionSummary = executionSummary;
        NotebookCellData.validate(this);
    }
}
export class NotebookData {
    constructor(cells) {
        this.cells = cells;
    }
}
export class NotebookCellOutputItem {
    static isNotebookCellOutputItem(obj) {
        if (obj instanceof NotebookCellOutputItem) {
            return true;
        }
        if (!obj) {
            return false;
        }
        return (typeof obj.mime === 'string' &&
            obj.data instanceof Uint8Array);
    }
    static error(err) {
        const obj = {
            name: err.name,
            message: err.message,
            stack: err.stack,
        };
        return NotebookCellOutputItem.json(obj, 'application/vnd.code.notebook.error');
    }
    static stdout(value) {
        return NotebookCellOutputItem.text(value, 'application/vnd.code.notebook.stdout');
    }
    static stderr(value) {
        return NotebookCellOutputItem.text(value, 'application/vnd.code.notebook.stderr');
    }
    static bytes(value, mime = 'application/octet-stream') {
        return new NotebookCellOutputItem(value, mime);
    }
    static #encoder = new TextEncoder();
    static text(value, mime = Mimes.text) {
        const bytes = NotebookCellOutputItem.#encoder.encode(String(value));
        return new NotebookCellOutputItem(bytes, mime);
    }
    static json(value, mime = 'text/x-json') {
        const rawStr = JSON.stringify(value, undefined, '\t');
        return NotebookCellOutputItem.text(rawStr, mime);
    }
    constructor(data, mime) {
        this.data = data;
        this.mime = mime;
        const mimeNormalized = normalizeMimeType(mime, true);
        if (!mimeNormalized) {
            throw new Error(`INVALID mime type: ${mime}. Must be in the format "type/subtype[;optionalparameter]"`);
        }
        this.mime = mimeNormalized;
    }
}
export class NotebookCellOutput {
    static isNotebookCellOutput(candidate) {
        if (candidate instanceof NotebookCellOutput) {
            return true;
        }
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        return (typeof candidate.id === 'string' &&
            Array.isArray(candidate.items));
    }
    static ensureUniqueMimeTypes(items, warn = false) {
        const seen = new Set();
        const removeIdx = new Set();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const normalMime = normalizeMimeType(item.mime);
            // We can have multiple text stream mime types in the same output.
            if (!seen.has(normalMime) || isTextStreamMime(normalMime)) {
                seen.add(normalMime);
                continue;
            }
            // duplicated mime types... first has won
            removeIdx.add(i);
            if (warn) {
                console.warn(`DUPLICATED mime type '${item.mime}' will be dropped`);
            }
        }
        if (removeIdx.size === 0) {
            return items;
        }
        return items.filter((_item, index) => !removeIdx.has(index));
    }
    constructor(items, idOrMetadata, metadata) {
        this.items = NotebookCellOutput.ensureUniqueMimeTypes(items, true);
        if (typeof idOrMetadata === 'string') {
            this.id = idOrMetadata;
            this.metadata = metadata;
        }
        else {
            this.id = generateUuid();
            this.metadata = idOrMetadata ?? metadata;
        }
    }
}
export class CellErrorStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
export var NotebookCellKind;
(function (NotebookCellKind) {
    NotebookCellKind[NotebookCellKind["Markup"] = 1] = "Markup";
    NotebookCellKind[NotebookCellKind["Code"] = 2] = "Code";
})(NotebookCellKind || (NotebookCellKind = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Idle"] = 1] = "Idle";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookCellStatusBarAlignment;
(function (NotebookCellStatusBarAlignment) {
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Left"] = 1] = "Left";
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Right"] = 2] = "Right";
})(NotebookCellStatusBarAlignment || (NotebookCellStatusBarAlignment = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export class NotebookCellStatusBarItem {
    constructor(text, alignment) {
        this.text = text;
        this.alignment = alignment;
    }
}
export var NotebookControllerAffinity;
(function (NotebookControllerAffinity) {
    NotebookControllerAffinity[NotebookControllerAffinity["Default"] = 1] = "Default";
    NotebookControllerAffinity[NotebookControllerAffinity["Preferred"] = 2] = "Preferred";
})(NotebookControllerAffinity || (NotebookControllerAffinity = {}));
export var NotebookControllerAffinity2;
(function (NotebookControllerAffinity2) {
    NotebookControllerAffinity2[NotebookControllerAffinity2["Default"] = 1] = "Default";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Preferred"] = 2] = "Preferred";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Hidden"] = -1] = "Hidden";
})(NotebookControllerAffinity2 || (NotebookControllerAffinity2 = {}));
export class NotebookRendererScript {
    constructor(uri, provides = []) {
        this.uri = uri;
        this.provides = asArray(provides);
    }
}
export class NotebookKernelSourceAction {
    constructor(label) {
        this.label = label;
    }
}
export var NotebookVariablesRequestKind;
(function (NotebookVariablesRequestKind) {
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Named"] = 1] = "Named";
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Indexed"] = 2] = "Indexed";
})(NotebookVariablesRequestKind || (NotebookVariablesRequestKind = {}));
//#endregion
//#region Timeline
let TimelineItem = class TimelineItem {
    constructor(label, timestamp) {
        this.label = label;
        this.timestamp = timestamp;
    }
};
TimelineItem = __decorate([
    es5ClassCompat
], TimelineItem);
export { TimelineItem };
//#endregion Timeline
//#region ExtensionContext
export var ExtensionMode;
(function (ExtensionMode) {
    /**
     * The extension is installed normally (for example, from the marketplace
     * or VSIX) in VS Code.
     */
    ExtensionMode[ExtensionMode["Production"] = 1] = "Production";
    /**
     * The extension is running from an `--extensionDevelopmentPath` provided
     * when launching VS Code.
     */
    ExtensionMode[ExtensionMode["Development"] = 2] = "Development";
    /**
     * The extension is running from an `--extensionDevelopmentPath` and
     * the extension host is running unit tests.
     */
    ExtensionMode[ExtensionMode["Test"] = 3] = "Test";
})(ExtensionMode || (ExtensionMode = {}));
export var ExtensionRuntime;
(function (ExtensionRuntime) {
    /**
     * The extension is running in a NodeJS extension host. Runtime access to NodeJS APIs is available.
     */
    ExtensionRuntime[ExtensionRuntime["Node"] = 1] = "Node";
    /**
     * The extension is running in a Webworker extension host. Runtime access is limited to Webworker APIs.
     */
    ExtensionRuntime[ExtensionRuntime["Webworker"] = 2] = "Webworker";
})(ExtensionRuntime || (ExtensionRuntime = {}));
//#endregion ExtensionContext
export var StandardTokenType;
(function (StandardTokenType) {
    StandardTokenType[StandardTokenType["Other"] = 0] = "Other";
    StandardTokenType[StandardTokenType["Comment"] = 1] = "Comment";
    StandardTokenType[StandardTokenType["String"] = 2] = "String";
    StandardTokenType[StandardTokenType["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
export class LinkedEditingRanges {
    constructor(ranges, wordPattern) {
        this.ranges = ranges;
        this.wordPattern = wordPattern;
    }
}
//#region ports
export class PortAttributes {
    constructor(autoForwardAction) {
        this._autoForwardAction = autoForwardAction;
    }
    get autoForwardAction() {
        return this._autoForwardAction;
    }
}
//#endregion ports
//#region Testing
export var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["Queued"] = 1] = "Queued";
    TestResultState[TestResultState["Running"] = 2] = "Running";
    TestResultState[TestResultState["Passed"] = 3] = "Passed";
    TestResultState[TestResultState["Failed"] = 4] = "Failed";
    TestResultState[TestResultState["Skipped"] = 5] = "Skipped";
    TestResultState[TestResultState["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    TestRunProfileKind[TestRunProfileKind["Run"] = 1] = "Run";
    TestRunProfileKind[TestRunProfileKind["Debug"] = 2] = "Debug";
    TestRunProfileKind[TestRunProfileKind["Coverage"] = 3] = "Coverage";
})(TestRunProfileKind || (TestRunProfileKind = {}));
export class TestRunProfileBase {
    constructor(controllerId, profileId, kind) {
        this.controllerId = controllerId;
        this.profileId = profileId;
        this.kind = kind;
    }
}
let TestRunRequest = class TestRunRequest {
    constructor(include = undefined, exclude = undefined, profile = undefined, continuous = false, preserveFocus = true) {
        this.include = include;
        this.exclude = exclude;
        this.profile = profile;
        this.continuous = continuous;
        this.preserveFocus = preserveFocus;
    }
};
TestRunRequest = __decorate([
    es5ClassCompat
], TestRunRequest);
export { TestRunRequest };
let TestMessage = TestMessage_1 = class TestMessage {
    static diff(message, expected, actual) {
        const msg = new TestMessage_1(message);
        msg.expectedOutput = expected;
        msg.actualOutput = actual;
        return msg;
    }
    constructor(message) {
        this.message = message;
    }
};
TestMessage = TestMessage_1 = __decorate([
    es5ClassCompat
], TestMessage);
export { TestMessage };
let TestTag = class TestTag {
    constructor(id) {
        this.id = id;
    }
};
TestTag = __decorate([
    es5ClassCompat
], TestTag);
export { TestTag };
export class TestMessageStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
//#endregion
//#region Test Coverage
export class TestCoverageCount {
    constructor(covered, total) {
        this.covered = covered;
        this.total = total;
        validateTestCoverageCount(this);
    }
}
export function validateTestCoverageCount(cc) {
    if (!cc) {
        return;
    }
    if (cc.covered > cc.total) {
        throw new Error(`The total number of covered items (${cc.covered}) cannot be greater than the total (${cc.total})`);
    }
    if (cc.total < 0) {
        throw new Error(`The number of covered items (${cc.total}) cannot be negative`);
    }
}
export class FileCoverage {
    static fromDetails(uri, details) {
        const statements = new TestCoverageCount(0, 0);
        const branches = new TestCoverageCount(0, 0);
        const decl = new TestCoverageCount(0, 0);
        for (const detail of details) {
            if ('branches' in detail) {
                statements.total += 1;
                statements.covered += detail.executed ? 1 : 0;
                for (const branch of detail.branches) {
                    branches.total += 1;
                    branches.covered += branch.executed ? 1 : 0;
                }
            }
            else {
                decl.total += 1;
                decl.covered += detail.executed ? 1 : 0;
            }
        }
        const coverage = new FileCoverage(uri, statements, branches.total > 0 ? branches : undefined, decl.total > 0 ? decl : undefined);
        coverage.detailedCoverage = details;
        return coverage;
    }
    constructor(uri, statementCoverage, branchCoverage, declarationCoverage, includesTests = []) {
        this.uri = uri;
        this.statementCoverage = statementCoverage;
        this.branchCoverage = branchCoverage;
        this.declarationCoverage = declarationCoverage;
        this.includesTests = includesTests;
    }
}
export class StatementCoverage {
    // back compat until finalization:
    get executionCount() {
        return +this.executed;
    }
    set executionCount(n) {
        this.executed = n;
    }
    constructor(executed, location, branches = []) {
        this.executed = executed;
        this.location = location;
        this.branches = branches;
    }
}
export class BranchCoverage {
    // back compat until finalization:
    get executionCount() {
        return +this.executed;
    }
    set executionCount(n) {
        this.executed = n;
    }
    constructor(executed, location, label) {
        this.executed = executed;
        this.location = location;
        this.label = label;
    }
}
export class DeclarationCoverage {
    // back compat until finalization:
    get executionCount() {
        return +this.executed;
    }
    set executionCount(n) {
        this.executed = n;
    }
    constructor(name, executed, location) {
        this.name = name;
        this.executed = executed;
        this.location = location;
    }
}
//#endregion
export var ExternalUriOpenerPriority;
(function (ExternalUriOpenerPriority) {
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["None"] = 0] = "None";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Option"] = 1] = "Option";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Default"] = 2] = "Default";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
export var WorkspaceTrustState;
(function (WorkspaceTrustState) {
    WorkspaceTrustState[WorkspaceTrustState["Untrusted"] = 0] = "Untrusted";
    WorkspaceTrustState[WorkspaceTrustState["Trusted"] = 1] = "Trusted";
    WorkspaceTrustState[WorkspaceTrustState["Unspecified"] = 2] = "Unspecified";
})(WorkspaceTrustState || (WorkspaceTrustState = {}));
export var PortAutoForwardAction;
(function (PortAutoForwardAction) {
    PortAutoForwardAction[PortAutoForwardAction["Notify"] = 1] = "Notify";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowser"] = 2] = "OpenBrowser";
    PortAutoForwardAction[PortAutoForwardAction["OpenPreview"] = 3] = "OpenPreview";
    PortAutoForwardAction[PortAutoForwardAction["Silent"] = 4] = "Silent";
    PortAutoForwardAction[PortAutoForwardAction["Ignore"] = 5] = "Ignore";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(PortAutoForwardAction || (PortAutoForwardAction = {}));
export class TypeHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
//#region Tab Inputs
export class TextTabInput {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TextDiffTabInput {
    constructor(original, modified) {
        this.original = original;
        this.modified = modified;
    }
}
export class TextMergeTabInput {
    constructor(base, input1, input2, result) {
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
    }
}
export class CustomEditorTabInput {
    constructor(uri, viewType) {
        this.uri = uri;
        this.viewType = viewType;
    }
}
export class WebviewEditorTabInput {
    constructor(viewType) {
        this.viewType = viewType;
    }
}
export class NotebookEditorTabInput {
    constructor(uri, notebookType) {
        this.uri = uri;
        this.notebookType = notebookType;
    }
}
export class NotebookDiffEditorTabInput {
    constructor(original, modified, notebookType) {
        this.original = original;
        this.modified = modified;
        this.notebookType = notebookType;
    }
}
export class TerminalEditorTabInput {
    constructor() { }
}
export class InteractiveWindowInput {
    constructor(uri, inputBoxUri) {
        this.uri = uri;
        this.inputBoxUri = inputBoxUri;
    }
}
export class ChatEditorTabInput {
    constructor() { }
}
export class TextMultiDiffTabInput {
    constructor(textDiffs) {
        this.textDiffs = textDiffs;
    }
}
//#endregion
//#region Chat
export var InteractiveSessionVoteDirection;
(function (InteractiveSessionVoteDirection) {
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Down"] = 0] = "Down";
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Up"] = 1] = "Up";
})(InteractiveSessionVoteDirection || (InteractiveSessionVoteDirection = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export var ChatVariableLevel;
(function (ChatVariableLevel) {
    ChatVariableLevel[ChatVariableLevel["Short"] = 1] = "Short";
    ChatVariableLevel[ChatVariableLevel["Medium"] = 2] = "Medium";
    ChatVariableLevel[ChatVariableLevel["Full"] = 3] = "Full";
})(ChatVariableLevel || (ChatVariableLevel = {}));
export class ChatCompletionItem {
    constructor(id, label, values) {
        this.id = id;
        this.label = label;
        this.values = values;
    }
}
export var ChatEditingSessionActionOutcome;
(function (ChatEditingSessionActionOutcome) {
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Accepted"] = 1] = "Accepted";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Rejected"] = 2] = "Rejected";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Saved"] = 3] = "Saved";
})(ChatEditingSessionActionOutcome || (ChatEditingSessionActionOutcome = {}));
//#endregion
//#region Interactive Editor
export var InteractiveEditorResponseFeedbackKind;
(function (InteractiveEditorResponseFeedbackKind) {
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Helpful"] = 1] = "Helpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Undone"] = 2] = "Undone";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Accepted"] = 3] = "Accepted";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Bug"] = 4] = "Bug";
})(InteractiveEditorResponseFeedbackKind || (InteractiveEditorResponseFeedbackKind = {}));
export var ChatResultFeedbackKind;
(function (ChatResultFeedbackKind) {
    ChatResultFeedbackKind[ChatResultFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    ChatResultFeedbackKind[ChatResultFeedbackKind["Helpful"] = 1] = "Helpful";
})(ChatResultFeedbackKind || (ChatResultFeedbackKind = {}));
export class ChatResponseMarkdownPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
/**
 * TODO if 'vulnerabilities' is finalized, this should be merged with the base ChatResponseMarkdownPart. I just don't see how to do that while keeping
 * vulnerabilities in a seperate API proposal in a clean way.
 */
export class ChatResponseMarkdownWithVulnerabilitiesPart {
    constructor(value, vulnerabilities) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
        this.vulnerabilities = vulnerabilities;
    }
}
export class ChatResponseConfirmationPart {
    constructor(title, message, data, buttons) {
        this.title = title;
        this.message = message;
        this.data = data;
        this.buttons = buttons;
    }
}
export class ChatResponseFileTreePart {
    constructor(value, baseUri) {
        this.value = value;
        this.baseUri = baseUri;
    }
}
export class ChatResponseAnchorPart {
    constructor(value, title) {
        this.value = value;
        this.value2 = value;
        this.title = title;
    }
}
export class ChatResponseProgressPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseProgressPart2 {
    constructor(value, task) {
        this.value = value;
        this.task = task;
    }
}
export class ChatResponseWarningPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
export class ChatResponseCommandButtonPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseReferencePart {
    constructor(value, iconPath, options) {
        this.value = value;
        this.iconPath = iconPath;
        this.options = options;
    }
}
export class ChatResponseCodeblockUriPart {
    constructor(value, isEdit) {
        this.value = value;
        this.isEdit = isEdit;
    }
}
export class ChatResponseCodeCitationPart {
    constructor(value, license, snippet) {
        this.value = value;
        this.license = license;
        this.snippet = snippet;
    }
}
export class ChatResponseMovePart {
    constructor(uri, range) {
        this.uri = uri;
        this.range = range;
    }
}
export class ChatResponseTextEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatResponseNotebookEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatRequestTurn {
    constructor(prompt, command, references, participant, toolReferences) {
        this.prompt = prompt;
        this.command = command;
        this.references = references;
        this.participant = participant;
        this.toolReferences = toolReferences;
    }
}
export class ChatResponseTurn {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
export var ChatLocation;
(function (ChatLocation) {
    ChatLocation[ChatLocation["Panel"] = 1] = "Panel";
    ChatLocation[ChatLocation["Terminal"] = 2] = "Terminal";
    ChatLocation[ChatLocation["Notebook"] = 3] = "Notebook";
    ChatLocation[ChatLocation["Editor"] = 4] = "Editor";
    ChatLocation[ChatLocation["EditingSession"] = 5] = "EditingSession";
})(ChatLocation || (ChatLocation = {}));
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export class ChatRequestEditorData {
    constructor(document, selection, wholeRange) {
        this.document = document;
        this.selection = selection;
        this.wholeRange = wholeRange;
    }
}
export class ChatRequestNotebookData {
    constructor(cell) {
        this.cell = cell;
    }
}
export class ChatReferenceBinaryData {
    constructor(mimeType, data, reference) {
        this.mimeType = mimeType;
        this.data = data;
        this.reference = reference;
    }
}
export class ChatReferenceDiagnostic {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }
}
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["User"] = 1] = "User";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["Assistant"] = 2] = "Assistant";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["System"] = 3] = "System";
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export class LanguageModelToolResultPart {
    constructor(callId, content, isError) {
        this.callId = callId;
        this.content = content;
        this.isError = isError ?? false;
    }
}
export class PreparedTerminalToolInvocation {
    constructor(command, language, confirmationMessages) {
        this.command = command;
        this.language = language;
        this.confirmationMessages = confirmationMessages;
    }
}
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export class LanguageModelChatMessage {
    static User(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    // Temp to avoid breaking changes
    set content2(value) {
        if (value) {
            this.content = value.map((part) => {
                if (typeof part === 'string') {
                    return new LanguageModelTextPart(part);
                }
                return part;
            });
        }
    }
    get content2() {
        return this.content.map((part) => {
            if (part instanceof LanguageModelTextPart) {
                return part.value;
            }
            return part;
        });
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelChatMessage2 {
    static User(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    // Temp to avoid breaking changes
    set content2(value) {
        if (value) {
            this.content = value.map((part) => {
                if (typeof part === 'string') {
                    return new LanguageModelTextPart(part);
                }
                return part;
            });
        }
    }
    get content2() {
        return this.content.map((part) => {
            if (part instanceof LanguageModelTextPart) {
                return part.value;
            }
            return part;
        });
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelToolCallPart {
    constructor(callId, name, input) {
        this.callId = callId;
        this.name = name;
        this.input = input;
    }
}
export class LanguageModelTextPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 21 /* MarshalledId.LanguageModelTextPart */,
            value: this.value,
        };
    }
}
export class LanguageModelDataPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 23 /* MarshalledId.LanguageModelDataPart */,
            value: this.value,
        };
    }
}
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
export class LanguageModelPromptTsxPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 22 /* MarshalledId.LanguageModelPromptTsxPart */,
            value: this.value,
        };
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatSystemMessage {
    constructor(content) {
        this.content = content;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatUserMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatAssistantMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelError extends Error {
    static #name = 'LanguageModelError';
    static NotFound(message) {
        return new LanguageModelError(message, LanguageModelError.NotFound.name);
    }
    static NoPermissions(message) {
        return new LanguageModelError(message, LanguageModelError.NoPermissions.name);
    }
    static Blocked(message) {
        return new LanguageModelError(message, LanguageModelError.Blocked.name);
    }
    static tryDeserialize(data) {
        if (data.name !== LanguageModelError.#name) {
            return undefined;
        }
        return new LanguageModelError(data.message, data.code, data.cause);
    }
    constructor(message, code, cause) {
        super(message, { cause });
        this.name = LanguageModelError.#name;
        this.code = code ?? '';
    }
}
export class LanguageModelToolResult {
    constructor(content) {
        this.content = content;
    }
    toJSON() {
        return {
            $mid: 20 /* MarshalledId.LanguageModelToolResult */,
            content: this.content,
        };
    }
}
export class ExtendedLanguageModelToolResult extends LanguageModelToolResult {
}
export var LanguageModelChatToolMode;
(function (LanguageModelChatToolMode) {
    LanguageModelChatToolMode[LanguageModelChatToolMode["Auto"] = 1] = "Auto";
    LanguageModelChatToolMode[LanguageModelChatToolMode["Required"] = 2] = "Required";
})(LanguageModelChatToolMode || (LanguageModelChatToolMode = {}));
//#endregion
//#region ai
export var RelatedInformationType;
(function (RelatedInformationType) {
    RelatedInformationType[RelatedInformationType["SymbolInformation"] = 1] = "SymbolInformation";
    RelatedInformationType[RelatedInformationType["CommandInformation"] = 2] = "CommandInformation";
    RelatedInformationType[RelatedInformationType["SearchInformation"] = 3] = "SearchInformation";
    RelatedInformationType[RelatedInformationType["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
//#endregion
//#region Speech
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
//#endregion
//#region InlineEdit
export class InlineEdit {
    constructor(text, range) {
        this.text = text;
        this.range = range;
    }
}
export var InlineEditTriggerKind;
(function (InlineEditTriggerKind) {
    InlineEditTriggerKind[InlineEditTriggerKind["Invoke"] = 0] = "Invoke";
    InlineEditTriggerKind[InlineEditTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineEditTriggerKind || (InlineEditTriggerKind = {}));
//#endregion
//#region MC
export class McpStdioServerDefinition {
    constructor(label, command, args, env) {
        this.label = label;
        this.command = command;
        this.args = args;
        this.env = env;
    }
}
export class McpSSEServerDefinition {
    constructor(label, uri) {
        this.label = label;
        this.uri = uri;
        this.headers = [];
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sZ0NBQWdDLENBQUE7QUFFakYsT0FBTyxFQUNOLGNBQWMsSUFBSSxrQkFBa0IsR0FFcEMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFekQsT0FBTyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLDJCQUEyQixFQUMzQiw2QkFBNkIsR0FDN0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RyxPQUFPLEVBSU4sZ0JBQWdCLEdBQ2hCLE1BQU0saURBQWlELENBQUE7QUFHeEQ7Ozs7O0tBS0s7QUFDTCxTQUFTLGNBQWMsQ0FBQyxNQUFn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