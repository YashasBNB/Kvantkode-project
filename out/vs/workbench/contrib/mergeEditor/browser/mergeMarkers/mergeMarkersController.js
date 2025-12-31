/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { LineRange } from '../model/lineRange.js';
import * as nls from '../../../../../nls.js';
export const conflictMarkers = {
    start: '<<<<<<<',
    end: '>>>>>>>',
};
export class MergeMarkersController extends Disposable {
    constructor(editor, mergeEditorViewModel) {
        super();
        this.editor = editor;
        this.mergeEditorViewModel = mergeEditorViewModel;
        this.viewZoneIds = [];
        this.disposableStore = new DisposableStore();
        this._register(editor.onDidChangeModelContent((e) => {
            this.updateDecorations();
        }));
        this._register(editor.onDidChangeModel((e) => {
            this.updateDecorations();
        }));
        this.updateDecorations();
    }
    updateDecorations() {
        const model = this.editor.getModel();
        const blocks = model
            ? getBlocks(model, {
                blockToRemoveStartLinePrefix: conflictMarkers.start,
                blockToRemoveEndLinePrefix: conflictMarkers.end,
            })
            : { blocks: [] };
        this.editor.setHiddenAreas(blocks.blocks.map((b) => b.lineRange.deltaEnd(-1).toRange()), this);
        this.editor.changeViewZones((c) => {
            this.disposableStore.clear();
            for (const id of this.viewZoneIds) {
                c.removeZone(id);
            }
            this.viewZoneIds.length = 0;
            for (const b of blocks.blocks) {
                const startLine = model.getLineContent(b.lineRange.startLineNumber).substring(0, 20);
                const endLine = model
                    .getLineContent(b.lineRange.endLineNumberExclusive - 1)
                    .substring(0, 20);
                const conflictingLinesCount = b.lineRange.lineCount - 2;
                const domNode = h('div', [
                    h('div.conflict-zone-root', [
                        h('pre', [startLine]),
                        h('span.dots', ['...']),
                        h('pre', [endLine]),
                        h('span.text', [
                            conflictingLinesCount === 1
                                ? nls.localize('conflictingLine', '1 Conflicting Line')
                                : nls.localize('conflictingLines', '{0} Conflicting Lines', conflictingLinesCount),
                        ]),
                    ]),
                ]).root;
                this.viewZoneIds.push(c.addZone({
                    afterLineNumber: b.lineRange.endLineNumberExclusive - 1,
                    domNode,
                    heightInLines: 1.5,
                }));
                const updateWidth = () => {
                    const layoutInfo = this.editor.getLayoutInfo();
                    domNode.style.width = `${layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth}px`;
                };
                this.disposableStore.add(this.editor.onDidLayoutChange(() => {
                    updateWidth();
                }));
                updateWidth();
                this.disposableStore.add(autorun((reader) => {
                    /** @description update classname */
                    const vm = this.mergeEditorViewModel.read(reader);
                    if (!vm) {
                        return;
                    }
                    const activeRange = vm.activeModifiedBaseRange.read(reader);
                    const classNames = [];
                    classNames.push('conflict-zone');
                    if (activeRange) {
                        const activeRangeInResult = vm.model.getLineRangeInResult(activeRange.baseRange, reader);
                        if (activeRangeInResult.intersects(b.lineRange)) {
                            classNames.push('focused');
                        }
                    }
                    domNode.className = classNames.join(' ');
                }));
            }
        });
    }
}
function getBlocks(document, configuration) {
    const blocks = [];
    const transformedContent = [];
    let inBlock = false;
    let startLineNumber = -1;
    let curLine = 0;
    for (const line of document.getLinesContent()) {
        curLine++;
        if (!inBlock) {
            if (line.startsWith(configuration.blockToRemoveStartLinePrefix)) {
                inBlock = true;
                startLineNumber = curLine;
            }
            else {
                transformedContent.push(line);
            }
        }
        else {
            if (line.startsWith(configuration.blockToRemoveEndLinePrefix)) {
                inBlock = false;
                blocks.push(new Block(new LineRange(startLineNumber, curLine - startLineNumber + 1)));
                transformedContent.push('');
            }
        }
    }
    return {
        blocks,
        transformedContent: transformedContent.join('\n'),
    };
}
class Block {
    constructor(lineRange) {
        this.lineRange = lineRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VNYXJrZXJzQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VNYXJrZXJzL21lcmdlTWFya2Vyc0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLDBDQUEwQyxDQUFBO0FBRy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBRTVDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixLQUFLLEVBQUUsU0FBUztJQUNoQixHQUFHLEVBQUUsU0FBUztDQUNkLENBQUE7QUFFRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUlyRCxZQUNpQixNQUFtQixFQUNuQixvQkFBbUU7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIUyxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBK0M7UUFMbkUsZ0JBQVcsR0FBYSxFQUFFLENBQUE7UUFDMUIsb0JBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBUXZELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2Is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