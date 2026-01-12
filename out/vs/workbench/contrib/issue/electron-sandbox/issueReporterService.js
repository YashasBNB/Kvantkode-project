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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLXNhbmRib3gvaXNzdWVSZXBvcnRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3REFBd0Qs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