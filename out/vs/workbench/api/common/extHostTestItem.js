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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RJdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGVzdEl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxXQUFXLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE1BQU0sRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQ04sc0JBQXNCLEVBS3RCLGtCQUFrQixHQUVsQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGdCQUFnQixHQUVoQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sS0FBSyxPQUFPLE1BQU0sNEJBQTRCLENBQUE7QUFFckQsTUFBTSxvQkFBb0IsR0FBRyxDQUM1QixHQUF3QixFQUN4QixZQUFnQyxFQUNoQyxNQUFpRSxFQUNqRSxRQUE4RixFQUM3RixFQUFFO0lBQ0gsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFBO0lBQ3hCLE9BQU87UUFDTixVQUFVLEVBQUUsSUFBSTtRQUNoQixZQUFZLEVBQUUsS0FBSztRQUNuQixHQUFHO1lBQ0YsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsR0FBRyxDQUFDLFFBQTRCO1lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQTtnQkFDdEIsS0FBSyxHQUFHLFFBQVEsQ0FBQTtnQkFDaEIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFD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