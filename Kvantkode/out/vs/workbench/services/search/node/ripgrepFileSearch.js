/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import * as path from '../../../../base/common/path.js';
import { normalizeNFD } from '../../../../base/common/normalization.js';
import * as extpath from '../../../../base/common/extpath.js';
import { isMacintosh as isMac } from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { anchorGlob } from './ripgrepSearchUtils.js';
import { rgPath } from '@vscode/ripgrep';
// If @vscode/ripgrep is in an .asar file, then the binary is unpacked.
const rgDiskPath = rgPath.replace(/\bnode_modules\.asar\b/, 'node_modules.asar.unpacked');
export function spawnRipgrepCmd(config, folderQuery, includePattern, excludePattern, numThreads) {
    const rgArgs = getRgArgs(config, folderQuery, includePattern, excludePattern, numThreads);
    const cwd = folderQuery.folder.fsPath;
    return {
        cmd: cp.spawn(rgDiskPath, rgArgs.args, { cwd }),
        rgDiskPath,
        siblingClauses: rgArgs.siblingClauses,
        rgArgs,
        cwd,
    };
}
function getRgArgs(config, folderQuery, includePattern, excludePattern, numThreads) {
    const args = ['--files', '--hidden', '--case-sensitive', '--no-require-git'];
    // includePattern can't have siblingClauses
    foldersToIncludeGlobs([folderQuery], includePattern, false).forEach((globArg) => {
        const inclusion = anchorGlob(globArg);
        args.push('-g', inclusion);
        if (isMac) {
            const normalized = normalizeNFD(inclusion);
            if (normalized !== inclusion) {
                args.push('-g', normalized);
            }
        }
    });
    const rgGlobs = foldersToRgExcludeGlobs([folderQuery], excludePattern, undefined, false);
    rgGlobs.globArgs.forEach((globArg) => {
        const exclusion = `!${anchorGlob(globArg)}`;
        args.push('-g', exclusion);
        if (isMac) {
            const normalized = normalizeNFD(exclusion);
            if (normalized !== exclusion) {
                args.push('-g', normalized);
            }
        }
    });
    if (folderQuery.disregardIgnoreFiles !== false) {
        // Don't use .gitignore or .ignore
        args.push('--no-ignore');
    }
    else if (folderQuery.disregardParentIgnoreFiles !== false) {
        args.push('--no-ignore-parent');
    }
    // Follow symlinks
    if (!folderQuery.ignoreSymlinks) {
        args.push('--follow');
    }
    if (config.exists) {
        args.push('--quiet');
    }
    if (numThreads) {
        args.push('--threads', `${numThreads}`);
    }
    args.push('--no-config');
    if (folderQuery.disregardGlobalIgnoreFiles) {
        args.push('--no-ignore-global');
    }
    return {
        args,
        siblingClauses: rgGlobs.siblingClauses,
    };
}
function foldersToRgExcludeGlobs(folderQueries, globalExclude, excludesToSkip, absoluteGlobs = true) {
    const globArgs = [];
    let siblingClauses = {};
    folderQueries.forEach((folderQuery) => {
        const totalExcludePattern = Object.assign({}, folderQuery.excludePattern || {}, globalExclude || {});
        const result = globExprsToRgGlobs(totalExcludePattern, absoluteGlobs ? folderQuery.folder.fsPath : undefined, excludesToSkip);
        globArgs.push(...result.globArgs);
        if (result.siblingClauses) {
            siblingClauses = Object.assign(siblingClauses, result.siblingClauses);
        }
    });
    return { globArgs, siblingClauses };
}
function foldersToIncludeGlobs(folderQueries, globalInclude, absoluteGlobs = true) {
    const globArgs = [];
    folderQueries.forEach((folderQuery) => {
        const totalIncludePattern = Object.assign({}, globalInclude || {}, folderQuery.includePattern || {});
        const result = globExprsToRgGlobs(totalIncludePattern, absoluteGlobs ? folderQuery.folder.fsPath : undefined);
        globArgs.push(...result.globArgs);
    });
    return globArgs;
}
function globExprsToRgGlobs(patterns, folder, excludesToSkip) {
    const globArgs = [];
    const siblingClauses = {};
    Object.keys(patterns).forEach((key) => {
        if (excludesToSkip && excludesToSkip.has(key)) {
            return;
        }
        if (!key) {
            return;
        }
        const value = patterns[key];
        key = trimTrailingSlash(folder ? getAbsoluteGlob(folder, key) : key);
        // glob.ts requires forward slashes, but a UNC path still must start with \\
        // #38165 and #38151
        if (key.startsWith('\\\\')) {
            key = '\\\\' + key.substr(2).replace(/\\/g, '/');
        }
        else {
            key = key.replace(/\\/g, '/');
        }
        if (typeof value === 'boolean' && value) {
            if (key.startsWith('\\\\')) {
                // Absolute globs UNC paths don't work properly, see #58758
                key += '**';
            }
            globArgs.push(fixDriveC(key));
        }
        else if (value && value.when) {
            siblingClauses[key] = value;
        }
    });
    return { globArgs, siblingClauses };
}
/**
 * Resolves a glob like "node_modules/**" in "/foo/bar" to "/foo/bar/node_modules/**".
 * Special cases C:/foo paths to write the glob like /foo instead - see https://github.com/BurntSushi/ripgrep/issues/530.
 *
 * Exported for testing
 */
export function getAbsoluteGlob(folder, key) {
    return path.isAbsolute(key) ? key : path.join(folder, key);
}
function trimTrailingSlash(str) {
    str = strings.rtrim(str, '\\');
    return strings.rtrim(str, '/');
}
export function fixDriveC(path) {
    const root = extpath.getRoot(path);
    return root.toLowerCase() === 'c:/' ? path.replace(/^c:[/\\]/i, '/') : path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9yaXBncmVwRmlsZVNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLElBQUksS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDMUUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRXhDLHVFQUF1RTtBQUN2RSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLDRCQUE0QixDQUFDLENBQUE7QUFFekYsTUFBTSxVQUFVLGVBQWUsQ0FDOUIsTUFBa0IsRUFDbEIsV0FBeUIsRUFDekIsY0FBaUMsRUFDakMsY0FBaUMsRUFDakMsVUFBbUI7SUFFbkIsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN6RixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUNyQyxPQUFPO1FBQ04sR0FBRyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxF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