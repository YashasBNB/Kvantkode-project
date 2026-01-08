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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb25zb2xlRm9yd2FyZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUEwQixNQUFNLHVCQUF1QixDQUFBO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBELElBQWUsK0JBQStCLEdBQTlDLE1BQWUsK0JBQStCO0lBS3BELFlBQ3FCLFVBQThCLEVBQ3pCLFFBQWlDO1FBRTFELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUE7UUFDekQsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQTtRQUVuRCxxRkFBcUY7UUFDckYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsa0JB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