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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVzdC9lbGVjdHJvbi1tYWluL3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQWE5RCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBR0MscUJBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUVaLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUE7UUFDdEQsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtRQWVwRCxxQkFBZ0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzdCLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFaEMsaUJBQVksR0FBRyxLQUFLLENBQUE7UUFDcEIsa0JBQWEsR0FBRyxLQUFLLENBQUE7UUFFckIsVUFBSyxvQ0FBMkI7SUFrQmpDLENBQUM7SUFyQ0EsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixNQUFNLE9BQU8sR0FBb0IsRUFBRSxDQUFBO1FBRW5DLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQ3pCLE1BQU0sNkJBQXFCO1lBQzNCLElBQUksQ0FBQyxFQUFFLEVBQUUsT0FBTztnQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RCLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQVVELGNBQWMsQ0FBQyxNQUFtQixJQUFTLENBQUM7SUFDNUMsaUJBQWlCLENBQUMsU0FBMkIsSUFBUyxDQUFDO0lBQ3ZELEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBbUIsRUFBRSxHQUFzQixJQUFrQixDQUFDO0lBQzNFLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBbUIsRUFBRSxNQUFvQjtRQUNyRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxrQkFBa0IsQ0FBQyxPQUF5QixJQUFTLENBQUM7SUFDdEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUdkLElBQWtCLENBQUM7SUFDcEIsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQWEsSUFBa0IsQ0FBQztJQUMzQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQXlCLElBQWtCLENBQUM7Q0FDdkQ7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBR2tCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBaUUsQ0FBQTtJQXVCakcsQ0FBQztJQXJCQSxPQUFPLENBQUMsR0FBVyxFQUFFLElBQTREO1FBQ2hGLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsUUFBUSxDQUNQLEtBQStGO1FBRS9GLEtBQUssTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUksR0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBa0IsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQVc7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLEtBQW1CLENBQUM7Q0FDL0IifQ==