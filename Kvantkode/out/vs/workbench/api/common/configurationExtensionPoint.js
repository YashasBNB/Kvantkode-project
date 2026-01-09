/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as objects from '../../../base/common/objects.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ExtensionsRegistry, } from '../../services/extensions/common/extensionsRegistry.js';
import { Extensions, validateProperty, OVERRIDE_PROPERTY_REGEX, configurationDefaultsSchemaId, getDefaultValue, getAllConfigurationProperties, parseScope, } from '../../../platform/configuration/common/configurationRegistry.js';
import { Extensions as JSONExtensions, } from '../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workspaceSettingsSchemaId, launchSchemaId, tasksSchemaId, mcpSchemaId, } from '../../services/configuration/common/configuration.js';
import { isObject, isUndefined } from '../../../base/common/types.js';
import { ExtensionIdentifierMap, } from '../../../platform/extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions, } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import product from '../../../platform/product/common/product.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
const configurationRegistry = Registry.as(Extensions.Configuration);
const configurationEntrySchema = {
    type: 'object',
    defaultSnippets: [{ body: { title: '', properties: {} } }],
    properties: {
        title: {
            description: nls.localize('vscode.extension.contributes.configuration.title', 'A title for the current category of settings. This label will be rendered in the Settings editor as a subheading. If the title is the same as the extension display name, then the category will be grouped under the main extension heading.'),
            type: 'string',
        },
        order: {
            description: nls.localize('vscode.extension.contributes.configuration.order', 'When specified, gives the order of this category of settings relative to other categories.'),
            type: 'integer',
        },
        properties: {
            description: nls.localize('vscode.extension.contributes.configuration.properties', 'Description of the configuration properties.'),
            type: 'object',
            propertyNames: {
                pattern: '\\S+',
                patternErrorMessage: nls.localize('vscode.extension.contributes.configuration.property.empty', 'Property should not be empty.'),
            },
            additionalProperties: {
                anyOf: [
                    {
                        title: nls.localize('vscode.extension.contributes.configuration.properties.schema', 'Schema of the configuration property.'),
                        $ref: 'http://json-schema.org/draft-07/schema#',
                    },
                    {
                        type: 'object',
                        properties: {
                            scope: {
                                type: 'string',
                                enum: [
                                    'application',
                                    'machine',
                                    'window',
                                    'resource',
                                    'language-overridable',
                                    'machine-overridable',
                                ],
                                default: 'window',
                                enumDescriptions: [
                                    nls.localize('scope.application.description', 'Configuration that can be configured only in the user settings.'),
                                    nls.localize('scope.machine.description', 'Configuration that can be configured only in the user settings or only in the remote settings.'),
                                    nls.localize('scope.window.description', 'Configuration that can be configured in the user, remote or workspace settings.'),
                                    nls.localize('scope.resource.description', 'Configuration that can be configured in the user, remote, workspace or folder settings.'),
                                    nls.localize('scope.language-overridable.description', 'Resource configuration that can be configured in language specific settings.'),
                                    nls.localize('scope.machine-overridable.description', 'Machine configuration that can be configured also in workspace or folder settings.'),
                                ],
                                markdownDescription: nls.localize('scope.description', 'Scope in which the configuration is applicable. Available scopes are `application`, `machine`, `window`, `resource`, and `machine-overridable`.'),
                            },
                            enumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize('scope.enumDescriptions', 'Descriptions for enum values'),
                            },
                            markdownEnumDescriptions: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                description: nls.localize('scope.markdownEnumDescriptions', 'Descriptions for enum values in the markdown format.'),
                            },
                            enumItemLabels: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                markdownDescription: nls.localize('scope.enumItemLabels', 'Labels for enum values to be displayed in the Settings editor. When specified, the {0} values still show after the labels, but less prominently.', '`enum`'),
                            },
                            markdownDescription: {
                                type: 'string',
                                description: nls.localize('scope.markdownDescription', 'The description in the markdown format.'),
                            },
                            deprecationMessage: {
                                type: 'string',
                                description: nls.localize('scope.deprecationMessage', 'If set, the property is marked as deprecated and the given message is shown as an explanation.'),
                            },
                            markdownDeprecationMessage: {
                                type: 'string',
                                description: nls.localize('scope.markdownDeprecationMessage', 'If set, the property is marked as deprecated and the given message is shown as an explanation in the markdown format.'),
                            },
                            editPresentation: {
                                type: 'string',
                                enum: ['singlelineText', 'multilineText'],
                                enumDescriptions: [
                                    nls.localize('scope.singlelineText.description', 'The value will be shown in an inputbox.'),
                                    nls.localize('scope.multilineText.description', 'The value will be shown in a textarea.'),
                                ],
                                default: 'singlelineText',
                                description: nls.localize('scope.editPresentation', 'When specified, controls the presentation format of the string setting.'),
                            },
                            order: {
                                type: 'integer',
                                description: nls.localize('scope.order', 'When specified, gives the order of this setting relative to other settings within the same category. Settings with an order property will be placed before settings without this property set.'),
                            },
                            ignoreSync: {
                                type: 'boolean',
                                description: nls.localize('scope.ignoreSync', 'When enabled, Settings Sync will not sync the user value of this configuration by default.'),
                            },
                            tags: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                markdownDescription: nls.localize('scope.tags', 'A list of categories under which to place the setting. The category can then be searched up in the Settings editor. For example, specifying the `experimental` tag allows one to find the setting by searching `@tag:experimental`.'),
                            },
                        },
                    },
                ],
            },
        },
    },
};
// build up a delta across two ext points and only apply it once
let _configDelta;
// BEGIN VSCode extension point `configurationDefaults`
const defaultConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configurationDefaults',
    jsonSchema: {
        $ref: configurationDefaultsSchemaId,
    },
    canHandleResolver: true,
});
defaultConfigurationExtPoint.setHandler((extensions, { added, removed }) => {
    if (_configDelta) {
        // HIGHLY unlikely, but just in case
        configurationRegistry.deltaConfiguration(_configDelta);
    }
    const configNow = (_configDelta = {});
    // schedule a HIGHLY unlikely task in case only the default configurations EXT point changes
    queueMicrotask(() => {
        if (_configDelta === configNow) {
            configurationRegistry.deltaConfiguration(_configDelta);
            _configDelta = undefined;
        }
    });
    if (removed.length) {
        const removedDefaultConfigurations = removed.map((extension) => ({
            overrides: objects.deepClone(extension.value),
            source: {
                id: extension.description.identifier.value,
                displayName: extension.description.displayName,
            },
        }));
        _configDelta.removedDefaults = removedDefaultConfigurations;
    }
    if (added.length) {
        const registeredProperties = configurationRegistry.getConfigurationProperties();
        const allowedScopes = [
            7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
            4 /* ConfigurationScope.WINDOW */,
            5 /* ConfigurationScope.RESOURCE */,
            6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        ];
        const addedDefaultConfigurations = added.map((extension) => {
            const overrides = objects.deepClone(extension.value);
            for (const key of Object.keys(overrides)) {
                const registeredPropertyScheme = registeredProperties[key];
                if (registeredPropertyScheme?.disallowConfigurationDefault) {
                    extension.collector.warn(nls.localize('config.property.preventDefaultConfiguration.warning', "Cannot register configuration defaults for '{0}'. This setting does not allow contributing configuration defaults.", key));
                    delete overrides[key];
                    continue;
                }
                if (!OVERRIDE_PROPERTY_REGEX.test(key)) {
                    if (registeredPropertyScheme?.scope &&
                        !allowedScopes.includes(registeredPropertyScheme.scope)) {
                        extension.collector.warn(nls.localize('config.property.defaultConfiguration.warning', "Cannot register configuration defaults for '{0}'. Only defaults for machine-overridable, window, resource and language overridable scoped settings are supported.", key));
                        delete overrides[key];
                        continue;
                    }
                }
            }
            return {
                overrides,
                source: {
                    id: extension.description.identifier.value,
                    displayName: extension.description.displayName,
                },
            };
        });
        _configDelta.addedDefaults = addedDefaultConfigurations;
    }
});
// END VSCode extension point `configurationDefaults`
// BEGIN VSCode extension point `configuration`
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'configuration',
    deps: [defaultConfigurationExtPoint],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.configuration', 'Contributes configuration settings.'),
        oneOf: [
            configurationEntrySchema,
            {
                type: 'array',
                items: configurationEntrySchema,
            },
        ],
    },
    canHandleResolver: true,
});
const extensionConfigurations = new ExtensionIdentifierMap();
configurationExtPoint.setHandler((extensions, { added, removed }) => {
    // HIGHLY unlikely (only configuration but not defaultConfiguration EXT point changes)
    _configDelta ??= {};
    if (removed.length) {
        const removedConfigurations = [];
        for (const extension of removed) {
            removedConfigurations.push(...(extensionConfigurations.get(extension.description.identifier) || []));
            extensionConfigurations.delete(extension.description.identifier);
        }
        _configDelta.removedConfigurations = removedConfigurations;
    }
    const seenProperties = new Set();
    function handleConfiguration(node, extension) {
        const configuration = objects.deepClone(node);
        if (configuration.title && typeof configuration.title !== 'string') {
            extension.collector.error(nls.localize('invalid.title', "'configuration.title' must be a string"));
        }
        validateProperties(configuration, extension);
        configuration.id = node.id || extension.description.identifier.value;
        configuration.extensionInfo = {
            id: extension.description.identifier.value,
            displayName: extension.description.displayName,
        };
        configuration.restrictedProperties =
            extension.description.capabilities?.untrustedWorkspaces?.supported === 'limited'
                ? extension.description.capabilities?.untrustedWorkspaces.restrictedConfigurations
                : undefined;
        configuration.title =
            configuration.title ||
                extension.description.displayName ||
                extension.description.identifier.value;
        return configuration;
    }
    function validateProperties(configuration, extension) {
        const properties = configuration.properties;
        const extensionConfigurationPolicy = product.extensionConfigurationPolicy;
        if (properties) {
            if (typeof properties !== 'object') {
                extension.collector.error(nls.localize('invalid.properties', "'configuration.properties' must be an object"));
                configuration.properties = {};
            }
            for (const key in properties) {
                const propertyConfiguration = properties[key];
                const message = validateProperty(key, propertyConfiguration);
                if (message) {
                    delete properties[key];
                    extension.collector.warn(message);
                    continue;
                }
                if (seenProperties.has(key)) {
                    delete properties[key];
                    extension.collector.warn(nls.localize('config.property.duplicate', "Cannot register '{0}'. This property is already registered.", key));
                    continue;
                }
                if (!isObject(propertyConfiguration)) {
                    delete properties[key];
                    extension.collector.error(nls.localize('invalid.property', "configuration.properties property '{0}' must be an object", key));
                    continue;
                }
                if (extensionConfigurationPolicy?.[key]) {
                    propertyConfiguration.policy = extensionConfigurationPolicy?.[key];
                }
                seenProperties.add(key);
                propertyConfiguration.scope = propertyConfiguration.scope
                    ? parseScope(propertyConfiguration.scope.toString())
                    : 4 /* ConfigurationScope.WINDOW */;
            }
        }
        const subNodes = configuration.allOf;
        if (subNodes) {
            extension.collector.error(nls.localize('invalid.allOf', "'configuration.allOf' is deprecated and should no longer be used. Instead, pass multiple configuration sections as an array to the 'configuration' contribution point."));
            for (const node of subNodes) {
                validateProperties(node, extension);
            }
        }
    }
    if (added.length) {
        const addedConfigurations = [];
        for (const extension of added) {
            const configurations = [];
            const value = extension.value;
            if (Array.isArray(value)) {
                value.forEach((v) => configurations.push(handleConfiguration(v, extension)));
            }
            else {
                configurations.push(handleConfiguration(value, extension));
            }
            extensionConfigurations.set(extension.description.identifier, configurations);
            addedConfigurations.push(...configurations);
        }
        _configDelta.addedConfigurations = addedConfigurations;
    }
    configurationRegistry.deltaConfiguration(_configDelta);
    _configDelta = undefined;
});
// END VSCode extension point `configuration`
jsonRegistry.registerSchema('vscode://schemas/workspaceConfig', {
    allowComments: true,
    allowTrailingCommas: true,
    default: {
        folders: [
            {
                path: '',
            },
        ],
        settings: {},
    },
    required: ['folders'],
    properties: {
        folders: {
            minItems: 0,
            uniqueItems: true,
            description: nls.localize('workspaceConfig.folders.description', 'List of folders to be loaded in the workspace.'),
            items: {
                type: 'object',
                defaultSnippets: [{ body: { path: '$1' } }],
                oneOf: [
                    {
                        properties: {
                            path: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.path.description', 'A file path. e.g. `/root/folderA` or `./folderA` for a relative path that will be resolved against the location of the workspace file.'),
                            },
                            name: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.name.description', 'An optional name for the folder. '),
                            },
                        },
                        required: ['path'],
                    },
                    {
                        properties: {
                            uri: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.uri.description', 'URI of the folder'),
                            },
                            name: {
                                type: 'string',
                                description: nls.localize('workspaceConfig.name.description', 'An optional name for the folder. '),
                            },
                        },
                        required: ['uri'],
                    },
                ],
            },
        },
        settings: {
            type: 'object',
            default: {},
            description: nls.localize('workspaceConfig.settings.description', 'Workspace settings'),
            $ref: workspaceSettingsSchemaId,
        },
        launch: {
            type: 'object',
            default: { configurations: [], compounds: [] },
            description: nls.localize('workspaceConfig.launch.description', 'Workspace launch configurations'),
            $ref: launchSchemaId,
        },
        tasks: {
            type: 'object',
            default: { version: '2.0.0', tasks: [] },
            description: nls.localize('workspaceConfig.tasks.description', 'Workspace task configurations'),
            $ref: tasksSchemaId,
        },
        mcp: {
            type: 'object',
            default: {
                inputs: [],
                servers: {
                    'mcp-server-time': {
                        command: 'python',
                        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
                    },
                },
            },
            description: nls.localize('workspaceConfig.mcp.description', 'Model Context Protocol server configurations'),
            $ref: mcpSchemaId,
        },
        extensions: {
            type: 'object',
            default: {},
            description: nls.localize('workspaceConfig.extensions.description', 'Workspace extensions'),
            $ref: 'vscode://schemas/extensions',
        },
        remoteAuthority: {
            type: 'string',
            doNotSuggest: true,
            description: nls.localize('workspaceConfig.remoteAuthority', 'The remote server where the workspace is located.'),
        },
        transient: {
            type: 'boolean',
            doNotSuggest: true,
            description: nls.localize('workspaceConfig.transient', 'A transient workspace will disappear when restarting or reloading.'),
        },
    },
    errorMessage: nls.localize('unknownWorkspaceProperty', 'Unknown workspace configuration property'),
});
class SettingsTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.configuration;
    }
    render(manifest) {
        const configuration = manifest.contributes?.configuration
            ? Array.isArray(manifest.contributes.configuration)
                ? manifest.contributes.configuration
                : [manifest.contributes.configuration]
            : [];
        const properties = getAllConfigurationProperties(configuration);
        const contrib = properties ? Object.keys(properties) : [];
        const headers = [
            nls.localize('setting name', 'ID'),
            nls.localize('description', 'Description'),
            nls.localize('default', 'Default'),
        ];
        const rows = contrib
            .sort((a, b) => a.localeCompare(b))
            .map((key) => {
            return [
                new MarkdownString().appendMarkdown(`\`${key}\``),
                properties[key].markdownDescription
                    ? new MarkdownString(properties[key].markdownDescription, false)
                    : (properties[key].description ?? ''),
                new MarkdownString().appendCodeblock('json', JSON.stringify(isUndefined(properties[key].default)
                    ? getDefaultValue(properties[key].type)
                    : properties[key].default, null, 2)),
            ];
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
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'configuration',
    label: nls.localize('settings', 'Settings'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(SettingsTableRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9jb25maWd1cmF0aW9uRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV4RSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUdOLFVBQVUsRUFDVixnQkFBZ0IsRUFFaEIsdUJBQXVCLEVBRXZCLDZCQUE2QixFQUU3QixlQUFlLEVBQ2YsNkJBQTZCLEVBQzdCLFVBQVUsR0FDVixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFFTixVQUFVLElBQUksY0FBYyxHQUM1QixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsY0FBYyxFQUNkLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JFLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQ04sVUFBVSxJQUFJLDJCQUEyQixHQU16QyxNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYs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