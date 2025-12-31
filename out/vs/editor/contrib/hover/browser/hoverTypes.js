/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var HoverAnchorType;
(function (HoverAnchorType) {
    HoverAnchorType[HoverAnchorType["Range"] = 1] = "Range";
    HoverAnchorType[HoverAnchorType["ForeignElement"] = 2] = "ForeignElement";
})(HoverAnchorType || (HoverAnchorType = {}));
export class HoverRangeAnchor {
    constructor(priority, range, initialMousePosX, initialMousePosY) {
        this.priority = priority;
        this.range = range;
        this.initialMousePosX = initialMousePosX;
        this.initialMousePosY = initialMousePosY;
        this.type = 1 /* HoverAnchorType.Range */;
    }
    equals(other) {
        return other.type === 1 /* HoverAnchorType.Range */ && this.range.equalsRange(other.range);
    }
    canAdoptVisibleHover(lastAnchor, showAtPosition) {
        return (lastAnchor.type === 1 /* HoverAnchorType.Range */ &&
            showAtPosition.lineNumber === this.range.startLineNumber);
    }
}
export class HoverForeignElementAnchor {
    constructor(priority, owner, range, initialMousePosX, initialMousePosY, supportsMarkerHover) {
        this.priority = priority;
        this.owner = owner;
        this.range = range;
        this.initialMousePosX = initialMousePosX;
        this.initialMousePosY = initialMousePosY;
        this.supportsMarkerHover = supportsMarkerHover;
        this.type = 2 /* HoverAnchorType.ForeignElement */;
    }
    equals(other) {
        return other.type === 2 /* HoverAnchorType.ForeignElement */ && this.owner === other.owner;
    }
    canAdoptVisibleHover(lastAnchor, showAtPosition) {
        return lastAnchor.type === 2 /* HoverAnchorType.ForeignElement */ && this.owner === lastAnchor.owner;
    }
}
/**
 * Default implementation of IRenderedHoverParts.
 */
export class RenderedHoverParts {
    constructor(renderedHoverParts, disposables) {
        this.renderedHoverParts = renderedHoverParts;
        this.disposables = disposables;
    }
    dispose() {
        for (const part of this.renderedHoverParts) {
            part.dispose();
        }
        this.disposables?.dispose();
    }
}
export const HoverParticipantRegistry = new (class HoverParticipantRegistry {
    constructor() {
        this._participants = [];
    }
    register(ctor) {
        this._participants.push(ctor);
    }
    getAll() {
        return this._participants;
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvaG92ZXJUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTBDaEcsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQyx1REFBUyxDQUFBO0lBQ1QseUVBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQztBQUVELE1BQU0sT0FBTyxnQkFBZ0I7SUFFNUIsWUFDaUIsUUFBZ0IsRUFDaEIsS0FBWSxFQUNaLGdCQUFvQyxFQUNwQyxnQkFBb0M7UUFIcEMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1oscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUNwQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9CO1FBTHJDLFNBQUksaUNBQXdCO0lBTXpDLENBQUM7SUFDRyxNQUFNLENBQUMsS0FBa0I7UUFDL0IsT0FBTyxLQUFLLENBQUMsSUFBSSxrQ0FBMEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUNNLG9CQUFvQixDQUFDLFVBQXVCLEVBQUUsY0FBd0I7UUFDNUUsT0FBTyxDQUNOLFVBQVUsQ0FBQyxJQUFJLGtDQUEwQjtZQUN6QyxjQUFjLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUN4RCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUVyQyxZQUNpQixRQUFnQixFQUNoQixLQUE4QixFQUM5QixLQUFZLEVBQ1osZ0JBQW9DLEVBQ3BDLGdCQUFvQyxFQUNwQyxtQkFBd0M7UUFMeEMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixVQUFLLEdBQUwsS0FBSyxDQUF5QjtRQUM5QixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1oscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUNwQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9CO1FBQ3BDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFQekMsU0FBSSwwQ0FBaUM7SUFRbEQsQ0FBQztJQUNHLE1BQU0sQ0FBQyxLQUFrQjtRQUMvQixPQUFPLEtBQUssQ0FBQyxJQUFJLDJDQUFtQyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQTtJQUNuRixDQUFDO0lBQ00sb0JBQW9CLENBQUMsVUFBdUIsRUFBRSxjQUF3QjtRQUM1RSxPQUFPLFVBQVUsQ0FBQyxJQUFJLDJDQUFtQyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQTtJQUM3RixDQUFDO0NBQ0Q7QUFzRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQ2lCLGtCQUEyQyxFQUMxQyxXQUF5QjtRQUQxQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1FBQzFDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3hDLENBQUM7SUFFSixPQUFPO1FBQ04sS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0NBQ0Q7QUE2QkQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sd0JBQXdCO0lBQTlCO1FBQzVDLGtCQUFhLEdBQWtDLEVBQUUsQ0FBQTtJQVdsRCxDQUFDO0lBVE8sUUFBUSxDQUFvQyxJQUVsRDtRQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQW1DLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRU0sTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUEifQ==