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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tIb3Jpem9udGFsVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rSG9yaXpvbnRhbFRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUk5RSxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUN4RCxZQUNrQixlQUF3QyxFQUN4Qyx1QkFBb0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFIVSxvQkFBZSxHQUFmLGVBQWUsQ0FBeUI7UUFDeEMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFhO1FBSXJELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQ3BCLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsU0FBUyxDQUFDLFdBQVcsRUFDckIsQ0FBQyxLQUF1QixFQUFFLEVBQUU7WUFDM0IsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtZQUN6QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1lBQ3pCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUE7WUFDbkMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQTtZQUNuQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFBO1lBRW5DLE1BQU0sWUFBWSxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUE7WUFDbkQsSUFBSSxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxHQUFHLE1BQU0sQ0FBQTtnQkFDZixNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNWLFdBQVcsR0FBRyxXQUFXLENBQUE7Z0JBQ3pCLFdBQVcsR0FBRyxDQUFDLENBQUE7WUFDaEIsQ0FBQztZQUVELElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsQixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3pFLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtnQkFDOUMsSUFBSSxZQUFZLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdEQsY0FBYztvQkFDZCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDeEMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQ2xFLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBRUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDLENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQyxNQUFNLEdBQUcsR0FBRztnQkFDWCxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzFCLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE1BQU0sRUFBRSxDQUFDO2dCQUNULE1BQU0sRUFBRSxDQUFDO2dCQUNULFVBQVUsRUFDVCxVQUFVLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxVQUFVO2dCQUNqRixXQUFXLEVBQ1YsV0FBVyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsV0FBVztnQkFDcEYsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO2dCQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7Z0JBQ3hCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsZ0JBQWdCLEVBQUUsS0FBSztnQkFDdkIsY0FBYyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7Z0JBQ3hCLGVBQWUsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO2FBQ3pCLENBRUE7WUFBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQXNCLENBQUMsaUNBQWlDLENBQUMsR0FBVSxDQUFDLENBQUE7UUFDekYsQ0FBQyxDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9