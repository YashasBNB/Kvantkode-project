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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0bGluZS9icm93c2VyL291dGxpbmVWaWV3U3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBUTFELE1BQU0sT0FBTyxnQkFBZ0I7SUFBN0I7UUFDUyxrQkFBYSxHQUFHLEtBQUssQ0FBQTtRQUNyQixrQkFBYSxHQUFHLElBQUksQ0FBQTtRQUNwQixZQUFPLHVDQUE4QjtRQUU1QixpQkFBWSxHQUFHLElBQUksT0FBTyxFQUl2QyxDQUFBO1FBQ0ssZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQXFFL0MsQ0FBQztJQW5FQSxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsS0FBYztRQUM5QixJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7WUFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLO1FBQ3JCLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQTtZQUMxQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsS0FBdUI7UUFDakMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQ3BCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxjQUErQjtRQUN0QyxjQUFjLENBQUMsS0FBSyxDQUNuQixlQUFlLEVBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNkLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQy9CLENBQUMsZ0VBR0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsY0FBK0I7UUFDdEMsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLGlDQUF5QixDQUFBO1FBQ3ZFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFTLENBQUE7UUFDYixJQUFJLENBQUM7WUFDSixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN2QixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sdUNBQStCLENBQUE7UUFDeEQsSUFBSSxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==