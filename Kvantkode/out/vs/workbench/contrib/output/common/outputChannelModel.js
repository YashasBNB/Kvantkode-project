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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as resources from '../../../../base/common/resources.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Promises, ThrottledDelayer } from '../../../../base/common/async.js';
import { IFileService, toFileOperationResult, } from '../../../../platform/files/common/files.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Disposable, toDisposable, MutableDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { isNumber } from '../../../../base/common/types.js';
import { EditOperation, } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILoggerService, ILogService, LogLevel, } from '../../../../platform/log/common/log.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { LOG_MIME, OutputChannelUpdateMode, } from '../../../services/output/common/output.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { TextModel } from '../../../../editor/common/model/textModel.js';
import { binarySearch, sortedDiff } from '../../../../base/common/arrays.js';
const LOG_ENTRY_REGEX = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s(\[(info|trace|debug|error|warning)\])\s(\[(.*?)\])?/;
export function parseLogEntryAt(model, lineNumber) {
    const lineContent = model.getLineContent(lineNumber);
    const match = LOG_ENTRY_REGEX.exec(lineContent);
    if (match) {
        const timestamp = new Date(match[1]).getTime();
        const timestampRange = new Range(lineNumber, 1, lineNumber, match[1].length);
        const logLevel = parseLogLevel(match[3]);
        const logLevelRange = new Range(lineNumber, timestampRange.endColumn + 1, lineNumber, timestampRange.endColumn + 1 + match[2].length);
        const category = match[5];
        const startLine = lineNumber;
        let endLine = lineNumber;
        const lineCount = model.getLineCount();
        while (endLine < lineCount) {
            const nextLineContent = model.getLineContent(endLine + 1);
            const isLastLine = endLine + 1 === lineCount && nextLineContent === ''; // Last line will be always empty
            if (LOG_ENTRY_REGEX.test(nextLineContent) || isLastLine) {
                break;
            }
            endLine++;
        }
        const range = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return { range, timestamp, timestampRange, logLevel, logLevelRange, category };
    }
    return null;
}
function* logEntryIterator(model, process) {
    for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
        const logEntry = parseLogEntryAt(model, lineNumber);
        if (logEntry) {
            yield process(logEntry);
            lineNumber = logEntry.range.endLineNumber;
        }
    }
}
function changeStartLineNumber(logEntry, lineNumber) {
    return {
        ...logEntry,
        range: new Range(lineNumber, logEntry.range.startColumn, lineNumber + logEntry.range.endLineNumber - logEntry.range.startLineNumber, logEntry.range.endColumn),
        timestampRange: new Range(lineNumber, logEntry.timestampRange.startColumn, lineNumber, logEntry.timestampRange.endColumn),
        logLevelRange: new Range(lineNumber, logEntry.logLevelRange.startColumn, lineNumber, logEntry.logLevelRange.endColumn),
    };
}
function parseLogLevel(level) {
    switch (level.toLowerCase()) {
        case 'trace':
            return LogLevel.Trace;
        case 'debug':
            return LogLevel.Debug;
        case 'info':
            return LogLevel.Info;
        case 'warning':
            return LogLevel.Warning;
        case 'error':
            return LogLevel.Error;
        default:
            throw new Error(`Unknown log level: ${level}`);
    }
}
let FileContentProvider = class FileContentProvider extends Disposable {
    constructor({ name, resource }, fileService, instantiationService, logService) {
        super();
        this.fileService = fileService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this._onDidAppend = new Emitter();
        this.onDidAppend = this._onDidAppend.event;
        this._onDidReset = new Emitter();
        this.onDidReset = this._onDidReset.event;
        this.watching = false;
        this.etag = '';
        this.logEntries = [];
        this.startOffset = 0;
        this.endOffset = 0;
        this.name = name ?? '';
        this.resource = resource;
        this.syncDelayer = new ThrottledDelayer(500);
        this._register(toDisposable(() => this.unwatch()));
    }
    reset(offset) {
        this.endOffset = this.startOffset = offset ?? this.startOffset;
        this.logEntries = [];
    }
    resetToEnd() {
        this.startOffset = this.endOffset;
        this.logEntries = [];
    }
    watch() {
        if (!this.watching) {
            this.logService.trace('Started polling', this.resource.toString());
            this.poll();
            this.watching = true;
        }
    }
    unwatch() {
        if (this.watching) {
            this.syncDelayer.cancel();
            this.watching = false;
            this.logService.trace('Stopped polling', this.resource.toString());
        }
    }
    poll() {
        const loop = () => this.doWatch().then(() => this.poll());
        this.syncDelayer.trigger(loop).catch((error) => {
            if (!isCancellationError(error)) {
                throw error;
            }
        });
    }
    async doWatch() {
        try {
            if (!this.fileService.hasProvider(this.resource)) {
                return;
            }
            const stat = await this.fileService.stat(this.resource);
            if (stat.etag !== this.etag) {
                this.etag = stat.etag;
                if (isNumber(stat.size) && this.endOffset > stat.size) {
                    this.reset(0);
                    this._onDidReset.fire();
                }
                else {
                    this._onDidAppend.fire();
                }
            }
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
        }
    }
    getLogEntries() {
        return this.logEntries;
    }
    async getContent(donotConsumeLogEntries) {
        try {
            if (!this.fileService.hasProvider(this.resource)) {
                return {
                    name: this.name,
                    content: '',
                    consume: () => {
                        /* No Op */
                    },
                };
            }
            const fileContent = await this.fileService.readFile(this.resource, {
                position: this.endOffset,
            });
            const content = fileContent.value.toString();
            const logEntries = donotConsumeLogEntries
                ? []
                : this.parseLogEntries(content, this.logEntries[this.logEntries.length - 1]);
            let consumed = false;
            return {
                name: this.name,
                content,
                consume: () => {
                    if (!consumed) {
                        consumed = true;
                        this.endOffset += fileContent.value.byteLength;
                        this.etag = fileContent.etag;
                        this.logEntries.push(...logEntries);
                    }
                },
            };
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
            return {
                name: this.name,
                content: '',
                consume: () => {
                    /* No Op */
                },
            };
        }
    }
    parseLogEntries(content, lastLogEntry) {
        const model = this.instantiationService.createInstance(TextModel, content, LOG_MIME, TextModel.DEFAULT_CREATION_OPTIONS, null);
        try {
            if (!parseLogEntryAt(model, 1)) {
                return [];
            }
            const logEntries = [];
            let logEntryStartLineNumber = lastLogEntry ? lastLogEntry.range.endLineNumber + 1 : 1;
            for (const entry of logEntryIterator(model, (e) => changeStartLineNumber(e, logEntryStartLineNumber))) {
                logEntries.push(entry);
                logEntryStartLineNumber = entry.range.endLineNumber + 1;
            }
            return logEntries;
        }
        finally {
            model.dispose();
        }
    }
};
FileContentProvider = __decorate([
    __param(1, IFileService),
    __param(2, IInstantiationService),
    __param(3, ILogService)
], FileContentProvider);
let MultiFileContentProvider = class MultiFileContentProvider extends Disposable {
    constructor(filesInfos, instantiationService, fileService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.logService = logService;
        this._onDidAppend = this._register(new Emitter());
        this.onDidAppend = this._onDidAppend.event;
        this.onDidReset = Event.None;
        this.logEntries = [];
        this.fileContentProviderItems = [];
        this.watching = false;
        for (const file of filesInfos) {
            this.fileContentProviderItems.push(this.createFileContentProvider(file));
        }
        this._register(toDisposable(() => {
            for (const [, disposables] of this.fileContentProviderItems) {
                disposables.dispose();
            }
        }));
    }
    createFileContentProvider(file) {
        const disposables = new DisposableStore();
        const fileOutput = disposables.add(new FileContentProvider(file, this.fileService, this.instantiationService, this.logService));
        disposables.add(fileOutput.onDidAppend(() => this._onDidAppend.fire()));
        return [fileOutput, disposables];
    }
    watch() {
        if (!this.watching) {
            this.watching = true;
            for (const [output] of this.fileContentProviderItems) {
                output.watch();
            }
        }
    }
    unwatch() {
        if (this.watching) {
            this.watching = false;
            for (const [output] of this.fileContentProviderItems) {
                output.unwatch();
            }
        }
    }
    updateFiles(files) {
        const wasWatching = this.watching;
        if (wasWatching) {
            this.unwatch();
        }
        const result = sortedDiff(this.fileContentProviderItems.map(([output]) => output), files, (a, b) => resources.extUri.compare(a.resource, b.resource));
        for (const { start, deleteCount, toInsert } of result) {
            const outputs = toInsert.map((file) => this.createFileContentProvider(file));
            const outputsToRemove = this.fileContentProviderItems.splice(start, deleteCount, ...outputs);
            for (const [, disposables] of outputsToRemove) {
                disposables.dispose();
            }
        }
        if (wasWatching) {
            this.watch();
        }
    }
    reset() {
        for (const [output] of this.fileContentProviderItems) {
            output.reset();
        }
        this.logEntries = [];
    }
    resetToEnd() {
        for (const [output] of this.fileContentProviderItems) {
            output.resetToEnd();
        }
        this.logEntries = [];
    }
    getLogEntries() {
        return this.logEntries;
    }
    async getContent() {
        const outputs = await Promise.all(this.fileContentProviderItems.map(([output]) => output.getContent(true)));
        const { content, logEntries } = this.combineLogEntries(outputs, this.logEntries[this.logEntries.length - 1]);
        let consumed = false;
        return {
            content,
            consume: () => {
                if (!consumed) {
                    consumed = true;
                    outputs.forEach(({ consume }) => consume());
                    this.logEntries.push(...logEntries);
                }
            },
        };
    }
    combineLogEntries(outputs, lastEntry) {
        outputs = outputs.filter((output) => !!output.content);
        if (outputs.length === 0) {
            return { logEntries: [], content: '' };
        }
        const logEntries = [];
        const contents = [];
        const process = (model, logEntry, name) => {
            const lineContent = model.getValueInRange(logEntry.range);
            const content = name
                ? `${lineContent.substring(0, logEntry.logLevelRange.endColumn)} [${name}]${lineContent.substring(logEntry.logLevelRange.endColumn)}`
                : lineContent;
            return [
                {
                    ...logEntry,
                    category: name,
                    range: new Range(logEntry.range.startLineNumber, logEntry.logLevelRange.startColumn, logEntry.range.endLineNumber, name ? logEntry.range.endColumn + name.length + 3 : logEntry.range.endColumn),
                },
                content,
            ];
        };
        const model = this.instantiationService.createInstance(TextModel, outputs[0].content, LOG_MIME, TextModel.DEFAULT_CREATION_OPTIONS, null);
        try {
            for (const [logEntry, content] of logEntryIterator(model, (e) => process(model, e, outputs[0].name))) {
                logEntries.push(logEntry);
                contents.push(content);
            }
        }
        finally {
            model.dispose();
        }
        for (let index = 1; index < outputs.length; index++) {
            const { content, name } = outputs[index];
            const model = this.instantiationService.createInstance(TextModel, content, LOG_MIME, TextModel.DEFAULT_CREATION_OPTIONS, null);
            try {
                const iterator = logEntryIterator(model, (e) => process(model, e, name));
                let next = iterator.next();
                while (!next.done) {
                    const [logEntry, content] = next.value;
                    const logEntriesToAdd = [logEntry];
                    const contentsToAdd = [content];
                    let insertionIndex;
                    // If the timestamp is greater than or equal to the last timestamp,
                    // we can just append all the entries at the end
                    if (logEntry.timestamp >= logEntries[logEntries.length - 1].timestamp) {
                        insertionIndex = logEntries.length;
                        for (next = iterator.next(); !next.done; next = iterator.next()) {
                            logEntriesToAdd.push(next.value[0]);
                            contentsToAdd.push(next.value[1]);
                        }
                    }
                    else {
                        if (logEntry.timestamp <= logEntries[0].timestamp) {
                            // If the timestamp is less than or equal to the first timestamp
                            // then insert at the beginning
                            insertionIndex = 0;
                        }
                        else {
                            // Otherwise, find the insertion index
                            const idx = binarySearch(logEntries, logEntry, (a, b) => a.timestamp - b.timestamp);
                            insertionIndex = idx < 0 ? ~idx : idx;
                        }
                        // Collect all entries that have a timestamp less than or equal to the timestamp at the insertion index
                        for (next = iterator.next(); !next.done && next.value[0].timestamp <= logEntries[insertionIndex].timestamp; next = iterator.next()) {
                            logEntriesToAdd.push(next.value[0]);
                            contentsToAdd.push(next.value[1]);
                        }
                    }
                    contents.splice(insertionIndex, 0, ...contentsToAdd);
                    logEntries.splice(insertionIndex, 0, ...logEntriesToAdd);
                }
            }
            finally {
                model.dispose();
            }
        }
        let content = '';
        const updatedLogEntries = [];
        let logEntryStartLineNumber = lastEntry ? lastEntry.range.endLineNumber + 1 : 1;
        for (let i = 0; i < logEntries.length; i++) {
            content += contents[i] + '\n';
            const updatedLogEntry = changeStartLineNumber(logEntries[i], logEntryStartLineNumber);
            updatedLogEntries.push(updatedLogEntry);
            logEntryStartLineNumber = updatedLogEntry.range.endLineNumber + 1;
        }
        return { logEntries: updatedLogEntries, content };
    }
};
MultiFileContentProvider = __decorate([
    __param(1, IInstantiationService),
    __param(2, IFileService),
    __param(3, ILogService)
], MultiFileContentProvider);
let AbstractFileOutputChannelModel = class AbstractFileOutputChannelModel extends Disposable {
    constructor(modelUri, language, outputContentProvider, modelService, editorWorkerService) {
        super();
        this.modelUri = modelUri;
        this.language = language;
        this.outputContentProvider = outputContentProvider;
        this.modelService = modelService;
        this.editorWorkerService = editorWorkerService;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this.loadModelPromise = null;
        this.modelDisposable = this._register(new MutableDisposable());
        this.model = null;
        this.modelUpdateInProgress = false;
        this.modelUpdateCancellationSource = this._register(new MutableDisposable());
        this.appendThrottler = this._register(new ThrottledDelayer(300));
    }
    async loadModel() {
        this.loadModelPromise = Promises.withAsyncBody(async (c, e) => {
            try {
                this.modelDisposable.value = new DisposableStore();
                this.model = this.modelService.createModel('', this.language, this.modelUri);
                const { content, consume } = await this.outputContentProvider.getContent();
                consume();
                this.doAppendContent(this.model, content);
                this.modelDisposable.value.add(this.outputContentProvider.onDidReset(() => this.onDidContentChange(true, true)));
                this.modelDisposable.value.add(this.outputContentProvider.onDidAppend(() => this.onDidContentChange(false, false)));
                this.outputContentProvider.watch();
                this.modelDisposable.value.add(toDisposable(() => this.outputContentProvider.unwatch()));
                this.modelDisposable.value.add(this.model.onWillDispose(() => {
                    this.outputContentProvider.reset();
                    this.modelDisposable.value = undefined;
                    this.cancelModelUpdate();
                    this.model = null;
                }));
                c(this.model);
            }
            catch (error) {
                e(error);
            }
        });
        return this.loadModelPromise;
    }
    getLogEntries() {
        return this.outputContentProvider.getLogEntries();
    }
    onDidContentChange(reset, appendImmediately) {
        if (reset && !this.modelUpdateInProgress) {
            this.doUpdate(OutputChannelUpdateMode.Clear, true);
        }
        this.doUpdate(OutputChannelUpdateMode.Append, appendImmediately);
    }
    doUpdate(mode, immediate) {
        if (mode === OutputChannelUpdateMode.Clear || mode === OutputChannelUpdateMode.Replace) {
            this.cancelModelUpdate();
        }
        if (!this.model) {
            return;
        }
        this.modelUpdateInProgress = true;
        if (!this.modelUpdateCancellationSource.value) {
            this.modelUpdateCancellationSource.value = new CancellationTokenSource();
        }
        const token = this.modelUpdateCancellationSource.value.token;
        if (mode === OutputChannelUpdateMode.Clear) {
            this.clearContent(this.model);
        }
        else if (mode === OutputChannelUpdateMode.Replace) {
            this.replacePromise = this.replaceContent(this.model, token).finally(() => (this.replacePromise = undefined));
        }
        else {
            this.appendContent(this.model, immediate, token);
        }
    }
    clearContent(model) {
        model.applyEdits([EditOperation.delete(model.getFullModelRange())]);
        this.modelUpdateInProgress = false;
    }
    appendContent(model, immediate, token) {
        this.appendThrottler
            .trigger(async () => {
            /* Abort if operation is cancelled */
            if (token.isCancellationRequested) {
                return;
            }
            /* Wait for replace to finish */
            if (this.replacePromise) {
                try {
                    await this.replacePromise;
                }
                catch (e) {
                    /* Ignore */
                }
                /* Abort if operation is cancelled */
                if (token.isCancellationRequested) {
                    return;
                }
            }
            /* Get content to append */
            const { content, consume } = await this.outputContentProvider.getContent();
            /* Abort if operation is cancelled */
            if (token.isCancellationRequested) {
                return;
            }
            /* Appned Content */
            consume();
            this.doAppendContent(model, content);
            this.modelUpdateInProgress = false;
        }, immediate ? 0 : undefined)
            .catch((error) => {
            if (!isCancellationError(error)) {
                throw error;
            }
        });
    }
    doAppendContent(model, content) {
        const lastLine = model.getLineCount();
        const lastLineMaxColumn = model.getLineMaxColumn(lastLine);
        model.applyEdits([EditOperation.insert(new Position(lastLine, lastLineMaxColumn), content)]);
    }
    async replaceContent(model, token) {
        /* Get content to replace */
        const { content, consume } = await this.outputContentProvider.getContent();
        /* Abort if operation is cancelled */
        if (token.isCancellationRequested) {
            return;
        }
        /* Compute Edits */
        const edits = await this.getReplaceEdits(model, content.toString());
        /* Abort if operation is cancelled */
        if (token.isCancellationRequested) {
            return;
        }
        consume();
        if (edits.length) {
            /* Apply Edits */
            model.applyEdits(edits);
        }
        this.modelUpdateInProgress = false;
    }
    async getReplaceEdits(model, contentToReplace) {
        if (!contentToReplace) {
            return [EditOperation.delete(model.getFullModelRange())];
        }
        if (contentToReplace !== model.getValue()) {
            const edits = await this.editorWorkerService.computeMoreMinimalEdits(model.uri, [
                { text: contentToReplace.toString(), range: model.getFullModelRange() },
            ]);
            if (edits?.length) {
                return edits.map((edit) => EditOperation.replace(Range.lift(edit.range), edit.text));
            }
        }
        return [];
    }
    cancelModelUpdate() {
        this.modelUpdateCancellationSource.value?.cancel();
        this.modelUpdateCancellationSource.value = undefined;
        this.appendThrottler.cancel();
        this.replacePromise = undefined;
        this.modelUpdateInProgress = false;
    }
    isVisible() {
        return !!this.model;
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
    append(message) {
        throw new Error('Not supported');
    }
    replace(message) {
        throw new Error('Not supported');
    }
};
AbstractFileOutputChannelModel = __decorate([
    __param(3, IModelService),
    __param(4, IEditorWorkerService)
], AbstractFileOutputChannelModel);
export { AbstractFileOutputChannelModel };
let FileOutputChannelModel = class FileOutputChannelModel extends AbstractFileOutputChannelModel {
    constructor(modelUri, language, source, fileService, modelService, instantiationService, logService, editorWorkerService) {
        const fileOutput = new FileContentProvider(source, fileService, instantiationService, logService);
        super(modelUri, language, fileOutput, modelService, editorWorkerService);
        this.source = source;
        this.fileOutput = this._register(fileOutput);
    }
    clear() {
        this.update(OutputChannelUpdateMode.Clear, undefined, true);
    }
    update(mode, till, immediate) {
        const loadModelPromise = this.loadModelPromise
            ? this.loadModelPromise
            : Promise.resolve();
        loadModelPromise.then(() => {
            if (mode === OutputChannelUpdateMode.Clear || mode === OutputChannelUpdateMode.Replace) {
                if (isNumber(till)) {
                    this.fileOutput.reset(till);
                }
                else {
                    this.fileOutput.resetToEnd();
                }
            }
            this.doUpdate(mode, immediate);
        });
    }
    updateChannelSources(files) {
        throw new Error('Not supported');
    }
};
FileOutputChannelModel = __decorate([
    __param(3, IFileService),
    __param(4, IModelService),
    __param(5, IInstantiationService),
    __param(6, ILogService),
    __param(7, IEditorWorkerService)
], FileOutputChannelModel);
export { FileOutputChannelModel };
let MultiFileOutputChannelModel = class MultiFileOutputChannelModel extends AbstractFileOutputChannelModel {
    constructor(modelUri, language, source, fileService, modelService, logService, editorWorkerService, instantiationService) {
        const multifileOutput = new MultiFileContentProvider(source, instantiationService, fileService, logService);
        super(modelUri, language, multifileOutput, modelService, editorWorkerService);
        this.source = source;
        this.multifileOutput = this._register(multifileOutput);
    }
    updateChannelSources(files) {
        this.multifileOutput.unwatch();
        this.multifileOutput.updateFiles(files);
        this.multifileOutput.reset();
        this.doUpdate(OutputChannelUpdateMode.Replace, true);
        if (this.isVisible()) {
            this.multifileOutput.watch();
        }
    }
    clear() {
        const loadModelPromise = this.loadModelPromise
            ? this.loadModelPromise
            : Promise.resolve();
        loadModelPromise.then(() => {
            this.multifileOutput.resetToEnd();
            this.doUpdate(OutputChannelUpdateMode.Clear, true);
        });
    }
    update(mode, till, immediate) {
        throw new Error('Not supported');
    }
};
MultiFileOutputChannelModel = __decorate([
    __param(3, IFileService),
    __param(4, IModelService),
    __param(5, ILogService),
    __param(6, IEditorWorkerService),
    __param(7, IInstantiationService)
], MultiFileOutputChannelModel);
export { MultiFileOutputChannelModel };
let OutputChannelBackedByFile = class OutputChannelBackedByFile extends FileOutputChannelModel {
    constructor(id, modelUri, language, file, fileService, modelService, loggerService, instantiationService, logService, editorWorkerService) {
        super(modelUri, language, { resource: file, name: '' }, fileService, modelService, instantiationService, logService, editorWorkerService);
        // Donot rotate to check for the file reset
        this.logger = loggerService.createLogger(file, {
            logLevel: 'always',
            donotRotate: true,
            donotUseFormatters: true,
            hidden: true,
        });
        this._offset = 0;
    }
    append(message) {
        this.write(message);
        this.update(OutputChannelUpdateMode.Append, undefined, this.isVisible());
    }
    replace(message) {
        const till = this._offset;
        this.write(message);
        this.update(OutputChannelUpdateMode.Replace, till, true);
    }
    write(content) {
        this._offset += VSBuffer.fromString(content).byteLength;
        this.logger.info(content);
        if (this.isVisible()) {
            this.logger.flush();
        }
    }
};
OutputChannelBackedByFile = __decorate([
    __param(4, IFileService),
    __param(5, IModelService),
    __param(6, ILoggerService),
    __param(7, IInstantiationService),
    __param(8, ILogService),
    __param(9, IEditorWorkerService)
], OutputChannelBackedByFile);
let DelegatedOutputChannelModel = class DelegatedOutputChannelModel extends Disposable {
    constructor(id, modelUri, language, outputDir, outputDirCreationPromise, instantiationService, fileService) {
        super();
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this.outputChannelModel = this.createOutputChannelModel(id, modelUri, language, outputDir, outputDirCreationPromise);
        const resource = resources.joinPath(outputDir, `${id.replace(/[\\/:\*\?"<>\|]/g, '')}.log`);
        this.source = { resource };
    }
    async createOutputChannelModel(id, modelUri, language, outputDir, outputDirPromise) {
        await outputDirPromise;
        const file = resources.joinPath(outputDir, `${id.replace(/[\\/:\*\?"<>\|]/g, '')}.log`);
        await this.fileService.createFile(file);
        const outputChannelModel = this._register(this.instantiationService.createInstance(OutputChannelBackedByFile, id, modelUri, language, file));
        this._register(outputChannelModel.onDispose(() => this._onDispose.fire()));
        return outputChannelModel;
    }
    getLogEntries() {
        return [];
    }
    append(output) {
        this.outputChannelModel.then((outputChannelModel) => outputChannelModel.append(output));
    }
    update(mode, till, immediate) {
        this.outputChannelModel.then((outputChannelModel) => outputChannelModel.update(mode, till, immediate));
    }
    loadModel() {
        return this.outputChannelModel.then((outputChannelModel) => outputChannelModel.loadModel());
    }
    clear() {
        this.outputChannelModel.then((outputChannelModel) => outputChannelModel.clear());
    }
    replace(value) {
        this.outputChannelModel.then((outputChannelModel) => outputChannelModel.replace(value));
    }
    updateChannelSources(files) {
        this.outputChannelModel.then((outputChannelModel) => outputChannelModel.updateChannelSources(files));
    }
};
DelegatedOutputChannelModel = __decorate([
    __param(5, IInstantiationService),
    __param(6, IFileService)
], DelegatedOutputChannelModel);
export { DelegatedOutputChannelModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q2hhbm5lbE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvY29tbW9uL291dHB1dENoYW5uZWxNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdFLE9BQU8sRUFFTixZQUFZLEVBQ1oscUJBQXFCLEdBQ3JCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTNFLE9BQU8sRUFDTixVQUFVLEVBQ1YsWUFBWSxFQUVaLGlCQUFpQixFQUNqQixlQUFlLEdBQ2YsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUNOLGFBQWEsR0FFYixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FB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