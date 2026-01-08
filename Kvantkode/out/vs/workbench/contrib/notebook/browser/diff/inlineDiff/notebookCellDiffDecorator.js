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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRGlmZkRlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tDZWxsRGlmZkRlY29yYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLG1CQUFtQixHQUNuQixNQUFNLDZDQUE2QyxDQUFBO0FBRXBELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixhQUFhLEVBQ2IsVUFBVSxFQUNWLFdBQVcsR0FDWCxNQUFNLGtHQUFrRyxDQUFBO0FBQ3pHLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsMEJBQTBCLEVBQzFCLG9CQUFvQixHQUNwQixNQUFNLGtGQUFrRixDQUFBO0FBRXpGLE9BQU8sRUFLTixpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBR3JFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsOEJBQThCLEVBQzlCLCtCQUErQixFQUMvQiw0QkFBNEIsRUFDNUIs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