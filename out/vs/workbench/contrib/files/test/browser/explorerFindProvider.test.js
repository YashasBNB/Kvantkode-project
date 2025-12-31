/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExplorerItem } from '../../common/explorerModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TestFileService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { NullFilesConfigurationService } from '../../../../test/common/workbenchTestServices.js';
import { ExplorerFindProvider } from '../../browser/views/explorerViewer.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { WorkbenchCompressibleAsyncDataTree, } from '../../../../../platform/list/browser/listService.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { ISearchService, } from '../../../../services/search/common/search.js';
import { URI } from '../../../../../base/common/uri.js';
import assert from 'assert';
import { IExplorerService } from '../../browser/files.js';
import { basename } from '../../../../../base/common/resources.js';
import { TreeFindMatchType, TreeFindMode, } from '../../../../../base/browser/ui/tree/abstractTree.js';
function find(element, id) {
    if (element.name === id) {
        return element;
    }
    if (!element.children) {
        return undefined;
    }
    for (const child of element.children.values()) {
        const result = find(child, id);
        if (result) {
            return result;
        }
    }
    return undefined;
}
class Renderer {
    constructor() {
        this.templateId = 'default';
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        templateData.textContent = element.element.name;
    }
    disposeTemplate(templateData) {
        // noop
    }
    renderCompressedElements(node, index, templateData, height) {
        const result = [];
        for (const element of node.element.elements) {
            result.push(element.name);
        }
        templateData.textContent = result.join('/');
    }
}
class IdentityProvider {
    getId(element) {
        return {
            toString: () => {
                return element.name;
            },
        };
    }
}
class VirtualDelegate {
    getHeight() {
        return 20;
    }
    getTemplateId(element) {
        return 'default';
    }
}
class DataSource {
    hasChildren(element) {
        return !!element.children && element.children.size > 0;
    }
    getChildren(element) {
        return Promise.resolve(Array.from(element.children.values()) || []);
    }
    getParent(element) {
        return element.parent;
    }
}
class AccessibilityProvider {
    getWidgetAriaLabel() {
        return '';
    }
    getAriaLabel(stat) {
        return stat.name;
    }
}
class KeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(stat) {
        return stat.name;
    }
    getCompressedNodeKeyboardNavigationLabel(stats) {
        return stats.map((stat) => stat.name).join('/');
    }
}
class CompressionDelegate {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    isIncompressible(element) {
        return !this.dataSource.hasChildren(element);
    }
}
class TestFilesFilter {
    filter() {
        return true;
    }
    isIgnored() {
        return false;
    }
    dispose() { }
}
suite('Find Provider - ExplorerView', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const fileService = new TestFileService();
    const configService = new TestConfigurationService();
    function createStat(path, isFolder) {
        return new ExplorerItem(URI.from({ scheme: 'file', path }), fileService, configService, NullFilesConfigurationService, undefined, isFolder);
    }
    let root;
    let instantiationService;
    const searchMappings = new Map([
        [
            'bb',
            [
                URI.file('/root/b/bb/bbb.txt'),
                URI.file('/root/a/ab/abb.txt'),
                URI.file('/root/b/bb/bba.txt'),
            ],
        ],
    ]);
    setup(() => {
        root = createStat.call(this, '/root', true);
        const a = createStat.call(this, '/root/a', true);
        const aa = createStat.call(this, '/root/a/aa', true);
        const ab = createStat.call(this, '/root/a/ab', true);
        const aba = createStat.call(this, '/root/a/ab/aba.txt', false);
        const abb = createStat.call(this, '/root/a/ab/abb.txt', false);
        const b = createStat.call(this, '/root/b', true);
        const ba = createStat.call(this, '/root/b/ba', true);
        const baa = createStat.call(this, '/root/b/ba/baa.txt', false);
        const bab = createStat.call(this, '/root/b/ba/bab.txt', false);
        const bb = createStat.call(this, '/root/b/bb', true);
        root.addChild(a);
        a.addChild(aa);
        a.addChild(ab);
        ab.addChild(aba);
        ab.addChild(abb);
        root.addChild(b);
        b.addChild(ba);
        ba.addChild(baa);
        ba.addChild(bab);
        b.addChild(bb);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IExplorerService, {
            roots: [root],
            refresh: () => Promise.resolve(),
            findClosest: (resource) => {
                return find(root, basename(resource)) ?? null;
            },
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query, token) {
                const filePattern = query.filePattern
                    ?.replace(/\//g, '')
                    .replace(/\*/g, '')
                    .replace(/\[/g, '')
                    .replace(/\]/g, '')
                    .replace(/[A-Z]/g, '') ?? '';
                const fileMatches = (searchMappings.get(filePattern) ?? []).map((u) => ({
                    resource: u,
                }));
                return Promise.resolve({ results: fileMatches, messages: [] });
            },
            schemeHasFileSearchProvider() {
                return true;
            },
        });
    });
    test('find provider', async function () {
        const disposables = new DisposableStore();
        // Tree Stuff
        const container = document.createElement('div');
        const dataSource = new DataSource();
        const compressionDelegate = new CompressionDelegate(dataSource);
        const keyboardNavigationLabelProvider = new KeyboardNavigationLabelProvider();
        const accessibilityProvider = new AccessibilityProvider();
        const filter = instantiationService.createInstance(TestFilesFilter);
        const options = {
            identityProvider: new IdentityProvider(),
            keyboardNavigationLabelProvider,
            accessibilityProvider,
        };
        const tree = disposables.add(instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'test', container, new VirtualDelegate(), compressionDelegate, [new Renderer()], dataSource, options));
        tree.layout(200);
        await tree.setInput(root);
        const findProvider = instantiationService.createInstance(ExplorerFindProvider, filter, () => tree);
        findProvider.startSession();
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, false);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, false);
        assert.strictEqual(find(root, 'abb.txt')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), false);
        await findProvider.find('bb', { matchType: TreeFindMatchType.Contiguous, findMode: TreeFindMode.Filter }, new CancellationTokenSource().token);
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'abb.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bba.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bbb.txt')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'b')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'bb')?.isMarkedAsFiltered(), true);
        assert.strictEqual(find(root, 'aa')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ba')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'aba.txt')?.isMarkedAsFiltered(), false);
        await findProvider.endSession();
        assert.strictEqual(find(root, 'abb.txt') !== undefined, true);
        assert.strictEqual(find(root, 'baa.txt') !== undefined, true);
        assert.strictEqual(find(root, 'baa.txt') !== undefined, true);
        assert.strictEqual(find(root, 'bba.txt') !== undefined, false);
        assert.strictEqual(find(root, 'bbb.txt') !== undefined, false);
        assert.strictEqual(find(root, 'a')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'ab')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'b')?.isMarkedAsFiltered(), false);
        assert.strictEqual(find(root, 'bb')?.isMarkedAsFiltered(), false);
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaW5kUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci9leHBsb3JlckZpbmRQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVFsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUNOLGVBQWUsRUFDZiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQWUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBRU4sa0NBQWtDLEdBQ2xDLE1BQU0scURBQXFELENBQUE7QUFHNUQsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFJTixjQUFjLEdBQ2QsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHFEQUFx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Q0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdEUsTUFBTSxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTlELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpFLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=