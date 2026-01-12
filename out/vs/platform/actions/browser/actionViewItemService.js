/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { MenuId } from '../common/actions.js';
export const IActionViewItemService = createDecorator('IActionViewItemService');
export class NullActionViewItemService {
    constructor() {
        this.onDidChange = Event.None;
    }
    register(menu, commandId, provider, event) {
        return Disposable.None;
    }
    lookUp(menu, commandId) {
        return undefined;
    }
}
class ActionViewItemService {
    constructor() {
        this._providers = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._onDidChange.dispose();
    }
    register(menu, commandOrSubmenuId, provider, event) {
        const id = this._makeKey(menu, commandOrSubmenuId);
        if (this._providers.has(id)) {
            throw new Error(`A provider for the command ${commandOrSubmenuId} and menu ${menu} is already registered.`);
        }
        this._providers.set(id, provider);
        const listener = event?.(() => {
            this._onDidChange.fire(menu);
        });
        return toDisposable(() => {
            listener?.dispose();
            this._providers.delete(id);
        });
    }
    lookUp(menu, commandOrMenuId) {
        return this._providers.get(this._makeKey(menu, commandOrMenuId));
    }
    _makeKey(menu, commandOrMenuId) {
        return `${menu.id}/${commandOrMenuId instanceof MenuId ? commandOrMenuId.id : commandOrMenuId}`;
    }
}
registerSingleton(IActionViewItemService, ActionViewItemService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uVmlld0l0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvYWN0aW9uVmlld0l0ZW1TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUU3QyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix3QkFBd0IsQ0FBQyxDQUFBO0FBd0JsRSxNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBR0MsZ0JBQVcsR0FBa0IsS0FBSyxDQUFDLElBQUksQ0FBQTtJQWN4QyxDQUFDO0lBWkEsUUFBUSxDQUNQLElBQVksRUFDWixTQUEwQixFQUMxQixRQUFpQyxFQUNqQyxLQUFzQjtRQUV0QixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFZLEVBQUUsU0FBMEI7UUFDOUMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBcUI7SUFBM0I7UUFHa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFBO1FBRXZELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUM1QyxnQkFBVyxHQUFrQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQXFDOUQsQ0FBQztJQW5DQSxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsUUFBUSxDQUNQLElBQVksRUFDWixrQkFBbUMsRUFDbkMsUUFBaUMsRUFDakMsS0FBc0I7UUFFdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUNsRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FDZCw4QkFBOEIsa0JBQWtCLGFBQWEsSUFBSSx5QkFBeUIsQ0FDMUYsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFakMsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFO1lBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsSUFBWSxFQUFFLGVBQWdDO1FBQ3BELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU8sUUFBUSxDQUFDLElBQVksRUFBRSxlQUFnQztRQUM5RCxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsSUFBSSxlQUFlLFlBQVksTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNoRyxDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsb0NBQTRCLENBQUEifQ==