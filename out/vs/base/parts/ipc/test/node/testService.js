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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL3Rlc3Qvbm9kZS90ZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDZCQUE2QixDQUFBO0FBYzVELE1BQU0sT0FBTyxXQUFXO0lBQXhCO1FBQ2tCLGFBQVEsR0FBRyxJQUFJLE9BQU8sRUFBbUIsQ0FBQTtRQUMxRCxZQUFPLEdBQTJCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO0lBY3RELENBQUM7SUFaQSxLQUFLO1FBQ0osSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZO1FBQ2hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQW9CLFdBQXlCO1FBQXpCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQUcsQ0FBQztJQUVqRCxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWE7UUFDL0IsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssT0FBTztnQkFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFBO1FBQ2pDLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFVLEVBQUUsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUMvQyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssTUFBTTtnQkFDVixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLEtBQUssVUFBVTtnQkFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDbkMsS0FBSyxPQUFPO2dCQUNYLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNoQztnQkFDQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsc0JBQXNCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxZQUFvQixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUcsQ0FBQztJQUV6QyxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7Q0FDRCJ9