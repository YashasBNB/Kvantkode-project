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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvYWRjYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2Jyb2FkY2FzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVqRSxNQUFNLE9BQU8sb0JBQXdCLFNBQVEsVUFBVTtJQU10RCxZQUE2QixXQUFtQjtRQUMvQyxLQUFLLEVBQUUsQ0FBQTtRQURxQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUgvQixzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFLLENBQUMsQ0FBQTtRQUM1RCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBS3ZELHVCQUF1QjtRQUN2QixJQUFJLGtCQUFrQixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDekQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFtQixFQUFFLEVBQUU7b0JBQ3hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN4QyxDQUFDLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDM0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsR0FBRyxFQUFFO29CQUNqQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO3dCQUM5RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQzlCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixPQUFPLENBQUMsSUFBSSxDQUNYLHVFQUF1RSxFQUN2RSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQ3RCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyx3QkFBd0IsV0FBVyxFQUFFLENBQUE7WUFDeEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFtQixFQUFFLEVBQUU7WUFDeEMsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN0RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUNELFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVEOzs7T0FHRztJQUNILFFBQVEsQ0FBQyxJQUFPO1FBQ2YsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUdBQWlHO1lBQ2pHLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3pDLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDN0QsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9