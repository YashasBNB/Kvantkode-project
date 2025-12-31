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
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import * as dom from '../../../../../base/browser/dom.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { convertBufferRangeToViewport } from './terminalLinkHelpers.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
let TerminalLink = class TerminalLink extends Disposable {
    get onInvalidated() {
        return this._onInvalidated.event;
    }
    get type() {
        return this._type;
    }
    constructor(_xterm, range, text, uri, parsedLink, actions, _viewportY, _activateCallback, _tooltipCallback, _isHighConfidenceLink, label, _type, _configurationService) {
        super();
        this._xterm = _xterm;
        this.range = range;
        this.text = text;
        this.uri = uri;
        this.parsedLink = parsedLink;
        this.actions = actions;
        this._viewportY = _viewportY;
        this._activateCallback = _activateCallback;
        this._tooltipCallback = _tooltipCallback;
        this._isHighConfidenceLink = _isHighConfidenceLink;
        this.label = label;
        this._type = _type;
        this._configurationService = _configurationService;
        this._tooltipScheduler = this._register(new MutableDisposable());
        this._hoverListeners = this._register(new MutableDisposable());
        this._onInvalidated = new Emitter();
        this.decorations = {
            pointerCursor: false,
            underline: this._isHighConfidenceLink,
        };
    }
    activate(event, text) {
        this._activateCallback(event, text);
    }
    hover(event, text) {
        const w = dom.getWindow(event);
        const d = w.document;
        // Listen for modifier before handing it off to the hover to handle so it gets disposed correctly
        const hoverListeners = (this._hoverListeners.value = new DisposableStore());
        hoverListeners.add(dom.addDisposableListener(d, 'keydown', (e) => {
            if (!e.repeat && this._isModifierDown(e)) {
                this._enableDecorations();
            }
        }));
        hoverListeners.add(dom.addDisposableListener(d, 'keyup', (e) => {
            if (!e.repeat && !this._isModifierDown(e)) {
                this._disableDecorations();
            }
        }));
        // Listen for when the terminal renders on the same line as the link
        hoverListeners.add(this._xterm.onRender((e) => {
            const viewportRangeY = this.range.start.y - this._viewportY;
            if (viewportRangeY >= e.start && viewportRangeY <= e.end) {
                this._onInvalidated.fire();
            }
        }));
        // Only show the tooltip and highlight for high confidence links (not word/search workspace
        // links). Feedback was that this makes using the terminal overly noisy.
        if (this._isHighConfidenceLink) {
            this._tooltipScheduler.value = new RunOnceScheduler(() => {
                this._tooltipCallback(this, convertBufferRangeToViewport(this.range, this._viewportY), this._isHighConfidenceLink ? () => this._enableDecorations() : undefined, this._isHighConfidenceLink ? () => this._disableDecorations() : undefined);
                // Clear out scheduler until next hover event
                this._tooltipScheduler.clear();
            }, this._configurationService.getValue('workbench.hover.delay'));
            this._tooltipScheduler.value.schedule();
        }
        const origin = { x: event.pageX, y: event.pageY };
        hoverListeners.add(dom.addDisposableListener(d, dom.EventType.MOUSE_MOVE, (e) => {
            // Update decorations
            if (this._isModifierDown(e)) {
                this._enableDecorations();
            }
            else {
                this._disableDecorations();
            }
            // Reset the scheduler if the mouse moves too much
            if (Math.abs(e.pageX - origin.x) > w.devicePixelRatio * 2 ||
                Math.abs(e.pageY - origin.y) > w.devicePixelRatio * 2) {
                origin.x = e.pageX;
                origin.y = e.pageY;
                this._tooltipScheduler.value?.schedule();
            }
        }));
    }
    leave() {
        this._hoverListeners.clear();
        this._tooltipScheduler.clear();
    }
    _enableDecorations() {
        if (!this.decorations.pointerCursor) {
            this.decorations.pointerCursor = true;
        }
        if (!this.decorations.underline) {
            this.decorations.underline = true;
        }
    }
    _disableDecorations() {
        if (this.decorations.pointerCursor) {
            this.decorations.pointerCursor = false;
        }
        if (this.decorations.underline !== this._isHighConfidenceLink) {
            this.decorations.underline = this._isHighConfidenceLink;
        }
    }
    _isModifierDown(event) {
        const multiCursorModifier = this._configurationService.getValue('editor.multiCursorModifier');
        if (multiCursorModifier === 'ctrlCmd') {
            return !!event.altKey;
        }
        return isMacintosh ? event.metaKey : event.ctrlKey;
    }
};
TerminalLink = __decorate([
    __param(12, IConfigurationService)
], TerminalLink);
export { TerminalLink };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQU05RixJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsVUFBVTtJQVMzQyxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxZQUNrQixNQUFnQixFQUN4QixLQUFtQixFQUNuQixJQUFZLEVBQ1osR0FBb0IsRUFDcEIsVUFBbUMsRUFDbkMsT0FBbUMsRUFDM0IsVUFBa0IsRUFDbEIsaUJBR0MsRUFDRCxnQkFLUixFQUNRLHFCQUE4QixFQUN0QyxLQUF5QixFQUNqQixLQUF1QixFQUNqQixxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUF0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