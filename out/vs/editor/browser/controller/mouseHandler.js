/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { StandardWheelEvent } from '../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { HitTestContext, MouseTarget, MouseTargetFactory, } from './mouseTarget.js';
import { ClientCoordinates, EditorMouseEvent, EditorMouseEventFactory, GlobalEditorPointerMoveMonitor, createEditorPagePosition, createCoordinatesRelativeToEditor, PageCoordinates, } from '../editorDom.js';
import { EditorZoom } from '../../common/config/editorZoom.js';
import { Position } from '../../common/core/position.js';
import { Selection } from '../../common/core/selection.js';
import { ViewEventHandler } from '../../common/viewEventHandler.js';
import { MouseWheelClassifier } from '../../../base/browser/ui/scrollbar/scrollableElement.js';
export class MouseHandler extends ViewEventHandler {
    constructor(context, viewController, viewHelper) {
        super();
        this._mouseLeaveMonitor = null;
        this._context = context;
        this.viewController = viewController;
        this.viewHelper = viewHelper;
        this.mouseTargetFactory = new MouseTargetFactory(this._context, viewHelper);
        this._mouseDownOperation = this._register(new MouseDownOperation(this._context, this.viewController, this.viewHelper, this.mouseTargetFactory, (e, testEventTarget) => this._createMouseTarget(e, testEventTarget), (e) => this._getMouseColumn(e)));
        this.lastMouseLeaveTime = -1;
        this._height = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height;
        const mouseEvents = new EditorMouseEventFactory(this.viewHelper.viewDomNode);
        this._register(mouseEvents.onContextMenu(this.viewHelper.viewDomNode, (e) => this._onContextMenu(e, true)));
        this._register(mouseEvents.onMouseMove(this.viewHelper.viewDomNode, (e) => {
            this._onMouseMove(e);
            // See https://github.com/microsoft/vscode/issues/138789
            // When moving the mouse really quickly, the browser sometimes forgets to
            // send us a `mouseleave` or `mouseout` event. We therefore install here
            // a global `mousemove` listener to manually recover if the mouse goes outside
            // the editor. As soon as the mouse leaves outside of the editor, we
            // remove this listener
            if (!this._mouseLeaveMonitor) {
                this._mouseLeaveMonitor = dom.addDisposableListener(this.viewHelper.viewDomNode.ownerDocument, 'mousemove', (e) => {
                    if (!this.viewHelper.viewDomNode.contains(e.target)) {
                        // went outside the editor!
                        this._onMouseLeave(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode));
                    }
                });
            }
        }));
        this._register(mouseEvents.onMouseUp(this.viewHelper.viewDomNode, (e) => this._onMouseUp(e)));
        this._register(mouseEvents.onMouseLeave(this.viewHelper.viewDomNode, (e) => this._onMouseLeave(e)));
        // `pointerdown` events can't be used to determine if there's a double click, or triple click
        // because their `e.detail` is always 0.
        // We will therefore save the pointer id for the mouse and then reuse it in the `mousedown` event
        // for `element.setPointerCapture`.
        let capturePointerId = 0;
        this._register(mouseEvents.onPointerDown(this.viewHelper.viewDomNode, (e, pointerId) => {
            capturePointerId = pointerId;
        }));
        // The `pointerup` listener registered by `GlobalEditorPointerMoveMonitor` does not get invoked 100% of the times.
        // I speculate that this is because the `pointerup` listener is only registered during the `mousedown` event, and perhaps
        // the `pointerup` event is already queued for dispatching, which makes it that the new listener doesn't get fired.
        // See https://github.com/microsoft/vscode/issues/146486 for repro steps.
        // To compensate for that, we simply register here a `pointerup` listener and just communicate it.
        this._register(dom.addDisposableListener(this.viewHelper.viewDomNode, dom.EventType.POINTER_UP, (e) => {
            this._mouseDownOperation.onPointerUp();
        }));
        this._register(mouseEvents.onMouseDown(this.viewHelper.viewDomNode, (e) => this._onMouseDown(e, capturePointerId)));
        this._setupMouseWheelZoomListener();
        this._context.addEventHandler(this);
    }
    _setupMouseWheelZoomListener() {
        const classifier = MouseWheelClassifier.INSTANCE;
        let prevMouseWheelTime = 0;
        let gestureStartZoomLevel = EditorZoom.getZoomLevel();
        let gestureHasZoomModifiers = false;
        let gestureAccumulatedDelta = 0;
        const onMouseWheel = (browserEvent) => {
            this.viewController.emitMouseWheel(browserEvent);
            if (!this._context.configuration.options.get(77 /* EditorOption.mouseWheelZoom */)) {
                return;
            }
            const e = new StandardWheelEvent(browserEvent);
            classifier.acceptStandardWheelEvent(e);
            if (classifier.isPhysicalMouseWheel()) {
                if (hasMouseWheelZoomModifiers(browserEvent)) {
                    const zoomLevel = EditorZoom.getZoomLevel();
                    const delta = e.deltaY > 0 ? 1 : -1;
                    EditorZoom.setZoomLevel(zoomLevel + delta);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            else {
                // we consider mousewheel events that occur within 50ms of each other to be part of the same gesture
                // we don't want to consider mouse wheel events where ctrl/cmd is pressed during the inertia phase
                // we also want to accumulate deltaY values from the same gesture and use that to set the zoom level
                if (Date.now() - prevMouseWheelTime > 50) {
                    // reset if more than 50ms have passed
                    gestureStartZoomLevel = EditorZoom.getZoomLevel();
                    gestureHasZoomModifiers = hasMouseWheelZoomModifiers(browserEvent);
                    gestureAccumulatedDelta = 0;
                }
                prevMouseWheelTime = Date.now();
                gestureAccumulatedDelta += e.deltaY;
                if (gestureHasZoomModifiers) {
                    EditorZoom.setZoomLevel(gestureStartZoomLevel + gestureAccumulatedDelta / 5);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        this._register(dom.addDisposableListener(this.viewHelper.viewDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { capture: true, passive: false }));
        function hasMouseWheelZoomModifiers(browserEvent) {
            return platform.isMacintosh
                ? // on macOS we support cmd + two fingers scroll (`metaKey` set)
                    // and also the two fingers pinch gesture (`ctrKey` set)
                    (browserEvent.metaKey || browserEvent.ctrlKey) &&
                        !browserEvent.shiftKey &&
                        !browserEvent.altKey
                : browserEvent.ctrlKey &&
                    !browserEvent.metaKey &&
                    !browserEvent.shiftKey &&
                    !browserEvent.altKey;
        }
    }
    dispose() {
        this._context.removeEventHandler(this);
        if (this._mouseLeaveMonitor) {
            this._mouseLeaveMonitor.dispose();
            this._mouseLeaveMonitor = null;
        }
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            // layout change
            const height = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height;
            if (this._height !== height) {
                this._height = height;
                this._mouseDownOperation.onHeightChanged();
            }
        }
        return false;
    }
    onCursorStateChanged(e) {
        this._mouseDownOperation.onCursorStateChanged(e);
        return false;
    }
    onFocusChanged(e) {
        return false;
    }
    // --- end event handlers
    getTargetAtClientPoint(clientX, clientY) {
        const clientPos = new ClientCoordinates(clientX, clientY);
        const pos = clientPos.toPageCoordinates(dom.getWindow(this.viewHelper.viewDomNode));
        const editorPos = createEditorPagePosition(this.viewHelper.viewDomNode);
        if (pos.y < editorPos.y ||
            pos.y > editorPos.y + editorPos.height ||
            pos.x < editorPos.x ||
            pos.x > editorPos.x + editorPos.width) {
            return null;
        }
        const relativePos = createCoordinatesRelativeToEditor(this.viewHelper.viewDomNode, editorPos, pos);
        return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), editorPos, pos, relativePos, null);
    }
    _createMouseTarget(e, testEventTarget) {
        let target = e.target;
        if (!this.viewHelper.viewDomNode.contains(target)) {
            const shadowRoot = dom.getShadowRoot(this.viewHelper.viewDomNode);
            if (shadowRoot) {
                target = shadowRoot
                    .elementsFromPoint(e.posx, e.posy)
                    .find((el) => this.viewHelper.viewDomNode.contains(el));
            }
        }
        return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), e.editorPos, e.pos, e.relativePos, testEventTarget ? target : null);
    }
    _getMouseColumn(e) {
        return this.mouseTargetFactory.getMouseColumn(e.relativePos);
    }
    _onContextMenu(e, testEventTarget) {
        this.viewController.emitContextMenu({
            event: e,
            target: this._createMouseTarget(e, testEventTarget),
        });
    }
    _onMouseMove(e) {
        const targetIsWidget = this.mouseTargetFactory.mouseTargetIsWidget(e);
        if (!targetIsWidget) {
            e.preventDefault();
        }
        if (this._mouseDownOperation.isActive()) {
            // In selection/drag operation
            return;
        }
        const actualMouseMoveTime = e.timestamp;
        if (actualMouseMoveTime < this.lastMouseLeaveTime) {
            // Due to throttling, this event occurred before the mouse left the editor, therefore ignore it.
            return;
        }
        this.viewController.emitMouseMove({
            event: e,
            target: this._createMouseTarget(e, true),
        });
    }
    _onMouseLeave(e) {
        if (this._mouseLeaveMonitor) {
            this._mouseLeaveMonitor.dispose();
            this._mouseLeaveMonitor = null;
        }
        this.lastMouseLeaveTime = new Date().getTime();
        this.viewController.emitMouseLeave({
            event: e,
            target: null,
        });
    }
    _onMouseUp(e) {
        this.viewController.emitMouseUp({
            event: e,
            target: this._createMouseTarget(e, true),
        });
    }
    _onMouseDown(e, pointerId) {
        const t = this._createMouseTarget(e, true);
        const targetIsContent = t.type === 6 /* MouseTargetType.CONTENT_TEXT */ || t.type === 7 /* MouseTargetType.CONTENT_EMPTY */;
        const targetIsGutter = t.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
            t.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ ||
            t.type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */;
        const targetIsLineNumbers = t.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */;
        const selectOnLineNumbers = this._context.configuration.options.get(114 /* EditorOption.selectOnLineNumbers */);
        const targetIsViewZone = t.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ || t.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */;
        const targetIsWidget = t.type === 9 /* MouseTargetType.CONTENT_WIDGET */;
        let shouldHandle = e.leftButton || e.middleButton;
        if (platform.isMacintosh && e.leftButton && e.ctrlKey) {
            shouldHandle = false;
        }
        const focus = () => {
            e.preventDefault();
            this.viewHelper.focusTextArea();
        };
        if (shouldHandle && (targetIsContent || (targetIsLineNumbers && selectOnLineNumbers))) {
            focus();
            this._mouseDownOperation.start(t.type, e, pointerId);
        }
        else if (targetIsGutter) {
            // Do not steal focus
            e.preventDefault();
        }
        else if (targetIsViewZone) {
            const viewZoneData = t.detail;
            if (shouldHandle &&
                this.viewHelper.shouldSuppressMouseDownOnViewZone(viewZoneData.viewZoneId)) {
                focus();
                this._mouseDownOperation.start(t.type, e, pointerId);
                e.preventDefault();
            }
        }
        else if (targetIsWidget &&
            this.viewHelper.shouldSuppressMouseDownOnWidget(t.detail)) {
            focus();
            e.preventDefault();
        }
        this.viewController.emitMouseDown({
            event: e,
            target: t,
        });
    }
    _onMouseWheel(e) {
        this.viewController.emitMouseWheel(e);
    }
}
class MouseDownOperation extends Disposable {
    constructor(_context, _viewController, _viewHelper, _mouseTargetFactory, createMouseTarget, getMouseColumn) {
        super();
        this._context = _context;
        this._viewController = _viewController;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._createMouseTarget = createMouseTarget;
        this._getMouseColumn = getMouseColumn;
        this._mouseMoveMonitor = this._register(new GlobalEditorPointerMoveMonitor(this._viewHelper.viewDomNode));
        this._topBottomDragScrolling = this._register(new TopBottomDragScrolling(this._context, this._viewHelper, this._mouseTargetFactory, (position, inSelectionMode, revealType) => this._dispatchMouse(position, inSelectionMode, revealType)));
        this._mouseState = new MouseDownState();
        this._currentSelection = new Selection(1, 1, 1, 1);
        this._isActive = false;
        this._lastMouseEvent = null;
    }
    dispose() {
        super.dispose();
    }
    isActive() {
        return this._isActive;
    }
    _onMouseDownThenMove(e) {
        this._lastMouseEvent = e;
        this._mouseState.setModifiers(e);
        const position = this._findMousePosition(e, false);
        if (!position) {
            // Ignoring because position is unknown
            return;
        }
        if (this._mouseState.isDragAndDrop) {
            this._viewController.emitMouseDrag({
                event: e,
                target: position,
            });
        }
        else {
            if (position.type === 13 /* MouseTargetType.OUTSIDE_EDITOR */ &&
                (position.outsidePosition === 'above' || position.outsidePosition === 'below')) {
                this._topBottomDragScrolling.start(position, e);
            }
            else {
                this._topBottomDragScrolling.stop();
                this._dispatchMouse(position, true, 1 /* NavigationCommandRevealType.Minimal */);
            }
        }
    }
    start(targetType, e, pointerId) {
        this._lastMouseEvent = e;
        this._mouseState.setStartedOnLineNumbers(targetType === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */);
        this._mouseState.setStartButtons(e);
        this._mouseState.setModifiers(e);
        const position = this._findMousePosition(e, true);
        if (!position || !position.position) {
            // Ignoring because position is unknown
            return;
        }
        this._mouseState.trySetCount(e.detail, position.position);
        // Overwrite the detail of the MouseEvent, as it will be sent out in an event and contributions might rely on it.
        e.detail = this._mouseState.count;
        const options = this._context.configuration.options;
        if (!options.get(96 /* EditorOption.readOnly */) &&
            options.get(35 /* EditorOption.dragAndDrop */) &&
            !options.get(22 /* EditorOption.columnSelection */) &&
            !this._mouseState.altKey && // we don't support multiple mouse
            e.detail < 2 && // only single click on a selection can work
            !this._isActive && // the mouse is not down yet
            !this._currentSelection.isEmpty() && // we don't drag single cursor
            position.type === 6 /* MouseTargetType.CONTENT_TEXT */ && // single click on text
            position.position &&
            this._currentSelection.containsPosition(position.position) // single click on a selection
        ) {
            this._mouseState.isDragAndDrop = true;
            this._isActive = true;
            this._mouseMoveMonitor.startMonitoring(this._viewHelper.viewLinesDomNode, pointerId, e.buttons, (e) => this._onMouseDownThenMove(e), (browserEvent) => {
                const position = this._findMousePosition(this._lastMouseEvent, false);
                if (dom.isKeyboardEvent(browserEvent)) {
                    // cancel
                    this._viewController.emitMouseDropCanceled();
                }
                else {
                    this._viewController.emitMouseDrop({
                        event: this._lastMouseEvent,
                        target: position ? this._createMouseTarget(this._lastMouseEvent, true) : null, // Ignoring because position is unknown, e.g., Content View Zone
                    });
                }
                this._stop();
            });
            return;
        }
        this._mouseState.isDragAndDrop = false;
        this._dispatchMouse(position, e.shiftKey, 1 /* NavigationCommandRevealType.Minimal */);
        if (!this._isActive) {
            this._isActive = true;
            this._mouseMoveMonitor.startMonitoring(this._viewHelper.viewLinesDomNode, pointerId, e.buttons, (e) => this._onMouseDownThenMove(e), () => this._stop());
        }
    }
    _stop() {
        this._isActive = false;
        this._topBottomDragScrolling.stop();
    }
    onHeightChanged() {
        this._mouseMoveMonitor.stopMonitoring();
    }
    onPointerUp() {
        this._mouseMoveMonitor.stopMonitoring();
    }
    onCursorStateChanged(e) {
        this._currentSelection = e.selections[0];
    }
    _getPositionOutsideEditor(e) {
        const editorContent = e.editorPos;
        const model = this._context.viewModel;
        const viewLayout = this._context.viewLayout;
        const mouseColumn = this._getMouseColumn(e);
        if (e.posy < editorContent.y) {
            const outsideDistance = editorContent.y - e.posy;
            const verticalOffset = Math.max(viewLayout.getCurrentScrollTop() - outsideDistance, 0);
            const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
            if (viewZoneData) {
                const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
                if (newPosition) {
                    return MouseTarget.createOutsideEditor(mouseColumn, newPosition, 'above', outsideDistance);
                }
            }
            const aboveLineNumber = viewLayout.getLineNumberAtVerticalOffset(verticalOffset);
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(aboveLineNumber, 1), 'above', outsideDistance);
        }
        if (e.posy > editorContent.y + editorContent.height) {
            const outsideDistance = e.posy - editorContent.y - editorContent.height;
            const verticalOffset = viewLayout.getCurrentScrollTop() + e.relativePos.y;
            const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
            if (viewZoneData) {
                const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
                if (newPosition) {
                    return MouseTarget.createOutsideEditor(mouseColumn, newPosition, 'below', outsideDistance);
                }
            }
            const belowLineNumber = viewLayout.getLineNumberAtVerticalOffset(verticalOffset);
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(belowLineNumber, model.getLineMaxColumn(belowLineNumber)), 'below', outsideDistance);
        }
        const possibleLineNumber = viewLayout.getLineNumberAtVerticalOffset(viewLayout.getCurrentScrollTop() + e.relativePos.y);
        if (e.posx < editorContent.x) {
            const outsideDistance = editorContent.x - e.posx;
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(possibleLineNumber, 1), 'left', outsideDistance);
        }
        if (e.posx > editorContent.x + editorContent.width) {
            const outsideDistance = e.posx - editorContent.x - editorContent.width;
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(possibleLineNumber, model.getLineMaxColumn(possibleLineNumber)), 'right', outsideDistance);
        }
        return null;
    }
    _findMousePosition(e, testEventTarget) {
        const positionOutsideEditor = this._getPositionOutsideEditor(e);
        if (positionOutsideEditor) {
            return positionOutsideEditor;
        }
        const t = this._createMouseTarget(e, testEventTarget);
        const hintedPosition = t.position;
        if (!hintedPosition) {
            return null;
        }
        if (t.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ ||
            t.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
            const newPosition = this._helpPositionJumpOverViewZone(t.detail);
            if (newPosition) {
                return MouseTarget.createViewZone(t.type, t.element, t.mouseColumn, newPosition, t.detail);
            }
        }
        return t;
    }
    _helpPositionJumpOverViewZone(viewZoneData) {
        // Force position on view zones to go above or below depending on where selection started from
        const selectionStart = new Position(this._currentSelection.selectionStartLineNumber, this._currentSelection.selectionStartColumn);
        const positionBefore = viewZoneData.positionBefore;
        const positionAfter = viewZoneData.positionAfter;
        if (positionBefore && positionAfter) {
            if (positionBefore.isBefore(selectionStart)) {
                return positionBefore;
            }
            else {
                return positionAfter;
            }
        }
        return null;
    }
    _dispatchMouse(position, inSelectionMode, revealType) {
        if (!position.position) {
            return;
        }
        this._viewController.dispatchMouse({
            position: position.position,
            mouseColumn: position.mouseColumn,
            startedOnLineNumbers: this._mouseState.startedOnLineNumbers,
            revealType,
            inSelectionMode: inSelectionMode,
            mouseDownCount: this._mouseState.count,
            altKey: this._mouseState.altKey,
            ctrlKey: this._mouseState.ctrlKey,
            metaKey: this._mouseState.metaKey,
            shiftKey: this._mouseState.shiftKey,
            leftButton: this._mouseState.leftButton,
            middleButton: this._mouseState.middleButton,
            onInjectedText: position.type === 6 /* MouseTargetType.CONTENT_TEXT */ && position.detail.injectedText !== null,
        });
    }
}
class TopBottomDragScrolling extends Disposable {
    constructor(_context, _viewHelper, _mouseTargetFactory, _dispatchMouse) {
        super();
        this._context = _context;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._dispatchMouse = _dispatchMouse;
        this._operation = null;
    }
    dispose() {
        super.dispose();
        this.stop();
    }
    start(position, mouseEvent) {
        if (this._operation) {
            this._operation.setPosition(position, mouseEvent);
        }
        else {
            this._operation = new TopBottomDragScrollingOperation(this._context, this._viewHelper, this._mouseTargetFactory, this._dispatchMouse, position, mouseEvent);
        }
    }
    stop() {
        if (this._operation) {
            this._operation.dispose();
            this._operation = null;
        }
    }
}
class TopBottomDragScrollingOperation extends Disposable {
    constructor(_context, _viewHelper, _mouseTargetFactory, _dispatchMouse, position, mouseEvent) {
        super();
        this._context = _context;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._dispatchMouse = _dispatchMouse;
        this._position = position;
        this._mouseEvent = mouseEvent;
        this._lastTime = Date.now();
        this._animationFrameDisposable = dom.scheduleAtNextAnimationFrame(dom.getWindow(mouseEvent.browserEvent), () => this._execute());
    }
    dispose() {
        this._animationFrameDisposable.dispose();
        super.dispose();
    }
    setPosition(position, mouseEvent) {
        this._position = position;
        this._mouseEvent = mouseEvent;
    }
    /**
     * update internal state and return elapsed ms since last time
     */
    _tick() {
        const now = Date.now();
        const elapsed = now - this._lastTime;
        this._lastTime = now;
        return elapsed;
    }
    /**
     * get the number of lines per second to auto-scroll
     */
    _getScrollSpeed() {
        const lineHeight = this._context.configuration.options.get(68 /* EditorOption.lineHeight */);
        const viewportInLines = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height / lineHeight;
        const outsideDistanceInLines = this._position.outsideDistance / lineHeight;
        if (outsideDistanceInLines <= 1.5) {
            return Math.max(30, viewportInLines * (1 + outsideDistanceInLines));
        }
        if (outsideDistanceInLines <= 3) {
            return Math.max(60, viewportInLines * (2 + outsideDistanceInLines));
        }
        return Math.max(200, viewportInLines * (7 + outsideDistanceInLines));
    }
    _execute() {
        const lineHeight = this._context.configuration.options.get(68 /* EditorOption.lineHeight */);
        const scrollSpeedInLines = this._getScrollSpeed();
        const elapsed = this._tick();
        const scrollInPixels = scrollSpeedInLines * (elapsed / 1000) * lineHeight;
        const scrollValue = this._position.outsidePosition === 'above' ? -scrollInPixels : scrollInPixels;
        this._context.viewModel.viewLayout.deltaScrollNow(0, scrollValue);
        this._viewHelper.renderNow();
        const viewportData = this._context.viewLayout.getLinesViewportData();
        const edgeLineNumber = this._position.outsidePosition === 'above'
            ? viewportData.startLineNumber
            : viewportData.endLineNumber;
        // First, try to find a position that matches the horizontal position of the mouse
        let mouseTarget;
        {
            const editorPos = createEditorPagePosition(this._viewHelper.viewDomNode);
            const horizontalScrollbarHeight = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).horizontalScrollbarHeight;
            const pos = new PageCoordinates(this._mouseEvent.pos.x, editorPos.y + editorPos.height - horizontalScrollbarHeight - 0.1);
            const relativePos = createCoordinatesRelativeToEditor(this._viewHelper.viewDomNode, editorPos, pos);
            mouseTarget = this._mouseTargetFactory.createMouseTarget(this._viewHelper.getLastRenderData(), editorPos, pos, relativePos, null);
        }
        if (!mouseTarget.position || mouseTarget.position.lineNumber !== edgeLineNumber) {
            if (this._position.outsidePosition === 'above') {
                mouseTarget = MouseTarget.createOutsideEditor(this._position.mouseColumn, new Position(edgeLineNumber, 1), 'above', this._position.outsideDistance);
            }
            else {
                mouseTarget = MouseTarget.createOutsideEditor(this._position.mouseColumn, new Position(edgeLineNumber, this._context.viewModel.getLineMaxColumn(edgeLineNumber)), 'below', this._position.outsideDistance);
            }
        }
        this._dispatchMouse(mouseTarget, true, 2 /* NavigationCommandRevealType.None */);
        this._animationFrameDisposable = dom.scheduleAtNextAnimationFrame(dom.getWindow(mouseTarget.element), () => this._execute());
    }
}
class MouseDownState {
    static { this.CLEAR_MOUSE_DOWN_COUNT_TIME = 400; } // ms
    get altKey() {
        return this._altKey;
    }
    get ctrlKey() {
        return this._ctrlKey;
    }
    get metaKey() {
        return this._metaKey;
    }
    get shiftKey() {
        return this._shiftKey;
    }
    get leftButton() {
        return this._leftButton;
    }
    get middleButton() {
        return this._middleButton;
    }
    get startedOnLineNumbers() {
        return this._startedOnLineNumbers;
    }
    constructor() {
        this._altKey = false;
        this._ctrlKey = false;
        this._metaKey = false;
        this._shiftKey = false;
        this._leftButton = false;
        this._middleButton = false;
        this._startedOnLineNumbers = false;
        this._lastMouseDownPosition = null;
        this._lastMouseDownPositionEqualCount = 0;
        this._lastMouseDownCount = 0;
        this._lastSetMouseDownCountTime = 0;
        this.isDragAndDrop = false;
    }
    get count() {
        return this._lastMouseDownCount;
    }
    setModifiers(source) {
        this._altKey = source.altKey;
        this._ctrlKey = source.ctrlKey;
        this._metaKey = source.metaKey;
        this._shiftKey = source.shiftKey;
    }
    setStartButtons(source) {
        this._leftButton = source.leftButton;
        this._middleButton = source.middleButton;
    }
    setStartedOnLineNumbers(startedOnLineNumbers) {
        this._startedOnLineNumbers = startedOnLineNumbers;
    }
    trySetCount(setMouseDownCount, newMouseDownPosition) {
        // a. Invalidate multiple clicking if too much time has passed (will be hit by IE because the detail field of mouse events contains garbage in IE10)
        const currentTime = new Date().getTime();
        if (currentTime - this._lastSetMouseDownCountTime >
            MouseDownState.CLEAR_MOUSE_DOWN_COUNT_TIME) {
            setMouseDownCount = 1;
        }
        this._lastSetMouseDownCountTime = currentTime;
        // b. Ensure that we don't jump from single click to triple click in one go (will be hit by IE because the detail field of mouse events contains garbage in IE10)
        if (setMouseDownCount > this._lastMouseDownCount + 1) {
            setMouseDownCount = this._lastMouseDownCount + 1;
        }
        // c. Invalidate multiple clicking if the logical position is different
        if (this._lastMouseDownPosition && this._lastMouseDownPosition.equals(newMouseDownPosition)) {
            this._lastMouseDownPositionEqualCount++;
        }
        else {
            this._lastMouseDownPositionEqualCount = 1;
        }
        this._lastMouseDownPosition = newMouseDownPosition;
        // Finally set the lastMouseDownCount
        this._lastMouseDownCount = Math.min(setMouseDownCount, this._lastMouseDownPositionEqualCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9tb3VzZUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsa0JBQWtCLEVBQW9CLE1BQU0scUNBQXFDLENBQUE7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGNBQWMsRUFDZCxXQUFXLEVBQ1gsa0JBQWtCLEdBRWxCLE1BQU0sa0JBQWtCLENBQUE7QUFPekIsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsdUJBQXVCLEVBQ3ZCLDhCQUE4QixFQUM5Qix3QkFBd0IsRUFDeEIsaUNBQWlDLEVBQ2pDLGVBQWUsR0FDZixNQUFNLGlCQUFpQixDQUFBO0FBRXhCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBSTFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBa0M5RixNQUFNLE9BQU8sWUFBYSxTQUFRLGdCQUFnQjtJQVVqRCxZQUNDLE9BQW9CLEVBQ3BCLGNBQThCLEVBQzlCLFVBQWlDO1FBRWpDLEtBQUssRUFBRSxDQUFBO1FBUEEsdUJBQWtCLEdBQXVCLElBQUksQ0FBQTtRQVNwRCxJQUFJ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