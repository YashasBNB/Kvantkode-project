/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from './window.js';
import { getErrorMessage } from '../common/errors.js';
import { Emitter } from '../common/event.js';
import { Disposable, toDisposable } from '../common/lifecycle.js';
export class BroadcastDataChannel extends Disposable {
    constructor(channelName) {
        super();
        this.channelName = channelName;
        this._onDidReceiveData = this._register(new Emitter());
        this.onDidReceiveData = this._onDidReceiveData.event;
        // Use BroadcastChannel
        if ('BroadcastChannel' in mainWindow) {
            try {
                this.broadcastChannel = new BroadcastChannel(channelName);
                const listener = (event) => {
                    this._onDidReceiveData.fire(event.data);
                };
                this.broadcastChannel.addEventListener('message', listener);
                this._register(toDisposable(() => {
                    if (this.broadcastChannel) {
                        this.broadcastChannel.removeEventListener('message', listener);
                        this.broadcastChannel.close();
                    }
                }));
            }
            catch (error) {
                console.warn('Error while creating broadcast channel. Falling back to localStorage.', getErrorMessage(error));
            }
        }
        // BroadcastChannel is not supported. Use storage.
        if (!this.broadcastChannel) {
            this.channelName = `BroadcastDataChannel.${channelName}`;
            this.createBroadcastChannel();
        }
    }
    createBroadcastChannel() {
        const listener = (event) => {
            if (event.key === this.channelName && event.newValue) {
                this._onDidReceiveData.fire(JSON.parse(event.newValue));
            }
        };
        mainWindow.addEventListener('storage', listener);
        this._register(toDisposable(() => mainWindow.removeEventListener('storage', listener)));
    }
    /**
     * Sends the data to other BroadcastChannel objects set up for this channel. Data can be structured objects, e.g. nested objects and arrays.
     * @param data data to broadcast
     */
    postData(data) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(data);
        }
        else {
            // remove previous changes so that event is triggered even if new changes are same as old changes
            localStorage.removeItem(this.channelName);
            localStorage.setItem(this.channelName, JSON.stringify(data));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvYWRjYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvYnJvYWRjYXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRWpFLE1BQU0sT0FBTyxvQkFBd0IsU0FBUSxVQUFVO0lBTXRELFlBQTZCLFdBQW1CO1FBQy9DLEtBQUssRUFBRSxDQUFBO1FBRHFCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBSC9CLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFBO1FBQzVELHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFLdkQsdUJBQXVCO1FBQ3ZCLElBQUksa0JBQWtCLElBQUksVUFBVSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUN6RCxNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQW1CLEVBQUUsRUFBRTtvQkFDeEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3hDLENBQUMsQ0FBQTtnQkFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyxHQUFHLEVBQUU7b0JBQ2pCLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7d0JBQzlELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsdUVBQXVFLEVBQ3ZFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FDdEIsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLHdCQUF3QixXQUFXLEVBQUUsQ0FBQTtZQUN4RCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQW1CLEVBQUUsRUFBRTtZQUN4QyxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsUUFBUSxDQUFDLElBQU87UUFDZixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxpR0FBaUc7WUFDakcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDekMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=