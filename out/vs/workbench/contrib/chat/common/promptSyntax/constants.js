/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, PROMPT_FILE_EXTENSION, } from '../../../../../platform/prompts/common/constants.js';
/**
 * Documentation link for the reusable prompts feature.
 */
export const DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
/**
 * Supported reusable prompt file patterns.
 */
const REUSABLE_PROMPT_FILE_PATTERNS = Object.freeze([
    /**
     * Any file that has the prompt file extension.
     * See {@link PROMPT_FILE_EXTENSION}.
     */
    `**/*${PROMPT_FILE_EXTENSION}`,
    /**
     * Copilot custom instructions file inside a `.github` folder.
     */
    `**/.github/${COPILOT_CUSTOM_INSTRUCTIONS_FILENAME}`,
]);
/**
 * Prompt files language selector.
 */
export const LANGUAGE_SELECTOR = Object.freeze({
    pattern: `{${REUSABLE_PROMPT_FILE_PATTERNS.join(',')}}`,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMscUJBQXFCLEdBQ3JCLE1BQU0scURBQXFELENBQUE7QUFFNUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyw0Q0FBNEMsQ0FBQTtBQUU3RTs7R0FFRztBQUNILE1BQU0sNkJBQTZCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNuRDs7O09BR0c7SUFDSCxPQUFPLHFCQUFxQixFQUFFO0lBRTlCOztPQUVHO0lBQ0gsY0FBYyxvQ0FBb0MsRUFBRTtDQUNwRCxDQUFDLENBQUE7QUFFRjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFtQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzlELE9BQU8sRUFBRSxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRztDQUN2RCxDQUFDLENBQUEifQ==