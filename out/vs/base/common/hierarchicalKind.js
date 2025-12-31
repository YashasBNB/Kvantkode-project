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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGllcmFyY2hpY2FsS2luZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2hpZXJhcmNoaWNhbEtpbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLGdCQUFnQjthQUNMLFFBQUcsR0FBRyxHQUFHLENBQUE7YUFFVCxTQUFJLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQSxHQUFDLG9DQUFvQzthQUM1RSxVQUFLLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUV2RCxZQUE0QixLQUFhO1FBQWIsVUFBSyxHQUFMLEtBQUssQ0FBUTtJQUFHLENBQUM7SUFFdEMsTUFBTSxDQUFDLEtBQXVCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFBO0lBQ2xDLENBQUM7SUFFTSxRQUFRLENBQUMsS0FBdUI7UUFDdEMsT0FBTyxDQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtZQUNqQixLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUN6RCxDQUFBO0lBQ0YsQ0FBQztJQUVNLFVBQVUsQ0FBQyxLQUF1QjtRQUN4QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRU0sTUFBTSxDQUFDLEdBQUcsS0FBZTtRQUMvQixPQUFPLElBQUksZ0JBQWdCLENBQzFCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FDeEUsQ0FBQTtJQUNGLENBQUMifQ==