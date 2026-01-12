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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyTWFya0NhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvYnVmZmVyTWFya0NhcGFiaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUlqRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTtJQVNuRCxZQUE2QixTQUFtQjtRQUMvQyxLQUFLLEVBQUUsQ0FBQTtRQURxQixjQUFTLEdBQVQsU0FBUyxDQUFVO1FBUnZDLFNBQUksa0RBQXlDO1FBRTlDLG1CQUFjLEdBQXlCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDaEQsc0JBQWlCLEdBQXlCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFMUMsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFtQixDQUFDLENBQUE7UUFDckUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQUk5QyxDQUFDO0lBRUQsQ0FBQyxPQUFPO1FBQ1AsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDOUMsTUFBTSxDQUFDLENBQUE7UUFDUixDQUFDO1FBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNqRCxNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLFVBQTRCO1FBQ25DLE1BQU0sTUFBTSxHQUFHLFVBQVUsRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUNwRSxNQUFNLEVBQUUsR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDN0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUN0QixNQUFNO1lBQ04sRUFBRTtZQUNGLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTTtZQUMxQixZQUFZLEVBQUUsVUFBVSxFQUFFLFlBQVk7U0FDdEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELE9BQU8sQ0FBQyxFQUFVO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNEIn0=