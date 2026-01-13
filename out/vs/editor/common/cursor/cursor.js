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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sV0FBVyxFQUNYLG1CQUFtQixHQUtuQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDOUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUUsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLGtCQUFrQixDQUFBO0FBQ2hELE9BQU8sRUFBYyxTQUFTLEVBQXNCLE1BQU0sc0JBQXNCLENBQUE7QUFVaEYsT0FBTyxFQUVOLDZCQUE2QixHQUU3QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFFTiwyQkFBMkIsRUFDM0IsMkJBQTJCLEdBQzNCLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQTRCLE1BQU0sZ0NBQWdDLENBQUE7QUFFbEcsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFVBQVU7SUFl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