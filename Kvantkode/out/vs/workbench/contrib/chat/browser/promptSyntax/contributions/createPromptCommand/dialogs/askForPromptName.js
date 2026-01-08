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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvZGlhbG9ncy9hc2tGb3JQcm9tcHROYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUdwRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFDcEMsS0FBdUIsRUFDdkIsaUJBQXFDLEVBQ1AsRUFBRTtJQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQUM1QyxXQUFXLEVBQUUsUUFBUSxDQUNwQiw4Q0FBOEMsRUFDOUMsdUJBQXVCLEVBQ3ZCLHFCQUFxQixDQUNyQjtLQUNELENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDakMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDO1FBQzVELENBQUMsQ0FBQyxXQUFXO1FBQ2IsQ0FBQyxDQUFDLEdBQUcsV0FBVyxHQUFHLHFCQUFxQixFQUFFLENBQUE7SUFFM0MsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQyxDQUFBIn0=