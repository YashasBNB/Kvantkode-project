/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as dom from '../../base/browser/dom.js';
import { createFastDomNode } from '../../base/browser/fastDomNode.js';
import { inputLatency } from '../../base/browser/performance.js';
import { BugIndicatingError, onUnexpectedError } from '../../base/common/errors.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { PointerHandlerLastRenderData } from './controller/mouseTarget.js';
import { PointerHandler } from './controller/pointerHandler.js';
import { RenderingContext, } from './view/renderingContext.js';
import { ViewController } from './view/viewController.js';
import { ContentViewOverlays, MarginViewOverlays } from './view/viewOverlays.js';
import { PartFingerprints } from './view/viewPart.js';
import { ViewUserInputEvents } from './view/viewUserInputEvents.js';
import { BlockDecorations } from './viewParts/blockDecorations/blockDecorations.js';
import { ViewContentWidgets } from './viewParts/contentWidgets/contentWidgets.js';
import { CurrentLineHighlightOverlay, CurrentLineMarginHighlightOverlay, } from './viewParts/currentLineHighlight/currentLineHighlight.js';
import { DecorationsOverlay } from './viewParts/decorations/decorations.js';
import { EditorScrollbar } from './viewParts/editorScrollbar/editorScrollbar.js';
import { GlyphMarginWidgets } from './viewParts/glyphMargin/glyphMargin.js';
import { IndentGuidesOverlay } from './viewParts/indentGuides/indentGuides.js';
import { LineNumbersOverlay } from './viewParts/lineNumbers/lineNumbers.js';
import { ViewLines } from './viewParts/viewLines/viewLines.js';
import { LinesDecorationsOverlay } from './viewParts/linesDecorations/linesDecorations.js';
import { Margin } from './viewParts/margin/margin.js';
import { MarginViewLineDecorationsOverlay } from './viewParts/marginDecorations/marginDecorations.js';
import { Minimap } from './viewParts/minimap/minimap.js';
import { ViewOverlayWidgets } from './viewParts/overlayWidgets/overlayWidgets.js';
import { DecorationsOverviewRuler } from './viewParts/overviewRuler/decorationsOverviewRuler.js';
import { OverviewRuler } from './viewParts/overviewRuler/overviewRuler.js';
import { Rulers } from './viewParts/rulers/rulers.js';
import { ScrollDecorationViewPart } from './viewParts/scrollDecoration/scrollDecoration.js';
import { SelectionsOverlay } from './viewParts/selections/selections.js';
import { ViewCursors } from './viewParts/viewCursors/viewCursors.js';
import { ViewZones } from './viewParts/viewZones/viewZones.js';
import { WhitespaceOverlay } from './viewParts/whitespace/whitespace.js';
import { Position } from '../common/core/position.js';
import { Range } from '../common/core/range.js';
import { Selection } from '../common/core/selection.js';
import { GlyphMarginLane } from '../common/model.js';
import { ViewEventHandler } from '../common/viewEventHandler.js';
import { ViewportData } from '../common/viewLayout/viewLinesViewportData.js';
import { ViewContext } from '../common/viewModel/viewContext.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { getThemeTypeSelector } from '../../platform/theme/common/themeService.js';
import { ViewGpuContext } from './gpu/viewGpuContext.js';
import { ViewLinesGpu } from './viewParts/viewLinesGpu/viewLinesGpu.js';
import { TextAreaEditContext, } from './controller/editContext/textArea/textAreaEditContext.js';
import { NativeEditContext } from './controller/editContext/native/nativeEditContext.js';
import { RulersGpu } from './viewParts/rulersGpu/rulersGpu.js';
import { GpuMarkOverlay } from './viewParts/gpuMark/gpuMark.js';
import { Emitter } from '../../base/common/event.js';
let View = class View extends ViewEventHandler {
    constructor(editorContainer, ownerID, commandDelegate, configuration, colorTheme, model, userInputEvents, overflowWidgetsDomNode, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Actual mutable state
        this._shouldRecomputeGlyphMarginLanes = false;
        this._ownerID = ownerID;
        this._widgetFocusTracker = this._register(new CodeEditorWidgetFocusTracker(editorContainer, overflowWidgetsDomNode));
        this._register(this._widgetFocusTracker.onChange(() => {
            this._context.viewModel.setHasWidgetFocus(this._widgetFocusTracker.hasFocus());
        }));
        this._selections = [new Selection(1, 1, 1, 1)];
        this._renderAnimationFrame = null;
        this._overflowGuardContainer = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._overflowGuardContainer, 3 /* PartFingerprint.OverflowGuard */);
        this._overflowGuardContainer.setClassName('overflow-guard');
        this._viewController = new ViewController(configuration, model, userInputEvents, commandDelegate);
        // The view context is passed on to most classes (basically to reduce param. counts in ctors)
        this._context = new ViewContext(configuration, colorTheme, model);
        // Ensure the view is the first event handler in order to update the layout
        this._context.addEventHandler(this);
        this._viewParts = [];
        // Keyboard handler
        this._experimentalEditContextEnabled = this._context.configuration.options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        this._accessibilitySupport = this._context.configuration.options.get(2 /* EditorOption.accessibilitySupport */);
        this._editContext = this._instantiateEditContext();
        this._viewParts.push(this._editContext);
        // These two dom nodes must be constructed up front, since references are needed in the layout provider (scrolling & co.)
        this._linesContent = createFastDomNode(document.createElement('div'));
        this._linesContent.setClassName('lines-content' + ' monaco-editor-background');
        this._linesContent.setPosition('absolute');
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName(this._getEditorClassName());
        // Set role 'code' for better screen reader support https://github.com/microsoft/vscode/issues/93438
        this.domNode.setAttribute('role', 'code');
        if (this._context.configuration.options.get(39 /* EditorOption.experimentalGpuAcceleration */) === 'on') {
            this._viewGpuContext = this._instantiationService.createInstance(ViewGpuContext, this._context);
        }
        this._scrollbar = new EditorScrollbar(this._context, this._linesContent, this.domNode, this._overflowGuardContainer);
        this._viewParts.push(this._scrollbar);
        // View Lines
        this._viewLines = new ViewLines(this._context, this._viewGpuContext, this._linesContent);
        if (this._viewGpuContext) {
            this._viewLinesGpu = this._instantiationService.createInstance(ViewLinesGpu, this._context, this._viewGpuContext);
        }
        // View Zones
        this._viewZones = new ViewZones(this._context);
        this._viewParts.push(this._viewZones);
        // Decorations overview ruler
        const decorationsOverviewRuler = new DecorationsOverviewRuler(this._context);
        this._viewParts.push(decorationsOverviewRuler);
        const scrollDecoration = new ScrollDecorationViewPart(this._context);
        this._viewParts.push(scrollDecoration);
        const contentViewOverlays = new ContentViewOverlays(this._context);
        this._viewParts.push(contentViewOverlays);
        contentViewOverlays.addDynamicOverlay(new CurrentLineHighlightOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new SelectionsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new IndentGuidesOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new DecorationsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new WhitespaceOverlay(this._context));
        const marginViewOverlays = new MarginViewOverlays(this._context);
        this._viewParts.push(marginViewOverlays);
        marginViewOverlays.addDynamicOverlay(new CurrentLineMarginHighlightOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new MarginViewLineDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LinesDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LineNumbersOverlay(this._context));
        if (this._viewGpuContext) {
            marginViewOverlays.addDynamicOverlay(new GpuMarkOverlay(this._context, this._viewGpuContext));
        }
        // Glyph margin widgets
        this._glyphMarginWidgets = new GlyphMarginWidgets(this._context);
        this._viewParts.push(this._glyphMarginWidgets);
        const margin = new Margin(this._context);
        margin.getDomNode().appendChild(this._viewZones.marginDomNode);
        margin.getDomNode().appendChild(marginViewOverlays.getDomNode());
        margin.getDomNode().appendChild(this._glyphMarginWidgets.domNode);
        this._viewParts.push(margin);
        // Content widgets
        this._contentWidgets = new ViewContentWidgets(this._context, this.domNode);
        this._viewParts.push(this._contentWidgets);
        this._viewCursors = new ViewCursors(this._context);
        this._viewParts.push(this._viewCursors);
        // Overlay widgets
        this._overlayWidgets = new ViewOverlayWidgets(this._context, this.domNode);
        this._viewParts.push(this._overlayWidgets);
        const rulers = this._viewGpuContext
            ? new RulersGpu(this._context, this._viewGpuContext)
            : new Rulers(this._context);
        this._viewParts.push(rulers);
        const blockOutline = new BlockDecorations(this._context);
        this._viewParts.push(blockOutline);
        const minimap = new Minimap(this._context);
        this._viewParts.push(minimap);
        // -------------- Wire dom nodes up
        if (decorationsOverviewRuler) {
            const overviewRulerData = this._scrollbar.getOverviewRulerLayoutInfo();
            overviewRulerData.parent.insertBefore(decorationsOverviewRuler.getDomNode(), overviewRulerData.insertBefore);
        }
        this._linesContent.appendChild(contentViewOverlays.getDomNode());
        if ('domNode' in rulers) {
            this._linesContent.appendChild(rulers.domNode);
        }
        this._linesContent.appendChild(this._viewZones.domNode);
        this._linesContent.appendChild(this._viewLines.getDomNode());
        this._linesContent.appendChild(this._contentWidgets.domNode);
        this._linesContent.appendChild(this._viewCursors.getDomNode());
        this._overflowGuardContainer.appendChild(margin.getDomNode());
        this._overflowGuardContainer.appendChild(this._scrollbar.getDomNode());
        if (this._viewGpuContext) {
            this._overflowGuardContainer.appendChild(this._viewGpuContext.canvas);
        }
        this._overflowGuardContainer.appendChild(scrollDecoration.getDomNode());
        this._overflowGuardContainer.appendChild(this._overlayWidgets.getDomNode());
        this._overflowGuardContainer.appendChild(minimap.getDomNode());
        this._overflowGuardContainer.appendChild(blockOutline.domNode);
        this.domNode.appendChild(this._overflowGuardContainer);
        if (overflowWidgetsDomNode) {
            overflowWidgetsDomNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode.domNode);
            overflowWidgetsDomNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode.domNode);
        }
        else {
            this.domNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode);
            this.domNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode);
        }
        this._applyLayout();
        // Pointer handler
        this._pointerHandler = this._register(new PointerHandler(this._context, this._viewController, this._createPointerHandlerHelper()));
    }
    _instantiateEditContext() {
        const usingExperimentalEditContext = this._context.configuration.options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        if (usingExperimentalEditContext) {
            return this._instantiationService.createInstance(NativeEditContext, this._ownerID, this._context, this._overflowGuardContainer, this._viewController, this._createTextAreaHandlerHelper());
        }
        else {
            return this._instantiationService.createInstance(TextAreaEditContext, this._context, this._overflowGuardContainer, this._viewController, this._createTextAreaHandlerHelper());
        }
    }
    _updateEditContext() {
        const experimentalEditContextEnabled = this._context.configuration.options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        const accessibilitySupport = this._context.configuration.options.get(2 /* EditorOption.accessibilitySupport */);
        if (this._experimentalEditContextEnabled === experimentalEditContextEnabled &&
            this._accessibilitySupport === accessibilitySupport) {
            return;
        }
        this._experimentalEditContextEnabled = experimentalEditContextEnabled;
        this._accessibilitySupport = accessibilitySupport;
        const isEditContextFocused = this._editContext.isFocused();
        const indexOfEditContext = this._viewParts.indexOf(this._editContext);
        this._editContext.dispose();
        this._editContext = this._instantiateEditContext();
        if (isEditContextFocused) {
            this._editContext.focus();
        }
        if (indexOfEditContext !== -1) {
            this._viewParts.splice(indexOfEditContext, 1, this._editContext);
        }
    }
    _computeGlyphMarginLanes() {
        const model = this._context.viewModel.model;
        const laneModel = this._context.viewModel.glyphLanes;
        let glyphs = [];
        let maxLineNumber = 0;
        // Add all margin decorations
        glyphs = glyphs.concat(model.getAllMarginDecorations().map((decoration) => {
            const lane = decoration.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            maxLineNumber = Math.max(maxLineNumber, decoration.range.endLineNumber);
            return {
                range: decoration.range,
                lane,
                persist: decoration.options.glyphMargin?.persistLane,
            };
        }));
        // Add all glyph margin widgets
        glyphs = glyphs.concat(this._glyphMarginWidgets.getWidgets().map((widget) => {
            const range = model.validateRange(widget.preference.range);
            maxLineNumber = Math.max(maxLineNumber, range.endLineNumber);
            return { range, lane: widget.preference.lane };
        }));
        // Sorted by their start position
        glyphs.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
        laneModel.reset(maxLineNumber);
        for (const glyph of glyphs) {
            laneModel.push(glyph.lane, glyph.range, glyph.persist);
        }
        return laneModel;
    }
    _createPointerHandlerHelper() {
        return {
            viewDomNode: this.domNode.domNode,
            linesContentDomNode: this._linesContent.domNode,
            viewLinesDomNode: this._viewLines.getDomNode().domNode,
            viewLinesGpu: this._viewLinesGpu,
            focusTextArea: () => {
                this.focus();
            },
            dispatchTextAreaEvent: (event) => {
                this._editContext.domNode.domNode.dispatchEvent(event);
            },
            getLastRenderData: () => {
                const lastViewCursorsRenderData = this._viewCursors.getLastRenderData() || [];
                const lastTextareaPosition = this._editContext.getLastRenderData();
                return new PointerHandlerLastRenderData(lastViewCursorsRenderData, lastTextareaPosition);
            },
            renderNow: () => {
                this.render(true, false);
            },
            shouldSuppressMouseDownOnViewZone: (viewZoneId) => {
                return this._viewZones.shouldSuppressMouseDownOnViewZone(viewZoneId);
            },
            shouldSuppressMouseDownOnWidget: (widgetId) => {
                return this._contentWidgets.shouldSuppressMouseDownOnWidget(widgetId);
            },
            getPositionFromDOMInfo: (spanNode, offset) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.getPositionFromDOMInfo(spanNode, offset);
            },
            visibleRangeForPosition: (lineNumber, column) => {
                this._flushAccumulatedAndRenderNow();
                const position = new Position(lineNumber, column);
                return (this._viewLines.visibleRangeForPosition(position) ??
                    this._viewLinesGpu?.visibleRangeForPosition(position) ??
                    null);
            },
            getLineWidth: (lineNumber) => {
                this._flushAccumulatedAndRenderNow();
                if (this._viewLinesGpu) {
                    const result = this._viewLinesGpu.getLineWidth(lineNumber);
                    if (result !== undefined) {
                        return result;
                    }
                }
                return this._viewLines.getLineWidth(lineNumber);
            },
        };
    }
    _createTextAreaHandlerHelper() {
        return {
            visibleRangeForPosition: (position) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.visibleRangeForPosition(position);
            },
            linesVisibleRangesForRange: (range, includeNewLines) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.linesVisibleRangesForRange(range, includeNewLines);
            },
        };
    }
    _applyLayout() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.domNode.setWidth(layoutInfo.width);
        this.domNode.setHeight(layoutInfo.height);
        this._overflowGuardContainer.setWidth(layoutInfo.width);
        this._overflowGuardContainer.setHeight(layoutInfo.height);
        // https://stackoverflow.com/questions/38905916/content-in-google-chrome-larger-than-16777216-px-not-being-rendered
        this._linesContent.setWidth(16777216);
        this._linesContent.setHeight(16777216);
    }
    _getEditorClassName() {
        const focused = this._editContext.isFocused() ? ' focused' : '';
        return (this._context.configuration.options.get(148 /* EditorOption.editorClassName */) +
            ' ' +
            getThemeTypeSelector(this._context.theme.type) +
            focused);
    }
    // --- begin event handlers
    handleEvents(events) {
        super.handleEvents(events);
        this._scheduleRender();
    }
    onConfigurationChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        this._updateEditContext();
        this._applyLayout();
        return false;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        return false;
    }
    onDecorationsChanged(e) {
        if (e.affectsGlyphMargin) {
            this._shouldRecomputeGlyphMarginLanes = true;
        }
        return false;
    }
    onFocusChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    onThemeChanged(e) {
        this._context.theme.update(e.theme);
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    // --- end event handlers
    dispose() {
        if (this._renderAnimationFrame !== null) {
            this._renderAnimationFrame.dispose();
            this._renderAnimationFrame = null;
        }
        this._contentWidgets.overflowingContentWidgetsDomNode.domNode.remove();
        this._overlayWidgets.overflowingOverlayWidgetsDomNode.domNode.remove();
        this._context.removeEventHandler(this);
        this._viewGpuContext?.dispose();
        this._viewLines.dispose();
        this._viewLinesGpu?.dispose();
        // Destroy view parts
        for (const viewPart of this._viewParts) {
            viewPart.dispose();
        }
        super.dispose();
    }
    _scheduleRender() {
        if (this._store.isDisposed) {
            throw new BugIndicatingError();
        }
        if (this._renderAnimationFrame === null) {
            // TODO: workaround fix for https://github.com/microsoft/vscode/issues/229825
            if (this._editContext instanceof NativeEditContext) {
                this._editContext.setEditContextOnDomNode();
            }
            const rendering = this._createCoordinatedRendering();
            this._renderAnimationFrame = EditorRenderingCoordinator.INSTANCE.scheduleCoordinatedRendering({
                window: dom.getWindow(this.domNode?.domNode),
                prepareRenderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    try {
                        return rendering.prepareRenderText();
                    }
                    finally {
                        this._renderAnimationFrame = null;
                    }
                },
                renderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.renderText();
                },
                prepareRender: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.prepareRender(viewParts, ctx);
                },
                render: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.render(viewParts, ctx);
                },
            });
        }
    }
    _flushAccumulatedAndRenderNow() {
        const rendering = this._createCoordinatedRendering();
        safeInvokeNoArg(() => rendering.prepareRenderText());
        const data = safeInvokeNoArg(() => rendering.renderText());
        if (data) {
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
    _getViewPartsToRender() {
        const result = [];
        let resultLen = 0;
        for (const viewPart of this._viewParts) {
            if (viewPart.shouldRender()) {
                result[resultLen++] = viewPart;
            }
        }
        return result;
    }
    _createCoordinatedRendering() {
        return {
            prepareRenderText: () => {
                if (this._shouldRecomputeGlyphMarginLanes) {
                    this._shouldRecomputeGlyphMarginLanes = false;
                    const model = this._computeGlyphMarginLanes();
                    this._context.configuration.setGlyphMarginDecorationLaneCount(model.requiredLanes);
                }
                inputLatency.onRenderStart();
            },
            renderText: () => {
                if (!this.domNode.domNode.isConnected) {
                    return null;
                }
                let viewPartsToRender = this._getViewPartsToRender();
                if (!this._viewLines.shouldRender() && viewPartsToRender.length === 0) {
                    // Nothing to render
                    return null;
                }
                const partialViewportData = this._context.viewLayout.getLinesViewportData();
                this._context.viewModel.setViewport(partialViewportData.startLineNumber, partialViewportData.endLineNumber, partialViewportData.centeredLineNumber);
                const viewportData = new ViewportData(this._selections, partialViewportData, this._context.viewLayout.getWhitespaceViewportData(), this._context.viewModel);
                if (this._contentWidgets.shouldRender()) {
                    // Give the content widgets a chance to set their max width before a possible synchronous layout
                    this._contentWidgets.onBeforeRender(viewportData);
                }
                if (this._viewLines.shouldRender()) {
                    this._viewLines.renderText(viewportData);
                    this._viewLines.onDidRender();
                    // Rendering of viewLines might cause scroll events to occur, so collect view parts to render again
                    viewPartsToRender = this._getViewPartsToRender();
                }
                if (this._viewLinesGpu?.shouldRender()) {
                    this._viewLinesGpu.renderText(viewportData);
                    this._viewLinesGpu.onDidRender();
                }
                return [
                    viewPartsToRender,
                    new RenderingContext(this._context.viewLayout, viewportData, this._viewLines, this._viewLinesGpu),
                ];
            },
            prepareRender: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.prepareRender(ctx);
                }
            },
            render: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.render(ctx);
                    viewPart.onDidRender();
                }
            },
        };
    }
    // --- BEGIN CodeEditor helpers
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._scrollbar.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._scrollbar.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    restoreState(scrollPosition) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollPosition.scrollTop,
            scrollLeft: scrollPosition.scrollLeft,
        }, 1 /* ScrollType.Immediate */);
        this._context.viewModel.visibleLinesStabilized();
    }
    getOffsetForColumn(modelLineNumber, modelColumn) {
        const modelPosition = this._context.viewModel.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn,
        });
        const viewPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        this._flushAccumulatedAndRenderNow();
        const visibleRange = this._viewLines.visibleRangeForPosition(new Position(viewPosition.lineNumber, viewPosition.column));
        if (!visibleRange) {
            return -1;
        }
        return visibleRange.left;
    }
    getTargetAtClientPoint(clientX, clientY) {
        const mouseTarget = this._pointerHandler.getTargetAtClientPoint(clientX, clientY);
        if (!mouseTarget) {
            return null;
        }
        return ViewUserInputEvents.convertViewToModelMouseTarget(mouseTarget, this._context.viewModel.coordinatesConverter);
    }
    createOverviewRuler(cssClassName) {
        return new OverviewRuler(this._context, cssClassName);
    }
    change(callback) {
        this._viewZones.changeViewZones(callback);
        this._scheduleRender();
    }
    render(now, everything) {
        if (everything) {
            // Force everything to render...
            this._viewLines.forceShouldRender();
            for (const viewPart of this._viewParts) {
                viewPart.forceShouldRender();
            }
        }
        if (now) {
            this._flushAccumulatedAndRenderNow();
        }
        else {
            this._scheduleRender();
        }
    }
    writeScreenReaderContent(reason) {
        this._editContext.writeScreenReaderContent(reason);
    }
    focus() {
        this._editContext.focus();
    }
    isFocused() {
        return this._editContext.isFocused();
    }
    isWidgetFocused() {
        return this._widgetFocusTracker.hasFocus();
    }
    refreshFocusState() {
        this._editContext.refreshFocusState();
        this._widgetFocusTracker.refreshState();
    }
    setAriaOptions(options) {
        this._editContext.setAriaOptions(options);
    }
    addContentWidget(widgetData) {
        this._contentWidgets.addWidget(widgetData.widget);
        this.layoutContentWidget(widgetData);
        this._scheduleRender();
    }
    layoutContentWidget(widgetData) {
        this._contentWidgets.setWidgetPosition(widgetData.widget, widgetData.position?.position ?? null, widgetData.position?.secondaryPosition ?? null, widgetData.position?.preference ?? null, widgetData.position?.positionAffinity ?? null);
        this._scheduleRender();
    }
    removeContentWidget(widgetData) {
        this._contentWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addOverlayWidget(widgetData) {
        this._overlayWidgets.addWidget(widgetData.widget);
        this.layoutOverlayWidget(widgetData);
        this._scheduleRender();
    }
    layoutOverlayWidget(widgetData) {
        const shouldRender = this._overlayWidgets.setWidgetPosition(widgetData.widget, widgetData.position);
        if (shouldRender) {
            this._scheduleRender();
        }
    }
    removeOverlayWidget(widgetData) {
        this._overlayWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.addWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
    layoutGlyphMarginWidget(widgetData) {
        const newPreference = widgetData.position;
        const shouldRender = this._glyphMarginWidgets.setWidgetPosition(widgetData.widget, newPreference);
        if (shouldRender) {
            this._shouldRecomputeGlyphMarginLanes = true;
            this._scheduleRender();
        }
    }
    removeGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.removeWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
};
View = __decorate([
    __param(8, IInstantiationService)
], View);
export { View };
function safeInvokeNoArg(func) {
    try {
        return func();
    }
    catch (e) {
        onUnexpectedError(e);
        return null;
    }
}
class EditorRenderingCoordinator {
    static { this.INSTANCE = new EditorRenderingCoordinator(); }
    constructor() {
        this._coordinatedRenderings = [];
        this._animationFrameRunners = new Map();
    }
    scheduleCoordinatedRendering(rendering) {
        this._coordinatedRenderings.push(rendering);
        this._scheduleRender(rendering.window);
        return {
            dispose: () => {
                const renderingIndex = this._coordinatedRenderings.indexOf(rendering);
                if (renderingIndex === -1) {
                    return;
                }
                this._coordinatedRenderings.splice(renderingIndex, 1);
                if (this._coordinatedRenderings.length === 0) {
                    // There are no more renderings to coordinate => cancel animation frames
                    for (const [_, disposable] of this._animationFrameRunners) {
                        disposable.dispose();
                    }
                    this._animationFrameRunners.clear();
                }
            },
        };
    }
    _scheduleRender(window) {
        if (!this._animationFrameRunners.has(window)) {
            const runner = () => {
                this._animationFrameRunners.delete(window);
                this._onRenderScheduled();
            };
            this._animationFrameRunners.set(window, dom.runAtThisOrScheduleAtNextAnimationFrame(window, runner, 100));
        }
    }
    _onRenderScheduled() {
        const coordinatedRenderings = this._coordinatedRenderings.slice(0);
        this._coordinatedRenderings = [];
        for (const rendering of coordinatedRenderings) {
            safeInvokeNoArg(() => rendering.prepareRenderText());
        }
        const datas = [];
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            datas[i] = safeInvokeNoArg(() => rendering.renderText());
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
}
class CodeEditorWidgetFocusTracker extends Disposable {
    constructor(domElement, overflowWidgetsDomNode) {
        super();
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._hadFocus = undefined;
        this._hasDomElementFocus = false;
        this._domFocusTracker = this._register(dom.trackFocus(domElement));
        this._overflowWidgetsDomNodeHasFocus = false;
        this._register(this._domFocusTracker.onDidFocus(() => {
            this._hasDomElementFocus = true;
            this._update();
        }));
        this._register(this._domFocusTracker.onDidBlur(() => {
            this._hasDomElementFocus = false;
            this._update();
        }));
        if (overflowWidgetsDomNode) {
            this._overflowWidgetsDomNode = this._register(dom.trackFocus(overflowWidgetsDomNode));
            this._register(this._overflowWidgetsDomNode.onDidFocus(() => {
                this._overflowWidgetsDomNodeHasFocus = true;
                this._update();
            }));
            this._register(this._overflowWidgetsDomNode.onDidBlur(() => {
                this._overflowWidgetsDomNodeHasFocus = false;
                this._update();
            }));
        }
    }
    _update() {
        const focused = this._hasDomElementFocus || this._overflowWidgetsDomNodeHasFocus;
        if (this._hadFocus !== focused) {
            this._hadFocus = focused;
            this._onChange.fire(undefined);
        }
    }
    hasFocus() {
        return this._hadFocus ?? false;
    }
    refreshState() {
        this._domFocusTracker.refreshState();
        this._overflowWidgetsDomNode?.refreshState?.();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQVkvRCxPQUFPLEVBRU4sZ0JBQWdCLEdBRWhCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFvQixjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNoRixPQUFPLEVBQW1CLGdCQUFnQixFQUFZLE1BQU0sb0JBQW9CLENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixpQ0FBaUMsR0FDakMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtC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