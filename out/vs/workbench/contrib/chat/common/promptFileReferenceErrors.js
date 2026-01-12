/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../base/common/path.js';
import { assert, assertNever } from '../../../../base/common/assert.js';
/**
 * Base prompt parsing error class.
 */
class ParseError extends Error {
    constructor(message, options) {
        super(message, options);
    }
    /**
     * Check if provided object is of the same type as this error.
     */
    sameTypeAs(other) {
        if (other === null || other === undefined) {
            return false;
        }
        return other instanceof this.constructor;
    }
    /**
     * Check if provided object is equal to this error.
     */
    equal(other) {
        return this.sameTypeAs(other);
    }
}
/**
 * Base resolve error class used when file reference resolution fails.
 */
export class ResolveError extends ParseError {
    constructor(uri, message, options) {
        super(message, options);
        this.uri = uri;
    }
}
/**
 * A generic error for failing to resolve prompt contents stream.
 */
export class FailedToResolveContentsStream extends ResolveError {
    constructor(uri, originalError, message = `Failed to resolve prompt contents stream for '${uri.toString()}': ${originalError}.`) {
        super(uri, message);
        this.originalError = originalError;
        this.errorType = 'FailedToResolveContentsStream';
    }
}
/**
 * Error that reflects the case when attempt to open target file fails.
 */
export class OpenFailed extends FailedToResolveContentsStream {
    constructor(uri, originalError) {
        super(uri, originalError, `Failed to open '${uri.fsPath}': ${originalError}.`);
        this.errorType = 'OpenError';
    }
}
/**
 * Character use to join filenames/paths in a chain of references that
 * lead to recursion.
 */
const DEFAULT_RECURSIVE_PATH_JOIN_CHAR = ' -> ';
/**
 * Error that reflects the case when attempt resolve nested file
 * references failes due to a recursive reference, e.g.,
 *
 * ```markdown
 * // a.md
 * #file:b.md
 * ```
 *
 * ```markdown
 * // b.md
 * #file:a.md
 * ```
 */
export class RecursiveReference extends ResolveError {
    constructor(uri, recursivePath) {
        // sanity check - a recursive path must always have at least
        // two items in the list, otherwise it is not a recursive loop
        assert(recursivePath.length >= 2, `Recursive path must contain at least two paths, got '${recursivePath.length}'.`);
        super(uri, 'Recursive references found.');
        this.recursivePath = recursivePath;
        this.errorType = 'RecursiveReferenceError';
    }
    get message() {
        return `${super.message} ${this.getRecursivePathString('fullpath')}`;
    }
    /**
     * Returns a string representation of the recursive path.
     */
    getRecursivePathString(filename, pathJoinCharacter = DEFAULT_RECURSIVE_PATH_JOIN_CHAR) {
        const isDefault = filename === 'fullpath' && pathJoinCharacter === DEFAULT_RECURSIVE_PATH_JOIN_CHAR;
        if (isDefault && this.defaultPathStringCache !== undefined) {
            return this.defaultPathStringCache;
        }
        const result = this.recursivePath
            .map((path) => {
            if (filename === 'fullpath') {
                return `'${path}'`;
            }
            if (filename === 'basename') {
                return `'${basename(path)}'`;
            }
            assertNever(filename, `Unknown filename format '${filename}'.`);
        })
            .join(pathJoinCharacter);
        if (isDefault) {
            this.defaultPathStringCache = result;
        }
        return result;
    }
    /**
     * Check if provided object is of the same type as this
     * error, contains the same recursive path and URI.
     */
    equal(other) {
        if (!this.sameTypeAs(other)) {
            return false;
        }
        if (this.uri.toString() !== other.uri.toString()) {
            return false;
        }
        // performance optimization - compare number of paths in the
        // recursive path chains first to avoid comparison of all strings
        if (this.recursivePath.length !== other.recursivePath.length) {
            return false;
        }
        const myRecursivePath = this.getRecursivePathString('fullpath');
        const theirRecursivePath = other.getRecursivePathString('fullpath');
        // performance optimization - if the path lengths don't match,
        // no need to compare entire strings as they must be different
        if (myRecursivePath.length !== theirRecursivePath.length) {
            return false;
        }
        return myRecursivePath === theirRecursivePath;
    }
    /**
     * Returns a string representation of the error object.
     */
    toString() {
        return `"${this.message}"(${this.uri})`;
    }
}
/**
 * Error for the case when a resource URI doesn't point to a prompt file.
 */
export class NotPromptFile extends ResolveError {
    constructor(uri, message = '') {
        const suffix = message ? `: ${message}` : '';
        super(uri, `Resource at ${uri.path} is not a prompt file${suffix}`);
        this.errorType = 'NotPromptFileError';
    }
}
/**
 * Error for the case when a resource URI points to a folder.
 */
export class FolderReference extends NotPromptFile {
    constructor(uri, message = '') {
        const suffix = message ? `: ${message}` : '';
        super(uri, `Entity at '${uri.path}' is a folder${suffix}`);
        this.errorType = 'FolderReferenceError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZUVycm9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0RmlsZVJlZmVyZW5jZUVycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RTs7R0FFRztBQUNILE1BQWUsVUFBVyxTQUFRLEtBQUs7SUFNdEMsWUFBWSxPQUFnQixFQUFFLE9BQXNCO1FBQ25ELEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksVUFBVSxDQUFDLEtBQWM7UUFDL0IsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxLQUFjO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBZ0IsWUFBYSxTQUFRLFVBQVU7SUFHcEQsWUFDaUIsR0FBUSxFQUN4QixPQUFnQixFQUNoQixPQUFzQjtRQUV0QixLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBSlAsUUFBRyxHQUFILEdBQUcsQ0FBSztJQUt6QixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyw2QkFB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