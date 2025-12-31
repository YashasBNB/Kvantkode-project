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
var GlyphHoverController_1;
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import './hover.css';
import { GlyphHoverWidget } from './glyphHoverWidget.js';
// sticky hover widget which doesn't disappear on focus out and such
const _sticky = false;
let GlyphHoverController = class GlyphHoverController extends Disposable {
    static { GlyphHoverController_1 = this; }
    static { this.ID = 'editor.contrib.marginHover'; }
    constructor(_editor, _instantiationService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
        this._listenersStore = new DisposableStore();
        this._hoverState = {
            mouseDown: false,
        };
        this._reactToEditorMouseMoveRunner = this._register(new RunOnceScheduler(() => this._reactToEditorMouseMove(this._mouseMoveEvent), 0));
        this._hookListeners();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(62 /* EditorOption.hover */)) {
                this._unhookListeners();
                this._hookListeners();
            }
        }));
    }
    static get(editor) {
        return editor.getContribution(GlyphHoverController_1.ID);
    }
    _hookListeners() {
        const hoverOpts = this._editor.getOption(62 /* EditorOption.hover */);
        this._hoverSettings = {
            enabled: hoverOpts.enabled,
            sticky: hoverOpts.sticky,
            hidingDelay: hoverOpts.hidingDelay,
        };
        if (hoverOpts.enabled) {
            this._listenersStore.add(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
            this._listenersStore.add(this._editor.onMouseUp(() => this._onEditorMouseUp()));
            this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
            this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        }
        else {
            this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
            this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        }
        this._listenersStore.add(this._editor.onMouseLeave((e) => this._onEditorMouseLeave(e)));
        this._listenersStore.add(this._editor.onDidChangeModel(() => {
            this._cancelScheduler();
            this.hideGlyphHover();
        }));
        this._listenersStore.add(this._editor.onDidChangeModelContent(() => this._cancelScheduler()));
        this._listenersStore.add(this._editor.onDidScrollChange((e) => this._onEditorScrollChanged(e)));
    }
    _unhookListeners() {
        this._listenersStore.clear();
    }
    _cancelScheduler() {
        this._mouseMoveEvent = undefined;
        this._reactToEditorMouseMoveRunner.cancel();
    }
    _onEditorScrollChanged(e) {
        if (e.scrollTopChanged || e.scrollLeftChanged) {
            this.hideGlyphHover();
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._hoverState.mouseDown = true;
        const shouldNotHideCurrentHoverWidget = this._isMouseOnGlyphHoverWidget(mouseEvent);
        if (shouldNotHideCurrentHoverWidget) {
            return;
        }
        this.hideGlyphHover();
    }
    _isMouseOnGlyphHoverWidget(mouseEvent) {
        const glyphHoverWidgetNode = this._glyphWidget?.getDomNode();
        if (glyphHoverWidgetNode) {
            return isMousePositionWithinElement(glyphHoverWidgetNode, mouseEvent.event.posx, mouseEvent.event.posy);
        }
        return false;
    }
    _onEditorMouseUp() {
        this._hoverState.mouseDown = false;
    }
    _onEditorMouseLeave(mouseEvent) {
        if (this.shouldKeepOpenOnEditorMouseMoveOrLeave) {
            return;
        }
        this._cancelScheduler();
        const shouldNotHideCurrentHoverWidget = this._isMouseOnGlyphHoverWidget(mouseEvent);
        if (shouldNotHideCurrentHoverWidget) {
            return;
        }
        if (_sticky) {
            return;
        }
        this.hideGlyphHover();
    }
    _shouldNotRecomputeCurrentHoverWidget(mouseEvent) {
        const isHoverSticky = this._hoverSettings.sticky;
        const isMouseOnGlyphHoverWidget = this._isMouseOnGlyphHoverWidget(mouseEvent);
        return isHoverSticky && isMouseOnGlyphHoverWidget;
    }
    _onEditorMouseMove(mouseEvent) {
        if (this.shouldKeepOpenOnEditorMouseMoveOrLeave) {
            return;
        }
        this._mouseMoveEvent = mouseEvent;
        const shouldNotRecomputeCurrentHoverWidget = this._shouldNotRecomputeCurrentHoverWidget(mouseEvent);
        if (shouldNotRecomputeCurrentHoverWidget) {
            this._reactToEditorMouseMoveRunner.cancel();
            return;
        }
        this._reactToEditorMouseMove(mouseEvent);
    }
    _reactToEditorMouseMove(mouseEvent) {
        if (!mouseEvent) {
            return;
        }
        const glyphWidgetShowsOrWillShow = this._tryShowHoverWidget(mouseEvent);
        if (glyphWidgetShowsOrWillShow) {
            return;
        }
        if (_sticky) {
            return;
        }
        this.hideGlyphHover();
    }
    _tryShowHoverWidget(mouseEvent) {
        const glyphWidget = this._getOrCreateGlyphWidget();
        return glyphWidget.showsOrWillShow(mouseEvent);
    }
    _onKeyDown(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (e.keyCode === 5 /* KeyCode.Ctrl */ ||
            e.keyCode === 6 /* KeyCode.Alt */ ||
            e.keyCode === 57 /* KeyCode.Meta */ ||
            e.keyCode === 4 /* KeyCode.Shift */) {
            // Do not hide hover when a modifier key is pressed
            return;
        }
        this.hideGlyphHover();
    }
    hideGlyphHover() {
        if (_sticky) {
            return;
        }
        this._glyphWidget?.hide();
    }
    _getOrCreateGlyphWidget() {
        if (!this._glyphWidget) {
            this._glyphWidget = this._instantiationService.createInstance(GlyphHoverWidget, this._editor);
        }
        return this._glyphWidget;
    }
    dispose() {
        super.dispose();
        this._unhookListeners();
        this._listenersStore.dispose();
        this._glyphWidget?.dispose();
    }
};
GlyphHoverController = GlyphHoverController_1 = __decorate([
    __param(1, IInstantiationService)
], GlyphHoverController);
export { GlyphHoverController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhIb3ZlckNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2dseXBoSG92ZXJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBUWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzlELE9BQU8sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXhELG9FQUFvRTtBQUNwRSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUE7QUFZZCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7O2FBQzVCLE9BQUUsR0FBRyw0QkFBNEIsQUFBL0IsQ0FBK0I7SUFleEQsWUFDa0IsT0FBb0IsRUFDZCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFIVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0csMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWY5RSwyQ0FBc0MsR0FBWSxLQUFLLENBQUE7UUFFN0Msb0JBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBT2hELGdCQUFXLEdBQWdCO1lBQ2xDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUE7UUFPQSxJQUFJLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEQsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNqRixDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQTRCLEVBQUUsRUFBRTtZQUN0RSxJQUFJLENBQUMsQ0FBQyxVQUFVLDZCQUFvQixFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO2dCQUN2QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDdEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUM3QixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQXVCLHNCQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFTyxjQUFjO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyw2QkFBb0IsQ0FBQTtRQUM1RCxJQUFJLENBQUMsY0FBYyxHQUFHO1lBQ3JCLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztZQUMxQixNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07WUFDeEIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXO1NBQ2xDLENBQUE7UUFFRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDOUUsQ0FBQTtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvRSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDOUUsQ0FBQTtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBaUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDOUUsQ0FBQTtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBaUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUYsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBZSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbkYsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1FBQ2hDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUM1QyxDQUFDO0lBRU8sc0JBQXNCLENBQUMsQ0FBZTtRQUM3QyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxVQUE2QjtRQUN2RCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDakMsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkYsSUFBSSwrQkFBK0IsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxVQUFvQztRQUN0RSxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUE7UUFDNUQsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE9BQU8sNEJBQTRCLENBQ2xDLG9CQUFvQixFQUNwQixVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFDckIsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3JCLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtJQUNuQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBb0M7UUFDL0QsSUFBSSxJQUFJLENBQUMsc0NBQXNDLEVBQUUsQ0FBQztZQUNqRCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3ZCLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ25GLElBQUksK0JBQStCLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRU8scUNBQXFDLENBQUMsVUFBNkI7UUFDMUUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUE7UUFDaEQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0UsT0FBTyxhQUFhLElBQUkseUJBQXlCLENBQUE7SUFDbEQsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFVBQTZCO1FBQ3ZELElBQUksSUFBSSxDQUFDLHNDQUFzQyxFQUFFLENBQUM7WUFDakQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQTtRQUNqQyxNQUFNLG9DQUFvQyxHQUN6QyxJQUFJLENBQUMscUNBQXFDLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdkQsSUFBSSxvQ0FBb0MsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUMzQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsVUFBeUM7UUFDeEUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdkUsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxVQUE2QjtRQUN4RCxNQUFNLFdBQVcsR0FBaUIsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDaEUsT0FBTyxXQUFXLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTyxVQUFVLENBQUMsQ0FBaUI7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQ0MsQ0FBQyxDQUFDLE9BQU8seUJBQWlCO1lBQzFCLENBQUMsQ0FBQyxPQUFPLHdCQUFnQjtZQUN6QixDQUFDLENBQUMsT0FBTywwQkFBaUI7WUFDMUIsQ0FBQyxDQUFDLE9BQU8sMEJBQWtCLEVBQzFCLENBQUM7WUFDRixtREFBbUQ7WUFDbkQsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5RixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUM3QixDQUFDOztBQS9NVyxvQkFBb0I7SUFrQjlCLFdBQUEscUJBQXFCLENBQUE7R0FsQlgsb0JBQW9CLENBZ05oQyJ9