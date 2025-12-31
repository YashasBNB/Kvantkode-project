var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, isHTMLInputElement, isHTMLTextAreaElement, reset, windowOpenNoOpener, } from '../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Button, unthemedButtonStyles } from '../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Delayer, RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { debounce } from '../../../../base/common/decorators.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isLinuxSnap, isMacintosh } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { escape } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IIssueFormService, } from '../common/issue.js';
import { normalizeGitHubUrl } from '../common/issueReporterUtil.js';
import { IssueReporterModel, } from './issueReporterModel.js';
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. If extension data is too large, we will allow users to downlaod and attach it as a file.
// We round down to be safe.
// ref https://github.com/github/issues/issues/12858
const MAX_EXTENSION_DATA_LENGTH = 60000;
var IssueSource;
(function (IssueSource) {
    IssueSource["VSCode"] = "vscode";
    IssueSource["Extension"] = "extension";
    IssueSource["Marketplace"] = "marketplace";
    IssueSource["Unknown"] = "unknown";
})(IssueSource || (IssueSource = {}));
let BaseIssueReporterService = class BaseIssueReporterService extends Disposable {
    constructor(disableExtensions, data, os, product, window, isWeb, issueFormService, themeService, fileService, fileDialogService) {
        super();
        this.disableExtensions = disableExtensions;
        this.data = data;
        this.os = os;
        this.product = product;
        this.window = window;
        this.isWeb = isWeb;
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.receivedSystemInfo = false;
        this.numberOfSearchResultsDisplayed = 0;
        this.receivedPerformanceInfo = false;
        this.shouldQueueSearch = false;
        this.hasBeenSubmitted = false;
        this.openReporter = false;
        this.loadingExtensionData = false;
        this.selectedExtension = '';
        this.delayedSubmit = new Delayer(300);
        this.nonGitHubIssueUrl = false;
        this.needsUpdate = false;
        this.acknowledged = false;
        const targetExtension = data.extensionId
            ? data.enabledExtensions.find((extension) => extension.id.toLocaleLowerCase() === data.extensionId?.toLocaleLowerCase())
            : undefined;
        this.issueReporterModel = new IssueReporterModel({
            ...data,
            issueType: data.issueType || 0 /* IssueType.Bug */,
            versionInfo: {
                vscodeVersion: `${product.nameShort} ${!!product.darwinUniversalAssetId ? `${product.version} (Universal)` : product.version} (${product.commit || 'Commit unknown'}, ${product.date || 'Date unknown'})`,
                os: `${this.os.type} ${this.os.arch} ${this.os.release}${isLinuxSnap ? ' snap' : ''}`,
            },
            extensionsDisabled: !!this.disableExtensions,
            fileOnExtension: data.extensionId ? !targetExtension?.isBuiltin : undefined,
            selectedExtension: targetExtension,
        });
        const fileOnMarketplace = data.issueSource === IssueSource.Marketplace;
        const fileOnProduct = data.issueSource === IssueSource.VSCode;
        this.issueReporterModel.update({ fileOnMarketplace, fileOnProduct });
        //TODO: Handle case where extension is not activated
        const issueReporterElement = this.getElementById('issue-reporter');
        if (issueReporterElement) {
            this.previewButton = this._register(new Button(issueReporterElement, unthemedButtonStyles));
            const issueRepoName = document.createElement('a');
            issueReporterElement.appendChild(issueRepoName);
            issueRepoName.id = 'show-repo-name';
            issueRepoName.classList.add('hidden');
            this.updatePreviewButtonState();
        }
        const issueTitle = data.issueTitle;
        if (issueTitle) {
            const issueTitleElement = this.getElementById('issue-title');
            if (issueTitleElement) {
                issueTitleElement.value = issueTitle;
            }
        }
        const issueBody = data.issueBody;
        if (issueBody) {
            const description = this.getElementById('description');
            if (description) {
                description.value = issueBody;
                this.issueReporterModel.update({ issueDescription: issueBody });
            }
        }
        if (this.window.document.documentElement.lang !== 'en') {
            show(this.getElementById('english'));
        }
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this.themeService));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = new RunOnceScheduler(updateAll, 0);
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
        this.handleExtensionData(data.enabledExtensions);
        this.setUpTypes();
        this.applyStyles(data.styles);
        // Handle case where extension is pre-selected through the command
        if ((data.data || data.uri) && targetExtension) {
            this.updateExtensionStatus(targetExtension);
        }
    }
    render() {
        this.renderBlocks();
    }
    setInitialFocus() {
        const { fileOnExtension } = this.issueReporterModel.getData();
        if (fileOnExtension) {
            const issueTitle = this.window.document.getElementById('issue-title');
            issueTitle?.focus();
        }
        else {
            const issueType = this.window.document.getElementById('issue-type');
            issueType?.focus();
        }
    }
    // TODO @justschen: After migration to Aux Window, switch to dedicated css.
    applyStyles(styles) {
        const styleTag = document.createElement('style');
        const content = [];
        if (styles.inputBackground) {
            content.push(`input[type="text"], textarea, select, .issues-container > .issue > .issue-state, .block-info { background-color: ${styles.inputBackground} !important; }`);
        }
        if (styles.backgroundColor) {
            content.push(`.monaco-workbench { background-color: ${styles.backgroundColor} !important; }`);
            content.push(`.issue-reporter-body::-webkit-scrollbar-track { background-color: ${styles.backgroundColor}; }`);
        }
        if (styles.inputBorder) {
            content.push(`input[type="text"], textarea, select { border: 1px solid ${styles.inputBorder}; }`);
        }
        else {
            content.push(`input[type="text"], textarea, select { border: 1px solid transparent; }`);
        }
        if (styles.inputForeground) {
            content.push(`input[type="text"], textarea, select, .issues-container > .issue > .issue-state, .block-info { color: ${styles.inputForeground} !important; }`);
        }
        if (styles.inputErrorBorder) {
            content.push(`.invalid-input, .invalid-input:focus, .validation-error { border: 1px solid ${styles.inputErrorBorder} !important; }`);
            content.push(`.required-input { color: ${styles.inputErrorBorder}; }`);
        }
        if (styles.inputErrorBackground) {
            content.push(`.validation-error { background: ${styles.inputErrorBackground}; }`);
        }
        if (styles.inputErrorForeground) {
            content.push(`.validation-error { color: ${styles.inputErrorForeground}; }`);
        }
        if (styles.inputActiveBorder) {
            content.push(`input[type='text']:focus, textarea:focus, select:focus, summary:focus, button:focus, a:focus, .workbenchCommand:focus  { border: 1px solid ${styles.inputActiveBorder}; outline-style: none; }`);
        }
        if (styles.textLinkColor) {
            content.push(`a, .workbenchCommand { color: ${styles.textLinkColor}; }`);
        }
        if (styles.textLinkColor) {
            content.push(`a { color: ${styles.textLinkColor}; }`);
        }
        if (styles.textLinkActiveForeground) {
            content.push(`a:hover, .workbenchCommand:hover { color: ${styles.textLinkActiveForeground}; }`);
        }
        if (styles.sliderActiveColor) {
            content.push(`.issue-reporter-body::-webkit-scrollbar-thumb:active { background-color: ${styles.sliderActiveColor}; }`);
        }
        if (styles.sliderHoverColor) {
            content.push(`.issue-reporter-body::-webkit-scrollbar-thumb { background-color: ${styles.sliderHoverColor}; }`);
            content.push(`.issue-reporter-body::--webkit-scrollbar-thumb:hover { background-color: ${styles.sliderHoverColor}; }`);
        }
        if (styles.buttonBackground) {
            content.push(`.monaco-text-button { background-color: ${styles.buttonBackground} !important; }`);
        }
        if (styles.buttonForeground) {
            content.push(`.monaco-text-button { color: ${styles.buttonForeground} !important; }`);
        }
        if (styles.buttonHoverBackground) {
            content.push(`.monaco-text-button:not(.disabled):hover, .monaco-text-button:focus { background-color: ${styles.buttonHoverBackground} !important; }`);
        }
        styleTag.textContent = content.join('\n');
        this.window.document.head.appendChild(styleTag);
        this.window.document.body.style.color = styles.color || '';
    }
    async updateIssueReporterUri(extension) {
        try {
            if (extension.uri) {
                const uri = URI.revive(extension.uri);
                extension.bugsUrl = uri.toString();
            }
        }
        catch (e) {
            this.renderBlocks();
        }
    }
    handleExtensionData(extensions) {
        const installedExtensions = extensions.filter((x) => !x.isBuiltin);
        const { nonThemes, themes } = groupBy(installedExtensions, (ext) => {
            return ext.isTheme ? 'themes' : 'nonThemes';
        });
        const numberOfThemeExtesions = themes && themes.length;
        this.issueReporterModel.update({
            numberOfThemeExtesions,
            enabledNonThemeExtesions: nonThemes,
            allExtensions: installedExtensions,
        });
        this.updateExtensionTable(nonThemes, numberOfThemeExtesions);
        if (this.disableExtensions || installedExtensions.length === 0) {
            ;
            this.getElementById('disableExtensions').disabled = true;
        }
        this.updateExtensionSelector(installedExtensions);
    }
    updateExtensionSelector(extensions) {
        const extensionOptions = extensions.map((extension) => {
            return {
                name: extension.displayName || extension.name || '',
                id: extension.id,
            };
        });
        // Sort extensions by name
        extensionOptions.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName > bName) {
                return 1;
            }
            if (aName < bName) {
                return -1;
            }
            return 0;
        });
        const makeOption = (extension, selectedExtension) => {
            const selected = selectedExtension && extension.id === selectedExtension.id;
            return $('option', {
                value: extension.id,
                selected: selected || '',
            }, extension.name);
        };
        const extensionsSelector = this.getElementById('extension-selector');
        if (extensionsSelector) {
            const { selectedExtension } = this.issueReporterModel.getData();
            reset(extensionsSelector, this.makeOption('', localize('selectExtension', 'Select extension'), true), ...extensionOptions.map((extension) => makeOption(extension, selectedExtension)));
            if (!selectedExtension) {
                extensionsSelector.selectedIndex = 0;
            }
            this.addEventListener('extension-selector', 'change', async (e) => {
                this.clearExtensionData();
                const selectedExtensionId = e.target.value;
                this.selectedExtension = selectedExtensionId;
                const extensions = this.issueReporterModel.getData().allExtensions;
                const matches = extensions.filter((extension) => extension.id === selectedExtensionId);
                if (matches.length) {
                    this.issueReporterModel.update({ selectedExtension: matches[0] });
                    const selectedExtension = this.issueReporterModel.getData().selectedExtension;
                    if (selectedExtension) {
                        const iconElement = document.createElement('span');
                        iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                        this.setLoading(iconElement);
                        const openReporterData = await this.sendReporterMenu(selectedExtension);
                        if (openReporterData) {
                            if (this.selectedExtension === selectedExtensionId) {
                                this.removeLoading(iconElement, true);
                                // this.configuration.data = openReporterData;
                                this.data = openReporterData;
                            }
                            // else if (this.selectedExtension !== selectedExtensionId) {
                            // }
                        }
                        else {
                            if (!this.loadingExtensionData) {
                                iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                            }
                            this.removeLoading(iconElement);
                            // if not using command, should have no configuration data in fields we care about and check later.
                            this.clearExtensionData();
                            // case when previous extension was opened from normal openIssueReporter command
                            selectedExtension.data = undefined;
                            selectedExtension.uri = undefined;
                        }
                        if (this.selectedExtension === selectedExtensionId) {
                            // repopulates the fields with the new data given the selected extension.
                            this.updateExtensionStatus(matches[0]);
                            this.openReporter = false;
                        }
                    }
                    else {
                        this.issueReporterModel.update({ selectedExtension: undefined });
                        this.clearSearchResults();
                        this.clearExtensionData();
                        this.validateSelectedExtension();
                        this.updateExtensionStatus(matches[0]);
                    }
                }
            });
        }
        this.addEventListener('problem-source', 'change', (_) => {
            this.clearExtensionData();
            this.validateSelectedExtension();
        });
    }
    async sendReporterMenu(extension) {
        try {
            const data = await this.issueFormService.sendReporterMenu(extension.id);
            return data;
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    }
    updateAcknowledgementState() {
        const acknowledgementCheckbox = this.getElementById('includeAcknowledgement');
        if (acknowledgementCheckbox) {
            this.acknowledged = acknowledgementCheckbox.checked;
            this.updatePreviewButtonState();
        }
    }
    setEventHandlers() {
        ;
        [
            'includeSystemInfo',
            'includeProcessInfo',
            'includeWorkspaceInfo',
            'includeExtensions',
            'includeExperiments',
            'includeExtensionData',
        ].forEach((elementId) => {
            this.addEventListener(elementId, 'click', (event) => {
                event.stopPropagation();
                this.issueReporterModel.update({
                    [elementId]: !this.issueReporterModel.getData()[elementId],
                });
            });
        });
        this.addEventListener('includeAcknowledgement', 'click', (event) => {
            event.stopPropagation();
            this.updateAcknowledgementState();
        });
        const showInfoElements = this.window.document.getElementsByClassName('showInfo');
        for (let i = 0; i < showInfoElements.length; i++) {
            const showInfo = showInfoElements.item(i);
            showInfo.addEventListener('click', (e) => {
                e.preventDefault();
                const label = e.target;
                if (label) {
                    const containingElement = label.parentElement && label.parentElement.parentElement;
                    const info = containingElement && containingElement.lastElementChild;
                    if (info && info.classList.contains('hidden')) {
                        show(info);
                        label.textContent = localize('hide', 'hide');
                    }
                    else {
                        hide(info);
                        label.textContent = localize('show', 'show');
                    }
                }
            });
        }
        this.addEventListener('issue-source', 'change', (e) => {
            const value = e.target.value;
            const problemSourceHelpText = this.getElementById('problem-source-help-text');
            if (value === '') {
                this.issueReporterModel.update({ fileOnExtension: undefined });
                show(problemSourceHelpText);
                this.clearSearchResults();
                this.render();
                return;
            }
            else {
                hide(problemSourceHelpText);
            }
            const descriptionTextArea = this.getElementById('issue-title');
            if (value === IssueSource.VSCode) {
                descriptionTextArea.placeholder = localize('vscodePlaceholder', 'E.g Workbench is missing problems panel');
            }
            else if (value === IssueSource.Extension) {
                descriptionTextArea.placeholder = localize('extensionPlaceholder', 'E.g. Missing alt text on extension readme image');
            }
            else if (value === IssueSource.Marketplace) {
                descriptionTextArea.placeholder = localize('marketplacePlaceholder', 'E.g Cannot disable installed extension');
            }
            else {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', 'Please enter a title');
            }
            let fileOnExtension, fileOnMarketplace = false;
            if (value === IssueSource.Extension) {
                fileOnExtension = true;
            }
            else if (value === IssueSource.Marketplace) {
                fileOnMarketplace = true;
            }
            this.issueReporterModel.update({ fileOnExtension, fileOnMarketplace });
            this.render();
            const title = this.getElementById('issue-title').value;
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        this.addEventListener('description', 'input', (e) => {
            const issueDescription = e.target.value;
            this.issueReporterModel.update({ issueDescription });
            // Only search for extension issues on title change
            if (this.issueReporterModel.fileOnExtension() === false) {
                const title = this.getElementById('issue-title').value;
                this.searchVSCodeIssues(title, issueDescription);
            }
        });
        this.addEventListener('issue-title', 'input', (_) => {
            const titleElement = this.getElementById('issue-title');
            if (titleElement) {
                const title = titleElement.value;
                this.issueReporterModel.update({ issueTitle: title });
            }
        });
        this.addEventListener('issue-title', 'input', (e) => {
            const title = e.target.value;
            const lengthValidationMessage = this.getElementById('issue-title-length-validation-error');
            const issueUrl = this.getIssueUrl();
            if (title && this.getIssueUrlWithTitle(title, issueUrl).length > MAX_URL_LENGTH) {
                show(lengthValidationMessage);
            }
            else {
                hide(lengthValidationMessage);
            }
            const issueSource = this.getElementById('issue-source');
            if (!issueSource || issueSource.value === '') {
                return;
            }
            const { fileOnExtension, fileOnMarketplace } = this.issueReporterModel.getData();
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        this._register(this.previewButton.onDidClick(async () => {
            this.delayedSubmit.trigger(async () => {
                this.createIssue();
            });
        }));
        this.addEventListener('disableExtensions', 'click', () => {
            this.issueFormService.reloadWithExtensionsDisabled();
        });
        this.addEventListener('extensionBugsLink', 'click', (e) => {
            const url = e.target.innerText;
            windowOpenNoOpener(url);
        });
        this.addEventListener('disableExtensions', 'keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === ' ') {
                this.issueFormService.reloadWithExtensionsDisabled();
            }
        });
        this.window.document.onkeydown = async (e) => {
            const cmdOrCtrlKey = isMacintosh ? e.metaKey : e.ctrlKey;
            // Cmd/Ctrl+Enter previews issue and closes window
            if (cmdOrCtrlKey && e.key === 'Enter') {
                this.delayedSubmit.trigger(async () => {
                    if (await this.createIssue()) {
                        this.close();
                    }
                });
            }
            // Cmd/Ctrl + w closes issue window
            if (cmdOrCtrlKey && e.key === 'w') {
                e.stopPropagation();
                e.preventDefault();
                const issueTitle = this.getElementById('issue-title').value;
                const { issueDescription } = this.issueReporterModel.getData();
                if (!this.hasBeenSubmitted && (issueTitle || issueDescription)) {
                    // fire and forget
                    this.issueFormService.showConfirmCloseDialog();
                }
                else {
                    this.close();
                }
            }
            // With latest electron upgrade, cmd+a is no longer propagating correctly for inputs in this window on mac
            // Manually perform the selection
            if (isMacintosh) {
                if (cmdOrCtrlKey && e.key === 'a' && e.target) {
                    if (isHTMLInputElement(e.target) || isHTMLTextAreaElement(e.target)) {
                        ;
                        e.target.select();
                    }
                }
            }
        };
    }
    updatePerformanceInfo(info) {
        this.issueReporterModel.update(info);
        this.receivedPerformanceInfo = true;
        const state = this.issueReporterModel.getData();
        this.updateProcessInfo(state);
        this.updateWorkspaceInfo(state);
        this.updatePreviewButtonState();
    }
    updatePreviewButtonState() {
        if (!this.acknowledged && this.needsUpdate) {
            this.previewButton.label = localize('acknowledge', 'Confirm Version Acknowledgement');
            this.previewButton.enabled = false;
        }
        else if (this.isPreviewEnabled()) {
            if (this.data.githubAccessToken) {
                this.previewButton.label = localize('createOnGitHub', 'Create on GitHub');
            }
            else {
                this.previewButton.label = localize('previewOnGitHub', 'Preview on GitHub');
            }
            this.previewButton.enabled = true;
        }
        else {
            this.previewButton.enabled = false;
            this.previewButton.label = localize('loadingData', 'Loading data...');
        }
        const issueRepoName = this.getElementById('show-repo-name');
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        if (selectedExtension && selectedExtension.uri) {
            const urlString = URI.revive(selectedExtension.uri).toString();
            issueRepoName.href = urlString;
            issueRepoName.addEventListener('click', (e) => this.openLink(e));
            issueRepoName.addEventListener('auxclick', (e) => this.openLink(e));
            const gitHubInfo = this.parseGitHubUrl(urlString);
            issueRepoName.textContent = gitHubInfo
                ? gitHubInfo.owner + '/' + gitHubInfo.repositoryName
                : urlString;
            Object.assign(issueRepoName.style, {
                alignSelf: 'flex-end',
                display: 'block',
                fontSize: '13px',
                marginBottom: '10px',
                padding: '4px 0px',
                textDecoration: 'none',
                width: 'auto',
            });
            show(issueRepoName);
        }
        else {
            // clear styles
            issueRepoName.removeAttribute('style');
            hide(issueRepoName);
        }
        // Initial check when first opened.
        this.getExtensionGitHubUrl();
    }
    isPreviewEnabled() {
        const issueType = this.issueReporterModel.getData().issueType;
        if (this.loadingExtensionData) {
            return false;
        }
        if (this.isWeb) {
            if (issueType === 2 /* IssueType.FeatureRequest */ ||
                issueType === 1 /* IssueType.PerformanceIssue */ ||
                issueType === 0 /* IssueType.Bug */) {
                return true;
            }
        }
        else {
            if (issueType === 0 /* IssueType.Bug */ && this.receivedSystemInfo) {
                return true;
            }
            if (issueType === 1 /* IssueType.PerformanceIssue */ &&
                this.receivedSystemInfo &&
                this.receivedPerformanceInfo) {
                return true;
            }
            if (issueType === 2 /* IssueType.FeatureRequest */) {
                return true;
            }
        }
        return false;
    }
    getExtensionRepositoryUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.repositoryUrl;
    }
    getExtensionBugsUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.bugsUrl;
    }
    searchVSCodeIssues(title, issueDescription) {
        if (title) {
            this.searchDuplicates(title, issueDescription);
        }
        else {
            this.clearSearchResults();
        }
    }
    searchIssues(title, fileOnExtension, fileOnMarketplace) {
        if (fileOnExtension) {
            return this.searchExtensionIssues(title);
        }
        if (fileOnMarketplace) {
            return this.searchMarketplaceIssues(title);
        }
        const description = this.issueReporterModel.getData().issueDescription;
        this.searchVSCodeIssues(title, description);
    }
    searchExtensionIssues(title) {
        const url = this.getExtensionGitHubUrl();
        if (title) {
            const matches = /^https?:\/\/github\.com\/(.*)/.exec(url);
            if (matches && matches.length) {
                const repo = matches[1];
                return this.searchGitHub(repo, title);
            }
            // If the extension has no repository, display empty search results
            if (this.issueReporterModel.getData().selectedExtension) {
                this.clearSearchResults();
                return this.displaySearchResults([]);
            }
        }
        this.clearSearchResults();
    }
    searchMarketplaceIssues(title) {
        if (title) {
            const gitHubInfo = this.parseGitHubUrl(this.product.reportMarketplaceIssueUrl);
            if (gitHubInfo) {
                return this.searchGitHub(`${gitHubInfo.owner}/${gitHubInfo.repositoryName}`, title);
            }
        }
    }
    async close() {
        await this.issueFormService.closeReporter();
    }
    clearSearchResults() {
        const similarIssues = this.getElementById('similar-issues');
        similarIssues.innerText = '';
        this.numberOfSearchResultsDisplayed = 0;
    }
    searchGitHub(repo, title) {
        const query = `is:issue+repo:${repo}+${title}`;
        const similarIssues = this.getElementById('similar-issues');
        fetch(`https://api.github.com/search/issues?q=${query}`)
            .then((response) => {
            response
                .json()
                .then((result) => {
                similarIssues.innerText = '';
                if (result && result.items) {
                    this.displaySearchResults(result.items);
                }
                else {
                    // If the items property isn't present, the rate limit has been hit
                    const message = $('div.list-title');
                    message.textContent = localize('rateLimited', 'GitHub query limit exceeded. Please wait.');
                    similarIssues.appendChild(message);
                    const resetTime = response.headers.get('X-RateLimit-Reset');
                    const timeToWait = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 1;
                    if (this.shouldQueueSearch) {
                        this.shouldQueueSearch = false;
                        setTimeout(() => {
                            this.searchGitHub(repo, title);
                            this.shouldQueueSearch = true;
                        }, timeToWait * 1000);
                    }
                }
            })
                .catch((_) => {
                console.warn('Timeout or query limit exceeded');
            });
        })
            .catch((_) => {
            console.warn('Error fetching GitHub issues');
        });
    }
    searchDuplicates(title, body) {
        const url = 'https://vscode-probot.westus.cloudapp.azure.com:7890/duplicate_candidates';
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title,
                body,
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
            }),
        };
        fetch(url, init)
            .then((response) => {
            response
                .json()
                .then((result) => {
                this.clearSearchResults();
                if (result && result.candidates) {
                    this.displaySearchResults(result.candidates);
                }
                else {
                    throw new Error('Unexpected response, no candidates property');
                }
            })
                .catch((_) => {
                // Ignore
            });
        })
            .catch((_) => {
            // Ignore
        });
    }
    displaySearchResults(results) {
        const similarIssues = this.getElementById('similar-issues');
        if (results.length) {
            const issues = $('div.issues-container');
            const issuesText = $('div.list-title');
            issuesText.textContent = localize('similarIssues', 'Similar issues');
            this.numberOfSearchResultsDisplayed = results.length < 5 ? results.length : 5;
            for (let i = 0; i < this.numberOfSearchResultsDisplayed; i++) {
                const issue = results[i];
                const link = $('a.issue-link', { href: issue.html_url });
                link.textContent = issue.title;
                link.title = issue.title;
                link.addEventListener('click', (e) => this.openLink(e));
                link.addEventListener('auxclick', (e) => this.openLink(e));
                let issueState;
                let item;
                if (issue.state) {
                    issueState = $('span.issue-state');
                    const issueIcon = $('span.issue-icon');
                    issueIcon.appendChild(renderIcon(issue.state === 'open' ? Codicon.issueOpened : Codicon.issueClosed));
                    const issueStateLabel = $('span.issue-state.label');
                    issueStateLabel.textContent =
                        issue.state === 'open' ? localize('open', 'Open') : localize('closed', 'Closed');
                    issueState.title =
                        issue.state === 'open' ? localize('open', 'Open') : localize('closed', 'Closed');
                    issueState.appendChild(issueIcon);
                    issueState.appendChild(issueStateLabel);
                    item = $('div.issue', undefined, issueState, link);
                }
                else {
                    item = $('div.issue', undefined, link);
                }
                issues.appendChild(item);
            }
            similarIssues.appendChild(issuesText);
            similarIssues.appendChild(issues);
        }
        else {
            const message = $('div.list-title');
            message.textContent = localize('noSimilarIssues', 'No similar issues found');
            similarIssues.appendChild(message);
        }
    }
    setUpTypes() {
        const makeOption = (issueType, description) => $('option', { value: issueType.valueOf() }, escape(description));
        const typeSelect = this.getElementById('issue-type');
        const { issueType } = this.issueReporterModel.getData();
        reset(typeSelect, makeOption(0 /* IssueType.Bug */, localize('bugReporter', 'Bug Report')), makeOption(2 /* IssueType.FeatureRequest */, localize('featureRequest', 'Feature Request')), makeOption(1 /* IssueType.PerformanceIssue */, localize('performanceIssue', 'Performance Issue (freeze, slow, crash)')));
        typeSelect.value = issueType.toString();
        this.setSourceOptions();
    }
    makeOption(value, description, disabled) {
        const option = document.createElement('option');
        option.disabled = disabled;
        option.value = value;
        option.textContent = description;
        return option;
    }
    setSourceOptions() {
        const sourceSelect = this.getElementById('issue-source');
        const { issueType, fileOnExtension, selectedExtension, fileOnMarketplace, fileOnProduct } = this.issueReporterModel.getData();
        let selected = sourceSelect.selectedIndex;
        if (selected === -1) {
            if (fileOnExtension !== undefined) {
                selected = fileOnExtension ? 2 : 1;
            }
            else if (selectedExtension?.isBuiltin) {
                selected = 1;
            }
            else if (fileOnMarketplace) {
                selected = 3;
            }
            else if (fileOnProduct) {
                selected = 1;
            }
        }
        sourceSelect.innerText = '';
        sourceSelect.append(this.makeOption('', localize('selectSource', 'Select source'), true));
        sourceSelect.append(this.makeOption(IssueSource.VSCode, localize('vscode', 'Visual Studio Code'), false));
        sourceSelect.append(this.makeOption(IssueSource.Extension, localize('extension', 'A VS Code extension'), false));
        if (this.product.reportMarketplaceIssueUrl) {
            sourceSelect.append(this.makeOption(IssueSource.Marketplace, localize('marketplace', 'Extensions Marketplace'), false));
        }
        if (issueType !== 2 /* IssueType.FeatureRequest */) {
            sourceSelect.append(this.makeOption(IssueSource.Unknown, localize('unknown', "Don't know"), false));
        }
        if (selected !== -1 && selected < sourceSelect.options.length) {
            sourceSelect.selectedIndex = selected;
        }
        else {
            sourceSelect.selectedIndex = 0;
            hide(this.getElementById('problem-source-help-text'));
        }
    }
    async renderBlocks() {
        // Depending on Issue Type, we render different blocks and text
        const { issueType, fileOnExtension, fileOnMarketplace, selectedExtension } = this.issueReporterModel.getData();
        const blockContainer = this.getElementById('block-container');
        const systemBlock = this.window.document.querySelector('.block-system');
        const processBlock = this.window.document.querySelector('.block-process');
        const workspaceBlock = this.window.document.querySelector('.block-workspace');
        const extensionsBlock = this.window.document.querySelector('.block-extensions');
        const experimentsBlock = this.window.document.querySelector('.block-experiments');
        const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
        const problemSource = this.getElementById('problem-source');
        const descriptionTitle = this.getElementById('issue-description-label');
        const descriptionSubtitle = this.getElementById('issue-description-subtitle');
        const extensionSelector = this.getElementById('extension-selection');
        const downloadExtensionDataLink = (this.getElementById('extension-data-download'));
        const titleTextArea = this.getElementById('issue-title-container');
        const descriptionTextArea = this.getElementById('description');
        const extensionDataTextArea = this.getElementById('extension-data');
        // Hide all by default
        hide(blockContainer);
        hide(systemBlock);
        hide(processBlock);
        hide(workspaceBlock);
        hide(extensionsBlock);
        hide(experimentsBlock);
        hide(extensionSelector);
        hide(extensionDataTextArea);
        hide(extensionDataBlock);
        hide(downloadExtensionDataLink);
        show(problemSource);
        show(titleTextArea);
        show(descriptionTextArea);
        if (fileOnExtension) {
            show(extensionSelector);
        }
        const extensionData = this.issueReporterModel.getData().extensionData;
        if (extensionData && extensionData.length > MAX_EXTENSION_DATA_LENGTH) {
            show(downloadExtensionDataLink);
            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
            const handleLinkClick = async () => {
                const downloadPath = await this.fileDialogService.showSaveDialog({
                    title: localize('saveExtensionData', 'Save Extension Data'),
                    availableFileSystems: [Schemas.file],
                    defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                });
                if (downloadPath) {
                    await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                }
            };
            downloadExtensionDataLink.addEventListener('click', handleLinkClick);
            this._register({
                dispose: () => downloadExtensionDataLink.removeEventListener('click', handleLinkClick),
            });
        }
        if (selectedExtension && this.nonGitHubIssueUrl) {
            hide(titleTextArea);
            hide(descriptionTextArea);
            reset(descriptionTitle, localize('handlesIssuesElsewhere', 'This extension handles issues outside of VS Code'));
            reset(descriptionSubtitle, localize('elsewhereDescription', "The '{0}' extension prefers to use an external issue reporter. To be taken to that issue reporting experience, click the button below.", selectedExtension.displayName));
            this.previewButton.label = localize('openIssueReporter', 'Open External Issue Reporter');
            return;
        }
        if (fileOnExtension && selectedExtension?.data) {
            const data = selectedExtension?.data;
            extensionDataTextArea.innerText = data.toString();
            extensionDataTextArea.readOnly = true;
            show(extensionDataBlock);
        }
        // only if we know comes from the open reporter command
        if (fileOnExtension && this.openReporter) {
            ;
            extensionDataTextArea.readOnly = true;
            setTimeout(() => {
                // delay to make sure from command or not
                if (this.openReporter) {
                    show(extensionDataBlock);
                }
            }, 100);
            show(extensionDataBlock);
        }
        if (issueType === 0 /* IssueType.Bug */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(experimentsBlock);
                if (!fileOnExtension) {
                    show(extensionsBlock);
                }
            }
            reset(descriptionTitle, localize('stepsToReproduce', 'Steps to Reproduce') + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('bugDescription', 'Share the steps needed to reliably reproduce the problem. Please include actual and expected results. We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub.'));
        }
        else if (issueType === 1 /* IssueType.PerformanceIssue */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(processBlock);
                show(workspaceBlock);
                show(experimentsBlock);
            }
            if (fileOnExtension) {
                show(extensionSelector);
            }
            else if (!fileOnMarketplace) {
                show(extensionsBlock);
            }
            reset(descriptionTitle, localize('stepsToReproduce', 'Steps to Reproduce') + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('performanceIssueDesciption', 'When did this performance issue happen? Does it occur on startup or after a specific series of actions? We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub.'));
        }
        else if (issueType === 2 /* IssueType.FeatureRequest */) {
            reset(descriptionTitle, localize('description', 'Description') + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('featureRequestDescription', 'Please describe the feature you would like to see. We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub.'));
        }
    }
    validateInput(inputId) {
        const inputElement = this.getElementById(inputId);
        const inputValidationMessage = this.getElementById(`${inputId}-empty-error`);
        const descriptionShortMessage = this.getElementById(`description-short-error`);
        if (inputId === 'description' && this.nonGitHubIssueUrl && this.data.extensionId) {
            return true;
        }
        else if (!inputElement.value) {
            inputElement.classList.add('invalid-input');
            inputValidationMessage?.classList.remove('hidden');
            descriptionShortMessage?.classList.add('hidden');
            return false;
        }
        else if (inputId === 'description' && inputElement.value.length < 10) {
            inputElement.classList.add('invalid-input');
            descriptionShortMessage?.classList.remove('hidden');
            inputValidationMessage?.classList.add('hidden');
            return false;
        }
        else {
            inputElement.classList.remove('invalid-input');
            inputValidationMessage?.classList.add('hidden');
            if (inputId === 'description') {
                descriptionShortMessage?.classList.add('hidden');
            }
            return true;
        }
    }
    validateInputs() {
        let isValid = true;
        ['issue-title', 'description', 'issue-source'].forEach((elementId) => {
            isValid = this.validateInput(elementId) && isValid;
        });
        if (this.issueReporterModel.fileOnExtension()) {
            isValid = this.validateInput('extension-selector') && isValid;
        }
        return isValid;
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        const url = `https://api.github.com/repos/${gitHubDetails.owner}/${gitHubDetails.repositoryName}/issues`;
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.data.githubAccessToken}`,
                'User-Agent': 'request',
            }),
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        mainWindow.open(result.html_url, '_blank');
        this.close();
        return true;
    }
    async createIssue() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        const hasUri = this.nonGitHubIssueUrl;
        // Short circuit if the extension provides a custom issue handler
        if (hasUri) {
            const url = this.getExtensionBugsUrl();
            if (url) {
                this.hasBeenSubmitted = true;
                return true;
            }
        }
        if (!this.validateInputs()) {
            // If inputs are invalid, set focus to the first one and add listeners on them
            // to detect further changes
            const invalidInput = this.window.document.getElementsByClassName('invalid-input');
            if (invalidInput.length) {
                ;
                invalidInput[0].focus();
            }
            this.addEventListener('issue-title', 'input', (_) => {
                this.validateInput('issue-title');
            });
            this.addEventListener('description', 'input', (_) => {
                this.validateInput('description');
            });
            this.addEventListener('issue-source', 'change', (_) => {
                this.validateInput('issue-source');
            });
            if (this.issueReporterModel.fileOnExtension()) {
                this.addEventListener('extension-selector', 'change', (_) => {
                    this.validateInput('extension-selector');
                });
            }
            return false;
        }
        this.hasBeenSubmitted = true;
        const issueTitle = this.getElementById('issue-title').value;
        const issueBody = this.issueReporterModel.serialize();
        let issueUrl = this.getIssueUrl();
        if (!issueUrl) {
            console.error('No issue url found');
            return false;
        }
        if (selectedExtension?.uri) {
            const uri = URI.revive(selectedExtension.uri);
            issueUrl = uri.toString();
        }
        const gitHubDetails = this.parseGitHubUrl(issueUrl);
        if (this.data.githubAccessToken && gitHubDetails) {
            return this.submitToGitHub(issueTitle, issueBody, gitHubDetails);
        }
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        if (url.length > MAX_URL_LENGTH) {
            try {
                url = await this.writeToClipboard(baseUrl, issueBody);
            }
            catch (_) {
                console.error('Writing to clipboard failed');
                return false;
            }
        }
        this.window.open(url, '_blank');
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        return (baseUrl +
            `&body=${encodeURIComponent(localize('pasteData', 'We have written the needed data into your clipboard because it was too large to send. Please paste.'))}`);
    }
    getIssueUrl() {
        return this.issueReporterModel.fileOnExtension()
            ? this.getExtensionGitHubUrl()
            : this.issueReporterModel.getData().fileOnMarketplace
                ? this.product.reportMarketplaceIssueUrl
                : this.product.reportIssueUrl;
    }
    parseGitHubUrl(url) {
        // Assumes a GitHub url to a particular repo, https://github.com/repositoryName/owner.
        // Repository name and owner cannot contain '/'
        const match = /^https?:\/\/github\.com\/([^\/]*)\/([^\/]*).*/.exec(url);
        if (match && match.length) {
            return {
                owner: match[1],
                repositoryName: match[2],
            };
        }
        else {
            console.error('No GitHub issues match');
        }
        return undefined;
    }
    getExtensionGitHubUrl() {
        let repositoryUrl = '';
        const bugsUrl = this.getExtensionBugsUrl();
        const extensionUrl = this.getExtensionRepositoryUrl();
        // If given, try to match the extension's bug url
        if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)\/?(\/issues)?$/)) {
            // matches exactly: https://github.com/owner/repo/issues
            repositoryUrl = normalizeGitHubUrl(bugsUrl);
        }
        else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)$/)) {
            // matches exactly: https://github.com/owner/repo
            repositoryUrl = normalizeGitHubUrl(extensionUrl);
        }
        else {
            this.nonGitHubIssueUrl = true;
            repositoryUrl = bugsUrl || extensionUrl || '';
        }
        return repositoryUrl;
    }
    getIssueUrlWithTitle(issueTitle, repositoryUrl) {
        if (this.issueReporterModel.fileOnExtension()) {
            repositoryUrl = repositoryUrl + '/issues/new';
        }
        const queryStringPrefix = repositoryUrl.indexOf('?') === -1 ? '?' : '&';
        return `${repositoryUrl}${queryStringPrefix}title=${encodeURIComponent(issueTitle)}`;
    }
    clearExtensionData() {
        this.nonGitHubIssueUrl = false;
        this.issueReporterModel.update({ extensionData: undefined });
        this.data.issueBody = this.data.issueBody || '';
        this.data.data = undefined;
        this.data.uri = undefined;
    }
    async updateExtensionStatus(extension) {
        this.issueReporterModel.update({ selectedExtension: extension });
        // uses this.configuuration.data to ensure that data is coming from `openReporter` command.
        const template = this.data.issueBody;
        if (template) {
            const descriptionTextArea = this.getElementById('description');
            const descriptionText = descriptionTextArea.value;
            if (descriptionText === '' || !descriptionText.includes(template.toString())) {
                const fullTextArea = descriptionText + (descriptionText === '' ? '' : '\n') + template.toString();
                descriptionTextArea.value = fullTextArea;
                this.issueReporterModel.update({ issueDescription: fullTextArea });
            }
        }
        const data = this.data.data;
        if (data) {
            this.issueReporterModel.update({ extensionData: data });
            extension.data = data;
            const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
            show(extensionDataBlock);
            this.renderBlocks();
        }
        const uri = this.data.uri;
        if (uri) {
            extension.uri = uri;
            this.updateIssueReporterUri(extension);
        }
        this.validateSelectedExtension();
        const title = this.getElementById('issue-title').value;
        this.searchExtensionIssues(title);
        this.updatePreviewButtonState();
        this.renderBlocks();
    }
    validateSelectedExtension() {
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        hide(extensionValidationMessage);
        hide(extensionValidationNoUrlsMessage);
        const extension = this.issueReporterModel.getData().selectedExtension;
        if (!extension) {
            this.previewButton.enabled = true;
            return;
        }
        if (this.loadingExtensionData) {
            return;
        }
        const hasValidGitHubUrl = this.getExtensionGitHubUrl();
        if (hasValidGitHubUrl) {
            this.previewButton.enabled = true;
        }
        else {
            this.setExtensionValidationMessage();
            this.previewButton.enabled = false;
        }
    }
    setLoading(element) {
        // Show loading
        this.openReporter = true;
        this.loadingExtensionData = true;
        this.updatePreviewButtonState();
        const extensionDataCaption = this.getElementById('extension-id');
        hide(extensionDataCaption);
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach((extensionDataCaption2) => hide(extensionDataCaption2));
        const showLoading = this.getElementById('ext-loading');
        show(showLoading);
        while (showLoading.firstChild) {
            showLoading.firstChild.remove();
        }
        showLoading.append(element);
        this.renderBlocks();
    }
    removeLoading(element, fromReporter = false) {
        this.openReporter = fromReporter;
        this.loadingExtensionData = false;
        this.updatePreviewButtonState();
        const extensionDataCaption = this.getElementById('extension-id');
        show(extensionDataCaption);
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach((extensionDataCaption2) => show(extensionDataCaption2));
        const hideLoading = this.getElementById('ext-loading');
        hide(hideLoading);
        if (hideLoading.firstChild) {
            element.remove();
        }
        this.renderBlocks();
    }
    setExtensionValidationMessage() {
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        const bugsUrl = this.getExtensionBugsUrl();
        if (bugsUrl) {
            show(extensionValidationMessage);
            const link = this.getElementById('extensionBugsLink');
            link.textContent = bugsUrl;
            return;
        }
        const extensionUrl = this.getExtensionRepositoryUrl();
        if (extensionUrl) {
            show(extensionValidationMessage);
            const link = this.getElementById('extensionBugsLink');
            link.textContent = extensionUrl;
            return;
        }
        show(extensionValidationNoUrlsMessage);
    }
    updateProcessInfo(state) {
        const target = this.window.document.querySelector('.block-process .block-info');
        if (target) {
            reset(target, $('code', undefined, state.processInfo ?? ''));
        }
    }
    updateWorkspaceInfo(state) {
        this.window.document.querySelector('.block-workspace .block-info code').textContent =
            '\n' + state.workspaceInfo;
    }
    updateExtensionTable(extensions, numThemeExtensions) {
        const target = this.window.document.querySelector('.block-extensions .block-info');
        if (target) {
            if (this.disableExtensions) {
                reset(target, localize('disabledExtensions', 'Extensions are disabled'));
                return;
            }
            const themeExclusionStr = numThemeExtensions
                ? `\n(${numThemeExtensions} theme extensions excluded)`
                : '';
            extensions = extensions || [];
            if (!extensions.length) {
                target.innerText = 'Extensions: none' + themeExclusionStr;
                return;
            }
            reset(target, this.getExtensionTableHtml(extensions), document.createTextNode(themeExclusionStr));
        }
    }
    getExtensionTableHtml(extensions) {
        return $('table', undefined, $('tr', undefined, $('th', undefined, 'Extension'), $('th', undefined, 'Author (truncated)'), $('th', undefined, 'Version')), ...extensions.map((extension) => $('tr', undefined, $('td', undefined, extension.name), $('td', undefined, extension.publisher?.substr(0, 3) ?? 'N/A'), $('td', undefined, extension.version))));
    }
    openLink(event) {
        event.preventDefault();
        event.stopPropagation();
        // Exclude right click
        if (event.which < 3) {
            windowOpenNoOpener(event.target.href);
        }
    }
    getElementById(elementId) {
        const element = this.window.document.getElementById(elementId);
        if (element) {
            return element;
        }
        else {
            return undefined;
        }
    }
    addEventListener(elementId, eventType, handler) {
        const element = this.getElementById(elementId);
        element?.addEventListener(eventType, handler);
    }
};
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchGitHub", null);
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchDuplicates", null);
BaseIssueReporterService = __decorate([
    __param(6, IIssueFormService),
    __param(7, IThemeService),
    __param(8, IFileService),
    __param(9, IFileDialogService)
], BaseIssueReporterService);
export { BaseIssueReporterService };
// helper functions
export function hide(el) {
    el?.classList.add('hidden');
}
export function show(el) {
    el?.classList.remove('hidden');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUlzc3VlUmVwb3J0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9iYXNlSXNzdWVSZXBvcnRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUNOLENBQUMsRUFDRCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLEtBQUssRUFDTCxrQkFBa0IsR0FDbEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFX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