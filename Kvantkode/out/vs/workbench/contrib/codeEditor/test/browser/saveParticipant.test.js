/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FinalNewLineParticipant, TrimFinalNewLinesParticipant, TrimWhitespaceParticipant, } from '../../browser/saveParticipants.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { TextFileEditorModel } from '../../../../services/textfile/common/textFileEditorModel.js';
import { snapshotToString, } from '../../../../services/textfile/common/textfiles.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Save Participants', function () {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('insert final new line', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { insertFinalNewline: true });
        const participant = new FinalNewLineParticipant(configService, undefined);
        // No new line for empty lines
        let lineContent = '';
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // No new line if last line already empty
        lineContent = `Hello New Line${model.textEditorModel.getEOL()}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // New empty line added (single line)
        lineContent = 'Hello New Line';
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${lineContent}${model.textEditorModel.getEOL()}`);
        // New empty line added (multi line)
        lineContent = `Hello New Line${model.textEditorModel.getEOL()}Hello New Line${model.textEditorModel.getEOL()}Hello New Line`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${lineContent}${model.textEditorModel.getEOL()}`);
    });
    test('trim final new lines', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { trimFinalNewlines: true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Trim New Line';
        const eol = `${model.textEditorModel.getEOL()}`;
        // No new line removal if last line is not new line
        let lineContent = `${textContent}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // No new line removal if last line is single new line
        lineContent = `${textContent}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), lineContent);
        // Remove new line (single line with two new lines)
        lineContent = `${textContent}${eol}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
        // Remove new lines (multiple lines with multiple new lines)
        lineContent = `${textContent}${eol}${textContent}${eol}${eol}${eol}`;
        model.textEditorModel.setValue(lineContent);
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}${textContent}${eol}`);
    });
    test('trim final new lines bug#39750', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { trimFinalNewlines: true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Trim New Line';
        // single line
        const lineContent = `${textContent}`;
        model.textEditorModel.setValue(lineContent);
        // apply edits and push to undo stack.
        const textEdits = [{ range: new Range(1, 14, 1, 14), text: '.', forceMoveMarkers: false }];
        model.textEditorModel.pushEditOperations([new Selection(1, 14, 1, 14)], textEdits, () => {
            return [new Selection(1, 15, 1, 15)];
        });
        // undo
        await model.textEditorModel.undo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}`);
        // trim final new lines should not mess the undo stack
        await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        await model.textEditorModel.redo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}.`);
    });
    test('trim final new lines bug#46075', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { trimFinalNewlines: true });
        const participant = new TrimFinalNewLinesParticipant(configService, undefined);
        const textContent = 'Test';
        const eol = `${model.textEditorModel.getEOL()}`;
        const content = `${textContent}${eol}${eol}`;
        model.textEditorModel.setValue(content);
        // save many times
        for (let i = 0; i < 10; i++) {
            await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        }
        // confirm trimming
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
        // undo should go back to previous content immediately
        await model.textEditorModel.undo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}${eol}`);
        await model.textEditorModel.redo();
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}${eol}`);
    });
    test('trim whitespace', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/trim_final_new_line.txt'), 'utf8', undefined));
        await model.resolve();
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { trimTrailingWhitespace: true });
        const participant = new TrimWhitespaceParticipant(configService, undefined);
        const textContent = 'Test';
        const content = `${textContent} 	`;
        model.textEditorModel.setValue(content);
        // save many times
        for (let i = 0; i < 10; i++) {
            await participant.participate(model, { reason: 1 /* SaveReason.EXPLICIT */ });
        }
        // confirm trimming
        assert.strictEqual(snapshotToString(model.createSnapshot()), `${textContent}`);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvdGVzdC9icm93c2VyL3NhdmVQYXJ0aWNpcGFudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLDRCQUE0QixFQUM1Qix5QkFBeUIsR0FDekIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixHQUNuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqRyxPQUFPLEVBRU4sZ0JBQWdCLEdBQ2hCLE1BQU0sbURBQW1ELENBQUE7QUFHMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtJQUMxQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxD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