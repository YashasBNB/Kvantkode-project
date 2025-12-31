/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Constants;
(function (Constants) {
    Constants[Constants["MINIMUM_HEIGHT"] = 4] = "MINIMUM_HEIGHT";
})(Constants || (Constants = {}));
export class ColorZone {
    constructor(from, to, colorId) {
        this._colorZoneBrand = undefined;
        this.from = from | 0;
        this.to = to | 0;
        this.colorId = colorId | 0;
    }
    static compare(a, b) {
        if (a.colorId === b.colorId) {
            if (a.from === b.from) {
                return a.to - b.to;
            }
            return a.from - b.from;
        }
        return a.colorId - b.colorId;
    }
}
/**
 * A zone in the overview ruler
 */
export class OverviewRulerZone {
    constructor(startLineNumber, endLineNumber, heightInLines, color) {
        this._overviewRulerZoneBrand = undefined;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.heightInLines = heightInLines;
        this.color = color;
        this._colorZone = null;
    }
    static compare(a, b) {
        if (a.color === b.color) {
            if (a.startLineNumber === b.startLineNumber) {
                if (a.heightInLines === b.heightInLines) {
                    return a.endLineNumber - b.endLineNumber;
                }
                return a.heightInLines - b.heightInLines;
            }
            return a.startLineNumber - b.startLineNumber;
        }
        return a.color < b.color ? -1 : 1;
    }
    setColorZone(colorZone) {
        this._colorZone = colorZone;
    }
    getColorZones() {
        return this._colorZone;
    }
}
export class OverviewZoneManager {
    constructor(getVerticalOffsetForLine) {
        this._getVerticalOffsetForLine = getVerticalOffsetForLine;
        this._zones = [];
        this._colorZonesInvalid = false;
        this._lineHeight = 0;
        this._domWidth = 0;
        this._domHeight = 0;
        this._outerHeight = 0;
        this._pixelRatio = 1;
        this._lastAssignedId = 0;
        this._color2Id = Object.create(null);
        this._id2Color = [];
    }
    getId2Color() {
        return this._id2Color;
    }
    setZones(newZones) {
        this._zones = newZones;
        this._zones.sort(OverviewRulerZone.compare);
    }
    setLineHeight(lineHeight) {
        if (this._lineHeight === lineHeight) {
            return false;
        }
        this._lineHeight = lineHeight;
        this._colorZonesInvalid = true;
        return true;
    }
    setPixelRatio(pixelRatio) {
        this._pixelRatio = pixelRatio;
        this._colorZonesInvalid = true;
    }
    getDOMWidth() {
        return this._domWidth;
    }
    getCanvasWidth() {
        return this._domWidth * this._pixelRatio;
    }
    setDOMWidth(width) {
        if (this._domWidth === width) {
            return false;
        }
        this._domWidth = width;
        this._colorZonesInvalid = true;
        return true;
    }
    getDOMHeight() {
        return this._domHeight;
    }
    getCanvasHeight() {
        return this._domHeight * this._pixelRatio;
    }
    setDOMHeight(height) {
        if (this._domHeight === height) {
            return false;
        }
        this._domHeight = height;
        this._colorZonesInvalid = true;
        return true;
    }
    getOuterHeight() {
        return this._outerHeight;
    }
    setOuterHeight(outerHeight) {
        if (this._outerHeight === outerHeight) {
            return false;
        }
        this._outerHeight = outerHeight;
        this._colorZonesInvalid = true;
        return true;
    }
    resolveColorZones() {
        const colorZonesInvalid = this._colorZonesInvalid;
        const lineHeight = Math.floor(this._lineHeight);
        const totalHeight = Math.floor(this.getCanvasHeight());
        const outerHeight = Math.floor(this._outerHeight);
        const heightRatio = totalHeight / outerHeight;
        const halfMinimumHeight = Math.floor((4 /* Constants.MINIMUM_HEIGHT */ * this._pixelRatio) / 2);
        const allColorZones = [];
        for (let i = 0, len = this._zones.length; i < len; i++) {
            const zone = this._zones[i];
            if (!colorZonesInvalid) {
                const colorZone = zone.getColorZones();
                if (colorZone) {
                    allColorZones.push(colorZone);
                    continue;
                }
            }
            const offset1 = this._getVerticalOffsetForLine(zone.startLineNumber);
            const offset2 = zone.heightInLines === 0
                ? this._getVerticalOffsetForLine(zone.endLineNumber) + lineHeight
                : offset1 + zone.heightInLines * lineHeight;
            const y1 = Math.floor(heightRatio * offset1);
            const y2 = Math.floor(heightRatio * offset2);
            let ycenter = Math.floor((y1 + y2) / 2);
            let halfHeight = y2 - ycenter;
            if (halfHeight < halfMinimumHeight) {
                halfHeight = halfMinimumHeight;
            }
            if (ycenter - halfHeight < 0) {
                ycenter = halfHeight;
            }
            if (ycenter + halfHeight > totalHeight) {
                ycenter = totalHeight - halfHeight;
            }
            const color = zone.color;
            let colorId = this._color2Id[color];
            if (!colorId) {
                colorId = ++this._lastAssignedId;
                this._color2Id[color] = colorId;
                this._id2Color[colorId] = color;
            }
            const colorZone = new ColorZone(ycenter - halfHeight, ycenter + halfHeight, colorId);
            zone.setColorZone(colorZone);
            allColorZones.push(colorZone);
        }
        this._colorZonesInvalid = false;
        allColorZones.sort(ColorZone.compare);
        return allColorZones;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdab25lTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL292ZXJ2aWV3Wm9uZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDZEQUFrQixDQUFBO0FBQ25CLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELE1BQU0sT0FBTyxTQUFTO0lBT3JCLFlBQVksSUFBWSxFQUFFLEVBQVUsRUFBRSxPQUFlO1FBTnJELG9CQUFlLEdBQVMsU0FBUyxDQUFBO1FBT2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQVksRUFBRSxDQUFZO1FBQy9DLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDbkIsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtJQUM3QixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFhN0IsWUFDQyxlQUF1QixFQUN2QixhQUFxQixFQUNyQixhQUFxQixFQUNyQixLQUFhO1FBaEJkLDRCQUF1QixHQUFTLFNBQVMsQ0FBQTtRQWtCeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBb0IsRUFBRSxDQUFvQjtRQUMvRCxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFBO2dCQUN6QyxDQUFDO2dCQUNELE9BQU8sQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFBO1lBQ3pDLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtRQUM3QyxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUFvQjtRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtJQUM1QixDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjtJQWMvQixZQUFZLHdCQUF3RDtRQUNuRSxJQUFJLENBQUMseUJBQXlCLEdBQUcsd0JBQXdCLENBQUE7UUFDekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUVwQixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVNLFdBQVc7UUFDakIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFTSxRQUFRLENBQUMsUUFBNkI7UUFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUE7UUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUFrQjtRQUN0QyxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDckMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUM5QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxhQUFhLENBQUMsVUFBa0I7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtJQUMvQixDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDekMsQ0FBQztJQUVNLFdBQVcsQ0FBQyxLQUFhO1FBQy9CLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUM5QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1FBQzlCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxlQUFlO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQzFDLENBQUM7SUFFTSxZQUFZLENBQUMsTUFBYztRQUNqQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUE7UUFDeEIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUM5QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRU0sY0FBYyxDQUFDLFdBQW1CO1FBQ3hDLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1FBQzlCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtRQUNqRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLFdBQVcsR0FBRyxXQUFXLENBQUE7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsbUNBQTJCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUV2RixNQUFNLGFBQWEsR0FBZ0IsRUFBRSxDQUFBO1FBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUzQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO2dCQUN0QyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQzdCLFNBQVE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sT0FBTyxHQUNaLElBQUksQ0FBQyxhQUFhLEtBQUssQ0FBQztnQkFDdkIsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsVUFBVTtnQkFDakUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQTtZQUU3QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsQ0FBQTtZQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsQ0FBQTtZQUU1QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLElBQUksVUFBVSxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUE7WUFFN0IsSUFBSSxVQUFVLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEMsVUFBVSxHQUFHLGlCQUFpQixDQUFBO1lBQy9CLENBQUM7WUFFRCxJQUFJLE9BQU8sR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLE9BQU8sR0FBRyxVQUFVLENBQUE7WUFDckIsQ0FBQztZQUNELElBQUksT0FBTyxHQUFHLFVBQVUsR0FBRyxXQUFXLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxHQUFHLFdBQVcsR0FBRyxVQUFVLENBQUE7WUFDbkMsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDeEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQTtnQkFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUE7Z0JBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBQ2hDLENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxFQUFFLE9BQU8sR0FBRyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFcEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM1QixhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1FBRS9CLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7Q0FDRCJ9