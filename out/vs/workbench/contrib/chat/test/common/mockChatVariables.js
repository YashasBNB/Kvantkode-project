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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tDaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE1BQU0sT0FBTyx3QkFBd0I7SUFHcEMsbUJBQW1CLENBQUMsU0FBaUI7UUFDcEMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsZ0JBQWdCLENBQ2YsTUFBMEIsRUFDMUIsd0JBQWlFO1FBRWpFLE9BQU87WUFDTixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLElBQVksRUFBRSxLQUFjLEVBQUUsUUFBMkI7UUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCJ9