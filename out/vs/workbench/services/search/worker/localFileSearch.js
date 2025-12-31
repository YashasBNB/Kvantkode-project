/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { URI } from '../../../../base/common/uri.js';
import { LocalFileSearchWorkerHost, } from '../common/localFileSearchWorkerTypes.js';
import * as paths from '../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { getFileResults } from '../common/getFileResults.js';
import { IgnoreFile } from '../common/ignoreFile.js';
import { createRegExp } from '../../../../base/common/strings.js';
import { Promises } from '../../../../base/common/async.js';
import { ExtUri } from '../../../../base/common/resources.js';
import { revive } from '../../../../base/common/marshalling.js';
const PERF = false;
const globalStart = +new Date();
const itrcount = {};
const time = async (name, task) => {
    if (!PERF) {
        return task();
    }
    const start = Date.now();
    const itr = (itrcount[name] ?? 0) + 1;
    console.info(name, itr, 'starting', Math.round((start - globalStart) * 10) / 10000);
    itrcount[name] = itr;
    const r = await task();
    const end = Date.now();
    console.info(name, itr, 'took', end - start);
    return r;
};
export function create(workerServer) {
    return new LocalFileSearchWorker(workerServer);
}
export class LocalFileSearchWorker {
    constructor(workerServer) {
        this.cancellationTokens = new Map();
        this.host = LocalFileSearchWorkerHost.getChannel(workerServer);
    }
    $cancelQuery(queryId) {
        this.cancellationTokens.get(queryId)?.cancel();
    }
    registerCancellationToken(queryId) {
        const source = new CancellationTokenSource();
        this.cancellationTokens.set(queryId, source);
        return source;
    }
    async $listDirectory(handle, query, folderQuery, ignorePathCasing, queryId) {
        const revivedFolderQuery = reviveFolderQuery(folderQuery);
        const extUri = new ExtUri(() => ignorePathCasing);
        const token = this.registerCancellationToken(queryId);
        const entries = [];
        let limitHit = false;
        let count = 0;
        const max = query.maxResults || 512;
        const filePatternMatcher = query.filePattern
            ? (name) => query.filePattern.split('').every((c) => name.includes(c))
            : (name) => true;
        await time('listDirectory', () => this.walkFolderQuery(handle, reviveQueryProps(query), revivedFolderQuery, extUri, (file) => {
            if (!filePatternMatcher(file.name)) {
                return;
            }
            count++;
            if (max && count > max) {
                limitHit = true;
                token.cancel();
            }
            return entries.push(file.path);
        }, token.token));
        return {
            results: entries,
            limitHit,
        };
    }
    async $searchDirectory(handle, query, folderQuery, ignorePathCasing, queryId) {
        const revivedQuery = reviveFolderQuery(folderQuery);
        const extUri = new ExtUri(() => ignorePathCasing);
        return time('searchInFiles', async () => {
            const token = this.registerCancellationToken(queryId);
            const results = [];
            const pattern = createSearchRegExp(query.contentPattern);
            const onGoingProcesses = [];
            let fileCount = 0;
            let resultCount = 0;
            const limitHit = false;
            const processFile = async (file) => {
                if (token.token.isCancellationRequested) {
                    return;
                }
                fileCount++;
                const contents = await file.resolve();
                if (token.token.isCancellationRequested) {
                    return;
                }
                const bytes = new Uint8Array(contents);
                const fileResults = getFileResults(bytes, pattern, {
                    surroundingContext: query.surroundingContext ?? 0,
                    previewOptions: query.previewOptions,
                    remainingResultQuota: query.maxResults ? query.maxResults - resultCount : 10000,
                });
                if (fileResults.length) {
                    resultCount += fileResults.length;
                    if (query.maxResults && resultCount > query.maxResults) {
                        token.cancel();
                    }
                    const match = {
                        resource: URI.joinPath(revivedQuery.folder, file.path),
                        results: fileResults,
                    };
                    this.host.$sendTextSearchMatch(match, queryId);
                    results.push(match);
                }
            };
            await time('walkFolderToResolve', () => this.walkFolderQuery(handle, reviveQueryProps(query), revivedQuery, extUri, async (file) => onGoingProcesses.push(processFile(file)), token.token));
            await time('resolveOngoingProcesses', () => Promise.all(onGoingProcesses));
            if (PERF) {
                console.log('Searched in', fileCount, 'files');
            }
            return {
                results,
                limitHit,
            };
        });
    }
    async walkFolderQuery(handle, queryProps, folderQuery, extUri, onFile, token) {
        const folderExcludes = folderQuery.excludePattern?.map((excludePattern) => glob.parse(excludePattern.pattern ?? {}, {
            trimForExclusions: true,
        }));
        const evalFolderExcludes = (path, basename, hasSibling) => {
            return folderExcludes?.some((folderExclude) => {
                return folderExclude(path, basename, hasSibling);
            });
        };
        // For folders, only check if the folder is explicitly excluded so walking continues.
        const isFolderExcluded = (path, basename, hasSibling) => {
            path = path.slice(1);
            if (evalFolderExcludes(path, basename, hasSibling)) {
                return true;
            }
            if (pathExcludedInQuery(queryProps, path)) {
                return true;
            }
            return false;
        };
        // For files ensure the full check takes place.
        const isFileIncluded = (path, basename, hasSibling) => {
            path = path.slice(1);
            if (evalFolderExcludes(path, basename, hasSibling)) {
                return false;
            }
            if (!pathIncludedInQuery(queryProps, path, extUri)) {
                return false;
            }
            return true;
        };
        const processFile = (file, prior) => {
            const resolved = {
                type: 'file',
                name: file.name,
                path: prior,
                resolve: () => file.getFile().then((r) => r.arrayBuffer()),
            };
            return resolved;
        };
        const isFileSystemDirectoryHandle = (handle) => {
            return handle.kind === 'directory';
        };
        const isFileSystemFileHandle = (handle) => {
            return handle.kind === 'file';
        };
        const processDirectory = async (directory, prior, ignoreFile) => {
            if (!folderQuery.disregardIgnoreFiles) {
                const ignoreFiles = await Promise.all([
                    directory.getFileHandle('.gitignore').catch((e) => undefined),
                    directory.getFileHandle('.ignore').catch((e) => undefined),
                ]);
                await Promise.all(ignoreFiles.map(async (file) => {
                    if (!file) {
                        return;
                    }
                    const ignoreContents = new TextDecoder('utf8').decode(new Uint8Array(await (await file.getFile()).arrayBuffer()));
                    ignoreFile = new IgnoreFile(ignoreContents, prior, ignoreFile);
                }));
            }
            const entries = Promises.withAsyncBody(async (c) => {
                const files = [];
                const dirs = [];
                const entries = [];
                const sibilings = new Set();
                for await (const entry of directory.entries()) {
                    entries.push(entry);
                    sibilings.add(entry[0]);
                }
                for (const [basename, handle] of entries) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    const path = prior + basename;
                    if (ignoreFile &&
                        !ignoreFile.isPathIncludedInTraversal(path, handle.kind === 'directory')) {
                        continue;
                    }
                    const hasSibling = (query) => sibilings.has(query);
                    if (isFileSystemDirectoryHandle(handle) &&
                        !isFolderExcluded(path, basename, hasSibling)) {
                        dirs.push(processDirectory(handle, path + '/', ignoreFile));
                    }
                    else if (isFileSystemFileHandle(handle) && isFileIncluded(path, basename, hasSibling)) {
                        files.push(processFile(handle, path));
                    }
                }
                c([...(await Promise.all(dirs)), ...files]);
            });
            return {
                type: 'dir',
                name: directory.name,
                entries,
            };
        };
        const resolveDirectory = async (directory, onFile) => {
            if (token.isCancellationRequested) {
                return;
            }
            await Promise.all((await directory.entries)
                .sort((a, b) => -(a.type === 'dir' ? 0 : 1) + (b.type === 'dir' ? 0 : 1))
                .map(async (entry) => {
                if (entry.type === 'dir') {
                    return resolveDirectory(entry, onFile);
                }
                else {
                    return onFile(entry);
                }
            }));
        };
        const processed = await time('process', () => processDirectory(handle, '/'));
        await time('resolve', () => resolveDirectory(processed, onFile));
    }
}
function createSearchRegExp(options) {
    return createRegExp(options.pattern, !!options.isRegExp, {
        wholeWord: options.isWordMatch,
        global: true,
        matchCase: options.isCaseSensitive,
        multiline: true,
        unicode: true,
    });
}
function reviveFolderQuery(folderQuery) {
    // @todo: andrea - try to see why we can't just call 'revive' here
    return revive({
        ...revive(folderQuery),
        excludePattern: folderQuery.excludePattern?.map((ep) => ({
            folder: URI.revive(ep.folder),
            pattern: ep.pattern,
        })),
        folder: URI.revive(folderQuery.folder),
    });
}
function reviveQueryProps(queryProps) {
    return {
        ...queryProps,
        extraFileResources: queryProps.extraFileResources?.map((r) => URI.revive(r)),
        folderQueries: queryProps.folderQueries.map((fq) => reviveFolderQuery(fq)),
    };
}
function pathExcludedInQuery(queryProps, fsPath) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, fsPath)) {
        return true;
    }
    return false;
}
function pathIncludedInQuery(queryProps, path, extUri) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, path)) {
        return false;
    }
    if (queryProps.includePattern || queryProps.usingSearchPaths) {
        if (queryProps.includePattern && glob.match(queryProps.includePattern, path)) {
            return true;
        }
        // If searchPaths are being used, the extra file must be in a subfolder and match the pattern, if present
        if (queryProps.usingSearchPaths) {
            return (!!queryProps.folderQueries &&
                queryProps.folderQueries.some((fq) => {
                    const searchPath = fq.folder;
                    const uri = URI.file(path);
                    if (extUri.isEqualOrParent(uri, searchPath)) {
                        const relPath = paths.relative(searchPath.path, uri.path);
                        return !fq.includePattern || !!glob.match(fq.includePattern, relPath);
                    }
                    else {
                        return false;
                    }
                }));
        }
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC93b3JrZXIvbG9jYWxGaWxlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFpQixHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUtuRSxPQUFPLEVBRU4seUJBQXlCLEdBS3pCLE1BQU0seUNBQXlDLENBQUE7QUFTaEQsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFL0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFBO0FBZWxCLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQTtBQUMvQixNQUFNLFFBQVEsR0FBMkIsRUFBRSxDQUFBO0FBQzNDLE1BQU0sSUFBSSxHQUFHLEtBQUssRUFBSyxJQUFZLEVBQUUsSUFBMEIsRUFBRSxFQUFFO0lBQ2xFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sSUFBSSxFQUFFLENBQUE7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