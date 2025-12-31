/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h, reset } from '../../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableSignal, observableSignalFromEvent, transaction, } from '../../../../../base/common/observable.js';
import { LineRange } from '../model/lineRange.js';
export class EditorGutter extends Disposable {
    constructor(_editor, _domNode, itemProvider) {
        super();
        this._editor = _editor;
        this._domNode = _domNode;
        this.itemProvider = itemProvider;
        this.scrollTop = observableFromEvent(this, this._editor.onDidScrollChange, (e) => 
        /** @description editor.onDidScrollChange */ this._editor.getScrollTop());
        this.isScrollTopZero = this.scrollTop.map((scrollTop) => /** @description isScrollTopZero */ scrollTop === 0);
        this.modelAttached = observableFromEvent(this, this._editor.onDidChangeModel, (e) => 
        /** @description editor.onDidChangeModel */ this._editor.hasModel());
        this.editorOnDidChangeViewZones = observableSignalFromEvent('onDidChangeViewZones', this._editor.onDidChangeViewZones);
        this.editorOnDidContentSizeChange = observableSignalFromEvent('onDidContentSizeChange', this._editor.onDidContentSizeChange);
        this.domNodeSizeChanged = observableSignal('domNodeSizeChanged');
        this.views = new Map();
        this._domNode.className = 'gutter monaco-editor';
        const scrollDecoration = this._domNode.appendChild(h('div.scroll-decoration', {
            role: 'presentation',
            ariaHidden: 'true',
            style: { width: '100%' },
        }).root);
        const o = new ResizeObserver(() => {
            transaction((tx) => {
                /** @description ResizeObserver: size changed */
                this.domNodeSizeChanged.trigger(tx);
            });
        });
        o.observe(this._domNode);
        this._register(toDisposable(() => o.disconnect()));
        this._register(autorun((reader) => {
            /** @description update scroll decoration */
            scrollDecoration.className = this.isScrollTopZero.read(reader) ? '' : 'scroll-decoration';
        }));
        this._register(autorun((reader) => /** @description EditorGutter.Render */ this.render(reader)));
    }
    dispose() {
        super.dispose();
        reset(this._domNode);
    }
    render(reader) {
        if (!this.modelAttached.read(reader)) {
            return;
        }
        this.domNodeSizeChanged.read(reader);
        this.editorOnDidChangeViewZones.read(reader);
        this.editorOnDidContentSizeChange.read(reader);
        const scrollTop = this.scrollTop.read(reader);
        const visibleRanges = this._editor.getVisibleRanges();
        const unusedIds = new Set(this.views.keys());
        if (visibleRanges.length > 0) {
            const visibleRange = visibleRanges[0];
            const visibleRange2 = new LineRange(visibleRange.startLineNumber, visibleRange.endLineNumber - visibleRange.startLineNumber).deltaEnd(1);
            const gutterItems = this.itemProvider.getIntersectingGutterItems(visibleRange2, reader);
            for (const gutterItem of gutterItems) {
                if (!gutterItem.range.touches(visibleRange2)) {
                    continue;
                }
                unusedIds.delete(gutterItem.id);
                let view = this.views.get(gutterItem.id);
                if (!view) {
                    const viewDomNode = document.createElement('div');
                    this._domNode.appendChild(viewDomNode);
                    const itemView = this.itemProvider.createView(gutterItem, viewDomNode);
                    view = new ManagedGutterItemView(itemView, viewDomNode);
                    this.views.set(gutterItem.id, view);
                }
                else {
                    view.gutterItemView.update(gutterItem);
                }
                const top = gutterItem.range.startLineNumber <= this._editor.getModel().getLineCount()
                    ? this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) - scrollTop
                    : this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) -
                        scrollTop;
                const bottom = this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) -
                    scrollTop;
                const height = bottom - top;
                view.domNode.style.top = `${top}px`;
                view.domNode.style.height = `${height}px`;
                view.gutterItemView.layout(top, height, 0, this._domNode.clientHeight);
            }
        }
        for (const id of unusedIds) {
            const view = this.views.get(id);
            view.gutterItemView.dispose();
            view.domNode.remove();
            this.views.delete(id);
        }
    }
}
class ManagedGutterItemView {
    constructor(gutterItemView, domNode) {
        this.gutterItemView = gutterItemView;
        this.domNode = domNode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3V0dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2VkaXRvckd1dHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0YsT0FBTyxFQUNOLE9BQU8sRUFFUCxtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFakQsTUFBTSxPQUFPLFlBQTBELFNBQVEsVUFBVTtJQXFCeEYsWUFDa0IsT0FBeUIsRUFDekIsUUFBcUIsRUFDckIsWUFBb0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFrQjtRQUN6QixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQXZCckMsY0FBUyxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDNUYsNENBQTRDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FDeEUsQ0FBQTtRQUNnQixvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNwRCxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsbUNBQW1DLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FDbEUsQ0FBQTtRQUNnQixrQkFB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