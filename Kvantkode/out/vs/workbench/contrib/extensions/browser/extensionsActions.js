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
var InstallAction_1, InstallInOtherServerAction_1, UninstallAction_1, UpdateAction_1, ToggleAutoUpdateForExtensionAction_1, ToggleAutoUpdatesForPublisherAction_1, MigrateDeprecatedExtensionAction_1, ManageExtensionAction_1, TogglePreReleaseExtensionAction_1, InstallAnotherVersionAction_1, EnableForWorkspaceAction_1, EnableGloballyAction_1, DisableForWorkspaceAction_1, DisableGloballyAction_1, ExtensionRuntimeStateAction_1, SetColorThemeAction_1, SetFileIconThemeAction_1, SetProductIconThemeAction_1, SetLanguageAction_1, ClearLanguageAction_1, ShowRecommendedExtensionAction_1, InstallRecommendedExtensionAction_1, IgnoreExtensionRecommendationAction_1, UndoIgnoreExtensionRecommendationAction_1, ExtensionStatusLabelAction_1, ToggleSyncExtensionAction_1, ExtensionStatusAction_1, InstallSpecificVersionOfExtensionAction_1;
import './media/extensionActions.css';
import { localize, localize2 } from '../../../../nls.js';
import { Action, Separator, SubmenuAction, } from '../../../../base/common/actions.js';
import { Delayer, Promises, Throttler } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as json from '../../../../base/common/json.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionsWorkbenchService, TOGGLE_IGNORE_EXTENSION_ACTION_ID, SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID, THEME_ACTIONS_GROUP, INSTALL_ACTIONS_GROUP, UPDATE_ACTIONS_GROUP, AutoUpdateConfigurationKey, } from '../common/extensions.js';
import { ExtensionsConfigurationInitialContent } from '../common/extensionsFileTemplate.js';
import { IExtensionGalleryService, IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService, } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { areSameExtensions, getExtensionId, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ExtensionIdentifier, isLanguagePackExtension, getWorkspaceSupportTypeMessage, isApplicationScopedExtension, } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IExtensionService, toExtension, toExtensionDescription, } from '../../../services/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, registerColor, editorWarningForeground, editorInfoForeground, editorErrorForeground, buttonSeparator, } from '../../../../platform/theme/common/colorRegistry.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, IMenuService, } from '../../../../platform/actions/common/actions.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { IWorkbenchThemeService, } from '../../../services/themes/common/workbenchThemeService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { EXTENSIONS_CONFIG, } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { getErrorMessage, isCancellationError } from '../../../../base/common/errors.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { errorIcon, infoIcon, manageExtensionIcon, syncEnabledIcon, syncIgnoredIcon, trustIcon, warningIcon, } from './extensionsIcons.js';
import { isIOS, isWeb, language } from '../../../../base/common/platform.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { escapeMarkdownSyntaxTokens, MarkdownString, } from '../../../../base/common/htmlContent.js';
import { fromNow } from '../../../../base/common/date.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { getLocale } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { isString } from '../../../../base/common/types.js';
import { showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ActionWithDropdownActionViewItem, } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
let PromptExtensionInstallFailureAction = class PromptExtensionInstallFailureAction extends Action {
    constructor(extension, options, version, installOperation, error, productService, openerService, notificationService, dialogService, commandService, logService, extensionManagementServerService, instantiationService, galleryService, extensionManifestPropertiesService) {
        super('extension.promptExtensionInstallFailure');
        this.extension = extension;
        this.options = options;
        this.version = version;
        this.installOperation = installOperation;
        this.error = error;
        this.productService = productService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.logService = logService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.instantiationService = instantiationService;
        this.galleryService = galleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async run() {
        if (isCancellationError(this.error)) {
            return;
        }
        this.logService.error(this.error);
        if (this.error.name === "Unsupported" /* ExtensionManagementErrorCode.Unsupported */) {
            const productName = isWeb
                ? localize('VS Code for Web', '{0} for the Web', this.productService.nameLong)
                : this.productService.nameLong;
            const message = localize('cannot be installed', "The '{0}' extension is not available in {1}. Click 'More Information' to learn more.", this.extension.displayName || this.extension.identifier.id, productName);
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Info,
                message,
                primaryButton: localize({ key: 'more information', comment: ['&& denotes a mnemonic'] }, '&&More Information'),
                cancelButton: localize('close', 'Close'),
            });
            if (confirmed) {
                this.openerService.open(isWeb
                    ? URI.parse('https://aka.ms/vscode-web-extensions-guide')
                    : URI.parse('https://aka.ms/vscode-remote'));
            }
            return;
        }
        if ("ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */ ===
            this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: getErrorMessage(this.error),
                buttons: [
                    {
                        label: localize('install prerelease', 'Install Pre-Release'),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, {
                                installPreReleaseVersion: true,
                            });
                            installAction.extension = this.extension;
                            return installAction.run();
                        },
                    },
                ],
                cancelButton: localize('cancel', 'Cancel'),
            });
            return;
        }
        if ([
            "Incompatible" /* ExtensionManagementErrorCode.Incompatible */,
            "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */,
            "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */,
            "Malicious" /* ExtensionManagementErrorCode.Malicious */,
            "Deprecated" /* ExtensionManagementErrorCode.Deprecated */,
        ].includes(this.error.name)) {
            await this.dialogService.info(getErrorMessage(this.error));
            return;
        }
        if ("PackageNotSigned" /* ExtensionManagementErrorCode.PackageNotSigned */ ===
            this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: localize('not signed', "'{0}' is an extension from an unknown source. Are you sure you want to install?", this.extension.displayName),
                detail: getErrorMessage(this.error),
                buttons: [
                    {
                        label: localize('install anyway', 'Install Anyway'),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, {
                                ...this.options,
                                donotVerifySignature: true,
                            });
                            installAction.extension = this.extension;
                            return installAction.run();
                        },
                    },
                ],
                cancelButton: true,
            });
            return;
        }
        if ("SignatureVerificationFailed" /* ExtensionManagementErrorCode.SignatureVerificationFailed */ ===
            this.error.name ||
            "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */ ===
                this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: localize('verification failed', "Cannot install '{0}' extension because {1} cannot verify the extension signature", this.extension.displayName, this.productService.nameLong),
                detail: getErrorMessage(this.error),
                buttons: [
                    {
                        label: localize('learn more', 'Learn More'),
                        run: () => this.openerService.open('https://code.visualstudio.com/docs/editor/extension-marketplace#_the-extension-signature-cannot-be-verified-by-vs-code'),
                    },
                    {
                        label: localize('install donot verify', "Install Anyway (Don't Verify Signature)"),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, {
                                ...this.options,
                                donotVerifySignature: true,
                            });
                            installAction.extension = this.extension;
                            return installAction.run();
                        },
                    },
                ],
                cancelButton: true,
            });
            return;
        }
        const operationMessage = this.installOperation === 3 /* InstallOperation.Update */
            ? localize('update operation', "Error while updating '{0}' extension.", this.extension.displayName || this.extension.identifier.id)
            : localize('install operation', "Error while installing '{0}' extension.", this.extension.displayName || this.extension.identifier.id);
        let additionalMessage;
        const promptChoices = [];
        const downloadUrl = await this.getDownloadUrl();
        if (downloadUrl) {
            additionalMessage = localize('check logs', 'Please check the [log]({0}) for more details.', `command:${showWindowLogActionId}`);
            promptChoices.push({
                label: localize('download', 'Try Downloading Manually...'),
                run: () => this.openerService.open(downloadUrl).then(() => {
                    this.notificationService.prompt(Severity.Info, localize('install vsix', "Once downloaded, please manually install the downloaded VSIX of '{0}'.", this.extension.identifier.id), [
                        {
                            label: localize('installVSIX', 'Install from VSIX...'),
                            run: () => this.commandService.executeCommand(SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID),
                        },
                    ]);
                }),
            });
        }
        const message = `${operationMessage}${additionalMessage ? ` ${additionalMessage}` : ''}`;
        this.notificationService.prompt(Severity.Error, message, promptChoices);
    }
    async getDownloadUrl() {
        if (isIOS) {
            return undefined;
        }
        if (!this.extension.gallery) {
            return undefined;
        }
        if (!this.extensionManagementServerService.localExtensionManagementServer &&
            !this.extensionManagementServerService.remoteExtensionManagementServer) {
            return undefined;
        }
        let targetPlatform = this.extension.gallery.properties.targetPlatform;
        if (targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ &&
            targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            try {
                const manifest = await this.galleryService.getManifest(this.extension.gallery, CancellationToken.None);
                if (manifest &&
                    this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(manifest)) {
                    targetPlatform =
                        await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getTargetPlatform();
                }
            }
            catch (error) {
                this.logService.error(error);
                return undefined;
            }
        }
        if (targetPlatform === "unknown" /* TargetPlatform.UNKNOWN */) {
            return undefined;
        }
        const [extension] = await this.galleryService.getExtensions([
            {
                ...this.extension.identifier,
                version: this.version,
            },
        ], {
            targetPlatform,
        }, CancellationToken.None);
        if (!extension) {
            return undefined;
        }
        return URI.parse(extension.assets.download.uri);
    }
};
PromptExtensionInstallFailureAction = __decorate([
    __param(5, IProductService),
    __param(6, IOpenerService),
    __param(7, INotificationService),
    __param(8, IDialogService),
    __param(9, ICommandService),
    __param(10, ILogService),
    __param(11, IExtensionManagementServerService),
    __param(12, IInstantiationService),
    __param(13, IExtensionGalleryService),
    __param(14, IExtensionManifestPropertiesService)
], PromptExtensionInstallFailureAction);
export { PromptExtensionInstallFailureAction };
export class ExtensionAction extends Action {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._extension = null;
        this._hidden = false;
        this.hideOnDisabled = true;
    }
    static { this.EXTENSION_ACTION_CLASS = 'extension-action'; }
    static { this.TEXT_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} text`; }
    static { this.LABEL_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} label`; }
    static { this.PROMINENT_LABEL_ACTION_CLASS = `${ExtensionAction.LABEL_ACTION_CLASS} prominent`; }
    static { this.ICON_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} icon`; }
    get extension() {
        return this._extension;
    }
    set extension(extension) {
        this._extension = extension;
        this.update();
    }
    get hidden() {
        return this._hidden;
    }
    set hidden(hidden) {
        if (this._hidden !== hidden) {
            this._hidden = hidden;
            this._onDidChange.fire({ hidden });
        }
    }
    _setEnabled(value) {
        super._setEnabled(value);
        if (this.hideOnDisabled) {
            this.hidden = !value;
        }
    }
}
export class ButtonWithDropDownExtensionAction extends ExtensionAction {
    get menuActions() {
        return [...this._menuActions];
    }
    get extension() {
        return super.extension;
    }
    set extension(extension) {
        this.extensionActions.forEach((a) => (a.extension = extension));
        super.extension = extension;
    }
    constructor(id, clazz, actionsGroups) {
        clazz = `${clazz} action-dropdown`;
        super(id, undefined, clazz);
        this.actionsGroups = actionsGroups;
        this.menuActionClassNames = [];
        this._menuActions = [];
        this.menuActionClassNames = clazz.split(' ');
        this.hideOnDisabled = false;
        this.extensionActions = actionsGroups.flat();
        this.update();
        this._register(Event.any(...this.extensionActions.map((a) => a.onDidChange))(() => this.update(true)));
        this.extensionActions.forEach((a) => this._register(a));
    }
    update(donotUpdateActions) {
        if (!donotUpdateActions) {
            this.extensionActions.forEach((a) => a.update());
        }
        const actionsGroups = this.actionsGroups.map((actionsGroup) => actionsGroup.filter((a) => !a.hidden));
        let actions = [];
        for (const visibleActions of actionsGroups) {
            if (visibleActions.length) {
                actions = [...actions, ...visibleActions, new Separator()];
            }
        }
        actions = actions.length ? actions.slice(0, actions.length - 1) : actions;
        this.primaryAction = actions[0];
        this._menuActions = actions.length > 1 ? actions : [];
        this._onDidChange.fire({ menuActions: this._menuActions });
        if (this.primaryAction) {
            this.hidden = false;
            this.enabled = this.primaryAction.enabled;
            this.label = this.getLabel(this.primaryAction);
            this.tooltip = this.primaryAction.tooltip;
        }
        else {
            this.hidden = true;
            this.enabled = false;
        }
    }
    async run() {
        if (this.enabled) {
            await this.primaryAction?.run();
        }
    }
    getLabel(action) {
        return action.label;
    }
}
export class ButtonWithDropdownExtensionActionViewItem extends ActionWithDropdownActionViewItem {
    constructor(action, options, contextMenuProvider) {
        super(null, action, options, contextMenuProvider);
        this._register(action.onDidChange((e) => {
            if (e.hidden !== undefined || e.menuActions !== undefined) {
                this.updateClass();
            }
        }));
    }
    render(container) {
        super.render(container);
        this.updateClass();
    }
    updateClass() {
        super.updateClass();
        if (this.element && this.dropdownMenuActionViewItem?.element) {
            this.element.classList.toggle('hide', this._action.hidden);
            const isMenuEmpty = this._action.menuActions.length === 0;
            this.element.classList.toggle('empty', isMenuEmpty);
            this.dropdownMenuActionViewItem.element.classList.toggle('hide', isMenuEmpty);
        }
    }
}
let InstallAction = class InstallAction extends ExtensionAction {
    static { InstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent install`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    set manifest(manifest) {
        this._manifest = manifest;
        this.updateLabel();
    }
    constructor(options, extensionsWorkbenchService, instantiationService, runtimeExtensionService, workbenchThemeService, labelService, dialogService, preferencesService, telemetryService, contextService, allowedExtensionsService, extensionGalleryManifestService) {
        super('extensions.install', localize('install', 'Install'), InstallAction_1.CLASS, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.instantiationService = instantiationService;
        this.runtimeExtensionService = runtimeExtensionService;
        this.workbenchThemeService = workbenchThemeService;
        this.labelService = labelService;
        this.dialogService = dialogService;
        this.preferencesService = preferencesService;
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this._manifest = null;
        this.updateThrottler = new Throttler();
        this.hideOnDisabled = false;
        this.options = { isMachineScoped: false, ...options };
        this.update();
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this._register(this.labelService.onDidChangeFormatters(() => this.updateLabel(), this));
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateEnablement());
    }
    async computeAndUpdateEnablement() {
        this.enabled = false;
        this.class = InstallAction_1.HIDE;
        this.hidden = true;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.state !== 3 /* ExtensionState.Uninstalled */) {
            return;
        }
        if (this.options.installPreReleaseVersion &&
            (!this.extension.hasPreReleaseVersion ||
                this.allowedExtensionsService.isAllowed({
                    id: this.extension.identifier.id,
                    publisherDisplayName: this.extension.publisherDisplayName,
                    prerelease: true,
                }) !== true)) {
            return;
        }
        if (!this.options.installPreReleaseVersion && !this.extension.hasReleaseVersion) {
            return;
        }
        this.hidden = false;
        this.class = InstallAction_1.CLASS;
        if ((await this.extensionsWorkbenchService.canInstall(this.extension)) === true) {
            this.enabled = true;
            this.updateLabel();
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        if (this.extension.gallery &&
            !this.extension.gallery.isSigned &&
            (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities
                .signing?.allRepositorySigned) {
            const { result } = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('not signed', "'{0}' is an extension from an unknown source. Are you sure you want to install?", this.extension.displayName),
                detail: localize('not signed detail', 'Extension is not signed.'),
                buttons: [
                    {
                        label: localize('install anyway', 'Install Anyway'),
                        run: () => {
                            this.options.donotVerifySignature = true;
                            return true;
                        },
                    },
                ],
                cancelButton: {
                    run: () => false,
                },
            });
            if (!result) {
                return;
            }
        }
        if (this.extension.deprecationInfo) {
            let detail = localize('deprecated message', 'This extension is deprecated as it is no longer being maintained.');
            let DeprecationChoice;
            (function (DeprecationChoice) {
                DeprecationChoice[DeprecationChoice["InstallAnyway"] = 0] = "InstallAnyway";
                DeprecationChoice[DeprecationChoice["ShowAlternateExtension"] = 1] = "ShowAlternateExtension";
                DeprecationChoice[DeprecationChoice["ConfigureSettings"] = 2] = "ConfigureSettings";
                DeprecationChoice[DeprecationChoice["Cancel"] = 3] = "Cancel";
            })(DeprecationChoice || (DeprecationChoice = {}));
            const buttons = [
                {
                    label: localize('install anyway', 'Install Anyway'),
                    run: () => DeprecationChoice.InstallAnyway,
                },
            ];
            if (this.extension.deprecationInfo.extension) {
                detail = localize('deprecated with alternate extension message', 'This extension is deprecated. Use the {0} extension instead.', this.extension.deprecationInfo.extension.displayName);
                const alternateExtension = this.extension.deprecationInfo.extension;
                buttons.push({
                    label: localize({ key: 'Show alternate extension', comment: ['&& denotes a mnemonic'] }, '&&Open {0}', this.extension.deprecationInfo.extension.displayName),
                    run: async () => {
                        const [extension] = await this.extensionsWorkbenchService.getExtensions([{ id: alternateExtension.id, preRelease: alternateExtension.preRelease }], CancellationToken.None);
                        await this.extensionsWorkbenchService.open(extension);
                        return DeprecationChoice.ShowAlternateExtension;
                    },
                });
            }
            else if (this.extension.deprecationInfo.settings) {
                detail = localize('deprecated with alternate settings message', 'This extension is deprecated as this functionality is now built-in to VS Code.');
                const settings = this.extension.deprecationInfo.settings;
                buttons.push({
                    label: localize({ key: 'configure in settings', comment: ['&& denotes a mnemonic'] }, '&&Configure Settings'),
                    run: async () => {
                        await this.preferencesService.openSettings({
                            query: settings.map((setting) => `@id:${setting}`).join(' '),
                        });
                        return DeprecationChoice.ConfigureSettings;
                    },
                });
            }
            else if (this.extension.deprecationInfo.additionalInfo) {
                detail = new MarkdownString(`${detail} ${this.extension.deprecationInfo.additionalInfo}`);
            }
            const { result } = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('install confirmation', "Are you sure you want to install '{0}'?", this.extension.displayName),
                detail: isString(detail) ? detail : undefined,
                custom: isString(detail)
                    ? undefined
                    : {
                        markdownDetails: [
                            {
                                markdown: detail,
                            },
                        ],
                    },
                buttons,
                cancelButton: {
                    run: () => DeprecationChoice.Cancel,
                },
            });
            if (result !== DeprecationChoice.InstallAnyway) {
                return;
            }
        }
        this.extensionsWorkbenchService.open(this.extension, {
            showPreReleaseVersion: this.options.installPreReleaseVersion,
        });
        alert(localize('installExtensionStart', 'Installing extension {0} started. An editor is now open with more details on this extension', this.extension.displayName));
        /* __GDPR__
            "extensions:action:install" : {
                "owner": "sandy081",
                "actionId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "${include}": [
                    "${GalleryExtensionTelemetryData}"
                ]
            }
        */
        this.telemetryService.publicLog('extensions:action:install', {
            ...this.extension.telemetryData,
            actionId: this.id,
        });
        const extension = await this.install(this.extension);
        if (extension?.local) {
            alert(localize('installExtensionComplete', 'Installing extension {0} is completed.', this.extension.displayName));
            const runningExtension = await this.getRunningExtension(extension.local);
            if (runningExtension &&
                !(runningExtension.activationEvents &&
                    runningExtension.activationEvents.some((activationEent) => activationEent.startsWith('onLanguage')))) {
                const action = await this.getThemeAction(extension);
                if (action) {
                    action.extension = extension;
                    try {
                        return action.run({ showCurrentTheme: true, ignoreFocusLost: true });
                    }
                    finally {
                        action.dispose();
                    }
                }
            }
        }
    }
    async getThemeAction(extension) {
        const colorThemes = await this.workbenchThemeService.getColorThemes();
        if (colorThemes.some((theme) => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetColorThemeAction);
        }
        const fileIconThemes = await this.workbenchThemeService.getFileIconThemes();
        if (fileIconThemes.some((theme) => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetFileIconThemeAction);
        }
        const productIconThemes = await this.workbenchThemeService.getProductIconThemes();
        if (productIconThemes.some((theme) => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetProductIconThemeAction);
        }
        return undefined;
    }
    async install(extension) {
        try {
            return await this.extensionsWorkbenchService.install(extension, this.options);
        }
        catch (error) {
            await this.instantiationService
                .createInstance(PromptExtensionInstallFailureAction, extension, this.options, extension.latestVersion, 2 /* InstallOperation.Install */, error)
                .run();
            return undefined;
        }
    }
    async getRunningExtension(extension) {
        const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
        if (runningExtension) {
            return runningExtension;
        }
        if (this.runtimeExtensionService.canAddExtension(toExtensionDescription(extension))) {
            return new Promise((c, e) => {
                const disposable = this.runtimeExtensionService.onDidChangeExtensions(async () => {
                    const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
                    if (runningExtension) {
                        disposable.dispose();
                        c(runningExtension);
                    }
                });
            });
        }
        return null;
    }
    updateLabel() {
        this.label = this.getLabel();
    }
    getLabel(primary) {
        if (this.extension?.isWorkspaceScoped &&
            this.extension.resourceExtension &&
            this.contextService.isInsideWorkspace(this.extension.resourceExtension.location)) {
            return localize('install workspace version', 'Install Workspace Extension');
        }
        /* install pre-release version */
        if (this.options.installPreReleaseVersion && this.extension?.hasPreReleaseVersion) {
            return primary
                ? localize('install pre-release', 'Install Pre-Release')
                : localize('install pre-release version', 'Install Pre-Release Version');
        }
        /* install released version that has a pre release version */
        if (this.extension?.hasPreReleaseVersion) {
            return primary
                ? localize('install', 'Install')
                : localize('install release version', 'Install Release Version');
        }
        return localize('install', 'Install');
    }
};
InstallAction = InstallAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IInstantiationService),
    __param(3, IExtensionService),
    __param(4, IWorkbenchThemeService),
    __param(5, ILabelService),
    __param(6, IDialogService),
    __param(7, IPreferencesService),
    __param(8, ITelemetryService),
    __param(9, IWorkspaceContextService),
    __param(10, IAllowedExtensionsService),
    __param(11, IExtensionGalleryManifestService)
], InstallAction);
export { InstallAction };
let InstallDropdownAction = class InstallDropdownAction extends ButtonWithDropDownExtensionAction {
    set manifest(manifest) {
        this.extensionActions.forEach((a) => (a.manifest = manifest));
        this.update();
    }
    constructor(instantiationService, extensionsWorkbenchService) {
        super(`extensions.installActions`, InstallAction.CLASS, [
            [
                instantiationService.createInstance(InstallAction, {
                    installPreReleaseVersion: extensionsWorkbenchService.preferPreReleases,
                }),
                instantiationService.createInstance(InstallAction, {
                    installPreReleaseVersion: !extensionsWorkbenchService.preferPreReleases,
                }),
            ],
        ]);
    }
    getLabel(action) {
        return action.getLabel(true);
    }
};
InstallDropdownAction = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionsWorkbenchService)
], InstallDropdownAction);
export { InstallDropdownAction };
export class InstallingLabelAction extends ExtensionAction {
    static { this.LABEL = localize('installing', 'Installing'); }
    static { this.CLASS = `${ExtensionAction.LABEL_ACTION_CLASS} install installing`; }
    constructor() {
        super('extension.installing', InstallingLabelAction.LABEL, InstallingLabelAction.CLASS, false);
    }
    update() {
        this.class = `${InstallingLabelAction.CLASS}${this.extension && this.extension.state === 0 /* ExtensionState.Installing */ ? '' : ' hide'}`;
    }
}
let InstallInOtherServerAction = class InstallInOtherServerAction extends ExtensionAction {
    static { InstallInOtherServerAction_1 = this; }
    static { this.INSTALL_LABEL = localize('install', 'Install'); }
    static { this.INSTALLING_LABEL = localize('installing', 'Installing'); }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} prominent install-other-server`; }
    static { this.InstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} install-other-server installing`; }
    constructor(id, server, canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(id, InstallInOtherServerAction_1.INSTALL_LABEL, InstallInOtherServerAction_1.Class, false);
        this.server = server;
        this.canInstallAnyWhere = canInstallAnyWhere;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.updateWhenCounterExtensionChanges = true;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = InstallInOtherServerAction_1.Class;
        if (this.canInstall()) {
            const extensionInOtherServer = this.extensionsWorkbenchService.installed.filter((e) => areSameExtensions(e.identifier, this.extension.identifier) && e.server === this.server)[0];
            if (extensionInOtherServer) {
                // Getting installed in other server
                if (extensionInOtherServer.state === 0 /* ExtensionState.Installing */ &&
                    !extensionInOtherServer.local) {
                    this.enabled = true;
                    this.label = InstallInOtherServerAction_1.INSTALLING_LABEL;
                    this.class = InstallInOtherServerAction_1.InstallingClass;
                }
            }
            else {
                // Not installed in other server
                this.enabled = true;
                this.label = this.getInstallLabel();
            }
        }
    }
    canInstall() {
        // Disable if extension is not installed or not an user extension
        if (!this.extension ||
            !this.server ||
            !this.extension.local ||
            this.extension.state !== 1 /* ExtensionState.Installed */ ||
            this.extension.type !== 1 /* ExtensionType.User */ ||
            this.extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */ ||
            this.extension.enablementState === 0 /* EnablementState.DisabledByTrustRequirement */ ||
            this.extension.enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
            return false;
        }
        if (isLanguagePackExtension(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on UI
        if (this.server === this.extensionManagementServerService.localExtensionManagementServer &&
            this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on Workspace
        if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer &&
            this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on Web
        if (this.server === this.extensionManagementServerService.webExtensionManagementServer &&
            this.extensionManifestPropertiesService.prefersExecuteOnWeb(this.extension.local.manifest)) {
            return true;
        }
        if (this.canInstallAnyWhere) {
            // Can run on UI
            if (this.server === this.extensionManagementServerService.localExtensionManagementServer &&
                this.extensionManifestPropertiesService.canExecuteOnUI(this.extension.local.manifest)) {
                return true;
            }
            // Can run on Workspace
            if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer &&
                this.extensionManifestPropertiesService.canExecuteOnWorkspace(this.extension.local.manifest)) {
                return true;
            }
        }
        return false;
    }
    async run() {
        if (!this.extension?.local) {
            return;
        }
        if (!this.extension?.server) {
            return;
        }
        if (!this.server) {
            return;
        }
        this.extensionsWorkbenchService.open(this.extension);
        alert(localize('installExtensionStart', 'Installing extension {0} started. An editor is now open with more details on this extension', this.extension.displayName));
        return this.extensionsWorkbenchService.installInServer(this.extension, this.server);
    }
};
InstallInOtherServerAction = InstallInOtherServerAction_1 = __decorate([
    __param(3, IExtensionsWorkbenchService),
    __param(4, IExtensionManagementServerService),
    __param(5, IExtensionManifestPropertiesService)
], InstallInOtherServerAction);
export { InstallInOtherServerAction };
let RemoteInstallAction = class RemoteInstallAction extends InstallInOtherServerAction {
    constructor(canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.remoteinstall`, extensionManagementServerService.remoteExtensionManagementServer, canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return this.extensionManagementServerService.remoteExtensionManagementServer
            ? localize({
                key: 'install in remote',
                comment: [
                    'This is the name of the action to install an extension in remote server. Placeholder is for the name of remote server.',
                ],
            }, 'Install in {0}', this.extensionManagementServerService.remoteExtensionManagementServer.label)
            : InstallInOtherServerAction.INSTALL_LABEL;
    }
};
RemoteInstallAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IExtensionManagementServerService),
    __param(3, IExtensionManifestPropertiesService)
], RemoteInstallAction);
export { RemoteInstallAction };
let LocalInstallAction = class LocalInstallAction extends InstallInOtherServerAction {
    constructor(extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.localinstall`, extensionManagementServerService.localExtensionManagementServer, false, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return localize('install locally', 'Install Locally');
    }
};
LocalInstallAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionManifestPropertiesService)
], LocalInstallAction);
export { LocalInstallAction };
let WebInstallAction = class WebInstallAction extends InstallInOtherServerAction {
    constructor(extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.webInstall`, extensionManagementServerService.webExtensionManagementServer, false, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return localize('install browser', 'Install in Browser');
    }
};
WebInstallAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionManifestPropertiesService)
], WebInstallAction);
export { WebInstallAction };
let UninstallAction = class UninstallAction extends ExtensionAction {
    static { UninstallAction_1 = this; }
    static { this.UninstallLabel = localize('uninstallAction', 'Uninstall'); }
    static { this.UninstallingLabel = localize('Uninstalling', 'Uninstalling'); }
    static { this.UninstallClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall`; }
    static { this.UnInstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall uninstalling`; }
    constructor(extensionsWorkbenchService, dialogService) {
        super('extensions.uninstall', UninstallAction_1.UninstallLabel, UninstallAction_1.UninstallClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.update();
    }
    update() {
        if (!this.extension) {
            this.enabled = false;
            return;
        }
        const state = this.extension.state;
        if (state === 2 /* ExtensionState.Uninstalling */) {
            this.label = UninstallAction_1.UninstallingLabel;
            this.class = UninstallAction_1.UnInstallingClass;
            this.enabled = false;
            return;
        }
        this.label = UninstallAction_1.UninstallLabel;
        this.class = UninstallAction_1.UninstallClass;
        this.tooltip = UninstallAction_1.UninstallLabel;
        if (state !== 1 /* ExtensionState.Installed */) {
            this.enabled = false;
            return;
        }
        if (this.extension.isBuiltin) {
            this.enabled = false;
            return;
        }
        this.enabled = true;
    }
    async run() {
        if (!this.extension) {
            return;
        }
        alert(localize('uninstallExtensionStart', 'Uninstalling extension {0} started.', this.extension.displayName));
        try {
            await this.extensionsWorkbenchService.uninstall(this.extension);
            alert(localize('uninstallExtensionComplete', 'Please reload Visual Studio Code to complete the uninstallation of the extension {0}.', this.extension.displayName));
        }
        catch (error) {
            if (!isCancellationError(error)) {
                this.dialogService.error(getErrorMessage(error));
            }
        }
    }
};
UninstallAction = UninstallAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IDialogService)
], UninstallAction);
export { UninstallAction };
let UpdateAction = class UpdateAction extends ExtensionAction {
    static { UpdateAction_1 = this; }
    static { this.EnabledClass = `${this.LABEL_ACTION_CLASS} prominent update`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(verbose, extensionsWorkbenchService, dialogService, openerService, instantiationService) {
        super(`extensions.update`, localize('update', 'Update'), UpdateAction_1.DisabledClass, false);
        this.verbose = verbose;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.updateThrottler = new Throttler();
        this.update();
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateEnablement());
        if (this.extension) {
            this.label = this.verbose
                ? localize('update to', 'Update to v{0}', this.extension.latestVersion)
                : localize('update', 'Update');
        }
    }
    async computeAndUpdateEnablement() {
        this.enabled = false;
        this.class = UpdateAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.deprecationInfo) {
            return;
        }
        const canInstall = await this.extensionsWorkbenchService.canInstall(this.extension);
        const isInstalled = this.extension.state === 1 /* ExtensionState.Installed */;
        this.enabled = canInstall === true && isInstalled && this.extension.outdated;
        this.class = this.enabled ? UpdateAction_1.EnabledClass : UpdateAction_1.DisabledClass;
    }
    async run() {
        if (!this.extension) {
            return;
        }
        const consent = await this.extensionsWorkbenchService.shouldRequireConsentToUpdate(this.extension);
        if (consent) {
            const { result } = await this.dialogService.prompt({
                type: 'warning',
                title: localize('updateExtensionConsentTitle', 'Update {0} Extension', this.extension.displayName),
                message: localize('updateExtensionConsent', '{0}\n\nWould you like to update the extension?', consent),
                buttons: [
                    {
                        label: localize('update', 'Update'),
                        run: () => 'update',
                    },
                    {
                        label: localize('review', 'Review'),
                        run: () => 'review',
                    },
                    {
                        label: localize('cancel', 'Cancel'),
                        run: () => 'cancel',
                    },
                ],
            });
            if (result === 'cancel') {
                return;
            }
            if (result === 'review') {
                if (this.extension.hasChangelog()) {
                    return this.extensionsWorkbenchService.open(this.extension, {
                        tab: "changelog" /* ExtensionEditorTab.Changelog */,
                    });
                }
                if (this.extension.repository) {
                    return this.openerService.open(this.extension.repository);
                }
                return this.extensionsWorkbenchService.open(this.extension);
            }
        }
        alert(localize('updateExtensionStart', 'Updating extension {0} to version {1} started.', this.extension.displayName, this.extension.latestVersion));
        return this.install(this.extension);
    }
    async install(extension) {
        const options = extension.local?.preRelease ? { installPreReleaseVersion: true } : undefined;
        try {
            await this.extensionsWorkbenchService.install(extension, options);
            alert(localize('updateExtensionComplete', 'Updating extension {0} to version {1} completed.', extension.displayName, extension.latestVersion));
        }
        catch (err) {
            this.instantiationService
                .createInstance(PromptExtensionInstallFailureAction, extension, options, extension.latestVersion, 3 /* InstallOperation.Update */, err)
                .run();
        }
    }
};
UpdateAction = UpdateAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IDialogService),
    __param(3, IOpenerService),
    __param(4, IInstantiationService)
], UpdateAction);
export { UpdateAction };
let ToggleAutoUpdateForExtensionAction = class ToggleAutoUpdateForExtensionAction extends ExtensionAction {
    static { ToggleAutoUpdateForExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.toggleAutoUpdateForExtension'; }
    static { this.LABEL = localize2('enableAutoUpdateLabel', 'Auto Update'); }
    static { this.EnabledClass = `${ExtensionAction.EXTENSION_ACTION_CLASS} auto-update`; }
    static { this.DisabledClass = `${this.EnabledClass} hide`; }
    constructor(extensionsWorkbenchService, extensionEnablementService, allowedExtensionsService, configurationService) {
        super(ToggleAutoUpdateForExtensionAction_1.ID, ToggleAutoUpdateForExtensionAction_1.LABEL.value, ToggleAutoUpdateForExtensionAction_1.DisabledClass);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(AutoUpdateConfigurationKey)) {
                this.update();
            }
        }));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue((e) => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ToggleAutoUpdateForExtensionAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extension.deprecationInfo?.disallowInstall) {
            return;
        }
        const extension = this.extension.local ?? this.extension.gallery;
        if (extension && this.allowedExtensionsService.isAllowed(extension) !== true) {
            return;
        }
        if (this.extensionsWorkbenchService.getAutoUpdateValue() === 'onlyEnabledExtensions' &&
            !this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState)) {
            return;
        }
        this.enabled = true;
        this.class = ToggleAutoUpdateForExtensionAction_1.EnabledClass;
        this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
    }
    async run() {
        if (!this.extension) {
            return;
        }
        const enableAutoUpdate = !this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
        await this.extensionsWorkbenchService.updateAutoUpdateEnablementFor(this.extension, enableAutoUpdate);
        if (enableAutoUpdate) {
            alert(localize('enableAutoUpdate', 'Enabled auto updates for', this.extension.displayName));
        }
        else {
            alert(localize('disableAutoUpdate', 'Disabled auto updates for', this.extension.displayName));
        }
    }
};
ToggleAutoUpdateForExtensionAction = ToggleAutoUpdateForExtensionAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IAllowedExtensionsService),
    __param(3, IConfigurationService)
], ToggleAutoUpdateForExtensionAction);
export { ToggleAutoUpdateForExtensionAction };
let ToggleAutoUpdatesForPublisherAction = class ToggleAutoUpdatesForPublisherAction extends ExtensionAction {
    static { ToggleAutoUpdatesForPublisherAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.toggleAutoUpdatesForPublisher'; }
    static { this.LABEL = localize('toggleAutoUpdatesForPublisherLabel', 'Auto Update All (From Publisher)'); }
    constructor(extensionsWorkbenchService) {
        super(ToggleAutoUpdatesForPublisherAction_1.ID, ToggleAutoUpdatesForPublisherAction_1.LABEL);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    update() { }
    async run() {
        if (!this.extension) {
            return;
        }
        alert(localize('ignoreExtensionUpdatePublisher', 'Ignoring updates published by {0}.', this.extension.publisherDisplayName));
        const enableAutoUpdate = !this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension.publisher);
        await this.extensionsWorkbenchService.updateAutoUpdateEnablementFor(this.extension.publisher, enableAutoUpdate);
        if (enableAutoUpdate) {
            alert(localize('enableAutoUpdate', 'Enabled auto updates for', this.extension.displayName));
        }
        else {
            alert(localize('disableAutoUpdate', 'Disabled auto updates for', this.extension.displayName));
        }
    }
};
ToggleAutoUpdatesForPublisherAction = ToggleAutoUpdatesForPublisherAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], ToggleAutoUpdatesForPublisherAction);
export { ToggleAutoUpdatesForPublisherAction };
let MigrateDeprecatedExtensionAction = class MigrateDeprecatedExtensionAction extends ExtensionAction {
    static { MigrateDeprecatedExtensionAction_1 = this; }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} migrate`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(small, extensionsWorkbenchService) {
        super('extensionsAction.migrateDeprecatedExtension', localize('migrateExtension', 'Migrate'), MigrateDeprecatedExtensionAction_1.DisabledClass, false);
        this.small = small;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = MigrateDeprecatedExtensionAction_1.DisabledClass;
        if (!this.extension?.local) {
            return;
        }
        if (this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        if (!this.extension.deprecationInfo?.extension) {
            return;
        }
        const id = this.extension.deprecationInfo.extension.id;
        if (this.extensionsWorkbenchService.local.some((e) => areSameExtensions(e.identifier, { id }))) {
            return;
        }
        this.enabled = true;
        this.class = MigrateDeprecatedExtensionAction_1.EnabledClass;
        this.tooltip = localize('migrate to', 'Migrate to {0}', this.extension.deprecationInfo.extension.displayName);
        this.label = this.small ? localize('migrate', 'Migrate') : this.tooltip;
    }
    async run() {
        if (!this.extension?.deprecationInfo?.extension) {
            return;
        }
        const local = this.extension.local;
        await this.extensionsWorkbenchService.uninstall(this.extension);
        const [extension] = await this.extensionsWorkbenchService.getExtensions([
            {
                id: this.extension.deprecationInfo.extension.id,
                preRelease: this.extension.deprecationInfo?.extension?.preRelease,
            },
        ], CancellationToken.None);
        await this.extensionsWorkbenchService.install(extension, {
            isMachineScoped: local?.isMachineScoped,
        });
    }
};
MigrateDeprecatedExtensionAction = MigrateDeprecatedExtensionAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService)
], MigrateDeprecatedExtensionAction);
export { MigrateDeprecatedExtensionAction };
let DropDownExtensionAction = class DropDownExtensionAction extends ExtensionAction {
    constructor(id, label, cssClass, enabled, instantiationService) {
        super(id, label, cssClass, enabled);
        this.instantiationService = instantiationService;
        this._actionViewItem = null;
    }
    createActionViewItem(options) {
        this._actionViewItem = this.instantiationService.createInstance(DropDownExtensionActionViewItem, this, options);
        return this._actionViewItem;
    }
    run(actionGroups) {
        this._actionViewItem?.showMenu(actionGroups);
        return Promise.resolve();
    }
};
DropDownExtensionAction = __decorate([
    __param(4, IInstantiationService)
], DropDownExtensionAction);
export { DropDownExtensionAction };
let DropDownExtensionActionViewItem = class DropDownExtensionActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: true });
        this.contextMenuService = contextMenuService;
    }
    showMenu(menuActionGroups) {
        if (this.element) {
            const actions = this.getActions(menuActionGroups);
            const elementPosition = DOM.getDomNodePagePosition(this.element);
            const anchor = {
                x: elementPosition.left,
                y: elementPosition.top + elementPosition.height + 10,
            };
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                getActions: () => actions,
                actionRunner: this.actionRunner,
                onHide: () => disposeIfDisposable(actions),
            });
        }
    }
    getActions(menuActionGroups) {
        let actions = [];
        for (const menuActions of menuActionGroups) {
            actions = [...actions, ...menuActions, new Separator()];
        }
        return actions.length ? actions.slice(0, actions.length - 1) : actions;
    }
};
DropDownExtensionActionViewItem = __decorate([
    __param(2, IContextMenuService)
], DropDownExtensionActionViewItem);
export { DropDownExtensionActionViewItem };
async function getContextMenuActionsGroups(extension, contextKeyService, instantiationService) {
    return instantiationService.invokeFunction(async (accessor) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
        const menuService = accessor.get(IMenuService);
        const extensionRecommendationsService = accessor.get(IExtensionRecommendationsService);
        const extensionIgnoredRecommendationsService = accessor.get(IExtensionIgnoredRecommendationsService);
        const workbenchThemeService = accessor.get(IWorkbenchThemeService);
        const authenticationUsageService = accessor.get(IAuthenticationUsageService);
        const allowedExtensionsService = accessor.get(IAllowedExtensionsService);
        const cksOverlay = [];
        if (extension) {
            cksOverlay.push(['extension', extension.identifier.id]);
            cksOverlay.push(['isBuiltinExtension', extension.isBuiltin]);
            cksOverlay.push([
                'isDefaultApplicationScopedExtension',
                extension.local && isApplicationScopedExtension(extension.local.manifest),
            ]);
            cksOverlay.push([
                'isApplicationScopedExtension',
                extension.local && extension.local.isApplicationScoped,
            ]);
            cksOverlay.push(['isWorkspaceScopedExtension', extension.isWorkspaceScoped]);
            cksOverlay.push(['isGalleryExtension', !!extension.identifier.uuid]);
            if (extension.local) {
                cksOverlay.push(['extensionSource', extension.local.source]);
            }
            cksOverlay.push([
                'extensionHasConfiguration',
                extension.local &&
                    !!extension.local.manifest.contributes &&
                    !!extension.local.manifest.contributes.configuration,
            ]);
            cksOverlay.push([
                'extensionHasKeybindings',
                extension.local &&
                    !!extension.local.manifest.contributes &&
                    !!extension.local.manifest.contributes.keybindings,
            ]);
            cksOverlay.push([
                'extensionHasCommands',
                extension.local &&
                    !!extension.local.manifest.contributes &&
                    !!extension.local.manifest.contributes?.commands,
            ]);
            cksOverlay.push([
                'isExtensionRecommended',
                !!extensionRecommendationsService.getAllRecommendationsWithReason()[extension.identifier.id.toLowerCase()],
            ]);
            cksOverlay.push([
                'isExtensionWorkspaceRecommended',
                extensionRecommendationsService.getAllRecommendationsWithReason()[extension.identifier.id.toLowerCase()]?.reasonId === 0 /* ExtensionRecommendationReason.Workspace */,
            ]);
            cksOverlay.push([
                'isUserIgnoredRecommendation',
                extensionIgnoredRecommendationsService.globalIgnoredRecommendations.some((e) => e === extension.identifier.id.toLowerCase()),
            ]);
            cksOverlay.push(['isExtensionPinned', extension.pinned]);
            cksOverlay.push([
                'isExtensionEnabled',
                extensionEnablementService.isEnabledEnablementState(extension.enablementState),
            ]);
            switch (extension.state) {
                case 0 /* ExtensionState.Installing */:
                    cksOverlay.push(['extensionStatus', 'installing']);
                    break;
                case 1 /* ExtensionState.Installed */:
                    cksOverlay.push(['extensionStatus', 'installed']);
                    break;
                case 2 /* ExtensionState.Uninstalling */:
                    cksOverlay.push(['extensionStatus', 'uninstalling']);
                    break;
                case 3 /* ExtensionState.Uninstalled */:
                    cksOverlay.push(['extensionStatus', 'uninstalled']);
                    break;
            }
            cksOverlay.push([
                'installedExtensionIsPreReleaseVersion',
                !!extension.local?.isPreReleaseVersion,
            ]);
            cksOverlay.push(['installedExtensionIsOptedToPreRelease', !!extension.local?.preRelease]);
            cksOverlay.push([
                'galleryExtensionIsPreReleaseVersion',
                !!extension.gallery?.properties.isPreReleaseVersion,
            ]);
            cksOverlay.push([
                'galleryExtensionHasPreReleaseVersion',
                extension.gallery?.hasPreReleaseVersion,
            ]);
            cksOverlay.push(['extensionHasPreReleaseVersion', extension.hasPreReleaseVersion]);
            cksOverlay.push(['extensionHasReleaseVersion', extension.hasReleaseVersion]);
            cksOverlay.push([
                'extensionDisallowInstall',
                extension.isMalicious || extension.deprecationInfo?.disallowInstall,
            ]);
            cksOverlay.push([
                'isExtensionAllowed',
                allowedExtensionsService.isAllowed({
                    id: extension.identifier.id,
                    publisherDisplayName: extension.publisherDisplayName,
                }) === true,
            ]);
            cksOverlay.push([
                'isPreReleaseExtensionAllowed',
                allowedExtensionsService.isAllowed({
                    id: extension.identifier.id,
                    publisherDisplayName: extension.publisherDisplayName,
                    prerelease: true,
                }) === true,
            ]);
            cksOverlay.push(['extensionIsUnsigned', extension.gallery && !extension.gallery.isSigned]);
            const [colorThemes, fileIconThemes, productIconThemes, extensionUsesAuth] = await Promise.all([
                workbenchThemeService.getColorThemes(),
                workbenchThemeService.getFileIconThemes(),
                workbenchThemeService.getProductIconThemes(),
                authenticationUsageService.extensionUsesAuth(extension.identifier.id.toLowerCase()),
            ]);
            cksOverlay.push([
                'extensionHasColorThemes',
                colorThemes.some((theme) => isThemeFromExtension(theme, extension)),
            ]);
            cksOverlay.push([
                'extensionHasFileIconThemes',
                fileIconThemes.some((theme) => isThemeFromExtension(theme, extension)),
            ]);
            cksOverlay.push([
                'extensionHasProductIconThemes',
                productIconThemes.some((theme) => isThemeFromExtension(theme, extension)),
            ]);
            cksOverlay.push(['extensionHasAccountPreferences', extensionUsesAuth]);
            cksOverlay.push(['canSetLanguage', extensionsWorkbenchService.canSetLanguage(extension)]);
            cksOverlay.push([
                'isActiveLanguagePackExtension',
                extension.gallery && language === getLocale(extension.gallery),
            ]);
        }
        const actionsGroups = menuService.getMenuActions(MenuId.ExtensionContext, contextKeyService.createOverlay(cksOverlay), { shouldForwardArgs: true });
        return actionsGroups;
    });
}
function toActions(actionsGroups, instantiationService) {
    const result = [];
    for (const [, actions] of actionsGroups) {
        result.push(actions.map((action) => {
            if (action instanceof SubmenuAction) {
                return action;
            }
            return instantiationService.createInstance(MenuItemExtensionAction, action);
        }));
    }
    return result;
}
export async function getContextMenuActions(extension, contextKeyService, instantiationService) {
    const actionsGroups = await getContextMenuActionsGroups(extension, contextKeyService, instantiationService);
    return toActions(actionsGroups, instantiationService);
}
let ManageExtensionAction = class ManageExtensionAction extends DropDownExtensionAction {
    static { ManageExtensionAction_1 = this; }
    static { this.ID = 'extensions.manage'; }
    static { this.Class = `${ExtensionAction.ICON_ACTION_CLASS} manage ` + ThemeIcon.asClassName(manageExtensionIcon); }
    static { this.HideManageExtensionClass = `${this.Class} hide`; }
    constructor(instantiationService, extensionService, contextKeyService) {
        super(ManageExtensionAction_1.ID, '', '', true, instantiationService);
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.tooltip = localize('manage', 'Manage');
        this.update();
    }
    async getActionGroups() {
        const groups = [];
        const contextMenuActionsGroups = await getContextMenuActionsGroups(this.extension, this.contextKeyService, this.instantiationService);
        const themeActions = [], installActions = [], updateActions = [], otherActionGroups = [];
        for (const [group, actions] of contextMenuActionsGroups) {
            if (group === INSTALL_ACTIONS_GROUP) {
                installActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else if (group === UPDATE_ACTIONS_GROUP) {
                updateActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else if (group === THEME_ACTIONS_GROUP) {
                themeActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else {
                otherActionGroups.push(...toActions([[group, actions]], this.instantiationService));
            }
        }
        if (themeActions.length) {
            groups.push(themeActions);
        }
        groups.push([
            this.instantiationService.createInstance(EnableGloballyAction),
            this.instantiationService.createInstance(EnableForWorkspaceAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(DisableGloballyAction),
            this.instantiationService.createInstance(DisableForWorkspaceAction),
        ]);
        if (updateActions.length) {
            groups.push(updateActions);
        }
        groups.push([
            ...(installActions.length ? installActions : []),
            this.instantiationService.createInstance(InstallAnotherVersionAction, this.extension, false),
            this.instantiationService.createInstance(UninstallAction),
        ]);
        otherActionGroups.forEach((actions) => groups.push(actions));
        groups.forEach((group) => group.forEach((extensionAction) => {
            if (extensionAction instanceof ExtensionAction) {
                extensionAction.extension = this.extension;
            }
        }));
        return groups;
    }
    async run() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        return super.run(await this.getActionGroups());
    }
    update() {
        this.class = ManageExtensionAction_1.HideManageExtensionClass;
        this.enabled = false;
        if (this.extension) {
            const state = this.extension.state;
            this.enabled = state === 1 /* ExtensionState.Installed */;
            this.class =
                this.enabled || state === 2 /* ExtensionState.Uninstalling */
                    ? ManageExtensionAction_1.Class
                    : ManageExtensionAction_1.HideManageExtensionClass;
        }
    }
};
ManageExtensionAction = ManageExtensionAction_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService)
], ManageExtensionAction);
export { ManageExtensionAction };
export class ExtensionEditorManageExtensionAction extends DropDownExtensionAction {
    constructor(contextKeyService, instantiationService) {
        super('extensionEditor.manageExtension', '', `${ExtensionAction.ICON_ACTION_CLASS} manage ${ThemeIcon.asClassName(manageExtensionIcon)}`, true, instantiationService);
        this.contextKeyService = contextKeyService;
        this.tooltip = localize('manage', 'Manage');
    }
    update() { }
    async run() {
        const actionGroups = [];
        (await getContextMenuActions(this.extension, this.contextKeyService, this.instantiationService)).forEach((actions) => actionGroups.push(actions));
        actionGroups.forEach((group) => group.forEach((extensionAction) => {
            if (extensionAction instanceof ExtensionAction) {
                extensionAction.extension = this.extension;
            }
        }));
        return super.run(actionGroups);
    }
}
let MenuItemExtensionAction = class MenuItemExtensionAction extends ExtensionAction {
    constructor(action, extensionsWorkbenchService) {
        super(action.id, action.label);
        this.action = action;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    get enabled() {
        return this.action.enabled;
    }
    set enabled(value) {
        this.action.enabled = value;
    }
    update() {
        if (!this.extension) {
            return;
        }
        if (this.action.id === TOGGLE_IGNORE_EXTENSION_ACTION_ID) {
            this.checked = !this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension);
        }
        else if (this.action.id === ToggleAutoUpdateForExtensionAction.ID) {
            this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
        }
        else if (this.action.id === ToggleAutoUpdatesForPublisherAction.ID) {
            this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension.publisher);
        }
        else {
            this.checked = this.action.checked;
        }
    }
    async run() {
        if (this.extension) {
            const id = this.extension.local
                ? getExtensionId(this.extension.local.manifest.publisher, this.extension.local.manifest.name)
                : this.extension.gallery
                    ? getExtensionId(this.extension.gallery.publisher, this.extension.gallery.name)
                    : this.extension.identifier.id;
            const extensionArg = {
                id: this.extension.identifier.id,
                version: this.extension.version,
                location: this.extension.local?.location,
                galleryLink: this.extension.url,
            };
            await this.action.run(id, extensionArg);
        }
    }
};
MenuItemExtensionAction = __decorate([
    __param(1, IExtensionsWorkbenchService)
], MenuItemExtensionAction);
export { MenuItemExtensionAction };
let TogglePreReleaseExtensionAction = class TogglePreReleaseExtensionAction extends ExtensionAction {
    static { TogglePreReleaseExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.togglePreRlease'; }
    static { this.LABEL = localize('togglePreRleaseLabel', 'Pre-Release'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} pre-release`; }
    static { this.DisabledClass = `${this.EnabledClass} hide`; }
    constructor(extensionsWorkbenchService, allowedExtensionsService) {
        super(TogglePreReleaseExtensionAction_1.ID, TogglePreReleaseExtensionAction_1.LABEL, TogglePreReleaseExtensionAction_1.DisabledClass);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = TogglePreReleaseExtensionAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        if (!this.extension.hasPreReleaseVersion) {
            return;
        }
        if (!this.extension.gallery) {
            return;
        }
        if (this.extension.preRelease) {
            if (!this.extension.isPreReleaseVersion) {
                return;
            }
            if (this.allowedExtensionsService.isAllowed({
                id: this.extension.identifier.id,
                publisherDisplayName: this.extension.publisherDisplayName,
            }) !== true) {
                return;
            }
        }
        if (!this.extension.preRelease) {
            if (!this.extension.gallery.hasPreReleaseVersion) {
                return;
            }
            if (this.allowedExtensionsService.isAllowed(this.extension.gallery) !== true) {
                return;
            }
        }
        this.enabled = true;
        this.class = TogglePreReleaseExtensionAction_1.EnabledClass;
        if (this.extension.preRelease) {
            this.label = localize('togglePreRleaseDisableLabel', 'Switch to Release Version');
            this.tooltip = localize('togglePreRleaseDisableTooltip', 'This will switch and enable updates to release versions');
        }
        else {
            this.label = localize('switchToPreReleaseLabel', 'Switch to Pre-Release Version');
            this.tooltip = localize('switchToPreReleaseTooltip', 'This will switch to pre-release version and enable updates to latest version always');
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        this.extensionsWorkbenchService.open(this.extension, {
            showPreReleaseVersion: !this.extension.preRelease,
        });
        await this.extensionsWorkbenchService.togglePreRelease(this.extension);
    }
};
TogglePreReleaseExtensionAction = TogglePreReleaseExtensionAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IAllowedExtensionsService)
], TogglePreReleaseExtensionAction);
export { TogglePreReleaseExtensionAction };
let InstallAnotherVersionAction = class InstallAnotherVersionAction extends ExtensionAction {
    static { InstallAnotherVersionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.install.anotherVersion'; }
    static { this.LABEL = localize('install another version', 'Install Specific Version...'); }
    constructor(extension, whenInstalled, extensionsWorkbenchService, extensionManagementService, extensionGalleryService, quickInputService, instantiationService, dialogService, allowedExtensionsService) {
        super(InstallAnotherVersionAction_1.ID, InstallAnotherVersionAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.whenInstalled = whenInstalled;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.extension = extension;
        this.update();
    }
    update() {
        this.enabled =
            !!this.extension &&
                !this.extension.isBuiltin &&
                !!this.extension.identifier.uuid &&
                !this.extension.deprecationInfo &&
                this.allowedExtensionsService.isAllowed({
                    id: this.extension.identifier.id,
                    publisherDisplayName: this.extension.publisherDisplayName,
                }) === true;
        if (this.enabled && this.whenInstalled) {
            this.enabled =
                !!this.extension?.local &&
                    !!this.extension.server &&
                    this.extension.state === 1 /* ExtensionState.Installed */;
        }
    }
    async run() {
        if (!this.enabled) {
            return;
        }
        if (!this.extension) {
            return;
        }
        const targetPlatform = this.extension.server
            ? await this.extension.server.extensionManagementService.getTargetPlatform()
            : await this.extensionManagementService.getTargetPlatform();
        const allVersions = await this.extensionGalleryService.getAllCompatibleVersions(this.extension.identifier, this.extension.local?.preRelease ??
            this.extension.gallery?.properties.isPreReleaseVersion ??
            false, targetPlatform);
        if (!allVersions.length) {
            await this.dialogService.info(localize('no versions', 'This extension has no other versions.'));
            return;
        }
        const picks = allVersions.map((v, i) => {
            return {
                id: v.version,
                label: v.version,
                description: `${fromNow(new Date(Date.parse(v.date)), true)}${v.isPreReleaseVersion ? ` (${localize('pre-release', 'pre-release')})` : ''}${v.version === this.extension?.local?.manifest.version ? ` (${localize('current', 'current')})` : ''}`,
                ariaLabel: `${v.isPreReleaseVersion ? 'Pre-Release version' : 'Release version'} ${v.version}`,
                isPreReleaseVersion: v.isPreReleaseVersion,
            };
        });
        const pick = await this.quickInputService.pick(picks, {
            placeHolder: localize('selectVersion', 'Select Version to Install'),
            matchOnDetail: true,
        });
        if (pick) {
            if (this.extension.local?.manifest.version === pick.id) {
                return;
            }
            const options = { installPreReleaseVersion: pick.isPreReleaseVersion, version: pick.id };
            try {
                await this.extensionsWorkbenchService.install(this.extension, options);
            }
            catch (error) {
                this.instantiationService
                    .createInstance(PromptExtensionInstallFailureAction, this.extension, options, pick.id, 2 /* InstallOperation.Install */, error)
                    .run();
            }
        }
        return null;
    }
};
InstallAnotherVersionAction = InstallAnotherVersionAction_1 = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IWorkbenchExtensionManagementService),
    __param(4, IExtensionGalleryService),
    __param(5, IQuickInputService),
    __param(6, IInstantiationService),
    __param(7, IDialogService),
    __param(8, IAllowedExtensionsService)
], InstallAnotherVersionAction);
export { InstallAnotherVersionAction };
let EnableForWorkspaceAction = class EnableForWorkspaceAction extends ExtensionAction {
    static { EnableForWorkspaceAction_1 = this; }
    static { this.ID = 'extensions.enableForWorkspace'; }
    static { this.LABEL = localize('enableForWorkspaceAction', 'Enable (Workspace)'); }
    constructor(extensionsWorkbenchService, extensionEnablementService) {
        super(EnableForWorkspaceAction_1.ID, EnableForWorkspaceAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.tooltip = localize('enableForWorkspaceActionToolTip', 'Enable this extension only in this workspace');
        this.update();
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped) {
            this.enabled =
                this.extension.state === 1 /* ExtensionState.Installed */ &&
                    !this.extensionEnablementService.isEnabled(this.extension.local) &&
                    this.extensionEnablementService.canChangeWorkspaceEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 12 /* EnablementState.EnabledWorkspace */);
    }
};
EnableForWorkspaceAction = EnableForWorkspaceAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService)
], EnableForWorkspaceAction);
export { EnableForWorkspaceAction };
let EnableGloballyAction = class EnableGloballyAction extends ExtensionAction {
    static { EnableGloballyAction_1 = this; }
    static { this.ID = 'extensions.enableGlobally'; }
    static { this.LABEL = localize('enableGloballyAction', 'Enable'); }
    constructor(extensionsWorkbenchService, extensionEnablementService) {
        super(EnableGloballyAction_1.ID, EnableGloballyAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.tooltip = localize('enableGloballyActionToolTip', 'Enable this extension');
        this.update();
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped) {
            this.enabled =
                this.extension.state === 1 /* ExtensionState.Installed */ &&
                    this.extensionEnablementService.isDisabledGlobally(this.extension.local) &&
                    this.extensionEnablementService.canChangeEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 11 /* EnablementState.EnabledGlobally */);
    }
};
EnableGloballyAction = EnableGloballyAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService)
], EnableGloballyAction);
export { EnableGloballyAction };
let DisableForWorkspaceAction = class DisableForWorkspaceAction extends ExtensionAction {
    static { DisableForWorkspaceAction_1 = this; }
    static { this.ID = 'extensions.disableForWorkspace'; }
    static { this.LABEL = localize('disableForWorkspaceAction', 'Disable (Workspace)'); }
    constructor(workspaceContextService, extensionsWorkbenchService, extensionEnablementService, extensionService) {
        super(DisableForWorkspaceAction_1.ID, DisableForWorkspaceAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.workspaceContextService = workspaceContextService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionService = extensionService;
        this.tooltip = localize('disableForWorkspaceActionToolTip', 'Disable this extension only in this workspace');
        this.update();
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
    }
    update() {
        this.enabled = false;
        if (this.extension &&
            this.extension.local &&
            !this.extension.isWorkspaceScoped &&
            this.extensionService.extensions.some((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier) &&
                this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
            this.enabled =
                this.extension.state === 1 /* ExtensionState.Installed */ &&
                    (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */ ||
                        this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */) &&
                    this.extensionEnablementService.canChangeWorkspaceEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 10 /* EnablementState.DisabledWorkspace */);
    }
};
DisableForWorkspaceAction = DisableForWorkspaceAction_1 = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, IExtensionService)
], DisableForWorkspaceAction);
export { DisableForWorkspaceAction };
let DisableGloballyAction = class DisableGloballyAction extends ExtensionAction {
    static { DisableGloballyAction_1 = this; }
    static { this.ID = 'extensions.disableGlobally'; }
    static { this.LABEL = localize('disableGloballyAction', 'Disable'); }
    constructor(extensionsWorkbenchService, extensionEnablementService, extensionService) {
        super(DisableGloballyAction_1.ID, DisableGloballyAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionService = extensionService;
        this.tooltip = localize('disableGloballyActionToolTip', 'Disable this extension');
        this.update();
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
    }
    update() {
        this.enabled = false;
        if (this.extension &&
            this.extension.local &&
            !this.extension.isWorkspaceScoped &&
            this.extensionService.extensions.some((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))) {
            this.enabled =
                this.extension.state === 1 /* ExtensionState.Installed */ &&
                    (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */ ||
                        this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */) &&
                    this.extensionEnablementService.canChangeEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 9 /* EnablementState.DisabledGlobally */);
    }
};
DisableGloballyAction = DisableGloballyAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IExtensionService)
], DisableGloballyAction);
export { DisableGloballyAction };
let EnableDropDownAction = class EnableDropDownAction extends ButtonWithDropDownExtensionAction {
    constructor(instantiationService) {
        super('extensions.enable', ExtensionAction.LABEL_ACTION_CLASS, [
            [
                instantiationService.createInstance(EnableGloballyAction),
                instantiationService.createInstance(EnableForWorkspaceAction),
            ],
        ]);
    }
};
EnableDropDownAction = __decorate([
    __param(0, IInstantiationService)
], EnableDropDownAction);
export { EnableDropDownAction };
let DisableDropDownAction = class DisableDropDownAction extends ButtonWithDropDownExtensionAction {
    constructor(instantiationService) {
        super('extensions.disable', ExtensionAction.LABEL_ACTION_CLASS, [
            [
                instantiationService.createInstance(DisableGloballyAction),
                instantiationService.createInstance(DisableForWorkspaceAction),
            ],
        ]);
    }
};
DisableDropDownAction = __decorate([
    __param(0, IInstantiationService)
], DisableDropDownAction);
export { DisableDropDownAction };
let ExtensionRuntimeStateAction = class ExtensionRuntimeStateAction extends ExtensionAction {
    static { ExtensionRuntimeStateAction_1 = this; }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} reload`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(hostService, extensionsWorkbenchService, updateService, extensionService, productService, telemetryService) {
        super('extensions.runtimeState', '', ExtensionRuntimeStateAction_1.DisabledClass, false);
        this.hostService = hostService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.updateService = updateService;
        this.extensionService = extensionService;
        this.productService = productService;
        this.telemetryService = telemetryService;
        this.updateWhenCounterExtensionChanges = true;
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.tooltip = '';
        this.class = ExtensionRuntimeStateAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        const state = this.extension.state;
        if (state === 0 /* ExtensionState.Installing */ || state === 2 /* ExtensionState.Uninstalling */) {
            return;
        }
        if (this.extension.local &&
            this.extension.local.manifest &&
            this.extension.local.manifest.contributes &&
            this.extension.local.manifest.contributes.localizations &&
            this.extension.local.manifest.contributes.localizations.length > 0) {
            return;
        }
        const runtimeState = this.extension.runtimeState;
        if (!runtimeState) {
            return;
        }
        this.enabled = true;
        this.class = ExtensionRuntimeStateAction_1.EnabledClass;
        this.tooltip = runtimeState.reason;
        this.label =
            runtimeState.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */
                ? localize('reload window', 'Reload Window')
                : runtimeState.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */
                    ? localize('restart extensions', 'Restart Extensions')
                    : runtimeState.action === "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */
                        ? localize('restart product', 'Restart to Update')
                        : runtimeState.action === "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */ ||
                            runtimeState.action === "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */
                            ? localize('update product', 'Update {0}', this.productService.nameShort)
                            : '';
    }
    async run() {
        const runtimeState = this.extension?.runtimeState;
        if (!runtimeState?.action) {
            return;
        }
        this.telemetryService.publicLog2('extensions:runtimestate:action', {
            action: runtimeState.action,
        });
        if (runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */) {
            return this.hostService.reload();
        }
        else if (runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */) {
            return this.extensionsWorkbenchService.updateRunningExtensions();
        }
        else if (runtimeState?.action === "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */) {
            return this.updateService.downloadUpdate();
        }
        else if (runtimeState?.action === "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */) {
            return this.updateService.applyUpdate();
        }
        else if (runtimeState?.action === "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */) {
            return this.updateService.quitAndInstall();
        }
    }
};
ExtensionRuntimeStateAction = ExtensionRuntimeStateAction_1 = __decorate([
    __param(0, IHostService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IUpdateService),
    __param(3, IExtensionService),
    __param(4, IProductService),
    __param(5, ITelemetryService)
], ExtensionRuntimeStateAction);
export { ExtensionRuntimeStateAction };
function isThemeFromExtension(theme, extension) {
    return !!(extension &&
        theme.extensionData &&
        ExtensionIdentifier.equals(theme.extensionData.extensionId, extension.identifier.id));
}
function getQuickPickEntries(themes, currentTheme, extension, showCurrentTheme) {
    const picks = [];
    for (const theme of themes) {
        if (isThemeFromExtension(theme, extension) && !(showCurrentTheme && theme === currentTheme)) {
            picks.push({ label: theme.label, id: theme.id });
        }
    }
    if (showCurrentTheme) {
        picks.push({ type: 'separator', label: localize('current', 'current') });
        picks.push({ label: currentTheme.label, id: currentTheme.id });
    }
    return picks;
}
let SetColorThemeAction = class SetColorThemeAction extends ExtensionAction {
    static { SetColorThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setColorTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setColorTheme', 'Set Color Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetColorThemeAction_1.ID, SetColorThemeAction_1.TITLE.value, SetColorThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidColorThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getColorThemes().then((colorThemes) => {
            this.enabled = this.computeEnablement(colorThemes);
            this.class = this.enabled
                ? SetColorThemeAction_1.EnabledClass
                : SetColorThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(colorThemes) {
        return (!!this.extension &&
            this.extension.state === 1 /* ExtensionState.Installed */ &&
            this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) &&
            colorThemes.some((th) => isThemeFromExtension(th, this.extension)));
    }
    async run({ showCurrentTheme, ignoreFocusLost, } = {
        showCurrentTheme: false,
        ignoreFocusLost: false,
    }) {
        const colorThemes = await this.workbenchThemeService.getColorThemes();
        if (!this.computeEnablement(colorThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getColorTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(colorThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select color theme', 'Select Color Theme'),
            onDidFocus: (item) => delayer.trigger(() => this.workbenchThemeService.setColorTheme(item.id, undefined)),
            ignoreFocusLost,
        });
        return this.workbenchThemeService.setColorTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetColorThemeAction = SetColorThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetColorThemeAction);
export { SetColorThemeAction };
let SetFileIconThemeAction = class SetFileIconThemeAction extends ExtensionAction {
    static { SetFileIconThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setFileIconTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setFileIconTheme', 'Set File Icon Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetFileIconThemeAction_1.ID, SetFileIconThemeAction_1.TITLE.value, SetFileIconThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidFileIconThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getFileIconThemes().then((fileIconThemes) => {
            this.enabled = this.computeEnablement(fileIconThemes);
            this.class = this.enabled
                ? SetFileIconThemeAction_1.EnabledClass
                : SetFileIconThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(colorThemfileIconThemess) {
        return (!!this.extension &&
            this.extension.state === 1 /* ExtensionState.Installed */ &&
            this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) &&
            colorThemfileIconThemess.some((th) => isThemeFromExtension(th, this.extension)));
    }
    async run({ showCurrentTheme, ignoreFocusLost, } = {
        showCurrentTheme: false,
        ignoreFocusLost: false,
    }) {
        const fileIconThemes = await this.workbenchThemeService.getFileIconThemes();
        if (!this.computeEnablement(fileIconThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getFileIconTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(fileIconThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select file icon theme', 'Select File Icon Theme'),
            onDidFocus: (item) => delayer.trigger(() => this.workbenchThemeService.setFileIconTheme(item.id, undefined)),
            ignoreFocusLost,
        });
        return this.workbenchThemeService.setFileIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetFileIconThemeAction = SetFileIconThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetFileIconThemeAction);
export { SetFileIconThemeAction };
let SetProductIconThemeAction = class SetProductIconThemeAction extends ExtensionAction {
    static { SetProductIconThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setProductIconTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setProductIconTheme', 'Set Product Icon Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetProductIconThemeAction_1.ID, SetProductIconThemeAction_1.TITLE.value, SetProductIconThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidProductIconThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getProductIconThemes().then((productIconThemes) => {
            this.enabled = this.computeEnablement(productIconThemes);
            this.class = this.enabled
                ? SetProductIconThemeAction_1.EnabledClass
                : SetProductIconThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(productIconThemes) {
        return (!!this.extension &&
            this.extension.state === 1 /* ExtensionState.Installed */ &&
            this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) &&
            productIconThemes.some((th) => isThemeFromExtension(th, this.extension)));
    }
    async run({ showCurrentTheme, ignoreFocusLost, } = {
        showCurrentTheme: false,
        ignoreFocusLost: false,
    }) {
        const productIconThemes = await this.workbenchThemeService.getProductIconThemes();
        if (!this.computeEnablement(productIconThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getProductIconTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(productIconThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select product icon theme', 'Select Product Icon Theme'),
            onDidFocus: (item) => delayer.trigger(() => this.workbenchThemeService.setProductIconTheme(item.id, undefined)),
            ignoreFocusLost,
        });
        return this.workbenchThemeService.setProductIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetProductIconThemeAction = SetProductIconThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetProductIconThemeAction);
export { SetProductIconThemeAction };
let SetLanguageAction = class SetLanguageAction extends ExtensionAction {
    static { SetLanguageAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setDisplayLanguage'; }
    static { this.TITLE = localize2('workbench.extensions.action.setDisplayLanguage', 'Set Display Language'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} language`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionsWorkbenchService) {
        super(SetLanguageAction_1.ID, SetLanguageAction_1.TITLE.value, SetLanguageAction_1.DisabledClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = SetLanguageAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (!this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.gallery && language === getLocale(this.extension.gallery)) {
            return;
        }
        this.enabled = true;
        this.class = SetLanguageAction_1.EnabledClass;
    }
    async run() {
        return this.extension && this.extensionsWorkbenchService.setLanguage(this.extension);
    }
};
SetLanguageAction = SetLanguageAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], SetLanguageAction);
export { SetLanguageAction };
let ClearLanguageAction = class ClearLanguageAction extends ExtensionAction {
    static { ClearLanguageAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.clearLanguage'; }
    static { this.TITLE = localize2('workbench.extensions.action.clearLanguage', 'Clear Display Language'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} language`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionsWorkbenchService, localeService) {
        super(ClearLanguageAction_1.ID, ClearLanguageAction_1.TITLE.value, ClearLanguageAction_1.DisabledClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.localeService = localeService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ClearLanguageAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (!this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.gallery && language !== getLocale(this.extension.gallery)) {
            return;
        }
        this.enabled = true;
        this.class = ClearLanguageAction_1.EnabledClass;
    }
    async run() {
        return this.extension && this.localeService.clearLocalePreference();
    }
};
ClearLanguageAction = ClearLanguageAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, ILocaleService)
], ClearLanguageAction);
export { ClearLanguageAction };
let ShowRecommendedExtensionAction = class ShowRecommendedExtensionAction extends Action {
    static { ShowRecommendedExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.showRecommendedExtension'; }
    static { this.LABEL = localize('showRecommendedExtension', 'Show Recommended Extension'); }
    constructor(extensionId, extensionWorkbenchService) {
        super(ShowRecommendedExtensionAction_1.ID, ShowRecommendedExtensionAction_1.LABEL, undefined, false);
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionId = extensionId;
    }
    async run() {
        await this.extensionWorkbenchService.openSearch(`@id:${this.extensionId}`);
        const [extension] = await this.extensionWorkbenchService.getExtensions([{ id: this.extensionId }], { source: 'install-recommendation' }, CancellationToken.None);
        if (extension) {
            return this.extensionWorkbenchService.open(extension);
        }
        return null;
    }
};
ShowRecommendedExtensionAction = ShowRecommendedExtensionAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService)
], ShowRecommendedExtensionAction);
export { ShowRecommendedExtensionAction };
let InstallRecommendedExtensionAction = class InstallRecommendedExtensionAction extends Action {
    static { InstallRecommendedExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.installRecommendedExtension'; }
    static { this.LABEL = localize('installRecommendedExtension', 'Install Recommended Extension'); }
    constructor(extensionId, instantiationService, extensionWorkbenchService) {
        super(InstallRecommendedExtensionAction_1.ID, InstallRecommendedExtensionAction_1.LABEL, undefined, false);
        this.instantiationService = instantiationService;
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionId = extensionId;
    }
    async run() {
        await this.extensionWorkbenchService.openSearch(`@id:${this.extensionId}`);
        const [extension] = await this.extensionWorkbenchService.getExtensions([{ id: this.extensionId }], { source: 'install-recommendation' }, CancellationToken.None);
        if (extension) {
            await this.extensionWorkbenchService.open(extension);
            try {
                await this.extensionWorkbenchService.install(extension);
            }
            catch (err) {
                this.instantiationService
                    .createInstance(PromptExtensionInstallFailureAction, extension, undefined, extension.latestVersion, 2 /* InstallOperation.Install */, err)
                    .run();
            }
        }
    }
};
InstallRecommendedExtensionAction = InstallRecommendedExtensionAction_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IExtensionsWorkbenchService)
], InstallRecommendedExtensionAction);
export { InstallRecommendedExtensionAction };
let IgnoreExtensionRecommendationAction = class IgnoreExtensionRecommendationAction extends Action {
    static { IgnoreExtensionRecommendationAction_1 = this; }
    static { this.ID = 'extensions.ignore'; }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} ignore`; }
    constructor(extension, extensionRecommendationsManagementService) {
        super(IgnoreExtensionRecommendationAction_1.ID, 'Ignore Recommendation');
        this.extension = extension;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.class = IgnoreExtensionRecommendationAction_1.Class;
        this.tooltip = localize('ignoreExtensionRecommendation', 'Do not recommend this extension again');
        this.enabled = true;
    }
    run() {
        this.extensionRecommendationsManagementService.toggleGlobalIgnoredRecommendation(this.extension.identifier.id, true);
        return Promise.resolve();
    }
};
IgnoreExtensionRecommendationAction = IgnoreExtensionRecommendationAction_1 = __decorate([
    __param(1, IExtensionIgnoredRecommendationsService)
], IgnoreExtensionRecommendationAction);
export { IgnoreExtensionRecommendationAction };
let UndoIgnoreExtensionRecommendationAction = class UndoIgnoreExtensionRecommendationAction extends Action {
    static { UndoIgnoreExtensionRecommendationAction_1 = this; }
    static { this.ID = 'extensions.ignore'; }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} undo-ignore`; }
    constructor(extension, extensionRecommendationsManagementService) {
        super(UndoIgnoreExtensionRecommendationAction_1.ID, 'Undo');
        this.extension = extension;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.class = UndoIgnoreExtensionRecommendationAction_1.Class;
        this.tooltip = localize('undo', 'Undo');
        this.enabled = true;
    }
    run() {
        this.extensionRecommendationsManagementService.toggleGlobalIgnoredRecommendation(this.extension.identifier.id, false);
        return Promise.resolve();
    }
};
UndoIgnoreExtensionRecommendationAction = UndoIgnoreExtensionRecommendationAction_1 = __decorate([
    __param(1, IExtensionIgnoredRecommendationsService)
], UndoIgnoreExtensionRecommendationAction);
export { UndoIgnoreExtensionRecommendationAction };
let AbstractConfigureRecommendedExtensionsAction = class AbstractConfigureRecommendedExtensionsAction extends Action {
    constructor(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService) {
        super(id, label);
        this.contextService = contextService;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.jsonEditingService = jsonEditingService;
        this.textModelResolverService = textModelResolverService;
    }
    openExtensionsFile(extensionsFileResource) {
        return this.getOrCreateExtensionsFile(extensionsFileResource).then(({ created, content }) => this.getSelectionPosition(content, extensionsFileResource, ['recommendations']).then((selection) => this.editorService.openEditor({
            resource: extensionsFileResource,
            options: {
                pinned: created,
                selection,
            },
        })), (error) => Promise.reject(new Error(localize('OpenExtensionsFile.failed', "Unable to create 'extensions.json' file inside the '.vscode' folder ({0}).", error))));
    }
    openWorkspaceConfigurationFile(workspaceConfigurationFile) {
        return this.getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile)
            .then((content) => this.getSelectionPosition(content.value.toString(), content.resource, [
            'extensions',
            'recommendations',
        ]))
            .then((selection) => this.editorService.openEditor({
            resource: workspaceConfigurationFile,
            options: {
                selection,
                forceReload: true, // because content has changed
            },
        }));
    }
    getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile) {
        return Promise.resolve(this.fileService.readFile(workspaceConfigurationFile)).then((content) => {
            const workspaceRecommendations = (json.parse(content.value.toString())['extensions']);
            if (!workspaceRecommendations || !workspaceRecommendations.recommendations) {
                return this.jsonEditingService
                    .write(workspaceConfigurationFile, [{ path: ['extensions'], value: { recommendations: [] } }], true)
                    .then(() => this.fileService.readFile(workspaceConfigurationFile));
            }
            return content;
        });
    }
    getSelectionPosition(content, resource, path) {
        const tree = json.parseTree(content);
        const node = json.findNodeAtLocation(tree, path);
        if (node && node.parent && node.parent.children) {
            const recommendationsValueNode = node.parent.children[1];
            const lastExtensionNode = recommendationsValueNode.children && recommendationsValueNode.children.length
                ? recommendationsValueNode.children[recommendationsValueNode.children.length - 1]
                : null;
            const offset = lastExtensionNode
                ? lastExtensionNode.offset + lastExtensionNode.length
                : recommendationsValueNode.offset + 1;
            return Promise.resolve(this.textModelResolverService.createModelReference(resource)).then((reference) => {
                const position = reference.object.textEditorModel.getPositionAt(offset);
                reference.dispose();
                return {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                };
            });
        }
        return Promise.resolve(undefined);
    }
    getOrCreateExtensionsFile(extensionsFileResource) {
        return Promise.resolve(this.fileService.readFile(extensionsFileResource)).then((content) => {
            return { created: false, extensionsFileResource, content: content.value.toString() };
        }, (err) => {
            return this.textFileService
                .write(extensionsFileResource, ExtensionsConfigurationInitialContent)
                .then(() => {
                return {
                    created: true,
                    extensionsFileResource,
                    content: ExtensionsConfigurationInitialContent,
                };
            });
        });
    }
};
AbstractConfigureRecommendedExtensionsAction = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IFileService),
    __param(4, ITextFileService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService)
], AbstractConfigureRecommendedExtensionsAction);
export { AbstractConfigureRecommendedExtensionsAction };
let ConfigureWorkspaceRecommendedExtensionsAction = class ConfigureWorkspaceRecommendedExtensionsAction extends AbstractConfigureRecommendedExtensionsAction {
    static { this.ID = 'workbench.extensions.action.configureWorkspaceRecommendedExtensions'; }
    static { this.LABEL = localize('configureWorkspaceRecommendedExtensions', 'Configure Recommended Extensions (Workspace)'); }
    constructor(id, label, fileService, textFileService, contextService, editorService, jsonEditingService, textModelResolverService) {
        super(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.update(), this));
        this.update();
    }
    update() {
        this.enabled = this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    }
    run() {
        switch (this.contextService.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */:
                return this.openExtensionsFile(this.contextService.getWorkspace().folders[0].toResource(EXTENSIONS_CONFIG));
            case 3 /* WorkbenchState.WORKSPACE */:
                return this.openWorkspaceConfigurationFile(this.contextService.getWorkspace().configuration);
        }
        return Promise.resolve();
    }
};
ConfigureWorkspaceRecommendedExtensionsAction = __decorate([
    __param(2, IFileService),
    __param(3, ITextFileService),
    __param(4, IWorkspaceContextService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService)
], ConfigureWorkspaceRecommendedExtensionsAction);
export { ConfigureWorkspaceRecommendedExtensionsAction };
let ConfigureWorkspaceFolderRecommendedExtensionsAction = class ConfigureWorkspaceFolderRecommendedExtensionsAction extends AbstractConfigureRecommendedExtensionsAction {
    static { this.ID = 'workbench.extensions.action.configureWorkspaceFolderRecommendedExtensions'; }
    static { this.LABEL = localize('configureWorkspaceFolderRecommendedExtensions', 'Configure Recommended Extensions (Workspace Folder)'); }
    constructor(id, label, fileService, textFileService, contextService, editorService, jsonEditingService, textModelResolverService, commandService) {
        super(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
        this.commandService = commandService;
    }
    run() {
        const folderCount = this.contextService.getWorkspace().folders.length;
        const pickFolderPromise = folderCount === 1
            ? Promise.resolve(this.contextService.getWorkspace().folders[0])
            : this.commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        return Promise.resolve(pickFolderPromise).then((workspaceFolder) => {
            if (workspaceFolder) {
                return this.openExtensionsFile(workspaceFolder.toResource(EXTENSIONS_CONFIG));
            }
            return null;
        });
    }
};
ConfigureWorkspaceFolderRecommendedExtensionsAction = __decorate([
    __param(2, IFileService),
    __param(3, ITextFileService),
    __param(4, IWorkspaceContextService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService),
    __param(8, ICommandService)
], ConfigureWorkspaceFolderRecommendedExtensionsAction);
export { ConfigureWorkspaceFolderRecommendedExtensionsAction };
let ExtensionStatusLabelAction = class ExtensionStatusLabelAction extends Action {
    static { ExtensionStatusLabelAction_1 = this; }
    static { this.ENABLED_CLASS = `${ExtensionAction.TEXT_ACTION_CLASS} extension-status-label`; }
    static { this.DISABLED_CLASS = `${this.ENABLED_CLASS} hide`; }
    get extension() {
        return this._extension;
    }
    set extension(extension) {
        if (!(this._extension &&
            extension &&
            areSameExtensions(this._extension.identifier, extension.identifier))) {
            // Different extension. Reset
            this.initialStatus = null;
            this.status = null;
            this.enablementState = null;
        }
        this._extension = extension;
        this.update();
    }
    constructor(extensionService, extensionManagementServerService, extensionEnablementService) {
        super('extensions.action.statusLabel', '', ExtensionStatusLabelAction_1.DISABLED_CLASS, false);
        this.extensionService = extensionService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionEnablementService = extensionEnablementService;
        this.initialStatus = null;
        this.status = null;
        this.version = null;
        this.enablementState = null;
        this._extension = null;
    }
    update() {
        const label = this.computeLabel();
        this.label = label || '';
        this.class = label
            ? ExtensionStatusLabelAction_1.ENABLED_CLASS
            : ExtensionStatusLabelAction_1.DISABLED_CLASS;
    }
    computeLabel() {
        if (!this.extension) {
            return null;
        }
        const currentStatus = this.status;
        const currentVersion = this.version;
        const currentEnablementState = this.enablementState;
        this.status = this.extension.state;
        this.version = this.extension.version;
        if (this.initialStatus === null) {
            this.initialStatus = this.status;
        }
        this.enablementState = this.extension.enablementState;
        const canAddExtension = () => {
            const runningExtension = this.extensionService.extensions.filter((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))[0];
            if (this.extension.local) {
                if (runningExtension && this.extension.version === runningExtension.version) {
                    return true;
                }
                return this.extensionService.canAddExtension(toExtensionDescription(this.extension.local));
            }
            return false;
        };
        const canRemoveExtension = () => {
            if (this.extension.local) {
                if (this.extensionService.extensions.every((e) => !(areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier) &&
                    this.extension.server ===
                        this.extensionManagementServerService.getExtensionManagementServer(toExtension(e))))) {
                    return true;
                }
                return this.extensionService.canRemoveExtension(toExtensionDescription(this.extension.local));
            }
            return false;
        };
        if (currentStatus !== null) {
            if (currentStatus === 0 /* ExtensionState.Installing */ && this.status === 1 /* ExtensionState.Installed */) {
                if (this.initialStatus === 3 /* ExtensionState.Uninstalled */ && canAddExtension()) {
                    return localize('installed', 'Installed');
                }
                if (this.initialStatus === 1 /* ExtensionState.Installed */ &&
                    this.version !== currentVersion &&
                    canAddExtension()) {
                    return localize('updated', 'Updated');
                }
                return null;
            }
            if (currentStatus === 2 /* ExtensionState.Uninstalling */ &&
                this.status === 3 /* ExtensionState.Uninstalled */) {
                this.initialStatus = this.status;
                return canRemoveExtension() ? localize('uninstalled', 'Uninstalled') : null;
            }
        }
        if (currentEnablementState !== null) {
            const currentlyEnabled = this.extensionEnablementService.isEnabledEnablementState(currentEnablementState);
            const enabled = this.extensionEnablementService.isEnabledEnablementState(this.enablementState);
            if (!currentlyEnabled && enabled) {
                return canAddExtension() ? localize('enabled', 'Enabled') : null;
            }
            if (currentlyEnabled && !enabled) {
                return canRemoveExtension() ? localize('disabled', 'Disabled') : null;
            }
        }
        return null;
    }
    run() {
        return Promise.resolve();
    }
};
ExtensionStatusLabelAction = ExtensionStatusLabelAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionManagementServerService),
    __param(2, IWorkbenchExtensionEnablementService)
], ExtensionStatusLabelAction);
export { ExtensionStatusLabelAction };
let ToggleSyncExtensionAction = class ToggleSyncExtensionAction extends DropDownExtensionAction {
    static { ToggleSyncExtensionAction_1 = this; }
    static { this.IGNORED_SYNC_CLASS = `${ExtensionAction.ICON_ACTION_CLASS} extension-sync ${ThemeIcon.asClassName(syncIgnoredIcon)}`; }
    static { this.SYNC_CLASS = `${this.ICON_ACTION_CLASS} extension-sync ${ThemeIcon.asClassName(syncEnabledIcon)}`; }
    constructor(configurationService, extensionsWorkbenchService, userDataSyncEnablementService, instantiationService) {
        super('extensions.sync', '', ToggleSyncExtensionAction_1.SYNC_CLASS, false, instantiationService);
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('settingsSync.ignoredExtensions'))(() => this.update()));
        this._register(userDataSyncEnablementService.onDidChangeEnablement(() => this.update()));
        this.update();
    }
    update() {
        this.enabled =
            !!this.extension &&
                this.userDataSyncEnablementService.isEnabled() &&
                this.extension.state === 1 /* ExtensionState.Installed */;
        if (this.extension) {
            const isIgnored = this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension);
            this.class = isIgnored
                ? ToggleSyncExtensionAction_1.IGNORED_SYNC_CLASS
                : ToggleSyncExtensionAction_1.SYNC_CLASS;
            this.tooltip = isIgnored
                ? localize('ignored', 'This extension is ignored during sync')
                : localize('synced', 'This extension is synced');
        }
    }
    async run() {
        return super.run([
            [
                new Action('extensions.syncignore', this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension)
                    ? localize('sync', 'Sync this extension')
                    : localize('do not sync', 'Do not sync this extension'), undefined, true, () => this.extensionsWorkbenchService.toggleExtensionIgnoredToSync(this.extension)),
            ],
        ]);
    }
};
ToggleSyncExtensionAction = ToggleSyncExtensionAction_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IUserDataSyncEnablementService),
    __param(3, IInstantiationService)
], ToggleSyncExtensionAction);
export { ToggleSyncExtensionAction };
let ExtensionStatusAction = class ExtensionStatusAction extends ExtensionAction {
    static { ExtensionStatusAction_1 = this; }
    static { this.CLASS = `${ExtensionAction.ICON_ACTION_CLASS} extension-status`; }
    get status() {
        return this._status;
    }
    constructor(extensionManagementServerService, labelService, commandService, workspaceTrustEnablementService, workspaceTrustService, extensionsWorkbenchService, extensionService, extensionManifestPropertiesService, contextService, productService, allowedExtensionsService, workbenchExtensionEnablementService, extensionFeaturesManagementService, extensionGalleryManifestService) {
        super('extensions.status', '', `${ExtensionStatusAction_1.CLASS} hide`, false);
        this.extensionManagementServerService = extensionManagementServerService;
        this.labelService = labelService;
        this.commandService = commandService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustService = workspaceTrustService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionService = extensionService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.contextService = contextService;
        this.productService = productService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.workbenchExtensionEnablementService = workbenchExtensionEnablementService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.updateWhenCounterExtensionChanges = true;
        this._status = [];
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this.updateThrottler = new Throttler();
        this._register(this.labelService.onDidChangeFormatters(() => this.update(), this));
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
        this._register(this.extensionFeaturesManagementService.onDidChangeAccessData(() => this.update()));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.update();
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateStatus());
    }
    async computeAndUpdateStatus() {
        this.updateStatus(undefined, true);
        this.enabled = false;
        if (!this.extension) {
            return;
        }
        if (this.extension.isMalicious) {
            this.updateStatus({
                icon: warningIcon,
                message: new MarkdownString(localize('malicious tooltip', 'This extension was reported to be problematic.')),
            }, true);
            return;
        }
        if (this.extension.state === 3 /* ExtensionState.Uninstalled */ &&
            this.extension.gallery &&
            !this.extension.gallery.isSigned &&
            (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities
                .signing?.allRepositorySigned) {
            this.updateStatus({
                icon: warningIcon,
                message: new MarkdownString(localize('not signed tooltip', 'This extension is not signed by the Extension Marketplace.')),
            }, true);
            return;
        }
        if (this.extension.deprecationInfo) {
            if (this.extension.deprecationInfo.extension) {
                const link = `[${this.extension.deprecationInfo.extension.displayName}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.deprecationInfo.extension.id]))}`)})`;
                this.updateStatus({
                    icon: warningIcon,
                    message: new MarkdownString(localize('deprecated with alternate extension tooltip', 'This extension is deprecated. Use the {0} extension instead.', link)),
                }, true);
            }
            else if (this.extension.deprecationInfo.settings) {
                const link = `[${localize('settings', 'settings')}](${URI.parse(`command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify([this.extension.deprecationInfo.settings.map((setting) => `@id:${setting}`).join(' ')]))}`)})`;
                this.updateStatus({
                    icon: warningIcon,
                    message: new MarkdownString(localize('deprecated with alternate settings tooltip', 'This extension is deprecated as this functionality is now built-in to VS Code. Configure these {0} to use this functionality.', link)),
                }, true);
            }
            else {
                const message = new MarkdownString(localize('deprecated tooltip', 'This extension is deprecated as it is no longer being maintained.'));
                if (this.extension.deprecationInfo.additionalInfo) {
                    message.appendMarkdown(` ${this.extension.deprecationInfo.additionalInfo}`);
                }
                this.updateStatus({ icon: warningIcon, message }, true);
            }
            return;
        }
        if (this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.outdated &&
            this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension)) {
            const message = await this.extensionsWorkbenchService.shouldRequireConsentToUpdate(this.extension);
            if (message) {
                const markdown = new MarkdownString();
                markdown.appendMarkdown(`${message} `);
                markdown.appendMarkdown(localize('auto update message', 'Please [review the extension]({0}) and update it manually.', this.extension.hasChangelog()
                    ? URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "changelog" /* ExtensionEditorTab.Changelog */]))}`).toString()
                    : this.extension.repository
                        ? this.extension.repository
                        : URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id]))}`).toString()));
                this.updateStatus({ icon: warningIcon, message: markdown }, true);
            }
        }
        if (this.extension.gallery && this.extension.state === 3 /* ExtensionState.Uninstalled */) {
            const result = await this.extensionsWorkbenchService.canInstall(this.extension);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: result }, true);
                return;
            }
        }
        if (!this.extension.local ||
            !this.extension.server ||
            this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        // Extension is disabled by allowed list
        if (this.extension.enablementState === 7 /* EnablementState.DisabledByAllowlist */) {
            const result = this.allowedExtensionsService.isAllowed(this.extension.local);
            if (result !== true) {
                this.updateStatus({
                    icon: warningIcon,
                    message: new MarkdownString(localize('disabled - not allowed', 'This extension is disabled because {0}', result.value)),
                }, true);
                return;
            }
        }
        // Extension is disabled by environment
        if (this.extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */) {
            this.updateStatus({
                message: new MarkdownString(localize('disabled by environment', 'This extension is disabled by the environment.')),
            }, true);
            return;
        }
        // Extension is enabled by environment
        if (this.extension.enablementState === 3 /* EnablementState.EnabledByEnvironment */) {
            this.updateStatus({
                message: new MarkdownString(localize('enabled by environment', 'This extension is enabled because it is required in the current environment.')),
            }, true);
            return;
        }
        // Extension is disabled by virtual workspace
        if (this.extension.enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
            const details = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.virtualWorkspaces);
            this.updateStatus({
                icon: infoIcon,
                message: new MarkdownString(details
                    ? escapeMarkdownSyntaxTokens(details)
                    : localize('disabled because of virtual workspace', 'This extension has been disabled because it does not support virtual workspaces.')),
            }, true);
            return;
        }
        // Limited support in Virtual Workspace
        if (isVirtualWorkspace(this.contextService.getWorkspace())) {
            const virtualSupportType = this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(this.extension.local.manifest);
            const details = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.virtualWorkspaces);
            if (virtualSupportType === 'limited' || details) {
                this.updateStatus({
                    icon: warningIcon,
                    message: new MarkdownString(details
                        ? escapeMarkdownSyntaxTokens(details)
                        : localize('extension limited because of virtual workspace', 'This extension has limited features because the current workspace is virtual.')),
                }, true);
                return;
            }
        }
        if (!this.workspaceTrustService.isWorkspaceTrusted() &&
            // Extension is disabled by untrusted workspace
            (this.extension.enablementState === 0 /* EnablementState.DisabledByTrustRequirement */ ||
                // All disabled dependencies of the extension are disabled by untrusted workspace
                (this.extension.enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ &&
                    this.workbenchExtensionEnablementService
                        .getDependenciesEnablementStates(this.extension.local)
                        .every(([, enablementState]) => this.workbenchExtensionEnablementService.isEnabledEnablementState(enablementState) || enablementState === 0 /* EnablementState.DisabledByTrustRequirement */)))) {
            this.enabled = true;
            const untrustedDetails = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.untrustedWorkspaces);
            this.updateStatus({
                icon: trustIcon,
                message: new MarkdownString(untrustedDetails
                    ? escapeMarkdownSyntaxTokens(untrustedDetails)
                    : localize('extension disabled because of trust requirement', 'This extension has been disabled because the current workspace is not trusted.')),
            }, true);
            return;
        }
        // Limited support in Untrusted Workspace
        if (this.workspaceTrustEnablementService.isWorkspaceTrustEnabled() &&
            !this.workspaceTrustService.isWorkspaceTrusted()) {
            const untrustedSupportType = this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(this.extension.local.manifest);
            const untrustedDetails = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.untrustedWorkspaces);
            if (untrustedSupportType === 'limited' || untrustedDetails) {
                this.enabled = true;
                this.updateStatus({
                    icon: trustIcon,
                    message: new MarkdownString(untrustedDetails
                        ? escapeMarkdownSyntaxTokens(untrustedDetails)
                        : localize('extension limited because of trust requirement', 'This extension has limited features because the current workspace is not trusted.')),
                }, true);
                return;
            }
        }
        // Extension is disabled by extension kind
        if (this.extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
            if (!this.extensionsWorkbenchService.installed.some((e) => areSameExtensions(e.identifier, this.extension.identifier) &&
                e.server !== this.extension.server)) {
                let message;
                // Extension on Local Server
                if (this.extensionManagementServerService.localExtensionManagementServer ===
                    this.extension.server) {
                    if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
                        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
                            message = new MarkdownString(`${localize('Install in remote server to enable', "This extension is disabled in this workspace because it is defined to run in the Remote Extension Host. Please install the extension in '{0}' to enable.", this.extensionManagementServerService.remoteExtensionManagementServer.label)} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                    }
                }
                // Extension on Remote Server
                else if (this.extensionManagementServerService.remoteExtensionManagementServer ===
                    this.extension.server) {
                    if (this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
                        if (this.extensionManagementServerService.localExtensionManagementServer) {
                            message = new MarkdownString(`${localize('Install in local server to enable', 'This extension is disabled in this workspace because it is defined to run in the Local Extension Host. Please install the extension locally to enable.', this.extensionManagementServerService.remoteExtensionManagementServer.label)} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                        else if (isWeb) {
                            message = new MarkdownString(`${localize('Defined to run in desktop', 'This extension is disabled because it is defined to run only in {0} for the Desktop.', this.productService.nameLong)} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                    }
                }
                // Extension on Web Server
                else if (this.extensionManagementServerService.webExtensionManagementServer ===
                    this.extension.server) {
                    message = new MarkdownString(`${localize('Cannot be enabled', 'This extension is disabled because it is not supported in {0} for the Web.', this.productService.nameLong)} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                }
                if (message) {
                    this.updateStatus({ icon: warningIcon, message }, true);
                }
                return;
            }
        }
        const extensionId = new ExtensionIdentifier(this.extension.identifier.id);
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
        for (const feature of features) {
            const status = this.extensionFeaturesManagementService.getAccessData(extensionId, feature.id)
                ?.current?.status;
            const manageAccessLink = `[${localize('manage access', 'Manage Access')}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "features" /* ExtensionEditorTab.Features */, false, feature.id]))}`)})`;
            if (status?.severity === Severity.Error) {
                this.updateStatus({
                    icon: errorIcon,
                    message: new MarkdownString()
                        .appendText(status.message)
                        .appendMarkdown(` ${manageAccessLink}`),
                }, true);
                return;
            }
            if (status?.severity === Severity.Warning) {
                this.updateStatus({
                    icon: warningIcon,
                    message: new MarkdownString()
                        .appendText(status.message)
                        .appendMarkdown(` ${manageAccessLink}`),
                }, true);
                return;
            }
        }
        // Remote Workspace
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            if (isLanguagePackExtension(this.extension.local.manifest)) {
                if (!this.extensionsWorkbenchService.installed.some((e) => areSameExtensions(e.identifier, this.extension.identifier) &&
                    e.server !== this.extension.server)) {
                    const message = this.extension.server ===
                        this.extensionManagementServerService.localExtensionManagementServer
                        ? new MarkdownString(localize('Install language pack also in remote server', "Install the language pack extension on '{0}' to enable it there also.", this.extensionManagementServerService.remoteExtensionManagementServer.label))
                        : new MarkdownString(localize('Install language pack also locally', 'Install the language pack extension locally to enable it there also.'));
                    this.updateStatus({ icon: infoIcon, message }, true);
                }
                return;
            }
            const runningExtension = this.extensionService.extensions.filter((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))[0];
            const runningExtensionServer = runningExtension
                ? this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension))
                : null;
            if (this.extension.server ===
                this.extensionManagementServerService.localExtensionManagementServer &&
                runningExtensionServer ===
                    this.extensionManagementServerService.remoteExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
                    this.updateStatus({
                        icon: infoIcon,
                        message: new MarkdownString(`${localize('enabled remotely', 'This extension is enabled in the Remote Extension Host because it prefers to run there.')} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`),
                    }, true);
                }
                return;
            }
            if (this.extension.server ===
                this.extensionManagementServerService.remoteExtensionManagementServer &&
                runningExtensionServer ===
                    this.extensionManagementServerService.localExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
                    this.updateStatus({
                        icon: infoIcon,
                        message: new MarkdownString(`${localize('enabled locally', 'This extension is enabled in the Local Extension Host because it prefers to run there.')} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`),
                    }, true);
                }
                return;
            }
            if (this.extension.server ===
                this.extensionManagementServerService.remoteExtensionManagementServer &&
                runningExtensionServer ===
                    this.extensionManagementServerService.webExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.canExecuteOnWeb(this.extension.local.manifest)) {
                    this.updateStatus({
                        icon: infoIcon,
                        message: new MarkdownString(`${localize('enabled in web worker', 'This extension is enabled in the Web Worker Extension Host because it prefers to run there.')} [${localize('learn more', 'Learn More')}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`),
                    }, true);
                }
                return;
            }
        }
        // Extension is disabled by its dependency
        if (this.extension.enablementState === 8 /* EnablementState.DisabledByExtensionDependency */) {
            this.updateStatus({
                icon: warningIcon,
                message: new MarkdownString(localize('extension disabled because of dependency', 'This extension depends on an extension that is disabled.')).appendMarkdown(`&nbsp;[${localize('dependencies', 'Show Dependencies')}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "dependencies" /* ExtensionEditorTab.Dependencies */]))}`)})`),
            }, true);
            return;
        }
        if (!this.extension.local.isValid) {
            const errors = this.extension.local.validations
                .filter(([severity]) => severity === Severity.Error)
                .map(([, message]) => message);
            this.updateStatus({ icon: warningIcon, message: new MarkdownString(errors.join(' ').trim()) }, true);
            return;
        }
        const isEnabled = this.workbenchExtensionEnablementService.isEnabled(this.extension.local);
        const isRunning = this.extensionService.extensions.some((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier));
        if (!this.extension.isWorkspaceScoped && isEnabled && isRunning) {
            if (this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */) {
                this.updateStatus({
                    message: new MarkdownString(localize('workspace enabled', 'This extension is enabled for this workspace by the user.')),
                }, true);
                return;
            }
            if (this.extensionManagementServerService.localExtensionManagementServer &&
                this.extensionManagementServerService.remoteExtensionManagementServer) {
                if (this.extension.server ===
                    this.extensionManagementServerService.remoteExtensionManagementServer) {
                    this.updateStatus({
                        message: new MarkdownString(localize('extension enabled on remote', "Extension is enabled on '{0}'", this.extension.server.label)),
                    }, true);
                    return;
                }
            }
            if (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */) {
                return;
            }
        }
        if (!isEnabled && !isRunning) {
            if (this.extension.enablementState === 9 /* EnablementState.DisabledGlobally */) {
                this.updateStatus({
                    message: new MarkdownString(localize('globally disabled', 'This extension is disabled globally by the user.')),
                }, true);
                return;
            }
            if (this.extension.enablementState === 10 /* EnablementState.DisabledWorkspace */) {
                this.updateStatus({
                    message: new MarkdownString(localize('workspace disabled', 'This extension is disabled for this workspace by the user.')),
                }, true);
                return;
            }
        }
    }
    updateStatus(status, updateClass) {
        if (status) {
            if (this._status.some((s) => s.message.value === status.message.value && s.icon?.id === status.icon?.id)) {
                return;
            }
        }
        else {
            if (this._status.length === 0) {
                return;
            }
            this._status = [];
        }
        if (status) {
            this._status.push(status);
            this._status.sort((a, b) => b.icon === trustIcon
                ? -1
                : a.icon === trustIcon
                    ? 1
                    : b.icon === errorIcon
                        ? -1
                        : a.icon === errorIcon
                            ? 1
                            : b.icon === warningIcon
                                ? -1
                                : a.icon === warningIcon
                                    ? 1
                                    : b.icon === infoIcon
                                        ? -1
                                        : a.icon === infoIcon
                                            ? 1
                                            : 0);
        }
        if (updateClass) {
            if (status?.icon === errorIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-error ${ThemeIcon.asClassName(errorIcon)}`;
            }
            else if (status?.icon === warningIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-warning ${ThemeIcon.asClassName(warningIcon)}`;
            }
            else if (status?.icon === infoIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-info ${ThemeIcon.asClassName(infoIcon)}`;
            }
            else if (status?.icon === trustIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} ${ThemeIcon.asClassName(trustIcon)}`;
            }
            else {
                this.class = `${ExtensionStatusAction_1.CLASS} hide`;
            }
        }
        this._onDidChangeStatus.fire();
    }
    async run() {
        if (this._status[0]?.icon === trustIcon) {
            return this.commandService.executeCommand('workbench.trust.manage');
        }
    }
};
ExtensionStatusAction = ExtensionStatusAction_1 = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, ILabelService),
    __param(2, ICommandService),
    __param(3, IWorkspaceTrustEnablementService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionService),
    __param(7, IExtensionManifestPropertiesService),
    __param(8, IWorkspaceContextService),
    __param(9, IProductService),
    __param(10, IAllowedExtensionsService),
    __param(11, IWorkbenchExtensionEnablementService),
    __param(12, IExtensionFeaturesManagementService),
    __param(13, IExtensionGalleryManifestService)
], ExtensionStatusAction);
export { ExtensionStatusAction };
let InstallSpecificVersionOfExtensionAction = class InstallSpecificVersionOfExtensionAction extends Action {
    static { InstallSpecificVersionOfExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.install.specificVersion'; }
    static { this.LABEL = localize('install previous version', 'Install Specific Version of Extension...'); }
    constructor(id = InstallSpecificVersionOfExtensionAction_1.ID, label = InstallSpecificVersionOfExtensionAction_1.LABEL, extensionsWorkbenchService, quickInputService, instantiationService, extensionEnablementService) {
        super(id, label);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.extensionEnablementService = extensionEnablementService;
    }
    get enabled() {
        return this.extensionsWorkbenchService.local.some((l) => this.isEnabled(l));
    }
    async run() {
        const extensionPick = await this.quickInputService.pick(this.getExtensionEntries(), {
            placeHolder: localize('selectExtension', 'Select Extension'),
            matchOnDetail: true,
        });
        if (extensionPick && extensionPick.extension) {
            const action = this.instantiationService.createInstance(InstallAnotherVersionAction, extensionPick.extension, true);
            await action.run();
            await this.extensionsWorkbenchService.openSearch(extensionPick.extension.identifier.id);
        }
    }
    isEnabled(extension) {
        const action = this.instantiationService.createInstance(InstallAnotherVersionAction, extension, true);
        return (action.enabled &&
            !!extension.local &&
            this.extensionEnablementService.isEnabled(extension.local));
    }
    async getExtensionEntries() {
        const installed = await this.extensionsWorkbenchService.queryLocal();
        const entries = [];
        for (const extension of installed) {
            if (this.isEnabled(extension)) {
                entries.push({
                    id: extension.identifier.id,
                    label: extension.displayName || extension.identifier.id,
                    description: extension.identifier.id,
                    extension,
                });
            }
        }
        return entries.sort((e1, e2) => e1.extension.displayName.localeCompare(e2.extension.displayName));
    }
};
InstallSpecificVersionOfExtensionAction = InstallSpecificVersionOfExtensionAction_1 = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, IWorkbenchExtensionEnablementService)
], InstallSpecificVersionOfExtensionAction);
export { InstallSpecificVersionOfExtensionAction };
let AbstractInstallExtensionsInServerAction = class AbstractInstallExtensionsInServerAction extends Action {
    constructor(id, extensionsWorkbenchService, quickInputService, notificationService, progressService) {
        super(id);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.progressService = progressService;
        this.extensions = undefined;
        this.update();
        this.extensionsWorkbenchService.queryLocal().then(() => this.updateExtensions());
        this._register(this.extensionsWorkbenchService.onChange(() => {
            if (this.extensions) {
                this.updateExtensions();
            }
        }));
    }
    updateExtensions() {
        this.extensions = this.extensionsWorkbenchService.local;
        this.update();
    }
    update() {
        this.enabled = !!this.extensions && this.getExtensionsToInstall(this.extensions).length > 0;
        this.tooltip = this.label;
    }
    async run() {
        return this.selectAndInstallExtensions();
    }
    async queryExtensionsToInstall() {
        const local = await this.extensionsWorkbenchService.queryLocal();
        return this.getExtensionsToInstall(local);
    }
    async selectAndInstallExtensions() {
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.busy = true;
        const disposable = quickPick.onDidAccept(() => {
            disposable.dispose();
            quickPick.hide();
            quickPick.dispose();
            this.onDidAccept(quickPick.selectedItems);
        });
        quickPick.show();
        const localExtensionsToInstall = await this.queryExtensionsToInstall();
        quickPick.busy = false;
        if (localExtensionsToInstall.length) {
            quickPick.title = this.getQuickPickTitle();
            quickPick.placeholder = localize('select extensions to install', 'Select extensions to install');
            quickPick.canSelectMany = true;
            localExtensionsToInstall.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
            quickPick.items = localExtensionsToInstall.map((extension) => ({
                extension,
                label: extension.displayName,
                description: extension.version,
            }));
        }
        else {
            quickPick.hide();
            quickPick.dispose();
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize('no local extensions', 'There are no extensions to install.'),
            });
        }
    }
    async onDidAccept(selectedItems) {
        if (selectedItems.length) {
            const localExtensionsToInstall = selectedItems
                .filter((r) => !!r.extension)
                .map((r) => r.extension);
            if (localExtensionsToInstall.length) {
                await this.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('installing extensions', 'Installing Extensions...'),
                }, () => this.installExtensions(localExtensionsToInstall));
                this.notificationService.info(localize('finished installing', 'Successfully installed extensions.'));
            }
        }
    }
};
AbstractInstallExtensionsInServerAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IProgressService)
], AbstractInstallExtensionsInServerAction);
export { AbstractInstallExtensionsInServerAction };
let InstallLocalExtensionsInRemoteAction = class InstallLocalExtensionsInRemoteAction extends AbstractInstallExtensionsInServerAction {
    constructor(extensionsWorkbenchService, quickInputService, progressService, notificationService, extensionManagementServerService, extensionGalleryService, instantiationService, fileService, logService) {
        super('workbench.extensions.actions.installLocalExtensionsInRemote', extensionsWorkbenchService, quickInputService, notificationService, progressService);
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.logService = logService;
    }
    get label() {
        if (this.extensionManagementServerService &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            return localize('select and install local extensions', "Install Local Extensions in '{0}'...", this.extensionManagementServerService.remoteExtensionManagementServer.label);
        }
        return '';
    }
    getQuickPickTitle() {
        return localize('install local extensions title', "Install Local Extensions in '{0}'", this.extensionManagementServerService.remoteExtensionManagementServer.label);
    }
    getExtensionsToInstall(local) {
        return local.filter((extension) => {
            const action = this.instantiationService.createInstance(RemoteInstallAction, true);
            action.extension = extension;
            return action.enabled;
        });
    }
    async installExtensions(localExtensionsToInstall) {
        const galleryExtensions = [];
        const vsixs = [];
        const targetPlatform = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getTargetPlatform();
        await Promises.settled(localExtensionsToInstall.map(async (extension) => {
            if (this.extensionGalleryService.isEnabled()) {
                const gallery = (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease: !!extension.local?.preRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0];
                if (gallery) {
                    galleryExtensions.push(gallery);
                    return;
                }
            }
            const vsix = await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.zip(extension.local);
            vsixs.push(vsix);
        }));
        await Promises.settled(galleryExtensions.map((gallery) => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromGallery(gallery)));
        try {
            await Promises.settled(vsixs.map((vsix) => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.install(vsix)));
        }
        finally {
            try {
                await Promise.allSettled(vsixs.map((vsix) => this.fileService.del(vsix)));
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
};
InstallLocalExtensionsInRemoteAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IQuickInputService),
    __param(2, IProgressService),
    __param(3, INotificationService),
    __param(4, IExtensionManagementServerService),
    __param(5, IExtensionGalleryService),
    __param(6, IInstantiationService),
    __param(7, IFileService),
    __param(8, ILogService)
], InstallLocalExtensionsInRemoteAction);
export { InstallLocalExtensionsInRemoteAction };
let InstallRemoteExtensionsInLocalAction = class InstallRemoteExtensionsInLocalAction extends AbstractInstallExtensionsInServerAction {
    constructor(id, extensionsWorkbenchService, quickInputService, progressService, notificationService, extensionManagementServerService, extensionGalleryService, fileService, logService) {
        super(id, extensionsWorkbenchService, quickInputService, notificationService, progressService);
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.fileService = fileService;
        this.logService = logService;
    }
    get label() {
        return localize('select and install remote extensions', 'Install Remote Extensions Locally...');
    }
    getQuickPickTitle() {
        return localize('install remote extensions', 'Install Remote Extensions Locally');
    }
    getExtensionsToInstall(local) {
        return local.filter((extension) => extension.type === 1 /* ExtensionType.User */ &&
            extension.server !== this.extensionManagementServerService.localExtensionManagementServer &&
            !this.extensionsWorkbenchService.installed.some((e) => e.server === this.extensionManagementServerService.localExtensionManagementServer &&
                areSameExtensions(e.identifier, extension.identifier)));
    }
    async installExtensions(extensions) {
        const galleryExtensions = [];
        const vsixs = [];
        const targetPlatform = await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getTargetPlatform();
        await Promises.settled(extensions.map(async (extension) => {
            if (this.extensionGalleryService.isEnabled()) {
                const gallery = (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease: !!extension.local?.preRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0];
                if (gallery) {
                    galleryExtensions.push(gallery);
                    return;
                }
            }
            const vsix = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.zip(extension.local);
            vsixs.push(vsix);
        }));
        await Promises.settled(galleryExtensions.map((gallery) => this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.installFromGallery(gallery)));
        try {
            await Promises.settled(vsixs.map((vsix) => this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.install(vsix)));
        }
        finally {
            try {
                await Promise.allSettled(vsixs.map((vsix) => this.fileService.del(vsix)));
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
};
InstallRemoteExtensionsInLocalAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IQuickInputService),
    __param(3, IProgressService),
    __param(4, INotificationService),
    __param(5, IExtensionManagementServerService),
    __param(6, IExtensionGalleryService),
    __param(7, IFileService),
    __param(8, ILogService)
], InstallRemoteExtensionsInLocalAction);
export { InstallRemoteExtensionsInLocalAction };
CommandsRegistry.registerCommand('workbench.extensions.action.showExtensionsForLanguage', function (accessor, fileExtension) {
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    return extensionsWorkbenchService.openSearch(`ext:${fileExtension.replace(/^\./, '')}`);
});
export const showExtensionsWithIdsCommandId = 'workbench.extensions.action.showExtensionsWithIds';
CommandsRegistry.registerCommand(showExtensionsWithIdsCommandId, function (accessor, extensionIds) {
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    return extensionsWorkbenchService.openSearch(extensionIds.map((id) => `@id:${id}`).join(' '));
});
registerColor('extensionButton.background', {
    dark: buttonBackground,
    light: buttonBackground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonBackground', 'Button background color for extension actions.'));
registerColor('extensionButton.foreground', {
    dark: buttonForeground,
    light: buttonForeground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonForeground', 'Button foreground color for extension actions.'));
registerColor('extensionButton.hoverBackground', {
    dark: buttonHoverBackground,
    light: buttonHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonHoverBackground', 'Button background hover color for extension actions.'));
registerColor('extensionButton.separator', buttonSeparator, localize('extensionButtonSeparator', 'Button separator color for extension actions'));
export const extensionButtonProminentBackground = registerColor('extensionButton.prominentBackground', {
    dark: buttonBackground,
    light: buttonBackground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonProminentBackground', 'Button background color for extension actions that stand out (e.g. install button).'));
registerColor('extensionButton.prominentForeground', {
    dark: buttonForeground,
    light: buttonForeground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonProminentForeground', 'Button foreground color for extension actions that stand out (e.g. install button).'));
registerColor('extensionButton.prominentHoverBackground', {
    dark: buttonHoverBackground,
    light: buttonHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize('extensionButtonProminentHoverBackground', 'Button background hover color for extension actions that stand out (e.g. install button).'));
registerThemingParticipant((theme, collector) => {
    const errorColor = theme.getColor(editorErrorForeground);
    if (errorColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
    }
    const warningColor = theme.getColor(editorWarningForeground);
    if (warningColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
    }
    const infoColor = theme.getColor(editorInfoForeground);
    if (infoColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFFTixNQUFNLEVBQ04sU0FBUyxFQUNULGFBQWEsR0FFYixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFHTiwyQkFBMkIsRUFFM0IsaUNBQWlDLEVBQ2pDLHdDQUF3QyxFQUN4QyxtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUlwQiwwQkFBMEIsR0FDMUIsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRixPQUFPLEVBRU4sd0JBQXdCLEVBS3hCLHlCQUF5QixHQUN6QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTixvQ0FB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