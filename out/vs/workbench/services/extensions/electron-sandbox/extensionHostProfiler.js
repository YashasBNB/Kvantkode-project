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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25Ib3N0UHJvZmlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUVOLGlCQUFpQixHQUdqQixNQUFNLHlCQUF5QixDQUFBO0FBRWhDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLDBCQUEwQixHQUcxQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXpFLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBQ2pDLFlBQ2tCLEtBQWEsRUFDYixLQUFhLEVBQ00saUJBQW9DLEVBQzNCLGlCQUE2QztRQUh6RSxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNNLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDM0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE0QjtJQUN4RixDQUFDO0lBRUcsS0FBSyxDQUFDLEtBQUs7UUFDakIsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRTlGLE9BQU87WUFDTixJQUFJLEVB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