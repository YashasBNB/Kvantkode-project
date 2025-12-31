/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { isObject } from '../../../../base/common/types.js';
import { IDebugService, debuggerDisabledMessage, DebugConfigurationProviderTriggerKind, } from './debug.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
import { isDebuggerMainContribution } from './debugUtils.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { filter } from '../../../../base/common/objects.js';
let Debugger = class Debugger {
    constructor(adapterManager, dbgContribution, extensionDescription, configurationService, resourcePropertiesService, configurationResolverService, environmentService, debugService, contextKeyService) {
        this.adapterManager = adapterManager;
        this.configurationService = configurationService;
        this.resourcePropertiesService = resourcePropertiesService;
        this.configurationResolverService = configurationResolverService;
        this.environmentService = environmentService;
        this.debugService = debugService;
        this.contextKeyService = contextKeyService;
        this.mergedExtensionDescriptions = [];
        this.debuggerContribution = { type: dbgContribution.type };
        this.merge(dbgContribution, extensionDescription);
        this.debuggerWhen =
            typeof this.debuggerContribution.when === 'string'
                ? ContextKeyExpr.deserialize(this.debuggerContribution.when)
                : undefined;
        this.debuggerHiddenWhen =
            typeof this.debuggerContribution.hiddenWhen === 'string'
                ? ContextKeyExpr.deserialize(this.debuggerContribution.hiddenWhen)
                : undefined;
    }
    merge(otherDebuggerContribution, extensionDescription) {
        /**
         * Copies all properties of source into destination. The optional parameter "overwrite" allows to control
         * if existing non-structured properties on the destination should be overwritten or not. Defaults to true (overwrite).
         */
        function mixin(destination, source, overwrite, level = 0) {
            if (!isObject(destination)) {
                return source;
            }
            if (isObject(source)) {
                Object.keys(source).forEach((key) => {
                    if (key !== '__proto__') {
                        if (isObject(destination[key]) && isObject(source[key])) {
                            mixin(destination[key], source[key], overwrite, level + 1);
                        }
                        else {
                            if (key in destination) {
                                if (overwrite) {
                                    if (level === 0 && key === 'type') {
                                        // don't merge the 'type' property
                                    }
                                    else {
                                        destination[key] = source[key];
                                    }
                                }
                            }
                            else {
                                destination[key] = source[key];
                            }
                        }
                    }
                });
            }
            return destination;
        }
        // only if not already merged
        if (this.mergedExtensionDescriptions.indexOf(extensionDescription) < 0) {
            // remember all extensions that have been merged for this debugger
            this.mergedExtensionDescriptions.push(extensionDescription);
            // merge new debugger contribution into existing contributions (and don't overwrite values in built-in extensions)
            mixin(this.debuggerContribution, otherDebuggerContribution, extensionDescription.isBuiltin);
            // remember the extension that is considered the "main" debugger contribution
            if (isDebuggerMainContribution(otherDebuggerContribution)) {
                this.mainExtensionDescription = extensionDescription;
            }
        }
    }
    async startDebugging(configuration, parentSessionId) {
        const parentSession = this.debugService.getModel().getSession(parentSessionId);
        return await this.debugService.startDebugging(undefined, configuration, { parentSession }, undefined);
    }
    async createDebugAdapter(session) {
        await this.adapterManager.activateDebuggers('onDebugAdapterProtocolTracker', this.type);
        const da = this.adapterManager.createDebugAdapter(session);
        if (da) {
            return Promise.resolve(da);
        }
        throw new Error(nls.localize('cannot.find.da', "Cannot find debug adapter for type '{0}'.", this.type));
    }
    async substituteVariables(folder, config) {
        const substitutedConfig = await this.adapterManager.substituteVariables(this.type, folder, config);
        return await this.configurationResolverService.resolveWithInteractionReplace(folder, substitutedConfig, 'launch', this.variables, substitutedConfig.__configurationTarget);
    }
    runInTerminal(args, sessionId) {
        return this.adapterManager.runInTerminal(this.type, args, sessionId);
    }
    get label() {
        return this.debuggerContribution.label || this.debuggerContribution.type;
    }
    get type() {
        return this.debuggerContribution.type;
    }
    get variables() {
        return this.debuggerContribution.variables;
    }
    get configurationSnippets() {
        return this.debuggerContribution.configurationSnippets;
    }
    get languages() {
        return this.debuggerContribution.languages;
    }
    get when() {
        return this.debuggerWhen;
    }
    get hiddenWhen() {
        return this.debuggerHiddenWhen;
    }
    get enabled() {
        return !this.debuggerWhen || this.contextKeyService.contextMatchesRules(this.debuggerWhen);
    }
    get isHiddenFromDropdown() {
        if (!this.debuggerHiddenWhen) {
            return false;
        }
        return this.contextKeyService.contextMatchesRules(this.debuggerHiddenWhen);
    }
    get strings() {
        return this.debuggerContribution.strings ?? this.debuggerContribution.uiMessages;
    }
    interestedInLanguage(languageId) {
        return !!(this.languages && this.languages.indexOf(languageId) >= 0);
    }
    hasInitialConfiguration() {
        return !!this.debuggerContribution.initialConfigurations;
    }
    hasDynamicConfigurationProviders() {
        return this.debugService
            .getConfigurationManager()
            .hasDebugConfigurationProvider(this.type, DebugConfigurationProviderTriggerKind.Dynamic);
    }
    hasConfigurationProvider() {
        return this.debugService.getConfigurationManager().hasDebugConfigurationProvider(this.type);
    }
    getInitialConfigurationContent(initialConfigs) {
        // at this point we got some configs from the package.json and/or from registered DebugConfigurationProviders
        let initialConfigurations = this.debuggerContribution.initialConfigurations || [];
        if (initialConfigs) {
            initialConfigurations = initialConfigurations.concat(initialConfigs);
        }
        const eol = this.resourcePropertiesService.getEOL(URI.from({ scheme: Schemas.untitled, path: '1' })) ===
            '\r\n'
            ? '\r\n'
            : '\n';
        const configs = JSON.stringify(initialConfigurations, null, '\t')
            .split('\n')
            .map((line) => '\t' + line)
            .join(eol)
            .trim();
        const comment1 = nls.localize('launch.config.comment1', 'Use IntelliSense to learn about possible attributes.');
        const comment2 = nls.localize('launch.config.comment2', 'Hover to view descriptions of existing attributes.');
        const comment3 = nls.localize('launch.config.comment3', 'For more information, visit: {0}', 'https://go.microsoft.com/fwlink/?linkid=830387');
        let content = [
            '{',
            `\t// ${comment1}`,
            `\t// ${comment2}`,
            `\t// ${comment3}`,
            `\t"version": "0.2.0",`,
            `\t"configurations": ${configs}`,
            '}',
        ].join(eol);
        // fix formatting
        const editorConfig = this.configurationService.getValue();
        if (editorConfig.editor && editorConfig.editor.insertSpaces) {
            content = content.replace(new RegExp('\t', 'g'), ' '.repeat(editorConfig.editor.tabSize));
        }
        return Promise.resolve(content);
    }
    getMainExtensionDescriptor() {
        return this.mainExtensionDescription || this.mergedExtensionDescriptions[0];
    }
    getCustomTelemetryEndpoint() {
        const aiKey = this.debuggerContribution.aiKey;
        if (!aiKey) {
            return undefined;
        }
        const sendErrorTelemtry = cleanRemoteAuthority(this.environmentService.remoteAuthority) !== 'other';
        return {
            id: `${this.getMainExtensionDescriptor().publisher}.${this.type}`,
            aiKey,
            sendErrorTelemetry: sendErrorTelemtry,
        };
    }
    getSchemaAttributes(definitions) {
        if (!this.debuggerContribution.configurationAttributes) {
            return null;
        }
        // fill in the default configuration attributes shared by all adapters.
        return Object.keys(this.debuggerContribution.configurationAttributes).map((request) => {
            const definitionId = `${this.type}:${request}`;
            const platformSpecificDefinitionId = `${this.type}:${request}:platform`;
            const attributes = this.debuggerContribution.configurationAttributes[request];
            const defaultRequired = ['name', 'type', 'request'];
            attributes.required =
                attributes.required && attributes.required.length
                    ? defaultRequired.concat(attributes.required)
                    : defaultRequired;
            attributes.additionalProperties = false;
            attributes.type = 'object';
            if (!attributes.properties) {
                attributes.properties = {};
            }
            const properties = attributes.properties;
            properties['type'] = {
                enum: [this.type],
                enumDescriptions: [this.label],
                description: nls.localize('debugType', 'Type of configuration.'),
                pattern: '^(?!node2)',
                deprecationMessage: this.debuggerContribution.deprecated ||
                    (this.enabled ? undefined : debuggerDisabledMessage(this.type)),
                doNotSuggest: !!this.debuggerContribution.deprecated,
                errorMessage: nls.localize('debugTypeNotRecognised', 'The debug type is not recognized. Make sure that you have a corresponding debug extension installed and that it is enabled.'),
                patternErrorMessage: nls.localize('node2NotSupported', '"node2" is no longer supported, use "node" instead and set the "protocol" attribute to "inspector".'),
            };
            properties['request'] = {
                enum: [request],
                description: nls.localize('debugRequest', 'Request type of configuration. Can be "launch" or "attach".'),
            };
            for (const prop in definitions['common'].properties) {
                properties[prop] = {
                    $ref: `#/definitions/common/properties/${prop}`,
                };
            }
            Object.keys(properties).forEach((name) => {
                // Use schema allOf property to get independent error reporting #21113
                ConfigurationResolverUtils.applyDeprecatedVariableMessage(properties[name]);
            });
            definitions[definitionId] = { ...attributes };
            definitions[platformSpecificDefinitionId] = {
                type: 'object',
                additionalProperties: false,
                properties: filter(properties, (key) => key !== 'type' && key !== 'request' && key !== 'name'),
            };
            // Don't add the OS props to the real attributes object so they don't show up in 'definitions'
            const attributesCopy = { ...attributes };
            attributesCopy.properties = {
                ...properties,
                ...{
                    windows: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugWindowsConfiguration', 'Windows specific launch configuration attributes.'),
                    },
                    osx: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugOSXConfiguration', 'OS X specific launch configuration attributes.'),
                    },
                    linux: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugLinuxConfiguration', 'Linux specific launch configuration attributes.'),
                    },
                },
            };
            return attributesCopy;
        });
    }
};
Debugger = __decorate([
    __param(3, IConfigurationService),
    __param(4, ITextResourcePropertiesService),
    __param(5, IConfigurationResolverService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IDebugService),
    __param(8, IContextKeyService)
], Debugger);
export { Debugger };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPM0QsT0FBTyxFQU9OLGFBQWEsRUFDYix1QkFBdUIsRUFFdkIscUNBQXFDLEdBQ3JDLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3ZILE9BQU8sS0FBSywwQkFBMEIsTUFBTSw4RUFBOEUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXBELElBQU0sUUFBUSxHQUFkLE1BQU0sUUFBUTtJQVFwQixZQUNTLGNBQStCLEVBQ3ZDLGVB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