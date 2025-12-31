/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Node {
    constructor(key, data) {
        this.key = key;
        this.data = data;
        this.incoming = new Map();
        this.outgoing = new Map();
    }
}
export class Graph {
    constructor(_hashFn) {
        this._hashFn = _hashFn;
        this._nodes = new Map();
        // empty
    }
    roots() {
        const ret = [];
        for (const node of this._nodes.values()) {
            if (node.outgoing.size === 0) {
                ret.push(node);
            }
        }
        return ret;
    }
    insertEdge(from, to) {
        const fromNode = this.lookupOrInsertNode(from);
        const toNode = this.lookupOrInsertNode(to);
        fromNode.outgoing.set(toNode.key, toNode);
        toNode.incoming.set(fromNode.key, fromNode);
    }
    removeNode(data) {
        const key = this._hashFn(data);
        this._nodes.delete(key);
        for (const node of this._nodes.values()) {
            node.outgoing.delete(key);
            node.incoming.delete(key);
        }
    }
    lookupOrInsertNode(data) {
        const key = this._hashFn(data);
        let node = this._nodes.get(key);
        if (!node) {
            node = new Node(key, data);
            this._nodes.set(key, node);
        }
        return node;
    }
    lookup(data) {
        return this._nodes.get(this._hashFn(data));
    }
    isEmpty() {
        return this._nodes.size === 0;
    }
    toString() {
        const data = [];
        for (const [key, value] of this._nodes) {
            data.push(`${key}\n\t(-> incoming)[${[...value.incoming.keys()].join(', ')}]\n\t(outgoing ->)[${[...value.outgoing.keys()].join(',')}]\n`);
        }
        return data.join('\n');
    }
    /**
     * This is brute force and slow and **only** be used
     * to trouble shoot.
     */
    findCycleSlow() {
        for (const [id, node] of this._nodes) {
            const seen = new Set([id]);
            const res = this._findCycle(node, seen);
            if (res) {
                return res;
            }
        }
        return undefined;
    }
    _findCycle(node, seen) {
        for (const [id, outgoing] of node.outgoing) {
            if (seen.has(id)) {
                return [...seen, id].join(' -> ');
            }
            seen.add(id);
            const value = this._findCycle(outgoing, seen);
            if (value) {
                return value;
            }
            seen.delete(id);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pbnN0YW50aWF0aW9uL2NvbW1vbi9ncmFwaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sSUFBSTtJQUloQixZQUNVLEdBQVcsRUFDWCxJQUFPO1FBRFAsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFNBQUksR0FBSixJQUFJLENBQUc7UUFMUixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUE7UUFDckMsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFBO0lBSzNDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxLQUFLO0lBR2pCLFlBQTZCLE9BQStCO1FBQS9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBRjNDLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtRQUduRCxRQUFRO0lBQ1QsQ0FBQztJQUVELEtBQUs7UUFDSixNQUFNLEdBQUcsR0FBYyxFQUFFLENBQUE7UUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDekMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQU8sRUFBRSxFQUFLO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFMUMs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