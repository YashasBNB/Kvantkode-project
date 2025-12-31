/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TimeoutTimer } from '../../../common/async.js';
import { Disposable } from '../../../common/lifecycle.js';
export class ScrollbarVisibilityController extends Disposable {
    constructor(visibility, visibleClassName, invisibleClassName) {
        super();
        this._visibility = visibility;
        this._visibleClassName = visibleClassName;
        this._invisibleClassName = invisibleClassName;
        this._domNode = null;
        this._isVisible = false;
        this._isNeeded = false;
        this._rawShouldBeVisible = false;
        this._shouldBeVisible = false;
        this._revealTimer = this._register(new TimeoutTimer());
    }
    setVisibility(visibility) {
        if (this._visibility !== visibility) {
            this._visibility = visibility;
            this._updateShouldBeVisible();
        }
    }
    // ----------------- Hide / Reveal
    setShouldBeVisible(rawShouldBeVisible) {
        this._rawShouldBeVisible = rawShouldBeVisible;
        this._updateShouldBeVisible();
    }
    _applyVisibilitySetting() {
        if (this._visibility === 2 /* ScrollbarVisibility.Hidden */) {
            return false;
        }
        if (this._visibility === 3 /* ScrollbarVisibility.Visible */) {
            return true;
        }
        return this._rawShouldBeVisible;
    }
    _updateShouldBeVisible() {
        const shouldBeVisible = this._applyVisibilitySetting();
        if (this._shouldBeVisible !== shouldBeVisible) {
            this._shouldBeVisible = shouldBeVisible;
            this.ensureVisibility();
        }
    }
    setIsNeeded(isNeeded) {
        if (this._isNeeded !== isNeeded) {
            this._isNeeded = isNeeded;
            this.ensureVisibility();
        }
    }
    setDomNode(domNode) {
        this._domNode = domNode;
        this._domNode.setClassName(this._invisibleClassName);
        // Now that the flags & the dom node are in a consistent state, ensure the Hidden/Visible configuration
        this.setShouldBeVisible(false);
    }
    ensureVisibility() {
        if (!this._isNeeded) {
            // Nothing to be rendered
            this._hide(false);
            return;
        }
        if (this._shouldBeVisible) {
            this._reveal();
        }
        else {
            this._hide(true);
        }
    }
    _reveal() {
        if (this._isVisible) {
            return;
        }
        this._isVisible = true;
        // The CSS animation doesn't play otherwise
        this._revealTimer.setIfNotSet(() => {
            this._domNode?.setClassName(this._visibleClassName);
        }, 0);
    }
    _hide(withFadeAway) {
        this._revealTimer.cancel();
        if (!this._isVisible) {
            return;
        }
        this._isVisible = false;
        this._domNode?.setClassName(this._invisibleClassName + (withFadeAway ? ' fade' : ''));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYmFyVmlzaWJpbGl0eUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL3Njcm9sbGJhclZpc2liaWxpdHlDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHekQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFXNUQsWUFDQyxVQUErQixFQUMvQixnQkFBd0IsRUFDeEIsa0JBQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFBO1FBQ3pDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtRQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7UUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRU0sYUFBYSxDQUFDLFVBQStCO1FBQ25ELElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtZQUM3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