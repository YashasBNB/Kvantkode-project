/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h, reset } from '../../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableSignal, observableSignalFromEvent, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
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
        const viewRange = OffsetRange.ofStartAndLength(0, this._domNode.clientHeight);
        if (!viewRange.isEmpty) {
            for (const visibleRange of visibleRanges) {
                const visibleRange2 = new LineRange(visibleRange.startLineNumber, visibleRange.endLineNumber + 1);
                const gutterItems = this.itemProvider.getIntersectingGutterItems(visibleRange2, reader);
                transaction((tx) => {
                    /** EditorGutter.render */
                    for (const gutterItem of gutterItems) {
                        if (!gutterItem.range.intersect(visibleRange2)) {
                            continue;
                        }
                        unusedIds.delete(gutterItem.id);
                        let view = this.views.get(gutterItem.id);
                        if (!view) {
                            const viewDomNode = document.createElement('div');
                            this._domNode.appendChild(viewDomNode);
                            const gutterItemObs = observableValue('item', gutterItem);
                            const itemView = this.itemProvider.createView(gutterItemObs, viewDomNode);
                            view = new ManagedGutterItemView(gutterItemObs, itemView, viewDomNode);
                            this.views.set(gutterItem.id, view);
                        }
                        else {
                            view.item.set(gutterItem, tx);
                        }
                        const top = gutterItem.range.startLineNumber <= this._editor.getModel().getLineCount()
                            ? this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) -
                                scrollTop
                            : this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) -
                                scrollTop;
                        const bottom = gutterItem.range.endLineNumberExclusive === 1
                            ? Math.max(top, this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, false) -
                                scrollTop)
                            : Math.max(top, this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) - scrollTop);
                        const height = bottom - top;
                        view.domNode.style.top = `${top}px`;
                        view.domNode.style.height = `${height}px`;
                        view.gutterItemView.layout(OffsetRange.ofStartAndLength(top, height), viewRange);
                    }
                });
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
    constructor(item, gutterItemView, domNode) {
        this.item = item;
        this.gutterItemView = gutterItemView;
        this.domNode = domNode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3V0dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvdXRpbHMvZWRpdG9yR3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sT0FBTyxFQUlQLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIseUJBQXlCLEVBQ3pCLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE1BQU0sT0FBTyxZQUEwRCxTQUFRLFVBQVU7SUFxQnhGLFlBQ2tCLE9BQXlCLEVBQ3pCLFFBQXFCLEVBQ3JCLFlBQW9DO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBSlUsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7UUFDekIsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBd0I7UUF2QnJDLGNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQzVGLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQ3hFLENBQUE7UUFDZ0Isb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDcEQsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFD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