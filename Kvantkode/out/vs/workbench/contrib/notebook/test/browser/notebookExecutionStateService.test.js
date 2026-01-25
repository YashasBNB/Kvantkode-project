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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rRXhlY3V0aW9uU3RhdGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzNHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRzNGLE9BQU8sRUFFTixRQUFRLEVBQ1IsT0FBTyxFQUdQLHNCQUFzQixHQUN0QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIseUJBQXlCLEdBQ3pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEUsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixnQkFBZ0IsSUFBSSxpQkFBaUIsR0FDckMsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzNDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxhQUFxQyxDQUFBO0lBQ3pDLElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLGlCQUFnRCxDQUFBO0lBRXBELFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQztRQUNMLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRW5DLG9CQUFvQixHQUFHLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTdELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFvQjtZQUF0Qzs7Z0JBQ0ssNkJBQXdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtnQkFDckMsaUNBQTRCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQU9uRCxDQUFDO1lBTlMscUJBQXFCO2dCQUM3QixPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFDUSxvQkFBb0IsQ0FBQyxHQUFRO2dCQUNyQyxPQUFPLGlCQUFpQixDQUFBO1lBQ3pCLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBRUQsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixZQUFZLEVBQ1osSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWdCO1lBQzdCLFVBQVU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQVM7b0JBQTNCOzt3QkFDRixnQkFBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7b0JBS2xDLENBQUM7b0JBSlMsVUFBVTt3QkFDbEIsT0FBTyxFQUFFLENBQUE7b0JBQ1YsQ0FBQztvQkFDUSxPQUFPLEtBQUksQ0FBQztpQkFDckIsQ0FBQyxFQUFFLENBQUE7WUFDTCxDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsdUJBQXVCLEVBQ3ZCLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUEyQjtZQUN4QyxLQUFLLENBQUMsUUFBZ0IsRUFBRSxNQUFjO2dCQUM5QyxFQUFFO1lBQ0gsQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7UUFFRCxhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzNGLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUMvRCxvQkFBb0IsQ0FBQyxHQUFHLENBQ3ZCLHlCQUF5QixFQUN6QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQzlFLENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxHQUFHLENBQ3ZCLDhCQUE4QixFQUM5QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQ25GLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxnQkFBZ0IsQ0FDOUIsS0FBdUUsRUFDdkUsUUFJeUI7UUFFekIsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FDckQsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQzVELENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxlQUF1QixFQUFFLG1CQUE0QjtRQUNoRixPQUFPLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUN2RSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUE7WUFFOUMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxrQkFBa0I7Z0JBR25EO29CQUNDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFIckMsd0JBQW1CLEdBQUcsbUJBQW1CLENBQUE7Z0JBSXpDLENBQUM7Z0JBRVEsS0FBSyxDQUFDLDJCQUEyQixLQUFtQixDQUFDO2dCQUVyRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsSUFBUyxFQUFFLE9BQWlCO29CQUN0RSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQTtnQkFDMUIsQ0FBQzthQUNELENBQUMsRUFBRSxDQUFBO1lBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBRUQsc0ZBQXNGO1lBQ3RGLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLGlCQUFpQixDQUNoQixTQUFTLEVBQ1QsQ0FBQyxFQUNELFdBQVcsRUFDWCxZQUFZLEVBQ1osUUFBUSxDQUFDLElBQUksRUFDYixFQUFFLEVBQ0YsRUFBRSxFQUNGLElBQUksRUFDSixJQUFJLENBQ0osQ0FDRCxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsaUJBQWlCLENBQ2hCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUNELENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixpQkFBaUIsQ0FDaEIsU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxFQUNGLEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBLENBQUMsY0FBYztZQUM1RyxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLFlBQVk7WUFDOUYsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUMsVUFBVTtZQUM5RixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZCxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLGNBQWM7WUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDOUIsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDcEM7Z0JBQ0M7b0JBQ0MsUUFBUSw4QkFBc0I7b0JBQzlCLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsS0FBSyxDQUNMLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCwwR0FBMEc7SUFDMUcsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUs7UUFDbEQsT0FBTyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSztRQUMzRSxPQUFPLGtCQUFrQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxRUFBcUUsRUFBRSxLQUFLO1FBQ2hGLE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUU5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDckQsYUFBYSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUV6RSxNQUFNLHFCQUFxQixHQUFtQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3JGLDhCQUE4QixDQUM5QixDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQzdCLFNBQVMsRUFDVCxDQUFDLEVBQ0QsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixFQUFFLEVBQ0YsSUFBSSxFQUNKLElBQUksQ0FDSixDQUFBO1lBQ0QsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFakYsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQ25CLFdBQVcsQ0FBQyxHQUFHLENBQ2QscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO29CQUMzQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQ3BDO2dCQUNDO29CQUNDLFFBQVEsOEJBQXNCO29CQUM5QixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsRUFBRTtpQkFDVDthQUNELEVBQ0QsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULEtBQUssQ0FDTCxDQUFBO1lBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUs7UUFDdEUsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixpQkFBaUIsQ0FDaEIsU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxFQUNGLEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRWpGLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNuQixXQUFXLENBQUMsR0FBRyxDQUNkLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDM0MsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDZixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2xDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNqQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2pCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixVQUFVO0lBQ1YsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUs7UUFDMUQsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixpQkFBaUIsQ0FDaEIsU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxFQUNGLEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUVELE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7WUFDNUMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNoRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzNDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQzFELE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUMzRCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO29CQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtvQkFFekQsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXJFLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUs7UUFDbEQsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0sd0JBQXdCLEdBQWMsRUFBRSxDQUFBO1lBQzlDLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUN4RixJQUFJLEVBQ0osV0FBVyxDQUNYLENBQUE7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1lBQzVDLFdBQVcsQ0FBQyxHQUFHLENBQ2QscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMvQyxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7b0JBQ3hELFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXBELE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUs7UUFDcEQsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1lBQzVDLE1BQU0sMkJBQTJCLEdBQTJDO2dCQUMzRSxzQkFBc0IsQ0FBQyxXQUFXO2dCQUNsQyxzQkFBc0IsQ0FBQyxPQUFPO2dCQUM5QixzQkFBc0IsQ0FBQyxTQUFTO2dCQUNoQyxTQUFTO2FBQ1QsQ0FBQTtZQUNELHFCQUFxQixDQUFDLG9CQUFvQixDQUN6QyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNMLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDL0MsTUFBTSxhQUFhLEdBQUcsMkJBQTJCLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3pELElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQ3ZDLE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTt3QkFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTtvQkFDcEQsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQTtvQkFDbkMsQ0FBQztvQkFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLElBQUksMkJBQTJCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUM5QyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7b0JBQ3BCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsRUFDRCxJQUFJLEVBQ0osV0FBVyxDQUNYLENBQUE7WUFFRCxNQUFNLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RFLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDakIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBRXBCLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUs7UUFDbEQsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixpQkFBaUIsQ0FDaEIsU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxFQUNGLEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3JFLE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRWQscUJBQXFCLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUs7UUFDdEQsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sd0JBQXdCLEdBQWMsRUFBRSxDQUFBO1lBRTlDLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUN4RixJQUFJLEVBQ0osV0FBVyxDQUNYLENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNkLE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRXhELHFCQUFxQixDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUs7UUFDL0QsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtZQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxhQUFhLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRXpFLE1BQU0scUJBQXFCLEdBQW1DLG9CQUFvQixDQUFDLEdBQUcsQ0FDckYsOEJBQThCLENBQzlCLENBQUE7WUFDRCxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BELHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEQsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNqRSxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUVkLHFCQUFxQixDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxrQkFBa0I7SUFZdkIsS0FBSyxDQUFDLDJCQUEyQixLQUFtQixDQUFDO0lBQ3JELEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxHQUFRLEVBQUUsV0FBcUIsSUFBa0IsQ0FBQztJQUNwRixnQkFBZ0IsQ0FDZixXQUFnQixFQUNoQixRQUE0QixFQUM1QixJQUF5QixFQUN6QixLQUFhLEVBQ2IsS0FBd0I7UUFFeEIsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7SUFDakMsQ0FBQztJQUVELFlBQVksSUFBNEM7UUF2QnhELE9BQUUsR0FBVyxNQUFNLENBQUE7UUFDbkIsVUFBSyxHQUFXLEVBQUUsQ0FBQTtRQUNsQixhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsZ0JBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3hCLGNBQVMsR0FBd0IsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRSxzQkFBaUIsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRzFDLGdCQUFXLEdBQVUsRUFBRSxDQUFBO1FBQ3ZCLG9CQUFlLEdBQWEsRUFBRSxDQUFBO1FBQzlCLHVCQUFrQixHQUFhLEVBQUUsQ0FBQTtRQWNoQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxFQUFFLFNBQVMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDcEUsSUFBSSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9