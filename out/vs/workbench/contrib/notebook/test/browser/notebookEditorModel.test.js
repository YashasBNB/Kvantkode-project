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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tFZGl0b3JNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sY0FBYyxFQUNkLFFBQVEsR0FFUixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUs3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sUUFBUSxFQUdSLGVBQWUsR0FFZixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xGLE9BQU8sRUFHTiwwQkFBMEIsR0FDMUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFB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