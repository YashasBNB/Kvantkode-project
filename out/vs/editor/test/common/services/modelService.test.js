/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { createTextBuffer } from '../../../common/model/textModel.js';
import { ModelService } from '../../../common/services/modelService.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { createModelServices, createTextModel } from '../testTextModel.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IModelService } from '../../../common/services/model.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
const GENERATE_TESTS = false;
suite('ModelService', () => {
    let disposables;
    let modelService;
    let instantiationService;
    setup(() => {
        disposables = new DisposableStore();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { eol: '\n' });
        configService.setUserConfiguration('files', { eol: '\r\n' }, URI.file(platform.isWindows ? 'c:\\myroot' : '/myroot'));
        instantiationService = createModelServices(disposables, [
            [IConfigurationService, configService],
        ]);
        modelService = instantiationService.get(IModelService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('EOL setting respected depending on root', () => {
        const model1 = modelService.createModel('farboo', null);
        const model2 = modelService.createModel('farboo', null, URI.file(platform.isWindows ? 'c:\\myroot\\myfile.txt' : '/myroot/myfile.txt'));
        const model3 = modelService.createModel('farboo', null, URI.file(platform.isWindows ? 'c:\\other\\myfile.txt' : '/other/myfile.txt'));
        assert.strictEqual(model1.getOptions().defaultEOL, 1 /* DefaultEndOfLine.LF */);
        assert.strictEqual(model2.getOptions().defaultEOL, 2 /* DefaultEndOfLine.CRLF */);
        assert.strictEqual(model3.getOptions().defaultEOL, 1 /* DefaultEndOfLine.LF */);
        model1.dispose();
        model2.dispose();
        model3.dispose();
    });
    test('_computeEdits no change', function () {
        const model = disposables.add(createTextModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n')));
        const textBuffer = createAndRegisterTextBuffer(disposables, [
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n'), 1 /* DefaultEndOfLine.LF */);
        const actual = ModelService._computeEdits(model, textBuffer);
        assert.deepStrictEqual(actual, []);
    });
    test('_computeEdits first line changed', function () {
        const model = disposables.add(createTextModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n')));
        const textBuffer = createAndRegisterTextBuffer(disposables, [
            'This is line One', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n'), 1 /* DefaultEndOfLine.LF */);
        const actual = ModelService._computeEdits(model, textBuffer);
        assert.deepStrictEqual(actual, [
            EditOperation.replaceMove(new Range(1, 1, 2, 1), 'This is line One\n'),
        ]);
    });
    test('_computeEdits EOL changed', function () {
        const model = disposables.add(createTextModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n')));
        const textBuffer = createAndRegisterTextBuffer(disposables, [
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\r\n'), 1 /* DefaultEndOfLine.LF */);
        const actual = ModelService._computeEdits(model, textBuffer);
        assert.deepStrictEqual(actual, []);
    });
    test('_computeEdits EOL and other change 1', function () {
        const model = disposables.add(createTextModel([
            'This is line one', //16
            'and this is line number two', //27
            'it is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\n')));
        const textBuffer = createAndRegisterTextBuffer(disposables, [
            'This is line One', //16
            'and this is line number two', //27
            'It is followed by #3', //20
            'and finished with the fourth.', //29
        ].join('\r\n'), 1 /* DefaultEndOfLine.LF */);
        const actual = ModelService._computeEdits(model, textBuffer);
        assert.deepStrictEqual(actual, [
            EditOperation.replaceMove(new Range(1, 1, 4, 1), ['This is line One', 'and this is line number two', 'It is followed by #3', ''].join('\r\n')),
        ]);
    });
    test('_computeEdits EOL and other change 2', function () {
        const model = disposables.add(createTextModel([
            'package main', // 1
            'func foo() {', // 2
            '}', // 3
        ].join('\n')));
        const textBuffer = createAndRegisterTextBuffer(disposables, [
            'package main', // 1
            'func foo() {', // 2
            '}', // 3
            '',
        ].join('\r\n'), 1 /* DefaultEndOfLine.LF */);
        const actual = ModelService._computeEdits(model, textBuffer);
        assert.deepStrictEqual(actual, [EditOperation.replaceMove(new Range(3, 2, 3, 2), '\r\n')]);
    });
    test('generated1', () => {
        const file1 = ['pram', 'okctibad', 'pjuwtemued', 'knnnm', 'u', ''];
        const file2 = [
            'tcnr',
            'rxwlicro',
            'vnzy',
            '',
            '',
            'pjzcogzur',
            'ptmxyp',
            'dfyshia',
            'pee',
            'ygg',
        ];
        assertComputeEdits(file1, file2);
    });
    test('generated2', () => {
        const file1 = ['', 'itls', 'hrilyhesv', ''];
        const file2 = ['vdl', '', 'tchgz', 'bhx', 'nyl'];
        assertComputeEdits(file1, file2);
    });
    test('generated3', () => {
        const file1 = [
            'ubrbrcv',
            'wv',
            'xodspybszt',
            's',
            'wednjxm',
            'fklajt',
            'fyfc',
            'lvejgge',
            'rtpjlodmmk',
            'arivtgmjdm',
        ];
        const file2 = ['s', 'qj', 'tu', 'ur', 'qerhjjhyvx', 't'];
        assertComputeEdits(file1, file2);
    });
    test('generated4', () => {
        const file1 = ['ig', 'kh', 'hxegci', 'smvker', 'pkdmjjdqnv', 'vgkkqqx', '', 'jrzeb'];
        const file2 = ['yk', ''];
        assertComputeEdits(file1, file2);
    });
    test('does insertions in the middle of the document', () => {
        const file1 = ['line 1', 'line 2', 'line 3'];
        const file2 = ['line 1', 'line 2', 'line 5', 'line 3'];
        assertComputeEdits(file1, file2);
    });
    test('does insertions at the end of the document', () => {
        const file1 = ['line 1', 'line 2', 'line 3'];
        const file2 = ['line 1', 'line 2', 'line 3', 'line 4'];
        assertComputeEdits(file1, file2);
    });
    test('does insertions at the beginning of the document', () => {
        const file1 = ['line 1', 'line 2', 'line 3'];
        const file2 = ['line 0', 'line 1', 'line 2', 'line 3'];
        assertComputeEdits(file1, file2);
    });
    test('does replacements', () => {
        const file1 = ['line 1', 'line 2', 'line 3'];
        const file2 = ['line 1', 'line 7', 'line 3'];
        assertComputeEdits(file1, file2);
    });
    test('does deletions', () => {
        const file1 = ['line 1', 'line 2', 'line 3'];
        const file2 = ['line 1', 'line 3'];
        assertComputeEdits(file1, file2);
    });
    test('does insert, replace, and delete', () => {
        const file1 = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
        const file2 = [
            'line 0', // insert line 0
            'line 1',
            'replace line 2', // replace line 2
            'line 3',
            // delete line 4
            'line 5',
        ];
        assertComputeEdits(file1, file2);
    });
    test('maintains undo for same resource and same content', () => {
        const resource = URI.parse('file://test.txt');
        // create a model
        const model1 = modelService.createModel('text', null, resource);
        // make an edit
        model1.pushEditOperations(null, [{ range: new Range(1, 5, 1, 5), text: '1' }], () => [
            new Selection(1, 5, 1, 5),
        ]);
        assert.strictEqual(model1.getValue(), 'text1');
        // dispose it
        modelService.destroyModel(resource);
        // create a new model with the same content
        const model2 = modelService.createModel('text1', null, resource);
        // undo
        model2.undo();
        assert.strictEqual(model2.getValue(), 'text');
        // dispose it
        modelService.destroyModel(resource);
    });
    test('maintains version id and alternative version id for same resource and same content', () => {
        const resource = URI.parse('file://test.txt');
        // create a model
        const model1 = modelService.createModel('text', null, resource);
        // make an edit
        model1.pushEditOperations(null, [{ range: new Range(1, 5, 1, 5), text: '1' }], () => [
            new Selection(1, 5, 1, 5),
        ]);
        assert.strictEqual(model1.getValue(), 'text1');
        const versionId = model1.getVersionId();
        const alternativeVersionId = model1.getAlternativeVersionId();
        // dispose it
        modelService.destroyModel(resource);
        // create a new model with the same content
        const model2 = modelService.createModel('text1', null, resource);
        assert.strictEqual(model2.getVersionId(), versionId);
        assert.strictEqual(model2.getAlternativeVersionId(), alternativeVersionId);
        // dispose it
        modelService.destroyModel(resource);
    });
    test('does not maintain undo for same resource and different content', () => {
        const resource = URI.parse('file://test.txt');
        // create a model
        const model1 = modelService.createModel('text', null, resource);
        // make an edit
        model1.pushEditOperations(null, [{ range: new Range(1, 5, 1, 5), text: '1' }], () => [
            new Selection(1, 5, 1, 5),
        ]);
        assert.strictEqual(model1.getValue(), 'text1');
        // dispose it
        modelService.destroyModel(resource);
        // create a new model with the same content
        const model2 = modelService.createModel('text2', null, resource);
        // undo
        model2.undo();
        assert.strictEqual(model2.getValue(), 'text2');
        // dispose it
        modelService.destroyModel(resource);
    });
    test('setValue should clear undo stack', () => {
        const resource = URI.parse('file://test.txt');
        const model = modelService.createModel('text', null, resource);
        model.pushEditOperations(null, [{ range: new Range(1, 5, 1, 5), text: '1' }], () => [
            new Selection(1, 5, 1, 5),
        ]);
        assert.strictEqual(model.getValue(), 'text1');
        model.setValue('text2');
        model.undo();
        assert.strictEqual(model.getValue(), 'text2');
        // dispose it
        modelService.destroyModel(resource);
    });
});
function assertComputeEdits(lines1, lines2) {
    const model = createTextModel(lines1.join('\n'));
    const { disposable, textBuffer } = createTextBuffer(lines2.join('\n'), 1 /* DefaultEndOfLine.LF */);
    // compute required edits
    // let start = Date.now();
    const edits = ModelService._computeEdits(model, textBuffer);
    // console.log(`took ${Date.now() - start} ms.`);
    // apply edits
    model.pushEditOperations([], edits, null);
    assert.strictEqual(model.getValue(), lines2.join('\n'));
    disposable.dispose();
    model.dispose();
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomString(minLength, maxLength) {
    const length = getRandomInt(minLength, maxLength);
    const t = new StringBuilder(length);
    for (let i = 0; i < length; i++) {
        t.appendASCIICharCode(getRandomInt(97 /* CharCode.a */, 122 /* CharCode.z */));
    }
    return t.build();
}
function generateFile(small) {
    const lineCount = getRandomInt(1, small ? 3 : 10000);
    const lines = [];
    for (let i = 0; i < lineCount; i++) {
        lines.push(getRandomString(0, small ? 3 : 10000));
    }
    return lines;
}
if (GENERATE_TESTS) {
    let number = 1;
    while (true) {
        console.log('------TEST: ' + number++);
        const file1 = generateFile(true);
        const file2 = generateFile(true);
        console.log('------TEST GENERATED');
        try {
            assertComputeEdits(file1, file2);
        }
        catch (err) {
            console.log(err);
            console.log(`
const file1 = ${JSON.stringify(file1).replace(/"/g, "'")};
const file2 = ${JSON.stringify(file2).replace(/"/g, "'")};
assertComputeEdits(file1, file2);
`);
            break;
        }
    }
}
function createAndRegisterTextBuffer(store, value, defaultEOL) {
    const { disposable, textBuffer } = createTextBuffer(value, defaultEOL);
    store.add(disposable);
    return textBuffer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvbW9kZWxTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQU9yRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDckgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFBO0FBRTVCLEtBQUssQ0FB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