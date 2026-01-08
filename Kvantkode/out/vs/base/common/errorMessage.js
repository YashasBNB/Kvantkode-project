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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JNZXNzYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9lcnJvck1lc3NhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxhQUFhLENBQUE7QUFDckMsT0FBTyxLQUFLLEtBQUssTUFBTSxZQUFZLENBQUE7QUFDbkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFHbkMsU0FBUyx1QkFBdUIsQ0FBQyxTQUFjLEVBQUUsT0FBZ0I7SUFDaEUsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQzFELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FDbEIsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVix3QkFBd0IsQ0FBQyxTQUFTLENBQUMsRUFDbkMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUNyRSxDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU8sd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQW9DO0lBQzFELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxTQUFjO0lBQy9DLCtCQUErQjtJQUMvQixJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLEVBQUUsQ0FBQztRQUNuRCxPQUFPLEdBQUcsU0FBUyxD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