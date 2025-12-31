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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUkxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWxFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLHVCQUF1QixDQUFBO0FBQy9ELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLDBCQUEwQixDQUFBO0FBQ3JFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFBO0FBZ094RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBNkIsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBbUJ2RixNQUFNLFVBQVUsOEJBQThCLENBQzdDLFdBQThGO0lBRTlGLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM3RCxJQUFJLFdBQVcsQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDcEMsT0FBTyxXQUFXLENBQUMsV0FBVyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQU9ELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHO0lBQ25DLElBQUk7SUFDSixPQUFPO0lBQ1AsTUFBTTtJQUNOLGNBQWM7SUFDZCxXQUFXO0lBQ1gsaUJBQWlCO0lBQ2pCLFdBQVc7SUFDWCxZQUFZO0lBQ1osU0FBUztJQUNULGdCQUFnQjtJQUNoQixTQUFTO0lBQ1Qsa0JBQWtCO0lBQ2xCLFdBQVc7SUFDWCx1QkFBdUI7SUFDdkIsZUFBZTtJQUNmLFVBQVU7SUFDVixTQUFTO0lBQ1QsUUFBUTtJQUNSLGVBQWU7SUFDZixPQUFPO0NBQ1AsQ0FBQTtBQWtDRCxNQUFNLENBQU4sSUFBa0IsYUFHakI7QUFIRCxXQUFrQixhQUFhO0lBQzlCLHFEQUFNLENBQUE7SUFDTixpREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQUhpQixhQUFhLEtBQWIsYUFBYSxRQUc5QjtBQUVELE1BQU0sQ0FBTixJQUFrQixjQW1CakI7QUFuQkQsV0FBa0IsY0FBYztJQUMvQix5Q0FBdUIsQ0FBQTtJQUN2Qiw2Q0FBMkIsQ0FBQTtJQUUzQix5Q0FBdUIsQ0FBQTtJQUN2Qiw2Q0FBMkIsQ0FBQTtJQUMzQiw2Q0FBMkIsQ0FBQTtJQUUzQiwyQ0FBeUIsQ0FBQTtJQUN6QiwrQ0FBNkIsQ0FBQTtJQUU3QiwyQ0FBeUIsQ0FBQTtJQUN6QiwrQ0FBNkIsQ0FBQTtJQUU3Qiw2QkFBVyxDQUFBO0lBRVgseUNBQXVCLENBQUE7SUFDdkIscUNBQW1CLENBQUE7SUFDbkIseUNBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQW5CaUIsY0FBYyxLQUFkLGNBQWMsUUFtQi9CO0FBaUJEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sT0FBTyxtQkFBbUI7SUFTL0IsWUFBWSxLQUFhO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUNuQixDQUFrRCxFQUNsRCxDQUFrRDtRQUVsRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLFdBQVcsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDNUMsT0FBTyxPQUFPLENBQUMsS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQTtRQUM5QyxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BELG1FQUFtRTtZQUNuRSw4REFBOEQ7WUFDOUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDbEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDbEQsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFFRCxxREFBcUQ7UUFDckQsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFnQztRQUNuRCxJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE9BQU8sRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3hCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHNCQUFzQjtJQUdsQyxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxZQUFZLFFBQWlEO1FBTjVDLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBT3hDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLEdBQUcsQ0FBQyxFQUFnQztRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQWdDO1FBQzdDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVNLEdBQUcsQ0FBQyxFQUFnQztRQUMxQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFDa0IsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFhLENBQUE7SUFpQzdDLENBQUM7SUEvQk8sS0FBSztRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxFQUFnQztRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sR0FBRyxDQUFDLEVBQWdDO1FBQzFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVNLEdBQUcsQ0FBQyxFQUFnQztRQUMxQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTSxHQUFHLENBQUMsRUFBZ0MsRUFBRSxLQUFRO1FBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRU0sTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsT0FBTyxDQUFDLFVBQWdFO1FBQ3ZFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFBO0lBQ3BDLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxLQUFLO0lBR3hDLFlBQVksbUJBQXdDLEVBQUUsS0FBWSxFQUFFLE9BQWdCO1FBQ25GLEtBQUssQ0FDSixzQkFBc0IsbUJBQW1CLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQUssT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFDbkcsRUFBRSxLQUFLLEVBQUUsQ0FDVCxDQUFBO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQTtRQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLG1CQUFtQixDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQWlCRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsUUFBNEI7SUFDeEUsT0FBTyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUN6QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLFFBQTRCO0lBQ25FLE9BQU8sUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLGFBQWE7UUFDaEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxLQUFLLENBQUE7QUFDVCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLFFBQTRCO0lBQzdFLE9BQU8sUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLGNBQWM7UUFDakUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUE7QUFDVCxDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxRQUE0QixFQUM1QixlQUFtQztJQUVuQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLDRCQUE0QixhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQTtRQUNwRixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLG1CQUE2QjtJQUU3QixPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQzNDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDMUUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLG1CQUE2QjtJQUN6RSxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3JFLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQzlELGtDQUFrQyxDQUNsQyxDQUFBIn0=