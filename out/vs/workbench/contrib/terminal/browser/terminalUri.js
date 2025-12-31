/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
export function parseTerminalUri(resource) {
    const [, workspaceId, instanceId] = resource.path.split('/');
    if (!workspaceId || !Number.parseInt(instanceId)) {
        throw new Error(`Could not parse terminal uri for resource ${resource}`);
    }
    return { workspaceId, instanceId: Number.parseInt(instanceId) };
}
export function getTerminalUri(workspaceId, instanceId, title) {
    return URI.from({
        scheme: Schemas.vscodeTerminal,
        path: `/${workspaceId}/${instanceId}`,
        fragment: title || undefined,
    });
}
export function getTerminalResourcesFromDragEvent(event) {
    const resources = event.dataTransfer?.getData("Terminals" /* TerminalDataTransfers.Terminals */);
    if (resources) {
        const json = JSON.parse(resources);
        const result = [];
        for (const entry of json) {
            result.push(URI.parse(entry));
        }
        return result.length === 0 ? undefined : result;
    }
    return undefined;
}
export function getInstanceFromResource(instances, resource) {
    if (resource) {
        for (const instance of instances) {
            // Note that the URI's workspace and instance id might not originally be from this window
            // Don't bother checking the scheme and assume instances only contains terminals
            if (instance.resource.path === resource.path) {
                return instance;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsVXJpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFFBQWE7SUFDN0MsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzVELElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBQ0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFBO0FBQ2hFLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLFdBQW1CLEVBQUUsVUFBa0IsRUFBRSxLQUFjO0lBQ3JGLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYztRQUM5QixJQUFJLEVBQUUsSUFBSSxXQUFXLElBQUksVUFBVSxFQUFFO1FBQ3JDLFFBQVEsRUFBRSxLQUFLLElBQUksU0FBUztLQUM1QixDQUFDLENBQUE7QUFDSCxDQUFDO0FBV0QsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLEtBQXdCO0lBQ3pFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsT0FBTyxtREFBaUMsQ0FBQTtJQUM5RSxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNsQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDakIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDaEQsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLFNBQWMsRUFDZCxRQUF5QjtJQUV6QixJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2QsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyx5RkFBeUY7WUFDekYsZ0ZBQWdGO1lBQ2hGLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM5QyxPQUFPLFFBQVEsQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDIn0=