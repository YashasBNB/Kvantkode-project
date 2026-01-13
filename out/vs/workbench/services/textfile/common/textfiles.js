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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dGZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvY29tbW9uL3RleHRmaWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBSU4sa0JBQWtCLEdBSWxCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRzVGLE9BQU8sRUFDTixRQUFRLEdBR1IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPbEYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFBO0FBdUxwRixNQUFNLENBQU4sSUFBa0IsdUJBRWpCO0FBRkQsV0FBa0IsdUJBQXVCO0lBQ3hDLHlGQUFjLENBQUE7QUFDZixDQUFDLEVBRmlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFFeEM7QUFFRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsa0JBQWtCO0lBQzdELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFZO1FBQzNDLE9BQU8sQ0FDTixHQUFHLFlBQVksS0FBSztZQUNwQixDQUFDLGlCQUFpQixDQUFFLEdBQThCLENBQUMsdUJBQXVCLENBQUMsQ0FDM0UsQ0FBQTtJQUNGLENBQUM7SUFJRCxZQUNDLE9BQWUsRUFDUix1QkFBZ0QsRUFDdkQsT0FBc0Q7UUFFdEQsS0FBSyxDQUFDLE9BQU8sZ0RBQXVDLENBQUE7UUFIN0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQUt2RCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFz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