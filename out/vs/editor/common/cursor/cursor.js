/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import * as strings from '../../../base/common/strings.js';
import { CursorCollection } from './cursorCollection.js';
import { CursorState, EditOperationResult, } from '../cursorCommon.js';
import { CursorContext } from './cursorContext.js';
import { DeleteOperations } from './cursorDeleteOperations.js';
import { CompositionOutcome, TypeOperations } from './cursorTypeOperations.js';
import { BaseTypeWithAutoClosingCommand } from './cursorTypeEditOperations.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { ModelInjectedTextChangedEvent, } from '../textModelEvents.js';
import { ViewCursorStateChangedEvent, ViewRevealRangeRequestEvent, } from '../viewEvents.js';
import { dispose, Disposable } from '../../../base/common/lifecycle.js';
import { CursorStateChangedEvent } from '../viewModelEventDispatcher.js';
export class CursorsController extends Disposable {
    constructor(model, viewModel, coordinatesConverter, cursorConfig) {
        super();
        this._model = model;
        this._knownModelVersionId = this._model.getVersionId();
        this._viewModel = viewModel;
        this._coordinatesConverter = coordinatesConverter;
        this.context = new CursorContext(this._model, this._viewModel, this._coordinatesConverter, cursorConfig);
        this._cursors = new CursorCollection(this.context);
        this._hasFocus = false;
        this._isHandling = false;
        this._compositionState = null;
        this._columnSelectData = null;
        this._autoClosedActions = [];
        this._prevEditOperationType = 0 /* EditOperationType.Other */;
    }
    dispose() {
        this._cursors.dispose();
        this._autoClosedActions = dispose(this._autoClosedActions);
        super.dispose();
    }
    updateConfiguration(cursorConfig) {
        this.context = new CursorContext(this._model, this._viewModel, this._coordinatesConverter, cursorConfig);
        this._cursors.updateContext(this.context);
    }
    onLineMappingChanged(eventsCollector) {
        if (this._knownModelVersionId !== this._model.getVersionId()) {
            // There are model change events that I didn't yet receive.
            //
            // This can happen when editing the model, and the view model receives the change events first,
            // and the view model emits line mapping changed events, all before the cursor gets a chance to
            // recover from markers.
            //
            // The model change listener above will be called soon and we'll ensure a valid cursor state there.
            return;
        }
        // Ensure valid state
        this.setStates(eventsCollector, 'viewModel', 0 /* CursorChangeReason.NotSet */, this.getCursorStates());
    }
    setHasFocus(hasFocus) {
        this._hasFocus = hasFocus;
    }
    _validateAutoClosedActions() {
        if (this._autoClosedActions.length > 0) {
            const selections = this._cursors.getSelections();
            for (let i = 0; i < this._autoClosedActions.length; i++) {
                const autoClosedAction = this._autoClosedActions[i];
                if (!autoClosedAction.isValid(selections)) {
                    autoClosedAction.dispose();
                    this._autoClosedActions.splice(i, 1);
                    i--;
                }
            }
        }
    }
    // ------ some getters/setters
    getPrimaryCursorState() {
        return this._cursors.getPrimaryCursor();
    }
    getLastAddedCursorIndex() {
        return this._cursors.getLastAddedCursorIndex();
    }
    getCursorStates() {
        return this._cursors.getAll();
    }
    setStates(eventsCollector, source, reason, states) {
        let reachedMaxCursorCount = false;
        const multiCursorLimit = this.context.cursorConfig.multiCursorLimit;
        if (states !== null && states.length > multiCursorLimit) {
            states = states.slice(0, multiCursorLimit);
            reachedMaxCursorCount = true;
        }
        const oldState = CursorModelState.from(this._model, this);
        this._cursors.setStates(states);
        this._cursors.normalize();
        this._columnSelectData = null;
        this._validateAutoClosedActions();
        return this._emitStateChangedIfNecessary(eventsCollector, source, reason, oldState, reachedMaxCursorCount);
    }
    setCursorColumnSelectData(columnSelectData) {
        this._columnSelectData = columnSelectData;
    }
    revealAll(eventsCollector, source, minimalReveal, verticalType, revealHorizontal, scrollType) {
        const viewPositions = this._cursors.getViewPositions();
        let revealViewRange = null;
        let revealViewSelections = null;
        if (viewPositions.length > 1) {
            revealViewSelections = this._cursors.getViewSelections();
        }
        else {
            revealViewRange = Range.fromPositions(viewPositions[0], viewPositions[0]);
        }
        eventsCollector.emitViewEvent(new ViewRevealRangeRequestEvent(source, minimalReveal, revealViewRange, revealViewSelections, verticalType, revealHorizontal, scrollType));
    }
    revealPrimary(eventsCollector, source, minimalReveal, verticalType, revealHorizontal, scrollType) {
        const primaryCursor = this._cursors.getPrimaryCursor();
        const revealViewSelections = [primaryCursor.viewState.selection];
        eventsCollector.emitViewEvent(new ViewRevealRangeRequestEvent(source, minimalReveal, null, revealViewSelections, verticalType, revealHorizontal, scrollType));
    }
    saveState() {
        const result = [];
        const selections = this._cursors.getSelections();
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            result.push({
                inSelectionMode: !selection.isEmpty(),
                selectionStart: {
                    lineNumber: selection.selectionStartLineNumber,
                    column: selection.selectionStartColumn,
                },
                position: {
                    lineNumber: selection.positionLineNumber,
                    column: selection.positionColumn,
                },
            });
        }
        return result;
    }
    restoreState(eventsCollector, states) {
        const desiredSelections = [];
        for (let i = 0, len = states.length; i < len; i++) {
            const state = states[i];
            let positionLineNumber = 1;
            let positionColumn = 1;
            // Avoid missing properties on the literal
            if (state.position && state.position.lineNumber) {
                positionLineNumber = state.position.lineNumber;
            }
            if (state.position && state.position.column) {
                positionColumn = state.position.column;
            }
            let selectionStartLineNumber = positionLineNumber;
            let selectionStartColumn = positionColumn;
            // Avoid missing properties on the literal
            if (state.selectionStart && state.selectionStart.lineNumber) {
                selectionStartLineNumber = state.selectionStart.lineNumber;
            }
            if (state.selectionStart && state.selectionStart.column) {
                selectionStartColumn = state.selectionStart.column;
            }
            desiredSelections.push({
                selectionStartLineNumber: selectionStartLineNumber,
                selectionStartColumn: selectionStartColumn,
                positionLineNumber: positionLineNumber,
                positionColumn: positionColumn,
            });
        }
        this.setStates(eventsCollector, 'restoreState', 0 /* CursorChangeReason.NotSet */, CursorState.fromModelSelections(desiredSelections));
        this.revealAll(eventsCollector, 'restoreState', false, 0 /* VerticalRevealType.Simple */, true, 1 /* editorCommon.ScrollType.Immediate */);
    }
    onModelContentChanged(eventsCollector, event) {
        if (event instanceof ModelInjectedTextChangedEvent) {
            // If injected texts change, the view positions of all cursors need to be updated.
            if (this._isHandling) {
                // The view positions will be updated when handling finishes
                return;
            }
            // setStates might remove markers, which could trigger a decoration change.
            // If there are injected text decorations for that line, `onModelContentChanged` is emitted again
            // and an endless recursion happens.
            // _isHandling prevents that.
            this._isHandling = true;
            try {
                this.setStates(eventsCollector, 'modelChange', 0 /* CursorChangeReason.NotSet */, this.getCursorStates());
            }
            finally {
                this._isHandling = false;
            }
        }
        else {
            const e = event.rawContentChangedEvent;
            this._knownModelVersionId = e.versionId;
            if (this._isHandling) {
                return;
            }
            const hadFlushEvent = e.containsEvent(1 /* RawContentChangedType.Flush */);
            this._prevEditOperationType = 0 /* EditOperationType.Other */;
            if (hadFlushEvent) {
                // a model.setValue() was called
                this._cursors.dispose();
                this._cursors = new CursorCollection(this.context);
                this._validateAutoClosedActions();
                this._emitStateChangedIfNecessary(eventsCollector, 'model', 1 /* CursorChangeReason.ContentFlush */, null, false);
            }
            else {
                if (this._hasFocus && e.resultingSelection && e.resultingSelection.length > 0) {
                    const cursorState = CursorState.fromModelSelections(e.resultingSelection);
                    if (this.setStates(eventsCollector, 'modelChange', e.isUndoing
                        ? 5 /* CursorChangeReason.Undo */
                        : e.isRedoing
                            ? 6 /* CursorChangeReason.Redo */
                            : 2 /* CursorChangeReason.RecoverFromMarkers */, cursorState)) {
                        this.revealAll(eventsCollector, 'modelChange', false, 0 /* VerticalRevealType.Simple */, true, 0 /* editorCommon.ScrollType.Smooth */);
                    }
                }
                else {
                    const selectionsFromMarkers = this._cursors.readSelectionFromMarkers();
                    this.setStates(eventsCollector, 'modelChange', 2 /* CursorChangeReason.RecoverFromMarkers */, CursorState.fromModelSelections(selectionsFromMarkers));
                }
            }
        }
    }
    getSelection() {
        return this._cursors.getPrimaryCursor().modelState.selection;
    }
    getTopMostViewPosition() {
        return this._cursors.getTopMostViewPosition();
    }
    getBottomMostViewPosition() {
        return this._cursors.getBottomMostViewPosition();
    }
    getCursorColumnSelectData() {
        if (this._columnSelectData) {
            return this._columnSelectData;
        }
        const primaryCursor = this._cursors.getPrimaryCursor();
        const viewSelectionStart = primaryCursor.viewState.selectionStart.getStartPosition();
        const viewPosition = primaryCursor.viewState.position;
        return {
            isReal: false,
            fromViewLineNumber: viewSelectionStart.lineNumber,
            fromViewVisualColumn: this.context.cursorConfig.visibleColumnFromColumn(this._viewModel, viewSelectionStart),
            toViewLineNumber: viewPosition.lineNumber,
            toViewVisualColumn: this.context.cursorConfig.visibleColumnFromColumn(this._viewModel, viewPosition),
        };
    }
    getSelections() {
        return this._cursors.getSelections();
    }
    getPosition() {
        return this._cursors.getPrimaryCursor().modelState.position;
    }
    setSelections(eventsCollector, source, selections, reason) {
        this.setStates(eventsCollector, source, reason, CursorState.fromModelSelections(selections));
    }
    getPrevEditOperationType() {
        return this._prevEditOperationType;
    }
    setPrevEditOperationType(type) {
        this._prevEditOperationType = type;
    }
    // ------ auxiliary handling logic
    _pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges) {
        const autoClosedCharactersDeltaDecorations = [];
        const autoClosedEnclosingDeltaDecorations = [];
        for (let i = 0, len = autoClosedCharactersRanges.length; i < len; i++) {
            autoClosedCharactersDeltaDecorations.push({
                range: autoClosedCharactersRanges[i],
                options: {
                    description: 'auto-closed-character',
                    inlineClassName: 'auto-closed-character',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                },
            });
            autoClosedEnclosingDeltaDecorations.push({
                range: autoClosedEnclosingRanges[i],
                options: {
                    description: 'auto-closed-enclosing',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                },
            });
        }
        const autoClosedCharactersDecorations = this._model.deltaDecorations([], autoClosedCharactersDeltaDecorations);
        const autoClosedEnclosingDecorations = this._model.deltaDecorations([], autoClosedEnclosingDeltaDecorations);
        this._autoClosedActions.push(new AutoClosedAction(this._model, autoClosedCharactersDecorations, autoClosedEnclosingDecorations));
    }
    _executeEditOperation(opResult) {
        if (!opResult) {
            // Nothing to execute
            return;
        }
        if (opResult.shouldPushStackElementBefore) {
            this._model.pushStackElement();
        }
        const result = CommandExecutor.executeCommands(this._model, this._cursors.getSelections(), opResult.commands);
        if (result) {
            // The commands were applied correctly
            this._interpretCommandResult(result);
            // Check for auto-closing closed characters
            const autoClosedCharactersRanges = [];
            const autoClosedEnclosingRanges = [];
            for (let i = 0; i < opResult.commands.length; i++) {
                const command = opResult.commands[i];
                if (command instanceof BaseTypeWithAutoClosingCommand &&
                    command.enclosingRange &&
                    command.closeCharacterRange) {
                    autoClosedCharactersRanges.push(command.closeCharacterRange);
                    autoClosedEnclosingRanges.push(command.enclosingRange);
                }
            }
            if (autoClosedCharactersRanges.length > 0) {
                this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
            }
            this._prevEditOperationType = opResult.type;
        }
        if (opResult.shouldPushStackElementAfter) {
            this._model.pushStackElement();
        }
    }
    _interpretCommandResult(cursorState) {
        if (!cursorState || cursorState.length === 0) {
            cursorState = this._cursors.readSelectionFromMarkers();
        }
        this._columnSelectData = null;
        this._cursors.setSelections(cursorState);
        this._cursors.normalize();
    }
    // -----------------------------------------------------------------------------------------------------------
    // ----- emitting events
    _emitStateChangedIfNecessary(eventsCollector, source, reason, oldState, reachedMaxCursorCount) {
        const newState = CursorModelState.from(this._model, this);
        if (newState.equals(oldState)) {
            return false;
        }
        const selections = this._cursors.getSelections();
        const viewSelections = this._cursors.getViewSelections();
        // Let the view get the event first.
        eventsCollector.emitViewEvent(new ViewCursorStateChangedEvent(viewSelections, selections, reason));
        // Only after the view has been notified, let the rest of the world know...
        if (!oldState ||
            oldState.cursorState.length !== newState.cursorState.length ||
            newState.cursorState.some((newCursorState, i) => !newCursorState.modelState.equals(oldState.cursorState[i].modelState))) {
            const oldSelections = oldState
                ? oldState.cursorState.map((s) => s.modelState.selection)
                : null;
            const oldModelVersionId = oldState ? oldState.modelVersionId : 0;
            eventsCollector.emitOutgoingEvent(new CursorStateChangedEvent(oldSelections, selections, oldModelVersionId, newState.modelVersionId, source || 'keyboard', reason, reachedMaxCursorCount));
        }
        return true;
    }
    // -----------------------------------------------------------------------------------------------------------
    // ----- handlers beyond this point
    _findAutoClosingPairs(edits) {
        if (!edits.length) {
            return null;
        }
        const indices = [];
        for (let i = 0, len = edits.length; i < len; i++) {
            const edit = edits[i];
            if (!edit.text || edit.text.indexOf('\n') >= 0) {
                return null;
            }
            const m = edit.text.match(/([)\]}>'"`])([^)\]}>'"`]*)$/);
            if (!m) {
                return null;
            }
            const closeChar = m[1];
            const autoClosingPairsCandidates = this.context.cursorConfig.autoClosingPairs.autoClosingPairsCloseSingleChar.get(closeChar);
            if (!autoClosingPairsCandidates || autoClosingPairsCandidates.length !== 1) {
                return null;
            }
            const openChar = autoClosingPairsCandidates[0].open;
            const closeCharIndex = edit.text.length - m[2].length - 1;
            const openCharIndex = edit.text.lastIndexOf(openChar, closeCharIndex - 1);
            if (openCharIndex === -1) {
                return null;
            }
            indices.push([openCharIndex, closeCharIndex]);
        }
        return indices;
    }
    executeEdits(eventsCollector, source, edits, cursorStateComputer) {
        let autoClosingIndices = null;
        if (source === 'snippet') {
            autoClosingIndices = this._findAutoClosingPairs(edits);
        }
        if (autoClosingIndices) {
            edits[0]._isTracked = true;
        }
        const autoClosedCharactersRanges = [];
        const autoClosedEnclosingRanges = [];
        const selections = this._model.pushEditOperations(this.getSelections(), edits, (undoEdits) => {
            if (autoClosingIndices) {
                for (let i = 0, len = autoClosingIndices.length; i < len; i++) {
                    const [openCharInnerIndex, closeCharInnerIndex] = autoClosingIndices[i];
                    const undoEdit = undoEdits[i];
                    const lineNumber = undoEdit.range.startLineNumber;
                    const openCharIndex = undoEdit.range.startColumn - 1 + openCharInnerIndex;
                    const closeCharIndex = undoEdit.range.startColumn - 1 + closeCharInnerIndex;
                    autoClosedCharactersRanges.push(new Range(lineNumber, closeCharIndex + 1, lineNumber, closeCharIndex + 2));
                    autoClosedEnclosingRanges.push(new Range(lineNumber, openCharIndex + 1, lineNumber, closeCharIndex + 2));
                }
            }
            const selections = cursorStateComputer(undoEdits);
            if (selections) {
                // Don't recover the selection from markers because
                // we know what it should be.
                this._isHandling = true;
            }
            return selections;
        });
        if (selections) {
            this._isHandling = false;
            this.setSelections(eventsCollector, source, selections, 0 /* CursorChangeReason.NotSet */);
        }
        if (autoClosedCharactersRanges.length > 0) {
            this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
        }
    }
    _executeEdit(callback, eventsCollector, source, cursorChangeReason = 0 /* CursorChangeReason.NotSet */) {
        if (this.context.cursorConfig.readOnly) {
            // we cannot edit when read only...
            return;
        }
        const oldState = CursorModelState.from(this._model, this);
        this._cursors.stopTrackingSelections();
        this._isHandling = true;
        try {
            this._cursors.ensureValidState();
            callback();
        }
        catch (err) {
            onUnexpectedError(err);
        }
        this._isHandling = false;
        this._cursors.startTrackingSelections();
        this._validateAutoClosedActions();
        if (this._emitStateChangedIfNecessary(eventsCollector, source, cursorChangeReason, oldState, false)) {
            this.revealAll(eventsCollector, source, false, 0 /* VerticalRevealType.Simple */, true, 0 /* editorCommon.ScrollType.Smooth */);
        }
    }
    getAutoClosedCharacters() {
        return AutoClosedAction.getAllAutoClosedCharacters(this._autoClosedActions);
    }
    startComposition(eventsCollector) {
        this._compositionState = new CompositionState(this._model, this.getSelections());
    }
    endComposition(eventsCollector, source) {
        const compositionOutcome = this._compositionState
            ? this._compositionState.deduceOutcome(this._model, this.getSelections())
            : null;
        this._compositionState = null;
        this._executeEdit(() => {
            if (source === 'keyboard') {
                // composition finishes, let's check if we need to auto complete if necessary.
                this._executeEditOperation(TypeOperations.compositionEndWithInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, compositionOutcome, this.getSelections(), this.getAutoClosedCharacters()));
            }
        }, eventsCollector, source);
    }
    type(eventsCollector, text, source) {
        this._executeEdit(() => {
            if (source === 'keyboard') {
                // If this event is coming straight from the keyboard, look for electric characters and enter
                const len = text.length;
                let offset = 0;
                while (offset < len) {
                    const charLength = strings.nextCharLength(text, offset);
                    const chr = text.substr(offset, charLength);
                    // Here we must interpret each typed character individually
                    this._executeEditOperation(TypeOperations.typeWithInterceptors(!!this._compositionState, this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), this.getAutoClosedCharacters(), chr));
                    offset += charLength;
                }
            }
            else {
                this._executeEditOperation(TypeOperations.typeWithoutInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text));
            }
        }, eventsCollector, source);
    }
    compositionType(eventsCollector, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source) {
        if (text.length === 0 && replacePrevCharCnt === 0 && replaceNextCharCnt === 0) {
            // this edit is a no-op
            if (positionDelta !== 0) {
                // but it still wants to move the cursor
                const newSelections = this.getSelections().map((selection) => {
                    const position = selection.getPosition();
                    return new Selection(position.lineNumber, position.column + positionDelta, position.lineNumber, position.column + positionDelta);
                });
                this.setSelections(eventsCollector, source, newSelections, 0 /* CursorChangeReason.NotSet */);
            }
            return;
        }
        this._executeEdit(() => {
            this._executeEditOperation(TypeOperations.compositionType(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text, replacePrevCharCnt, replaceNextCharCnt, positionDelta));
        }, eventsCollector, source);
    }
    paste(eventsCollector, text, pasteOnNewLine, multicursorText, source) {
        this._executeEdit(() => {
            this._executeEditOperation(TypeOperations.paste(this.context.cursorConfig, this._model, this.getSelections(), text, pasteOnNewLine, multicursorText || []));
        }, eventsCollector, source, 4 /* CursorChangeReason.Paste */);
    }
    cut(eventsCollector, source) {
        this._executeEdit(() => {
            this._executeEditOperation(DeleteOperations.cut(this.context.cursorConfig, this._model, this.getSelections()));
        }, eventsCollector, source);
    }
    executeCommand(eventsCollector, command, source) {
        this._executeEdit(() => {
            this._cursors.killSecondaryCursors();
            this._executeEditOperation(new EditOperationResult(0 /* EditOperationType.Other */, [command], {
                shouldPushStackElementBefore: false,
                shouldPushStackElementAfter: false,
            }));
        }, eventsCollector, source);
    }
    executeCommands(eventsCollector, commands, source) {
        this._executeEdit(() => {
            this._executeEditOperation(new EditOperationResult(0 /* EditOperationType.Other */, commands, {
                shouldPushStackElementBefore: false,
                shouldPushStackElementAfter: false,
            }));
        }, eventsCollector, source);
    }
}
/**
 * A snapshot of the cursor and the model state
 */
class CursorModelState {
    static from(model, cursor) {
        return new CursorModelState(model.getVersionId(), cursor.getCursorStates());
    }
    constructor(modelVersionId, cursorState) {
        this.modelVersionId = modelVersionId;
        this.cursorState = cursorState;
    }
    equals(other) {
        if (!other) {
            return false;
        }
        if (this.modelVersionId !== other.modelVersionId) {
            return false;
        }
        if (this.cursorState.length !== other.cursorState.length) {
            return false;
        }
        for (let i = 0, len = this.cursorState.length; i < len; i++) {
            if (!this.cursorState[i].equals(other.cursorState[i])) {
                return false;
            }
        }
        return true;
    }
}
class AutoClosedAction {
    static getAllAutoClosedCharacters(autoClosedActions) {
        let autoClosedCharacters = [];
        for (const autoClosedAction of autoClosedActions) {
            autoClosedCharacters = autoClosedCharacters.concat(autoClosedAction.getAutoClosedCharactersRanges());
        }
        return autoClosedCharacters;
    }
    constructor(model, autoClosedCharactersDecorations, autoClosedEnclosingDecorations) {
        this._model = model;
        this._autoClosedCharactersDecorations = autoClosedCharactersDecorations;
        this._autoClosedEnclosingDecorations = autoClosedEnclosingDecorations;
    }
    dispose() {
        this._autoClosedCharactersDecorations = this._model.deltaDecorations(this._autoClosedCharactersDecorations, []);
        this._autoClosedEnclosingDecorations = this._model.deltaDecorations(this._autoClosedEnclosingDecorations, []);
    }
    getAutoClosedCharactersRanges() {
        const result = [];
        for (let i = 0; i < this._autoClosedCharactersDecorations.length; i++) {
            const decorationRange = this._model.getDecorationRange(this._autoClosedCharactersDecorations[i]);
            if (decorationRange) {
                result.push(decorationRange);
            }
        }
        return result;
    }
    isValid(selections) {
        const enclosingRanges = [];
        for (let i = 0; i < this._autoClosedEnclosingDecorations.length; i++) {
            const decorationRange = this._model.getDecorationRange(this._autoClosedEnclosingDecorations[i]);
            if (decorationRange) {
                enclosingRanges.push(decorationRange);
                if (decorationRange.startLineNumber !== decorationRange.endLineNumber) {
                    // Stop tracking if the range becomes multiline...
                    return false;
                }
            }
        }
        enclosingRanges.sort(Range.compareRangesUsingStarts);
        selections.sort(Range.compareRangesUsingStarts);
        for (let i = 0; i < selections.length; i++) {
            if (i >= enclosingRanges.length) {
                return false;
            }
            if (!enclosingRanges[i].strictContainsRange(selections[i])) {
                return false;
            }
        }
        return true;
    }
}
export class CommandExecutor {
    static executeCommands(model, selectionsBefore, commands) {
        const ctx = {
            model: model,
            selectionsBefore: selectionsBefore,
            trackedRanges: [],
            trackedRangesDirection: [],
        };
        const result = this._innerExecuteCommands(ctx, commands);
        for (let i = 0, len = ctx.trackedRanges.length; i < len; i++) {
            ctx.model._setTrackedRange(ctx.trackedRanges[i], null, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
        }
        return result;
    }
    static _innerExecuteCommands(ctx, commands) {
        if (this._arrayIsEmpty(commands)) {
            return null;
        }
        const commandsData = this._getEditOperations(ctx, commands);
        if (commandsData.operations.length === 0) {
            return null;
        }
        const rawOperations = commandsData.operations;
        const loserCursorsMap = this._getLoserCursorMap(rawOperations);
        if (loserCursorsMap.hasOwnProperty('0')) {
            // These commands are very messed up
            console.warn('Ignoring commands');
            return null;
        }
        // Remove operations belonging to losing cursors
        const filteredOperations = [];
        for (let i = 0, len = rawOperations.length; i < len; i++) {
            if (!loserCursorsMap.hasOwnProperty(rawOperations[i].identifier.major.toString())) {
                filteredOperations.push(rawOperations[i]);
            }
        }
        // TODO@Alex: find a better way to do this.
        // give the hint that edit operations are tracked to the model
        if (commandsData.hadTrackedEditOperation && filteredOperations.length > 0) {
            filteredOperations[0]._isTracked = true;
        }
        let selectionsAfter = ctx.model.pushEditOperations(ctx.selectionsBefore, filteredOperations, (inverseEditOperations) => {
            const groupedInverseEditOperations = [];
            for (let i = 0; i < ctx.selectionsBefore.length; i++) {
                groupedInverseEditOperations[i] = [];
            }
            for (const op of inverseEditOperations) {
                if (!op.identifier) {
                    // perhaps auto whitespace trim edits
                    continue;
                }
                groupedInverseEditOperations[op.identifier.major].push(op);
            }
            const minorBasedSorter = (a, b) => {
                return a.identifier.minor - b.identifier.minor;
            };
            const cursorSelections = [];
            for (let i = 0; i < ctx.selectionsBefore.length; i++) {
                if (groupedInverseEditOperations[i].length > 0) {
                    groupedInverseEditOperations[i].sort(minorBasedSorter);
                    cursorSelections[i] = commands[i].computeCursorState(ctx.model, {
                        getInverseEditOperations: () => {
                            return groupedInverseEditOperations[i];
                        },
                        getTrackedSelection: (id) => {
                            const idx = parseInt(id, 10);
                            const range = ctx.model._getTrackedRange(ctx.trackedRanges[idx]);
                            if (ctx.trackedRangesDirection[idx] === 0 /* SelectionDirection.LTR */) {
                                return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                            }
                            return new Selection(range.endLineNumber, range.endColumn, range.startLineNumber, range.startColumn);
                        },
                    });
                }
                else {
                    cursorSelections[i] = ctx.selectionsBefore[i];
                }
            }
            return cursorSelections;
        });
        if (!selectionsAfter) {
            selectionsAfter = ctx.selectionsBefore;
        }
        // Extract losing cursors
        const losingCursors = [];
        for (const losingCursorIndex in loserCursorsMap) {
            if (loserCursorsMap.hasOwnProperty(losingCursorIndex)) {
                losingCursors.push(parseInt(losingCursorIndex, 10));
            }
        }
        // Sort losing cursors descending
        losingCursors.sort((a, b) => {
            return b - a;
        });
        // Remove losing cursors
        for (const losingCursor of losingCursors) {
            selectionsAfter.splice(losingCursor, 1);
        }
        return selectionsAfter;
    }
    static _arrayIsEmpty(commands) {
        for (let i = 0, len = commands.length; i < len; i++) {
            if (commands[i]) {
                return false;
            }
        }
        return true;
    }
    static _getEditOperations(ctx, commands) {
        let operations = [];
        let hadTrackedEditOperation = false;
        for (let i = 0, len = commands.length; i < len; i++) {
            const command = commands[i];
            if (command) {
                const r = this._getEditOperationsFromCommand(ctx, i, command);
                operations = operations.concat(r.operations);
                hadTrackedEditOperation = hadTrackedEditOperation || r.hadTrackedEditOperation;
            }
        }
        return {
            operations: operations,
            hadTrackedEditOperation: hadTrackedEditOperation,
        };
    }
    static _getEditOperationsFromCommand(ctx, majorIdentifier, command) {
        // This method acts as a transaction, if the command fails
        // everything it has done is ignored
        const operations = [];
        let operationMinor = 0;
        const addEditOperation = (range, text, forceMoveMarkers = false) => {
            if (Range.isEmpty(range) && text === '') {
                // This command wants to add a no-op => no thank you
                return;
            }
            operations.push({
                identifier: {
                    major: majorIdentifier,
                    minor: operationMinor++,
                },
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers,
                isAutoWhitespaceEdit: command.insertsAutoWhitespace,
            });
        };
        let hadTrackedEditOperation = false;
        const addTrackedEditOperation = (selection, text, forceMoveMarkers) => {
            hadTrackedEditOperation = true;
            addEditOperation(selection, text, forceMoveMarkers);
        };
        const trackSelection = (_selection, trackPreviousOnEmpty) => {
            const selection = Selection.liftSelection(_selection);
            let stickiness;
            if (selection.isEmpty()) {
                if (typeof trackPreviousOnEmpty === 'boolean') {
                    if (trackPreviousOnEmpty) {
                        stickiness = 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
                    }
                    else {
                        stickiness = 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
                    }
                }
                else {
                    // Try to lock it with surrounding text
                    const maxLineColumn = ctx.model.getLineMaxColumn(selection.startLineNumber);
                    if (selection.startColumn === maxLineColumn) {
                        stickiness = 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
                    }
                    else {
                        stickiness = 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
                    }
                }
            }
            else {
                stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
            }
            const l = ctx.trackedRanges.length;
            const id = ctx.model._setTrackedRange(null, selection, stickiness);
            ctx.trackedRanges[l] = id;
            ctx.trackedRangesDirection[l] = selection.getDirection();
            return l.toString();
        };
        const editOperationBuilder = {
            addEditOperation: addEditOperation,
            addTrackedEditOperation: addTrackedEditOperation,
            trackSelection: trackSelection,
        };
        try {
            command.getEditOperations(ctx.model, editOperationBuilder);
        }
        catch (e) {
            // TODO@Alex use notification service if this should be user facing
            // e.friendlyMessage = nls.localize('corrupt.commands', "Unexpected exception while executing command.");
            onUnexpectedError(e);
            return {
                operations: [],
                hadTrackedEditOperation: false,
            };
        }
        return {
            operations: operations,
            hadTrackedEditOperation: hadTrackedEditOperation,
        };
    }
    static _getLoserCursorMap(operations) {
        // This is destructive on the array
        operations = operations.slice(0);
        // Sort operations with last one first
        operations.sort((a, b) => {
            // Note the minus!
            return -Range.compareRangesUsingEnds(a.range, b.range);
        });
        // Operations can not overlap!
        const loserCursorsMap = {};
        for (let i = 1; i < operations.length; i++) {
            const previousOp = operations[i - 1];
            const currentOp = operations[i];
            if (Range.getStartPosition(previousOp.range).isBefore(Range.getEndPosition(currentOp.range))) {
                let loserMajor;
                if (previousOp.identifier.major > currentOp.identifier.major) {
                    // previousOp loses the battle
                    loserMajor = previousOp.identifier.major;
                }
                else {
                    loserMajor = currentOp.identifier.major;
                }
                loserCursorsMap[loserMajor.toString()] = true;
                for (let j = 0; j < operations.length; j++) {
                    if (operations[j].identifier.major === loserMajor) {
                        operations.splice(j, 1);
                        if (j < i) {
                            i--;
                        }
                        j--;
                    }
                }
                if (i > 0) {
                    i--;
                }
            }
        }
        return loserCursorsMap;
    }
}
class CompositionLineState {
    constructor(text, lineNumber, startSelectionOffset, endSelectionOffset) {
        this.text = text;
        this.lineNumber = lineNumber;
        this.startSelectionOffset = startSelectionOffset;
        this.endSelectionOffset = endSelectionOffset;
    }
}
class CompositionState {
    static _capture(textModel, selections) {
        const result = [];
        for (const selection of selections) {
            if (selection.startLineNumber !== selection.endLineNumber) {
                return null;
            }
            const lineNumber = selection.startLineNumber;
            result.push(new CompositionLineState(textModel.getLineContent(lineNumber), lineNumber, selection.startColumn - 1, selection.endColumn - 1));
        }
        return result;
    }
    constructor(textModel, selections) {
        this._original = CompositionState._capture(textModel, selections);
    }
    /**
     * Returns the inserted text during this composition.
     * If the composition resulted in existing text being changed (i.e. not a pure insertion) it returns null.
     */
    deduceOutcome(textModel, selections) {
        if (!this._original) {
            return null;
        }
        const current = CompositionState._capture(textModel, selections);
        if (!current) {
            return null;
        }
        if (this._original.length !== current.length) {
            return null;
        }
        const result = [];
        for (let i = 0, len = this._original.length; i < len; i++) {
            result.push(CompositionState._deduceOutcome(this._original[i], current[i]));
        }
        return result;
    }
    static _deduceOutcome(original, current) {
        const commonPrefix = Math.min(original.startSelectionOffset, current.startSelectionOffset, strings.commonPrefixLength(original.text, current.text));
        const commonSuffix = Math.min(original.text.length - original.endSelectionOffset, current.text.length - current.endSelectionOffset, strings.commonSuffixLength(original.text, current.text));
        const deletedText = original.text.substring(commonPrefix, original.text.length - commonSuffix);
        const insertedTextStartOffset = commonPrefix;
        const insertedTextEndOffset = current.text.length - commonSuffix;
        const insertedText = current.text.substring(insertedTextStartOffset, insertedTextEndOffset);
        const insertedTextRange = new Range(current.lineNumber, insertedTextStartOffset + 1, current.lineNumber, insertedTextEndOffset + 1);
        return new CompositionOutcome(deletedText, original.startSelectionOffset - commonPrefix, original.endSelectionOffset - commonPrefix, insertedText, current.startSelectionOffset - commonPrefix, current.endSelectionOffset - commonPrefix, insertedTextRange);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUVOLFdBQVcsRUFDWCxtQkFBbUIsR0FLbkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzlFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTlFLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRCxPQUFPLEVBQWMsU0FBUyxFQUFzQixNQUFNLHNCQUFzQixDQUFBO0FBVWhGLE9BQU8sRUFFTiw2QkFBNkIsR0FFN0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBRU4sMkJBQTJCLEVBQzNCLDJCQUEyQixHQUMzQixNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkUsT0FBTyxFQUFFLHVCQUF1QixFQUE0QixNQUFNLGdDQUFnQyxDQUFBO0FBRWxHLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxVQUFVO0lBZWhELFlBQ0MsS0FBaUIsRUFDakIsU0FB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