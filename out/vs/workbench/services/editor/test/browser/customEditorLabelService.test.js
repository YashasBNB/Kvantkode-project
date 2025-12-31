/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CustomEditorLabelService } from '../../common/customEditorLabelService.js';
import { TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
suite('Custom Editor Label Service', () => {
    const disposables = new DisposableStore();
    setup(() => { });
    teardown(async () => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    async function createCustomLabelService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const configService = new TestConfigurationService();
        await configService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        instantiationService.stub(IConfigurationService, configService);
        const customLabelService = disposables.add(instantiationService.createInstance(CustomEditorLabelService));
        return [
            customLabelService,
            configService,
            instantiationService.createInstance(TestServiceAccessor),
        ];
    }
    async function updatePattern(configService, value) {
        await configService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, value);
        configService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: (key) => key === CustomEditorLabelService.SETTING_ID_PATTERNS,
            source: 2 /* ConfigurationTarget.USER */,
            affectedKeys: new Set(CustomEditorLabelService.SETTING_ID_PATTERNS),
            change: {
                keys: [],
                overrides: [],
            },
        });
    }
    test('Custom Labels: filename.extname', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${filename}.${extname}',
        });
        const filenames = ['file.txt', 'file.txt1.tx2', '.file.txt'];
        for (const filename of filenames) {
            const label = customLabelService.getName(URI.file(filename));
            assert.strictEqual(label, filename);
        }
        let label = customLabelService.getName(URI.file('file'));
        assert.strictEqual(label, 'file.${extname}');
        label = customLabelService.getName(URI.file('.file'));
        assert.strictEqual(label, '.file.${extname}');
    });
    test('Custom Labels: filename', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${filename}',
        });
        assert.strictEqual(customLabelService.getName(URI.file('file')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('file.txt')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('file.txt1.txt2')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('folder/file.txt1.txt2')), 'file');
        assert.strictEqual(customLabelService.getName(URI.file('.file')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt1.txt2')), '.file');
        assert.strictEqual(customLabelService.getName(URI.file('folder/.file.txt1.txt2')), '.file');
    });
    test('Custom Labels: extname(N)', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**/ext/**': '${extname}',
            '**/ext0/**': '${extname(0)}',
            '**/ext1/**': '${extname(1)}',
            '**/ext2/**': '${extname(2)}',
            '**/extMinus1/**': '${extname(-1)}',
            '**/extMinus2/**': '${extname(-2)}',
        });
        function assertExtname(filename, ext) {
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext/${filename}`)), ext.extname ?? '${extname}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext0/${filename}`)), ext.ext0 ?? '${extname(0)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext1/${filename}`)), ext.ext1 ?? '${extname(1)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/ext2/${filename}`)), ext.ext2 ?? '${extname(2)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/extMinus1/${filename}`)), ext.extMinus1 ?? '${extname(-1)}', filename);
            assert.strictEqual(customLabelService.getName(URI.file(`test/extMinus2/${filename}`)), ext.extMinus2 ?? '${extname(-2)}', filename);
        }
        assertExtname('file.txt', {
            extname: 'txt',
            ext0: 'txt',
            extMinus1: 'txt',
        });
        assertExtname('file.txt1.txt2', {
            extname: 'txt1.txt2',
            ext0: 'txt2',
            ext1: 'txt1',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('.file.txt1.txt2', {
            extname: 'txt1.txt2',
            ext0: 'txt2',
            ext1: 'txt1',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('.file.txt1.txt2.txt3.txt4', {
            extname: 'txt1.txt2.txt3.txt4',
            ext0: 'txt4',
            ext1: 'txt3',
            ext2: 'txt2',
            extMinus1: 'txt1',
            extMinus2: 'txt2',
        });
        assertExtname('file', {});
        assertExtname('.file', {});
    });
    test('Custom Labels: dirname(N)', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**': '${dirname},${dirname(0)},${dirname(1)},${dirname(2)},${dirname(-1)},${dirname(-2)}',
        });
        function assertDirname(path, dir) {
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[0], dir.dirname ?? '${dirname}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[1], dir.dir0 ?? '${dirname(0)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[2], dir.dir1 ?? '${dirname(1)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[3], dir.dir2 ?? '${dirname(2)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[4], dir.dirMinus1 ?? '${dirname(-1)}', path);
            assert.strictEqual(customLabelService.getName(URI.file(path))?.split(',')[5], dir.dirMinus2 ?? '${dirname(-2)}', path);
        }
        assertDirname('folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dirMinus1: 'folder',
        });
        assertDirname('root/folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dir1: 'root',
            dirMinus1: 'root',
            dirMinus2: 'folder',
        });
        assertDirname('root/.folder/file.txt', {
            dirname: '.folder',
            dir0: '.folder',
            dir1: 'root',
            dirMinus1: 'root',
            dirMinus2: '.folder',
        });
        assertDirname('root/parent/folder/file.txt', {
            dirname: 'folder',
            dir0: 'folder',
            dir1: 'parent',
            dir2: 'root',
            dirMinus1: 'root',
            dirMinus2: 'parent',
        });
        assertDirname('file.txt', {});
    });
    test('Custom Labels: no pattern match', async () => {
        const [customLabelService, configService] = await createCustomLabelService();
        await updatePattern(configService, {
            '**/folder/**': 'folder',
            file: 'file',
        });
        assert.strictEqual(customLabelService.getName(URI.file('file')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('file.txt')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('folder1/file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('.file.txt1.txt2')), undefined);
        assert.strictEqual(customLabelService.getName(URI.file('folder1/file.txt1.txt2')), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jdXN0b21FZGl0b3JMYWJlbFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUVOLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFBO0lBRWYsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxVQUFVLHdCQUF3QixDQUN0Qyx1QkFBa0QsNkJBQTZCLENBQzlFLFNBQVMsRUFDVCxXQUFXLENBQ1g7UUFF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