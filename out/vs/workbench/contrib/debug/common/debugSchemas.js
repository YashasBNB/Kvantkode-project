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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTY2hlbWFzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnU2NoZW1hcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssa0JBQWtCLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxHQU1WLE1BQU0sbUVBQW1FLENBQUE7QUFFMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSw0QkFBNEI7QUFDNUIsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBRTNGO0lBQ0QsY0FBYyxFQUFFLFdBQVc7SUFDM0Isb0JBQW9CLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDbkMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdDQUF3QyxFQUN4Qyw2QkFBNkIsQ0FDN0I7UUFDRCxJQUFJLEVBQUUsT0FBTztRQUNiLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzNDLEtBQUssRUFBRTtZQUNOLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsSUFBSSxF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