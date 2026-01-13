/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../base/common/assert.js';
import { basename } from '../../../base/common/path.js';
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * Configuration key for the `reusable prompts` feature
 * (also known as `prompt files`, `prompt instructions`, etc.).
 */
export const CONFIG_KEY = 'chat.promptFiles';
/**
 * Configuration key for the locations of reusable prompt files.
 */
export const LOCATIONS_CONFIG_KEY = 'chat.promptFilesLocations';
/**
 * Default reusable prompt files source folder.
 */
export const DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Check if provided path is a reusable prompt file.
 */
export const isPromptFile = (fileUri) => {
    const filename = basename(fileUri.path);
    const hasPromptFileExtension = filename.endsWith(PROMPT_FILE_EXTENSION);
    const isCustomInstructionsFile = filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME;
    return hasPromptFileExtension || isCustomInstructionsFile;
};
/**
 * Gets clean prompt name without file extension.
 *
 * @throws If provided path is not a prompt file
 * 		   (does not end with {@link PROMPT_FILE_EXTENSION}).
 */
export const getCleanPromptName = (fileUri) => {
    assert(isPromptFile(fileUri), `Provided path '${fileUri.fsPath}' is not a prompt file.`);
    // if a Copilot custom instructions file, remove `markdown` file extension
    // otherwise, remove the `prompt` file extension
    const fileExtension = fileUri.path.endsWith(COPILOT_CUSTOM_INSTRUCTIONS_FILENAME)
        ? '.md'
        : PROMPT_FILE_EXTENSION;
    return basename(fileUri.path, fileExtension);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL2NvbW1vbi9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV2RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQTtBQUVqRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHlCQUF5QixDQUFBO0FBRTdFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBVyxrQkFBa0IsQ0FBQTtBQUVwRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFXLDJCQUEyQixDQUFBO0FBRXZFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLENBQUE7QUFFdEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxPQUFZLEVBQVcsRUFBRTtJQUNyRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXZDLE1BQU0sc0JBQXNCLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ3ZFLE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxLQUFLLG9DQUFvQyxDQUFBO0lBRWxGLE9BQU8sc0JBQXNCLElBQUksd0JBQXdCLENBQUE7QUFDMUQsQ0FBQyxDQUFBO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE9BQVksRUFBVSxFQUFFO0lBQzFELE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsa0JBQWtCLE9BQU8sQ0FBQyxNQUFNLHlCQUF5QixDQUFDLENBQUE7SUFFeEYsMEVBQTBFO0lBQzFFLGdEQUFnRDtJQUNoRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQztRQUNoRixDQUFDLENBQUMsS0FBSztRQUNQLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQTtJQUV4QixPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0FBQzdDLENBQUMsQ0FBQSJ9