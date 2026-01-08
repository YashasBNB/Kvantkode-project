/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, EventType, getWindow } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isChrome, isMacintosh } from '../../../../../base/common/platform.js';
export class NotebookHorizontalTracker extends Disposable {
    constructor(_notebookEditor, _listViewScrollablement) {
        super();
        this._notebookEditor = _notebookEditor;
        this._listViewScrollablement = _listViewScrollablement;
        this._register(addDisposableListener(this._listViewScrollablement, EventType.MOUSE_WHEEL, (event) => {
            let deltaX = event.deltaX;
            let deltaY = event.deltaY;
            let wheelDeltaX = event.wheelDeltaX;
            let wheelDeltaY = event.wheelDeltaY;
            const wheelDelta = event.wheelDelta;
            const shiftConvert = !isMacintosh && event.shiftKey;
            if (shiftConvert && !deltaX) {
                deltaX = deltaY;
                deltaY = 0;
                wheelDeltaX = wheelDeltaY;
                wheelDeltaY = 0;
            }
            if (deltaX === 0) {
                return;
            }
            const hoveringOnEditor = this._notebookEditor.codeEditors.find((editor) => {
                const editorLayout = editor[1].getLayoutInfo();
                if (editorLayout.contentWidth === editorLayout.width) {
                    // no overflow
                    return false;
                }
                const editorDOM = editor[1].getDomNode();
                if (editorDOM && editorDOM.contains(event.target)) {
                    return true;
                }
                return false;
            });
            if (!hoveringOnEditor) {
                return;
            }
            const targetWindow = getWindow(event);
            const evt = {
                deltaMode: event.deltaMode,
                deltaX: deltaX,
                deltaY: 0,
                deltaZ: 0,
                wheelDelta: wheelDelta && isChrome ? wheelDelta / targetWindow.devicePixelRatio : wheelDelta,
                wheelDeltaX: wheelDeltaX && isChrome ? wheelDeltaX / targetWindow.devicePixelRatio : wheelDeltaX,
                wheelDeltaY: 0,
                detail: event.detail,
                shiftKey: event.shiftKey,
                type: event.type,
                defaultPrevented: false,
                preventDefault: () => { },
                stopPropagation: () => { },
            };
            hoveringOnEditor[1].delegateScrollFromMouseWheelEvent(evt);
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tIb3Jpem9udGFsVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tIb3Jpem9udGFsVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSTlFLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBQ3hELFlBQ2tCLGVBQXdDLEVBQ3hDLHVCQUFvQztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQUhVLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUN4Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQWE7UUFJckQsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FDcEIsSUFBSSxDQUFDLHVCQUF1QixFQUM1QixTQUFTLENBQUMsV0FBVyxFQUNyQixDQUFDLEtBQXVCLEVBQUUsRUFBRTtZQUMzQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1lBQ3pCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7WUFDekIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQTtZQUNuQyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFBO1lBQ25DLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUE7WUFFbkMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQTtZQUNuRCxJQUFJLFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixNQUFNLEdBQUcsTUFBTSxDQUFBO2dCQUNmLE1BQU0sR0FBRyxDQUFDLENBQUE7Z0JBQ1YsV0FBVyxHQUFHLFdBQVcsQ0FBQTtnQkFDekIsV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNoQixDQUFDO1lBRUQsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDekUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFBO2dCQUM5QyxJQUFJLFlBQVksQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUN0RCxjQUFjO29CQUNkLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO2dCQUN4QyxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFxQixDQUFDLEVBQUUsQ0FBQztvQkFDbEUsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFFRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUMsQ0FBQyxDQUFBO1lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZCLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sR0FBRyxHQUFHO2dCQUNYLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDMUIsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsVUFBVSxFQUNULFVBQVUsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFVBQVU7Z0JBQ2pGLFdBQVcsRUFDVixXQUFXLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxXQUFXO2dCQUNwRixXQUFXLEVBQUUsQ0FBQztnQkFDZCxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3BCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtnQkFDeEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixjQUFjLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztnQkFDeEIsZUFBZSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7YUFDekIsQ0FFQTtZQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBc0IsQ0FBQyxpQ0FBaUMsQ0FBQyxHQUFVLENBQUMsQ0FBQTtRQUN6RixDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=