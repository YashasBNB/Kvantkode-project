/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
export class FixedZoneWidget extends Disposable {
    static { this.counter = 0; }
    constructor(editor, viewZoneAccessor, afterLineNumber, height, viewZoneIdsToCleanUp) {
        super();
        this.editor = editor;
        this.overlayWidgetId = `fixedZoneWidget-${FixedZoneWidget.counter++}`;
        this.widgetDomNode = h('div.fixed-zone-widget').root;
        this.overlayWidget = {
            getId: () => this.overlayWidgetId,
            getDomNode: () => this.widgetDomNode,
            getPosition: () => null,
        };
        this.viewZoneId = viewZoneAccessor.addZone({
            domNode: document.createElement('div'),
            afterLineNumber: afterLineNumber,
            heightInPx: height,
            ordinal: 50000 + 1,
            onComputedHeight: (height) => {
                this.widgetDomNode.style.height = `${height}px`;
            },
            onDomNodeTop: (top) => {
                this.widgetDomNode.style.top = `${top}px`;
            },
        });
        viewZoneIdsToCleanUp.push(this.viewZoneId);
        this._register(Event.runAndSubscribe(this.editor.onDidLayoutChange, () => {
            this.widgetDomNode.style.left = this.editor.getLayoutInfo().contentLeft + 'px';
        }));
        this.editor.addOverlayWidget(this.overlayWidget);
        this._register({
            dispose: () => {
                this.editor.removeOverlayWidget(this.overlayWidget);
            },
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4ZWRab25lV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2ZpeGVkWm9uZVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBTXBFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxNQUFNLE9BQWdCLGVBQWdCLFNBQVEsVUFBVTthQUN4QyxZQUFPLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFXMUIsWUFDa0IsTUFBbUIsRUFDcEMsZ0JBQXlDLEVBQ3pDLGVBQXVCLEVBQ3ZCLE1BQWMsRUFDZCxvQkFBOEI7UUFFOUIsS0FBSyxFQUFFLENBQUE7UUFOVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBWHBCLG9CQUFlLEdBQUcsbUJBQW1CLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFBO1FBRzlELGtCQUFhLEdBQUcsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ2pELGtCQUFhLEdBQW1CO1lBQ2hELEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZTtZQUNqQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWE7WUFDcEMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDdkIsQ0FBQTtRQVdBLElBQUksQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1lBQzFDLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztZQUN0QyxlQUFlLEVBQUUsZUFBZTtZQUNoQyxVQUFVLEVBQUUsTUFBTTtZQUNsQixPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUM7WUFDbEIsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUE7WUFDaEQsQ0FBQztZQUNELFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQTtZQUMxQyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUxQyxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDekQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUMvRSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNkLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDcEQsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUMifQ==