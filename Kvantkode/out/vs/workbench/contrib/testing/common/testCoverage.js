/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { deepClone } from '../../../../base/common/objects.js';
import { observableSignal } from '../../../../base/common/observable.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { URI } from '../../../../base/common/uri.js';
import { ICoverageCount } from './testTypes.js';
let incId = 0;
/**
 * Class that exposese coverage information for a run.
 */
export class TestCoverage {
    constructor(result, fromTaskId, uriIdentityService, accessor) {
        this.result = result;
        this.fromTaskId = fromTaskId;
        this.uriIdentityService = uriIdentityService;
        this.accessor = accessor;
        this.fileCoverage = new ResourceMap();
        this.didAddCoverage = observableSignal(this);
        this.tree = new WellDefinedPrefixTree();
        this.associatedData = new Map();
    }
    /** Gets all test IDs that were included in this test run. */
    *allPerTestIDs() {
        const seen = new Set();
        for (const root of this.tree.nodes) {
            if (root.value && root.value.perTestData) {
                for (const id of root.value.perTestData) {
                    if (!seen.has(id)) {
                        seen.add(id);
                        yield id;
                    }
                }
            }
        }
    }
    append(coverage, tx) {
        const previous = this.getComputedForUri(coverage.uri);
        const result = this.result;
        const applyDelta = (kind, node) => {
            if (!node[kind]) {
                if (coverage[kind]) {
                    node[kind] = { ...coverage[kind] };
                }
            }
            else {
                node[kind].covered += (coverage[kind]?.covered || 0) - (previous?.[kind]?.covered || 0);
                node[kind].total += (coverage[kind]?.total || 0) - (previous?.[kind]?.total || 0);
            }
        };
        // We insert using the non-canonical path to normalize for casing differences
        // between URIs, but when inserting an intermediate node always use 'a' canonical
        // version.
        const canonical = [...this.treePathForUri(coverage.uri, /* canonical = */ true)];
        const chain = [];
        this.tree.mutatePath(this.treePathForUri(coverage.uri, /* canonical = */ false), (node) => {
            chain.push(node);
            if (chain.length === canonical.length) {
                // we reached our destination node, apply the coverage as necessary:
                if (node.value) {
                    const v = node.value;
                    // if ID was generated from a test-specific coverage, reassign it to get its real ID in the extension host.
                    v.id = coverage.id;
                    v.statement = coverage.statement;
                    v.branch = coverage.branch;
                    v.declaration = coverage.declaration;
                }
                else {
                    const v = (node.value = new FileCoverage(coverage, result, this.accessor));
                    this.fileCoverage.set(coverage.uri, v);
                }
            }
            else {
                // Otherwise, if this is not a partial per-test coverage, merge the
                // coverage changes into the chain. Per-test coverages are not complete
                // and we don't want to consider them for computation.
                if (!node.value) {
                    // clone because later intersertions can modify the counts:
                    const intermediate = deepClone(coverage);
                    intermediate.id = String(incId++);
                    intermediate.uri = this.treePathToUri(canonical.slice(0, chain.length));
                    node.value = new ComputedFileCoverage(intermediate, result);
                }
                else {
                    applyDelta('statement', node.value);
                    applyDelta('branch', node.value);
                    applyDelta('declaration', node.value);
                    node.value.didChange.trigger(tx);
                }
            }
            if (coverage.testIds) {
                node.value.perTestData ??= new Set();
                for (const id of coverage.testIds) {
                    node.value.perTestData.add(id);
                }
            }
        });
        if (chain) {
            this.didAddCoverage.trigger(tx, chain);
        }
    }
    /**
     * Builds a new tree filtered to per-test coverage data for the given ID.
     */
    filterTreeForTest(testId) {
        const tree = new WellDefinedPrefixTree();
        for (const node of this.tree.values()) {
            if (node instanceof FileCoverage) {
                if (!node.perTestData?.has(testId.toString())) {
                    continue;
                }
                const canonical = [...this.treePathForUri(node.uri, /* canonical = */ true)];
                const chain = [];
                tree.mutatePath(this.treePathForUri(node.uri, /* canonical = */ false), (n) => {
                    chain.push(n);
                    n.value ??= new BypassedFileCoverage(this.treePathToUri(canonical.slice(0, chain.length)), node.fromResult);
                });
            }
        }
        return tree;
    }
    /**
     * Gets coverage information for all files.
     */
    getAllFiles() {
        return this.fileCoverage;
    }
    /**
     * Gets coverage information for a specific file.
     */
    getUri(uri) {
        return this.fileCoverage.get(uri);
    }
    /**
     * Gets computed information for a file, including DFS-computed information
     * from child tests.
     */
    getComputedForUri(uri) {
        return this.tree.find(this.treePathForUri(uri, /* canonical = */ false));
    }
    *treePathForUri(uri, canconicalPath) {
        yield uri.scheme;
        yield uri.authority;
        const path = !canconicalPath && this.uriIdentityService.extUri.ignorePathCasing(uri)
            ? uri.path.toLowerCase()
            : uri.path;
        yield* path.split('/');
    }
    treePathToUri(path) {
        return URI.from({ scheme: path[0], authority: path[1], path: path.slice(2).join('/') });
    }
}
export const getTotalCoveragePercent = (statement, branch, function_) => {
    let numerator = statement.covered;
    let denominator = statement.total;
    if (branch) {
        numerator += branch.covered;
        denominator += branch.total;
    }
    if (function_) {
        numerator += function_.covered;
        denominator += function_.total;
    }
    return denominator === 0 ? 1 : numerator / denominator;
};
export class AbstractFileCoverage {
    /**
     * Gets the total coverage percent based on information provided.
     * This is based on the Clover total coverage formula
     */
    get tpc() {
        return getTotalCoveragePercent(this.statement, this.branch, this.declaration);
    }
    constructor(coverage, fromResult) {
        this.fromResult = fromResult;
        this.didChange = observableSignal(this);
        this.id = coverage.id;
        this.uri = coverage.uri;
        this.statement = coverage.statement;
        this.branch = coverage.branch;
        this.declaration = coverage.declaration;
    }
}
/**
 * File coverage info computed from children in the tree, not provided by the
 * extension.
 */
export class ComputedFileCoverage extends AbstractFileCoverage {
}
/**
 * A virtual node that doesn't have any added coverage info.
 */
export class BypassedFileCoverage extends ComputedFileCoverage {
    constructor(uri, result) {
        super({ id: String(incId++), uri, statement: { covered: 0, total: 0 } }, result);
    }
}
export class FileCoverage extends AbstractFileCoverage {
    /** Gets whether details are synchronously available */
    get hasSynchronousDetails() {
        return this._details instanceof Array || this.resolved;
    }
    constructor(coverage, fromResult, accessor) {
        super(coverage, fromResult);
        this.accessor = accessor;
    }
    /**
     * Gets per-line coverage details.
     */
    async detailsForTest(_testId, token = CancellationToken.None) {
        this._detailsForTest ??= new Map();
        const testId = _testId.toString();
        const prev = this._detailsForTest.get(testId);
        if (prev) {
            return prev;
        }
        const promise = (async () => {
            try {
                return await this.accessor.getCoverageDetails(this.id, testId, token);
            }
            catch (e) {
                this._detailsForTest?.delete(testId);
                throw e;
            }
        })();
        this._detailsForTest.set(testId, promise);
        return promise;
    }
    /**
     * Gets per-line coverage details.
     */
    async details(token = CancellationToken.None) {
        this._details ??= this.accessor.getCoverageDetails(this.id, undefined, token);
        try {
            const d = await this._details;
            this.resolved = true;
            return d;
        }
        catch (e) {
            this._details = undefined;
            throw e;
        }
    }
}
export const totalFromCoverageDetails = (uri, details) => {
    const fc = {
        id: '',
        uri,
        statement: ICoverageCount.empty(),
    };
    for (const detail of details) {
        if (detail.type === 1 /* DetailType.Statement */) {
            fc.statement.total++;
            fc.statement.total += detail.count ? 1 : 0;
            for (const branch of detail.branches || []) {
                fc.branch ??= ICoverageCount.empty();
                fc.branch.total++;
                fc.branch.covered += branch.count ? 1 : 0;
            }
        }
        else {
            fc.declaration ??= ICoverageCount.empty();
            fc.declaration.total++;
            fc.declaration.covered += detail.count ? 1 : 0;
        }
    }
    return fc;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0Q292ZXJhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQWdCLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdEYsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUlwRCxPQUFPLEVBQStCLGNBQWMsRUFBaUIsTUFBTSxnQkFBZ0IsQ0FBQTtBQVUzRixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7QUFFYjs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBTXhCLFlBQ2lCLE1BQXNCLEVBQ3RCLFVBQWtCLEVBQ2pCLGtCQUF1QyxFQUN2QyxRQUEyQjtRQUg1QixXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUN0QixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2pCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFUNUIsaUJBQVksR0FBRyxJQUFJLFdBQVcsRUFBZ0IsQ0FBQTtRQUMvQyxtQkFBYyxHQUFHLGdCQUFnQixDQUEwQyxJQUFJLENBQUMsQ0FBQTtRQUNoRixTQUFJLEdBQUcsSUFBSSxxQkFBcUIsRUFBd0IsQ0FBQTtRQUN4RCxtQkFBYyxH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