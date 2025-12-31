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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFHdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEdBR3JDLE1BQU0sb0VBQW9FLENBQUE7QUFLM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQWMzRSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBYWpFLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLDhCQUE4QixDQUFBO0FBRTFFLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFBO0FBRUQsTUFBTSxtQ0FBbUMsR0FBdUI7SUFDL0QsR0FBRyw4QkFBOEI7SUFDakMsVUFBVSxFQUFFO1FBQ1gsOEJBQThCLEVBQUU7WUFDL0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDJCQUEyQixFQUMzQiwwS0FBMEssQ0FDMUs7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7YUFDZDtTQUNEO0tBQ0Q7Q0FDRCxDQUFBO0FBUUQscUJBQXFCLENBQUMscUJBQXFCLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtBQUNoRixZQUFZO0FBRVoscUNBQXFDO0FBQ3JDLE1BQU0sQ0FBTixJQUFZLHdCQUtYO0FBTEQsV0FBWSx3QkFBd0I7SUFDbkMsK0NBQW1CLENBQUE7SUFDbkIsNkNBQWlCLENBQUE7SUFDakIsbURBQXVCLENBQUE7SUFDdkIsK0NBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFLbkM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQixxREFBUyxDQUFBO0lBQ1QsbURBQVEsQ0FBQTtBQUNULENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUFtSUQsWUFBWTtBQUVaLHdCQUF3QjtBQUN4QixNQUFNLFVBQVUsY0FBYyxDQUFDLFFBQWtDO0lBQ2hFLFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTO1lBQ3RDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsS0FBSyx3QkFBd0IsQ0FBQyxPQUFPO1lBQ3BDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsS0FBSyx3QkFBd0IsQ0FBQyxPQUFPO1lBQ3BDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsNEJBQTRCO1FBQzVCLEtBQUssd0JBQXdCLENBQUMsTUFBTSxDQUFDO1FBQ3JDO1lBQ0MsT0FBTyxDQUFDLENBQUE7SUFDVixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsV0FBMkMsRUFDM0MsUUFBYTtJQUViLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxTQUFTO1FBQ2pCLE9BQU8sQ0FBQyxZQUFZO1FBQ3BCLE9BQU8sQ0FBQyxvQkFBb0I7UUFDNUIsT0FBTyxDQUFDLGNBQWM7S0FDdEIsQ0FBQyxDQUFBO0lBQ0YsK0RBQStEO0lBQy9ELElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLFdBQVcsS0FBSyxRQUFRLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FDaEIsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFDekUsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUNwQixDQUFBO0FBQ0YsQ0FBQztBQUNELFlBQVkifQ==