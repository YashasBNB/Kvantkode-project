/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ArrayQueue } from '../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import * as strings from '../../../base/common/strings.js';
import { EDITOR_FONT_DEFAULTS, filterValidationDecorations, } from '../config/editorOptions.js';
import { CursorsController } from '../cursor/cursor.js';
import { CursorConfiguration, } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import * as textModelEvents from '../textModelEvents.js';
import { TokenizationRegistry } from '../languages.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { tokenizeLineToHTML } from '../languages/textToHtmlTokenizer.js';
import * as viewEvents from '../viewEvents.js';
import { ViewLayout } from '../viewLayout/viewLayout.js';
import { MinimapTokensColorTracker } from './minimapTokensColorTracker.js';
import { MinimapLinesRenderingData, OverviewRulerDecorationsGroup, ViewLineRenderingData, } from '../viewModel.js';
import { ViewModelDecorations } from './viewModelDecorations.js';
import { FocusChangedEvent, HiddenAreasChangedEvent, ModelContentChangedEvent, ModelDecorationsChangedEvent, ModelLanguageChangedEvent, ModelLanguageConfigurationChangedEvent, ModelOptionsChangedEvent, ModelTokensChangedEvent, ReadOnlyEditAttemptEvent, ScrollChangedEvent, ViewModelEventDispatcher, ViewZonesChangedEvent, WidgetFocusChangedEvent, } from '../viewModelEventDispatcher.js';
import { ViewModelLinesFromModelAsIs, ViewModelLinesFromProjectedModel, } from './viewModelLines.js';
import { GlyphMarginLanesModel } from './glyphLanesModel.js';
const USE_IDENTITY_LINES_COLLECTION = true;
export class ViewModel extends Disposable {
    constructor(editorId, configuration, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, scheduleAtNextAnimationFrame, languageConfigurationService, _themeService, _attachedView, _transactionalTarget) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._themeService = _themeService;
        this._attachedView = _attachedView;
        this._transactionalTarget = _transactionalTarget;
        this.hiddenAreasModel = new HiddenAreasModel();
        this.previousHiddenAreas = [];
        this._editorId = editorId;
        this._configuration = configuration;
        this.model = model;
        this._eventDispatcher = new ViewModelEventDispatcher();
        this.onEvent = this._eventDispatcher.onEvent;
        this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
        this._updateConfigurationViewLineCount = this._register(new RunOnceScheduler(() => this._updateConfigurationViewLineCountNow(), 0));
        this._hasFocus = false;
        this._viewportStart = ViewportStart.create(this.model);
        this.glyphLanes = new GlyphMarginLanesModel(0);
        if (USE_IDENTITY_LINES_COLLECTION && this.model.isTooLargeForTokenization()) {
            this._lines = new ViewModelLinesFromModelAsIs(this.model);
        }
        else {
            const options = this._configuration.options;
            const fontInfo = options.get(52 /* EditorOption.fontInfo */);
            const wrappingStrategy = options.get(144 /* EditorOption.wrappingStrategy */);
            const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
            const wrappingIndent = options.get(143 /* EditorOption.wrappingIndent */);
            const wordBreak = options.get(134 /* EditorOption.wordBreak */);
            this._lines = new ViewModelLinesFromProjectedModel(this._editorId, this.model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, this.model.getOptions().tabSize, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        }
        this.coordinatesConverter = this._lines.createCoordinatesConverter();
        this._cursor = this._register(new CursorsController(model, this, this.coordinatesConverter, this.cursorConfig));
        this.viewLayout = this._register(new ViewLayout(this._configuration, this.getLineCount(), scheduleAtNextAnimationFrame));
        this._register(this.viewLayout.onDidScroll((e) => {
            if (e.scrollTopChanged) {
                this._handleVisibleLinesChanged();
            }
            if (e.scrollTopChanged) {
                this._viewportStart.invalidate();
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewScrollChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ScrollChangedEvent(e.oldScrollWidth, e.oldScrollLeft, e.oldScrollHeight, e.oldScrollTop, e.scrollWidth, e.scrollLeft, e.scrollHeight, e.scrollTop));
        }));
        this._register(this.viewLayout.onDidContentSizeChange((e) => {
            this._eventDispatcher.emitOutgoingEvent(e);
        }));
        this._decorations = new ViewModelDecorations(this._editorId, this.model, this._configuration, this._lines, this.coordinatesConverter);
        this._registerModelEvents();
        this._register(this._configuration.onDidChangeFast((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                this._onConfigurationChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        }));
        this._register(MinimapTokensColorTracker.getInstance().onDidChange(() => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensColorsChangedEvent());
        }));
        this._register(this._themeService.onDidColorThemeChange((theme) => {
            this._invalidateDecorationsColorCache();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewThemeChangedEvent(theme));
        }));
        this._updateConfigurationViewLineCountNow();
    }
    dispose() {
        // First remove listeners, as disposing the lines might end up sending
        // model decoration changed events ... and we no longer care about them ...
        super.dispose();
        this._decorations.dispose();
        this._lines.dispose();
        this._viewportStart.dispose();
        this._eventDispatcher.dispose();
    }
    createLineBreaksComputer() {
        return this._lines.createLineBreaksComputer();
    }
    addViewEventHandler(eventHandler) {
        this._eventDispatcher.addViewEventHandler(eventHandler);
    }
    removeViewEventHandler(eventHandler) {
        this._eventDispatcher.removeViewEventHandler(eventHandler);
    }
    _updateConfigurationViewLineCountNow() {
        this._configuration.setViewLineCount(this._lines.getViewLineCount());
    }
    getModelVisibleRanges() {
        const linesViewportData = this.viewLayout.getLinesViewportData();
        const viewVisibleRange = new Range(linesViewportData.startLineNumber, this.getLineMinColumn(linesViewportData.startLineNumber), linesViewportData.endLineNumber, this.getLineMaxColumn(linesViewportData.endLineNumber));
        const modelVisibleRanges = this._toModelVisibleRanges(viewVisibleRange);
        return modelVisibleRanges;
    }
    visibleLinesStabilized() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, true);
    }
    _handleVisibleLinesChanged() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, false);
    }
    setHasFocus(hasFocus) {
        this._hasFocus = hasFocus;
        this._cursor.setHasFocus(hasFocus);
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewFocusChangedEvent(hasFocus));
        this._eventDispatcher.emitOutgoingEvent(new FocusChangedEvent(!hasFocus, hasFocus));
    }
    setHasWidgetFocus(hasWidgetFocus) {
        this._eventDispatcher.emitOutgoingEvent(new WidgetFocusChangedEvent(!hasWidgetFocus, hasWidgetFocus));
    }
    onCompositionStart() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionStartEvent());
    }
    onCompositionEnd() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionEndEvent());
    }
    _captureStableViewport() {
        // We might need to restore the current start view range, so save it (if available)
        // But only if the scroll position is not at the top of the file
        if (this._viewportStart.isValid && this.viewLayout.getCurrentScrollTop() > 0) {
            const previousViewportStartViewPosition = new Position(this._viewportStart.viewLineNumber, this.getLineMinColumn(this._viewportStart.viewLineNumber));
            const previousViewportStartModelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(previousViewportStartViewPosition);
            return new StableViewport(previousViewportStartModelPosition, this._viewportStart.startLineDelta);
        }
        return new StableViewport(null, 0);
    }
    _onConfigurationChanged(eventsCollector, e) {
        const stableViewport = this._captureStableViewport();
        const options = this._configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const wrappingStrategy = options.get(144 /* EditorOption.wrappingStrategy */);
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const wrappingIndent = options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = options.get(134 /* EditorOption.wordBreak */);
        if (this._lines.setWrappingSettings(fontInfo, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak)) {
            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
            this._cursor.onLineMappingChanged(eventsCollector);
            this._decorations.onLineMappingChanged();
            this.viewLayout.onFlushed(this.getLineCount());
            this._updateConfigurationViewLineCount.schedule();
        }
        if (e.hasChanged(96 /* EditorOption.readOnly */)) {
            // Must read again all decorations due to readOnly filtering
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        if (e.hasChanged(103 /* EditorOption.renderValidationDecorations */)) {
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        eventsCollector.emitViewEvent(new viewEvents.ViewConfigurationChangedEvent(e));
        this.viewLayout.onConfigurationChanged(e);
        stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
        if (CursorConfiguration.shouldRecreate(e)) {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
        }
    }
    _registerModelEvents() {
        this._register(this.model.onDidChangeContentOrInjectedText((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                let hadOtherModelChange = false;
                let hadModelLineChangeThatChangedLineMapping = false;
                const changes = e instanceof textModelEvents.InternalModelContentChangeEvent
                    ? e.rawContentChangedEvent.changes
                    : e.changes;
                const versionId = e instanceof textModelEvents.InternalModelContentChangeEvent
                    ? e.rawContentChangedEvent.versionId
                    : null;
                // Do a first pass to compute line mappings, and a second pass to actually interpret them
                const lineBreaksComputer = this._lines.createLineBreaksComputer();
                for (const change of changes) {
                    switch (change.changeType) {
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            for (let lineIdx = 0; lineIdx < change.detail.length; lineIdx++) {
                                const line = change.detail[lineIdx];
                                let injectedText = change.injectedTexts[lineIdx];
                                if (injectedText) {
                                    injectedText = injectedText.filter((element) => !element.ownerId || element.ownerId === this._editorId);
                                }
                                lineBreaksComputer.addRequest(line, injectedText, null);
                            }
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            let injectedText = null;
                            if (change.injectedText) {
                                injectedText = change.injectedText.filter((element) => !element.ownerId || element.ownerId === this._editorId);
                            }
                            lineBreaksComputer.addRequest(change.detail, injectedText, null);
                            break;
                        }
                    }
                }
                const lineBreaks = lineBreaksComputer.finalize();
                const lineBreakQueue = new ArrayQueue(lineBreaks);
                for (const change of changes) {
                    switch (change.changeType) {
                        case 1 /* textModelEvents.RawContentChangedType.Flush */: {
                            this._lines.onModelFlushed();
                            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                            this._decorations.reset();
                            this.viewLayout.onFlushed(this.getLineCount());
                            hadOtherModelChange = true;
                            break;
                        }
                        case 3 /* textModelEvents.RawContentChangedType.LinesDeleted */: {
                            const linesDeletedEvent = this._lines.onModelLinesDeleted(versionId, change.fromLineNumber, change.toLineNumber);
                            if (linesDeletedEvent !== null) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            const insertedLineBreaks = lineBreakQueue.takeCount(change.detail.length);
                            const linesInsertedEvent = this._lines.onModelLinesInserted(versionId, change.fromLineNumber, change.toLineNumber, insertedLineBreaks);
                            if (linesInsertedEvent !== null) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            const changedLineBreakData = lineBreakQueue.dequeue();
                            const [lineMappingChanged, linesChangedEvent, linesInsertedEvent, linesDeletedEvent,] = this._lines.onModelLineChanged(versionId, change.lineNumber, changedLineBreakData);
                            hadModelLineChangeThatChangedLineMapping = lineMappingChanged;
                            if (linesChangedEvent) {
                                eventsCollector.emitViewEvent(linesChangedEvent);
                            }
                            if (linesInsertedEvent) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            if (linesDeletedEvent) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            break;
                        }
                        case 5 /* textModelEvents.RawContentChangedType.EOLChanged */: {
                            // Nothing to do. The new version will be accepted below
                            break;
                        }
                    }
                }
                if (versionId !== null) {
                    this._lines.acceptVersionId(versionId);
                }
                this.viewLayout.onHeightMaybeChanged();
                if (!hadOtherModelChange && hadModelLineChangeThatChangedLineMapping) {
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                }
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            // Update the configuration and reset the centered view line
            const viewportStartWasValid = this._viewportStart.isValid;
            this._viewportStart.invalidate();
            this._configuration.setModelLineCount(this.model.getLineCount());
            this._updateConfigurationViewLineCountNow();
            // Recover viewport
            if (!this._hasFocus && this.model.getAttachedEditorCount() >= 2 && viewportStartWasValid) {
                const modelRange = this.model._getTrackedRange(this._viewportStart.modelTrackedRange);
                if (modelRange) {
                    const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelRange.getStartPosition());
                    const viewPositionTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
                    this.viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStart.startLineDelta }, 1 /* ScrollType.Immediate */);
                }
            }
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                if (e instanceof textModelEvents.InternalModelContentChangeEvent) {
                    eventsCollector.emitOutgoingEvent(new ModelContentChangedEvent(e.contentChangedEvent));
                }
                this._cursor.onModelContentChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            this._handleVisibleLinesChanged();
        }));
        this._register(this.model.onDidChangeTokens((e) => {
            const viewRanges = [];
            for (let j = 0, lenJ = e.ranges.length; j < lenJ; j++) {
                const modelRange = e.ranges[j];
                const viewStartLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.fromLineNumber, 1)).lineNumber;
                const viewEndLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.toLineNumber, this.model.getLineMaxColumn(modelRange.toLineNumber))).lineNumber;
                viewRanges[j] = {
                    fromLineNumber: viewStartLineNumber,
                    toLineNumber: viewEndLineNumber,
                };
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensChangedEvent(viewRanges));
            this._eventDispatcher.emitOutgoingEvent(new ModelTokensChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguageConfiguration((e) => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewLanguageConfigurationEvent());
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageConfigurationChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguage((e) => {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageChangedEvent(e));
        }));
        this._register(this.model.onDidChangeOptions((e) => {
            // A tab size change causes a line mapping changed event => all view parts will repaint OK, no further event needed here
            if (this._lines.setTabSize(this.model.getOptions().tabSize)) {
                try {
                    const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                    eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                    this.viewLayout.onFlushed(this.getLineCount());
                }
                finally {
                    this._eventDispatcher.endEmitViewEvents();
                }
                this._updateConfigurationViewLineCount.schedule();
            }
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelOptionsChangedEvent(e));
        }));
        this._register(this.model.onDidChangeDecorations((e) => {
            this._decorations.onModelDecorationsChanged();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewDecorationsChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ModelDecorationsChangedEvent(e));
        }));
    }
    /**
     * @param forceUpdate If true, the hidden areas will be updated even if the new ranges are the same as the previous ranges.
     * This is because the model might have changed, which resets the hidden areas, but not the last cached value.
     * This needs a better fix in the future.
     */
    setHiddenAreas(ranges, source, forceUpdate) {
        this.hiddenAreasModel.setHiddenAreas(source, ranges);
        const mergedRanges = this.hiddenAreasModel.getMergedRanges();
        if (mergedRanges === this.previousHiddenAreas && !forceUpdate) {
            return;
        }
        this.previousHiddenAreas = mergedRanges;
        const stableViewport = this._captureStableViewport();
        let lineMappingChanged = false;
        try {
            const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
            lineMappingChanged = this._lines.setHiddenAreas(mergedRanges);
            if (lineMappingChanged) {
                eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                this._cursor.onLineMappingChanged(eventsCollector);
                this._decorations.onLineMappingChanged();
                this.viewLayout.onFlushed(this.getLineCount());
                this.viewLayout.onHeightMaybeChanged();
            }
            const firstModelLineInViewPort = stableViewport.viewportStartModelPosition?.lineNumber;
            const firstModelLineIsHidden = firstModelLineInViewPort &&
                mergedRanges.some((range) => range.startLineNumber <= firstModelLineInViewPort &&
                    firstModelLineInViewPort <= range.endLineNumber);
            if (!firstModelLineIsHidden) {
                stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
            }
        }
        finally {
            this._eventDispatcher.endEmitViewEvents();
        }
        this._updateConfigurationViewLineCount.schedule();
        if (lineMappingChanged) {
            this._eventDispatcher.emitOutgoingEvent(new HiddenAreasChangedEvent());
        }
    }
    getVisibleRangesPlusViewportAboveBelow() {
        const layoutInfo = this._configuration.options.get(151 /* EditorOption.layoutInfo */);
        const lineHeight = this._configuration.options.get(68 /* EditorOption.lineHeight */);
        const linesAround = Math.max(20, Math.round(layoutInfo.height / lineHeight));
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = Math.max(1, partialData.completelyVisibleStartLineNumber - linesAround);
        const endViewLineNumber = Math.min(this.getLineCount(), partialData.completelyVisibleEndLineNumber + linesAround);
        return this._toModelVisibleRanges(new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber)));
    }
    getVisibleRanges() {
        const visibleViewRange = this.getCompletelyVisibleViewRange();
        return this._toModelVisibleRanges(visibleViewRange);
    }
    getHiddenAreas() {
        return this._lines.getHiddenAreas();
    }
    _toModelVisibleRanges(visibleViewRange) {
        const visibleRange = this.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        const hiddenAreas = this._lines.getHiddenAreas();
        if (hiddenAreas.length === 0) {
            return [visibleRange];
        }
        const result = [];
        let resultLen = 0;
        let startLineNumber = visibleRange.startLineNumber;
        let startColumn = visibleRange.startColumn;
        const endLineNumber = visibleRange.endLineNumber;
        const endColumn = visibleRange.endColumn;
        for (let i = 0, len = hiddenAreas.length; i < len; i++) {
            const hiddenStartLineNumber = hiddenAreas[i].startLineNumber;
            const hiddenEndLineNumber = hiddenAreas[i].endLineNumber;
            if (hiddenEndLineNumber < startLineNumber) {
                continue;
            }
            if (hiddenStartLineNumber > endLineNumber) {
                continue;
            }
            if (startLineNumber < hiddenStartLineNumber) {
                result[resultLen++] = new Range(startLineNumber, startColumn, hiddenStartLineNumber - 1, this.model.getLineMaxColumn(hiddenStartLineNumber - 1));
            }
            startLineNumber = hiddenEndLineNumber + 1;
            startColumn = 1;
        }
        if (startLineNumber < endLineNumber ||
            (startLineNumber === endLineNumber && startColumn < endColumn)) {
            result[resultLen++] = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
        }
        return result;
    }
    getCompletelyVisibleViewRange() {
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    getCompletelyVisibleViewRangeAtScrollTop(scrollTop) {
        const partialData = this.viewLayout.getLinesViewportDataAtScrollTop(scrollTop);
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    saveState() {
        const compatViewState = this.viewLayout.saveState();
        const scrollTop = compatViewState.scrollTop;
        const firstViewLineNumber = this.viewLayout.getLineNumberAtVerticalOffset(scrollTop);
        const firstPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(firstViewLineNumber, this.getLineMinColumn(firstViewLineNumber)));
        const firstPositionDeltaTop = this.viewLayout.getVerticalOffsetForLineNumber(firstViewLineNumber) - scrollTop;
        return {
            scrollLeft: compatViewState.scrollLeft,
            firstPosition: firstPosition,
            firstPositionDeltaTop: firstPositionDeltaTop,
        };
    }
    reduceRestoreState(state) {
        if (typeof state.firstPosition === 'undefined') {
            // This is a view state serialized by an older version
            return this._reduceRestoreStateCompatibility(state);
        }
        const modelPosition = this.model.validatePosition(state.firstPosition);
        const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        const scrollTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber) -
            state.firstPositionDeltaTop;
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: scrollTop,
        };
    }
    _reduceRestoreStateCompatibility(state) {
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: state.scrollTopWithoutViewZones,
        };
    }
    getTabSize() {
        return this.model.getOptions().tabSize;
    }
    getLineCount() {
        return this._lines.getViewLineCount();
    }
    /**
     * Gives a hint that a lot of requests are about to come in for these line numbers.
     */
    setViewport(startLineNumber, endLineNumber, centeredLineNumber) {
        this._viewportStart.update(this, startLineNumber);
    }
    getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber) {
        return this._lines.getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber);
    }
    getLinesIndentGuides(startLineNumber, endLineNumber) {
        return this._lines.getViewLinesIndentGuides(startLineNumber, endLineNumber);
    }
    getBracketGuidesInRangeByLine(startLineNumber, endLineNumber, activePosition, options) {
        return this._lines.getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition, options);
    }
    getLineContent(lineNumber) {
        return this._lines.getViewLineContent(lineNumber);
    }
    getLineLength(lineNumber) {
        return this._lines.getViewLineLength(lineNumber);
    }
    getLineMinColumn(lineNumber) {
        return this._lines.getViewLineMinColumn(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        return this._lines.getViewLineMaxColumn(lineNumber);
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 1;
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 2;
    }
    getMinimapDecorationsInRange(range) {
        return this._decorations.getMinimapDecorationsInRange(range);
    }
    getDecorationsInViewport(visibleRange) {
        return this._decorations.getDecorationsViewportData(visibleRange).decorations;
    }
    getInjectedTextAt(viewPosition) {
        return this._lines.getInjectedTextAt(viewPosition);
    }
    getViewportViewLineRenderingData(visibleRange, lineNumber) {
        const allInlineDecorations = this._decorations.getDecorationsViewportData(visibleRange).inlineDecorations;
        const inlineDecorations = allInlineDecorations[lineNumber - visibleRange.startLineNumber];
        return this._getViewLineRenderingData(lineNumber, inlineDecorations);
    }
    getViewLineRenderingData(lineNumber) {
        const inlineDecorations = this._decorations.getInlineDecorationsOnLine(lineNumber);
        return this._getViewLineRenderingData(lineNumber, inlineDecorations);
    }
    _getViewLineRenderingData(lineNumber, inlineDecorations) {
        const mightContainRTL = this.model.mightContainRTL();
        const mightContainNonBasicASCII = this.model.mightContainNonBasicASCII();
        const tabSize = this.getTabSize();
        const lineData = this._lines.getViewLineData(lineNumber);
        if (lineData.inlineDecorations) {
            inlineDecorations = [
                ...inlineDecorations,
                ...lineData.inlineDecorations.map((d) => d.toInlineDecoration(lineNumber)),
            ];
        }
        return new ViewLineRenderingData(lineData.minColumn, lineData.maxColumn, lineData.content, lineData.continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, lineData.tokens, inlineDecorations, tabSize, lineData.startVisibleColumn);
    }
    getViewLineData(lineNumber) {
        return this._lines.getViewLineData(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        const result = this._lines.getViewLinesData(startLineNumber, endLineNumber, needed);
        return new MinimapLinesRenderingData(this.getTabSize(), result);
    }
    getAllOverviewRulerDecorations(theme) {
        const decorations = this.model.getOverviewRulerDecorations(this._editorId, filterValidationDecorations(this._configuration.options));
        const result = new OverviewRulerDecorations();
        for (const decoration of decorations) {
            const decorationOptions = decoration.options;
            const opts = decorationOptions.overviewRuler;
            if (!opts) {
                continue;
            }
            const lane = opts.position;
            if (lane === 0) {
                continue;
            }
            const color = opts.getColor(theme.value);
            const viewStartLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.startLineNumber, decoration.range.startColumn);
            const viewEndLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.endLineNumber, decoration.range.endColumn);
            result.accept(color, decorationOptions.zIndex, viewStartLineNumber, viewEndLineNumber, lane);
        }
        return result.asArray;
    }
    _invalidateDecorationsColorCache() {
        const decorations = this.model.getOverviewRulerDecorations();
        for (const decoration of decorations) {
            const opts1 = decoration.options.overviewRuler;
            opts1?.invalidateCachedColor();
            const opts2 = decoration.options.minimap;
            opts2?.invalidateCachedColor();
        }
    }
    getValueInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueInRange(modelRange, eol);
    }
    getValueLengthInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueLengthInRange(modelRange, eol);
    }
    modifyPosition(position, offset) {
        const modelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(position);
        const resultModelPosition = this.model.modifyPosition(modelPosition, offset);
        return this.coordinatesConverter.convertModelPositionToViewPosition(resultModelPosition);
    }
    deduceModelPositionRelativeToViewPosition(viewAnchorPosition, deltaOffset, lineFeedCnt) {
        const modelAnchor = this.coordinatesConverter.convertViewPositionToModelPosition(viewAnchorPosition);
        if (this.model.getEOL().length === 2) {
            // This model uses CRLF, so the delta must take that into account
            if (deltaOffset < 0) {
                deltaOffset -= lineFeedCnt;
            }
            else {
                deltaOffset += lineFeedCnt;
            }
        }
        const modelAnchorOffset = this.model.getOffsetAt(modelAnchor);
        const resultOffset = modelAnchorOffset + deltaOffset;
        return this.model.getPositionAt(resultOffset);
    }
    getPlainTextToCopy(modelRanges, emptySelectionClipboard, forceCRLF) {
        const newLineCharacter = forceCRLF ? '\r\n' : this.model.getEOL();
        modelRanges = modelRanges.slice(0);
        modelRanges.sort(Range.compareRangesUsingStarts);
        let hasEmptyRange = false;
        let hasNonEmptyRange = false;
        for (const range of modelRanges) {
            if (range.isEmpty()) {
                hasEmptyRange = true;
            }
            else {
                hasNonEmptyRange = true;
            }
        }
        if (!hasNonEmptyRange) {
            // all ranges are empty
            if (!emptySelectionClipboard) {
                return '';
            }
            const modelLineNumbers = modelRanges.map((r) => r.startLineNumber);
            let result = '';
            for (let i = 0; i < modelLineNumbers.length; i++) {
                if (i > 0 && modelLineNumbers[i - 1] === modelLineNumbers[i]) {
                    continue;
                }
                result += this.model.getLineContent(modelLineNumbers[i]) + newLineCharacter;
            }
            return result;
        }
        if (hasEmptyRange && emptySelectionClipboard) {
            // mixed empty selections and non-empty selections
            const result = [];
            let prevModelLineNumber = 0;
            for (const modelRange of modelRanges) {
                const modelLineNumber = modelRange.startLineNumber;
                if (modelRange.isEmpty()) {
                    if (modelLineNumber !== prevModelLineNumber) {
                        result.push(this.model.getLineContent(modelLineNumber));
                    }
                }
                else {
                    result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
                }
                prevModelLineNumber = modelLineNumber;
            }
            return result.length === 1 ? result[0] : result;
        }
        const result = [];
        for (const modelRange of modelRanges) {
            if (!modelRange.isEmpty()) {
                result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
            }
        }
        return result.length === 1 ? result[0] : result;
    }
    getRichTextToCopy(modelRanges, emptySelectionClipboard) {
        const languageId = this.model.getLanguageId();
        if (languageId === PLAINTEXT_LANGUAGE_ID) {
            return null;
        }
        if (modelRanges.length !== 1) {
            // no multiple selection support at this time
            return null;
        }
        let range = modelRanges[0];
        if (range.isEmpty()) {
            if (!emptySelectionClipboard) {
                // nothing to copy
                return null;
            }
            const lineNumber = range.startLineNumber;
            range = new Range(lineNumber, this.model.getLineMinColumn(lineNumber), lineNumber, this.model.getLineMaxColumn(lineNumber));
        }
        const fontInfo = this._configuration.options.get(52 /* EditorOption.fontInfo */);
        const colorMap = this._getColorMap();
        const hasBadChars = /[:;\\\/<>]/.test(fontInfo.fontFamily);
        const useDefaultFontFamily = hasBadChars || fontInfo.fontFamily === EDITOR_FONT_DEFAULTS.fontFamily;
        let fontFamily;
        if (useDefaultFontFamily) {
            fontFamily = EDITOR_FONT_DEFAULTS.fontFamily;
        }
        else {
            fontFamily = fontInfo.fontFamily;
            fontFamily = fontFamily.replace(/"/g, "'");
            const hasQuotesOrIsList = /[,']/.test(fontFamily);
            if (!hasQuotesOrIsList) {
                const needsQuotes = /[+ ]/.test(fontFamily);
                if (needsQuotes) {
                    fontFamily = `'${fontFamily}'`;
                }
            }
            fontFamily = `${fontFamily}, ${EDITOR_FONT_DEFAULTS.fontFamily}`;
        }
        return {
            mode: languageId,
            html: `<div style="` +
                `color: ${colorMap[1 /* ColorId.DefaultForeground */]};` +
                `background-color: ${colorMap[2 /* ColorId.DefaultBackground */]};` +
                `font-family: ${fontFamily};` +
                `font-weight: ${fontInfo.fontWeight};` +
                `font-size: ${fontInfo.fontSize}px;` +
                `line-height: ${fontInfo.lineHeight}px;` +
                `white-space: pre;` +
                `">` +
                this._getHTMLToCopy(range, colorMap) +
                '</div>',
        };
    }
    _getHTMLToCopy(modelRange, colorMap) {
        const startLineNumber = modelRange.startLineNumber;
        const startColumn = modelRange.startColumn;
        const endLineNumber = modelRange.endLineNumber;
        const endColumn = modelRange.endColumn;
        const tabSize = this.getTabSize();
        let result = '';
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineTokens = this.model.tokenization.getLineTokens(lineNumber);
            const lineContent = lineTokens.getLineContent();
            const startOffset = lineNumber === startLineNumber ? startColumn - 1 : 0;
            const endOffset = lineNumber === endLineNumber ? endColumn - 1 : lineContent.length;
            if (lineContent === '') {
                result += '<br>';
            }
            else {
                result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, tabSize, platform.isWindows);
            }
        }
        return result;
    }
    _getColorMap() {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = ['#000000'];
        if (colorMap) {
            for (let i = 1, len = colorMap.length; i < len; i++) {
                result[i] = Color.Format.CSS.formatHex(colorMap[i]);
            }
        }
        return result;
    }
    //#region cursor operations
    getPrimaryCursorState() {
        return this._cursor.getPrimaryCursorState();
    }
    getLastAddedCursorIndex() {
        return this._cursor.getLastAddedCursorIndex();
    }
    getCursorStates() {
        return this._cursor.getCursorStates();
    }
    setCursorStates(source, reason, states) {
        return this._withViewEventsCollector((eventsCollector) => this._cursor.setStates(eventsCollector, source, reason, states));
    }
    getCursorColumnSelectData() {
        return this._cursor.getCursorColumnSelectData();
    }
    getCursorAutoClosedCharacters() {
        return this._cursor.getAutoClosedCharacters();
    }
    setCursorColumnSelectData(columnSelectData) {
        this._cursor.setCursorColumnSelectData(columnSelectData);
    }
    getPrevEditOperationType() {
        return this._cursor.getPrevEditOperationType();
    }
    setPrevEditOperationType(type) {
        this._cursor.setPrevEditOperationType(type);
    }
    getSelection() {
        return this._cursor.getSelection();
    }
    getSelections() {
        return this._cursor.getSelections();
    }
    getPosition() {
        return this._cursor.getPrimaryCursorState().modelState.position;
    }
    setSelections(source, selections, reason = 0 /* CursorChangeReason.NotSet */) {
        this._withViewEventsCollector((eventsCollector) => this._cursor.setSelections(eventsCollector, source, selections, reason));
    }
    saveCursorState() {
        return this._cursor.saveState();
    }
    restoreCursorState(states) {
        this._withViewEventsCollector((eventsCollector) => this._cursor.restoreState(eventsCollector, states));
    }
    _executeCursorEdit(callback) {
        if (this._cursor.context.cursorConfig.readOnly) {
            // we cannot edit when read only...
            this._eventDispatcher.emitOutgoingEvent(new ReadOnlyEditAttemptEvent());
            return;
        }
        this._withViewEventsCollector(callback);
    }
    executeEdits(source, edits, cursorStateComputer) {
        this._executeCursorEdit((eventsCollector) => this._cursor.executeEdits(eventsCollector, source, edits, cursorStateComputer));
    }
    startComposition() {
        this._executeCursorEdit((eventsCollector) => this._cursor.startComposition(eventsCollector));
    }
    endComposition(source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.endComposition(eventsCollector, source));
    }
    type(text, source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.type(eventsCollector, text, source));
    }
    compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.compositionType(eventsCollector, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source));
    }
    paste(text, pasteOnNewLine, multicursorText, source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.paste(eventsCollector, text, pasteOnNewLine, multicursorText, source));
    }
    cut(source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.cut(eventsCollector, source));
    }
    executeCommand(command, source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.executeCommand(eventsCollector, command, source));
    }
    executeCommands(commands, source) {
        this._executeCursorEdit((eventsCollector) => this._cursor.executeCommands(eventsCollector, commands, source));
    }
    revealAllCursors(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector((eventsCollector) => this._cursor.revealAll(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealPrimaryCursor(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector((eventsCollector) => this._cursor.revealPrimary(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealTopMostCursor(source) {
        const viewPosition = this._cursor.getTopMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector((eventsCollector) => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealBottomMostCursor(source) {
        const viewPosition = this._cursor.getBottomMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector((eventsCollector) => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealRange(source, revealHorizontal, viewRange, verticalType, scrollType) {
        this._withViewEventsCollector((eventsCollector) => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, verticalType, revealHorizontal, scrollType)));
    }
    //#endregion
    //#region viewLayout
    changeWhitespace(callback) {
        const hadAChange = this.viewLayout.changeWhitespace(callback);
        if (hadAChange) {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewZonesChangedEvent());
            this._eventDispatcher.emitOutgoingEvent(new ViewZonesChangedEvent());
        }
    }
    //#endregion
    _withViewEventsCollector(callback) {
        return this._transactionalTarget.batchChanges(() => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                return callback(eventsCollector);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        });
    }
    batchEvents(callback) {
        this._withViewEventsCollector(() => {
            callback();
        });
    }
    normalizePosition(position, affinity) {
        return this._lines.normalizePosition(position, affinity);
    }
    /**
     * Gets the column at which indentation stops at a given line.
     * @internal
     */
    getLineIndentColumn(lineNumber) {
        return this._lines.getLineIndentColumn(lineNumber);
    }
}
class ViewportStart {
    static create(model) {
        const viewportStartLineTrackedRange = model._setTrackedRange(null, new Range(1, 1, 1, 1), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        return new ViewportStart(model, 1, false, viewportStartLineTrackedRange, 0);
    }
    get viewLineNumber() {
        return this._viewLineNumber;
    }
    get isValid() {
        return this._isValid;
    }
    get modelTrackedRange() {
        return this._modelTrackedRange;
    }
    get startLineDelta() {
        return this._startLineDelta;
    }
    constructor(_model, _viewLineNumber, _isValid, _modelTrackedRange, _startLineDelta) {
        this._model = _model;
        this._viewLineNumber = _viewLineNumber;
        this._isValid = _isValid;
        this._modelTrackedRange = _modelTrackedRange;
        this._startLineDelta = _startLineDelta;
    }
    dispose() {
        this._model._setTrackedRange(this._modelTrackedRange, null, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
    }
    update(viewModel, startLineNumber) {
        const position = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(startLineNumber, viewModel.getLineMinColumn(startLineNumber)));
        const viewportStartLineTrackedRange = viewModel.model._setTrackedRange(this._modelTrackedRange, new Range(position.lineNumber, position.column, position.lineNumber, position.column), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        const viewportStartLineTop = viewModel.viewLayout.getVerticalOffsetForLineNumber(startLineNumber);
        const scrollTop = viewModel.viewLayout.getCurrentScrollTop();
        this._viewLineNumber = startLineNumber;
        this._isValid = true;
        this._modelTrackedRange = viewportStartLineTrackedRange;
        this._startLineDelta = scrollTop - viewportStartLineTop;
    }
    invalidate() {
        this._isValid = false;
    }
}
class OverviewRulerDecorations {
    constructor() {
        this._asMap = Object.create(null);
        this.asArray = [];
    }
    accept(color, zIndex, startLineNumber, endLineNumber, lane) {
        const prevGroup = this._asMap[color];
        if (prevGroup) {
            const prevData = prevGroup.data;
            const prevLane = prevData[prevData.length - 3];
            const prevEndLineNumber = prevData[prevData.length - 1];
            if (prevLane === lane && prevEndLineNumber + 1 >= startLineNumber) {
                // merge into prev
                if (endLineNumber > prevEndLineNumber) {
                    prevData[prevData.length - 1] = endLineNumber;
                }
                return;
            }
            // push
            prevData.push(lane, startLineNumber, endLineNumber);
        }
        else {
            const group = new OverviewRulerDecorationsGroup(color, zIndex, [
                lane,
                startLineNumber,
                endLineNumber,
            ]);
            this._asMap[color] = group;
            this.asArray.push(group);
        }
    }
}
class HiddenAreasModel {
    constructor() {
        this.hiddenAreas = new Map();
        this.shouldRecompute = false;
        this.ranges = [];
    }
    setHiddenAreas(source, ranges) {
        const existing = this.hiddenAreas.get(source);
        if (existing && rangeArraysEqual(existing, ranges)) {
            return;
        }
        this.hiddenAreas.set(source, ranges);
        this.shouldRecompute = true;
    }
    /**
     * The returned array is immutable.
     */
    getMergedRanges() {
        if (!this.shouldRecompute) {
            return this.ranges;
        }
        this.shouldRecompute = false;
        const newRanges = Array.from(this.hiddenAreas.values()).reduce((r, hiddenAreas) => mergeLineRangeArray(r, hiddenAreas), []);
        if (rangeArraysEqual(this.ranges, newRanges)) {
            return this.ranges;
        }
        this.ranges = newRanges;
        return this.ranges;
    }
}
function mergeLineRangeArray(arr1, arr2) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const item1 = arr1[i];
        const item2 = arr2[j];
        if (item1.endLineNumber < item2.startLineNumber - 1) {
            result.push(arr1[i++]);
        }
        else if (item2.endLineNumber < item1.startLineNumber - 1) {
            result.push(arr2[j++]);
        }
        else {
            const startLineNumber = Math.min(item1.startLineNumber, item2.startLineNumber);
            const endLineNumber = Math.max(item1.endLineNumber, item2.endLineNumber);
            result.push(new Range(startLineNumber, 1, endLineNumber, 1));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i++]);
    }
    while (j < arr2.length) {
        result.push(arr2[j++]);
    }
    return result;
}
function rangeArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (!arr1[i].equalsRange(arr2[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Maintain a stable viewport by trying to keep the first line in the viewport constant.
 */
class StableViewport {
    constructor(viewportStartModelPosition, startLineDelta) {
        this.viewportStartModelPosition = viewportStartModelPosition;
        this.startLineDelta = startLineDelta;
    }
    recoverViewportStart(coordinatesConverter, viewLayout) {
        if (!this.viewportStartModelPosition) {
            return;
        }
        const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(this.viewportStartModelPosition);
        const viewPositionTop = viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
        viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this.startLineDelta }, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL3ZpZXdNb2RlbEltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFHTixvQkFBb0IsRUFDcEIsMkJBQTJCLEdBQzNCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxFQUNOLG1CQUFtQixHQUtuQixNQUFNLG9CQUFvQixDQUFBO0FBRTNCLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFvQnhDLE9BQU8sS0FBSyxlQUFlLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFeEUsT0FBTyxLQUFLLFVBQVUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxP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