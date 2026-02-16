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
import { Event } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
let NotebookSelectionHighlighter = class NotebookSelectionHighlighter extends Disposable {
    static { this.id = 'notebook.selectionHighlighter'; }
    // right now this lets us mimic the more performant cache implementation of the text editor (doesn't need to be a delayer)
    // todo: in the future, implement caching and change to a 250ms delay upon recompute
    // private readonly runDelayer: Delayer<void> = this._register(new Delayer<void>(0));
    constructor(notebookEditor, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.configurationService = configurationService;
        this.isEnabled = false;
        this.cellDecorationIds = new Map();
        this.anchorDisposables = new DisposableStore();
        this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.selectionHighlight')) {
                this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
            }
        }));
        this._register(this.notebookEditor.onDidChangeActiveCell(async () => {
            if (!this.isEnabled) {
                return;
            }
            this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
            if (!this.anchorCell) {
                return;
            }
            const activeCell = this.notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (!activeCell.editorAttached) {
                await Event.toPromise(activeCell.onDidChangeEditorAttachState);
            }
            this.clearNotebookSelectionDecorations();
            this.anchorDisposables.clear();
            this.anchorDisposables.add(this.anchorCell[1].onDidChangeCursorPosition((e) => {
                if (e.reason !== 3 /* CursorChangeReason.Explicit */) {
                    this.clearNotebookSelectionDecorations();
                    return;
                }
                if (!this.anchorCell) {
                    return;
                }
                if (this.notebookEditor.hasModel()) {
                    this.clearNotebookSelectionDecorations();
                    this._update(this.notebookEditor);
                }
            }));
            if (this.notebookEditor.getEditorViewState().editorFocused &&
                this.notebookEditor.hasModel()) {
                this._update(this.notebookEditor);
            }
        }));
    }
    _update(editor) {
        if (!this.anchorCell || !this.isEnabled) {
            return;
        }
        // TODO: isTooLargeForTokenization check, notebook equivalent?
        // unlikely that any one cell's textmodel would be too large
        // get the word
        const textModel = this.anchorCell[0].textModel;
        if (!textModel || textModel.isTooLargeForTokenization()) {
            return;
        }
        const s = this.anchorCell[0].getSelections()[0];
        if (s.startLineNumber !== s.endLineNumber || s.isEmpty()) {
            // empty selections do nothing
            // multiline forbidden for perf reasons
            return;
        }
        const searchText = this.getSearchText(s, textModel);
        if (!searchText) {
            return;
        }
        const results = editor.textModel.findMatches(searchText, false, true, null);
        for (const res of results) {
            const cell = editor.getCellByHandle(res.cell.handle);
            if (!cell) {
                continue;
            }
            this.updateCellDecorations(cell, res.matches);
        }
    }
    updateCellDecorations(cell, matches) {
        const selections = matches.map((m) => {
            return Selection.fromRange(m.range, 0 /* SelectionDirection.LTR */);
        });
        const newDecorations = [];
        selections?.map((selection) => {
            const isEmpty = selection.isEmpty();
            if (!isEmpty) {
                newDecorations.push({
                    range: selection,
                    options: {
                        description: '',
                        className: '.nb-selection-highlight',
                    },
                });
            }
        });
        const oldDecorations = this.cellDecorationIds.get(cell) ?? [];
        this.cellDecorationIds.set(cell, cell.deltaModelDecorations(oldDecorations, newDecorations));
    }
    clearNotebookSelectionDecorations() {
        this.cellDecorationIds.forEach((_, cell) => {
            const cellDecorations = this.cellDecorationIds.get(cell) ?? [];
            if (cellDecorations) {
                cell.deltaModelDecorations(cellDecorations, []);
                this.cellDecorationIds.delete(cell);
            }
        });
    }
    getSearchText(selection, model) {
        return model.getValueInRange(selection).replace(/\r\n/g, '\n');
    }
    dispose() {
        super.dispose();
        this.anchorDisposables.dispose();
    }
};
NotebookSelectionHighlighter = __decorate([
    __param(1, IConfigurationService)
], NotebookSelectionHighlighter);
registerNotebookContribution(NotebookSelectionHighlighter.id, NotebookSelectionHighlighter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWxlY3Rpb25IaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9tdWx0aWN1cnNvci9ub3RlYm9va1NlbGVjdGlvbkhpZ2hsaWdodC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV4RixPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLG1EQUFtRCxDQUFBO0FBT2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBT3hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRWhGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUNwQyxPQUFFLEdBQVcsK0JBQStCLEFBQTFDLENBQTBDO0lBTzVELDBIQUEwSDtJQUMxSCxvRkFBb0Y7SUFDcEYscUZBQXFGO0lBRXJGLFlBQ2tCLGNBQStCLEVBQ3pCLG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUhVLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNSLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFaNUUsY0FBUyxHQUFZLEtBQUssQ0FBQTtRQUUxQixzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQTtRQUU5QyxzQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBWXpELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEs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