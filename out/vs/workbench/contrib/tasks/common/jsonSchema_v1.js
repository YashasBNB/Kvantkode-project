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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92MS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi9qc29uU2NoZW1hX3YxLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1RCxPQUFPLFlBQVksTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsS0FBSyxFQUFFO1FBQ047WUFDQyxLQUFLLEVBQUU7Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDO29CQUNyQixVQUFVLEVBQUU7d0JBQ1gsT0FBTyxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQzs0QkFDZixrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUMvQiwrQkFBK0IsRUFDL0Isb0RBQW9ELENBQ3BEOzRCQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDZCQUE2QixDQUFDO3lCQUM5RTt3QkFDRCxPQUFPLEVBQUU7NEJBQ1Isa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDL0Isb0JBQW9CLEVBQ3BCLDREQUE0RCxDQUM1RDt5QkFDRDt3QkFDRCxNQUFNLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQzs0QkFDN0IsT0FBTyxFQUFFLFNBQVM7NEJBQ2xCLFdBQVcsRUFBRSxHQUFHLENB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