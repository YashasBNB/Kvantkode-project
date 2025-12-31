/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { ExplorerItem } from '../../common/explorerModel.js';
import { getContext } from '../../browser/views/explorerView.js';
import { listInvalidItemForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { CompressedNavigationController } from '../../browser/views/explorerViewer.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { provideDecorations } from '../../browser/views/explorerDecorationsProvider.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NullFilesConfigurationService } from '../../../../test/common/workbenchTestServices.js';
suite('Files - ExplorerView', () => {
    const $ = dom.$;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const fileService = new TestFileService();
    const configService = new TestConfigurationService();
    function createStat(path, name, isFolder, hasChildren, size, mtime, isSymLink = false, isUnknown = false) {
        return new ExplorerItem(toResource.call(this, path), fileService, configService, NullFilesConfigurationService, undefined, isFolder, isSymLink, false, false, name, mtime, isUnknown);
    }
    test('getContext', async function () {
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/', '/', true, false, 8096, d);
        const s2 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        const s3 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
        const s4 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        const noNavigationController = {
            getCompressedNavigationController: (stat) => undefined,
        };
        assert.deepStrictEqual(getContext([s1], [s2, s3, s4], true, noNavigationController), [
            s2,
            s3,
            s4,
        ]);
        assert.deepStrictEqual(getContext([s1], [s1, s3, s4], true, noNavigationController), [
            s1,
            s3,
            s4,
        ]);
        assert.deepStrictEqual(getContext([s1], [s3, s1, s4], false, noNavigationController), [s1]);
        assert.deepStrictEqual(getContext([], [s3, s1, s4], false, noNavigationController), []);
        assert.deepStrictEqual(getContext([], [s3, s1, s4], true, noNavigationController), [s3, s1, s4]);
    });
    test('decoration provider', async function () {
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        s1.error = new Error('A test error');
        const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d, true);
        const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        assert.strictEqual(provideDecorations(s3), undefined);
        assert.deepStrictEqual(provideDecorations(s2), {
            tooltip: 'Symbolic Link',
            letter: '\u2937',
        });
        assert.deepStrictEqual(provideDecorations(s1), {
            tooltip: 'Unable to resolve workspace folder (A test error)',
            letter: '!',
            color: listInvalidItemForeground,
        });
        const unknown = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d, false, true);
        assert.deepStrictEqual(provideDecorations(unknown), {
            tooltip: 'Unknown File Type',
            letter: '?',
        });
    });
    test('compressed navigation controller', async function () {
        const container = $('.file');
        const label = $('.label');
        const labelName1 = $('.label-name');
        const labelName2 = $('.label-name');
        const labelName3 = $('.label-name');
        const d = new Date().getTime();
        const s1 = createStat.call(this, '/path', 'path', true, false, 8096, d);
        const s2 = createStat.call(this, '/path/to', 'to', true, false, 8096, d);
        const s3 = createStat.call(this, '/path/to/stat', 'stat', false, false, 8096, d);
        dom.append(container, label);
        dom.append(label, labelName1);
        dom.append(label, labelName2);
        dom.append(label, labelName3);
        const emitter = new Emitter();
        const navigationController = new CompressedNavigationController('id', [s1, s2, s3], {
            container,
            templateDisposables: ds.add(new DisposableStore()),
            elementDisposables: ds.add(new DisposableStore()),
            contribs: [],
            label: {
                container: label,
                onDidRender: emitter.event,
            },
        }, 1, false);
        ds.add(navigationController);
        assert.strictEqual(navigationController.count, 3);
        assert.strictEqual(navigationController.index, 2);
        assert.strictEqual(navigationController.current, s3);
        navigationController.next();
        assert.strictEqual(navigationController.current, s3);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s2);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s1);
        navigationController.previous();
        assert.strictEqual(navigationController.current, s1);
        navigationController.last();
        assert.strictEqual(navigationController.current, s3);
        navigationController.first();
        assert.strictEqual(navigationController.current, s1);
        navigationController.setIndex(1);
        assert.strictEqual(navigationController.current, s2);
        navigationController.setIndex(44);
        assert.strictEqual(navigationController.current, s2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy90ZXN0L2Jyb3dzZXIvZXhwbG9yZXJWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWhHLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUVmLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLGFBQWEsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7SUFFcEQsU0FBUyxVQUFVLENBRWxCLElBQVksRUFDWixJQUFZLEVBQ1osUUFBaUIsRUFDakIsV0FBb0IsRUFDcEIsSUFBWSxFQUNaLEtBQWEsRUFDYixTQUFTLEdBQUcsS0FBSyxFQUNqQixTQUFTLEdBQUcsS0FBSztRQUVqQixPQUFPLElBQUksWUFBWSxDQUN0QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDM0IsV0FBVyxFQUNYLGFBQWEsRUFDYiw2QkFBNkIsRUFDN0IsU0FBUyxFQUNULFFBQVEsRUFDUixTQUFTLEVBQ1QsS0FBSyxFQUNMLEtBQUssRUFDTCxJQUFJLEVBQ0osS0FBSyxFQUNMLFNBQVMsQ0FDVCxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSztRQUN2QixNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzlCLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RSxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxzQkFBc0IsR0FBRztZQUM5QixpQ0FBaUMsRUFBRSxDQUFDLElBQWtCLEVBQUUsRUFBRSxDQUFDLFNBQVM7U0FDcEUsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxFQUFFO1lBQ3BGLEVBQUU7WUFDRixFQUFFO1lBQ0YsRUFBRTtTQUNGLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxFQUFFO1lBQ3BGLEVBQUU7WUFDRixFQUFFO1lBQ0YsRUFBRTtTQUNGLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFD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