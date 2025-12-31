/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { IChatAgentService, } from '../../../../chat/common/chatAgents.js';
import { CellDiagnostics } from '../../../browser/contrib/cellDiagnostics/cellDiagnosticEditorContrib.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
import { setupInstantiationService, TestNotebookExecutionStateService, withTestNotebook, } from '../testNotebookEditor.js';
import { nullExtensionDescription } from '../../../../../services/extensions/common/extensions.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
suite('notebookCellDiagnostics', () => {
    let instantiationService;
    let disposables;
    let testExecutionService;
    let markerService;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestExecutionService extends TestNotebookExecutionStateService {
        constructor() {
            super(...arguments);
            this._onDidChangeExecution = new Emitter();
            this.onDidChangeExecution = this._onDidChangeExecution.event;
        }
        fireExecutionChanged(notebook, cellHandle, changed) {
            this._onDidChangeExecution.fire({
                type: NotebookExecutionType.cell,
                cellHandle,
                notebook,
                affectsNotebook: () => true,
                affectsCell: () => true,
                changed: changed,
            });
        }
    }
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        testExecutionService = new TestExecutionService();
        instantiationService.stub(INotebookExecutionStateService, testExecutionService);
        const agentData = {
            extensionId: nullExtensionDescription.identifier,
            extensionDisplayName: '',
            extensionPublisherId: '',
            name: 'testEditorAgent',
            isDefault: true,
            locations: [ChatAgentLocation.Notebook],
            metadata: {},
            slashCommands: [],
            disambiguation: [],
        };
        const chatAgentService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeAgents = Event.None;
            }
            getAgents() {
                return [
                    {
                        id: 'testEditorAgent',
                        ...agentData,
                    },
                ];
            }
        })();
        instantiationService.stub(IChatAgentService, chatAgentService);
        markerService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this._onMarkersUpdated = new Emitter();
                this.onMarkersUpdated = this._onMarkersUpdated.event;
                this.markers = new ResourceMap();
            }
            changeOne(owner, resource, markers) {
                this.markers.set(resource, markers);
                this._onMarkersUpdated.fire();
            }
        })();
        instantiationService.stub(IMarkerService, markerService);
        const config = instantiationService.get(IConfigurationService);
        config.setUserConfiguration(NotebookSetting.cellFailureDiagnostics, true);
    });
    test('diagnostic is added for cell execution failure', async function () {
        await withTestNotebook([['print(x)', 'python', CellKind.Code, [], {}]], async (editor, viewModel, store, accessor) => {
            const cell = viewModel.viewCells[0];
            disposables.add(instantiationService.createInstance(CellDiagnostics, editor));
            cell.model.internalMetadata.lastRunSuccess = false;
            cell.model.internalMetadata.error = {
                name: 'error',
                message: 'something bad happened',
                stack: 'line 1 : print(x)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 },
            };
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle);
            await new Promise((resolve) => Event.once(markerService.onMarkersUpdated)(resolve));
            assert.strictEqual(cell?.executionErrorDiagnostic.get()?.message, 'something bad happened');
            assert.equal(markerService.markers.get(cell.uri)?.length, 1);
        }, instantiationService);
    });
    test('diagnostics are cleared only for cell with new execution', async function () {
        await withTestNotebook([
            ['print(x)', 'python', CellKind.Code, [], {}],
            ['print(y)', 'python', CellKind.Code, [], {}],
        ], async (editor, viewModel, store, accessor) => {
            const cell = viewModel.viewCells[0];
            const cell2 = viewModel.viewCells[1];
            disposables.add(instantiationService.createInstance(CellDiagnostics, editor));
            cell.model.internalMetadata.lastRunSuccess = false;
            cell.model.internalMetadata.error = {
                name: 'error',
                message: 'something bad happened',
                stack: 'line 1 : print(x)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 },
            };
            cell2.model.internalMetadata.lastRunSuccess = false;
            cell2.model.internalMetadata.error = {
                name: 'error',
                message: 'another bad thing happened',
                stack: 'line 1 : print(y)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 },
            };
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle);
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell2.handle);
            await new Promise((resolve) => Event.once(markerService.onMarkersUpdated)(resolve));
            cell.model.internalMetadata.error = undefined;
            // on NotebookCellExecution value will make it look like its currently running
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle, {});
            await new Promise((resolve) => Event.once(markerService.onMarkersUpdated)(resolve));
            assert.strictEqual(cell?.executionErrorDiagnostic.get(), undefined);
            assert.strictEqual(cell2?.executionErrorDiagnostic.get()?.message, 'another bad thing happened', 'cell that was not executed should still have an error');
            assert.equal(markerService.markers.get(cell.uri)?.length, 0);
            assert.equal(markerService.markers.get(cell2.uri)?.length, 1);
        }, instantiationService);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRGlhZ25vc3RpY3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL25vdGVib29rQ2VsbERpYWdub3N0aWNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFHeEcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2xHLE9BQU8sRUFHTixpQkFBaUIsR0FDakIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBSU4sOEJBQThCLEVBQzlCLHFCQUFxQixHQUNyQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTix5QkFBeUIsRUFDekIsaUNBQWlDLEVBQ2pDLGdCQUFnQixHQUNoQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFN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