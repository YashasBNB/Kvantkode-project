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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tEb2N1bWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUE7QUFPckUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNuRSxNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3pELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUNoQixNQUFNLFVBQVUsS0FBSyxDQUFDLElBQVM7SUFDOUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ2hELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7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