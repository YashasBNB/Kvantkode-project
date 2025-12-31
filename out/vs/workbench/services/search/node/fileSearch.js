/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from '../../../../base/common/path.js';
import { StringDecoder } from 'string_decoder';
import * as arrays from '../../../../base/common/arrays.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import * as glob from '../../../../base/common/glob.js';
import * as normalization from '../../../../base/common/normalization.js';
import { isEqualOrParent } from '../../../../base/common/extpath.js';
import * as platform from '../../../../base/common/platform.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as strings from '../../../../base/common/strings.js';
import * as types from '../../../../base/common/types.js';
import { Promises } from '../../../../base/node/pfs.js';
import { isFilePatternMatch, hasSiblingFn, } from '../common/search.js';
import { spawnRipgrepCmd } from './ripgrepFileSearch.js';
import { prepareQuery } from '../../../../base/common/fuzzyScorer.js';
const killCmds = new Set();
process.on('exit', () => {
    killCmds.forEach((cmd) => cmd());
});
export class FileWalker {
    constructor(config) {
        this.normalizedFilePatternLowercase = null;
        this.maxFilesize = null;
        this.isCanceled = false;
        this.fileWalkSW = null;
        this.cmdSW = null;
        this.cmdResultCount = 0;
        this.config = config;
        this.filePattern = config.filePattern || '';
        this.includePattern = config.includePattern && glob.parse(config.includePattern);
        this.maxResults = config.maxResults || null;
        this.exists = !!config.exists;
        this.walkedPaths = Object.create(null);
        this.resultCount = 0;
        this.isLimitHit = false;
        this.directoriesWalked = 0;
        this.filesWalked = 0;
        this.errors = [];
        if (this.filePattern) {
            this.normalizedFilePatternLowercase = config.shouldGlobMatchFilePattern
                ? null
                : prepareQuery(this.filePattern).normalizedLowercase;
        }
        this.globalExcludePattern = config.excludePattern && glob.parse(config.excludePattern);
        this.folderExcludePatterns = new Map();
        config.folderQueries.forEach((folderQuery) => {
            const folderExcludeExpression = {}; // todo: consider exclude baseURI
            folderQuery.excludePattern?.forEach((excludePattern) => {
                Object.assign(folderExcludeExpression, excludePattern.pattern || {}, this.config.excludePattern || {});
            });
            if (!folderQuery.excludePattern?.length) {
                Object.assign(folderExcludeExpression, this.config.excludePattern || {});
            }
            // Add excludes for other root folders
            const fqPath = folderQuery.folder.fsPath;
            config.folderQueries
                .map((rootFolderQuery) => rootFolderQuery.folder.fsPath)
                .filter((rootFolder) => rootFolder !== fqPath)
                .forEach((otherRootFolder) => {
                // Exclude nested root folders
                if (isEqualOrParent(otherRootFolder, fqPath)) {
                    folderExcludeExpression[path.relative(fqPath, otherRootFolder)] = true;
                }
            });
            this.folderExcludePatterns.set(fqPath, new AbsoluteAndRelativeParsedExpression(folderExcludeExpression, fqPath));
        });
    }
    cancel() {
        this.isCanceled = true;
        killCmds.forEach((cmd) => cmd());
    }
    walk(folderQueries, extraFiles, numThreads, onResult, onMessage, done) {
        this.fileWalkSW = StopWatch.create(false);
        // Support that the file pattern is a full path to a file that exists
        if (this.isCanceled) {
            return done(null, this.isLimitHit);
        }
        // For each extra file
        extraFiles.forEach((extraFilePath) => {
            const basename = path.basename(extraFilePath.fsPath);
            if (this.globalExcludePattern && this.globalExcludePattern(extraFilePath.fsPath, basename)) {
                return; // excluded
            }
            // File: Check for match on file pattern and include pattern
            this.matchFile(onResult, {
                relativePath: extraFilePath.fsPath /* no workspace relative path */,
                searchPath: undefined,
            });
        });
        this.cmdSW = StopWatch.create(false);
        // For each root folder
        this.parallel(folderQueries, (folderQuery, rootFolderDone) => {
            this.call(this.cmdTraversal, this, folderQuery, numThreads, onResult, onMessage, (err) => {
                if (err) {
                    const errorMessage = toErrorMessage(err);
                    console.error(errorMessage);
                    this.errors.push(errorMessage);
                    rootFolderDone(err, undefined);
                }
                else {
                    rootFolderDone(null, undefined);
                }
            });
        }, (errors, _result) => {
            this.fileWalkSW.stop();
            const err = errors ? arrays.coalesce(errors)[0] : null;
            done(err, this.isLimitHit);
        });
    }
    parallel(list, fn, callback) {
        const results = new Array(list.length);
        const errors = new Array(list.length);
        let didErrorOccur = false;
        let doneCount = 0;
        if (list.length === 0) {
            return callback(null, []);
        }
        list.forEach((item, index) => {
            fn(item, (error, result) => {
                if (error) {
                    didErrorOccur = true;
                    results[index] = null;
                    errors[index] = error;
                }
                else {
                    results[index] = result;
                    errors[index] = null;
                }
                if (++doneCount === list.length) {
                    return callback(didErrorOccur ? errors : null, results);
                }
            });
        });
    }
    call(fun, that, ...args) {
        try {
            fun.apply(that, args);
        }
        catch (e) {
            args[args.length - 1](e);
        }
    }
    cmdTraversal(folderQuery, numThreads, onResult, onMessage, cb) {
        const rootFolder = folderQuery.folder.fsPath;
        const isMac = platform.isMacintosh;
        const killCmd = () => cmd && cmd.kill();
        killCmds.add(killCmd);
        let done = (err) => {
            killCmds.delete(killCmd);
            done = () => { };
            cb(err);
        };
        let leftover = '';
        const tree = this.initDirectoryTree();
        const ripgrep = spawnRipgrepCmd(this.config, folderQuery, this.config.includePattern, this.folderExcludePatterns.get(folderQuery.folder.fsPath).expression, numThreads);
        const cmd = ripgrep.cmd;
        const noSiblingsClauses = !Object.keys(ripgrep.siblingClauses).length;
        const escapedArgs = ripgrep.rgArgs.args
            .map((arg) => (arg.match(/^-/) ? arg : `'${arg}'`))
            .join(' ');
        let rgCmd = `${ripgrep.rgDiskPath} ${escapedArgs}\n - cwd: ${ripgrep.cwd}`;
        if (ripgrep.rgArgs.siblingClauses) {
            rgCmd += `\n - Sibling clauses: ${JSON.stringify(ripgrep.rgArgs.siblingClauses)}`;
        }
        onMessage({ message: rgCmd });
        this.cmdResultCount = 0;
        this.collectStdout(cmd, 'utf8', onMessage, (err, stdout, last) => {
            if (err) {
                done(err);
                return;
            }
            if (this.isLimitHit) {
                done();
                return;
            }
            // Mac: uses NFD unicode form on disk, but we want NFC
            const normalized = leftover + (isMac ? normalization.normalizeNFC(stdout || '') : stdout);
            const relativeFiles = normalized.split('\n');
            if (last) {
                const n = relativeFiles.length;
                relativeFiles[n - 1] = relativeFiles[n - 1].trim();
                if (!relativeFiles[n - 1]) {
                    relativeFiles.pop();
                }
            }
            else {
                leftover = relativeFiles.pop() || '';
            }
            if (relativeFiles.length && relativeFiles[0].indexOf('\n') !== -1) {
                done(new Error('Splitting up files failed'));
                return;
            }
            this.cmdResultCount += relativeFiles.length;
            if (noSiblingsClauses) {
                for (const relativePath of relativeFiles) {
                    this.matchFile(onResult, {
                        base: rootFolder,
                        relativePath,
                        searchPath: this.getSearchPath(folderQuery, relativePath),
                    });
                    if (this.isLimitHit) {
                        killCmd();
                        break;
                    }
                }
                if (last || this.isLimitHit) {
                    done();
                }
                return;
            }
            // TODO: Optimize siblings clauses with ripgrep here.
            this.addDirectoryEntries(folderQuery, tree, rootFolder, relativeFiles, onResult);
            if (last) {
                this.matchDirectoryTree(tree, rootFolder, onResult);
                done();
            }
        });
    }
    /**
     * Public for testing.
     */
    spawnFindCmd(folderQuery) {
        const excludePattern = this.folderExcludePatterns.get(folderQuery.folder.fsPath);
        const basenames = excludePattern.getBasenameTerms();
        const pathTerms = excludePattern.getPathTerms();
        const args = ['-L', '.'];
        if (basenames.length || pathTerms.length) {
            args.push('-not', '(', '(');
            for (const basename of basenames) {
                args.push('-name', basename);
                args.push('-o');
            }
            for (const path of pathTerms) {
                args.push('-path', path);
                args.push('-o');
            }
            args.pop();
            args.push(')', '-prune', ')');
        }
        args.push('-type', 'f');
        return childProcess.spawn('find', args, { cwd: folderQuery.folder.fsPath });
    }
    /**
     * Public for testing.
     */
    readStdout(cmd, encoding, cb) {
        let all = '';
        this.collectStdout(cmd, encoding, () => { }, (err, stdout, last) => {
            if (err) {
                cb(err);
                return;
            }
            all += stdout;
            if (last) {
                cb(null, all);
            }
        });
    }
    collectStdout(cmd, encoding, onMessage, cb) {
        let onData = (err, stdout, last) => {
            if (err || last) {
                onData = () => { };
                this.cmdSW?.stop();
            }
            cb(err, stdout, last);
        };
        let gotData = false;
        if (cmd.stdout) {
            // Should be non-null, but #38195
            this.forwardData(cmd.stdout, encoding, onData);
            cmd.stdout.once('data', () => (gotData = true));
        }
        else {
            onMessage({ message: 'stdout is null' });
        }
        let stderr;
        if (cmd.stderr) {
            // Should be non-null, but #38195
            stderr = this.collectData(cmd.stderr);
        }
        else {
            onMessage({ message: 'stderr is null' });
        }
        cmd.on('error', (err) => {
            onData(err);
        });
        cmd.on('close', (code) => {
            // ripgrep returns code=1 when no results are found
            let stderrText;
            if (!gotData &&
                (stderrText = this.decodeData(stderr, encoding)) &&
                rgErrorMsgForDisplay(stderrText)) {
                onData(new Error(`command failed with error code ${code}: ${this.decodeData(stderr, encoding)}`));
            }
            else {
                if (this.exists && code === 0) {
                    this.isLimitHit = true;
                }
                onData(null, '', true);
            }
        });
    }
    forwardData(stream, encoding, cb) {
        const decoder = new StringDecoder(encoding);
        stream.on('data', (data) => {
            cb(null, decoder.write(data));
        });
        return decoder;
    }
    collectData(stream) {
        const buffers = [];
        stream.on('data', (data) => {
            buffers.push(data);
        });
        return buffers;
    }
    decodeData(buffers, encoding) {
        const decoder = new StringDecoder(encoding);
        return buffers.map((buffer) => decoder.write(buffer)).join('');
    }
    initDirectoryTree() {
        const tree = {
            rootEntries: [],
            pathToEntries: Object.create(null),
        };
        tree.pathToEntries['.'] = tree.rootEntries;
        return tree;
    }
    addDirectoryEntries(folderQuery, { pathToEntries }, base, relativeFiles, onResult) {
        // Support relative paths to files from a root resource (ignores excludes)
        if (relativeFiles.indexOf(this.filePattern) !== -1) {
            this.matchFile(onResult, {
                base,
                relativePath: this.filePattern,
                searchPath: this.getSearchPath(folderQuery, this.filePattern),
            });
        }
        const add = (relativePath) => {
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
                searchPath: this.getSearchPath(folderQuery, relativePath),
            });
        };
        relativeFiles.forEach(add);
    }
    matchDirectoryTree({ rootEntries, pathToEntries }, rootFolder, onResult) {
        const self = this;
        const excludePattern = this.folderExcludePatterns.get(rootFolder);
        const filePattern = this.filePattern;
        function matchDirectory(entries) {
            self.directoriesWalked++;
            const hasSibling = hasSiblingFn(() => entries.map((entry) => entry.basename));
            for (let i = 0, n = entries.length; i < n; i++) {
                const entry = entries[i];
                const { relativePath, basename } = entry;
                // Check exclude pattern
                // If the user searches for the exact file name, we adjust the glob matching
                // to ignore filtering by siblings because the user seems to know what they
                // are searching for and we want to include the result in that case anyway
                if (excludePattern.test(relativePath, basename, filePattern !== basename ? hasSibling : undefined)) {
                    continue;
                }
                const sub = pathToEntries[relativePath];
                if (sub) {
                    matchDirectory(sub);
                }
                else {
                    self.filesWalked++;
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
    getStats() {
        return {
            cmdTime: this.cmdSW.elapsed(),
            fileWalkTime: this.fileWalkSW.elapsed(),
            directoriesWalked: this.directoriesWalked,
            filesWalked: this.filesWalked,
            cmdResultCount: this.cmdResultCount,
        };
    }
    doWalk(folderQuery, relativeParentPath, files, onResult, done) {
        const rootFolder = folderQuery.folder;
        // Execute tasks on each file in parallel to optimize throughput
        const hasSibling = hasSiblingFn(() => files);
        this.parallel(files, (file, clb) => {
            // Check canceled
            if (this.isCanceled || this.isLimitHit) {
                return clb(null);
            }
            // Check exclude pattern
            // If the user searches for the exact file name, we adjust the glob matching
            // to ignore filtering by siblings because the user seems to know what they
            // are searching for and we want to include the result in that case anyway
            const currentRelativePath = relativeParentPath
                ? [relativeParentPath, file].join(path.sep)
                : file;
            if (this.folderExcludePatterns
                .get(folderQuery.folder.fsPath)
                .test(currentRelativePath, file, this.config.filePattern !== file ? hasSibling : undefined)) {
                return clb(null);
            }
            // Use lstat to detect links
            const currentAbsolutePath = [rootFolder.fsPath, currentRelativePath].join(path.sep);
            fs.lstat(currentAbsolutePath, (error, lstat) => {
                if (error || this.isCanceled || this.isLimitHit) {
                    return clb(null);
                }
                // If the path is a link, we must instead use fs.stat() to find out if the
                // link is a directory or not because lstat will always return the stat of
                // the link which is always a file.
                this.statLinkIfNeeded(currentAbsolutePath, lstat, (error, stat) => {
                    if (error || this.isCanceled || this.isLimitHit) {
                        return clb(null);
                    }
                    // Directory: Follow directories
                    if (stat.isDirectory()) {
                        this.directoriesWalked++;
                        // to really prevent loops with links we need to resolve the real path of them
                        return this.realPathIfNeeded(currentAbsolutePath, lstat, (error, realpath) => {
                            if (error || this.isCanceled || this.isLimitHit) {
                                return clb(null);
                            }
                            realpath = realpath || '';
                            if (this.walkedPaths[realpath]) {
                                return clb(null); // escape when there are cycles (can happen with symlinks)
                            }
                            this.walkedPaths[realpath] = true; // remember as walked
                            // Continue walking
                            return Promises.readdir(currentAbsolutePath).then((children) => {
                                if (this.isCanceled || this.isLimitHit) {
                                    return clb(null);
                                }
                                this.doWalk(folderQuery, currentRelativePath, children, onResult, (err) => clb(err || null));
                            }, (error) => {
                                clb(null);
                            });
                        });
                    }
                    // File: Check for match on file pattern and include pattern
                    else {
                        this.filesWalked++;
                        if (currentRelativePath === this.filePattern) {
                            return clb(null, undefined); // ignore file if its path matches with the file pattern because checkFilePatternRelativeMatch() takes care of those
                        }
                        if (this.maxFilesize && types.isNumber(stat.size) && stat.size > this.maxFilesize) {
                            return clb(null, undefined); // ignore file if max file size is hit
                        }
                        this.matchFile(onResult, {
                            base: rootFolder.fsPath,
                            relativePath: currentRelativePath,
                            searchPath: this.getSearchPath(folderQuery, currentRelativePath),
                        });
                    }
                    // Unwind
                    return clb(null, undefined);
                });
            });
        }, (error) => {
            const filteredErrors = error ? arrays.coalesce(error) : error; // find any error by removing null values first
            return done(filteredErrors && filteredErrors.length > 0 ? filteredErrors[0] : undefined);
        });
    }
    matchFile(onResult, candidate) {
        if (this.isFileMatch(candidate) &&
            (!this.includePattern ||
                this.includePattern(candidate.relativePath, path.basename(candidate.relativePath)))) {
            this.resultCount++;
            if (this.exists || (this.maxResults && this.resultCount > this.maxResults)) {
                this.isLimitHit = true;
            }
            if (!this.isLimitHit) {
                onResult(candidate);
            }
        }
    }
    isFileMatch(candidate) {
        // Check for search pattern
        if (this.filePattern) {
            if (this.filePattern === '*') {
                return true; // support the all-matching wildcard
            }
            if (this.normalizedFilePatternLowercase) {
                return isFilePatternMatch(candidate, this.normalizedFilePatternLowercase);
            }
            else if (this.filePattern) {
                return isFilePatternMatch(candidate, this.filePattern, false);
            }
        }
        // No patterns means we match all
        return true;
    }
    statLinkIfNeeded(path, lstat, clb) {
        if (lstat.isSymbolicLink()) {
            return fs.stat(path, clb); // stat the target the link points to
        }
        return clb(null, lstat); // not a link, so the stat is already ok for us
    }
    realPathIfNeeded(path, lstat, clb) {
        if (lstat.isSymbolicLink()) {
            return fs.realpath(path, (error, realpath) => {
                if (error) {
                    return clb(error);
                }
                return clb(null, realpath);
            });
        }
        return clb(null, path);
    }
    /**
     * If we're searching for files in multiple workspace folders, then better prepend the
     * name of the workspace folder to the path of the file. This way we'll be able to
     * better filter files that are all on the top of a workspace folder and have all the
     * same name. A typical example are `package.json` or `README.md` files.
     */
    getSearchPath(folderQuery, relativePath) {
        if (folderQuery.folderName) {
            return path.join(folderQuery.folderName, relativePath);
        }
        return relativePath;
    }
}
export class Engine {
    constructor(config, numThreads) {
        this.folderQueries = config.folderQueries;
        this.extraFiles = config.extraFileResources || [];
        this.numThreads = numThreads;
        this.walker = new FileWalker(config);
    }
    search(onResult, onProgress, done) {
        this.walker.walk(this.folderQueries, this.extraFiles, this.numThreads, onResult, onProgress, (err, isLimitHit) => {
            done(err, {
                limitHit: isLimitHit,
                stats: this.walker.getStats(),
                messages: [],
            });
        });
    }
    cancel() {
        this.walker.cancel();
    }
}
/**
 * This class exists to provide one interface on top of two ParsedExpressions, one for absolute expressions and one for relative expressions.
 * The absolute and relative expressions don't "have" to be kept separate, but this keeps us from having to path.join every single
 * file searched, it's only used for a text search with a searchPath
 */
class AbsoluteAndRelativeParsedExpression {
    constructor(expression, root) {
        this.expression = expression;
        this.root = root;
        this.init(expression);
    }
    /**
     * Split the IExpression into its absolute and relative components, and glob.parse them separately.
     */
    init(expr) {
        let absoluteGlobExpr;
        let relativeGlobExpr;
        Object.keys(expr)
            .filter((key) => expr[key])
            .forEach((key) => {
            if (path.isAbsolute(key)) {
                absoluteGlobExpr = absoluteGlobExpr || glob.getEmptyExpression();
                absoluteGlobExpr[key] = expr[key];
            }
            else {
                relativeGlobExpr = relativeGlobExpr || glob.getEmptyExpression();
                relativeGlobExpr[key] = expr[key];
            }
        });
        this.absoluteParsedExpr =
            absoluteGlobExpr && glob.parse(absoluteGlobExpr, { trimForExclusions: true });
        this.relativeParsedExpr =
            relativeGlobExpr && glob.parse(relativeGlobExpr, { trimForExclusions: true });
    }
    test(_path, basename, hasSibling) {
        return ((this.relativeParsedExpr && this.relativeParsedExpr(_path, basename, hasSibling)) ||
            (this.absoluteParsedExpr &&
                this.absoluteParsedExpr(path.join(this.root, _path), basename, hasSibling)));
    }
    getBasenameTerms() {
        const basenameTerms = [];
        if (this.absoluteParsedExpr) {
            basenameTerms.push(...glob.getBasenameTerms(this.absoluteParsedExpr));
        }
        if (this.relativeParsedExpr) {
            basenameTerms.push(...glob.getBasenameTerms(this.relativeParsedExpr));
        }
        return basenameTerms;
    }
    getPathTerms() {
        const pathTerms = [];
        if (this.absoluteParsedExpr) {
            pathTerms.push(...glob.getPathTerms(this.absoluteParsedExpr));
        }
        if (this.relativeParsedExpr) {
            pathTerms.push(...glob.getPathTerms(this.relativeParsedExpr));
        }
        return pathTerms;
    }
}
function rgErrorMsgForDisplay(msg) {
    const lines = msg.trim().split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('Error parsing regex')) {
        return firstLine;
    }
    if (firstLine.startsWith('regex parse error')) {
        return strings.uppercaseFirstLetter(lines[lines.length - 1].trim());
    }
    if (firstLine.startsWith('error parsing glob') || firstLine.startsWith('unsupported encoding')) {
        // Uppercase first letter
        return firstLine.charAt(0).toUpperCase() + firstLine.substr(1);
    }
    if (firstLine === `Literal '\\n' not allowed.`) {
        // I won't localize this because none of the Ripgrep error messages are localized
        return `Literal '\\n' currently not supported`;
    }
    if (firstLine.startsWith('Literal ')) {
        // Other unsupported chars
        return firstLine;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9maWxlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxZQUFZLE1BQU0sZUFBZSxDQUFBO0FBQzdDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzlDLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxLQUFLLGFBQWEsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBUU4sa0JBQWtCLEVBQ2xCLFlBQVksR0FDWixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFZckUsTUFB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