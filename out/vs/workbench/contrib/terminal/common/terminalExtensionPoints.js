/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import { terminalContributionsDescriptor } from './terminal.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
// terminal extension point
const terminalsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint(terminalContributionsDescriptor);
export const ITerminalContributionService = createDecorator('terminalContributionsService');
export class TerminalContributionService {
    get terminalProfiles() {
        return this._terminalProfiles;
    }
    constructor() {
        this._terminalProfiles = [];
        terminalsExtPoint.setHandler((contributions) => {
            this._terminalProfiles = contributions
                .map((c) => {
                return (c.value?.profiles
                    ?.filter((p) => hasValidTerminalIcon(p))
                    .map((e) => {
                    return { ...e, extensionIdentifier: c.description.identifier.value };
                }) || []);
            })
                .flat();
        });
    }
}
function hasValidTerminalIcon(profile) {
    return (!profile.icon ||
        typeof profile.icon === 'string' ||
        URI.isUri(profile.icon) ||
        ('light' in profile.icon &&
            'dark' in profile.icon &&
            URI.isUri(profile.icon.light) &&
            URI.isUri(profile.icon.dark)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbEV4dGVuc2lvblBvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssa0JBQWtCLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU01RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsMkJBQTJCO0FBQzNCLE1BQU0saUJBQWlCLEdBQ3RCLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUMzRCwrQkFBK0IsQ0FDL0IsQ0FBQTtBQVFGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FDMUQsOEJBQThCLENBQzlCLENBQUE7QUFFRCxNQUFNLE9BQU8sMkJBQTJCO0lBSXZDLElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRDtRQUxRLHNCQUFpQixHQUE2QyxFQUFFLENBQUE7UUFNdkUsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDOUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGFBQWE7aUJBQ3BDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNWLE9BQU8sQ0FDTixDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVE7b0JBQ2hCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDdkMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ1YsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNyRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQ1QsQ0FBQTtZQUNGLENBQUMsQ0FBQztpQkFDRCxJQUFJLEVBQUUsQ0FBQTtRQUNULENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFxQztJQUNsRSxPQUFPLENBQ04sQ0FBQyxPQUFPLENBQUMsSUFBSTtRQUNiLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRO1FBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN2QixDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSTtZQUN2QixNQUFNLElBQUksT0FBTyxDQUFDLElBQUk7WUFDdEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUM3QixHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDOUIsQ0FBQTtBQUNGLENBQUMifQ==