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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVZhbHVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vb2JzZXJ2YWJsZVZhbHVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBUWpFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLENBQUksS0FBUSxFQUF1QixFQUFFLENBQUMsQ0FBQztJQUMzRSxXQUFXLEVBQUUsS0FBSyxDQUFDLElBQUk7SUFDdkIsS0FBSztDQUNMLENBQUMsQ0FBQTtBQUVGLE1BQU0sT0FBTyxzQkFBMEIsU0FBUSxVQUFVO0lBS3hELElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBVyxLQUFLLENBQUMsQ0FBSTtRQUNwQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDZixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUksTUFBc0IsRUFBRSxZQUFlO1FBQzlELE1BQU0sQ0FBQyxHQUFHLElBQUksc0JBQXNCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzlELENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFRCxZQUFvQixNQUFTO1FBQzVCLEtBQUssRUFBRSxDQUFBO1FBRFksV0FBTSxHQUFOLE1BQU0sQ0FBRztRQXRCWixrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFBO1FBRWpELGdCQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7SUFzQnRELENBQUM7Q0FDRCJ9