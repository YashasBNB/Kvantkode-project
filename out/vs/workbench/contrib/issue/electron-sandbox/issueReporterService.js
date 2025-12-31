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
import { $, reset } from '../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { isRemoteDiagnosticError } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProcessMainService } from '../../../../platform/process/common/process.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { applyZoom } from '../../../../platform/window/electron-sandbox/window.js';
import { BaseIssueReporterService } from '../browser/baseIssueReporterService.js';
import { IIssueFormService } from '../common/issue.js';
// GitHub has let us know that we could up our limit here to 8k. We chose 7500 to play it safe.
// ref https://github.com/microsoft/vscode/issues/159191
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. We chose 65500 to play it safe.
// ref https://github.com/github/issues/issues/12858
const MAX_GITHUB_API_LENGTH = 65500;
let IssueReporter = class IssueReporter extends BaseIssueReporterService {
    constructor(disableExtensions, data, os, product, window, nativeHostService, issueFormService, processMainService, themeService, fileService, fileDialogService, updateService) {
        super(disableExtensions, data, os, product, window, false, issueFormService, themeService, fileService, fileDialogService);
        this.nativeHostService = nativeHostService;
        this.updateService = updateService;
        this.processMainService = processMainService;
        this.processMainService.$getSystemInfo().then((info) => {
            this.issueReporterModel.update({ systemInfo: info });
            this.receivedSystemInfo = true;
            this.updateSystemInfo(this.issueReporterModel.getData());
            this.updatePreviewButtonState();
        });
        if (this.data.issueType === 1 /* IssueType.PerformanceIssue */) {
            this.processMainService.$getPerformanceInfo().then((info) => {
                this.updatePerformanceInfo(info);
            });
        }
        this.checkForUpdates();
        this.setEventHandlers();
        applyZoom(this.data.zoomLevel, this.window);
        this.updateExperimentsInfo(this.data.experiments);
        this.updateRestrictedMode(this.data.restrictedMode);
        this.updateUnsupportedMode(this.data.isUnsupported);
    }
    async checkForUpdates() {
        const updateState = this.updateService.state;
        if (updateState.type === "ready" /* StateType.Ready */ || updateState.type === "downloaded" /* StateType.Downloaded */) {
            this.needsUpdate = true;
            const includeAcknowledgement = this.getElementById('version-acknowledgements');
            const updateBanner = this.getElementById('update-banner');
            if (updateBanner && includeAcknowledgement) {
                includeAcknowledgement.classList.remove('hidden');
                updateBanner.classList.remove('hidden');
                updateBanner.textContent = localize('updateAvailable', 'A new version of {0} is available.', this.product.nameLong);
            }
        }
    }
    setEventHandlers() {
        super.setEventHandlers();
        this.addEventListener('issue-type', 'change', (event) => {
            const issueType = parseInt(event.target.value);
            this.issueReporterModel.update({ issueType: issueType });
            if (issueType === 1 /* IssueType.PerformanceIssue */ && !this.receivedPerformanceInfo) {
                this.processMainService.$getPerformanceInfo().then((info) => {
                    this.updatePerformanceInfo(info);
                });
            }
            // Resets placeholder
            const descriptionTextArea = this.getElementById('issue-title');
            if (descriptionTextArea) {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', 'Please enter a title');
            }
            this.updatePreviewButtonState();
            this.setSourceOptions();
            this.render();
        });
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        if (issueBody.length > MAX_GITHUB_API_LENGTH) {
            const extensionData = this.issueReporterModel.getData().extensionData;
            if (extensionData) {
                issueBody = issueBody.replace(extensionData, '');
                const date = new Date();
                const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
                const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
                const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
                try {
                    const downloadPath = await this.fileDialogService.showSaveDialog({
                        title: localize('saveExtensionData', 'Save Extension Data'),
                        availableFileSystems: [Schemas.file],
                        defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                    });
                    if (downloadPath) {
                        await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                    }
                }
                catch (e) {
                    console.error('Writing extension data to file failed');
                    return false;
                }
            }
            else {
                console.error('Issue body too large to submit to GitHub');
                return false;
            }
        }
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
            }),
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        await this.nativeHostService.openExternal(result.html_url);
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
                await this.nativeHostService.openExternal(url);
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
                    this.validateInput('description');
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
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        if (this.data.githubAccessToken && gitHubDetails) {
            if (await this.submitToGitHub(issueTitle, issueBody, gitHubDetails)) {
                return true;
            }
        }
        try {
            if (url.length > MAX_URL_LENGTH || issueBody.length > MAX_GITHUB_API_LENGTH) {
                url = await this.writeToClipboard(baseUrl, issueBody);
            }
        }
        catch (_) {
            console.error('Writing to clipboard failed');
            return false;
        }
        await this.nativeHostService.openExternal(url);
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        await this.nativeHostService.writeClipboardText(issueBody);
        return (baseUrl +
            `&body=${encodeURIComponent(localize('pasteData', 'We have written the needed data into your clipboard because it was too large to send. Please paste.'))}`);
    }
    updateSystemInfo(state) {
        const target = this.window.document.querySelector('.block-system .block-info');
        if (target) {
            const systemInfo = state.systemInfo;
            const renderedDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, systemInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'GPU Status'), $('td', undefined, Object.keys(systemInfo.gpuStatus)
                .map((key) => `${key}: ${systemInfo.gpuStatus[key]}`)
                .join('\n'))), $('tr', undefined, $('td', undefined, 'Load (avg)'), $('td', undefined, systemInfo.load || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, systemInfo.memory)), $('tr', undefined, $('td', undefined, 'Process Argv'), $('td', undefined, systemInfo.processArgs)), $('tr', undefined, $('td', undefined, 'Screen Reader'), $('td', undefined, systemInfo.screenReader)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, systemInfo.vmHint)));
            reset(target, renderedDataTable);
            systemInfo.remoteData.forEach((remote) => {
                target.appendChild($('hr'));
                if (isRemoteDiagnosticError(remote)) {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.hostName)), $('tr', undefined, $('td', undefined, ''), $('td', undefined, remote.errorMessage)));
                    target.appendChild(remoteDataTable);
                }
                else {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.latency
                        ? `${remote.hostName} (latency: ${remote.latency.current.toFixed(2)}ms last, ${remote.latency.average.toFixed(2)}ms average)`
                        : remote.hostName)), $('tr', undefined, $('td', undefined, 'OS'), $('td', undefined, remote.machineInfo.os)), $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, remote.machineInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, remote.machineInfo.memory)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, remote.machineInfo.vmHint)));
                    target.appendChild(remoteDataTable);
                }
            });
        }
    }
    updateRestrictedMode(restrictedMode) {
        this.issueReporterModel.update({ restrictedMode });
    }
    updateUnsupportedMode(isUnsupported) {
        this.issueReporterModel.update({ isUnsupported });
    }
    updateExperimentsInfo(experimentInfo) {
        this.issueReporterModel.update({ experimentInfo });
        const target = this.window.document.querySelector('.block-experiments .block-info');
        if (target) {
            target.textContent = experimentInfo
                ? experimentInfo
                : localize('noCurrentExperiments', 'No current experiments.');
        }
    }
};
IssueReporter = __decorate([
    __param(5, INativeHostService),
    __param(6, IIssueFormService),
    __param(7, IProcessMainService),
    __param(8, IThemeService),
    __param(9, IFileService),
    __param(10, IFileDialogService),
    __param(11, IUpdateService)
], IssueReporter);
export { IssueReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9lbGVjdHJvbi1zYW5kYm94L2lzc3VlUmVwb3J0ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUE7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