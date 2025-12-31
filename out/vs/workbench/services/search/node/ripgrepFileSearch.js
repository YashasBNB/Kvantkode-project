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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvcmlwZ3JlcEZpbGVTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxJQUFJLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUV4Qyx1RUFBdUU7QUFDdkUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0FBRXpGLE1BQU0sVUFBVSxlQUFlLENBQzlCLE1BQWtCLEVBQ2xCLFdBQXlCLEVBQ3pCLGNBQWlDLEVBQ2pDLGNBQWlDLEVBQ2pDLFVBQW1CO0lBRW5CLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDekYsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDckMsT0FBTztRQUNOLEdBQUcsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxN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