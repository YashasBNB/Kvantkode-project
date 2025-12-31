/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Manages "marks" in the buffer which are lines that are tracked when lines are added to or removed
 * from the buffer.
 */
export class BufferMarkCapability extends Disposable {
    constructor(_terminal) {
        super();
        this._terminal = _terminal;
        this.type = 4 /* TerminalCapability.BufferMarkDetection */;
        this._idToMarkerMap = new Map();
        this._anonymousMarkers = new Map();
        this._onMarkAdded = this._register(new Emitter());
        this.onMarkAdded = this._onMarkAdded.event;
    }
    *markers() {
        for (const m of this._idToMarkerMap.values()) {
            yield m;
        }
        for (const m of this._anonymousMarkers.values()) {
            yield m;
        }
    }
    addMark(properties) {
        const marker = properties?.marker || this._terminal.registerMarker();
        const id = properties?.id;
        if (!marker) {
            return;
        }
        if (id) {
            this._idToMarkerMap.set(id, marker);
            marker.onDispose(() => this._idToMarkerMap.delete(id));
        }
        else {
            this._anonymousMarkers.set(marker.id, marker);
            marker.onDispose(() => this._anonymousMarkers.delete(marker.id));
        }
        this._onMarkAdded.fire({
            marker,
            id,
            hidden: properties?.hidden,
            hoverMessage: properties?.hoverMessage,
        });
    }
    getMark(id) {
        return this._idToMarkerMap.get(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyTWFya0NhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2J1ZmZlck1hcmtDYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFJakU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFTbkQsWUFBNkIsU0FBbUI7UUFDL0MsS0FBSyxFQUFFLENBQUE7UUFEcUIsY0FBUyxHQUFULFNBQVMsQ0FBVTtRQVJ2QyxTQUFJLGtEQUF5QztRQUU5QyxtQkFBYyxHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2hELHNCQUFpQixHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRTFDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBbUIsQ0FBQyxDQUFBO1FBQ3JFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFJOUMsQ0FBQztJQUVELENBQUMsT0FBTztRQUNQLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxDQUFBO1FBQ1IsQ0FBQztRQUNELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLENBQUE7UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxVQUE0QjtRQUNuQyxNQUFNLE1BQU0sR0FBRyxVQUFVLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDcEUsTUFBTSxFQUFFLEdBQUcsVUFBVSxFQUFFLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzdDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDdEIsTUFBTTtZQUNOLEVBQUU7WUFDRixNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU07WUFDMUIsWUFBWSxFQUFFLFVBQVUsRUFBRSxZQUFZO1NBQ3RDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPLENBQUMsRUFBVTtRQUNqQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLENBQUM7Q0FDRCJ9