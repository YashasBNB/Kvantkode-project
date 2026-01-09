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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1hdGNoRGVjb3JhdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZmluZC9maW5kTWF0Y2hEZWNvcmF0aW9uTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUVsRyxPQUFPLEVBQ04seUNBQXlDLEVBQ3pDLGdDQUFnQyxHQUNoQyxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFPTix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQVN2RCxZQUNrQixlQUFnQyxFQUNoQyxPQUFlO1FBRWhDLEtBQUssRUFBRSxDQUFBO1FBSFUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFWekIsMkJBQXNCLEdBQTRCLEVBQUUsQ0FBQTtRQUNwRCxpQ0FBNEIsR0FBYSxFQUFFLENBQUE7UUFDM0MsK0JBQTBCLEdBQWEsRUFBRSxDQUFBO1FBQ3pDLDZCQUF3QixHQUd0QixJQUFJLENBQUE7SUFPZCxDQUFDO0lBRUQsSUFBVyx1QkFBdUI7UUFDakMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUE7SUFDckMsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVNLEtBQUssQ0FBQyx5Q0FBeUMsQ0FD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