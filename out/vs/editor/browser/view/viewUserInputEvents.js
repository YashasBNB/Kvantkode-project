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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1VzZXJJbnB1dEV2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcvdmlld1VzZXJJbnB1dEV2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFNeEQsTUFBTSxPQUFPLG1CQUFtQjtJQWUvQixZQUFZLG9CQUEyQztRQWRoRCxjQUFTLEdBQXlDLElBQUksQ0FBQTtRQUN0RCxZQUFPLEdBQXlDLElBQUksQ0FBQTtRQUNwRCxrQkFBYSxHQUE0QyxJQUFJLENBQUE7UUFDN0QsZ0JBQVcsR0FBNEMsSUFBSSxDQUFBO1FBQzNELGlCQUFZLEdBQW1ELElBQUksQ0FBQTtRQUNuRSxnQkFBVyxHQUE0QyxJQUFJLENBQUE7UUFDM0QsY0FBUyxHQUE0QyxJQUFJLENBQUE7UUFDekQsZ0JBQVcsR0FBNEMsSUFBSSxDQUFBO1FBQzNELGdCQUFXLEdBQW1ELElBQUksQ0FBQTtRQUNsRSx3QkFBbUIsR0FBK0IsSUFBSSxDQUFBO1FBQ3RELGlCQUFZLEdBQTJDLElBQUksQ0FBQTtRQUtqRSxJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUE7SUFDbEQsQ0FBQztJQUVNLFdBQVcsQ0FBQyxDQUFpQjtRQUNuQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxDQUFpQjtRQUNqQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVNLGVBQWUsQ0FBQyxDQUFvQjtRQUMxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUQs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