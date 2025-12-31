/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Recursive function that computes and caches the aggregate time for the
 * children of the computed now.
 */
const computeAggregateTime = (index, nodes) => {
    const row = nodes[index];
    if (row.aggregateTime) {
        return row.aggregateTime;
    }
    let total = row.selfTime;
    for (const child of row.children) {
        total += computeAggregateTime(child, nodes);
    }
    return (row.aggregateTime = total);
};
const ensureSourceLocations = (profile) => {
    let locationIdCounter = 0;
    const locationsByRef = new Map();
    const getLocationIdFor = (callFrame) => {
        const ref = [
            callFrame.functionName,
            callFrame.url,
            callFrame.scriptId,
            callFrame.lineNumber,
            callFrame.columnNumber,
        ].join(':');
        const existing = locationsByRef.get(ref);
        if (existing) {
            return existing.id;
        }
        const id = locationIdCounter++;
        locationsByRef.set(ref, {
            id,
            callFrame,
            location: {
                lineNumber: callFrame.lineNumber + 1,
                columnNumber: callFrame.columnNumber + 1,
                // source: {
                // 	name: maybeFileUrlToPath(callFrame.url),
                // 	path: maybeFileUrlToPath(callFrame.url),
                // 	sourceReference: 0,
                // },
            },
        });
        return id;
    };
    for (const node of profile.nodes) {
        node.locationId = getLocationIdFor(node.callFrame);
        node.positionTicks = node.positionTicks?.map((tick) => ({
            ...tick,
            // weirdly, line numbers here are 1-based, not 0-based. The position tick
            // only gives line-level granularity, so 'mark' the entire range of source
            // code the tick refers to
            startLocationId: getLocationIdFor({
                ...node.callFrame,
                lineNumber: tick.line - 1,
                columnNumber: 0,
            }),
            endLocationId: getLocationIdFor({
                ...node.callFrame,
                lineNumber: tick.line,
                columnNumber: 0,
            }),
        }));
    }
    return [...locationsByRef.values()]
        .sort((a, b) => a.id - b.id)
        .map((l) => ({ locations: [l.location], callFrame: l.callFrame }));
};
/**
 * Computes the model for the given profile.
 */
export const buildModel = (profile) => {
    if (!profile.timeDeltas || !profile.samples) {
        return {
            nodes: [],
            locations: [],
            samples: profile.samples || [],
            timeDeltas: profile.timeDeltas || [],
            // rootPath: profile.$vscode?.rootPath,
            duration: profile.endTime - profile.startTime,
        };
    }
    const { samples, timeDeltas } = profile;
    const sourceLocations = ensureSourceLocations(profile);
    const locations = sourceLocations.map((l, id) => {
        const src = l.locations[0]; //getBestLocation(profile, l.locations);
        return {
            id,
            selfTime: 0,
            aggregateTime: 0,
            ticks: 0,
            // category: categorize(l.callFrame, src),
            callFrame: l.callFrame,
            src,
        };
    });
    const idMap = new Map();
    const mapId = (nodeId) => {
        let id = idMap.get(nodeId);
        if (id === undefined) {
            id = idMap.size;
            idMap.set(nodeId, id);
        }
        return id;
    };
    // 1. Created a sorted list of nodes. It seems that the profile always has
    // incrementing IDs, although they are just not initially sorted.
    const nodes = new Array(profile.nodes.length);
    for (let i = 0; i < profile.nodes.length; i++) {
        const node = profile.nodes[i];
        // make them 0-based:
        const id = mapId(node.id);
        nodes[id] = {
            id,
            selfTime: 0,
            aggregateTime: 0,
            locationId: node.locationId,
            children: node.children?.map(mapId) || [],
        };
        for (const child of node.positionTicks || []) {
            if (child.startLocationId) {
                locations[child.startLocationId].ticks += child.ticks;
            }
        }
    }
    for (const node of nodes) {
        for (const child of node.children) {
            nodes[child].parent = node.id;
        }
    }
    // 2. The profile samples are the 'bottom-most' node, the currently running
    // code. Sum of these in the self time.
    const duration = profile.endTime - profile.startTime;
    let lastNodeTime = duration - timeDeltas[0];
    for (let i = 0; i < timeDeltas.length - 1; i++) {
        const d = timeDeltas[i + 1];
        nodes[mapId(samples[i])].selfTime += d;
        lastNodeTime -= d;
    }
    // Add in an extra time delta for the last sample. `timeDeltas[0]` is the
    // time before the first sample, and the time of the last sample is only
    // derived (approximately) by the missing time in the sum of deltas. Save
    // some work by calculating it here.
    if (nodes.length) {
        nodes[mapId(samples[timeDeltas.length - 1])].selfTime += lastNodeTime;
        timeDeltas.push(lastNodeTime);
    }
    // 3. Add the aggregate times for all node children and locations
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const location = locations[node.locationId];
        location.aggregateTime += computeAggregateTime(i, nodes);
        location.selfTime += node.selfTime;
    }
    return {
        nodes,
        locations,
        samples: samples.map(mapId),
        timeDeltas,
        // rootPath: profile.$vscode?.rootPath,
        duration,
    };
};
export class BottomUpNode {
    static root() {
        return new BottomUpNode({
            id: -1,
            selfTime: 0,
            aggregateTime: 0,
            ticks: 0,
            callFrame: {
                functionName: '(root)',
                lineNumber: -1,
                columnNumber: -1,
                scriptId: '0',
                url: '',
            },
        });
    }
    get id() {
        return this.location.id;
    }
    get callFrame() {
        return this.location.callFrame;
    }
    get src() {
        return this.location.src;
    }
    constructor(location, parent) {
        this.location = location;
        this.parent = parent;
        this.children = {};
        this.aggregateTime = 0;
        this.selfTime = 0;
        this.ticks = 0;
        this.childrenSize = 0;
    }
    addNode(node) {
        this.selfTime += node.selfTime;
        this.aggregateTime += node.aggregateTime;
    }
}
export const processNode = (aggregate, node, model, initialNode = node) => {
    let child = aggregate.children[node.locationId];
    if (!child) {
        child = new BottomUpNode(model.locations[node.locationId], aggregate);
        aggregate.childrenSize++;
        aggregate.children[node.locationId] = child;
    }
    child.addNode(initialNode);
    if (node.parent) {
        processNode(child, model.nodes[node.parent], model, initialNode);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvY29tbW9uL3Byb2ZpbGluZ01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNEVoRzs7O0dBR0c7QUFDSCxNQUFNLG9CQUFvQixHQUFHLENBQUMsS0FBYSxFQUFFLEtBQXNCLEVBQVUsRUFBRTtJQUM5RSxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEIsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkIsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFBO0lBQ3hCLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxDQUFBO0FBQ25DLENBQUMsQ0FBQTtBQUVELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxPQUF1QixFQUFzQyxFQUFFO0lBQzdGLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO0lBQ3pCLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUczQixDQUFBO0lBRUgsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFNBQXVCLEVBQUUsRUFBRTtRQUNwRCxNQUFNLEdBQUcsR0FBRztZQUNYLFNBQVMsQ0FBQyxZQUFZO1lBQ3RCLFNBQVMsQ0FBQyxHQUFHO1lBQ2IsU0FBUyxDQUFDLFFBQVE7WUFDbEIsU0FBUyxDQUFDLFVBQVU7WUFDcEIsU0FBUyxDQUFDLFlBQVk7U0FD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