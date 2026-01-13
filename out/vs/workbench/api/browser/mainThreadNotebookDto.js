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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRHRvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rRHRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBTW5HLE1BQU0sS0FBVyxXQUFXLENBNkkzQjtBQTdJRCxXQUFpQixXQUFXO0lBQzNCLFNBQWdCLHVCQUF1QixDQUN0QyxJQUFtQztRQUVuQyxPQUFPO1lBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ3JCLENBQUE7SUFDRixDQUFDO0lBUGUsbUNBQXVCLDBCQU90QyxDQUFBO0lBRUQsU0FBZ0IsbUJBQW1CLENBQ2xDLE1BQWlDO1FBRWpDLE9BQU87WUFDTixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztTQUNsRCxDQUFBO0lBQ0YsQ0FBQztJQVJlLCtCQUFtQixzQkFRbEMsQ0FBQTtJQUVELFNBQWdCLHFCQUFxQixDQUNwQyxJQUE4QjtRQUU5QixPQUFPO1lBQ04sUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN2QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFB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