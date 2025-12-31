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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2NoZW1hLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9jb21tb24vY29uZmlndXJhdGlvblJlc29sdmVyU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDakMscUJBQXFCLEVBQ3JCLHVGQUF1RixDQUN2RixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDbkMsdUJBQXVCLEVBQ3ZCLHVDQUF1QyxDQUN2QyxDQUFBO0FBQ0QsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUMxQyw4QkFBOEIsRUFDOUIsK0RBQStELENBQy9ELENBQUE7QUFDRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3RDLDBCQUEwQixFQUMxQixrQ0FBa0MsQ0FDbEMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBZ0I7SUFDeEMsV0FBVyxFQUFFO1FBQ1osTUFBTSxFQUFFO1lBQ1AsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsbUJBQW1CLEVBQ25CLGdIQUFnSCxDQUNoSDtZQUNELEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUM7d0JBQ3ZDLG9CQUFvQixFQUFFLEtBQUs7d0JBQzNCLFVBQVUsRUFBRTs0QkFDWCxFQUFFLEVBQUU7Z0NBQ0gsSUFBSSxF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