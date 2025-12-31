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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnNSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3JILE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUVOLG9CQUFvQixFQUNwQixzQkFBc0IsR0FDdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLDZFQUE2RSxDQUFBO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUVsRyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUE0QixVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtBQUUxRixNQUFNLE9BQU8seUJBQXlCO0lBS3JDLFlBQ0MsY0FBdUMsRUFDdkMsU0FBZ0MsRUFDaEMsZ0JBQXdCO1FBRXhCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FB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