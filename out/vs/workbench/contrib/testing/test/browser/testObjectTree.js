/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObjectTree } from '../../../../../base/browser/ui/tree/objectTree.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TestItemTreeElement, TestTreeErrorMessage, } from '../../browser/explorerProjections/index.js';
import { MainThreadTestCollection } from '../../common/mainThreadTestCollection.js';
import { testStubs } from '../common/testStubs.js';
const element = document.createElement('div');
element.style.height = '1000px';
element.style.width = '200px';
class TestObjectTree extends ObjectTree {
    constructor(serializer, sorter) {
        super('test', element, {
            getHeight: () => 20,
            getTemplateId: () => 'default',
        }, [
            {
                disposeTemplate: ({ store }) => store.dispose(),
                renderElement: ({ depth, element }, _index, { container, store }) => {
                    const render = () => {
                        container.textContent = `${depth}:${serializer(element)}`;
                        Object.assign(container.dataset, element);
                    };
                    render();
                    if (element instanceof TestItemTreeElement) {
                        store.add(element.onChange(render));
                    }
                },
                disposeElement: (_el, _index, { store }) => store.clear(),
                renderTemplate: (container) => ({ container, store: new DisposableStore() }),
                templateId: 'default',
            },
        ], {
            sorter: sorter ?? {
                compare: (a, b) => serializer(a).localeCompare(serializer(b)),
            },
        });
        this.layout(1000, 200);
    }
    getRendered(getProperty) {
        const elements = element.querySelectorAll('.monaco-tl-contents');
        const sorted = [...elements].sort((a, b) => pos(a) - pos(b));
        const chain = [{ e: '', children: [] }];
        for (const element of sorted) {
            const [depthStr, label] = element.textContent.split(':');
            const depth = Number(depthStr);
            const parent = chain[depth - 1];
            const child = { e: label };
            if (getProperty) {
                child.data = element.dataset[getProperty];
            }
            parent.children = parent.children?.concat(child) ?? [child];
            chain[depth] = child;
        }
        return chain[0].children;
    }
}
const pos = (element) => Number(element.parentElement.parentElement.getAttribute('aria-posinset'));
class ByLabelTreeSorter {
    compare(a, b) {
        if (a instanceof TestTreeErrorMessage || b instanceof TestTreeErrorMessage) {
            return ((a instanceof TestTreeErrorMessage ? -1 : 0) + (b instanceof TestTreeErrorMessage ? 1 : 0));
        }
        if (a instanceof TestItemTreeElement &&
            b instanceof TestItemTreeElement &&
            a.test.item.uri &&
            b.test.item.uri &&
            a.test.item.uri.toString() === b.test.item.uri.toString() &&
            a.test.item.range &&
            b.test.item.range) {
            const delta = a.test.item.range.startLineNumber - b.test.item.range.startLineNumber;
            if (delta !== 0) {
                return delta;
            }
        }
        return (a.test.item.sortText || a.test.item.label).localeCompare(b.test.item.sortText || b.test.item.label);
    }
}
// names are hard
export class TestTreeTestHarness extends Disposable {
    constructor(makeTree, c = testStubs.nested()) {
        super();
        this.c = c;
        this.onDiff = this._register(new Emitter());
        this.onFolderChange = this._register(new Emitter());
        this.isProcessingDiff = false;
        this._register(c);
        this._register(this.c.onDidGenerateDiff((d) => this.c.setDiff(d /* don't clear during testing */)));
        const collection = new MainThreadTestCollection({ asCanonicalUri: (u) => u }, (testId, levels) => {
            this.c.expand(testId, levels);
            if (!this.isProcessingDiff) {
                this.onDiff.fire(this.c.collectDiff());
            }
            return Promise.resolve();
        });
        this._register(this.onDiff.event((diff) => collection.apply(diff)));
        this.projection = this._register(makeTree({
            collection,
            onDidProcessDiff: this.onDiff.event,
        }));
        const sorter = new ByLabelTreeSorter();
        this.tree = this._register(new TestObjectTree((t) => ('test' in t ? t.test.item.label : t.message.toString()), sorter));
        this._register(this.tree.onDidChangeCollapseState((evt) => {
            if (evt.node.element instanceof TestItemTreeElement) {
                this.projection.expandElement(evt.node.element, evt.deep ? Infinity : 0);
            }
        }));
    }
    pushDiff(...diff) {
        this.onDiff.fire(diff);
    }
    flush() {
        this.isProcessingDiff = true;
        while (this.c.currentDiff.length) {
            this.onDiff.fire(this.c.collectDiff());
        }
        this.isProcessingDiff = false;
        this.projection.applyTo(this.tree);
        return this.tree.getRendered();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE9iamVjdFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9icm93c2VyL3Rlc3RPYmplY3RUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVyRixPQUFPLEVBR04sbUJBQW1CLEVBQ25CLG9CQUFvQixHQUNwQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR25GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUtsRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQTtBQUMvQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUE7QUFFN0IsTUFBTSxjQUFrQixTQUFRLFVBQWtCO0lBQ2pELFlBQVksVUFBK0IsRUFBRSxNQUF1QjtRQUNuRSxLQUFLLENBQ0osTUFBTSxFQUNOLE9BQU8sRUFDUDtZQUNDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ25CLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO1NBQzlCLEVBQ0Q7WUFDQztnQkFDQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxL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