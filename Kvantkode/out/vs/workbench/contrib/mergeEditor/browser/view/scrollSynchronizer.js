/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore } from '../../../../../base/common/observable.js';
import { DocumentLineRangeMap } from '../model/mapping.js';
import { ReentrancyBarrier } from '../../../../../base/common/controlFlow.js';
export class ScrollSynchronizer extends Disposable {
    get model() {
        return this.viewModel.get()?.model;
    }
    get shouldAlignResult() {
        return this.layout.get().kind === 'columns';
    }
    get shouldAlignBase() {
        return this.layout.get().kind === 'mixed' && !this.layout.get().showBaseAtTop;
    }
    constructor(viewModel, input1View, input2View, baseView, inputResultView, layout) {
        super();
        this.viewModel = viewModel;
        this.input1View = input1View;
        this.input2View = input2View;
        this.baseView = baseView;
        this.inputResultView = inputResultView;
        this.layout = layout;
        this.reentrancyBarrier = new ReentrancyBarrier();
        const handleInput1OnScroll = (this.updateScrolling = () => {
            if (!this.model) {
                return;
            }
            this.input2View.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
            if (this.shouldAlignResult) {
                this.inputResultView.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
            }
            else {
                const mappingInput1Result = this.model.input1ResultMapping.get();
                this.synchronizeScrolling(this.input1View.editor, this.inputResultView.editor, mappingInput1Result);
            }
            const baseView = this.baseView.get();
            if (baseView) {
                if (this.shouldAlignBase) {
                    this.baseView
                        .get()
                        ?.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
                }
                else {
                    const mapping = new DocumentLineRangeMap(this.model.baseInput1Diffs.get(), -1).reverse();
                    this.synchronizeScrolling(this.input1View.editor, baseView.editor, mapping);
                }
            }
        });
        this._store.add(this.input1View.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (c.scrollTopChanged) {
                handleInput1OnScroll();
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(this.input2View.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (!this.model) {
                return;
            }
            if (c.scrollTopChanged) {
                this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                if (this.shouldAlignResult) {
                    this.inputResultView.editor.setScrollTop(this.input2View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
                }
                else {
                    const mappingInput2Result = this.model.input2ResultMapping.get();
                    this.synchronizeScrolling(this.input2View.editor, this.inputResultView.editor, mappingInput2Result);
                }
                const baseView = this.baseView.get();
                if (baseView && this.model) {
                    if (this.shouldAlignBase) {
                        this.baseView.get()?.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                    }
                    else {
                        const mapping = new DocumentLineRangeMap(this.model.baseInput2Diffs.get(), -1).reverse();
                        this.synchronizeScrolling(this.input2View.editor, baseView.editor, mapping);
                    }
                }
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(this.inputResultView.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (c.scrollTopChanged) {
                if (this.shouldAlignResult) {
                    this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                    this.input2View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                }
                else {
                    const mapping1 = this.model?.resultInput1Mapping.get();
                    this.synchronizeScrolling(this.inputResultView.editor, this.input1View.editor, mapping1);
                    const mapping2 = this.model?.resultInput2Mapping.get();
                    this.synchronizeScrolling(this.inputResultView.editor, this.input2View.editor, mapping2);
                }
                const baseMapping = this.model?.resultBaseMapping.get();
                const baseView = this.baseView.get();
                if (baseView && this.model) {
                    this.synchronizeScrolling(this.inputResultView.editor, baseView.editor, baseMapping);
                }
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor?.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(autorunWithStore((reader, store) => {
            /** @description set baseViewEditor.onDidScrollChange */
            const baseView = this.baseView.read(reader);
            if (baseView) {
                store.add(baseView.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
                    if (c.scrollTopChanged) {
                        if (!this.model) {
                            return;
                        }
                        if (this.shouldAlignBase) {
                            this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                            this.input2View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                        }
                        else {
                            const baseInput1Mapping = new DocumentLineRangeMap(this.model.baseInput1Diffs.get(), -1);
                            this.synchronizeScrolling(baseView.editor, this.input1View.editor, baseInput1Mapping);
                            const baseInput2Mapping = new DocumentLineRangeMap(this.model.baseInput2Diffs.get(), -1);
                            this.synchronizeScrolling(baseView.editor, this.input2View.editor, baseInput2Mapping);
                        }
                        const baseMapping = this.model?.baseResultMapping.get();
                        this.synchronizeScrolling(baseView.editor, this.inputResultView.editor, baseMapping);
                    }
                    if (c.scrollLeftChanged) {
                        this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                        this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                        this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                    }
                })));
            }
        }));
    }
    synchronizeScrolling(scrollingEditor, targetEditor, mapping) {
        if (!mapping) {
            return;
        }
        const visibleRanges = scrollingEditor.getVisibleRanges();
        if (visibleRanges.length === 0) {
            return;
        }
        const topLineNumber = visibleRanges[0].startLineNumber - 1;
        const result = mapping.project(topLineNumber);
        const sourceRange = result.inputRange;
        const targetRange = result.outputRange;
        const resultStartTopPx = targetEditor.getTopForLineNumber(targetRange.startLineNumber);
        const resultEndPx = targetEditor.getTopForLineNumber(targetRange.endLineNumberExclusive);
        const sourceStartTopPx = scrollingEditor.getTopForLineNumber(sourceRange.startLineNumber);
        const sourceEndPx = scrollingEditor.getTopForLineNumber(sourceRange.endLineNumberExclusive);
        const factor = Math.min((scrollingEditor.getScrollTop() - sourceStartTopPx) / (sourceEndPx - sourceStartTopPx), 1);
        const resultScrollPosition = resultStartTopPx + (resultEndPx - resultStartTopPx) * factor;
        targetEditor.setScrollTop(resultScrollPosition, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsU3luY2hyb25pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvc2Nyb2xsU3luY2hyb25pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUd4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQU83RSxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTtJQUNqRCxJQUFZLEtBQUs7UUFDaEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQTtJQUNuQyxDQUFDO0lBTUQsSUFBWSxpQkFBaUI7UUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUE7SUFDNUMsQ0FBQztJQUNELElBQVksZUFBZTtRQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFBO0lBQzlFLENBQUM7SUFFRCxZQUNrQixTQUF3RCxFQUN4RCxVQUErQixFQUMvQixVQUErQixFQUMvQixRQUFxRCxFQUNyRCxlQUFxQyxFQUNyQyxNQUF1QztRQUV4RCxLQUFLLEVBQUUsQ0FBQTtRQVBVLGNBQVMsR0FBVCxTQUFTLENBQStD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