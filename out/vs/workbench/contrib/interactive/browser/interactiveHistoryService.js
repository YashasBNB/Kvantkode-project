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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvaW50ZXJhY3RpdmVIaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDRCQUE0QixDQUM1QixDQUFBO0FBY0QsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFJeEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxXQUFXLEVBQTZCLENBQUE7SUFDN0QsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFRLEVBQUUsS0FBYTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFRLEVBQUUsS0FBYTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxpQkFBaUIsQ0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbEUsT0FBTTtRQUNQLENBQUM7UUFFRCxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsR0FBUTtRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxPQUFPLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUE7SUFDbkMsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFRO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXRDLE9BQU8sT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQTtJQUMvQixDQUFDO0lBRUQsV0FBVyxDQUFDLEdBQVEsRUFBRSxLQUFhO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLGlCQUFpQixDQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNsRSxPQUFNO1FBQ1AsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzFCLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFRO1FBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQzdDLENBQUM7Q0FDRCJ9