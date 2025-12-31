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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZGlhbG9ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQXVCM0QsTUFBTSxPQUFPLFlBQWEsU0FBUSxVQUFVO0lBQTVDOztRQUNVLFlBQU8sR0FBc0IsRUFBRSxDQUFBO1FBRXZCLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9ELHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDOUQsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0lBMEJ2RCxDQUFDO0lBeEJBLElBQUksQ0FBQyxNQUFtQjtRQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLGVBQWUsRUFBNkIsQ0FBQTtRQUVoRSxNQUFNLElBQUksR0FBb0I7WUFDN0IsSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN6QixJQUFJLE1BQU0sWUFBWSxLQUFLLEVBQUUsQ0FBQztvQkFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFBO1lBQzdCLENBQUM7U0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFBO1FBRTdCLE9BQU87WUFDTixJQUFJO1lBQ0osTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2pCLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==