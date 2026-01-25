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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYnVmZmVyQ29udGVudFRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxxREFBcUQsQ0FBQTtBQUlyRCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFXbkQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFJRCxZQUNrQixNQUEyRCxFQUNyRCxxQkFBNkQsRUFDL0QsV0FBaUQ7UUFFdEUsS0FBSyxFQUFFLENBQUE7UUFKVSxXQUFNLEdBQU4sTUFBTSxDQUFxRDtRQUNwQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQWZ2RTs7V0FFRztRQUNLLGtDQUE2QixHQUFXLENBQUMsQ0FBQTtRQUV6QyxXQUFNLEdBQWEsRUFBRSxDQUFBO1FBSzdCLDhCQUF5QixHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFBO0lBUTFELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUks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