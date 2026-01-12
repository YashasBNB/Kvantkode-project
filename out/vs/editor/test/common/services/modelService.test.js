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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9tb2RlbFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBT3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUIsS0FB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