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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsU3luY2hyb25pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L3Njcm9sbFN5bmNocm9uaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFlLE1BQU0sMENBQTBDLENBQUE7QUFHeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFPN0UsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFDakQsSUFBWSxLQUFLO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQU1ELElBQVksaUJBQWlCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFBO0lBQzVDLENBQUM7SUFDRCxJQUFZLGVBQWU7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsWUFDa0IsU0FBd0QsRUFDeEQsVUFBK0IsRUFDL0IsVUFBK0IsRUFDL0IsUUFBcUQsRUFDckQsZUFBcUMsRUFDckMsTUFBdUM7UUFFeEQsS0FBSyxFQUFFLENBQUE7UUFQVSxjQUFTLEdBQVQsU0FBUyxDQUErQztRQUN4RCxlQUFVLEdBQVYsVUFBVSxD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