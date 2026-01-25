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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdab25lTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvb3ZlcnZpZXdab25lTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxJQUFXLFNBRVY7QUFGRCxXQUFXLFNBQVM7SUFDbkIsNkRBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUZVLFNBQVMsS0FBVCxTQUFTLFFBRW5CO0FBRUQsTUFBTSxPQUFPLFNBQVM7SUFPckIsWUFBWSxJQUFZLEVBQUUsRUFBVSxFQUFFLE9BQWU7UUFOckQsb0JBQWUsR0FBUyxTQUFTLENBQUE7UUFPaEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBWSxFQUFFLENBQVk7UUFDL0MsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2QixPQUFPLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUNuQixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQzdCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlC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