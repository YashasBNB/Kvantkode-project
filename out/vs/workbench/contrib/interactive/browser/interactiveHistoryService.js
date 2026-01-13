/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HistoryNavigator2 } from '../../../../base/common/history.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IInteractiveHistoryService = createDecorator('IInteractiveHistoryService');
export class InteractiveHistoryService extends Disposable {
    constructor() {
        super();
        this._history = new ResourceMap();
    }
    matchesCurrent(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            return false;
        }
        return history.current() === value;
    }
    addToHistory(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            this._history.set(uri, new HistoryNavigator2([value], 50));
            return;
        }
        history.resetCursor();
        history.add(value);
    }
    getPreviousValue(uri) {
        const history = this._history.get(uri);
        return history?.previous() ?? null;
    }
    getNextValue(uri) {
        const history = this._history.get(uri);
        return history?.next() ?? null;
    }
    replaceLast(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            this._history.set(uri, new HistoryNavigator2([value], 50));
            return;
        }
        else {
            history.replaceLast(value);
            history.resetCursor();
        }
    }
    clearHistory(uri) {
        this._history.delete(uri);
    }
    has(uri) {
        return this._history.has(uri) ? true : false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW50ZXJhY3RpdmUvYnJvd3Nlci9pbnRlcmFjdGl2ZUhpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsNEJBQTRCLENBQzVCLENBQUE7QUFjRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUl4RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFdBQVcsRUFBNkIsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsY0FBYyxDQUFDLEdBQVEsRUFBRSxLQUFhO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssQ0FBQTtJQUNuQyxDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVEsRUFBRSxLQUFhO1FBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLGlCQUFpQixDQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNsRSxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25CLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxHQUFRO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLE9BQU8sT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQTtJQUNuQyxDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVE7UUFDcEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFdEMsT0FBTyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksSUFBSSxDQUFBO0lBQy9CLENBQUM7SUFFRCxXQUFXLENBQUMsR0FBUSxFQUFFLEtBQWE7UUFDbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksaUJBQWlCLENBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLE9BQU07UUFDUCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUIsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVE7UUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDN0MsQ0FBQztDQUNEIn0=