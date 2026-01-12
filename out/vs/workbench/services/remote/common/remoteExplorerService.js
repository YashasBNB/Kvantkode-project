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
import * as nls from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITunnelService, } from '../../../../platform/tunnel/common/tunnel.js';
import { TunnelModel, } from './tunnelModel.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
export const IRemoteExplorerService = createDecorator('remoteExplorerService');
export const REMOTE_EXPLORER_TYPE_KEY = 'remote.explorerType';
export const TUNNEL_VIEW_ID = '~remote.forwardedPorts';
export const TUNNEL_VIEW_CONTAINER_ID = '~remote.forwardedPortsContainer';
export const PORT_AUTO_FORWARD_SETTING = 'remote.autoForwardPorts';
export const PORT_AUTO_SOURCE_SETTING = 'remote.autoForwardPortsSource';
export const PORT_AUTO_FALLBACK_SETTING = 'remote.autoForwardPortsFallback';
export const PORT_AUTO_SOURCE_SETTING_PROCESS = 'process';
export const PORT_AUTO_SOURCE_SETTING_OUTPUT = 'output';
export const PORT_AUTO_SOURCE_SETTING_HYBRID = 'hybrid';
export var TunnelType;
(function (TunnelType) {
    TunnelType["Candidate"] = "Candidate";
    TunnelType["Detected"] = "Detected";
    TunnelType["Forwarded"] = "Forwarded";
    TunnelType["Add"] = "Add";
})(TunnelType || (TunnelType = {}));
export var TunnelEditId;
(function (TunnelEditId) {
    TunnelEditId[TunnelEditId["None"] = 0] = "None";
    TunnelEditId[TunnelEditId["New"] = 1] = "New";
    TunnelEditId[TunnelEditId["Label"] = 2] = "Label";
    TunnelEditId[TunnelEditId["LocalPort"] = 3] = "LocalPort";
})(TunnelEditId || (TunnelEditId = {}));
const getStartedWalkthrough = {
    type: 'object',
    required: ['id'],
    properties: {
        id: {
            description: nls.localize('getStartedWalkthrough.id', 'The ID of a Get Started walkthrough to open.'),
            type: 'string',
        },
    },
};
const remoteHelpExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'remoteHelp',
    jsonSchema: {
        description: nls.localize('RemoteHelpInformationExtPoint', 'Contributes help information for Remote'),
        type: 'object',
        properties: {
            getStarted: {
                description: nls.localize('RemoteHelpInformationExtPoint.getStarted', "The url, or a command that returns the url, to your project's Getting Started page, or a walkthrough ID contributed by your project's extension"),
                oneOf: [{ type: 'string' }, getStartedWalkthrough],
            },
            documentation: {
                description: nls.localize('RemoteHelpInformationExtPoint.documentation', "The url, or a command that returns the url, to your project's documentation page"),
                type: 'string',
            },
            feedback: {
                description: nls.localize('RemoteHelpInformationExtPoint.feedback', "The url, or a command that returns the url, to your project's feedback reporter"),
                type: 'string',
                markdownDeprecationMessage: nls.localize('RemoteHelpInformationExtPoint.feedback.deprecated', 'Use {0} instead', '`reportIssue`'),
            },
            reportIssue: {
                description: nls.localize('RemoteHelpInformationExtPoint.reportIssue', "The url, or a command that returns the url, to your project's issue reporter"),
                type: 'string',
            },
            issues: {
                description: nls.localize('RemoteHelpInformationExtPoint.issues', "The url, or a command that returns the url, to your project's issues list"),
                type: 'string',
            },
        },
    },
});
export var PortsEnablement;
(function (PortsEnablement) {
    PortsEnablement[PortsEnablement["Disabled"] = 0] = "Disabled";
    PortsEnablement[PortsEnablement["ViewOnly"] = 1] = "ViewOnly";
    PortsEnablement[PortsEnablement["AdditionalFeatures"] = 2] = "AdditionalFeatures";
})(PortsEnablement || (PortsEnablement = {}));
let RemoteExplorerService = class RemoteExplorerService {
    constructor(storageService, tunnelService, instantiationService) {
        this.storageService = storageService;
        this.tunnelService = tunnelService;
        this._targetType = [];
        this._onDidChangeTargetType = new Emitter();
        this.onDidChangeTargetType = this._onDidChangeTargetType.event;
        this._onDidChangeHelpInformation = new Emitter();
        this.onDidChangeHelpInformation = this._onDidChangeHelpInformation.event;
        this._helpInformation = [];
        this._onDidChangeEditable = new Emitter();
        this.onDidChangeEditable = this._onDidChangeEditable.event;
        this._onEnabledPortsFeatures = new Emitter();
        this.onEnabledPortsFeatures = this._onEnabledPortsFeatures.event;
        this._portsFeaturesEnabled = PortsEnablement.Disabled;
        this.namedProcesses = new Map();
        this._tunnelModel = instantiationService.createInstance(TunnelModel);
        remoteHelpExtPoint.setHandler((extensions) => {
            this._helpInformation.push(...extensions);
            this._onDidChangeHelpInformation.fire(extensions);
        });
    }
    get helpInformation() {
        return this._helpInformation;
    }
    set targetType(name) {
        // Can just compare the first element of the array since there are no target overlaps
        const current = this._targetType.length > 0 ? this._targetType[0] : '';
        const newName = name.length > 0 ? name[0] : '';
        if (current !== newName) {
            this._targetType = name;
            this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this._onDidChangeTargetType.fire(this._targetType);
        }
    }
    get targetType() {
        return this._targetType;
    }
    get tunnelModel() {
        return this._tunnelModel;
    }
    forward(tunnelProperties, attributes) {
        return this.tunnelModel.forward(tunnelProperties, attributes);
    }
    close(remote, reason) {
        return this.tunnelModel.close(remote.host, remote.port, reason);
    }
    setTunnelInformation(tunnelInformation) {
        if (tunnelInformation?.features) {
            this.tunnelService.setTunnelFeatures(tunnelInformation.features);
        }
        this.tunnelModel.addEnvironmentTunnels(tunnelInformation?.environmentTunnels);
    }
    setEditable(tunnelItem, editId, data) {
        if (!data) {
            this._editable = undefined;
        }
        else {
            this._editable = { tunnelItem, data, editId };
        }
        this._onDidChangeEditable.fire(tunnelItem ? { tunnel: tunnelItem, editId } : undefined);
    }
    getEditableData(tunnelItem, editId) {
        return this._editable &&
            ((!tunnelItem && tunnelItem === this._editable.tunnelItem) ||
                (tunnelItem &&
                    this._editable.tunnelItem?.remotePort === tunnelItem.remotePort &&
                    this._editable.tunnelItem.remoteHost === tunnelItem.remoteHost &&
                    this._editable.editId === editId))
            ? this._editable.data
            : undefined;
    }
    setCandidateFilter(filter) {
        if (!filter) {
            return {
                dispose: () => { },
            };
        }
        this.tunnelModel.setCandidateFilter(filter);
        return {
            dispose: () => {
                this.tunnelModel.setCandidateFilter(undefined);
            },
        };
    }
    onFoundNewCandidates(candidates) {
        this.tunnelModel.setCandidates(candidates);
    }
    restore() {
        return this.tunnelModel.restoreForwarded();
    }
    enablePortsFeatures(viewOnly) {
        this._portsFeaturesEnabled = viewOnly
            ? PortsEnablement.ViewOnly
            : PortsEnablement.AdditionalFeatures;
        this._onEnabledPortsFeatures.fire();
    }
    get portsFeaturesEnabled() {
        return this._portsFeaturesEnabled;
    }
};
RemoteExplorerService = __decorate([
    __param(0, IStorageService),
    __param(1, ITunnelService),
    __param(2, IInstantiationService)
], RemoteExplorerService);
registerSingleton(IRemoteExplorerService, RemoteExplorerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9yZW1vdGVFeHBsb3JlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixlQUFlLEdBQ2YsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixjQUFjLEdBR2QsTUFBTSw4Q0FBOEMsQ0FBQTtBQVFyRCxPQUFPLEVBSU4sV0FBVyxHQUdYLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLCtDQUErQyxDQUFBO0FBSXRELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQVcscUJBQXFCLENBQUE7QUFDckUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFBO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGlDQUFpQyxDQUFBO0FBQ3pFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHlCQUF5QixDQUFBO0FBQ2xFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLCtCQUErQixDQUFBO0FBQ3ZFLE1BQU0sQ0FBQyxNQUFNLDBC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