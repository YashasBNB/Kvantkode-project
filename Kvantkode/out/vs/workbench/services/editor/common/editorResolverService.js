/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { Schemas } from '../../../../base/common/network.js';
import { posix } from '../../../../base/common/path.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const IEditorResolverService = createDecorator('editorResolverService');
export const editorsAssociationsSettingId = 'workbench.editorAssociations';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const editorAssociationsConfigurationNode = {
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.editorAssociations': {
            type: 'object',
            markdownDescription: localize('editor.editorAssociations', 'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) to editors (for example `"*.hex": "hexEditor.hexedit"`). These have precedence over the default behavior.'),
            additionalProperties: {
                type: 'string',
            },
        },
    },
};
configurationRegistry.registerConfiguration(editorAssociationsConfigurationNode);
//#endregion
//#region EditorResolverService types
export var RegisteredEditorPriority;
(function (RegisteredEditorPriority) {
    RegisteredEditorPriority["builtin"] = "builtin";
    RegisteredEditorPriority["option"] = "option";
    RegisteredEditorPriority["exclusive"] = "exclusive";
    RegisteredEditorPriority["default"] = "default";
})(RegisteredEditorPriority || (RegisteredEditorPriority = {}));
/**
 * If we didn't resolve an editor dictates what to do with the opening state
 * ABORT = Do not continue with opening the editor
 * NONE = Continue as if the resolution has been disabled as the service could not resolve one
 */
export var ResolvedStatus;
(function (ResolvedStatus) {
    ResolvedStatus[ResolvedStatus["ABORT"] = 1] = "ABORT";
    ResolvedStatus[ResolvedStatus["NONE"] = 2] = "NONE";
})(ResolvedStatus || (ResolvedStatus = {}));
//#endregion
//#region Util functions
export function priorityToRank(priority) {
    switch (priority) {
        case RegisteredEditorPriority.exclusive:
            return 5;
        case RegisteredEditorPriority.default:
            return 4;
        case RegisteredEditorPriority.builtin:
            return 3;
        // Text editor is priority 2
        case RegisteredEditorPriority.option:
        default:
            return 1;
    }
}
export function globMatchesResource(globPattern, resource) {
    const excludedSchemes = new Set([
        Schemas.extension,
        Schemas.webviewPanel,
        Schemas.vscodeWorkspaceTrust,
        Schemas.vscodeSettings,
    ]);
    // We want to say that the above schemes match no glob patterns
    if (excludedSchemes.has(resource.scheme)) {
        return false;
    }
    const matchOnPath = typeof globPattern === 'string' && globPattern.indexOf(posix.sep) >= 0;
    const target = matchOnPath ? `${resource.scheme}:${resource.path}` : basename(resource);
    return glob.match(typeof globPattern === 'string' ? globPattern.toLowerCase() : globPattern, target.toLowerCase());
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUd2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FHckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUszRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBYzNFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFhakUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsOEJBQThCLENBQUE7QUFFMUUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7QUFFRCxNQUFNLG1DQUFtQyxHQUF1QjtJQUMvRCxHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCw4QkFBOEIsRUFBRTtZQUMvQixJQUFJLEVBQUUsUUFBUTtZQUNkLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsMkJBQTJCLEVBQzNCLDBLQUEwSyxDQUMxSztZQUNELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTthQUNkO1NBQ0Q7S0FDRDtDQUNELENBQUE7QUFRRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO0FBQ2hGLFlBQVk7QUFFWixxQ0FBcUM7QUFDckMsTUFBTSxDQUFOLElBQVksd0JBS1g7QUFMRCxXQUFZLHdCQUF3QjtJQUNuQywrQ0FBbUIsQ0FBQTtJQUNuQiw2Q0FBaUIsQ0FBQTtJQUNqQixtREFBdUIsQ0FBQTtJQUN2QiwrQ0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTFcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUtuQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLHFEQUFTLENBQUE7SUFDVCxtREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQW1JRCxZQUFZO0FBRVosd0JBQXdCO0FBQ3hCLE1BQU0sVUFBVSxjQUFjLENBQUMsUUFBa0M7SUFDaEUsUUFBUSxRQUFRLEVBQUUsQ0FBQztRQUNsQixLQUFLLHdCQUF3QixDQUFDLFNBQVM7WUFDdEMsT0FBTyxDQUFDLENBQUE7UUFDVCxLQUFLLHdCQUF3QixDQUFDLE9BQU87WUFDcEMsT0FBTyxDQUFDLENBQUE7UUFDVCxLQUFLLHdCQUF3QixDQUFDLE9BQU87WUFDcEMsT0FBTyxDQUFDLENBQUE7UUFDVCw0QkFBNEI7UUFDNUIsS0FBSyx3QkFBd0IsQ0FBQyxNQUFNLENBQUM7UUFDckM7WUFDQyxPQUFPLENBQUMsQ0FBQTtJQUNWLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxXQUEyQyxFQUMzQyxRQUFhO0lBRWIsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDL0IsT0FBTyxDQUFDLFNBQVM7UUFDakIsT0FBTyxDQUFDLFlBQVk7UUFDcEIsT0FBTyxDQUFDLG9CQUFvQjtRQUM1QixPQUFPLENBQUMsY0FBYztLQUN0QixDQUFDLENBQUE7SUFDRiwrREFBK0Q7SUFDL0QsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE1BQU0sV0FBVyxHQUFHLE9BQU8sV0FBVyxLQUFLLFFBQVEsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUYsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdkYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUNoQixPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUN6RSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQ3BCLENBQUE7QUFDRixDQUFDO0FBQ0QsWUFBWSJ9