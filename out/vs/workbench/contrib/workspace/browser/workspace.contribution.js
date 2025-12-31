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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dvcmtzcGFjZS9icm93c2VyL3dvcmtzcGFjZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLGdDQUFnQyxFQUNoQyw2QkFBNkIsR0FFN0IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixFQUlqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFB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