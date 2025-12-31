/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Array2D {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.array = [];
        this.array = new Array(width * height);
    }
    get(x, y) {
        return this.array[x + y * this.width];
    }
    set(x, y, value) {
        this.array[x + y * this.width] = value;
    }
}
export function isSpace(charCode) {
    return charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */;
}
export class LineRangeFragment {
    static { this.chrKeys = new Map(); }
    static getKey(chr) {
        let key = this.chrKeys.get(chr);
        if (key === undefined) {
            key = this.chrKeys.size;
            this.chrKeys.set(chr, key);
        }
        return key;
    }
    constructor(range, lines, source) {
        this.range = range;
        this.lines = lines;
        this.source = source;
        this.histogram = [];
        let counter = 0;
        for (let i = range.startLineNumber - 1; i < range.endLineNumberExclusive - 1; i++) {
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
                counter++;
                const chr = line[j];
                const key = LineRangeFragment.getKey(chr);
                this.histogram[key] = (this.histogram[key] || 0) + 1;
            }
            counter++;
            const key = LineRangeFragment.getKey('\n');
            this.histogram[key] = (this.histogram[key] || 0) + 1;
        }
        this.totalCount = counter;
    }
    computeSimilarity(other) {
        let sumDifferences = 0;
        const maxLength = Math.max(this.histogram.length, other.histogram.length);
        for (let i = 0; i < maxLength; i++) {
            sumDifferences += Math.abs((this.histogram[i] ?? 0) - (other.histogram[i] ?? 0));
        }
        return 1 - sumDifferences / (this.totalCount + other.totalCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxPQUFPO0lBR25CLFlBQ2lCLEtBQWEsRUFDYixNQUFjO1FBRGQsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFdBQU0sR0FBTixNQUFNLENBQVE7UUFKZCxVQUFLLEdBQVEsRUFBRSxDQUFBO1FBTS9CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDdkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxLQUFRO1FBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBQ3ZDLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxPQUFPLENBQUMsUUFBZ0I7SUFDdkMsT0FBTyxRQUFRLDRCQUFtQixJQUFJLFFBQVEseUJBQWlCLENBQUE7QUFDaEUsQ0FBQztBQUVELE1BQU0sT0FBTyxpQkFBaUI7YUFDZCxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLEFBQTVCLENBQTRCO0lBRTFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBVztRQUNoQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FB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