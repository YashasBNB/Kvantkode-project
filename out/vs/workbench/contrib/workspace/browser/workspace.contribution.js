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
import './media/workspaceTrustEditor.css';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { shieldIcon, WorkspaceTrustEditor } from './workspaceTrustEditor.js';
import { WorkspaceTrustEditorInput } from '../../../services/workspaces/browser/workspaceTrustEditorInput.js';
import { WORKSPACE_TRUST_BANNER, WORKSPACE_TRUST_EMPTY_WINDOW, WORKSPACE_TRUST_ENABLED, WORKSPACE_TRUST_STARTUP_PROMPT, WORKSPACE_TRUST_UNTRUSTED_FILES, } from '../../../services/workspaces/common/workspaceTrust.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isEmptyWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { dirname, resolve } from '../../../../base/common/path.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID } from '../../extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { WORKSPACE_TRUST_SETTING_TAG } from '../../preferences/common/preferences.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { MANAGE_TRUST_COMMAND_ID, WorkspaceTrustContext } from '../common/workspace.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { securityConfigurationNodeBase } from '../../../common/configuration.js';
import { basename, dirname as uriDirname } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
const BANNER_RESTRICTED_MODE = 'workbench.banner.restrictedMode';
const STARTUP_PROMPT_SHOWN_KEY = 'workspace.trust.startupPrompt.shown';
const BANNER_RESTRICTED_MODE_DISMISSED_KEY = 'workbench.banner.restrictedMode.dismissed';
let WorkspaceTrustContextKeys = class WorkspaceTrustContextKeys extends Disposable {
    constructor(contextKeyService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        this._ctxWorkspaceTrustEnabled = WorkspaceTrustContext.IsEnabled.bindTo(contextKeyService);
        this._ctxWorkspaceTrustEnabled.set(workspaceTrustEnablementService.isWorkspaceTrustEnabled());
        this._ctxWorkspaceTrustState = WorkspaceTrustContext.IsTrusted.bindTo(contextKeyService);
        this._ctxWorkspaceTrustState.set(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust((trusted) => this._ctxWorkspaceTrustState.set(trusted)));
    }
};
WorkspaceTrustContextKeys = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkspaceTrustEnablementService),
    __param(2, IWorkspaceTrustManagementService)
], WorkspaceTrustContextKeys);
export { WorkspaceTrustContextKeys };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspaceTrustContextKeys, 3 /* LifecyclePhase.Restored */);
/*
 * Trust Request via Service UX handler
 */
let WorkspaceTrustRequestHandler = class WorkspaceTrustRequestHandler extends Disposable {
    static { this.ID = 'workbench.contrib.workspaceTrustRequestHandler'; }
    constructor(dialogService, commandService, workspaceContextService, workspaceTrustManagementService, workspaceTrustRequestService) {
        super();
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.registerListeners();
    }
    get useWorkspaceLanguage() {
        return !isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
    }
    registerListeners() {
        // Open files trust request
        this._register(this.workspaceTrustRequestService.onDidInitiateOpenFilesTrustRequest(async () => {
            await this.workspaceTrustManagementService.workspaceResolved;
            // Details
            const markdownDetails = [
                this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
                    ? localize('openLooseFileWorkspaceDetails', 'You are trying to open untrusted files in a workspace which is trusted.')
                    : localize('openLooseFileWindowDetails', 'You are trying to open untrusted files in a window which is trusted.'),
                localize('openLooseFileLearnMore', "If you don't want to open untrusted files, we recommend to open them in Restricted Mode in a new window as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more."),
            ];
            // Dialog
            await this.dialogService.prompt({
                type: Severity.Info,
                message: this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
                    ? localize('openLooseFileWorkspaceMesssage', 'Do you want to allow untrusted files in this workspace?')
                    : localize('openLooseFileWindowMesssage', 'Do you want to allow untrusted files in this window?'),
                buttons: [
                    {
                        label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
                        run: ({ checkboxChecked }) => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(1 /* WorkspaceTrustUriResponse.Open */, !!checkboxChecked),
                    },
                    {
                        label: localize({ key: 'newWindow', comment: ['&& denotes a mnemonic'] }, 'Open in &&Restricted Mode'),
                        run: ({ checkboxChecked }) => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(2 /* WorkspaceTrustUriResponse.OpenInNewWindow */, !!checkboxChecked),
                    },
                ],
                cancelButton: {
                    run: () => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(3 /* WorkspaceTrustUriResponse.Cancel */),
                },
                checkbox: {
                    label: localize('openLooseFileWorkspaceCheckbox', 'Remember my decision for all workspaces'),
                    checked: false,
                },
                custom: {
                    icon: Codicon.shield,
                    markdownDetails: markdownDetails.map((md) => {
                        return { markdown: new MarkdownString(md) };
                    }),
                },
            });
        }));
        // Workspace trust request
        this._register(this.workspaceTrustRequestService.onDidInitiateWorkspaceTrustRequest(async (requestOptions) => {
            await this.workspaceTrustManagementService.workspaceResolved;
            // Title
            const message = this.useWorkspaceLanguage
                ? localize('workspaceTrust', 'Do you trust the authors of the files in this workspace?')
                : localize('folderTrust', 'Do you trust the authors of the files in this folder?');
            // Message
            const defaultDetails = localize('immediateTrustRequestMessage', 'A feature you are trying to use may be a security risk if you do not trust the source of the files or folders you currently have open.');
            const details = requestOptions?.message ?? defaultDetails;
            // Buttons
            const buttons = requestOptions?.buttons ?? [
                {
                    label: this.useWorkspaceLanguage
                        ? localize({ key: 'grantWorkspaceTrustButton', comment: ['&& denotes a mnemonic'] }, '&&Trust Workspace & Continue')
                        : localize({ key: 'grantFolderTrustButton', comment: ['&& denotes a mnemonic'] }, '&&Trust Folder & Continue'),
                    type: 'ContinueWithTrust',
                },
                {
                    label: localize({ key: 'manageWorkspaceTrustButton', comment: ['&& denotes a mnemonic'] }, '&&Manage'),
                    type: 'Manage',
                },
            ];
            // Add Cancel button if not provided
            if (!buttons.some((b) => b.type === 'Cancel')) {
                buttons.push({
                    label: localize('cancelWorkspaceTrustButton', 'Cancel'),
                    type: 'Cancel',
                });
            }
            // Dialog
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message,
                custom: {
                    icon: Codicon.shield,
                    markdownDetails: [
                        { markdown: new MarkdownString(details) },
                        {
                            markdown: new MarkdownString(localize('immediateTrustRequestLearnMore', "If you don't trust the authors of these files, we do not recommend continuing as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more.")),
                        },
                    ],
                },
                buttons: buttons
                    .filter((b) => b.type !== 'Cancel')
                    .map((button) => {
                    return {
                        label: button.label,
                        run: () => button.type,
                    };
                }),
                cancelButton: (() => {
                    const cancelButton = buttons.find((b) => b.type === 'Cancel');
                    if (!cancelButton) {
                        return undefined;
                    }
                    return {
                        label: cancelButton.label,
                        run: () => cancelButton.type,
                    };
                })(),
            });
            // Dialog result
            switch (result) {
                case 'ContinueWithTrust':
                    await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(true);
                    break;
                case 'ContinueWithoutTrust':
                    await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(undefined);
                    break;
                case 'Manage':
                    this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    await this.commandService.executeCommand(MANAGE_TRUST_COMMAND_ID);
                    break;
                case 'Cancel':
                    this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    break;
            }
        }));
    }
};
WorkspaceTrustRequestHandler = __decorate([
    __param(0, IDialogService),
    __param(1, ICommandService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IWorkspaceTrustRequestService)
], WorkspaceTrustRequestHandler);
export { WorkspaceTrustRequestHandler };
/*
 * Trust UX and Startup Handler
 */
let WorkspaceTrustUXHandler = class WorkspaceTrustUXHandler extends Disposable {
    constructor(dialogService, workspaceContextService, workspaceTrustEnablementService, workspaceTrustManagementService, configurationService, statusbarService, storageService, workspaceTrustRequestService, bannerService, labelService, hostService, productService, remoteAgentService, environmentService, fileService) {
        super();
        this.dialogService = dialogService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.storageService = storageService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.bannerService = bannerService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.productService = productService;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.entryId = `status.workspaceTrust`;
        this.statusbarEntryAccessor = this._register(new MutableDisposable());
        (async () => {
            await this.workspaceTrustManagementService.workspaceTrustInitialized;
            if (this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
                this.registerListeners();
                this.updateStatusbarEntry(this.workspaceTrustManagementService.isWorkspaceTrusted());
                // Show modal dialog
                if (this.hostService.hasFocus) {
                    this.showModalOnStart();
                }
                else {
                    const focusDisposable = this.hostService.onDidChangeFocus((focused) => {
                        if (focused) {
                            focusDisposable.dispose();
                            this.showModalOnStart();
                        }
                    });
                }
            }
        })();
    }
    registerListeners() {
        this._register(this.workspaceContextService.onWillChangeWorkspaceFolders((e) => {
            if (e.fromCache) {
                return;
            }
            if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
                return;
            }
            const addWorkspaceFolder = async (e) => {
                const trusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
                // Workspace is trusted and there are added/changed folders
                if (trusted && (e.changes.added.length || e.changes.changed.length)) {
                    const addedFoldersTrustInfo = await Promise.all(e.changes.added.map((folder) => this.workspaceTrustManagementService.getUriTrustInfo(folder.uri)));
                    if (!addedFoldersTrustInfo.map((info) => info.trusted).every((trusted) => trusted)) {
                        const { confirmed } = await this.dialogService.confirm({
                            type: Severity.Info,
                            message: localize('addWorkspaceFolderMessage', 'Do you trust the authors of the files in this folder?'),
                            detail: localize('addWorkspaceFolderDetail', 'You are adding files that are not currently trusted to a trusted workspace. Do you trust the authors of these new files?'),
                            cancelButton: localize('no', 'No'),
                            custom: { icon: Codicon.shield },
                        });
                        // Mark added/changed folders as trusted
                        await this.workspaceTrustManagementService.setUrisTrust(addedFoldersTrustInfo.map((i) => i.uri), confirmed);
                    }
                }
            };
            return e.join(addWorkspaceFolder(e));
        }));
        this._register(this.workspaceTrustManagementService.onDidChangeTrust((trusted) => {
            this.updateWorkbenchIndicators(trusted);
        }));
        this._register(this.workspaceTrustRequestService.onDidInitiateWorkspaceTrustRequestOnStartup(async () => {
            let titleString;
            let learnMoreString;
            let trustOption;
            let dontTrustOption;
            const isAiGeneratedWorkspace = await this.isAiGeneratedWorkspace();
            if (isAiGeneratedWorkspace && this.productService.aiGeneratedWorkspaceTrust) {
                titleString = this.productService.aiGeneratedWorkspaceTrust.title;
                learnMoreString =
                    this.productService.aiGeneratedWorkspaceTrust.startupTrustRequestLearnMore;
                trustOption = this.productService.aiGeneratedWorkspaceTrust.trustOption;
                dontTrustOption = this.productService.aiGeneratedWorkspaceTrust.dontTrustOption;
            }
            else {
                console.warn('AI generated workspace trust dialog contents not available.');
            }
            const title = titleString ??
                (this.useWorkspaceLanguage
                    ? localize('workspaceTrust', 'Do you trust the authors of the files in this workspace?')
                    : localize('folderTrust', 'Do you trust the authors of the files in this folder?'));
            let checkboxText;
            const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceContextService.getWorkspace());
            const isSingleFolderWorkspace = isSingleFolderWorkspaceIdentifier(workspaceIdentifier);
            const isEmptyWindow = isEmptyWorkspaceIdentifier(workspaceIdentifier);
            if (!isAiGeneratedWorkspace &&
                this.workspaceTrustManagementService.canSetParentFolderTrust()) {
                const name = basename(uriDirname(workspaceIdentifier.uri));
                checkboxText = localize('checkboxString', "Trust the authors of all files in the parent folder '{0}'", name);
            }
            // Show Workspace Trust Start Dialog
            this.doShowModal(title, {
                label: trustOption ??
                    localize({ key: 'trustOption', comment: ['&& denotes a mnemonic'] }, '&&Yes, I trust the authors'),
                sublabel: isSingleFolderWorkspace
                    ? localize('trustFolderOptionDescription', 'Trust folder and enable all features')
                    : localize('trustWorkspaceOptionDescription', 'Trust workspace and enable all features'),
            }, {
                label: dontTrustOption ??
                    localize({ key: 'dontTrustOption', comment: ['&& denotes a mnemonic'] }, "&&No, I don't trust the authors"),
                sublabel: isSingleFolderWorkspace
                    ? localize('dontTrustFolderOptionDescription', 'Browse folder in restricted mode')
                    : localize('dontTrustWorkspaceOptionDescription', 'Browse workspace in restricted mode'),
            }, [
                !isSingleFolderWorkspace
                    ? localize('workspaceStartupTrustDetails', '{0} provides features that may automatically execute files in this workspace.', this.productService.nameShort)
                    : localize('folderStartupTrustDetails', '{0} provides features that may automatically execute files in this folder.', this.productService.nameShort),
                learnMoreString ??
                    localize('startupTrustRequestLearnMore', "If you don't trust the authors of these files, we recommend to continue in restricted mode as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more."),
                !isEmptyWindow
                    ? `\`${this.labelService.getWorkspaceLabel(workspaceIdentifier, { verbose: 2 /* Verbosity.LONG */ })}\``
                    : '',
            ], checkboxText);
        }));
    }
    updateWorkbenchIndicators(trusted) {
        const bannerItem = this.getBannerItem(!trusted);
        this.updateStatusbarEntry(trusted);
        if (bannerItem) {
            if (!trusted) {
                this.bannerService.show(bannerItem);
            }
            else {
                this.bannerService.hide(BANNER_RESTRICTED_MODE);
            }
        }
    }
    //#region Dialog
    async doShowModal(question, trustedOption, untrustedOption, markdownStrings, trustParentString) {
        await this.dialogService.prompt({
            type: Severity.Info,
            message: question,
            checkbox: trustParentString
                ? {
                    label: trustParentString,
                }
                : undefined,
            buttons: [
                {
                    label: trustedOption.label,
                    run: async ({ checkboxChecked }) => {
                        if (checkboxChecked) {
                            await this.workspaceTrustManagementService.setParentFolderTrust(true);
                        }
                        else {
                            await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(true);
                        }
                    },
                },
                {
                    label: untrustedOption.label,
                    run: () => {
                        this.updateWorkbenchIndicators(false);
                        this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    },
                },
            ],
            custom: {
                buttonDetails: [trustedOption.sublabel, untrustedOption.sublabel],
                disableCloseAction: true,
                icon: Codicon.shield,
                markdownDetails: markdownStrings.map((md) => {
                    return { markdown: new MarkdownString(md) };
                }),
            },
        });
        this.storageService.store(STARTUP_PROMPT_SHOWN_KEY, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async showModalOnStart() {
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            this.updateWorkbenchIndicators(true);
            return;
        }
        // Don't show modal prompt if workspace trust cannot be changed
        if (!this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
            return;
        }
        // Don't show modal prompt for virtual workspaces by default
        if (isVirtualWorkspace(this.workspaceContextService.getWorkspace())) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        // Don't show modal prompt for empty workspaces by default
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        if (this.startupPromptSetting === 'never') {
            this.updateWorkbenchIndicators(false);
            return;
        }
        if (this.startupPromptSetting === 'once' &&
            this.storageService.getBoolean(STARTUP_PROMPT_SHOWN_KEY, 1 /* StorageScope.WORKSPACE */, false)) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        // Use the workspace trust request service to show modal dialog
        this.workspaceTrustRequestService.requestWorkspaceTrustOnStartup();
    }
    get startupPromptSetting() {
        return this.configurationService.getValue(WORKSPACE_TRUST_STARTUP_PROMPT);
    }
    get useWorkspaceLanguage() {
        return !isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
    }
    async isAiGeneratedWorkspace() {
        const aiGeneratedWorkspaces = URI.joinPath(this.environmentService.workspaceStorageHome, 'aiGeneratedWorkspaces.json');
        return await this.fileService.exists(aiGeneratedWorkspaces).then(async (result) => {
            if (result) {
                try {
                    const content = await this.fileService.readFile(aiGeneratedWorkspaces);
                    const workspaces = JSON.parse(content.value.toString());
                    if (workspaces.indexOf(this.workspaceContextService.getWorkspace().folders[0].uri.toString()) > -1) {
                        return true;
                    }
                }
                catch (e) {
                    // Ignore errors when resolving file contents
                }
            }
            return false;
        });
    }
    //#endregion
    //#region Banner
    getBannerItem(restrictedMode) {
        const dismissedRestricted = this.storageService.getBoolean(BANNER_RESTRICTED_MODE_DISMISSED_KEY, 1 /* StorageScope.WORKSPACE */, false);
        // never show the banner
        if (this.bannerSetting === 'never') {
            return undefined;
        }
        // info has been dismissed
        if (this.bannerSetting === 'untilDismissed' && dismissedRestricted) {
            return undefined;
        }
        const actions = [
            {
                label: localize('restrictedModeBannerManage', 'Manage'),
                href: 'command:' + MANAGE_TRUST_COMMAND_ID,
            },
            {
                label: localize('restrictedModeBannerLearnMore', 'Learn More'),
                href: 'https://aka.ms/vscode-workspace-trust',
            },
        ];
        return {
            id: BANNER_RESTRICTED_MODE,
            icon: shieldIcon,
            ariaLabel: this.getBannerItemAriaLabels(),
            message: this.getBannerItemMessages(),
            actions,
            onClose: () => {
                if (restrictedMode) {
                    this.storageService.store(BANNER_RESTRICTED_MODE_DISMISSED_KEY, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
            },
        };
    }
    getBannerItemAriaLabels() {
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */:
                return localize('restrictedModeBannerAriaLabelWindow', 'Restricted Mode is intended for safe code browsing. Trust this window to enable all features. Use navigation keys to access banner actions.');
            case 2 /* WorkbenchState.FOLDER */:
                return localize('restrictedModeBannerAriaLabelFolder', 'Restricted Mode is intended for safe code browsing. Trust this folder to enable all features. Use navigation keys to access banner actions.');
            case 3 /* WorkbenchState.WORKSPACE */:
                return localize('restrictedModeBannerAriaLabelWorkspace', 'Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features. Use navigation keys to access banner actions.');
        }
    }
    getBannerItemMessages() {
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */:
                return localize('restrictedModeBannerMessageWindow', 'Restricted Mode is intended for safe code browsing. Trust this window to enable all features.');
            case 2 /* WorkbenchState.FOLDER */:
                return localize('restrictedModeBannerMessageFolder', 'Restricted Mode is intended for safe code browsing. Trust this folder to enable all features.');
            case 3 /* WorkbenchState.WORKSPACE */:
                return localize('restrictedModeBannerMessageWorkspace', 'Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features.');
        }
    }
    get bannerSetting() {
        const result = this.configurationService.getValue(WORKSPACE_TRUST_BANNER);
        // In serverless environments, we don't need to aggressively show the banner
        if (result !== 'always' && isWeb && !this.remoteAgentService.getConnection()?.remoteAuthority) {
            return 'never';
        }
        return result;
    }
    //#endregion
    //#region Statusbar
    getRestrictedModeStatusbarEntry() {
        let ariaLabel = '';
        let toolTip;
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */: {
                ariaLabel = localize('status.ariaUntrustedWindow', 'Restricted Mode: Some features are disabled because this window is not trusted.');
                toolTip = {
                    value: localize({
                        key: 'status.tooltipUntrustedWindow2',
                        comment: [
                            '[abc]({n}) are links.  Only translate `features are disabled` and `window is not trusted`. Do not change brackets and parentheses or {n}',
                        ],
                    }, 'Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [window is not trusted]({1}).', `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true,
                };
                break;
            }
            case 2 /* WorkbenchState.FOLDER */: {
                ariaLabel = localize('status.ariaUntrustedFolder', 'Restricted Mode: Some features are disabled because this folder is not trusted.');
                toolTip = {
                    value: localize({
                        key: 'status.tooltipUntrustedFolder2',
                        comment: [
                            '[abc]({n}) are links.  Only translate `features are disabled` and `folder is not trusted`. Do not change brackets and parentheses or {n}',
                        ],
                    }, 'Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [folder is not trusted]({1}).', `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true,
                };
                break;
            }
            case 3 /* WorkbenchState.WORKSPACE */: {
                ariaLabel = localize('status.ariaUntrustedWorkspace', 'Restricted Mode: Some features are disabled because this workspace is not trusted.');
                toolTip = {
                    value: localize({
                        key: 'status.tooltipUntrustedWorkspace2',
                        comment: [
                            '[abc]({n}) are links. Only translate `features are disabled` and `workspace is not trusted`. Do not change brackets and parentheses or {n}',
                        ],
                    }, 'Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [workspace is not trusted]({1}).', `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true,
                };
                break;
            }
        }
        return {
            name: localize('status.WorkspaceTrust', 'Workspace Trust'),
            text: `$(shield) ${localize('untrusted', 'Restricted Mode')}`,
            ariaLabel: ariaLabel,
            tooltip: toolTip,
            command: MANAGE_TRUST_COMMAND_ID,
            kind: 'prominent',
        };
    }
    updateStatusbarEntry(trusted) {
        if (trusted && this.statusbarEntryAccessor.value) {
            this.statusbarEntryAccessor.clear();
            return;
        }
        if (!trusted && !this.statusbarEntryAccessor.value) {
            const entry = this.getRestrictedModeStatusbarEntry();
            this.statusbarEntryAccessor.value = this.statusbarService.addEntry(entry, this.entryId, 0 /* StatusbarAlignment.LEFT */, {
                location: { id: 'status.host', priority: Number.POSITIVE_INFINITY },
                alignment: 1 /* StatusbarAlignment.RIGHT */,
            });
        }
    }
};
WorkspaceTrustUXHandler = __decorate([
    __param(0, IDialogService),
    __param(1, IWorkspaceContextService),
    __param(2, IWorkspaceTrustEnablementService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IConfigurationService),
    __param(5, IStatusbarService),
    __param(6, IStorageService),
    __param(7, IWorkspaceTrustRequestService),
    __param(8, IBannerService),
    __param(9, ILabelService),
    __param(10, IHostService),
    __param(11, IProductService),
    __param(12, IRemoteAgentService),
    __param(13, IEnvironmentService),
    __param(14, IFileService)
], WorkspaceTrustUXHandler);
export { WorkspaceTrustUXHandler };
registerWorkbenchContribution2(WorkspaceTrustRequestHandler.ID, WorkspaceTrustRequestHandler, 2 /* WorkbenchPhase.BlockRestore */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspaceTrustUXHandler, 3 /* LifecyclePhase.Restored */);
/**
 * Trusted Workspace GUI Editor
 */
class WorkspaceTrustEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(WorkspaceTrustEditorInput);
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(WorkspaceTrustEditorInput.ID, WorkspaceTrustEditorInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(WorkspaceTrustEditor, WorkspaceTrustEditor.ID, localize('workspaceTrustEditor', 'Workspace Trust Editor')), [new SyncDescriptor(WorkspaceTrustEditorInput)]);
/*
 * Actions
 */
// Configure Workspace Trust Settings
const CONFIGURE_TRUST_COMMAND_ID = 'workbench.trust.configure';
const WORKSPACES_CATEGORY = localize2('workspacesCategory', 'Workspaces');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_TRUST_COMMAND_ID,
            title: localize2('configureWorkspaceTrustSettings', 'Configure Workspace Trust Settings'),
            precondition: ContextKeyExpr.and(WorkspaceTrustContext.IsEnabled, ContextKeyExpr.equals(`config.${WORKSPACE_TRUST_ENABLED}`, true)),
            category: WORKSPACES_CATEGORY,
            f1: true,
        });
    }
    run(accessor) {
        accessor
            .get(IPreferencesService)
            .openUserSettings({ jsonEditor: false, query: `@tag:${WORKSPACE_TRUST_SETTING_TAG}` });
    }
});
// Manage Workspace Trust
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: MANAGE_TRUST_COMMAND_ID,
            title: localize2('manageWorkspaceTrust', 'Manage Workspace Trust'),
            precondition: ContextKeyExpr.and(WorkspaceTrustContext.IsEnabled, ContextKeyExpr.equals(`config.${WORKSPACE_TRUST_ENABLED}`, true)),
            category: WORKSPACES_CATEGORY,
            f1: true,
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const input = instantiationService.createInstance(WorkspaceTrustEditorInput);
        editorService.openEditor(input, { pinned: true });
        return;
    }
});
/*
 * Configuration
 */
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...securityConfigurationNodeBase,
    properties: {
        [WORKSPACE_TRUST_ENABLED]: {
            type: 'boolean',
            default: true,
            description: localize('workspace.trust.description', 'Controls whether or not Workspace Trust is enabled within VS Code.'),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        [WORKSPACE_TRUST_STARTUP_PROMPT]: {
            type: 'string',
            default: 'once',
            description: localize('workspace.trust.startupPrompt.description', 'Controls when the startup prompt to trust a workspace is shown.'),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['always', 'once', 'never'],
            enumDescriptions: [
                localize('workspace.trust.startupPrompt.always', 'Ask for trust every time an untrusted workspace is opened.'),
                localize('workspace.trust.startupPrompt.once', 'Ask for trust the first time an untrusted workspace is opened.'),
                localize('workspace.trust.startupPrompt.never', 'Do not ask for trust when an untrusted workspace is opened.'),
            ],
        },
        [WORKSPACE_TRUST_BANNER]: {
            type: 'string',
            default: 'untilDismissed',
            description: localize('workspace.trust.banner.description', 'Controls when the restricted mode banner is shown.'),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['always', 'untilDismissed', 'never'],
            enumDescriptions: [
                localize('workspace.trust.banner.always', 'Show the banner every time an untrusted workspace is open.'),
                localize('workspace.trust.banner.untilDismissed', 'Show the banner when an untrusted workspace is opened until dismissed.'),
                localize('workspace.trust.banner.never', 'Do not show the banner when an untrusted workspace is open.'),
            ],
        },
        [WORKSPACE_TRUST_UNTRUSTED_FILES]: {
            type: 'string',
            default: 'prompt',
            markdownDescription: localize('workspace.trust.untrustedFiles.description', 'Controls how to handle opening untrusted files in a trusted workspace. This setting also applies to opening files in an empty window which is trusted via `#{0}#`.', WORKSPACE_TRUST_EMPTY_WINDOW),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['prompt', 'open', 'newWindow'],
            enumDescriptions: [
                localize('workspace.trust.untrustedFiles.prompt', 'Ask how to handle untrusted files for each workspace. Once untrusted files are introduced to a trusted workspace, you will not be prompted again.'),
                localize('workspace.trust.untrustedFiles.open', 'Always allow untrusted files to be introduced to a trusted workspace without prompting.'),
                localize('workspace.trust.untrustedFiles.newWindow', 'Always open untrusted files in a separate window in restricted mode without prompting.'),
            ],
        },
        [WORKSPACE_TRUST_EMPTY_WINDOW]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('workspace.trust.emptyWindow.description', 'Controls whether or not the empty window is trusted by default within VS Code. When used with `#{0}#`, you can enable the full functionality of VS Code without prompting in an empty window.', WORKSPACE_TRUST_UNTRUSTED_FILES),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
    },
});
let WorkspaceTrustTelemetryContribution = class WorkspaceTrustTelemetryContribution extends Disposable {
    constructor(environmentService, telemetryService, workspaceContextService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustManagementService.workspaceTrustInitialized.then(() => {
            this.logInitialWorkspaceTrustInfo();
            this.logWorkspaceTrust(this.workspaceTrustManagementService.isWorkspaceTrusted());
            this._register(this.workspaceTrustManagementService.onDidChangeTrust((isTrusted) => this.logWorkspaceTrust(isTrusted)));
        });
    }
    logInitialWorkspaceTrustInfo() {
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            const disabledByCliFlag = this.environmentService.disableWorkspaceTrust;
            this.telemetryService.publicLog2('workspaceTrustDisabled', {
                reason: disabledByCliFlag ? 'cli' : 'setting',
            });
            return;
        }
        this.telemetryService.publicLog2('workspaceTrustFolderCounts', {
            trustedFoldersCount: this.workspaceTrustManagementService.getTrustedUris().length,
        });
    }
    async logWorkspaceTrust(isTrusted) {
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return;
        }
        this.telemetryService.publicLog2('workspaceTrustStateChanged', {
            workspaceId: this.workspaceContextService.getWorkspace().id,
            isTrusted: isTrusted,
        });
        if (isTrusted) {
            const getDepth = (folder) => {
                let resolvedPath = resolve(folder);
                let depth = 0;
                while (dirname(resolvedPath) !== resolvedPath && depth < 100) {
                    resolvedPath = dirname(resolvedPath);
                    depth++;
                }
                return depth;
            };
            for (const folder of this.workspaceContextService.getWorkspace().folders) {
                const { trusted, uri } = await this.workspaceTrustManagementService.getUriTrustInfo(folder.uri);
                if (!trusted) {
                    continue;
                }
                const workspaceFolderDepth = getDepth(folder.uri.fsPath);
                const trustedFolderDepth = getDepth(uri.fsPath);
                const delta = workspaceFolderDepth - trustedFolderDepth;
                this.telemetryService.publicLog2('workspaceFolderDepthBelowTrustedFolder', {
                    workspaceFolderDepth,
                    trustedFolderDepth,
                    delta,
                });
            }
        }
    }
};
WorkspaceTrustTelemetryContribution = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustEnablementService),
    __param(4, IWorkspaceTrustManagementService)
], WorkspaceTrustTelemetryContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspaceTrustTelemetryContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd29ya3NwYWNlL2Jyb3dzZXIvd29ya3NwYWNlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsZ0NBQWdDLEVBQ2hDLDZCQUE2QixHQUU3QixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEVBSWpDLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FB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