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
var TextModel_1;
import { ArrayQueue, pushMany } from '../../../base/common/arrays.js';
import { Color } from '../../../base/common/color.js';
import { BugIndicatingError, illegalArgument, onUnexpectedError, } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, MutableDisposable, combinedDisposable, } from '../../../base/common/lifecycle.js';
import { listenStream } from '../../../base/common/stream.js';
import * as strings from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { countEOL } from '../core/eolCounter.js';
import { normalizeIndentation } from '../core/indentation.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import { ILanguageService } from '../languages/language.js';
import { ILanguageConfigurationService } from '../languages/languageConfigurationRegistry.js';
import * as model from '../model.js';
import { BracketPairsTextModelPart } from './bracketPairsTextModelPart/bracketPairsImpl.js';
import { ColorizedBracketPairsDecorationProvider } from './bracketPairsTextModelPart/colorizedBracketPairsDecorationProvider.js';
import { EditStack } from './editStack.js';
import { GuidesTextModelPart } from './guidesTextModelPart.js';
import { guessIndentation } from './indentationGuesser.js';
import { IntervalNode, IntervalTree, recomputeMaxEnd } from './intervalTree.js';
import { PieceTreeTextBuffer } from './pieceTreeTextBuffer/pieceTreeTextBuffer.js';
import { PieceTreeTextBufferBuilder } from './pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { SearchParams, TextModelSearch } from './textModelSearch.js';
import { TokenizationTextModelPart } from './tokenizationTextModelPart.js';
import { AttachedViews } from './tokens.js';
import { InternalModelContentChangeEvent, LineInjectedText, ModelInjectedTextChangedEvent, ModelRawContentChangedEvent, ModelRawEOLChanged, ModelRawFlush, ModelRawLineChanged, ModelRawLinesDeleted, ModelRawLinesInserted, } from '../textModelEvents.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService, } from '../../../platform/undoRedo/common/undoRedo.js';
export function createTextBufferFactory(text) {
    const builder = new PieceTreeTextBufferBuilder();
    builder.acceptChunk(text);
    return builder.finish();
}
export function createTextBufferFactoryFromStream(stream) {
    return new Promise((resolve, reject) => {
        const builder = new PieceTreeTextBufferBuilder();
        let done = false;
        listenStream(stream, {
            onData: (chunk) => {
                builder.acceptChunk(typeof chunk === 'string' ? chunk : chunk.toString());
            },
            onError: (error) => {
                if (!done) {
                    done = true;
                    reject(error);
                }
            },
            onEnd: () => {
                if (!done) {
                    done = true;
                    resolve(builder.finish());
                }
            },
        });
    });
}
export function createTextBufferFactoryFromSnapshot(snapshot) {
    const builder = new PieceTreeTextBufferBuilder();
    let chunk;
    while (typeof (chunk = snapshot.read()) === 'string') {
        builder.acceptChunk(chunk);
    }
    return builder.finish();
}
export function createTextBuffer(value, defaultEOL) {
    let factory;
    if (typeof value === 'string') {
        factory = createTextBufferFactory(value);
    }
    else if (model.isITextSnapshot(value)) {
        factory = createTextBufferFactoryFromSnapshot(value);
    }
    else {
        factory = value;
    }
    return factory.create(defaultEOL);
}
let MODEL_ID = 0;
const LIMIT_FIND_COUNT = 999;
const LONG_LINE_BOUNDARY = 10000;
class TextModelSnapshot {
    constructor(source) {
        this._source = source;
        this._eos = false;
    }
    read() {
        if (this._eos) {
            return null;
        }
        const result = [];
        let resultCnt = 0;
        let resultLength = 0;
        do {
            const tmp = this._source.read();
            if (tmp === null) {
                // end-of-stream
                this._eos = true;
                if (resultCnt === 0) {
                    return null;
                }
                else {
                    return result.join('');
                }
            }
            if (tmp.length > 0) {
                result[resultCnt++] = tmp;
                resultLength += tmp.length;
            }
            if (resultLength >= 64 * 1024) {
                return result.join('');
            }
        } while (true);
    }
}
const invalidFunc = () => {
    throw new Error(`Invalid change accessor`);
};
var StringOffsetValidationType;
(function (StringOffsetValidationType) {
    /**
     * Even allowed in surrogate pairs
     */
    StringOffsetValidationType[StringOffsetValidationType["Relaxed"] = 0] = "Relaxed";
    /**
     * Not allowed in surrogate pairs
     */
    StringOffsetValidationType[StringOffsetValidationType["SurrogatePairs"] = 1] = "SurrogatePairs";
})(StringOffsetValidationType || (StringOffsetValidationType = {}));
let TextModel = class TextModel extends Disposable {
    static { TextModel_1 = this; }
    static { this._MODEL_SYNC_LIMIT = 50 * 1024 * 1024; } // 50 MB,  // used in tests
    static { this.LARGE_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; } // 20 MB;
    static { this.LARGE_FILE_LINE_COUNT_THRESHOLD = 300 * 1000; } // 300K lines
    static { this.LARGE_FILE_HEAP_OPERATION_THRESHOLD = 256 * 1024 * 1024; } // 256M characters, usually ~> 512MB memory usage
    static { this.DEFAULT_CREATION_OPTIONS = {
        isForSimpleWidget: false,
        tabSize: EDITOR_MODEL_DEFAULTS.tabSize,
        indentSize: EDITOR_MODEL_DEFAULTS.indentSize,
        insertSpaces: EDITOR_MODEL_DEFAULTS.insertSpaces,
        detectIndentation: false,
        defaultEOL: 1 /* model.DefaultEndOfLine.LF */,
        trimAutoWhitespace: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
        largeFileOptimizations: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
        bracketPairColorizationOptions: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions,
    }; }
    static resolveOptions(textBuffer, options) {
        if (options.detectIndentation) {
            const guessedIndentation = guessIndentation(textBuffer, options.tabSize, options.insertSpaces);
            return new model.TextModelResolvedOptions({
                tabSize: guessedIndentation.tabSize,
                indentSize: 'tabSize', // TODO@Alex: guess indentSize independent of tabSize
                insertSpaces: guessedIndentation.insertSpaces,
                trimAutoWhitespace: options.trimAutoWhitespace,
                defaultEOL: options.defaultEOL,
                bracketPairColorizationOptions: options.bracketPairColorizationOptions,
            });
        }
        return new model.TextModelResolvedOptions(options);
    }
    get onDidChangeLanguage() {
        return this._tokenizationTextModelPart.onDidChangeLanguage;
    }
    get onDidChangeLanguageConfiguration() {
        return this._tokenizationTextModelPart.onDidChangeLanguageConfiguration;
    }
    get onDidChangeTokens() {
        return this._tokenizationTextModelPart.onDidChangeTokens;
    }
    onDidChangeContent(listener) {
        return this._eventEmitter.slowEvent((e) => listener(e.contentChangedEvent));
    }
    onDidChangeContentOrInjectedText(listener) {
        return combinedDisposable(this._eventEmitter.fastEvent((e) => listener(e)), this._onDidChangeInjectedText.event((e) => listener(e)));
    }
    _isDisposing() {
        return this.__isDisposing;
    }
    get tokenization() {
        return this._tokenizationTextModelPart;
    }
    get bracketPairs() {
        return this._bracketPairs;
    }
    get guides() {
        return this._guidesTextModelPart;
    }
    constructor(source, languageIdOrSelection, creationOptions, associatedResource = null, _undoRedoService, _languageService, _languageConfigurationService, instantiationService) {
        super();
        this._undoRedoService = _undoRedoService;
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this.instantiationService = instantiationService;
        //#region Events
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidChangeDecorations = this._register(new DidChangeDecorationsEmitter((affectedInjectedTextLines) => this.handleBeforeFireDecorationsChangedEvent(affectedInjectedTextLines)));
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._onDidChangeOptions = this._register(new Emitter());
        this.onDidChangeOptions = this._onDidChangeOptions.event;
        this._onDidChangeAttached = this._register(new Emitter());
        this.onDidChangeAttached = this._onDidChangeAttached.event;
        this._onDidChangeInjectedText = this._register(new Emitter());
        this._eventEmitter = this._register(new DidChangeContentEmitter());
        this._languageSelectionListener = this._register(new MutableDisposable());
        this._deltaDecorationCallCnt = 0;
        this._attachedViews = new AttachedViews();
        // Generate a new unique model id
        MODEL_ID++;
        this.id = '$model' + MODEL_ID;
        this.isForSimpleWidget = creationOptions.isForSimpleWidget;
        if (typeof associatedResource === 'undefined' || associatedResource === null) {
            this._associatedResource = URI.parse('inmemory://model/' + MODEL_ID);
        }
        else {
            this._associatedResource = associatedResource;
        }
        this._attachedEditorCount = 0;
        const { textBuffer, disposable } = createTextBuffer(source, creationOptions.defaultEOL);
        this._buffer = textBuffer;
        this._bufferDisposable = disposable;
        const bufferLineCount = this._buffer.getLineCount();
        const bufferTextLength = this._buffer.getValueLengthInRange(new Range(1, 1, bufferLineCount, this._buffer.getLineLength(bufferLineCount) + 1), 0 /* model.EndOfLinePreference.TextDefined */);
        // !!! Make a decision in the ctor and permanently respect this decision !!!
        // If a model is too large at construction time, it will never get tokenized,
        // under no circumstances.
        if (creationOptions.largeFileOptimizations) {
            this._isTooLargeForTokenization =
                bufferTextLength > TextModel_1.LARGE_FILE_SIZE_THRESHOLD ||
                    bufferLineCount > TextModel_1.LARGE_FILE_LINE_COUNT_THRESHOLD;
            this._isTooLargeForHeapOperation =
                bufferTextLength > TextModel_1.LARGE_FILE_HEAP_OPERATION_THRESHOLD;
        }
        else {
            this._isTooLargeForTokenization = false;
            this._isTooLargeForHeapOperation = false;
        }
        this._options = TextModel_1.resolveOptions(this._buffer, creationOptions);
        const languageId = typeof languageIdOrSelection === 'string'
            ? languageIdOrSelection
            : languageIdOrSelection.languageId;
        if (typeof languageIdOrSelection !== 'string') {
            this._languageSelectionListener.value = languageIdOrSelection.onDidChange(() => this._setLanguage(languageIdOrSelection.languageId));
        }
        this._bracketPairs = this._register(new BracketPairsTextModelPart(this, this._languageConfigurationService));
        this._guidesTextModelPart = this._register(new GuidesTextModelPart(this, this._languageConfigurationService));
        this._decorationProvider = this._register(new ColorizedBracketPairsDecorationProvider(this));
        this._tokenizationTextModelPart = this.instantiationService.createInstance(TokenizationTextModelPart, this, this._bracketPairs, languageId, this._attachedViews);
        this._isTooLargeForSyncing = bufferTextLength > TextModel_1._MODEL_SYNC_LIMIT;
        this._versionId = 1;
        this._alternativeVersionId = 1;
        this._initialUndoRedoSnapshot = null;
        this._isDisposed = false;
        this.__isDisposing = false;
        this._instanceId = strings.singleLetterHash(MODEL_ID);
        this._lastDecorationId = 0;
        this._decorations = Object.create(null);
        this._decorationsTree = new DecorationsTrees();
        this._commandManager = new EditStack(this, this._undoRedoService);
        this._isUndoing = false;
        this._isRedoing = false;
        this._trimAutoWhitespaceLines = null;
        this._register(this._decorationProvider.onDidChange(() => {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._onDidChangeDecorations.fire();
            this._onDidChangeDecorations.endDeferredEmit();
        }));
        this._languageService.requestRichLanguageFeatures(languageId);
        this._register(this._languageConfigurationService.onDidChange((e) => {
            this._bracketPairs.handleLanguageConfigurationServiceChange(e);
            this._tokenizationTextModelPart.handleLanguageConfigurationServiceChange(e);
        }));
    }
    dispose() {
        this.__isDisposing = true;
        this._onWillDispose.fire();
        this._tokenizationTextModelPart.dispose();
        this._isDisposed = true;
        super.dispose();
        this._bufferDisposable.dispose();
        this.__isDisposing = false;
        // Manually release reference to previous text buffer to avoid large leaks
        // in case someone leaks a TextModel reference
        const emptyDisposedTextBuffer = new PieceTreeTextBuffer([], '', '\n', false, false, true, true);
        emptyDisposedTextBuffer.dispose();
        this._buffer = emptyDisposedTextBuffer;
        this._bufferDisposable = Disposable.None;
    }
    _hasListeners() {
        return (this._onWillDispose.hasListeners() ||
            this._onDidChangeDecorations.hasListeners() ||
            this._tokenizationTextModelPart._hasListeners() ||
            this._onDidChangeOptions.hasListeners() ||
            this._onDidChangeAttached.hasListeners() ||
            this._onDidChangeInjectedText.hasListeners() ||
            this._eventEmitter.hasListeners());
    }
    _assertNotDisposed() {
        if (this._isDisposed) {
            throw new BugIndicatingError('Model is disposed!');
        }
    }
    equalsTextBuffer(other) {
        this._assertNotDisposed();
        return this._buffer.equals(other);
    }
    getTextBuffer() {
        this._assertNotDisposed();
        return this._buffer;
    }
    _emitContentChangedEvent(rawChange, change) {
        if (this.__isDisposing) {
            // Do not confuse listeners by emitting any event after disposing
            return;
        }
        this._tokenizationTextModelPart.handleDidChangeContent(change);
        this._bracketPairs.handleDidChangeContent(change);
        this._eventEmitter.fire(new InternalModelContentChangeEvent(rawChange, change));
    }
    setValue(value) {
        this._assertNotDisposed();
        if (value === null || value === undefined) {
            throw illegalArgument();
        }
        const { textBuffer, disposable } = createTextBuffer(value, this._options.defaultEOL);
        this._setValueFromTextBuffer(textBuffer, disposable);
    }
    _createContentChanged2(range, rangeOffset, rangeLength, rangeEndPosition, text, isUndoing, isRedoing, isFlush, isEolChange) {
        return {
            changes: [
                {
                    range: range,
                    rangeOffset: rangeOffset,
                    rangeLength: rangeLength,
                    text: text,
                },
            ],
            eol: this._buffer.getEOL(),
            isEolChange: isEolChange,
            versionId: this.getVersionId(),
            isUndoing: isUndoing,
            isRedoing: isRedoing,
            isFlush: isFlush,
        };
    }
    _setValueFromTextBuffer(textBuffer, textBufferDisposable) {
        this._assertNotDisposed();
        const oldFullModelRange = this.getFullModelRange();
        const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
        const endLineNumber = this.getLineCount();
        const endColumn = this.getLineMaxColumn(endLineNumber);
        this._buffer = textBuffer;
        this._bufferDisposable.dispose();
        this._bufferDisposable = textBufferDisposable;
        this._increaseVersionId();
        // Destroy all my decorations
        this._decorations = Object.create(null);
        this._decorationsTree = new DecorationsTrees();
        // Destroy my edit history and settings
        this._commandManager.clear();
        this._trimAutoWhitespaceLines = null;
        this._emitContentChangedEvent(new ModelRawContentChangedEvent([new ModelRawFlush()], this._versionId, false, false), this._createContentChanged2(new Range(1, 1, endLineNumber, endColumn), 0, oldModelValueLength, new Position(endLineNumber, endColumn), this.getValue(), false, false, true, false));
    }
    setEOL(eol) {
        this._assertNotDisposed();
        const newEOL = eol === 1 /* model.EndOfLineSequence.CRLF */ ? '\r\n' : '\n';
        if (this._buffer.getEOL() === newEOL) {
            // Nothing to do
            return;
        }
        const oldFullModelRange = this.getFullModelRange();
        const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
        const endLineNumber = this.getLineCount();
        const endColumn = this.getLineMaxColumn(endLineNumber);
        this._onBeforeEOLChange();
        this._buffer.setEOL(newEOL);
        this._increaseVersionId();
        this._onAfterEOLChange();
        this._emitContentChangedEvent(new ModelRawContentChangedEvent([new ModelRawEOLChanged()], this._versionId, false, false), this._createContentChanged2(new Range(1, 1, endLineNumber, endColumn), 0, oldModelValueLength, new Position(endLineNumber, endColumn), this.getValue(), false, false, false, true));
    }
    _onBeforeEOLChange() {
        // Ensure all decorations get their `range` set.
        this._decorationsTree.ensureAllNodesHaveRanges(this);
    }
    _onAfterEOLChange() {
        // Transform back `range` to offsets
        const versionId = this.getVersionId();
        const allDecorations = this._decorationsTree.collectNodesPostOrder();
        for (let i = 0, len = allDecorations.length; i < len; i++) {
            const node = allDecorations[i];
            const range = node.range; // the range is defined due to `_onBeforeEOLChange`
            const delta = node.cachedAbsoluteStart - node.start;
            const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
            const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
            node.cachedAbsoluteStart = startOffset;
            node.cachedAbsoluteEnd = endOffset;
            node.cachedVersionId = versionId;
            node.start = startOffset - delta;
            node.end = endOffset - delta;
            recomputeMaxEnd(node);
        }
    }
    onBeforeAttached() {
        this._attachedEditorCount++;
        if (this._attachedEditorCount === 1) {
            this._tokenizationTextModelPart.handleDidChangeAttached();
            this._onDidChangeAttached.fire(undefined);
        }
        return this._attachedViews.attachView();
    }
    onBeforeDetached(view) {
        this._attachedEditorCount--;
        if (this._attachedEditorCount === 0) {
            this._tokenizationTextModelPart.handleDidChangeAttached();
            this._onDidChangeAttached.fire(undefined);
        }
        this._attachedViews.detachView(view);
    }
    isAttachedToEditor() {
        return this._attachedEditorCount > 0;
    }
    getAttachedEditorCount() {
        return this._attachedEditorCount;
    }
    isTooLargeForSyncing() {
        return this._isTooLargeForSyncing;
    }
    isTooLargeForTokenization() {
        return this._isTooLargeForTokenization;
    }
    isTooLargeForHeapOperation() {
        return this._isTooLargeForHeapOperation;
    }
    isDisposed() {
        return this._isDisposed;
    }
    isDominatedByLongLines() {
        this._assertNotDisposed();
        if (this.isTooLargeForTokenization()) {
            // Cannot word wrap huge files anyways, so it doesn't really matter
            return false;
        }
        let smallLineCharCount = 0;
        let longLineCharCount = 0;
        const lineCount = this._buffer.getLineCount();
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            const lineLength = this._buffer.getLineLength(lineNumber);
            if (lineLength >= LONG_LINE_BOUNDARY) {
                longLineCharCount += lineLength;
            }
            else {
                smallLineCharCount += lineLength;
            }
        }
        return longLineCharCount > smallLineCharCount;
    }
    get uri() {
        return this._associatedResource;
    }
    //#region Options
    getOptions() {
        this._assertNotDisposed();
        return this._options;
    }
    getFormattingOptions() {
        return {
            tabSize: this._options.indentSize,
            insertSpaces: this._options.insertSpaces,
        };
    }
    updateOptions(_newOpts) {
        this._assertNotDisposed();
        const tabSize = typeof _newOpts.tabSize !== 'undefined' ? _newOpts.tabSize : this._options.tabSize;
        const indentSize = typeof _newOpts.indentSize !== 'undefined'
            ? _newOpts.indentSize
            : this._options.originalIndentSize;
        const insertSpaces = typeof _newOpts.insertSpaces !== 'undefined'
            ? _newOpts.insertSpaces
            : this._options.insertSpaces;
        const trimAutoWhitespace = typeof _newOpts.trimAutoWhitespace !== 'undefined'
            ? _newOpts.trimAutoWhitespace
            : this._options.trimAutoWhitespace;
        const bracketPairColorizationOptions = typeof _newOpts.bracketColorizationOptions !== 'undefined'
            ? _newOpts.bracketColorizationOptions
            : this._options.bracketPairColorizationOptions;
        const newOpts = new model.TextModelResolvedOptions({
            tabSize: tabSize,
            indentSize: indentSize,
            insertSpaces: insertSpaces,
            defaultEOL: this._options.defaultEOL,
            trimAutoWhitespace: trimAutoWhitespace,
            bracketPairColorizationOptions,
        });
        if (this._options.equals(newOpts)) {
            return;
        }
        const e = this._options.createChangeEvent(newOpts);
        this._options = newOpts;
        this._bracketPairs.handleDidChangeOptions(e);
        this._decorationProvider.handleDidChangeOptions(e);
        this._onDidChangeOptions.fire(e);
    }
    detectIndentation(defaultInsertSpaces, defaultTabSize) {
        this._assertNotDisposed();
        const guessedIndentation = guessIndentation(this._buffer, defaultTabSize, defaultInsertSpaces);
        this.updateOptions({
            insertSpaces: guessedIndentation.insertSpaces,
            tabSize: guessedIndentation.tabSize,
            indentSize: guessedIndentation.tabSize, // TODO@Alex: guess indentSize independent of tabSize
        });
    }
    normalizeIndentation(str) {
        this._assertNotDisposed();
        return normalizeIndentation(str, this._options.indentSize, this._options.insertSpaces);
    }
    //#endregion
    //#region Reading
    getVersionId() {
        this._assertNotDisposed();
        return this._versionId;
    }
    mightContainRTL() {
        return this._buffer.mightContainRTL();
    }
    mightContainUnusualLineTerminators() {
        return this._buffer.mightContainUnusualLineTerminators();
    }
    removeUnusualLineTerminators(selections = null) {
        const matches = this.findMatches(strings.UNUSUAL_LINE_TERMINATORS.source, false, true, false, null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        this._buffer.resetMightContainUnusualLineTerminators();
        this.pushEditOperations(selections, matches.map((m) => ({ range: m.range, text: null })), () => null);
    }
    mightContainNonBasicASCII() {
        return this._buffer.mightContainNonBasicASCII();
    }
    getAlternativeVersionId() {
        this._assertNotDisposed();
        return this._alternativeVersionId;
    }
    getInitialUndoRedoSnapshot() {
        this._assertNotDisposed();
        return this._initialUndoRedoSnapshot;
    }
    getOffsetAt(rawPosition) {
        this._assertNotDisposed();
        const position = this._validatePosition(rawPosition.lineNumber, rawPosition.column, 0 /* StringOffsetValidationType.Relaxed */);
        return this._buffer.getOffsetAt(position.lineNumber, position.column);
    }
    getPositionAt(rawOffset) {
        this._assertNotDisposed();
        const offset = Math.min(this._buffer.getLength(), Math.max(0, rawOffset));
        return this._buffer.getPositionAt(offset);
    }
    _increaseVersionId() {
        this._versionId = this._versionId + 1;
        this._alternativeVersionId = this._versionId;
    }
    _overwriteVersionId(versionId) {
        this._versionId = versionId;
    }
    _overwriteAlternativeVersionId(newAlternativeVersionId) {
        this._alternativeVersionId = newAlternativeVersionId;
    }
    _overwriteInitialUndoRedoSnapshot(newInitialUndoRedoSnapshot) {
        this._initialUndoRedoSnapshot = newInitialUndoRedoSnapshot;
    }
    getValue(eol, preserveBOM = false) {
        this._assertNotDisposed();
        if (this.isTooLargeForHeapOperation()) {
            throw new BugIndicatingError('Operation would exceed heap memory limits');
        }
        const fullModelRange = this.getFullModelRange();
        const fullModelValue = this.getValueInRange(fullModelRange, eol);
        if (preserveBOM) {
            return this._buffer.getBOM() + fullModelValue;
        }
        return fullModelValue;
    }
    createSnapshot(preserveBOM = false) {
        return new TextModelSnapshot(this._buffer.createSnapshot(preserveBOM));
    }
    getValueLength(eol, preserveBOM = false) {
        this._assertNotDisposed();
        const fullModelRange = this.getFullModelRange();
        const fullModelValue = this.getValueLengthInRange(fullModelRange, eol);
        if (preserveBOM) {
            return this._buffer.getBOM().length + fullModelValue;
        }
        return fullModelValue;
    }
    getValueInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getValueInRange(this.validateRange(rawRange), eol);
    }
    getValueLengthInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getValueLengthInRange(this.validateRange(rawRange), eol);
    }
    getCharacterCountInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getCharacterCountInRange(this.validateRange(rawRange), eol);
    }
    getLineCount() {
        this._assertNotDisposed();
        return this._buffer.getLineCount();
    }
    getLineContent(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineContent(lineNumber);
    }
    getLineLength(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLength(lineNumber);
    }
    getLinesContent() {
        this._assertNotDisposed();
        if (this.isTooLargeForHeapOperation()) {
            throw new BugIndicatingError('Operation would exceed heap memory limits');
        }
        return this._buffer.getLinesContent();
    }
    getEOL() {
        this._assertNotDisposed();
        return this._buffer.getEOL();
    }
    getEndOfLineSequence() {
        this._assertNotDisposed();
        return this._buffer.getEOL() === '\n'
            ? 0 /* model.EndOfLineSequence.LF */
            : 1 /* model.EndOfLineSequence.CRLF */;
    }
    getLineMinColumn(lineNumber) {
        this._assertNotDisposed();
        return 1;
    }
    getLineMaxColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLength(lineNumber) + 1;
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineFirstNonWhitespaceColumn(lineNumber);
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLastNonWhitespaceColumn(lineNumber);
    }
    /**
     * Validates `range` is within buffer bounds, but allows it to sit in between surrogate pairs, etc.
     * Will try to not allocate if possible.
     */
    _validateRangeRelaxedNoAllocations(range) {
        const linesCount = this._buffer.getLineCount();
        const initialStartLineNumber = range.startLineNumber;
        const initialStartColumn = range.startColumn;
        let startLineNumber = Math.floor(typeof initialStartLineNumber === 'number' && !isNaN(initialStartLineNumber)
            ? initialStartLineNumber
            : 1);
        let startColumn = Math.floor(typeof initialStartColumn === 'number' && !isNaN(initialStartColumn) ? initialStartColumn : 1);
        if (startLineNumber < 1) {
            startLineNumber = 1;
            startColumn = 1;
        }
        else if (startLineNumber > linesCount) {
            startLineNumber = linesCount;
            startColumn = this.getLineMaxColumn(startLineNumber);
        }
        else {
            if (startColumn <= 1) {
                startColumn = 1;
            }
            else {
                const maxColumn = this.getLineMaxColumn(startLineNumber);
                if (startColumn >= maxColumn) {
                    startColumn = maxColumn;
                }
            }
        }
        const initialEndLineNumber = range.endLineNumber;
        const initialEndColumn = range.endColumn;
        let endLineNumber = Math.floor(typeof initialEndLineNumber === 'number' && !isNaN(initialEndLineNumber)
            ? initialEndLineNumber
            : 1);
        let endColumn = Math.floor(typeof initialEndColumn === 'number' && !isNaN(initialEndColumn) ? initialEndColumn : 1);
        if (endLineNumber < 1) {
            endLineNumber = 1;
            endColumn = 1;
        }
        else if (endLineNumber > linesCount) {
            endLineNumber = linesCount;
            endColumn = this.getLineMaxColumn(endLineNumber);
        }
        else {
            if (endColumn <= 1) {
                endColumn = 1;
            }
            else {
                const maxColumn = this.getLineMaxColumn(endLineNumber);
                if (endColumn >= maxColumn) {
                    endColumn = maxColumn;
                }
            }
        }
        if (initialStartLineNumber === startLineNumber &&
            initialStartColumn === startColumn &&
            initialEndLineNumber === endLineNumber &&
            initialEndColumn === endColumn &&
            range instanceof Range &&
            !(range instanceof Selection)) {
            return range;
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    _isValidPosition(lineNumber, column, validationType) {
        if (typeof lineNumber !== 'number' || typeof column !== 'number') {
            return false;
        }
        if (isNaN(lineNumber) || isNaN(column)) {
            return false;
        }
        if (lineNumber < 1 || column < 1) {
            return false;
        }
        if ((lineNumber | 0) !== lineNumber || (column | 0) !== column) {
            return false;
        }
        const lineCount = this._buffer.getLineCount();
        if (lineNumber > lineCount) {
            return false;
        }
        if (column === 1) {
            return true;
        }
        const maxColumn = this.getLineMaxColumn(lineNumber);
        if (column > maxColumn) {
            return false;
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            // !!At this point, column > 1
            const charCodeBefore = this._buffer.getLineCharCode(lineNumber, column - 2);
            if (strings.isHighSurrogate(charCodeBefore)) {
                return false;
            }
        }
        return true;
    }
    _validatePosition(_lineNumber, _column, validationType) {
        const lineNumber = Math.floor(typeof _lineNumber === 'number' && !isNaN(_lineNumber) ? _lineNumber : 1);
        const column = Math.floor(typeof _column === 'number' && !isNaN(_column) ? _column : 1);
        const lineCount = this._buffer.getLineCount();
        if (lineNumber < 1) {
            return new Position(1, 1);
        }
        if (lineNumber > lineCount) {
            return new Position(lineCount, this.getLineMaxColumn(lineCount));
        }
        if (column <= 1) {
            return new Position(lineNumber, 1);
        }
        const maxColumn = this.getLineMaxColumn(lineNumber);
        if (column >= maxColumn) {
            return new Position(lineNumber, maxColumn);
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            // If the position would end up in the middle of a high-low surrogate pair,
            // we move it to before the pair
            // !!At this point, column > 1
            const charCodeBefore = this._buffer.getLineCharCode(lineNumber, column - 2);
            if (strings.isHighSurrogate(charCodeBefore)) {
                return new Position(lineNumber, column - 1);
            }
        }
        return new Position(lineNumber, column);
    }
    validatePosition(position) {
        const validationType = 1 /* StringOffsetValidationType.SurrogatePairs */;
        this._assertNotDisposed();
        // Avoid object allocation and cover most likely case
        if (position instanceof Position) {
            if (this._isValidPosition(position.lineNumber, position.column, validationType)) {
                return position;
            }
        }
        return this._validatePosition(position.lineNumber, position.column, validationType);
    }
    isValidRange(range) {
        return this._isValidRange(range, 1 /* StringOffsetValidationType.SurrogatePairs */);
    }
    _isValidRange(range, validationType) {
        const startLineNumber = range.startLineNumber;
        const startColumn = range.startColumn;
        const endLineNumber = range.endLineNumber;
        const endColumn = range.endColumn;
        if (!this._isValidPosition(startLineNumber, startColumn, 0 /* StringOffsetValidationType.Relaxed */)) {
            return false;
        }
        if (!this._isValidPosition(endLineNumber, endColumn, 0 /* StringOffsetValidationType.Relaxed */)) {
            return false;
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            const charCodeBeforeStart = startColumn > 1 ? this._buffer.getLineCharCode(startLineNumber, startColumn - 2) : 0;
            const charCodeBeforeEnd = endColumn > 1 && endColumn <= this._buffer.getLineLength(endLineNumber)
                ? this._buffer.getLineCharCode(endLineNumber, endColumn - 2)
                : 0;
            const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
            const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);
            if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
                return true;
            }
            return false;
        }
        return true;
    }
    validateRange(_range) {
        const validationType = 1 /* StringOffsetValidationType.SurrogatePairs */;
        this._assertNotDisposed();
        // Avoid object allocation and cover most likely case
        if (_range instanceof Range && !(_range instanceof Selection)) {
            if (this._isValidRange(_range, validationType)) {
                return _range;
            }
        }
        const start = this._validatePosition(_range.startLineNumber, _range.startColumn, 0 /* StringOffsetValidationType.Relaxed */);
        const end = this._validatePosition(_range.endLineNumber, _range.endColumn, 0 /* StringOffsetValidationType.Relaxed */);
        const startLineNumber = start.lineNumber;
        const startColumn = start.column;
        const endLineNumber = end.lineNumber;
        const endColumn = end.column;
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            const charCodeBeforeStart = startColumn > 1 ? this._buffer.getLineCharCode(startLineNumber, startColumn - 2) : 0;
            const charCodeBeforeEnd = endColumn > 1 && endColumn <= this._buffer.getLineLength(endLineNumber)
                ? this._buffer.getLineCharCode(endLineNumber, endColumn - 2)
                : 0;
            const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
            const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);
            if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
                return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
            }
            if (startLineNumber === endLineNumber && startColumn === endColumn) {
                // do not expand a collapsed range, simply move it to a valid location
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn - 1);
            }
            if (startInsideSurrogatePair && endInsideSurrogatePair) {
                // expand range at both ends
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn + 1);
            }
            if (startInsideSurrogatePair) {
                // only expand range at the start
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn);
            }
            // only expand range at the end
            return new Range(startLineNumber, startColumn, endLineNumber, endColumn + 1);
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    modifyPosition(rawPosition, offset) {
        this._assertNotDisposed();
        const candidate = this.getOffsetAt(rawPosition) + offset;
        return this.getPositionAt(Math.min(this._buffer.getLength(), Math.max(0, candidate)));
    }
    getFullModelRange() {
        this._assertNotDisposed();
        const lineCount = this.getLineCount();
        return new Range(1, 1, lineCount, this.getLineMaxColumn(lineCount));
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        return this._buffer.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
    }
    findMatches(searchString, rawSearchScope, isRegex, matchCase, wordSeparators, captureMatches, limitResultCount = LIMIT_FIND_COUNT) {
        this._assertNotDisposed();
        let searchRanges = null;
        if (rawSearchScope !== null) {
            if (!Array.isArray(rawSearchScope)) {
                rawSearchScope = [rawSearchScope];
            }
            if (rawSearchScope.every((searchScope) => Range.isIRange(searchScope))) {
                searchRanges = rawSearchScope.map((searchScope) => this.validateRange(searchScope));
            }
        }
        if (searchRanges === null) {
            searchRanges = [this.getFullModelRange()];
        }
        searchRanges = searchRanges.sort((d1, d2) => d1.startLineNumber - d2.startLineNumber || d1.startColumn - d2.startColumn);
        const uniqueSearchRanges = [];
        uniqueSearchRanges.push(searchRanges.reduce((prev, curr) => {
            if (Range.areIntersecting(prev, curr)) {
                return prev.plusRange(curr);
            }
            uniqueSearchRanges.push(prev);
            return curr;
        }));
        let matchMapper;
        if (!isRegex && searchString.indexOf('\n') < 0) {
            // not regex, not multi line
            const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return [];
            }
            matchMapper = (searchRange) => this.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
        }
        else {
            matchMapper = (searchRange) => TextModelSearch.findMatches(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchRange, captureMatches, limitResultCount);
        }
        return uniqueSearchRanges
            .map(matchMapper)
            .reduce((arr, matches) => arr.concat(matches), []);
    }
    findNextMatch(searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
        this._assertNotDisposed();
        const searchStart = this.validatePosition(rawSearchStart);
        if (!isRegex && searchString.indexOf('\n') < 0) {
            const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return null;
            }
            const lineCount = this.getLineCount();
            let searchRange = new Range(searchStart.lineNumber, searchStart.column, lineCount, this.getLineMaxColumn(lineCount));
            let ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);
            TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
            if (ret.length > 0) {
                return ret[0];
            }
            searchRange = new Range(1, 1, searchStart.lineNumber, this.getLineMaxColumn(searchStart.lineNumber));
            ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);
            if (ret.length > 0) {
                return ret[0];
            }
            return null;
        }
        return TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
    }
    findPreviousMatch(searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
        this._assertNotDisposed();
        const searchStart = this.validatePosition(rawSearchStart);
        return TextModelSearch.findPreviousMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
    }
    //#endregion
    //#region Editing
    pushStackElement() {
        this._commandManager.pushStackElement();
    }
    popStackElement() {
        this._commandManager.popStackElement();
    }
    pushEOL(eol) {
        const currentEOL = this.getEOL() === '\n' ? 0 /* model.EndOfLineSequence.LF */ : 1 /* model.EndOfLineSequence.CRLF */;
        if (currentEOL === eol) {
            return;
        }
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            if (this._initialUndoRedoSnapshot === null) {
                this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
            }
            this._commandManager.pushEOL(eol);
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _validateEditOperation(rawOperation) {
        if (rawOperation instanceof model.ValidAnnotatedEditOperation) {
            return rawOperation;
        }
        return new model.ValidAnnotatedEditOperation(rawOperation.identifier || null, this.validateRange(rawOperation.range), rawOperation.text, rawOperation.forceMoveMarkers || false, rawOperation.isAutoWhitespaceEdit || false, rawOperation._isTracked || false);
    }
    _validateEditOperations(rawOperations) {
        const result = [];
        for (let i = 0, len = rawOperations.length; i < len; i++) {
            result[i] = this._validateEditOperation(rawOperations[i]);
        }
        return result;
    }
    pushEditOperations(beforeCursorState, editOperations, cursorStateComputer, group) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            return this._pushEditOperations(beforeCursorState, this._validateEditOperations(editOperations), cursorStateComputer, group);
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _pushEditOperations(beforeCursorState, editOperations, cursorStateComputer, group) {
        if (this._options.trimAutoWhitespace && this._trimAutoWhitespaceLines) {
            // Go through each saved line number and insert a trim whitespace edit
            // if it is safe to do so (no conflicts with other edits).
            const incomingEdits = editOperations.map((op) => {
                return {
                    range: this.validateRange(op.range),
                    text: op.text,
                };
            });
            // Sometimes, auto-formatters change ranges automatically which can cause undesired auto whitespace trimming near the cursor
            // We'll use the following heuristic: if the edits occur near the cursor, then it's ok to trim auto whitespace
            let editsAreNearCursors = true;
            if (beforeCursorState) {
                for (let i = 0, len = beforeCursorState.length; i < len; i++) {
                    const sel = beforeCursorState[i];
                    let foundEditNearSel = false;
                    for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                        const editRange = incomingEdits[j].range;
                        const selIsAbove = editRange.startLineNumber > sel.endLineNumber;
                        const selIsBelow = sel.startLineNumber > editRange.endLineNumber;
                        if (!selIsAbove && !selIsBelow) {
                            foundEditNearSel = true;
                            break;
                        }
                    }
                    if (!foundEditNearSel) {
                        editsAreNearCursors = false;
                        break;
                    }
                }
            }
            if (editsAreNearCursors) {
                for (let i = 0, len = this._trimAutoWhitespaceLines.length; i < len; i++) {
                    const trimLineNumber = this._trimAutoWhitespaceLines[i];
                    const maxLineColumn = this.getLineMaxColumn(trimLineNumber);
                    let allowTrimLine = true;
                    for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                        const editRange = incomingEdits[j].range;
                        const editText = incomingEdits[j].text;
                        if (trimLineNumber < editRange.startLineNumber ||
                            trimLineNumber > editRange.endLineNumber) {
                            // `trimLine` is completely outside this edit
                            continue;
                        }
                        // At this point:
                        //   editRange.startLineNumber <= trimLine <= editRange.endLineNumber
                        if (trimLineNumber === editRange.startLineNumber &&
                            editRange.startColumn === maxLineColumn &&
                            editRange.isEmpty() &&
                            editText &&
                            editText.length > 0 &&
                            editText.charAt(0) === '\n') {
                            // This edit inserts a new line (and maybe other text) after `trimLine`
                            continue;
                        }
                        if (trimLineNumber === editRange.startLineNumber &&
                            editRange.startColumn === 1 &&
                            editRange.isEmpty() &&
                            editText &&
                            editText.length > 0 &&
                            editText.charAt(editText.length - 1) === '\n') {
                            // This edit inserts a new line (and maybe other text) before `trimLine`
                            continue;
                        }
                        // Looks like we can't trim this line as it would interfere with an incoming edit
                        allowTrimLine = false;
                        break;
                    }
                    if (allowTrimLine) {
                        const trimRange = new Range(trimLineNumber, 1, trimLineNumber, maxLineColumn);
                        editOperations.push(new model.ValidAnnotatedEditOperation(null, trimRange, null, false, false, false));
                    }
                }
            }
            this._trimAutoWhitespaceLines = null;
        }
        if (this._initialUndoRedoSnapshot === null) {
            this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
        }
        return this._commandManager.pushEditOperation(beforeCursorState, editOperations, cursorStateComputer, group);
    }
    _applyUndo(changes, eol, resultingAlternativeVersionId, resultingSelection) {
        const edits = changes.map((change) => {
            const rangeStart = this.getPositionAt(change.newPosition);
            const rangeEnd = this.getPositionAt(change.newEnd);
            return {
                range: new Range(rangeStart.lineNumber, rangeStart.column, rangeEnd.lineNumber, rangeEnd.column),
                text: change.oldText,
            };
        });
        this._applyUndoRedoEdits(edits, eol, true, false, resultingAlternativeVersionId, resultingSelection);
    }
    _applyRedo(changes, eol, resultingAlternativeVersionId, resultingSelection) {
        const edits = changes.map((change) => {
            const rangeStart = this.getPositionAt(change.oldPosition);
            const rangeEnd = this.getPositionAt(change.oldEnd);
            return {
                range: new Range(rangeStart.lineNumber, rangeStart.column, rangeEnd.lineNumber, rangeEnd.column),
                text: change.newText,
            };
        });
        this._applyUndoRedoEdits(edits, eol, false, true, resultingAlternativeVersionId, resultingSelection);
    }
    _applyUndoRedoEdits(edits, eol, isUndoing, isRedoing, resultingAlternativeVersionId, resultingSelection) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            this._isUndoing = isUndoing;
            this._isRedoing = isRedoing;
            this.applyEdits(edits, false);
            this.setEOL(eol);
            this._overwriteAlternativeVersionId(resultingAlternativeVersionId);
        }
        finally {
            this._isUndoing = false;
            this._isRedoing = false;
            this._eventEmitter.endDeferredEmit(resultingSelection);
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    applyEdits(rawOperations, computeUndoEdits = false) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            const operations = this._validateEditOperations(rawOperations);
            return this._doApplyEdits(operations, computeUndoEdits);
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _doApplyEdits(rawOperations, computeUndoEdits) {
        const oldLineCount = this._buffer.getLineCount();
        const result = this._buffer.applyEdits(rawOperations, this._options.trimAutoWhitespace, computeUndoEdits);
        const newLineCount = this._buffer.getLineCount();
        const contentChanges = result.changes;
        this._trimAutoWhitespaceLines = result.trimAutoWhitespaceLineNumbers;
        if (contentChanges.length !== 0) {
            // We do a first pass to update decorations
            // because we want to read decorations in the second pass
            // where we will emit content change events
            // and we want to read the final decorations
            for (let i = 0, len = contentChanges.length; i < len; i++) {
                const change = contentChanges[i];
                this._decorationsTree.acceptReplace(change.rangeOffset, change.rangeLength, change.text.length, change.forceMoveMarkers);
            }
            const rawContentChanges = [];
            this._increaseVersionId();
            let lineCount = oldLineCount;
            for (let i = 0, len = contentChanges.length; i < len; i++) {
                const change = contentChanges[i];
                const [eolCount] = countEOL(change.text);
                this._onDidChangeDecorations.fire();
                const startLineNumber = change.range.startLineNumber;
                const endLineNumber = change.range.endLineNumber;
                const deletingLinesCnt = endLineNumber - startLineNumber;
                const insertingLinesCnt = eolCount;
                const editingLinesCnt = Math.min(deletingLinesCnt, insertingLinesCnt);
                const changeLineCountDelta = insertingLinesCnt - deletingLinesCnt;
                const currentEditStartLineNumber = newLineCount - lineCount - changeLineCountDelta + startLineNumber;
                const firstEditLineNumber = currentEditStartLineNumber;
                const lastInsertedLineNumber = currentEditStartLineNumber + insertingLinesCnt;
                const decorationsWithInjectedTextInEditedRange = this._decorationsTree.getInjectedTextInInterval(this, this.getOffsetAt(new Position(firstEditLineNumber, 1)), this.getOffsetAt(new Position(lastInsertedLineNumber, this.getLineMaxColumn(lastInsertedLineNumber))), 0);
                const injectedTextInEditedRange = LineInjectedText.fromDecorations(decorationsWithInjectedTextInEditedRange);
                const injectedTextInEditedRangeQueue = new ArrayQueue(injectedTextInEditedRange);
                for (let j = editingLinesCnt; j >= 0; j--) {
                    const editLineNumber = startLineNumber + j;
                    const currentEditLineNumber = currentEditStartLineNumber + j;
                    injectedTextInEditedRangeQueue.takeFromEndWhile((r) => r.lineNumber > currentEditLineNumber);
                    const decorationsInCurrentLine = injectedTextInEditedRangeQueue.takeFromEndWhile((r) => r.lineNumber === currentEditLineNumber);
                    rawContentChanges.push(new ModelRawLineChanged(editLineNumber, this.getLineContent(currentEditLineNumber), decorationsInCurrentLine));
                }
                if (editingLinesCnt < deletingLinesCnt) {
                    // Must delete some lines
                    const spliceStartLineNumber = startLineNumber + editingLinesCnt;
                    rawContentChanges.push(new ModelRawLinesDeleted(spliceStartLineNumber + 1, endLineNumber));
                }
                if (editingLinesCnt < insertingLinesCnt) {
                    const injectedTextInEditedRangeQueue = new ArrayQueue(injectedTextInEditedRange);
                    // Must insert some lines
                    const spliceLineNumber = startLineNumber + editingLinesCnt;
                    const cnt = insertingLinesCnt - editingLinesCnt;
                    const fromLineNumber = newLineCount - lineCount - cnt + spliceLineNumber + 1;
                    const injectedTexts = [];
                    const newLines = [];
                    for (let i = 0; i < cnt; i++) {
                        const lineNumber = fromLineNumber + i;
                        newLines[i] = this.getLineContent(lineNumber);
                        injectedTextInEditedRangeQueue.takeWhile((r) => r.lineNumber < lineNumber);
                        injectedTexts[i] = injectedTextInEditedRangeQueue.takeWhile((r) => r.lineNumber === lineNumber);
                    }
                    rawContentChanges.push(new ModelRawLinesInserted(spliceLineNumber + 1, startLineNumber + insertingLinesCnt, newLines, injectedTexts));
                }
                lineCount += changeLineCountDelta;
            }
            this._emitContentChangedEvent(new ModelRawContentChangedEvent(rawContentChanges, this.getVersionId(), this._isUndoing, this._isRedoing), {
                changes: contentChanges,
                eol: this._buffer.getEOL(),
                isEolChange: false,
                versionId: this.getVersionId(),
                isUndoing: this._isUndoing,
                isRedoing: this._isRedoing,
                isFlush: false,
            });
        }
        return result.reverseEdits === null ? undefined : result.reverseEdits;
    }
    undo() {
        return this._undoRedoService.undo(this.uri);
    }
    canUndo() {
        return this._undoRedoService.canUndo(this.uri);
    }
    redo() {
        return this._undoRedoService.redo(this.uri);
    }
    canRedo() {
        return this._undoRedoService.canRedo(this.uri);
    }
    //#endregion
    //#region Decorations
    handleBeforeFireDecorationsChangedEvent(affectedInjectedTextLines) {
        // This is called before the decoration changed event is fired.
        if (affectedInjectedTextLines === null || affectedInjectedTextLines.size === 0) {
            return;
        }
        const affectedLines = Array.from(affectedInjectedTextLines);
        const lineChangeEvents = affectedLines.map((lineNumber) => new ModelRawLineChanged(lineNumber, this.getLineContent(lineNumber), this._getInjectedTextInLine(lineNumber)));
        this._onDidChangeInjectedText.fire(new ModelInjectedTextChangedEvent(lineChangeEvents));
    }
    changeDecorations(callback, ownerId = 0) {
        this._assertNotDisposed();
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            return this._changeDecorations(ownerId, callback);
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _changeDecorations(ownerId, callback) {
        const changeAccessor = {
            addDecoration: (range, options) => {
                return this._deltaDecorationsImpl(ownerId, [], [{ range: range, options: options }])[0];
            },
            changeDecoration: (id, newRange) => {
                this._changeDecorationImpl(id, newRange);
            },
            changeDecorationOptions: (id, options) => {
                this._changeDecorationOptionsImpl(id, _normalizeOptions(options));
            },
            removeDecoration: (id) => {
                this._deltaDecorationsImpl(ownerId, [id], []);
            },
            deltaDecorations: (oldDecorations, newDecorations) => {
                if (oldDecorations.length === 0 && newDecorations.length === 0) {
                    // nothing to do
                    return [];
                }
                return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
            },
        };
        let result = null;
        try {
            result = callback(changeAccessor);
        }
        catch (e) {
            onUnexpectedError(e);
        }
        // Invalidate change accessor
        changeAccessor.addDecoration = invalidFunc;
        changeAccessor.changeDecoration = invalidFunc;
        changeAccessor.changeDecorationOptions = invalidFunc;
        changeAccessor.removeDecoration = invalidFunc;
        changeAccessor.deltaDecorations = invalidFunc;
        return result;
    }
    deltaDecorations(oldDecorations, newDecorations, ownerId = 0) {
        this._assertNotDisposed();
        if (!oldDecorations) {
            oldDecorations = [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            // nothing to do
            return [];
        }
        try {
            this._deltaDecorationCallCnt++;
            if (this._deltaDecorationCallCnt > 1) {
                console.warn(`Invoking deltaDecorations recursively could lead to leaking decorations.`);
                onUnexpectedError(new Error(`Invoking deltaDecorations recursively could lead to leaking decorations.`));
            }
            this._onDidChangeDecorations.beginDeferredEmit();
            return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
            this._deltaDecorationCallCnt--;
        }
    }
    _getTrackedRange(id) {
        return this.getDecorationRange(id);
    }
    _setTrackedRange(id, newRange, newStickiness) {
        const node = id ? this._decorations[id] : null;
        if (!node) {
            if (!newRange) {
                // node doesn't exist, the request is to delete => nothing to do
                return null;
            }
            // node doesn't exist, the request is to set => add the tracked range
            return this._deltaDecorationsImpl(0, [], [{ range: newRange, options: TRACKED_RANGE_OPTIONS[newStickiness] }], true)[0];
        }
        if (!newRange) {
            // node exists, the request is to delete => delete node
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
            return null;
        }
        // node exists, the request is to set => change the tracked range and its options
        const range = this._validateRangeRelaxedNoAllocations(newRange);
        const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), startOffset, endOffset, range);
        node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
        this._decorationsTree.insert(node);
        return node.id;
    }
    removeAllDecorationsWithOwnerId(ownerId) {
        if (this._isDisposed) {
            return;
        }
        const nodes = this._decorationsTree.collectNodesFromOwner(ownerId);
        for (let i = 0, len = nodes.length; i < len; i++) {
            const node = nodes[i];
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
        }
    }
    getDecorationOptions(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        return node.options;
    }
    getDecorationRange(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        return this._decorationsTree.getNodeRange(this, node);
    }
    getLineDecorations(lineNumber, ownerId = 0, filterOutValidation = false) {
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            return [];
        }
        return this.getLinesDecorations(lineNumber, lineNumber, ownerId, filterOutValidation);
    }
    getLinesDecorations(_startLineNumber, _endLineNumber, ownerId = 0, filterOutValidation = false, onlyMarginDecorations = false) {
        const lineCount = this.getLineCount();
        const startLineNumber = Math.min(lineCount, Math.max(1, _startLineNumber));
        const endLineNumber = Math.min(lineCount, Math.max(1, _endLineNumber));
        const endColumn = this.getLineMaxColumn(endLineNumber);
        const range = new Range(startLineNumber, 1, endLineNumber, endColumn);
        const decorations = this._getDecorationsInRange(range, ownerId, filterOutValidation, onlyMarginDecorations);
        pushMany(decorations, this._decorationProvider.getDecorationsInRange(range, ownerId, filterOutValidation));
        return decorations;
    }
    getDecorationsInRange(range, ownerId = 0, filterOutValidation = false, onlyMinimapDecorations = false, onlyMarginDecorations = false) {
        const validatedRange = this.validateRange(range);
        const decorations = this._getDecorationsInRange(validatedRange, ownerId, filterOutValidation, onlyMarginDecorations);
        pushMany(decorations, this._decorationProvider.getDecorationsInRange(validatedRange, ownerId, filterOutValidation, onlyMinimapDecorations));
        return decorations;
    }
    getOverviewRulerDecorations(ownerId = 0, filterOutValidation = false) {
        return this._decorationsTree.getAll(this, ownerId, filterOutValidation, true, false);
    }
    getInjectedTextDecorations(ownerId = 0) {
        return this._decorationsTree.getAllInjectedText(this, ownerId);
    }
    _getInjectedTextInLine(lineNumber) {
        const startOffset = this._buffer.getOffsetAt(lineNumber, 1);
        const endOffset = startOffset + this._buffer.getLineLength(lineNumber);
        const result = this._decorationsTree.getInjectedTextInInterval(this, startOffset, endOffset, 0);
        return LineInjectedText.fromDecorations(result).filter((t) => t.lineNumber === lineNumber);
    }
    getAllDecorations(ownerId = 0, filterOutValidation = false) {
        let result = this._decorationsTree.getAll(this, ownerId, filterOutValidation, false, false);
        result = result.concat(this._decorationProvider.getAllDecorations(ownerId, filterOutValidation));
        return result;
    }
    getAllMarginDecorations(ownerId = 0) {
        return this._decorationsTree.getAll(this, ownerId, false, false, true);
    }
    _getDecorationsInRange(filterRange, filterOwnerId, filterOutValidation, onlyMarginDecorations) {
        const startOffset = this._buffer.getOffsetAt(filterRange.startLineNumber, filterRange.startColumn);
        const endOffset = this._buffer.getOffsetAt(filterRange.endLineNumber, filterRange.endColumn);
        return this._decorationsTree.getAllInInterval(this, startOffset, endOffset, filterOwnerId, filterOutValidation, onlyMarginDecorations);
    }
    getRangeAt(start, end) {
        return this._buffer.getRangeAt(start, end - start);
    }
    _changeDecorationImpl(decorationId, _range) {
        const node = this._decorations[decorationId];
        if (!node) {
            return;
        }
        if (node.options.after) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(oldRange.endLineNumber);
        }
        if (node.options.before) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(oldRange.startLineNumber);
        }
        const range = this._validateRangeRelaxedNoAllocations(_range);
        const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), startOffset, endOffset, range);
        this._decorationsTree.insert(node);
        this._onDidChangeDecorations.checkAffectedAndFire(node.options);
        if (node.options.after) {
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.endLineNumber);
        }
        if (node.options.before) {
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.startLineNumber);
        }
    }
    _changeDecorationOptionsImpl(decorationId, options) {
        const node = this._decorations[decorationId];
        if (!node) {
            return;
        }
        const nodeWasInOverviewRuler = node.options.overviewRuler && node.options.overviewRuler.color ? true : false;
        const nodeIsInOverviewRuler = options.overviewRuler && options.overviewRuler.color ? true : false;
        this._onDidChangeDecorations.checkAffectedAndFire(node.options);
        this._onDidChangeDecorations.checkAffectedAndFire(options);
        if (node.options.after || options.after) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.endLineNumber);
        }
        if (node.options.before || options.before) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.startLineNumber);
        }
        const movedInOverviewRuler = nodeWasInOverviewRuler !== nodeIsInOverviewRuler;
        const changedWhetherInjectedText = isOptionsInjectedText(options) !== isNodeInjectedText(node);
        if (movedInOverviewRuler || changedWhetherInjectedText) {
            this._decorationsTree.delete(node);
            node.setOptions(options);
            this._decorationsTree.insert(node);
        }
        else {
            node.setOptions(options);
        }
    }
    _deltaDecorationsImpl(ownerId, oldDecorationsIds, newDecorations, suppressEvents = false) {
        const versionId = this.getVersionId();
        const oldDecorationsLen = oldDecorationsIds.length;
        let oldDecorationIndex = 0;
        const newDecorationsLen = newDecorations.length;
        let newDecorationIndex = 0;
        this._onDidChangeDecorations.beginDeferredEmit();
        try {
            const result = new Array(newDecorationsLen);
            while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {
                let node = null;
                if (oldDecorationIndex < oldDecorationsLen) {
                    // (1) get ourselves an old node
                    do {
                        node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
                    } while (!node && oldDecorationIndex < oldDecorationsLen);
                    // (2) remove the node from the tree (if it exists)
                    if (node) {
                        if (node.options.after) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.endLineNumber);
                        }
                        if (node.options.before) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.startLineNumber);
                        }
                        this._decorationsTree.delete(node);
                        if (!suppressEvents) {
                            this._onDidChangeDecorations.checkAffectedAndFire(node.options);
                        }
                    }
                }
                if (newDecorationIndex < newDecorationsLen) {
                    // (3) create a new node if necessary
                    if (!node) {
                        const internalDecorationId = ++this._lastDecorationId;
                        const decorationId = `${this._instanceId};${internalDecorationId}`;
                        node = new IntervalNode(decorationId, 0, 0);
                        this._decorations[decorationId] = node;
                    }
                    // (4) initialize node
                    const newDecoration = newDecorations[newDecorationIndex];
                    const range = this._validateRangeRelaxedNoAllocations(newDecoration.range);
                    const options = _normalizeOptions(newDecoration.options);
                    const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
                    const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
                    node.ownerId = ownerId;
                    node.reset(versionId, startOffset, endOffset, range);
                    node.setOptions(options);
                    if (node.options.after) {
                        this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.endLineNumber);
                    }
                    if (node.options.before) {
                        this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.startLineNumber);
                    }
                    if (!suppressEvents) {
                        this._onDidChangeDecorations.checkAffectedAndFire(options);
                    }
                    this._decorationsTree.insert(node);
                    result[newDecorationIndex] = node.id;
                    newDecorationIndex++;
                }
                else {
                    if (node) {
                        delete this._decorations[node.id];
                    }
                }
            }
            return result;
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    //#endregion
    //#region Tokenization
    // TODO move them to the tokenization part.
    getLanguageId() {
        return this.tokenization.getLanguageId();
    }
    setLanguage(languageIdOrSelection, source) {
        if (typeof languageIdOrSelection === 'string') {
            this._languageSelectionListener.clear();
            this._setLanguage(languageIdOrSelection, source);
        }
        else {
            this._languageSelectionListener.value = languageIdOrSelection.onDidChange(() => this._setLanguage(languageIdOrSelection.languageId, source));
            this._setLanguage(languageIdOrSelection.languageId, source);
        }
    }
    _setLanguage(languageId, source) {
        this.tokenization.setLanguageId(languageId, source);
        this._languageService.requestRichLanguageFeatures(languageId);
    }
    getLanguageIdAtPosition(lineNumber, column) {
        return this.tokenization.getLanguageIdAtPosition(lineNumber, column);
    }
    getWordAtPosition(position) {
        return this._tokenizationTextModelPart.getWordAtPosition(position);
    }
    getWordUntilPosition(position) {
        return this._tokenizationTextModelPart.getWordUntilPosition(position);
    }
    //#endregion
    normalizePosition(position, affinity) {
        return position;
    }
    /**
     * Gets the column at which indentation stops at a given line.
     * @internal
     */
    getLineIndentColumn(lineNumber) {
        // Columns start with 1.
        return indentOfLine(this.getLineContent(lineNumber)) + 1;
    }
    toString() {
        return `TextModel(${this.uri.toString()})`;
    }
};
TextModel = TextModel_1 = __decorate([
    __param(4, IUndoRedoService),
    __param(5, ILanguageService),
    __param(6, ILanguageConfigurationService),
    __param(7, IInstantiationService)
], TextModel);
export { TextModel };
export function indentOfLine(line) {
    let indent = 0;
    for (const c of line) {
        if (c === ' ' || c === '\t') {
            indent++;
        }
        else {
            break;
        }
    }
    return indent;
}
//#region Decorations
function isNodeInOverviewRuler(node) {
    return node.options.overviewRuler && node.options.overviewRuler.color ? true : false;
}
function isOptionsInjectedText(options) {
    return !!options.after || !!options.before;
}
function isNodeInjectedText(node) {
    return !!node.options.after || !!node.options.before;
}
class DecorationsTrees {
    constructor() {
        this._decorationsTree0 = new IntervalTree();
        this._decorationsTree1 = new IntervalTree();
        this._injectedTextDecorationsTree = new IntervalTree();
    }
    ensureAllNodesHaveRanges(host) {
        this.getAll(host, 0, false, false, false);
    }
    _ensureNodesHaveRanges(host, nodes) {
        for (const node of nodes) {
            if (node.range === null) {
                node.range = host.getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
            }
        }
        return nodes;
    }
    getAllInInterval(host, start, end, filterOwnerId, filterOutValidation, onlyMarginDecorations) {
        const versionId = host.getVersionId();
        const result = this._intervalSearch(start, end, filterOwnerId, filterOutValidation, versionId, onlyMarginDecorations);
        return this._ensureNodesHaveRanges(host, result);
    }
    _intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations) {
        const r0 = this._decorationsTree0.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        const r1 = this._decorationsTree1.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        const r2 = this._injectedTextDecorationsTree.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        return r0.concat(r1).concat(r2);
    }
    getInjectedTextInInterval(host, start, end, filterOwnerId) {
        const versionId = host.getVersionId();
        const result = this._injectedTextDecorationsTree.intervalSearch(start, end, filterOwnerId, false, versionId, false);
        return this._ensureNodesHaveRanges(host, result).filter((i) => i.options.showIfCollapsed || !i.range.isEmpty());
    }
    getAllInjectedText(host, filterOwnerId) {
        const versionId = host.getVersionId();
        const result = this._injectedTextDecorationsTree.search(filterOwnerId, false, versionId, false);
        return this._ensureNodesHaveRanges(host, result).filter((i) => i.options.showIfCollapsed || !i.range.isEmpty());
    }
    getAll(host, filterOwnerId, filterOutValidation, overviewRulerOnly, onlyMarginDecorations) {
        const versionId = host.getVersionId();
        const result = this._search(filterOwnerId, filterOutValidation, overviewRulerOnly, versionId, onlyMarginDecorations);
        return this._ensureNodesHaveRanges(host, result);
    }
    _search(filterOwnerId, filterOutValidation, overviewRulerOnly, cachedVersionId, onlyMarginDecorations) {
        if (overviewRulerOnly) {
            return this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        }
        else {
            const r0 = this._decorationsTree0.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
            const r1 = this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
            const r2 = this._injectedTextDecorationsTree.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
            return r0.concat(r1).concat(r2);
        }
    }
    collectNodesFromOwner(ownerId) {
        const r0 = this._decorationsTree0.collectNodesFromOwner(ownerId);
        const r1 = this._decorationsTree1.collectNodesFromOwner(ownerId);
        const r2 = this._injectedTextDecorationsTree.collectNodesFromOwner(ownerId);
        return r0.concat(r1).concat(r2);
    }
    collectNodesPostOrder() {
        const r0 = this._decorationsTree0.collectNodesPostOrder();
        const r1 = this._decorationsTree1.collectNodesPostOrder();
        const r2 = this._injectedTextDecorationsTree.collectNodesPostOrder();
        return r0.concat(r1).concat(r2);
    }
    insert(node) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.insert(node);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.insert(node);
        }
        else {
            this._decorationsTree0.insert(node);
        }
    }
    delete(node) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.delete(node);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.delete(node);
        }
        else {
            this._decorationsTree0.delete(node);
        }
    }
    getNodeRange(host, node) {
        const versionId = host.getVersionId();
        if (node.cachedVersionId !== versionId) {
            this._resolveNode(node, versionId);
        }
        if (node.range === null) {
            node.range = host.getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
        }
        return node.range;
    }
    _resolveNode(node, cachedVersionId) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.resolveNode(node, cachedVersionId);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.resolveNode(node, cachedVersionId);
        }
        else {
            this._decorationsTree0.resolveNode(node, cachedVersionId);
        }
    }
    acceptReplace(offset, length, textLength, forceMoveMarkers) {
        this._decorationsTree0.acceptReplace(offset, length, textLength, forceMoveMarkers);
        this._decorationsTree1.acceptReplace(offset, length, textLength, forceMoveMarkers);
        this._injectedTextDecorationsTree.acceptReplace(offset, length, textLength, forceMoveMarkers);
    }
}
function cleanClassName(className) {
    return className.replace(/[^a-z0-9\-_]/gi, ' ');
}
class DecorationOptions {
    constructor(options) {
        this.color = options.color || '';
        this.darkColor = options.darkColor || '';
    }
}
export class ModelDecorationOverviewRulerOptions extends DecorationOptions {
    constructor(options) {
        super(options);
        this._resolvedColor = null;
        this.position =
            typeof options.position === 'number' ? options.position : model.OverviewRulerLane.Center;
    }
    getColor(theme) {
        if (!this._resolvedColor) {
            if (theme.type !== 'light' && this.darkColor) {
                this._resolvedColor = this._resolveColor(this.darkColor, theme);
            }
            else {
                this._resolvedColor = this._resolveColor(this.color, theme);
            }
        }
        return this._resolvedColor;
    }
    invalidateCachedColor() {
        this._resolvedColor = null;
    }
    _resolveColor(color, theme) {
        if (typeof color === 'string') {
            return color;
        }
        const c = color ? theme.getColor(color.id) : null;
        if (!c) {
            return '';
        }
        return c.toString();
    }
}
export class ModelDecorationGlyphMarginOptions {
    constructor(options) {
        this.position = options?.position ?? model.GlyphMarginLane.Center;
        this.persistLane = options?.persistLane;
    }
}
export class ModelDecorationMinimapOptions extends DecorationOptions {
    constructor(options) {
        super(options);
        this.position = options.position;
        this.sectionHeaderStyle = options.sectionHeaderStyle ?? null;
        this.sectionHeaderText = options.sectionHeaderText ?? null;
    }
    getColor(theme) {
        if (!this._resolvedColor) {
            if (theme.type !== 'light' && this.darkColor) {
                this._resolvedColor = this._resolveColor(this.darkColor, theme);
            }
            else {
                this._resolvedColor = this._resolveColor(this.color, theme);
            }
        }
        return this._resolvedColor;
    }
    invalidateCachedColor() {
        this._resolvedColor = undefined;
    }
    _resolveColor(color, theme) {
        if (typeof color === 'string') {
            return Color.fromHex(color);
        }
        return theme.getColor(color.id);
    }
}
export class ModelDecorationInjectedTextOptions {
    static from(options) {
        if (options instanceof ModelDecorationInjectedTextOptions) {
            return options;
        }
        return new ModelDecorationInjectedTextOptions(options);
    }
    constructor(options) {
        this.content = options.content || '';
        this.tokens = options.tokens ?? null;
        this.inlineClassName = options.inlineClassName || null;
        this.inlineClassNameAffectsLetterSpacing = options.inlineClassNameAffectsLetterSpacing || false;
        this.attachedData = options.attachedData || null;
        this.cursorStops = options.cursorStops || null;
    }
}
export class ModelDecorationOptions {
    static register(options) {
        return new ModelDecorationOptions(options);
    }
    static createDynamic(options) {
        return new ModelDecorationOptions(options);
    }
    constructor(options) {
        this.description = options.description;
        this.blockClassName = options.blockClassName ? cleanClassName(options.blockClassName) : null;
        this.blockDoesNotCollapse = options.blockDoesNotCollapse ?? null;
        this.blockIsAfterEnd = options.blockIsAfterEnd ?? null;
        this.blockPadding = options.blockPadding ?? null;
        this.stickiness =
            options.stickiness || 0 /* model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */;
        this.zIndex = options.zIndex || 0;
        this.className = options.className ? cleanClassName(options.className) : null;
        this.shouldFillLineOnLineBreak = options.shouldFillLineOnLineBreak ?? null;
        this.hoverMessage = options.hoverMessage || null;
        this.glyphMarginHoverMessage = options.glyphMarginHoverMessage || null;
        this.lineNumberHoverMessage = options.lineNumberHoverMessage || null;
        this.isWholeLine = options.isWholeLine || false;
        this.showIfCollapsed = options.showIfCollapsed || false;
        this.collapseOnReplaceEdit = options.collapseOnReplaceEdit || false;
        this.overviewRuler = options.overviewRuler
            ? new ModelDecorationOverviewRulerOptions(options.overviewRuler)
            : null;
        this.minimap = options.minimap ? new ModelDecorationMinimapOptions(options.minimap) : null;
        this.glyphMargin = options.glyphMarginClassName
            ? new ModelDecorationGlyphMarginOptions(options.glyphMargin)
            : null;
        this.glyphMarginClassName = options.glyphMarginClassName
            ? cleanClassName(options.glyphMarginClassName)
            : null;
        this.linesDecorationsClassName = options.linesDecorationsClassName
            ? cleanClassName(options.linesDecorationsClassName)
            : null;
        this.lineNumberClassName = options.lineNumberClassName
            ? cleanClassName(options.lineNumberClassName)
            : null;
        this.linesDecorationsTooltip = options.linesDecorationsTooltip
            ? strings.htmlAttributeEncodeValue(options.linesDecorationsTooltip)
            : null;
        this.firstLineDecorationClassName = options.firstLineDecorationClassName
            ? cleanClassName(options.firstLineDecorationClassName)
            : null;
        this.marginClassName = options.marginClassName ? cleanClassName(options.marginClassName) : null;
        this.inlineClassName = options.inlineClassName ? cleanClassName(options.inlineClassName) : null;
        this.inlineClassNameAffectsLetterSpacing = options.inlineClassNameAffectsLetterSpacing || false;
        this.beforeContentClassName = options.beforeContentClassName
            ? cleanClassName(options.beforeContentClassName)
            : null;
        this.afterContentClassName = options.afterContentClassName
            ? cleanClassName(options.afterContentClassName)
            : null;
        this.after = options.after ? ModelDecorationInjectedTextOptions.from(options.after) : null;
        this.before = options.before ? ModelDecorationInjectedTextOptions.from(options.before) : null;
        this.hideInCommentTokens = options.hideInCommentTokens ?? false;
        this.hideInStringTokens = options.hideInStringTokens ?? false;
    }
}
ModelDecorationOptions.EMPTY = ModelDecorationOptions.register({ description: 'empty' });
/**
 * The order carefully matches the values of the enum.
 */
const TRACKED_RANGE_OPTIONS = [
    ModelDecorationOptions.register({
        description: 'tracked-range-always-grows-when-typing-at-edges',
        stickiness: 0 /* model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
    }),
    ModelDecorationOptions.register({
        description: 'tracked-range-never-grows-when-typing-at-edges',
        stickiness: 1 /* model.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    }),
    ModelDecorationOptions.register({
        description: 'tracked-range-grows-only-when-typing-before',
        stickiness: 2 /* model.TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */,
    }),
    ModelDecorationOptions.register({
        description: 'tracked-range-grows-only-when-typing-after',
        stickiness: 3 /* model.TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */,
    }),
];
function _normalizeOptions(options) {
    if (options instanceof ModelDecorationOptions) {
        return options;
    }
    return ModelDecorationOptions.createDynamic(options);
}
class DidChangeDecorationsEmitter extends Disposable {
    constructor(handleBeforeFire) {
        super();
        this.handleBeforeFire = handleBeforeFire;
        this._actual = this._register(new Emitter());
        this.event = this._actual.event;
        this._affectedInjectedTextLines = null;
        this._deferredCnt = 0;
        this._shouldFireDeferred = false;
        this._affectsMinimap = false;
        this._affectsOverviewRuler = false;
        this._affectsGlyphMargin = false;
        this._affectsLineNumber = false;
    }
    hasListeners() {
        return this._actual.hasListeners();
    }
    beginDeferredEmit() {
        this._deferredCnt++;
    }
    endDeferredEmit() {
        this._deferredCnt--;
        if (this._deferredCnt === 0) {
            if (this._shouldFireDeferred) {
                this.doFire();
            }
            this._affectedInjectedTextLines?.clear();
            this._affectedInjectedTextLines = null;
        }
    }
    recordLineAffectedByInjectedText(lineNumber) {
        if (!this._affectedInjectedTextLines) {
            this._affectedInjectedTextLines = new Set();
        }
        this._affectedInjectedTextLines.add(lineNumber);
    }
    checkAffectedAndFire(options) {
        this._affectsMinimap ||= !!options.minimap?.position;
        this._affectsOverviewRuler ||= !!options.overviewRuler?.color;
        this._affectsGlyphMargin ||= !!options.glyphMarginClassName;
        this._affectsLineNumber ||= !!options.lineNumberClassName;
        this.tryFire();
    }
    fire() {
        this._affectsMinimap = true;
        this._affectsOverviewRuler = true;
        this._affectsGlyphMargin = true;
        this.tryFire();
    }
    tryFire() {
        if (this._deferredCnt === 0) {
            this.doFire();
        }
        else {
            this._shouldFireDeferred = true;
        }
    }
    doFire() {
        this.handleBeforeFire(this._affectedInjectedTextLines);
        const event = {
            affectsMinimap: this._affectsMinimap,
            affectsOverviewRuler: this._affectsOverviewRuler,
            affectsGlyphMargin: this._affectsGlyphMargin,
            affectsLineNumber: this._affectsLineNumber,
        };
        this._shouldFireDeferred = false;
        this._affectsMinimap = false;
        this._affectsOverviewRuler = false;
        this._affectsGlyphMargin = false;
        this._actual.fire(event);
    }
}
//#endregion
class DidChangeContentEmitter extends Disposable {
    constructor() {
        super();
        /**
         * Both `fastEvent` and `slowEvent` work the same way and contain the same events, but first we invoke `fastEvent` and then `slowEvent`.
         */
        this._fastEmitter = this._register(new Emitter());
        this.fastEvent = this._fastEmitter.event;
        this._slowEmitter = this._register(new Emitter());
        this.slowEvent = this._slowEmitter.event;
        this._deferredCnt = 0;
        this._deferredEvent = null;
    }
    hasListeners() {
        return this._fastEmitter.hasListeners() || this._slowEmitter.hasListeners();
    }
    beginDeferredEmit() {
        this._deferredCnt++;
    }
    endDeferredEmit(resultingSelection = null) {
        this._deferredCnt--;
        if (this._deferredCnt === 0) {
            if (this._deferredEvent !== null) {
                this._deferredEvent.rawContentChangedEvent.resultingSelection = resultingSelection;
                const e = this._deferredEvent;
                this._deferredEvent = null;
                this._fastEmitter.fire(e);
                this._slowEmitter.fire(e);
            }
        }
    }
    fire(e) {
        if (this._deferredCnt > 0) {
            if (this._deferredEvent) {
                this._deferredEvent = this._deferredEvent.merge(e);
            }
            else {
                this._deferredEvent = e;
            }
            return;
        }
        this._fastEmitter.fire(e);
        this._slowEmitter.fire(e);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxPQUFPLEVBQ04sVUFBVSxFQUVWLGlCQUFpQixFQUNqQixrQkFBa0IsR0FDbEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzdELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRWhELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR3BFLE9BQU8sRUFBc0IsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FB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