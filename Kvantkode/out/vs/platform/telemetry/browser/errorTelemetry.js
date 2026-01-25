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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9icm93c2VyL2Vycm9yVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxrQkFBa0MsTUFBTSw2QkFBNkIsQ0FBQTtBQUU1RSxNQUFNLENBQUMsT0FBTyxPQUFPLGNBQWUsU0FBUSxrQkFBa0I7SUFDMUMscUJBQXFCO1FBQ3ZDLElBQUksVUFBK0IsQ0FBQTtRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxPQUFPLFVBQVUsQ0FBQyxPQUFPLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDOUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUE7UUFDaEMsQ0FBQztRQUNELFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFDcEIsT0FBdUIsRUFDdkIsUUFBaUIsRUFDakIsSUFBYSxFQUNiLE1BQWUsRUFDZixLQUFhO1lBRWIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQWlCLEVBQUUsUUFBa0IsRUFBRSxJQUFjLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNGLFVBQVUsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLEdBQVcsRUFDWCxJQUFZLEVBQ1osSUFBWSxFQUNaLE1BQWUsRUFDZixHQUFTO1FBRVQsTUFBTSxJQUFJLEdBQWU7WUFDeEIsU0FBUyxFQUFFLEdBQUc7WUFDZCxHQUFHO1lBQ0gsSUFBSTtZQUNKLElBQUk7WUFDSixNQUFNO1NBQ04sQ0FBQTtRQUVELElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCx1REFBdUQ7WUFDdkQsSUFBSSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQTtZQUNwQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO1lBQy9CLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQTtZQUMzRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEIsQ0FBQztDQUNEIn0=