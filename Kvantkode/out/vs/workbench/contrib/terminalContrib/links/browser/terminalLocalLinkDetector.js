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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBUWhHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixZQUFZLEVBQ1oseUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFPakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3RELE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxJQUFXLFNBaUJWO0FBakJELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILDhEQUFvQixDQUFBO0lBRXBCOzs7T0FHRztJQUNILDhFQUEyQixDQUFBO0lBRTNCOzs7T0FHRztJQUNILDhFQUE0QixDQUFBO0FBQzdCLENBQUMsRUFqQlUsU0FBUyxLQUFULFNBQVMsUUFpQm5CO0FBRUQsTUFBTSxnQkFBZ0IsR0FBYTtJQUNsQyxpREFBaUQ7SUFDakQsc0RBQXNEO0lBQ3RELGtEQUFrRDtJQUNsRCxrRUFBa0U7SUFDbEUsa0NBQWtDO0lBQ2xDLGtDQUFrQztJQUNs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