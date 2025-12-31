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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
let BufferContentTracker = class BufferContentTracker extends Disposable {
    get lines() {
        return this._lines;
    }
    constructor(_xterm, _configurationService, _logService) {
        super();
        this._xterm = _xterm;
        this._configurationService = _configurationService;
        this._logService = _logService;
        /**
         * The number of wrapped lines in the viewport when the last cached marker was set
         */
        this._priorEditorViewportLineCount = 0;
        this._lines = [];
        this.bufferToEditorLineMapping = new Map();
    }
    reset() {
        this._lines = [];
        this._lastCachedMarker = undefined;
        this.update();
    }
    update() {
        if (this._lastCachedMarker?.isDisposed) {
            // the terminal was cleared, reset the cache
            this._lines = [];
            this._lastCachedMarker = undefined;
        }
        this._removeViewportContent();
        this._updateCachedContent();
        this._updateViewportContent();
        this._lastCachedMarker = this._register(this._xterm.raw.registerMarker());
        this._logService.debug('Buffer content tracker: set ', this._lines.length, ' lines');
    }
    _updateCachedContent() {
        const buffer = this._xterm.raw.buffer.active;
        const start = this._lastCachedMarker?.line
            ? this._lastCachedMarker.line - this._xterm.raw.rows + 1
            : 0;
        const end = buffer.baseY;
        if (start < 0 || start > end) {
            // in the viewport, no need to cache
            return;
        }
        // to keep the cache size down, remove any lines that are no longer in the scrollback
        const scrollback = this._configurationService.getValue("terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */);
        const maxBufferSize = scrollback + this._xterm.raw.rows - 1;
        const linesToAdd = end - start;
        if (linesToAdd + this._lines.length > maxBufferSize) {
            const numToRemove = linesToAdd + this._lines.length - maxBufferSize;
            for (let i = 0; i < numToRemove; i++) {
                this._lines.shift();
            }
            this._logService.debug('Buffer content tracker: removed ', numToRemove, ' lines from top of cached lines, now ', this._lines.length, ' lines');
        }
        // iterate through the buffer lines and add them to the editor line cache
        const cachedLines = [];
        let currentLine = '';
        for (let i = start; i < end; i++) {
            const line = buffer.getLine(i);
            if (!line) {
                continue;
            }
            this.bufferToEditorLineMapping.set(i, this._lines.length + cachedLines.length);
            const isWrapped = buffer.getLine(i + 1)?.isWrapped;
            currentLine += line.translateToString(!isWrapped);
            if ((currentLine && !isWrapped) || i === buffer.baseY + this._xterm.raw.rows - 1) {
                if (line.length) {
                    cachedLines.push(currentLine);
                    currentLine = '';
                }
            }
        }
        this._logService.debug('Buffer content tracker:', cachedLines.length, ' lines cached');
        this._lines.push(...cachedLines);
    }
    _removeViewportContent() {
        if (!this._lines.length) {
            return;
        }
        // remove previous viewport content in case it has changed
        let linesToRemove = this._priorEditorViewportLineCount;
        let index = 1;
        while (linesToRemove) {
            this.bufferToEditorLineMapping.forEach((value, key) => {
                if (value === this._lines.length - index) {
                    this.bufferToEditorLineMapping.delete(key);
                }
            });
            this._lines.pop();
            index++;
            linesToRemove--;
        }
        this._logService.debug('Buffer content tracker: removed lines from viewport, now ', this._lines.length, ' lines cached');
    }
    _updateViewportContent() {
        const buffer = this._xterm.raw.buffer.active;
        this._priorEditorViewportLineCount = 0;
        let currentLine = '';
        for (let i = buffer.baseY; i < buffer.baseY + this._xterm.raw.rows; i++) {
            const line = buffer.getLine(i);
            if (!line) {
                continue;
            }
            this.bufferToEditorLineMapping.set(i, this._lines.length);
            const isWrapped = buffer.getLine(i + 1)?.isWrapped;
            currentLine += line.translateToString(!isWrapped);
            if ((currentLine && !isWrapped) || i === buffer.baseY + this._xterm.raw.rows - 1) {
                if (currentLine.length) {
                    this._priorEditorViewportLineCount++;
                    this._lines.push(currentLine);
                    currentLine = '';
                }
            }
        }
        this._logService.debug('Viewport content update complete, ', this._lines.length, ' lines in the viewport');
    }
};
BufferContentTracker = __decorate([
    __param(1, IConfigurationService),
    __param(2, ITerminalLogService)
], BufferContentTracker);
export { BufferContentTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2J1ZmZlckNvbnRlbnRUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0scURBQXFELENBQUE7QUFJckQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBV25ELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBSUQsWUFDa0IsTUFBMkQsRUFDckQscUJBQTZELEVBQy9ELFdBQWlEO1FBRXRFLEtBQUssRUFBRSxDQUFBO1FBSlUsV0FBTSxHQUFOLE1BQU0sQ0FBcUQ7UUFDcEMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFmdkU7O1dBRUc7UUFDSyxrQ0FBNkIsR0FBVyxDQUFDLENBQUE7UUFFekMsV0FBTSxHQUFhLEVBQUUsQ0FBQTtRQUs3Qiw4QkFBeUIsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQVExRCxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2hCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUE7UUFDbEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLElBQUks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