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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZmlsaW5nL2NvbW1vbi9wcm9maWxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBMkI3RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDRCQUE0QixDQUM1QixDQUFBO0FBVUQsTUFBTSxLQUFXLEtBQUssQ0FlckI7QUFmRCxXQUFpQixLQUFLO0lBQ3JCLFNBQWdCLGNBQWMsQ0FBQyxPQUFtQjtRQUNqRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRmUsb0JBQWMsaUJBRTdCLENBQUE7SUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxPQUFtQixFQUFFLFVBQWtCLGlCQUFpQjtRQUM1RixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN4RixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQVRlLDBCQUFvQix1QkFTbkMsQ0FBQTtBQUNGLENBQUMsRUFmZ0IsS0FBSyxLQUFMLEtBQUssUUFlckIifQ==