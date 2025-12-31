/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
export default class ErrorTelemetry extends BaseErrorTelemetry {
    installErrorListeners() {
        let oldOnError;
        const that = this;
        if (typeof mainWindow.onerror === 'function') {
            oldOnError = mainWindow.onerror;
        }
        mainWindow.onerror = function (message, filename, line, column, error) {
            that._onUncaughtError(message, filename, line, column, error);
            oldOnError?.apply(this, [message, filename, line, column, error]);
        };
        this._disposables.add(toDisposable(() => {
            if (oldOnError) {
                mainWindow.onerror = oldOnError;
            }
        }));
    }
    _onUncaughtError(msg, file, line, column, err) {
        const data = {
            callstack: msg,
            msg,
            file,
            line,
            column,
        };
        if (err) {
            // If it's the no telemetry error it doesn't get logged
            if (ErrorNoTelemetry.isErrorNoTelemetry(err)) {
                return;
            }
            const { name, message, stack } = err;
            data.uncaught_error_name = name;
            if (message) {
                data.uncaught_error_msg = message;
            }
            if (stack) {
                data.callstack = Array.isArray(err.stack) ? (err.stack = err.stack.join('\n')) : err.stack;
            }
        }
        this._enqueue(data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvYnJvd3Nlci9lcnJvclRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hFLE9BQU8sa0JBQWtDLE1BQU0sNkJBQTZCLENBQUE7QUFFNUUsTUFBTSxDQUFDLE9BQU8sT0FBTyxjQUFlLFNBQVEsa0JBQWtCO0lBQzFDLHFCQUFxQjtRQUN2QyxJQUFJLFVBQStCLENBQUE7UUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksT0FBTyxVQUFVLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzlDLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxVQUFVLENBQUMsT0FBTyxHQUFHLFVBQ3BCLE9BQXVCLEVBQ3ZCLFFBQWlCLEVBQ2pCLElBQWEsRUFDYixNQUFlLEVBQ2YsS0FBYTtZQUViLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFpQixFQUFFLFFBQWtCLEVBQUUsSUFBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzRixVQUFVLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pCLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixHQUFXLEVBQ1gsSUFBWSxFQUNaLElBQVksRUFDWixNQUFlLEVBQ2YsR0FBUztRQUVULE1BQU0sSUFBSSxHQUFlO1lBQ3hCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsR0FBRztZQUNILElBQUk7WUFDSixJQUFJO1lBQ0osTUFBTTtTQUNOLENBQUE7UUFFRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsdURBQXVEO1lBQ3ZELElBQUksZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxHQUFHLENBQUE7WUFDcEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtZQUMvQixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUE7WUFDbEMsQ0FBQztZQUNELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUE7WUFDM0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BCLENBQUM7Q0FDRCJ9