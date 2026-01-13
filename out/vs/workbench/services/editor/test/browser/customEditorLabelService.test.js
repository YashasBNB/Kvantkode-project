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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvdGVzdC9icm93c2VyL2N1c3RvbUVkaXRvckxhYmVsU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRixPQUFPLEVBRU4sbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUE7SUFFZixRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLFVBQVUsd0JBQXdCLENBQ3RDLHVCQUFrRCw2QkFBNkIsQ0FDOUUs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