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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL2V4dGVuc2lvblJlY29tbWVuZGF0aW9uc0lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxNQUFNLE9BQU8sdURBQXVEO0lBS25FLFlBQTZCLE9BQWlCO1FBQWpCLFlBQU8sR0FBUCxPQUFPLENBQVU7SUFBRyxDQUFDO0lBRWxELElBQUksc0JBQXNCO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELDRDQUE0QyxDQUMzQyx3QkFBbUQ7UUFFbkQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRTtZQUN4RSx3QkFBd0I7U0FDeEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELDhCQUE4QixDQUFDLGVBQXlCO1FBQ3ZELE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELHNDQUFzQztRQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpREFBaUQ7SUFDN0QsWUFBb0IsT0FBb0Q7UUFBcEQsWUFBTyxHQUFQLE9BQU8sQ0FBNkM7SUFBRyxDQUFDO0lBRTVFLE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYTtRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWUsRUFBRSxJQUFVO1FBQzNDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyw4Q0FBOEM7Z0JBQ2xELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRSxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0QifQ==