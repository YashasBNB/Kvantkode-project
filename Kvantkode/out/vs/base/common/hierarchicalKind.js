/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class HierarchicalKind {
    static { this.sep = '.'; }
    static { this.None = new HierarchicalKind('@@none@@'); } // Special kind that matches nothing
    static { this.Empty = new HierarchicalKind(''); }
    constructor(value) {
        this.value = value;
    }
    equals(other) {
        return this.value === other.value;
    }
    contains(other) {
        return (this.equals(other) ||
            this.value === '' ||
            other.value.startsWith(this.value + HierarchicalKind.sep));
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    append(...parts) {
        return new HierarchicalKind((this.value ? [this.value, ...parts] : parts).join(HierarchicalKind.sep));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGllcmFyY2hpY2FsS2luZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vaGllcmFyY2hpY2FsS2luZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sZ0JBQWdCO2FBQ0wsUUFBRyxHQUFHLEdBQUcsQ0FBQTthQUVULFNBQUksR0FBRyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBLEdBQUMsb0NBQW9DO2FBQzVFLFVBQUssR0FBRyxJQUFJLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRXZELFlBQTRCLEtBQWE7UUFBYixVQUFLLEdBQUwsS0FBSyxDQUFRO0lBQUcsQ0FBQztJQUV0QyxNQUFNLENBQUMsS0FBdUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUE7SUFDbEMsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUF1QjtRQUN0QyxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO1lBQ2pCLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQ3pELENBQUE7SUFDRixDQUFDO0lBRU0sVUFBVSxDQUFDLEtBQXVCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTSxNQUFNLENBQUMsR0FBRyxLQUFlO1FBQy9CLE9BQU8sSUFBSSxnQkFBZ0IsQ0FDMUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUN4RSxDQUFBO0lBQ0YsQ0FBQyJ9