/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../base/common/assert.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { TestId } from './testId.js';
export const ITestService = createDecorator('testService');
export const testCollectionIsEmpty = (collection) => !Iterable.some(collection.rootItems, (r) => r.children.size > 0);
export const getContextForTestItem = (collection, id) => {
    if (typeof id === 'string') {
        id = TestId.fromString(id);
    }
    if (id.isRoot) {
        return { controller: id.toString() };
    }
    const context = { $mid: 16 /* MarshalledId.TestItemContext */, tests: [] };
    for (const i of id.idsFromRoot()) {
        if (!i.isRoot) {
            const test = collection.getNodeById(i.toString());
            if (test) {
                context.tests.push(test);
            }
        }
    }
    return context;
};
/**
 * Ensures the test with the given ID exists in the collection, if possible.
 * If cancellation is requested, or the test cannot be found, it will return
 * undefined.
 */
export const expandAndGetTestById = async (collection, id, ct = CancellationToken.None) => {
    const idPath = [...TestId.fromString(id).idsFromRoot()];
    let expandToLevel = 0;
    for (let i = idPath.length - 1; !ct.isCancellationRequested && i >= expandToLevel;) {
        const id = idPath[i].toString();
        const existing = collection.getNodeById(id);
        if (!existing) {
            i--;
            continue;
        }
        if (i === idPath.length - 1) {
            return existing;
        }
        // expand children only if it looks like it's necessary
        if (!existing.children.has(idPath[i + 1].toString())) {
            await collection.expand(id, 0);
        }
        expandToLevel = i + 1; // avoid an infinite loop if the test does not exist
        i = idPath.length - 1;
    }
    return undefined;
};
/**
 * Waits for the test to no longer be in the "busy" state.
 */
const waitForTestToBeIdle = (testService, test) => {
    if (!test.item.busy) {
        return;
    }
    return new Promise((resolve) => {
        const l = testService.onDidProcessDiff(() => {
            if (testService.collection.getNodeById(test.item.extId)?.item.busy !== true) {
                resolve(); // removed, or no longer busy
                l.dispose();
            }
        });
    });
};
/**
 * Iterator that expands to and iterates through tests in the file. Iterates
 * in strictly descending order.
 */
export const testsInFile = async function* (testService, ident, uri, waitForIdle = true) {
    const queue = new LinkedList();
    const existing = [...testService.collection.getNodeByUrl(uri)];
    queue.push(existing.length ? existing.map((e) => e.item.extId) : testService.collection.rootIds);
    let n = 0;
    while (queue.size > 0) {
        for (const id of queue.pop()) {
            n++;
            const test = testService.collection.getNodeById(id);
            if (!test) {
                continue; // possible because we expand async and things could delete
            }
            if (!test.item.uri) {
                queue.push(test.children);
                continue;
            }
            if (ident.extUri.isEqual(uri, test.item.uri)) {
                yield test;
            }
            if (ident.extUri.isEqualOrParent(uri, test.item.uri)) {
                if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                    await testService.collection.expand(test.item.extId, 1);
                }
                if (waitForIdle) {
                    await waitForTestToBeIdle(testService, test);
                }
                if (test.children.size) {
                    queue.push(test.children);
                }
            }
        }
    }
};
/**
 * Iterator that iterates to the top-level children of tests under the given
 * the URI.
 */
export const testsUnderUri = async function* (testService, ident, uri, waitForIdle = true) {
    const queue = [testService.collection.rootIds];
    while (queue.length) {
        for (const testId of queue.pop()) {
            const test = testService.collection.getNodeById(testId);
            // Expand tests with URIs that are parent of the item, add tests
            // that are within the URI. Don't add their children, since those
            // tests already encompass their children.
            if (!test) {
                // no-op
            }
            else if (test.item.uri && ident.extUri.isEqualOrParent(test.item.uri, uri)) {
                yield test;
            }
            else if (!test.item.uri || ident.extUri.isEqualOrParent(uri, test.item.uri)) {
                if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                    await testService.collection.expand(test.item.extId, 1);
                }
                if (waitForIdle) {
                    await waitForTestToBeIdle(testService, test);
                }
                queue.push(test.children.values());
            }
        }
    }
};
/**
 * Simplifies the array of tests by preferring test item parents if all of
 * their children are included.
 */
export const simplifyTestsToExecute = (collection, tests) => {
    if (tests.length < 2) {
        return tests;
    }
    const tree = new WellDefinedPrefixTree();
    for (const test of tests) {
        tree.insert(TestId.fromString(test.item.extId).path, test);
    }
    const out = [];
    // Returns the node if it and any children should be included. Otherwise
    // pushes into the `out` any individual children that should be included.
    const process = (currentId, node) => {
        // directly included, don't try to over-specify, and children should be ignored
        if (node.value) {
            return node.value;
        }
        assert(!!node.children, 'expect to have children');
        const thisChildren = [];
        for (const [part, child] of node.children) {
            currentId.push(part);
            const c = process(currentId, child);
            if (c) {
                thisChildren.push(c);
            }
            currentId.pop();
        }
        if (!thisChildren.length) {
            return;
        }
        // If there are multiple children and we have all of them, then tell the
        // parent this node should be included. Otherwise include children individually.
        const id = new TestId(currentId);
        const test = collection.getNodeById(id.toString());
        if (test?.children.size === thisChildren.length) {
            return test;
        }
        out.push(...thisChildren);
        return;
    };
    for (const [id, node] of tree.entries) {
        const n = process([id], node);
        if (n) {
            out.push(n);
        }
    }
    return out;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUdsRSxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFJOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBSTVGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFtQnBDLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQWUsYUFBYSxDQUFDLENBQUE7QUFnRnhFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsVUFBcUMsRUFBRSxFQUFFLENBQzlFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVqRSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUNwQyxVQUFxQyxFQUNyQyxFQUFtQixFQUNsQixFQUFFO0lBQ0gsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM1QixFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMz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