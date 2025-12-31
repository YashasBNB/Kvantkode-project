/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mock } from '../../../../../../base/test/common/mock.js';
import assert from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { copyCellOutput } from '../../../browser/viewModel/cellOutputTextHelper.js';
suite('Cell Output Clipboard Tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class ClipboardService {
        constructor() {
            this._clipboardContent = '';
        }
        get clipboardContent() {
            return this._clipboardContent;
        }
        async writeText(value) {
            this._clipboardContent = value;
        }
    }
    const logService = new (class extends mock() {
    })();
    function createOutputViewModel(outputs, cellViewModel) {
        const outputViewModel = { model: { outputs: outputs } };
        if (cellViewModel) {
            cellViewModel.outputsViewModels.push(outputViewModel);
            cellViewModel.model.outputs.push(outputViewModel.model);
        }
        else {
            cellViewModel = {
                outputsViewModels: [outputViewModel],
                model: { outputs: [outputViewModel.model] },
            };
        }
        outputViewModel.cellViewModel = cellViewModel;
        return outputViewModel;
    }
    test('Copy text/plain output', async () => {
        const mimeType = 'text/plain';
        const clipboard = new ClipboardService();
        const outputDto = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const output = createOutputViewModel([outputDto]);
        await copyCellOutput(mimeType, output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'output content');
    });
    test('Nothing copied for invalid mimetype', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('output content'), mime: 'bad' },
            { data: VSBuffer.fromString('output 2'), mime: 'unknown' },
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('bad', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, '');
    });
    test('Text copied if available instead of invalid mime type', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('output content'), mime: 'bad' },
            { data: VSBuffer.fromString('text content'), mime: 'text/plain' },
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('bad', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'text content');
    });
    test('Selected mimetype is preferred', async () => {
        const clipboard = new ClipboardService();
        const outputDtos = [
            { data: VSBuffer.fromString('plain text'), mime: 'text/plain' },
            { data: VSBuffer.fromString('html content'), mime: 'text/html' },
        ];
        const output = createOutputViewModel(outputDtos);
        await copyCellOutput('text/html', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'html content');
    });
    test('copy subsequent output', async () => {
        const clipboard = new ClipboardService();
        const output = createOutputViewModel([
            { data: VSBuffer.fromString('first'), mime: 'text/plain' },
        ]);
        const output2 = createOutputViewModel([{ data: VSBuffer.fromString('second'), mime: 'text/plain' }], output.cellViewModel);
        const output3 = createOutputViewModel([{ data: VSBuffer.fromString('third'), mime: 'text/plain' }], output.cellViewModel);
        await copyCellOutput('text/plain', output2, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'second');
        await copyCellOutput('text/plain', output3, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'third');
    });
    test('adjacent stream outputs are concanented', async () => {
        const clipboard = new ClipboardService();
        const output = createOutputViewModel([
            { data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' },
        ]);
        createOutputViewModel([{ data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' }], output.cellViewModel);
        createOutputViewModel([{ data: VSBuffer.fromString('text content'), mime: 'text/plain' }], output.cellViewModel);
        createOutputViewModel([{ data: VSBuffer.fromString('non-adjacent'), mime: 'application/vnd.code.notebook.stdout' }], output.cellViewModel);
        await copyCellOutput('application/vnd.code.notebook.stdout', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'stdoutstderr');
    });
    test('error output uses the value in the stack', async () => {
        const clipboard = new ClipboardService();
        const data = VSBuffer.fromString(`{"name":"Error Name","message":"error message","stack":"error stack"}`);
        const output = createOutputViewModel([{ data, mime: 'application/vnd.code.notebook.error' }]);
        await copyCellOutput('application/vnd.code.notebook.error', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'error stack');
    });
    test('error without stack uses the name and message', async () => {
        const clipboard = new ClipboardService();
        const data = VSBuffer.fromString(`{"name":"Error Name","message":"error message"}`);
        const output = createOutputViewModel([{ data, mime: 'application/vnd.code.notebook.error' }]);
        await copyCellOutput('application/vnd.code.notebook.error', output, clipboard, logService);
        assert.strictEqual(clipboard.clipboardContent, 'Error Name: error message');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q29weVRlc3RzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9vdXRwdXRDb3B5VGVzdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHakUsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFbkYsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sZ0JBQWdCO1FBQXRCO1lBQ1Msc0JBQWlCLEdBQUcsRUFBRSxDQUFBO1FBTy9CLENBQUM7UUFOQSxJQUFXLGdCQUFnQjtZQUMxQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtRQUM5QixDQUFDO1FBQ00sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFhO1lBQ25DLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7UUFDL0IsQ0FBQztLQUNEO0lBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWU7S0FBRyxDQUFDLEVBQUUsQ0FBQTtJQUUvRCxTQUFTLHFCQUFxQixDQUFDLE9BQXlCLEVBQUUsYUFBOEI7UUFDdkYsTUFBTSxlQUFlLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQTBCLENBQUE7UUFFL0UsSUFBSSxh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