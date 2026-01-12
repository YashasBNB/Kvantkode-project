/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { canceled } from '../../../base/common/errors.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, ensureFileSystemProviderError, FileSystemProviderErrorCode, } from './files.js';
/**
 * A helper to read a file from a provider with open/read/close capability into a stream.
 */
export async function readFileIntoStream(provider, resource, target, transformer, options, token) {
    let error = undefined;
    try {
        await doReadFileIntoStream(provider, resource, target, transformer, options, token);
    }
    catch (err) {
        error = err;
    }
    finally {
        if (error && options.errorTransformer) {
            error = options.errorTransformer(error);
        }
        if (typeof error !== 'undefined') {
            target.error(error);
        }
        target.end();
    }
}
async function doReadFileIntoStream(provider, resource, target, transformer, options, token) {
    // Check for cancellation
    throwIfCancelled(token);
    // open handle through provider
    const handle = await provider.open(resource, { create: false });
    try {
        // Check for cancellation
        throwIfCancelled(token);
        let totalBytesRead = 0;
        let bytesRead = 0;
        let allowedRemainingBytes = options && typeof options.length === 'number' ? options.length : undefined;
        let buffer = VSBuffer.alloc(Math.min(options.bufferSize, typeof allowedRemainingBytes === 'number' ? allowedRemainingBytes : options.bufferSize));
        let posInFile = options && typeof options.position === 'number' ? options.position : 0;
        let posInBuffer = 0;
        do {
            // read from source (handle) at current position (pos) into buffer (buffer) at
            // buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
            bytesRead = await provider.read(handle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);
            posInFile += bytesRead;
            posInBuffer += bytesRead;
            totalBytesRead += bytesRead;
            if (typeof allowedRemainingBytes === 'number') {
                allowedRemainingBytes -= bytesRead;
            }
            // when buffer full, create a new one and emit it through stream
            if (posInBuffer === buffer.byteLength) {
                await target.write(transformer(buffer));
                buffer = VSBuffer.alloc(Math.min(options.bufferSize, typeof allowedRemainingBytes === 'number' ? allowedRemainingBytes : options.bufferSize));
                posInBuffer = 0;
            }
        } while (bytesRead > 0 &&
            (typeof allowedRemainingBytes !== 'number' || allowedRemainingBytes > 0) &&
            throwIfCancelled(token) &&
            throwIfTooLarge(totalBytesRead, options));
        // wrap up with last buffer (also respect maxBytes if provided)
        if (posInBuffer > 0) {
            let lastChunkLength = posInBuffer;
            if (typeof allowedRemainingBytes === 'number') {
                lastChunkLength = Math.min(posInBuffer, allowedRemainingBytes);
            }
            target.write(transformer(buffer.slice(0, lastChunkLength)));
        }
    }
    catch (error) {
        throw ensureFileSystemProviderError(error);
    }
    finally {
        await provider.close(handle);
    }
}
function throwIfCancelled(token) {
    if (token.isCancellationRequested) {
        throw canceled();
    }
    return true;
}
function throwIfTooLarge(totalBytesRead, options) {
    // Return early if file is too large to load and we have configured limits
    if (typeof options?.limits?.size === 'number' && totalBytesRead > options.limits.size) {
        throw createFileSystemProviderError(localize('fileTooLargeError', 'File is too large to open'), FileSystemProviderErrorCode.FileTooLarge);
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi9pby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBT3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDZCQUE2QixFQUU3QiwyQkFBMkIsR0FFM0IsTUFBTSxZQUFZLENBQUE7QUFjbkI7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUN2QyxRQUE2RCxFQUM3RCxRQUFhLEVBQ2IsTUFBMEIsRUFDMUIsV0FBMEMsRUFDMUMsT0FBaUMsRUFDakMsS0FBd0I7SUFFeEIsSUFBSSxLQUFLLEdBQXNCLFNBQVMsQ0FBQTtJQUV4QyxJQUFJLENBQUM7UUFDSixNQUFNLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxLQUFLLEdBQUcsR0FBRyxDQUFBO0lBQ1osQ0FBQztZQUFTLENBQUM7UUFDVixJQUFJLEtBQUssSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QyxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFD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