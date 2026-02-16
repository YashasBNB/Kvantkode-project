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
import { getWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    /**
     * The _normal_ buffer length threshold at which point resizing starts being debounced.
     */
    Constants[Constants["StartDebouncingThreshold"] = 200] = "StartDebouncingThreshold";
})(Constants || (Constants = {}));
export class TerminalResizeDebouncer extends Disposable {
    constructor(_isVisible, _getXterm, _resizeBothCallback, _resizeXCallback, _resizeYCallback) {
        super();
        this._isVisible = _isVisible;
        this._getXterm = _getXterm;
        this._resizeBothCallback = _resizeBothCallback;
        this._resizeXCallback = _resizeXCallback;
        this._resizeYCallback = _resizeYCallback;
        this._latestX = 0;
        this._latestY = 0;
        this._resizeXJob = this._register(new MutableDisposable());
        this._resizeYJob = this._register(new MutableDisposable());
    }
    async resize(cols, rows, immediate) {
        this._latestX = cols;
        this._latestY = rows;
        // Resize immediately if requested explicitly or if the buffer is small
        if (immediate ||
            this._getXterm().raw.buffer.normal.length < 200 /* Constants.StartDebouncingThreshold */) {
            this._resizeXJob.clear();
            this._resizeYJob.clear();
            this._resizeBothCallback(cols, rows);
            return;
        }
        // Resize in an idle callback if the terminal is not visible
        const win = getWindow(this._getXterm().raw.element);
        if (win && !this._isVisible()) {
            if (!this._resizeXJob.value) {
                this._resizeXJob.value = runWhenWindowIdle(win, async () => {
                    this._resizeXCallback(this._latestX);
                    this._resizeXJob.clear();
                });
            }
            if (!this._resizeYJob.value) {
                this._resizeYJob.value = runWhenWindowIdle(win, async () => {
                    this._resizeYCallback(this._latestY);
                    this._resizeYJob.clear();
                });
            }
            return;
        }
        // Update dimensions independently as vertical resize is cheap and horizontal resize is
        // expensive due to reflow.
        this._resizeYCallback(rows);
        this._latestX = cols;
        this._debounceResizeX(cols);
    }
    flush() {
        if (this._resizeXJob.value || this._resizeYJob.value) {
            this._resizeXJob.clear();
            this._resizeYJob.clear();
            this._resizeBothCallback(this._latestX, this._latestY);
        }
    }
    _debounceResizeX(cols) {
        this._resizeXCallback(cols);
    }
}
__decorate([
    debounce(100)
], TerminalResizeDebouncer.prototype, "_debounceResizeX", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZXNpemVEZWJvdW5jZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxSZXNpemVEZWJvdW5jZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHcEYsSUFBVyxTQUtWO0FBTEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsbUZBQThCLENBQUE7QUFDL0IsQ0FBQyxFQUxVLFNBQVMsS0FBVCxTQUFTLFFBS25CO0FBRUQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFPdEQsWUFDa0IsVUFBeUIsRUFDekIsU0FBMEMsRUFDMUMsbUJBQXlELEVBQ3pELGdCQUF3QyxFQUN4QyxnQkFBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFOVSxlQUFVLEdBQVYsVUFBVSxDQUFlO1FBQ3pCLGNBQVMsR0FBVCxTQUFTLENBQWlDO1FBQzFDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0M7UUFDekQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF3QjtRQUN4QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXdCO1FBWGxELGFBQVEsR0FBVyxDQUFDLENBQUE7UUFDcEIsYUFBUSxHQUFXLENBQUMsQ0FBQTtRQUVYLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUNyRCxnQkFB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