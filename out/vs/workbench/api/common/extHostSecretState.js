/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext, } from './extHost.protocol.js';
import { Emitter } from '../../../base/common/event.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostSecretState {
    constructor(mainContext) {
        this._onDidChangePassword = new Emitter();
        this.onDidChangePassword = this._onDidChangePassword.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadSecretState);
    }
    async $onDidChangePassword(e) {
        this._onDidChangePassword.fire(e);
    }
    get(extensionId, key) {
        return this._proxy.$getPassword(extensionId, key);
    }
    store(extensionId, key, value) {
        return this._proxy.$setPassword(extensionId, key, value);
    }
    delete(extensionId, key) {
        return this._proxy.$deletePassword(extensionId, key);
    }
}
export const IExtHostSecretState = createDecorator('IExtHostSecretState');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlY3JldFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFNlY3JldFN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRXpGLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFBWSxXQUErQjtRQUhuQyx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBd0MsQ0FBQTtRQUN6RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRzdELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQXVDO1FBQ2pFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELEdBQUcsQ0FBQyxXQUFtQixFQUFFLEdBQVc7UUFDbkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFtQixFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ3BELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQW1CLEVBQUUsR0FBVztRQUN0QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0NBQ0Q7QUFHRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLHFCQUFxQixDQUFDLENBQUEifQ==