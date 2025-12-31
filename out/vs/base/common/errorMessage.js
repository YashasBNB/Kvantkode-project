/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from './arrays.js';
import * as types from './types.js';
import * as nls from '../../nls.js';
function exceptionToErrorMessage(exception, verbose) {
    if (verbose && (exception.stack || exception.stacktrace)) {
        return nls.localize('stackTrace.format', '{0}: {1}', detectSystemErrorMessage(exception), stackToString(exception.stack) || stackToString(exception.stacktrace));
    }
    return detectSystemErrorMessage(exception);
}
function stackToString(stack) {
    if (Array.isArray(stack)) {
        return stack.join('\n');
    }
    return stack;
}
function detectSystemErrorMessage(exception) {
    // Custom node.js error from us
    if (exception.code === 'ERR_UNC_HOST_NOT_ALLOWED') {
        return `${exception.message}. Please update the 'security.allowedUNCHosts' setting if you want to allow this host.`;
    }
    // See https://nodejs.org/api/errors.html#errors_class_system_error
    if (typeof exception.code === 'string' &&
        typeof exception.errno === 'number' &&
        typeof exception.syscall === 'string') {
        return nls.localize('nodeExceptionMessage', 'A system error occurred ({0})', exception.message);
    }
    return (exception.message ||
        nls.localize('error.defaultMessage', 'An unknown error occurred. Please consult the log for more details.'));
}
/**
 * Tries to generate a human readable error message out of the error. If the verbose parameter
 * is set to true, the error message will include stacktrace details if provided.
 *
 * @returns A string containing the error message.
 */
export function toErrorMessage(error = null, verbose = false) {
    if (!error) {
        return nls.localize('error.defaultMessage', 'An unknown error occurred. Please consult the log for more details.');
    }
    if (Array.isArray(error)) {
        const errors = arrays.coalesce(error);
        const msg = toErrorMessage(errors[0], verbose);
        if (errors.length > 1) {
            return nls.localize('error.moreErrors', '{0} ({1} errors in total)', msg, errors.length);
        }
        return msg;
    }
    if (types.isString(error)) {
        return error;
    }
    if (error.detail) {
        const detail = error.detail;
        if (detail.error) {
            return exceptionToErrorMessage(detail.error, verbose);
        }
        if (detail.exception) {
            return exceptionToErrorMessage(detail.exception, verbose);
        }
    }
    if (error.stack) {
        return exceptionToErrorMessage(error, verbose);
    }
    if (error.message) {
        return error.message;
    }
    return nls.localize('error.defaultMessage', 'An unknown error occurred. Please consult the log for more details.');
}
export function isErrorWithActions(obj) {
    const candidate = obj;
    return candidate instanceof Error && Array.isArray(candidate.actions);
}
export function createErrorWithActions(messageOrError, actions) {
    let error;
    if (typeof messageOrError === 'string') {
        error = new Error(messageOrError);
    }
    else {
        error = messageOrError;
    }
    error.actions = actions;
    return error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JNZXNzYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZXJyb3JNZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxLQUFLLE1BQU0sWUFBWSxDQUFBO0FBQ25DLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBR25DLFNBQVMsdUJBQXVCLENBQUMsU0FBYyxFQUFFLE9BQWdCO0lBQ2hFLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUMxRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLG1CQUFtQixFQUNuQixVQUFVLEVBQ1Ysd0JBQXdCLENBQUMsU0FBUyxDQUFDLEVBQ25DLGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksYUFBYSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FDckUsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzNDLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUFvQztJQUMxRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsU0FBYztJQUMvQywrQkFBK0I7SUFDL0IsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLDBCQUEwQixFQUFFLENBQUM7UUFDbkQsT0FBTyxHQUFHLFNBQVMsQ0FBQyxP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