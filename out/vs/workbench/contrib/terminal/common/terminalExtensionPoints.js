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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vdGVybWluYWxFeHRlbnNpb25Qb2ludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDJEQUEyRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELDJCQUEyQjtBQUMzQixNQUFNLGlCQUFpQixHQUN0QixrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FDM0QsK0JBQStCLENBQy9CLENBQUE7QUFRRixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQzFELDhCQUE4QixDQUM5QixDQUFBO0FBRUQsTUFBTSxPQUFPLDJCQUEyQjtJQUl2QyxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQ7UUFMUSxzQkFBaUIsR0FBNkMsRUFBRSxDQUFBO1FBTXZFLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQzlDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxhQUFhO2lCQUNwQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDVixPQUFPLENBQ04sQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRO29CQUNoQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3ZDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNWLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDckUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUNULENBQUE7WUFDRixDQUFDLENBQUM7aUJBQ0QsSUFBSSxFQUFFLENBQUE7UUFDVCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELFNBQVMsb0JBQW9CLENBQUMsT0FBcUM7SUFDbEUsT0FBTyxDQUNOLENBQUMsT0FBTyxDQUFDLElBQUk7UUFDYixPQUFPLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUTtRQUNoQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDdkIsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLElBQUk7WUFDdkIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJO1lBQ3RCLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQzlCLENBQUE7QUFDRixDQUFDIn0=