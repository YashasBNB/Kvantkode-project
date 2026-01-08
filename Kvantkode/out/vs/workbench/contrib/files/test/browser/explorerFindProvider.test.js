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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaW5kUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2V4cGxvcmVyRmluZFByb3ZpZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBUWxHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sZUFBZSxFQUNmLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBZSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFFTixrQ0FBa0MsR0FDbEMsTUFBTSxxREFBcUQsQ0FBQTtBQUc1RCxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsT0FBTyxFQUlOLGNBQWMsR0FDZCxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0scURBQXFELENBQUE7QUFFNUQsU0FBUyxJQUFJLENBQUMsT0FBcUIsRUFBRSxFQUFVO0lBQzlDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUN6QixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTlCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sUUFBUTtJQUFkO1FBQ1UsZUFBVSxHQUFHLFNBQVMsQ0FBQTtJQTRCaEMsQ0FBQztJQTNCQSxjQUFjLENBQUMsU0FBc0I7UUFDcEMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELGFBQWEsQ0FDWixPQUE0QyxFQUM1QyxLQUFhLEVBQ2IsWUFBeUI7UUFFekIsWUFBWSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtJQUNoRCxDQUFDO0lBQ0QsZUFBZSxDQUFDLFlBQXlCO1FBQ3hDLE9BQU87SUFDUixDQUFDO0lBQ0Qsd0JBQXdCLENBQ3ZCLElBQThELEVBQzlELEtBQWEsRUFDYixZQUF5QixFQUN6QixNQUEwQjtRQUUxQixNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFFM0IsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFFRCxZQUFZLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNEO0FBRUQsTUFBTSxnQkFBZ0I7SUFDckIsS0FBSyxDQUFDLE9BQXFCO1FBQzFCLE9BQU87WUFDTixRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNkLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQTtZQUNwQixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sZUFBZTtJQUNwQixTQUFTO1FBQ1IsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsYUFBYSxDQUFDLE9BQXFCO1FBQ2xDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVTtJQUNmLFdBQVcsQ0FBQyxPQUFxQjtRQUNoQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBQ0QsV0FBVyxDQUFDLE9BQXFCO1FBQ2hDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBQ0QsU0FBUyxDQUFDLE9BQXFCO1FBQzlCLE9BQU8sT0FBTyxDQUFDLE1BQU8sQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHFCQUFxQjtJQUMxQixrQkFBa0I7UUFDakIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsWUFBWSxDQUFDLElBQWtCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLCtCQUErQjtJQUNwQywwQkFBMEIsQ0FBQyxJQUFrQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUNELHdDQUF3QyxDQUFDLEtBQXFCO1FBQzdELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLG1CQUFtQjtJQUN4QixZQUFvQixVQUFzQjtRQUF0QixlQUFVLEdBQVYsVUFBVSxDQUFZO0lBQUcsQ0FBQztJQUM5QyxnQkFBZ0IsQ0FBQyxPQUFxQjtRQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDN0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxlQUFlO0lBQ3BCLE1BQU07UUFDTCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxTQUFTO1FBQ1IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxLQUFJLENBQUM7Q0FDWjtBQUVELEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLE1BQU0sYUFBYSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtJQUVwRCxTQUFTLFVBQVUsQ0FBWSxJQUFZLEVBQUUsUUFBaUI7UUFDN0QsT0FBTyxJQUFJLFlBQVksQ0FDdEIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDbEMsV0FBVyxFQUNYLGFBQWEsRUFDYiw2QkFBNkIsRUFDN0IsU0FBUyxFQUNULFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksSUFBa0IsQ0FBQTtJQUV0QixJQUFJLG9CQUE4QyxDQUFBO0lBRWxELE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFnQjtRQUM3QztZQUNDLElBQUk7WUFDSjtnQkFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2FBQzlCO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDZCxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2QsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQixFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNkLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRWQsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUM7WUFDYixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNoQyxXQUFXLEVBQUUsQ0FBQyxRQUFhLEVBQUUsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQTtZQUM5QyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN6QyxVQUFVLENBQUMsS0FBaUIsRUFBRSxLQUF5QjtnQkFDdEQsTUFBTSxXQUFXLEdBQ2hCLEtBQUssQ0FBQyxXQUFXO29CQUNoQixFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO3FCQUNuQixPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztxQkFDbEIsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7cUJBQ2xCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO3FCQUNsQixPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDOUIsTUFBTSxXQUFXLEdBQWlCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3JGLFFBQVEsRUFBRSxDQUFDO2lCQUNYLENBQUMsQ0FBQyxDQUFBO2dCQUNILE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0QsQ0FBQztZQUNELDJCQUEyQjtnQkFDMUIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUs7UUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxhQUFhO1FBQ2IsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUUvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFBO1FBQ25DLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMvRCxNQUFNLCtCQUErQixHQUFHLElBQUksK0JBQStCLEVBQUUsQ0FBQTtRQUM3RSxNQUFNLHFCQUFxQixHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQTtRQUN6RCxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUEyQixDQUFBO1FBRTdGLE1BQU0sT0FBTyxHQUF5RTtZQUNyRixnQkFBZ0IsRUFBRSxJQUFJLGdCQUFnQixFQUFFO1lBQ3hDLCtCQUErQjtZQUMvQixxQkFBcUI7U0FDckIsQ0FBQTtRQUNELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsQ0FBQSxrQ0FBMkYsQ0FBQSxFQUMzRixNQUFNLEVBQ04sU0FBUyxFQUNULElBQUksZUFBZSxFQUFFLEVBQ3JCLG1CQUFtQixFQUNuQixDQUFDLElBQUksUUFBUSxFQUFFLENBQUMsRUFDaEIsVUFBVSxFQUNWLE9BQU8sQ0FDUCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWhCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV6QixNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUNWLENBQUE7UUFFRCxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakUsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUN0QixJQUFJLEVBQ0osRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLEVBQzFFLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxLQUFLLENBQ25DLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV0RSxNQUFNLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUUvQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==