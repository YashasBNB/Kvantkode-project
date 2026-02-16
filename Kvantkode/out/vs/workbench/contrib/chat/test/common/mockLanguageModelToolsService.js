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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQVVqRixNQUFNLE9BQU8sNkJBQTZCO0lBR3pDO1FBSUEscUJBQWdCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFKM0IsQ0FBQztJQUVoQix5QkFBeUIsQ0FBQyxTQUFpQixJQUFTLENBQUM7SUFJckQsZ0JBQWdCLENBQUMsUUFBbUI7UUFDbkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCx5QkFBeUIsS0FBVSxDQUFDO0lBRXBDLHVCQUF1QixDQUN0QixNQUFjLEVBQ2QsS0FBOEIsRUFDOUIsV0FBcUIsSUFDYixDQUFDO0lBRVYsMEJBQTBCLENBQUMsSUFBWSxFQUFFLElBQWU7UUFDdkQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsT0FBTyxDQUFDLEVBQVU7UUFDakIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFZO1FBQ3pCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUNmLEdBQW9CLEVBQ3BCLFdBQWdDLEVBQ2hDLEtBQXdCO1FBRXhCLE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO1NBQzVDLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==