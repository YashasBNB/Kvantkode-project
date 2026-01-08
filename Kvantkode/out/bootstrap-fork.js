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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWZvcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1mb3JrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxXQUFXLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyw2QkFBNkIsR0FDN0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFakQsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBRW5DLGlCQUFpQjtBQUVqQixTQUFTLG1CQUFtQjtJQUMzQixNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxJQUFJLENBQUE7SUFDNUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFBO0lBRXpCOztPQUVHO0lBQ0gsU0FBUyxZQUFZLENBQUMsSUFBd0I7UUFDN0MsTUFBTSxJQUFJLEdBQWMsRUFBRSxDQUFBO1FBQzFCLE1BQU0sU0FBUyxHQUFjLEVBQUUsQ0FBQTtRQUUvQixnREFBZ0Q7UUFDaEQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUVqQix5RUFBeUU7Z0JBQ3pFLDJFQUEyRTtnQkFDM0UsK0VBQStFO2dCQUMvRSxJQUFJLE9BQU8sR0FBRyxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUNoQyxHQUFHLEdBQUcsV0FBVyxDQUFBO2dCQUNsQixDQUFDO2dCQUVELG1GQUFtRjtnQkFDbkYscUVBQXFFO3FCQUNo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