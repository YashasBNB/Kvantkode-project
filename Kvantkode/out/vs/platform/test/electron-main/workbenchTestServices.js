/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../base/common/async.js';
import { Event, Emitter } from '../../../base/common/event.js';
export class TestLifecycleMainService {
    constructor() {
        this.onBeforeShutdown = Event.None;
        this._onWillShutdown = new Emitter();
        this.onWillShutdown = this._onWillShutdown.event;
        this.onWillLoadWindow = Event.None;
        this.onBeforeCloseWindow = Event.None;
        this.wasRestarted = false;
        this.quitRequested = false;
        this.phase = 2 /* LifecycleMainPhase.Ready */;
    }
    async fireOnWillShutdown() {
        const joiners = [];
        this._onWillShutdown.fire({
            reason: 1 /* ShutdownReason.QUIT */,
            join(id, promise) {
                joiners.push(promise);
            },
        });
        await Promises.settled(joiners);
    }
    registerWindow(window) { }
    registerAuxWindow(auxWindow) { }
    async reload(window, cli) { }
    async unload(window, reason) {
        return true;
    }
    setRelaunchHandler(handler) { }
    async relaunch(options) { }
    async quit(willRestart) {
        return true;
    }
    async kill(code) { }
    async when(phase) { }
}
export class InMemoryTestStateMainService {
    constructor() {
        this.data = new Map();
    }
    setItem(key, data) {
        this.data.set(key, data);
    }
    setItems(items) {
        for (const { key, data } of items) {
            this.data.set(key, data);
        }
    }
    getItem(key) {
        return this.data.get(key);
    }
    removeItem(key) {
        this.data.delete(key);
    }
    async close() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXN0L2VsZWN0cm9uLW1haW4vd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBYTlELE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFHQyxxQkFBZ0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBRVosb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQTtRQUN0RCxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO1FBZXBELHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDN0Isd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUVoQyxpQkFBWSxHQUFHLEtBQUssQ0FBQTtRQUNwQixrQkFBYSxHQUFHLEtBQUssQ0FBQTtRQUVyQixVQUFLLG9DQUEyQjtJQWtCakMsQ0FBQztJQXJDQSxLQUFLLENBQUMsa0JBQWtCO1FBQ3ZCLE1BQU0sT0FBTyxHQUFvQixFQUFFLENBQUE7UUFFbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDekIsTUFBTSw2QkFBcUI7WUFDM0IsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPO2dCQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBVUQsY0FBYyxDQUFDLE1BQW1CLElBQVMsQ0FBQztJQUM1QyxpQkFBaUIsQ0FBQyxTQUEyQixJQUFTLENBQUM7SUFDdkQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFtQixFQUFFLEdBQXNCLElBQWtCLENBQUM7SUFDM0UsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFtQixFQUFFLE1BQW9CO1FBQ3JELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELGtCQUFrQixDQUFDLE9BQXlCLElBQVMsQ0FBQztJQUN0RCxLQUFLLENBQUMsUUFBUSxDQUFDLE9BR2QsSUFBa0IsQ0FBQztJQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLFdBQXFCO1FBQy9CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBYSxJQUFrQixDQUFDO0lBQzNDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBeUIsSUFBa0IsQ0FBQztDQUN2RDtBQUVELE1BQU0sT0FBTyw0QkFBNEI7SUFBekM7UUFHa0IsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFpRSxDQUFBO0lBdUJqRyxDQUFDO0lBckJBLE9BQU8sQ0FBQyxHQUFXLEVBQUUsSUFBNEQ7UUFDaEYsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxRQUFRLENBQ1AsS0FBK0Y7UUFFL0YsS0FBSyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBSSxHQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFrQixDQUFBO0lBQzNDLENBQUM7SUFFRCxVQUFVLENBQUMsR0FBVztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssS0FBbUIsQ0FBQztDQUMvQiJ9