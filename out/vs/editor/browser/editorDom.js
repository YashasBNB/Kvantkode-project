/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../base/browser/dom.js';
import * as domStylesheetsJs from '../../base/browser/domStylesheets.js';
import { GlobalPointerMoveMonitor } from '../../base/browser/globalPointerMoveMonitor.js';
import { StandardMouseEvent } from '../../base/browser/mouseEvent.js';
import { RunOnceScheduler } from '../../base/common/async.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { asCssVariable } from '../../platform/theme/common/colorRegistry.js';
/**
 * Coordinates relative to the whole document (e.g. mouse event's pageX and pageY)
 */
export class PageCoordinates {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this._pageCoordinatesBrand = undefined;
    }
    toClientCoordinates(targetWindow) {
        return new ClientCoordinates(this.x - targetWindow.scrollX, this.y - targetWindow.scrollY);
    }
}
/**
 * Coordinates within the application's client area (i.e. origin is document's scroll position).
 *
 * For example, clicking in the top-left corner of the client area will
 * always result in a mouse event with a client.x value of 0, regardless
 * of whether the page is scrolled horizontally.
 */
export class ClientCoordinates {
    constructor(clientX, clientY) {
        this.clientX = clientX;
        this.clientY = clientY;
        this._clientCoordinatesBrand = undefined;
    }
    toPageCoordinates(targetWindow) {
        return new PageCoordinates(this.clientX + targetWindow.scrollX, this.clientY + targetWindow.scrollY);
    }
}
/**
 * The position of the editor in the page.
 */
export class EditorPagePosition {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this._editorPagePositionBrand = undefined;
    }
}
/**
 * Coordinates relative to the (top;left) of the editor that can be used safely with other internal editor metrics.
 * **NOTE**: This position is obtained by taking page coordinates and transforming them relative to the
 * editor's (top;left) position in a way in which scale transformations are taken into account.
 * **NOTE**: These coordinates could be negative if the mouse position is outside the editor.
 */
export class CoordinatesRelativeToEditor {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this._positionRelativeToEditorBrand = undefined;
    }
}
export function createEditorPagePosition(editorViewDomNode) {
    const editorPos = dom.getDomNodePagePosition(editorViewDomNode);
    return new EditorPagePosition(editorPos.left, editorPos.top, editorPos.width, editorPos.height);
}
export function createCoordinatesRelativeToEditor(editorViewDomNode, editorPagePosition, pos) {
    // The editor's page position is read from the DOM using getBoundingClientRect().
    //
    // getBoundingClientRect() returns the actual dimensions, while offsetWidth and offsetHeight
    // reflect the unscaled size. We can use this difference to detect a transform:scale()
    // and we will apply the transformation in inverse to get mouse coordinates that make sense inside the editor.
    //
    // This could be expanded to cover rotation as well maybe by walking the DOM up from `editorViewDomNode`
    // and computing the effective transformation matrix using getComputedStyle(element).transform.
    //
    const scaleX = editorPagePosition.width / editorViewDomNode.offsetWidth;
    const scaleY = editorPagePosition.height / editorViewDomNode.offsetHeight;
    // Adjust mouse offsets if editor appears to be scaled via transforms
    const relativeX = (pos.x - editorPagePosition.x) / scaleX;
    const relativeY = (pos.y - editorPagePosition.y) / scaleY;
    return new CoordinatesRelativeToEditor(relativeX, relativeY);
}
export class EditorMouseEvent extends StandardMouseEvent {
    constructor(e, isFromPointerCapture, editorViewDomNode) {
        super(dom.getWindow(editorViewDomNode), e);
        this._editorMouseEventBrand = undefined;
        this.isFromPointerCapture = isFromPointerCapture;
        this.pos = new PageCoordinates(this.posx, this.posy);
        this.editorPos = createEditorPagePosition(editorViewDomNode);
        this.relativePos = createCoordinatesRelativeToEditor(editorViewDomNode, this.editorPos, this.pos);
    }
}
export class EditorMouseEventFactory {
    constructor(editorViewDomNode) {
        this._editorViewDomNode = editorViewDomNode;
    }
    _create(e) {
        return new EditorMouseEvent(e, false, this._editorViewDomNode);
    }
    onContextMenu(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.CONTEXT_MENU, (e) => {
            callback(this._create(e));
        });
    }
    onMouseUp(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.MOUSE_UP, (e) => {
            callback(this._create(e));
        });
    }
    onMouseDown(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.MOUSE_DOWN, (e) => {
            callback(this._create(e));
        });
    }
    onPointerDown(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.POINTER_DOWN, (e) => {
            callback(this._create(e), e.pointerId);
        });
    }
    onMouseLeave(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.MOUSE_LEAVE, (e) => {
            callback(this._create(e));
        });
    }
    onMouseMove(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.MOUSE_MOVE, (e) => callback(this._create(e)));
    }
}
export class EditorPointerEventFactory {
    constructor(editorViewDomNode) {
        this._editorViewDomNode = editorViewDomNode;
    }
    _create(e) {
        return new EditorMouseEvent(e, false, this._editorViewDomNode);
    }
    onPointerUp(target, callback) {
        return dom.addDisposableListener(target, 'pointerup', (e) => {
            callback(this._create(e));
        });
    }
    onPointerDown(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.POINTER_DOWN, (e) => {
            callback(this._create(e), e.pointerId);
        });
    }
    onPointerLeave(target, callback) {
        return dom.addDisposableListener(target, dom.EventType.POINTER_LEAVE, (e) => {
            callback(this._create(e));
        });
    }
    onPointerMove(target, callback) {
        return dom.addDisposableListener(target, 'pointermove', (e) => callback(this._create(e)));
    }
}
export class GlobalEditorPointerMoveMonitor extends Disposable {
    constructor(editorViewDomNode) {
        super();
        this._editorViewDomNode = editorViewDomNode;
        this._globalPointerMoveMonitor = this._register(new GlobalPointerMoveMonitor());
        this._keydownListener = null;
    }
    startMonitoring(initialElement, pointerId, initialButtons, pointerMoveCallback, onStopCallback) {
        // Add a <<capture>> keydown event listener that will cancel the monitoring
        // if something other than a modifier key is pressed
        this._keydownListener = dom.addStandardDisposableListener(initialElement.ownerDocument, 'keydown', (e) => {
            const chord = e.toKeyCodeChord();
            if (chord.isModifierKey()) {
                // Allow modifier keys
                return;
            }
            this._globalPointerMoveMonitor.stopMonitoring(true, e.browserEvent);
        }, true);
        this._globalPointerMoveMonitor.startMonitoring(initialElement, pointerId, initialButtons, (e) => {
            pointerMoveCallback(new EditorMouseEvent(e, true, this._editorViewDomNode));
        }, (e) => {
            this._keydownListener.dispose();
            onStopCallback(e);
        });
    }
    stopMonitoring() {
        this._globalPointerMoveMonitor.stopMonitoring(true);
    }
}
/**
 * A helper to create dynamic css rules, bound to a class name.
 * Rules are reused.
 * Reference counting and delayed garbage collection ensure that no rules leak.
 */
export class DynamicCssRules {
    static { this._idPool = 0; }
    constructor(_editor) {
        this._editor = _editor;
        this._instanceId = ++DynamicCssRules._idPool;
        this._counter = 0;
        this._rules = new Map();
        // We delay garbage collection so that hanging rules can be reused.
        this._garbageCollectionScheduler = new RunOnceScheduler(() => this.garbageCollect(), 1000);
    }
    createClassNameRef(options) {
        const rule = this.getOrCreateRule(options);
        rule.increaseRefCount();
        return {
            className: rule.className,
            dispose: () => {
                rule.decreaseRefCount();
                this._garbageCollectionScheduler.schedule();
            },
        };
    }
    getOrCreateRule(properties) {
        const key = this.computeUniqueKey(properties);
        let existingRule = this._rules.get(key);
        if (!existingRule) {
            const counter = this._counter++;
            existingRule = new RefCountedCssRule(key, `dyn-rule-${this._instanceId}-${counter}`, dom.isInShadowDOM(this._editor.getContainerDomNode())
                ? this._editor.getContainerDomNode()
                : undefined, properties);
            this._rules.set(key, existingRule);
        }
        return existingRule;
    }
    computeUniqueKey(properties) {
        return JSON.stringify(properties);
    }
    garbageCollect() {
        for (const rule of this._rules.values()) {
            if (!rule.hasReferences()) {
                this._rules.delete(rule.key);
                rule.dispose();
            }
        }
    }
}
class RefCountedCssRule {
    constructor(key, className, _containerElement, properties) {
        this.key = key;
        this.className = className;
        this.properties = properties;
        this._referenceCount = 0;
        this._styleElementDisposables = new DisposableStore();
        this._styleElement = domStylesheetsJs.createStyleSheet(_containerElement, undefined, this._styleElementDisposables);
        this._styleElement.textContent = this.getCssText(this.className, this.properties);
    }
    getCssText(className, properties) {
        let str = `.${className} {`;
        for (const prop in properties) {
            const value = properties[prop];
            let cssValue;
            if (typeof value === 'object') {
                cssValue = asCssVariable(value.id);
            }
            else {
                cssValue = value;
            }
            const cssPropName = camelToDashes(prop);
            str += `\n\t${cssPropName}: ${cssValue};`;
        }
        str += `\n}`;
        return str;
    }
    dispose() {
        this._styleElementDisposables.dispose();
        this._styleElement = undefined;
    }
    increaseRefCount() {
        this._referenceCount++;
    }
    decreaseRefCount() {
        this._referenceCount--;
    }
    hasReferences() {
        return this._referenceCount > 0;
    }
}
function camelToDashes(str) {
    return str
        .replace(/(^[A-Z])/, ([first]) => first.toLowerCase())
        .replace(/([A-Z])/g, ([letter]) => `-${letter.toLowerCase()}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZWRpdG9yRG9tLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUE7QUFDaEQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sZ0NBQWdDLENBQUE7QUFFekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRzVFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFHM0IsWUFDaUIsQ0FBUyxFQUNULENBQVM7UUFEVCxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQ1QsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUoxQiwwQkFBcUIsR0FBUyxTQUFTLENBQUE7SUFLcEMsQ0FBQztJQUVHLG1CQUFtQixDQUFDLFlBQW9CO1FBQzlDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0YsQ0FBQztDQUNEO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUc3QixZQUNpQixPQUFlLEVBQ2YsT0FBZTtRQURmLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixZQUFPLEdBQVAsT0FBTyxDQUFR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