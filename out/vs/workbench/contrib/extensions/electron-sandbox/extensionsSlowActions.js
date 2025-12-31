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
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IRequestService, asText } from '../../../../platform/request/common/request.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { Utils } from '../../../../platform/profiling/common/profiling.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
class RepoInfo {
    static fromExtension(desc) {
        let result;
        // scheme:auth/OWNER/REPO/issues/
        if (desc.bugs && typeof desc.bugs.url === 'string') {
            const base = URI.parse(desc.bugs.url);
            const match = /\/([^/]+)\/([^/]+)\/issues\/?$/.exec(desc.bugs.url);
            if (match) {
                result = {
                    base: base.with({ path: null, fragment: null, query: null }).toString(true),
                    owner: match[1],
                    repo: match[2],
                };
            }
        }
        // scheme:auth/OWNER/REPO.git
        if (!result && desc.repository && typeof desc.repository.url === 'string') {
            const base = URI.parse(desc.repository.url);
            const match = /\/([^/]+)\/([^/]+)(\.git)?$/.exec(desc.repository.url);
            if (match) {
                result = {
                    base: base.with({ path: null, fragment: null, query: null }).toString(true),
                    owner: match[1],
                    repo: match[2],
                };
            }
        }
        // for now only GH is supported
        if (result && result.base.indexOf('github') === -1) {
            result = undefined;
        }
        return result;
    }
}
let SlowExtensionAction = class SlowExtensionAction extends Action {
    constructor(extension, profile, _instantiationService) {
        super('report.slow', localize('cmd.reportOrShow', 'Performance Issue'), 'extension-action report-issue');
        this.extension = extension;
        this.profile = profile;
        this._instantiationService = _instantiationService;
        this.enabled = Boolean(RepoInfo.fromExtension(extension));
    }
    async run() {
        const action = await this._instantiationService.invokeFunction(createSlowExtensionAction, this.extension, this.profile);
        if (action) {
            await action.run();
        }
    }
};
SlowExtensionAction = __decorate([
    __param(2, IInstantiationService)
], SlowExtensionAction);
export { SlowExtensionAction };
export async function createSlowExtensionAction(accessor, extension, profile) {
    const info = RepoInfo.fromExtension(extension);
    if (!info) {
        return undefined;
    }
    const requestService = accessor.get(IRequestService);
    const instaService = accessor.get(IInstantiationService);
    const url = `https://api.github.com/search/issues?q=is:issue+state:open+in:title+repo:${info.owner}/${info.repo}+%22Extension+causes+high+cpu+load%22`;
    let res;
    try {
        res = await requestService.request({ url }, CancellationToken.None);
    }
    catch {
        return undefined;
    }
    const rawText = await asText(res);
    if (!rawText) {
        return undefined;
    }
    const data = JSON.parse(rawText);
    if (!data || typeof data.total_count !== 'number') {
        return undefined;
    }
    else if (data.total_count === 0) {
        return instaService.createInstance(ReportExtensionSlowAction, extension, info, profile);
    }
    else {
        return instaService.createInstance(ShowExtensionSlowAction, extension, info, profile);
    }
}
let ReportExtensionSlowAction = class ReportExtensionSlowAction extends Action {
    constructor(extension, repoInfo, profile, _dialogService, _openerService, _productService, _nativeHostService, _environmentService, _fileService) {
        super('report.slow', localize('cmd.report', 'Report Issue'));
        this.extension = extension;
        this.repoInfo = repoInfo;
        this.profile = profile;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._productService = _productService;
        this._nativeHostService = _nativeHostService;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
    }
    async run() {
        // rewrite pii (paths) and store on disk
        const data = Utils.rewriteAbsolutePaths(this.profile.data, 'pii_removed');
        const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(data, undefined, 4)));
        // build issue
        const os = await this._nativeHostService.getOSProperties();
        const title = encodeURIComponent('Extension causes high cpu load');
        const osVersion = `${os.type} ${os.arch} ${os.release}`;
        const message = `:warning: Make sure to **attach** this file from your *home*-directory:\n:warning:\`${path}\`\n\nFind more details here: https://github.com/microsoft/vscode/wiki/Explain-extension-causes-high-cpu-load`;
        const body = encodeURIComponent(`- Issue Type: \`Performance\`
- Extension Name: \`${this.extension.name}\`
- Extension Version: \`${this.extension.version}\`
- OS Version: \`${osVersion}\`
- VS Code version: \`${this._productService.version}\`\n\n${message}`);
        const url = `${this.repoInfo.base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues/new/?body=${body}&title=${title}`;
        this._openerService.open(URI.parse(url));
        this._dialogService.info(localize('attach.title', 'Did you attach the CPU-Profile?'), localize('attach.msg', "This is a reminder to make sure that you have not forgotten to attach '{0}' to the issue you have just created.", path.fsPath));
    }
};
ReportExtensionSlowAction = __decorate([
    __param(3, IDialogService),
    __param(4, IOpenerService),
    __param(5, IProductService),
    __param(6, INativeHostService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IFileService)
], ReportExtensionSlowAction);
let ShowExtensionSlowAction = class ShowExtensionSlowAction extends Action {
    constructor(extension, repoInfo, profile, _dialogService, _openerService, _environmentService, _fileService) {
        super('show.slow', localize('cmd.show', 'Show Issues'));
        this.extension = extension;
        this.repoInfo = repoInfo;
        this.profile = profile;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
    }
    async run() {
        // rewrite pii (paths) and store on disk
        const data = Utils.rewriteAbsolutePaths(this.profile.data, 'pii_removed');
        const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(data, undefined, 4)));
        // show issues
        const url = `${this.repoInfo.base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues?utf8=✓&q=is%3Aissue+state%3Aopen+%22Extension+causes+high+cpu+load%22`;
        this._openerService.open(URI.parse(url));
        this._dialogService.info(localize('attach.title', 'Did you attach the CPU-Profile?'), localize('attach.msg2', "This is a reminder to make sure that you have not forgotten to attach '{0}' to an existing performance issue.", path.fsPath));
    }
};
ShowExtensionSlowAction = __decorate([
    __param(3, IDialogService),
    __param(4, IOpenerService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IFileService)
], ShowExtensionSlowAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Nsb3dBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNTbG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1D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