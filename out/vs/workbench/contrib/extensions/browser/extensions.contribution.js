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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxFQUNmLE9BQU8sR0FHUCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixFQUMzQix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLGdDQUFnQyxFQUVoQyw0QkFBNEIsRUFDNUIsMEJBQTBCLEdBRzFCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUVOLGlDQUFpQyxFQUVqQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEdBQ3BDLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxnQ0FBZ0MsR0FDaEMsTUFBTSwrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sVUFBVSxFQUNWLDJCQUEyQixFQUUzQixpQ0FBaUMsRUFDakMsc0NBQXNDLEVBQ3RDLGlDQUFpQyxFQUVqQywwQkFBMEIsRUFDMUIsNEJB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