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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVqRixPQUFPLEVBQUUsZUFBZSxFQUFtQixNQUFNLGdDQUFnQyxDQUFBO0FBRWpGLE9BQU8sRUFDTixjQUFjLElBQUksa0JBQWtCLEdBRXBDLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE9BQU8sRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsNkJBQTZCLEdBQzdCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0csT0FBTyxFQUlOLGdCQUFnQixHQUNoQixNQUFNLGlEQUFpRCxDQUFBO0FBR3hEOzs7OztLQUtLO0FBQ0wsU0FBUyxjQUFjLENBQUMsTUFBZ0I7SUFD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QU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDckMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUUxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFBO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUV4RCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxD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