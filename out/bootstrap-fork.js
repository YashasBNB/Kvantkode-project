/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as performance from './vs/base/common/performance.js';
import { removeGlobalNodeJsModuleLookupPaths, devInjectNodeModuleLookupPath, } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
performance.mark('code/fork/start');
//#region Helpers
function pipeLoggingToParent() {
    const MAX_STREAM_BUFFER_LENGTH = 1024 * 1024;
    const MAX_LENGTH = 100000;
    /**
     * Prevent circular stringify and convert arguments to real array
     */
    function safeToString(args) {
        const seen = [];
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
        try {
            const res = JSON.stringify(argsArray, function (key, value) {
                // Objects get special treatment to prevent circles
                if (isObject(value) || Array.isArray(value)) {
                    if (seen.indexOf(value) !== -1) {
                        return '[Circular]';
                    }
                    seen.push(value);
                }
                return value;
            });
            if (res.length > MAX_LENGTH) {
                return 'Output omitted for a large object that exceeds the limits';
            }
            return res;
        }
        catch (error) {
            return `Output omitted for an object that cannot be inspected ('${error.toString()}')`;
        }
    }
    function safeSend(arg) {
        try {
            if (process.send) {
                process.send(arg);
            }
        }
        catch (error) {
            // Can happen if the parent channel is closed meanwhile
        }
    }
    function isObject(obj) {
        return (typeof obj === 'object' &&
            obj !== null &&
            !Array.isArray(obj) &&
            !(obj instanceof RegExp) &&
            !(obj instanceof Date));
    }
    function safeSendConsoleMessage(severity, args) {
        safeSend({ type: '__$console', severity, arguments: args });
    }
    /**
     * Wraps a console message so that it is transmitted to the renderer.
     *
     * The wrapped property is not defined with `writable: false` to avoid
     * throwing errors, but rather a no-op setting. See https://github.com/microsoft/vscode-extension-telemetry/issues/88
     */
    function wrapConsoleMethod(method, severity) {
        Object.defineProperty(console, method, {
            set: () => { },
            get: () => function () {
                safeSendConsoleMessage(severity, safeToString(arguments));
            },
        });
    }
    /**
     * Wraps process.stderr/stdout.write() so that it is transmitted to the
     * renderer or CLI. It both calls through to the original method as well
     * as to console.log with complete lines so that they're made available
     * to the debugger/CLI.
     */
    function wrapStream(streamName, severity) {
        const stream = process[streamName];
        const original = stream.write;
        let buf = '';
        Object.defineProperty(stream, 'write', {
            set: () => { },
            get: () => (chunk, encoding, callback) => {
                buf += chunk.toString(encoding);
                const eol = buf.length > MAX_STREAM_BUFFER_LENGTH ? buf.length : buf.lastIndexOf('\n');
                if (eol !== -1) {
                    console[severity](buf.slice(0, eol));
                    buf = buf.slice(eol + 1);
                }
                original.call(stream, chunk, encoding, callback);
            },
        });
    }
    // Pass console logging to the outside so that we have it in the main side if told so
    if (process.env['VSCODE_VERBOSE_LOGGING'] === 'true') {
        wrapConsoleMethod('info', 'log');
        wrapConsoleMethod('log', 'log');
        wrapConsoleMethod('warn', 'warn');
        wrapConsoleMethod('error', 'error');
    }
    else {
        console.log = function () {
            /* ignore */
        };
        console.warn = function () {
            /* ignore */
        };
        console.info = function () {
            /* ignore */
        };
        wrapConsoleMethod('error', 'error');
    }
    wrapStream('stderr', 'error');
    wrapStream('stdout', 'log');
}
function handleExceptions() {
    // Handle uncaught exceptions
    process.on('uncaughtException', function (err) {
        console.error('Uncaught Exception: ', err);
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', function (reason) {
        console.error('Unhandled Promise Rejection: ', reason);
    });
}
function terminateWhenParentTerminates() {
    const parentPid = Number(process.env['VSCODE_PARENT_PID']);
    if (typeof parentPid === 'number' && !isNaN(parentPid)) {
        setInterval(function () {
            try {
                process.kill(parentPid, 0); // throws an exception if the main process doesn't exist anymore.
            }
            catch (e) {
                process.exit();
            }
        }, 5000);
    }
}
function configureCrashReporter() {
    const crashReporterProcessType = process.env['VSCODE_CRASH_REPORTER_PROCESS_TYPE'];
    if (crashReporterProcessType) {
        try {
            //@ts-ignore
            if (process['crashReporter'] &&
                typeof process['crashReporter'].addExtraParameter === 'function' /* Electron only */) {
                //@ts-ignore
                process['crashReporter'].addExtraParameter('processType', crashReporterProcessType);
            }
        }
        catch (error) {
            console.error(error);
        }
    }
}
//#endregion
// Crash reporter
configureCrashReporter();
// Remove global paths from the node module lookup (node.js only)
removeGlobalNodeJsModuleLookupPaths();
if (process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']) {
    devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
}
// Configure: pipe logging to parent process
if (!!process.send && process.env['VSCODE_PIPE_LOGGING'] === 'true') {
    pipeLoggingToParent();
}
// Handle Exceptions
if (!process.env['VSCODE_HANDLES_UNCAUGHT_ERRORS']) {
    handleExceptions();
}
// Terminate when parent terminates
if (process.env['VSCODE_PARENT_PID']) {
    terminateWhenParentTerminates();
}
// Bootstrap ESM
await bootstrapESM();
// Load ESM entry point
await import([`./${process.env['VSCODE_ESM_ENTRYPOINT']}.js`].join('/') /* workaround: esbuild prints some strange warnings when trying to inline? */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWZvcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJib290c3RyYXAtZm9yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssV0FBVyxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsNkJBQTZCLEdBQzdCLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRWpELFdBQVcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUVuQyxpQkFBaUI7QUFFakIsU0FBUyxtQkFBbUI7SUFDM0IsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQzVDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQTtJQUV6Qjs7T0FFRztJQUNILFNBQVMsWUFBWSxDQUFDLElBQXdCO1FBQzdDLE1BQU0sSUFBSSxHQUFjLEVBQUUsQ0FBQTtRQUMxQixNQUFNLFNBQVMsR0FBYyxFQUFFLENBQUE7UUFFL0IsZ0RBQWdEO1FBQ2hELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFakIseUVBQXlFO2dCQUN6RSwyRUFBMkU7Z0JBQzNFLCtFQUErRTtnQkFDL0UsSUFBSSxPQUFPLEdBQUcsS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDaEMsR0FBRyxHQUFHLFdBQVcsQ0FBQTtnQkFDbEIsQ0FBQztnQkFFRCxtRkFBbUY7Z0JBQ25GLHFFQUFxRTtxQkFDaEUsSUFB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