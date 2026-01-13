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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUE2QixlQUFlLEVBQWlCLE1BQU0sY0FBYyxDQUFBO0FBQ3hGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxNQUFNLGNBQWM7SUFBcEI7UUFHa0IsZUFBVSxHQUFHLElBQUksVUFBVSxFQUE2QixDQUFBO1FBRXhELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUMxQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQWdDNUQsQ0FBQztJQTlCQSxnQkFBZ0IsQ0FBQyxJQUFpQjtRQUNqQyxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQ2xCLElBQWlCLEVBQ2pCLE1BQXFCLEVBQ3JCLEtBQXdCO1FBRXhCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMzQixPQUFPLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3hELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELHNCQUFzQixDQUFDLE9BQWtDO1FBQ3hELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDeEIsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLEVBQUUsRUFBRSxDQUFBO1lBQ0osSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLGVBQWUsRUFBRSxjQUFjLG9DQUE0QixDQUFBIn0=