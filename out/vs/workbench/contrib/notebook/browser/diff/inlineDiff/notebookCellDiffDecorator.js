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
import { DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, observableFromEvent, } from '../../../../../../base/common/observable.js';
import { ThrottledDelayer } from '../../../../../../base/common/async.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { themeColorFromId } from '../../../../../../base/common/themables.js';
import { RenderOptions, LineSource, renderLines, } from '../../../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { diffAddDecoration, diffWholeLineAddDecoration, diffDeleteDecoration, } from '../../../../../../editor/browser/widget/diffEditor/registrations.contribution.js';
import { OverviewRulerLane, } from '../../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../../editor/common/model/textModel.js';
import { InlineDecoration, } from '../../../../../../editor/common/viewModel.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { minimapGutterAddedBackground, minimapGutterDeletedBackground, minimapGutterModifiedBackground, overviewRulerAddedForeground, overviewRulerDeletedForeground, overviewRulerModifiedForeground, } from '../../../../scm/common/quickDiff.js';
import { INotebookOriginalCellModelFactory } from './notebookOriginalCellModelFactory.js';
//TODO: allow client to set read-only - chateditsession should set read-only while making changes
let NotebookCellDiffDecorator = class NotebookCellDiffDecorator extends DisposableStore {
    constructor(notebookEditor, modifiedCell, originalCell, editor, _editorWorkerService, originalCellModelFactory) {
        super();
        this.modifiedCell = modifiedCell;
        this.originalCell = originalCell;
        this.editor = editor;
        this._editorWorkerService = _editorWorkerService;
        this.originalCellModelFactory = originalCellModelFactory;
        this._viewZones = [];
        this.throttledDecorator = new ThrottledDelayer(50);
        this.perEditorDisposables = this.add(new DisposableStore());
        const onDidChangeVisibleRanges = observableFromEvent(notebookEditor.onDidChangeVisibleRanges, () => notebookEditor.visibleRanges);
        const editorObs = derived((r) => {
            const visibleRanges = onDidChangeVisibleRanges.read(r);
            const visibleCellHandles = visibleRanges
                .map((range) => notebookEditor.getCellsInRange(range))
                .flat()
                .map((c) => c.handle);
            if (!visibleCellHandles.includes(modifiedCell.handle)) {
                return;
            }
            const editor = notebookEditor.codeEditors.find((item) => item[0].handle === modifiedCell.handle)?.[1];
            if (editor?.getModel() !== this.modifiedCell.textModel) {
                return;
            }
            return editor;
        });
        this.add(autorunWithStore((r, store) => {
            const editor = editorObs.read(r);
            this.perEditorDisposables.clear();
            if (editor) {
                store.add(editor.onDidChangeModel(() => {
                    this.perEditorDisposables.clear();
                }));
                store.add(editor.onDidChangeModelContent(() => {
                    this.update(editor);
                }));
                store.add(editor.onDidChangeConfiguration((e) => {
                    if (e.hasChanged(52 /* EditorOption.fontInfo */) || e.hasChanged(68 /* EditorOption.lineHeight */)) {
                        this.update(editor);
                    }
                }));
                this.update(editor);
            }
        }));
    }
    update(editor) {
        this.throttledDecorator.trigger(() => this._updateImpl(editor));
    }
    async _updateImpl(editor) {
        if (this.isDisposed) {
            return;
        }
        if (editor.getOption(63 /* EditorOption.inDiffEditor */)) {
            this.perEditorDisposables.clear();
            return;
        }
        const model = editor.getModel();
        if (!model || model !== this.modifiedCell.textModel) {
            this.perEditorDisposables.clear();
            return;
        }
        const originalModel = this.getOrCreateOriginalModel(editor);
        if (!originalModel) {
            this.perEditorDisposables.clear();
            return;
        }
        const version = model.getVersionId();
        const diff = await this._editorWorkerService.computeDiff(originalModel.uri, model.uri, {
            computeMoves: true,
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: Number.MAX_SAFE_INTEGER,
        }, 'advanced');
        if (this.isDisposed) {
            return;
        }
        if (diff &&
            !diff.identical &&
            this.modifiedCell.textModel &&
            originalModel &&
            model === editor.getModel() &&
            editor.getModel()?.getVersionId() === version) {
            this._updateWithDiff(editor, originalModel, diff, this.modifiedCell.textModel);
        }
        else {
            this.perEditorDisposables.clear();
        }
    }
    getOrCreateOriginalModel(editor) {
        if (!this._originalModel) {
            const model = editor.getModel();
            if (!model) {
                return;
            }
            this._originalModel = this.add(this.originalCellModelFactory.getOrCreate(model.uri, this.originalCell.getValue(), model.getLanguageId(), this.modifiedCell.cellKind)).object;
        }
        return this._originalModel;
    }
    _updateWithDiff(editor, originalModel, diff, currentModel) {
        if (areDiffsEqual(diff, this.diffForPreviouslyAppliedDecorators)) {
            return;
        }
        this.perEditorDisposables.clear();
        const decorations = editor.createDecorationsCollection();
        this.perEditorDisposables.add(toDisposable(() => {
            editor.changeViewZones((viewZoneChangeAccessor) => {
                for (const id of this._viewZones) {
                    viewZoneChangeAccessor.removeZone(id);
                }
            });
            this._viewZones = [];
            decorations.clear();
            this.diffForPreviouslyAppliedDecorators = undefined;
        }));
        this.diffForPreviouslyAppliedDecorators = diff;
        const chatDiffAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const chatDiffWholeLineAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffWholeLineAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const createOverviewDecoration = (overviewRulerColor, minimapColor) => {
            return ModelDecorationOptions.createDynamic({
                description: 'chat-editing-decoration',
                overviewRuler: {
                    color: themeColorFromId(overviewRulerColor),
                    position: OverviewRulerLane.Left,
                },
                minimap: { color: themeColorFromId(minimapColor), position: 2 /* MinimapPosition.Gutter */ },
            });
        };
        const modifiedDecoration = createOverviewDecoration(overviewRulerModifiedForeground, minimapGutterModifiedBackground);
        const addedDecoration = createOverviewDecoration(overviewRulerAddedForeground, minimapGutterAddedBackground);
        const deletedDecoration = createOverviewDecoration(overviewRulerDeletedForeground, minimapGutterDeletedBackground);
        editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
            this._viewZones = [];
            const modifiedVisualDecorations = [];
            const mightContainNonBasicASCII = originalModel.mightContainNonBasicASCII();
            const mightContainRTL = originalModel.mightContainRTL();
            const renderOptions = RenderOptions.fromEditor(this.editor);
            const editorLineCount = currentModel.getLineCount();
            for (const diffEntry of diff.changes) {
                const originalRange = diffEntry.original;
                originalModel.tokenization.forceTokenization(Math.max(1, originalRange.endLineNumberExclusive - 1));
                const source = new LineSource(originalRange.mapToLineArray((l) => originalModel.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                const decorations = [];
                for (const i of diffEntry.innerChanges || []) {
                    decorations.push(new InlineDecoration(i.originalRange.delta(-(diffEntry.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                    // If the original range is empty, the start line number is 1 and the new range spans the entire file, don't draw an Added decoration
                    if (!(i.originalRange.isEmpty() &&
                        i.originalRange.startLineNumber === 1 &&
                        i.modifiedRange.endLineNumber === editorLineCount) &&
                        !i.modifiedRange.isEmpty()) {
                        modifiedVisualDecorations.push({
                            range: i.modifiedRange,
                            options: chatDiffAddDecoration,
                        });
                    }
                }
                // Render an added decoration but don't also render a deleted decoration for newly inserted content at the start of the file
                // Note, this is a workaround for the `LineRange.isEmpty()` in diffEntry.original being `false` for newly inserted content
                const isCreatedContent = decorations.length === 1 &&
                    decorations[0].range.isEmpty() &&
                    diffEntry.original.startLineNumber === 1;
                if (!diffEntry.modified.isEmpty &&
                    !(isCreatedContent && diffEntry.modified.endLineNumberExclusive - 1 === editorLineCount)) {
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: chatDiffWholeLineAddDecoration,
                    });
                }
                if (diffEntry.original.isEmpty) {
                    // insertion
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: addedDecoration,
                    });
                }
                else if (diffEntry.modified.isEmpty) {
                    // deletion
                    modifiedVisualDecorations.push({
                        range: new Range(diffEntry.modified.startLineNumber - 1, 1, diffEntry.modified.startLineNumber, 1),
                        options: deletedDecoration,
                    });
                }
                else {
                    // modification
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: modifiedDecoration,
                    });
                }
                const domNode = document.createElement('div');
                domNode.className =
                    'chat-editing-original-zone view-lines line-delete monaco-mouse-cursor-text';
                const result = renderLines(source, renderOptions, decorations, domNode);
                if (!isCreatedContent) {
                    const viewZoneData = {
                        afterLineNumber: diffEntry.modified.startLineNumber - 1,
                        heightInLines: result.heightInLines,
                        domNode,
                        ordinal: 50000 + 2, // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                    };
                    this._viewZones.push(viewZoneChangeAccessor.addZone(viewZoneData));
                }
            }
            decorations.set(modifiedVisualDecorations);
        });
    }
};
NotebookCellDiffDecorator = __decorate([
    __param(4, IEditorWorkerService),
    __param(5, INotebookOriginalCellModelFactory)
], NotebookCellDiffDecorator);
export { NotebookCellDiffDecorator };
function areDiffsEqual(a, b) {
    if (a && b) {
        if (a.changes.length !== b.changes.length) {
            return false;
        }
        if (a.moves.length !== b.moves.length) {
            return false;
        }
        if (!areLineRangeMappinsEqual(a.changes, b.changes)) {
            return false;
        }
        if (!a.moves.some((move, i) => {
            const bMove = b.moves[i];
            if (!areLineRangeMappinsEqual(move.changes, bMove.changes)) {
                return true;
            }
            if (move.lineRangeMapping.changedLineCount !== bMove.lineRangeMapping.changedLineCount) {
                return true;
            }
            if (!move.lineRangeMapping.modified.equals(bMove.lineRangeMapping.modified)) {
                return true;
            }
            if (!move.lineRangeMapping.original.equals(bMove.lineRangeMapping.original)) {
                return true;
            }
            return false;
        })) {
            return false;
        }
        return true;
    }
    else if (!a && !b) {
        return true;
    }
    else {
        return false;
    }
}
function areLineRangeMappinsEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    if (a.some((c, i) => {
        const bChange = b[i];
        if (c.changedLineCount !== bChange.changedLineCount) {
            return true;
        }
        if ((c.innerChanges || []).length !== (bChange.innerChanges || []).length) {
            return true;
        }
        if ((c.innerChanges || []).some((innerC, innerIdx) => {
            const bInnerC = bChange.innerChanges[innerIdx];
            if (!innerC.modifiedRange.equalsRange(bInnerC.modifiedRange)) {
                return true;
            }
            if (!innerC.originalRange.equalsRange(bInnerC.originalRange)) {
                return true;
            }
            return false;
        })) {
            return true;
        }
        return false;
    })) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRGlmZkRlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rQ2VsbERpZmZEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLE9BQU8sRUFDUCxtQkFBbUIsR0FDbkIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sYUFBYSxFQUNiLFVBQVUsRUFDVixXQUFXLEdBQ1gsTUFBTSxrR0FBa0csQ0FBQTtBQUN6RyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLDBCQUEwQixFQUMxQixvQkFBb0IsR0FDcEIsTUFBTSxrRkFBa0YsQ0FBQTtBQUV6RixPQUFPLEVBS04saUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDM0YsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUdyRSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDhCQUE4QixFQUM5QiwrQkFBK0IsRUFDL0IsNEJBQTRCLEVBQzVCLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV6RixpR0FBaUc7QUFDMUYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxlQUFlO0lBTTdELFlBQ0MsY0FBK0IsRUFDZixZQUFtQyxFQUNuQyxZQUFtQyxFQUNsQyxNQUFtQixFQUNkLG9CQUEyRCxFQUVqRix3QkFBNEU7UUFFNUUsS0FBSyxFQUFFLENBQUE7UUFQUyxpQkFBWSxHQUFaLFlBQVksQ0FBdUI7UUFDbkMsaUJBQVksR0FBWixZQUFZLENBQXVCO1FBQ2xDLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDRyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBRWhFLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBbUM7UUFackUsZUFBVSxHQUFhLEVBQUUsQ0FBQTtRQUNoQix1QkFBa0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRzdDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBWXRFLE1BQU0sd0JBQXdCLEdBQUcsbUJBQW1CLENBQ25ELGNBQWMsQ0FBQyx3QkFBd0IsRUFDdkMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FDbEMsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9CLE1BQU0sYUFBYSxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0RCxNQUFNLGtCQUFrQixHQUFHLGFBQWE7aUJBQ3RDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckQsSUFBSSxFQUFFO2lCQUNOLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQzdDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNLENBQ2hELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNOLElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hELE9BQU07WUFDUCxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxHQUFHLENBQ1AsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7WUFFakMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixLQUFLLENBQUMsR0FBRyxDQUNSLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7b0JBQzVCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDbEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxLQUFLLENBQUMsR0FBRyxDQUNSLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7b0JBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FDUixNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDckMsSUFBSSxDQUFDLENBQUMsVUFBVSxnQ0FBdUIsSUFBSSxDQUFDLENBQUMsVUFBVSxrQ0FBeUIsRUFBRSxDQUFDO3dCQUNsRixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBbUI7UUFDaEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBbUI7UUFDNUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLG9DQUEyQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDakMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUN2RCxhQUFhLENBQUMsR0FBRyxFQUNqQixLQUFLLENBQUMsR0FBRyxFQUNUO1lBQ0MsWUFBWSxFQUFFLElBQUk7WUFDbEIsb0JBQW9CLEVBQUUsS0FBSztZQUMzQixvQkFBb0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1NBQzdDLEVBQ0QsVUFBVSxDQUNWLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0MsSUFBSTtZQUNKLENBQUMsSUFBSSxDQUFDLFNBQVM7WUFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVM7WUFDM0IsYUFBYTtZQUNiLEtBQUssS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQzNCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxZQUFZLEVBQUUsS0FBSyxPQUFPLEVBQzVDLENBQUM7WUFDRixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDL0UsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFHTyx3QkFBd0IsQ0FBQyxNQUFtQjtRQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzdCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQ3hDLEtBQUssQ0FBQyxHQUFHLEVBQ1QsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFDNUIsS0FBSyxDQUFDLGFBQWEsRUFBRSxFQUNyQixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FDMUIsQ0FDRCxDQUFDLE1BQU0sQ0FBQTtRQUNULENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsTUFBbUIsRUFDbkIsYUFBeUIsRUFDekIsSUFBbUIsRUFDbkIsWUFBd0I7UUFFeEIsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUM7WUFDbEUsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDakMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDeEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtnQkFDakQsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2xDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdEMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7WUFDcEIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ25CLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxTQUFTLENBQUE7UUFDcEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxJQUFJLENBQUE7UUFFOUMsTUFBTSxxQkFBcUIsR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLENBQUM7WUFDbEUsR0FBRyxpQkFBaUI7WUFDcEIsVUFBVSw0REFBb0Q7U0FDOUQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSw4QkFBOEIsR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLENBQUM7WUFDM0UsR0FBRywwQkFBMEI7WUFDN0IsVUFBVSw0REFBb0Q7U0FDOUQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLGtCQUEwQixFQUFFLFlBQW9CLEVBQUUsRUFBRTtZQUNyRixPQUFPLHNCQUFzQixDQUFDLGFBQWEsQ0FBQztnQkFDM0MsV0FBVyxFQUFFLHlCQUF5QjtnQkFDdEMsYUFBYSxFQUFFO29CQUNkLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDM0MsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUk7aUJBQ2hDO2dCQUNELE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLGdDQUF3QixFQUFFO2FBQ3BGLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQTtRQUNELE1BQU0sa0JBQWtCLEdBQUcsd0JBQXdCLENBQ2xELCtCQUErQixFQUMvQiwrQkFBK0IsQ0FDL0IsQ0FBQTtRQUNELE1BQU0sZUFBZSxHQUFHLHdCQUF3QixDQUMvQyw0QkFBNEIsRUFDNUIsNEJBQTRCLENBQzVCLENBQUE7UUFDRCxNQUFNLGlCQUFpQixHQUFHLHdCQUF3QixDQUNqRCw4QkFBOEIsRUFDOUIsOEJBQThCLENBQzlCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUNqRCxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbEMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3RDLENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtZQUNwQixNQUFNLHlCQUF5QixHQUE0QixFQUFFLENBQUE7WUFDN0QsTUFBTSx5QkFBeUIsR0FBRyxhQUFhLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtZQUMzRSxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDdkQsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0QsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ25ELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFBO2dCQUN4QyxhQUFhLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQ3JELENBQUE7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQzVCLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2hGLEVBQUUsRUFDRix5QkFBeUIsRUFDekIsZUFBZSxDQUNmLENBQUE7Z0JBQ0QsTUFBTSxXQUFXLEdBQXVCLEVBQUUsQ0FBQTtnQkFFMUMsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxDQUFDO29CQUM5QyxXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksZ0JBQWdCLENBQ25CLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUNoRSxvQkFBb0IsQ0FBQyxTQUFVLHVDQUUvQixDQUNELENBQUE7b0JBRUQscUlBQXFJO29CQUNySSxJQUNDLENBQUMsQ0FDQSxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRTt3QkFDekIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEtBQUssQ0FBQzt3QkFDckMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEtBQUssZUFBZSxDQUNqRDt3QkFDRCxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQ3pCLENBQUM7d0JBQ0YseUJBQXlCLENBQUMsSUFBSSxDQUFDOzRCQUM5QixLQUFLLEVBQUUsQ0FBQyxDQUFDLGFBQWE7NEJBQ3RCLE9BQU8sRUFBRSxxQkFBcUI7eUJBQzlCLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsNEhBQTRIO2dCQUM1SCwwSEFBMEg7Z0JBQzFILE1BQU0sZ0JBQWdCLEdBQ3JCLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztvQkFDeEIsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7b0JBQzlCLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQTtnQkFFekMsSUFDQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTztvQkFDM0IsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxLQUFLLGVBQWUsQ0FBQyxFQUN2RixDQUFDO29CQUNGLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUc7d0JBQzdDLE9BQU8sRUFBRSw4QkFBOEI7cUJBQ3ZDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDaEMsWUFBWTtvQkFDWix5QkFBeUIsQ0FBQyxJQUFJLENBQUM7d0JBQzlCLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFHO3dCQUM3QyxPQUFPLEVBQUUsZUFBZTtxQkFDeEIsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN2QyxXQUFXO29CQUNYLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUNmLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsRUFDdEMsQ0FBQyxFQUNELFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUNsQyxDQUFDLENBQ0Q7d0JBQ0QsT0FBTyxFQUFFLGlCQUFpQjtxQkFDMUIsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlO29CQUNmLHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUc7d0JBQzdDLE9BQU8sRUFBRSxrQkFBa0I7cUJBQzNCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzdDLE9BQU8sQ0FBQyxTQUFTO29CQUNoQiw0RUFBNEUsQ0FBQTtnQkFDN0UsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUV2RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxZQUFZLEdBQWM7d0JBQy9CLGVBQWUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDO3dCQUN2RCxhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7d0JBQ25DLE9BQU87d0JBQ1AsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsc0tBQXNLO3FCQUMxTCxDQUFBO29CQUVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO1lBQ0YsQ0FBQztZQUVELFdBQVcsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMzQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBblRZLHlCQUF5QjtJQVduQyxXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsaUNBQWlDLENBQUE7R0FadkIseUJBQXlCLENBbVRyQzs7QUFFRCxTQUFTLGFBQWEsQ0FBQyxDQUE0QixFQUFFLENBQTRCO0lBQ2hGLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ1osSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUNDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4QixJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEtBQUssS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDN0UsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM3RSxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxFQUNELENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7U0FBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUNoQyxDQUFzQyxFQUN0QyxDQUFzQztJQUV0QyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQ0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNmLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsS0FBSyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNyRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQ0MsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNoRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxFQUNELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUMsQ0FBQyxFQUNELENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==