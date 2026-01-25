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
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ExtensionsLocalizedLabel, IExtensionManagementService, IExtensionGalleryService, PreferencesLocalizedLabel, EXTENSION_INSTALL_SOURCE_CONTEXT, UseUnpkgResourceApiConfigKey, AllowedExtensionsConfigKey, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService, } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { VIEWLET_ID, IExtensionsWorkbenchService, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, WORKSPACE_RECOMMENDATIONS_VIEW_ID, AutoUpdateConfigurationKey, HasOutdatedExtensionsContext, SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID, THEME_ACTIONS_GROUP, INSTALL_ACTIONS_GROUP, OUTDATED_EXTENSIONS_VIEW_ID, CONTEXT_HAS_GALLERY, extensionsSearchActionsMenu, UPDATE_ACTIONS_GROUP, EXTENSIONS_CATEGORY, AutoRestartConfigurationKey, } from '../common/extensions.js';
import { InstallSpecificVersionOfExtensionAction, ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction, SetColorThemeAction, SetFileIconThemeAction, SetProductIconThemeAction, ClearLanguageAction, ToggleAutoUpdateForExtensionAction, ToggleAutoUpdatesForPublisherAction, TogglePreReleaseExtensionAction, InstallAnotherVersionAction, InstallAction, } from './extensionsActions.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ExtensionEditor } from './extensionEditor.js';
import { StatusUpdater, MaliciousExtensionChecker, ExtensionsViewletViewsContribution, ExtensionsViewPaneContainer, BuiltInExtensionsContext, SearchMarketplaceExtensionsContext, RecommendedExtensionsContext, DefaultViewsContext, ExtensionsSortByContext, SearchHasTextContext, ExtensionsSearchValueContext, } from './extensionsViewlet.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ExtensionsConfigurationSchema, ExtensionsConfigurationSchemaId, } from '../common/extensionsFileTemplate.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { KeymapExtensions } from '../common/extensionsUtils.js';
import { areSameExtensions, getIdAndVersion, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtensionActivationProgress } from './extensionsActivationProgress.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ExtensionDependencyChecker } from './extensionsDependencyChecker.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { InstallExtensionQuickAccessProvider, ManageExtensionsQuickAccessProvider, } from './extensionsQuickAccess.js';
import { ExtensionRecommendationsService } from './extensionRecommendationsService.js';
import { CONTEXT_SYNC_ENABLEMENT } from '../../../services/userDataSync/common/userDataSync.js';
import { CopyAction, CutAction, PasteAction, } from '../../../../editor/contrib/clipboard/browser/clipboard.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ExtensionsWorkbenchService } from './extensionsWorkbenchService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationService } from './extensionRecommendationNotificationService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ResourceContextKey, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWorkspaceExtensionsConfigService } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { Schemas } from '../../../../base/common/network.js';
import { ShowRuntimeExtensionsAction } from './abstractRuntimeExtensionsEditor.js';
import { ExtensionEnablementWorkspaceTrustTransitionParticipant } from './extensionEnablementWorkspaceTrustTransitionParticipant.js';
import { clearSearchResultsIcon, configureRecommendedIcon, extensionsViewIcon, filterIcon, installWorkspaceRecommendedIcon, refreshIcon, } from './extensionsIcons.js';
import { EXTENSION_CATEGORIES, } from '../../../../platform/extensions/common/extensions.js';
import { Disposable, DisposableStore, isDisposable, } from '../../../../base/common/lifecycle.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { Query } from '../common/extensionQuery.js';
import { EditorExtensions } from '../../../common/editor.js';
import { WORKSPACE_TRUST_EXTENSION_SUPPORT } from '../../../services/workspaces/common/workspaceTrust.js';
import { ExtensionsCompletionItemsProvider } from './extensionsCompletionItemsProvider.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Event } from '../../../../base/common/event.js';
import { UnsupportedExtensionsMigrationContrib } from './unsupportedExtensionsMigrationContribution.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { ExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { CONTEXT_KEYBINDINGS_EDITOR } from '../../preferences/common/preferences.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Extensions as ConfigurationMigrationExtensions, } from '../../../common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import product from '../../../../platform/product/common/product.js';
import { ExtensionGalleryServiceUrlConfigKey, getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService, } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
// Singletons
registerSingleton(IExtensionsWorkbenchService, ExtensionsWorkbenchService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionRecommendationNotificationService, ExtensionRecommendationNotificationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionRecommendationsService, ExtensionRecommendationsService, 0 /* InstantiationType.Eager */);
// Quick Access
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: ManageExtensionsQuickAccessProvider,
    prefix: ManageExtensionsQuickAccessProvider.PREFIX,
    placeholder: localize('manageExtensionsQuickAccessPlaceholder', 'Press Enter to manage extensions.'),
    helpEntries: [{ description: localize('manageExtensionsHelp', 'Manage Extensions') }],
});
// Editor
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ExtensionEditor, ExtensionEditor.ID, localize('extension', 'Extension')), [new SyncDescriptor(ExtensionsInput)]);
Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: localize2('extensions', 'Extensions'),
    openCommandActionDescriptor: {
        id: VIEWLET_ID,
        mnemonicTitle: localize({ key: 'miViewExtensions', comment: ['&& denotes a mnemonic'] }, 'E&&xtensions'),
        keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 54 /* KeyCode.KeyX */ },
        order: 4,
    },
    ctorDescriptor: new SyncDescriptor(ExtensionsViewPaneContainer),
    icon: extensionsViewIcon,
    order: 4,
    rejectAddedViews: true,
    alwaysUseContainerInfo: true,
}, 0 /* ViewContainerLocation.Sidebar */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'extensions',
    order: 30,
    title: localize('extensionsConfigurationTitle', 'Extensions'),
    type: 'object',
    properties: {
        'extensions.autoUpdate': {
            enum: [true, 'onlyEnabledExtensions', false],
            enumItemLabels: [
                localize('all', 'All Extensions'),
                localize('enabled', 'Only Enabled Extensions'),
                localize('none', 'None'),
            ],
            enumDescriptions: [
                localize('extensions.autoUpdate.true', 'Download and install updates automatically for all extensions.'),
                localize('extensions.autoUpdate.enabled', 'Download and install updates automatically only for enabled extensions.'),
                localize('extensions.autoUpdate.false', 'Extensions are not automatically updated.'),
            ],
            description: localize('extensions.autoUpdate', 'Controls the automatic update behavior of extensions. The updates are fetched from a Microsoft online service.'),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices'],
        },
        'extensions.autoCheckUpdates': {
            type: 'boolean',
            description: localize('extensionsCheckUpdates', 'When enabled, automatically checks extensions for updates. If an extension has an update, it is marked as outdated in the Extensions view. The updates are fetched from a Microsoft online service.'),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices'],
        },
        'extensions.ignoreRecommendations': {
            type: 'boolean',
            description: localize('extensionsIgnoreRecommendations', 'When enabled, the notifications for extension recommendations will not be shown.'),
            default: false,
        },
        'extensions.showRecommendationsOnlyOnDemand': {
            type: 'boolean',
            deprecationMessage: localize('extensionsShowRecommendationsOnlyOnDemand_Deprecated', "This setting is deprecated. Use extensions.ignoreRecommendations setting to control recommendation notifications. Use Extensions view's visibility actions to hide Recommended view by default."),
            default: false,
            tags: ['usesOnlineServices'],
        },
        'extensions.closeExtensionDetailsOnViewChange': {
            type: 'boolean',
            description: localize('extensionsCloseExtensionDetailsOnViewChange', 'When enabled, editors with extension details will be automatically closed upon navigating away from the Extensions View.'),
            default: false,
        },
        'extensions.confirmedUriHandlerExtensionIds': {
            type: 'array',
            items: {
                type: 'string',
            },
            description: localize('handleUriConfirmedExtensions', 'When an extension is listed here, a confirmation prompt will not be shown when that extension handles a URI.'),
            default: [],
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        'extensions.webWorker': {
            type: ['boolean', 'string'],
            enum: [true, false, 'auto'],
            enumDescriptions: [
                localize('extensionsWebWorker.true', 'The Web Worker Extension Host will always be launched.'),
                localize('extensionsWebWorker.false', 'The Web Worker Extension Host will never be launched.'),
                localize('extensionsWebWorker.auto', 'The Web Worker Extension Host will be launched when a web extension needs it.'),
            ],
            description: localize('extensionsWebWorker', 'Enable web worker extension host.'),
            default: 'auto',
        },
        'extensions.supportVirtualWorkspaces': {
            type: 'object',
            markdownDescription: localize('extensions.supportVirtualWorkspaces', 'Override the virtual workspaces support of an extension.'),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'boolean',
                    default: false,
                },
            },
            additionalProperties: false,
            default: {},
            defaultSnippets: [
                {
                    body: {
                        'pub.name': false,
                    },
                },
            ],
        },
        'extensions.experimental.affinity': {
            type: 'object',
            markdownDescription: localize('extensions.affinity', 'Configure an extension to execute in a different extension host process.'),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'integer',
                    default: 1,
                },
            },
            additionalProperties: false,
            default: {},
            defaultSnippets: [
                {
                    body: {
                        'pub.name': 1,
                    },
                },
            ],
        },
        [WORKSPACE_TRUST_EXTENSION_SUPPORT]: {
            type: 'object',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: localize('extensions.supportUntrustedWorkspaces', 'Override the untrusted workspace support of an extension. Extensions using `true` will always be enabled. Extensions using `limited` will always be enabled, and the extension will hide functionality that requires trust. Extensions using `false` will only be enabled only when the workspace is trusted.'),
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: 'object',
                    properties: {
                        supported: {
                            type: ['boolean', 'string'],
                            enum: [true, false, 'limited'],
                            enumDescriptions: [
                                localize('extensions.supportUntrustedWorkspaces.true', 'Extension will always be enabled.'),
                                localize('extensions.supportUntrustedWorkspaces.false', 'Extension will only be enabled only when the workspace is trusted.'),
                                localize('extensions.supportUntrustedWorkspaces.limited', 'Extension will always be enabled, and the extension will hide functionality requiring trust.'),
                            ],
                            description: localize('extensions.supportUntrustedWorkspaces.supported', 'Defines the untrusted workspace support setting for the extension.'),
                        },
                        version: {
                            type: 'string',
                            description: localize('extensions.supportUntrustedWorkspaces.version', 'Defines the version of the extension for which the override should be applied. If not specified, the override will be applied independent of the extension version.'),
                        },
                    },
                },
            },
        },
        'extensions.experimental.deferredStartupFinishedActivation': {
            type: 'boolean',
            description: localize('extensionsDeferredStartupFinishedActivation', 'When enabled, extensions which declare the `onStartupFinished` activation event will be activated after a timeout.'),
            default: false,
        },
        'extensions.experimental.issueQuickAccess': {
            type: 'boolean',
            description: localize('extensionsInQuickAccess', 'When enabled, extensions can be searched for via Quick Access and report issues from there.'),
            default: true,
        },
        'extensions.verifySignature': {
            type: 'boolean',
            description: localize('extensions.verifySignature', 'When enabled, extensions are verified to be signed before getting installed.'),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            included: isNative,
        },
        [AutoRestartConfigurationKey]: {
            type: 'boolean',
            description: localize('autoRestart', 'If activated, extensions will automatically restart following an update if the window is not in focus. There can be a data loss if you have open Notebooks or Custom Editors.'),
            default: false,
            included: product.quality !== 'stable',
        },
        [UseUnpkgResourceApiConfigKey]: {
            type: 'boolean',
            description: localize('extensions.gallery.useUnpkgResourceApi', 'When enabled, extensions to update are fetched from Unpkg service.'),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['onExp', 'usesOnlineServices'],
        },
        [ExtensionGalleryServiceUrlConfigKey]: {
            type: 'string',
            description: localize('extensions.gallery.serviceUrl', 'Configure the Marketplace service URL to connect to'),
            default: '',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices'],
            included: false,
            policy: {
                name: 'ExtensionGalleryServiceUrl',
                minimumVersion: '1.99',
            },
        },
        [AllowedExtensionsConfigKey]: {
            // Note: Type is set only to object because to support policies generation during build time, where single type is expected.
            type: 'object',
            markdownDescription: localize('extensions.allowed', 'Specify a list of extensions that are allowed to use. This helps maintain a secure and consistent development environment by restricting the use of unauthorized extensions. For more information on how to configure this setting, please visit the [Configure Allowed Extensions](https://code.visualstudio.com/docs/setup/enterprise#_configure-allowed-extensions) section.'),
            default: '*',
            defaultSnippets: [
                {
                    body: {},
                    description: localize('extensions.allowed.none', 'No extensions are allowed.'),
                },
                {
                    body: {
                        '*': true,
                    },
                    description: localize('extensions.allowed.all', 'All extensions are allowed.'),
                },
            ],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            policy: {
                name: 'AllowedExtensions',
                minimumVersion: '1.96',
                description: localize('extensions.allowed.policy', 'Specify a list of extensions that are allowed to use. This helps maintain a secure and consistent development environment by restricting the use of unauthorized extensions. More information: https://code.visualstudio.com/docs/setup/enterprise#_configure-allowed-extensions'),
            },
            additionalProperties: false,
            patternProperties: {
                '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    anyOf: [
                        {
                            type: ['boolean', 'string'],
                            enum: [true, false, 'stable'],
                            description: localize('extensions.allow.description', 'Allow or disallow the extension.'),
                            enumDescriptions: [
                                localize('extensions.allowed.enable.desc', 'Extension is allowed.'),
                                localize('extensions.allowed.disable.desc', 'Extension is not allowed.'),
                                localize('extensions.allowed.disable.stable.desc', 'Allow only stable versions of the extension.'),
                            ],
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: localize('extensions.allow.version.description', 'Allow or disallow specific versions of the extension. To specifcy a platform specific version, use the format `platform@1.2.3`, e.g. `win32-x64@1.2.3`. Supported platforms are `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `linux-armhf`, `alpine-x64`, `alpine-arm64`, `darwin-x64`, `darwin-arm64`'),
                        },
                    ],
                },
                '([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
                    type: ['boolean', 'string'],
                    enum: [true, false, 'stable'],
                    description: localize('extension.publisher.allow.description', 'Allow or disallow all extensions from the publisher.'),
                    enumDescriptions: [
                        localize('extensions.publisher.allowed.enable.desc', 'All extensions from the publisher are allowed.'),
                        localize('extensions.publisher.allowed.disable.desc', 'All extensions from the publisher are not allowed.'),
                        localize('extensions.publisher.allowed.disable.stable.desc', 'Allow only stable versions of the extensions from the publisher.'),
                    ],
                },
                '\\*': {
                    type: 'boolean',
                    enum: [true, false],
                    description: localize('extensions.allow.all.description', 'Allow or disallow all extensions.'),
                    enumDescriptions: [
                        localize('extensions.allow.all.enable', 'Allow all extensions.'),
                        localize('extensions.allow.all.disable', 'Disallow all extensions.'),
                    ],
                },
            },
        },
    },
});
const jsonRegistry = (Registry.as(jsonContributionRegistry.Extensions.JSONContribution));
jsonRegistry.registerSchema(ExtensionsConfigurationSchemaId, ExtensionsConfigurationSchema);
// Register Commands
CommandsRegistry.registerCommand('_extensions.manage', (accessor, extensionId, tab, preserveFocus, feature) => {
    const extensionService = accessor.get(IExtensionsWorkbenchService);
    const extension = extensionService.local.find((e) => areSameExtensions(e.identifier, { id: extensionId }));
    if (extension) {
        extensionService.open(extension, { tab, preserveFocus, feature });
    }
    else {
        throw new Error(localize('notFound', "Extension '{0}' not found.", extensionId));
    }
});
CommandsRegistry.registerCommand('extension.open', async (accessor, extensionId, tab, preserveFocus, feature, sideByside) => {
    const extensionService = accessor.get(IExtensionsWorkbenchService);
    const commandService = accessor.get(ICommandService);
    const [extension] = await extensionService.getExtensions([{ id: extensionId }], CancellationToken.None);
    if (extension) {
        return extensionService.open(extension, { tab, preserveFocus, feature, sideByside });
    }
    return commandService.executeCommand('_extensions.manage', extensionId, tab, preserveFocus, feature);
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.installExtension',
    metadata: {
        description: localize('workbench.extensions.installExtension.description', 'Install the given extension'),
        args: [
            {
                name: 'extensionIdOrVSIXUri',
                description: localize('workbench.extensions.installExtension.arg.decription', 'Extension id or VSIX resource uri'),
                constraint: (value) => typeof value === 'string' || value instanceof URI,
            },
            {
                name: 'options',
                description: '(optional) Options for installing the extension. Object with the following properties: ' +
                    '`installOnlyNewlyAddedFromExtensionPackVSIX`: When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only when installing VSIX. ',
                isOptional: true,
                schema: {
                    type: 'object',
                    properties: {
                        installOnlyNewlyAddedFromExtensionPackVSIX: {
                            type: 'boolean',
                            description: localize('workbench.extensions.installExtension.option.installOnlyNewlyAddedFromExtensionPackVSIX', 'When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only while installing a VSIX.'),
                            default: false,
                        },
                        installPreReleaseVersion: {
                            type: 'boolean',
                            description: localize('workbench.extensions.installExtension.option.installPreReleaseVersion', 'When enabled, VS Code installs the pre-release version of the extension if available.'),
                            default: false,
                        },
                        donotSync: {
                            type: 'boolean',
                            description: localize('workbench.extensions.installExtension.option.donotSync', 'When enabled, VS Code do not sync this extension when Settings Sync is on.'),
                            default: false,
                        },
                        justification: {
                            type: ['string', 'object'],
                            description: localize('workbench.extensions.installExtension.option.justification', "Justification for installing the extension. This is a string or an object that can be used to pass any information to the installation handlers. i.e. `{reason: 'This extension wants to open a URI', action: 'Open URI'}` will show a message box with the reason and action upon install."),
                        },
                        enable: {
                            type: 'boolean',
                            description: localize('workbench.extensions.installExtension.option.enable', 'When enabled, the extension will be enabled if it is installed but disabled. If the extension is already enabled, this has no effect.'),
                            default: false,
                        },
                        context: {
                            type: 'object',
                            description: localize('workbench.extensions.installExtension.option.context', 'Context for the installation. This is a JSON object that can be used to pass any information to the installation handlers. i.e. `{skipWalkthrough: true}` will skip opening the walkthrough upon install.'),
                        },
                    },
                },
            },
        ],
    },
    handler: async (accessor, arg, options) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        try {
            if (typeof arg === 'string') {
                const [id, version] = getIdAndVersion(arg);
                const extension = extensionsWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id, uuid: version }));
                if (extension?.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                    const [gallery] = await extensionGalleryService.getExtensions([{ id, preRelease: options?.installPreReleaseVersion }], CancellationToken.None);
                    if (!gallery) {
                        throw new Error(localize('notFound', "Extension '{0}' not found.", arg));
                    }
                    await extensionManagementService.installFromGallery(gallery, {
                        isMachineScoped: options?.donotSync
                            ? true
                            : undefined /* do not allow syncing extensions automatically while installing through the command */,
                        installPreReleaseVersion: options?.installPreReleaseVersion,
                        installGivenVersion: !!version,
                        context: {
                            ...options?.context,
                            [EXTENSION_INSTALL_SOURCE_CONTEXT]: "command" /* ExtensionInstallSource.COMMAND */,
                        },
                    });
                }
                else {
                    await extensionsWorkbenchService.install(arg, {
                        version,
                        installPreReleaseVersion: options?.installPreReleaseVersion,
                        context: {
                            ...options?.context,
                            [EXTENSION_INSTALL_SOURCE_CONTEXT]: "command" /* ExtensionInstallSource.COMMAND */,
                        },
                        justification: options?.justification,
                        enable: options?.enable,
                        isMachineScoped: options?.donotSync
                            ? true
                            : undefined /* do not allow syncing extensions automatically while installing through the command */,
                    }, 15 /* ProgressLocation.Notification */);
                }
            }
            else {
                const vsix = URI.revive(arg);
                await extensionsWorkbenchService.install(vsix, { installGivenVersion: true });
            }
        }
        catch (e) {
            onUnexpectedError(e);
            throw e;
        }
    },
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.uninstallExtension',
    metadata: {
        description: localize('workbench.extensions.uninstallExtension.description', 'Uninstall the given extension'),
        args: [
            {
                name: localize('workbench.extensions.uninstallExtension.arg.name', 'Id of the extension to uninstall'),
                schema: {
                    type: 'string',
                },
            },
        ],
    },
    handler: async (accessor, id) => {
        if (!id) {
            throw new Error(localize('id required', 'Extension id required.'));
        }
        const extensionManagementService = accessor.get(IExtensionManagementService);
        const installed = await extensionManagementService.getInstalled();
        const [extensionToUninstall] = installed.filter((e) => areSameExtensions(e.identifier, { id }));
        if (!extensionToUninstall) {
            throw new Error(localize('notInstalled', "Extension '{0}' is not installed. Make sure you use the full extension ID, including the publisher, e.g.: ms-dotnettools.csharp.", id));
        }
        if (extensionToUninstall.isBuiltin) {
            throw new Error(localize('builtin', "Extension '{0}' is a Built-in extension and cannot be installed", id));
        }
        try {
            await extensionManagementService.uninstall(extensionToUninstall);
        }
        catch (e) {
            onUnexpectedError(e);
            throw e;
        }
    },
});
CommandsRegistry.registerCommand({
    id: 'workbench.extensions.search',
    metadata: {
        description: localize('workbench.extensions.search.description', 'Search for a specific extension'),
        args: [
            {
                name: localize('workbench.extensions.search.arg.name', 'Query to use in search'),
                schema: { type: 'string' },
            },
        ],
    },
    handler: async (accessor, query = '') => {
        return accessor.get(IExtensionsWorkbenchService).openSearch(query);
    },
});
function overrideActionForActiveExtensionEditorWebview(command, f) {
    command?.addImplementation(105, 'extensions-editor', (accessor) => {
        const editorService = accessor.get(IEditorService);
        const editor = editorService.activeEditorPane;
        if (editor instanceof ExtensionEditor) {
            if (editor.activeWebview?.isFocused) {
                f(editor.activeWebview);
                return true;
            }
        }
        return false;
    });
}
overrideActionForActiveExtensionEditorWebview(CopyAction, (webview) => webview.copy());
overrideActionForActiveExtensionEditorWebview(CutAction, (webview) => webview.cut());
overrideActionForActiveExtensionEditorWebview(PasteAction, (webview) => webview.paste());
// Contexts
export const CONTEXT_HAS_LOCAL_SERVER = new RawContextKey('hasLocalServer', false);
export const CONTEXT_HAS_REMOTE_SERVER = new RawContextKey('hasRemoteServer', false);
export const CONTEXT_HAS_WEB_SERVER = new RawContextKey('hasWebServer', false);
const CONTEXT_GALLERY_SORT_CAPABILITIES = new RawContextKey('gallerySortCapabilities', '');
const CONTEXT_GALLERY_FILTER_CAPABILITIES = new RawContextKey('galleryFilterCapabilities', '');
const CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED = new RawContextKey('galleryAllRepositorySigned', false);
const CONTEXT_GALLERY_HAS_EXTENSION_LINK = new RawContextKey('galleryHasExtensionLink', false);
async function runAction(action) {
    try {
        await action.run();
    }
    finally {
        if (isDisposable(action)) {
            action.dispose();
        }
    }
}
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionManagementServerService, extensionGalleryService, extensionGalleryManifestService, contextKeyService, viewsService, extensionsWorkbenchService, extensionEnablementService, instantiationService, dialogService, commandService, productService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.contextKeyService = contextKeyService;
        this.viewsService = viewsService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.productService = productService;
        const hasGalleryContext = CONTEXT_HAS_GALLERY.bindTo(contextKeyService);
        if (extensionGalleryService.isEnabled()) {
            hasGalleryContext.set(true);
        }
        const hasLocalServerContext = CONTEXT_HAS_LOCAL_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            hasLocalServerContext.set(true);
        }
        const hasRemoteServerContext = CONTEXT_HAS_REMOTE_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            hasRemoteServerContext.set(true);
        }
        const hasWebServerContext = CONTEXT_HAS_WEB_SERVER.bindTo(contextKeyService);
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            hasWebServerContext.set(true);
        }
        extensionGalleryManifestService
            .getExtensionGalleryManifest()
            .then((extensionGalleryManifest) => {
            this.registerGalleryCapabilitiesContexts(extensionGalleryManifest);
            this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifest((extensionGalleryManifest) => this.registerGalleryCapabilitiesContexts(extensionGalleryManifest)));
        });
        this.registerGlobalActions();
        this.registerContextMenuActions();
        this.registerQuickAccessProvider();
    }
    async registerGalleryCapabilitiesContexts(extensionGalleryManifest) {
        CONTEXT_GALLERY_SORT_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.sorting?.map((s) => s.name)?.join('_')}_UpdateDate_`);
        CONTEXT_GALLERY_FILTER_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.filtering?.map((s) => s.name)?.join('_')}_`);
        CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED.bindTo(this.contextKeyService).set(!!extensionGalleryManifest?.capabilities?.signing?.allRepositorySigned);
        CONTEXT_GALLERY_HAS_EXTENSION_LINK.bindTo(this.contextKeyService).set(!!(extensionGalleryManifest &&
            getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */)));
    }
    registerQuickAccessProvider() {
        if (this.extensionManagementServerService.localExtensionManagementServer ||
            this.extensionManagementServerService.remoteExtensionManagementServer ||
            this.extensionManagementServerService.webExtensionManagementServer) {
            Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
                ctor: InstallExtensionQuickAccessProvider,
                prefix: InstallExtensionQuickAccessProvider.PREFIX,
                placeholder: localize('installExtensionQuickAccessPlaceholder', 'Type the name of an extension to install or search.'),
                helpEntries: [
                    {
                        description: localize('installExtensionQuickAccessHelp', 'Install or Search Extensions'),
                    },
                ],
            });
        }
    }
    // Global actions
    registerGlobalActions() {
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id: VIEWLET_ID,
                title: localize({ key: 'miPreferencesExtensions', comment: ['&& denotes a mnemonic'] }, '&&Extensions'),
            },
            group: '2_configuration',
            order: 3,
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            command: {
                id: VIEWLET_ID,
                title: localize('showExtensions', 'Extensions'),
            },
            group: '2_configuration',
            order: 3,
        }));
        this.registerExtensionAction({
            id: 'workbench.extensions.action.focusExtensionsView',
            title: localize2('focusExtensions', 'Focus on Extensions View'),
            category: ExtensionsLocalizedLabel,
            f1: true,
            run: async (accessor) => {
                await accessor.get(IExtensionsWorkbenchService).openSearch('');
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installExtensions',
            title: localize2('installExtensions', 'Install Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
            },
            run: async (accessor) => {
                accessor.get(IViewsService).openViewContainer(VIEWLET_ID, true);
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showRecommendedKeymapExtensions',
            title: localize2('showRecommendedKeymapExtensionsShort', 'Keymaps'),
            category: PreferencesLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY,
                },
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_HAS_GALLERY),
                    group: '2_keyboard_discover_actions',
                },
            ],
            menuTitles: {
                [MenuId.EditorTitle.id]: localize('importKeyboardShortcutsFroms', 'Migrate Keyboard Shortcuts from...'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended:keymaps '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showLanguageExtensions',
            title: localize2('showLanguageExtensionsShort', 'Language Extensions'),
            category: PreferencesLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: CONTEXT_HAS_GALLERY,
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended:languages '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.checkForUpdates',
            title: localize2('checkForUpdates', 'Check for Extension Updates'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_HAS_GALLERY),
                    group: '1_updates',
                    order: 1,
                },
            ],
            run: async () => {
                await this.extensionsWorkbenchService.checkForUpdates();
                const outdated = this.extensionsWorkbenchService.outdated;
                if (outdated.length) {
                    return this.extensionsWorkbenchService.openSearch('@outdated ');
                }
                else {
                    return this.dialogService.info(localize('noUpdatesAvailable', 'All extensions are up to date.'));
                }
            },
        });
        const enableAutoUpdateWhenCondition = ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false);
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAutoUpdate',
            title: localize2('enableAutoUpdate', 'Enable Auto Update for All Extensions'),
            category: ExtensionsLocalizedLabel,
            precondition: enableAutoUpdateWhenCondition,
            menu: [
                {
                    id: MenuId.ViewContainerTitle,
                    order: 5,
                    group: '1_updates',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), enableAutoUpdateWhenCondition),
                },
                {
                    id: MenuId.CommandPalette,
                },
            ],
            run: (accessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(true),
        });
        const disableAutoUpdateWhenCondition = ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, false);
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAutoUpdate',
            title: localize2('disableAutoUpdate', 'Disable Auto Update for All Extensions'),
            precondition: disableAutoUpdateWhenCondition,
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.ViewContainerTitle,
                    order: 5,
                    group: '1_updates',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), disableAutoUpdateWhenCondition),
                },
                {
                    id: MenuId.CommandPalette,
                },
            ],
            run: (accessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(false),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.updateAllExtensions',
            title: localize2('updateAll', 'Update All Extensions'),
            category: ExtensionsLocalizedLabel,
            precondition: HasOutdatedExtensionsContext,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(ContextKeyExpr.has(`config.${AutoUpdateConfigurationKey}`).negate(), ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'))),
                    group: '1_updates',
                    order: 2,
                },
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', OUTDATED_EXTENSIONS_VIEW_ID),
                    group: 'navigation',
                    order: 1,
                },
            ],
            icon: installWorkspaceRecommendedIcon,
            run: async () => {
                await this.extensionsWorkbenchService.updateAll();
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAll',
            title: localize2('enableAll', 'Enable All Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                    group: '2_enablement',
                    order: 1,
                },
            ],
            run: async () => {
                const extensionsToEnable = this.extensionsWorkbenchService.local.filter((e) => !!e.local &&
                    this.extensionEnablementService.canChangeEnablement(e.local) &&
                    !this.extensionEnablementService.isEnabled(e.local));
                if (extensionsToEnable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, 11 /* EnablementState.EnabledGlobally */);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.enableAllWorkspace',
            title: localize2('enableAllWorkspace', 'Enable All Extensions for this Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
            },
            run: async () => {
                const extensionsToEnable = this.extensionsWorkbenchService.local.filter((e) => !!e.local &&
                    this.extensionEnablementService.canChangeEnablement(e.local) &&
                    !this.extensionEnablementService.isEnabled(e.local));
                if (extensionsToEnable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, 12 /* EnablementState.EnabledWorkspace */);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAll',
            title: localize2('disableAll', 'Disable All Installed Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                    group: '2_enablement',
                    order: 2,
                },
            ],
            run: async () => {
                const extensionsToDisable = this.extensionsWorkbenchService.local.filter((e) => !e.isBuiltin &&
                    !!e.local &&
                    this.extensionEnablementService.isEnabled(e.local) &&
                    this.extensionEnablementService.canChangeEnablement(e.local));
                if (extensionsToDisable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, 9 /* EnablementState.DisabledGlobally */);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.disableAllWorkspace',
            title: localize2('disableAllWorkspace', 'Disable All Installed Extensions for this Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
            },
            run: async () => {
                const extensionsToDisable = this.extensionsWorkbenchService.local.filter((e) => !e.isBuiltin &&
                    !!e.local &&
                    this.extensionEnablementService.isEnabled(e.local) &&
                    this.extensionEnablementService.canChangeEnablement(e.local));
                if (extensionsToDisable.length) {
                    await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, 10 /* EnablementState.DisabledWorkspace */);
                }
            },
        });
        this.registerExtensionAction({
            id: SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID,
            title: localize2('InstallFromVSIX', 'Install from VSIX...'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
                    group: '3_install',
                    order: 1,
                },
            ],
            run: async (accessor) => {
                const fileDialogService = accessor.get(IFileDialogService);
                const commandService = accessor.get(ICommandService);
                const vsixPaths = await fileDialogService.showOpenDialog({
                    title: localize('installFromVSIX', 'Install from VSIX'),
                    filters: [{ name: 'VSIX Extensions', extensions: ['vsix'] }],
                    canSelectFiles: true,
                    canSelectMany: true,
                    openLabel: mnemonicButtonLabel(localize({ key: 'installButton', comment: ['&& denotes a mnemonic'] }, '&&Install')),
                });
                if (vsixPaths) {
                    await commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixPaths);
                }
            },
        });
        this.registerExtensionAction({
            id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
            title: localize('installVSIX', 'Install Extension VSIX'),
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: 'extensions',
                    when: ContextKeyExpr.and(ResourceContextKey.Extension.isEqualTo('.vsix'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
                },
            ],
            run: async (accessor, resources) => {
                const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const hostService = accessor.get(IHostService);
                const notificationService = accessor.get(INotificationService);
                const vsixs = Array.isArray(resources) ? resources : [resources];
                const result = await Promise.allSettled(vsixs.map(async (vsix) => await extensionsWorkbenchService.install(vsix, { installGivenVersion: true })));
                let error, requireReload = false, requireRestart = false;
                for (const r of result) {
                    if (r.status === 'rejected') {
                        error = new Error(r.reason);
                        break;
                    }
                    requireReload =
                        requireReload ||
                            r.value.runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */;
                    requireRestart =
                        requireRestart ||
                            r.value.runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
                }
                if (error) {
                    throw error;
                }
                if (requireReload) {
                    notificationService.prompt(Severity.Info, vsixs.length > 1
                        ? localize('InstallVSIXs.successReload', 'Completed installing extensions. Please reload Visual Studio Code to enable them.')
                        : localize('InstallVSIXAction.successReload', 'Completed installing extension. Please reload Visual Studio Code to enable it.'), [
                        {
                            label: localize('InstallVSIXAction.reloadNow', 'Reload Now'),
                            run: () => hostService.reload(),
                        },
                    ]);
                }
                else if (requireRestart) {
                    notificationService.prompt(Severity.Info, vsixs.length > 1
                        ? localize('InstallVSIXs.successRestart', 'Completed installing extensions. Please restart extensions to enable them.')
                        : localize('InstallVSIXAction.successRestart', 'Completed installing extension. Please restart extensions to enable it.'), [
                        {
                            label: localize('InstallVSIXAction.restartExtensions', 'Restart Extensions'),
                            run: () => extensionsWorkbenchService.updateRunningExtensions(),
                        },
                    ]);
                }
                else {
                    notificationService.prompt(Severity.Info, vsixs.length > 1
                        ? localize('InstallVSIXs.successNoReload', 'Completed installing extensions.')
                        : localize('InstallVSIXAction.successNoReload', 'Completed installing extension.'), []);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installExtensionFromLocation',
            title: localize2('installExtensionFromLocation', 'Install Extension from Location...'),
            category: Categories.Developer,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_WEB_SERVER, CONTEXT_HAS_LOCAL_SERVER),
                },
            ],
            run: async (accessor) => {
                const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
                if (isWeb) {
                    return new Promise((c, e) => {
                        const quickInputService = accessor.get(IQuickInputService);
                        const disposables = new DisposableStore();
                        const quickPick = disposables.add(quickInputService.createQuickPick());
                        quickPick.title = localize('installFromLocation', 'Install Extension from Location');
                        quickPick.customButton = true;
                        quickPick.customLabel = localize('install button', 'Install');
                        quickPick.placeholder = localize('installFromLocationPlaceHolder', 'Location of the web extension');
                        quickPick.ignoreFocusOut = true;
                        disposables.add(Event.any(quickPick.onDidAccept, quickPick.onDidCustom)(async () => {
                            quickPick.hide();
                            if (quickPick.value) {
                                try {
                                    await extensionManagementService.installFromLocation(URI.parse(quickPick.value));
                                }
                                catch (error) {
                                    e(error);
                                    return;
                                }
                            }
                            c();
                        }));
                        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
                        quickPick.show();
                    });
                }
                else {
                    const fileDialogService = accessor.get(IFileDialogService);
                    const extensionLocation = await fileDialogService.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        title: localize('installFromLocation', 'Install Extension from Location'),
                    });
                    if (extensionLocation?.[0]) {
                        await extensionManagementService.installFromLocation(extensionLocation[0]);
                    }
                }
            },
        });
        const extensionsFilterSubMenu = new MenuId('extensionsFilterSubMenu');
        MenuRegistry.appendMenuItem(extensionsSearchActionsMenu, {
            submenu: extensionsFilterSubMenu,
            title: localize('filterExtensions', 'Filter Extensions...'),
            group: 'navigation',
            order: 2,
            icon: filterIcon,
        });
        const showFeaturedExtensionsId = 'extensions.filter.featured';
        const featuresExtensionsWhenContext = ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${"Featured" /* FilterType.Featured */}_`)));
        this.registerExtensionAction({
            id: showFeaturedExtensionsId,
            title: localize2('showFeaturedExtensions', 'Show Featured Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: featuresExtensionsWhenContext,
                },
                {
                    id: extensionsFilterSubMenu,
                    when: featuresExtensionsWhenContext,
                    group: '1_predefined',
                    order: 1,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('featured filter', 'Featured'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@featured '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showPopularExtensions',
            title: localize2('showPopularExtensions', 'Show Popular Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY,
                },
                {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('most popular filter', 'Most Popular'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@popular '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showRecommendedExtensions',
            title: localize2('showRecommendedExtensions', 'Show Recommended Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY,
                },
                {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('most popular recommended', 'Recommended'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recommended '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.recentlyPublishedExtensions',
            title: localize2('recentlyPublishedExtensions', 'Show Recently Published Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CONTEXT_HAS_GALLERY,
                },
                {
                    id: extensionsFilterSubMenu,
                    when: CONTEXT_HAS_GALLERY,
                    group: '1_predefined',
                    order: 2,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('recently published filter', 'Recently Published'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@recentlyPublished '),
        });
        const extensionsCategoryFilterSubMenu = new MenuId('extensionsCategoryFilterSubMenu');
        MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
            submenu: extensionsCategoryFilterSubMenu,
            title: localize('filter by category', 'Category'),
            when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${"Category" /* FilterType.Category */}_`))),
            group: '2_categories',
            order: 1,
        });
        EXTENSION_CATEGORIES.forEach((category, index) => {
            this.registerExtensionAction({
                id: `extensions.actions.searchByCategory.${category}`,
                title: category,
                menu: [
                    {
                        id: extensionsCategoryFilterSubMenu,
                        when: CONTEXT_HAS_GALLERY,
                        order: index,
                    },
                ],
                run: () => this.extensionsWorkbenchService.openSearch(`@category:"${category.toLowerCase()}"`),
            });
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.listBuiltInExtensions',
            title: localize2('showBuiltInExtensions', 'Show Built-in Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER),
                },
                {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 2,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('builtin filter', 'Built-in'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@builtin '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.extensionUpdates',
            title: localize2('extensionUpdates', 'Show Extension Updates'),
            category: ExtensionsLocalizedLabel,
            precondition: CONTEXT_HAS_GALLERY,
            f1: true,
            menu: [
                {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    when: CONTEXT_HAS_GALLERY,
                    order: 1,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('extension updates filter', 'Updates'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@updates'),
        });
        this.registerExtensionAction({
            id: LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID,
            title: localize2('showWorkspaceUnsupportedExtensions', 'Show Extensions Unsupported By Workspace'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
                },
                {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 5,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('workspace unsupported filter', 'Workspace Unsupported'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@workspaceUnsupported'),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showEnabledExtensions',
            title: localize2('showEnabledExtensions', 'Show Enabled Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER),
                },
                {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 3,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('enabled filter', 'Enabled'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@enabled '),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showDisabledExtensions',
            title: localize2('showDisabledExtensions', 'Show Disabled Extensions'),
            category: ExtensionsLocalizedLabel,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER),
                },
                {
                    id: extensionsFilterSubMenu,
                    group: '3_installed',
                    order: 4,
                },
            ],
            menuTitles: {
                [extensionsFilterSubMenu.id]: localize('disabled filter', 'Disabled'),
            },
            run: () => this.extensionsWorkbenchService.openSearch('@disabled '),
        });
        const extensionsSortSubMenu = new MenuId('extensionsSortSubMenu');
        MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
            submenu: extensionsSortSubMenu,
            title: localize('sorty by', 'Sort By'),
            when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext)),
            group: '4_sort',
            order: 1,
        });
        [
            {
                id: 'installs',
                title: localize('sort by installs', 'Install Count'),
                precondition: BuiltInExtensionsContext.negate(),
                sortCapability: "InstallCount" /* SortBy.InstallCount */,
            },
            {
                id: 'rating',
                title: localize('sort by rating', 'Rating'),
                precondition: BuiltInExtensionsContext.negate(),
                sortCapability: "WeightedRating" /* SortBy.WeightedRating */,
            },
            {
                id: 'name',
                title: localize('sort by name', 'Name'),
                precondition: BuiltInExtensionsContext.negate(),
                sortCapability: "Title" /* SortBy.Title */,
            },
            {
                id: 'publishedDate',
                title: localize('sort by published date', 'Published Date'),
                precondition: BuiltInExtensionsContext.negate(),
                sortCapability: "PublishedDate" /* SortBy.PublishedDate */,
            },
            {
                id: 'updateDate',
                title: localize('sort by update date', 'Updated Date'),
                precondition: ContextKeyExpr.and(SearchMarketplaceExtensionsContext.negate(), RecommendedExtensionsContext.negate(), BuiltInExtensionsContext.negate()),
                sortCapability: 'UpdateDate',
            },
        ].map(({ id, title, precondition, sortCapability }, index) => {
            const sortCapabilityContext = ContextKeyExpr.regex(CONTEXT_GALLERY_SORT_CAPABILITIES.key, new RegExp(`_${sortCapability}_`));
            this.registerExtensionAction({
                id: `extensions.sort.${id}`,
                title,
                precondition: ContextKeyExpr.and(precondition, ContextKeyExpr.regex(ExtensionsSearchValueContext.key, /^@feature:/).negate(), sortCapabilityContext),
                menu: [
                    {
                        id: extensionsSortSubMenu,
                        when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext), sortCapabilityContext),
                        order: index,
                    },
                ],
                toggled: ExtensionsSortByContext.isEqualTo(id),
                run: async () => {
                    const extensionsViewPaneContainer = (await this.viewsService.openViewContainer(VIEWLET_ID, true))?.getViewPaneContainer();
                    const currentQuery = Query.parse(extensionsViewPaneContainer?.searchValue ?? '');
                    extensionsViewPaneContainer?.search(new Query(currentQuery.value, id).toString());
                    extensionsViewPaneContainer?.focus();
                },
            });
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.clearExtensionsSearchResults',
            title: localize2('clearExtensionsSearchResults', 'Clear Extensions Search Results'),
            category: ExtensionsLocalizedLabel,
            icon: clearSearchResultsIcon,
            f1: true,
            precondition: SearchHasTextContext,
            menu: {
                id: extensionsSearchActionsMenu,
                group: 'navigation',
                order: 1,
            },
            run: async (accessor) => {
                const viewPaneContainer = accessor
                    .get(IViewsService)
                    .getActiveViewPaneContainerWithId(VIEWLET_ID);
                if (viewPaneContainer) {
                    const extensionsViewPaneContainer = viewPaneContainer;
                    extensionsViewPaneContainer.search('');
                    extensionsViewPaneContainer.focus();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.refreshExtension',
            title: localize2('refreshExtension', 'Refresh'),
            category: ExtensionsLocalizedLabel,
            icon: refreshIcon,
            f1: true,
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
                group: 'navigation',
                order: 2,
            },
            run: async (accessor) => {
                const viewPaneContainer = accessor
                    .get(IViewsService)
                    .getActiveViewPaneContainerWithId(VIEWLET_ID);
                if (viewPaneContainer) {
                    await viewPaneContainer.refresh();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installWorkspaceRecommendedExtensions',
            title: localize('installWorkspaceRecommendedExtensions', 'Install Workspace Recommended Extensions'),
            icon: installWorkspaceRecommendedIcon,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
                group: 'navigation',
                order: 1,
            },
            run: async (accessor) => {
                const view = accessor
                    .get(IViewsService)
                    .getActiveViewWithId(WORKSPACE_RECOMMENDATIONS_VIEW_ID);
                return view.installWorkspaceRecommendations();
            },
        });
        this.registerExtensionAction({
            id: ConfigureWorkspaceFolderRecommendedExtensionsAction.ID,
            title: ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL,
            icon: configureRecommendedIcon,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: WorkbenchStateContext.notEqualsTo('empty'),
                },
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
                    group: 'navigation',
                    order: 2,
                },
            ],
            run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceFolderRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction.ID, ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL)),
        });
        this.registerExtensionAction({
            id: InstallSpecificVersionOfExtensionAction.ID,
            title: {
                value: InstallSpecificVersionOfExtensionAction.LABEL,
                original: 'Install Specific Version of Extension...',
            },
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)),
            },
            run: () => runAction(this.instantiationService.createInstance(InstallSpecificVersionOfExtensionAction, InstallSpecificVersionOfExtensionAction.ID, InstallSpecificVersionOfExtensionAction.LABEL)),
        });
    }
    // Extension Context Menu
    registerContextMenuActions() {
        this.registerExtensionAction({
            id: SetColorThemeAction.ID,
            title: SetColorThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasColorThemes')),
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetColorThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: SetFileIconThemeAction.ID,
            title: SetFileIconThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasFileIconThemes')),
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetFileIconThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: SetProductIconThemeAction.ID,
            title: SetProductIconThemeAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: THEME_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasProductIconThemes')),
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const instantiationService = accessor.get(IInstantiationService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id: extensionId }));
                if (extension) {
                    const action = instantiationService.createInstance(SetProductIconThemeAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showPreReleaseVersion',
            title: localize2('show pre-release version', 'Show Pre-Release Version'),
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                extensionWorkbenchService.open(extension, { showPreReleaseVersion: true });
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.showReleasedVersion',
            title: localize2('show released version', 'Show Release Version'),
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 1,
                when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('extensionHasReleaseVersion'), ContextKeyExpr.has('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, extensionId) => {
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                extensionWorkbenchService.open(extension, { showPreReleaseVersion: false });
            },
        });
        this.registerExtensionAction({
            id: ToggleAutoUpdateForExtensionAction.ID,
            title: ToggleAutoUpdateForExtensionAction.LABEL,
            category: ExtensionsLocalizedLabel,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'), ContextKeyExpr.equals('isExtensionEnabled', true)), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isExtensionAllowed')),
            menu: {
                id: MenuId.ExtensionContext,
                group: UPDATE_ACTIONS_GROUP,
                order: 1,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(ToggleAutoUpdateForExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: ToggleAutoUpdatesForPublisherAction.ID,
            title: {
                value: ToggleAutoUpdatesForPublisherAction.LABEL,
                original: 'Auto Update (Publisher)',
            },
            category: ExtensionsLocalizedLabel,
            precondition: ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false),
            menu: {
                id: MenuId.ExtensionContext,
                group: UPDATE_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(ToggleAutoUpdatesForPublisherAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.switchToPreRlease',
            title: localize('enablePreRleaseLabel', 'Switch to Pre-Release Version'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('installedExtensionIsOptedToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.switchToRelease',
            title: localize('disablePreRleaseLabel', 'Switch to Release Version'),
            category: ExtensionsLocalizedLabel,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 2,
                when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.has('installedExtensionIsOptedToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension')),
            },
            run: async (accessor, id) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = extensionWorkbenchService.local.find((e) => areSameExtensions(e.identifier, { id }));
                if (extension) {
                    const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: ClearLanguageAction.ID,
            title: ClearLanguageAction.TITLE,
            menu: {
                id: MenuId.ExtensionContext,
                group: INSTALL_ACTIONS_GROUP,
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.has('canSetLanguage'), ContextKeyExpr.has('isActiveLanguagePackExtension')),
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
                const extension = (await extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                const action = instantiationService.createInstance(ClearLanguageAction);
                action.extension = extension;
                return action.run();
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installUnsigned',
            title: localize('install', 'Install'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('extensionIsUnsigned'), CONTEXT_GALLERY_ALL_REPOSITORY_SIGNED),
                order: 1,
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, { id: extensionId }))[0] ||
                    (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, {
                        installPreReleaseVersion: this.extensionsWorkbenchService.preferPreReleases,
                    });
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installAndDonotSync',
            title: localize('install installAndDonotSync', 'Install (Do not Sync)'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
                order: 1,
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, { id: extensionId }))[0] ||
                    (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, {
                        installPreReleaseVersion: this.extensionsWorkbenchService.preferPreReleases,
                        isMachineScoped: true,
                    });
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.installPrereleaseAndDonotSync',
            title: localize('installPrereleaseAndDonotSync', 'Install Pre-Release (Do not Sync)'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
                order: 2,
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, { id: extensionId }))[0] ||
                    (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const action = instantiationService.createInstance(InstallAction, {
                        isMachineScoped: true,
                        preRelease: true,
                    });
                    action.extension = extension;
                    return action.run();
                }
            },
        });
        this.registerExtensionAction({
            id: InstallAnotherVersionAction.ID,
            title: InstallAnotherVersionAction.LABEL,
            menu: {
                id: MenuId.ExtensionContext,
                group: '0_install',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall')),
                order: 3,
            },
            run: async (accessor, extensionId) => {
                const instantiationService = accessor.get(IInstantiationService);
                const extension = this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, { id: extensionId }))[0] ||
                    (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    return instantiationService
                        .createInstance(InstallAnotherVersionAction, extension, false)
                        .run();
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyExtension',
            title: localize2('workbench.extensions.action.copyExtension', 'Copy'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy',
            },
            run: async (accessor, extensionId) => {
                const clipboardService = accessor.get(IClipboardService);
                const extension = this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, { id: extensionId }))[0] ||
                    (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
                if (extension) {
                    const name = localize('extensionInfoName', 'Name: {0}', extension.displayName);
                    const id = localize('extensionInfoId', 'Id: {0}', extensionId);
                    const description = localize('extensionInfoDescription', 'Description: {0}', extension.description);
                    const verision = localize('extensionInfoVersion', 'Version: {0}', extension.version);
                    const publisher = localize('extensionInfoPublisher', 'Publisher: {0}', extension.publisherDisplayName);
                    const link = extension.url
                        ? localize('extensionInfoVSMarketplaceLink', 'VS Marketplace Link: {0}', `${extension.url}`)
                        : null;
                    const clipboardStr = `${name}\n${id}\n${description}\n${verision}\n${publisher}${link ? '\n' + link : ''}`;
                    await clipboardService.writeText(clipboardStr);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyExtensionId',
            title: localize2('workbench.extensions.action.copyExtensionId', 'Copy Extension ID'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy',
            },
            run: async (accessor, id) => accessor.get(IClipboardService).writeText(id),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.copyLink',
            title: localize2('workbench.extensions.action.copyLink', 'Copy Link'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '1_copy',
                when: ContextKeyExpr.and(ContextKeyExpr.has('isGalleryExtension'), CONTEXT_GALLERY_HAS_EXTENSION_LINK),
            },
            run: async (accessor, _, extension) => {
                const clipboardService = accessor.get(IClipboardService);
                if (extension.galleryLink) {
                    await clipboardService.writeText(extension.galleryLink);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.configure',
            title: localize2('workbench.extensions.action.configure', 'Settings'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasConfiguration')),
                order: 1,
            },
            run: async (accessor, id) => accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: `@ext:${id}` }),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.download',
            title: localize('download VSIX', 'Download VSIX'),
            menu: {
                id: MenuId.ExtensionContext,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension')),
                order: this.productService.quality === 'stable' ? 0 : 1,
            },
            run: async (accessor, extensionId) => {
                accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, false);
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.downloadPreRelease',
            title: localize('download pre-release', 'Download Pre-Release VSIX'),
            menu: {
                id: MenuId.ExtensionContext,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion')),
                order: this.productService.quality === 'stable' ? 1 : 0,
            },
            run: async (accessor, extensionId) => {
                accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, true);
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.manageAccountPreferences',
            title: localize2('workbench.extensions.action.changeAccountPreference', 'Account Preferences'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasAccountPreferences')),
                order: 2,
            },
            run: (accessor, id) => accessor.get(ICommandService).executeCommand('_manageAccountPreferencesForExtension', id),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.configureKeybindings',
            title: localize2('workbench.extensions.action.configureKeybindings', 'Keyboard Shortcuts'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasKeybindings')),
                order: 2,
            },
            run: async (accessor, id) => accessor
                .get(IPreferencesService)
                .openGlobalKeybindingSettings(false, { query: `@ext:${id}` }),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.toggleApplyToAllProfiles',
            title: localize2('workbench.extensions.action.toggleApplyToAllProfiles', 'Apply Extension to all Profiles'),
            toggled: ContextKeyExpr.has('isApplicationScopedExtension'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('isDefaultApplicationScopedExtension').negate(), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
                order: 3,
            },
            run: async (accessor, _, extensionArg) => {
                const uriIdentityService = accessor.get(IUriIdentityService);
                const extension = extensionArg.location
                    ? this.extensionsWorkbenchService.installed.find((e) => uriIdentityService.extUri.isEqual(e.local?.location, extensionArg.location))
                    : undefined;
                if (extension) {
                    return this.extensionsWorkbenchService.toggleApplyExtensionToAllProfiles(extension);
                }
            },
        });
        this.registerExtensionAction({
            id: TOGGLE_IGNORE_EXTENSION_ACTION_ID,
            title: localize2('workbench.extensions.action.toggleIgnoreExtension', 'Sync This Extension'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '2_configure',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), CONTEXT_SYNC_ENABLEMENT, ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
                order: 4,
            },
            run: async (accessor, id) => {
                const extension = this.extensionsWorkbenchService.local.find((e) => areSameExtensions({ id }, e.identifier));
                if (extension) {
                    return this.extensionsWorkbenchService.toggleExtensionIgnoredToSync(extension);
                }
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.ignoreRecommendation',
            title: localize2('workbench.extensions.action.ignoreRecommendation', 'Ignore Recommendation'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.has('isExtensionRecommended'),
                order: 1,
            },
            run: async (accessor, id) => accessor
                .get(IExtensionIgnoredRecommendationsService)
                .toggleGlobalIgnoredRecommendation(id, true),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.undoIgnoredRecommendation',
            title: localize2('workbench.extensions.action.undoIgnoredRecommendation', 'Undo Ignored Recommendation'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.has('isUserIgnoredRecommendation'),
                order: 1,
            },
            run: async (accessor, id) => accessor
                .get(IExtensionIgnoredRecommendationsService)
                .toggleGlobalIgnoredRecommendation(id, false),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addExtensionToWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.addExtensionToWorkspaceRecommendations', 'Add to Workspace Recommendations'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended').negate(), ContextKeyExpr.has('isUserIgnoredRecommendation').negate(), ContextKeyExpr.notEquals('extensionSource', 'resource')),
                order: 2,
            },
            run: (accessor, id) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.removeExtensionFromWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.removeExtensionFromWorkspaceRecommendations', 'Remove from Workspace Recommendations'),
            menu: {
                id: MenuId.ExtensionContext,
                group: '3_recommendations',
                when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended')),
                order: 2,
            },
            run: (accessor, id) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceRecommendations', 'Add Extension to Workspace Recommendations'),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            async run(accessor) {
                const editorService = accessor.get(IEditorService);
                const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
                if (!(editorService.activeEditor instanceof ExtensionsInput)) {
                    return;
                }
                const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
                const recommendations = await workspaceExtensionsConfigService.getRecommendations();
                if (recommendations.includes(extensionId)) {
                    return;
                }
                await workspaceExtensionsConfigService.toggleRecommendation(extensionId);
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceFolderRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceFolderRecommendations', 'Add Extension to Workspace Folder Recommendations'),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceRecommendations'),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceIgnoredRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceIgnoredRecommendations', 'Add Extension to Workspace Ignored Recommendations'),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            async run(accessor) {
                const editorService = accessor.get(IEditorService);
                const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
                if (!(editorService.activeEditor instanceof ExtensionsInput)) {
                    return;
                }
                const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
                const unwantedRecommendations = await workspaceExtensionsConfigService.getUnwantedRecommendations();
                if (unwantedRecommendations.includes(extensionId)) {
                    return;
                }
                await workspaceExtensionsConfigService.toggleUnwantedRecommendation(extensionId);
            },
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations',
            title: localize2('workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations', 'Add Extension to Workspace Folder Ignored Recommendations'),
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
            },
            run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceIgnoredRecommendations'),
        });
        this.registerExtensionAction({
            id: ConfigureWorkspaceRecommendedExtensionsAction.ID,
            title: {
                value: ConfigureWorkspaceRecommendedExtensionsAction.LABEL,
                original: 'Configure Recommended Extensions (Workspace)',
            },
            category: EXTENSIONS_CATEGORY,
            menu: {
                id: MenuId.CommandPalette,
                when: WorkbenchStateContext.isEqualTo('workspace'),
            },
            run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceRecommendedExtensionsAction.ID, ConfigureWorkspaceRecommendedExtensionsAction.LABEL)),
        });
        this.registerExtensionAction({
            id: 'workbench.extensions.action.manageTrustedPublishers',
            title: localize2('workbench.extensions.action.manageTrustedPublishers', 'Manage Trusted Extension Publishers'),
            category: EXTENSIONS_CATEGORY,
            f1: true,
            run: async (accessor) => {
                const quickInputService = accessor.get(IQuickInputService);
                const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
                const trustedPublishers = extensionManagementService.getTrustedPublishers();
                const trustedPublisherItems = trustedPublishers
                    .map((publisher) => ({
                    id: publisher.publisher,
                    label: publisher.publisherDisplayName,
                    description: publisher.publisher,
                    picked: true,
                }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                const result = await quickInputService.pick(trustedPublisherItems, {
                    canPickMany: true,
                    title: localize('trustedPublishers', 'Manage Trusted Extension Publishers'),
                    placeHolder: localize('trustedPublishersPlaceholder', 'Choose which publishers to trust'),
                });
                if (result) {
                    const untrustedPublishers = [];
                    for (const { publisher } of trustedPublishers) {
                        if (!result.some((r) => r.id === publisher)) {
                            untrustedPublishers.push(publisher);
                        }
                    }
                    trustedPublishers.filter((publisher) => !result.some((r) => r.id === publisher.publisher));
                    extensionManagementService.untrustPublishers(...untrustedPublishers);
                }
            },
        });
    }
    registerExtensionAction(extensionActionOptions) {
        const menus = extensionActionOptions.menu
            ? Array.isArray(extensionActionOptions.menu)
                ? extensionActionOptions.menu
                : [extensionActionOptions.menu]
            : [];
        let menusWithOutTitles = [];
        const menusWithTitles = [];
        if (extensionActionOptions.menuTitles) {
            for (let index = 0; index < menus.length; index++) {
                const menu = menus[index];
                const menuTitle = extensionActionOptions.menuTitles[menu.id.id];
                if (menuTitle) {
                    menusWithTitles.push({
                        id: menu.id,
                        item: { ...menu, command: { id: extensionActionOptions.id, title: menuTitle } },
                    });
                }
                else {
                    menusWithOutTitles.push(menu);
                }
            }
        }
        else {
            menusWithOutTitles = menus;
        }
        const disposables = new DisposableStore();
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    ...extensionActionOptions,
                    menu: menusWithOutTitles,
                });
            }
            run(accessor, ...args) {
                return extensionActionOptions.run(accessor, ...args);
            }
        }));
        if (menusWithTitles.length) {
            disposables.add(MenuRegistry.appendMenuItems(menusWithTitles));
        }
        return disposables;
    }
};
ExtensionsContributions = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionGalleryManifestService),
    __param(3, IContextKeyService),
    __param(4, IViewsService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IInstantiationService),
    __param(8, IDialogService),
    __param(9, ICommandService),
    __param(10, IProductService)
], ExtensionsContributions);
let ExtensionStorageCleaner = class ExtensionStorageCleaner {
    constructor(extensionManagementService, storageService) {
        ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
    }
};
ExtensionStorageCleaner = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IStorageService)
], ExtensionStorageCleaner);
let TrustedPublishersInitializer = class TrustedPublishersInitializer {
    constructor(extensionManagementService, userDataProfilesService, productService, storageService) {
        const trustedPublishersInitStatusKey = 'trusted-publishers-init-migration';
        if (!storageService.get(trustedPublishersInitStatusKey, -1 /* StorageScope.APPLICATION */)) {
            for (const profile of userDataProfilesService.profiles) {
                extensionManagementService
                    .getInstalled(1 /* ExtensionType.User */, profile.extensionsResource)
                    .then(async (extensions) => {
                    const trustedPublishers = new Map();
                    for (const extension of extensions) {
                        if (!extension.publisherDisplayName) {
                            continue;
                        }
                        const publisher = extension.manifest.publisher.toLowerCase();
                        if (productService.trustedExtensionPublishers?.includes(publisher) ||
                            (extension.publisherDisplayName &&
                                productService.trustedExtensionPublishers?.includes(extension.publisherDisplayName.toLowerCase()))) {
                            continue;
                        }
                        trustedPublishers.set(publisher, {
                            publisher,
                            publisherDisplayName: extension.publisherDisplayName,
                        });
                    }
                    if (trustedPublishers.size) {
                        extensionManagementService.trustPublishers(...trustedPublishers.values());
                    }
                    storageService.store(trustedPublishersInitStatusKey, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                });
            }
        }
    }
};
TrustedPublishersInitializer = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IUserDataProfilesService),
    __param(2, IProductService),
    __param(3, IStorageService)
], TrustedPublishersInitializer);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(StatusUpdater, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(MaliciousExtensionChecker, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(KeymapExtensions, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsViewletViewsContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionActivationProgress, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(ExtensionDependencyChecker, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(ExtensionEnablementWorkspaceTrustTransitionParticipant, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(ExtensionsCompletionItemsProvider, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(UnsupportedExtensionsMigrationContrib, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(TrustedPublishersInitializer, 4 /* LifecyclePhase.Eventually */);
if (isWeb) {
    workbenchRegistry.registerWorkbenchContribution(ExtensionStorageCleaner, 4 /* LifecyclePhase.Eventually */);
}
// Running Extensions
registerAction2(ShowRuntimeExtensionsAction);
Registry.as(ConfigurationMigrationExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: AutoUpdateConfigurationKey,
        migrateFn: (value, accessor) => {
            if (value === 'onlySelectedExtensions') {
                return { value: false };
            }
            return [];
        },
    },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEVBQ2YsT0FBTyxHQUdQLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIsZ0NBQWdDLEVBRWhDLDRCQUE0QixFQUM1QiwwQkFBMEIsR0FHMUIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBRU4saUNBQWlDLEVBRWpDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsR0FDcEMsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLGdDQUFnQyxHQUNoQyxNQUFNLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixVQUFVLEVBQ1YsMkJBQTJCLEVBRTNCLGlDQUFpQyxFQUNqQyxzQ0FBc0MsRUFDdEMsaUNBQWlDLEVBRWpDLDBCQUEwQixFQUMxQiw0QkFBNEIsRUFDNUIsd0NBQXdDLEVBQ3hDLGdEQUFnRCxFQUVoRCxtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLDJCQUEyQixFQUMzQixtQkFBbUIsRUFDbkIsMkJBQTJCLEVBQzNCLG9CQUFvQixFQUdwQixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUNOLHVDQUF1QyxFQUN2Qyw2Q0FBNkMsRUFDN0MsbURBQW1ELEVBQ25ELG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIseUJBQXlCLEVBQ3pCLG1CQUFtQixFQUNuQixrQ0FBa0MsRUFDbEMsbUNBQW1DLEVBQ25DLCtCQUErQixFQUMvQiwyQkFBMkIsRUFDM0IsYUFBYSxHQUNiLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sYUFBYSxFQUNiLHlCQUF5QixFQUN6QixrQ0FBa0MsRUFDbEMsMkJBQTJCLEVBQzNCLHdCQUF3QixFQUN4QixrQ0FBa0MsRUFDbEMsNEJBQTRCLEVBQzVCLG1CQUFtQixFQUNuQix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLDRCQUE0QixHQUM1QixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsK0JBQStCLEdBQy9CLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGVBQWUsR0FDZixNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUV0RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFHTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixVQUFVLEdBQ1YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sbUNBQW1DLEVBQ25DLG1DQUFtQyxHQUNuQyxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixVQUFVLEVBQ1YsU0FBUyxFQUNULFdBQVcsR0FDWCxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUdqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDOUksT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUcsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFMUYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDbEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzREFBc0QsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3BJLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsd0JBQXdCLEVBQ3hCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsK0JBQStCLEVBQy9CLFdBQVcsR0FDWCxNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzdHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4sVUFBVSxJQUFJLGdDQUFnQyxHQUM5QyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sbUNBQW1DLEVBQ25DLHNDQUFzQyxFQUV0QyxnQ0FBZ0MsR0FDaEMsTUFBTSw2RUFBNkUsQ0FBQTtBQUVwRixhQUFhO0FBQ2IsaUJBQWlCLENBQ2hCLDJCQUEyQixFQUMzQiwwQkFBMEIsa0NBRTFCLENBQUE7QUFDRCxpQkFBaUIsQ0FDaEIsMkNBQTJDLEVBQzNDLDBDQUEwQyxvQ0FFMUMsQ0FBQTtBQUNELGlCQUFpQixDQUNoQixnQ0FBZ0MsRUFDaEMsK0JBQStCLGtDQUUvQixDQUFBO0FBRUQsZUFBZTtBQUNmLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNyRixJQUFJLEVBQUUsbUNBQW1DO0lBQ3pDLE1BQU0sRUFBRSxtQ0FBbUMsQ0FBQyxNQUFNO0lBQ2xELFdBQVcsRUFBRSxRQUFRLENBQ3BCLHdDQUF3QyxFQUN4QyxtQ0FBbUMsQ0FDbkM7SUFDRCxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxDQUFDO0NBQ3JGLENBQUMsQ0FBQTtBQUVGLFNBQVM7QUFDVCxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUMxQixlQUFlLEVBQ2YsZUFBZSxDQUFDLEVBQUUsRUFDbEIsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FDbEMsRUFDRCxDQUFDLElBQUksY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQ3JDLENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLHVCQUF1QixDQUFDLHNCQUFzQixDQUM5QyxDQUFDLHFCQUFxQixDQUN0QjtJQUNDLEVBQUUsRUFBRSxVQUFVO0lBQ2QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO0lBQzVDLDJCQUEyQixFQUFFO1FBQzVCLEVBQUUsRUFBRSxVQUFVO1FBQ2QsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMvRCxjQUFjLENBQ2Q7UUFDRCxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsbURBQTZCLHdCQUFlLEVBQUU7UUFDdEUsS0FBSyxFQUFFLENBQUM7S0FDUjtJQUNELGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQztJQUMvRCxJQUFJLEVBQUUsa0JBQWtCO0lBQ3hCLEtBQUssRUFBRSxDQUFDO0lBQ1IsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixzQkFBc0IsRUFBRSxJQUFJO0NBQzVCLHdDQUVELENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNoRyxFQUFFLEVBQUUsWUFBWTtJQUNoQixLQUFLLEVBQUUsRUFBRTtJQUNULEtBQUssRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsWUFBWSxDQUFDO0lBQzdELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQztZQUM1QyxjQUFjLEVBQUU7Z0JBQ2YsUUFBUSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQztnQkFDakMsUUFBUSxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQztnQkFDOUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7YUFDeEI7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUNQLDRCQUE0QixFQUM1QixnRUFBZ0UsQ0FDaEU7Z0JBQ0QsUUFBUSxDQUNQLCtCQUErQixFQUMvQix5RUFBeUUsQ0FDekU7Z0JBQ0QsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDJDQUEyQyxDQUFDO2FBQ3BGO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsdUJBQXVCLEVBQ3ZCLGdIQUFnSCxDQUNoSDtZQUNELE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7UUFDRCw2QkFBNkIsRUFBRTtZQUM5QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHdCQUF3QixFQUN4QixxTUFBcU0sQ0FDck07WUFDRCxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO1NBQzVCO1FBQ0Qsa0NBQWtDLEVBQUU7WUFDbkMsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixpQ0FBaUMsRUFDakMsa0ZBQWtGLENBQ2xGO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELDRDQUE0QyxFQUFFO1lBQzdDLElBQUksRUFBRSxTQUFTO1lBQ2Ysa0JBQWtCLEVBQUUsUUFBUSxDQUMzQixzREFBc0QsRUFDdEQsaU1BQWlNLENBQ2pNO1lBQ0QsT0FBTyxFQUFFLEtBQUs7WUFDZCxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztTQUM1QjtRQUNELDhDQUE4QyxFQUFFO1lBQy9DLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNkNBQTZDLEVBQzdDLDBIQUEwSCxDQUMxSDtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCw0Q0FBNEMsRUFBRTtZQUM3QyxJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTthQUNkO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOEJBQThCLEVBQzlCLDhHQUE4RyxDQUM5RztZQUNELE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyx3Q0FBZ0M7U0FDckM7UUFDRCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO1lBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO1lBQzNCLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLHdEQUF3RCxDQUN4RDtnQkFDRCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLHVEQUF1RCxDQUN2RDtnQkFDRCxRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLCtFQUErRSxDQUMvRTthQUNEO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQ0FBbUMsQ0FBQztZQUNqRixPQUFPLEVBQUUsTUFBTTtTQUNmO1FBQ0QscUNBQXFDLEVBQUU7WUFDdEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLHFDQUFxQyxFQUNyQywwREFBMEQsQ0FDMUQ7WUFDRCxpQkFBaUIsRUFBRTtnQkFDbEIsMERBQTBELEVBQUU7b0JBQzNELElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxLQUFLO2lCQUNkO2FBQ0Q7WUFDRCxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLE9BQU8sRUFBRSxFQUFFO1lBQ1gsZUFBZSxFQUFFO2dCQUNoQjtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsVUFBVSxFQUFFLEtBQUs7cUJBQ2pCO2lCQUNEO2FBQ0Q7U0FDRDtRQUNELGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxRQUFRO1lBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxQkFBcUIsRUFDckIsMEVBQTBFLENBQzFFO1lBQ0QsaUJBQWlCLEVBQUU7Z0JBQ2xCLDBEQUEwRCxFQUFFO29CQUMzRCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsQ0FBQztpQkFDVjthQUNEO1lBQ0Qsb0JBQW9CLEVBQUUsS0FBSztZQUMzQixPQUFPLEVBQUUsRUFBRTtZQUNYLGVBQWUsRUFBRTtnQkFDaEI7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLFVBQVUsRUFBRSxDQUFDO3FCQUNiO2lCQUNEO2FBQ0Q7U0FDRDtRQUNELENBQUMsaUNBQWlDLENBQUMsRUFBRTtZQUNwQyxJQUFJLEVBQUUsUUFBUTtZQUNkLEtBQUssd0NBQWdDO1lBQ3JDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsdUNBQXVDLEVBQ3ZDLCtTQUErUyxDQUMvUztZQUNELGlCQUFpQixFQUFFO2dCQUNsQiwwREFBMEQsRUFBRTtvQkFDM0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNYLFNBQVMsRUFBRTs0QkFDVixJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDOzRCQUMzQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQzs0QkFDOUIsZ0JBQWdCLEVBQUU7Z0NBQ2pCLFFBQVEsQ0FDUCw0Q0FBNEMsRUFDNUMsbUNBQW1DLENBQ25DO2dDQUNELFFBQVEsQ0FDUCw2Q0FBNkMsRUFDN0Msb0VBQW9FLENBQ3BFO2dDQUNELFFBQVEsQ0FDUCwrQ0FBK0MsRUFDL0MsOEZBQThGLENBQzlGOzZCQUNEOzRCQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLGlEQUFpRCxFQUNqRCxvRUFBb0UsQ0FDcEU7eUJBQ0Q7d0JBQ0QsT0FBTyxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLCtDQUErQyxFQUMvQyxxS0FBcUssQ0FDcks7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsMkRBQTJELEVBQUU7WUFDNUQsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQiw2Q0FBNkMsRUFDN0Msb0hBQW9ILENBQ3BIO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELDBDQUEwQyxFQUFFO1lBQzNDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIseUJBQXlCLEVBQ3pCLDZGQUE2RixDQUM3RjtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCw0QkFBNEIsRUFBRTtZQUM3QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDRCQUE0QixFQUM1Qiw4RUFBOEUsQ0FDOUU7WUFDRCxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLFFBQVEsRUFBRSxRQUFRO1NBQ2xCO1FBQ0QsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFO1lBQzlCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsYUFBYSxFQUNiLCtLQUErSyxDQUMvSztZQUNELE9BQU8sRUFBRSxLQUFLO1lBQ2QsUUFBUSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUTtTQUN0QztRQUNELENBQUMsNEJBQTRCLENBQUMsRUFBRTtZQUMvQixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHdDQUF3QyxFQUN4QyxvRUFBb0UsQ0FDcEU7WUFDRCxPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQztTQUNyQztRQUNELENBQUMsbUNBQW1DLENBQUMsRUFBRTtZQUN0QyxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLCtCQUErQixFQUMvQixxREFBcUQsQ0FDckQ7WUFDRCxPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO1lBQzVCLFFBQVEsRUFBRSxLQUFLO1lBQ2YsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSw0QkFBNEI7Z0JBQ2xDLGNBQWMsRUFBRSxNQUFNO2FBQ3RCO1NBQ0Q7UUFDRCxDQUFDLDBCQUEwQixDQUFDLEVBQUU7WUFDN0IsNEhBQTRIO1lBQzVILElBQUksRUFBRSxRQUFRO1lBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQkFBb0IsRUFDcEIsaVhBQWlYLENBQ2pYO1lBQ0QsT0FBTyxFQUFFLEdBQUc7WUFDWixlQUFlLEVBQUU7Z0JBQ2hCO29CQUNDLElBQUksRUFBRSxFQUFFO29CQUNSLFdBQVcsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLENBQUM7aUJBQzlFO2dCQUNEO29CQUNDLElBQUksRUFBRTt3QkFDTCxHQUFHLEVBQUUsSUFBSTtxQkFDVDtvQkFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDZCQUE2QixDQUFDO2lCQUM5RTthQUNEO1lBQ0QsS0FBSyx3Q0FBZ0M7WUFDckMsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLGNBQWMsRUFBRSxNQUFNO2dCQUN0QixXQUFXLEVBQUUsUUFBUSxDQUNwQiwyQkFBMkIsRUFDM0Isa1JBQWtSLENBQ2xSO2FBQ0Q7WUFDRCxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLGlCQUFpQixFQUFFO2dCQUNsQiwwREFBMEQsRUFBRTtvQkFDM0QsS0FBSyxFQUFFO3dCQUNOOzRCQUNDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7NEJBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDOzRCQUM3QixXQUFXLEVBQUUsUUFBUSxDQUNwQiw4QkFBOEIsRUFDOUIsa0NBQWtDLENBQ2xDOzRCQUNELGdCQUFnQixFQUFFO2dDQUNqQixRQUFRLENBQUMsZ0NBQWdDLEVBQUUsdUJBQXVCLENBQUM7Z0NBQ25FLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwyQkFBMkIsQ0FBQztnQ0FDeEUsUUFBUSxDQUNQLHdDQUF3QyxFQUN4Qyw4Q0FBOEMsQ0FDOUM7NkJBQ0Q7eUJBQ0Q7d0JBQ0Q7NEJBQ0MsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFO2dDQUNOLElBQUksRUFBRSxRQUFROzZCQUNkOzRCQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLHNDQUFzQyxFQUN0QyxtVEFBbVQsQ0FDblQ7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsNkJBQTZCLEVBQUU7b0JBQzlCLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7b0JBQzNCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO29CQUM3QixXQUFXLEVBQUUsUUFBUSxDQUNwQix1Q0FBdUMsRUFDdkMsc0RBQXNELENBQ3REO29CQUNELGdCQUFnQixFQUFFO3dCQUNqQixRQUFRLENBQ1AsMENBQTBDLEVBQzFDLGdEQUFnRCxDQUNoRDt3QkFDRCxRQUFRLENBQ1AsMkNBQTJDLEVBQzNDLG9EQUFvRCxDQUNwRDt3QkFDRCxRQUFRLENBQ1Asa0RBQWtELEVBQ2xELGtFQUFrRSxDQUNsRTtxQkFDRDtpQkFDRDtnQkFDRCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFNBQVM7b0JBQ2YsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztvQkFDbkIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsa0NBQWtDLEVBQ2xDLG1DQUFtQyxDQUNuQztvQkFDRCxnQkFBZ0IsRUFBRTt3QkFDakIsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHVCQUF1QixDQUFDO3dCQUNoRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsMEJBQTBCLENBQUM7cUJBQ3BFO2lCQUNEO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsTUFBTSxZQUFZLEdBQXVELENBQ3hFLFFBQVEsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQ2pFLENBQUE7QUFDRCxZQUFZLENBQUMsY0FBYyxDQUFDLCtCQUErQixFQUFFLDZCQUE2QixDQUFDLENBQUE7QUFFM0Ysb0JBQW9CO0FBQ3BCLGdCQUFnQixDQUFDLGVBQWUsQ0FDL0Isb0JBQW9CLEVBQ3BCLENBQ0MsUUFBMEIsRUFDMUIsV0FBbUIsRUFDbkIsR0FBd0IsRUFDeEIsYUFBdUIsRUFDdkIsT0FBZ0IsRUFDZixFQUFFO0lBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDbEUsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ25ELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDcEQsQ0FBQTtJQUNELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLDRCQUE0QixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDakYsQ0FBQztBQUNGLENBQUMsQ0FDRCxDQUFBO0FBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixnQkFBZ0IsRUFDaEIsS0FBSyxFQUNKLFFBQTBCLEVBQzFCLFdBQW1CLEVBQ25CLEdBQXdCLEVBQ3hCLGFBQXVCLEVBQ3ZCLE9BQWdCLEVBQ2hCLFVBQW9CLEVBQ25CLEVBQUU7SUFDSCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBRXBELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLGdCQUFnQixDQUFDLGFBQWEsQ0FDdkQsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUNyQixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7SUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRUQsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUNuQyxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLEdBQUcsRUFDSCxhQUFhLEVBQ2IsT0FBTyxDQUNQLENBQUE7QUFDRixDQUFDLENBQ0QsQ0FBQTtBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsdUNBQXVDO0lBQzNDLFFBQVEsRUFBRTtRQUNULFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1EQUFtRCxFQUNuRCw2QkFBNkIsQ0FDN0I7UUFDRCxJQUFJLEVBQUU7WUFDTDtnQkFDQyxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsUUFBUSxDQUNwQixzREFBc0QsRUFDdEQsbUNBQW1DLENBQ25DO2dCQUNELFVBQVUsRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssWUFBWSxHQUFHO2FBQzdFO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUNWLHlGQUF5RjtvQkFDekYsOExBQThMO2dCQUMvTCxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsTUFBTSxFQUFFO29CQUNQLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDWCwwQ0FBMEMsRUFBRTs0QkFDM0MsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIseUZBQXlGLEVBQ3pGLGtKQUFrSixDQUNsSjs0QkFDRCxPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCx3QkFBd0IsRUFBRTs0QkFDekIsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsdUVBQXVFLEVBQ3ZFLHVGQUF1RixDQUN2Rjs0QkFDRCxPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCxTQUFTLEVBQUU7NEJBQ1YsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsd0RBQXdELEVBQ3hELDRFQUE0RSxDQUM1RTs0QkFDRCxPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCxhQUFhLEVBQUU7NEJBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQzs0QkFDMUIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNERBQTRELEVBQzVELDZSQUE2UixDQUM3Ujt5QkFDRDt3QkFDRCxNQUFNLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIscURBQXFELEVBQ3JELHVJQUF1SSxDQUN2STs0QkFDRCxPQUFPLEVBQUUsS0FBSzt5QkFDZDt3QkFDRCxPQUFPLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsc0RBQXNELEVBQ3RELDJNQUEyTSxDQUMzTTt5QkFDRDtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7S0FDRDtJQUNELE9BQU8sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLEdBQTJCLEVBQzNCLE9BT0MsRUFDQSxFQUFFO1FBQ0gsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDNUUsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUE7UUFDckYsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDO1lBQ0osSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM3RCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUN0RCxDQUFBO2dCQUNELElBQUksU0FBUyxFQUFFLGVBQWUsb0RBQTRDLEVBQUUsQ0FBQztvQkFDNUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLE1BQU0sdUJBQXVCLENBQUMsYUFBYSxDQUM1RCxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxFQUN2RCxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7b0JBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUN6RSxDQUFDO29CQUNELE1BQU0sMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFO3dCQUM1RCxlQUFlLEVBQUUsT0FBTyxFQUFFLFNBQVM7NEJBQ2xDLENBQUMsQ0FBQyxJQUFJOzRCQUNOLENBQUMsQ0FBQyxTQUFTLENBQUMsd0ZBQXdGO3dCQUNyRyx3QkFBd0IsRUFBRSxPQUFPLEVBQUUsd0JBQXdCO3dCQUMzRCxtQkFBbUIsRUFBRSxDQUFDLENBQUMsT0FBTzt3QkFDOUIsT0FBTyxFQUFFOzRCQUNSLEdBQUcsT0FBTyxFQUFFLE9BQU87NEJBQ25CLENBQUMsZ0NBQWdDLENBQUMsZ0RBQWdDO3lCQUNsRTtxQkFDRCxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sMEJBQTBCLENBQUMsT0FBTyxDQUN2QyxHQUFHLEVBQ0g7d0JBQ0MsT0FBTzt3QkFDUCx3QkFBd0IsRUFBRSxPQUFPLEVBQUUsd0JBQXdCO3dCQUMzRCxPQUFPLEVBQUU7NEJBQ1IsR0FBRyxPQUFPLEVBQUUsT0FBTzs0QkFDbkIsQ0FBQyxnQ0FBZ0MsQ0FBQyxnREFBZ0M7eUJBQ2xFO3dCQUNELGFBQWEsRUFBRSxPQUFPLEVBQUUsYUFBYTt3QkFDckMsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNO3dCQUN2QixlQUFlLEVBQUUsT0FBTyxFQUFFLFNBQVM7NEJBQ2xDLENBQUMsQ0FBQyxJQUFJOzRCQUNOLENBQUMsQ0FBQyxTQUFTLENBQUMsd0ZBQXdGO3FCQUNyRyx5Q0FFRCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDNUIsTUFBTSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx5Q0FBeUM7SUFDN0MsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIscURBQXFELEVBQ3JELCtCQUErQixDQUMvQjtRQUNELElBQUksRUFBRTtZQUNMO2dCQUNDLElBQUksRUFBRSxRQUFRLENBQ2Isa0RBQWtELEVBQ2xELGtDQUFrQyxDQUNsQztnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7YUFDRDtTQUNEO0tBQ0Q7SUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFVLEVBQUUsRUFBRTtRQUN2QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQ25FLENBQUM7UUFDRCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM1RSxNQUFNLFNBQVMsR0FBRyxNQUFNLDBCQUEwQixDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0YsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1AsY0FBYyxFQUNkLGtJQUFrSSxFQUNsSSxFQUFFLENBQ0YsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksb0JBQW9CLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQUMsU0FBUyxFQUFFLGlFQUFpRSxFQUFFLEVBQUUsQ0FBQyxDQUMxRixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sMEJBQTBCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDakUsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSw2QkFBNkI7SUFDakMsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIseUNBQXlDLEVBQ3pDLGlDQUFpQyxDQUNqQztRQUNELElBQUksRUFBRTtZQUNMO2dCQUNDLElBQUksRUFBRSxRQUFRLENBQUMsc0NBQXNDLEVBQUUsd0JBQXdCLENBQUM7Z0JBQ2hGLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7YUFDMUI7U0FDRDtLQUNEO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLEVBQUU7UUFDL0MsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25FLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixTQUFTLDZDQUE2QyxDQUNyRCxPQUFpQyxFQUNqQyxDQUE4QjtJQUU5QixPQUFPLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDakUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDN0MsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDdkMsSUFBSSxNQUFNLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDO2dCQUNyQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN2QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCw2Q0FBNkMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQ3RGLDZDQUE2QyxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUE7QUFDcEYsNkNBQTZDLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUV4RixXQUFXO0FBQ1gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDM0YsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQVUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDN0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3ZGLE1BQU0saUNBQWlDLEdBQUcsSUFBSSxhQUFhLENBQVMseUJBQXlCLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFDbEcsTUFBTSxtQ0FBbUMsR0FBRyxJQUFJLGFBQWEsQ0FDNUQsMkJBQTJCLEVBQzNCLEVBQUUsQ0FDRixDQUFBO0FBQ0QsTUFBTSxxQ0FBcUMsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsNEJBQTRCLEVBQzVCLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLGFBQWEsQ0FDM0QseUJBQXlCLEVBQ3pCLEtBQUssQ0FDTCxDQUFBO0FBRUQsS0FBSyxVQUFVLFNBQVMsQ0FBQyxNQUFlO0lBQ3ZDLElBQUksQ0FBQztRQUNKLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ25CLENBQUM7WUFBUyxDQUFDO1FBQ1YsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBT0QsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBQy9DLFlBRWtCLGdDQUFtRSxFQUMxRCx1QkFBaUQsRUFFM0UsK0JBQWlFLEVBQzVCLGlCQUFxQyxFQUMxQyxZQUEyQixFQUUxQywwQkFBdUQsRUFFdkQsMEJBQWdFLEVBQ3pDLG9CQUEyQyxFQUNsRCxhQUE2QixFQUM1QixjQUErQixFQUMvQixjQUErQjtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQWZVLHFDQUFnQyxHQUFoQyxnQ0FBZ0MsQ0FBbUM7UUFJL0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMxQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUUxQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBRXZELCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDekMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNsRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDNUIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUdqRSxNQUFNLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksdUJBQXVCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0scUJBQXFCLEdBQUcsd0JBQXdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDaEYsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUMxRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcseUJBQXlCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbEYsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUMzRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDNUUsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUN4RSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELCtCQUErQjthQUM3QiwyQkFBMkIsRUFBRTthQUM3QixJQUFJLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxTQUFTLENBQ2IsK0JBQStCLENBQUMsbUNBQW1DLENBQ2xFLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUM1QixJQUFJLENBQUMsbUNBQW1DLENBQUMsd0JBQXdCLENBQUMsQ0FDbkUsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLG1DQUFtQyxDQUNoRCx3QkFBMEQ7UUFFMUQsaUNBQWlDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FDbkUsSUFBSSx3QkFBd0IsRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FDOUcsQ0FBQTtRQUNELG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQ3JFLElBQUksd0JBQXdCLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQ3JHLENBQUE7UUFDRCxxQ0FBcUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUN2RSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsQ0FDdEUsQ0FBQTtRQUNELGtDQUFrQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQ3BFLENBQUMsQ0FBQyxDQUNELHdCQUF3QjtZQUN4QixzQ0FBc0MsQ0FDckMsd0JBQXdCLCtGQUV4QixDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTywyQkFBMkI7UUFDbEMsSUFDQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCO1lBQ3BFLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0I7WUFDckUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixFQUNqRSxDQUFDO1lBQ0YsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO2dCQUNyRixJQUFJLEVBQUUsbUNBQW1DO2dCQUN6QyxNQUFNLEVBQUUsbUNBQW1DLENBQUMsTUFBTTtnQkFDbEQsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsd0NBQXdDLEVBQ3hDLHFEQUFxRCxDQUNyRDtnQkFDRCxXQUFXLEVBQUU7b0JBQ1o7d0JBQ0MsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsaUNBQWlDLEVBQ2pDLDhCQUE4QixDQUM5QjtxQkFDRDtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCO0lBQ1QscUJBQXFCO1FBQzVCLElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUU7WUFDMUQsT0FBTyxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLEtBQUssRUFBRSxRQUFRLENBQ2QsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUN0RSxjQUFjLENBQ2Q7YUFDRDtZQUNELEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQ2xELE9BQU8sRUFBRTtnQkFDUixFQUFFLEVBQUUsVUFBVTtnQkFDZCxLQUFLLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQzthQUMvQztZQUNELEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsMEJBQTBCLENBQUM7WUFDL0QsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO2dCQUN6QyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDL0QsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUM7WUFDM0QsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLEVBQ25CLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIsc0JBQXNCLENBQ3RCLENBQ0Q7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO2dCQUN6QyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRSxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2REFBNkQ7WUFDakUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxTQUFTLENBQUM7WUFDbkUsUUFBUSxFQUFFLHlCQUF5QjtZQUNuQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsbUJBQW1CO2lCQUN6QjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDO29CQUN6RSxLQUFLLEVBQUUsNkJBQTZCO2lCQUNwQzthQUNEO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQ2hDLDhCQUE4QixFQUM5QixvQ0FBb0MsQ0FDcEM7YUFDRDtZQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1NBQzlFLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsb0RBQW9EO1lBQ3hELEtBQUssRUFBRSxTQUFTLENBQUMsNkJBQTZCLEVBQUUscUJBQXFCLENBQUM7WUFDdEUsUUFBUSxFQUFFLHlCQUF5QjtZQUNuQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUN6QixJQUFJLEVBQUUsbUJBQW1CO2FBQ3pCO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUM7U0FDaEYsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2Q0FBNkM7WUFDakQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSw2QkFBNkIsQ0FBQztZQUNsRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsRUFDbkIsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixzQkFBc0IsQ0FDdEIsQ0FDRDtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxFQUNsRCxtQkFBbUIsQ0FDbkI7b0JBQ0QsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsZUFBZSxFQUFFLENBQUE7Z0JBQ3ZELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUE7Z0JBQ3pELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNyQixPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUM3QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsZ0NBQWdDLENBQUMsQ0FDaEUsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sNkJBQTZCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDMUQsVUFBVSwwQkFBMEIsRUFBRSxFQUN0QyxLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsOENBQThDO1lBQ2xELEtBQUssRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsdUNBQXVDLENBQUM7WUFDN0UsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxZQUFZLEVBQUUsNkJBQTZCO1lBQzNDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsRUFDbEQsNkJBQTZCLENBQzdCO2lCQUNEO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztpQkFDekI7YUFDRDtZQUNELEdBQUcsRUFBRSxDQUFDLFFBQTBCLEVBQUUsRUFBRSxDQUNuQyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDO1NBQ2pGLENBQUMsQ0FBQTtRQUVGLE1BQU0sOEJBQThCLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FDOUQsVUFBVSwwQkFBMEIsRUFBRSxFQUN0QyxLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsd0NBQXdDLENBQUM7WUFDL0UsWUFBWSxFQUFFLDhCQUE4QjtZQUM1QyxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsRUFDbEQsOEJBQThCLENBQzlCO2lCQUNEO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztpQkFDekI7YUFDRDtZQUNELEdBQUcsRUFBRSxDQUFDLFFBQTBCLEVBQUUsRUFBRSxDQUNuQyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDO1NBQ2xGLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLHVCQUF1QixDQUFDO1lBQ3RELFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsWUFBWSxFQUFFLDRCQUE0QjtZQUMxQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLEVBQ25CLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIsc0JBQXNCLENBQ3RCLENBQ0Q7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsRUFDbEQsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFDbkUsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsVUFBVSwwQkFBMEIsRUFBRSxFQUN0Qyx1QkFBdUIsQ0FDdkIsQ0FDRCxDQUNEO29CQUNELEtBQUssRUFBRSxXQUFXO29CQUNsQixLQUFLLEVBQUUsQ0FBQztpQkFDUjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQztvQkFDaEUsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDZixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtZQUNsRCxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx1Q0FBdUM7WUFDM0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsdUJBQXVCLENBQUM7WUFDdEQsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDdEIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixzQkFBc0IsQ0FDdEI7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUM7b0JBQ3hELEtBQUssRUFBRSxjQUFjO29CQUNyQixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNmLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ3RFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7b0JBQ1QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQzVELENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNsRCxrQkFBa0IsMkNBRWxCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGdEQUFnRDtZQUNwRCxLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLDBDQUEwQyxDQUFDO1lBQ2xGLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFDMUMsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixzQkFBc0IsQ0FDdEIsQ0FDRDthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNmLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ3RFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7b0JBQ1QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQzVELENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNsRCxrQkFBa0IsNENBRWxCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSxrQ0FBa0MsQ0FBQztZQUNsRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUN0Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHNCQUFzQixDQUN0QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQztvQkFDeEQsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDdkUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO29CQUNULElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztvQkFDbEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDN0QsQ0FBQTtnQkFDRCxJQUFJLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNoQyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQ2xELG1CQUFtQiwyQ0FFbkIsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxTQUFTLENBQ2YscUJBQXFCLEVBQ3JCLHFEQUFxRCxDQUNyRDtZQUNELFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFDMUMsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixzQkFBc0IsQ0FDdEIsQ0FDRDthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNmLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ3ZFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztvQkFDVCxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQ2xELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQzdELENBQUE7Z0JBQ0QsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNsRCxtQkFBbUIsNkNBRW5CLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDO1lBQzNELFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUM7aUJBQzVFO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLEVBQ2xELGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUMsQ0FDdEU7b0JBQ0QsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7Z0JBQzFELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ3BELE1BQU0sU0FBUyxHQUFHLE1BQU0saUJBQWlCLENBQUMsY0FBYyxDQUFDO29CQUN4RCxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDO29CQUN2RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM1RCxjQUFjLEVBQUUsSUFBSTtvQkFDcEIsYUFBYSxFQUFFLElBQUk7b0JBQ25CLFNBQVMsRUFBRSxtQkFBbUIsQ0FDN0IsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQ25GO2lCQUNELENBQUMsQ0FBQTtnQkFDRixJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxzQ0FBc0MsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDdkYsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSx3QkFBd0IsQ0FBQztZQUN4RCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO29CQUMxQixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQy9DLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUMsQ0FDdEU7aUJBQ0Q7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxTQUFzQixFQUFFLEVBQUU7Z0JBQ2pFLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUM1RSxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtnQkFFOUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQ1IsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQ2QsTUFBTSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDOUUsQ0FDRCxDQUFBO2dCQUNELElBQUksS0FBd0IsRUFDM0IsYUFBYSxHQUFHLEtBQUssRUFDckIsY0FBYyxHQUFHLEtBQUssQ0FBQTtnQkFDdkIsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO3dCQUM3QixLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUMzQixNQUFLO29CQUNOLENBQUM7b0JBQ0QsYUFBYTt3QkFDWixhQUFhOzRCQUNiLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0saUVBQTRDLENBQUE7b0JBQ3pFLGNBQWM7d0JBQ2IsY0FBYzs0QkFDZCxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLDJFQUFpRCxDQUFBO2dCQUMvRSxDQUFDO2dCQUNELElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsTUFBTSxLQUFLLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixtQkFBbUIsQ0FBQyxNQUFNLENBQ3pCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUNmLENBQUMsQ0FBQyxRQUFRLENBQ1IsNEJBQTRCLEVBQzVCLG1GQUFtRixDQUNuRjt3QkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLGlDQUFpQyxFQUNqQyxnRkFBZ0YsQ0FDaEYsRUFDSDt3QkFDQzs0QkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFlBQVksQ0FBQzs0QkFDNUQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7eUJBQy9CO3FCQUNELENBQ0QsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQzNCLG1CQUFtQixDQUFDLE1BQU0sQ0FDekIsUUFBUSxDQUFDLElBQUksRUFDYixLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7d0JBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FDUiw2QkFBNkIsRUFDN0IsNEVBQTRFLENBQzVFO3dCQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1Isa0NBQWtDLEVBQ2xDLHlFQUF5RSxDQUN6RSxFQUNIO3dCQUNDOzRCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsb0JBQW9CLENBQUM7NEJBQzVFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyx1QkFBdUIsRUFBRTt5QkFDL0Q7cUJBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxtQkFBbUIsQ0FBQyxNQUFNLENBQ3pCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUNmLENBQUMsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsa0NBQWtDLENBQUM7d0JBQzlFLENBQUMsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsaUNBQWlDLENBQUMsRUFDbkYsRUFBRSxDQUNGLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDBEQUEwRDtZQUM5RCxLQUFLLEVBQUUsU0FBUyxDQUFDLDhCQUE4QixFQUFFLG9DQUFvQyxDQUFDO1lBQ3RGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQztpQkFDekU7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO2dCQUN6QyxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtnQkFDckYsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUNqQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTt3QkFDMUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTt3QkFDekMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO3dCQUN0RSxTQUFTLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFBO3dCQUNwRixTQUFTLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTt3QkFDN0IsU0FBUyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7d0JBQzdELFNBQVMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUMvQixnQ0FBZ0MsRUFDaEMsK0JBQStCLENBQy9CLENBQUE7d0JBQ0QsU0FBUyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7d0JBQy9CLFdBQVcsQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLEdBQUcsQ0FDUixTQUFTLENBQUMsV0FBVyxFQUNyQixTQUFTLENBQUMsV0FBVyxDQUNyQixDQUFDLEtBQUssSUFBSSxFQUFFOzRCQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTs0QkFDaEIsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ3JCLElBQUksQ0FBQztvQ0FDSixNQUFNLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0NBQ2pGLENBQUM7Z0NBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQ0FDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO29DQUNSLE9BQU07Z0NBQ1AsQ0FBQzs0QkFDRixDQUFDOzRCQUNELENBQUMsRUFBRSxDQUFBO3dCQUNKLENBQUMsQ0FBQyxDQUNGLENBQUE7d0JBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQ2pFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDakIsQ0FBQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO29CQUMxRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0saUJBQWlCLENBQUMsY0FBYyxDQUFDO3dCQUNoRSxnQkFBZ0IsRUFBRSxJQUFJO3dCQUN0QixjQUFjLEVBQUUsS0FBSzt3QkFDckIsYUFBYSxFQUFFLEtBQUs7d0JBQ3BCLEtBQUssRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsaUNBQWlDLENBQUM7cUJBQ3pFLENBQUMsQ0FBQTtvQkFDRixJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUIsTUFBTSwwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUMzRSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3JFLFlBQVksQ0FBQyxjQUFjLENBQUMsMkJBQTJCLEVBQUU7WUFDeEQsT0FBTyxFQUFFLHVCQUF1QjtZQUNoQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNCQUFzQixDQUFDO1lBQzNELEtBQUssRUFBRSxZQUFZO1lBQ25CLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxFQUFFLFVBQVU7U0FDaEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSx3QkFBd0IsR0FBRyw0QkFBNEIsQ0FBQTtRQUM3RCxNQUFNLDZCQUE2QixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ3ZELG1CQUFtQixFQUNuQixjQUFjLENBQUMsS0FBSyxDQUNuQixtQ0FBbUMsQ0FBQyxHQUFHLEVBQ3ZDLElBQUksTUFBTSxDQUFDLElBQUksb0NBQW1CLEdBQUcsQ0FBQyxDQUN0QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHdCQUF3QjtZQUM1QixLQUFLLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixFQUFFLDBCQUEwQixDQUFDO1lBQ3RFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLDZCQUE2QjtpQkFDbkM7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsSUFBSSxFQUFFLDZCQUE2QjtvQkFDbkMsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDO2FBQ3JFO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1NBQ25FLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsbURBQW1EO1lBQ3ZELEtBQUssRUFBRSxTQUFTLENBQUMsdUJBQXVCLEVBQUUseUJBQXlCLENBQUM7WUFDcEUsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsbUJBQW1CO2lCQUN6QjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixJQUFJLEVBQUUsbUJBQW1CO29CQUN6QixLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUM7YUFDN0U7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7U0FDbEUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx1REFBdUQ7WUFDM0QsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSw2QkFBNkIsQ0FBQztZQUM1RSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxtQkFBbUI7aUJBQ3pCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLElBQUksRUFBRSxtQkFBbUI7b0JBQ3pCLEtBQUssRUFBRSxjQUFjO29CQUNyQixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGFBQWEsQ0FBQzthQUNqRjtZQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztTQUN0RSxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHlEQUF5RDtZQUM3RCxLQUFLLEVBQUUsU0FBUyxDQUFDLDZCQUE2QixFQUFFLG9DQUFvQyxDQUFDO1lBQ3JGLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLG1CQUFtQjtpQkFDekI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsSUFBSSxFQUFFLG1CQUFtQjtvQkFDekIsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsb0JBQW9CLENBQUM7YUFDekY7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQztTQUM1RSxDQUFDLENBQUE7UUFFRixNQUFNLCtCQUErQixHQUFHLElBQUksTUFBTSxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDckYsWUFBWSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRTtZQUNwRCxPQUFPLEVBQUUsK0JBQStCO1lBQ3hDLEtBQUssRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDO1lBQ2pELElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsRUFDbkIsY0FBYyxDQUFDLEtBQUssQ0FDbkIsbUNBQW1DLENBQUMsR0FBRyxFQUN2QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLG9DQUFtQixHQUFHLENBQUMsQ0FDdEMsQ0FDRDtZQUNELEtBQUssRUFBRSxjQUFjO1lBQ3JCLEtBQUssRUFBRSxDQUFDO1NBQ1IsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2hELElBQUksQ0FBQyx1QkFBdUIsQ0FBQztnQkFDNUIsRUFBRSxFQUFFLHVDQUF1QyxRQUFRLEVBQUU7Z0JBQ3JELEtBQUssRUFBRSxRQUFRO2dCQUNmLElBQUksRUFBRTtvQkFDTDt3QkFDQyxFQUFFLEVBQUUsK0JBQStCO3dCQUNuQyxJQUFJLEVBQUUsbUJBQW1CO3dCQUN6QixLQUFLLEVBQUUsS0FBSztxQkFDWjtpQkFDRDtnQkFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQ1QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxjQUFjLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO2FBQ3BGLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSwwQkFBMEIsQ0FBQztZQUNyRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUN0Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHNCQUFzQixDQUN0QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUM7YUFDcEU7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7U0FDbEUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw4Q0FBOEM7WUFDbEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsQ0FBQztZQUM5RCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLFlBQVksRUFBRSxtQkFBbUI7WUFDakMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLElBQUksRUFBRSxtQkFBbUI7b0JBQ3pCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsU0FBUyxDQUFDO2FBQzdFO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1NBQ2pFLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsZ0RBQWdEO1lBQ3BELEtBQUssRUFBRSxTQUFTLENBQ2Ysb0NBQW9DLEVBQ3BDLDBDQUEwQyxDQUMxQztZQUNELFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUM7aUJBQzVFO2dCQUNEO29CQUNDLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLEtBQUssRUFBRSxhQUFhO29CQUNwQixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSx5QkFBeUIsQ0FBQztpQkFDNUU7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FDckMsOEJBQThCLEVBQzlCLHVCQUF1QixDQUN2QjthQUNEO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7U0FDOUUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSx5QkFBeUIsQ0FBQztZQUNwRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUN0Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHNCQUFzQixDQUN0QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUM7YUFDbkU7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7U0FDbEUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxvREFBb0Q7WUFDeEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSwwQkFBMEIsQ0FBQztZQUN0RSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUN0Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHNCQUFzQixDQUN0QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsdUJBQXVCO29CQUMzQixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUM7YUFDckU7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7U0FDbkUsQ0FBQyxDQUFBO1FBRUYsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ2pFLFlBQVksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUU7WUFDcEQsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUM7WUFDdEMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3JGLEtBQUssRUFBRSxRQUFRO1lBQ2YsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDLENBRUQ7UUFBQTtZQUNBO2dCQUNDLEVBQUUsRUFBRSxVQUFVO2dCQUNkLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDO2dCQUNwRCxZQUFZLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFO2dCQUMvQyxjQUFjLDBDQUFxQjthQUNuQztZQUNEO2dCQUNDLEVBQUUsRUFBRSxRQUFRO2dCQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDO2dCQUMzQyxZQUFZLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFO2dCQUMvQyxjQUFjLDhDQUF1QjthQUNyQztZQUNEO2dCQUNDLEVBQUUsRUFBRSxNQUFNO2dCQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztnQkFDdkMsWUFBWSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sRUFBRTtnQkFDL0MsY0FBYyw0QkFBYzthQUM1QjtZQUNEO2dCQUNDLEVBQUUsRUFBRSxlQUFlO2dCQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGdCQUFnQixDQUFDO2dCQUMzRCxZQUFZLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFO2dCQUMvQyxjQUFjLDRDQUFzQjthQUNwQztZQUNEO2dCQUNDLEVBQUUsRUFBRSxZQUFZO2dCQUNoQixLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQztnQkFDdEQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxFQUMzQyw0QkFBNEIsQ0FBQyxNQUFNLEVBQUUsRUFDckMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLENBQ2pDO2dCQUNELGNBQWMsRUFBRSxZQUFZO2FBQzVCO1NBQ0QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzVELE1BQU0scUJBQXFCLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FDakQsaUNBQWlDLENBQUMsR0FBRyxFQUNyQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQ2pDLENBQUE7WUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUM7Z0JBQzVCLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxFQUFFO2dCQUMzQixLQUFLO2dCQUNMLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixZQUFZLEVBQ1osY0FBYyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQzdFLHFCQUFxQixDQUNyQjtnQkFDRCxJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsRUFBRSxFQUFFLHFCQUFxQjt3QkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsRUFDM0QscUJBQXFCLENBQ3JCO3dCQUNELEtBQUssRUFBRSxLQUFLO3FCQUNaO2lCQUNEO2dCQUNELE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2YsTUFBTSwyQkFBMkIsR0FBRyxDQUNuQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUMzRCxFQUFFLG9CQUFvQixFQUE4QyxDQUFBO29CQUNyRSxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDaEYsMkJBQTJCLEVBQUUsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtvQkFDakYsMkJBQTJCLEVBQUUsS0FBSyxFQUFFLENBQUE7Z0JBQ3JDLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsMERBQTBEO1lBQzlELEtBQUssRUFBRSxTQUFTLENBQUMsOEJBQThCLEVBQUUsaUNBQWlDLENBQUM7WUFDbkYsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUUsc0JBQXNCO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLDJCQUEyQjtnQkFDL0IsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRO3FCQUNoQyxHQUFHLENBQUMsYUFBYSxDQUFDO3FCQUNsQixnQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUN2QixNQUFNLDJCQUEyQixHQUFHLGlCQUFpRCxDQUFBO29CQUNyRiwyQkFBMkIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7b0JBQ3RDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsOENBQThDO1lBQ2xELEtBQUssRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDO1lBQy9DLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsSUFBSSxFQUFFLFdBQVc7WUFDakIsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7Z0JBQzdCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUM7Z0JBQ3hELEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0saUJBQWlCLEdBQUcsUUFBUTtxQkFDaEMsR0FBRyxDQUFDLGFBQWEsQ0FBQztxQkFDbEIsZ0NBQWdDLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzlDLElBQUksaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkIsTUFBTyxpQkFBa0QsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDcEUsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1FQUFtRTtZQUN2RSxLQUFLLEVBQUUsUUFBUSxDQUNkLHVDQUF1QyxFQUN2QywwQ0FBMEMsQ0FDMUM7WUFDRCxJQUFJLEVBQUUsK0JBQStCO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxpQ0FBaUMsQ0FBQztnQkFDdEUsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxJQUFJLEdBQUcsUUFBUTtxQkFDbkIsR0FBRyxDQUFDLGFBQWEsQ0FBQztxQkFDbEIsbUJBQW1CLENBQ25CLGlDQUFpQyxDQUNNLENBQUE7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7WUFDOUMsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsbURBQW1ELENBQUMsRUFBRTtZQUMxRCxLQUFLLEVBQUUsbURBQW1ELENBQUMsS0FBSztZQUNoRSxJQUFJLEVBQUUsd0JBQXdCO1lBQzlCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO2lCQUNoRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxpQ0FBaUMsQ0FBQztvQkFDdEUsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQ1QsU0FBUyxDQUNSLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLG1EQUFtRCxFQUNuRCxtREFBbUQsQ0FBQyxFQUFFLEVBQ3RELG1EQUFtRCxDQUFDLEtBQUssQ0FDekQsQ0FDRDtTQUNGLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsdUNBQXVDLENBQUMsRUFBRTtZQUM5QyxLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLHVDQUF1QyxDQUFDLEtBQUs7Z0JBQ3BELFFBQVEsRUFBRSwwQ0FBMEM7YUFDcEQ7WUFDRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsRUFDbkIsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixzQkFBc0IsQ0FDdEIsQ0FDRDthQUNEO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULFNBQVMsQ0FDUixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2Qyx1Q0FBdUMsRUFDdkMsdUNBQXVDLENBQUMsRUFBRSxFQUMxQyx1Q0FBdUMsQ0FBQyxLQUFLLENBQzdDLENBQ0Q7U0FDRixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQseUJBQXlCO0lBQ2pCLDBCQUEwQjtRQUNqQyxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDMUIsS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7WUFDaEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUNyRCxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQzdDO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDM0UsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sU0FBUyxHQUFHLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1RCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtvQkFDdkUsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsc0JBQXNCLENBQUMsRUFBRTtZQUM3QixLQUFLLEVBQUUsc0JBQXNCLENBQUMsS0FBSztZQUNuQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQ3ZDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQ3JELGNBQWMsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FDaEQ7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUMzRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzVELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDcEQsQ0FBQTtnQkFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO29CQUMxRSxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtvQkFDNUIsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFO1lBQ2hDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxLQUFLO1lBQ3RDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFDdkMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFDckQsY0FBYyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUNuRDthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBQzNFLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNwRCxDQUFBO2dCQUNELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUE7b0JBQzdFLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO29CQUM1QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1EQUFtRDtZQUN2RCxLQUFLLEVBQUUsU0FBUyxDQUFDLDBCQUEwQixFQUFFLDBCQUEwQixDQUFDO1lBQ3hFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLHFCQUFxQjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFDdkMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUMxRCxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQ2xELGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFDM0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN4QzthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBQzNFLE1BQU0sU0FBUyxHQUFHLENBQ2pCLE1BQU0seUJBQXlCLENBQUMsYUFBYSxDQUM1QyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQ3JCLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FDRCxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNKLHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzNFLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGlEQUFpRDtZQUNyRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixDQUFDO1lBQ2pFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLHFCQUFxQjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFDdkMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUMxRCxjQUFjLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEVBQ2hELGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFDM0MsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN4QzthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBQzNFLE1BQU0sU0FBUyxHQUFHLENBQ2pCLE1BQU0seUJBQXlCLENBQUMsYUFBYSxDQUM1QyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQ3JCLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FDRCxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNKLHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQzVFLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLEVBQUU7WUFDekMsS0FBSyxFQUFFLGtDQUFrQyxDQUFDLEtBQUs7WUFDL0MsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsY0FBYyxDQUFDLFNBQVMsQ0FBQyxVQUFVLDBCQUEwQixFQUFFLEVBQUUsdUJBQXVCLENBQUMsRUFDekYsY0FBYyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FDakQsRUFDRCxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEVBQzlDLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FDeEM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxvQkFBb0I7Z0JBQzNCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQ3ZDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQ3JELGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FDeEM7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRTtnQkFDckQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUMzRSxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQ3ZDLENBQUE7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtvQkFDdEYsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsbUNBQW1DLENBQUMsRUFBRTtZQUMxQyxLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLG1DQUFtQyxDQUFDLEtBQUs7Z0JBQ2hELFFBQVEsRUFBRSx5QkFBeUI7YUFDbkM7WUFDRCxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLFlBQVksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsMEJBQTBCLEVBQUUsRUFBRSxLQUFLLENBQUM7WUFDbEYsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFDckQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN4QzthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFO2dCQUNyRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBQzNFLE1BQU0sU0FBUyxHQUFHLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1RCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDdkMsQ0FBQTtnQkFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO29CQUN2RixNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtvQkFDNUIsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSwrQ0FBK0M7WUFDbkQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwrQkFBK0IsQ0FBQztZQUN4RSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLHFCQUFxQjtnQkFDNUIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLG1CQUFtQixFQUNuQixjQUFjLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLEVBQzFELGNBQWMsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsRUFDbEQsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUMzRCxjQUFjLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQ3ZDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQ3JELGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FDeEM7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRTtnQkFDckQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUMzRSxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQ3ZDLENBQUE7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsK0JBQStCLENBQUMsQ0FBQTtvQkFDbkYsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsNkNBQTZDO1lBQ2pELEtBQUssRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMkJBQTJCLENBQUM7WUFDckUsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxxQkFBcUI7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsRUFDbkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUMxRCxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsRUFDM0QsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUNyRCxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQ3hDO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDM0UsTUFBTSxTQUFTLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzVELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN2QyxDQUFBO2dCQUNELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUE7b0JBQ25GLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO29CQUM1QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDMUIsS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7WUFDaEMsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUscUJBQXFCO2dCQUM1QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUN2QyxjQUFjLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQ3BDLGNBQWMsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FDbkQ7YUFDRDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDNUUsTUFBTSxTQUFTLEdBQUcsQ0FDakIsTUFBTSwwQkFBMEIsQ0FBQyxhQUFhLENBQzdDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFDckIsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUNELENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0osTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3ZFLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO2dCQUM1QixPQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNwQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSw2Q0FBNkM7WUFDakQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLFdBQVc7Z0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxFQUN2RCxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFDOUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxFQUN6QyxxQ0FBcUMsQ0FDckM7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2xELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDcEQsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FDQyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQ2xELENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFDckIsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUNELENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0wsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO3dCQUNqRSx3QkFBd0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCO3FCQUMzRSxDQUFDLENBQUE7b0JBQ0YsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsdUJBQXVCLENBQUM7WUFDdkUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsV0FBVztnQkFDbEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQ3ZELGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDeEMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUN4QyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEVBQzlDLHVCQUF1QixDQUN2QjtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNwRCxDQUFDLENBQUMsQ0FBQztvQkFDSixDQUNDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FDbEQsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUNyQixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDTCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7d0JBQ2pFLHdCQUF3QixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUI7d0JBQzNFLGVBQWUsRUFBRSxJQUFJO3FCQUNyQixDQUFDLENBQUE7b0JBQ0YsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsMkRBQTJEO1lBQy9ELEtBQUssRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsbUNBQW1DLENBQUM7WUFDckYsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsV0FBVztnQkFDbEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQ3ZELGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDeEMsY0FBYyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxFQUNuRCxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQ2xELGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFDOUMsdUJBQXVCLENBQ3ZCO2dCQUNELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxTQUFTLEdBQ2QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNsRCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQ3BELENBQUMsQ0FBQyxDQUFDO29CQUNKLENBQ0MsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNsRCxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQ3JCLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FDRCxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNMLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRTt3QkFDakUsZUFBZSxFQUFFLElBQUk7d0JBQ3JCLFVBQVUsRUFBRSxJQUFJO3FCQUNoQixDQUFDLENBQUE7b0JBQ0YsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7b0JBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsMkJBQTJCLENBQUMsRUFBRTtZQUNsQyxLQUFLLEVBQUUsMkJBQTJCLENBQUMsS0FBSztZQUN4QyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxXQUFXO2dCQUNsQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsRUFDdkQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUN4QyxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FDOUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2xELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDcEQsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FDQyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQ2xELENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFDckIsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUNELENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0wsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLG9CQUFvQjt5QkFDekIsY0FBYyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUM7eUJBQzdELEdBQUcsRUFBRSxDQUFBO2dCQUNSLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSwyQ0FBMkM7WUFDL0MsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQ0FBMkMsRUFBRSxNQUFNLENBQUM7WUFDckUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsUUFBUTthQUNmO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ3hELE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNwRCxDQUFDLENBQUMsQ0FBQztvQkFDSixDQUNDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FDbEQsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUNyQixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDTCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUM5RSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO29CQUM5RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQzNCLDBCQUEwQixFQUMxQixrQkFBa0IsRUFDbEIsU0FBUyxDQUFDLFdBQVcsQ0FDckIsQ0FBQTtvQkFDRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDcEYsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUN6Qix3QkFBd0IsRUFDeEIsZ0JBQWdCLEVBQ2hCLFNBQVMsQ0FBQyxvQkFBb0IsQ0FDOUIsQ0FBQTtvQkFDRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRzt3QkFDekIsQ0FBQyxDQUFDLFFBQVEsQ0FDUixnQ0FBZ0MsRUFDaEMsMEJBQTBCLEVBQzFCLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUNsQjt3QkFDRixDQUFDLENBQUMsSUFBSSxDQUFBO29CQUNQLE1BQU0sWUFBWSxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsS0FBSyxXQUFXLEtBQUssUUFBUSxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFBO29CQUMxRyxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDZDQUE2QztZQUNqRCxLQUFLLEVBQUUsU0FBUyxDQUFDLDZDQUE2QyxFQUFFLG1CQUFtQixDQUFDO1lBQ3BGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLFFBQVE7YUFDZjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztTQUM5QyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLFdBQVcsQ0FBQztZQUNyRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxRQUFRO2dCQUNmLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ3hDLGtDQUFrQyxDQUNsQzthQUNEO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQUMsRUFBRSxTQUF3QixFQUFFLEVBQUU7Z0JBQ3RFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUN4RCxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDM0IsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUN4RCxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsdUNBQXVDO1lBQzNDLEtBQUssRUFBRSxTQUFTLENBQUMsdUNBQXVDLEVBQUUsVUFBVSxDQUFDO1lBQ3JFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUNyRCxjQUFjLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQy9DO2dCQUNELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FDckQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUMzRixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUM7WUFDakQsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsRUFDdkQsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUM5QyxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQ3hDO2dCQUNELEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2RDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNFLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGdEQUFnRDtZQUNwRCxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDJCQUEyQixDQUFDO1lBQ3BFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQ3ZELGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsRUFDOUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUN4QyxjQUFjLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQ25EO2dCQUNELEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2RDtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzlELFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFFLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHNEQUFzRDtZQUMxRCxLQUFLLEVBQUUsU0FBUyxDQUNmLHFEQUFxRCxFQUNyRCxxQkFBcUIsQ0FDckI7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFDckQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUNwRDtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUMvQyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyx1Q0FBdUMsRUFBRSxFQUFFLENBQUM7U0FDMUYsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxrREFBa0Q7WUFDdEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrREFBa0QsRUFBRSxvQkFBb0IsQ0FBQztZQUMxRixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFDckQsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUM3QztnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFLENBQ3JELFFBQVE7aUJBQ04sR0FBRyxDQUFDLG1CQUFtQixDQUFDO2lCQUN4Qiw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQy9ELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsc0RBQXNEO1lBQzFELEtBQUssRUFBRSxTQUFTLENBQ2Ysc0RBQXNELEVBQ3RELGlDQUFpQyxDQUNqQztZQUNELE9BQU8sRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDO1lBQzNELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxFQUNyRCxjQUFjLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQ2xFLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFDakQsY0FBYyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FDMUQ7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsWUFBMkIsRUFBRSxFQUFFO2dCQUNqRixNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtnQkFDNUQsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFFBQVE7b0JBQ3RDLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3JELGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUMzRTtvQkFDRixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNaLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUNBQWlDLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3BGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSxpQ0FBaUM7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxtREFBbUQsRUFBRSxxQkFBcUIsQ0FBQztZQUM1RixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsRUFDckQsdUJBQXVCLEVBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQzFEO2dCQUNELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEUsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQ3ZDLENBQUE7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0UsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtEQUFrRDtZQUN0RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtEQUFrRCxFQUFFLHVCQUF1QixDQUFDO1lBQzdGLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUM7Z0JBQ2xELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FDckQsUUFBUTtpQkFDTixHQUFHLENBQUMsdUNBQXVDLENBQUM7aUJBQzVDLGlDQUFpQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUM7U0FDOUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx1REFBdUQ7WUFDM0QsS0FBSyxFQUFFLFNBQVMsQ0FDZix1REFBdUQsRUFDdkQsNkJBQTZCLENBQzdCO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQztnQkFDdkQsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUNyRCxRQUFRO2lCQUNOLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQztpQkFDNUMsaUNBQWlDLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQztTQUMvQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLG9FQUFvRTtZQUN4RSxLQUFLLEVBQUUsU0FBUyxDQUNmLG9FQUFvRSxFQUNwRSxrQ0FBa0MsQ0FDbEM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQzNCLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixxQkFBcUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQzFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFDakQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUM5RCxjQUFjLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQzFELGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQ3ZEO2dCQUNELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRCxHQUFHLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQVUsRUFBRSxFQUFFLENBQy9DLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7U0FDekUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQzVCLEVBQUUsRUFBRSx5RUFBeUU7WUFDN0UsS0FBSyxFQUFFLFNBQVMsQ0FDZix5RUFBeUUsRUFDekUsdUNBQXVDLENBQ3ZDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUMzQixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUMxQyxjQUFjLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQ2pELGNBQWMsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FDckQ7Z0JBQ0QsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELEdBQUcsRUFBRSxDQUFDLFFBQTBCLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FDL0MsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztTQUN6RSxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLDJEQUEyRDtZQUMvRCxLQUFLLEVBQUUsU0FBUyxDQUNmLDJEQUEyRCxFQUMzRCw0Q0FBNEMsQ0FDNUM7WUFDRCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQzVDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUMxRDthQUNEO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxnQ0FBZ0MsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7Z0JBQ3hGLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLFlBQVksZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3BGLE1BQU0sZUFBZSxHQUFHLE1BQU0sZ0NBQWdDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtnQkFDbkYsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzNDLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLGdDQUFnQyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGlFQUFpRTtZQUNyRSxLQUFLLEVBQUUsU0FBUyxDQUNmLGlFQUFpRSxFQUNqRSxtREFBbUQsQ0FDbkQ7WUFDRCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixxQkFBcUIsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQ3pDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUMxRDthQUNEO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUNqQywyREFBMkQsQ0FDM0Q7U0FDRixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLGtFQUFrRTtZQUN0RSxLQUFLLEVBQUUsU0FBUyxDQUNmLGtFQUFrRSxFQUNsRSxvREFBb0QsQ0FDcEQ7WUFDRCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQzVDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUMxRDthQUNEO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxnQ0FBZ0MsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7Z0JBQ3hGLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLFlBQVksZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3BGLE1BQU0sdUJBQXVCLEdBQzVCLE1BQU0sZ0NBQWdDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtnQkFDcEUsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sZ0NBQWdDLENBQUMsNEJBQTRCLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDakYsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsd0VBQXdFO1lBQzVFLEtBQUssRUFBRSxTQUFTLENBQ2Ysd0VBQXdFLEVBQ3hFLDJEQUEyRCxDQUMzRDtZQUNELFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFDekMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQzFEO2FBQ0Q7WUFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQ1QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQ2pDLGtFQUFrRSxDQUNsRTtTQUNGLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixFQUFFLEVBQUUsNkNBQTZDLENBQUMsRUFBRTtZQUNwRCxLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLDZDQUE2QyxDQUFDLEtBQUs7Z0JBQzFELFFBQVEsRUFBRSw4Q0FBOEM7YUFDeEQ7WUFDRCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO2FBQ2xEO1lBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULFNBQVMsQ0FDUixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2Qyw2Q0FBNkMsRUFDN0MsNkNBQTZDLENBQUMsRUFBRSxFQUNoRCw2Q0FBNkMsQ0FBQyxLQUFLLENBQ25ELENBQ0Q7U0FDRixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsRUFBRSxFQUFFLHFEQUFxRDtZQUN6RCxLQUFLLEVBQUUsU0FBUyxDQUNmLHFEQUFxRCxFQUNyRCxxQ0FBcUMsQ0FDckM7WUFDRCxRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtnQkFDckYsTUFBTSxpQkFBaUIsR0FBRywwQkFBMEIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO2dCQUMzRSxNQUFNLHFCQUFxQixHQUFHLGlCQUFpQjtxQkFDN0MsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQixFQUFFLEVBQUUsU0FBUyxDQUFDLFNBQVM7b0JBQ3ZCLEtBQUssRUFBRSxTQUFTLENBQUMsb0JBQW9CO29CQUNyQyxXQUFXLEVBQUUsU0FBUyxDQUFDLFNBQVM7b0JBQ2hDLE1BQU0sRUFBRSxJQUFJO2lCQUNaLENBQUMsQ0FBQztxQkFDRixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7b0JBQ2xFLFdBQVcsRUFBRSxJQUFJO29CQUNqQixLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFDQUFxQyxDQUFDO29CQUMzRSxXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGtDQUFrQyxDQUFDO2lCQUN6RixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtvQkFDOUIsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksaUJBQWlCLEVBQUUsQ0FBQzt3QkFDL0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQzs0QkFDN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO3dCQUNwQyxDQUFDO29CQUNGLENBQUM7b0JBQ0QsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7b0JBQzFGLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsQ0FBQTtnQkFDckUsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsc0JBQStDO1FBQzlFLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUk7WUFDeEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO2dCQUMzQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsSUFBSTtnQkFDN0IsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO1lBQ2hDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTCxJQUFJLGtCQUFrQixHQUFvRCxFQUFFLENBQUE7UUFDNUUsTUFBTSxlQUFlLEdBQXNDLEVBQUUsQ0FBQTtRQUM3RCxJQUFJLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3ZDLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ25ELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDekIsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQy9ELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsZUFBZSxDQUFDLElBQUksQ0FBQzt3QkFDcEIsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNYLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO3FCQUMvRSxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUMzQixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxXQUFXLENBQUMsR0FBRyxDQUNkLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztZQUNwQjtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsR0FBRyxzQkFBc0I7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0I7aUJBQ3hCLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7Z0JBQzdDLE9BQU8sc0JBQXNCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ3JELENBQUM7U0FDRCxDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxPQUFPLFdBQVcsQ0FBQTtJQUNuQixDQUFDO0NBQ0QsQ0FBQTtBQWhoRUssdUJBQXVCO0lBRTFCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsb0NBQW9DLENBQUE7SUFFcEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxlQUFlLENBQUE7R0FoQlosdUJBQXVCLENBZ2hFNUI7QUFFRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUM1QixZQUM4QiwwQkFBdUQsRUFDbkUsY0FBK0I7UUFFaEQsdUJBQXVCLENBQUMsK0JBQStCLENBQ3RELDBCQUEwQixFQUMxQixjQUFjLENBQ2QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBVkssdUJBQXVCO0lBRTFCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxlQUFlLENBQUE7R0FIWix1QkFBdUIsQ0FVNUI7QUFFRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQUNqQyxZQUVDLDBCQUFnRSxFQUN0Qyx1QkFBaUQsRUFDMUQsY0FBK0IsRUFDL0IsY0FBK0I7UUFFaEQsTUFBTSw4QkFBOEIsR0FBRyxtQ0FBbUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsb0NBQTJCLEVBQUUsQ0FBQztZQUNuRixLQUFLLE1BQU0sT0FBTyxJQUFJLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN4RCwwQkFBMEI7cUJBQ3hCLFlBQVksNkJBQXFCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztxQkFDNUQsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRTtvQkFDMUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtvQkFDM0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQzt3QkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDOzRCQUNyQyxTQUFRO3dCQUNULENBQUM7d0JBQ0QsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7d0JBQzVELElBQ0MsY0FBYyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUM7NEJBQzlELENBQUMsU0FBUyxDQUFDLG9CQUFvQjtnQ0FDOUIsY0FBYyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FDbEQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUM1QyxDQUFDLEVBQ0YsQ0FBQzs0QkFDRixTQUFRO3dCQUNULENBQUM7d0JBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTs0QkFDaEMsU0FBUzs0QkFDVCxvQkFBb0IsRUFBRSxTQUFTLENBQUMsb0JBQW9CO3lCQUNwRCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztvQkFDRCxJQUFJLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO3dCQUM1QiwwQkFBMEIsQ0FBQyxlQUFlLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO29CQUMxRSxDQUFDO29CQUNELGNBQWMsQ0FBQyxLQUFLLENBQ25CLDhCQUE4QixFQUM5QixNQUFNLG1FQUdOLENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBL0NLLDRCQUE0QjtJQUUvQixXQUFBLG9DQUFvQyxDQUFBO0lBRXBDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGVBQWUsQ0FBQTtHQU5aLDRCQUE0QixDQStDakM7QUFFRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3BDLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLHVCQUF1QixrQ0FBMEIsQ0FBQTtBQUNqRyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxhQUFhLG9DQUE0QixDQUFBO0FBQ3pGLGlCQUFpQixDQUFDLDZCQUE2QixDQUM5Qyx5QkFBeUIsb0NBRXpCLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxnQkFBZ0Isa0NBQTBCLENBQUE7QUFDMUYsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLGtDQUFrQyxrQ0FFbEMsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5QywyQkFBMkIsb0NBRTNCLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsMEJBQTBCLG9DQUUxQixDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLHNEQUFzRCxrQ0FFdEQsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5QyxpQ0FBaUMsa0NBRWpDLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMscUNBQXFDLG9DQUVyQyxDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLDRCQUE0QixvQ0FFNUIsQ0FBQTtBQUNELElBQUksS0FBSyxFQUFFLENBQUM7SUFDWCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsdUJBQXVCLG9DQUV2QixDQUFBO0FBQ0YsQ0FBQztBQUVELHFCQUFxQjtBQUNyQixlQUFlLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtBQUU1QyxRQUFRLENBQUMsRUFBRSxDQUNWLGdDQUFnQyxDQUFDLHNCQUFzQixDQUN2RCxDQUFDLCtCQUErQixDQUFDO0lBQ2pDO1FBQ0MsR0FBRyxFQUFFLDBCQUEwQjtRQUMvQixTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDOUIsSUFBSSxLQUFLLEtBQUssd0JBQXdCLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUN4QixDQUFDO1lBQ0QsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==