/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { derivedHandleChanges } from '../../../../base/common/observable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { observableCodeEditor, } from '../../../browser/observableCodeEditor.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('CodeEditorWidget', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function withTestFixture(cb) {
        withEditorSetupTestFixture(undefined, cb);
    }
    function withEditorSetupTestFixture(preSetupCallback, cb) {
        withTestCodeEditor('hello world', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            preSetupCallback?.(editor, disposables);
            const obsEditor = observableCodeEditor(editor);
            const log = new Log();
            const derived = derivedHandleChanges({
                createEmptyChangeSummary: () => undefined,
                handleChange: (context) => {
                    const obsName = observableName(context.changedObservable, obsEditor);
                    log.log(`handle change: ${obsName} ${formatChange(context.change)}`);
                    return true;
                },
            }, (reader) => {
                const versionId = obsEditor.versionId.read(reader);
                const selection = obsEditor.selections
                    .read(reader)
                    ?.map((s) => s.toString())
                    .join(', ');
                obsEditor.onDidType.read(reader);
                const str = `running derived: selection: ${selection}, value: ${versionId}`;
                log.log(str);
                return str;
            });
            derived.recomputeInitiallyAndOnChange(disposables);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'running derived: selection: [1,1 -> 1,1], value: 1',
            ]);
            cb({ editor, viewModel, log, derived });
            disposables.dispose();
        });
    }
    test('setPosition', () => withTestFixture(({ editor, log }) => {
        editor.setPosition(new Position(1, 2));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":1,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"api","reason":0}',
            'running derived: selection: [1,2 -> 1,2], value: 1',
        ]);
    }));
    test('keyboard.type', () => withTestFixture(({ editor, log }) => {
        editor.trigger('keyboard', 'type', { text: 'abc' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
    }));
    test('keyboard.type and set position', () => withTestFixture(({ editor, log }) => {
        editor.trigger('keyboard', 'type', { text: 'abc' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
        editor.setPosition(new Position(1, 5), 'test');
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,5 -> 1,5]","modelVersionId":4,"oldSelections":["[1,4 -> 1,4]"],"oldModelVersionId":4,"source":"test","reason":0}',
            'running derived: selection: [1,5 -> 1,5], value: 4',
        ]);
    }));
    test('listener interaction (unforced)', () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log('>>> before get');
                derived.get();
                log.log('<<< after get');
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger('keyboard', 'type', { text: 'a' });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                '>>> before get',
                '<<< after get',
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                'running derived: selection: [1,2 -> 1,2], value: 2',
            ]);
        });
    });
    test('listener interaction ()', () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log('>>> before forceUpdate');
                observableCodeEditor(editor).forceUpdate();
                log.log('>>> before get');
                derived.get();
                log.log('<<< after get');
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger('keyboard', 'type', { text: 'a' });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                '>>> before forceUpdate',
                '>>> before get',
                'handle change: editor.versionId undefined',
                'running derived: selection: [1,2 -> 1,2], value: 2',
                '<<< after get',
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                'running derived: selection: [1,2 -> 1,2], value: 2',
            ]);
        });
    });
});
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
function formatChange(change) {
    return JSON.stringify(change, (key, value) => {
        if (value instanceof Range) {
            return value.toString();
        }
        if (value === false || (Array.isArray(value) && value.length === 0)) {
            return undefined;
        }
        return value;
    });
}
function observableName(obs, obsEditor) {
    switch (obs) {
        case obsEditor.selections:
            return 'editor.selections';
        case obsEditor.versionId:
            return 'editor.versionId';
        case obsEditor.onDidType:
            return 'editor.onDidType';
        default:
            return 'unknown';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvd2lkZ2V0L29ic2VydmFibGVDb2RlRWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBZSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXpELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGVBQWUsQ0FDdkIsRUFLVTtRQUVWLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FDbEMsZ0JBQTJGLEVBQzNGLEVBS1U7UUFFVixrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFDekMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFD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