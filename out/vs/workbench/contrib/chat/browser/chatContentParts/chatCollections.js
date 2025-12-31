/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class ResourcePool extends Disposable {
    get inUse() {
        return this._inUse;
    }
    constructor(_itemFactory) {
        super();
        this._itemFactory = _itemFactory;
        this.pool = [];
        this._inUse = new Set();
    }
    get() {
        if (this.pool.length > 0) {
            const item = this.pool.pop();
            this._inUse.add(item);
            return item;
        }
        const item = this._register(this._itemFactory());
        this._inUse.add(item);
        return item;
    }
    release(item) {
        this._inUse.delete(item);
        this.pool.push(item);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxlY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbGxlY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRixNQUFNLE9BQU8sWUFBb0MsU0FBUSxVQUFVO0lBSWxFLElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsWUFBNkIsWUFBcUI7UUFDakQsS0FBSyxFQUFFLENBQUE7UUFEcUIsaUJBQVksR0FBWixZQUFZLENBQVM7UUFQakMsU0FBSSxHQUFRLEVBQUUsQ0FBQTtRQUV2QixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQTtJQU83QixDQUFDO0lBRUQsR0FBRztRQUNGLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUcsQ0FBQTtZQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNyQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFPO1FBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDckIsQ0FBQztDQUNEIn0=