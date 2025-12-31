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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vaW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU96RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFFN0IsMkJBQTJCLEdBRTNCLE1BQU0sWUFBWSxDQUFBO0FBY25COztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDdkMsUUFBNkQsRUFDN0QsUUFBYSxFQUNiLE1BQTBCLEVBQzFCLFdBQTBDLEVBQzFDLE9BQWlDLEVBQ2pDLEtBQXdCO0lBRXhCLElBQUksS0FBSyxHQUFzQixTQUFTLENBQUE7SUFFeEMsSUFBSSxDQUFDO1FBQ0osTUFBTSxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtJQUNaLENBQUM7WUFBUyxDQUFDO1FBQ1YsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BCLENB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