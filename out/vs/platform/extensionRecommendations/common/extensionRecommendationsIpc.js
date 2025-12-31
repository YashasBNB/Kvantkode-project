/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ExtensionRecommendationNotificationServiceChannelClient {
    constructor(channel) {
        this.channel = channel;
    }
    get ignoredRecommendations() {
        throw new Error('not supported');
    }
    promptImportantExtensionsInstallNotification(extensionRecommendations) {
        return this.channel.call('promptImportantExtensionsInstallNotification', [
            extensionRecommendations,
        ]);
    }
    promptWorkspaceRecommendations(recommendations) {
        throw new Error('not supported');
    }
    hasToIgnoreRecommendationNotifications() {
        throw new Error('not supported');
    }
}
export class ExtensionRecommendationNotificationServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, args) {
        switch (command) {
            case 'promptImportantExtensionsInstallNotification':
                return this.service.promptImportantExtensionsInstallNotification(args[0]);
        }
        throw new Error(`Call not found: ${command}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zL2NvbW1vbi9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnNJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsTUFBTSxPQUFPLHVEQUF1RDtJQUtuRSxZQUE2QixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUcsQ0FBQztJQUVsRCxJQUFJLHNCQUFzQjtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCw0Q0FBNEMsQ0FDM0Msd0JBQW1EO1FBRW5ELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsOENBQThDLEVBQUU7WUFDeEUsd0JBQXdCO1NBQ3hCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxlQUF5QjtRQUN2RCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxzQ0FBc0M7UUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8saURBQWlEO0lBQzdELFlBQW9CLE9BQW9EO1FBQXBELFlBQU8sR0FBUCxPQUFPLENBQTZDO0lBQUcsQ0FBQztJQUU1RSxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWE7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsSUFBVTtRQUMzQyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssOENBQThDO2dCQUNsRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsNENBQTRDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0UsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQztDQUNEIn0=