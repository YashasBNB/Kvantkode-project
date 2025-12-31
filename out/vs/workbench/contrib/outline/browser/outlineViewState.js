/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class OutlineViewState {
    constructor() {
        this._followCursor = false;
        this._filterOnType = true;
        this._sortBy = 0 /* OutlineSortOrder.ByPosition */;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._onDidChange.dispose();
    }
    set followCursor(value) {
        if (value !== this._followCursor) {
            this._followCursor = value;
            this._onDidChange.fire({ followCursor: true });
        }
    }
    get followCursor() {
        return this._followCursor;
    }
    get filterOnType() {
        return this._filterOnType;
    }
    set filterOnType(value) {
        if (value !== this._filterOnType) {
            this._filterOnType = value;
            this._onDidChange.fire({ filterOnType: true });
        }
    }
    set sortBy(value) {
        if (value !== this._sortBy) {
            this._sortBy = value;
            this._onDidChange.fire({ sortBy: true });
        }
    }
    get sortBy() {
        return this._sortBy;
    }
    persist(storageService) {
        storageService.store('outline/state', JSON.stringify({
            followCursor: this.followCursor,
            sortBy: this.sortBy,
            filterOnType: this.filterOnType,
        }), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    restore(storageService) {
        const raw = storageService.get('outline/state', 1 /* StorageScope.WORKSPACE */);
        if (!raw) {
            return;
        }
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            return;
        }
        this.followCursor = data.followCursor;
        this.sortBy = data.sortBy ?? 0 /* OutlineSortOrder.ByPosition */;
        if (typeof data.filterOnType === 'boolean') {
            this.filterOnType = data.filterOnType;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dGxpbmUvYnJvd3Nlci9vdXRsaW5lVmlld1N0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVExRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQTdCO1FBQ1Msa0JBQWEsR0FBRyxLQUFLLENBQUE7UUFDckIsa0JBQWEsR0FBRyxJQUFJLENBQUE7UUFDcEIsWUFBTyx1Q0FBOEI7UUFFNUIsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFJdkMsQ0FBQTtRQUNLLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFxRS9DLENBQUM7SUFuRUEsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksWUFBWSxDQUFDLEtBQWM7UUFDOUIsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO1lBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsS0FBSztRQUNyQixJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7WUFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksTUFBTSxDQUFDLEtBQXVCO1FBQ2pDLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxPQUFPLENBQUMsY0FBK0I7UUFDdEMsY0FBYyxDQUFDLEtBQUssQ0FDbkIsZUFBZSxFQUNmLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDZCxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFDLGdFQUdGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLGNBQStCO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxpQ0FBeUIsQ0FBQTtRQUN2RSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBUyxDQUFBO1FBQ2IsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLHVDQUErQixDQUFBO1FBQ3hELElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=