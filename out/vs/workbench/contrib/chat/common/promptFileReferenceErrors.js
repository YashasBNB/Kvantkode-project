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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZUVycm9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdEZpbGVSZWZlcmVuY2VFcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkU7O0dBRUc7QUFDSCxNQUFlLFVBQVcsU0FBUSxLQUFLO0lBTXRDLFlBQVksT0FBZ0IsRUFBRSxPQUFzQjtRQUNuRCxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNJLFVBQVUsQ0FBQyxLQUFjO1FBQy9CLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0MsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLFlBQVksSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsS0FBYztRQUMxQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLFlBQWEsU0FBUSxVQUFVO0lBR3BELFlBQ2lCLEdBQVEsRUFDeEIsT0FBZ0IsRUFDaEIsT0FBc0I7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUpQLFFBQUcsR0FBSCxHQUFHLENBQUs7SUFLekIsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQThCLFNB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