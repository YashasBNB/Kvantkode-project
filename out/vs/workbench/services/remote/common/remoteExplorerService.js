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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vcmVtb3RlRXhwbG9yZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZUFBZSxHQUNmLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sY0FBYyxHQUdkLE1BQU0sOENBQThDLENBQUE7QUFRckQsT0FBTyxFQUlOLFdBQVcsR0FHWCxNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUl0RCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBQ2pFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFXLHFCQUFxQixDQUFBO0FBQ3JFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQTtBQUN0RCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxpQ0FBaUMsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyx5QkFBeUIsQ0FBQTtBQUNsRSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRywrQkFBK0IsQ0FBQTtBQUN2RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIs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