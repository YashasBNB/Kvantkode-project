/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../common/core/position.js';
export class ViewUserInputEvents {
    constructor(coordinatesConverter) {
        this.onKeyDown = null;
        this.onKeyUp = null;
        this.onContextMenu = null;
        this.onMouseMove = null;
        this.onMouseLeave = null;
        this.onMouseDown = null;
        this.onMouseUp = null;
        this.onMouseDrag = null;
        this.onMouseDrop = null;
        this.onMouseDropCanceled = null;
        this.onMouseWheel = null;
        this._coordinatesConverter = coordinatesConverter;
    }
    emitKeyDown(e) {
        this.onKeyDown?.(e);
    }
    emitKeyUp(e) {
        this.onKeyUp?.(e);
    }
    emitContextMenu(e) {
        this.onContextMenu?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseMove(e) {
        this.onMouseMove?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseLeave(e) {
        this.onMouseLeave?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDown(e) {
        this.onMouseDown?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseUp(e) {
        this.onMouseUp?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDrag(e) {
        this.onMouseDrag?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDrop(e) {
        this.onMouseDrop?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDropCanceled() {
        this.onMouseDropCanceled?.();
    }
    emitMouseWheel(e) {
        this.onMouseWheel?.(e);
    }
    _convertViewToModelMouseEvent(e) {
        if (e.target) {
            return {
                event: e.event,
                target: this._convertViewToModelMouseTarget(e.target),
            };
        }
        return e;
    }
    _convertViewToModelMouseTarget(target) {
        return ViewUserInputEvents.convertViewToModelMouseTarget(target, this._coordinatesConverter);
    }
    static convertViewToModelMouseTarget(target, coordinatesConverter) {
        const result = { ...target };
        if (result.position) {
            result.position = coordinatesConverter.convertViewPositionToModelPosition(result.position);
        }
        if (result.range) {
            result.range = coordinatesConverter.convertViewRangeToModelRange(result.range);
        }
        if (result.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */ ||
            result.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            result.detail = this.convertViewToModelViewZoneData(result.detail, coordinatesConverter);
        }
        return result;
    }
    static convertViewToModelViewZoneData(data, coordinatesConverter) {
        return {
            viewZoneId: data.viewZoneId,
            positionBefore: data.positionBefore
                ? coordinatesConverter.convertViewPositionToModelPosition(data.positionBefore)
                : data.positionBefore,
            positionAfter: data.positionAfter
                ? coordinatesConverter.convertViewPositionToModelPosition(data.positionAfter)
                : data.positionAfter,
            position: coordinatesConverter.convertViewPositionToModelPosition(data.position),
            afterLineNumber: coordinatesConverter.convertViewPositionToModelPosition(new Position(data.afterLineNumber, 1)).lineNumber,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1VzZXJJbnB1dEV2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3VXNlcklucHV0RXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBWWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQU14RCxNQUFNLE9BQU8sbUJBQW1CO0lBZS9CLFlBQVksb0JBQTJDO1FBZGhELGNBQVMsR0FBeUMsSUFBSSxDQUFBO1FBQ3RELFlBQU8sR0FBeUMsSUFBSSxDQUFBO1FBQ3BELGtCQUFhLEdBQTRDLElBQUksQ0FBQTtRQUM3RCxnQkFBVyxHQUE0QyxJQUFJLENBQUE7UUFDM0QsaUJBQVksR0FBbUQsSUFBSSxDQUFBO1FBQ25FLGdCQUFXLEdBQTRDLElBQUksQ0FBQTtRQUMzRCxjQUFTLEdBQTRDLElBQUksQ0FBQTtRQUN6RCxnQkFBVyxHQUE0QyxJQUFJLENBQUE7UUFDM0QsZ0JBQVcsR0FBbUQsSUFBSSxDQUFBO1FBQ2xFLHdCQUFtQixHQUErQixJQUFJLENBQUE7UUFDdEQsaUJBQVksR0FBMkMsSUFBSSxDQUFBO1FBS2pFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQTtJQUNsRCxDQUFDO0lBRU0sV0FBVyxDQUFDLENBQWlCO1FBQ25DLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwQixDQUFDO0lBRU0sU0FBUyxDQUFDLENBQWlCO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRU0sZUFBZSxDQUFDLENBQW9CO1FBQzFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FB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