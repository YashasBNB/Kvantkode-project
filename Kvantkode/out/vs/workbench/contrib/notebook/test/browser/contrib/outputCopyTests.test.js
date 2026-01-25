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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Q29weVRlc3RzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL291dHB1dENvcHlUZXN0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUdqRSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVuRixLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxnQkFBZ0I7UUFBdEI7WUFDUyxzQkFBaUIsR0FBRyxFQUFFLENBQUE7UUFPL0IsQ0FBQztRQU5BLElBQVcsZ0JBQWdCO1lBQzFCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzlCLENBQUM7UUFDTSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQWE7WUFDbkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtRQUMvQixDQUFDO0tBQ0Q7SUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBZTtLQUFHLENBQUMsRUFBRSxDQUFBO0lBRS9ELFNBQVMscUJBQXFCLENBQUMsT0FBeUIsRUFBRSxhQUE4QjtRQUN2RixNQUFNLGVBQWUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBMEIsQ0FBQTtRQUUvRSxJ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