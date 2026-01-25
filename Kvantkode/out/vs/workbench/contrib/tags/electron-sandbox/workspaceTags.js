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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFncy9lbGVjdHJvbi1zYW5kYm94L3dvcmtzcGFjZVRhZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUNOLHFCQUFxQixFQUVyQiwwQkFBMEIsSUFBSSw4QkFBOEIsR0FDNUQsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLG1CQUFtQixHQUNuQixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFM0QsTUFBTSxDQUFDLEtBQUssVUFBVSwwQkFBMEIsQ0FDL0MsSUFBWSxFQUNaLG9CQUE2QixL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