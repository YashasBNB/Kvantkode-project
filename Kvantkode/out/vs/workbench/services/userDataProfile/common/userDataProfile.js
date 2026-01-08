/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUndefined } from '../../../../base/common/types.js';
import { localize, localize2 } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
export const IUserDataProfileService = createDecorator('IUserDataProfileService');
export const IUserDataProfileManagementService = createDecorator('IUserDataProfileManagementService');
export function isUserDataProfileTemplate(thing) {
    const candidate = thing;
    return !!(candidate &&
        typeof candidate === 'object' &&
        (isUndefined(candidate.settings) || typeof candidate.settings === 'string') &&
        (isUndefined(candidate.globalState) || typeof candidate.globalState === 'string') &&
        (isUndefined(candidate.extensions) || typeof candidate.extensions === 'string'));
}
export const PROFILE_URL_AUTHORITY = 'profile';
export function toUserDataProfileUri(path, productService) {
    return URI.from({
        scheme: productService.urlProtocol,
        authority: PROFILE_URL_AUTHORITY,
        path: path.startsWith('/') ? path : `/${path}`,
    });
}
export const PROFILE_URL_AUTHORITY_PREFIX = 'profile-';
export function isProfileURL(uri) {
    return (uri.authority === PROFILE_URL_AUTHORITY ||
        new RegExp(`^${PROFILE_URL_AUTHORITY_PREFIX}`).test(uri.authority));
}
export const IUserDataProfileImportExportService = createDecorator('IUserDataProfileImportExportService');
export const defaultUserDataProfileIcon = registerIcon('defaultProfile-icon', Codicon.settings, localize('defaultProfileIcon', 'Icon for Default Profile.'));
export const PROFILES_TITLE = localize2('profiles', 'Profiles');
export const PROFILES_CATEGORY = { ...PROFILES_TITLE };
export const PROFILE_EXTENSION = 'code-profile';
export const PROFILE_FILTER = [
    { name: localize('profile', 'Profile'), extensions: [PROFILE_EXTENSION] },
];
export const CURRENT_PROFILE_CONTEXT = new RawContextKey('currentProfile', '');
export const IS_CURRENT_PROFILE_TRANSIENT_CONTEXT = new RawContextKey('isCurrentProfileTransient', false);
export const HAS_PROFILES_CONTEXT = new RawContextKey('hasProfiles', false);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2NvbW1vbi91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBUTVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVk3RCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FDbkMsZUFBZSxDQUEwQix5QkFBeUIsQ0FBQyxDQUFBO0FBYXBFLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FDL0QsbUNBQW1DLENBQ25DLENBQUE7QUE0QkQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLEtBQWM7SUFDdkQsTUFBTSxTQUFTLEdBQUcsS0FBNkMsQ0FBQTtJQUUvRCxPQUFPLENBQUMsQ0FBQyxDQUNSLFNBQVM7UUFDVCxPQUFPLFNBQVMsS0FBSyxRQUFRO1FBQzdCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLFNBQVMsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDO1FBQzNFLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxPQUFPLFNBQVMsQ0FBQyxXQUFXLEtBQUssUUFBUSxDQUFDO1FBQ2pGLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxPQUFPLFNBQVMsQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQy9FLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFBO0FBQzlDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxJQUFZLEVBQUUsY0FBK0I7SUFDakYsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLGNBQWMsQ0FBQyxXQUFXO1FBQ2xDLFNBQVMsRUFBRSxxQkFBcUI7UUFDaEMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUU7S0FDOUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLFVBQVUsQ0FBQTtBQUN0RCxNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQVE7SUFDcEMsT0FBTyxDQUNOLEdBQUcsQ0FBQyxTQUFTLEtBQUsscUJBQXFCO1FBQ3ZDLElBQUksTUFBTSxDQUFDLElBQUksNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQ2xFLENBQUE7QUFDRixDQUFDO0FBYUQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQy9DLGVBQWUsQ0FBc0MscUNBQXFDLENBQUMsQ0FBQTtBQStENUYsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxDQUNyRCxxQkFBcUIsRUFDckIsT0FBTyxDQUFDLFFBQVEsRUFDaEIsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDJCQUEyQixDQUFDLENBQzNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUMvRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLENBQUE7QUFDdEQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFBO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRztJQUM3QixFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7Q0FDekUsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFTLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBQ3RGLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUNwRSwyQkFBMkIsRUFDM0IsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUEifQ==