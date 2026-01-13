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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1V0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUE7QUFHbEUsMEVBQTBFO0FBQzFFLE1BQU0sVUFBVSxlQUFlLENBQzlCLE1BQStCLEVBQy9CLElBQTZCLEVBQzdCLFNBQWtDLEVBQ2xDLFdBQW9DLEVBQ3BDLFVBQXVCO0lBRXZCLE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQXNCLEVBQXlCLENBQUE7SUFDbEUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixVQUFVLENBQUMsSUFBSSxDQUNkLFFBQVEsQ0FDUCxzQkFBc0IsRUFDdEIscUNBQXFDLEVBQ3JDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQ2xDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQ3hDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDeEQsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxF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