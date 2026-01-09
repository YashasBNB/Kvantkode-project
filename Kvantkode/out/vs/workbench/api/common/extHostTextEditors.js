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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGV4dEVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBT04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFxQix3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3BGLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFHdkYsTUFBTSxPQUFPLGNBQWUsU0FBUSxVQUFVO0lBK0I3QyxZQUNDLFdBQXlCLEVBQ1IsMkJBQXVEO1FBRXhFLEtBQUssRUFBRSxDQUFBO1FBRlUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE0QjtRQWhDeEQsb0NBQStCLEdBQy9DLElBQUksT0FBTyxFQUF5QyxDQUFBO1FBQ3BDLGtDQUE2QixHQUM3QyxJQUFJLE9BQU8sRUFBdUMsQ0FBQTtRQUNsQyx3Q0FBbUMsR0FDbkQsSUFBSSxPQUFPLEVBQTZDLENBQUE7UUFDeEMscUNBQWdDLEdBQ2hELElBQUksT0FBTyxFQUEwQyxDQUFBO1FBQ3JDLDBDQUFxQyxHQUNyRCxJQUFJLE9BQU8sRUFBK0MsQ0FBQTtRQUMxQyxpQ0FB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