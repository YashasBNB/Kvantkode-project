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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9jb21tb24vdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVE1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFZN0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQ25DLGVBQWUsQ0FBMEIseUJBQXlCLENBQUMsQ0FBQTtBQWFwRSxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQy9ELG1DQUFtQyxDQUNuQyxDQUFBO0FBNEJELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFjO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLEtBQTZDLENBQUE7SUFFL0QsT0FBTyxDQUFDLENBQUMsQ0FDUixTQUFTO1FBQ1QsT0FBTyxTQUFTLEtBQUssUUFBUTtRQUM3QixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztRQUMzRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQztRQUNqRixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksT0FBTyxTQUFTLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUMvRSxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtBQUM5QyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWSxFQUFFLGNBQStCO0lBQ2pGLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSxjQUFjLENBQUMsV0FBVztRQUNsQyxTQUFTLEVBQUUscUJBQXFCO1FBQ2hDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFO0tBQzlDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxVQUFVLENBQUE7QUFDdEQsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFRO0lBQ3BDLE9BQU8sQ0FDTixHQUFHLENBQUMsU0FBUyxLQUFLLHFCQUFxQjtRQUN2QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLDRCQUE0QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUNsRSxDQUFBO0FBQ0YsQ0FBQztBQWFELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUMvQyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUE7QUErRDVGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FDckQscUJBQXFCLEVBQ3JCLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUMzRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFBO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQTtBQUMvQyxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUc7SUFDN0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO0NBQ3pFLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLGFBQWEsQ0FBUyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUN0RixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLGFBQWEsQ0FDcEUsMkJBQTJCLEVBQzNCLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBIn0=