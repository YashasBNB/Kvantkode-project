/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import * as editorRange from '../../../editor/common/core/range.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { createTestItemChildren, TestItemCollection, } from '../../contrib/testing/common/testItemCollection.js';
import { denamespaceTestTag, } from '../../contrib/testing/common/testTypes.js';
import { createPrivateApiFor, getPrivateApiFor, } from './extHostTestingPrivateApi.js';
import * as Convert from './extHostTypeConverters.js';
const testItemPropAccessor = (api, defaultValue, equals, toUpdate) => {
    let value = defaultValue;
    return {
        enumerable: true,
        configurable: false,
        get() {
            return value;
        },
        set(newValue) {
            if (!equals(value, newValue)) {
                const oldValue = value;
                value = newValue;
                api.listener?.(toUpdate(newValue, oldValue));
            }
        },
    };
};
const strictEqualComparator = (a, b) => a === b;
const propComparators = {
    range: (a, b) => {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.isEqual(b);
    },
    label: strictEqualComparator,
    description: strictEqualComparator,
    sortText: strictEqualComparator,
    busy: strictEqualComparator,
    error: strictEqualComparator,
    canResolveChildren: strictEqualComparator,
    tags: (a, b) => {
        if (a.length !== b.length) {
            return false;
        }
        if (a.some((t1) => !b.find((t2) => t1.id === t2.id))) {
            return false;
        }
        return true;
    },
};
const evSetProps = (fn) => (v) => ({ op: 4 /* TestItemEventOp.SetProp */, update: fn(v) });
const makePropDescriptors = (api, label) => ({
    range: (() => {
        let value;
        const updateProps = evSetProps((r) => ({
            range: editorRange.Range.lift(Convert.Range.from(r)),
        }));
        return {
            enumerable: true,
            configurable: false,
            get() {
                return value;
            },
            set(newValue) {
                api.listener?.({ op: 6 /* TestItemEventOp.DocumentSynced */ });
                if (!propComparators.range(value, newValue)) {
                    value = newValue;
                    api.listener?.(updateProps(newValue));
                }
            },
        };
    })(),
    label: testItemPropAccessor(api, label, propComparators.label, evSetProps((label) => ({ label }))),
    description: testItemPropAccessor(api, undefined, propComparators.description, evSetProps((description) => ({ description }))),
    sortText: testItemPropAccessor(api, undefined, propComparators.sortText, evSetProps((sortText) => ({ sortText }))),
    canResolveChildren: testItemPropAccessor(api, false, propComparators.canResolveChildren, (state) => ({
        op: 2 /* TestItemEventOp.UpdateCanResolveChildren */,
        state,
    })),
    busy: testItemPropAccessor(api, false, propComparators.busy, evSetProps((busy) => ({ busy }))),
    error: testItemPropAccessor(api, undefined, propComparators.error, evSetProps((error) => ({ error: Convert.MarkdownString.fromStrict(error) || null }))),
    tags: testItemPropAccessor(api, [], propComparators.tags, (current, previous) => ({
        op: 1 /* TestItemEventOp.SetTags */,
        new: current.map(Convert.TestTag.from),
        old: previous.map(Convert.TestTag.from),
    })),
});
const toItemFromPlain = (item) => {
    const testId = TestId.fromString(item.extId);
    const testItem = new TestItemImpl(testId.controllerId, testId.localId, item.label, URI.revive(item.uri) || undefined);
    testItem.range = Convert.Range.to(item.range || undefined);
    testItem.description = item.description || undefined;
    testItem.sortText = item.sortText || undefined;
    testItem.tags = item.tags.map((t) => Convert.TestTag.to({ id: denamespaceTestTag(t).tagId }));
    return testItem;
};
export const toItemFromContext = (context) => {
    let node;
    for (const test of context.tests) {
        const next = toItemFromPlain(test.item);
        getPrivateApiFor(next).parent = node;
        node = next;
    }
    return node;
};
export class TestItemImpl {
    /**
     * Note that data is deprecated and here for back-compat only
     */
    constructor(controllerId, id, label, uri) {
        if (id.includes("\0" /* TestIdPathParts.Delimiter */)) {
            throw new Error(`Test IDs may not include the ${JSON.stringify(id)} symbol`);
        }
        const api = createPrivateApiFor(this, controllerId);
        Object.defineProperties(this, {
            id: {
                value: id,
                enumerable: true,
                writable: false,
            },
            uri: {
                value: uri,
                enumerable: true,
                writable: false,
            },
            parent: {
                enumerable: false,
                get() {
                    return api.parent instanceof TestItemRootImpl ? undefined : api.parent;
                },
            },
            children: {
                value: createTestItemChildren(api, getPrivateApiFor, TestItemImpl),
                enumerable: true,
                writable: false,
            },
            ...makePropDescriptors(api, label),
        });
    }
}
export class TestItemRootImpl extends TestItemImpl {
    constructor(controllerId, label) {
        super(controllerId, controllerId, label, undefined);
        this._isRoot = true;
    }
}
export class ExtHostTestItemCollection extends TestItemCollection {
    constructor(controllerId, controllerLabel, editors) {
        super({
            controllerId,
            getDocumentVersion: (uri) => uri && editors.getDocument(uri)?.version,
            getApiFor: getPrivateApiFor,
            getChildren: (item) => item.children,
            root: new TestItemRootImpl(controllerId, controllerLabel),
            toITestItem: Convert.TestItem.from,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRlc3RJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEtBQUssV0FBVyxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDaEYsT0FBTyxFQUNOLHNCQUFzQixFQUt0QixrQkFBa0IsR0FFbEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixnQkFBZ0IsR0FFaEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEtBQUssT0FBTyxNQUFNLDRCQUE0QixDQUFBO0FBRXJELE1BQU0sb0JBQW9CLEdBQUcsQ0FDNUIsR0FBd0IsRUFDeEIsWUFBZ0MsRUFDaEMsTUFBaUUsRUFDakUsUUFBOEYsRUFDN0YsRUFBRTtJQUNILElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQTtJQUN4QixPQUFPO1FBQ04sVUFBVSxFQUFFLElBQUk7UUFDaEIsWUFBWSxFQUFFLEtBQUs7UUFDbkIsR0FBRztZQUNGLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELEdBQUcsQ0FBQyxRQUE0QjtZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM5QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLEtBQUssR0FBRyxRQUFRLENBQUE7Z0JBQ2hCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFR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