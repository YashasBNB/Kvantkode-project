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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9ob3ZlclR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBMENoRyxNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLHVEQUFTLENBQUE7SUFDVCx5RUFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBSGlCLGVBQWUsS0FBZixlQUFlLFFBR2hDO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQUU1QixZQUNpQixRQUFnQixFQUNoQixLQUFZLEVBQ1osZ0JBQW9DLEVBQ3BDLGdCQUFvQztRQUhwQyxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9CO1FBQ3BDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0I7UUFMckMsU0FBSSxpQ0FBd0I7SUFNekMsQ0FBQztJQUNHLE1BQU0sQ0FBQyxLQUFrQjtRQUMvQixPQUFPLEtBQUssQ0FBQyxJQUFJLGtDQUEwQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBQ00sb0JBQW9CLENBQUMsVUFBdUIsRUFBRSxjQUF3QjtRQUM1RSxPQUFPLENBQ04sVUFBVSxDQUFDLElBQUksa0NBQTBCO1lBQ3pDLGNBQWMsQ0FBQyxVQUFVLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQ3hELENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBRXJDLFlBQ2lCLFFBQWdCLEVBQ2hCLEtBQThCLEVBQzlCLEtBQVksRUFDWixnQkFBb0MsRUFDcEMsZ0JBQW9DLEVBQ3BDLG1CQUF3QztRQUx4QyxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFVBQUssR0FBTCxLQUFLLENBQXlCO1FBQzlCLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW9CO1FBQ3BDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0I7UUFDcEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQVB6QyxTQUFJLDBDQUFpQztJQVFsRCxDQUFDO0lBQ0csTUFBTSxDQUFDLEtBQWtCO1FBQy9CLE9BQU8sS0FBSyxDQUFDLElBQUksMkNBQW1DLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFBO0lBQ25GLENBQUM7SUFDTSxvQkFBb0IsQ0FBQyxVQUF1QixFQUFFLGNBQXdCO1FBQzVFLE9BQU8sVUFBVSxDQUFDLElBQUksMkNBQW1DLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUMsS0FBSyxDQUFBO0lBQzdGLENBQUM7Q0FDRDtBQXNFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsWUFDaUIsa0JBQTJDLEVBQzFDLFdBQXlCO1FBRDFCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBeUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFDeEMsQ0FBQztJQUVKLE9BQU87UUFDTixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRDtBQTZCRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsTUFBTSx3QkFBd0I7SUFBOUI7UUFDNUMsa0JBQWEsR0FBa0MsRUFBRSxDQUFBO0lBV2xELENBQUM7SUFUTyxRQUFRLENBQW9DLElBRWxEO1FBQ0EsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBbUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7Q0FDRCxDQUFDLEVBQUUsQ0FBQSJ9