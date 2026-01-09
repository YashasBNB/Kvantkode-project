/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ContributedStatusBarItemController } from '../../../browser/contrib/cellStatusBar/contributedStatusBarItemController.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { withTestNotebook } from '../testNotebookEditor.js';
suite('Notebook Statusbar', () => {
    const testDisposables = new DisposableStore();
    teardown(() => {
        testDisposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Calls item provider', async function () {
        await withTestNotebook([
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header a', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const cellStatusbarSvc = accessor.get(INotebookCellStatusBarService);
            testDisposables.add(accessor.createInstance(ContributedStatusBarItemController, editor));
            const provider = testDisposables.add(new (class extends Disposable {
                constructor() {
                    super(...arguments);
                    this.provideCalls = 0;
                    this._onProvideCalled = this._register(new Emitter());
                    this.onProvideCalled = this._onProvideCalled.event;
                    this._onDidChangeStatusBarItems = this._register(new Emitter());
                    this.onDidChangeStatusBarItems = this._onDidChangeStatusBarItems.event;
                    this.viewType = editor.textModel.viewType;
                }
                async provideCellStatusBarItems(_uri, index, _token) {
                    if (index === 0) {
                        this.provideCalls++;
                        this._onProvideCalled.fire(this.provideCalls);
                    }
                    return { items: [] };
                }
            })());
            const providePromise1 = asPromise(provider.onProvideCalled, 'registering provider');
            testDisposables.add(cellStatusbarSvc.registerCellStatusBarItemProvider(provider));
            assert.strictEqual(await providePromise1, 1, 'should call provider on registration');
            const providePromise2 = asPromise(provider.onProvideCalled, 'updating metadata');
            const cell0 = editor.textModel.cells[0];
            cell0.metadata = { ...cell0.metadata, ...{ newMetadata: true } };
            assert.strictEqual(await providePromise2, 2, 'should call provider on updating metadata');
            const providePromise3 = asPromise(provider.onProvideCalled, 'changing cell language');
            cell0.language = 'newlanguage';
            assert.strictEqual(await providePromise3, 3, 'should call provider on changing language');
            const providePromise4 = asPromise(provider.onProvideCalled, 'manually firing change event');
            provider._onDidChangeStatusBarItems.fire();
            assert.strictEqual(await providePromise4, 4, 'should call provider on manually firing change event');
        });
    });
});
async function asPromise(event, message) {
    const error = new Error('asPromise TIMEOUT reached: ' + message);
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            sub.dispose();
            reject(error);
        }, 1000);
        const sub = event((e) => {
            clearTimeout(handle);
            sub.dispose();
            resolve(e);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRTdGF0dXNCYXJJdGVtQ29udHJvbGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9jb250cmlidXRlZFN0YXR1c0Jhckl0ZW1Db250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXhGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQ2pJLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQXNDLE1BQU0sbUNBQW1DLENBQUE7QUFDaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFM0QsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRTdDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDeEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLO1FBQ2hDLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1lBQ3BFLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBRXhGLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQ25DLElBQUksQ0FBQyxLQUFNLFNBQVEsVUFBVTtnQkFBeEI7O29CQUNJLGlCQUFZLEdBQUcsQ0FBQyxDQUFBO29CQUVoQixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtvQkFDekQsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO29CQUU3QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtvQkFDaEUsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtvQkFXeEUsYUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFBO2dCQUNyQyxDQUFDO2dCQVZBLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxJQUFTLEVBQUUsS0FBYSxFQUFFLE1BQXlCO29CQUNsRixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDakIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO3dCQUNuQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDOUMsQ0FBQztvQkFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFBO2dCQUNyQixDQUFDO2FBR0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtZQUNELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUE7WUFDbkYsZUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxlQUFlLEVBQUUsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUE7WUFFcEYsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtZQUNoRixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QyxLQUFLLENBQUMsUUFBUSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQTtZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFBO1lBRXpGLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHdCQUF3QixDQUFDLENBQUE7WUFDckYsS0FBSyxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUE7WUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLGVBQWUsRUFBRSxDQUFDLEVBQUUsMkNBQTJDLENBQUMsQ0FBQTtZQUV6RixNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQyxDQUFBO1lBQzNGLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLGVBQWUsRUFDckIsQ0FBQyxFQUNELHNEQUFzRCxDQUN0RCxDQUFBO1FBQ0YsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxVQUFVLFNBQVMsQ0FBSSxLQUFlLEVBQUUsT0FBZTtJQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxPQUFPLENBQUMsQ0FBQTtJQUNoRSxPQUFPLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDOUIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2IsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2QsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRVIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdkIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3BCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNiLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDIn0=