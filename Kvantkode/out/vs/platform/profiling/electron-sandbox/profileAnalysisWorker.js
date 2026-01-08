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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZUFuYWx5c2lzV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvZWxlY3Ryb24tc2FuZGJveC9wcm9maWxlQW5hbHlzaXNXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQWMsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUdOLFVBQVUsRUFDVixZQUFZLEVBQ1osV0FBVyxHQUVYLE1BQU0sNkJBQTZCLENBQUE7QUFPcEMsTUFBTSxVQUFVLE1BQU07SUFDckIsT0FBTyxJQUFJLHFCQUFxQixFQUFFLENBQUE7QUFDbkMsQ0FBQztBQUVELE1BQU0scUJBQXFCO0lBRzFCLGdCQUFnQixDQUFDLE9BQW1CO1FBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDcEMsT0FBTyxFQUFFLElBQUksb0NBQTRCLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQ3pELENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTlELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElB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