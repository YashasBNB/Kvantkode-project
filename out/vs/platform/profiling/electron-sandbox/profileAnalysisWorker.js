/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../base/common/path.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { Utils } from '../common/profiling.js';
import { buildModel, BottomUpNode, processNode, } from '../common/profilingModel.js';
export function create() {
    return new ProfileAnalysisWorker();
}
class ProfileAnalysisWorker {
    $analyseBottomUp(profile) {
        if (!Utils.isValidProfile(profile)) {
            return { kind: 1 /* ProfilingOutput.Irrelevant */, samples: [] };
        }
        const model = buildModel(profile);
        const samples = bottomUp(model, 5).filter((s) => !s.isSpecial);
        if (samples.length === 0 || samples[0].percentage < 10) {
            // ignore this profile because 90% of the time is spent inside "special" frames
            // like idle, GC, or program
            return { kind: 1 /* ProfilingOutput.Irrelevant */, samples: [] };
        }
        return { kind: 2 /* ProfilingOutput.Interesting */, samples };
    }
    $analyseByUrlCategory(profile, categories) {
        // build search tree
        const searchTree = TernarySearchTree.forUris();
        searchTree.fill(categories);
        // cost by categories
        const model = buildModel(profile);
        const aggegrateByCategory = new Map();
        for (const node of model.nodes) {
            const loc = model.locations[node.locationId];
            let category;
            try {
                category = searchTree.findSubstr(URI.parse(loc.callFrame.url));
            }
            catch {
                // ignore
            }
            if (!category) {
                category = printCallFrameShort(loc.callFrame);
            }
            const value = aggegrateByCategory.get(category) ?? 0;
            const newValue = value + node.selfTime;
            aggegrateByCategory.set(category, newValue);
        }
        const result = [];
        for (const [key, value] of aggegrateByCategory) {
            result.push([key, value]);
        }
        return result;
    }
}
function isSpecial(call) {
    return call.functionName.startsWith('(') && call.functionName.endsWith(')');
}
function printCallFrameShort(frame) {
    let result = frame.functionName || '(anonymous)';
    if (frame.url) {
        result += '#';
        result += basename(frame.url);
        if (frame.lineNumber >= 0) {
            result += ':';
            result += frame.lineNumber + 1;
        }
        if (frame.columnNumber >= 0) {
            result += ':';
            result += frame.columnNumber + 1;
        }
    }
    return result;
}
function printCallFrameStackLike(frame) {
    let result = frame.functionName || '(anonymous)';
    if (frame.url) {
        result += ' (';
        result += frame.url;
        if (frame.lineNumber >= 0) {
            result += ':';
            result += frame.lineNumber + 1;
        }
        if (frame.columnNumber >= 0) {
            result += ':';
            result += frame.columnNumber + 1;
        }
        result += ')';
    }
    return result;
}
function getHeaviestLocationIds(model, topN) {
    const stackSelfTime = {};
    for (const node of model.nodes) {
        stackSelfTime[node.locationId] = (stackSelfTime[node.locationId] || 0) + node.selfTime;
    }
    const locationIds = Object.entries(stackSelfTime)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([locationId]) => Number(locationId));
    return new Set(locationIds);
}
function bottomUp(model, topN) {
    const root = BottomUpNode.root();
    const locationIds = getHeaviestLocationIds(model, topN);
    for (const node of model.nodes) {
        if (locationIds.has(node.locationId)) {
            processNode(root, node, model);
            root.addNode(node);
        }
    }
    const result = Object.values(root.children)
        .sort((a, b) => b.selfTime - a.selfTime)
        .slice(0, topN);
    const samples = [];
    for (const node of result) {
        const sample = {
            selfTime: Math.round(node.selfTime / 1000),
            totalTime: Math.round(node.aggregateTime / 1000),
            location: printCallFrameShort(node.callFrame),
            absLocation: printCallFrameStackLike(node.callFrame),
            url: node.callFrame.url,
            caller: [],
            percentage: Math.round(node.selfTime / (model.duration / 100)),
            isSpecial: isSpecial(node.callFrame),
        };
        // follow the heaviest caller paths
        const stack = [node];
        while (stack.length) {
            const node = stack.pop();
            let top;
            for (const candidate of Object.values(node.children)) {
                if (!top || top.selfTime < candidate.selfTime) {
                    top = candidate;
                }
            }
            if (top) {
                const percentage = Math.round(top.selfTime / (node.selfTime / 100));
                sample.caller.push({
                    percentage,
                    location: printCallFrameShort(top.callFrame),
                    absLocation: printCallFrameStackLike(top.callFrame),
                });
                stack.push(top);
            }
        }
        samples.push(sample);
    }
    return samples;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZUFuYWx5c2lzV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZmlsaW5nL2VsZWN0cm9uLXNhbmRib3gvcHJvZmlsZUFuYWx5c2lzV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFjLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFHTixVQUFVLEVBQ1YsWUFBWSxFQUNaLFdBQVcsR0FFWCxNQUFNLDZCQUE2QixDQUFBO0FBT3BDLE1BQU0sVUFBVSxNQUFNO0lBQ3JCLE9BQU8sSUFBSSxxQkFBcUIsRUFBRSxDQUFBO0FBQ25DLENBQUM7QUFFRCxNQUFNLHFCQUFxQjtJQUcxQixnQkFBZ0IsQ0FBQyxPQUFtQjtRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxJQUFJLG9DQUE0QixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU5RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE9B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