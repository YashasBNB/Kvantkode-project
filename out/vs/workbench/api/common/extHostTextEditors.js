/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { TextEditorDecorationType } from './extHostTextEditor.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { TextEditorSelectionChangeKind, TextEditorChangeKind } from './extHostTypes.js';
export class ExtHostEditors extends Disposable {
    constructor(mainContext, _extHostDocumentsAndEditors) {
        super();
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._onDidChangeTextEditorSelection = new Emitter();
        this._onDidChangeTextEditorOptions = new Emitter();
        this._onDidChangeTextEditorVisibleRanges = new Emitter();
        this._onDidChangeTextEditorViewColumn = new Emitter();
        this._onDidChangeTextEditorDiffInformation = new Emitter();
        this._onDidChangeActiveTextEditor = new Emitter();
        this._onDidChangeVisibleTextEditors = new Emitter();
        this.onDidChangeTextEditorSelection = this._onDidChangeTextEditorSelection.event;
        this.onDidChangeTextEditorOptions = this._onDidChangeTextEditorOptions.event;
        this.onDidChangeTextEditorVisibleRanges = this._onDidChangeTextEditorVisibleRanges.event;
        this.onDidChangeTextEditorViewColumn = this._onDidChangeTextEditorViewColumn.event;
        this.onDidChangeTextEditorDiffInformation = this._onDidChangeTextEditorDiffInformation.event;
        this.onDidChangeActiveTextEditor = this._onDidChangeActiveTextEditor.event;
        this.onDidChangeVisibleTextEditors = this._onDidChangeVisibleTextEditors.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadTextEditors);
        this._register(this._extHostDocumentsAndEditors.onDidChangeVisibleTextEditors((e) => this._onDidChangeVisibleTextEditors.fire(e)));
        this._register(this._extHostDocumentsAndEditors.onDidChangeActiveTextEditor((e) => this._onDidChangeActiveTextEditor.fire(e)));
    }
    getActiveTextEditor() {
        return this._extHostDocumentsAndEditors.activeEditor();
    }
    getVisibleTextEditors(internal) {
        const editors = this._extHostDocumentsAndEditors.allEditors();
        return internal ? editors : editors.map((editor) => editor.value);
    }
    async showTextDocument(document, columnOrOptions, preserveFocus) {
        let options;
        if (typeof columnOrOptions === 'number') {
            options = {
                position: TypeConverters.ViewColumn.from(columnOrOptions),
                preserveFocus,
            };
        }
        else if (typeof columnOrOptions === 'object') {
            options = {
                position: TypeConverters.ViewColumn.from(columnOrOptions.viewColumn),
                preserveFocus: columnOrOptions.preserveFocus,
                selection: typeof columnOrOptions.selection === 'object'
                    ? TypeConverters.Range.from(columnOrOptions.selection)
                    : undefined,
                pinned: typeof columnOrOptions.preview === 'boolean' ? !columnOrOptions.preview : undefined,
            };
        }
        else {
            options = {
                preserveFocus: false,
            };
        }
        const editorId = await this._proxy.$tryShowTextDocument(document.uri, options);
        const editor = editorId && this._extHostDocumentsAndEditors.getEditor(editorId);
        if (editor) {
            return editor.value;
        }
        // we have no editor... having an id means that we had an editor
        // on the main side and that it isn't the current editor anymore...
        if (editorId) {
            throw new Error(`Could NOT open editor for "${document.uri.toString()}" because another editor opened in the meantime.`);
        }
        else {
            throw new Error(`Could NOT open editor for "${document.uri.toString()}".`);
        }
    }
    createTextEditorDecorationType(extension, options) {
        return new TextEditorDecorationType(this._proxy, extension, options).value;
    }
    // --- called from main thread
    $acceptEditorPropertiesChanged(id, data) {
        const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
        if (!textEditor) {
            throw new Error('unknown text editor');
        }
        // (1) set all properties
        if (data.options) {
            textEditor._acceptOptions(data.options);
        }
        if (data.selections) {
            const selections = data.selections.selections.map(TypeConverters.Selection.to);
            textEditor._acceptSelections(selections);
        }
        if (data.visibleRanges) {
            const visibleRanges = arrays.coalesce(data.visibleRanges.map(TypeConverters.Range.to));
            textEditor._acceptVisibleRanges(visibleRanges);
        }
        // (2) fire change events
        if (data.options) {
            this._onDidChangeTextEditorOptions.fire({
                textEditor: textEditor.value,
                options: {
                    ...data.options,
                    lineNumbers: TypeConverters.TextEditorLineNumbersStyle.to(data.options.lineNumbers),
                },
            });
        }
        if (data.selections) {
            const kind = TextEditorSelectionChangeKind.fromValue(data.selections.source);
            const selections = data.selections.selections.map(TypeConverters.Selection.to);
            this._onDidChangeTextEditorSelection.fire({
                textEditor: textEditor.value,
                selections,
                kind,
            });
        }
        if (data.visibleRanges) {
            const visibleRanges = arrays.coalesce(data.visibleRanges.map(TypeConverters.Range.to));
            this._onDidChangeTextEditorVisibleRanges.fire({
                textEditor: textEditor.value,
                visibleRanges,
            });
        }
    }
    $acceptEditorPositionData(data) {
        for (const id in data) {
            const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
            if (!textEditor) {
                throw new Error('Unknown text editor');
            }
            const viewColumn = TypeConverters.ViewColumn.to(data[id]);
            if (textEditor.value.viewColumn !== viewColumn) {
                textEditor._acceptViewColumn(viewColumn);
                this._onDidChangeTextEditorViewColumn.fire({ textEditor: textEditor.value, viewColumn });
            }
        }
    }
    $acceptEditorDiffInformation(id, diffInformation) {
        const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
        if (!textEditor) {
            throw new Error('unknown text editor');
        }
        if (!diffInformation) {
            textEditor._acceptDiffInformation(undefined);
            this._onDidChangeTextEditorDiffInformation.fire({
                textEditor: textEditor.value,
                diffInformation: undefined,
            });
            return;
        }
        const that = this;
        const result = diffInformation.map((diff) => {
            const original = URI.revive(diff.original);
            const modified = URI.revive(diff.modified);
            const changes = diff.changes.map((change) => {
                const [originalStartLineNumber, originalEndLineNumberExclusive, modifiedStartLineNumber, modifiedEndLineNumberExclusive,] = change;
                let kind;
                if (originalStartLineNumber === originalEndLineNumberExclusive) {
                    kind = TextEditorChangeKind.Addition;
                }
                else if (modifiedStartLineNumber === modifiedEndLineNumberExclusive) {
                    kind = TextEditorChangeKind.Deletion;
                }
                else {
                    kind = TextEditorChangeKind.Modification;
                }
                return {
                    original: {
                        startLineNumber: originalStartLineNumber,
                        endLineNumberExclusive: originalEndLineNumberExclusive,
                    },
                    modified: {
                        startLineNumber: modifiedStartLineNumber,
                        endLineNumberExclusive: modifiedEndLineNumberExclusive,
                    },
                    kind,
                };
            });
            return Object.freeze({
                documentVersion: diff.documentVersion,
                original,
                modified,
                changes,
                get isStale() {
                    const document = that._extHostDocumentsAndEditors.getDocument(modified);
                    return document?.version !== diff.documentVersion;
                },
            });
        });
        textEditor._acceptDiffInformation(result);
        this._onDidChangeTextEditorDiffInformation.fire({
            textEditor: textEditor.value,
            diffInformation: result,
        });
    }
    getDiffInformation(id) {
        return Promise.resolve(this._proxy.$getDiffInformation(id));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRleHRFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQU9OLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRixPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBR3ZGLE1BQU0sT0FBTyxjQUFlLFNBQVEsVUFBVTtJQStCN0MsWUFDQyxXQUF5QixFQUNSLDJCQUF1RDtRQUV4RSxLQUFLLEVBQUUsQ0FBQTtRQUZVLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNEI7UUFoQ3hELG9DQUErQixHQUMvQyxJQUFJLE9BQU8sRUFBeUMsQ0FBQTtRQUNwQyxrQ0FBNkIsR0FDN0MsSUFBSSxPQUFPLEVBQXVDLENBQUE7UUFDbEMsd0NBQW1DLEdBQ25ELElBQUksT0FBTyxFQUE2QyxDQUFBO1FBQ3hDLHFDQUFnQyxHQUNoRCxJQUFJLE9BQU8sRUFBMEMsQ0FBQTtRQUNyQywwQ0FBcUMsR0FDckQsSUFBSSxPQUFPLEVBQStDLENBQUE7UUFDMUMsaUNBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQWlD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