/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export class DownloadServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event, arg) {
        throw new Error('Invalid listen');
    }
    call(context, command, args) {
        switch (command) {
            case 'download':
                return this.service.download(URI.revive(args[0]), URI.revive(args[1]));
        }
        throw new Error('Invalid call');
    }
}
export class DownloadServiceChannelClient {
    constructor(channel, getUriTransformer) {
        this.channel = channel;
        this.getUriTransformer = getUriTransformer;
    }
    async download(from, to) {
        const uriTransformer = this.getUriTransformer();
        if (uriTransformer) {
            from = uriTransformer.transformOutgoingURI(from);
            to = uriTransformer.transformOutgoingURI(to);
        }
        await this.channel.call('download', [from, to]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWRJcGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kb3dubG9hZC9jb21tb24vZG93bmxvYWRJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBS2pELE1BQU0sT0FBTyxzQkFBc0I7SUFDbEMsWUFBNkIsT0FBeUI7UUFBekIsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7SUFBRyxDQUFDO0lBRTFELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYSxFQUFFLEdBQVM7UUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBWSxFQUFFLE9BQWUsRUFBRSxJQUFVO1FBQzdDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxVQUFVO2dCQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEUsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDRCQUE0QjtJQUd4QyxZQUNTLE9BQWlCLEVBQ2pCLGlCQUErQztRQUQvQyxZQUFPLEdBQVAsT0FBTyxDQUFVO1FBQ2pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBOEI7SUFDckQsQ0FBQztJQUVKLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBUyxFQUFFLEVBQU87UUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDL0MsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLEdBQUcsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2hELEVBQUUsR0FBRyxjQUFjLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUNELE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQztDQUNEIn0=