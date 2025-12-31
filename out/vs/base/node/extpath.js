/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { basename, dirname, join, normalize, sep } from '../common/path.js';
import { isLinux } from '../common/platform.js';
import { rtrim } from '../common/strings.js';
import { Promises } from './pfs.js';
/**
 * Copied from: https://github.com/microsoft/vscode-node-debug/blob/master/src/node/pathUtilities.ts#L83
 *
 * Given an absolute, normalized, and existing file path 'realcase' returns the exact path that the file has on disk.
 * On a case insensitive file system, the returned path might differ from the original path by character casing.
 * On a case sensitive file system, the returned path will always be identical to the original path.
 * In case of errors, null is returned. But you cannot use this function to verify that a path exists.
 * realcase does not handle '..' or '.' path segments and it does not take the locale into account.
 */
export async function realcase(path, token) {
    if (isLinux) {
        // This method is unsupported on OS that have case sensitive
        // file system where the same path can exist in different forms
        // (see also https://github.com/microsoft/vscode/issues/139709)
        return path;
    }
    const dir = dirname(path);
    if (path === dir) {
        // end recursion
        return path;
    }
    const name = (basename(path) /* can be '' for windows drive letters */ || path).toLowerCase();
    try {
        if (token?.isCancellationRequested) {
            return null;
        }
        const entries = await Promises.readdir(dir);
        const found = entries.filter((e) => e.toLowerCase() === name); // use a case insensitive search
        if (found.length === 1) {
            // on a case sensitive filesystem we cannot determine here, whether the file exists or not, hence we need the 'file exists' precondition
            const prefix = await realcase(dir, token); // recurse
            if (prefix) {
                return join(prefix, found[0]);
            }
        }
        else if (found.length > 1) {
            // must be a case sensitive $filesystem
            const ix = found.indexOf(name);
            if (ix >= 0) {
                // case sensitive
                const prefix = await realcase(dir, token); // recurse
                if (prefix) {
                    return join(prefix, found[ix]);
                }
            }
        }
    }
    catch (error) {
        // silently ignore error
    }
    return null;
}
export async function realpath(path) {
    try {
        // DO NOT USE `fs.promises.realpath` here as it internally
        // calls `fs.native.realpath` which will result in subst
        // drives to be resolved to their target on Windows
        // https://github.com/microsoft/vscode/issues/118562
        return await Promises.realpath(path);
    }
    catch (error) {
        // We hit an error calling fs.realpath(). Since fs.realpath() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        await fs.promises.access(normalizedPath, fs.constants.R_OK);
        return normalizedPath;
    }
}
export function realpathSync(path) {
    try {
        return fs.realpathSync(path);
    }
    catch (error) {
        // We hit an error calling fs.realpathSync(). Since fs.realpathSync() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        fs.accessSync(normalizedPath, fs.constants.R_OK); // throws in case of an error
        return normalizedPath;
    }
}
function normalizePath(path) {
    return rtrim(normalize(path), sep);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9leHRwYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBRXhCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBRW5DOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxRQUFRLENBQUMsSUFBWSxFQUFFLEtBQXlCO0lBQ3JFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYiw0REFBNEQ7UUFDNUQsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDbEIsZ0JBQWdCO1FBQ2hCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHlDQUF5QyxJQUFJLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQzdGLElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcs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