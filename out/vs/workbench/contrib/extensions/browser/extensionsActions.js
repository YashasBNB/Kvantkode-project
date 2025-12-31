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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sTUFBTSxFQUNOLFNBQVMsRUFDVCxhQUFhLEdBRWIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBR04sMkJBQTJCLEVBRTNCLGlDQUFpQyxFQUNqQyx3Q0FBd0MsRUFDeEMsbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQixvQkFBb0IsRUFJcEIsMEJBQTBCLEdBQzFCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0YsT0FBTyxFQUVOLHdCQUF3QixFQUt4Qix5QkFBeUIsR0FDekIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0NBQW9DLEVB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