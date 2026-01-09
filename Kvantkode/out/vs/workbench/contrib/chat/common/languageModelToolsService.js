/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../../base/common/network.js';
import { stringifyPromptElementJSON } from './tools/promptTsxTypes.js';
export var ToolDataSource;
(function (ToolDataSource) {
    function toKey(source) {
        switch (source.type) {
            case 'extension':
                return `extension:${source.extensionId.value}`;
            case 'mcp':
                return `mcp:${source.collectionId}:${source.definitionId}`;
            case 'internal':
                return 'internal';
        }
    }
    ToolDataSource.toKey = toKey;
})(ToolDataSource || (ToolDataSource = {}));
export function isToolInvocationContext(obj) {
    return typeof obj === 'object' && typeof obj.sessionId === 'string';
}
export function isToolResultInputOutputDetails(obj) {
    return (typeof obj === 'object' && typeof obj?.input === 'string' && typeof obj?.output === 'string');
}
export function stringifyPromptTsxPart(part) {
    return stringifyPromptElementJSON(part.value);
}
export const ILanguageModelToolsService = createDecorator('ILanguageModelToolsService');
export function createToolInputUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.inMemory, path: `/lm/tool/${toolOrId}/tool_input.json` });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vbGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQXFCLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFxQ3pGLE1BQU0sS0FBVyxjQUFjLENBVzlCO0FBWEQsV0FBaUIsY0FBYztJQUM5QixTQUFnQixLQUFLLENBQUMsTUFBc0I7UUFDM0MsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsS0FBSyxXQUFXO2dCQUNmLE9BQU8sYUFBYSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQy9DLEtBQUssS0FBSztnQkFDVCxPQUFPLE9BQU8sTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDM0QsS0FBSyxVQUFVO2dCQUNkLE9BQU8sVUFBVSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBVGUsb0JBQUssUUFTcEIsQ0FBQTtBQUNGLENBQUMsRUFYZ0IsY0FBYyxLQUFkLGNBQWMsUUFXOUI7QUFrQkQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEdBQVE7SUFDL0MsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQTtBQUNwRSxDQUFDO0FBT0QsTUFBTSxVQUFVLDhCQUE4QixDQUFDLEdBQVE7SUFDdEQsT0FBTyxDQUNOLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxFQUFFLE1BQU0sS0FBSyxRQUFRLENBQzVGLENBQUE7QUFDRixDQUFDO0FBYUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLElBQThCO0lBQ3BFLE9BQU8sMEJBQTBCLENBQUMsSUFBSSxDQUFDLEtBQTBCLENBQUMsQ0FBQTtBQUNuRSxDQUFDO0FBaUNELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsNEJBQTRCLENBQzVCLENBQUE7QUEwQkQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFFBQTRCO0lBQzlELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxZQUFZLFFBQVEsa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO0FBQzVGLENBQUMifQ==