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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vY29uZmlndXJhdGlvbkV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFeEUsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFHTixVQUFVLEVBQ1YsZ0JBQWdCLEVBRWhCLHVCQUF1QixFQUV2Qiw2QkFBNkIsRUFFN0IsZUFBZSxFQUNmLDZCQUE2QixFQUM3QixVQUFVLEdBQ1YsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sVUFBVSxJQUFJLGNBQWMsR0FDNUIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGNBQWMsRUFDZCxhQUFhLEVBQ2IsV0FBVyxHQUNYLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUNOLFVBQVUsSUFBSSwyQkFBMkIsR0FNekMsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFB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