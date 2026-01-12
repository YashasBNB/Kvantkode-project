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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUEwQjVGLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLENBQUMsR0FBWSxFQUF1QyxFQUFFLENBQ25HLE9BQU8sR0FBRyxLQUFLLFFBQVE7SUFDdkIsR0FBRyxLQUFLLElBQUk7SUFDWixJQUFJLElBQUksR0FBRztJQUNWLEdBQW9DLENBQUMsRUFBRSxLQUFLLGlCQUFpQixDQUFBO0FBc0IvRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHVCQUF1QixDQUFDLENBQUEifQ==