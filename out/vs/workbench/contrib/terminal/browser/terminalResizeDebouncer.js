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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZXNpemVEZWJvdW5jZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsUmVzaXplRGVib3VuY2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3BGLElBQVcsU0FLVjtBQUxELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILG1GQUE4QixDQUFBO0FBQy9CLENBQUMsRUFMVSxTQUFTLEtBQVQsU0FBUyxRQUtuQjtBQUVELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBT3RELFlBQ2tCLFVBQXlCLEVBQ3pCLFNBQTBDLEVBQzFDLG1CQUF5RCxFQUN6RCxnQkFBd0MsRUFDeEMsZ0JBQXdDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBTlUsZUFBVSxHQUFWLFVBQVUsQ0FBZTtRQUN6QixjQUFTLEdBQVQsU0FBUyxDQUFpQztRQUMxQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNDO1FBQ3pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0I7UUFDeEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF3QjtRQVhsRCxhQUFRLEdBQVcsQ0FBQyxDQUFBO1FBQ3BCLGFBQVEsR0FBVyxDQUFDLENBQUE7UUFFWCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDckQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxD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