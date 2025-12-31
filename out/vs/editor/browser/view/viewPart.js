/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewEventHandler } from '../../common/viewEventHandler.js';
export class ViewPart extends ViewEventHandler {
    constructor(context) {
        super();
        this._context = context;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
}
export var PartFingerprint;
(function (PartFingerprint) {
    PartFingerprint[PartFingerprint["None"] = 0] = "None";
    PartFingerprint[PartFingerprint["ContentWidgets"] = 1] = "ContentWidgets";
    PartFingerprint[PartFingerprint["OverflowingContentWidgets"] = 2] = "OverflowingContentWidgets";
    PartFingerprint[PartFingerprint["OverflowGuard"] = 3] = "OverflowGuard";
    PartFingerprint[PartFingerprint["OverlayWidgets"] = 4] = "OverlayWidgets";
    PartFingerprint[PartFingerprint["OverflowingOverlayWidgets"] = 5] = "OverflowingOverlayWidgets";
    PartFingerprint[PartFingerprint["ScrollableElement"] = 6] = "ScrollableElement";
    PartFingerprint[PartFingerprint["TextArea"] = 7] = "TextArea";
    PartFingerprint[PartFingerprint["ViewLines"] = 8] = "ViewLines";
    PartFingerprint[PartFingerprint["Minimap"] = 9] = "Minimap";
    PartFingerprint[PartFingerprint["ViewLinesGpu"] = 10] = "ViewLinesGpu";
})(PartFingerprint || (PartFingerprint = {}));
export class PartFingerprints {
    static write(target, partId) {
        target.setAttribute('data-mprt', String(partId));
    }
    static read(target) {
        const r = target.getAttribute('data-mprt');
        if (r === null) {
            return 0 /* PartFingerprint.None */;
        }
        return parseInt(r, 10);
    }
    static collect(child, stopAt) {
        const result = [];
        let resultLen = 0;
        while (child && child !== child.ownerDocument.body) {
            if (child === stopAt) {
                break;
            }
            if (child.nodeType === child.ELEMENT_NODE) {
                result[resultLen++] = this.read(child);
            }
            child = child.parentElement;
        }
        const r = new Uint8Array(resultLen);
        for (let i = 0; i < resultLen; i++) {
            r[i] = result[resultLen - i - 1];
        }
        return r;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5FLE1BQU0sT0FBZ0IsUUFBUyxTQUFRLGdCQUFnQjtJQUd0RCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUlEO0FBRUQsTUFBTSxDQUFOLElBQWtCLGVBWWpCO0FBWkQsV0FBa0IsZUFBZTtJQUNoQyxxREFBSSxDQUFBO0lBQ0oseUVBQWMsQ0FBQTtJQUNkLCtGQUF5QixDQUFBO0lBQ3pCLHVFQUFhLENBQUE7SUFDYix5RUFBYyxDQUFBO0lBQ2QsK0ZBQXlCLENBQUE7SUFDekIsK0VBQWlCLENBQUE7SUFDakIsNkRBQVEsQ0FBQTtJQUNSLCtEQUFTLENBQUE7SUFDVCwyREFBTyxDQUFBO0lBQ1Asc0VBQVksQ0FBQTtBQUNiLENBQUMsRUFaaUIsZUFBZSxLQUFmLGVBQWUsUUFZaEM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBMEMsRUFBRSxNQUF1QjtRQUN0RixNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFlO1FBQ2pDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDaEIsb0NBQTJCO1FBQzVCLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdkIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBcUIsRUFBRSxNQUFlO1FBQzNELE1BQU0sTUFBTSxHQUFzQixFQUFFLENBQUE7UUFDcEMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBRWpCLE9BQU8sS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BELElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN0QixNQUFLO1lBQ04sQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkMsQ0FBQztZQUNELEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7Q0FDRCJ9