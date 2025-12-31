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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdENvdmVyYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFnQixnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RGLE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFJcEQsT0FBTyxFQUErQixjQUFjLEVBQWlCLE1BQU0sZ0JBQWdCLENBQUE7QUFVM0YsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO0FBRWI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBWTtJQU14QixZQUNpQixNQUFzQixFQUN0QixVQUFrQixFQUNqQixrQkFBdUMsRUFDdkMsUUFBMkI7UUFINUIsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7UUFDdEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNqQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBVDVCLGlCQUFZLEdBQUcsSUFBSSxXQUFXLEVBQWdCLENBQUE7UUFDL0MsbUJBQWMsR0FBRyxnQkFBZ0IsQ0FBMEMsSUFBSSxDQUFDLENBQUE7UUFDaEYsU0FBSSxHQUFHLElBQUkscUJBQXFCLEVBQXdCLENBQUE7UUFDeEQsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FB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