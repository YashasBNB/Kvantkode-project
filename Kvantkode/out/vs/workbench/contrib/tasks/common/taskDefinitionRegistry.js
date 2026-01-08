/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Types from '../../../../base/common/types.js';
import * as Objects from '../../../../base/common/objects.js';
import { ExtensionsRegistry, } from '../../../services/extensions/common/extensionsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
const taskDefinitionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        type: {
            type: 'string',
            description: nls.localize('TaskDefinition.description', "The actual task type. Please note that types starting with a '$' are reserved for internal usage."),
        },
        required: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        properties: {
            type: 'object',
            description: nls.localize('TaskDefinition.properties', 'Additional properties of the task type'),
            additionalProperties: {
                $ref: 'http://json-schema.org/draft-07/schema#',
            },
        },
        when: {
            type: 'string',
            markdownDescription: nls.localize('TaskDefinition.when', 'Condition which must be true to enable this type of task. Consider using `shellExecutionSupported`, `processExecutionSupported`, and `customExecutionSupported` as appropriate for this task definition. See the [API documentation](https://code.visualstudio.com/api/extension-guides/task-provider#when-clause) for more information.'),
            default: '',
        },
    },
};
var Configuration;
(function (Configuration) {
    function from(value, extensionId, messageCollector) {
        if (!value) {
            return undefined;
        }
        const taskType = Types.isString(value.type) ? value.type : undefined;
        if (!taskType || taskType.length === 0) {
            messageCollector.error(nls.localize('TaskTypeConfiguration.noType', "The task type configuration is missing the required 'taskType' property"));
            return undefined;
        }
        const required = [];
        if (Array.isArray(value.required)) {
            for (const element of value.required) {
                if (Types.isString(element)) {
                    required.push(element);
                }
            }
        }
        return {
            extensionId: extensionId.value,
            taskType,
            required: required,
            properties: value.properties ? Objects.deepClone(value.properties) : {},
            when: value.when ? ContextKeyExpr.deserialize(value.when) : undefined,
        };
    }
    Configuration.from = from;
})(Configuration || (Configuration = {}));
const taskDefinitionsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'taskDefinitions',
    activationEventsGenerator: (contributions, result) => {
        for (const task of contributions) {
            if (task.type) {
                result.push(`onTaskType:${task.type}`);
            }
        }
    },
    jsonSchema: {
        description: nls.localize('TaskDefinitionExtPoint', 'Contributes task kinds'),
        type: 'array',
        items: taskDefinitionSchema,
    },
});
class TaskDefinitionRegistryImpl {
    constructor() {
        this._onDefinitionsChanged = new Emitter();
        this.onDefinitionsChanged = this._onDefinitionsChanged.event;
        this.taskTypes = Object.create(null);
        this.readyPromise = new Promise((resolve, reject) => {
            taskDefinitionsExtPoint.setHandler((extensions, delta) => {
                this._schema = undefined;
                try {
                    for (const extension of delta.removed) {
                        const taskTypes = extension.value;
                        for (const taskType of taskTypes) {
                            if (this.taskTypes && taskType.type && this.taskTypes[taskType.type]) {
                                delete this.taskTypes[taskType.type];
                            }
                        }
                    }
                    for (const extension of delta.added) {
                        const taskTypes = extension.value;
                        for (const taskType of taskTypes) {
                            const type = Configuration.from(taskType, extension.description.identifier, extension.collector);
                            if (type) {
                                this.taskTypes[type.taskType] = type;
                            }
                        }
                    }
                    if (delta.removed.length > 0 || delta.added.length > 0) {
                        this._onDefinitionsChanged.fire();
                    }
                }
                catch (error) { }
                resolve(undefined);
            });
        });
    }
    onReady() {
        return this.readyPromise;
    }
    get(key) {
        return this.taskTypes[key];
    }
    all() {
        return Object.keys(this.taskTypes).map((key) => this.taskTypes[key]);
    }
    getJsonSchema() {
        if (this._schema === undefined) {
            const schemas = [];
            for (const definition of this.all()) {
                const schema = {
                    type: 'object',
                    additionalProperties: false,
                };
                if (definition.required.length > 0) {
                    schema.required = definition.required.slice(0);
                }
                if (definition.properties !== undefined) {
                    schema.properties = Objects.deepClone(definition.properties);
                }
                else {
                    schema.properties = Object.create(null);
                }
                schema.properties.type = {
                    type: 'string',
                    enum: [definition.taskType],
                };
                schemas.push(schema);
            }
            this._schema = { oneOf: schemas };
        }
        return this._schema;
    }
}
export const TaskDefinitionRegistry = new TaskDefinitionRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0RlZmluaXRpb25SZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Rhc2tEZWZpbml0aW9uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLDJEQUEyRCxDQUFBO0FBSWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsTUFBTSxvQkFBb0IsR0FBZ0I7SUFDekMsSUFBSSxFQUFFLFFBQVE7SUFDZCxvQkFBb0IsRUFBRSxLQUFLO0lBQzNCLFVBQVUsRUFBRTtRQUNYLElBQUksRUFBRTtZQUNMLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDRCQUE0QixFQUM1QixtR0FBbUcsQ0FDbkc7U0FDRDtRQUNELFFBQVEsRUFBRTtZQUNULElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2FBQ2Q7U0FDRDtRQUNELFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDJCQUEyQixFQUMzQix3Q0FBd0MsQ0FDeEM7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLHlDQUF5QzthQUMvQztTQUNEO1FBQ0QsSUFBSSxFQUFF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