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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9jb21tb24vcHJvZmlsaW5nTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE0RWhHOzs7R0FHRztBQUNILE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxLQUFhLEVBQUUsS0FBc0IsRUFBVSxFQUFFO0lBQzlFLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN4QixJQUFJLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN2QixPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUE7SUFDeEIsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbEMsS0FBSyxJQUFJLG9CQUFvQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLENBQUE7QUFDbkMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLE9BQXVCLEVBQXNDLEVBQUU7SUFDN0YsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7SUFDekIsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBRzNCLENBQUE7SUFFSCxNQUFNLGdCQUFnQixHQUFHLENBQUMsU0FBdUIsRUFBRSxFQUFFO1FBQ3BELE1BQU0sR0FBRyxHQUFHO1lBQ1gsU0FBUyxDQUFDLFlBQVk7WUFDdEIsU0FBUyxDQUFDLEdBQUc7WUFDYixTQUFTLENBQUMsUUFBUTtZQUNsQixTQUFTLENBQUMsVUFBVTtZQUNwQixTQUFTLENBQUMsWUFB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