/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
// TODO: @sandy081 merge this with deduping in extensionsScannerService.ts
export function dedupExtensions(system, user, workspace, development, logService) {
    const result = new ExtensionIdentifierMap();
    system.forEach((systemExtension) => {
        const extension = result.get(systemExtension.identifier);
        if (extension) {
            logService.warn(localize('overwritingExtension', 'Overwriting extension {0} with {1}.', extension.extensionLocation.fsPath, systemExtension.extensionLocation.fsPath));
        }
        result.set(systemExtension.identifier, systemExtension);
    });
    user.forEach((userExtension) => {
        const extension = result.get(userExtension.identifier);
        if (extension) {
            if (extension.isBuiltin) {
                if (semver.gte(extension.version, userExtension.version)) {
                    logService.warn(`Skipping extension ${userExtension.extensionLocation.path} in favour of the builtin extension ${extension.extensionLocation.path}.`);
                    return;
                }
                // Overwriting a builtin extension inherits the `isBuiltin` property and it doesn't show a warning
                ;
                userExtension.isBuiltin = true;
            }
            else {
                logService.warn(localize('overwritingExtension', 'Overwriting extension {0} with {1}.', extension.extensionLocation.fsPath, userExtension.extensionLocation.fsPath));
            }
        }
        else if (userExtension.isBuiltin) {
            logService.warn(`Skipping obsolete builtin extension ${userExtension.extensionLocation.path}`);
            return;
        }
        result.set(userExtension.identifier, userExtension);
    });
    workspace.forEach((workspaceExtension) => {
        const extension = result.get(workspaceExtension.identifier);
        if (extension) {
            logService.warn(localize('overwritingWithWorkspaceExtension', 'Overwriting {0} with Workspace Extension {1}.', extension.extensionLocation.fsPath, workspaceExtension.extensionLocation.fsPath));
        }
        result.set(workspaceExtension.identifier, workspaceExtension);
    });
    development.forEach((developedExtension) => {
        logService.info(localize('extensionUnderDevelopment', 'Loading development extension at {0}', developedExtension.extensionLocation.fsPath));
        const extension = result.get(developedExtension.identifier);
        if (extension) {
            if (extension.isBuiltin) {
                // Overwriting a builtin extension inherits the `isBuiltin` property
                ;
                developedExtension.isBuiltin = true;
            }
        }
        result.set(developedExtension.identifier, developedExtension);
    });
    return Array.from(result.values());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1V0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uc1V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBR2xFLDBFQUEwRTtBQUMxRSxNQUFNLFVBQVUsZUFBZSxDQUM5QixNQUErQixFQUMvQixJQUE2QixFQUM3QixTQUFrQyxFQUNsQyxXQUFvQyxFQUNwQyxVQUF1QjtJQUV2QixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFzQixFQUF5QixDQUFBO0lBQ2xFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxlQUFlLEVBQUUsRUFBRTtRQUNsQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsVUFBVSxDQUFDLElBQUksQ0FDZCxRQUFRLENBQ1Asc0JBQXNCLEVBQ3RCLHFDQUFxQyxFQUNyQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUNsQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUN4QyxDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3hELENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1FBQzlCLE1BQU0sU0FB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