/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileOperationError, } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { VSBuffer, } from '../../../../base/common/buffer.js';
import { areFunctions, isUndefinedOrNull } from '../../../../base/common/types.js';
export const ITextFileService = createDecorator('textFileService');
export var TextFileOperationResult;
(function (TextFileOperationResult) {
    TextFileOperationResult[TextFileOperationResult["FILE_IS_BINARY"] = 0] = "FILE_IS_BINARY";
})(TextFileOperationResult || (TextFileOperationResult = {}));
export class TextFileOperationError extends FileOperationError {
    static isTextFileOperationError(obj) {
        return (obj instanceof Error &&
            !isUndefinedOrNull(obj.textFileOperationResult));
    }
    constructor(message, textFileOperationResult, options) {
        super(message, 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        this.textFileOperationResult = textFileOperationResult;
        this.options = options;
    }
}
/**
 * States the text file editor model can be in.
 */
export var TextFileEditorModelState;
(function (TextFileEditorModelState) {
    /**
     * A model is saved.
     */
    TextFileEditorModelState[TextFileEditorModelState["SAVED"] = 0] = "SAVED";
    /**
     * A model is dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["DIRTY"] = 1] = "DIRTY";
    /**
     * A model is currently being saved but this operation has not completed yet.
     */
    TextFileEditorModelState[TextFileEditorModelState["PENDING_SAVE"] = 2] = "PENDING_SAVE";
    /**
     * A model is in conflict mode when changes cannot be saved because the
     * underlying file has changed. Models in conflict mode are always dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["CONFLICT"] = 3] = "CONFLICT";
    /**
     * A model is in orphan state when the underlying file has been deleted.
     */
    TextFileEditorModelState[TextFileEditorModelState["ORPHAN"] = 4] = "ORPHAN";
    /**
     * Any error that happens during a save that is not causing the CONFLICT state.
     * Models in error mode are always dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["ERROR"] = 5] = "ERROR";
})(TextFileEditorModelState || (TextFileEditorModelState = {}));
export var TextFileResolveReason;
(function (TextFileResolveReason) {
    TextFileResolveReason[TextFileResolveReason["EDITOR"] = 1] = "EDITOR";
    TextFileResolveReason[TextFileResolveReason["REFERENCE"] = 2] = "REFERENCE";
    TextFileResolveReason[TextFileResolveReason["OTHER"] = 3] = "OTHER";
})(TextFileResolveReason || (TextFileResolveReason = {}));
export var EncodingMode;
(function (EncodingMode) {
    /**
     * Instructs the encoding support to encode the object with the provided encoding
     */
    EncodingMode[EncodingMode["Encode"] = 0] = "Encode";
    /**
     * Instructs the encoding support to decode the object with the provided encoding
     */
    EncodingMode[EncodingMode["Decode"] = 1] = "Decode";
})(EncodingMode || (EncodingMode = {}));
export function isTextFileEditorModel(model) {
    const candidate = model;
    return areFunctions(candidate.setEncoding, candidate.getEncoding, candidate.save, candidate.revert, candidate.isDirty, candidate.getLanguageId);
}
export function snapshotToString(snapshot) {
    const chunks = [];
    let chunk;
    while (typeof (chunk = snapshot.read()) === 'string') {
        chunks.push(chunk);
    }
    return chunks.join('');
}
export function stringToSnapshot(value) {
    let done = false;
    return {
        read() {
            if (!done) {
                done = true;
                return value;
            }
            return null;
        },
    };
}
export function toBufferOrReadable(value) {
    if (typeof value === 'undefined') {
        return undefined;
    }
    if (typeof value === 'string') {
        return VSBuffer.fromString(value);
    }
    return {
        read: () => {
            const chunk = value.read();
            if (typeof chunk === 'string') {
                return VSBuffer.fromString(chunk);
            }
            return null;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dGZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2NvbW1vbi90ZXh0ZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUlOLGtCQUFrQixHQUlsQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUc1RixPQUFPLEVBQ04sUUFBUSxHQUdSLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBT2xGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQTtBQXVMcEYsTUFBTSxDQUFOLElBQWtCLHVCQUVqQjtBQUZELFdBQWtCLHVCQUF1QjtJQUN4Qyx5RkFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUZpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBRXhDO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUM3RCxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBWTtRQUMzQyxPQUFPLENBQ04sR0FBRyxZQUFZLEtBQUs7WUFDcEIsQ0FBQyxpQkFBaUIsQ0FBRSxHQUE4QixDQUFDLHVCQUF1QixDQUFDLENBQzNFLENBQUE7SUFDRixDQUFDO0lBSUQsWUFDQyxPQUFlLEVBQ1IsdUJBQWdELEVBQ3ZELE9BQXNEO1FBRXRELEtBQUssQ0FBQyxPQUFPLGdEQUF1QyxDQUFBO1FBSDdDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFLdkQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBc0JEOztHQUVHO0FBQ0gsTUFBTSxDQUFO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