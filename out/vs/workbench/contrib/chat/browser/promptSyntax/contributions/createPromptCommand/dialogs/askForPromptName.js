/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { PROMPT_FILE_EXTENSION } from '../../../../../../../../platform/prompts/common/constants.js';
/**
 * Asks the user for a prompt name.
 */
export const askForPromptName = async (_type, quickInputService) => {
    const result = await quickInputService.input({
        placeHolder: localize('commands.prompts.create.ask-name.placeholder', 'Provide a prompt name', PROMPT_FILE_EXTENSION),
    });
    if (!result) {
        return undefined;
    }
    const trimmedName = result.trim();
    if (!trimmedName) {
        return undefined;
    }
    const cleanName = trimmedName.endsWith(PROMPT_FILE_EXTENSION)
        ? trimmedName
        : `${trimmedName}${PROMPT_FILE_EXTENSION}`;
    return cleanName;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2RpYWxvZ3MvYXNrRm9yUHJvbXB0TmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFHcEc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQ3BDLEtBQXVCLEVBQ3ZCLGlCQUFxQyxFQUNQLEVBQUU7SUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFDNUMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOENBQThDLEVBQzlDLHVCQUF1QixFQUN2QixxQkFBcUIsQ0FDckI7S0FDRCxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2pDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztRQUM1RCxDQUFDLENBQUMsV0FBVztRQUNiLENBQUMsQ0FBQyxHQUFHLFdBQVcsR0FBRyxxQkFBcUIsRUFBRSxDQUFBO0lBRTNDLE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUMsQ0FBQSJ9