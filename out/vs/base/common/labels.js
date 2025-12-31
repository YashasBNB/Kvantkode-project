/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hasDriveLetter, toSlashes } from './extpath.js';
import { posix, sep, win32 } from './path.js';
import { isMacintosh, isWindows, OS } from './platform.js';
import { extUri, extUriIgnorePathCase } from './resources.js';
import { rtrim, startsWithIgnoreCase } from './strings.js';
export function getPathLabel(resource, formatting) {
    const { os, tildify: tildifier, relative: relatifier } = formatting;
    // return early with a relative path if we can resolve one
    if (relatifier) {
        const relativePath = getRelativePathLabel(resource, relatifier, os);
        if (typeof relativePath === 'string') {
            return relativePath;
        }
    }
    // otherwise try to resolve a absolute path label and
    // apply target OS standard path separators if target
    // OS differs from actual OS we are running in
    let absolutePath = resource.fsPath;
    if (os === 1 /* OperatingSystem.Windows */ && !isWindows) {
        absolutePath = absolutePath.replace(/\//g, '\\');
    }
    else if (os !== 1 /* OperatingSystem.Windows */ && isWindows) {
        absolutePath = absolutePath.replace(/\\/g, '/');
    }
    // macOS/Linux: tildify with provided user home directory
    if (os !== 1 /* OperatingSystem.Windows */ && tildifier?.userHome) {
        const userHome = tildifier.userHome.fsPath;
        // This is a bit of a hack, but in order to figure out if the
        // resource is in the user home, we need to make sure to convert it
        // to a user home resource. We cannot assume that the resource is
        // already a user home resource.
        let userHomeCandidate;
        if (resource.scheme !== tildifier.userHome.scheme &&
            resource.path[0] === posix.sep &&
            resource.path[1] !== posix.sep) {
            userHomeCandidate = tildifier.userHome.with({ path: resource.path }).fsPath;
        }
        else {
            userHomeCandidate = absolutePath;
        }
        absolutePath = tildify(userHomeCandidate, userHome, os);
    }
    // normalize
    const pathLib = os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    return pathLib.normalize(normalizeDriveLetter(absolutePath, os === 1 /* OperatingSystem.Windows */));
}
function getRelativePathLabel(resource, relativePathProvider, os) {
    const pathLib = os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    const extUriLib = os === 3 /* OperatingSystem.Linux */ ? extUri : extUriIgnorePathCase;
    const workspace = relativePathProvider.getWorkspace();
    const firstFolder = workspace.folders.at(0);
    if (!firstFolder) {
        return undefined;
    }
    // This is a bit of a hack, but in order to figure out the folder
    // the resource belongs to, we need to make sure to convert it
    // to a workspace resource. We cannot assume that the resource is
    // already matching the workspace.
    if (resource.scheme !== firstFolder.uri.scheme &&
        resource.path[0] === posix.sep &&
        resource.path[1] !== posix.sep) {
        resource = firstFolder.uri.with({ path: resource.path });
    }
    const folder = relativePathProvider.getWorkspaceFolder(resource);
    if (!folder) {
        return undefined;
    }
    let relativePathLabel = undefined;
    if (extUriLib.isEqual(folder.uri, resource)) {
        relativePathLabel = ''; // no label if paths are identical
    }
    else {
        relativePathLabel = extUriLib.relativePath(folder.uri, resource) ?? '';
    }
    // normalize
    if (relativePathLabel) {
        relativePathLabel = pathLib.normalize(relativePathLabel);
    }
    // always show root basename if there are multiple folders
    if (workspace.folders.length > 1 && !relativePathProvider.noPrefix) {
        const rootName = folder.name ? folder.name : extUriLib.basenameOrAuthority(folder.uri);
        relativePathLabel = relativePathLabel ? `${rootName} • ${relativePathLabel}` : rootName;
    }
    return relativePathLabel;
}
export function normalizeDriveLetter(path, isWindowsOS = isWindows) {
    if (hasDriveLetter(path, isWindowsOS)) {
        return path.charAt(0).toUpperCase() + path.slice(1);
    }
    return path;
}
let normalizedUserHomeCached = Object.create(null);
export function tildify(path, userHome, os = OS) {
    if (os === 1 /* OperatingSystem.Windows */ || !path || !userHome) {
        return path; // unsupported on Windows
    }
    let normalizedUserHome = normalizedUserHomeCached.original === userHome ? normalizedUserHomeCached.normalized : undefined;
    if (!normalizedUserHome) {
        normalizedUserHome = userHome;
        if (isWindows) {
            normalizedUserHome = toSlashes(normalizedUserHome); // make sure that the path is POSIX normalized on Windows
        }
        normalizedUserHome = `${rtrim(normalizedUserHome, posix.sep)}${posix.sep}`;
        normalizedUserHomeCached = { original: userHome, normalized: normalizedUserHome };
    }
    let normalizedPath = path;
    if (isWindows) {
        normalizedPath = toSlashes(normalizedPath); // make sure that the path is POSIX normalized on Windows
    }
    // Linux: case sensitive, macOS: case insensitive
    if (os === 3 /* OperatingSystem.Linux */
        ? normalizedPath.startsWith(normalizedUserHome)
        : startsWithIgnoreCase(normalizedPath, normalizedUserHome)) {
        return `~/${normalizedPath.substr(normalizedUserHome.length)}`;
    }
    return path;
}
export function untildify(path, userHome) {
    return path.replace(/^~($|\/|\\)/, `${userHome}$1`);
}
/**
 * Shortens the paths but keeps them easy to distinguish.
 * Replaces not important parts with ellipsis.
 * Every shorten path matches only one original path and vice versa.
 *
 * Algorithm for shortening paths is as follows:
 * 1. For every path in list, find unique substring of that path.
 * 2. Unique substring along with ellipsis is shortened path of that path.
 * 3. To find unique substring of path, consider every segment of length from 1 to path.length of path from end of string
 *    and if present segment is not substring to any other paths then present segment is unique path,
 *    else check if it is not present as suffix of any other path and present segment is suffix of path itself,
 *    if it is true take present segment as unique path.
 * 4. Apply ellipsis to unique segment according to whether segment is present at start/in-between/end of path.
 *
 * Example 1
 * 1. consider 2 paths i.e. ['a\\b\\c\\d', 'a\\f\\b\\c\\d']
 * 2. find unique path of first path,
 * 	a. 'd' is present in path2 and is suffix of path2, hence not unique of present path.
 * 	b. 'c' is present in path2 and 'c' is not suffix of present path, similarly for 'b' and 'a' also.
 * 	c. 'd\\c' is suffix of path2.
 *  d. 'b\\c' is not suffix of present path.
 *  e. 'a\\b' is not present in path2, hence unique path is 'a\\b...'.
 * 3. for path2, 'f' is not present in path1 hence unique is '...\\f\\...'.
 *
 * Example 2
 * 1. consider 2 paths i.e. ['a\\b', 'a\\b\\c'].
 * 	a. Even if 'b' is present in path2, as 'b' is suffix of path1 and is not suffix of path2, unique path will be '...\\b'.
 * 2. for path2, 'c' is not present in path1 hence unique path is '..\\c'.
 */
const ellipsis = '\u2026';
const unc = '\\\\';
const home = '~';
export function shorten(paths, pathSeparator = sep) {
    const shortenedPaths = new Array(paths.length);
    // for every path
    let match = false;
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
        const originalPath = paths[pathIndex];
        if (originalPath === '') {
            shortenedPaths[pathIndex] = `.${pathSeparator}`;
            continue;
        }
        if (!originalPath) {
            shortenedPaths[pathIndex] = originalPath;
            continue;
        }
        match = true;
        // trim for now and concatenate unc path (e.g. \\network) or root path (/etc, ~/etc) later
        let prefix = '';
        let trimmedPath = originalPath;
        if (trimmedPath.indexOf(unc) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(unc) + unc.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(unc) + unc.length);
        }
        else if (trimmedPath.indexOf(pathSeparator) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(pathSeparator) + pathSeparator.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(pathSeparator) + pathSeparator.length);
        }
        else if (trimmedPath.indexOf(home) === 0) {
            prefix = trimmedPath.substr(0, trimmedPath.indexOf(home) + home.length);
            trimmedPath = trimmedPath.substr(trimmedPath.indexOf(home) + home.length);
        }
        // pick the first shortest subpath found
        const segments = trimmedPath.split(pathSeparator);
        for (let subpathLength = 1; match && subpathLength <= segments.length; subpathLength++) {
            for (let start = segments.length - subpathLength; match && start >= 0; start--) {
                match = false;
                let subpath = segments.slice(start, start + subpathLength).join(pathSeparator);
                // that is unique to any other path
                for (let otherPathIndex = 0; !match && otherPathIndex < paths.length; otherPathIndex++) {
                    // suffix subpath treated specially as we consider no match 'x' and 'x/...'
                    if (otherPathIndex !== pathIndex &&
                        paths[otherPathIndex] &&
                        paths[otherPathIndex].indexOf(subpath) > -1) {
                        const isSubpathEnding = start + subpathLength === segments.length;
                        // Adding separator as prefix for subpath, such that 'endsWith(src, trgt)' considers subpath as directory name instead of plain string.
                        // prefix is not added when either subpath is root directory or path[otherPathIndex] does not have multiple directories.
                        const subpathWithSep = start > 0 && paths[otherPathIndex].indexOf(pathSeparator) > -1
                            ? pathSeparator + subpath
                            : subpath;
                        const isOtherPathEnding = paths[otherPathIndex].endsWith(subpathWithSep);
                        match = !isSubpathEnding || isOtherPathEnding;
                    }
                }
                // found unique subpath
                if (!match) {
                    let result = '';
                    // preserve disk drive or root prefix
                    if (segments[0].endsWith(':') || prefix !== '') {
                        if (start === 1) {
                            // extend subpath to include disk drive prefix
                            start = 0;
                            subpathLength++;
                            subpath = segments[0] + pathSeparator + subpath;
                        }
                        if (start > 0) {
                            result = segments[0] + pathSeparator;
                        }
                        result = prefix + result;
                    }
                    // add ellipsis at the beginning if needed
                    if (start > 0) {
                        result = result + ellipsis + pathSeparator;
                    }
                    result = result + subpath;
                    // add ellipsis at the end if needed
                    if (start + subpathLength < segments.length) {
                        result = result + pathSeparator + ellipsis;
                    }
                    shortenedPaths[pathIndex] = result;
                }
            }
        }
        if (match) {
            shortenedPaths[pathIndex] = originalPath; // use original path if no unique subpaths found
        }
    }
    return shortenedPaths;
}
var Type;
(function (Type) {
    Type[Type["TEXT"] = 0] = "TEXT";
    Type[Type["VARIABLE"] = 1] = "VARIABLE";
    Type[Type["SEPARATOR"] = 2] = "SEPARATOR";
})(Type || (Type = {}));
/**
 * Helper to insert values for specific template variables into the string. E.g. "this $(is) a $(template)" can be
 * passed to this function together with an object that maps "is" and "template" to strings to have them replaced.
 * @param value string to which template is applied
 * @param values the values of the templates to use
 */
export function template(template, values = Object.create(null)) {
    const segments = [];
    let inVariable = false;
    let curVal = '';
    for (const char of template) {
        // Beginning of variable
        if (char === '$' || (inVariable && char === '{')) {
            if (curVal) {
                segments.push({ value: curVal, type: Type.TEXT });
            }
            curVal = '';
            inVariable = true;
        }
        // End of variable
        else if (char === '}' && inVariable) {
            const resolved = values[curVal];
            // Variable
            if (typeof resolved === 'string') {
                if (resolved.length) {
                    segments.push({ value: resolved, type: Type.VARIABLE });
                }
            }
            // Separator
            else if (resolved) {
                const prevSegment = segments[segments.length - 1];
                if (!prevSegment || prevSegment.type !== Type.SEPARATOR) {
                    segments.push({ value: resolved.label, type: Type.SEPARATOR }); // prevent duplicate separators
                }
            }
            curVal = '';
            inVariable = false;
        }
        // Text or Variable Name
        else {
            curVal += char;
        }
    }
    // Tail
    if (curVal && !inVariable) {
        segments.push({ value: curVal, type: Type.TEXT });
    }
    return segments
        .filter((segment, index) => {
        // Only keep separator if we have values to the left and right
        if (segment.type === Type.SEPARATOR) {
            const left = segments[index - 1];
            const right = segments[index + 1];
            return [left, right].every((segment) => segment &&
                (segment.type === Type.VARIABLE || segment.type === Type.TEXT) &&
                segment.value.length > 0);
        }
        // accept any TEXT and VARIABLE
        return true;
    })
        .map((segment) => segment.value)
        .join('');
}
/**
 * Handles mnemonics for menu items. Depending on OS:
 * - Windows: Supported via & character (replace && with &)
 * -   Linux: Supported via & character (replace && with &)
 * -   macOS: Unsupported (replace && with empty string)
 */
export function mnemonicMenuLabel(label, forceDisableMnemonics) {
    if (isMacintosh || forceDisableMnemonics) {
        return label.replace(/\(&&\w\)|&&/g, '').replace(/&/g, isMacintosh ? '&' : '&&');
    }
    return label.replace(/&&|&/g, (m) => (m === '&' ? '&&' : '&'));
}
export function mnemonicButtonLabel(label, forceDisableMnemonics) {
    const withoutMnemonic = label.replace(/\(&&\w\)|&&/g, '');
    if (forceDisableMnemonics) {
        return withoutMnemonic;
    }
    if (isMacintosh) {
        return { withMnemonic: withoutMnemonic, withoutMnemonic };
    }
    let withMnemonic;
    if (isWindows) {
        withMnemonic = label.replace(/&&|&/g, (m) => (m === '&' ? '&&' : '&'));
    }
    else {
        withMnemonic = label.replace(/&&/g, '_');
    }
    return { withMnemonic, withoutMnemonic };
}
export function unmnemonicLabel(label) {
    return label.replace(/&/g, '&&');
}
/**
 * Splits a recent label in name and parent path, supporting both '/' and '\' and workspace suffixes.
 * If the location is remote, the remote name is included in the name part.
 */
export function splitRecentLabel(recentLabel) {
    if (recentLabel.endsWith(']')) {
        // label with workspace suffix
        const lastIndexOfSquareBracket = recentLabel.lastIndexOf(' [', recentLabel.length - 2);
        if (lastIndexOfSquareBracket !== -1) {
            const split = splitName(recentLabel.substring(0, lastIndexOfSquareBracket));
            const remoteNameWithSpace = recentLabel.substring(lastIndexOfSquareBracket);
            return { name: split.name + remoteNameWithSpace, parentPath: split.parentPath };
        }
    }
    return splitName(recentLabel);
}
function splitName(fullPath) {
    const p = fullPath.indexOf('/') !== -1 ? posix : win32;
    const name = p.basename(fullPath);
    const parentPath = p.dirname(fullPath);
    if (name.length) {
        return { name, parentPath };
    }
    // only the root segment
    return { name: parentPath, parentPath: '' };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBbUIsRUFBRSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBd0MxRCxNQUFNLFVBQVUsWUFBWSxDQUFDLFFBQWEsRUFBRSxVQUFnQztJQUMzRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLFVBQVUsQ0FBQTtJQUVuRSwwREFBMEQ7SUFDMUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxZQUFZLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxxREFBcUQ7SUFDckQscURBQXFEO0lBQ3JELDhDQUE4QztJQUM5QyxJQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO0lBQ2xDLElBQUksRUFBRSxvQ0FBNEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xELFlB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