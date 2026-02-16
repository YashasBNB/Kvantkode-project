/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, CONTEXT_CAN_VIEW_MEMORY, CONTEXT_VARIABLE_IS_READONLY, CONTEXT_DEBUG_TYPE, } from './debug.js';
/**
 * Gets a context key overlay that has context for the given variable.
 */
export function getContextForVariable(parentContext, variable, additionalContext = []) {
    const session = variable.getSession();
    const contextKeys = [
        [CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT.key, variable.variableMenuContext || ''],
        [CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT.key, !!variable.evaluateName],
        [
            CONTEXT_CAN_VIEW_MEMORY.key,
            !!session?.capabilities.supportsReadMemoryRequest && variable.memoryReference !== undefined,
        ],
        [
            CONTEXT_VARIABLE_IS_READONLY.key,
            !!variable.presentationHint?.attributes?.includes('readOnly') ||
                variable.presentationHint?.lazy,
        ],
        [CONTEXT_DEBUG_TYPE.key, session?.configuration.type],
        ...additionalContext,
    ];
    return parentContext.createOverlay(contextKeys);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTiw0Q0FBNEMsRUFDNUMsc0NBQXNDLEVBQ3RDLHVCQUF1QixFQUN2Qiw0QkFBNEIsRUFDNUIsa0JBQWtCLEdBQ2xCLE1BQU0sWUFBWSxDQUFBO0FBR25COztHQUVHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUNwQyxhQUFpQyxFQUNqQyxRQUFrQixFQUNsQixvQkFBeUMsRUFBRTtJQUUzQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDckMsTUFBTSxXQUFXLEdBQXdCO1FBQ3hDLENBQUMsNENBQTRDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsSUFBSSxFQUFFLENBQUM7UUFDdEYsQ0FBQyxzQ0FBc0MsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDckU7WUFDQyx1QkFBdUIsQ0FBQyxHQUFHO1lBQzNCLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLHlCQUF5QixJQUFJLFFBQVEsQ0FBQyxlQUFlLEtBQUssU0FBUztTQUMzRjtRQUNEO1lBQ0MsNEJBQTRCLENBQUMsR0FBRztZQUNoQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDO2dCQUM1RCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSTtTQUNoQztRQUNELENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO1FBQ3JELEdBQUcsaUJBQWlCO0tBQ3BCLENBQUE7SUFFRCxPQUFPLGFBQWEsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDaEQsQ0FBQyJ9