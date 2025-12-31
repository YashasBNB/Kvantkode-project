/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../../../base/common/buffer.js';
import { filter } from '../../../../../../base/common/objects.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NotebookCellTextModel } from '../../../../notebook/common/model/notebookCellTextModel.js';
import { NotebookSetting, } from '../../../../notebook/common/notebookCommon.js';
const BufferMarker = 'ArrayBuffer-4f56482b-5a03-49ba-8356-210d3b0c1c3d';
export const ChatEditingNotebookSnapshotScheme = 'chat-editing-notebook-snapshot-model';
export function getNotebookSnapshotFileURI(chatSessionId, requestId, undoStop, path, viewType) {
    return URI.from({
        scheme: ChatEditingNotebookSnapshotScheme,
        path,
        query: JSON.stringify({
            sessionId: chatSessionId,
            requestId: requestId ?? '',
            undoStop: undoStop ?? '',
            viewType,
        }),
    });
}
export function parseNotebookSnapshotFileURI(resource) {
    const data = JSON.parse(resource.query);
    return {
        sessionId: data.sessionId ?? '',
        requestId: data.requestId ?? '',
        undoStop: data.undoStop ?? '',
        viewType: data.viewType,
    };
}
export function createSnapshot(notebook, transientOptions, outputSizeConfig) {
    const outputSizeLimit = (typeof outputSizeConfig === 'number'
        ? outputSizeConfig
        : outputSizeConfig.getValue(NotebookSetting.outputBackupSizeLimit)) * 1024;
    return serializeSnapshot(notebook.createSnapshot({ context: 2 /* SnapshotContext.Backup */, outputSizeLimit, transientOptions }), transientOptions);
}
export function restoreSnapshot(notebook, snapshot) {
    try {
        const { transientOptions, data } = deserializeSnapshot(snapshot);
        notebook.restoreSnapshot(data, transientOptions);
        const edits = [];
        data.cells.forEach((cell, index) => {
            const internalId = cell.internalMetadata?.internalId;
            if (internalId) {
                edits.push({
                    editType: 9 /* CellEditType.PartialInternalMetadata */,
                    index,
                    internalMetadata: { internalId },
                });
            }
        });
        notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
    }
    catch (ex) {
        console.error('Error restoring Notebook snapshot', ex);
    }
}
export class SnapshotComparer {
    constructor(initialCotent) {
        this.transientOptions = deserializeSnapshot(initialCotent).transientOptions;
        this.data = deserializeSnapshot(initialCotent).data;
    }
    isEqual(notebook) {
        if (notebook.cells.length !== this.data.cells.length) {
            return false;
        }
        const transientDocumentMetadata = this.transientOptions?.transientDocumentMetadata || {};
        const notebookMetadata = filter(notebook.metadata || {}, (key) => !transientDocumentMetadata[key]);
        const comparerMetadata = filter(this.data.metadata || {}, (key) => !transientDocumentMetadata[key]);
        // When comparing ignore transient items.
        if (JSON.stringify(notebookMetadata) !== JSON.stringify(comparerMetadata)) {
            return false;
        }
        const transientCellMetadata = this.transientOptions?.transientCellMetadata || {};
        for (let i = 0; i < notebook.cells.length; i++) {
            const notebookCell = notebook.cells[i];
            const comparerCell = this.data.cells[i];
            if (notebookCell instanceof NotebookCellTextModel) {
                if (!notebookCell.fastEqual(comparerCell, true)) {
                    return false;
                }
            }
            else {
                if (notebookCell.cellKind !== comparerCell.cellKind) {
                    return false;
                }
                if (notebookCell.language !== comparerCell.language) {
                    return false;
                }
                if (notebookCell.mime !== comparerCell.mime) {
                    return false;
                }
                if (notebookCell.source !== comparerCell.source) {
                    return false;
                }
                if (!this.transientOptions?.transientOutputs &&
                    notebookCell.outputs.length !== comparerCell.outputs.length) {
                    return false;
                }
                // When comparing ignore transient items.
                const cellMetadata = filter(notebookCell.metadata || {}, (key) => !transientCellMetadata[key]);
                const comparerCellMetadata = filter(comparerCell.metadata || {}, (key) => !transientCellMetadata[key]);
                if (JSON.stringify(cellMetadata) !== JSON.stringify(comparerCellMetadata)) {
                    return false;
                }
                // When comparing ignore transient items.
                if (JSON.stringify(sanitizeCellDto2(notebookCell, true, this.transientOptions)) !==
                    JSON.stringify(sanitizeCellDto2(comparerCell, true, this.transientOptions))) {
                    return false;
                }
            }
        }
        return true;
    }
}
function sanitizeCellDto2(cell, ignoreInternalMetadata, transientOptions) {
    const transientCellMetadata = transientOptions?.transientCellMetadata || {};
    const outputs = transientOptions?.transientOutputs
        ? []
        : cell.outputs.map((output) => {
            // Ensure we're in full control of the data being stored.
            // Possible we have classes instead of plain objects.
            return {
                outputId: output.outputId,
                metadata: output.metadata,
                outputs: output.outputs.map((item) => {
                    return {
                        data: item.data,
                        mime: item.mime,
                    };
                }),
            };
        });
    // Ensure we're in full control of the data being stored.
    // Possible we have classes instead of plain objects.
    return {
        cellKind: cell.cellKind,
        language: cell.language,
        metadata: cell.metadata
            ? filter(cell.metadata, (key) => !transientCellMetadata[key])
            : cell.metadata,
        outputs,
        mime: cell.mime,
        source: cell.source,
        collapseState: cell.collapseState,
        internalMetadata: ignoreInternalMetadata ? undefined : cell.internalMetadata,
    };
}
function serializeSnapshot(data, transientOptions) {
    const dataDto = {
        // Never pass transient options, as we're after a backup here.
        // Else we end up stripping outputs from backups.
        // Whether its persisted or not is up to the serializer.
        // However when reloading/restoring we need to preserve outputs.
        cells: data.cells.map((cell) => sanitizeCellDto2(cell)),
        metadata: data.metadata,
    };
    return JSON.stringify([
        JSON.stringify(transientOptions),
        JSON.stringify(dataDto, (_key, value) => {
            if (value instanceof VSBuffer) {
                return {
                    type: BufferMarker,
                    data: encodeBase64(value),
                };
            }
            return value;
        }),
    ]);
}
export function deserializeSnapshot(snapshot) {
    const [transientOptionsStr, dataStr] = JSON.parse(snapshot);
    const transientOptions = transientOptionsStr
        ? JSON.parse(transientOptionsStr)
        : undefined;
    const data = JSON.parse(dataStr, (_key, value) => {
        if (value && value.type === BufferMarker) {
            return decodeBase64(value.data);
        }
        return value;
    });
    return { transientOptions, data };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rU25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rU25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUcxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBTU4sZUFBZSxHQUVmLE1BQU0sK0NBQStDLENBQUE7QUFFdEQsTUFBTSxZQUFZLEdBQUcsa0RBQWtELENBQUE7QUFRdkUsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsc0NBQXNDLENBQUE7QUFFdkYsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxhQUFxQixFQUNyQixTQUE2QixFQUM3QixRQUE0QixFQUM1QixJQUFZLEVBQ1osUUFBZ0I7SUFFaEIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLGlDQUFpQztRQUN6QyxJQUFJO1FBQ0osS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckIsU0FBUyxFQUFFLGFBQWE7WUFDeEIsU0FBUyxFQUFFLFNBQVMsSUFBSSxFQUFFO1lBQzFCLFFBQVEsRUFBRSxRQUFRLElBQUksRUFBRTtZQUN4QixRQUFRO1NBQzhDLENBQUM7S0FDeEQsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1B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