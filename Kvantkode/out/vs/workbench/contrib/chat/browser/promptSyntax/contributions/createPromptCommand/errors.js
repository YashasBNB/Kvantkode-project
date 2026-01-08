/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
/**
 * Base class for all prompt creation errors.
 */
class BaseCreatePromptError extends Error {
}
/**
 * Error for when a folder already exists at the provided
 * prompt file path.
 */
export class FolderExists extends BaseCreatePromptError {
    constructor(path) {
        super(localize('workbench.command.prompts.create.error.folder-exists', "Folder already exists at '{0}'.", path));
    }
}
/**
 * Error for when an invalid prompt file name is provided.
 */
export class InvalidPromptName extends BaseCreatePromptError {
    constructor(name) {
        super(localize('workbench.command.prompts.create.error.invalid-prompt-name', "Invalid prompt file name '{0}'.", name));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9lcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXREOztHQUVHO0FBQ0gsTUFBTSxxQkFBc0IsU0FBUSxLQUFLO0NBQUc7QUFFNUM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxxQkFBcUI7SUFDdEQsWUFBWSxJQUFZO1FBQ3ZCLEtBQUssQ0FDSixRQUFRLENBQ1Asc0RBQXNELEVBQ3RELGlDQUFpQyxFQUNqQyxJQUFJLENBQ0osQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEscUJBQXFCO0lBQzNELFlBQVksSUFBWTtRQUN2QixLQUFLLENBQ0osUUFBUSxDQUNQLDREQUE0RCxFQUM1RCxpQ0FBaUMsRUFDakMsSUFBSSxDQUNKLENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9