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
import { getWindow, isHTMLElement, reset } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Schemas } from '../../../../base/common/network.js';
import * as osPath from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Iterable } from '../../../../base/common/iterator.js';
const CONTROL_CODES = '\\u0000-\\u0020\\u007f-\\u009f';
const WEB_LINK_REGEX = new RegExp('(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' +
    CONTROL_CODES +
    '"]{2,}[^\\s' +
    CONTROL_CODES +
    '"\')}\\],:;.!?]', 'ug');
const WIN_ABSOLUTE_PATH = /(?:[a-zA-Z]:(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_RELATIVE_PATH = /(?:(?:\~|\.)(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_PATH = new RegExp(`(${WIN_ABSOLUTE_PATH.source}|${WIN_RELATIVE_PATH.source})`);
const POSIX_PATH = /((?:\~|\.)?(?:\/[\w\.-]*)+)/;
const LINE_COLUMN = /(?:\:([\d]+))?(?:\:([\d]+))?/;
const PATH_LINK_REGEX = new RegExp(`${platform.isWindows ? WIN_PATH.source : POSIX_PATH.source}${LINE_COLUMN.source}`, 'g');
const LINE_COLUMN_REGEX = /:([\d]+)(?::([\d]+))?$/;
const MAX_LENGTH = 2000;
export var DebugLinkHoverBehavior;
(function (DebugLinkHoverBehavior) {
    /** A nice workbench hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Rich"] = 0] = "Rich";
    /**
     * Basic browser hover
     * @deprecated Consumers should adopt `rich` by propagating disposables appropriately
     */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Basic"] = 1] = "Basic";
    /** No hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["None"] = 2] = "None";
})(DebugLinkHoverBehavior || (DebugLinkHoverBehavior = {}));
let LinkDetector = class LinkDetector {
    constructor(editorService, fileService, openerService, pathService, tunnelService, environmentService, configurationService, hoverService) {
        this.editorService = editorService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.pathService = pathService;
        this.tunnelService = tunnelService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        // noop
    }
    /**
     * Matches and handles web urls, absolute and relative file links in the string provided.
     * Returns <span/> element that wraps the processed string, where matched links are replaced by <a/>.
     * 'onclick' event is attached to all anchored links that opens them in the editor.
     * When splitLines is true, each line of the text, even if it contains no links, is wrapped in a <span>
     * and added as a child of the returned <span>.
     * If a `hoverBehavior` is passed, hovers may be added using the workbench hover service.
     * This should be preferred for new code where hovers are desirable.
     */
    linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) {
        return this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights);
    }
    _linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef) {
        if (splitLines) {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
                lines[i] = lines[i] + '\n';
            }
            if (!lines[lines.length - 1]) {
                // Remove the last element ('') that split added.
                lines.pop();
            }
            const elements = lines.map((line) => this._linkify(line, false, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef));
            if (elements.length === 1) {
                // Do not wrap single line with extra span.
                return elements[0];
            }
            const container = document.createElement('span');
            elements.forEach((e) => container.appendChild(e));
            return container;
        }
        const container = document.createElement('span');
        for (const part of this.detectLinks(text)) {
            try {
                let node;
                switch (part.kind) {
                    case 'text':
                        node = defaultRef
                            ? this.linkifyLocation(part.value, defaultRef.locationReference, defaultRef.session, hoverBehavior)
                            : document.createTextNode(part.value);
                        break;
                    case 'web':
                        node = this.createWebLink(includeFulltext ? text : undefined, part.value, hoverBehavior);
                        break;
                    case 'path': {
                        const path = part.captures[0];
                        const lineNumber = part.captures[1] ? Number(part.captures[1]) : 0;
                        const columnNumber = part.captures[2] ? Number(part.captures[2]) : 0;
                        node = this.createPathLink(includeFulltext ? text : undefined, part.value, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior);
                        break;
                    }
                    default:
                        node = document.createTextNode(part.value);
                }
                container.append(...this.applyHighlights(node, part.index, part.value.length, highlights));
            }
            catch (e) {
                container.appendChild(document.createTextNode(part.value));
            }
        }
        return container;
    }
    applyHighlights(node, startIndex, length, highlights) {
        const children = [];
        let currentIndex = startIndex;
        const endIndex = startIndex + length;
        for (const highlight of highlights || []) {
            if (highlight.end <= currentIndex || highlight.start >= endIndex) {
                continue;
            }
            if (highlight.start > currentIndex) {
                children.push(node.textContent.substring(currentIndex - startIndex, highlight.start - startIndex));
                currentIndex = highlight.start;
            }
            const highlightEnd = Math.min(highlight.end, endIndex);
            const highlightedText = node.textContent.substring(currentIndex - startIndex, highlightEnd - startIndex);
            const highlightSpan = document.createElement('span');
            highlightSpan.classList.add('highlight');
            if (highlight.extraClasses) {
                highlightSpan.classList.add(...highlight.extraClasses);
            }
            highlightSpan.textContent = highlightedText;
            children.push(highlightSpan);
            currentIndex = highlightEnd;
        }
        if (currentIndex === startIndex) {
            return Iterable.single(node); // no changes made
        }
        if (currentIndex < endIndex) {
            children.push(node.textContent.substring(currentIndex - startIndex));
        }
        // reuse the element if it's a link
        if (isHTMLElement(node)) {
            reset(node, ...children);
            return Iterable.single(node);
        }
        return children;
    }
    /**
     * Linkifies a location reference.
     */
    linkifyLocation(text, locationReference, session, hoverBehavior) {
        const link = this.createLink(text);
        this.decorateLink(link, undefined, text, hoverBehavior, async (preserveFocus) => {
            const location = await session.resolveLocationReference(locationReference);
            await location.source.openInEditor(this.editorService, {
                startLineNumber: location.line,
                startColumn: location.column,
                endLineNumber: location.endLine ?? location.line,
                endColumn: location.endColumn ?? location.column,
            }, preserveFocus);
        });
        return link;
    }
    /**
     * Makes an {@link ILinkDetector} that links everything in the output to the
     * reference if they don't have other explicit links.
     */
    makeReferencedLinkDetector(locationReference, session) {
        return {
            linkify: (text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) => this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, { locationReference, session }),
            linkifyLocation: this.linkifyLocation.bind(this),
        };
    }
    createWebLink(fulltext, url, hoverBehavior) {
        const link = this.createLink(url);
        let uri = URI.parse(url);
        // if the URI ends with something like `foo.js:12:3`, parse
        // that into a fragment to reveal that location (#150702)
        const lineCol = LINE_COLUMN_REGEX.exec(uri.path);
        if (lineCol) {
            uri = uri.with({
                path: uri.path.slice(0, lineCol.index),
                fragment: `L${lineCol[0].slice(1)}`,
            });
        }
        this.decorateLink(link, uri, fulltext, hoverBehavior, async () => {
            if (uri.scheme === Schemas.file) {
                // Just using fsPath here is unsafe: https://github.com/microsoft/vscode/issues/109076
                const fsPath = uri.fsPath;
                const path = await this.pathService.path;
                const fileUrl = osPath.normalize(path.sep === osPath.posix.sep && platform.isWindows
                    ? fsPath.replace(/\\/g, osPath.posix.sep)
                    : fsPath);
                const fileUri = URI.parse(fileUrl);
                const exists = await this.fileService.exists(fileUri);
                if (!exists) {
                    return;
                }
                await this.editorService.openEditor({
                    resource: fileUri,
                    options: {
                        pinned: true,
                        selection: lineCol
                            ? { startLineNumber: +lineCol[1], startColumn: +lineCol[2] }
                            : undefined,
                    },
                });
                return;
            }
            this.openerService.open(url, {
                allowTunneling: !!this.environmentService.remoteAuthority &&
                    this.configurationService.getValue('remote.forwardOnOpen'),
            });
        });
        return link;
    }
    createPathLink(fulltext, text, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior) {
        if (path[0] === '/' && path[1] === '/') {
            // Most likely a url part which did not match, for example ftp://path.
            return document.createTextNode(text);
        }
        const options = { selection: { startLineNumber: lineNumber, startColumn: columnNumber } };
        if (path[0] === '.') {
            if (!workspaceFolder) {
                return document.createTextNode(text);
            }
            const uri = workspaceFolder.toResource(path);
            const link = this.createLink(text);
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
            return link;
        }
        if (path[0] === '~') {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                path = osPath.join(userHome.fsPath, path.substring(1));
            }
        }
        const link = this.createLink(text);
        link.tabIndex = 0;
        const uri = URI.file(osPath.normalize(path));
        this.fileService
            .stat(uri)
            .then((stat) => {
            if (stat.isDirectory) {
                return;
            }
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
        })
            .catch(() => {
            // If the uri can not be resolved we should not spam the console with error, remain quite #86587
        });
        return link;
    }
    createLink(text) {
        const link = document.createElement('a');
        link.textContent = text;
        return link;
    }
    decorateLink(link, uri, fulltext, hoverBehavior, onClick) {
        link.classList.add('link');
        const followLink = uri && this.tunnelService.canTunnel(uri)
            ? localize('followForwardedLink', 'follow link using forwarded port')
            : localize('followLink', 'follow link');
        const title = (link.ariaLabel = fulltext
            ? platform.isMacintosh
                ? localize('fileLinkWithPathMac', 'Cmd + click to {0}\n{1}', followLink, fulltext)
                : localize('fileLinkWithPath', 'Ctrl + click to {0}\n{1}', followLink, fulltext)
            : platform.isMacintosh
                ? localize('fileLinkMac', 'Cmd + click to {0}', followLink)
                : localize('fileLink', 'Ctrl + click to {0}', followLink));
        if (hoverBehavior?.type === 0 /* DebugLinkHoverBehavior.Rich */) {
            hoverBehavior.store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), link, title));
        }
        else if (hoverBehavior?.type !== 2 /* DebugLinkHoverBehavior.None */) {
            link.title = title;
        }
        link.onmousemove = (event) => {
            link.classList.toggle('pointer', platform.isMacintosh ? event.metaKey : event.ctrlKey);
        };
        link.onmouseleave = () => link.classList.remove('pointer');
        link.onclick = (event) => {
            const selection = getWindow(link).getSelection();
            if (!selection || selection.type === 'Range') {
                return; // do not navigate when user is selecting
            }
            if (!(platform.isMacintosh ? event.metaKey : event.ctrlKey)) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            onClick(false);
        };
        link.onkeydown = (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) {
                event.preventDefault();
                event.stopPropagation();
                onClick(event.keyCode === 10 /* KeyCode.Space */);
            }
        };
    }
    detectLinks(text) {
        if (text.length > MAX_LENGTH) {
            return [{ kind: 'text', value: text, captures: [], index: 0 }];
        }
        const regexes = [WEB_LINK_REGEX, PATH_LINK_REGEX];
        const kinds = ['web', 'path'];
        const result = [];
        const splitOne = (text, regexIndex, baseIndex) => {
            if (regexIndex >= regexes.length) {
                result.push({ value: text, kind: 'text', captures: [], index: baseIndex });
                return;
            }
            const regex = regexes[regexIndex];
            let currentIndex = 0;
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                const stringBeforeMatch = text.substring(currentIndex, match.index);
                if (stringBeforeMatch) {
                    splitOne(stringBeforeMatch, regexIndex + 1, baseIndex + currentIndex);
                }
                const value = match[0];
                result.push({
                    value: value,
                    kind: kinds[regexIndex],
                    captures: match.slice(1),
                    index: baseIndex + match.index,
                });
                currentIndex = match.index + value.length;
            }
            const stringAfterMatches = text.substring(currentIndex);
            if (stringAfterMatches) {
                splitOne(stringAfterMatches, regexIndex + 1, baseIndex + currentIndex);
            }
        };
        splitOne(text, 0, 0);
        return result;
    }
};
LinkDetector = __decorate([
    __param(0, IEditorService),
    __param(1, IFileService),
    __param(2, IOpenerService),
    __param(3, IPathService),
    __param(4, ITunnelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IConfigurationService),
    __param(7, IHoverService)
], LinkDetector);
export { LinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2xpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUduRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLE1BQU0sTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6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