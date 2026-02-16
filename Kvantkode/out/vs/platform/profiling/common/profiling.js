/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename, isAbsolute, join } from '../../../base/common/path.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IV8InspectProfilingService = createDecorator('IV8InspectProfilingService');
export var Utils;
(function (Utils) {
    function isValidProfile(profile) {
        return Boolean(profile.samples && profile.timeDeltas);
    }
    Utils.isValidProfile = isValidProfile;
    function rewriteAbsolutePaths(profile, replace = 'noAbsolutePaths') {
        for (const node of profile.nodes) {
            if (node.callFrame && node.callFrame.url) {
                if (isAbsolute(node.callFrame.url) || /^\w[\w\d+.-]*:\/\/\/?/.test(node.callFrame.url)) {
                    node.callFrame.url = join(replace, basename(node.callFrame.url));
                }
            }
        }
        return profile;
    }
    Utils.rewriteAbsolutePaths = rewriteAbsolutePaths;
})(Utils || (Utils = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvY29tbW9uL3Byb2ZpbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUEyQjdFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsNEJBQTRCLENBQzVCLENBQUE7QUFVRCxNQUFNLEtBQVcsS0FBSyxDQWVyQjtBQWZELFdBQWlCLEtBQUs7SUFDckIsU0FBZ0IsY0FBYyxDQUFDLE9BQW1CO1FBQ2pELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFGZSxvQkFBYyxpQkFFN0IsQ0FBQTtJQUVELFNBQWdCLG9CQUFvQixDQUFDLE9BQW1CLEVBQUUsVUFBa0IsaUJBQWlCO1FBQzVGLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xDLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3hGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBVGUsMEJBQW9CLHVCQVNuQyxDQUFBO0FBQ0YsQ0FBQyxFQWZnQixLQUFLLEtBQUwsS0FBSyxRQWVyQiJ9