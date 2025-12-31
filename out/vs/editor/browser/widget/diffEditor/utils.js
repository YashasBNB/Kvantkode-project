/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLast } from '../../../../base/common/arraysFind.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunOpts, autorunWithStore, observableValue, transaction, } from '../../../../base/common/observable.js';
import { ElementSizeObserver } from '../../config/elementSizeObserver.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextLength } from '../../../common/core/textLength.js';
export function joinCombine(arr1, arr2, keySelector, combine) {
    if (arr1.length === 0) {
        return arr2;
    }
    if (arr2.length === 0) {
        return arr1;
    }
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const val1 = arr1[i];
        const val2 = arr2[j];
        const key1 = keySelector(val1);
        const key2 = keySelector(val2);
        if (key1 < key2) {
            result.push(val1);
            i++;
        }
        else if (key1 > key2) {
            result.push(val2);
            j++;
        }
        else {
            result.push(combine(val1, val2));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i]);
        i++;
    }
    while (j < arr2.length) {
        result.push(arr2[j]);
        j++;
    }
    return result;
}
// TODO make utility
export function applyObservableDecorations(editor, decorations) {
    const d = new DisposableStore();
    const decorationsCollection = editor.createDecorationsCollection();
    d.add(autorunOpts({ debugName: () => `Apply decorations from ${decorations.debugName}` }, (reader) => {
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
export function appendRemoveOnDispose(parent, child) {
    parent.appendChild(child);
    return toDisposable(() => {
        child.remove();
    });
}
export function prependRemoveOnDispose(parent, child) {
    parent.prepend(child);
    return toDisposable(() => {
        child.remove();
    });
}
export class ObservableElementSizeObserver extends Disposable {
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get automaticLayout() {
        return this._automaticLayout;
    }
    constructor(element, dimension) {
        super();
        this._automaticLayout = false;
        this.elementSizeObserver = this._register(new ElementSizeObserver(element, dimension));
        this._width = observableValue(this, this.elementSizeObserver.getWidth());
        this._height = observableValue(this, this.elementSizeObserver.getHeight());
        this._register(this.elementSizeObserver.onDidChange((e) => transaction((tx) => {
            /** @description Set width/height from elementSizeObserver */
            this._width.set(this.elementSizeObserver.getWidth(), tx);
            this._height.set(this.elementSizeObserver.getHeight(), tx);
        })));
    }
    observe(dimension) {
        this.elementSizeObserver.observe(dimension);
    }
    setAutomaticLayout(automaticLayout) {
        this._automaticLayout = automaticLayout;
        if (automaticLayout) {
            this.elementSizeObserver.startObserving();
        }
        else {
            this.elementSizeObserver.stopObserving();
        }
    }
}
export function animatedObservable(targetWindow, base, store) {
    let targetVal = base.get();
    let startVal = targetVal;
    let curVal = targetVal;
    const result = observableValue('animatedValue', targetVal);
    let animationStartMs = -1;
    const durationMs = 300;
    let animationFrame = undefined;
    store.add(autorunHandleChanges({
        createEmptyChangeSummary: () => ({ animate: false }),
        handleChange: (ctx, s) => {
            if (ctx.didChange(base)) {
                s.animate = s.animate || ctx.change;
            }
            return true;
        },
    }, (reader, s) => {
        /** @description update value */
        if (animationFrame !== undefined) {
            targetWindow.cancelAnimationFrame(animationFrame);
            animationFrame = undefined;
        }
        startVal = curVal;
        targetVal = base.read(reader);
        animationStartMs = Date.now() - (s.animate ? 0 : durationMs);
        update();
    }));
    function update() {
        const passedMs = Date.now() - animationStartMs;
        curVal = Math.floor(easeOutExpo(passedMs, startVal, targetVal - startVal, durationMs));
        if (passedMs < durationMs) {
            animationFrame = targetWindow.requestAnimationFrame(update);
        }
        else {
            curVal = targetVal;
        }
        result.set(curVal, undefined);
    }
    return result;
}
function easeOutExpo(t, b, c, d) {
    return t === d ? b + c : c * (-Math.pow(2, (-10 * t) / d) + 1) + b;
}
export function deepMerge(source1, source2) {
    const result = {};
    for (const key in source1) {
        result[key] = source1[key];
    }
    for (const key in source2) {
        const source2Value = source2[key];
        if (typeof result[key] === 'object' && source2Value && typeof source2Value === 'object') {
            result[key] = deepMerge(result[key], source2Value);
        }
        else {
            result[key] = source2Value;
        }
    }
    return result;
}
export class ViewZoneOverlayWidget extends Disposable {
    constructor(editor, viewZone, htmlElement) {
        super();
        this._register(new ManagedOverlayWidget(editor, htmlElement));
        this._register(applyStyle(htmlElement, {
            height: viewZone.actualHeight,
            top: viewZone.actualTop,
        }));
    }
}
export class PlaceholderViewZone {
    get afterLineNumber() {
        return this._afterLineNumber.get();
    }
    constructor(_afterLineNumber, heightInPx) {
        this._afterLineNumber = _afterLineNumber;
        this.heightInPx = heightInPx;
        this.domNode = document.createElement('div');
        this._actualTop = observableValue(this, undefined);
        this._actualHeight = observableValue(this, undefined);
        this.actualTop = this._actualTop;
        this.actualHeight = this._actualHeight;
        this.showInHiddenAreas = true;
        this.onChange = this._afterLineNumber;
        this.onDomNodeTop = (top) => {
            this._actualTop.set(top, undefined);
        };
        this.onComputedHeight = (height) => {
            this._actualHeight.set(height, undefined);
        };
    }
}
export class ManagedOverlayWidget {
    static { this._counter = 0; }
    constructor(_editor, _domElement) {
        this._editor = _editor;
        this._domElement = _domElement;
        this._overlayWidgetId = `managedOverlayWidget-${ManagedOverlayWidget._counter++}`;
        this._overlayWidget = {
            getId: () => this._overlayWidgetId,
            getDomNode: () => this._domElement,
            getPosition: () => null,
        };
        this._editor.addOverlayWidget(this._overlayWidget);
    }
    dispose() {
        this._editor.removeOverlayWidget(this._overlayWidget);
    }
}
export function applyStyle(domNode, style) {
    return autorun((reader) => {
        /** @description applyStyle */
        for (let [key, val] of Object.entries(style)) {
            if (val && typeof val === 'object' && 'read' in val) {
                val = val.read(reader);
            }
            if (typeof val === 'number') {
                val = `${val}px`;
            }
            key = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
            domNode.style[key] = val;
        }
    });
}
export function applyViewZones(editor, viewZones, setIsUpdating, zoneIds) {
    const store = new DisposableStore();
    const lastViewZoneIds = [];
    store.add(autorunWithStore((reader, store) => {
        /** @description applyViewZones */
        const curViewZones = viewZones.read(reader);
        const viewZonIdsPerViewZone = new Map();
        const viewZoneIdPerOnChangeObservable = new Map();
        // Add/remove view zones
        if (setIsUpdating) {
            setIsUpdating(true);
        }
        editor.changeViewZones((a) => {
            for (const id of lastViewZoneIds) {
                a.removeZone(id);
                zoneIds?.delete(id);
            }
            lastViewZoneIds.length = 0;
            for (const z of curViewZones) {
                const id = a.addZone(z);
                if (z.setZoneId) {
                    z.setZoneId(id);
                }
                lastViewZoneIds.push(id);
                zoneIds?.add(id);
                viewZonIdsPerViewZone.set(z, id);
            }
        });
        if (setIsUpdating) {
            setIsUpdating(false);
        }
        // Layout zone on change
        store.add(autorunHandleChanges({
            createEmptyChangeSummary() {
                return { zoneIds: [] };
            },
            handleChange(context, changeSummary) {
                const id = viewZoneIdPerOnChangeObservable.get(context.changedObservable);
                if (id !== undefined) {
                    changeSummary.zoneIds.push(id);
                }
                return true;
            },
        }, (reader, changeSummary) => {
            /** @description layoutZone on change */
            for (const vz of curViewZones) {
                if (vz.onChange) {
                    viewZoneIdPerOnChangeObservable.set(vz.onChange, viewZonIdsPerViewZone.get(vz));
                    vz.onChange.read(reader);
                }
            }
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones((a) => {
                for (const id of changeSummary.zoneIds) {
                    a.layoutZone(id);
                }
            });
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        }));
    }));
    store.add({
        dispose() {
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones((a) => {
                for (const id of lastViewZoneIds) {
                    a.removeZone(id);
                }
            });
            zoneIds?.clear();
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        },
    });
    return store;
}
export class DisposableCancellationTokenSource extends CancellationTokenSource {
    dispose() {
        super.dispose(true);
    }
}
export function translatePosition(posInOriginal, mappings) {
    const mapping = findLast(mappings, (m) => m.original.startLineNumber <= posInOriginal.lineNumber);
    if (!mapping) {
        // No changes before the position
        return Range.fromPositions(posInOriginal);
    }
    if (mapping.original.endLineNumberExclusive <= posInOriginal.lineNumber) {
        const newLineNumber = posInOriginal.lineNumber -
            mapping.original.endLineNumberExclusive +
            mapping.modified.endLineNumberExclusive;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (!mapping.innerChanges) {
        // Only for legacy algorithm
        return Range.fromPositions(new Position(mapping.modified.startLineNumber, 1));
    }
    const innerMapping = findLast(mapping.innerChanges, (m) => m.originalRange.getStartPosition().isBeforeOrEqual(posInOriginal));
    if (!innerMapping) {
        const newLineNumber = posInOriginal.lineNumber - mapping.original.startLineNumber + mapping.modified.startLineNumber;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (innerMapping.originalRange.containsPosition(posInOriginal)) {
        return innerMapping.modifiedRange;
    }
    else {
        const l = lengthBetweenPositions(innerMapping.originalRange.getEndPosition(), posInOriginal);
        return Range.fromPositions(l.addToPosition(innerMapping.modifiedRange.getEndPosition()));
    }
}
function lengthBetweenPositions(position1, position2) {
    if (position1.lineNumber === position2.lineNumber) {
        return new TextLength(0, position2.column - position1.column);
    }
    else {
        return new TextLength(position2.lineNumber - position1.lineNumber, position2.column - 1);
    }
}
export function filterWithPrevious(arr, filter) {
    let prev;
    return arr.filter((cur) => {
        const result = filter(cur, prev);
        prev = cur;
        return result;
    });
}
export class RefCounted {
    static create(value, debugOwner = undefined) {
        return new BaseRefCounted(value, value, debugOwner);
    }
    static createWithDisposable(value, disposable, debugOwner = undefined) {
        const store = new DisposableStore();
        store.add(disposable);
        store.add(value);
        return new BaseRefCounted(value, store, debugOwner);
    }
    static createOfNonDisposable(value, disposable, debugOwner = undefined) {
        return new BaseRefCounted(value, disposable, debugOwner);
    }
}
class BaseRefCounted extends RefCounted {
    constructor(object, _disposable, _debugOwner) {
        super();
        this.object = object;
        this._disposable = _disposable;
        this._debugOwner = _debugOwner;
        this._refCount = 1;
        this._isDisposed = false;
        this._owners = [];
        if (_debugOwner) {
            this._addOwner(_debugOwner);
        }
    }
    _addOwner(debugOwner) {
        if (debugOwner) {
            this._owners.push(debugOwner);
        }
    }
    createNewRef(debugOwner) {
        this._refCount++;
        if (debugOwner) {
            this._addOwner(debugOwner);
        }
        return new ClonedRefCounted(this, debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._decreaseRefCount(this._debugOwner);
    }
    _decreaseRefCount(debugOwner) {
        this._refCount--;
        if (this._refCount === 0) {
            this._disposable.dispose();
        }
        if (debugOwner) {
            const idx = this._owners.indexOf(debugOwner);
            if (idx !== -1) {
                this._owners.splice(idx, 1);
            }
        }
    }
}
class ClonedRefCounted extends RefCounted {
    constructor(_base, _debugOwner) {
        super();
        this._base = _base;
        this._debugOwner = _debugOwner;
        this._isDisposed = false;
    }
    get object() {
        return this._base.object;
    }
    createNewRef(debugOwner) {
        return this._base.createNewRef(debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._base._decreaseRefCount(this._debugOwner);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBR2YsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUlOLE9BQU8sRUFDUCxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFL0QsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsSUFBa0IsRUFDbEIsSUFBa0IsRUFDbEIsV0FBK0IsRUFDL0IsT0FBNEI7SUFFNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUE7SUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1Qs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