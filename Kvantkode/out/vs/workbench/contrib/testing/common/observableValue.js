/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export const staticObservableValue = (value) => ({
    onDidChange: Event.None,
    value,
});
export class MutableObservableValue extends Disposable {
    get value() {
        return this._value;
    }
    set value(v) {
        if (v !== this._value) {
            this._value = v;
            this.changeEmitter.fire(v);
        }
    }
    static stored(stored, defaultValue) {
        const o = new MutableObservableValue(stored.get(defaultValue));
        o._register(stored);
        o._register(o.onDidChange((value) => stored.store(value)));
        return o;
    }
    constructor(_value) {
        super();
        this._value = _value;
        this.changeEmitter = this._register(new Emitter());
        this.onDidChange = this.changeEmitter.event;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVZhbHVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9vYnNlcnZhYmxlVmFsdWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFRakUsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsQ0FBSSxLQUFRLEVBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSTtJQUN2QixLQUFLO0NBQ0wsQ0FBQyxDQUFBO0FBRUYsTUFBTSxPQUFPLHNCQUEwQixTQUFRLFVBQVU7SUFLeEQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFXLEtBQUssQ0FBQyxDQUFJO1FBQ3BCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNmLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNCLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBSSxNQUFzQixFQUFFLFlBQWU7UUFDOUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDOUQsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVELFlBQW9CLE1BQVM7UUFDNUIsS0FBSyxFQUFFLENBQUE7UUFEWSxXQUFNLEdBQU4sTUFBTSxDQUFHO1FBdEJaLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBSyxDQUFDLENBQUE7UUFFakQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtJQXNCdEQsQ0FBQztDQUNEIn0=