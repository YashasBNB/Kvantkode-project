/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Avoid circular dependency on EventEmitter by implementing a subset of the interface.
export class ErrorHandler {
    constructor() {
        this.listeners = [];
        this.unexpectedErrorHandler = function (e) {
            setTimeout(() => {
                if (e.stack) {
                    if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
                        throw new ErrorNoTelemetry(e.message + '\n\n' + e.stack);
                    }
                    throw new Error(e.message + '\n\n' + e.stack);
                }
                throw e;
            }, 0);
        };
    }
    addListener(listener) {
        this.listeners.push(listener);
        return () => {
            this._removeListener(listener);
        };
    }
    emit(e) {
        this.listeners.forEach((listener) => {
            listener(e);
        });
    }
    _removeListener(listener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }
    setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
        this.unexpectedErrorHandler = newUnexpectedErrorHandler;
    }
    getUnexpectedErrorHandler() {
        return this.unexpectedErrorHandler;
    }
    onUnexpectedError(e) {
        this.unexpectedErrorHandler(e);
        this.emit(e);
    }
    // For external errors, we don't want the listeners to be called
    onUnexpectedExternalError(e) {
        this.unexpectedErrorHandler(e);
    }
}
export const errorHandler = new ErrorHandler();
/** @skipMangle */
export function setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}
/**
 * Returns if the error is a SIGPIPE error. SIGPIPE errors should generally be
 * logged at most once, to avoid a loop.
 *
 * @see https://github.com/microsoft/vscode-remote-release/issues/6481
 */
export function isSigPipeError(e) {
    if (!e || typeof e !== 'object') {
        return false;
    }
    const cast = e;
    return cast.code === 'EPIPE' && cast.syscall?.toUpperCase() === 'WRITE';
}
/**
 * This function should only be called with errors that indicate a bug in the product.
 * E.g. buggy extensions/invalid user-input/network issues should not be able to trigger this code path.
 * If they are, this indicates there is also a bug in the product.
 */
export function onBugIndicatingError(e) {
    errorHandler.onUnexpectedError(e);
    return undefined;
}
export function onUnexpectedError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedError(e);
    }
    return undefined;
}
export function onUnexpectedExternalError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedExternalError(e);
    }
    return undefined;
}
export function transformErrorForSerialization(error) {
    if (error instanceof Error) {
        const { name, message, cause } = error;
        const stack = error.stacktrace || error.stack;
        return {
            $isError: true,
            name,
            message,
            stack,
            noTelemetry: ErrorNoTelemetry.isErrorNoTelemetry(error),
            cause: cause ? transformErrorForSerialization(cause) : undefined,
            code: error.code,
        };
    }
    // return as is
    return error;
}
export function transformErrorFromSerialization(data) {
    let error;
    if (data.noTelemetry) {
        error = new ErrorNoTelemetry();
    }
    else {
        error = new Error();
        error.name = data.name;
    }
    error.message = data.message;
    error.stack = data.stack;
    if (data.code) {
        ;
        error.code = data.code;
    }
    if (data.cause) {
        error.cause = transformErrorFromSerialization(data.cause);
    }
    return error;
}
const canceledName = 'Canceled';
/**
 * Checks if the given error is a promise in canceled state
 */
export function isCancellationError(error) {
    if (error instanceof CancellationError) {
        return true;
    }
    return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
// !!!IMPORTANT!!!
// Do NOT change this class because it is also used as an API-type.
export class CancellationError extends Error {
    constructor() {
        super(canceledName);
        this.name = this.message;
    }
}
/**
 * @deprecated use {@link CancellationError `new CancellationError()`} instead
 */
export function canceled() {
    const error = new Error(canceledName);
    error.name = error.message;
    return error;
}
export function illegalArgument(name) {
    if (name) {
        return new Error(`Illegal argument: ${name}`);
    }
    else {
        return new Error('Illegal argument');
    }
}
export function illegalState(name) {
    if (name) {
        return new Error(`Illegal state: ${name}`);
    }
    else {
        return new Error('Illegal state');
    }
}
export class ReadonlyError extends TypeError {
    constructor(name) {
        super(name ? `${name} is read-only and cannot be changed` : 'Cannot change read-only property');
    }
}
export function getErrorMessage(err) {
    if (!err) {
        return 'Error';
    }
    if (err.message) {
        return err.message;
    }
    if (err.stack) {
        return err.stack.split('\n')[0];
    }
    return String(err);
}
export class NotImplementedError extends Error {
    constructor(message) {
        super('NotImplemented');
        if (message) {
            this.message = message;
        }
    }
}
export class NotSupportedError extends Error {
    constructor(message) {
        super('NotSupported');
        if (message) {
            this.message = message;
        }
    }
}
export class ExpectedError extends Error {
    constructor() {
        super(...arguments);
        this.isExpected = true;
    }
}
/**
 * Error that when thrown won't be logged in telemetry as an unhandled error.
 */
export class ErrorNoTelemetry extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'CodeExpectedError';
    }
    static fromError(err) {
        if (err instanceof ErrorNoTelemetry) {
            return err;
        }
        const result = new ErrorNoTelemetry();
        result.message = err.message;
        result.stack = err.stack;
        return result;
    }
    static isErrorNoTelemetry(err) {
        return err.name === 'CodeExpectedError';
    }
}
/**
 * This error indicates a bug.
 * Do not throw this for invalid user input.
 * Only catch this error to recover gracefully from bugs.
 */
export class BugIndicatingError extends Error {
    constructor(message) {
        super(message || 'An unexpected bug occurred.');
        Object.setPrototypeOf(this, BugIndicatingError.prototype);
        // Because we know for sure only buggy code throws this,
        // we definitely want to break here and fix the bug.
        // debugger;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZXJyb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLHVGQUF1RjtBQUN2RixNQUFNLE9BQU8sWUFBWTtJQUl4QjtRQUNDLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBRW5CLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxVQUFVLENBQU07WUFDN0MsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDYixJQUFJLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQzVDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3pELENBQUM7b0JBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzlDLENBQUM7Z0JBRUQsTUFBTSxDQUFDLENBQUE7WUFDUixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUE7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQStCO1FBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTdCLE9BQU8sR0FBRyxFQUFFO1lBQ1gsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQixDQUFDLENBQUE7SUFDRixDQUFDO0lBRU8sSUFBSSxDQUFDLENBQU07UUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZ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