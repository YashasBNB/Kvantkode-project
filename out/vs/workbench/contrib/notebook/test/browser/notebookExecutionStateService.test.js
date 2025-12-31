/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableObject, DeferredPromise } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { insertCellAtIndex } from '../../browser/controller/cellOperations.js';
import { NotebookExecutionService } from '../../browser/services/notebookExecutionServiceImpl.js';
import { NotebookExecutionStateService } from '../../browser/services/notebookExecutionStateServiceImpl.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { CellKind, CellUri, NotebookExecutionState, } from '../../common/notebookCommon.js';
import { CellExecutionUpdateType, INotebookExecutionService, } from '../../common/notebookExecutionService.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService, } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { INotebookService } from '../../common/notebookService.js';
import { setupInstantiationService, withTestNotebook as _withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookExecutionStateService', () => {
    let instantiationService;
    let kernelService;
    let disposables;
    let testNotebookModel;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(INotebookService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookDocument = Event.None;
                this.onWillRemoveNotebookDocument = Event.None;
            }
            getNotebookTextModels() {
                return [];
            }
            getNotebookTextModel(uri) {
                return testNotebookModel;
            }
        })());
        instantiationService.stub(IMenuService, new (class extends mock() {
            createMenu() {
                return new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() {
                        return [];
                    }
                    dispose() { }
                })();
            }
        })());
        instantiationService.stub(INotebookLoggingService, new (class extends mock() {
            debug(category, output) {
                //
            }
        })());
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
        instantiationService.set(INotebookExecutionService, disposables.add(instantiationService.createInstance(NotebookExecutionService)));
        instantiationService.set(INotebookExecutionStateService, disposables.add(instantiationService.createInstance(NotebookExecutionStateService)));
    });
    async function withTestNotebook(cells, callback) {
        return _withTestNotebook(cells, (editor, viewModel) => callback(viewModel, viewModel.notebookDocument, disposables));
    }
    function testCancelOnDelete(expectedCancels, implementsInterrupt) {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            let cancels = 0;
            const kernel = new (class extends TestNotebookKernel {
                constructor() {
                    super({ languages: ['javascript'] });
                    this.implementsInterrupt = implementsInterrupt;
                }
                async executeNotebookCellsRequest() { }
                async cancelNotebookCellExecution(_uri, handles) {
                    cancels += handles.length;
                }
            })();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            // Should cancel executing and pending cells, when kernel does not implement interrupt
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const cell2 = disposables.add(insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const cell3 = disposables.add(insertCellAtIndex(viewModel, 2, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            insertCellAtIndex(viewModel, 3, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true); // Not deleted
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle); // Executing
            exe.confirm();
            exe.update([{ editType: CellExecutionUpdateType.ExecutionState, executionOrder: 1 }]);
            const exe2 = executionStateService.createCellExecution(viewModel.uri, cell2.handle); // Pending
            exe2.confirm();
            executionStateService.createCellExecution(viewModel.uri, cell3.handle); // Unconfirmed
            assert.strictEqual(cancels, 0);
            viewModel.notebookDocument.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 3,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, false);
            assert.strictEqual(cancels, expectedCancels);
        });
    }
    // TODO@roblou Could be a test just for NotebookExecutionListeners, which can be a standalone contribution
    test('cancel execution when cell is deleted', async function () {
        return testCancelOnDelete(3, false);
    });
    test('cancel execution when cell is deleted in interrupt-type kernel', async function () {
        return testCancelOnDelete(1, true);
    });
    test('fires onDidChangeCellExecution when cell is completed while deleted', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true);
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle);
            let didFire = false;
            disposables.add(executionStateService.onDidChangeExecution((e) => {
                if (e.type === NotebookExecutionType.cell) {
                    didFire = !e.changed;
                }
            }));
            viewModel.notebookDocument.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 1,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, false);
            exe.complete({});
            assert.strictEqual(didFire, true);
        });
    });
    test('does not fire onDidChangeCellExecution for output updates', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle);
            let didFire = false;
            disposables.add(executionStateService.onDidChangeExecution((e) => {
                if (e.type === NotebookExecutionType.cell) {
                    didFire = true;
                }
            }));
            exe.update([{ editType: CellExecutionUpdateType.OutputItems, items: [], outputId: '1' }]);
            assert.strictEqual(didFire, false);
            exe.update([{ editType: CellExecutionUpdateType.ExecutionState, executionOrder: 123 }]);
            assert.strictEqual(didFire, true);
            exe.complete({});
        });
    });
    // #142466
    test('getCellExecution and onDidChangeCellExecution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const deferred = new DeferredPromise();
            disposables.add(executionStateService.onDidChangeExecution((e) => {
                if (e.type === NotebookExecutionType.cell) {
                    const cellUri = CellUri.generate(e.notebook, e.cellHandle);
                    const exe = executionStateService.getCellExecution(cellUri);
                    assert.ok(exe);
                    assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                    assert.strictEqual(e.cellHandle, exe.cellHandle);
                    assert.strictEqual(exe.notebook.toString(), e.changed?.notebook.toString());
                    assert.strictEqual(exe.cellHandle, e.changed?.cellHandle);
                    deferred.complete();
                }
            }));
            executionStateService.createCellExecution(viewModel.uri, cell.handle);
            return deferred.p;
        });
    });
    test('getExecution and onDidChangeExecution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const eventRaisedWithExecution = [];
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.onDidChangeExecution((e) => eventRaisedWithExecution.push(e.type === NotebookExecutionType.notebook && !!e.changed), this, disposables);
            const deferred = new DeferredPromise();
            disposables.add(executionStateService.onDidChangeExecution((e) => {
                if (e.type === NotebookExecutionType.notebook) {
                    const exe = executionStateService.getExecution(viewModel.uri);
                    assert.ok(exe);
                    assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                    assert.ok(e.affectsNotebook(viewModel.uri));
                    assert.deepStrictEqual(eventRaisedWithExecution, [true]);
                    deferred.complete();
                }
            }));
            executionStateService.createExecution(viewModel.uri);
            return deferred.p;
        });
    });
    test('getExecution and onDidChangeExecution 2', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const deferred = new DeferredPromise();
            const expectedNotebookEventStates = [
                NotebookExecutionState.Unconfirmed,
                NotebookExecutionState.Pending,
                NotebookExecutionState.Executing,
                undefined,
            ];
            executionStateService.onDidChangeExecution((e) => {
                if (e.type === NotebookExecutionType.notebook) {
                    const expectedState = expectedNotebookEventStates.shift();
                    if (typeof expectedState === 'number') {
                        const exe = executionStateService.getExecution(viewModel.uri);
                        assert.ok(exe);
                        assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                        assert.strictEqual(e.changed?.state, expectedState);
                    }
                    else {
                        assert.ok(e.changed === undefined);
                    }
                    assert.ok(e.affectsNotebook(viewModel.uri));
                    if (expectedNotebookEventStates.length === 0) {
                        deferred.complete();
                    }
                }
            }, this, disposables);
            const execution = executionStateService.createExecution(viewModel.uri);
            execution.confirm();
            execution.begin();
            execution.complete();
            return deferred.p;
        });
    });
    test('force-cancel works for Cell Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            executionStateService.createCellExecution(viewModel.uri, cell.handle);
            const exe = executionStateService.getCellExecution(cell.uri);
            assert.ok(exe);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const exe2 = executionStateService.getCellExecution(cell.uri);
            assert.strictEqual(exe2, undefined);
        });
    });
    test('force-cancel works for Notebook Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const eventRaisedWithExecution = [];
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.onDidChangeExecution((e) => eventRaisedWithExecution.push(e.type === NotebookExecutionType.notebook && !!e.changed), this, disposables);
            executionStateService.createExecution(viewModel.uri);
            const exe = executionStateService.getExecution(viewModel.uri);
            assert.ok(exe);
            assert.deepStrictEqual(eventRaisedWithExecution, [true]);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const exe2 = executionStateService.getExecution(viewModel.uri);
            assert.deepStrictEqual(eventRaisedWithExecution, [true, false]);
            assert.strictEqual(exe2, undefined);
        });
    });
    test('force-cancel works for Cell and Notebook Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.createExecution(viewModel.uri);
            executionStateService.createExecution(viewModel.uri);
            const cellExe = executionStateService.getExecution(viewModel.uri);
            const exe = executionStateService.getExecution(viewModel.uri);
            assert.ok(cellExe);
            assert.ok(exe);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const cellExe2 = executionStateService.getExecution(viewModel.uri);
            const exe2 = executionStateService.getExecution(viewModel.uri);
            assert.strictEqual(cellExe2, undefined);
            assert.strictEqual(exe2, undefined);
        });
    });
});
class TestNotebookKernel {
    async executeNotebookCellsRequest() { }
    async cancelNotebookCellExecution(uri, cellHandles) { }
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    constructor(opts) {
        this.id = 'test';
        this.label = '';
        this.viewType = '*';
        this.onDidChange = Event.None;
        this.extension = new ExtensionIdentifier('test');
        this.localResourceRoot = URI.file('/test');
        this.preloadUris = [];
        this.preloadProvides = [];
        this.supportedLanguages = [];
        this.supportedLanguages = opts?.languages ?? [PLAINTEXT_LANGUAGE_ID];
        if (opts?.id) {
            this.id = opts?.id;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0V4ZWN1dGlvblN0YXRlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFMUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUMzRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUczRixPQUFPLEVBRU4sUUFBUSxFQUNSLE9BQU8sRUFHUCxzQkFBc0IsR0FDdEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsZ0JBQWdCLElBQUksaUJBQWlCLEdBQ3JDLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUMzQyxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksYUFBcUMsQ0FBQTtJQUN6QyxJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxpQkFBZ0QsQ0FBQTtJQUVwRCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUM7UUFDTCxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUVuQyxvQkFBb0IsR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUU3RCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLGdCQUFnQixFQUNoQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBb0I7WUFBdEM7O2dCQUNLLDZCQUF3QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7Z0JBQ3JDLGlDQUE0QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFPbkQsQ0FBQztZQU5TLHFCQUFxQjtnQkFDN0IsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBQ1Esb0JBQW9CLENBQUMsR0FBUTtnQkFDckMsT0FBTyxpQkFBaUIsQ0FBQTtZQUN6QixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtRQUVELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsWUFBWSxFQUNaLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFnQjtZQUM3QixVQUFVO2dCQUNsQixPQUFPLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFTO29CQUEzQjs7d0JBQ0YsZ0JBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO29CQUtsQyxDQUFDO29CQUpTLFVBQVU7d0JBQ2xCLE9BQU8sRUFBRSxDQUFBO29CQUNWLENBQUM7b0JBQ1EsT0FBTyxLQUFJLENBQUM7aUJBQ3JCLENBQUMsRUFBRSxDQUFBO1lBQ0wsQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLHVCQUF1QixFQUN2QixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBMkI7WUFDeEMsS0FBSyxDQUFDLFFBQWdCLEVBQUUsTUFBYztnQkFDOUMsRUFBRTtZQUNILENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBRUQsYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUMzRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDL0Qsb0JBQW9CLENBQUMsR0FBRyxDQUN2Qix5QkFBeUIsRUFDekIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUM5RSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsR0FBRyxDQUN2Qiw4QkFBOEIsRUFDOUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUNuRixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsZ0JBQWdCLENBQzlCLEtBQXVFLEVBQ3ZFLFFBSXlCO1FBRXpCLE9BQU8saUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQ3JELFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxDQUM1RCxDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsZUFBdUIsRUFBRSxtQkFBNEI7UUFDaEYsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtZQUNmLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsa0JBQWtCO2dCQUduRDtvQkFDQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7b0JBSHJDLHdCQUFtQixHQUFHLG1CQUFtQixDQUFBO2dCQUl6QyxDQUFDO2dCQUVRLEtBQUssQ0FBQywyQkFBMkIsS0FBbUIsQ0FBQztnQkFFckQsS0FBSyxDQUFDLDJCQUEyQixDQUFDLElBQVMsRUFBRSxPQUFpQjtvQkFDdEUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUE7Z0JBQzFCLENBQUM7YUFDRCxDQUFDLEVBQUUsQ0FBQTtZQUNKLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3JELGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFFekUsTUFBTSxxQkFBcUIsR0FBbUMsb0JBQW9CLENBQUMsR0FBRyxDQUNyRiw4QkFBOEIsQ0FDOUIsQ0FBQTtZQUVELHNGQUFzRjtZQUN0RixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixpQkFBaUIsQ0FDaEIsU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxFQUNGLEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLGlCQUFpQixDQUNoQixTQUFTLEVBQ1QsQ0FBQyxFQUNELFdBQVcsRUFDWCxZQUFZLEVBQ1osUUFBUSxDQUFDLElBQUksRUFDYixFQUFFLEVBQ0YsRUFBRSxFQUNGLElBQUksRUFDSixJQUFJLENBQ0osQ0FDRCxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsaUJBQWlCLENBQ2hCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUNELENBQUE7WUFDRCxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQSxDQUFDLGNBQWM7WUFDNUcsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQyxZQUFZO1lBQzlGLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNiLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRixNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLFVBQVU7WUFDOUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2QscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQyxjQUFjO1lBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzlCLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQ3BDO2dCQUNDO29CQUNDLFFBQVEsOEJBQXNCO29CQUM5QixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsRUFBRTtpQkFDVDthQUNELEVBQ0QsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULEtBQUssQ0FDTCxDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsMEdBQTBHO0lBQzFHLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ2xELE9BQU8sa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEtBQUs7UUFDM0UsT0FBTyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUVBQXFFLEVBQUUsS0FBSztRQUNoRixPQUFPLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUN2RSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUE7WUFFOUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFBO1lBQ3ZDLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3JELGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFFekUsTUFBTSxxQkFBcUIsR0FBbUMsb0JBQW9CLENBQUMsR0FBRyxDQUNyRiw4QkFBOEIsQ0FDOUIsQ0FBQTtZQUNELE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUM3QixTQUFTLEVBQ1QsQ0FBQyxFQUNELFdBQVcsRUFDWCxZQUFZLEVBQ1osUUFBUSxDQUFDLElBQUksRUFDYixFQUFFLEVBQ0YsRUFBRSxFQUNGLElBQUksRUFDSixJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRWpGLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNuQixXQUFXLENBQUMsR0FBRyxDQUNkLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDM0MsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtnQkFDckIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxTQUFTLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUNwQztnQkFDQztvQkFDQyxRQUFRLDhCQUFzQjtvQkFDOUIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLEVBQUU7aUJBQ1Q7YUFDRCxFQUNELElBQUksRUFDSixTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUNmLFNBQVMsRUFDVCxLQUFLLENBQ0wsQ0FBQTtZQUNELEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyREFBMkQsRUFBRSxLQUFLO1FBQ3RFLE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsaUJBQWlCLENBQ2hCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUNELENBQUE7WUFDRCxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVqRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDbkIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNoRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzNDLE9BQU8sR0FBRyxJQUFJLENBQUE7Z0JBQ2YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNqQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsVUFBVTtJQUNWLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLO1FBQzFELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsaUJBQWlCLENBQ2hCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUNELENBQUE7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1lBQzVDLFdBQVcsQ0FBQyxHQUFHLENBQ2QscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO29CQUMzQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUMxRCxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO29CQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtvQkFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7b0JBRXpELFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVyRSxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ2xELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHdCQUF3QixHQUFjLEVBQUUsQ0FBQTtZQUM5QyxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QscUJBQXFCLENBQUMsb0JBQW9CLENBQ3pDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDeEYsSUFBSSxFQUNKLFdBQVcsQ0FDWCxDQUFBO1lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQTtZQUM1QyxXQUFXLENBQUMsR0FBRyxDQUNkLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDL0MsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO29CQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO29CQUN4RCxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3BCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQscUJBQXFCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUVwRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLO1FBQ3BELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQTtZQUM1QyxNQUFNLDJCQUEyQixHQUEyQztnQkFDM0Usc0JBQXNCLENBQUMsV0FBVztnQkFDbEMsc0JBQXNCLENBQUMsT0FBTztnQkFDOUIsc0JBQXNCLENBQUMsU0FBUztnQkFDaEMsU0FBUzthQUNULENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDTCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQy9DLE1BQU0sYUFBYSxHQUFHLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFBO29CQUN6RCxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUN2QyxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7d0JBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7b0JBQ3BELENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUE7b0JBQ25DLENBQUM7b0JBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUMzQyxJQUFJLDJCQUEyQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDOUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLEVBQ0QsSUFBSSxFQUNKLFdBQVcsQ0FDWCxDQUFBO1lBRUQsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN0RSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2pCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUVwQixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ2xELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsaUJBQWlCLENBQ2hCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUNELENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNyRSxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUVkLHFCQUFxQixDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLO1FBQ3RELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUN6RSxNQUFNLHdCQUF3QixHQUFjLEVBQUUsQ0FBQTtZQUU5QyxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QscUJBQXFCLENBQUMsb0JBQW9CLENBQ3pDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDeEYsSUFBSSxFQUNKLFdBQVcsQ0FDWCxDQUFBO1lBQ0QscUJBQXFCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwRCxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZCxNQUFNLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUV4RCxxQkFBcUIsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEUsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLO1FBQy9ELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QscUJBQXFCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwRCxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakUsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2xCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFZCxxQkFBcUIsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEUsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sa0JBQWtCO0lBWXZCLEtBQUssQ0FBQywyQkFBMkIsS0FBbUIsQ0FBQztJQUNyRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsR0FBUSxFQUFFLFdBQXFCLElBQWtCLENBQUM7SUFDcEYsZ0JBQWdCLENBQ2YsV0FBZ0IsRUFDaEIsUUFBNEIsRUFDNUIsSUFBeUIsRUFDekIsS0FBYSxFQUNiLEtBQXdCO1FBRXhCLE9BQU8sbUJBQW1CLENBQUMsS0FBSyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxZQUFZLElBQTRDO1FBdkJ4RCxPQUFFLEdBQVcsTUFBTSxDQUFBO1FBQ25CLFVBQUssR0FBVyxFQUFFLENBQUE7UUFDbEIsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLGdCQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUN4QixjQUFTLEdBQXdCLElBQUksbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEUsc0JBQWlCLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUcxQyxnQkFBVyxHQUFVLEVBQUUsQ0FBQTtRQUN2QixvQkFBZSxHQUFhLEVBQUUsQ0FBQTtRQUM5Qix1QkFBa0IsR0FBYSxFQUFFLENBQUE7UUFjaEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3BFLElBQUksSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==