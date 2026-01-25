/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import Severity from '../../../../base/common/severity.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EXTENSION_CATEGORIES, ExtensionIdentifierSet, } from '../../../../platform/extensions/common/extensions.js';
import { productSchemaId } from '../../../../platform/product/common/productService.js';
import { ImplicitActivationEvents, } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { allApiProposals } from '../../../../platform/extensions/common/extensionsApiProposals.js';
const schemaRegistry = Registry.as(Extensions.JSONContribution);
export class ExtensionMessageCollector {
    constructor(messageHandler, extension, extensionPointId) {
        this._messageHandler = messageHandler;
        this._extension = extension;
        this._extensionPointId = extensionPointId;
    }
    _msg(type, message) {
        this._messageHandler({
            type: type,
            message: message,
            extensionId: this._extension.identifier,
            extensionPointId: this._extensionPointId,
        });
    }
    error(message) {
        this._msg(Severity.Error, message);
    }
    warn(message) {
        this._msg(Severity.Warning, message);
    }
    info(message) {
        this._msg(Severity.Info, message);
    }
}
export class ExtensionPointUserDelta {
    static _toSet(arr) {
        const result = new ExtensionIdentifierSet();
        for (let i = 0, len = arr.length; i < len; i++) {
            result.add(arr[i].description.identifier);
        }
        return result;
    }
    static compute(previous, current) {
        if (!previous || !previous.length) {
            return new ExtensionPointUserDelta(current, []);
        }
        if (!current || !current.length) {
            return new ExtensionPointUserDelta([], previous);
        }
        const previousSet = this._toSet(previous);
        const currentSet = this._toSet(current);
        const added = current.filter((user) => !previousSet.has(user.description.identifier));
        const removed = previous.filter((user) => !currentSet.has(user.description.identifier));
        return new ExtensionPointUserDelta(added, removed);
    }
    constructor(added, removed) {
        this.added = added;
        this.removed = removed;
    }
}
export class ExtensionPoint {
    constructor(name, defaultExtensionKind, canHandleResolver) {
        this.name = name;
        this.defaultExtensionKind = defaultExtensionKind;
        this.canHandleResolver = canHandleResolver;
        this._handler = null;
        this._users = null;
        this._delta = null;
    }
    setHandler(handler) {
        if (this._handler !== null) {
            throw new Error('Handler already set!');
        }
        this._handler = handler;
        this._handle();
        return {
            dispose: () => {
                this._handler = null;
            },
        };
    }
    acceptUsers(users) {
        this._delta = ExtensionPointUserDelta.compute(this._users, users);
        this._users = users;
        this._handle();
    }
    _handle() {
        if (this._handler === null || this._users === null || this._delta === null) {
            return;
        }
        try {
            this._handler(this._users, this._delta);
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
}
const extensionKindSchema = {
    type: 'string',
    enum: ['ui', 'workspace'],
    enumDescriptions: [
        nls.localize('ui', 'UI extension kind. In a remote window, such extensions are enabled only when available on the local machine.'),
        nls.localize('workspace', 'Workspace extension kind. In a remote window, such extensions are enabled only when available on the remote.'),
    ],
};
const schemaId = 'vscode://schemas/vscode-extensions';
export const schema = {
    properties: {
        engines: {
            type: 'object',
            description: nls.localize('vscode.extension.engines', 'Engine compatibility.'),
            properties: {
                vscode: {
                    type: 'string',
                    description: nls.localize('vscode.extension.engines.vscode', 'For VS Code extensions, specifies the VS Code version that the extension is compatible with. Cannot be *. For example: ^0.10.5 indicates compatibility with a minimum VS Code version of 0.10.5.'),
                    default: '^1.22.0',
                },
            },
        },
        publisher: {
            description: nls.localize('vscode.extension.publisher', 'The publisher of the VS Code extension.'),
            type: 'string',
        },
        displayName: {
            description: nls.localize('vscode.extension.displayName', 'The display name for the extension used in the VS Code gallery.'),
            type: 'string',
        },
        categories: {
            description: nls.localize('vscode.extension.categories', 'The categories used by the VS Code gallery to categorize the extension.'),
            type: 'array',
            uniqueItems: true,
            items: {
                oneOf: [
                    {
                        type: 'string',
                        enum: EXTENSION_CATEGORIES,
                    },
                    {
                        type: 'string',
                        const: 'Languages',
                        deprecationMessage: nls.localize('vscode.extension.category.languages.deprecated', "Use 'Programming  Languages' instead"),
                    },
                ],
            },
        },
        galleryBanner: {
            type: 'object',
            description: nls.localize('vscode.extension.galleryBanner', 'Banner used in the VS Code marketplace.'),
            properties: {
                color: {
                    description: nls.localize('vscode.extension.galleryBanner.color', 'The banner color on the VS Code marketplace page header.'),
                    type: 'string',
                },
                theme: {
                    description: nls.localize('vscode.extension.galleryBanner.theme', 'The color theme for the font used in the banner.'),
                    type: 'string',
                    enum: ['dark', 'light'],
                },
            },
        },
        contributes: {
            description: nls.localize('vscode.extension.contributes', 'All contributions of the VS Code extension represented by this package.'),
            type: 'object',
            properties: {
            // extensions will fill in
            },
            default: {},
        },
        preview: {
            type: 'boolean',
            description: nls.localize('vscode.extension.preview', 'Sets the extension to be flagged as a Preview in the Marketplace.'),
        },
        enableProposedApi: {
            type: 'boolean',
            deprecationMessage: nls.localize('vscode.extension.enableProposedApi.deprecated', 'Use `enabledApiProposals` instead.'),
        },
        enabledApiProposals: {
            markdownDescription: nls.localize('vscode.extension.enabledApiProposals', 'Enable API proposals to try them out. Only valid **during development**. Extensions **cannot be published** with this property. For more details visit: https://code.visualstudio.com/api/advanced-topics/using-proposed-api'),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                enum: Object.keys(allApiProposals).map((proposalName) => proposalName),
                markdownEnumDescriptions: Object.values(allApiProposals).map((value) => value.proposal),
            },
        },
        api: {
            markdownDescription: nls.localize('vscode.extension.api', 'Describe the API provided by this extension. For more details visit: https://code.visualstudio.com/api/advanced-topics/remote-extensions#handling-dependencies-with-remote-extensions'),
            type: 'string',
            enum: ['none'],
            enumDescriptions: [
                nls.localize('vscode.extension.api.none', 'Give up entirely the ability to export any APIs. This allows other extensions that depend on this extension to run in a separate extension host process or in a remote machine.'),
            ],
        },
        activationEvents: {
            description: nls.localize('vscode.extension.activationEvents', 'Activation events for the VS Code extension.'),
            type: 'array',
            items: {
                type: 'string',
                defaultSnippets: [
                    {
                        label: 'onWebviewPanel',
                        description: nls.localize('vscode.extension.activationEvents.onWebviewPanel', 'An activation event emmited when a webview is loaded of a certain viewType'),
                        body: 'onWebviewPanel:viewType',
                    },
                    {
                        label: 'onLanguage',
                        description: nls.localize('vscode.extension.activationEvents.onLanguage', 'An activation event emitted whenever a file that resolves to the specified language gets opened.'),
                        body: 'onLanguage:${1:languageId}',
                    },
                    {
                        label: 'onCommand',
                        description: nls.localize('vscode.extension.activationEvents.onCommand', 'An activation event emitted whenever the specified command gets invoked.'),
                        body: 'onCommand:${2:commandId}',
                    },
                    {
                        label: 'onDebug',
                        description: nls.localize('vscode.extension.activationEvents.onDebug', 'An activation event emitted whenever a user is about to start debugging or about to setup debug configurations.'),
                        body: 'onDebug',
                    },
                    {
                        label: 'onDebugInitialConfigurations',
                        description: nls.localize('vscode.extension.activationEvents.onDebugInitialConfigurations', 'An activation event emitted whenever a "launch.json" needs to be created (and all provideDebugConfigurations methods need to be called).'),
                        body: 'onDebugInitialConfigurations',
                    },
                    {
                        label: 'onDebugDynamicConfigurations',
                        description: nls.localize('vscode.extension.activationEvents.onDebugDynamicConfigurations', 'An activation event emitted whenever a list of all debug configurations needs to be created (and all provideDebugConfigurations methods for the "dynamic" scope need to be called).'),
                        body: 'onDebugDynamicConfigurations',
                    },
                    {
                        label: 'onDebugResolve',
                        description: nls.localize('vscode.extension.activationEvents.onDebugResolve', 'An activation event emitted whenever a debug session with the specific type is about to be launched (and a corresponding resolveDebugConfiguration method needs to be called).'),
                        body: 'onDebugResolve:${6:type}',
                    },
                    {
                        label: 'onDebugAdapterProtocolTracker',
                        description: nls.localize('vscode.extension.activationEvents.onDebugAdapterProtocolTracker', 'An activation event emitted whenever a debug session with the specific type is about to be launched and a debug protocol tracker might be needed.'),
                        body: 'onDebugAdapterProtocolTracker:${6:type}',
                    },
                    {
                        label: 'workspaceContains',
                        description: nls.localize('vscode.extension.activationEvents.workspaceContains', 'An activation event emitted whenever a folder is opened that contains at least a file matching the specified glob pattern.'),
                        body: 'workspaceContains:${4:filePattern}',
                    },
                    {
                        label: 'onStartupFinished',
                        description: nls.localize('vscode.extension.activationEvents.onStartupFinished', 'An activation event emitted after the start-up finished (after all `*` activated extensions have finished activating).'),
                        body: 'onStartupFinished',
                    },
                    {
                        label: 'onTaskType',
                        description: nls.localize('vscode.extension.activationEvents.onTaskType', 'An activation event emitted whenever tasks of a certain type need to be listed or resolved.'),
                        body: 'onTaskType:${1:taskType}',
                    },
                    {
                        label: 'onFileSystem',
                        description: nls.localize('vscode.extension.activationEvents.onFileSystem', 'An activation event emitted whenever a file or folder is accessed with the given scheme.'),
                        body: 'onFileSystem:${1:scheme}',
                    },
                    {
                        label: 'onEditSession',
                        description: nls.localize('vscode.extension.activationEvents.onEditSession', 'An activation event emitted whenever an edit session is accessed with the given scheme.'),
                        body: 'onEditSession:${1:scheme}',
                    },
                    {
                        label: 'onSearch',
                        description: nls.localize('vscode.extension.activationEvents.onSearch', 'An activation event emitted whenever a search is started in the folder with the given scheme.'),
                        body: 'onSearch:${7:scheme}',
                    },
                    {
                        label: 'onView',
                        body: 'onView:${5:viewId}',
                        description: nls.localize('vscode.extension.activationEvents.onView', 'An activation event emitted whenever the specified view is expanded.'),
                    },
                    {
                        label: 'onUri',
                        body: 'onUri',
                        description: nls.localize('vscode.extension.activationEvents.onUri', 'An activation event emitted whenever a system-wide Uri directed towards this extension is open.'),
                    },
                    {
                        label: 'onOpenExternalUri',
                        body: 'onOpenExternalUri',
                        description: nls.localize('vscode.extension.activationEvents.onOpenExternalUri', 'An activation event emitted whenever a external uri (such as an http or https link) is being opened.'),
                    },
                    {
                        label: 'onCustomEditor',
                        body: 'onCustomEditor:${9:viewType}',
                        description: nls.localize('vscode.extension.activationEvents.onCustomEditor', 'An activation event emitted whenever the specified custom editor becomes visible.'),
                    },
                    {
                        label: 'onNotebook',
                        body: 'onNotebook:${1:type}',
                        description: nls.localize('vscode.extension.activationEvents.onNotebook', 'An activation event emitted whenever the specified notebook document is opened.'),
                    },
                    {
                        label: 'onAuthenticationRequest',
                        body: 'onAuthenticationRequest:${11:authenticationProviderId}',
                        description: nls.localize('vscode.extension.activationEvents.onAuthenticationRequest', 'An activation event emitted whenever sessions are requested from the specified authentication provider.'),
                    },
                    {
                        label: 'onRenderer',
                        description: nls.localize('vscode.extension.activationEvents.onRenderer', 'An activation event emitted whenever a notebook output renderer is used.'),
                        body: 'onRenderer:${11:rendererId}',
                    },
                    {
                        label: 'onTerminalProfile',
                        body: 'onTerminalProfile:${1:terminalId}',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalProfile', 'An activation event emitted when a specific terminal profile is launched.'),
                    },
                    {
                        label: 'onTerminalQuickFixRequest',
                        body: 'onTerminalQuickFixRequest:${1:quickFixId}',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalQuickFixRequest', 'An activation event emitted when a command matches the selector associated with this ID'),
                    },
                    {
                        label: 'onWalkthrough',
                        body: 'onWalkthrough:${1:walkthroughID}',
                        description: nls.localize('vscode.extension.activationEvents.onWalkthrough', 'An activation event emitted when a specified walkthrough is opened.'),
                    },
                    {
                        label: 'onIssueReporterOpened',
                        body: 'onIssueReporterOpened',
                        description: nls.localize('vscode.extension.activationEvents.onIssueReporterOpened', 'An activation event emitted when the issue reporter is opened.'),
                    },
                    {
                        label: 'onChatParticipant',
                        body: 'onChatParticipant:${1:participantId}',
                        description: nls.localize('vscode.extension.activationEvents.onChatParticipant', 'An activation event emitted when the specified chat participant is invoked.'),
                    },
                    {
                        label: 'onLanguageModelTool',
                        body: 'onLanguageModelTool:${1:toolId}',
                        description: nls.localize('vscode.extension.activationEvents.onLanguageModelTool', 'An activation event emitted when the specified language model tool is invoked.'),
                    },
                    {
                        label: 'onTerminalCompletionsRequested',
                        body: 'onTerminalCompletionsRequested',
                        description: nls.localize('vscode.extension.activationEvents.onTerminalCompletionsRequested', 'An activation event emitted when terminal completions are requested.'),
                    },
                    {
                        label: 'onMcpCollection',
                        description: nls.localize('vscode.extension.activationEvents.onMcpCollection', 'An activation event emitted whenver a tool from the MCP server is requested.'),
                        body: 'onMcpCollection:${2:collectionId}',
                    },
                    {
                        label: '*',
                        description: nls.localize('vscode.extension.activationEvents.star', 'An activation event emitted on VS Code startup. To ensure a great end user experience, please use this activation event in your extension only when no other activation events combination works in your use-case.'),
                        body: '*',
                    },
                ],
            },
        },
        badges: {
            type: 'array',
            description: nls.localize('vscode.extension.badges', "Array of badges to display in the sidebar of the Marketplace's extension page."),
            items: {
                type: 'object',
                required: ['url', 'href', 'description'],
                properties: {
                    url: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.url', 'Badge image URL.'),
                    },
                    href: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.href', 'Badge link.'),
                    },
                    description: {
                        type: 'string',
                        description: nls.localize('vscode.extension.badges.description', 'Badge description.'),
                    },
                },
            },
        },
        markdown: {
            type: 'string',
            description: nls.localize('vscode.extension.markdown', 'Controls the Markdown rendering engine used in the Marketplace. Either github (default) or standard.'),
            enum: ['github', 'standard'],
            default: 'github',
        },
        qna: {
            default: 'marketplace',
            description: nls.localize('vscode.extension.qna', 'Controls the Q&A link in the Marketplace. Set to marketplace to enable the default Marketplace Q & A site. Set to a string to provide the URL of a custom Q & A site. Set to false to disable Q & A altogether.'),
            anyOf: [
                {
                    type: ['string', 'boolean'],
                    enum: ['marketplace', false],
                },
                {
                    type: 'string',
                },
            ],
        },
        extensionDependencies: {
            description: nls.localize('vscode.extension.extensionDependencies', 'Dependencies to other extensions. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp.'),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
            },
        },
        extensionPack: {
            description: nls.localize('vscode.extension.contributes.extensionPack', 'A set of extensions that can be installed together. The identifier of an extension is always ${publisher}.${name}. For example: vscode.csharp.'),
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
            },
        },
        extensionKind: {
            description: nls.localize('extensionKind', 'Define the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions run on the remote.'),
            type: 'array',
            items: extensionKindSchema,
            default: ['workspace'],
            defaultSnippets: [
                {
                    body: ['ui'],
                    description: nls.localize('extensionKind.ui', 'Define an extension which can run only on the local machine when connected to remote window.'),
                },
                {
                    body: ['workspace'],
                    description: nls.localize('extensionKind.workspace', 'Define an extension which can run only on the remote machine when connected remote window.'),
                },
                {
                    body: ['ui', 'workspace'],
                    description: nls.localize('extensionKind.ui-workspace', 'Define an extension which can run on either side, with a preference towards running on the local machine.'),
                },
                {
                    body: ['workspace', 'ui'],
                    description: nls.localize('extensionKind.workspace-ui', 'Define an extension which can run on either side, with a preference towards running on the remote machine.'),
                },
                {
                    body: [],
                    description: nls.localize('extensionKind.empty', 'Define an extension which cannot run in a remote context, neither on the local, nor on the remote machine.'),
                },
            ],
        },
        capabilities: {
            description: nls.localize('vscode.extension.capabilities', 'Declare the set of supported capabilities by the extension.'),
            type: 'object',
            properties: {
                virtualWorkspaces: {
                    description: nls.localize('vscode.extension.capabilities.virtualWorkspaces', 'Declares whether the extension should be enabled in virtual workspaces. A virtual workspace is a workspace which is not backed by any on-disk resources. When false, this extension will be automatically disabled in virtual workspaces. Default is true.'),
                    type: ['boolean', 'object'],
                    defaultSnippets: [
                        { label: 'limited', body: { supported: '${1:limited}', description: '${2}' } },
                        { label: 'false', body: { supported: false, description: '${2}' } },
                    ],
                    default: true.valueOf,
                    properties: {
                        supported: {
                            markdownDescription: nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported', 'Declares the level of support for virtual workspaces by the extension.'),
                            type: ['string', 'boolean'],
                            enum: ['limited', true, false],
                            enumDescriptions: [
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.limited', 'The extension will be enabled in virtual workspaces with some functionality disabled.'),
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.true', 'The extension will be enabled in virtual workspaces with all functionality enabled.'),
                                nls.localize('vscode.extension.capabilities.virtualWorkspaces.supported.false', 'The extension will not be enabled in virtual workspaces.'),
                            ],
                        },
                        description: {
                            type: 'string',
                            markdownDescription: nls.localize('vscode.extension.capabilities.virtualWorkspaces.description', 'A description of how virtual workspaces affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`.'),
                        },
                    },
                },
                untrustedWorkspaces: {
                    description: nls.localize('vscode.extension.capabilities.untrustedWorkspaces', 'Declares how the extension should be handled in untrusted workspaces.'),
                    type: 'object',
                    required: ['supported'],
                    defaultSnippets: [{ body: { supported: '${1:limited}', description: '${2}' } }],
                    properties: {
                        supported: {
                            markdownDescription: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported', 'Declares the level of support for untrusted workspaces by the extension.'),
                            type: ['string', 'boolean'],
                            enum: ['limited', true, false],
                            enumDescriptions: [
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.limited', 'The extension will be enabled in untrusted workspaces with some functionality disabled.'),
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.true', 'The extension will be enabled in untrusted workspaces with all functionality enabled.'),
                                nls.localize('vscode.extension.capabilities.untrustedWorkspaces.supported.false', 'The extension will not be enabled in untrusted workspaces.'),
                            ],
                        },
                        restrictedConfigurations: {
                            description: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.restrictedConfigurations', 'A list of configuration keys contributed by the extension that should not use workspace values in untrusted workspaces.'),
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                        description: {
                            type: 'string',
                            markdownDescription: nls.localize('vscode.extension.capabilities.untrustedWorkspaces.description', 'A description of how workspace trust affects the extensions behavior and why it is needed. This only applies when `supported` is not `true`.'),
                        },
                    },
                },
            },
        },
        sponsor: {
            description: nls.localize('vscode.extension.contributes.sponsor', 'Specify the location from where users can sponsor your extension.'),
            type: 'object',
            defaultSnippets: [{ body: { url: '${1:https:}' } }],
            properties: {
                url: {
                    description: nls.localize('vscode.extension.contributes.sponsor.url', 'URL from where users can sponsor your extension. It must be a valid URL with a HTTP or HTTPS protocol. Example value: https://github.com/sponsors/nvaccess'),
                    type: 'string',
                },
            },
        },
        scripts: {
            type: 'object',
            properties: {
                'vscode:prepublish': {
                    description: nls.localize('vscode.extension.scripts.prepublish', 'Script executed before the package is published as a VS Code extension.'),
                    type: 'string',
                },
                'vscode:uninstall': {
                    description: nls.localize('vscode.extension.scripts.uninstall', 'Uninstall hook for VS Code extension. Script that gets executed when the extension is completely uninstalled from VS Code which is when VS Code is restarted (shutdown and start) after the extension is uninstalled. Only Node scripts are supported.'),
                    type: 'string',
                },
            },
        },
        icon: {
            type: 'string',
            description: nls.localize('vscode.extension.icon', 'The path to a 128x128 pixel icon.'),
        },
        l10n: {
            type: 'string',
            description: nls.localize({
                key: 'vscode.extension.l10n',
                comment: ['{Locked="bundle.l10n._locale_.json"}', '{Locked="vscode.l10n API"}'],
            }, 'The relative path to a folder containing localization (bundle.l10n.*.json) files. Must be specified if you are using the vscode.l10n API.'),
        },
        pricing: {
            type: 'string',
            markdownDescription: nls.localize('vscode.extension.pricing', 'The pricing information for the extension. Can be Free (default) or Trial. For more details visit: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#extension-pricing-label'),
            enum: ['Free', 'Trial'],
            default: 'Free',
        },
    },
};
export class ExtensionsRegistryImpl {
    constructor() {
        this._extensionPoints = new Map();
    }
    registerExtensionPoint(desc) {
        if (this._extensionPoints.has(desc.extensionPoint)) {
            throw new Error('Duplicate extension point: ' + desc.extensionPoint);
        }
        const result = new ExtensionPoint(desc.extensionPoint, desc.defaultExtensionKind, desc.canHandleResolver);
        this._extensionPoints.set(desc.extensionPoint, result);
        if (desc.activationEventsGenerator) {
            ImplicitActivationEvents.register(desc.extensionPoint, desc.activationEventsGenerator);
        }
        schema.properties['contributes'].properties[desc.extensionPoint] = desc.jsonSchema;
        schemaRegistry.registerSchema(schemaId, schema);
        return result;
    }
    getExtensionPoints() {
        return Array.from(this._extensionPoints.values());
    }
}
const PRExtensions = {
    ExtensionsRegistry: 'ExtensionsRegistry',
};
Registry.add(PRExtensions.ExtensionsRegistry, new ExtensionsRegistryImpl());
export const ExtensionsRegistry = Registry.as(PRExtensions.ExtensionsRegistry);
schemaRegistry.registerSchema(schemaId, schema);
schemaRegistry.registerSchema(productSchemaId, {
    properties: {
        extensionEnabledApiProposals: {
            description: nls.localize('product.extensionEnabledApiProposals', 'API proposals that the respective extensions can freely use.'),
            type: 'object',
            properties: {},
            additionalProperties: {
                anyOf: [
                    {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'string',
                            enum: Object.keys(allApiProposals),
                            markdownEnumDescriptions: Object.values(allApiProposals).map((value) => value.proposal),
                        },
                    },
                ],
            },
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uc1JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFDckgsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLHNCQUFzQixHQUN0QixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sNkVBQTZFLENBQUE7QUFFcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRWxHLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTRCLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBRTFGLE1BQU0sT0FBTyx5QkFBeUI7SUFLckMsWUFDQyxjQUF1QyxFQUN2QyxTQUFnQyxFQUNoQyxnQkFBd0I7UUFFeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFn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