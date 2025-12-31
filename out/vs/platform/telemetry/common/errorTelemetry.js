/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch } from '../../../base/common/arrays.js';
import { errorHandler, ErrorNoTelemetry } from '../../../base/common/errors.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { safeStringify } from '../../../base/common/objects.js';
import { FileOperationError } from '../../files/common/files.js';
export var ErrorEvent;
(function (ErrorEvent) {
    function compare(a, b) {
        if (a.callstack < b.callstack) {
            return -1;
        }
        else if (a.callstack > b.callstack) {
            return 1;
        }
        return 0;
    }
    ErrorEvent.compare = compare;
})(ErrorEvent || (ErrorEvent = {}));
export default class BaseErrorTelemetry {
    static { this.ERROR_FLUSH_TIMEOUT = 5 * 1000; }
    constructor(telemetryService, flushDelay = BaseErrorTelemetry.ERROR_FLUSH_TIMEOUT) {
        this._flushHandle = -1;
        this._buffer = [];
        this._disposables = new DisposableStore();
        this._telemetryService = telemetryService;
        this._flushDelay = flushDelay;
        // (1) check for unexpected but handled errors
        const unbind = errorHandler.addListener((err) => this._onErrorEvent(err));
        this._disposables.add(toDisposable(unbind));
        // (2) install implementation-specific error listeners
        this.installErrorListeners();
    }
    dispose() {
        clearTimeout(this._flushHandle);
        this._flushBuffer();
        this._disposables.dispose();
    }
    installErrorListeners() {
        // to override
    }
    _onErrorEvent(err) {
        if (!err || err.code) {
            return;
        }
        // unwrap nested errors from loader
        if (err.detail && err.detail.stack) {
            err = err.detail;
        }
        // If it's the no telemetry error it doesn't get logged
        // TOOD @lramos15 hacking in FileOperation error because it's too messy to adopt ErrorNoTelemetry. A better solution should be found
        if (ErrorNoTelemetry.isErrorNoTelemetry(err) ||
            err instanceof FileOperationError ||
            (typeof err?.message === 'string' && err.message.includes('Unable to read file'))) {
            return;
        }
        // work around behavior in workerServer.ts that breaks up Error.stack
        const callstack = Array.isArray(err.stack) ? err.stack.join('\n') : err.stack;
        const msg = err.message ? err.message : safeStringify(err);
        // errors without a stack are not useful telemetry
        if (!callstack) {
            return;
        }
        this._enqueue({ msg, callstack });
    }
    _enqueue(e) {
        const idx = binarySearch(this._buffer, e, ErrorEvent.compare);
        if (idx < 0) {
            e.count = 1;
            this._buffer.splice(~idx, 0, e);
        }
        else {
            if (!this._buffer[idx].count) {
                this._buffer[idx].count = 0;
            }
            this._buffer[idx].count += 1;
        }
        if (this._flushHandle === -1) {
            this._flushHandle = setTimeout(() => {
                this._flushBuffer();
                this._flushHandle = -1;
            }, this._flushDelay);
        }
    }
    _flushBuffer() {
        for (const error of this._buffer) {
            this._telemetryService.publicLogError2('UnhandledError', error);
        }
        this._buffer.length = 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL2Vycm9yVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUEwRGhFLE1BQU0sS0FBVyxVQUFVLENBUzFCO0FBVEQsV0FBaUIsVUFBVTtJQUMxQixTQUFnQixPQUFPLENBQUMsQ0FBYSxFQUFFLENBQWE7UUFDbkQsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMvQixPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBUGUsa0JBQU8sVUFPdEIsQ0FBQTtBQUNGLENBQUMsRUFUZ0IsVUFBVSxLQUFWLFVBQVUsUUFTMUI7QUFFRCxNQUFNLENBQUMsT0FBTyxPQUFnQixrQkFBa0I7YUFDakMsd0JBQW1CLEdBQVcsQ0FBQyxHQUFHLElBQUksQUFBbkIsQ0FBbUI7SUFRcEQsWUFDQyxnQkFBbUMsRUFDbkMsVUFBVSxHQUFHLGtC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