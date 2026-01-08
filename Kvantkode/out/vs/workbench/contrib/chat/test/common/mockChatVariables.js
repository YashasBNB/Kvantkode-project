/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class MockChatVariablesService {
    getDynamicVariables(sessionId) {
        return [];
    }
    resolveVariables(prompt, attachedContextVariables) {
        return {
            variables: [],
        };
    }
    attachContext(name, value, location) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0NoYXRWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsTUFBTSxPQUFPLHdCQUF3QjtJQUdwQyxtQkFBbUIsQ0FBQyxTQUFpQjtRQUNwQyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxnQkFBZ0IsQ0FDZixNQUEwQixFQUMxQix3QkFBaUU7UUFFakUsT0FBTztZQUNOLFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQTtJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWSxFQUFFLEtBQWMsRUFBRSxRQUEyQjtRQUN0RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztDQUNEIn0=