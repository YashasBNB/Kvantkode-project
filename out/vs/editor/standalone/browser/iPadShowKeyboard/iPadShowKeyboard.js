/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iPadShowKeyboard.css';
import * as dom from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { isIOS } from '../../../../base/common/platform.js';
export class IPadShowKeyboard extends Disposable {
    static { this.ID = 'editor.contrib.iPadShowKeyboard'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this.widget = null;
        if (isIOS) {
            this._register(editor.onDidChangeConfiguration(() => this.update()));
            this.update();
        }
    }
    update() {
        const shouldHaveWidget = !this.editor.getOption(96 /* EditorOption.readOnly */);
        if (!this.widget && shouldHaveWidget) {
            this.widget = new ShowKeyboardWidget(this.editor);
        }
        else if (this.widget && !shouldHaveWidget) {
            this.widget.dispose();
            this.widget = null;
        }
    }
    dispose() {
        super.dispose();
        if (this.widget) {
            this.widget.dispose();
            this.widget = null;
        }
    }
}
class ShowKeyboardWidget extends Disposable {
    static { this.ID = 'editor.contrib.ShowKeyboardWidget'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this._domNode = document.createElement('textarea');
        this._domNode.className = 'iPadShowKeyboard';
        this._register(dom.addDisposableListener(this._domNode, 'touchstart', (e) => {
            this.editor.focus();
        }));
        this._register(dom.addDisposableListener(this._domNode, 'focus', (e) => {
            this.editor.focus();
        }));
        this.editor.addOverlayWidget(this);
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
    // ----- IOverlayWidget API
    getId() {
        return ShowKeyboardWidget.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */,
        };
    }
}
registerEditorContribution(IPadShowKeyboard.ID, IPadShowKeyboard, 3 /* EditorContributionInstantiation.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaVBhZFNob3dLZXlib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvaVBhZFNob3dLZXlib2FyZC9pUGFkU2hvd0tleWJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFPakUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTthQUN4QixPQUFFLEdBQUcsaUNBQWlDLENBQUE7SUFLN0QsWUFBWSxNQUFtQjtRQUM5QixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTTtRQUNiLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLENBQUE7UUFFdEUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xELENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7O0FBR0YsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO2FBQ2xCLE9BQUUsR0FBRyxtQ0FBbUMsQ0FBQTtJQU1oRSxZQUFZLE1BQW1CO1FBQzlCLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFBO1FBRTVDLElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFFcEIsS0FBSztRQUNYLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFTSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPO1lBQ04sVUFBVSw2REFBcUQ7U0FDL0QsQ0FBQTtJQUNGLENBQUM7O0FBR0YsMEJBQTBCLENBQ3pCLGdCQUFnQixDQUFDLEVBQUUsRUFDbkIsZ0JBQWdCLHFEQUVoQixDQUFBIn0=