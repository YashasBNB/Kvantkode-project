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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGV4dEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFTakUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sU0FBUyxFQUNULFFBQVEsRUFDUixLQUFLLEVBQ0wsU0FBUyxFQUdULG9CQUFvQixHQUNwQixNQUFNLG1CQUFtQixDQUFBO0FBTTFCLE1BQU0sT0FBTyx3QkFBd0I7YUFDWixVQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUkzRSxZQUNDLEtBQWlDLEVBQ2pDLFNBQWdDLEVBQ2hDLE9BQXVDO1FBRXZDLE1BQU0sR0FBRyxHQUFHLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNuRCxLQUFLLENBQUMsaUNBQWlDLENBQ3RDLFNBQVMsQ0FBQyxVQUFVLEVBQ3BCLEdBQUcsRUFDSCxjQUFjLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzFCLEdBQUc7WUFDSCxPQUFPO2dCQUNOLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUFpQkYsTUFB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