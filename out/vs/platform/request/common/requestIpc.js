/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, streamToBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
export class RequestChannel {
    constructor(service) {
        this.service = service;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    call(context, command, args, token = CancellationToken.None) {
        switch (command) {
            case 'request':
                return this.service.request(args[0], token).then(async ({ res, stream }) => {
                    const buffer = await streamToBuffer(stream);
                    return [{ statusCode: res.statusCode, headers: res.headers }, buffer];
                });
            case 'resolveProxy':
                return this.service.resolveProxy(args[0]);
            case 'lookupAuthorization':
                return this.service.lookupAuthorization(args[0]);
            case 'lookupKerberosAuthorization':
                return this.service.lookupKerberosAuthorization(args[0]);
            case 'loadCertificates':
                return this.service.loadCertificates();
        }
        throw new Error('Invalid call');
    }
}
export class RequestChannelClient {
    constructor(channel) {
        this.channel = channel;
    }
    async request(options, token) {
        const [res, buffer] = await this.channel.call('request', [options], token);
        return { res, stream: bufferToStream(buffer) };
    }
    async resolveProxy(url) {
        return this.channel.call('resolveProxy', [url]);
    }
    async lookupAuthorization(authInfo) {
        return this.channel.call('lookupAuthorization', [authInfo]);
    }
    async lookupKerberosAuthorization(url) {
        return this.channel.call('lookupKerberosAuthorization', [url]);
    }
    async loadCertificates() {
        return this.channel.call('loadCertificates');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdElwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC9jb21tb24vcmVxdWVzdElwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBWSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBa0J4RSxNQUFNLE9BQU8sY0FBYztJQUMxQixZQUE2QixPQUF3QjtRQUF4QixZQUFPLEdBQVAsT0FBTyxDQUFpQjtJQUFHLENBQUM7SUFFekQsTUFBTSxDQUFDLE9BQVksRUFBRSxLQUFhO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUNILE9BQVksRUFDWixPQUFlLEVBQ2YsSUFBVSxFQUNWLFFBQTJCLGlCQUFpQixDQUFDLElBQUk7UUFFakQsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO29CQUMxRSxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDM0MsT0FBd0IsQ0FBQyxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3ZGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsS0FBSyxjQUFjO2dCQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLEtBQUsscUJBQXFCO2dCQUN6QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDakQsS0FBSyw2QkFBNkI7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RCxLQUFLLGtCQUFrQjtnQkFDdEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDeEMsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFvQjtJQUdoQyxZQUE2QixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUcsQ0FBQztJQUVsRCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQXdCLEVBQUUsS0FBd0I7UUFDL0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFrQixTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQXFCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFrQjtRQUMzQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUN2QixxQkFBcUIsRUFDckIsQ0FBQyxRQUFRLENBQUMsQ0FDVixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxHQUFXO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQXFCLDZCQUE2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQjtRQUNyQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFXLGtCQUFrQixDQUFDLENBQUE7SUFDdkQsQ0FBQztDQUNEIn0=