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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0UGlja0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvY3JlYXRlUHJvbXB0UGlja0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBSTdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBR3BHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FDbkMsVUFBdUIsRUFDdkIsWUFBMkIsRUFDSSxFQUFFO0lBQ2pDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBVSxDQUFBO0lBQ2hDLE1BQU0sb0JBQW9CLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFcEQsd0RBQXdEO0lBQ3hELDJEQUEyRDtJQUMzRCxNQUFNLFdBQVcsR0FDaEIsSUFBSSxLQUFLLE1BQU07UUFDZCxDQUFDLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGFBQWEsQ0FBQztRQUNwRCxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUU5RCxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUE7SUFFMUQsT0FBTztRQUNOLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO1FBQ2xCLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLG9CQUFvQjtRQUMzQixXQUFXO1FBQ1gsT0FBTztRQUNQLEtBQUssRUFBRSxHQUFHO1FBQ1YsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQztLQUNyQyxDQUFBO0FBQ0YsQ0FBQyxDQUFBIn0=