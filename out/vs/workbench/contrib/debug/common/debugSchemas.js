/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import * as nls from '../../../../nls.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
// debuggers extension point
export const debuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debuggers',
    defaultExtensionKind: ['workspace'],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.debuggers', 'Contributes debug adapters.'),
        type: 'array',
        defaultSnippets: [{ body: [{ type: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { type: '', program: '', runtime: '' } }],
            properties: {
                type: {
                    description: nls.localize('vscode.extension.contributes.debuggers.type', 'Unique identifier for this debug adapter.'),
                    type: 'string',
                },
                label: {
                    description: nls.localize('vscode.extension.contributes.debuggers.label', 'Display name for this debug adapter.'),
                    type: 'string',
                },
                program: {
                    description: nls.localize('vscode.extension.contributes.debuggers.program', 'Path to the debug adapter program. Path is either absolute or relative to the extension folder.'),
                    type: 'string',
                },
                args: {
                    description: nls.localize('vscode.extension.contributes.debuggers.args', 'Optional arguments to pass to the adapter.'),
                    type: 'array',
                },
                runtime: {
                    description: nls.localize('vscode.extension.contributes.debuggers.runtime', 'Optional runtime in case the program attribute is not an executable but requires a runtime.'),
                    type: 'string',
                },
                runtimeArgs: {
                    description: nls.localize('vscode.extension.contributes.debuggers.runtimeArgs', 'Optional runtime arguments.'),
                    type: 'array',
                },
                variables: {
                    description: nls.localize('vscode.extension.contributes.debuggers.variables', 'Mapping from interactive variables (e.g. ${action.pickProcess}) in `launch.json` to a command.'),
                    type: 'object',
                },
                initialConfigurations: {
                    description: nls.localize('vscode.extension.contributes.debuggers.initialConfigurations', "Configurations for generating the initial \'launch.json\'."),
                    type: ['array', 'string'],
                },
                languages: {
                    description: nls.localize('vscode.extension.contributes.debuggers.languages', 'List of languages for which the debug extension could be considered the "default debugger".'),
                    type: 'array',
                },
                configurationSnippets: {
                    description: nls.localize('vscode.extension.contributes.debuggers.configurationSnippets', "Snippets for adding new configurations in \'launch.json\'."),
                    type: 'array',
                },
                configurationAttributes: {
                    description: nls.localize('vscode.extension.contributes.debuggers.configurationAttributes', "JSON schema configurations for validating \'launch.json\'."),
                    type: 'object',
                },
                when: {
                    description: nls.localize('vscode.extension.contributes.debuggers.when', "Condition which must be true to enable this type of debugger. Consider using 'shellExecutionSupported', 'virtualWorkspace', 'resourceScheme' or an extension-defined context key as appropriate for this."),
                    type: 'string',
                    default: '',
                },
                hiddenWhen: {
                    description: nls.localize('vscode.extension.contributes.debuggers.hiddenWhen', 'When this condition is true, this debugger type is hidden from the debugger list, but is still enabled.'),
                    type: 'string',
                    default: '',
                },
                deprecated: {
                    description: nls.localize('vscode.extension.contributes.debuggers.deprecated', 'Optional message to mark this debug type as being deprecated.'),
                    type: 'string',
                    default: '',
                },
                windows: {
                    description: nls.localize('vscode.extension.contributes.debuggers.windows', 'Windows specific settings.'),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.windows.runtime', 'Runtime used for Windows.'),
                            type: 'string',
                        },
                    },
                },
                osx: {
                    description: nls.localize('vscode.extension.contributes.debuggers.osx', 'macOS specific settings.'),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.osx.runtime', 'Runtime used for macOS.'),
                            type: 'string',
                        },
                    },
                },
                linux: {
                    description: nls.localize('vscode.extension.contributes.debuggers.linux', 'Linux specific settings.'),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize('vscode.extension.contributes.debuggers.linux.runtime', 'Runtime used for Linux.'),
                            type: 'string',
                        },
                    },
                },
                strings: {
                    description: nls.localize('vscode.extension.contributes.debuggers.strings', 'UI strings contributed by this debug adapter.'),
                    type: 'object',
                    properties: {
                        unverifiedBreakpoints: {
                            description: nls.localize('vscode.extension.contributes.debuggers.strings.unverifiedBreakpoints', 'When there are unverified breakpoints in a language supported by this debug adapter, this message will appear on the breakpoint hover and in the breakpoints view. Markdown and command links are supported.'),
                            type: 'string',
                        },
                    },
                },
            },
        },
    },
});
// breakpoints extension point #9037
export const breakpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'breakpoints',
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.breakpoints', 'Contributes breakpoints.'),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '' }] }],
        items: {
            type: 'object',
            additionalProperties: false,
            defaultSnippets: [{ body: { language: '' } }],
            properties: {
                language: {
                    description: nls.localize('vscode.extension.contributes.breakpoints.language', 'Allow breakpoints for this language.'),
                    type: 'string',
                },
                when: {
                    description: nls.localize('vscode.extension.contributes.breakpoints.when', 'Condition which must be true to enable breakpoints in this language. Consider matching this to the debugger when clause as appropriate.'),
                    type: 'string',
                    default: '',
                },
            },
        },
    },
});
// debug general schema
export const presentationSchema = {
    type: 'object',
    description: nls.localize('presentation', 'Presentation options on how to show this configuration in the debug configuration dropdown and the command palette.'),
    properties: {
        hidden: {
            type: 'boolean',
            default: false,
            description: nls.localize('presentation.hidden', 'Controls if this configuration should be shown in the configuration dropdown and the command palette.'),
        },
        group: {
            type: 'string',
            default: '',
            description: nls.localize('presentation.group', 'Group that this configuration belongs to. Used for grouping and sorting in the configuration dropdown and the command palette.'),
        },
        order: {
            type: 'number',
            default: 1,
            description: nls.localize('presentation.order', 'Order of this configuration within a group. Used for grouping and sorting in the configuration dropdown and the command palette.'),
        },
    },
    default: {
        hidden: false,
        group: '',
        order: 1,
    },
};
const defaultCompound = { name: 'Compound', configurations: [] };
export const launchSchema = {
    id: launchSchemaId,
    type: 'object',
    title: nls.localize('app.launch.json.title', 'Launch'),
    allowTrailingCommas: true,
    allowComments: true,
    required: [],
    default: { version: '0.2.0', configurations: [], compounds: [] },
    properties: {
        version: {
            type: 'string',
            description: nls.localize('app.launch.json.version', 'Version of this file format.'),
            default: '0.2.0',
        },
        configurations: {
            type: 'array',
            description: nls.localize('app.launch.json.configurations', 'List of configurations. Add new configurations or edit existing ones by using IntelliSense.'),
            items: {
                defaultSnippets: [],
                type: 'object',
                oneOf: [],
            },
        },
        compounds: {
            type: 'array',
            description: nls.localize('app.launch.json.compounds', 'List of compounds. Each compound references multiple configurations which will get launched together.'),
            items: {
                type: 'object',
                required: ['name', 'configurations'],
                properties: {
                    name: {
                        type: 'string',
                        description: nls.localize('app.launch.json.compound.name', 'Name of compound. Appears in the launch configuration drop down menu.'),
                    },
                    presentation: presentationSchema,
                    configurations: {
                        type: 'array',
                        default: [],
                        items: {
                            oneOf: [
                                {
                                    enum: [],
                                    description: nls.localize('useUniqueNames', 'Please use unique configuration names.'),
                                },
                                {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: {
                                            enum: [],
                                            description: nls.localize('app.launch.json.compound.name', 'Name of compound. Appears in the launch configuration drop down menu.'),
                                        },
                                        folder: {
                                            enum: [],
                                            description: nls.localize('app.launch.json.compound.folder', 'Name of folder in which the compound is located.'),
                                        },
                                    },
                                },
                            ],
                        },
                        description: nls.localize('app.launch.json.compounds.configurations', 'Names of configurations that will be started as part of this compound.'),
                    },
                    stopAll: {
                        type: 'boolean',
                        default: false,
                        description: nls.localize('app.launch.json.compound.stopAll', 'Controls whether manually terminating one session will stop all of the compound sessions.'),
                    },
                    preLaunchTask: {
                        type: 'string',
                        default: '',
                        description: nls.localize('compoundPrelaunchTask', 'Task to run before any of the compound configurations start.'),
                    },
                },
                default: defaultCompound,
            },
            default: [defaultCompound],
        },
        inputs: inputsSchema.definitions.inputs,
    },
};
class DebuggersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.debuggers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.debuggers || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [nls.localize('debugger name', 'Name'), nls.localize('debugger type', 'Type')];
        const rows = contrib.map((d) => {
            return [d.label ?? '', d.type];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'debuggers',
    label: nls.localize('debuggers', 'Debuggers'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(DebuggersDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTY2hlbWFzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdTY2hlbWFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDNUcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEdBTVYsTUFBTSxtRUFBbUUsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLDRCQUE0QjtBQUM1QixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FFM0Y7SUFDRCxjQUFjLEVBQUUsV0FBVztJQUMzQixvQkFBb0IsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUNuQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsd0NBQXdDLEVBQ3hDLDZCQUE2QixDQUM3QjtRQUNELElBQUksRUFBRSxPQUFPO1FBQ2IsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDM0MsS0FBSyxFQUFFO1lBQ04sb0JBQW9CLEVBQUUsS0FBSztZQUMzQixJQUFJLEVBQUUsUUFBUTtZQUNkLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25FLFVBQVUsRUFBRTtnQkFDWCxJQUFJLEVBQUU7b0JBQ0wsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDZDQUE2QyxFQUM3QywyQ0FBMkMsQ0FDM0M7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qiw4Q0FBOEMsRUFDOUMsc0NBQXNDLENBQ3RDO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELE9BQU8sRUFBRTtvQkFDUixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0RBQWdELEVBQ2hELGlHQUFpRyxDQUNqRztvQkFDRCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDZDQUE2QyxFQUM3Qyw0Q0FBNEMsQ0FDNUM7b0JBQ0QsSUFBSSxFQUFFLE9BQU87aUJBQ2I7Z0JBQ0QsT0FBTyxFQUFFO29CQUNSLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixnREFBZ0QsRUFDaEQsNkZBQTZGLENBQzdGO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELFdBQVcsRUFBRTtvQkFDWixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsb0RBQW9ELEVBQ3BELDZCQUE2QixDQUM3QjtvQkFDRCxJQUFJLEVBQUUsT0FBTztpQkFDYjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtEQUFrRCxFQUNsRCxnR0FBZ0csQ0FDaEc7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QscUJBQXFCLEVBQUU7b0JBQ3RCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qiw4REFBOEQsRUFDOUQsNERBQTRELENBQzVEO29CQUNELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7aUJBQ3pCO2dCQUNELFNBQVMsRUFBRTtvQkFDVixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0RBQWtELEVBQ2xELDZGQUE2RixDQUM3RjtvQkFDRCxJQUFJLEVBQUUsT0FBTztpQkFDYjtnQkFDRCxxQkFBcUIsRUFBRTtvQkFDdEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDhEQUE4RCxFQUM5RCw0REFBNEQsQ0FDNUQ7b0JBQ0QsSUFBSSxFQUFFLE9BQU87aUJBQ2I7Z0JBQ0QsdUJBQXVCLEVBQUU7b0JBQ3hCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixnRUFBZ0UsRUFDaEUsNERBQTRELENBQzVEO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELElBQUksRUFBRTtvQkFDTCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsNkNBQTZDLEVBQzdDLDJNQUEyTSxDQUMzTTtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsRUFBRTtpQkFDWDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG1EQUFtRCxFQUNuRCx5R0FBeUcsQ0FDekc7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLEVBQUU7aUJBQ1g7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtREFBbUQsRUFDbkQsK0RBQStELENBQy9EO29CQUNELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxFQUFFO2lCQUNYO2dCQUNELE9BQU8sRUFBRTtvQkFDUixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0RBQWdELEVBQ2hELDRCQUE0QixDQUM1QjtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1gsT0FBTyxFQUFFOzRCQUNSLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3REFBd0QsRUFDeEQsMkJBQTJCLENBQzNCOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2dCQUNELEdBQUcsRUFBRTtvQkFDSixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsNENBQTRDLEVBQzVDLDBCQUEwQixDQUMxQjtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1gsT0FBTyxFQUFFOzRCQUNSLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvREFBb0QsRUFDcEQseUJBQXlCLENBQ3pCOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2dCQUNELEtBQUssRUFBRTtvQkFDTixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsOENBQThDLEVBQzlDLDBCQUEwQixDQUMxQjtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1gsT0FBTyxFQUFFOzRCQUNSLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixzREFBc0QsRUFDdEQseUJBQXlCLENBQ3pCOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2dCQUNELE9BQU8sRUFBRTtvQkFDUixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0RBQWdELEVBQ2hELCtDQUErQyxDQUMvQztvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1gscUJBQXFCLEVBQUU7NEJBQ3RCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixzRUFBc0UsRUFDdEUsOE1BQThNLENBQzlNOzRCQUNELElBQUksRUFBRSxRQUFRO3lCQUNkO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsb0NBQW9DO0FBQ3BDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUU3RjtJQUNELGNBQWMsRUFBRSxhQUFhO0lBQzdCLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQ0FBMEMsRUFDMUMsMEJBQTBCLENBQzFCO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMvQyxLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUM3QyxVQUFVLEVBQUU7Z0JBQ1gsUUFBUSxFQUFFO29CQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtREFBbUQsRUFDbkQsc0NBQXNDLENBQ3RDO29CQUNELElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELElBQUksRUFBRTtvQkFDTCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsK0NBQStDLEVBQy9DLHlJQUF5SSxDQUN6STtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsRUFBRTtpQkFDWDthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLHVCQUF1QjtBQUV2QixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDOUMsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsY0FBYyxFQUNkLHFIQUFxSCxDQUNySDtJQUNELFVBQVUsRUFBRTtRQUNYLE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIscUJBQXFCLEVBQ3JCLHVHQUF1RyxDQUN2RztTQUNEO1FBQ0QsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsRUFBRTtZQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQkFBb0IsRUFDcEIsZ0lBQWdJLENBQ2hJO1NBQ0Q7UUFDRCxLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1lBQ1YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9CQUFvQixFQUNwQixrSUFBa0ksQ0FDbEk7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFO1FBQ1IsTUFBTSxFQUFFLEtBQUs7UUFDYixLQUFLLEVBQUUsRUFBRTtRQUNULEtBQUssRUFBRSxDQUFDO0tBQ1I7Q0FDRCxDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQWMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQWdCO0lBQ3hDLEVBQUUsRUFBRSxjQUFjO0lBQ2xCLElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO0lBQ3RELG1CQUFtQixFQUFFLElBQUk7SUFDekIsYUFBYSxFQUFFLElBQUk7SUFDbkIsUUFBUSxFQUFFLEVBQUU7SUFDWixPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUNoRSxVQUFVLEVBQUU7UUFDWCxPQUFPLEVBQUU7WUFDUixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDhCQUE4QixDQUFDO1lBQ3BGLE9BQU8sRUFBRSxPQUFPO1NBQ2hCO1FBQ0QsY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsZ0NBQWdDLEVBQ2hDLDZGQUE2RixDQUM3RjtZQUNELEtBQUssRUFBRTtnQkFDTixlQUFlLEVBQUUsRUFBRTtnQkFDbkIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNEO1FBQ0QsU0FBUyxFQUFFO1lBQ1YsSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMkJBQTJCLEVBQzNCLHVHQUF1RyxDQUN2RztZQUNELEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3BDLFVBQVUsRUFBRTtvQkFDWCxJQUFJLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLCtCQUErQixFQUMvQix1RUFBdUUsQ0FDdkU7cUJBQ0Q7b0JBQ0QsWUFBWSxFQUFFLGtCQUFrQjtvQkFDaEMsY0FBYyxFQUFFO3dCQUNmLElBQUksRUFBRSxPQUFPO3dCQUNiLE9BQU8sRUFBRSxFQUFFO3dCQUNYLEtBQUssRUFBRTs0QkFDTixLQUFLLEVBQUU7Z0NBQ047b0NBQ0MsSUFBSSxFQUFFLEVBQUU7b0NBQ1IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGdCQUFnQixFQUNoQix3Q0FBd0MsQ0FDeEM7aUNBQ0Q7Z0NBQ0Q7b0NBQ0MsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO29DQUNsQixVQUFVLEVBQUU7d0NBQ1gsSUFBSSxFQUFFOzRDQUNMLElBQUksRUFBRSxFQUFFOzRDQUNSLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQkFBK0IsRUFDL0IsdUVBQXVFLENBQ3ZFO3lDQUNEO3dDQUNELE1BQU0sRUFBRTs0Q0FDUCxJQUFJLEVBQUUsRUFBRTs0Q0FDUixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsaUNBQWlDLEVBQ2pDLGtEQUFrRCxDQUNsRDt5Q0FDRDtxQ0FDRDtpQ0FDRDs2QkFDRDt5QkFDRDt3QkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMENBQTBDLEVBQzFDLHdFQUF3RSxDQUN4RTtxQkFDRDtvQkFDRCxPQUFPLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLFNBQVM7d0JBQ2YsT0FBTyxFQUFFLEtBQUs7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtDQUFrQyxFQUNsQywyRkFBMkYsQ0FDM0Y7cUJBQ0Q7b0JBQ0QsYUFBYSxFQUFFO3dCQUNkLElBQUksRUFBRSxRQUFRO3dCQUNkLE9BQU8sRUFBRSxFQUFFO3dCQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1QkFBdUIsRUFDdkIsOERBQThELENBQzlEO3FCQUNEO2lCQUNEO2dCQUNELE9BQU8sRUFBRSxlQUFlO2FBQ3hCO1lBQ0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQzFCO1FBQ0QsTUFBTSxFQUFFLFlBQVksQ0FBQyxXQUFZLENBQUMsTUFBTTtLQUN4QztDQUNELENBQUE7QUFFRCxNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFBOUM7O1FBQ1UsU0FBSSxHQUFHLE9BQU8sQ0FBQTtJQTBCeEIsQ0FBQztJQXhCQSxZQUFZLENBQUMsUUFBNEI7UUFDeEMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUE7SUFDekMsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUE0QjtRQUNsQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLFNBQVMsSUFBSSxFQUFFLENBQUE7UUFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFBO1FBQzlELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFOUYsTUFBTSxJQUFJLEdBQWlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM1QyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTztZQUNOLElBQUksRUFBRTtnQkFDTCxPQUFPO2dCQUNQLElBQUk7YUFDSjtZQUNELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ2pCLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyx3QkFBd0IsQ0FBQztJQUMxQixFQUFFLEVBQUUsV0FBVztJQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7SUFDN0MsTUFBTSxFQUFFO1FBQ1AsU0FBUyxFQUFFLEtBQUs7S0FDaEI7SUFDRCxRQUFRLEVBQUUsSUFBSSxjQUFjLENBQUMscUJBQXFCLENBQUM7Q0FDbkQsQ0FBQyxDQUFBIn0=