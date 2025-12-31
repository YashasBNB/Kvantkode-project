/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IOutlineService } from './outline.js';
import { Emitter } from '../../../../base/common/event.js';
class OutlineService {
    constructor() {
        this._factories = new LinkedList();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    canCreateOutline(pane) {
        for (const factory of this._factories) {
            if (factory.matches(pane)) {
                return true;
            }
        }
        return false;
    }
    async createOutline(pane, target, token) {
        for (const factory of this._factories) {
            if (factory.matches(pane)) {
                return await factory.createOutline(pane, target, token);
            }
        }
        return undefined;
    }
    registerOutlineCreator(creator) {
        const rm = this._factories.push(creator);
        this._onDidChange.fire();
        return toDisposable(() => {
            rm();
            this._onDidChange.fire();
        });
    }
}
registerSingleton(IOutlineService, OutlineService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvb3V0bGluZS9icm93c2VyL291dGxpbmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBNkIsZUFBZSxFQUFpQixNQUFNLGNBQWMsQ0FBQTtBQUN4RixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsTUFBTSxjQUFjO0lBQXBCO1FBR2tCLGVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBNkIsQ0FBQTtRQUV4RCxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDMUMsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFnQzVELENBQUM7SUE5QkEsZ0JBQWdCLENBQUMsSUFBaUI7UUFDakMsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUNsQixJQUFpQixFQUNqQixNQUFxQixFQUNyQixLQUF3QjtRQUV4QixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxNQUFNLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxPQUFrQztRQUN4RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixFQUFFLEVBQUUsQ0FBQTtZQUNKLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsY0FBYyxvQ0FBNEIsQ0FBQSJ9