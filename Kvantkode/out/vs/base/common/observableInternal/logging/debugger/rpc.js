/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class SimpleTypedRpcConnection {
    static createHost(channelFactory, getHandler) {
        return new SimpleTypedRpcConnection(channelFactory, getHandler);
    }
    static createClient(channelFactory, getHandler) {
        return new SimpleTypedRpcConnection(channelFactory, getHandler);
    }
    constructor(_channelFactory, _getHandler) {
        this._channelFactory = _channelFactory;
        this._getHandler = _getHandler;
        this._channel = this._channelFactory({
            handleNotification: (notificationData) => {
                const m = notificationData;
                const fn = this._getHandler().notifications[m[0]];
                if (!fn) {
                    throw new Error(`Unknown notification "${m[0]}"!`);
                }
                fn(...m[1]);
            },
            handleRequest: (requestData) => {
                const m = requestData;
                try {
                    const result = this._getHandler().requests[m[0]](...m[1]);
                    return { type: 'result', value: result };
                }
                catch (e) {
                    return { type: 'error', value: e };
                }
            },
        });
        const requests = new Proxy({}, {
            get: (target, key) => {
                return async (...args) => {
                    const result = await this._channel.sendRequest([key, args]);
                    if (result.type === 'error') {
                        throw result.value;
                    }
                    else {
                        return result.value;
                    }
                };
            },
        });
        const notifications = new Proxy({}, {
            get: (target, key) => {
                return (...args) => {
                    this._channel.sendNotification([key, args]);
                };
            },
        });
        this.api = { notifications: notifications, requests: requests };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9kZWJ1Z2dlci9ycGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF1Q2hHLE1BQU0sT0FBTyx3QkFBd0I7SUFDN0IsTUFBTSxDQUFDLFVBQVUsQ0FDdkIsY0FBOEIsRUFDOUIsVUFBMkI7UUFFM0IsT0FBTyxJQUFJLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFlBQVksQ0FDekIsY0FBOEIsRUFDOUIsVUFBNkI7UUFFN0IsT0FBTyxJQUFJLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBS0QsWUFDa0IsZUFBK0IsRUFDL0IsV0FBdUI7UUFEdkIsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBRXhDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUNwQyxrQkFBa0IsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0sQ0FBQyxHQUFHLGdCQUFtQyxDQUFBO2dCQUM3QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbkQsQ0FBQztnQkFDRCxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNaLENBQUM7WUFDRCxhQUFhLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDOUIsTUFBTSxDQUFDLEdBQUcsV0FBOEIsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDO29CQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFBO2dCQUN6QyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFBO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxDQUN6QixFQUFFLEVBQ0Y7WUFDQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBVyxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sS0FBSyxFQUFFLEdBQUcsSUFBVyxFQUFFLEVBQUU7b0JBQy9CLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUEyQixDQUFDLENBQUE7b0JBQ3JGLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQzt3QkFDN0IsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFBO29CQUNuQixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUMsQ0FBQTtZQUNGLENBQUM7U0FDRCxDQUNELENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FDOUIsRUFBRSxFQUNGO1lBQ0MsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQVcsRUFBRSxFQUFFO2dCQUM1QixPQUFPLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtvQkFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQTJCLENBQUMsQ0FBQTtnQkFDdEUsQ0FBQyxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQVMsQ0FBQTtJQUN2RSxDQUFDO0NBQ0QifQ==