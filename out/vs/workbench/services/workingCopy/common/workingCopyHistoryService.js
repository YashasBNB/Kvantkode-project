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
var WorkingCopyHistoryService_1, NativeWorkingCopyHistoryService_1;
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { ILifecycleService, } from '../../lifecycle/common/lifecycle.js';
import { WorkingCopyHistoryTracker } from './workingCopyHistoryTracker.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MAX_PARALLEL_HISTORY_IO_OPS, } from './workingCopyHistory.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { URI } from '../../../../base/common/uri.js';
import { DeferredPromise, Limiter, RunOnceScheduler } from '../../../../base/common/async.js';
import { dirname, extname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { hash } from '../../../../base/common/hash.js';
import { indexOfPath, randomPath } from '../../../../base/common/extpath.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { distinct } from '../../../../base/common/arrays.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
export class WorkingCopyHistoryModel {
    static { this.ENTRIES_FILE = 'entries.json'; }
    static { this.FILE_SAVED_SOURCE = SaveSourceRegistry.registerSource('default.source', localize('default.source', 'File Saved')); }
    static { this.SETTINGS = {
        MAX_ENTRIES: 'workbench.localHistory.maxFileEntries',
        MERGE_PERIOD: 'workbench.localHistory.mergeWindow',
    }; }
    constructor(workingCopyResource, historyHome, entryAddedEmitter, entryChangedEmitter, entryReplacedEmitter, entryRemovedEmitter, options, fileService, labelService, logService, configurationService) {
        this.historyHome = historyHome;
        this.entryAddedEmitter = entryAddedEmitter;
        this.entryChangedEmitter = entryChangedEmitter;
        this.entryReplacedEmitter = entryReplacedEmitter;
        this.entryRemovedEmitter = entryRemovedEmitter;
        this.options = options;
        this.fileService = fileService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.entries = [];
        this.whenResolved = undefined;
        this.workingCopyResource = undefined;
        this.workingCopyName = undefined;
        this.historyEntriesFolder = undefined;
        this.historyEntriesListingFile = undefined;
        this.historyEntriesNameMatcher = undefined;
        this.versionId = 0;
        this.storedVersionId = this.versionId;
        this.storeLimiter = new Limiter(1);
        this.setWorkingCopy(workingCopyResource);
    }
    setWorkingCopy(workingCopyResource) {
        // Update working copy
        this.workingCopyResource = workingCopyResource;
        this.workingCopyName = this.labelService.getUriBasenameLabel(workingCopyResource);
        this.historyEntriesNameMatcher = new RegExp(`[A-Za-z0-9]{4}${escapeRegExpCharacters(extname(workingCopyResource))}`);
        // Update locations
        this.historyEntriesFolder = this.toHistoryEntriesFolder(this.historyHome, workingCopyResource);
        this.historyEntriesListingFile = joinPath(this.historyEntriesFolder, WorkingCopyHistoryModel.ENTRIES_FILE);
        // Reset entries and resolved cache
        this.entries = [];
        this.whenResolved = undefined;
    }
    toHistoryEntriesFolder(historyHome, workingCopyResource) {
        return joinPath(historyHome, hash(workingCopyResource.toString()).toString(16));
    }
    async addEntry(source = WorkingCopyHistoryModel.FILE_SAVED_SOURCE, sourceDescription = undefined, timestamp = Date.now(), token) {
        let entryToReplace = undefined;
        // Figure out if the last entry should be replaced based
        // on settings that can define a interval for when an
        // entry is not added as new entry but should replace.
        // However, when save source is different, never replace.
        const lastEntry = this.entries.at(-1);
        if (lastEntry && lastEntry.source === source) {
            const configuredReplaceInterval = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MERGE_PERIOD, { resource: this.workingCopyResource });
            if (timestamp - lastEntry.timestamp <=
                configuredReplaceInterval * 1000 /* convert to millies */) {
                entryToReplace = lastEntry;
            }
        }
        let entry;
        // Replace lastest entry in history
        if (entryToReplace) {
            entry = await this.doReplaceEntry(entryToReplace, source, sourceDescription, timestamp, token);
        }
        // Add entry to history
        else {
            entry = await this.doAddEntry(source, sourceDescription, timestamp, token);
        }
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return entry;
    }
    async doAddEntry(source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const workingCopyName = assertIsDefined(this.workingCopyName);
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        // Perform a fast clone operation with minimal overhead to a new random location
        const id = `${randomPath(undefined, undefined, 4)}${extname(workingCopyResource)}`;
        const location = joinPath(historyEntriesFolder, id);
        await this.fileService.cloneFile(workingCopyResource, location);
        // Add to list of entries
        const entry = {
            id,
            workingCopy: { resource: workingCopyResource, name: workingCopyName },
            location,
            timestamp,
            source,
            sourceDescription,
        };
        this.entries.push(entry);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryAddedEmitter.fire({ entry });
        return entry;
    }
    async doReplaceEntry(entry, source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        // Perform a fast clone operation with minimal overhead to the existing location
        await this.fileService.cloneFile(workingCopyResource, entry.location);
        // Update entry
        entry.source = source;
        entry.sourceDescription = sourceDescription;
        entry.timestamp = timestamp;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryReplacedEmitter.fire({ entry });
        return entry;
    }
    async removeEntry(entry, token) {
        // Make sure to await resolving when removing entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return false;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return false;
        }
        // Delete from disk
        await this.deleteEntry(entry);
        // Remove from model
        this.entries.splice(index, 1);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryRemovedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return true;
    }
    async updateEntry(entry, properties, token) {
        // Make sure to await resolving when updating entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return;
        }
        // Update entry
        entry.source = properties.source;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryChangedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
    }
    async getEntries() {
        // Make sure to await resolving when all entries are asked for
        await this.resolveEntriesOnce();
        // Return as many entries as configured by user settings
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length > configuredMaxEntries) {
            return this.entries.slice(this.entries.length - configuredMaxEntries);
        }
        return this.entries;
    }
    async hasEntries(skipResolve) {
        // Make sure to await resolving unless explicitly skipped
        if (!skipResolve) {
            await this.resolveEntriesOnce();
        }
        return this.entries.length > 0;
    }
    resolveEntriesOnce() {
        if (!this.whenResolved) {
            this.whenResolved = this.doResolveEntries();
        }
        return this.whenResolved;
    }
    async doResolveEntries() {
        // Resolve from disk
        const entries = await this.resolveEntriesFromDisk();
        // We now need to merge our in-memory entries with the
        // entries we have found on disk because it is possible
        // that new entries have been added before the entries
        // listing file was updated
        for (const entry of this.entries) {
            entries.set(entry.id, entry);
        }
        // Set as entries, sorted by timestamp
        this.entries = Array.from(entries.values()).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
    }
    async resolveEntriesFromDisk() {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const workingCopyName = assertIsDefined(this.workingCopyName);
        const [entryListing, entryStats] = await Promise.all([
            // Resolve entries listing file
            this.readEntriesFile(),
            // Resolve children of history folder
            this.readEntriesFolder(),
        ]);
        // Add from raw folder children
        const entries = new Map();
        if (entryStats) {
            for (const entryStat of entryStats) {
                entries.set(entryStat.name, {
                    id: entryStat.name,
                    workingCopy: { resource: workingCopyResource, name: workingCopyName },
                    location: entryStat.resource,
                    timestamp: entryStat.mtime,
                    source: WorkingCopyHistoryModel.FILE_SAVED_SOURCE,
                    sourceDescription: undefined,
                });
            }
        }
        // Update from listing (to have more specific metadata)
        if (entryListing) {
            for (const entry of entryListing.entries) {
                const existingEntry = entries.get(entry.id);
                if (existingEntry) {
                    entries.set(entry.id, {
                        ...existingEntry,
                        timestamp: entry.timestamp,
                        source: entry.source ?? existingEntry.source,
                        sourceDescription: entry.sourceDescription ?? existingEntry.sourceDescription,
                    });
                }
            }
        }
        return entries;
    }
    async moveEntries(target, source, token) {
        const timestamp = Date.now();
        const sourceDescription = this.labelService.getUriLabel(assertIsDefined(this.workingCopyResource));
        // Move all entries into the target folder so that we preserve
        // any existing history entries that might already be present
        const sourceHistoryEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        const targetHistoryEntriesFolder = assertIsDefined(target.historyEntriesFolder);
        try {
            for (const entry of this.entries) {
                await this.fileService.move(entry.location, joinPath(targetHistoryEntriesFolder, entry.id), true);
            }
            await this.fileService.del(sourceHistoryEntriesFolder, { recursive: true });
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                try {
                    // In case of an error (unless not found), fallback to moving the entire folder
                    await this.fileService.move(sourceHistoryEntriesFolder, targetHistoryEntriesFolder, true);
                }
                catch (error) {
                    if (!this.isFileNotFound(error)) {
                        this.traceError(error);
                    }
                }
            }
        }
        // Merge our entries with target entries before updating associated working copy
        const allEntries = distinct([...this.entries, ...target.entries], (entry) => entry.id).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
        // Update our associated working copy
        const targetWorkingCopyResource = assertIsDefined(target.workingCopyResource);
        this.setWorkingCopy(targetWorkingCopyResource);
        // Restore our entries and ensure correct metadata
        const targetWorkingCopyName = assertIsDefined(target.workingCopyName);
        for (const entry of allEntries) {
            this.entries.push({
                id: entry.id,
                location: joinPath(targetHistoryEntriesFolder, entry.id),
                source: entry.source,
                sourceDescription: entry.sourceDescription,
                timestamp: entry.timestamp,
                workingCopy: {
                    resource: targetWorkingCopyResource,
                    name: targetWorkingCopyName,
                },
            });
        }
        // Add entry for the move
        await this.addEntry(source, sourceDescription, timestamp, token);
        // Store model again to updated location
        await this.store(token);
    }
    async store(token) {
        if (!this.shouldStore()) {
            return;
        }
        // Use a `Limiter` to prevent multiple `store` operations
        // potentially running at the same time
        await this.storeLimiter.queue(async () => {
            if (token.isCancellationRequested || !this.shouldStore()) {
                return;
            }
            return this.doStore(token);
        });
    }
    shouldStore() {
        return this.storedVersionId !== this.versionId;
    }
    async doStore(token) {
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        // Make sure to await resolving when persisting
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Cleanup based on max-entries setting
        await this.cleanUpEntries();
        // Without entries, remove the history folder
        const storedVersion = this.versionId;
        if (this.entries.length === 0) {
            try {
                await this.fileService.del(historyEntriesFolder, { recursive: true });
            }
            catch (error) {
                this.traceError(error);
            }
        }
        // If we still have entries, update the entries meta file
        else {
            await this.writeEntriesFile();
        }
        // Mark as stored version
        this.storedVersionId = storedVersion;
    }
    async cleanUpEntries() {
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length <= configuredMaxEntries) {
            return; // nothing to cleanup
        }
        const entriesToDelete = this.entries.slice(0, this.entries.length - configuredMaxEntries);
        const entriesToKeep = this.entries.slice(this.entries.length - configuredMaxEntries);
        // Delete entries from disk as instructed
        for (const entryToDelete of entriesToDelete) {
            await this.deleteEntry(entryToDelete);
        }
        // Make sure to update our in-memory model as well
        // because it will be persisted right after
        this.entries = entriesToKeep;
        // Events
        for (const entry of entriesToDelete) {
            this.entryRemovedEmitter.fire({ entry });
        }
    }
    async deleteEntry(entry) {
        try {
            await this.fileService.del(entry.location);
        }
        catch (error) {
            this.traceError(error);
        }
    }
    async writeEntriesFile() {
        const workingCopyResource = assertIsDefined(this.workingCopyResource);
        const historyEntriesListingFile = assertIsDefined(this.historyEntriesListingFile);
        const serializedModel = {
            version: 1,
            resource: workingCopyResource.toString(),
            entries: this.entries.map((entry) => {
                return {
                    id: entry.id,
                    source: entry.source !== WorkingCopyHistoryModel.FILE_SAVED_SOURCE ? entry.source : undefined,
                    sourceDescription: entry.sourceDescription,
                    timestamp: entry.timestamp,
                };
            }),
        };
        await this.fileService.writeFile(historyEntriesListingFile, VSBuffer.fromString(JSON.stringify(serializedModel)));
    }
    async readEntriesFile() {
        const historyEntriesListingFile = assertIsDefined(this.historyEntriesListingFile);
        let serializedModel = undefined;
        try {
            serializedModel = JSON.parse((await this.fileService.readFile(historyEntriesListingFile)).value.toString());
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        return serializedModel;
    }
    async readEntriesFolder() {
        const historyEntriesFolder = assertIsDefined(this.historyEntriesFolder);
        const historyEntriesNameMatcher = assertIsDefined(this.historyEntriesNameMatcher);
        let rawEntries = undefined;
        // Resolve children of folder on disk
        try {
            rawEntries = (await this.fileService.resolve(historyEntriesFolder, { resolveMetadata: true }))
                .children;
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        if (!rawEntries) {
            return undefined;
        }
        // Skip entries that do not seem to have valid file name
        return rawEntries.filter((entry) => !isEqual(entry.resource, this.historyEntriesListingFile) && // not the listings file
            historyEntriesNameMatcher.test(entry.name));
    }
    isFileNotFound(error) {
        return (error instanceof FileOperationError &&
            error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */);
    }
    traceError(error) {
        this.logService.trace('[Working Copy History Service]', error);
    }
}
let WorkingCopyHistoryService = class WorkingCopyHistoryService extends Disposable {
    static { WorkingCopyHistoryService_1 = this; }
    static { this.FILE_MOVED_SOURCE = SaveSourceRegistry.registerSource('moved.source', localize('moved.source', 'File Moved')); }
    static { this.FILE_RENAMED_SOURCE = SaveSourceRegistry.registerSource('renamed.source', localize('renamed.source', 'File Renamed')); }
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService) {
        super();
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._onDidAddEntry = this._register(new Emitter());
        this.onDidAddEntry = this._onDidAddEntry.event;
        this._onDidChangeEntry = this._register(new Emitter());
        this.onDidChangeEntry = this._onDidChangeEntry.event;
        this._onDidReplaceEntry = this._register(new Emitter());
        this.onDidReplaceEntry = this._onDidReplaceEntry.event;
        this._onDidMoveEntries = this._register(new Emitter());
        this.onDidMoveEntries = this._onDidMoveEntries.event;
        this._onDidRemoveEntry = this._register(new Emitter());
        this.onDidRemoveEntry = this._onDidRemoveEntry.event;
        this._onDidRemoveEntries = this._register(new Emitter());
        this.onDidRemoveEntries = this._onDidRemoveEntries.event;
        this.localHistoryHome = new DeferredPromise();
        this.models = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.resolveLocalHistoryHome();
    }
    async resolveLocalHistoryHome() {
        let historyHome = undefined;
        // Prefer history to be stored in the remote if we are connected to a remote
        try {
            const remoteEnv = await this.remoteAgentService.getEnvironment();
            if (remoteEnv) {
                historyHome = remoteEnv.localHistoryHome;
            }
        }
        catch (error) {
            this.logService.trace(error); // ignore and fallback to local
        }
        // But fallback to local if there is no remote
        if (!historyHome) {
            historyHome = this.environmentService.localHistoryHome;
        }
        this.localHistoryHome.complete(historyHome);
    }
    async moveEntries(source, target) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        for (const [resource, model] of this.models) {
            if (!this.uriIdentityService.extUri.isEqualOrParent(resource, source)) {
                continue; // model does not match moved resource
            }
            // Determine new resulting target resource
            let targetResource;
            if (this.uriIdentityService.extUri.isEqual(source, resource)) {
                targetResource = target; // file got moved
            }
            else {
                const index = indexOfPath(resource.path, source.path);
                targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
            }
            // Figure out save source
            let saveSource;
            if (this.uriIdentityService.extUri.isEqual(dirname(resource), dirname(targetResource))) {
                saveSource = WorkingCopyHistoryService_1.FILE_RENAMED_SOURCE;
            }
            else {
                saveSource = WorkingCopyHistoryService_1.FILE_MOVED_SOURCE;
            }
            // Move entries to target queued
            promises.push(limiter.queue(() => this.doMoveEntries(model, saveSource, resource, targetResource)));
        }
        if (!promises.length) {
            return [];
        }
        // Await move operations
        const resources = await Promise.all(promises);
        // Events
        this._onDidMoveEntries.fire();
        return resources;
    }
    async doMoveEntries(source, saveSource, sourceWorkingCopyResource, targetWorkingCopyResource) {
        // Move to target via model
        const target = await this.getModel(targetWorkingCopyResource);
        await source.moveEntries(target, saveSource, CancellationToken.None);
        // Update model in our map
        this.models.delete(sourceWorkingCopyResource);
        this.models.set(targetWorkingCopyResource, source);
        return targetWorkingCopyResource;
    }
    async addEntry({ resource, source, timestamp }, token) {
        if (!this.fileService.hasProvider(resource)) {
            return undefined; // we require the working copy resource to be file service accessible
        }
        // Resolve history model for working copy
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Add to model
        return model.addEntry(source, undefined, timestamp, token);
    }
    async updateEntry(entry, properties, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return;
        }
        // Rename in model
        return model.updateEntry(entry, properties, token);
    }
    async removeEntry(entry, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return false;
        }
        // Remove from model
        return model.removeEntry(entry, token);
    }
    async removeAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return;
        }
        // Clear models
        this.models.clear();
        // Remove from disk
        await this.fileService.del(historyHome, { recursive: true });
        // Events
        this._onDidRemoveEntries.fire();
    }
    async getEntries(resource, token) {
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return [];
        }
        const entries = await model.getEntries();
        return entries ?? [];
    }
    async getAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return [];
        }
        const all = new ResourceMap();
        // Fill in all known model resources (they might not have yet persisted to disk)
        for (const [resource, model] of this.models) {
            const hasInMemoryEntries = await model.hasEntries(true /* skip resolving because we resolve below from disk */);
            if (hasInMemoryEntries) {
                all.set(resource, true);
            }
        }
        // Resolve all other resources by iterating the history home folder
        try {
            const resolvedHistoryHome = await this.fileService.resolve(historyHome);
            if (resolvedHistoryHome.children) {
                const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
                const promises = [];
                for (const child of resolvedHistoryHome.children) {
                    promises.push(limiter.queue(async () => {
                        if (token.isCancellationRequested) {
                            return;
                        }
                        try {
                            const serializedModel = JSON.parse((await this.fileService.readFile(joinPath(child.resource, WorkingCopyHistoryModel.ENTRIES_FILE))).value.toString());
                            if (serializedModel.entries.length > 0) {
                                all.set(URI.parse(serializedModel.resource), true);
                            }
                        }
                        catch (error) {
                            // ignore - model might be missing or corrupt, but we need it
                        }
                    }));
                }
                await Promise.all(promises);
            }
        }
        catch (error) {
            // ignore - history might be entirely empty
        }
        return Array.from(all.keys());
    }
    async getModel(resource) {
        const historyHome = await this.localHistoryHome.p;
        let model = this.models.get(resource);
        if (!model) {
            model = new WorkingCopyHistoryModel(resource, historyHome, this._onDidAddEntry, this._onDidChangeEntry, this._onDidReplaceEntry, this._onDidRemoveEntry, this.getModelOptions(), this.fileService, this.labelService, this.logService, this.configurationService);
            this.models.set(resource, model);
        }
        return model;
    }
};
WorkingCopyHistoryService = WorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], WorkingCopyHistoryService);
export { WorkingCopyHistoryService };
let NativeWorkingCopyHistoryService = class NativeWorkingCopyHistoryService extends WorkingCopyHistoryService {
    static { NativeWorkingCopyHistoryService_1 = this; }
    static { this.STORE_ALL_INTERVAL = 5 * 60 * 1000; } // 5min
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, lifecycleService, logService, configurationService) {
        super(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService);
        this.lifecycleService = lifecycleService;
        this.isRemotelyStored = typeof this.environmentService.remoteAuthority === 'string';
        this.storeAllCts = this._register(new CancellationTokenSource());
        this.storeAllScheduler = this._register(new RunOnceScheduler(() => this.storeAll(this.storeAllCts.token), NativeWorkingCopyHistoryService_1.STORE_ALL_INTERVAL));
        this.registerListeners();
    }
    registerListeners() {
        if (!this.isRemotelyStored) {
            // Local: persist all on shutdown
            this._register(this.lifecycleService.onWillShutdown((e) => this.onWillShutdown(e)));
            // Local: schedule persist on change
            this._register(Event.any(this.onDidAddEntry, this.onDidChangeEntry, this.onDidReplaceEntry, this.onDidRemoveEntry)(() => this.onDidChangeModels()));
        }
    }
    getModelOptions() {
        return { flushOnChange: this.isRemotelyStored /* because the connection might drop anytime */ };
    }
    onWillShutdown(e) {
        // Dispose the scheduler...
        this.storeAllScheduler.dispose();
        this.storeAllCts.dispose(true);
        // ...because we now explicitly store all models
        e.join(this.storeAll(e.token), {
            id: 'join.workingCopyHistory',
            label: localize('join.workingCopyHistory', 'Saving local history'),
        });
    }
    onDidChangeModels() {
        if (!this.storeAllScheduler.isScheduled()) {
            this.storeAllScheduler.schedule();
        }
    }
    async storeAll(token) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        const models = Array.from(this.models.values());
        for (const model of models) {
            promises.push(limiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                try {
                    await model.store(token);
                }
                catch (error) {
                    this.logService.trace(error);
                }
            }));
        }
        await Promise.all(promises);
    }
};
NativeWorkingCopyHistoryService = NativeWorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILifecycleService),
    __param(6, ILogService),
    __param(7, IConfigurationService)
], NativeWorkingCopyHistoryService);
export { NativeWorkingCopyHistoryService };
// Register History Tracker
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkingCopyHistoryTracker, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUtOLDJCQUEyQixHQUMzQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsWUFBWSxHQUVaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFP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