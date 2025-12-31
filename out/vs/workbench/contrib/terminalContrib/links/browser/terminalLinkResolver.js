/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { removeLinkSuffix, removeLinkQueryString, winDrivePrefix } from './terminalLinkParsing.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isWindows, OS } from '../../../../../base/common/platform.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { posix, win32 } from '../../../../../base/common/path.js';
import { mainWindow } from '../../../../../base/browser/window.js';
let TerminalLinkResolver = class TerminalLinkResolver {
    constructor(_fileService) {
        this._fileService = _fileService;
        // Link cache could be shared across all terminals, but that could lead to weird results when
        // both local and remote terminals are present
        this._resolvedLinkCaches = new Map();
    }
    async resolveLink(processManager, link, uri) {
        // Correct scheme and authority for remote terminals
        if (uri && uri.scheme === Schemas.file && processManager.remoteAuthority) {
            uri = uri.with({
                scheme: Schemas.vscodeRemote,
                authority: processManager.remoteAuthority,
            });
        }
        // Get the link cache
        let cache = this._resolvedLinkCaches.get(processManager.remoteAuthority ?? '');
        if (!cache) {
            cache = new LinkCache();
            this._resolvedLinkCaches.set(processManager.remoteAuthority ?? '', cache);
        }
        // Check resolved link cache first
        const cached = cache.get(uri || link);
        if (cached !== undefined) {
            return cached;
        }
        if (uri) {
            try {
                const stat = await this._fileService.stat(uri);
                const result = { uri, link, isDirectory: stat.isDirectory };
                cache.set(uri, result);
                return result;
            }
            catch (e) {
                // Does not exist
                cache.set(uri, null);
                return null;
            }
        }
        // Remove any line/col suffix
        let linkUrl = removeLinkSuffix(link);
        // Remove any query string
        linkUrl = removeLinkQueryString(linkUrl);
        // Exit early if the link is determines as not valid already
        if (linkUrl.length === 0) {
            cache.set(link, null);
            return null;
        }
        // If the link looks like a /mnt/ WSL path and this is a Windows frontend, use the backend
        // to get the resolved path from the wslpath util.
        if (isWindows && link.match(/^\/mnt\/[a-z]/i) && processManager.backend) {
            linkUrl = await processManager.backend.getWslPath(linkUrl, 'unix-to-win');
        }
        // Skip preprocessing if it looks like a special Windows -> WSL link
        else if (isWindows && link.match(/^(?:\/\/|\\\\)wsl(?:\$|\.localhost)(\/|\\)/)) {
            // No-op, it's already the right format
        }
        // Handle all non-WSL links
        else {
            const preprocessedLink = this._preprocessPath(linkUrl, processManager.initialCwd, processManager.os, processManager.userHome);
            if (!preprocessedLink) {
                cache.set(link, null);
                return null;
            }
            linkUrl = preprocessedLink;
        }
        try {
            let uri;
            if (processManager.remoteAuthority) {
                uri = URI.from({
                    scheme: Schemas.vscodeRemote,
                    authority: processManager.remoteAuthority,
                    path: linkUrl,
                });
            }
            else {
                uri = URI.file(linkUrl);
            }
            try {
                const stat = await this._fileService.stat(uri);
                const result = { uri, link, isDirectory: stat.isDirectory };
                cache.set(link, result);
                return result;
            }
            catch (e) {
                // Does not exist
                cache.set(link, null);
                return null;
            }
        }
        catch {
            // Errors in parsing the path
            cache.set(link, null);
            return null;
        }
    }
    _preprocessPath(link, initialCwd, os, userHome) {
        const osPath = this._getOsPath(os);
        if (link.charAt(0) === '~') {
            // Resolve ~ -> userHome
            if (!userHome) {
                return null;
            }
            link = osPath.join(userHome, link.substring(1));
        }
        else if (link.charAt(0) !== '/' && link.charAt(0) !== '~') {
            // Resolve workspace path . | .. | <relative_path> -> <path>/. | <path>/.. | <path>/<relative_path>
            if (os === 1 /* OperatingSystem.Windows */) {
                if (!link.match('^' + winDrivePrefix) && !link.startsWith('\\\\?\\')) {
                    if (!initialCwd) {
                        // Abort if no workspace is open
                        return null;
                    }
                    link = osPath.join(initialCwd, link);
                }
                else {
                    // Remove \\?\ from paths so that they share the same underlying
                    // uri and don't open multiple tabs for the same file
                    link = link.replace(/^\\\\\?\\/, '');
                }
            }
            else {
                if (!initialCwd) {
                    // Abort if no workspace is open
                    return null;
                }
                link = osPath.join(initialCwd, link);
            }
        }
        link = osPath.normalize(link);
        return link;
    }
    _getOsPath(os) {
        return (os ?? OS) === 1 /* OperatingSystem.Windows */ ? win32 : posix;
    }
};
TerminalLinkResolver = __decorate([
    __param(0, IFileService)
], TerminalLinkResolver);
export { TerminalLinkResolver };
var LinkCacheConstants;
(function (LinkCacheConstants) {
    /**
     * How long to cache links for in milliseconds, the TTL resets whenever a new value is set in
     * the cache.
     */
    LinkCacheConstants[LinkCacheConstants["TTL"] = 10000] = "TTL";
})(LinkCacheConstants || (LinkCacheConstants = {}));
class LinkCache {
    constructor() {
        this._cache = new Map();
        this._cacheTilTimeout = 0;
    }
    set(link, value) {
        // Reset cached link TTL on any set
        if (this._cacheTilTimeout) {
            mainWindow.clearTimeout(this._cacheTilTimeout);
        }
        this._cacheTilTimeout = mainWindow.setTimeout(() => this._cache.clear(), 10000 /* LinkCacheConstants.TTL */);
        this._cache.set(this._getKey(link), value);
    }
    get(link) {
        return this._cache.get(this._getKey(link));
    }
    _getKey(link) {
        if (URI.isUri(link)) {
            return link.toString();
        }
        return link;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFtQixFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFTLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFM0QsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFLaEMsWUFBMEIsWUFBMkM7UUFBMUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFKckUsNkZBQTZGO1FBQzdGLDhDQUE4QztRQUM3Qix3QkFBbUIsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUVBLENBQUM7SUFFekUsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsY0FHc0QsRUFDdEQsSUFBWSxFQUNaLEdBQVM7UUFFVCxvREFBb0Q7UUFDcEQsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLGNBQWMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMx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