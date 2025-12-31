/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stringDiff } from '../../../base/common/diff/diff.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { computeLinks } from '../languages/linkComputer.js';
import { BasicInplaceReplace } from '../languages/supports/inplaceReplaceSupport.js';
import { createMonacoBaseAPI } from './editorBaseApi.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { UnicodeTextModelHighlighter, } from './unicodeTextModelHighlighter.js';
import { DiffComputer } from '../diff/legacyLinesDiffComputer.js';
import { linesDiffComputers } from '../diff/linesDiffComputers.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { computeDefaultDocumentColors } from '../languages/defaultDocumentColorsComputer.js';
import { findSectionHeaders, } from './findSectionHeaders.js';
import { WorkerTextModelSyncServer } from './textModelSync/textModelSync.impl.js';
/**
 * @internal
 */
export class EditorWorker {
    constructor(_foreignModule = null) {
        this._foreignModule = _foreignModule;
        this._workerTextModelSyncServer = new WorkerTextModelSyncServer();
    }
    dispose() { }
    async $ping() {
        return 'pong';
    }
    _getModel(uri) {
        return this._workerTextModelSyncServer.getModel(uri);
    }
    getModels() {
        return this._workerTextModelSyncServer.getModels();
    }
    $acceptNewModel(data) {
        this._workerTextModelSyncServer.$acceptNewModel(data);
    }
    $acceptModelChanged(uri, e) {
        this._workerTextModelSyncServer.$acceptModelChanged(uri, e);
    }
    $acceptRemovedModel(uri) {
        this._workerTextModelSyncServer.$acceptRemovedModel(uri);
    }
    async $computeUnicodeHighlights(url, options, range) {
        const model = this._getModel(url);
        if (!model) {
            return {
                ranges: [],
                hasMore: false,
                ambiguousCharacterCount: 0,
                invisibleCharacterCount: 0,
                nonBasicAsciiCharacterCount: 0,
            };
        }
        return UnicodeTextModelHighlighter.computeUnicodeHighlights(model, options, range);
    }
    async $findSectionHeaders(url, options) {
        const model = this._getModel(url);
        if (!model) {
            return [];
        }
        return findSectionHeaders(model, options);
    }
    // ---- BEGIN diff --------------------------------------------------------------------------
    async $computeDiff(originalUrl, modifiedUrl, options, algorithm) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        if (!original || !modified) {
            return null;
        }
        const result = EditorWorker.computeDiff(original, modified, options, algorithm);
        return result;
    }
    static computeDiff(originalTextModel, modifiedTextModel, options, algorithm) {
        const diffAlgorithm = algorithm === 'advanced' ? linesDiffComputers.getDefault() : linesDiffComputers.getLegacy();
        const originalLines = originalTextModel.getLinesContent();
        const modifiedLines = modifiedTextModel.getLinesContent();
        const result = diffAlgorithm.computeDiff(originalLines, modifiedLines, options);
        const identical = result.changes.length > 0
            ? false
            : this._modelsAreIdentical(originalTextModel, modifiedTextModel);
        function getLineChanges(changes) {
            return changes.map((m) => [
                m.original.startLineNumber,
                m.original.endLineNumberExclusive,
                m.modified.startLineNumber,
                m.modified.endLineNumberExclusive,
                m.innerChanges?.map((m) => [
                    m.originalRange.startLineNumber,
                    m.originalRange.startColumn,
                    m.originalRange.endLineNumber,
                    m.originalRange.endColumn,
                    m.modifiedRange.startLineNumber,
                    m.modifiedRange.startColumn,
                    m.modifiedRange.endLineNumber,
                    m.modifiedRange.endColumn,
                ]),
            ]);
        }
        return {
            identical,
            quitEarly: result.hitTimeout,
            changes: getLineChanges(result.changes),
            moves: result.moves.map((m) => [
                m.lineRangeMapping.original.startLineNumber,
                m.lineRangeMapping.original.endLineNumberExclusive,
                m.lineRangeMapping.modified.startLineNumber,
                m.lineRangeMapping.modified.endLineNumberExclusive,
                getLineChanges(m.changes),
            ]),
        };
    }
    static _modelsAreIdentical(original, modified) {
        const originalLineCount = original.getLineCount();
        const modifiedLineCount = modified.getLineCount();
        if (originalLineCount !== modifiedLineCount) {
            return false;
        }
        for (let line = 1; line <= originalLineCount; line++) {
            const originalLine = original.getLineContent(line);
            const modifiedLine = modified.getLineContent(line);
            if (originalLine !== modifiedLine) {
                return false;
            }
        }
        return true;
    }
    async $computeDirtyDiff(originalUrl, modifiedUrl, ignoreTrimWhitespace) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        if (!original || !modified) {
            return null;
        }
        const originalLines = original.getLinesContent();
        const modifiedLines = modified.getLinesContent();
        const diffComputer = new DiffComputer(originalLines, modifiedLines, {
            shouldComputeCharChanges: false,
            shouldPostProcessCharChanges: false,
            shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
            shouldMakePrettyDiff: true,
            maxComputationTime: 1000,
        });
        return diffComputer.computeDiff().changes;
    }
    // ---- END diff --------------------------------------------------------------------------
    // ---- BEGIN minimal edits ---------------------------------------------------------------
    static { this._diffLimit = 100000; }
    async $computeMoreMinimalEdits(modelUrl, edits, pretty) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return edits;
        }
        const result = [];
        let lastEol = undefined;
        edits = edits.slice(0).sort((a, b) => {
            if (a.range && b.range) {
                return Range.compareRangesUsingStarts(a.range, b.range);
            }
            // eol only changes should go to the end
            const aRng = a.range ? 0 : 1;
            const bRng = b.range ? 0 : 1;
            return aRng - bRng;
        });
        // merge adjacent edits
        let writeIndex = 0;
        for (let readIndex = 1; readIndex < edits.length; readIndex++) {
            if (Range.getEndPosition(edits[writeIndex].range).equals(Range.getStartPosition(edits[readIndex].range))) {
                edits[writeIndex].range = Range.fromPositions(Range.getStartPosition(edits[writeIndex].range), Range.getEndPosition(edits[readIndex].range));
                edits[writeIndex].text += edits[readIndex].text;
            }
            else {
                writeIndex++;
                edits[writeIndex] = edits[readIndex];
            }
        }
        edits.length = writeIndex + 1;
        for (let { range, text, eol } of edits) {
            if (typeof eol === 'number') {
                lastEol = eol;
            }
            if (Range.isEmpty(range) && !text) {
                // empty change
                continue;
            }
            const original = model.getValueInRange(range);
            text = text.replace(/\r\n|\n|\r/g, model.eol);
            if (original === text) {
                // noop
                continue;
            }
            // make sure diff won't take too long
            if (Math.max(text.length, original.length) > EditorWorker._diffLimit) {
                result.push({ range, text });
                continue;
            }
            // compute diff between original and edit.text
            const changes = stringDiff(original, text, pretty);
            const editOffset = model.offsetAt(Range.lift(range).getStartPosition());
            for (const change of changes) {
                const start = model.positionAt(editOffset + change.originalStart);
                const end = model.positionAt(editOffset + change.originalStart + change.originalLength);
                const newEdit = {
                    text: text.substr(change.modifiedStart, change.modifiedLength),
                    range: {
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                    },
                };
                if (model.getValueInRange(newEdit.range) !== newEdit.text) {
                    result.push(newEdit);
                }
            }
        }
        if (typeof lastEol === 'number') {
            result.push({
                eol: lastEol,
                text: '',
                range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 },
            });
        }
        return result;
    }
    $computeHumanReadableDiff(modelUrl, edits, options) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return edits;
        }
        const result = [];
        let lastEol = undefined;
        edits = edits.slice(0).sort((a, b) => {
            if (a.range && b.range) {
                return Range.compareRangesUsingStarts(a.range, b.range);
            }
            // eol only changes should go to the end
            const aRng = a.range ? 0 : 1;
            const bRng = b.range ? 0 : 1;
            return aRng - bRng;
        });
        for (let { range, text, eol } of edits) {
            if (typeof eol === 'number') {
                lastEol = eol;
            }
            if (Range.isEmpty(range) && !text) {
                // empty change
                continue;
            }
            const original = model.getValueInRange(range);
            text = text.replace(/\r\n|\n|\r/g, model.eol);
            if (original === text) {
                // noop
                continue;
            }
            // make sure diff won't take too long
            if (Math.max(text.length, original.length) > EditorWorker._diffLimit) {
                result.push({ range, text });
                continue;
            }
            // compute diff between original and edit.text
            const originalLines = original.split(/\r\n|\n|\r/);
            const modifiedLines = text.split(/\r\n|\n|\r/);
            const diff = linesDiffComputers
                .getDefault()
                .computeDiff(originalLines, modifiedLines, options);
            const start = Range.lift(range).getStartPosition();
            function addPositions(pos1, pos2) {
                return new Position(pos1.lineNumber + pos2.lineNumber - 1, pos2.lineNumber === 1 ? pos1.column + pos2.column - 1 : pos2.column);
            }
            function getText(lines, range) {
                const result = [];
                for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
                    const line = lines[i - 1];
                    if (i === range.startLineNumber && i === range.endLineNumber) {
                        result.push(line.substring(range.startColumn - 1, range.endColumn - 1));
                    }
                    else if (i === range.startLineNumber) {
                        result.push(line.substring(range.startColumn - 1));
                    }
                    else if (i === range.endLineNumber) {
                        result.push(line.substring(0, range.endColumn - 1));
                    }
                    else {
                        result.push(line);
                    }
                }
                return result;
            }
            for (const c of diff.changes) {
                if (c.innerChanges) {
                    for (const x of c.innerChanges) {
                        result.push({
                            range: Range.fromPositions(addPositions(start, x.originalRange.getStartPosition()), addPositions(start, x.originalRange.getEndPosition())),
                            text: getText(modifiedLines, x.modifiedRange).join(model.eol),
                        });
                    }
                }
                else {
                    throw new BugIndicatingError('The experimental diff algorithm always produces inner changes');
                }
            }
        }
        if (typeof lastEol === 'number') {
            result.push({
                eol: lastEol,
                text: '',
                range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 },
            });
        }
        return result;
    }
    // ---- END minimal edits ---------------------------------------------------------------
    async $computeLinks(modelUrl) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        return computeLinks(model);
    }
    // --- BEGIN default document colors -----------------------------------------------------------
    async $computeDefaultDocumentColors(modelUrl) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        return computeDefaultDocumentColors(model);
    }
    // ---- BEGIN suggest --------------------------------------------------------------------------
    static { this._suggestionsLimit = 10000; }
    async $textualSuggest(modelUrls, leadingWord, wordDef, wordDefFlags) {
        const sw = new StopWatch();
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        const seen = new Set();
        outer: for (const url of modelUrls) {
            const model = this._getModel(url);
            if (!model) {
                continue;
            }
            for (const word of model.words(wordDefRegExp)) {
                if (word === leadingWord || !isNaN(Number(word))) {
                    continue;
                }
                seen.add(word);
                if (seen.size > EditorWorker._suggestionsLimit) {
                    break outer;
                }
            }
        }
        return { words: Array.from(seen), duration: sw.elapsed() };
    }
    // ---- END suggest --------------------------------------------------------------------------
    //#region -- word ranges --
    async $computeWordRanges(modelUrl, range, wordDef, wordDefFlags) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return Object.create(null);
        }
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        const result = Object.create(null);
        for (let line = range.startLineNumber; line < range.endLineNumber; line++) {
            const words = model.getLineWords(line, wordDefRegExp);
            for (const word of words) {
                if (!isNaN(Number(word.word))) {
                    continue;
                }
                let array = result[word.word];
                if (!array) {
                    array = [];
                    result[word.word] = array;
                }
                array.push({
                    startLineNumber: line,
                    startColumn: word.startColumn,
                    endLineNumber: line,
                    endColumn: word.endColumn,
                });
            }
        }
        return result;
    }
    //#endregion
    async $navigateValueSet(modelUrl, range, up, wordDef, wordDefFlags) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        if (range.startColumn === range.endColumn) {
            range = {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.endColumn + 1,
            };
        }
        const selectionText = model.getValueInRange(range);
        const wordRange = model.getWordAtPosition({ lineNumber: range.startLineNumber, column: range.startColumn }, wordDefRegExp);
        if (!wordRange) {
            return null;
        }
        const word = model.getValueInRange(wordRange);
        const result = BasicInplaceReplace.INSTANCE.navigateValueSet(range, selectionText, wordRange, word, up);
        return result;
    }
    // ---- BEGIN foreign module support --------------------------------------------------------------------------
    // foreign method request
    $fmr(method, args) {
        if (!this._foreignModule || typeof this._foreignModule[method] !== 'function') {
            return Promise.reject(new Error('Missing requestHandler or method: ' + method));
        }
        try {
            return Promise.resolve(this._foreignModule[method].apply(this._foreignModule, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
}
if (typeof importScripts === 'function') {
    // Running in a web worker
    globalThis.monaco = createMonacoBaseAPI();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2ViV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9lZGl0b3JXZWJXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFJaEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBT3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sMkJBQTJCLEdBRTNCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBRzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWxFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVGLE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSx5QkFBeUIsQ0FBQTtBQUtoQyxPQUFPLEVBQWdCLHlCQUF5QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFrQy9GOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFPeEIsWUFBNkIsaUJBQTZCLElBQUk7UUFBakMsbUJBQWMsR0FBZCxjQUFjLENB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