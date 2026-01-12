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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBTTlGLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVO0lBUzNDLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELFlBQ2tCLE1BQWdCLEVBQ3hCLEtBQW1CLEVBQ25CLElBQVksRUFDWixHQUFvQixFQUNwQixVQUFtQyxFQUNuQyxPQUFtQyxFQUMzQixVQUFrQixFQUNsQixpQkFHQyxFQUNELGdCQUtSLEVBQ1EscUJBQThCLEVBQ3RDLEtBQXlCLEVBQ2pCLEtBQXVCLEVBQ2pCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FB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