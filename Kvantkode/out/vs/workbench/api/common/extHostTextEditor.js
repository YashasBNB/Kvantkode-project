/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from '../../../base/common/assert.js';
import { ReadonlyError, illegalArgument } from '../../../base/common/errors.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { EndOfLine, Position, Range, Selection, TextEditorRevealType, } from './extHostTypes.js';
export class TextEditorDecorationType {
    static { this._Keys = new IdGenerator('TextEditorDecorationType'); }
    constructor(proxy, extension, options) {
        const key = TextEditorDecorationType._Keys.nextId();
        proxy.$registerTextEditorDecorationType(extension.identifier, key, TypeConverters.DecorationRenderOptions.from(options));
        this.value = Object.freeze({
            key,
            dispose() {
                proxy.$removeTextEditorDecorationType(key);
            },
        });
    }
}
class TextEditorEdit {
    constructor(document, options) {
        this._collectedEdits = [];
        this._setEndOfLine = undefined;
        this._finalized = false;
        this._document = document;
        this._documentVersionId = document.version;
        this._undoStopBefore = options.undoStopBefore;
        this._undoStopAfter = options.undoStopAfter;
    }
    finalize() {
        this._finalized = true;
        return {
            documentVersionId: this._documentVersionId,
            edits: this._collectedEdits,
            setEndOfLine: this._setEndOfLine,
            undoStopBefore: this._undoStopBefore,
            undoStopAfter: this._undoStopAfter,
        };
    }
    _throwIfFinalized() {
        if (this._finalized) {
            throw new Error('Edit is only valid while callback runs');
        }
    }
    replace(location, value) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Position) {
            range = new Range(location, location);
        }
        else if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, value, false);
    }
    insert(location, value) {
        this._throwIfFinalized();
        this._pushEdit(new Range(location, location), value, true);
    }
    delete(location) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, null, true);
    }
    _pushEdit(range, text, forceMoveMarkers) {
        const validRange = this._document.validateRange(range);
        this._collectedEdits.push({
            range: validRange,
            text: text,
            forceMoveMarkers: forceMoveMarkers,
        });
    }
    setEndOfLine(endOfLine) {
        this._throwIfFinalized();
        if (endOfLine !== EndOfLine.LF && endOfLine !== EndOfLine.CRLF) {
            throw illegalArgument('endOfLine');
        }
        this._setEndOfLine = endOfLine;
    }
}
export class ExtHostTextEditorOptions {
    constructor(proxy, id, source, logService) {
        this._proxy = proxy;
        this._id = id;
        this._accept(source);
        this._logService = logService;
        const that = this;
        this.value = {
            get tabSize() {
                return that._tabSize;
            },
            set tabSize(value) {
                that._setTabSize(value);
            },
            get indentSize() {
                return that._indentSize;
            },
            set indentSize(value) {
                that._setIndentSize(value);
            },
            get insertSpaces() {
                return that._insertSpaces;
            },
            set insertSpaces(value) {
                that._setInsertSpaces(value);
            },
            get cursorStyle() {
                return that._cursorStyle;
            },
            set cursorStyle(value) {
                that._setCursorStyle(value);
            },
            get lineNumbers() {
                return that._lineNumbers;
            },
            set lineNumbers(value) {
                that._setLineNumbers(value);
            },
        };
    }
    _accept(source) {
        this._tabSize = source.tabSize;
        this._indentSize = source.indentSize;
        this._originalIndentSize = source.originalIndentSize;
        this._insertSpaces = source.insertSpaces;
        this._cursorStyle = source.cursorStyle;
        this._lineNumbers = TypeConverters.TextEditorLineNumbersStyle.to(source.lineNumbers);
    }
    // --- internal: tabSize
    _validateTabSize(value) {
        if (value === 'auto') {
            return 'auto';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return r > 0 ? r : null;
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return r > 0 ? r : null;
        }
        return null;
    }
    _setTabSize(value) {
        const tabSize = this._validateTabSize(value);
        if (tabSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof tabSize === 'number') {
            if (this._tabSize === tabSize) {
                // nothing to do
                return;
            }
            // reflect the new tabSize value immediately
            this._tabSize = tabSize;
        }
        this._warnOnError('setTabSize', this._proxy.$trySetOptions(this._id, {
            tabSize: tabSize,
        }));
    }
    // --- internal: indentSize
    _validateIndentSize(value) {
        if (value === 'tabSize') {
            return 'tabSize';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return r > 0 ? r : null;
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return r > 0 ? r : null;
        }
        return null;
    }
    _setIndentSize(value) {
        const indentSize = this._validateIndentSize(value);
        if (indentSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof indentSize === 'number') {
            if (this._originalIndentSize === indentSize) {
                // nothing to do
                return;
            }
            // reflect the new indentSize value immediately
            this._indentSize = indentSize;
            this._originalIndentSize = indentSize;
        }
        this._warnOnError('setIndentSize', this._proxy.$trySetOptions(this._id, {
            indentSize: indentSize,
        }));
    }
    // --- internal: insert spaces
    _validateInsertSpaces(value) {
        if (value === 'auto') {
            return 'auto';
        }
        return value === 'false' ? false : Boolean(value);
    }
    _setInsertSpaces(value) {
        const insertSpaces = this._validateInsertSpaces(value);
        if (typeof insertSpaces === 'boolean') {
            if (this._insertSpaces === insertSpaces) {
                // nothing to do
                return;
            }
            // reflect the new insertSpaces value immediately
            this._insertSpaces = insertSpaces;
        }
        this._warnOnError('setInsertSpaces', this._proxy.$trySetOptions(this._id, {
            insertSpaces: insertSpaces,
        }));
    }
    // --- internal: cursor style
    _setCursorStyle(value) {
        if (this._cursorStyle === value) {
            // nothing to do
            return;
        }
        this._cursorStyle = value;
        this._warnOnError('setCursorStyle', this._proxy.$trySetOptions(this._id, {
            cursorStyle: value,
        }));
    }
    // --- internal: line number
    _setLineNumbers(value) {
        if (this._lineNumbers === value) {
            // nothing to do
            return;
        }
        this._lineNumbers = value;
        this._warnOnError('setLineNumbers', this._proxy.$trySetOptions(this._id, {
            lineNumbers: TypeConverters.TextEditorLineNumbersStyle.from(value),
        }));
    }
    assign(newOptions) {
        const bulkConfigurationUpdate = {};
        let hasUpdate = false;
        if (typeof newOptions.tabSize !== 'undefined') {
            const tabSize = this._validateTabSize(newOptions.tabSize);
            if (tabSize === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
            else if (typeof tabSize === 'number' && this._tabSize !== tabSize) {
                // reflect the new tabSize value immediately
                this._tabSize = tabSize;
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
        }
        if (typeof newOptions.indentSize !== 'undefined') {
            const indentSize = this._validateIndentSize(newOptions.indentSize);
            if (indentSize === 'tabSize') {
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
            else if (typeof indentSize === 'number' && this._originalIndentSize !== indentSize) {
                // reflect the new indentSize value immediately
                this._indentSize = indentSize;
                this._originalIndentSize = indentSize;
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
        }
        if (typeof newOptions.insertSpaces !== 'undefined') {
            const insertSpaces = this._validateInsertSpaces(newOptions.insertSpaces);
            if (insertSpaces === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
            else if (this._insertSpaces !== insertSpaces) {
                // reflect the new insertSpaces value immediately
                this._insertSpaces = insertSpaces;
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
        }
        if (typeof newOptions.cursorStyle !== 'undefined') {
            if (this._cursorStyle !== newOptions.cursorStyle) {
                this._cursorStyle = newOptions.cursorStyle;
                hasUpdate = true;
                bulkConfigurationUpdate.cursorStyle = newOptions.cursorStyle;
            }
        }
        if (typeof newOptions.lineNumbers !== 'undefined') {
            if (this._lineNumbers !== newOptions.lineNumbers) {
                this._lineNumbers = newOptions.lineNumbers;
                hasUpdate = true;
                bulkConfigurationUpdate.lineNumbers = TypeConverters.TextEditorLineNumbersStyle.from(newOptions.lineNumbers);
            }
        }
        if (hasUpdate) {
            this._warnOnError('setOptions', this._proxy.$trySetOptions(this._id, bulkConfigurationUpdate));
        }
    }
    _warnOnError(action, promise) {
        promise.catch((err) => {
            this._logService.warn(`ExtHostTextEditorOptions '${action}' failed:'`);
            this._logService.warn(err);
        });
    }
}
export class ExtHostTextEditor {
    constructor(id, _proxy, _logService, document, selections, options, visibleRanges, viewColumn) {
        this.id = id;
        this._proxy = _proxy;
        this._logService = _logService;
        this._disposed = false;
        this._hasDecorationsForKey = new Set();
        this._selections = selections;
        this._options = new ExtHostTextEditorOptions(this._proxy, this.id, options, _logService);
        this._visibleRanges = visibleRanges;
        this._viewColumn = viewColumn;
        const that = this;
        this.value = Object.freeze({
            get document() {
                return document.value;
            },
            set document(_value) {
                throw new ReadonlyError('document');
            },
            // --- selection
            get selection() {
                return that._selections && that._selections[0];
            },
            set selection(value) {
                if (!(value instanceof Selection)) {
                    throw illegalArgument('selection');
                }
                that._selections = [value];
                that._trySetSelection();
            },
            get selections() {
                return that._selections;
            },
            set selections(value) {
                if (!Array.isArray(value) || value.some((a) => !(a instanceof Selection))) {
                    throw illegalArgument('selections');
                }
                that._selections = value;
                that._trySetSelection();
            },
            // --- visible ranges
            get visibleRanges() {
                return that._visibleRanges;
            },
            set visibleRanges(_value) {
                throw new ReadonlyError('visibleRanges');
            },
            get diffInformation() {
                return that._diffInformation;
            },
            // --- options
            get options() {
                return that._options.value;
            },
            set options(value) {
                if (!that._disposed) {
                    that._options.assign(value);
                }
            },
            // --- view column
            get viewColumn() {
                return that._viewColumn;
            },
            set viewColumn(_value) {
                throw new ReadonlyError('viewColumn');
            },
            // --- edit
            edit(callback, options = {
                undoStopBefore: true,
                undoStopAfter: true,
            }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#edit not possible on closed editors'));
                }
                const edit = new TextEditorEdit(document.value, options);
                callback(edit);
                return that._applyEdit(edit);
            },
            // --- snippet edit
            insertSnippet(snippet, where, options = {
                undoStopBefore: true,
                undoStopAfter: true,
            }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#insertSnippet not possible on closed editors'));
                }
                let ranges;
                if (!where || (Array.isArray(where) && where.length === 0)) {
                    ranges = that._selections.map((range) => TypeConverters.Range.from(range));
                }
                else if (where instanceof Position) {
                    const { lineNumber, column } = TypeConverters.Position.from(where);
                    ranges = [
                        {
                            startLineNumber: lineNumber,
                            startColumn: column,
                            endLineNumber: lineNumber,
                            endColumn: column,
                        },
                    ];
                }
                else if (where instanceof Range) {
                    ranges = [TypeConverters.Range.from(where)];
                }
                else {
                    ranges = [];
                    for (const posOrRange of where) {
                        if (posOrRange instanceof Range) {
                            ranges.push(TypeConverters.Range.from(posOrRange));
                        }
                        else {
                            const { lineNumber, column } = TypeConverters.Position.from(posOrRange);
                            ranges.push({
                                startLineNumber: lineNumber,
                                startColumn: column,
                                endLineNumber: lineNumber,
                                endColumn: column,
                            });
                        }
                    }
                }
                if (options.keepWhitespace === undefined) {
                    options.keepWhitespace = false;
                }
                return _proxy.$tryInsertSnippet(id, document.value.version, snippet.value, ranges, options);
            },
            setDecorations(decorationType, ranges) {
                const willBeEmpty = ranges.length === 0;
                if (willBeEmpty && !that._hasDecorationsForKey.has(decorationType.key)) {
                    // avoid no-op call to the renderer
                    return;
                }
                if (willBeEmpty) {
                    that._hasDecorationsForKey.delete(decorationType.key);
                }
                else {
                    that._hasDecorationsForKey.add(decorationType.key);
                }
                that._runOnProxy(() => {
                    if (TypeConverters.isDecorationOptionsArr(ranges)) {
                        return _proxy.$trySetDecorations(id, decorationType.key, TypeConverters.fromRangeOrRangeWithMessage(ranges));
                    }
                    else {
                        const _ranges = new Array(4 * ranges.length);
                        for (let i = 0, len = ranges.length; i < len; i++) {
                            const range = ranges[i];
                            _ranges[4 * i] = range.start.line + 1;
                            _ranges[4 * i + 1] = range.start.character + 1;
                            _ranges[4 * i + 2] = range.end.line + 1;
                            _ranges[4 * i + 3] = range.end.character + 1;
                        }
                        return _proxy.$trySetDecorationsFast(id, decorationType.key, _ranges);
                    }
                });
            },
            revealRange(range, revealType) {
                that._runOnProxy(() => _proxy.$tryRevealRange(id, TypeConverters.Range.from(range), revealType || TextEditorRevealType.Default));
            },
            show(column) {
                _proxy.$tryShowEditor(id, TypeConverters.ViewColumn.from(column));
            },
            hide() {
                _proxy.$tryHideEditor(id);
            },
            [Symbol.for('debug.description')]() {
                return `TextEditor(${this.document.uri.toString()})`;
            },
        });
    }
    dispose() {
        ok(!this._disposed);
        this._disposed = true;
    }
    // --- incoming: extension host MUST accept what the renderer says
    _acceptOptions(options) {
        ok(!this._disposed);
        this._options._accept(options);
    }
    _acceptVisibleRanges(value) {
        ok(!this._disposed);
        this._visibleRanges = value;
    }
    _acceptViewColumn(value) {
        ok(!this._disposed);
        this._viewColumn = value;
    }
    _acceptSelections(selections) {
        ok(!this._disposed);
        this._selections = selections;
    }
    _acceptDiffInformation(diffInformation) {
        ok(!this._disposed);
        this._diffInformation = diffInformation;
    }
    async _trySetSelection() {
        const selection = this._selections.map(TypeConverters.Selection.from);
        await this._runOnProxy(() => this._proxy.$trySetSelections(this.id, selection));
        return this.value;
    }
    _applyEdit(editBuilder) {
        const editData = editBuilder.finalize();
        // return when there is nothing to do
        if (editData.edits.length === 0 && !editData.setEndOfLine) {
            return Promise.resolve(true);
        }
        // check that the edits are not overlapping (i.e. illegal)
        const editRanges = editData.edits.map((edit) => edit.range);
        // sort ascending (by end and then by start)
        editRanges.sort((a, b) => {
            if (a.end.line === b.end.line) {
                if (a.end.character === b.end.character) {
                    if (a.start.line === b.start.line) {
                        return a.start.character - b.start.character;
                    }
                    return a.start.line - b.start.line;
                }
                return a.end.character - b.end.character;
            }
            return a.end.line - b.end.line;
        });
        // check that no edits are overlapping
        for (let i = 0, count = editRanges.length - 1; i < count; i++) {
            const rangeEnd = editRanges[i].end;
            const nextRangeStart = editRanges[i + 1].start;
            if (nextRangeStart.isBefore(rangeEnd)) {
                // overlapping ranges
                return Promise.reject(new Error('Overlapping ranges are not allowed!'));
            }
        }
        // prepare data for serialization
        const edits = editData.edits.map((edit) => {
            return {
                range: TypeConverters.Range.from(edit.range),
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers,
            };
        });
        return this._proxy.$tryApplyEdits(this.id, editData.documentVersionId, edits, {
            setEndOfLine: typeof editData.setEndOfLine === 'number'
                ? TypeConverters.EndOfLine.from(editData.setEndOfLine)
                : undefined,
            undoStopBefore: editData.undoStopBefore,
            undoStopAfter: editData.undoStopAfter,
        });
    }
    _runOnProxy(callback) {
        if (this._disposed) {
            this._logService.warn('TextEditor is closed/disposed');
            return Promise.resolve(undefined);
        }
        return callback().then(() => this, (err) => {
            if (!(err instanceof Error && err.name === 'DISPOSED')) {
                this._logService.warn(err);
            }
            return null;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXh0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVNqRSxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFDTixTQUFTLEVBQ1QsUUFBUSxFQUNSLEtBQUssRUFDTCxTQUFTLEVBR1Qsb0JBQW9CLEdBQ3BCLE1BQU0sbUJBQW1CLENBQUE7QUFNMUIsTUFBTSxPQUFPLHdCQUF3QjthQUNaLFVBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBSTNFLFlBQ0MsS0FBaUMsRUFDakMsU0FBZ0MsRUFDaEMsT0FBdUM7UUFFdkMsTUFBTSxHQUFHLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ25ELEtBQUssQ0FBQyxpQ0FBaUMsQ0FDdEMsU0FBUyxDQUFDLFVBQVUsRUFDcEIsR0FBRyxFQUNILGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQ3BELENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDMUIsR0FBRztZQUNILE9BQU87Z0JBQ04sS0FBSyxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzNDLENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDOztBQWlC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