/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
const idDescription = nls.localize('JsonSchema.input.id', "The input's id is used to associate an input with a variable of the form ${input:id}.");
const typeDescription = nls.localize('JsonSchema.input.type', 'The type of user input prompt to use.');
const descriptionDescription = nls.localize('JsonSchema.input.description', 'The description is shown when the user is prompted for input.');
const defaultDescription = nls.localize('JsonSchema.input.default', 'The default value for the input.');
export const inputsSchema = {
    definitions: {
        inputs: {
            type: 'array',
            description: nls.localize('JsonSchema.inputs', 'User inputs. Used for defining user input prompts, such as free string input or a choice from several options.'),
            items: {
                oneOf: [
                    {
                        type: 'object',
                        required: ['id', 'type', 'description'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription,
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['promptString'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.promptString', "The 'promptString' type opens an input box to ask the user for input."),
                                ],
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription,
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription,
                            },
                            password: {
                                type: 'boolean',
                                description: nls.localize('JsonSchema.input.password', 'Controls if a password input is shown. Password input hides the typed text.'),
                            },
                        },
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'description', 'options'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription,
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['pickString'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.pickString', "The 'pickString' type shows a selection list."),
                                ],
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription,
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription,
                            },
                            options: {
                                type: 'array',
                                description: nls.localize('JsonSchema.input.options', 'An array of strings that defines the options for a quick pick.'),
                                items: {
                                    oneOf: [
                                        {
                                            type: 'string',
                                        },
                                        {
                                            type: 'object',
                                            required: ['value'],
                                            additionalProperties: false,
                                            properties: {
                                                label: {
                                                    type: 'string',
                                                    description: nls.localize('JsonSchema.input.pickString.optionLabel', 'Label for the option.'),
                                                },
                                                value: {
                                                    type: 'string',
                                                    description: nls.localize('JsonSchema.input.pickString.optionValue', 'Value for the option.'),
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'command'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription,
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['command'],
                                enumDescriptions: [
                                    nls.localize('JsonSchema.input.type.command', "The 'command' type executes a command."),
                                ],
                            },
                            command: {
                                type: 'string',
                                description: nls.localize('JsonSchema.input.command.command', 'The command to execute for this input variable.'),
                            },
                            args: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        description: nls.localize('JsonSchema.input.command.args', 'Optional arguments passed to the command.'),
                                    },
                                    {
                                        type: 'array',
                                        description: nls.localize('JsonSchema.input.command.args', 'Optional arguments passed to the command.'),
                                    },
                                    {
                                        type: 'string',
                                        description: nls.localize('JsonSchema.input.command.args', 'Optional arguments passed to the command.'),
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        },
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2NoZW1hLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi9jb25maWd1cmF0aW9uUmVzb2x2ZXJTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNqQyxxQkFBcUIsRUFDckIsdUZBQXVGLENBQ3ZGLENBQUE7QUFDRCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNuQyx1QkFBdUIsRUFDdkIsdUNBQXVDLENBQ3ZDLENBQUE7QUFDRCxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzFDLDhCQUE4QixFQUM5QiwrREFBK0QsQ0FDL0QsQ0FBQTtBQUNELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDdEMsMEJBQTBCLEVBQzFCLGtDQUFrQyxDQUNsQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFnQjtJQUN4QyxXQUFXLEVBQUU7UUFDWixNQUFNLEVBQUU7WUFDUCxJQUFJLEVBQUUsT0FBTztZQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsZ0hBQWdILENBQ2hIO1lBQ0QsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQzt3QkFDdkMsb0JBQW9CLEVBQUUsS0FBSzt3QkFDM0IsVUFBVSxFQUFFOzRCQUNY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