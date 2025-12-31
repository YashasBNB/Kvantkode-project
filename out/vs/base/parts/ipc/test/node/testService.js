/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../common/async.js';
import { Emitter } from '../../../../common/event.js';
export class TestService {
    constructor() {
        this._onMarco = new Emitter();
        this.onMarco = this._onMarco.event;
    }
    marco() {
        this._onMarco.fire({ answer: 'polo' });
        return Promise.resolve('polo');
    }
    pong(ping) {
        return Promise.resolve({ incoming: ping, outgoing: 'pong' });
    }
    cancelMe() {
        return Promise.resolve(timeout(100)).then(() => true);
    }
}
export class TestChannel {
    constructor(testService) {
        this.testService = testService;
    }
    listen(_, event) {
        switch (event) {
            case 'marco':
                return this.testService.onMarco;
        }
        throw new Error('Event not found');
    }
    call(_, command, ...args) {
        switch (command) {
            case 'pong':
                return this.testService.pong(args[0]);
            case 'cancelMe':
                return this.testService.cancelMe();
            case 'marco':
                return this.testService.marco();
            default:
                return Promise.reject(new Error(`command not found: ${command}`));
        }
    }
}
export class TestServiceClient {
    get onMarco() {
        return this.channel.listen('marco');
    }
    constructor(channel) {
        this.channel = channel;
    }
    marco() {
        return this.channel.call('marco');
    }
    pong(ping) {
        return this.channel.call('pong', ping);
    }
    cancelMe() {
        return this.channel.call('cancelMe');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L25vZGUvdGVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw2QkFBNkIsQ0FBQTtBQWM1RCxNQUFNLE9BQU8sV0FBVztJQUF4QjtRQUNrQixhQUFRLEdBQUcsSUFBSSxPQUFPLEVBQW1CLENBQUE7UUFDMUQsWUFBTyxHQUEyQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtJQWN0RCxDQUFDO0lBWkEsS0FBSztRQUNKLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDdEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBWTtRQUNoQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUFvQixXQUF5QjtRQUF6QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztJQUFHLENBQUM7SUFFakQsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhO1FBQy9CLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQTtRQUNqQyxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDL0MsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25DLEtBQUssT0FBTztnQkFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDaEM7Z0JBQ0MsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLHNCQUFzQixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkUsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsWUFBb0IsT0FBaUI7UUFBakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUFHLENBQUM7SUFFekMsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0QifQ==