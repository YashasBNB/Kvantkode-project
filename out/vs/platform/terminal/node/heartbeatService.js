/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { HeartbeatConstants } from '../common/terminal.js';
export class HeartbeatService extends Disposable {
    constructor() {
        super();
        this._onBeat = this._register(new Emitter());
        this.onBeat = this._onBeat.event;
        const interval = setInterval(() => {
            this._onBeat.fire();
        }, HeartbeatConstants.BeatInterval);
        this._register(toDisposable(() => clearInterval(interval)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhcnRiZWF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvaGVhcnRiZWF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQXFCLE1BQU0sdUJBQXVCLENBQUE7QUFFN0UsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFJL0M7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUpTLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNyRCxXQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFLbkMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3BCLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVELENBQUM7Q0FDRCJ9