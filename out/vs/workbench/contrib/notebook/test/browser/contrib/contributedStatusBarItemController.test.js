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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRTdGF0dXNCYXJJdGVtQ29udHJvbGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvY29udHJpYnV0ZWRTdGF0dXNCYXJJdGVtQ29udHJvbGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQTtBQUNqSSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFzQyxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTNELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUU3QyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSztRQUNoQyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFB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