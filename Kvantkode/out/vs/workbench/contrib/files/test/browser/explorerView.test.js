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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci9leHBsb3JlclZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDakcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFaEcsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBRWYsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FB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