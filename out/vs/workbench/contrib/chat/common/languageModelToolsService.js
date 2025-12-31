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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUc1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFxQiwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBcUN6RixNQUFNLEtBQVcsY0FBYyxDQVc5QjtBQVhELFdBQWlCLGNBQWM7SUFDOUIsU0FBZ0IsS0FBSyxDQUFDLE1BQXNCO1FBQzNDLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLEtBQUssV0FBVztnQkFDZixPQUFPLGFBQWEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMvQyxLQUFLLEtBQUs7Z0JBQ1QsT0FBTyxPQUFPLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQzNELEtBQUssVUFBVTtnQkFDZCxPQUFPLFVBQVUsQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQVRlLG9CQUFLLFFBU3BCLENBQUE7QUFDRixDQUFDLEVBWGdCLGNBQWMsS0FBZCxjQUFjLFFBVzlCO0FBa0JELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFRO0lBQy9DLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUE7QUFDcEUsQ0FBQztBQU9ELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxHQUFRO0lBQ3RELE9BQU8sQ0FDTixPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEdBQUcsRUFBRSxNQUFNLEtBQUssUUFBUSxDQUM1RixDQUFBO0FBQ0YsQ0FBQztBQWFELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxJQUE4QjtJQUNwRSxPQUFPLDBCQUEwQixDQUFDLElBQUksQ0FBQyxLQUEwQixDQUFDLENBQUE7QUFDbkUsQ0FBQztBQWlDRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDRCQUE0QixDQUM1QixDQUFBO0FBMEJELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxRQUE0QjtJQUM5RCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBWSxRQUFRLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtBQUM1RixDQUFDIn0=