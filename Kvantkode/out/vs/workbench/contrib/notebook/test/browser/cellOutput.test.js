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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY2VsbE91dHB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHaEYsT0FBTyxFQUFFLFFBQVEsRUFBcUMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDeEIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUN2RCxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksV0FBVyxHQUFZLEVBQUUsQ0FBQTtJQUU3QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLEVBQUUsQ0FBQTtRQUNoQixvQkFBb0IsR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2RCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLGdCQUFnQixFQUNoQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBb0I7WUFDakMscUJBQXFCLENBQzdCLFVBQWUsRUFDZixlQUE4QyxFQUM5QyxNQUFrQjtnQkFFbEIsT0FBTztvQkFDTjt3QkFDQyxVQUFVLEVBQUUscUJBQXFCO3dCQUNqQyxRQUFRLEVBQUUsWUFBWTt3QkFDdEIsU0FBUyxFQUFFLElBQUk7cUJBQ2Y7b0JBQ0Q7d0JBQ0MsVUFBVSxFQUFFLGdCQUFnQjt3QkFDNUIsUUFBUSxFQUFFLFdBQVc7d0JBQ3JCLFNBQVMsRUFBRSxJQUFJO3FCQUNmO29CQUNEO3dCQUNDLFVBQVUsRUFBRSxpQkFBaUI7d0JBQzdCLFFBQVEsRUFBRSxxQ0FBcUM7d0JBQy9DLFNBQVMsRUFBRSxJQUFJO3FCQUNmO29CQUNEO3dCQUNDLFVBQVUsRUFBRSxrQkFBa0I7d0JBQzlCLFFBQVEsRUFBRSxzQ0FBc0M7d0JBQ2hELFNBQVMsRUFBRSxJQUFJO3FCQUNmO29CQUNEO3dCQUNDLFVBQVUsRUFBRSxrQkFBa0I7d0JBQzlCLFFBQVEsRUFBRSxzQ0FBc0M7d0JBQ2hELFNBQVMsRUFBRSxJQUFJO3FCQUNmO2lCQUNELENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUNuRixDQUFDO1lBQ1EsZUFBZTtnQkFDdkIsT0FBTztvQkFDTixFQUFFLEVBQUUsWUFBWTtvQkFDaEIsV0FBVyxFQUFFLGtCQUFrQjtvQkFDL0IsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO2lCQUNqQixDQUFBO1lBQzNCLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixZQUFZLEVBQ1osSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWdCO1lBQzdCLFVBQVU7Z0JBQ2xCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFTO29CQUEzQjs7d0JBQ1IsZ0JBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO29CQU9sQyxDQUFDO29CQU5TLFVBQVU7d0JBQ2xCLE9BQU8sRUFBRSxDQUFBO29CQUNWLENBQUM7b0JBQ1EsT0FBTzt3QkFDZixXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFBO29CQUMxRCxDQUFDO2lCQUNELENBQUMsRUFBRSxDQUFBO2dCQUNKLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtREFBbUQsRUFBRSxLQUFLO1FBQzlELE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDdEYsTUFBTSxjQUFjLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUN6RixNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUE7UUFDdEYsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFBO1FBRXRGLE1BQU0sZ0JBQWdCLENBQ3JCLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUM1RSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzVDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFzQixDQUFBO1lBQ3hELE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdCLFFBQVEsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtZQUNELE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1lBQ3ZFLE1BQU0sQ0FDTCxZQUFZLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFDN0Qsb0NBQW9DLENBQ3BDLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtZQUN2RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsa0NBQWtDLENBQUMsQ0FBQTtRQUM5RSxDQUFDLEVBQ0Qsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLO1FBQ3BELE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDdEYsTUFBTSxjQUFjLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUN6RixNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUE7UUFDdEYsTUFBTSxPQUFPLEdBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFBO1FBQ3RGLE1BQU0sT0FBTyxHQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQTtRQUV0RixNQUFNLGdCQUFnQixDQUNyQixDQUFDLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ3JGLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUE7WUFDeEQsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUN4RixDQUFBO1lBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQ0wsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQzdELG9DQUFvQyxDQUNwQyxDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3hFLENBQUMsRUFDRCxvQkFBb0IsQ0FDcEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xELE1BQU0sTUFBTSxHQUFHO1lBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ25DLElBQUksRUFBRSxzQ0FBc0M7U0FDNUMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHO1lBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ25DLElBQUksRUFBRSxzQ0FBc0M7U0FDNUMsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFBO1FBQ2xFLE1BQU0sT0FBTyxHQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFBO1FBRWxFLE1BQU0sZ0JBQWdCLENBQ3JCLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUM1RSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUN0QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25DLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUMzQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDM0MsQ0FBQyxFQUNELG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUc7WUFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFDbkMsSUFBSSxFQUFFLHNDQUFzQztTQUM1QyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUc7WUFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFDbkMsSUFBSSxFQUFFLHNDQUFzQztTQUM1QyxDQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQTtRQUNyRixNQUFNLEtBQUssR0FBRztZQUNiLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUN4Qix1RUFBdUUsQ0FDdkU7WUFDRCxJQUFJLEVBQUUscUNBQXFDO1NBQzNDLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUNsRSxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUNsRSxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQTtRQUNyRSxNQUFNLE9BQU8sR0FBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQTtRQUVqRSxNQUFNLGdCQUFnQixDQUNyQjtZQUNDO2dCQUNDLHVCQUF1QjtnQkFDdkIsUUFBUTtnQkFDUixRQUFRLENBQUMsSUFBSTtnQkFDYixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQztnQkFDcEMsRUFBRTthQUNGO1NBQ0QsRUFDRCxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUN0QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25DLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUMzQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLHNCQUFzQjtnQkFDckIsZ0JBQWdCO2dCQUNoQixzQkFBc0I7Z0JBQ3RCLGtCQUFrQjtnQkFDbEIsc0JBQXNCO2dCQUN0QixhQUFhLENBQ2QsQ0FBQTtRQUNGLENBQUMsRUFDRCxvQkFBb0IsQ0FDcEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixTQUFTLGtCQUFrQixDQUFDLFdBQTRCO0lBQ3ZELE9BQU87UUFDTixlQUFlLEVBQUUsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvRCx1QkFBdUIsRUFBRSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO1FBQy9DLG1CQUFtQixFQUFFLFdBQVc7UUFDaEMsa0JBQWtCLEVBQUUsV0FBVztLQUNNLENBQUE7QUFDdkMsQ0FBQyJ9