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
var WorkspaceTags_1;
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITelemetryService, } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IWorkspaceTagsService, getHashedRemotesFromConfig as baseGetHashedRemotesFromConfig, } from '../common/workspaceTags.js';
import { IDiagnosticsService, } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { isWindows } from '../../../../base/common/platform.js';
import { AllowedSecondLevelDomains, getDomainsOfRemotes, } from '../../../../platform/extensionManagement/common/configRemotes.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { hashAsync } from '../../../../base/common/hash.js';
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false) {
    return baseGetHashedRemotesFromConfig(text, stripEndingDotGit, hashAsync);
}
let WorkspaceTags = WorkspaceTags_1 = class WorkspaceTags {
    constructor(fileService, contextService, telemetryService, requestService, textFileService, workspaceTagsService, diagnosticsService, productService, nativeHostService) {
        this.fileService = fileService;
        this.contextService = contextService;
        this.telemetryService = telemetryService;
        this.requestService = requestService;
        this.textFileService = textFileService;
        this.workspaceTagsService = workspaceTagsService;
        this.diagnosticsService = diagnosticsService;
        this.productService = productService;
        this.nativeHostService = nativeHostService;
        if (this.telemetryService.telemetryLevel === 3 /* TelemetryLevel.USAGE */) {
            this.report();
        }
    }
    async report() {
        // Windows-only Edition Event
        this.reportWindowsEdition();
        // Workspace Tags
        this.workspaceTagsService.getTags().then((tags) => this.reportWorkspaceTags(tags), (error) => onUnexpectedError(error));
        // Cloud Stats
        this.reportCloudStats();
        this.reportProxyStats();
        this.getWorkspaceInformation().then((stats) => this.diagnosticsService.reportWorkspaceStats(stats));
    }
    async reportWindowsEdition() {
        if (!isWindows) {
            return;
        }
        let value = await this.nativeHostService.windowsGetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
        if (value === undefined) {
            value = 'Unknown';
        }
        this.telemetryService.publicLog2('windowsEdition', { edition: value });
    }
    async getWorkspaceInformation() {
        const workspace = this.contextService.getWorkspace();
        const state = this.contextService.getWorkbenchState();
        const telemetryId = await this.workspaceTagsService.getTelemetryWorkspaceId(workspace, state);
        return {
            id: workspace.id,
            telemetryId,
            rendererSessionId: this.telemetryService.sessionId,
            folders: workspace.folders,
            transient: workspace.transient,
            configuration: workspace.configuration,
        };
    }
    reportWorkspaceTags(tags) {
        /* __GDPR__
            "workspce.tags" : {
                "owner": "lramos15",
                "${include}": [
                    "${WorkspaceTags}"
                ]
            }
        */
        this.telemetryService.publicLog('workspce.tags', tags);
    }
    reportRemoteDomains(workspaceUris) {
        Promise.all(workspaceUris.map((workspaceUri) => {
            const path = workspaceUri.path;
            const uri = workspaceUri.with({ path: `${path !== '/' ? path : ''}/.git/config` });
            return this.fileService.exists(uri).then((exists) => {
                if (!exists) {
                    return [];
                }
                return this.textFileService.read(uri, { acceptTextOnly: true }).then((content) => getDomainsOfRemotes(content.value, AllowedSecondLevelDomains), (err) => []);
            });
        })).then((domains) => {
            const set = domains.reduce((set, list) => list.reduce((set, item) => set.add(item), set), new Set());
            const list = [];
            set.forEach((item) => list.push(item));
            /* __GDPR__
                "workspace.remotes" : {
                    "owner": "lramos15",
                    "domains" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryService.publicLog('workspace.remotes', { domains: list.sort() });
        }, onUnexpectedError);
    }
    reportRemotes(workspaceUris) {
        Promise.all(workspaceUris.map((workspaceUri) => {
            return this.workspaceTagsService.getHashedRemotesFromUri(workspaceUri, true);
        })).then(() => { }, onUnexpectedError);
    }
    /* __GDPR__FRAGMENT__
        "AzureTags" : {
            "node" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
    reportAzureNode(workspaceUris, tags) {
        // TODO: should also work for `node_modules` folders several levels down
        const uris = workspaceUris.map((workspaceUri) => {
            const path = workspaceUri.path;
            return workspaceUri.with({ path: `${path !== '/' ? path : ''}/node_modules` });
        });
        return this.fileService.resolveAll(uris.map((resource) => ({ resource }))).then((results) => {
            const names = []
                .concat(...results.map((result) => (result.success ? result.stat.children || [] : [])))
                .map((c) => c.name);
            const referencesAzure = WorkspaceTags_1.searchArray(names, /azure/i);
            if (referencesAzure) {
                tags['node'] = true;
            }
            return tags;
        }, (err) => {
            return tags;
        });
    }
    static searchArray(arr, regEx) {
        return arr.some((v) => v.search(regEx) > -1) || undefined;
    }
    /* __GDPR__FRAGMENT__
        "AzureTags" : {
            "java" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
    reportAzureJava(workspaceUris, tags) {
        return Promise.all(workspaceUris.map((workspaceUri) => {
            const path = workspaceUri.path;
            const uri = workspaceUri.with({ path: `${path !== '/' ? path : ''}/pom.xml` });
            return this.fileService.exists(uri).then((exists) => {
                if (!exists) {
                    return false;
                }
                return this.textFileService.read(uri, { acceptTextOnly: true }).then((content) => !!content.value.match(/azure/i), (err) => false);
            });
        })).then((javas) => {
            if (javas.indexOf(true) !== -1) {
                tags['java'] = true;
            }
            return tags;
        });
    }
    reportAzure(uris) {
        const tags = Object.create(null);
        this.reportAzureNode(uris, tags)
            .then((tags) => {
            return this.reportAzureJava(uris, tags);
        })
            .then((tags) => {
            if (Object.keys(tags).length) {
                /* __GDPR__
                "workspace.azure" : {
                    "owner": "lramos15",
                    "${include}": [
                        "${AzureTags}"
                    ]
                }
            */
                this.telemetryService.publicLog('workspace.azure', tags);
            }
        })
            .then(undefined, onUnexpectedError);
    }
    reportCloudStats() {
        const uris = this.contextService.getWorkspace().folders.map((folder) => folder.uri);
        if (uris.length && this.fileService) {
            this.reportRemoteDomains(uris);
            this.reportRemotes(uris);
            this.reportAzure(uris);
        }
    }
    reportProxyStats() {
        const downloadUrl = this.productService.downloadUrl;
        if (!downloadUrl) {
            return;
        }
        this.requestService
            .resolveProxy(downloadUrl)
            .then((proxy) => {
            let type = proxy ? String(proxy).trim().split(/\s+/, 1)[0] : 'EMPTY';
            if (['DIRECT', 'PROXY', 'HTTPS', 'SOCKS', 'EMPTY'].indexOf(type) === -1) {
                type = 'UNKNOWN';
            }
        })
            .then(undefined, onUnexpectedError);
    }
};
WorkspaceTags = WorkspaceTags_1 = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, ITelemetryService),
    __param(3, IRequestService),
    __param(4, ITextFileService),
    __param(5, IWorkspaceTagsService),
    __param(6, IDiagnosticsService),
    __param(7, IProductService),
    __param(8, INativeHostService)
], WorkspaceTags);
export { WorkspaceTags };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RhZ3MvZWxlY3Ryb24tc2FuZGJveC93b3Jrc3BhY2VUYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixxQkFBcUIsRUFFckIsMEJBQTBCLElBQUksOEJBQThCLEdBQzVELE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixtQkFBbUIsR0FDbkIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTNELE1BQU0sQ0FBQyxLQUFLLFVBQVUsMEJBQTBCLENBQy9DLElBQVksRUFDWixvQkFBNkIsS0FBSztJ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