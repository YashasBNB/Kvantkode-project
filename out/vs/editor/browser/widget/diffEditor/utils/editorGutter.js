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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3V0dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci91dGlscy9lZGl0b3JHdXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixPQUFPLEVBSVAsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLDBDQUEwQyxDQUFBO0FBRWpELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsTUFBTSxPQUFPLFlBQTBELFNBQVEsVUFBVTtJQXFCeEYsWUFDa0IsT0FBeUIsRUFDekIsUUFBcUIsRUFDckIsWUFBb0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFrQjtRQUN6QixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQXZCckMsY0FBUyxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDNUYsNENBQTRDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FDeEUsQ0FBQTtRQUNnQixvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNwRCxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsbUNBQW1DLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FDbEUsQ0FBQTtRQUNnQixrQkFBYSxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDL0YsMkNBQTJDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FDbkUsQ0FBQTtRQUVnQiwrQkFBMEIsR0FBRyx5QkFBeUIsQ0FDdEUsc0JBQXNCLEVBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQ2pDLENBQUE7UUFDZ0IsaUNBQTRCLEdBQUcseUJBQXlCLENBQ3hFLHdCQUF3QixFQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUNuQyxDQUFBO1FBQ2dCLHVCQUFrQixHQUFHLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUEwQzNELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQTtRQWxDaEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsc0JBQXNCLENBQUE7UUFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FDakQsQ0FBQyxDQUFDLHVCQUF1QixFQUFFO1lBQzFCLElBQUksRUFBRSxjQUFjO1lBQ3BCLFVBQVUsRUFBRSxNQUFNO1lBQ2xCLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7U0FDeEIsQ0FBQyxDQUFDLElBQUksQ0FDUCxDQUFBO1FBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxjQUFjLENBQUMsR0FBRyxFQUFFO1lBQ2pDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNsQixnREFBZ0Q7Z0JBQ2hELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDcEMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQiw0Q0FBNEM7WUFDNUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFBO1FBQzFGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsdUNBQXVDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakcsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFZixLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JCLENBQUM7SUFJTyxNQUFNLENBQUMsTUFBZTtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTdDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFFNUMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRTdFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxTQUFTLENBQ2xDLFlBQVksQ0FBQyxlQUFlLEVBQzVCLFlBQVksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUM5QixDQUFBO2dCQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUV2RixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtvQkFDbEIsMEJBQTBCO29CQUUxQixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO3dCQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQzs0QkFDaEQsU0FBUTt3QkFDVCxDQUFDO3dCQUVELFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO3dCQUMvQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7d0JBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDWCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBOzRCQUNqRCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTs0QkFDdEMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTs0QkFDekQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBOzRCQUN6RSxJQUFJLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFBOzRCQUN0RSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO3dCQUNwQyxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO3dCQUM5QixDQUFDO3dCQUVELE1BQU0sR0FBRyxHQUNSLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUMsWUFBWSxFQUFFOzRCQUMxRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUM7Z0NBQ3pFLFNBQVM7NEJBQ1YsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQztnQ0FDakYsU0FBUyxDQUFBO3dCQUNaLE1BQU0sTUFBTSxHQUNYLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEtBQUssQ0FBQzs0QkFDNUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ1IsR0FBRyxFQUNILElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDO2dDQUN4RSxTQUFTLENBQ1Y7NEJBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ1IsR0FBRyxFQUNILElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQ2xDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUMzQyxJQUFJLENBQ0osR0FBRyxTQUFTLENBQ2IsQ0FBQTt3QkFFSixNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFBO3dCQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQTt3QkFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUE7d0JBRXpDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7b0JBQ2pGLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELEtBQUssTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUE7WUFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHFCQUFxQjtJQUMxQixZQUNpQixJQUEwQyxFQUMxQyxjQUErQixFQUMvQixPQUF1QjtRQUZ2QixTQUFJLEdBQUosSUFBSSxDQUFzQztRQUMxQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFDckMsQ0FBQztDQUNKIn0=