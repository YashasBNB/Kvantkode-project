/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import commonSchema from './jsonSchemaCommon.js';
const schema = {
    oneOf: [
        {
            allOf: [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: {
                            type: 'string',
                            enum: ['0.1.0'],
                            deprecationMessage: nls.localize('JsonSchema.version.deprecated', 'Task version 0.1.0 is deprecated. Please use 2.0.0'),
                            description: nls.localize('JsonSchema.version', "The config's version number"),
                        },
                        _runner: {
                            deprecationMessage: nls.localize('JsonSchema._runner', 'The runner has graduated. Use the official runner property'),
                        },
                        runner: {
                            type: 'string',
                            enum: ['process', 'terminal'],
                            default: 'process',
                            description: nls.localize('JsonSchema.runner', 'Defines whether the task is executed as a process and the output is shown in the output window or inside the terminal.'),
                        },
                        windows: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.windows', 'Windows specific command configuration'),
                        },
                        osx: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.mac', 'Mac specific command configuration'),
                        },
                        linux: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.linux', 'Linux specific command configuration'),
                        },
                    },
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration',
                },
            ],
        },
    ],
};
const shellCommand = {
    type: 'boolean',
    default: true,
    description: nls.localize('JsonSchema.shell', 'Specifies whether the command is a shell command or an external program. Defaults to false if omitted.'),
};
schema.definitions = Objects.deepClone(commonSchema.definitions);
const definitions = schema.definitions;
definitions['commandConfiguration']['properties']['isShellCommand'] =
    Objects.deepClone(shellCommand);
definitions['taskDescription']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
definitions['taskRunnerConfiguration']['properties']['isShellCommand'] =
    Objects.deepClone(shellCommand);
Object.getOwnPropertyNames(definitions).forEach((key) => {
    const newKey = key + '1';
    definitions[newKey] = definitions[key];
    delete definitions[key];
});
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '1';
        }
        Object.getOwnPropertyNames(literal).forEach((property) => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
fixReferences(schema);
ProblemMatcherRegistry.onReady().then(() => {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map((key) => '$' + key);
        definitions.problemMatcherType1.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType1.oneOf[2].items.anyOf[1].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
});
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92MS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL2pzb25TY2hlbWFfdjEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRzdELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTVELE9BQU8sWUFBWSxNQUFNLHVCQUF1QixDQUFBO0FBRWhELE1BQU0sTUFBTSxHQUFnQjtJQUMzQixLQUFLLEVBQUU7UUFDTjtZQUNDLEtBQUssRUFBRTtnQkFDTjtvQkFDQyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUM7b0JBQ3JCLFVBQVUsRUFBRTt3QkFDWCxPQUFPLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDOzRCQUNmLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQy9CLCtCQUErQixFQUMvQixvREFBb0QsQ0FDcEQ7NEJBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNkJBQTZCLENBQUM7eUJBQzlFO3dCQUNELE9BQU8sRUFBRTs0QkFDUixrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUMvQixvQkFBb0IsRUFDcEIsNERBQTRELENBQzVEO3lCQUNEO3dCQUNELE1BQU0sRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDOzRCQUM3QixPQUFPLEVBQUUsU0FBUzs0QkFDbEIsV0FBVyxFQUFFLEdB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