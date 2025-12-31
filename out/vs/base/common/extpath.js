/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isAbsolute, join, normalize, posix, sep } from './path.js';
import { isWindows } from './platform.js';
import { equalsIgnoreCase, rtrim, startsWithIgnoreCase } from './strings.js';
import { isNumber } from './types.js';
export function isPathSeparator(code) {
    return code === 47 /* CharCode.Slash */ || code === 92 /* CharCode.Backslash */;
}
/**
 * Takes a Windows OS path and changes backward slashes to forward slashes.
 * This should only be done for OS paths from Windows (or user provided paths potentially from Windows).
 * Using it on a Linux or MaxOS path might change it.
 */
export function toSlashes(osPath) {
    return osPath.replace(/[\\/]/g, posix.sep);
}
/**
 * Takes a Windows OS path (using backward or forward slashes) and turns it into a posix path:
 * - turns backward slashes into forward slashes
 * - makes it absolute if it starts with a drive letter
 * This should only be done for OS paths from Windows (or user provided paths potentially from Windows).
 * Using it on a Linux or MaxOS path might change it.
 */
export function toPosixPath(osPath) {
    if (osPath.indexOf('/') === -1) {
        osPath = toSlashes(osPath);
    }
    if (/^[a-zA-Z]:(\/|$)/.test(osPath)) {
        // starts with a drive letter
        osPath = '/' + osPath;
    }
    return osPath;
}
/**
 * Computes the _root_ this path, like `getRoot('c:\files') === c:\`,
 * `getRoot('files:///files/path') === files:///`,
 * or `getRoot('\\server\shares\path') === \\server\shares\`
 */
export function getRoot(path, sep = posix.sep) {
    if (!path) {
        return '';
    }
    const len = path.length;
    const firstLetter = path.charCodeAt(0);
    if (isPathSeparator(firstLetter)) {
        if (isPathSeparator(path.charCodeAt(1))) {
            // UNC candidate \\localhost\shares\ddd
            //               ^^^^^^^^^^^^^^^^^^^
            if (!isPathSeparator(path.charCodeAt(2))) {
                let pos = 3;
                const start = pos;
                for (; pos < len; pos++) {
                    if (isPathSeparator(path.charCodeAt(pos))) {
                        break;
                    }
                }
                if (start !== pos && !isPathSeparator(path.charCodeAt(pos + 1))) {
                    pos += 1;
                    for (; pos < len; pos++) {
                        if (isPathSeparator(path.charCodeAt(pos))) {
                            return path
                                .slice(0, pos + 1) // consume this separator
                                .replace(/[\\/]/g, sep);
                        }
                    }
                }
            }
        }
        // /user/far
        // ^
        return sep;
    }
    else if (isWindowsDriveLetter(firstLetter)) {
        // check for windows drive letter c:\ or c:
        if (path.charCodeAt(1) === 58 /* CharCode.Colon */) {
            if (isPathSeparator(path.charCodeAt(2))) {
                // C:\fff
                // ^^^
                return path.slice(0, 2) + sep;
            }
            else {
                // C:
                // ^^
                return path.slice(0, 2);
            }
        }
    }
    // check for URI
    // scheme://authority/path
    // ^^^^^^^^^^^^^^^^^^^
    let pos = path.indexOf('://');
    if (pos !== -1) {
        pos += 3; // 3 -> "://".length
        for (; pos < len; pos++) {
            if (isPathSeparator(path.charCodeAt(pos))) {
                return path.slice(0, pos + 1); // consume this separator
            }
        }
    }
    return '';
}
/**
 * Check if the path follows this pattern: `\\hostname\sharename`.
 *
 * @see https://msdn.microsoft.com/en-us/library/gg465305.aspx
 * @return A boolean indication if the path is a UNC path, on none-windows
 * always false.
 */
export function isUNC(path) {
    if (!isWindows) {
        // UNC is a windows concept
        return false;
    }
    if (!path || path.length < 5) {
        // at least \\a\b
        return false;
    }
    let code = path.charCodeAt(0);
    if (code !== 92 /* CharCode.Backslash */) {
        return false;
    }
    code = path.charCodeAt(1);
    if (code !== 92 /* CharCode.Backslash */) {
        return false;
    }
    let pos = 2;
    const start = pos;
    for (; pos < path.length; pos++) {
        code = path.charCodeAt(pos);
        if (code === 92 /* CharCode.Backslash */) {
            break;
        }
    }
    if (start === pos) {
        return false;
    }
    code = path.charCodeAt(pos + 1);
    if (isNaN(code) || code === 92 /* CharCode.Backslash */) {
        return false;
    }
    return true;
}
// Reference: https://en.wikipedia.org/wiki/Filename
const WINDOWS_INVALID_FILE_CHARS = /[\\/:\*\?"<>\|]/g;
const UNIX_INVALID_FILE_CHARS = /[/]/g;
const WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])(\.(.*?))?$/i;
export function isValidBasename(name, isWindowsOS = isWindows) {
    const invalidFileChars = isWindowsOS ? WINDOWS_INVALID_FILE_CHARS : UNIX_INVALID_FILE_CHARS;
    if (!name || name.length === 0 || /^\s+$/.test(name)) {
        return false; // require a name that is not just whitespace
    }
    invalidFileChars.lastIndex = 0; // the holy grail of software development
    if (invalidFileChars.test(name)) {
        return false; // check for certain invalid file characters
    }
    if (isWindowsOS && WINDOWS_FORBIDDEN_NAMES.test(name)) {
        return false; // check for certain invalid file names
    }
    if (name === '.' || name === '..') {
        return false; // check for reserved values
    }
    if (isWindowsOS && name[name.length - 1] === '.') {
        return false; // Windows: file cannot end with a "."
    }
    if (isWindowsOS && name.length !== name.trim().length) {
        return false; // Windows: file cannot end with a whitespace
    }
    if (name.length > 255) {
        return false; // most file systems do not allow files > 255 length
    }
    return true;
}
/**
 * @deprecated please use `IUriIdentityService.extUri.isEqual` instead. If you are
 * in a context without services, consider to pass down the `extUri` from the outside
 * or use `extUriBiasedIgnorePathCase` if you know what you are doing.
 */
export function isEqual(pathA, pathB, ignoreCase) {
    const identityEquals = pathA === pathB;
    if (!ignoreCase || identityEquals) {
        return identityEquals;
    }
    if (!pathA || !pathB) {
        return false;
    }
    return equalsIgnoreCase(pathA, pathB);
}
/**
 * @deprecated please use `IUriIdentityService.extUri.isEqualOrParent` instead. If
 * you are in a context without services, consider to pass down the `extUri` from the
 * outside, or use `extUriBiasedIgnorePathCase` if you know what you are doing.
 */
export function isEqualOrParent(base, parentCandidate, ignoreCase, separator = sep) {
    if (base === parentCandidate) {
        return true;
    }
    if (!base || !parentCandidate) {
        return false;
    }
    if (parentCandidate.length > base.length) {
        return false;
    }
    if (ignoreCase) {
        const beginsWith = startsWithIgnoreCase(base, parentCandidate);
        if (!beginsWith) {
            return false;
        }
        if (parentCandidate.length === base.length) {
            return true; // same path, different casing
        }
        let sepOffset = parentCandidate.length;
        if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
            sepOffset--; // adjust the expected sep offset in case our candidate already ends in separator character
        }
        return base.charAt(sepOffset) === separator;
    }
    if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
        parentCandidate += separator;
    }
    return base.indexOf(parentCandidate) === 0;
}
export function isWindowsDriveLetter(char0) {
    return ((char0 >= 65 /* CharCode.A */ && char0 <= 90 /* CharCode.Z */) || (char0 >= 97 /* CharCode.a */ && char0 <= 122 /* CharCode.z */));
}
export function sanitizeFilePath(candidate, cwd) {
    // Special case: allow to open a drive letter without trailing backslash
    if (isWindows && candidate.endsWith(':')) {
        candidate += sep;
    }
    // Ensure absolute
    if (!isAbsolute(candidate)) {
        candidate = join(cwd, candidate);
    }
    // Ensure normalized
    candidate = normalize(candidate);
    // Ensure no trailing slash/backslash
    return removeTrailingPathSeparator(candidate);
}
export function removeTrailingPathSeparator(candidate) {
    if (isWindows) {
        candidate = rtrim(candidate, sep);
        // Special case: allow to open drive root ('C:\')
        if (candidate.endsWith(':')) {
            candidate += sep;
        }
    }
    else {
        candidate = rtrim(candidate, sep);
        // Special case: allow to open root ('/')
        if (!candidate) {
            candidate = sep;
        }
    }
    return candidate;
}
export function isRootOrDriveLetter(path) {
    const pathNormalized = normalize(path);
    if (isWindows) {
        if (path.length > 3) {
            return false;
        }
        return (hasDriveLetter(pathNormalized) &&
            (path.length === 2 || pathNormalized.charCodeAt(2) === 92 /* CharCode.Backslash */));
    }
    return pathNormalized === posix.sep;
}
export function hasDriveLetter(path, isWindowsOS = isWindows) {
    if (isWindowsOS) {
        return isWindowsDriveLetter(path.charCodeAt(0)) && path.charCodeAt(1) === 58 /* CharCode.Colon */;
    }
    return false;
}
export function getDriveLetter(path, isWindowsOS = isWindows) {
    return hasDriveLetter(path, isWindowsOS) ? path[0] : undefined;
}
export function indexOfPath(path, candidate, ignoreCase) {
    if (candidate.length > path.length) {
        return -1;
    }
    if (path === candidate) {
        return 0;
    }
    if (ignoreCase) {
        path = path.toLowerCase();
        candidate = candidate.toLowerCase();
    }
    return path.indexOf(candidate);
}
export function parseLineAndColumnAware(rawPath) {
    const segments = rawPath.split(':'); // C:\file.txt:<line>:<column>
    let path = undefined;
    let line = undefined;
    let column = undefined;
    for (const segment of segments) {
        const segmentAsNumber = Number(segment);
        if (!isNumber(segmentAsNumber)) {
            path = !!path ? [path, segment].join(':') : segment; // a colon can well be part of a path (e.g. C:\...)
        }
        else if (line === undefined) {
            line = segmentAsNumber;
        }
        else if (column === undefined) {
            column = segmentAsNumber;
        }
    }
    if (!path) {
        throw new Error('Format for `--goto` should be: `FILE:LINE(:COLUMN)`');
    }
    return {
        path,
        line: line !== undefined ? line : undefined,
        column: column !== undefined ? column : line !== undefined ? 1 : undefined, // if we have a line, make sure column is also set
    };
}
const pathChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const windowsSafePathFirstChars = 'BDEFGHIJKMOQRSTUVWXYZbdefghijkmoqrstuvwxyz0123456789';
export function randomPath(parent, prefix, randomLength = 8) {
    let suffix = '';
    for (let i = 0; i < randomLength; i++) {
        let pathCharsTouse;
        if (i === 0 && isWindows && !prefix && (randomLength === 3 || randomLength === 4)) {
            // Windows has certain reserved file names that cannot be used, such
            // as AUX, CON, PRN, etc. We want to avoid generating a random name
            // that matches that pattern, so we use a different set of characters
            // for the first character of the name that does not include any of
            // the reserved names first characters.
            pathCharsTouse = windowsSafePathFirstChars;
        }
        else {
            pathCharsTouse = pathChars;
        }
        suffix += pathCharsTouse.charAt(Math.floor(Math.random() * pathCharsTouse.length));
    }
    let randomFileName;
    if (prefix) {
        randomFileName = `${prefix}-${suffix}`;
    }
    else {
        randomFileName = suffix;
    }
    if (parent) {
        return join(parent, randomFileName);
    }
    return randomFileName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2V4dHBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFckMsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFZO0lBQzNDLE9BQU8sSUFBSSw0QkFBbUIsSUFBSSxJQUFJLGdDQUF1QixDQUFBO0FBQzlELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFNBQVMsQ0FBQyxNQUFjO0lBQ3ZDLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQzNDLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWM7SUFDekMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNyQyw2QkFBNkI7UUFDN0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUE7SUFDdEIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFB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