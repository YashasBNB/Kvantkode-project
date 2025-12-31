/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { safeStringify } from '../../../base/common/objects.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
let AbstractExtHostConsoleForwarder = class AbstractExtHostConsoleForwarder {
    constructor(extHostRpc, initData) {
        this._mainThreadConsole = extHostRpc.getProxy(MainContext.MainThreadConsole);
        this._includeStack = initData.consoleForward.includeStack;
        this._logNative = initData.consoleForward.logNative;
        // Pass console logging to the outside so that we have it in the main side if told so
        this._wrapConsoleMethod('info', 'log');
        this._wrapConsoleMethod('log', 'log');
        this._wrapConsoleMethod('warn', 'warn');
        this._wrapConsoleMethod('debug', 'debug');
        this._wrapConsoleMethod('error', 'error');
    }
    /**
     * Wraps a console message so that it is transmitted to the renderer. If
     * native logging is turned on, the original console message will be written
     * as well. This is needed since the console methods are "magic" in V8 and
     * are the only methods that allow later introspection of logged variables.
     *
     * The wrapped property is not defined with `writable: false` to avoid
     * throwing errors, but rather a no-op setting. See https://github.com/microsoft/vscode-extension-telemetry/issues/88
     */
    _wrapConsoleMethod(method, severity) {
        const that = this;
        const original = console[method];
        Object.defineProperty(console, method, {
            set: () => { },
            get: () => function () {
                that._handleConsoleCall(method, severity, original, arguments);
            },
        });
    }
    _handleConsoleCall(method, severity, original, args) {
        this._mainThreadConsole.$logExtensionHostMessage({
            type: '__$console',
            severity,
            arguments: safeStringifyArgumentsToArray(args, this._includeStack),
        });
        if (this._logNative) {
            this._nativeConsoleLogMessage(method, original, args);
        }
    }
};
AbstractExtHostConsoleForwarder = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], AbstractExtHostConsoleForwarder);
export { AbstractExtHostConsoleForwarder };
const MAX_LENGTH = 100000;
/**
 * Prevent circular stringify and convert arguments to real array
 */
function safeStringifyArgumentsToArray(args, includeStack) {
    const argsArray = [];
    // Massage some arguments with special treatment
    if (args.length) {
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            // Any argument of type 'undefined' needs to be specially treated because
            // JSON.stringify will simply ignore those. We replace them with the string
            // 'undefined' which is not 100% right, but good enough to be logged to console
            if (typeof arg === 'undefined') {
                arg = 'undefined';
            }
            // Any argument that is an Error will be changed to be just the error stack/message
            // itself because currently cannot serialize the error over entirely.
            else if (arg instanceof Error) {
                const errorObj = arg;
                if (errorObj.stack) {
                    arg = errorObj.stack;
                }
                else {
                    arg = errorObj.toString();
                }
            }
            argsArray.push(arg);
        }
    }
    // Add the stack trace as payload if we are told so. We remove the message and the 2 top frames
    // to start the stacktrace where the console message was being written
    if (includeStack) {
        const stack = new Error().stack;
        if (stack) {
            argsArray.push({ __$stack: stack.split('\n').slice(3).join('\n') });
        }
    }
    try {
        const res = safeStringify(argsArray);
        if (res.length > MAX_LENGTH) {
            return 'Output omitted for a large object that exceeds the limits';
        }
        return res;
    }
    catch (error) {
        return `Output omitted for an object that cannot be inspected ('${error.toString()}')`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29uc29sZUZvcndhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBMEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVwRCxJQUFlLCtCQUErQixHQUE5QyxNQUFlLCtCQUErQjtJQUtwRCxZQUNxQixVQUE4QixFQUN6QixRQUFpQztRQUUxRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFBO1FBQ3pELElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUE7UUFFbkQscUZBQXFGO1FBQ3JGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLGtCQUFrQixD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