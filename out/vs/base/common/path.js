/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// NOTE: VSCode's copy of nodejs path library to be usable in common (non-node) namespace
// Copied from: https://github.com/nodejs/node/commits/v20.18.2/lib/path.js
// Excluding: the change that adds primordials
// (https://github.com/nodejs/node/commit/187a862d221dec42fa9a5c4214e7034d9092792f and others)
// Excluding: the change that adds glob matching
// (https://github.com/nodejs/node/commit/57b8b8e18e5e2007114c63b71bf0baedc01936a6)
/**
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as process from './process.js';
const CHAR_UPPERCASE_A = 65; /* A */
const CHAR_LOWERCASE_A = 97; /* a */
const CHAR_UPPERCASE_Z = 90; /* Z */
const CHAR_LOWERCASE_Z = 122; /* z */
const CHAR_DOT = 46; /* . */
const CHAR_FORWARD_SLASH = 47; /* / */
const CHAR_BACKWARD_SLASH = 92; /* \ */
const CHAR_COLON = 58; /* : */
const CHAR_QUESTION_MARK = 63; /* ? */
class ErrorInvalidArgType extends Error {
    constructor(name, expected, actual) {
        // determiner: 'must be' or 'must not be'
        let determiner;
        if (typeof expected === 'string' && expected.indexOf('not ') === 0) {
            determiner = 'must not be';
            expected = expected.replace(/^not /, '');
        }
        else {
            determiner = 'must be';
        }
        const type = name.indexOf('.') !== -1 ? 'property' : 'argument';
        let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
        msg += `. Received type ${typeof actual}`;
        super(msg);
        this.code = 'ERR_INVALID_ARG_TYPE';
    }
}
function validateObject(pathObject, name) {
    if (pathObject === null || typeof pathObject !== 'object') {
        throw new ErrorInvalidArgType(name, 'Object', pathObject);
    }
}
function validateString(value, name) {
    if (typeof value !== 'string') {
        throw new ErrorInvalidArgType(name, 'string', value);
    }
}
const platformIsWin32 = process.platform === 'win32';
function isPathSeparator(code) {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
    return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
    return ((code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) ||
        (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z));
}
// Resolves . and .. elements in a path with directory names
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = '';
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code = 0;
    for (let i = 0; i <= path.length; ++i) {
        if (i < path.length) {
            code = path.charCodeAt(i);
        }
        else if (isPathSeparator(code)) {
            break;
        }
        else {
            code = CHAR_FORWARD_SLASH;
        }
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {
                // NOOP
            }
            else if (dots === 2) {
                if (res.length < 2 ||
                    lastSegmentLength !== 2 ||
                    res.charCodeAt(res.length - 1) !== CHAR_DOT ||
                    res.charCodeAt(res.length - 2) !== CHAR_DOT) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = '';
                            lastSegmentLength = 0;
                        }
                        else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                    else if (res.length !== 0) {
                        res = '';
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    res += res.length > 0 ? `${separator}..` : '..';
                    lastSegmentLength = 2;
                }
            }
            else {
                if (res.length > 0) {
                    res += `${separator}${path.slice(lastSlash + 1, i)}`;
                }
                else {
                    res = path.slice(lastSlash + 1, i);
                }
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        }
        else if (code === CHAR_DOT && dots !== -1) {
            ++dots;
        }
        else {
            dots = -1;
        }
    }
    return res;
}
function formatExt(ext) {
    return ext ? `${ext[0] === '.' ? '' : '.'}${ext}` : '';
}
function _format(sep, pathObject) {
    validateObject(pathObject, 'pathObject');
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || `${pathObject.name || ''}${formatExt(pathObject.ext)}`;
    if (!dir) {
        return base;
    }
    return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep}${base}`;
}
export const win32 = {
    // path.resolve([from ...], to)
    resolve(...pathSegments) {
        let resolvedDevice = '';
        let resolvedTail = '';
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= -1; i--) {
            let path;
            if (i >= 0) {
                path = pathSegments[i];
                validateString(path, `paths[${i}]`);
                // Skip empty entries
                if (path.length === 0) {
                    continue;
                }
            }
            else if (resolvedDevice.length === 0) {
                path = process.cwd();
            }
            else {
                // Windows has the concept of drive-specific current working
                // directories. If we've resolved a drive letter but not yet an
                // absolute path, get cwd for that drive, or the process cwd if
                // the drive cwd is not available. We're sure the device is not
                // a UNC path at this points, because UNC paths are always absolute.
                path = process.env[`=${resolvedDevice}`] || process.cwd();
                // Verify that a cwd was found and that it actually points
                // to our drive. If not, default to the drive's root.
                if (path === undefined ||
                    (path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() &&
                        path.charCodeAt(2) === CHAR_BACKWARD_SLASH)) {
                    path = `${resolvedDevice}\\`;
                }
            }
            const len = path.length;
            let rootEnd = 0;
            let device = '';
            let isAbsolute = false;
            const code = path.charCodeAt(0);
            // Try to match a root
            if (len === 1) {
                if (isPathSeparator(code)) {
                    // `path` contains just a path separator
                    rootEnd = 1;
                    isAbsolute = true;
                }
            }
            else if (isPathSeparator(code)) {
                // Possible UNC root
                // If we started with a separator, we know we at least have an
                // absolute path of some kind (UNC or otherwise)
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    // Matched double path separator at beginning
                    let j = 2;
                    let last = j;
                    // Match 1 or more non-path separators
                    while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        // Matched!
                        last = j;
                        // Match 1 or more path separators
                        while (j < len && isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j < len && j !== last) {
                            // Matched!
                            last = j;
                            // Match 1 or more non-path separators
                            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                                j++;
                            }
                            if (j === len || j !== last) {
                                // We matched a UNC root
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                }
                else {
                    rootEnd = 1;
                }
            }
            else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
                // Possible device root
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
                    // Treat separator following drive name as an absolute path
                    // indicator
                    isAbsolute = true;
                    rootEnd = 3;
                }
            }
            if (device.length > 0) {
                if (resolvedDevice.length > 0) {
                    if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
                        // This path points to another device so it is not applicable
                        continue;
                    }
                }
                else {
                    resolvedDevice = device;
                }
            }
            if (resolvedAbsolute) {
                if (resolvedDevice.length > 0) {
                    break;
                }
            }
            else {
                resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
                resolvedAbsolute = isAbsolute;
                if (isAbsolute && resolvedDevice.length > 0) {
                    break;
                }
            }
        }
        // At this point the path should be resolved to a full absolute path,
        // but handle relative paths to be safe (might happen when process.cwd()
        // fails)
        // Normalize the tail path
        resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, '\\', isPathSeparator);
        return resolvedAbsolute
            ? `${resolvedDevice}\\${resolvedTail}`
            : `${resolvedDevice}${resolvedTail}` || '.';
    },
    normalize(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return '.';
        }
        let rootEnd = 0;
        let device;
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        // Try to match a root
        if (len === 1) {
            // `path` contains just a single char, exit early to avoid
            // unnecessary work
            return isPosixPathSeparator(code) ? '\\' : path;
        }
        if (isPathSeparator(code)) {
            // Possible UNC root
            // If we started with a separator, we know we at least have an absolute
            // path of some kind (UNC or otherwise)
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            // Return the normalized version of the UNC root since there
                            // is nothing left to process
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        }
                        if (j !== last) {
                            // We matched a UNC root with leftovers
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            }
            else {
                rootEnd = 1;
            }
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            // Possible device root
            device = path.slice(0, 2);
            rootEnd = 2;
            if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
                // Treat separator following drive name as an absolute path
                // indicator
                isAbsolute = true;
                rootEnd = 3;
            }
        }
        let tail = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute, '\\', isPathSeparator) : '';
        if (tail.length === 0 && !isAbsolute) {
            tail = '.';
        }
        if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
            tail += '\\';
        }
        if (!isAbsolute && device === undefined && path.includes(':')) {
            // If the original path was not absolute and if we have not been able to
            // resolve it relative to a particular device, we need to ensure that the
            // `tail` has not become something that Windows might interpret as an
            // absolute path. See CVE-2024-36139.
            if (tail.length >= 2 &&
                isWindowsDeviceRoot(tail.charCodeAt(0)) &&
                tail.charCodeAt(1) === CHAR_COLON) {
                return `.\\${tail}`;
            }
            let index = path.indexOf(':');
            do {
                if (index === len - 1 || isPathSeparator(path.charCodeAt(index + 1))) {
                    return `.\\${tail}`;
                }
            } while ((index = path.indexOf(':', index + 1)) !== -1);
        }
        if (device === undefined) {
            return isAbsolute ? `\\${tail}` : tail;
        }
        return isAbsolute ? `${device}\\${tail}` : `${device}${tail}`;
    },
    isAbsolute(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return false;
        }
        const code = path.charCodeAt(0);
        return (isPathSeparator(code) ||
            // Possible device root
            (len > 2 &&
                isWindowsDeviceRoot(code) &&
                path.charCodeAt(1) === CHAR_COLON &&
                isPathSeparator(path.charCodeAt(2))));
    },
    join(...paths) {
        if (paths.length === 0) {
            return '.';
        }
        let joined;
        let firstPart;
        for (let i = 0; i < paths.length; ++i) {
            const arg = paths[i];
            validateString(arg, 'path');
            if (arg.length > 0) {
                if (joined === undefined) {
                    joined = firstPart = arg;
                }
                else {
                    joined += `\\${arg}`;
                }
            }
        }
        if (joined === undefined) {
            return '.';
        }
        // Make sure that the joined path doesn't start with two slashes, because
        // normalize() will mistake it for a UNC path then.
        //
        // This step is skipped when it is very clear that the user actually
        // intended to point at a UNC path. This is assumed when the first
        // non-empty string arguments starts with exactly two slashes followed by
        // at least one more non-slash character.
        //
        // Note that for normalize() to treat a path as a UNC path it needs to
        // have at least 2 components, so we don't filter for that here.
        // This means that the user can use join to construct UNC paths from
        // a server name and a share name; for example:
        //   path.join('//server', 'share') -> '\\\\server\\share\\')
        let needsReplace = true;
        let slashCount = 0;
        if (typeof firstPart === 'string' && isPathSeparator(firstPart.charCodeAt(0))) {
            ++slashCount;
            const firstLen = firstPart.length;
            if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) {
                        ++slashCount;
                    }
                    else {
                        // We matched a UNC path in the first part
                        needsReplace = false;
                    }
                }
            }
        }
        if (needsReplace) {
            // Find any more consecutive slashes we need to replace
            while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
                slashCount++;
            }
            // Replace the slashes if needed
            if (slashCount >= 2) {
                joined = `\\${joined.slice(slashCount)}`;
            }
        }
        return win32.normalize(joined);
    },
    // It will solve the relative path from `from` to `to`, for instance:
    //  from = 'C:\\orandea\\test\\aaa'
    //  to = 'C:\\orandea\\impl\\bbb'
    // The output of the function should be: '..\\..\\impl\\bbb'
    relative(from, to) {
        validateString(from, 'from');
        validateString(to, 'to');
        if (from === to) {
            return '';
        }
        const fromOrig = win32.resolve(from);
        const toOrig = win32.resolve(to);
        if (fromOrig === toOrig) {
            return '';
        }
        from = fromOrig.toLowerCase();
        to = toOrig.toLowerCase();
        if (from === to) {
            return '';
        }
        if (fromOrig.length !== from.length || toOrig.length !== to.length) {
            const fromSplit = fromOrig.split('\\');
            const toSplit = toOrig.split('\\');
            if (fromSplit[fromSplit.length - 1] === '') {
                fromSplit.pop();
            }
            if (toSplit[toSplit.length - 1] === '') {
                toSplit.pop();
            }
            const fromLen = fromSplit.length;
            const toLen = toSplit.length;
            const length = fromLen < toLen ? fromLen : toLen;
            let i;
            for (i = 0; i < length; i++) {
                if (fromSplit[i].toLowerCase() !== toSplit[i].toLowerCase()) {
                    break;
                }
            }
            if (i === 0) {
                return toOrig;
            }
            else if (i === length) {
                if (toLen > length) {
                    return toSplit.slice(i).join('\\');
                }
                if (fromLen > length) {
                    return '..\\'.repeat(fromLen - 1 - i) + '..';
                }
                return '';
            }
            return '..\\'.repeat(fromLen - i) + toSplit.slice(i).join('\\');
        }
        // Trim any leading backslashes
        let fromStart = 0;
        while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
            fromStart++;
        }
        // Trim trailing backslashes (applicable to UNC paths only)
        let fromEnd = from.length;
        while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
            fromEnd--;
        }
        const fromLen = fromEnd - fromStart;
        // Trim any leading backslashes
        let toStart = 0;
        while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
            toStart++;
        }
        // Trim trailing backslashes (applicable to UNC paths only)
        let toEnd = to.length;
        while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
            toEnd--;
        }
        const toLen = toEnd - toStart;
        // Compare paths to find the longest common path from root
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
            const fromCode = from.charCodeAt(fromStart + i);
            if (fromCode !== to.charCodeAt(toStart + i)) {
                break;
            }
            else if (fromCode === CHAR_BACKWARD_SLASH) {
                lastCommonSep = i;
            }
        }
        // We found a mismatch before the first common path separator was seen, so
        // return the original `to`.
        if (i !== length) {
            if (lastCommonSep === -1) {
                return toOrig;
            }
        }
        else {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo\\bar\\baz'
                    return toOrig.slice(toStart + i + 1);
                }
                if (i === 2) {
                    // We get here if `from` is the device root.
                    // For example: from='C:\\'; to='C:\\foo'
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo'
                    lastCommonSep = i;
                }
                else if (i === 2) {
                    // We get here if `to` is the device root.
                    // For example: from='C:\\foo\\bar'; to='C:\\'
                    lastCommonSep = 3;
                }
            }
            if (lastCommonSep === -1) {
                lastCommonSep = 0;
            }
        }
        let out = '';
        // Generate the relative path based on the path difference between `to` and
        // `from`
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
                out += out.length === 0 ? '..' : '\\..';
            }
        }
        toStart += lastCommonSep;
        // Lastly, append the rest of the destination (`to`) path that comes after
        // the common path parts
        if (out.length > 0) {
            return `${out}${toOrig.slice(toStart, toEnd)}`;
        }
        if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
            ++toStart;
        }
        return toOrig.slice(toStart, toEnd);
    },
    toNamespacedPath(path) {
        // Note: this will *probably* throw somewhere.
        if (typeof path !== 'string' || path.length === 0) {
            return path;
        }
        const resolvedPath = win32.resolve(path);
        if (resolvedPath.length <= 2) {
            return path;
        }
        if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
            // Possible UNC root
            if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
                    // Matched non-long UNC root, convert the path to a long UNC path
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        }
        else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) &&
            resolvedPath.charCodeAt(1) === CHAR_COLON &&
            resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
            // Matched device root, convert the path to a long UNC path
            return `\\\\?\\${resolvedPath}`;
        }
        return resolvedPath;
    },
    dirname(path) {
        validateString(path, 'path');
        const len = path.length;
        if (len === 0) {
            return '.';
        }
        let rootEnd = -1;
        let offset = 0;
        const code = path.charCodeAt(0);
        if (len === 1) {
            // `path` contains just a path separator, exit early to avoid
            // unnecessary work or a dot.
            return isPathSeparator(code) ? path : '.';
        }
        // Try to match a root
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            return path;
                        }
                        if (j !== last) {
                            // We matched a UNC root with leftovers
                            // Offset by 1 to include the separator after the UNC root to
                            // treat it as a "normal root" on top of a (UNC) root
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
            // Possible device root
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
            offset = rootEnd;
        }
        let end = -1;
        let matchedSlash = true;
        for (let i = len - 1; i >= offset; --i) {
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    end = i;
                    break;
                }
            }
            else {
                // We saw the first non-path separator
                matchedSlash = false;
            }
        }
        if (end === -1) {
            if (rootEnd === -1) {
                return '.';
            }
            end = rootEnd;
        }
        return path.slice(0, end);
    },
    basename(path, suffix) {
        if (suffix !== undefined) {
            validateString(suffix, 'suffix');
        }
        validateString(path, 'path');
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        // Check for a drive letter prefix so as not to mistake the following
        // path separator as an extra separator at the end of the path that can be
        // disregarded
        if (path.length >= 2 &&
            isWindowsDeviceRoot(path.charCodeAt(0)) &&
            path.charCodeAt(1) === CHAR_COLON) {
            start = 2;
        }
        if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
            if (suffix === path) {
                return '';
            }
            let extIdx = suffix.length - 1;
            let firstNonSlashEnd = -1;
            for (i = path.length - 1; i >= start; --i) {
                const code = path.charCodeAt(i);
                if (isPathSeparator(code)) {
                    // If we reached a path separator that was not part of a set of path
                    // separators at the end of the string, stop now
                    if (!matchedSlash) {
                        start = i + 1;
                        break;
                    }
                }
                else {
                    if (firstNonSlashEnd === -1) {
                        // We saw the first non-path separator, remember this index in case
                        // we need it if the extension ends up not matching
                        matchedSlash = false;
                        firstNonSlashEnd = i + 1;
                    }
                    if (extIdx >= 0) {
                        // Try to match the explicit extension
                        if (code === suffix.charCodeAt(extIdx)) {
                            if (--extIdx === -1) {
                                // We matched the extension, so mark this as the end of our path
                                // component
                                end = i;
                            }
                        }
                        else {
                            // Extension does not match, so our result is the entire path
                            // component
                            extIdx = -1;
                            end = firstNonSlashEnd;
                        }
                    }
                }
            }
            if (start === end) {
                end = firstNonSlashEnd;
            }
            else if (end === -1) {
                end = path.length;
            }
            return path.slice(start, end);
        }
        for (i = path.length - 1; i >= start; --i) {
            if (isPathSeparator(path.charCodeAt(i))) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            }
            else if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // path component
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) {
            return '';
        }
        return path.slice(start, end);
    },
    extname(path) {
        validateString(path, 'path');
        let start = 0;
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Check for a drive letter prefix so as not to mistake the following
        // path separator as an extra separator at the end of the path that can be
        // disregarded
        if (path.length >= 2 &&
            path.charCodeAt(1) === CHAR_COLON &&
            isWindowsDeviceRoot(path.charCodeAt(0))) {
            start = startPart = 2;
        }
        for (let i = path.length - 1; i >= start; --i) {
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (startDot === -1 ||
            end === -1 ||
            // We saw a non-dot character immediately before the dot
            preDotState === 0 ||
            // The (right-most) trimmed path component is exactly '..'
            (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
            return '';
        }
        return path.slice(startDot, end);
    },
    format: _format.bind(null, '\\'),
    parse(path) {
        validateString(path, 'path');
        const ret = { root: '', dir: '', base: '', ext: '', name: '' };
        if (path.length === 0) {
            return ret;
        }
        const len = path.length;
        let rootEnd = 0;
        let code = path.charCodeAt(0);
        if (len === 1) {
            if (isPathSeparator(code)) {
                // `path` contains just a path separator, exit early to avoid
                // unnecessary work
                ret.root = ret.dir = path;
                return ret;
            }
            ret.base = ret.name = path;
            return ret;
        }
        // Try to match a root
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    while (j < len && isPathSeparator(path.charCodeAt(j))) {
                        j++;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                            j++;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            rootEnd = j;
                        }
                        else if (j !== last) {
                            // We matched a UNC root with leftovers
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        }
        else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            // Possible device root
            if (len <= 2) {
                // `path` contains just a drive root, exit early to avoid
                // unnecessary work
                ret.root = ret.dir = path;
                return ret;
            }
            rootEnd = 2;
            if (isPathSeparator(path.charCodeAt(2))) {
                if (len === 3) {
                    // `path` contains just a drive root, exit early to avoid
                    // unnecessary work
                    ret.root = ret.dir = path;
                    return ret;
                }
                rootEnd = 3;
            }
        }
        if (rootEnd > 0) {
            ret.root = path.slice(0, rootEnd);
        }
        let startDot = -1;
        let startPart = rootEnd;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Get non-dir info
        for (; i >= rootEnd; --i) {
            code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (end !== -1) {
            if (startDot === -1 ||
                // We saw a non-dot character immediately before the dot
                preDotState === 0 ||
                // The (right-most) trimmed path component is exactly '..'
                (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
                ret.base = ret.name = path.slice(startPart, end);
            }
            else {
                ret.name = path.slice(startPart, startDot);
                ret.base = path.slice(startPart, end);
                ret.ext = path.slice(startDot, end);
            }
        }
        // If the directory is the root, use the entire root as the `dir` including
        // the trailing slash if any (`C:\abc` -> `C:\`). Otherwise, strip out the
        // trailing slash (`C:\abc\def` -> `C:\abc`).
        if (startPart > 0 && startPart !== rootEnd) {
            ret.dir = path.slice(0, startPart - 1);
        }
        else {
            ret.dir = ret.root;
        }
        return ret;
    },
    sep: '\\',
    delimiter: ';',
    win32: null,
    posix: null,
};
const posixCwd = (() => {
    if (platformIsWin32) {
        // Converts Windows' backslash path separators to POSIX forward slashes
        // and truncates any drive indicator
        const regexp = /\\/g;
        return () => {
            const cwd = process.cwd().replace(regexp, '/');
            return cwd.slice(cwd.indexOf('/'));
        };
    }
    // We're already on POSIX, no need for any transformations
    return () => process.cwd();
})();
export const posix = {
    // path.resolve([from ...], to)
    resolve(...pathSegments) {
        let resolvedPath = '';
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
            const path = pathSegments[i];
            validateString(path, `paths[${i}]`);
            // Skip empty entries
            if (path.length === 0) {
                continue;
            }
            resolvedPath = `${path}/${resolvedPath}`;
            resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        if (!resolvedAbsolute) {
            const cwd = posixCwd();
            resolvedPath = `${cwd}/${resolvedPath}`;
            resolvedAbsolute = cwd.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        // Normalize the path
        resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, '/', isPosixPathSeparator);
        if (resolvedAbsolute) {
            return `/${resolvedPath}`;
        }
        return resolvedPath.length > 0 ? resolvedPath : '.';
    },
    normalize(path) {
        validateString(path, 'path');
        if (path.length === 0) {
            return '.';
        }
        const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
        // Normalize the path
        path = normalizeString(path, !isAbsolute, '/', isPosixPathSeparator);
        if (path.length === 0) {
            if (isAbsolute) {
                return '/';
            }
            return trailingSeparator ? './' : '.';
        }
        if (trailingSeparator) {
            path += '/';
        }
        return isAbsolute ? `/${path}` : path;
    },
    isAbsolute(path) {
        validateString(path, 'path');
        return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    },
    join(...paths) {
        if (paths.length === 0) {
            return '.';
        }
        const path = [];
        for (let i = 0; i < paths.length; ++i) {
            const arg = paths[i];
            validateString(arg, 'path');
            if (arg.length > 0) {
                path.push(arg);
            }
        }
        if (path.length === 0) {
            return '.';
        }
        return posix.normalize(path.join('/'));
    },
    relative(from, to) {
        validateString(from, 'from');
        validateString(to, 'to');
        if (from === to) {
            return '';
        }
        // Trim leading forward slashes.
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to) {
            return '';
        }
        const fromStart = 1;
        const fromEnd = from.length;
        const fromLen = fromEnd - fromStart;
        const toStart = 1;
        const toLen = to.length - toStart;
        // Compare paths to find the longest common path from root
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
            const fromCode = from.charCodeAt(fromStart + i);
            if (fromCode !== to.charCodeAt(toStart + i)) {
                break;
            }
            else if (fromCode === CHAR_FORWARD_SLASH) {
                lastCommonSep = i;
            }
        }
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='/foo/bar'; to='/foo/bar/baz'
                    return to.slice(toStart + i + 1);
                }
                if (i === 0) {
                    // We get here if `from` is the root
                    // For example: from='/'; to='/foo'
                    return to.slice(toStart + i);
                }
            }
            else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='/foo/bar/baz'; to='/foo/bar'
                    lastCommonSep = i;
                }
                else if (i === 0) {
                    // We get here if `to` is the root.
                    // For example: from='/foo/bar'; to='/'
                    lastCommonSep = 0;
                }
            }
        }
        let out = '';
        // Generate the relative path based on the path difference between `to`
        // and `from`.
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                out += out.length === 0 ? '..' : '/..';
            }
        }
        // Lastly, append the rest of the destination (`to`) path that comes after
        // the common path parts.
        return `${out}${to.slice(toStart + lastCommonSep)}`;
    },
    toNamespacedPath(path) {
        // Non-op on posix systems
        return path;
    },
    dirname(path) {
        validateString(path, 'path');
        if (path.length === 0) {
            return '.';
        }
        const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let end = -1;
        let matchedSlash = true;
        for (let i = path.length - 1; i >= 1; --i) {
            if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                if (!matchedSlash) {
                    end = i;
                    break;
                }
            }
            else {
                // We saw the first non-path separator
                matchedSlash = false;
            }
        }
        if (end === -1) {
            return hasRoot ? '/' : '.';
        }
        if (hasRoot && end === 1) {
            return '//';
        }
        return path.slice(0, end);
    },
    basename(path, suffix) {
        if (suffix !== undefined) {
            validateString(suffix, 'suffix');
        }
        validateString(path, 'path');
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
            if (suffix === path) {
                return '';
            }
            let extIdx = suffix.length - 1;
            let firstNonSlashEnd = -1;
            for (i = path.length - 1; i >= 0; --i) {
                const code = path.charCodeAt(i);
                if (code === CHAR_FORWARD_SLASH) {
                    // If we reached a path separator that was not part of a set of path
                    // separators at the end of the string, stop now
                    if (!matchedSlash) {
                        start = i + 1;
                        break;
                    }
                }
                else {
                    if (firstNonSlashEnd === -1) {
                        // We saw the first non-path separator, remember this index in case
                        // we need it if the extension ends up not matching
                        matchedSlash = false;
                        firstNonSlashEnd = i + 1;
                    }
                    if (extIdx >= 0) {
                        // Try to match the explicit extension
                        if (code === suffix.charCodeAt(extIdx)) {
                            if (--extIdx === -1) {
                                // We matched the extension, so mark this as the end of our path
                                // component
                                end = i;
                            }
                        }
                        else {
                            // Extension does not match, so our result is the entire path
                            // component
                            extIdx = -1;
                            end = firstNonSlashEnd;
                        }
                    }
                }
            }
            if (start === end) {
                end = firstNonSlashEnd;
            }
            else if (end === -1) {
                end = path.length;
            }
            return path.slice(start, end);
        }
        for (i = path.length - 1; i >= 0; --i) {
            if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            }
            else if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // path component
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) {
            return '';
        }
        return path.slice(start, end);
    },
    extname(path) {
        validateString(path, 'path');
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        for (let i = path.length - 1; i >= 0; --i) {
            const char = path[i];
            if (char === '/') {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (char === '.') {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (startDot === -1 ||
            end === -1 ||
            // We saw a non-dot character immediately before the dot
            preDotState === 0 ||
            // The (right-most) trimmed path component is exactly '..'
            (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
            return '';
        }
        return path.slice(startDot, end);
    },
    format: _format.bind(null, '/'),
    parse(path) {
        validateString(path, 'path');
        const ret = { root: '', dir: '', base: '', ext: '', name: '' };
        if (path.length === 0) {
            return ret;
        }
        const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let start;
        if (isAbsolute) {
            ret.root = '/';
            start = 1;
        }
        else {
            start = 0;
        }
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        // Get non-dir info
        for (; i >= start; --i) {
            const code = path.charCodeAt(i);
            if (code === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    startPart = i + 1;
                    break;
                }
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // If this is our first dot, mark it as the start of our extension
                if (startDot === -1) {
                    startDot = i;
                }
                else if (preDotState !== 1) {
                    preDotState = 1;
                }
            }
            else if (startDot !== -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (end !== -1) {
            const start = startPart === 0 && isAbsolute ? 1 : startPart;
            if (startDot === -1 ||
                // We saw a non-dot character immediately before the dot
                preDotState === 0 ||
                // The (right-most) trimmed path component is exactly '..'
                (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
                ret.base = ret.name = path.slice(start, end);
            }
            else {
                ret.name = path.slice(start, startDot);
                ret.base = path.slice(start, end);
                ret.ext = path.slice(startDot, end);
            }
        }
        if (startPart > 0) {
            ret.dir = path.slice(0, startPart - 1);
        }
        else if (isAbsolute) {
            ret.dir = '/';
        }
        return ret;
    },
    sep: '/',
    delimiter: ':',
    win32: null,
    posix: null,
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
export const normalize = platformIsWin32 ? win32.normalize : posix.normalize;
export const isAbsolute = platformIsWin32 ? win32.isAbsolute : posix.isAbsolute;
export const join = platformIsWin32 ? win32.join : posix.join;
export const resolve = platformIsWin32 ? win32.resolve : posix.resolve;
export const relative = platformIsWin32 ? win32.relative : posix.relative;
export const dirname = platformIsWin32 ? win32.dirname : posix.dirname;
export const basename = platformIsWin32 ? win32.basename : posix.basename;
export const extname = platformIsWin32 ? win32.extname : posix.extname;
export const format = platformIsWin32 ? win32.format : posix.format;
export const parse = platformIsWin32 ? win32.parse : posix.parse;
export const toNamespacedPath = platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath;
export const sep = platformIsWin32 ? win32.sep : posix.sep;
export const delimiter = platformIsWin32 ? win32.delimiter : posix.delimiter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3BhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcseUZBQXlGO0FBQ3pGLDJFQUEyRTtBQUMzRSw4Q0FBOEM7QUFDOUMsOEZBQThGO0FBQzlGLGdEQUFnRDtBQUNoRCxtRkFBbUY7QUFFbkY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUVILE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBRXZDLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFBLENBQUMsT0FBTztBQUNuQyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQSxDQUFDLE9BQU87QUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUEsQ0FBQyxPQUFPO0FBQ25DLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFBLENBQUMsT0FBTztBQUNwQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUEsQ0FBQyxPQUFPO0FBQzNCLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFBLENBQUMsT0FBTztBQUNyQyxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQSxDQUFDLE9BQU87QUFDdEMsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFBLENBQUMsT0FBTztBQUM3QixNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQSxDQUFDLE9BQU87QUFFckMsTUFBTSxtQkFBb0IsU0FBUSxLQUFLO0lBRXRDLFlBQVksSUFBWSxFQUFFLFFBQWdCLEVBQUUsTUFBZTtRQUMxRCx5Q0FBeUM7UUFDekMsSUFBSSxVQUFVLENBQUE7UUFDZCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BFLFVBQVUsR0FBRyxhQUFhLENB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