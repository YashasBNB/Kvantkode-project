/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
export var NotebookDto;
(function (NotebookDto) {
    function toNotebookOutputItemDto(item) {
        return {
            mime: item.mime,
            valueBytes: item.data,
        };
    }
    NotebookDto.toNotebookOutputItemDto = toNotebookOutputItemDto;
    function toNotebookOutputDto(output) {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            items: output.outputs.map(toNotebookOutputItemDto),
        };
    }
    NotebookDto.toNotebookOutputDto = toNotebookOutputDto;
    function toNotebookCellDataDto(cell) {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            mime: cell.mime,
            source: cell.source,
            internalMetadata: cell.internalMetadata,
            metadata: cell.metadata,
            outputs: cell.outputs.map(toNotebookOutputDto),
        };
    }
    NotebookDto.toNotebookCellDataDto = toNotebookCellDataDto;
    function toNotebookDataDto(data) {
        return {
            metadata: data.metadata,
            cells: data.cells.map(toNotebookCellDataDto),
        };
    }
    NotebookDto.toNotebookDataDto = toNotebookDataDto;
    function fromNotebookOutputItemDto(item) {
        return {
            mime: item.mime,
            data: item.valueBytes,
        };
    }
    NotebookDto.fromNotebookOutputItemDto = fromNotebookOutputItemDto;
    function fromNotebookOutputDto(output) {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            outputs: output.items.map(fromNotebookOutputItemDto),
        };
    }
    NotebookDto.fromNotebookOutputDto = fromNotebookOutputDto;
    function fromNotebookCellDataDto(cell) {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            mime: cell.mime,
            source: cell.source,
            outputs: cell.outputs.map(fromNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        };
    }
    NotebookDto.fromNotebookCellDataDto = fromNotebookCellDataDto;
    function fromNotebookDataDto(data) {
        return {
            metadata: data.metadata,
            cells: data.cells.map(fromNotebookCellDataDto),
        };
    }
    NotebookDto.fromNotebookDataDto = fromNotebookDataDto;
    function toNotebookCellDto(cell) {
        return {
            handle: cell.handle,
            uri: cell.uri,
            source: cell.textBuffer.getLinesContent(),
            eol: cell.textBuffer.getEOL(),
            language: cell.language,
            cellKind: cell.cellKind,
            outputs: cell.outputs.map(toNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        };
    }
    NotebookDto.toNotebookCellDto = toNotebookCellDto;
    function fromCellExecuteUpdateDto(data) {
        if (data.editType === CellExecutionUpdateType.Output) {
            return {
                editType: data.editType,
                cellHandle: data.cellHandle,
                append: data.append,
                outputs: data.outputs.map(fromNotebookOutputDto),
            };
        }
        else if (data.editType === CellExecutionUpdateType.OutputItems) {
            return {
                editType: data.editType,
                append: data.append,
                outputId: data.outputId,
                items: data.items.map(fromNotebookOutputItemDto),
            };
        }
        else {
            return data;
        }
    }
    NotebookDto.fromCellExecuteUpdateDto = fromCellExecuteUpdateDto;
    function fromCellExecuteCompleteDto(data) {
        return data;
    }
    NotebookDto.fromCellExecuteCompleteDto = fromCellExecuteCompleteDto;
    function fromCellEditOperationDto(edit) {
        if (edit.editType === 1 /* notebookCommon.CellEditType.Replace */) {
            return {
                editType: edit.editType,
                index: edit.index,
                count: edit.count,
                cells: edit.cells.map(fromNotebookCellDataDto),
            };
        }
        else {
            return edit;
        }
    }
    NotebookDto.fromCellEditOperationDto = fromCellEditOperationDto;
})(NotebookDto || (NotebookDto = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRHRvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWROb3RlYm9va0R0by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQU1uRyxNQUFNLEtBQVcsV0FBVyxDQTZJM0I7QUE3SUQsV0FBaUIsV0FBVztJQUMzQixTQUFnQix1QkFBdUIsQ0FDdEMsSUFBbUM7UUFFbkMsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNyQixDQUFBO0lBQ0YsQ0FBQztJQVBlLG1DQUF1QiwwQkFPdEMsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUNsQyxNQUFpQztRQUVqQyxPQUFPO1lBQ04sUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUM7U0FDbEQsQ0FBQTtJQUNGLENBQUM7SUFSZSwrQkFBbUIsc0JBUWxDLENBQUE7SUFFRCxTQUFnQixxQkFBcUIsQ0FDcEMsSUFBOEI7UUFFOUIsT0FBTztZQUNOLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDdkMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLE9BQU8sRUFBRSxJQUFJ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