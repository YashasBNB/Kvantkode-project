/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var RecommendationSource;
(function (RecommendationSource) {
    RecommendationSource[RecommendationSource["FILE"] = 1] = "FILE";
    RecommendationSource[RecommendationSource["WORKSPACE"] = 2] = "WORKSPACE";
    RecommendationSource[RecommendationSource["EXE"] = 3] = "EXE";
})(RecommendationSource || (RecommendationSource = {}));
export function RecommendationSourceToString(source) {
    switch (source) {
        case 1 /* RecommendationSource.FILE */:
            return 'file';
        case 2 /* RecommendationSource.WORKSPACE */:
            return 'workspace';
        case 3 /* RecommendationSource.EXE */:
            return 'exe';
    }
}
export var RecommendationsNotificationResult;
(function (RecommendationsNotificationResult) {
    RecommendationsNotificationResult["Ignored"] = "ignored";
    RecommendationsNotificationResult["Cancelled"] = "cancelled";
    RecommendationsNotificationResult["TooMany"] = "toomany";
    RecommendationsNotificationResult["IncompatibleWindow"] = "incompatibleWindow";
    RecommendationsNotificationResult["Accepted"] = "reacted";
})(RecommendationsNotificationResult || (RecommendationsNotificationResult = {}));
export const IExtensionRecommendationNotificationService = createDecorator('IExtensionRecommendationNotificationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL2V4dGVuc2lvblJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsTUFBTSxDQUFOLElBQWtCLG9CQUlqQjtBQUpELFdBQWtCLG9CQUFvQjtJQUNyQywrREFBUSxDQUFBO0lBQ1IseUVBQWEsQ0FBQTtJQUNiLDZEQUFPLENBQUE7QUFDUixDQUFDLEVBSmlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFJckM7QUFTRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsTUFBNEI7SUFDeEUsUUFBUSxNQUFNLEVBQUUsQ0FBQztRQUNoQjtZQUNDLE9BQU8sTUFBTSxDQUFBO1FBQ2Q7WUFDQyxPQUFPLFdBQVcsQ0FBQTtRQUNuQjtZQUNDLE9BQU8sS0FBSyxDQUFBO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsaUNBTWpCO0FBTkQsV0FBa0IsaUNBQWlDO0lBQ2xELHdEQUFtQixDQUFBO0lBQ25CLDREQUF1QixDQUFBO0lBQ3ZCLHdEQUFtQixDQUFBO0lBQ25CLDhFQUF5QyxDQUFBO0lBQ3pDLHlEQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFOaUIsaUNBQWlDLEtBQWpDLGlDQUFpQyxRQU1sRDtBQUVELE1BQU0sQ0FBQyxNQUFNLDJDQUEyQyxHQUN2RCxlQUFlLENBQ2QsNkNBQTZDLENBQzdDLENBQUEifQ==