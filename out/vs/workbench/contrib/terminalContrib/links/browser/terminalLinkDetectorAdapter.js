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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLink } from './terminalLink.js';
/**
 * Wrap a link detector object so it can be used in xterm.js
 */
let TerminalLinkDetectorAdapter = class TerminalLinkDetectorAdapter extends Disposable {
    constructor(_detector, _instantiationService) {
        super();
        this._detector = _detector;
        this._instantiationService = _instantiationService;
        this._onDidActivateLink = this._register(new Emitter());
        this.onDidActivateLink = this._onDidActivateLink.event;
        this._onDidShowHover = this._register(new Emitter());
        this.onDidShowHover = this._onDidShowHover.event;
        this._activeProvideLinkRequests = new Map();
    }
    async provideLinks(bufferLineNumber, callback) {
        let activeRequest = this._activeProvideLinkRequests.get(bufferLineNumber);
        if (activeRequest) {
            await activeRequest;
            callback(this._activeLinks);
            return;
        }
        if (this._activeLinks) {
            for (const link of this._activeLinks) {
                link.dispose();
            }
        }
        activeRequest = this._provideLinks(bufferLineNumber);
        this._activeProvideLinkRequests.set(bufferLineNumber, activeRequest);
        this._activeLinks = await activeRequest;
        this._activeProvideLinkRequests.delete(bufferLineNumber);
        callback(this._activeLinks);
    }
    async _provideLinks(bufferLineNumber) {
        // Dispose of all old links if new links are provided, links are only cached for the current line
        const links = [];
        let startLine = bufferLineNumber - 1;
        let endLine = startLine;
        const lines = [this._detector.xterm.buffer.active.getLine(startLine)];
        // Cap the maximum context on either side of the line being provided, by taking the context
        // around the line being provided for this ensures the line the pointer is on will have
        // links provided.
        const maxCharacterContext = Math.max(this._detector.maxLinkLength, this._detector.xterm.cols);
        const maxLineContext = Math.ceil(maxCharacterContext / this._detector.xterm.cols);
        const minStartLine = Math.max(startLine - maxLineContext, 0);
        const maxEndLine = Math.min(endLine + maxLineContext, this._detector.xterm.buffer.active.length);
        while (startLine >= minStartLine &&
            this._detector.xterm.buffer.active.getLine(startLine)?.isWrapped) {
            lines.unshift(this._detector.xterm.buffer.active.getLine(startLine - 1));
            startLine--;
        }
        while (endLine < maxEndLine &&
            this._detector.xterm.buffer.active.getLine(endLine + 1)?.isWrapped) {
            lines.push(this._detector.xterm.buffer.active.getLine(endLine + 1));
            endLine++;
        }
        const detectedLinks = await this._detector.detect(lines, startLine, endLine);
        for (const link of detectedLinks) {
            links.push(this._createTerminalLink(link, async (event) => this._onDidActivateLink.fire({ link, event })));
        }
        return links;
    }
    _createTerminalLink(l, activateCallback) {
        // Remove trailing colon if there is one so the link is more useful
        if (!l.disableTrimColon && l.text.length > 0 && l.text.charAt(l.text.length - 1) === ':') {
            l.text = l.text.slice(0, -1);
            l.bufferRange.end.x--;
        }
        return this._instantiationService.createInstance(TerminalLink, this._detector.xterm, l.bufferRange, l.text, l.uri, l.parsedLink, l.actions, this._detector.xterm.buffer.active.viewportY, activateCallback, (link, viewportRange, modifierDownCallback, modifierUpCallback) => this._onDidShowHover.fire({
            link,
            viewportRange,
            modifierDownCallback,
            modifierUpCallback,
        }), l.type !== "Search" /* TerminalBuiltinLinkType.Search */, // Only search is low confidence
        l.label || this._getLabel(l.type), l.type);
    }
    _getLabel(type) {
        switch (type) {
            case "Search" /* TerminalBuiltinLinkType.Search */:
                return localize('searchWorkspace', 'Search workspace');
            case "LocalFile" /* TerminalBuiltinLinkType.LocalFile */:
                return localize('openFile', 'Open file in editor');
            case "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */:
                return localize('focusFolder', 'Focus folder in explorer');
            case "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */:
                return localize('openFolder', 'Open folder in new window');
            case "Url" /* TerminalBuiltinLinkType.Url */:
            default:
                return localize('followLink', 'Follow link');
        }
    }
};
TerminalLinkDetectorAdapter = __decorate([
    __param(1, IInstantiationService)
], TerminalLinkDetectorAdapter);
export { TerminalLinkDetectorAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rRGV0ZWN0b3JBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rRGV0ZWN0b3JBZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBT3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQWdCaEQ7O0dBRUc7QUFDSSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFRMUQsWUFDa0IsU0FBZ0MsRUFDMUIscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSFUsY0FBUyxHQUFULFNBQVMsQ0FBdUI7UUFDVCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBUHBFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQTtRQUM5RSxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBQ3pDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBbUIsQ0FBQyxDQUFBO1FBQ3hFLG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFTNUMsK0JBQTBCLEdBQXlDLElBQUksR0FBRyxFQUFFLENB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