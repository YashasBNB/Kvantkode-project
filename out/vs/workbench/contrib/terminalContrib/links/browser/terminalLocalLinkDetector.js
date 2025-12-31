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
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { convertLinkRangeToBuffer, getXtermLineContent, getXtermRangesByAttr, osPathModule, updateLinkWithRelativeCwd, } from './terminalLinkHelpers.js';
import { detectLinks } from './terminalLinkParsing.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
    /**
     * The maximum number of links in a line to resolve against the file system. This limit is put
     * in place to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinksInLine"] = 10] = "MaxResolvedLinksInLine";
    /**
     * The maximum length of a link to resolve against the file system. This limit is put in place
     * to avoid sending excessive data when remote connections are in place.
     */
    Constants[Constants["MaxResolvedLinkLength"] = 1024] = "MaxResolvedLinkLength";
})(Constants || (Constants = {}));
const fallbackMatchers = [
    // Python style error: File "<path>", line <line>
    /^ *File (?<link>"(?<path>.+)"(, line (?<line>\d+))?)/,
    // Unknown tool #200166: FILE  <path>:<line>:<col>
    /^ +FILE +(?<link>(?<path>.+)(?::(?<line>\d+)(?::(?<col>\d+))?)?)/,
    // Some C++ compile error formats:
    // C:\foo\bar baz(339) : error ...
    // C:\foo\bar baz(339,12) : error ...
    // C:\foo\bar baz(339, 12) : error ...
    // C:\foo\bar baz(339): error ...       [#178584, Visual Studio CL/NVIDIA CUDA compiler]
    // C:\foo\bar baz(339,12): ...
    // C:\foo\bar baz(339, 12): ...
    /^(?<link>(?<path>.+)\((?<line>\d+)(?:, ?(?<col>\d+))?\)) ?:/,
    // C:\foo/bar baz:339 : error ...
    // C:\foo/bar baz:339:12 : error ...
    // C:\foo/bar baz:339: error ...
    // C:\foo/bar baz:339:12: error ...     [#178584, Clang]
    /^(?<link>(?<path>.+):(?<line>\d+)(?::(?<col>\d+))?) ?:/,
    // Cmd prompt
    /^(?<link>(?<path>.+))>/,
    // The whole line is the path
    /^ *(?<link>(?<path>.+))/,
];
let TerminalLocalLinkDetector = class TerminalLocalLinkDetector {
    static { this.id = 'local'; }
    constructor(xterm, _capabilities, _processManager, _linkResolver, _logService, _uriIdentityService, _workspaceContextService) {
        this.xterm = xterm;
        this._capabilities = _capabilities;
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
        let stringIndex = -1;
        let resolvedLinkCount = 0;
        const os = this._processManager.os || OS;
        const parsedLinks = detectLinks(text, os);
        this._logService.trace('terminalLocalLinkDetector#detect text', text);
        this._logService.trace('terminalLocalLinkDetector#detect parsedLinks', parsedLinks);
        for (const parsedLink of parsedLinks) {
            // Don't try resolve any links of excessive length
            if (parsedLink.path.text.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                continue;
            }
            // Convert the link text's string index into a wrapped buffer range
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                startColumn: (parsedLink.prefix?.index ?? parsedLink.path.index) + 1,
                startLineNumber: 1,
                endColumn: parsedLink.path.index +
                    parsedLink.path.text.length +
                    (parsedLink.suffix?.suffix.text.length ?? 0) +
                    1,
                endLineNumber: 1,
            }, startLine);
            // Get a single link candidate if the cwd of the line is known
            const linkCandidates = [];
            const osPath = osPathModule(os);
            const isUri = parsedLink.path.text.startsWith('file://');
            if (osPath.isAbsolute(parsedLink.path.text) ||
                parsedLink.path.text.startsWith('~') ||
                isUri) {
                linkCandidates.push(parsedLink.path.text);
            }
            else {
                if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
                    const absolutePath = updateLinkWithRelativeCwd(this._capabilities, bufferRange.start.y, parsedLink.path.text, osPath, this._logService);
                    // Only add a single exact link candidate if the cwd is available, this may cause
                    // the link to not be resolved but that should only occur when the actual file does
                    // not exist. Doing otherwise could cause unexpected results where handling via the
                    // word link detector is preferable.
                    if (absolutePath) {
                        linkCandidates.push(...absolutePath);
                    }
                }
                // Fallback to resolving against the initial cwd, removing any relative directory prefixes
                if (linkCandidates.length === 0) {
                    linkCandidates.push(parsedLink.path.text);
                    if (parsedLink.path.text.match(/^(\.\.[\/\\])+/)) {
                        linkCandidates.push(parsedLink.path.text.replace(/^(\.\.[\/\\])+/, ''));
                    }
                }
            }
            // If any candidates end with special characters that are likely to not be part of the
            // link, add a candidate excluding them.
            const specialEndCharRegex = /[\[\]"'\.]$/;
            const trimRangeMap = new Map();
            const specialEndLinkCandidates = [];
            for (const candidate of linkCandidates) {
                let previous = candidate;
                let removed = previous.replace(specialEndCharRegex, '');
                let trimRange = 0;
                while (removed !== previous) {
                    // Only trim the link if there is no suffix, otherwise the underline would be incorrect
                    if (!parsedLink.suffix) {
                        trimRange++;
                    }
                    specialEndLinkCandidates.push(removed);
                    trimRangeMap.set(removed, trimRange);
                    previous = removed;
                    removed = removed.replace(specialEndCharRegex, '');
                }
            }
            linkCandidates.push(...specialEndLinkCandidates);
            this._logService.trace('terminalLocalLinkDetector#detect linkCandidates', linkCandidates);
            // Validate the path and convert to the outgoing type
            const simpleLink = await this._validateAndGetLink(undefined, bufferRange, linkCandidates, trimRangeMap);
            if (simpleLink) {
                simpleLink.parsedLink = parsedLink;
                simpleLink.text = text.substring(parsedLink.prefix?.index ?? parsedLink.path.index, parsedLink.suffix
                    ? parsedLink.suffix.suffix.index + parsedLink.suffix.suffix.text.length
                    : parsedLink.path.index + parsedLink.path.text.length);
                this._logService.trace('terminalLocalLinkDetector#detect verified link', simpleLink);
                links.push(simpleLink);
            }
            // Stop early if too many links exist in the line
            if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
                break;
            }
        }
        // Match against the fallback matchers which are mainly designed to catch paths with spaces
        // that aren't possible using the regular mechanism.
        if (links.length === 0) {
            for (const matcher of fallbackMatchers) {
                const match = text.match(matcher);
                const group = match?.groups;
                if (!group) {
                    continue;
                }
                const link = group?.link;
                const path = group?.path;
                const line = group?.line;
                const col = group?.col;
                if (!link || !path) {
                    continue;
                }
                // Don't try resolve any links of excessive length
                if (link.length > 1024 /* Constants.MaxResolvedLinkLength */) {
                    continue;
                }
                // Convert the link text's string index into a wrapped buffer range
                stringIndex = text.indexOf(link);
                const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                    startColumn: stringIndex + 1,
                    startLineNumber: 1,
                    endColumn: stringIndex + link.length + 1,
                    endLineNumber: 1,
                }, startLine);
                // Validate and add link
                const suffix = line ? `:${line}${col ? `:${col}` : ''}` : '';
                const simpleLink = await this._validateAndGetLink(`${path}${suffix}`, bufferRange, [path]);
                if (simpleLink) {
                    links.push(simpleLink);
                }
                // Only match a single fallback matcher
                break;
            }
        }
        // Sometimes links are styled specially in the terminal like underlined or bolded, try split
        // the line by attributes and test whether it matches a path
        if (links.length === 0) {
            const rangeCandidates = getXtermRangesByAttr(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
            for (const rangeCandidate of rangeCandidates) {
                let text = '';
                for (let y = rangeCandidate.start.y; y <= rangeCandidate.end.y; y++) {
                    const line = this.xterm.buffer.active.getLine(y);
                    if (!line) {
                        break;
                    }
                    const lineStartX = y === rangeCandidate.start.y ? rangeCandidate.start.x : 0;
                    const lineEndX = y === rangeCandidate.end.y ? rangeCandidate.end.x : this.xterm.cols - 1;
                    text += line.translateToString(false, lineStartX, lineEndX);
                }
                // HACK: Adjust to 1-based for link API
                rangeCandidate.start.x++;
                rangeCandidate.start.y++;
                rangeCandidate.end.y++;
                // Validate and add link
                const simpleLink = await this._validateAndGetLink(text, rangeCandidate, [text]);
                if (simpleLink) {
                    links.push(simpleLink);
                }
                // Stop early if too many links exist in the line
                if (++resolvedLinkCount >= 10 /* Constants.MaxResolvedLinksInLine */) {
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
    async _validateLinkCandidates(linkCandidates) {
        for (const link of linkCandidates) {
            let uri;
            if (link.startsWith('file://')) {
                uri = URI.parse(link);
            }
            const result = await this._linkResolver.resolveLink(this._processManager, link, uri);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    /**
     * Validates a set of link candidates and returns a link if validated.
     * @param linkText The link text, this should be undefined to use the link stat value
     * @param trimRangeMap A map of link candidates to the amount of buffer range they need trimmed.
     */
    async _validateAndGetLink(linkText, bufferRange, linkCandidates, trimRangeMap) {
        const linkStat = await this._validateLinkCandidates(linkCandidates);
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
            // Offset the buffer range if the link range was trimmed
            const trimRange = trimRangeMap?.get(linkStat.link);
            if (trimRange) {
                bufferRange.end.x -= trimRange;
                if (bufferRange.end.x < 0) {
                    bufferRange.end.y--;
                    bufferRange.end.x += this.xterm.cols;
                }
            }
            return {
                text: linkText ?? linkStat.link,
                uri: linkStat.uri,
                bufferRange: bufferRange,
                type,
            };
        }
        return undefined;
    }
};
TerminalLocalLinkDetector = __decorate([
    __param(4, ITerminalLogService),
    __param(5, IUriIdentityService),
    __param(6, IWorkspaceContextService)
], TerminalLocalLinkDetector);
export { TerminalLocalLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTG9jYWxMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQVFoRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsWUFBWSxFQUNaLHlCQUF5QixHQUN6QixNQUFNLDBCQUEwQixDQUFBO0FBT2pDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RCxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0scURBQXFELENBQUE7QUFFNUQsSUFBVyxTQWlCVjtBQWpCRCxXQUFXLFNBQVM7SUFDbkI7O09BRUc7SUFDSCw4REFBb0IsQ0FBQTtJQUVwQjs7O09BR0c7SUFDSCw4RUFBMkIsQ0FBQTtJQUUzQjs7O09BR0c7SUFDSCw4RUFBNEIsQ0FBQTtBQUM3QixDQUFDLEVBakJVLFNBQVMsS0FBVCxTQUFTLFFBaUJuQjtBQUVELE1BQU0sZ0JBQWdCLEdBQWE7SUFDbEMsaURBQWlEO0lBQ2pELHNEQUFzRDtJQUN0RCxrREFBa0Q7SUFDbEQsa0VBQWtFO0lBQ2xFLGtDQUFrQztJQUNsQyxrQ0FBa0M7SUFDbEMscUNBQXFDO0lBQ3JDLHNDQUFzQztJ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