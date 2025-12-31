/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, getActiveElement, getShadowRoot, } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class FocusTracker extends Disposable {
    constructor(_domNode, _onFocusChange) {
        super();
        this._domNode = _domNode;
        this._onFocusChange = _onFocusChange;
        this._isFocused = false;
        this._isPaused = false;
        this._register(addDisposableListener(this._domNode, 'focus', () => {
            if (this._isPaused) {
                return;
            }
            // Here we don't trust the browser and instead we check
            // that the active element is the one we are tracking
            // (this happens when cmd+tab is used to switch apps)
            this.refreshFocusState();
        }));
        this._register(addDisposableListener(this._domNode, 'blur', () => {
            if (this._isPaused) {
                return;
            }
            this._handleFocusedChanged(false);
        }));
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
        this.refreshFocusState();
    }
    _handleFocusedChanged(focused) {
        if (this._isFocused === focused) {
            return;
        }
        this._isFocused = focused;
        this._onFocusChange(this._isFocused);
    }
    focus() {
        this._domNode.focus();
        this.refreshFocusState();
    }
    refreshFocusState() {
        const shadowRoot = getShadowRoot(this._domNode);
        const activeElement = shadowRoot ? shadowRoot.activeElement : getActiveElement();
        const focused = this._domNode === activeElement;
        this._handleFocusedChanged(focused);
    }
    get isFocused() {
        return this._isFocused;
    }
}
export function editContextAddDisposableListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    return {
        dispose() {
            target.removeEventListener(type, listener);
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHRVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL25hdGl2ZUVkaXRDb250ZXh0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsYUFBYSxHQUNiLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBU2pGLE1BQU0sT0FBTyxZQUFhLFNBQVEsVUFBVTtJQUkzQyxZQUNrQixRQUFxQixFQUNyQixjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQUhVLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsbUJBQWMsR0FBZCxjQUFjLENBQWtDO1FBTDFELGVBQVUsR0FBWSxLQUFLLENBQUE7UUFDM0IsY0FBUyxHQUFZLEtBQUssQ0FBQTtRQU9qQyxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTTtZQUNQLENBQUM7WUFDRCx1REFBdUQ7WUFDdkQscURBQXFEO1lBQ3JELHFEQUFxRDtZQUNyRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDakQsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxNQUFNO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUE7UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWdCO1FBQzdDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNyQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ2hGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEtBQUssYUFBYSxDQUFBO1FBQy9DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsTUFBbUIsRUFDbkIsSUFBTyxFQUNQLFFBQXFGLEVBQ3JGLE9BQTJDO0lBRTNDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZELE9BQU87UUFDTixPQUFPO1lBQ04sTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxRQUFlLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUMifQ==