/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from '../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import * as glob from '../../../../base/common/glob.js';
import * as resources from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { QueryGlobTester, resolvePatternsForProvider, hasSiblingFn, excludeToGlobPattern, DEFAULT_MAX_SEARCH_RESULTS, } from './search.js';
import { OldFileSearchProviderConverter } from './searchExtConversionTypes.js';
import { FolderQuerySearchTree } from './folderQuerySearchTree.js';
class FileSearchEngine {
    constructor(config, provider, sessionLifecycle) {
        this.config = config;
        this.provider = provider;
        this.sessionLifecycle = sessionLifecycle;
        this.isLimitHit = false;
        this.resultCount = 0;
        this.isCanceled = false;
        this.filePattern = config.filePattern;
        this.includePattern = config.includePattern && glob.parse(config.includePattern);
        this.maxResults = config.maxResults || undefined;
        this.exists = config.exists;
        this.activeCancellationTokens = new Set();
        this.globalExcludePattern = config.excludePattern && glob.parse(config.excludePattern);
    }
    cancel() {
        this.isCanceled = true;
        this.activeCancellationTokens.forEach((t) => t.cancel());
        this.activeCancellationTokens = new Set();
    }
    search(_onResult) {
        const folderQueries = this.config.folderQueries || [];
        return new Promise((resolve, reject) => {
            const onResult = (match) => {
                this.resultCount++;
                _onResult(match);
            };
            // Support that the file pattern is a full path to a file that exists
            if (this.isCanceled) {
                return resolve({ limitHit: this.isLimitHit });
            }
            // For each extra file
            if (this.config.extraFileResources) {
                this.config.extraFileResources.forEach((extraFile) => {
                    const extraFileStr = extraFile.toString(); // ?
                    const basename = path.basename(extraFileStr);
                    if (this.globalExcludePattern && this.globalExcludePattern(extraFileStr, basename)) {
                        return; // excluded
                    }
                    // File: Check for match on file pattern and include pattern
                    this.matchFile(onResult, { base: extraFile, basename });
                });
            }
            // For each root folder'
            // NEW: can just call with an array of folder info
            this.doSearch(folderQueries, onResult).then((stats) => {
                resolve({
                    limitHit: this.isLimitHit,
                    stats: stats || undefined, // Only looking at single-folder workspace stats...
                });
            }, (err) => {
                reject(new Error(toErrorMessage(err)));
            });
        });
    }
    async doSearch(fqs, onResult) {
        const cancellation = new CancellationTokenSource();
        const folderOptions = fqs.map((fq) => this.getSearchOptionsForFolder(fq));
        const session = this.provider instanceof OldFileSearchProviderConverter
            ? this.sessionLifecycle?.tokenSource.token
            : this.sessionLifecycle?.obj;
        const options = {
            folderOptions,
            maxResults: this.config.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS,
            session,
        };
        const getFolderQueryInfo = (fq) => {
            const queryTester = new QueryGlobTester(this.config, fq);
            const noSiblingsClauses = !queryTester.hasSiblingExcludeClauses();
            return { queryTester, noSiblingsClauses, folder: fq.folder, tree: this.initDirectoryTree() };
        };
        const folderMappings = new FolderQuerySearchTree(fqs, getFolderQueryInfo);
        let providerSW;
        try {
            this.activeCancellationTokens.add(cancellation);
            providerSW = StopWatch.create();
            const results = await this.provider.provideFileSearchResults(this.config.filePattern || '', options, cancellation.token);
            const providerTime = providerSW.elapsed();
            const postProcessSW = StopWatch.create();
            if (this.isCanceled && !this.isLimitHit) {
                return null;
            }
            if (results) {
                results.forEach((result) => {
                    const fqFolderInfo = folderMappings.findQueryFragmentAwareSubstr(result);
                    const relativePath = path.posix.relative(fqFolderInfo.folder.path, result.path);
                    if (fqFolderInfo.noSiblingsClauses) {
                        const basename = path.basename(result.path);
                        this.matchFile(onResult, { base: fqFolderInfo.folder, relativePath, basename });
                        return;
                    }
                    // TODO: Optimize siblings clauses with ripgrep here.
                    this.addDirectoryEntries(fqFolderInfo.tree, fqFolderInfo.folder, relativePath, onResult);
                });
            }
            if (this.isCanceled && !this.isLimitHit) {
                return null;
            }
            folderMappings.forEachFolderQueryInfo((e) => {
                this.matchDirectoryTree(e.tree, e.queryTester, onResult);
            });
            return {
                providerTime,
                postProcessTime: postProcessSW.elapsed(),
            };
        }
        finally {
            cancellation.dispose();
            this.activeCancellationTokens.delete(cancellation);
        }
    }
    getSearchOptionsForFolder(fq) {
        const includes = resolvePatternsForProvider(this.config.includePattern, fq.includePattern);
        let excludePattern = fq.excludePattern?.map((e) => ({
            folder: e.folder,
            patterns: resolvePatternsForProvider(this.config.excludePattern, e.pattern),
        }));
        if (!excludePattern?.length) {
            excludePattern = [
                {
                    folder: undefined,
                    patterns: resolvePatternsForProvider(this.config.excludePattern, undefined),
                },
            ];
        }
        const excludes = excludeToGlobPattern(excludePattern);
        return {
            folder: fq.folder,
            excludes,
            includes,
            useIgnoreFiles: {
                local: !fq.disregardIgnoreFiles,
                parent: !fq.disregardParentIgnoreFiles,
                global: !fq.disregardGlobalIgnoreFiles,
            },
            followSymlinks: !fq.ignoreSymlinks,
        };
    }
    initDirectoryTree() {
        const tree = {
            rootEntries: [],
            pathToEntries: Object.create(null),
        };
        tree.pathToEntries['.'] = tree.rootEntries;
        return tree;
    }
    addDirectoryEntries({ pathToEntries }, base, relativeFile, onResult) {
        // Support relative paths to files from a root resource (ignores excludes)
        if (relativeFile === this.filePattern) {
            const basename = path.basename(this.filePattern);
            this.matchFile(onResult, { base: base, relativePath: this.filePattern, basename });
        }
        function add(relativePath) {
            const basename = path.basename(relativePath);
            const dirname = path.dirname(relativePath);
            let entries = pathToEntries[dirname];
            if (!entries) {
                entries = pathToEntries[dirname] = [];
                add(dirname);
            }
            entries.push({
                base,
                relativePath,
                basename,
            });
        }
        add(relativeFile);
    }
    matchDirectoryTree({ rootEntries, pathToEntries }, queryTester, onResult) {
        const self = this;
        const filePattern = this.filePattern;
        function matchDirectory(entries) {
            const hasSibling = hasSiblingFn(() => entries.map((entry) => entry.basename));
            for (let i = 0, n = entries.length; i < n; i++) {
                const entry = entries[i];
                const { relativePath, basename } = entry;
                // Check exclude pattern
                // If the user searches for the exact file name, we adjust the glob matching
                // to ignore filtering by siblings because the user seems to know what they
                // are searching for and we want to include the result in that case anyway
                if (queryTester.matchesExcludesSync(relativePath, basename, filePattern !== basename ? hasSibling : undefined)) {
                    continue;
                }
                const sub = pathToEntries[relativePath];
                if (sub) {
                    matchDirectory(sub);
                }
                else {
                    if (relativePath === filePattern) {
                        continue; // ignore file if its path matches with the file pattern because that is already matched above
                    }
                    self.matchFile(onResult, entry);
                }
                if (self.isLimitHit) {
                    break;
                }
            }
        }
        matchDirectory(rootEntries);
    }
    matchFile(onResult, candidate) {
        if (!this.includePattern ||
            (candidate.relativePath && this.includePattern(candidate.relativePath, candidate.basename))) {
            if (this.exists || (this.maxResults && this.resultCount >= this.maxResults)) {
                this.isLimitHit = true;
                this.cancel();
            }
            if (!this.isLimitHit) {
                onResult(candidate);
            }
        }
    }
}
/**
 * For backwards compatibility, store both a cancellation token and a session object. The session object is the new implementation, where
 */
class SessionLifecycle {
    constructor() {
        this._obj = new Object();
        this.tokenSource = new CancellationTokenSource();
    }
    get obj() {
        if (this._obj) {
            return this._obj;
        }
        throw new Error('Session object has been dereferenced.');
    }
    cancel() {
        this.tokenSource.cancel();
        this._obj = undefined; // dereference
    }
}
export class FileSearchManager {
    constructor() {
        this.sessions = new Map();
    }
    static { this.BATCH_SIZE = 512; }
    fileSearch(config, provider, onBatch, token) {
        const sessionTokenSource = this.getSessionTokenSource(config.cacheKey);
        const engine = new FileSearchEngine(config, provider, sessionTokenSource);
        let resultCount = 0;
        const onInternalResult = (batch) => {
            resultCount += batch.length;
            onBatch(batch.map((m) => this.rawMatchToSearchItem(m)));
        };
        return this.doSearch(engine, FileSearchManager.BATCH_SIZE, onInternalResult, token).then((result) => {
            return {
                limitHit: result.limitHit,
                stats: result.stats
                    ? {
                        fromCache: false,
                        type: 'fileSearchProvider',
                        resultCount,
                        detailStats: result.stats,
                    }
                    : undefined,
                messages: [],
            };
        });
    }
    clearCache(cacheKey) {
        // cancel the token
        this.sessions.get(cacheKey)?.cancel();
        // with no reference to this, it will be removed from WeakMaps
        this.sessions.delete(cacheKey);
    }
    getSessionTokenSource(cacheKey) {
        if (!cacheKey) {
            return undefined;
        }
        if (!this.sessions.has(cacheKey)) {
            this.sessions.set(cacheKey, new SessionLifecycle());
        }
        return this.sessions.get(cacheKey);
    }
    rawMatchToSearchItem(match) {
        if (match.relativePath) {
            return {
                resource: resources.joinPath(match.base, match.relativePath),
            };
        }
        else {
            // extraFileResources
            return {
                resource: match.base,
            };
        }
    }
    doSearch(engine, batchSize, onResultBatch, token) {
        const listener = token.onCancellationRequested(() => {
            engine.cancel();
        });
        const _onResult = (match) => {
            if (match) {
                batch.push(match);
                if (batchSize > 0 && batch.length >= batchSize) {
                    onResultBatch(batch);
                    batch = [];
                }
            }
        };
        let batch = [];
        return engine.search(_onResult).then((result) => {
            if (batch.length) {
                onResultBatch(batch);
            }
            listener.dispose();
            return result;
        }, (error) => {
            if (batch.length) {
                onResultBatch(batch);
            }
            listener.dispose();
            return Promise.reject(error);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9maWxlU2VhcmNoTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBTU4sZUFBZSxFQUNmLDBCQUEwQixFQUMxQixZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUMxQixNQUFNLGFBQWEsQ0FBQTtBQU1wQixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQTRCbEUsTUFBTSxnQkFBZ0I7SUFhckIsWUFDUyxNQUFrQixFQUNsQixRQUE2QixFQUM3QixnQkFBbUM7UUFGbkMsV0FBTSxHQUFOLE1BQU0sQ0FBWTtRQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFxQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBWHBDLGVBQVUsR0FBRyxLQUFLLENBQUE7UUFDbEIsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFDZixlQUFVLEdBQUcsS0FBSyxDQUFBO1FBV3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdB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