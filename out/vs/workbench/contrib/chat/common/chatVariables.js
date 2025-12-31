/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const isIChatRequestProblemsVariable = (obj) => typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    obj.id === 'vscode.problems';
export const IChatVariablesService = createDecorator('IChatVariablesService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBMEI1RixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLEdBQVksRUFBdUMsRUFBRSxDQUNuRyxPQUFPLEdBQUcsS0FBSyxRQUFRO0lBQ3ZCLEdBQUcsS0FBSyxJQUFJO0lBQ1osSUFBSSxJQUFJLEdBQUc7SUFDVixHQUFvQyxDQUFDLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQTtBQXNCL0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3Qix1QkFBdUIsQ0FBQyxDQUFBIn0=