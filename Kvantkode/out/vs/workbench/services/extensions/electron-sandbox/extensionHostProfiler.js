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
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { IExtensionService, } from '../common/extensions.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IV8InspectProfilingService, } from '../../../../platform/profiling/common/profiling.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
let ExtensionHostProfiler = class ExtensionHostProfiler {
    constructor(_host, _port, _extensionService, _profilingService) {
        this._host = _host;
        this._port = _port;
        this._extensionService = _extensionService;
        this._profilingService = _profilingService;
    }
    async start() {
        const id = await this._profilingService.startProfiling({ host: this._host, port: this._port });
        return {
            stop: createSingleCallFunction(async () => {
                const profile = await this._profilingService.stopProfiling(id);
                await this._extensionService.whenInstalledExtensionsRegistered();
                const extensions = this._extensionService.extensions;
                return this._distill(profile, extensions);
            }),
        };
    }
    _distill(profile, extensions) {
        const searchTree = TernarySearchTree.forUris();
        for (const extension of extensions) {
            if (extension.extensionLocation.scheme === Schemas.file) {
                searchTree.set(URI.file(extension.extensionLocation.fsPath), extension);
            }
        }
        const nodes = profile.nodes;
        const idsToNodes = new Map();
        const idsToSegmentId = new Map();
        for (const node of nodes) {
            idsToNodes.set(node.id, node);
        }
        function visit(node, segmentId) {
            if (!segmentId) {
                switch (node.callFrame.functionName) {
                    case '(root)':
                        break;
                    case '(program)':
                        segmentId = 'program';
                        break;
                    case '(garbage collector)':
                        segmentId = 'gc';
                        break;
                    default:
                        segmentId = 'self';
                        break;
                }
            }
            else if (segmentId === 'self' && node.callFrame.url) {
                let extension;
                try {
                    extension = searchTree.findSubstr(URI.parse(node.callFrame.url));
                }
                catch {
                    // ignore
                }
                if (extension) {
                    segmentId = extension.identifier.value;
                }
            }
            idsToSegmentId.set(node.id, segmentId);
            if (node.children) {
                for (const child of node.children) {
                    const childNode = idsToNodes.get(child);
                    if (childNode) {
                        visit(childNode, segmentId);
                    }
                }
            }
        }
        visit(nodes[0], null);
        const samples = profile.samples || [];
        const timeDeltas = profile.timeDeltas || [];
        const distilledDeltas = [];
        const distilledIds = [];
        let currSegmentTime = 0;
        let currSegmentId;
        for (let i = 0; i < samples.length; i++) {
            const id = samples[i];
            const segmentId = idsToSegmentId.get(id);
            if (segmentId !== currSegmentId) {
                if (currSegmentId) {
                    distilledIds.push(currSegmentId);
                    distilledDeltas.push(currSegmentTime);
                }
                currSegmentId = segmentId ?? undefined;
                currSegmentTime = 0;
            }
            currSegmentTime += timeDeltas[i];
        }
        if (currSegmentId) {
            distilledIds.push(currSegmentId);
            distilledDeltas.push(currSegmentTime);
        }
        return {
            startTime: profile.startTime,
            endTime: profile.endTime,
            deltas: distilledDeltas,
            ids: distilledIds,
            data: profile,
            getAggregatedTimes: () => {
                const segmentsToTime = new Map();
                for (let i = 0; i < distilledIds.length; i++) {
                    const id = distilledIds[i];
                    segmentsToTime.set(id, (segmentsToTime.get(id) || 0) + distilledDeltas[i]);
                }
                return segmentsToTime;
            },
        };
    }
};
ExtensionHostProfiler = __decorate([
    __param(2, IExtensionService),
    __param(3, IV8InspectProfilingService)
], ExtensionHostProfiler);
export { ExtensionHostProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbkhvc3RQcm9maWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRixPQUFPLEVBRU4saUJBQWlCLEdBR2pCLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sMEJBQTBCLEdBRzFCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFDakMsWUFDa0IsS0FBYSxFQUNiLEtBQWEsRUFDTSxpQkFBb0MsRUFDM0IsaUJBQTZDO1FBSHpFLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ00sc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQTRCO0lBQ3hGLENBQUM7SUFFRyxLQUFLLENBQUMsS0FBSztRQUNqQixNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFOUYsT0FBTztZQUNOLElB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