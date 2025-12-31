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
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { LinkComputer, } from '../../../../../editor/common/languages/linkComputer.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The maximum number of links in a line to resolve against the file system. This limit is put
     * in place to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinksInLine"] = 10] = "MaxResolvedLinksInLine";
})(Constants || (Constants = {}));
let TerminalUriLinkDetector = class TerminalUriLinkDetector {
    static { this.id = 'uri'; }
    constructor(xterm, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
        this._processManager = _processManager;
        this._linkResolver = _linkResolver;
        this._logService = _logService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        // 2048 is the maximum URL length
        this.maxLinkLength = 2048;
    }
    async detect(lines, startLine, endLine) {
        const links = [];
        const linkComputerTarget = new TerminalLinkAdapter(this.xterm, startLine, endLine);
        const computedLinks = LinkComputer.computeLinks(linkComputerTarget);
        let resolvedLinkCount = 0;
        this._logService.trace('terminalUriLinkDetector#detect computedLinks', computedLinks);
        for (const computedLink of computedLinks) {
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, computedLink.range, startLine);
            // Check if the link is within the mouse position
            const uri = computedLink.url
                ? typeof computedLink.url === 'string'
                    ? URI.parse(this._excludeLineAndColSuffix(computedLink.url))
                    : computedLink.url
                : undefined;
            if (!uri) {
                continue;
            }
            const text = computedLink.url?.toString() || '';
            // Don't try resolve any links of excessive length
            if (text.length > this.maxLinkLength) {
                continue;
            }
            // Handle non-file scheme links
            if (uri.scheme !== Schemas.file) {
                links.push({
                    text,
                    uri,
                    bufferRange,
                    type: "Url" /* TerminalBuiltinLinkType.Url */,
                });
                continue;
            }
            // Filter out URI with unrecognized authorities
            if (uri.authority.length !== 2 && uri.authority.endsWith(':')) {
                continue;
            }
            // As a fallback URI, treat the authority as local to the workspace. This is required
            // for `ls --hyperlink` support for example which includes the hostname in the URI like
            // `file://Some-Hostname/mnt/c/foo/bar`.
            const uriCandidates = [uri];
            if (uri.authority.length > 0) {
                uriCandidates.push(URI.from({ ...uri, authority: undefined }));
            }
            // Iterate over all candidates, pushing the candidate on the first that's verified
            this._logService.trace('terminalUriLinkDetector#detect uriCandidates', uriCandidates);
            for (const uriCandidate of uriCandidates) {
                const linkStat = await this._linkResolver.resolveLink(this._processManager, text, uriCandidate);
                // Create the link if validated
                if (linkStat) {
                    let type;
                    if (linkStat.isDirectory) {
                        if (this._isDirectoryInsideWorkspace(uriCandidate)) {
                            type = "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */;
                        }
                        else {
                            type = "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */;
                        }
                    }
                    else {
                        type = "LocalFile" /* TerminalBuiltinLinkType.LocalFile */;
                    }
                    const simpleLink = {
                        // Use computedLink.url if it's a string to retain the line/col suffix
                        text: typeof computedLink.url === 'string' ? computedLink.url : linkStat.link,
                        uri: uriCandidate,
                        bufferRange,
                        type,
                    };
                    this._logService.trace('terminalUriLinkDetector#detect verified link', simpleLink);
                    links.push(simpleLink);
                    resolvedLinkCount++;
                    break;
                }
            }
            // Stop early if too many links exist in the line
            if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
                break;
            }
        }
        return links;
    }
    _isDirectoryInsideWorkspace(uri) {
        const folders = this._workspaceContextService.getWorkspace().folders;
        for (let i = 0; i < folders.length; i++) {
            if (this._uriIdentityService.extUri.isEqualOrParent(uri, folders[i].uri)) {
                return true;
            }
        }
        return false;
    }
    _excludeLineAndColSuffix(path) {
        return path.replace(/:\d+(:\d+)?$/, '');
    }
};
TerminalUriLinkDetector = __decorate([
    __param(3, ITerminalLogService),
    __param(4, IUriIdentityService),
    __param(5, IWorkspaceContextService)
], TerminalUriLinkDetector);
export { TerminalUriLinkDetector };
class TerminalLinkAdapter {
    constructor(_xterm, _lineStart, _lineEnd) {
        this._xterm = _xterm;
        this._lineStart = _lineStart;
        this._lineEnd = _lineEnd;
    }
    getLineCount() {
        return 1;
    }
    getLineContent() {
        return getXtermLineContent(this._xterm.buffer.active, this._lineStart, this._lineEnd, this._xterm.cols);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbFVyaUxpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFFTixZQUFZLEdBQ1osTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQU9oRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUd4RixPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0scURBQXFELENBQUE7QUFFNUQsSUFBVyxTQU1WO0FBTkQsV0FBVyxTQUFTO0lBQ25COzs7T0FHRztJQUNILDhFQUEyQixDQUFBO0FBQzVCLENBQUMsRUFOVSxTQUFTLEtBQVQsU0FBUyxRQU1uQjtBQUVNLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO2FBQzVCLE9BQUUsR0FBRyxLQUFLLEFBQVIsQ0FBUTtJQUtqQixZQUNVLEtBQWUsRUFDUCxlQUdxQyxFQUNyQyxhQUFvQyxFQUNoQyxXQUFpRCxFQUNqRCxtQkFBeUQsRUFDcEQsd0JBQW1FO1FBUnBGLFVBQUssR0FBTCxLQUFLLENBQVU7UUFDUCxvQkFBZSxHQUFmLGVBQWUsQ0FHc0I7UUFDckMsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQ2YsZ0JB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