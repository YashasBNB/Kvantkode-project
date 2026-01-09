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
