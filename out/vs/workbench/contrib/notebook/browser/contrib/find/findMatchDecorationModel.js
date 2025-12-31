/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { FindDecorations } from '../../../../../../editor/contrib/find/browser/findDecorations.js';
import { overviewRulerSelectionHighlightForeground, overviewRulerFindMatchForeground, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { NotebookOverviewRulerLane, } from '../../notebookBrowser.js';
export class FindMatchDecorationModel extends Disposable {
    constructor(_notebookEditor, ownerID) {
        super();
        this._notebookEditor = _notebookEditor;
        this.ownerID = ownerID;
        this._allMatchesDecorations = [];
        this._currentMatchCellDecorations = [];
        this._allMatchesCellDecorations = [];
        this._currentMatchDecorations = null;
    }
    get currentMatchDecorations() {
        return this._currentMatchDecorations;
    }
    clearDecorations() {
        this.clearCurrentFindMatchDecoration();
        this.setAllFindMatchesDecorations([]);
    }
    async highlightCurrentFindMatchDecorationInCell(cell, cellRange) {
        this.clearCurrentFindMatchDecoration();
        // match is an editor FindMatch, we update find match decoration in the editor
        // we will highlight the match in the webview
        this._notebookEditor.changeModelDecorations((accessor) => {
            const findMatchesOptions = FindDecorations._CURRENT_FIND_MATCH_DECORATION;
            const decorations = [
                { range: cellRange, options: findMatchesOptions },
            ];
            const deltaDecoration = {
                ownerId: cell.handle,
                decorations: decorations,
            };
            this._currentMatchDecorations = {
                kind: 'input',
                decorations: accessor.deltaDecorations(this._currentMatchDecorations?.kind === 'input'
                    ? this._currentMatchDecorations.decorations
                    : [], [deltaDecoration]),
            };
        });
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, [
            {
                handle: cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerSelectionHighlightForeground,
                        modelRanges: [cellRange],
                        includeOutput: false,
                        position: NotebookOverviewRulerLane.Center,
                    },
                },
            },
        ]);
        return null;
    }
    async highlightCurrentFindMatchDecorationInWebview(cell, index) {
        this.clearCurrentFindMatchDecoration();
        const offset = await this._notebookEditor.findHighlightCurrent(index, this.ownerID);
        this._currentMatchDecorations = { kind: 'output', index: index };
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, [
            {
                handle: cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerSelectionHighlightForeground,
                        modelRanges: [],
                        includeOutput: true,
                        position: NotebookOverviewRulerLane.Center,
                    },
                },
            },
        ]);
        return offset;
    }
    clearCurrentFindMatchDecoration() {
        if (this._currentMatchDecorations?.kind === 'input') {
            this._notebookEditor.changeModelDecorations((accessor) => {
                accessor.deltaDecorations(this._currentMatchDecorations?.kind === 'input'
                    ? this._currentMatchDecorations.decorations
                    : [], []);
                this._currentMatchDecorations = null;
            });
        }
        else if (this._currentMatchDecorations?.kind === 'output') {
            this._notebookEditor.findUnHighlightCurrent(this._currentMatchDecorations.index, this.ownerID);
        }
        this._currentMatchCellDecorations = this._notebookEditor.deltaCellDecorations(this._currentMatchCellDecorations, []);
    }
    setAllFindMatchesDecorations(cellFindMatches) {
        this._notebookEditor.changeModelDecorations((accessor) => {
            const findMatchesOptions = FindDecorations._FIND_MATCH_DECORATION;
            const deltaDecorations = cellFindMatches.map((cellFindMatch) => {
                // Find matches
                const newFindMatchesDecorations = new Array(cellFindMatch.contentMatches.length);
                for (let i = 0; i < cellFindMatch.contentMatches.length; i++) {
                    newFindMatchesDecorations[i] = {
                        range: cellFindMatch.contentMatches[i].range,
                        options: findMatchesOptions,
                    };
                }
                return { ownerId: cellFindMatch.cell.handle, decorations: newFindMatchesDecorations };
            });
            this._allMatchesDecorations = accessor.deltaDecorations(this._allMatchesDecorations, deltaDecorations);
        });
        this._allMatchesCellDecorations = this._notebookEditor.deltaCellDecorations(this._allMatchesCellDecorations, cellFindMatches.map((cellFindMatch) => {
            return {
                ownerId: cellFindMatch.cell.handle,
                handle: cellFindMatch.cell.handle,
                options: {
                    overviewRuler: {
                        color: overviewRulerFindMatchForeground,
                        modelRanges: cellFindMatch.contentMatches.map((match) => match.range),
                        includeOutput: cellFindMatch.webviewMatches.length > 0,
                        position: NotebookOverviewRulerLane.Center,
                    },
                },
            };
        }));
    }
    stopWebviewFind() {
        this._notebookEditor.findStop(this.ownerID);
    }
    dispose() {
        this.clearDecorations();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1hdGNoRGVjb3JhdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2ZpbmQvZmluZE1hdGNoRGVjb3JhdGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUd2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFbEcsT0FBTyxFQUNOLHlDQUF5QyxFQUN6QyxnQ0FBZ0MsR0FDaEMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBT04seUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7SUFTdkQsWUFDa0IsZUFBZ0MsRUFDaEMsT0FBZTtRQUVoQyxLQUFLLEVBQUUsQ0FBQTtRQUhVLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNoQyxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBVnpCLDJCQUFzQixHQUE0QixFQUFFLENBQUE7UUFDcEQsaUNBQTRCLEdBQWEsRUFBRSxDQUFBO1FBQzNDLCtCQUEwQixHQUFhLEVBQUUsQ0FBQTtRQUN6Qyw2QkFBd0IsR0FHdEIsSUFBSSxDQUFBO0lBT2QsQ0FBQztJQUVELElBQVcsdUJBQXVCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFBO0lBQ3JDLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFTSxLQUFLLENBQUMseUNBQXlDLENBQ3JELElBQW9CLEVBQ3BCLFNBQWdCO1FB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