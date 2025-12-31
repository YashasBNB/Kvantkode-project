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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q2hhbm5lbE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2NvbW1vbi9vdXRwdXRDaGFubmVsTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sWUFBWSxFQUNaLHFCQUFxQixHQUNyQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sVUFBVSxFQUNWLFlBQVksRUFFWixpQkFBaUIsRUFDakIsZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sY0FBYyxFQUNkLFdBQVcsRUFDWCxRQUFRLEdBQ1IsTUFBTSx3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