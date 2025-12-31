/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Allows webviews to monitor when an element in the VS Code editor is being dragged/dropped.
 *
 * This is required since webview end up eating the drag event. VS Code needs to see this
 * event so it can handle editor element drag drop.
 */
export class WebviewWindowDragMonitor extends Disposable {
    constructor(targetWindow, getWebview) {
        super();
        const onDragStart = () => {
            getWebview()?.windowDidDragStart();
        };
        const onDragEnd = () => {
            getWebview()?.windowDidDragEnd();
        };
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_START, () => {
            onDragStart();
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_END, onDragEnd));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.MOUSE_MOVE, (currentEvent) => {
            if (currentEvent.buttons === 0) {
                onDragEnd();
            }
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG, (event) => {
            if (event.shiftKey) {
                onDragEnd();
            }
            else {
                onDragStart();
            }
        }));
        this._register(DOM.addDisposableListener(targetWindow, DOM.EventType.DRAG_OVER, (event) => {
            if (event.shiftKey) {
                onDragEnd();
            }
            else {
                onDragStart();
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1dpbmRvd0RyYWdNb25pdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3dlYnZpZXdXaW5kb3dEcmFnTW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdqRTs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUFVO0lBQ3ZELFlBQVksWUFBd0IsRUFBRSxVQUFzQztRQUMzRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUN4QixVQUFVLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxDQUFBO1FBQ25DLENBQUMsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtZQUN0QixVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFBO1FBQ2pDLENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDdEUsV0FBVyxFQUFFLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFFMUYsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDbEYsSUFBSSxZQUFZLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDckUsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3BCLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsRUFBRSxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMxRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDcEIsU0FBUyxFQUFFLENBQUE7WUFDWixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyxFQUFFLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9