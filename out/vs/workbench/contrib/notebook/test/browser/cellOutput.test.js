/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellOutputContainer } from '../../browser/view/cellParts/cellOutput.js';
import { CellKind } from '../../common/notebookCommon.js';
import { setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { INotebookService } from '../../common/notebookService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { Event } from '../../../../../base/common/event.js';
import { getAllOutputsText } from '../../browser/viewModel/cellOutputTextHelper.js';
suite('CellOutput', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let outputMenus = [];
    setup(() => {
        outputMenus = [];
        instantiationService = setupInstantiationService(store);
        instantiationService.stub(INotebookService, new (class extends mock() {
            getOutputMimeTypeInfo(_textModel, _kernelProvides, output) {
                return [
                    {
                        rendererId: 'plainTextRendererId',
                        mimeType: 'text/plain',
                        isTrusted: true,
                    },
                    {
                        rendererId: 'htmlRendererId',
                        mimeType: 'text/html',
                        isTrusted: true,
                    },
                    {
                        rendererId: 'errorRendererId',
                        mimeType: 'application/vnd.code.notebook.error',
                        isTrusted: true,
                    },
                    {
                        rendererId: 'stderrRendererId',
                        mimeType: 'application/vnd.code.notebook.stderr',
                        isTrusted: true,
                    },
                    {
                        rendererId: 'stdoutRendererId',
                        mimeType: 'application/vnd.code.notebook.stdout',
                        isTrusted: true,
                    },
                ].filter((info) => output.outputs.some((output) => output.mime === info.mimeType));
            }
            getRendererInfo() {
                return {
                    id: 'rendererId',
                    displayName: 'Stubbed Renderer',
                    extensionId: { _lower: 'id', value: 'id' },
                };
            }
        })());
        instantiationService.stub(IMenuService, new (class extends mock() {
            createMenu() {
                const menu = new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() {
                        return [];
                    }
                    dispose() {
                        outputMenus = outputMenus.filter((item) => item !== menu);
                    }
                })();
                outputMenus.push(menu);
                return menu;
            }
        })());
    });
    test('Render cell output items with multiple mime types', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([['print(output content)', 'python', CellKind.Code, [output1, output2], {}]], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            assert.strictEqual(outputMenus.length, 1, 'should have 1 output menus');
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should still have 2 output menus');
        }, instantiationService);
    });
    test('One of many cell outputs becomes hidden', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        const output3 = { outputId: 'ghi', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([['print(output content)', 'python', CellKind.Code, [output1, output2, output3], {}]], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            cell.outputsViewModels[1].setVisible(true);
            cell.outputsViewModels[2].setVisible(true);
            cell.outputsViewModels[1].setVisible(false);
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
        }, instantiationService);
    });
    test('get all adjacent stream outputs', async () => {
        const stdout = {
            data: VSBuffer.fromString('stdout'),
            mime: 'application/vnd.code.notebook.stdout',
        };
        const stderr = {
            data: VSBuffer.fromString('stderr'),
            mime: 'application/vnd.code.notebook.stderr',
        };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        await withTestNotebook([['print(output content)', 'python', CellKind.Code, [output1, output2], {}]], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'stdoutstderr');
        }, instantiationService);
    });
    test('get all mixed outputs of cell', async () => {
        const stdout = {
            data: VSBuffer.fromString('stdout'),
            mime: 'application/vnd.code.notebook.stdout',
        };
        const stderr = {
            data: VSBuffer.fromString('stderr'),
            mime: 'application/vnd.code.notebook.stderr',
        };
        const plainText = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const error = {
            data: VSBuffer.fromString(`{"name":"Error Name","message":"error message","stack":"error stack"}`),
            mime: 'application/vnd.code.notebook.error',
        };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        const output3 = { outputId: 'abc', outputs: [plainText] };
        const output4 = { outputId: 'abc', outputs: [error] };
        await withTestNotebook([
            [
                'print(output content)',
                'python',
                CellKind.Code,
                [output1, output2, output3, output4],
                {},
            ],
        ], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'Cell output 1 of 3\n' +
                'stdoutstderr\n' +
                'Cell output 2 of 3\n' +
                'output content\n' +
                'Cell output 3 of 3\n' +
                'error stack');
        }, instantiationService);
    });
});
function createCellTemplate(disposables) {
    return {
        outputContainer: new FastDomNode(document.createElement('div')),
        outputShowMoreContainer: new FastDomNode(document.createElement('div')),
        focusSinkElement: document.createElement('div'),
        templateDisposables: disposables,
        elementDisposables: disposables,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NlbGxPdXRwdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR2hGLE9BQU8sRUFBRSxRQUFRLEVBQXFDLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRW5GLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFDdkQsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLFdBQVcsR0FBWSxFQUFFLENBQUE7SUFFN0IsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDaEIsb0JBQW9CLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkQsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQW9CO1lBQ2pDLHFCQUFxQixDQUM3QixVQUFlLEVBQ2YsZUFBOEMsRUFDOUMsTUFBa0I7Z0JBRWxCLE9BQU87b0JBQ047d0JBQ0MsVUFBVSxFQUFFLHFCQUFxQjt3QkFDakMsUUFBUSxFQUFFLFlBQVk7d0JBQ3RCLFNBQVMsRUFBRSxJQUFJO3FCQUNmO29CQUNEO3dCQUNDLFVBQVUsRUFBRSxnQkFBZ0I7d0JBQzVCLFFBQVEsRUFBRSxXQUFXO3dCQUNyQixTQUFTLEVBQUUsSUFBSTtxQkFDZjtvQkFDRDt3QkFDQyxVQUFVLEVBQUUsaUJBQWlCO3dCQUM3QixRQUFRLEVBQUUscUNBQXFDO3dCQUMvQyxTQUFTLEVBQUUsSUFBSTtxQkFDZjtvQkFDRDt3QkFDQyxVQUFVLEVBQUUsa0JBQWtCO3dCQUM5QixRQUFRLEVBQUUsc0NBQXNDO3dCQUNoRCxTQUFTLEVBQUUsSUFBSTtxQkFDZjtvQkFDRDt3QkFDQyxVQUFVLEVBQUUsa0JBQWtCO3dCQUM5QixRQUFRLEVBQUUsc0NBQXNDO3dCQUNoRCxTQUFTLEVBQUUsSUFBSTtxQkFDZjtpQkFDRCxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDbkYsQ0FBQztZQUNRLGVBQWU7Z0JBQ3ZCLE9BQU87b0JBQ04sRUFBRSxFQUFFLFlBQVk7b0JBQ2hCLFdBQVcsRUFBRSxrQkFBa0I7b0JBQy9CLFdBQVcsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtpQkFDakIsQ0FBQTtZQUMzQixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsWUFBWSxFQUNaLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFnQjtZQUM3QixVQUFVO2dCQUNsQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBUztvQkFBM0I7O3dCQUNSLGdCQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtvQkFPbEMsQ0FBQztvQkFOUyxVQUFVO3dCQUNsQixPQUFPLEVBQUUsQ0FBQTtvQkFDVixDQUFDO29CQUNRLE9BQU87d0JBQ2YsV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQTtvQkFDMUQsQ0FBQztpQkFDRCxDQUFDLEVBQUUsQ0FBQTtnQkFDSixXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN0QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSztRQUM5RCxNQUFNLFVBQVUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ3RGLE1BQU0sY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFDekYsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFBO1FBQ3RGLE1BQU0sT0FBTyxHQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQTtRQUV0RixNQUFNLGdCQUFnQixDQUNyQixDQUFDLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDNUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUM1QyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQTtZQUN4RCxNQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNwRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QixRQUFRLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQ3hGLENBQUE7WUFDRCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDZixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtZQUN2RSxNQUFNLENBQ0wsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQzdELG9DQUFvQyxDQUNwQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUE7WUFDdkUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGtDQUFrQyxDQUFDLENBQUE7UUFDOUUsQ0FBQyxFQUNELG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSztRQUNwRCxNQUFNLFVBQVUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ3RGLE1BQU0sY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFDekYsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFBO1FBQ3RGLE1BQU0sT0FBTyxHQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQTtRQUN0RixNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUE7UUFFdEYsTUFBTSxnQkFBZ0IsQ0FDckIsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNyRixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzVDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFBO1lBQ3hELE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLFFBQVEsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtZQUNELE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUNMLFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUM3RCxvQ0FBb0MsQ0FDcEMsQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUN4RSxDQUFDLEVBQ0Qsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRCxNQUFNLE1BQU0sR0FBRztZQUNkLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxJQUFJLEVBQUUsc0NBQXNDO1NBQzVDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRztZQUNkLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxJQUFJLEVBQUUsc0NBQXNDO1NBQzVDLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUNsRSxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUVsRSxNQUFNLGdCQUFnQixDQUNyQixDQUFDLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDNUUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUE7WUFDM0MsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzNDLENBQUMsRUFDRCxvQkFBb0IsQ0FDcEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHO1lBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ25DLElBQUksRUFBRSxzQ0FBc0M7U0FDNUMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHO1lBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ25DLElBQUksRUFBRSxzQ0FBc0M7U0FDNUMsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDckYsTUFBTSxLQUFLLEdBQUc7WUFDYixJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FDeEIsdUVBQXVFLENBQ3ZFO1lBQ0QsSUFBSSxFQUFFLHFDQUFxQztTQUMzQyxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFDbEUsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFDbEUsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUE7UUFDckUsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUE7UUFFakUsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQztnQkFDQyx1QkFBdUI7Z0JBQ3ZCLFFBQVE7Z0JBQ1IsUUFBUSxDQUFDLElBQUk7Z0JBQ2IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUM7Z0JBQ3BDLEVBQUU7YUFDRjtTQUNELEVBQ0QsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUE7WUFDM0MsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRWhELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sRUFDTixzQkFBc0I7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsc0JBQXNCO2dCQUN0QixrQkFBa0I7Z0JBQ2xCLHNCQUFzQjtnQkFDdEIsYUFBYSxDQUNkLENBQUE7UUFDRixDQUFDLEVBQ0Qsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsU0FBUyxrQkFBa0IsQ0FBQyxXQUE0QjtJQUN2RCxPQUFPO1FBQ04sZUFBZSxFQUFFLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0QsdUJBQXVCLEVBQUUsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztRQUMvQyxtQkFBbUIsRUFBRSxXQUFXO1FBQ2hDLGtCQUFrQixFQUFFLFdBQVc7S0FDTSxDQUFBO0FBQ3ZDLENBQUMifQ==