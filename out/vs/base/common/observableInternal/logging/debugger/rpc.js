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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2xvZ2dpbmcvZGVidWdnZXIvcnBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBdUNoRyxNQUFNLE9BQU8sd0JBQXdCO0lBQzdCLE1BQU0sQ0FBQyxVQUFVLENBQ3ZCLGNBQThCLEVBQzlCLFVBQTJCO1FBRTNCLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLGNBQThCLEVBQzlCLFVBQTZCO1FBRTdCLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUtELFlBQ2tCLGVBQStCLEVBQy9CLFdBQXVCO1FBRHZCLG9CQUFlLEdBQWYsZUFBZSxDQUFnQjtRQUMvQixnQkFBVyxHQUFYLFdBQVcsQ0FBWTtRQUV4QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDcEMsa0JBQWtCLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO2dCQUN4QyxNQUFNLENBQUMsR0FBRyxnQkFBbUMsQ0FBQTtnQkFDN0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNULE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25ELENBQUM7Z0JBQ0QsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDWixDQUFDO1lBQ0QsYUFBYSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzlCLE1BQU0sQ0FBQyxHQUFHLFdBQThCLENBQUE7Z0JBQ3hDLElBQUksQ0FBQztvQkFDSixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQTtnQkFDekMsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNaLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQTtnQkFDbkMsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FDekIsRUFBRSxFQUNGO1lBQ0MsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQVcsRUFBRSxFQUFFO2dCQUM1QixPQUFPLEtBQUssRUFBRSxHQUFHLElBQVcsRUFBRSxFQUFFO29CQUMvQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBMkIsQ0FBQyxDQUFBO29CQUNyRixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7d0JBQzdCLE1BQU0sTUFBTSxDQUFDLEtBQUssQ0FBQTtvQkFDbkIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQTtvQkFDcEIsQ0FBQztnQkFDRixDQUFDLENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FDRCxDQUFBO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQzlCLEVBQUUsRUFDRjtZQUNDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFXLEVBQUUsRUFBRTtnQkFDNUIsT0FBTyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7b0JBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUEyQixDQUFDLENBQUE7Z0JBQ3RFLENBQUMsQ0FBQTtZQUNGLENBQUM7U0FDRCxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFTLENBQUE7SUFDdkUsQ0FBQztDQUNEIn0=