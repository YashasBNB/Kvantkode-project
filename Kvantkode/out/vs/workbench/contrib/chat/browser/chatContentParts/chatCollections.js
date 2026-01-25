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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxlY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29sbGVjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLE1BQU0sT0FBTyxZQUFvQyxTQUFRLFVBQVU7SUFJbEUsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxZQUE2QixZQUFxQjtRQUNqRCxLQUFLLEVBQUUsQ0FBQTtRQURxQixpQkFBWSxHQUFaLFlBQVksQ0FBUztRQVBqQyxTQUFJLEdBQVEsRUFBRSxDQUFBO1FBRXZCLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBSyxDQUFBO0lBTzdCLENBQUM7SUFFRCxHQUFHO1FBQ0YsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRyxDQUFBO1lBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3JCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQU87UUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyQixDQUFDO0NBQ0QifQ==