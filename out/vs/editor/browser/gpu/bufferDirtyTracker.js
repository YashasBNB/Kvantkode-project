/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A simple tracker for dirty regions in a buffer.
 */
export class BufferDirtyTracker {
    get dataOffset() {
        return this._startIndex;
    }
    get dirtySize() {
        if (this._startIndex === undefined || this._endIndex === undefined) {
            return undefined;
        }
        return this._endIndex - this._startIndex + 1;
    }
    get isDirty() {
        return this._startIndex !== undefined;
    }
    /**
     * Flag the index(es) as modified. Returns the index flagged.
     * @param index An index to flag.
     * @param length An optional length to flag. Defaults to 1.
     */
    flag(index, length = 1) {
        this._flag(index);
        if (length > 1) {
            this._flag(index + length - 1);
        }
        return index;
    }
    _flag(index) {
        if (this._startIndex === undefined || index < this._startIndex) {
            this._startIndex = index;
        }
        if (this._endIndex === undefined || index > this._endIndex) {
            this._endIndex = index;
        }
    }
    clear() {
        this._startIndex = undefined;
        this._endIndex = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyRGlydHlUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2J1ZmZlckRpcnR5VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFCaEc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BFLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUE7SUFDdEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxJQUFJLENBQUMsS0FBYSxFQUFFLFNBQWlCLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQixJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxLQUFhO1FBQzFCLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFBO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQzNCLENBQUM7Q0FDRCJ9