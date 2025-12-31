/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IMainProcessService = createDecorator('mainProcessService');
/**
 * An implementation of `IMainProcessService` that leverages `IPCServer`.
 */
export class MainProcessService {
    constructor(server, router) {
        this.server = server;
        this.router = router;
    }
    getChannel(channelName) {
        return this.server.getChannel(channelName, this.router);
    }
    registerChannel(channelName, channel) {
        this.server.registerChannel(channelName, channel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblByb2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaXBjL2NvbW1vbi9tYWluUHJvY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzdFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQUk3Rjs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFHOUIsWUFDUyxNQUFpQixFQUNqQixNQUFvQjtRQURwQixXQUFNLEdBQU4sTUFBTSxDQUFXO1FBQ2pCLFdBQU0sR0FBTixNQUFNLENBQWM7SUFDMUIsQ0FBQztJQUVKLFVBQVUsQ0FBQyxXQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVELGVBQWUsQ0FBQyxXQUFtQixFQUFFLE9BQStCO1FBQ25FLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0QifQ==