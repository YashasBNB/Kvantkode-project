/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extpath from './extpath.js';
import { Schemas } from './network.js';
import * as paths from './path.js';
import { isLinux, isWindows } from './platform.js';
import { compare as strCompare, equalsIgnoreCase } from './strings.js';
import { URI, uriToFsPath } from './uri.js';
export function originalFSPath(uri) {
    return uriToFsPath(uri, true);
}
export class ExtUri {
    constructor(_ignorePathCasing) {
        this._ignorePathCasing = _ignorePathCasing;
    }
    compare(uri1, uri2, ignoreFragment = false) {
        if (uri1 === uri2) {
            return 0;
        }
        return strCompare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
    }
    isEqual(uri1, uri2, ignoreFragment = false) {
        if (uri1 === uri2) {
            return true;
        }
        if (!uri1 || !uri2) {
            return false;
        }
        return (this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment));
    }
    getComparisonKey(uri, ignoreFragment = false) {
        return uri
            .with({
            path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : undefined,
            fragment: ignoreFragment ? null : undefined,
        })
            .toString();
    }
    ignorePathCasing(uri) {
        return this._ignorePathCasing(uri);
    }
    isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
        if (base.scheme === parentCandidate.scheme) {
            if (base.scheme === Schemas.file) {
                return (extpath.isEqualOrParent(originalFSPath(base), originalFSPath(parentCandidate), this._ignorePathCasing(base)) &&
                    base.query === parentCandidate.query &&
                    (ignoreFragment || base.fragment === parentCandidate.fragment));
            }
            if (isEqualAuthority(base.authority, parentCandidate.authority)) {
                return (extpath.isEqualOrParent(base.path, parentCandidate.path, this._ignorePathCasing(base), '/') &&
                    base.query === parentCandidate.query &&
                    (ignoreFragment || base.fragment === parentCandidate.fragment));
            }
        }
        return false;
    }
    // --- path math
    joinPath(resource, ...pathFragment) {
        return URI.joinPath(resource, ...pathFragment);
    }
    basenameOrAuthority(resource) {
        return basename(resource) || resource.authority;
    }
    basename(resource) {
        return paths.posix.basename(resource.path);
    }
    extname(resource) {
        return paths.posix.extname(resource.path);
    }
    dirname(resource) {
        if (resource.path.length === 0) {
            return resource;
        }
        let dirname;
        if (resource.scheme === Schemas.file) {
            dirname = URI.file(paths.dirname(originalFSPath(resource))).path;
        }
        else {
            dirname = paths.posix.dirname(resource.path);
            if (resource.authority && dirname.length && dirname.charCodeAt(0) !== 47 /* CharCode.Slash */) {
                console.error(`dirname("${resource.toString})) resulted in a relative path`);
                dirname = '/'; // If a URI contains an authority component, then the path component must either be empty or begin with a CharCode.Slash ("/") character
            }
        }
        return resource.with({
            path: dirname,
        });
    }
    normalizePath(resource) {
        if (!resource.path.length) {
            return resource;
        }
        let normalizedPath;
        if (resource.scheme === Schemas.file) {
            normalizedPath = URI.file(paths.normalize(originalFSPath(resource))).path;
        }
        else {
            normalizedPath = paths.posix.normalize(resource.path);
        }
        return resource.with({
            path: normalizedPath,
        });
    }
    relativePath(from, to) {
        if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
            return undefined;
        }
        if (from.scheme === Schemas.file) {
            const relativePath = paths.relative(originalFSPath(from), originalFSPath(to));
            return isWindows ? extpath.toSlashes(relativePath) : relativePath;
        }
        let fromPath = from.path || '/';
        const toPath = to.path || '/';
        if (this._ignorePathCasing(from)) {
            // make casing of fromPath match toPath
            let i = 0;
            for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
                if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
                    if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
                        break;
                    }
                }
            }
            fromPath = toPath.substr(0, i) + fromPath.substr(i);
        }
        return paths.posix.relative(fromPath, toPath);
    }
    resolvePath(base, path) {
        if (base.scheme === Schemas.file) {
            const newURI = URI.file(paths.resolve(originalFSPath(base), path));
            return base.with({
                authority: newURI.authority,
                path: newURI.path,
            });
        }
        path = extpath.toPosixPath(path); // we allow path to be a windows path
        return base.with({
            path: paths.posix.resolve(base.path, path),
        });
    }
    // --- misc
    isAbsolutePath(resource) {
        return !!resource.path && resource.path[0] === '/';
    }
    isEqualAuthority(a1, a2) {
        return a1 === a2 || (a1 !== undefined && a2 !== undefined && equalsIgnoreCase(a1, a2));
    }
    hasTrailingPathSeparator(resource, sep = paths.sep) {
        if (resource.scheme === Schemas.file) {
            const fsp = originalFSPath(resource);
            return fsp.length > extpath.getRoot(fsp).length && fsp[fsp.length - 1] === sep;
        }
        else {
            const p = resource.path;
            return (p.length > 1 &&
                p.charCodeAt(p.length - 1) === 47 /* CharCode.Slash */ &&
                !/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath)); // ignore the slash at offset 0
        }
    }
    removeTrailingPathSeparator(resource, sep = paths.sep) {
        // Make sure that the path isn't a drive letter. A trailing separator there is not removable.
        if (hasTrailingPathSeparator(resource, sep)) {
            return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
        }
        return resource;
    }
    addTrailingPathSeparator(resource, sep = paths.sep) {
        let isRootSep = false;
        if (resource.scheme === Schemas.file) {
            const fsp = originalFSPath(resource);
            isRootSep =
                fsp !== undefined &&
                    fsp.length === extpath.getRoot(fsp).length &&
                    fsp[fsp.length - 1] === sep;
        }
        else {
            sep = '/';
            const p = resource.path;
            isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47 /* CharCode.Slash */;
        }
        if (!isRootSep && !hasTrailingPathSeparator(resource, sep)) {
            return resource.with({ path: resource.path + '/' });
        }
        return resource;
    }
}
/**
 * Unbiased utility that takes uris "as they are". This means it can be interchanged with
 * uri#toString() usages. The following is true
 * ```
 * assertEqual(aUri.toString() === bUri.toString(), exturi.isEqual(aUri, bUri))
 * ```
 */
export const extUri = new ExtUri(() => false);
/**
 * BIASED utility that _mostly_ ignored the case of urs paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and both CANNOT be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unbiased friend)is sufficient
 * because those uris come from a "trustworthy source". When creating unknown uris it's always
 * better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriBiasedIgnorePathCase = new ExtUri((uri) => {
    // A file scheme resource is in the same platform as code, so ignore case for non linux platforms
    // Resource can be from another platform. Lowering the case as an hack. Should come from File system provider
    return uri.scheme === Schemas.file ? !isLinux : true;
});
/**
 * BIASED utility that always ignores the casing of uris paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and both CANNOT be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unbiased friend)is sufficient
 * because those uris come from a "trustworthy source". When creating unknown uris it's always
 * better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriIgnorePathCase = new ExtUri((_) => true);
export const isEqual = extUri.isEqual.bind(extUri);
export const isEqualOrParent = extUri.isEqualOrParent.bind(extUri);
export const getComparisonKey = extUri.getComparisonKey.bind(extUri);
export const basenameOrAuthority = extUri.basenameOrAuthority.bind(extUri);
export const basename = extUri.basename.bind(extUri);
export const extname = extUri.extname.bind(extUri);
export const dirname = extUri.dirname.bind(extUri);
export const joinPath = extUri.joinPath.bind(extUri);
export const normalizePath = extUri.normalizePath.bind(extUri);
export const relativePath = extUri.relativePath.bind(extUri);
export const resolvePath = extUri.resolvePath.bind(extUri);
export const isAbsolutePath = extUri.isAbsolutePath.bind(extUri);
export const isEqualAuthority = extUri.isEqualAuthority.bind(extUri);
export const hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.bind(extUri);
export const removeTrailingPathSeparator = extUri.removeTrailingPathSeparator.bind(extUri);
export const addTrailingPathSeparator = extUri.addTrailingPathSeparator.bind(extUri);
//#endregion
export function distinctParents(items, resourceAccessor) {
    const distinctParents = [];
    for (let i = 0; i < items.length; i++) {
        const candidateResource = resourceAccessor(items[i]);
        if (items.some((otherItem, index) => {
            if (index === i) {
                return false;
            }
            return isEqualOrParent(candidateResource, resourceAccessor(otherItem));
        })) {
            continue;
        }
        distinctParents.push(items[i]);
    }
    return distinctParents;
}
/**
 * Data URI related helpers.
 */
export var DataUri;
(function (DataUri) {
    DataUri.META_DATA_LABEL = 'label';
    DataUri.META_DATA_DESCRIPTION = 'description';
    DataUri.META_DATA_SIZE = 'size';
    DataUri.META_DATA_MIME = 'mime';
    function parseMetaData(dataUri) {
        const metadata = new Map();
        // Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
        // the metadata is: size:2313;label:SomeLabel;description:SomeDescription
        const meta = dataUri.path.substring(dataUri.path.indexOf(';') + 1, dataUri.path.lastIndexOf(';'));
        meta.split(';').forEach((property) => {
            const [key, value] = property.split(':');
            if (key && value) {
                metadata.set(key, value);
            }
        });
        // Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
        // the mime is: image/png
        const mime = dataUri.path.substring(0, dataUri.path.indexOf(';'));
        if (mime) {
            metadata.set(DataUri.META_DATA_MIME, mime);
        }
        return metadata;
    }
    DataUri.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));
export function toLocalResource(resource, authority, localScheme) {
    if (authority) {
        let path = resource.path;
        if (path && path[0] !== paths.posix.sep) {
            path = paths.posix.sep + path;
        }
        return resource.with({ scheme: localScheme, authority, path });
    }
    return resource.with({ scheme: localScheme });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcmVzb3VyY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdEMsT0FBTyxLQUFLLEtBQUssTUFBTSxXQUFXLENBQUE7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbEQsT0FBTyxFQUFFLE9BQU8sSUFBSSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFFM0MsTUFBTSxVQUFVLGNBQWMsQ0FBQyxHQUFRO0lBQ3RDLE9BQU8sV0FBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM5QixDQUFDO0FBMEhELE1BQU0sT0FBTyxNQUFNO0lBQ2xCLFlBQW9CLGlCQUF3QztRQUF4QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXVCO0lBQUcsQ0FBQztJQUVoRSxPQUFPLENBQUMsSUFBUyxFQUFFLElBQVMsRUFBRSxpQkFBMEIsS0FBSztRQUM1RCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsRUFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FDM0MsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBcUIsRUFBRSxJQUFx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