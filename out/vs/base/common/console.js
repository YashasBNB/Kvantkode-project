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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvbnNvbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQWtCOUIsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVE7SUFDMUMsTUFBTSxLQUFLLEdBQUcsR0FBd0IsQ0FBQTtJQUV0QyxPQUFPLEtBQUssSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUE7QUFDckYsQ0FBQztBQUVELE1BQU0sVUFBVSxLQUFLLENBQUMsS0FBd0I7SUFDN0MsTUFBTSxJQUFJLEdBQVUsRUFBRSxDQUFBO0lBQ3RCLElBQUksS0FBeUIsQ0FBQTtJQUU3QixjQUFjO0lBQ2QsSUFBSSxDQUFDO1FBQ0osTUFBTSxlQUFlLEdBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFMUQsOENBQThDO1FBQzlDLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBbUIsQ0FBQTtRQUNuRixJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0MsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFBLENBQUMsNkJBQTZCO1lBQ25ELEtBQUssR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFBO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLENBQUMs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