/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from './uri.js';
export function isRemoteConsoleLog(obj) {
    const entry = obj;
    return entry && typeof entry.type === 'string' && typeof entry.severity === 'string';
}
export function parse(entry) {
    const args = [];
    let stack;
    // Parse Entry
    try {
        const parsedArguments = JSON.parse(entry.arguments);
        // Check for special stack entry as last entry
        const stackArgument = parsedArguments[parsedArguments.length - 1];
        if (stackArgument && stackArgument.__$stack) {
            parsedArguments.pop(); // stack is handled specially
            stack = stackArgument.__$stack;
        }
        args.push(...parsedArguments);
    }
    catch (error) {
        args.push('Unable to log remote console arguments', entry.arguments);
    }
    return { args, stack };
}
export function getFirstFrame(arg0) {
    if (typeof arg0 !== 'string') {
        return getFirstFrame(parse(arg0).stack);
    }
    // Parse a source information out of the stack if we have one. Format can be:
    // at vscode.commands.registerCommand (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)
    // or
    // at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17
    // or
    // at c:\Users\someone\Desktop\end-js\extension.js:19:17
    // or
    // at e.$executeContributedCommand(c:\Users\someone\Desktop\end-js\extension.js:19:17)
    const stack = arg0;
    if (stack) {
        const topFrame = findFirstFrame(stack);
        // at [^\/]* => line starts with "at" followed by any character except '/' (to not capture unix paths too late)
        // (?:(?:[a-zA-Z]+:)|(?:[\/])|(?:\\\\) => windows drive letter OR unix root OR unc root
        // (?:.+) => simple pattern for the path, only works because of the line/col pattern after
        // :(?:\d+):(?:\d+) => :line:column data
        const matches = /at [^\/]*((?:(?:[a-zA-Z]+:)|(?:[\/])|(?:\\\\))(?:.+)):(\d+):(\d+)/.exec(topFrame || '');
        if (matches && matches.length === 4) {
            return {
                uri: URI.file(matches[1]),
                line: Number(matches[2]),
                column: Number(matches[3]),
            };
        }
    }
    return undefined;
}
function findFirstFrame(stack) {
    if (!stack) {
        return stack;
    }
    const newlineIndex = stack.indexOf('\n');
    if (newlineIndex === -1) {
        return stack;
    }
    return stack.substring(0, newlineIndex);
}
export function log(entry, label) {
    const { args, stack } = parse(entry);
    const isOneStringArg = typeof args[0] === 'string' && args.length === 1;
    let topFrame = findFirstFrame(stack);
    if (topFrame) {
        topFrame = `(${topFrame.trim()})`;
    }
    let consoleArgs = [];
    // First arg is a string
    if (typeof args[0] === 'string') {
        if (topFrame && isOneStringArg) {
            consoleArgs = [
                `%c[${label}] %c${args[0]} %c${topFrame}`,
                color('blue'),
                color(''),
                color('grey'),
            ];
        }
        else {
            consoleArgs = [`%c[${label}] %c${args[0]}`, color('blue'), color(''), ...args.slice(1)];
        }
    }
    // First arg is something else, just apply all
    else {
        consoleArgs = [`%c[${label}]%`, color('blue'), ...args];
    }
    // Stack: add to args unless already added
    if (topFrame && !isOneStringArg) {
        consoleArgs.push(topFrame);
    }
    // Log it
    if (typeof console[entry.severity] !== 'function') {
        throw new Error('Unknown console method');
    }
    ;
    console[entry.severity].apply(console, consoleArgs);
}
function color(color) {
    return `color: ${color}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29uc29sZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBa0I5QixNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBUTtJQUMxQyxNQUFNLEtBQUssR0FBRyxHQUF3QixDQUFBO0lBRXRDLE9BQU8sS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxLQUFLLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQTtBQUNyRixDQUFDO0FBRUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxLQUF3QjtJQUM3QyxNQUFNLElBQUksR0FBVSxFQUFFLENBQUE7SUFDdEIsSUFBSSxLQUF5QixDQUFBO0lBRTdCLGNBQWM7SUFDZCxJQUFJLENBQUM7UUFDSixNQUFNLGVBQWUsR0FBVSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUxRCw4Q0FBOEM7UUFDOUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFtQixDQUFBO1FBQ25GLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBQyw2QkFBNkI7WUFDbkQsS0FBSyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUss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