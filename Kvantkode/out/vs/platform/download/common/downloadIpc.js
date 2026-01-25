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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWRJcGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Rvd25sb2FkL2NvbW1vbi9kb3dubG9hZElwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFLakQsTUFBTSxPQUFPLHNCQUFzQjtJQUNsQyxZQUE2QixPQUF5QjtRQUF6QixZQUFPLEdBQVAsT0FBTyxDQUFrQjtJQUFHLENBQUM7SUFFMUQsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhLEVBQUUsR0FBUztRQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFZLEVBQUUsT0FBZSxFQUFFLElBQVU7UUFDN0MsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBR3hDLFlBQ1MsT0FBaUIsRUFDakIsaUJBQStDO1FBRC9DLFlBQU8sR0FBUCxPQUFPLENBQVU7UUFDakIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE4QjtJQUNyRCxDQUFDO0lBRUosS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFTLEVBQUUsRUFBTztRQUNoQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksR0FBRyxjQUFjLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEQsRUFBRSxHQUFHLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBQ0QsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0NBQ0QifQ==