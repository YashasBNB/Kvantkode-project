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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9saW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFHbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxNQUFNLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUc3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxNQUFNLGFBQWEsR0FBRyxnQ0FBZ0MsQ0FBQTtBQUN0RCxNQUFNLGNBQWMsR0FBRyxJQUFJLE1BQU0sQ0FDaEMseURBQXlEO0lBQ3hELGFBQWE7SUFDYixhQUFhO0lBQ2IsYUFBYTtJQUNiLGlCQUFpQixFQUNsQixJQUFJLENBQ0osQ0FBQTtBQUVELE1BQU0saUJBQWlCLEdBQUcscUNBQXFDLENBQUE7QUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxxQ0FBcUMsQ0FBQTtBQUMvRCxNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3hGLE1BQU0sVUFBVSxHQUFHLDZCQUE2QixDQUFBO0FBQ2hELE1BQU0sV0FBVyxHQUFHLDhCQUE4QixDQUFBO0FBQ2xELE1BQU0sZUFBZSxHQUFHLElBQUksTUFBTSxDQUNqQyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUNsRixHQUFHLENBQ0gsQ0FBQTtBQUNELE1BQU0saUJBQWlCLEdBQUcsd0JBQXdCLENBQUE7QUFFbEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFBO0FBVXZCLE1BQU0sQ0FBTixJQUFrQixzQkFVakI7QUFWRCxXQUFrQixzQkFBc0I7SUFDdkMsNkJBQTZCO0lBQzdCLG1FQUFJLENBQUE7SUFDSjs7O09BR0c7SUFDSCxxRUFBSyxDQUFBO0lBQ0wsZUFBZTtJQUNmLG1FQUFJLENBQUE7QUFDTCxDQUFDLEVBVmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFVdkM7QUF3Qk0sSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBWTtJQUN4QixZQUNrQyxhQUE2QixFQUMvQixXQUF5QixFQUN2QixhQUE2QixFQUMvQixXQUF5QixFQUN2QixhQUE2QixFQUNmLGtCQUFnRCxFQUN2RCxvQkFBMkMsRUFDbkQsWUFBMkI7UUFQMUIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMvQixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDZix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQThCO1FBQ3ZELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFFM0QsT0FBTztJQUNSLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILE9BQU8sQ0FDTixJQUFZLEVBQ1osVUFBb0IsRUFDcEIsZUFBa0MsRUFDbEMsZUFBeUIsRUFDekIsYUFBOEMsRUFDOUMsVUFBeUI7UUFFekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUNuQixJQUFJLEVBQ0osVUFBVSxFQUNWLGVBQWUsRUFDZixlQUFlLEVBQ2YsYUFBYSxFQUNiLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQztJQUVPLFFBQVEsQ0FDZixJQUFZLEVBQ1osVUFBb0IsRUFDcEIsZUFBa0MsRUFDbEMsZUFBeUIsRUFDekIsYUFBOEMsRUFDOUMsVUFBeUIsRUFDekIsVUFBa0U7UUFFbEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUMzQixDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLGlEQUFpRDtnQkFDakQsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ1osQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNuQyxJQUFJLENBQUMsUUFBUSxDQUNaLElBQUksRUFDSixLQUFLLEVBQ0wsZUFBZSxFQUNmLGVBQWUsRUFDZixhQUFhLEVBQ2IsVUFBVSxFQUNWLFVBQVUsQ0FDVixDQUNELENBQUE7WUFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLDJDQUEyQztnQkFDM0MsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbkIsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQztnQkFDSixJQUFJLElBQVUsQ0FBQTtnQkFDZCxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxNQUFNO3dCQUNWLElBQUksR0FBRyxVQUFVOzRCQUNoQixDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsSUFBSSxDQUFDLEtBQUssRUFDVixVQUFVLENBQUMsaUJBQWlCLEVBQzVCLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLGFBQWEsQ0FDYjs0QkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ3RDLE1BQUs7b0JBQ04sS0FBSyxLQUFLO3dCQUNULElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTt3QkFDeEYsTUFBSztvQkFDTixLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7d0JBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDN0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNsRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ3BFLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUN6QixlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUNsQyxJQUFJLENBQUMsS0FBSyxFQUNWLElBQUksRUFDSixVQUFVLEVBQ1YsWUFBWSxFQUNaLGVBQWUsRUFDZixhQUFhLENBQ2IsQ0FBQTt3QkFDRCxNQUFLO29CQUNOLENBQUM7b0JBQ0Q7d0JBQ0MsSUFBSSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO2dCQUVELFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDM0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsSUFBVSxFQUNWLFVBQWtCLEVBQ2xCLE1BQWMsRUFDZCxVQUFvQztRQUVwQyxNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFBO1FBQ3RDLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQTtRQUM3QixNQUFNLFFBQVEsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFBO1FBRXBDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzFDLElBQUksU0FBUyxDQUFDLEdBQUcsSUFBSSxZQUFZLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDbEUsU0FBUTtZQUNULENBQUM7WUFFRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7Z0JBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQ1osSUFBSSxDQUFDLFdBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxDQUNwRixDQUFBO2dCQUNELFlBQVksR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQy9CLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDdEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVksQ0FBQyxTQUFTLENBQ2xELFlBQVksR0FBRyxVQUFVLEVBQ3pCLFlBQVksR0FBRyxVQUFVLENBQ3pCLENBQUE7WUFDRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3BELGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3hDLElBQUksU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM1QixhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBQ0QsYUFBYSxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUE7WUFDM0MsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUM1QixZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQzVCLENBQUM7UUFFRCxJQUFJLFlBQVksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxrQkFBa0I7UUFDaEQsQ0FBQztRQUVELElBQUksWUFBWSxHQUFHLFFBQVEsRUFBRSxDQUFDO1lBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pCLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQTtZQUN4QixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWUsQ0FDZCxJQUFZLEVBQ1osaUJBQXlCLEVBQ3pCLE9BQXNCLEVBQ3RCLGFBQThDO1FBRTlDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLGFBQXNCLEVBQUUsRUFBRTtZQUN4RixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQ2pDLElBQUksQ0FBQyxhQUFhLEVBQ2xCO2dCQUNDLGVBQWUsRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDOUIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUM1QixhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSTtnQkFDaEQsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLE1BQU07YUFDaEQsRUFDRCxhQUFhLENBQ2IsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsMEJBQTBCLENBQUMsaUJBQXlCLEVBQUUsT0FBc0I7UUFDM0UsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FDMUYsSUFBSSxDQUFDLFFBQVEsQ0FDWixJQUFJLEVBQ0osVUFBVSxFQUNWLGVBQWUsRUFDZixlQUFlLEVBQ2YsYUFBYSxFQUNiLFVBQVUsRUFDVixFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUM5QjtZQUNGLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDaEQsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhLENBQ3BCLFFBQTRCLEVBQzVCLEdBQVcsRUFDWCxhQUE4QztRQUU5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWpDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEIsMkRBQTJEO1FBQzNELHlEQUF5RDtRQUN6RCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDZCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBQ3RDLFFBQVEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDbkMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2hFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pDLHNGQUFzRjtnQkFDdEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtnQkFDekIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQTtnQkFDeEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUztvQkFDbEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO29CQUN6QyxDQUFDLENBQUMsTUFBTSxDQUNULENBQUE7Z0JBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDckQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNiLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO29CQUNuQyxRQUFRLEVBQUUsT0FBTztvQkFDakIsT0FBTyxFQUFFO3dCQUNSLE1BQU0sRUFBRSxJQUFJO3dCQUNaLFNBQVMsRUFBRSxPQUFPOzRCQUNqQixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFOzRCQUM1RCxDQUFDLENBQUMsU0FBUztxQkFDWjtpQkFDRCxDQUFDLENBQUE7Z0JBQ0YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzVCLGNBQWMsRUFDYixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWU7b0JBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUM7YUFDM0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxjQUFjLENBQ3JCLFFBQTRCLEVBQzVCLElBQVksRUFDWixJQUFZLEVBQ1osVUFBa0IsRUFDbEIsWUFBb0IsRUFDcEIsZUFBNkMsRUFDN0MsYUFBOEM7UUFFOUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN4QyxzRUFBc0U7WUFDdEUsT0FBTyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxFQUFFLFNBQVMsRUFBRSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUE7UUFDekYsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QixPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckMsQ0FBQztZQUNELE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFDLGFBQXNCLEVBQUUsRUFBRSxDQUNoRixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUN4RixDQUFBO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDckIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUNsRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUNqQixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsV0FBVzthQUNkLElBQUksQ0FBQyxHQUFHLENBQUM7YUFDVCxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNkLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLENBQUMsYUFBc0IsRUFBRSxFQUFFLENBQ2hGLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQ3hGLENBQUE7UUFDRixDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1gsZ0dBQWdHO1FBQ2pHLENBQUMsQ0FBQyxDQUFBO1FBQ0gsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQVk7UUFDOUIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUN2QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxZQUFZLENBQ25CLElBQWlCLEVBQ2pCLEdBQW9CLEVBQ3BCLFFBQTRCLEVBQzVCLGFBQXlELEVBQ3pELE9BQXlDO1FBRXpDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFCLE1BQU0sVUFBVSxHQUNmLEdBQUcsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7WUFDdkMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxrQ0FBa0MsQ0FBQztZQUNyRSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN6QyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUTtZQUN2QyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQ3JCLENBQUMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQztnQkFDbEYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDO1lBQ2pGLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDckIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxDQUFDO2dCQUMzRCxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRTVELElBQUksYUFBYSxFQUFFLElBQUksd0NBQWdDLEVBQUUsQ0FBQztZQUN6RCxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQ3BGLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxhQUFhLEVBQUUsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ25CLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2RixDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN4QixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDaEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUM5QyxPQUFNLENBQUMseUNBQXlDO1lBQ2pELENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDN0QsT0FBTTtZQUNQLENBQUM7WUFFRCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDdEIsS0FBSyxDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDaEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxLQUFLLENBQUMsT0FBTywwQkFBa0IsSUFBSSxLQUFLLENBQUMsT0FBTywyQkFBa0IsRUFBRSxDQUFDO2dCQUN4RSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ3RCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLDJCQUFrQixDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBWTtRQUMvQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxFQUFFLENBQUM7WUFDOUIsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFhLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzNELE1BQU0sS0FBSyxHQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQTtRQUU3QixNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxVQUFrQixFQUFFLFNBQWlCLEVBQUUsRUFBRTtZQUN4RSxJQUFJLFVBQVUsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtnQkFDMUUsT0FBTTtZQUNQLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDakMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLElBQUksS0FBSyxDQUFBO1lBQ1QsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7WUFDbkIsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQzVDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNuRSxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZCLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQTtnQkFDdEUsQ0FBQztnQkFDRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLEtBQUs7b0JBQ1osSUFBSSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUM7b0JBQ3ZCLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsS0FBSyxFQUFFLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSztpQkFDOUIsQ0FBQyxDQUFBO2dCQUNGLFlBQVksR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7WUFDMUMsQ0FBQztZQUNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN2RCxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3hCLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QsQ0FBQTtBQXJiWSxZQUFZO0lBRXRCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7R0FUSCxZQUFZLENBcWJ4QiJ9