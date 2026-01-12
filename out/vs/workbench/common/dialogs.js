/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../base/common/async.js';
import { Emitter } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
export class DialogsModel extends Disposable {
    constructor() {
        super(...arguments);
        this.dialogs = [];
        this._onWillShowDialog = this._register(new Emitter());
        this.onWillShowDialog = this._onWillShowDialog.event;
        this._onDidShowDialog = this._register(new Emitter());
        this.onDidShowDialog = this._onDidShowDialog.event;
    }
    show(dialog) {
        const promise = new DeferredPromise();
        const item = {
            args: dialog,
            close: (result) => {
                this.dialogs.splice(0, 1);
                if (result instanceof Error) {
                    promise.error(result);
                }
                else {
                    promise.complete(result);
                }
                this._onDidShowDialog.fire();
            },
        };
        this.dialogs.push(item);
        this._onWillShowDialog.fire();
        return {
            item,
            result: promise.p,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9kaWFsb2dzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBdUIzRCxNQUFNLE9BQU8sWUFBYSxTQUFRLFVBQVU7SUFBNUM7O1FBQ1UsWUFBTyxHQUFzQixFQUFFLENBQUE7UUFFdkIsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0QscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUV2QyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM5RCxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7SUEwQnZELENBQUM7SUF4QkEsSUFBSSxDQUFDLE1BQW1CO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksZUFBZSxFQUE2QixDQUFBO1FBRWhFLE1BQU0sSUFBSSxHQUFvQjtZQUM3QixJQUFJLEVBQUUsTUFBTTtZQUNaLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pCLElBQUksTUFBTSxZQUFZLEtBQUssRUFBRSxDQUFDO29CQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN0QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekIsQ0FBQztnQkFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUE7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFN0IsT0FBTztZQUNOLElBQUk7WUFDSixNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDakIsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9