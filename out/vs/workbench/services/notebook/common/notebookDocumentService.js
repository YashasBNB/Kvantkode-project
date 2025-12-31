/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../../base/common/buffer.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const INotebookDocumentService = createDecorator('notebookDocumentService');
const _lengths = ['W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f'];
const _padRegexp = new RegExp(`^[${_lengths.join('')}]+`);
const _radix = 7;
export function parse(cell) {
    if (cell.scheme !== Schemas.vscodeNotebookCell) {
        return undefined;
    }
    const idx = cell.fragment.indexOf('s');
    if (idx < 0) {
        return undefined;
    }
    const handle = parseInt(cell.fragment.substring(0, idx).replace(_padRegexp, ''), _radix);
    const _scheme = decodeBase64(cell.fragment.substring(idx + 1)).toString();
    if (isNaN(handle)) {
        return undefined;
    }
    return {
        handle,
        notebook: cell.with({ scheme: _scheme, fragment: null }),
    };
}
export function generate(notebook, handle) {
    const s = handle.toString(_radix);
    const p = s.length < _lengths.length ? _lengths[s.length - 1] : 'z';
    const fragment = `${p}${s}s${encodeBase64(VSBuffer.fromString(notebook.scheme), true, true)}`;
    return notebook.with({ scheme: Schemas.vscodeNotebookCell, fragment });
}
export function parseMetadataUri(metadata) {
    if (metadata.scheme !== Schemas.vscodeNotebookMetadata) {
        return undefined;
    }
    const _scheme = decodeBase64(metadata.fragment).toString();
    return metadata.with({ scheme: _scheme, fragment: null });
}
export function generateMetadataUri(notebook) {
    const fragment = `${encodeBase64(VSBuffer.fromString(notebook.scheme), true, true)}`;
    return notebook.with({ scheme: Schemas.vscodeNotebookMetadata, fragment });
}
export function extractCellOutputDetails(uri) {
    if (uri.scheme !== Schemas.vscodeNotebookCellOutput) {
        return;
    }
    const params = new URLSearchParams(uri.query);
    const openIn = params.get('openIn');
    if (!openIn) {
        return;
    }
    const outputId = params.get('outputId') ?? undefined;
    const parsedCell = parse(uri.with({ scheme: Schemas.vscodeNotebookCell, query: null }));
    const outputIndex = params.get('outputIndex')
        ? parseInt(params.get('outputIndex') || '', 10)
        : undefined;
    const notebookUri = parsedCell
        ? parsedCell.notebook
        : uri.with({
            scheme: params.get('notebookScheme') || Schemas.file,
            fragment: null,
            query: null,
        });
    return {
        notebook: notebookUri,
        openIn: openIn,
        outputId: outputId,
        outputIndex: outputIndex,
        cellHandle: parsedCell?.handle,
        cellFragment: uri.fragment,
    };
}
export class NotebookDocumentWorkbenchService {
    constructor() {
        this._documents = new ResourceMap();
    }
    getNotebook(uri) {
        if (uri.scheme === Schemas.vscodeNotebookCell) {
            const cellUri = parse(uri);
            if (cellUri) {
                const document = this._documents.get(cellUri.notebook);
                if (document) {
                    return document;
                }
            }
        }
        if (uri.scheme === Schemas.vscodeNotebookCellOutput) {
            const parsedData = extractCellOutputDetails(uri);
            if (parsedData) {
                const document = this._documents.get(parsedData.notebook);
                if (document) {
                    return document;
                }
            }
        }
        return this._documents.get(uri);
    }
    addNotebookDocument(document) {
        this._documents.set(document.uri, document);
    }
    removeNotebookDocument(document) {
        this._documents.delete(document.uri);
    }
}
registerSingleton(INotebookDocumentService, NotebookDocumentWorkbenchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbm90ZWJvb2svY29tbW9uL25vdGVib29rRG9jdW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FDcEMsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFBO0FBT3JFLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDbkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUN6RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDaEIsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFTO0lBQzlCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNoRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQs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