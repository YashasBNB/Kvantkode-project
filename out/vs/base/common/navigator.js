/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ArrayNavigator {
    constructor(items, start = 0, end = items.length, index = start - 1) {
        this.items = items;
        this.start = start;
        this.end = end;
        this.index = index;
    }
    current() {
        if (this.index === this.start - 1 || this.index === this.end) {
            return null;
        }
        return this.items[this.index];
    }
    next() {
        this.index = Math.min(this.index + 1, this.end);
        return this.current();
    }
    previous() {
        this.index = Math.max(this.index - 1, this.start - 1);
        return this.current();
    }
    first() {
        this.index = this.start;
        return this.current();
    }
    last() {
        this.index = this.end - 1;
        return this.current();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbmF2aWdhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE1BQU0sT0FBTyxjQUFjO0lBQzFCLFlBQ2tCLEtBQW1CLEVBQzFCLFFBQWdCLENBQUMsRUFDakIsTUFBYyxLQUFLLENBQUMsTUFBTSxFQUMxQixRQUFRLEtBQUssR0FBRyxDQUFDO1FBSFYsVUFBSyxHQUFMLEtBQUssQ0FBYztRQUMxQixVQUFLLEdBQUwsS0FBSyxDQUFZO1FBQ2pCLFFBQUcsR0FBSCxHQUFHLENBQXVCO1FBQzFCLFVBQUssR0FBTCxLQUFLLENBQVk7SUFDekIsQ0FBQztJQUVKLE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDOUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0MsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNyRCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDekIsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztDQUNEIn0=