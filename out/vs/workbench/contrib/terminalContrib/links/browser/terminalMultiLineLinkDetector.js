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
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
    /**
     * The maximum length of a link to resolve against the file system. This limit is put in place
     * to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinkLength"] = 1024] = "MaxResolvedLinkLength";
})(Constants || (Constants = {}));
const lineNumberPrefixMatchers = [
    // Ripgrep:
    //   /some/file
    //   16:searchresult
    //   16:    searchresult
    // Eslint:
    //   /some/file
    //     16:5  error ...
    /^ *(?<link>(?<line>\d+):(?<col>\d+)?)/,
];
const gitDiffMatchers = [
    // --- a/some/file
    // +++ b/some/file
    // @@ -8,11 +8,11 @@ file content...
    /^(?<link>@@ .+ \+(?<toFileLine>\d+),(?<toFileCount>\d+) @@)/,
];
let TerminalMultiLineLinkDetector = class TerminalMultiLineLinkDetector {
    static { this.id = 'multiline'; }
    constructor(xterm, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
        this._processManager = _processManager;
        this._linkResolver = _linkResolver;
        this._logService = _logService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        // This was chosen as a reasonable maximum line length given the tradeoff between performance
        // and how likely it is to encounter such a large line length. Some useful reference points:
        // - Window old max length: 260 ($MAX_PATH)
        // - Linux max length: 4096 ($PATH_MAX)
        this.maxLinkLength = 500;
    }
    async detect(lines, startLine, endLine) {
        const links = [];
        // Get the text representation of the wrapped line
        const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
        if (text === '' || text.length > 2000 /* Constants.MaxLineLength */) {
            return [];
        }
        this._logService.trace('terminalMultiLineLinkDetector#detect text', text);
        // Match against the fallback matchers which are mainly designed to catch paths with spaces
        // that aren't possible using the regular mechanism.
        for (const matcher of lineNumberPrefixMatchers) {
            const match = text.match(matcher);
            const group = match?.groups;
            if (!group) {
                continue;
            }
            const link = group?.link;
            const line = group?.line;
            const col = group?.col;
            if (!link || line === undefined) {
                continue;
            }
            // Don't try resolve any links of excessive length
            if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                continue;
            }
            this._logService.trace('terminalMultiLineLinkDetector#detect candidate', link);
            // Scan up looking for the first line that could be a path
            let possiblePath;
            for (let index = startLine - 1; index >= 0; index--) {
                // Ignore lines that aren't at the beginning of a wrapped line
                if (this.xterm.buffer.active.getLine(index).isWrapped) {
                    continue;
                }
                const text = getXtermLineContent(this.xterm.buffer.active, index, index, this.xterm.cols);
                if (!text.match(/^\s*\d/)) {
                    possiblePath = text;
                    break;
                }
            }
            if (!possiblePath) {
                continue;
            }
            // Check if the first non-matching line is an absolute or relative link
            const linkStat = await this._linkResolver.resolveLink(this._processManager, possiblePath);
            if (linkStat) {
                let type;
                if (linkStat.isDirectory) {
                    if (this._isDirectoryInsideWorkspace(linkStat.uri)) {
                        type = "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */;
                    }
                    else {
                        type = "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */;
                    }
                }
                else {
                    type = "LocalFile" /* TerminalBuiltinLinkType.LocalFile */;
                }
                // Convert the entire line's text string index into a wrapped buffer range
                const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                    startColumn: 1,
                    startLineNumber: 1,
                    endColumn: 1 + text.length,
                    endLineNumber: 1,
                }, startLine);
                const simpleLink = {
                    text: link,
                    uri: linkStat.uri,
                    selection: {
                        startLineNumber: parseInt(line),
                        startColumn: col ? parseInt(col) : 1,
                    },
                    disableTrimColon: true,
                    bufferRange: bufferRange,
                    type,
                };
                this._logService.trace('terminalMultiLineLinkDetector#detect verified link', simpleLink);
                links.push(simpleLink);
                // Break on the first match
                break;
            }
        }
        if (links.length === 0) {
            for (const matcher of gitDiffMatchers) {
                const match = text.match(matcher);
                const group = match?.groups;
                if (!group) {
                    continue;
                }
                const link = group?.link;
                const toFileLine = group?.toFileLine;
                const toFileCount = group?.toFileCount;
                if (!link || toFileLine === undefined) {
                    continue;
                }
                // Don't try resolve any links of excessive length
                if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                    continue;
                }
                this._logService.trace('terminalMultiLineLinkDetector#detect candidate', link);
                // Scan up looking for the first line that could be a path
                let possiblePath;
                for (let index = startLine - 1; index >= 0; index--) {
                    // Ignore lines that aren't at the beginning of a wrapped line
                    if (this.xterm.buffer.active.getLine(index).isWrapped) {
                        continue;
                    }
                    const text = getXtermLineContent(this.xterm.buffer.active, index, index, this.xterm.cols);
                    const match = text.match(/\+\+\+ b\/(?<path>.+)/);
                    if (match) {
                        possiblePath = match.groups?.path;
                        break;
                    }
                }
                if (!possiblePath) {
                    continue;
                }
                // Check if the first non-matching line is an absolute or relative link
                const linkStat = await this._linkResolver.resolveLink(this._processManager, possiblePath);
                if (linkStat) {
                    let type;
                    if (linkStat.isDirectory) {
                        if (this._isDirectoryInsideWorkspace(linkStat.uri)) {
                            type = "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */;
                        }
                        else {
                            type = "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */;
                        }
                    }
                    else {
                        type = "LocalFile" /* TerminalBuiltinLinkType.LocalFile */;
                    }
                    // Convert the link to the buffer range
                    const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                        startColumn: 1,
                        startLineNumber: 1,
                        endColumn: 1 + link.length,
                        endLineNumber: 1,
                    }, startLine);
                    const simpleLink = {
                        text: link,
                        uri: linkStat.uri,
                        selection: {
                            startLineNumber: parseInt(toFileLine),
                            startColumn: 1,
                            endLineNumber: parseInt(toFileLine) + parseInt(toFileCount),
                        },
                        bufferRange: bufferRange,
                        type,
                    };
                    this._logService.trace('terminalMultiLineLinkDetector#detect verified link', simpleLink);
                    links.push(simpleLink);
                    // Break on the first match
                    break;
                }
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
};
TerminalMultiLineLinkDetector = __decorate([
    __param(3, ITerminalLogService),
    __param(4, IUriIdentityService),
    __param(5, IWorkspaceContextService)
], TerminalMultiLineLinkDetector);
export { TerminalMultiLineLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNdWx0aUxpbmVMaW5rRGV0ZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbE11bHRpTGluZUxpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQU9oRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUd4RixPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0scURBQXFELENBQUE7QUFFNUQsSUFBVyxTQVdWO0FBWEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsOERBQW9CLENBQUE7SUFFcEI7OztPQUdHO0lBQ0gsOEVBQTRCLENBQUE7QUFDN0IsQ0FBQyxFQVhVLFNBQVMsS0FBVCxTQUFTLFFBV25CO0FBRUQsTUFBTSx3QkFBd0IsR0FBRztJQUNoQyxXQUFXO0lBQ1gsZUFBZTtJQUNmLG9CQUFvQjtJQUNwQix3QkFBd0I7SUFDeEIsVUFBVTtJQUNWLGVBQWU7SUFDZixzQkFBc0I7SUFDdEIsdUNBQXVDO0NBQ3ZDLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRztJQUN2QixrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLG9DQUFvQztJQUNwQyw2REFBNkQ7Q0FDN0QsQ0FBQTtBQUVNLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO2FBQ2xDLE9BQUUsR0FBRyxXQUFXLEFBQWQsQ0FBYztJQVF2QixZQUNVLEtBQWUsRUFDUCxlQUdxQyxFQUNyQyxhQUFvQyxFQUNoQyxX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