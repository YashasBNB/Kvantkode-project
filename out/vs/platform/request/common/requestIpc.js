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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdElwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlcXVlc3QvY29tbW9uL3JlcXVlc3RJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQVksTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWtCeEUsTUFBTSxPQUFPLGNBQWM7SUFDMUIsWUFBNkIsT0FBd0I7UUFBeEIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7SUFBRyxDQUFDO0lBRXpELE1BQU0sQ0FBQyxPQUFZLEVBQUUsS0FBYTtRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksQ0FDSCxPQUFZLEVBQ1osT0FBZSxFQUNmLElBQVUsRUFDVixRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBRWpELFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxTQUFTO2dCQUNiLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtvQkFDMUUsTUFBTSxNQUFNLEdBQUcsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQzNDLE9BQXdCLENBQUMsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN2RixDQUFDLENBQUMsQ0FBQTtZQUNILEtBQUssY0FBYztnQkFDbEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxLQUFLLHFCQUFxQjtnQkFDekIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pELEtBQUssNkJBQTZCO2dCQUNqQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekQsS0FBSyxrQkFBa0I7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3hDLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxvQkFBb0I7SUFHaEMsWUFBNkIsT0FBaUI7UUFBakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUFHLENBQUM7SUFFbEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUF3QixFQUFFLEtBQXdCO1FBQy9ELE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBa0IsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBVztRQUM3QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFxQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsUUFBa0I7UUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDdkIscUJBQXFCLEVBQ3JCLENBQUMsUUFBUSxDQUFDLENBQ1YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsR0FBVztRQUM1QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFxQiw2QkFBNkIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0I7UUFDckIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBVyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDRCJ9