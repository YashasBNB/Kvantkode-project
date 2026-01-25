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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHRVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9uYXRpdmUvbmF0aXZlRWRpdENvbnRleHRVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixhQUFhLEdBQ2IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFTakYsTUFBTSxPQUFPLFlBQWEsU0FBUSxVQUFVO0lBSTNDLFlBQ2tCLFFBQXFCLEVBQ3JCLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFBO1FBSFUsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixtQkFBYyxHQUFkLGNBQWMsQ0FBa0M7UUFMMUQsZUFBVSxHQUFZLEtBQUssQ0FBQTtRQUMzQixjQUFTLEdBQVksS0FBSyxDQUFBO1FBT2pDLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFNO1lBQ1AsQ0FBQztZQUNELHVEQUF1RDtZQUN2RCxxREFBcUQ7WUFDckQscURBQXFEO1lBQ3JELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNqRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDdEIsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZ0I7UUFDN0MsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUE7UUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSyxhQUFhLENBQUE7UUFDL0MsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxNQUFtQixFQUNuQixJQUFPLEVBQ1AsUUFBcUYsRUFDckYsT0FBMkM7SUFFM0MsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdkQsT0FBTztRQUNOLE9BQU87WUFDTixNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFFBQWUsQ0FBQyxDQUFBO1FBQ2xELENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9