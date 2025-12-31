/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class MockLanguageModelToolsService {
    constructor() {
        this.onDidChangeTools = Event.None;
    }
    cancelToolCallsForRequest(requestId) { }
    registerToolData(toolData) {
        return Disposable.None;
    }
    resetToolAutoConfirmation() { }
    setToolAutoConfirmation(toolId, scope, autoConfirm) { }
    registerToolImplementation(name, tool) {
        return Disposable.None;
    }
    getTools() {
        return [];
    }
    getTool(id) {
        return undefined;
    }
    getToolByName(name) {
        return undefined;
    }
    async invokeTool(dto, countTokens, token) {
        return {
            content: [{ kind: 'text', value: 'result' }],
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tMYW5ndWFnZU1vZGVsVG9vbHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFVakYsTUFBTSxPQUFPLDZCQUE2QjtJQUd6QztRQUlBLHFCQUFnQixHQUFnQixLQUFLLENBQUMsSUFBSSxDQUFBO0lBSjNCLENBQUM7SUFFaEIseUJBQXlCLENBQUMsU0FBaUIsSUFBUyxDQUFDO0lBSXJELGdCQUFnQixDQUFDLFFBQW1CO1FBQ25DLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQseUJBQXlCLEtBQVUsQ0FBQztJQUVwQyx1QkFBdUIsQ0FDdEIsTUFBYyxFQUNkLEtBQThCLEVBQzlCLFdBQXFCLElBQ2IsQ0FBQztJQUVWLDBCQUEwQixDQUFDLElBQVksRUFBRSxJQUFlO1FBQ3ZELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE9BQU8sQ0FBQyxFQUFVO1FBQ2pCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN6QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FDZixHQUFvQixFQUNwQixXQUFnQyxFQUNoQyxLQUF3QjtRQUV4QixPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztTQUM1QyxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=