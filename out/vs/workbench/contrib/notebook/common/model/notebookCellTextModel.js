/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { hash, StringSHA1 } from '../../../../../base/common/hash.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { PieceTreeTextBuffer } from '../../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.js';
import { createTextBuffer } from '../../../../../editor/common/model/textModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { NotebookCellOutputTextModel } from './notebookCellOutputTextModel.js';
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { toFormattedString } from '../../../../../base/common/jsonFormatter.js';
import { splitLines } from '../../../../../base/common/strings.js';
export class NotebookCellTextModel extends Disposable {
    get outputs() {
        return this._outputs;
    }
    get metadata() {
        return this._metadata;
    }
    set metadata(newMetadata) {
        this._metadata = newMetadata;
        this._hash = null;
        this._onDidChangeMetadata.fire();
    }
    get internalMetadata() {
        return this._internalMetadata;
    }
    set internalMetadata(newInternalMetadata) {
        const lastRunSuccessChanged = this._internalMetadata.lastRunSuccess !== newInternalMetadata.lastRunSuccess;
        newInternalMetadata = {
            ...newInternalMetadata,
            ...{
                runStartTimeAdjustment: computeRunStartTimeAdjustment(this._internalMetadata, newInternalMetadata),
            },
        };
        this._internalMetadata = newInternalMetadata;
        this._hash = null;
        this._onDidChangeInternalMetadata.fire({ lastRunSuccessChanged });
    }
    get language() {
        return this._language;
    }
    set language(newLanguage) {
        if (this._textModel &&
            // 1. the language update is from workspace edit, checking if it's the same as text model's mode
            this._textModel.getLanguageId() ===
                this._languageService.getLanguageIdByLanguageName(newLanguage) &&
            // 2. the text model's mode might be the same as the `this.language`, even if the language friendly name is not the same, we should not trigger an update
            this._textModel.getLanguageId() ===
                this._languageService.getLanguageIdByLanguageName(this.language)) {
            return;
        }
        this._hasLanguageSetExplicitly = true;
        this._setLanguageInternal(newLanguage);
    }
    get mime() {
        return this._mime;
    }
    set mime(newMime) {
        if (this._mime === newMime) {
            return;
        }
        this._mime = newMime;
        this._hash = null;
        this._onDidChangeContent.fire('mime');
    }
    get textBuffer() {
        if (this._textBuffer) {
            return this._textBuffer;
        }
        this._textBuffer = this._register(createTextBuffer(this._source, 1 /* model.DefaultEndOfLine.LF */).textBuffer);
        this._register(this._textBuffer.onDidChangeContent(() => {
            this._hash = null;
            if (!this._textModel) {
                this._onDidChangeContent.fire('content');
            }
            this.autoDetectLanguage();
        }));
        return this._textBuffer;
    }
    get alternativeId() {
        return this._alternativeId;
    }
    get textModel() {
        return this._textModel;
    }
    set textModel(m) {
        if (this._textModel === m) {
            return;
        }
        this._textModelDisposables.clear();
        this._textModel = m;
        if (this._textModel) {
            this.setRegisteredLanguage(this._languageService, this._textModel.getLanguageId(), this.language);
            // Listen to language changes on the model
            this._textModelDisposables.add(this._textModel.onDidChangeLanguage((e) => this.setRegisteredLanguage(this._languageService, e.newLanguage, this.language)));
            this._textModelDisposables.add(this._textModel.onWillDispose(() => (this.textModel = undefined)));
            this._textModelDisposables.add(this._textModel.onDidChangeContent((e) => {
                if (this._textModel) {
                    this._versionId = this._textModel.getVersionId();
                    this._alternativeId = this._textModel.getAlternativeVersionId();
                }
                this._textBufferHash = null;
                this._onDidChangeContent.fire('content');
                this._onDidChangeContent.fire({ type: 'model', event: e });
            }));
            this._textModel._overwriteVersionId(this._versionId);
            this._textModel._overwriteAlternativeVersionId(this._versionId);
            this._onDidChangeTextModel.fire();
        }
    }
    setRegisteredLanguage(languageService, newLanguage, currentLanguage) {
        // The language defined in the cell might not be supported in the editor so the text model might be using the default fallback
        // If so let's not modify the language
        const isFallBackLanguage = newLanguage === PLAINTEXT_LANGUAGE_ID || newLanguage === 'jupyter';
        if (!languageService.isRegisteredLanguageId(currentLanguage) && isFallBackLanguage) {
            // notify to display warning, but don't change the language
            this._onDidChangeLanguage.fire(currentLanguage);
        }
        else {
            this.language = newLanguage;
        }
    }
    static { this.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY = 600; }
    get hasLanguageSetExplicitly() {
        return this._hasLanguageSetExplicitly;
    }
    constructor(uri, handle, _source, _language, _mime, cellKind, outputs, metadata, internalMetadata, collapseState, transientOptions, _languageService, _languageDetectionService = undefined) {
        super();
        this.uri = uri;
        this.handle = handle;
        this._source = _source;
        this._language = _language;
        this._mime = _mime;
        this.cellKind = cellKind;
        this.collapseState = collapseState;
        this.transientOptions = transientOptions;
        this._languageService = _languageService;
        this._languageDetectionService = _languageDetectionService;
        this._onDidChangeTextModel = this._register(new Emitter());
        this.onDidChangeTextModel = this._onDidChangeTextModel.event;
        this._onDidChangeOutputs = this._register(new Emitter());
        this.onDidChangeOutputs = this._onDidChangeOutputs.event;
        this._onDidChangeOutputItems = this._register(new Emitter());
        this.onDidChangeOutputItems = this._onDidChangeOutputItems.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidChangeInternalMetadata = this._register(new Emitter());
        this.onDidChangeInternalMetadata = this._onDidChangeInternalMetadata.event;
        this._onDidChangeLanguage = this._register(new Emitter());
        this.onDidChangeLanguage = this._onDidChangeLanguage.event;
        this._textBufferHash = null;
        this._hash = null;
        this._versionId = 1;
        this._alternativeId = 1;
        this._textModelDisposables = this._register(new DisposableStore());
        this._textModel = undefined;
        this.autoDetectLanguageThrottler = this._register(new ThrottledDelayer(NotebookCellTextModel.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY));
        this._autoLanguageDetectionEnabled = false;
        this._hasLanguageSetExplicitly = false;
        this._outputs = outputs.map((op) => new NotebookCellOutputTextModel(op));
        this._metadata = metadata ?? {};
        this._internalMetadata = internalMetadata ?? {};
    }
    enableAutoLanguageDetection() {
        this._autoLanguageDetectionEnabled = true;
        this.autoDetectLanguage();
    }
    async autoDetectLanguage() {
        if (this._autoLanguageDetectionEnabled) {
            this.autoDetectLanguageThrottler.trigger(() => this._doAutoDetectLanguage());
        }
    }
    async _doAutoDetectLanguage() {
        if (this.hasLanguageSetExplicitly) {
            return;
        }
        const newLanguage = await this._languageDetectionService?.detectLanguage(this.uri);
        if (!newLanguage) {
            return;
        }
        if (this._textModel &&
            this._textModel.getLanguageId() ===
                this._languageService.getLanguageIdByLanguageName(newLanguage) &&
            this._textModel.getLanguageId() ===
                this._languageService.getLanguageIdByLanguageName(this.language)) {
            return;
        }
        this._setLanguageInternal(newLanguage);
    }
    _setLanguageInternal(newLanguage) {
        const newLanguageId = this._languageService.getLanguageIdByLanguageName(newLanguage);
        if (newLanguageId === null) {
            return;
        }
        if (this._textModel) {
            const languageId = this._languageService.createById(newLanguageId);
            this._textModel.setLanguage(languageId.languageId);
        }
        if (this._language === newLanguage) {
            return;
        }
        this._language = newLanguage;
        this._hash = null;
        this._onDidChangeLanguage.fire(newLanguage);
        this._onDidChangeContent.fire('language');
    }
    resetTextBuffer(textBuffer) {
        this._textBuffer = textBuffer;
    }
    getValue() {
        const fullRange = this.getFullModelRange();
        const eol = this.textBuffer.getEOL();
        if (eol === '\n') {
            return this.textBuffer.getValueInRange(fullRange, 1 /* model.EndOfLinePreference.LF */);
        }
        else {
            return this.textBuffer.getValueInRange(fullRange, 2 /* model.EndOfLinePreference.CRLF */);
        }
    }
    getTextBufferHash() {
        if (this._textBufferHash !== null) {
            return this._textBufferHash;
        }
        const shaComputer = new StringSHA1();
        const snapshot = this.textBuffer.createSnapshot(false);
        let text;
        while ((text = snapshot.read())) {
            shaComputer.update(text);
        }
        this._textBufferHash = shaComputer.digest();
        return this._textBufferHash;
    }
    getHashValue() {
        if (this._hash !== null) {
            return this._hash;
        }
        this._hash = hash([
            hash(this.language),
            this.getTextBufferHash(),
            this._getPersisentMetadata(),
            this.transientOptions.transientOutputs
                ? []
                : this._outputs.map((op) => ({
                    outputs: op.outputs.map((output) => ({
                        mime: output.mime,
                        data: Array.from(output.data.buffer),
                    })),
                    metadata: op.metadata,
                })),
        ]);
        return this._hash;
    }
    _getPersisentMetadata() {
        return getFormattedMetadataJSON(this.transientOptions.transientCellMetadata, this.metadata, this.language);
    }
    getTextLength() {
        return this.textBuffer.getLength();
    }
    getFullModelRange() {
        const lineCount = this.textBuffer.getLineCount();
        return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
    }
    spliceNotebookCellOutputs(splice) {
        if (splice.deleteCount > 0 && splice.newOutputs.length > 0) {
            const commonLen = Math.min(splice.deleteCount, splice.newOutputs.length);
            // update
            for (let i = 0; i < commonLen; i++) {
                const currentOutput = this.outputs[splice.start + i];
                const newOutput = splice.newOutputs[i];
                this.replaceOutput(currentOutput.outputId, newOutput);
            }
            const removed = this.outputs.splice(splice.start + commonLen, splice.deleteCount - commonLen, ...splice.newOutputs.slice(commonLen));
            removed.forEach((output) => output.dispose());
            this._onDidChangeOutputs.fire({
                start: splice.start + commonLen,
                deleteCount: splice.deleteCount - commonLen,
                newOutputs: splice.newOutputs.slice(commonLen),
            });
        }
        else {
            const removed = this.outputs.splice(splice.start, splice.deleteCount, ...splice.newOutputs);
            removed.forEach((output) => output.dispose());
            this._onDidChangeOutputs.fire(splice);
        }
    }
    replaceOutput(outputId, newOutputItem) {
        const outputIndex = this.outputs.findIndex((output) => output.outputId === outputId);
        if (outputIndex < 0) {
            return false;
        }
        const output = this.outputs[outputIndex];
        // convert to dto and dispose the cell output model
        output.replaceData({
            outputs: newOutputItem.outputs,
            outputId: newOutputItem.outputId,
            metadata: newOutputItem.metadata,
        });
        newOutputItem.dispose();
        this._onDidChangeOutputItems.fire();
        return true;
    }
    changeOutputItems(outputId, append, items) {
        const outputIndex = this.outputs.findIndex((output) => output.outputId === outputId);
        if (outputIndex < 0) {
            return false;
        }
        const output = this.outputs[outputIndex];
        if (append) {
            output.appendData(items);
        }
        else {
            output.replaceData({ outputId: outputId, outputs: items, metadata: output.metadata });
        }
        this._onDidChangeOutputItems.fire();
        return true;
    }
    _outputNotEqualFastCheck(left, right) {
        if (left.length !== right.length) {
            return false;
        }
        for (let i = 0; i < this.outputs.length; i++) {
            const l = left[i];
            const r = right[i];
            if (l.outputs.length !== r.outputs.length) {
                return false;
            }
            for (let k = 0; k < l.outputs.length; k++) {
                if (l.outputs[k].mime !== r.outputs[k].mime) {
                    return false;
                }
                if (l.outputs[k].data.byteLength !== r.outputs[k].data.byteLength) {
                    return false;
                }
            }
        }
        return true;
    }
    equal(b) {
        if (this.language !== b.language) {
            return false;
        }
        if (this.outputs.length !== b.outputs.length) {
            return false;
        }
        if (this.getTextLength() !== b.getTextLength()) {
            return false;
        }
        if (!this.transientOptions.transientOutputs) {
            // compare outputs
            if (!this._outputNotEqualFastCheck(this.outputs, b.outputs)) {
                return false;
            }
        }
        return this.getHashValue() === b.getHashValue();
    }
    /**
     * Only compares
     * - language
     * - mime
     * - cellKind
     * - internal metadata (conditionally)
     * - source
     */
    fastEqual(b, ignoreMetadata) {
        if (this.language !== b.language) {
            return false;
        }
        if (this.mime !== b.mime) {
            return false;
        }
        if (this.cellKind !== b.cellKind) {
            return false;
        }
        if (!ignoreMetadata) {
            if (this.internalMetadata?.executionOrder !== b.internalMetadata?.executionOrder ||
                this.internalMetadata?.lastRunSuccess !== b.internalMetadata?.lastRunSuccess ||
                this.internalMetadata?.runStartTime !== b.internalMetadata?.runStartTime ||
                this.internalMetadata?.runStartTimeAdjustment !==
                    b.internalMetadata?.runStartTimeAdjustment ||
                this.internalMetadata?.runEndTime !== b.internalMetadata?.runEndTime) {
                return false;
            }
        }
        // Once we attach the cell text buffer to an editor, the source of truth is the text buffer instead of the original source
        if (this._textBuffer) {
            if (!NotebookCellTextModel.linesAreEqual(this.textBuffer.getLinesContent(), b.source)) {
                return false;
            }
        }
        else if (this._source !== b.source) {
            return false;
        }
        return true;
    }
    static linesAreEqual(aLines, b) {
        const bLines = splitLines(b);
        if (aLines.length !== bLines.length) {
            return false;
        }
        for (let i = 0; i < aLines.length; i++) {
            if (aLines[i] !== bLines[i]) {
                return false;
            }
        }
        return true;
    }
    dispose() {
        dispose(this._outputs);
        // Manually release reference to previous text buffer to avoid large leaks
        // in case someone leaks a CellTextModel reference
        const emptyDisposedTextBuffer = new PieceTreeTextBuffer([], '', '\n', false, false, true, true);
        emptyDisposedTextBuffer.dispose();
        this._textBuffer = emptyDisposedTextBuffer;
        super.dispose();
    }
}
export function cloneNotebookCellTextModel(cell) {
    return {
        source: cell.getValue(),
        language: cell.language,
        mime: cell.mime,
        cellKind: cell.cellKind,
        outputs: cell.outputs.map((output) => ({
            outputs: output.outputs,
            /* paste should generate new outputId */ outputId: UUID.generateUuid(),
        })),
        metadata: {},
    };
}
function computeRunStartTimeAdjustment(oldMetadata, newMetadata) {
    if (oldMetadata.runStartTime !== newMetadata.runStartTime &&
        typeof newMetadata.runStartTime === 'number') {
        const offset = Date.now() - newMetadata.runStartTime;
        return offset < 0 ? Math.abs(offset) : 0;
    }
    else {
        return newMetadata.runStartTimeAdjustment;
    }
}
export function getFormattedMetadataJSON(transientCellMetadata, metadata, language, sortKeys) {
    let filteredMetadata = {};
    if (transientCellMetadata) {
        const keys = new Set([...Object.keys(metadata)]);
        for (const key of keys) {
            if (!transientCellMetadata[key]) {
                filteredMetadata[key] = metadata[key];
            }
        }
    }
    else {
        filteredMetadata = metadata;
    }
    const obj = {
        language,
        ...filteredMetadata,
    };
    // Give preference to the language we have been given.
    // Metadata can contain `language` due to round-tripping of cell metadata.
    // I.e. we add it here, and then from SCM when we revert the cell, we get this same metadata back with the `language` property.
    if (language) {
        obj.language = language;
    }
    const metadataSource = toFormattedString(sortKeys ? sortObjectPropertiesRecursively(obj) : obj, {});
    return metadataSource;
}
/**
 * Sort the JSON to ensure when diffing, the JSON keys are sorted & matched correctly in diff view.
 */
export function sortObjectPropertiesRecursively(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectPropertiesRecursively);
    }
    if (obj !== undefined && obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0) {
        return Object.keys(obj)
            .sort()
            .reduce((sortedObj, prop) => {
            sortedObj[prop] = sortObjectPropertiesRecursively(obj[prop]);
            return sortedObj;
        }, {});
    }
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsVGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL21vZGVsL25vdGVib29rQ2VsbFRleHRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWEsTUFBTSxpREFBaUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWdCOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWxFLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBZ0NwRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUlELElBQUksUUFBUTtRQUNYLE9BQU8sSUFB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