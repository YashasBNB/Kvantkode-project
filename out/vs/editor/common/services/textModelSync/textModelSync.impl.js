/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IntervalTimer } from '../../../../base/common/async.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { ensureValidWordDefinition, getWordAtText } from '../../core/wordHelper.js';
import { MirrorTextModel as BaseMirrorModel, } from '../../model/mirrorTextModel.js';
/**
 * Stop syncing a model to the worker if it was not needed for 1 min.
 */
export const STOP_SYNC_MODEL_DELTA_TIME_MS = 60 * 1000;
export const WORKER_TEXT_MODEL_SYNC_CHANNEL = 'workerTextModelSync';
export class WorkerTextModelSyncClient extends Disposable {
    static create(workerClient, modelService) {
        return new WorkerTextModelSyncClient(workerClient.getChannel(WORKER_TEXT_MODEL_SYNC_CHANNEL), modelService);
    }
    constructor(proxy, modelService, keepIdleModels = false) {
        super();
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        this._proxy = proxy;
        this._modelService = modelService;
        if (!keepIdleModels) {
            const timer = new IntervalTimer();
            timer.cancelAndSet(() => this._checkStopModelSync(), Math.round(STOP_SYNC_MODEL_DELTA_TIME_MS / 2));
            this._register(timer);
        }
    }
    dispose() {
        for (const modelUrl in this._syncedModels) {
            dispose(this._syncedModels[modelUrl]);
        }
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
        super.dispose();
    }
    ensureSyncedResources(resources, forceLargeModels = false) {
        for (const resource of resources) {
            const resourceStr = resource.toString();
            if (!this._syncedModels[resourceStr]) {
                this._beginModelSync(resource, forceLargeModels);
            }
            if (this._syncedModels[resourceStr]) {
                this._syncedModelsLastUsedTime[resourceStr] = new Date().getTime();
            }
        }
    }
    _checkStopModelSync() {
        const currentTime = new Date().getTime();
        const toRemove = [];
        for (const modelUrl in this._syncedModelsLastUsedTime) {
            const elapsedTime = currentTime - this._syncedModelsLastUsedTime[modelUrl];
            if (elapsedTime > STOP_SYNC_MODEL_DELTA_TIME_MS) {
                toRemove.push(modelUrl);
            }
        }
        for (const e of toRemove) {
            this._stopModelSync(e);
        }
    }
    _beginModelSync(resource, forceLargeModels) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return;
        }
        if (!forceLargeModels && model.isTooLargeForSyncing()) {
            return;
        }
        const modelUrl = resource.toString();
        this._proxy.$acceptNewModel({
            url: model.uri.toString(),
            lines: model.getLinesContent(),
            EOL: model.getEOL(),
            versionId: model.getVersionId(),
        });
        const toDispose = new DisposableStore();
        toDispose.add(model.onDidChangeContent((e) => {
            this._proxy.$acceptModelChanged(modelUrl.toString(), e);
        }));
        toDispose.add(model.onWillDispose(() => {
            this._stopModelSync(modelUrl);
        }));
        toDispose.add(toDisposable(() => {
            this._proxy.$acceptRemovedModel(modelUrl);
        }));
        this._syncedModels[modelUrl] = toDispose;
    }
    _stopModelSync(modelUrl) {
        const toDispose = this._syncedModels[modelUrl];
        delete this._syncedModels[modelUrl];
        delete this._syncedModelsLastUsedTime[modelUrl];
        dispose(toDispose);
    }
}
export class WorkerTextModelSyncServer {
    constructor() {
        this._models = Object.create(null);
    }
    bindToServer(workerServer) {
        workerServer.setChannel(WORKER_TEXT_MODEL_SYNC_CHANNEL, this);
    }
    getModel(uri) {
        return this._models[uri];
    }
    getModels() {
        const all = [];
        Object.keys(this._models).forEach((key) => all.push(this._models[key]));
        return all;
    }
    $acceptNewModel(data) {
        this._models[data.url] = new MirrorModel(URI.parse(data.url), data.lines, data.EOL, data.versionId);
    }
    $acceptModelChanged(uri, e) {
        if (!this._models[uri]) {
            return;
        }
        const model = this._models[uri];
        model.onEvents(e);
    }
    $acceptRemovedModel(uri) {
        if (!this._models[uri]) {
            return;
        }
        delete this._models[uri];
    }
}
export class MirrorModel extends BaseMirrorModel {
    get uri() {
        return this._uri;
    }
    get eol() {
        return this._eol;
    }
    getValue() {
        return this.getText();
    }
    findMatches(regex) {
        const matches = [];
        for (let i = 0; i < this._lines.length; i++) {
            const line = this._lines[i];
            const offsetToAdd = this.offsetAt(new Position(i + 1, 1));
            const iteratorOverMatches = line.matchAll(regex);
            for (const match of iteratorOverMatches) {
                if (match.index || match.index === 0) {
                    match.index = match.index + offsetToAdd;
                }
                matches.push(match);
            }
        }
        return matches;
    }
    getLinesContent() {
        return this._lines.slice(0);
    }
    getLineCount() {
        return this._lines.length;
    }
    getLineContent(lineNumber) {
        return this._lines[lineNumber - 1];
    }
    getWordAtPosition(position, wordDefinition) {
        const wordAtText = getWordAtText(position.column, ensureValidWordDefinition(wordDefinition), this._lines[position.lineNumber - 1], 0);
        if (wordAtText) {
            return new Range(position.lineNumber, wordAtText.startColumn, position.lineNumber, wordAtText.endColumn);
        }
        return null;
    }
    getWordUntilPosition(position, wordDefinition) {
        const wordAtPosition = this.getWordAtPosition(position, wordDefinition);
        if (!wordAtPosition) {
            return {
                word: '',
                startColumn: position.column,
                endColumn: position.column,
            };
        }
        return {
            word: this._lines[position.lineNumber - 1].substring(wordAtPosition.startColumn - 1, position.column - 1),
            startColumn: wordAtPosition.startColumn,
            endColumn: position.column,
        };
    }
    words(wordDefinition) {
        const lines = this._lines;
        const wordenize = this._wordenize.bind(this);
        let lineNumber = 0;
        let lineText = '';
        let wordRangesIdx = 0;
        let wordRanges = [];
        return {
            *[Symbol.iterator]() {
                while (true) {
                    if (wordRangesIdx < wordRanges.length) {
                        const value = lineText.substring(wordRanges[wordRangesIdx].start, wordRanges[wordRangesIdx].end);
                        wordRangesIdx += 1;
                        yield value;
                    }
                    else {
                        if (lineNumber < lines.length) {
                            lineText = lines[lineNumber];
                            wordRanges = wordenize(lineText, wordDefinition);
                            wordRangesIdx = 0;
                            lineNumber += 1;
                        }
                        else {
                            break;
                        }
                    }
                }
            },
        };
    }
    getLineWords(lineNumber, wordDefinition) {
        const content = this._lines[lineNumber - 1];
        const ranges = this._wordenize(content, wordDefinition);
        const words = [];
        for (const range of ranges) {
            words.push({
                word: content.substring(range.start, range.end),
                startColumn: range.start + 1,
                endColumn: range.end + 1,
            });
        }
        return words;
    }
    _wordenize(content, wordDefinition) {
        const result = [];
        let match;
        wordDefinition.lastIndex = 0; // reset lastIndex just to be sure
        while ((match = wordDefinition.exec(content))) {
            if (match[0].length === 0) {
                // it did match the empty string
                break;
            }
            result.push({ start: match.index, end: match.index + match[0].length });
        }
        return result;
    }
    getValueInRange(range) {
        range = this._validateRange(range);
        if (range.startLineNumber === range.endLineNumber) {
            return this._lines[range.startLineNumber - 1].substring(range.startColumn - 1, range.endColumn - 1);
        }
        const lineEnding = this._eol;
        const startLineIndex = range.startLineNumber - 1;
        const endLineIndex = range.endLineNumber - 1;
        const resultLines = [];
        resultLines.push(this._lines[startLineIndex].substring(range.startColumn - 1));
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this._lines[i]);
        }
        resultLines.push(this._lines[endLineIndex].substring(0, range.endColumn - 1));
        return resultLines.join(lineEnding);
    }
    offsetAt(position) {
        position = this._validatePosition(position);
        this._ensureLineStarts();
        return this._lineStarts.getPrefixSum(position.lineNumber - 2) + (position.column - 1);
    }
    positionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        this._ensureLineStarts();
        const out = this._lineStarts.getIndexOf(offset);
        const lineLength = this._lines[out.index].length;
        // Ensure we return a valid position
        return {
            lineNumber: 1 + out.index,
            column: 1 + Math.min(out.remainder, lineLength),
        };
    }
    _validateRange(range) {
        const start = this._validatePosition({
            lineNumber: range.startLineNumber,
            column: range.startColumn,
        });
        const end = this._validatePosition({ lineNumber: range.endLineNumber, column: range.endColumn });
        if (start.lineNumber !== range.startLineNumber ||
            start.column !== range.startColumn ||
            end.lineNumber !== range.endLineNumber ||
            end.column !== range.endColumn) {
            return {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
            };
        }
        return range;
    }
    _validatePosition(position) {
        if (!Position.isIPosition(position)) {
            throw new Error('bad position');
        }
        let { lineNumber, column } = position;
        let hasChanged = false;
        if (lineNumber < 1) {
            lineNumber = 1;
            column = 1;
            hasChanged = true;
        }
        else if (lineNumber > this._lines.length) {
            lineNumber = this._lines.length;
            column = this._lines[lineNumber - 1].length + 1;
            hasChanged = true;
        }
        else {
            const maxCharacter = this._lines[lineNumber - 1].length + 1;
            if (column < 1) {
                column = 1;
                hasChanged = true;
            }
            else if (column > maxCharacter) {
                column = maxCharacter;
                hasChanged = true;
            }
        }
        if (!hasChanged) {
            return position;
        }
        else {
            return { lineNumber, column };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU3luYy5pbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90ZXh0TW9kZWxTeW5jL3RleHRNb2RlbFN5bmMuaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDNUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ25ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxhQUFhLEVBQW1CLE1BQU0sMEJBQTBCLENBQUE7QUFHcEcsT0FBTyxFQUNOLGVBQWUsSUFBSSxlQUFlLEdBRWxDLE1BQU0sZ0NBQWdDLENBQUE7QUFLdkM7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFBO0FBRXRELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLHFCQUFxQixDQUFBO0FBRW5FLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQ25CLFlBQW1DLEVBQ25DLFlBQTJCO1FBRTNCLE9BQU8sSUFBSSx5QkFBeUIsQ0FDbkMsWUFBWSxDQUFDLFVBQVUsQ0FBb0MsOEJBQThCLENBQUMsRUFDMUYsWUFBWSxDQUNaLENBQUE7SUFDRixDQUFDO0lBT0QsWUFDQyxLQUF3QyxFQUN4QyxZQUEyQixFQUMzQixpQkFBMEIsS0FBSztR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