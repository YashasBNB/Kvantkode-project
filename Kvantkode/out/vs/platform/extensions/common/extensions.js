/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getRemoteName } from '../../remote/common/remoteHosts.js';
export const USER_MANIFEST_CACHE_FILE = 'extensions.user.cache';
export const BUILTIN_MANIFEST_CACHE_FILE = 'extensions.builtin.cache';
export const UNDEFINED_PUBLISHER = 'undefined_publisher';
export const ALL_EXTENSION_KINDS = ['ui', 'workspace', 'web'];
export function getWorkspaceSupportTypeMessage(supportType) {
    if (typeof supportType === 'object' && supportType !== null) {
        if (supportType.supported !== true) {
            return supportType.description;
        }
    }
    return undefined;
}
export const EXTENSION_CATEGORIES = [
    'AI',
    'Azure',
    'Chat',
    'Data Science',
    'Debuggers',
    'Extension Packs',
    'Education',
    'Formatters',
    'Keymaps',
    'Language Packs',
    'Linters',
    'Machine Learning',
    'Notebooks',
    'Programming Languages',
    'SCM Providers',
    'Snippets',
    'Testing',
    'Themes',
    'Visualization',
    'Other',
];
export var ExtensionType;
(function (ExtensionType) {
    ExtensionType[ExtensionType["System"] = 0] = "System";
    ExtensionType[ExtensionType["User"] = 1] = "User";
})(ExtensionType || (ExtensionType = {}));
export var TargetPlatform;
(function (TargetPlatform) {
    TargetPlatform["WIN32_X64"] = "win32-x64";
    TargetPlatform["WIN32_ARM64"] = "win32-arm64";
    TargetPlatform["LINUX_X64"] = "linux-x64";
    TargetPlatform["LINUX_ARM64"] = "linux-arm64";
    TargetPlatform["LINUX_ARMHF"] = "linux-armhf";
    TargetPlatform["ALPINE_X64"] = "alpine-x64";
    TargetPlatform["ALPINE_ARM64"] = "alpine-arm64";
    TargetPlatform["DARWIN_X64"] = "darwin-x64";
    TargetPlatform["DARWIN_ARM64"] = "darwin-arm64";
    TargetPlatform["WEB"] = "web";
    TargetPlatform["UNIVERSAL"] = "universal";
    TargetPlatform["UNKNOWN"] = "unknown";
    TargetPlatform["UNDEFINED"] = "undefined";
})(TargetPlatform || (TargetPlatform = {}));
/**
 * **!Do not construct directly!**
 *
 * **!Only static methods because it gets serialized!**
 *
 * This represents the "canonical" version for an extension identifier. Extension ids
 * have to be case-insensitive (due to the marketplace), but we must ensure case
 * preservation because the extension API is already public at this time.
 *
 * For example, given an extension with the publisher `"Hello"` and the name `"World"`,
 * its canonical extension identifier is `"Hello.World"`. This extension could be
 * referenced in some other extension's dependencies using the string `"hello.world"`.
 *
 * To make matters more complicated, an extension can optionally have an UUID. When two
 * extensions have the same UUID, they are considered equal even if their identifier is different.
 */
export class ExtensionIdentifier {
    constructor(value) {
        this.value = value;
        this._lower = value.toLowerCase();
    }
    static equals(a, b) {
        if (typeof a === 'undefined' || a === null) {
            return typeof b === 'undefined' || b === null;
        }
        if (typeof b === 'undefined' || b === null) {
            return false;
        }
        if (typeof a === 'string' || typeof b === 'string') {
            // At least one of the arguments is an extension id in string form,
            // so we have to use the string comparison which ignores case.
            const aValue = typeof a === 'string' ? a : a.value;
            const bValue = typeof b === 'string' ? b : b.value;
            return strings.equalsIgnoreCase(aValue, bValue);
        }
        // Now we know both arguments are ExtensionIdentifier
        return a._lower === b._lower;
    }
    /**
     * Gives the value by which to index (for equality).
     */
    static toKey(id) {
        if (typeof id === 'string') {
            return id.toLowerCase();
        }
        return id._lower;
    }
}
export class ExtensionIdentifierSet {
    get size() {
        return this._set.size;
    }
    constructor(iterable) {
        this._set = new Set();
        if (iterable) {
            for (const value of iterable) {
                this.add(value);
            }
        }
    }
    add(id) {
        this._set.add(ExtensionIdentifier.toKey(id));
    }
    delete(extensionId) {
        return this._set.delete(ExtensionIdentifier.toKey(extensionId));
    }
    has(id) {
        return this._set.has(ExtensionIdentifier.toKey(id));
    }
}
export class ExtensionIdentifierMap {
    constructor() {
        this._map = new Map();
    }
    clear() {
        this._map.clear();
    }
    delete(id) {
        this._map.delete(ExtensionIdentifier.toKey(id));
    }
    get(id) {
        return this._map.get(ExtensionIdentifier.toKey(id));
    }
    has(id) {
        return this._map.has(ExtensionIdentifier.toKey(id));
    }
    set(id, value) {
        this._map.set(ExtensionIdentifier.toKey(id), value);
    }
    values() {
        return this._map.values();
    }
    forEach(callbackfn) {
        this._map.forEach(callbackfn);
    }
    [Symbol.iterator]() {
        return this._map[Symbol.iterator]();
    }
}
/**
 * An error that is clearly from an extension, identified by the `ExtensionIdentifier`
 */
export class ExtensionError extends Error {
    constructor(extensionIdentifier, cause, message) {
        super(`Error in extension ${ExtensionIdentifier.toKey(extensionIdentifier)}: ${message ?? cause.message}`, { cause });
        this.name = 'ExtensionError';
        this.extension = extensionIdentifier;
    }
}
export function isApplicationScopedExtension(manifest) {
    return isLanguagePackExtension(manifest);
}
export function isLanguagePackExtension(manifest) {
    return manifest.contributes && manifest.contributes.localizations
        ? manifest.contributes.localizations.length > 0
        : false;
}
export function isAuthenticationProviderExtension(manifest) {
    return manifest.contributes && manifest.contributes.authentication
        ? manifest.contributes.authentication.length > 0
        : false;
}
export function isResolverExtension(manifest, remoteAuthority) {
    if (remoteAuthority) {
        const activationEvent = `onResolveRemoteAuthority:${getRemoteName(remoteAuthority)}`;
        return !!manifest.activationEvents?.includes(activationEvent);
    }
    return false;
}
export function parseApiProposals(enabledApiProposals) {
    return enabledApiProposals.map((proposal) => {
        const [proposalName, version] = proposal.split('@');
        return { proposalName, version: version ? parseInt(version) : undefined };
    });
}
export function parseEnabledApiProposalNames(enabledApiProposals) {
    return enabledApiProposals.map((proposal) => proposal.split('@')[0]);
}
export const IBuiltinExtensionsScannerService = createDecorator('IBuiltinExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBSTFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFbEUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsdUJBQXVCLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsMEJBQTBCLENBQUE7QUFDckUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcscUJBQXFCLENBQUE7QUFnT3hELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUE2QixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFtQnZGLE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsV0FBOEY7SUFFOUYsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLElBQUksV0FBVyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzdELElBQUksV0FBVyxDQUFDLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNwQyxPQUFPLFdBQVcsQ0FBQyxXQUFXLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBT0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUc7SUFDbkMsSUFBSTtJQUNKLE9BQU87SUFDUCxNQUFNO0lBQ04sY0FBYztJQUNkLFdBQVc7SUFDWCxpQkFBaUI7SUFDakIsV0FBVztJQUNYLFlBQVk7SUFDWixTQUFTO0lBQ1QsZ0JBQWdCO0lBQ2hC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