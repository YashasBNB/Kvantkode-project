/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { bufferToStream, VSBuffer, } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { CellKind, NotebookSetting, } from '../../common/notebookCommon.js';
import { NotebookFileWorkingCopyModel } from '../../common/notebookEditorModel.js';
import { SimpleNotebookProviderInfo, } from '../../common/notebookService.js';
import { setupInstantiationService } from './testNotebookEditor.js';
suite('NotebookFileWorkingCopyModel', function () {
    let disposables;
    let instantiationService;
    const configurationService = new TestConfigurationService();
    const telemetryService = new (class extends mock() {
        publicLogError2() { }
    })();
    const logservice = new (class extends mock() {
    })();
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
    });
    test('no transient output is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [
            {
                cellKind: CellKind.Code,
                language: 'foo',
                mime: 'foo',
                source: 'foo',
                outputs: [
                    {
                        outputId: 'id',
                        outputs: [{ mime: Mimes.text, data: VSBuffer.fromString('Hello Out') }],
                    },
                ],
            },
        ], {}, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
            transientOutputs: false,
        });
        {
            // transient output
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: true,
                        transientCellMetadata: {},
                        transientDocumentMetadata: {},
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells.length, 1);
                    assert.strictEqual(notebook.cells[0].outputs.length, 0);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        {
            // NOT transient output
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: false,
                        transientCellMetadata: {},
                        transientDocumentMetadata: {},
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells.length, 1);
                    assert.strictEqual(notebook.cells[0].outputs.length, 1);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('no transient metadata is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [{ cellKind: CellKind.Code, language: 'foo', mime: 'foo', source: 'foo', outputs: [] }], { foo: 123, bar: 456 }, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
            transientOutputs: false,
        });
        disposables.add(notebook);
        {
            // transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: true,
                        transientCellMetadata: {},
                        transientDocumentMetadata: { bar: true },
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.metadata.foo, 123);
                    assert.strictEqual(notebook.metadata.bar, undefined);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        {
            // NOT transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: false,
                        transientCellMetadata: {},
                        transientDocumentMetadata: {},
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.metadata.foo, 123);
                    assert.strictEqual(notebook.metadata.bar, 456);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('no transient cell metadata is send to serializer', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [
            {
                cellKind: CellKind.Code,
                language: 'foo',
                mime: 'foo',
                source: 'foo',
                outputs: [],
                metadata: { foo: 123, bar: 456 },
            },
        ], {}, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
            transientOutputs: false,
        });
        disposables.add(notebook);
        {
            // transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: true,
                        transientDocumentMetadata: {},
                        transientCellMetadata: { bar: true },
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                    assert.strictEqual(notebook.cells[0].metadata.bar, undefined);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
        {
            // NOT transient
            let callCount = 0;
            const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.options = {
                        transientOutputs: false,
                        transientCellMetadata: {},
                        transientDocumentMetadata: {},
                        cellContentMetadata: {},
                    };
                }
                async notebookToData(notebook) {
                    callCount += 1;
                    assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                    assert.strictEqual(notebook.cells[0].metadata.bar, 456);
                    return VSBuffer.fromString('');
                }
            })()), configurationService, telemetryService, logservice));
            await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
            assert.strictEqual(callCount, 1);
        }
    });
    test('Notebooks with outputs beyond the size threshold will throw for backup snapshots', async function () {
        const outputLimit = 100;
        await configurationService.setUserConfiguration(NotebookSetting.outputBackupSizeLimit, (outputLimit * 1.0) / 1024);
        const largeOutput = {
            outputId: '123',
            outputs: [{ mime: Mimes.text, data: VSBuffer.fromString('a'.repeat(outputLimit + 1)) }],
        };
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [
            {
                cellKind: CellKind.Code,
                language: 'foo',
                mime: 'foo',
                source: 'foo',
                outputs: [largeOutput],
                metadata: { foo: 123, bar: 456 },
            },
        ], {}, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
            transientOutputs: false,
        });
        disposables.add(notebook);
        let callCount = 0;
        const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, mockNotebookService(notebook, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.options = {
                    transientOutputs: true,
                    transientDocumentMetadata: {},
                    transientCellMetadata: { bar: true },
                    cellContentMetadata: {},
                };
            }
            async notebookToData(notebook) {
                callCount += 1;
                assert.strictEqual(notebook.cells[0].metadata.foo, 123);
                assert.strictEqual(notebook.cells[0].metadata.bar, undefined);
                return VSBuffer.fromString('');
            }
        })(), configurationService), configurationService, telemetryService, logservice));
        try {
            await model.snapshot(2 /* SnapshotContext.Backup */, CancellationToken.None);
            assert.fail('Expected snapshot to throw an error for large output');
        }
        catch (e) {
            assert.notEqual(e.code, 'ERR_ASSERTION', e.message);
        }
        await model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
        assert.strictEqual(callCount, 1);
    });
    test('Notebook model will not return a save delegate if the serializer has not been retreived', async function () {
        const notebook = instantiationService.createInstance(NotebookTextModel, 'notebook', URI.file('test'), [
            {
                cellKind: CellKind.Code,
                language: 'foo',
                mime: 'foo',
                source: 'foo',
                outputs: [],
                metadata: { foo: 123, bar: 456 },
            },
        ], {}, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
            transientOutputs: false,
        });
        disposables.add(notebook);
        const serializer = new (class extends mock() {
            save() {
                return Promise.resolve({ name: 'savedFile' });
            }
        })();
        serializer.test = 'yes';
        let resolveSerializer = () => { };
        const serializerPromise = new Promise((resolve) => {
            resolveSerializer = resolve;
        });
        const notebookService = mockNotebookService(notebook, serializerPromise);
        configurationService.setUserConfiguration(NotebookSetting.remoteSaving, true);
        const model = disposables.add(new NotebookFileWorkingCopyModel(notebook, notebookService, configurationService, telemetryService, logservice));
        // the save method should not be set if the serializer is not yet resolved
        const notExist = model.save;
        assert.strictEqual(notExist, undefined);
        resolveSerializer(serializer);
        await model.getNotebookSerializer();
        const result = await model.save?.({}, {});
        assert.strictEqual(result.name, 'savedFile');
    });
});
function mockNotebookService(notebook, notebookSerializer, configurationService = new TestConfigurationService()) {
    return new (class extends mock() {
        constructor() {
            super(...arguments);
            this.serializer = undefined;
        }
        async withNotebookDataProvider(viewType) {
            this.serializer = await notebookSerializer;
            return new SimpleNotebookProviderInfo(notebook.viewType, this.serializer, {
                id: new ExtensionIdentifier('test'),
                location: undefined,
            });
        }
        tryGetDataProviderSync(viewType) {
            if (!this.serializer) {
                return undefined;
            }
            return new SimpleNotebookProviderInfo(notebook.viewType, this.serializer, {
                id: new ExtensionIdentifier('test'),
                location: undefined,
            });
        }
        async createNotebookTextDocumentSnapshot(uri, context, token) {
            const info = await this.withNotebookDataProvider(notebook.viewType);
            const serializer = info.serializer;
            const outputSizeLimit = configurationService.getValue(NotebookSetting.outputBackupSizeLimit) ?? 1024;
            const data = notebook.createSnapshot({
                context: context,
                outputSizeLimit: outputSizeLimit,
                transientOptions: serializer.options,
            });
            const bytes = await serializer.notebookToData(data);
            return bufferToStream(bytes);
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rRWRpdG9yTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGNBQWMsRUFDZCxRQUFRLEdBRVIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFLN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUNOLFFBQVEsRUFHUixlQUFlLEdBRWYsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRixPQUFPLEVBR04sMEJBQTBCLEdBQzFCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENB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