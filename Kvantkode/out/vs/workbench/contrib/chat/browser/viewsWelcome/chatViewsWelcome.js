/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
export var ChatViewsWelcomeExtensions;
(function (ChatViewsWelcomeExtensions) {
    ChatViewsWelcomeExtensions["ChatViewsWelcomeRegistry"] = "workbench.registry.chat.viewsWelcome";
})(ChatViewsWelcomeExtensions || (ChatViewsWelcomeExtensions = {}));
class ChatViewsWelcomeContributionRegistry {
    constructor() {
        this.descriptors = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    register(descriptor) {
        this.descriptors.push(descriptor);
        this._onDidChange.fire();
    }
    get() {
        return this.descriptors;
    }
}
export const chatViewsWelcomeRegistry = new ChatViewsWelcomeContributionRegistry();
Registry.add("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */, chatViewsWelcomeRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3ZpZXdzV2VsY29tZS9jaGF0Vmlld3NXZWxjb21lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUtwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFOUUsTUFBTSxDQUFOLElBQWtCLDBCQUVqQjtBQUZELFdBQWtCLDBCQUEwQjtJQUMzQywrRkFBaUUsQ0FBQTtBQUNsRSxDQUFDLEVBRmlCLDBCQUEwQixLQUExQiwwQkFBMEIsUUFFM0M7QUFlRCxNQUFNLG9DQUFvQztJQUExQztRQUNrQixnQkFBVyxHQUFrQyxFQUFFLENBQUE7UUFDL0MsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ25DLGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO0lBVW5FLENBQUM7SUFSTyxRQUFRLENBQUMsVUFBdUM7UUFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU0sR0FBRztRQUNULE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLG9DQUFvQyxFQUFFLENBQUE7QUFDbEYsUUFBUSxDQUFDLEdBQUcsbUdBQXNELHdCQUF3QixDQUFDLENBQUEifQ==