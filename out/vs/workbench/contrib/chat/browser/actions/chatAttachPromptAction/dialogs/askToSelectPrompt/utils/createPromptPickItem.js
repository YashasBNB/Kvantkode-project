/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../../nls.js';
import { DELETE_BUTTON, EDIT_BUTTON } from '../constants.js';
import { dirname } from '../../../../../../../../../base/common/resources.js';
import { getCleanPromptName } from '../../../../../../../../../platform/prompts/common/constants.js';
/**
 * Creates a quick pick item for a prompt.
 */
export const createPromptPickItem = (promptFile, labelService) => {
    const { uri, type } = promptFile;
    const fileWithoutExtension = getCleanPromptName(uri);
    // if a "user" prompt, don't show its filesystem path in
    // the user interface, but do that for all the "local" ones
    const description = type === 'user'
        ? localize('user-prompt.capitalized', 'User prompt')
        : labelService.getUriLabel(dirname(uri), { relative: true });
    const tooltip = type === 'user' ? description : uri.fsPath;
    return {
        id: uri.toString(),
        type: 'item',
        label: fileWithoutExtension,
        description,
        tooltip,
        value: uri,
        buttons: [EDIT_BUTTON, DELETE_BUTTON],
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0UGlja0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9jcmVhdGVQcm9tcHRQaWNrSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFJN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFHcEc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUNuQyxVQUF1QixFQUN2QixZQUEyQixFQUNJLEVBQUU7SUFDakMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUE7SUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUVwRCx3REFBd0Q7SUFDeEQsMkRBQTJEO0lBQzNELE1BQU0sV0FBVyxHQUNoQixJQUFJLEtBQUssTUFBTTtRQUNkLENBQUMsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsYUFBYSxDQUFDO1FBQ3BELENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBRTlELE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQTtJQUUxRCxPQUFPO1FBQ04sRUFBRSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7UUFDbEIsSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsb0JBQW9CO1FBQzNCLFdBQVc7UUFDWCxPQUFPO1FBQ1AsS0FBSyxFQUFFLEdBQUc7UUFDVixPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDO0tBQ3JDLENBQUE7QUFDRixDQUFDLENBQUEifQ==