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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uVmlld0l0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2FjdGlvblZpZXdJdGVtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFN0MsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQTtBQXdCbEUsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQUdDLGdCQUFXLEdBQWtCLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFjeEMsQ0FBQztJQVpBLFFBQVEsQ0FDUCxJQUFZLEVBQ1osU0FBMEIsRUFDMUIsUUFBaUMsRUFDakMsS0FBc0I7UUFFdEIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBWSxFQUFFLFNBQTBCO1FBQzlDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0scUJBQXFCO0lBQTNCO1FBR2tCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQTtRQUV2RCxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDNUMsZ0JBQVcsR0FBa0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFxQzlELENBQUM7SUFuQ0EsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDNUIsQ0FBQztJQUVELFFBQVEsQ0FDUCxJQUFZLEVBQ1osa0JBQW1DLEVBQ25DLFFBQWlDLEVBQ2pDLEtBQXNCO1FBRXRCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDbEQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxLQUFLLENBQ2QsOEJBQThCLGtCQUFrQixhQUFhLElBQUkseUJBQXlCLENBQzFGLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUM3QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDM0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVksRUFBRSxlQUFnQztRQUNwRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZUFBZ0M7UUFDOUQsT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLElBQUksZUFBZSxZQUFZLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDaEcsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFBIn0=