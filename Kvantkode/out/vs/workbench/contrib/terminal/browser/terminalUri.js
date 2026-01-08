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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxVcmkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdwRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsUUFBYTtJQUM3QyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUQsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUNsRCxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFDRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7QUFDaEUsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsV0FBbUIsRUFBRSxVQUFrQixFQUFFLEtBQWM7SUFDckYsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjO1FBQzlCLElBQUksRUFBRSxJQUFJLFdBQVcsSUFBSSxVQUFVLEVBQUU7UUFDckMsUUFBUSxFQUFFLEtBQUssSUFBSSxTQUFTO0tBQzVCLENBQUMsQ0FBQTtBQUNILENBQUM7QUFXRCxNQUFNLFVBQVUsaUNBQWlDLENBQUMsS0FBd0I7SUFDekUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxPQUFPLG1EQUFpQyxDQUFBO0lBQzlFLElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNoRCxDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsU0FBYyxFQUNkLFFBQXlCO0lBRXpCLElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLHlGQUF5RjtZQUN6RixnRkFBZ0Y7WUFDaEYsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzlDLE9BQU8sUUFBUSxDQUFBO1lBQ2hCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUMifQ==