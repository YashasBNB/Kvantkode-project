/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equalsIfDefined, itemsEquals } from '../../base/common/equals.js';
import { Disposable, DisposableStore, toDisposable, } from '../../base/common/lifecycle.js';
import { TransactionImpl, autorun, autorunOpts, derived, derivedOpts, derivedWithSetter, observableFromEvent, observableSignal, observableValue, observableValueOpts, } from '../../base/common/observable.js';
import { OffsetRange } from '../common/core/offsetRange.js';
import { Position } from '../common/core/position.js';
import { Selection } from '../common/core/selection.js';
import { Point } from './point.js';
/**
 * Returns a facade for the code editor that provides observables for various states/events.
 */
export function observableCodeEditor(editor) {
    return ObservableCodeEditor.get(editor);
}
export class ObservableCodeEditor extends Disposable {
    static { this._map = new Map(); }
    /**
     * Make sure that editor is not disposed yet!
     */
    static get(editor) {
        let result = ObservableCodeEditor._map.get(editor);
        if (!result) {
            result = new ObservableCodeEditor(editor);
            ObservableCodeEditor._map.set(editor, result);
            const d = editor.onDidDispose(() => {
                const item = ObservableCodeEditor._map.get(editor);
                if (item) {
                    ObservableCodeEditor._map.delete(editor);
                    item.dispose();
                    d.dispose();
                }
            });
        }
        return result;
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._currentTransaction = new TransactionImpl(() => {
                /** @description Update editor state */
            });
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            const t = this._currentTransaction;
            this._currentTransaction = undefined;
            t.finish();
        }
    }
    constructor(editor) {
        super();
        this.editor = editor;
        this._updateCounter = 0;
        this._currentTransaction = undefined;
        this._model = observableValue(this, this.editor.getModel());
        this.model = this._model;
        this.isReadonly = observableFromEvent(this, this.editor.onDidChangeConfiguration, () => this.editor.getOption(96 /* EditorOption.readOnly */));
        this._versionId = observableValueOpts({ owner: this, lazy: true }, this.editor.getModel()?.getVersionId() ?? null);
        this.versionId = this._versionId;
        this._selections = observableValueOpts({ owner: this, equalsFn: equalsIfDefined(itemsEquals(Selection.selectionsEqual)), lazy: true }, this.editor.getSelections() ?? null);
        this.selections = this._selections;
        this.positions = derivedOpts({ owner: this, equalsFn: equalsIfDefined(itemsEquals(Position.equals)) }, (reader) => this.selections.read(reader)?.map((s) => s.getStartPosition()) ?? null);
        this.isFocused = observableFromEvent(this, (e) => {
            const d1 = this.editor.onDidFocusEditorWidget(e);
            const d2 = this.editor.onDidBlurEditorWidget(e);
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                },
            };
        }, () => this.editor.hasWidgetFocus());
        this.isTextFocused = observableFromEvent(this, (e) => {
            const d1 = this.editor.onDidFocusEditorText(e);
            const d2 = this.editor.onDidBlurEditorText(e);
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                },
            };
        }, () => this.editor.hasTextFocus());
        this.inComposition = observableFromEvent(this, (e) => {
            const d1 = this.editor.onDidCompositionStart(() => {
                e(undefined);
            });
            const d2 = this.editor.onDidCompositionEnd(() => {
                e(undefined);
            });
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                },
            };
        }, () => this.editor.inComposition);
        this.value = derivedWithSetter(this, (reader) => {
            this.versionId.read(reader);
            return this.model.read(reader)?.getValue() ?? '';
        }, (value, tx) => {
            const model = this.model.get();
            if (model !== null) {
                if (value !== model.getValue()) {
                    model.setValue(value);
                }
            }
        });
        this.valueIsEmpty = derived(this, (reader) => {
            this.versionId.read(reader);
            return this.editor.getModel()?.getValueLength() === 0;
        });
        this.cursorSelection = derivedOpts({ owner: this, equalsFn: equalsIfDefined(Selection.selectionsEqual) }, (reader) => this.selections.read(reader)?.[0] ?? null);
        this.cursorPosition = derivedOpts({ owner: this, equalsFn: Position.equals }, (reader) => this.selections.read(reader)?.[0]?.getPosition() ?? null);
        this.cursorLineNumber = derived(this, (reader) => this.cursorPosition.read(reader)?.lineNumber ?? null);
        this.onDidType = observableSignal(this);
        this.onDidPaste = observableSignal(this);
        this.scrollTop = observableFromEvent(this.editor.onDidScrollChange, () => this.editor.getScrollTop());
        this.scrollLeft = observableFromEvent(this.editor.onDidScrollChange, () => this.editor.getScrollLeft());
        this.layoutInfo = observableFromEvent(this.editor.onDidLayoutChange, () => this.editor.getLayoutInfo());
        this.layoutInfoContentLeft = this.layoutInfo.map((l) => l.contentLeft);
        this.layoutInfoDecorationsLeft = this.layoutInfo.map((l) => l.decorationsLeft);
        this.layoutInfoWidth = this.layoutInfo.map((l) => l.width);
        this.layoutInfoMinimap = this.layoutInfo.map((l) => l.minimap);
        this.layoutInfoVerticalScrollbarWidth = this.layoutInfo.map((l) => l.verticalScrollbarWidth);
        this.contentWidth = observableFromEvent(this.editor.onDidContentSizeChange, () => this.editor.getContentWidth());
        this._widgetCounter = 0;
        this.openedPeekWidgets = observableValue(this, 0);
        this._register(this.editor.onBeginUpdate(() => this._beginUpdate()));
        this._register(this.editor.onEndUpdate(() => this._endUpdate()));
        this._register(this.editor.onDidChangeModel(() => {
            this._beginUpdate();
            try {
                this._model.set(this.editor.getModel(), this._currentTransaction);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidType((e) => {
            this._beginUpdate();
            try {
                this._forceUpdate();
                this.onDidType.trigger(this._currentTransaction, e);
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidPaste((e) => {
            this._beginUpdate();
            try {
                this._forceUpdate();
                this.onDidPaste.trigger(this._currentTransaction, e);
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidChangeModelContent((e) => {
            this._beginUpdate();
            try {
                this._versionId.set(this.editor.getModel()?.getVersionId() ?? null, this._currentTransaction, e);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidChangeCursorSelection((e) => {
            this._beginUpdate();
            try {
                this._selections.set(this.editor.getSelections(), this._currentTransaction, e);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
    }
    forceUpdate(cb) {
        this._beginUpdate();
        try {
            this._forceUpdate();
            if (!cb) {
                return undefined;
            }
            return cb(this._currentTransaction);
        }
        finally {
            this._endUpdate();
        }
    }
    _forceUpdate() {
        this._beginUpdate();
        try {
            this._model.set(this.editor.getModel(), this._currentTransaction);
            this._versionId.set(this.editor.getModel()?.getVersionId() ?? null, this._currentTransaction, undefined);
            this._selections.set(this.editor.getSelections(), this._currentTransaction, undefined);
        }
        finally {
            this._endUpdate();
        }
    }
    getOption(id) {
        return observableFromEvent(this, (cb) => this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(id)) {
                cb(undefined);
            }
        }), () => this.editor.getOption(id));
    }
    setDecorations(decorations) {
        const d = new DisposableStore();
        const decorationsCollection = this.editor.createDecorationsCollection();
        d.add(autorunOpts({ owner: this, debugName: () => `Apply decorations from ${decorations.debugName}` }, (reader) => {
            const d = decorations.read(reader);
            decorationsCollection.set(d);
        }));
        d.add({
            dispose: () => {
                decorationsCollection.clear();
            },
        });
        return d;
    }
    createOverlayWidget(widget) {
        const overlayWidgetId = 'observableOverlayWidget' + this._widgetCounter++;
        const w = {
            getDomNode: () => widget.domNode,
            getPosition: () => widget.position.get(),
            getId: () => overlayWidgetId,
            allowEditorOverflow: widget.allowEditorOverflow,
            getMinContentWidthInPx: () => widget.minContentWidthInPx.get(),
        };
        this.editor.addOverlayWidget(w);
        const d = autorun((reader) => {
            widget.position.read(reader);
            widget.minContentWidthInPx.read(reader);
            this.editor.layoutOverlayWidget(w);
        });
        return toDisposable(() => {
            d.dispose();
            this.editor.removeOverlayWidget(w);
        });
    }
    createContentWidget(widget) {
        const contentWidgetId = 'observableContentWidget' + this._widgetCounter++;
        const w = {
            getDomNode: () => widget.domNode,
            getPosition: () => widget.position.get(),
            getId: () => contentWidgetId,
            allowEditorOverflow: widget.allowEditorOverflow,
        };
        this.editor.addContentWidget(w);
        const d = autorun((reader) => {
            widget.position.read(reader);
            this.editor.layoutContentWidget(w);
        });
        return toDisposable(() => {
            d.dispose();
            this.editor.removeContentWidget(w);
        });
    }
    observeLineOffsetRange(lineRange, store) {
        const start = this.observePosition(lineRange.map((r) => new Position(r.startLineNumber, 1)), store);
        const end = this.observePosition(lineRange.map((r) => new Position(r.endLineNumberExclusive + 1, 1)), store);
        return derived((reader) => {
            start.read(reader);
            end.read(reader);
            const range = lineRange.read(reader);
            const lineCount = this.model.read(reader)?.getLineCount();
            const s = (typeof lineCount !== 'undefined' && range.startLineNumber > lineCount
                ? this.editor.getBottomForLineNumber(lineCount)
                : this.editor.getTopForLineNumber(range.startLineNumber)) - this.scrollTop.read(reader);
            const e = range.isEmpty
                ? s
                : this.editor.getBottomForLineNumber(range.endLineNumberExclusive - 1) -
                    this.scrollTop.read(reader);
            return new OffsetRange(s, e);
        });
    }
    observePosition(position, store) {
        let pos = position.get();
        const result = observableValueOpts({
            owner: this,
            debugName: () => `topLeftOfPosition${pos?.toString()}`,
            equalsFn: equalsIfDefined(Point.equals),
        }, new Point(0, 0));
        const contentWidgetId = `observablePositionWidget` + this._widgetCounter++;
        const domNode = document.createElement('div');
        const w = {
            getDomNode: () => domNode,
            getPosition: () => {
                return pos
                    ? { preference: [0 /* ContentWidgetPositionPreference.EXACT */], position: position.get() }
                    : null;
            },
            getId: () => contentWidgetId,
            allowEditorOverflow: false,
            afterRender: (position, coordinate) => {
                const model = this._model.get();
                if (model && pos && pos.lineNumber > model.getLineCount()) {
                    // the position is after the last line
                    result.set(new Point(0, this.editor.getBottomForLineNumber(model.getLineCount()) - this.scrollTop.get()), undefined);
                }
                else {
                    result.set(coordinate ? new Point(coordinate.left, coordinate.top) : null, undefined);
                }
            },
        };
        this.editor.addContentWidget(w);
        store.add(autorun((reader) => {
            pos = position.read(reader);
            this.editor.layoutContentWidget(w);
        }));
        store.add(toDisposable(() => {
            this.editor.removeContentWidget(w);
        }));
        return result;
    }
    isTargetHovered(predicate, store) {
        const isHovered = observableValue('isInjectedTextHovered', false);
        store.add(this.editor.onMouseMove((e) => {
            const val = predicate(e);
            isHovered.set(val, undefined);
        }));
        store.add(this.editor.onMouseLeave((E) => {
            isHovered.set(false, undefined);
        }));
        return isHovered;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9vYnNlcnZhYmxlQ29kZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFJTixlQUFlLEVBQ2YsT0FBTyxFQUNQLFdBQVcsRUFDWCxPQUFPLEVBQ1AsV0FBVyxFQUNYLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixtQkFBbUIsR0FDbkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQWN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRWxDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUFDLE1BQW1CO0lBQ3ZELE9BQU8sb0JBQW9CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3hDLENBQUM7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTthQUMzQixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQXFDLEFBQS9DLENBQStDO0lBRTNFOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxJQUFJLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FB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