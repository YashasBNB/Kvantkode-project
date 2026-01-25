/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TerminalCommand {
    get command() {
        return this._properties.command;
    }
    get commandLineConfidence() {
        return this._properties.commandLineConfidence;
    }
    get isTrusted() {
        return this._properties.isTrusted;
    }
    get timestamp() {
        return this._properties.timestamp;
    }
    get duration() {
        return this._properties.duration;
    }
    get promptStartMarker() {
        return this._properties.promptStartMarker;
    }
    get marker() {
        return this._properties.marker;
    }
    get endMarker() {
        return this._properties.endMarker;
    }
    set endMarker(value) {
        this._properties.endMarker = value;
    }
    get executedMarker() {
        return this._properties.executedMarker;
    }
    get aliases() {
        return this._properties.aliases;
    }
    get wasReplayed() {
        return this._properties.wasReplayed;
    }
    get cwd() {
        return this._properties.cwd;
    }
    get exitCode() {
        return this._properties.exitCode;
    }
    get commandStartLineContent() {
        return this._properties.commandStartLineContent;
    }
    get markProperties() {
        return this._properties.markProperties;
    }
    get executedX() {
        return this._properties.executedX;
    }
    get startX() {
        return this._properties.startX;
    }
    constructor(_xterm, _properties) {
        this._xterm = _xterm;
        this._properties = _properties;
    }
    static deserialize(xterm, serialized, isCommandStorageDisabled) {
        const buffer = xterm.buffer.normal;
        const marker = serialized.startLine !== undefined
            ? xterm.registerMarker(serialized.startLine - (buffer.baseY + buffer.cursorY))
            : undefined;
        // Check for invalid command
        if (!marker) {
            return undefined;
        }
        const promptStartMarker = serialized.promptStartLine !== undefined
            ? xterm.registerMarker(serialized.promptStartLine - (buffer.baseY + buffer.cursorY))
            : undefined;
        // Valid full command
        const endMarker = serialized.endLine !== undefined
            ? xterm.registerMarker(serialized.endLine - (buffer.baseY + buffer.cursorY))
            : undefined;
        const executedMarker = serialized.executedLine !== undefined
            ? xterm.registerMarker(serialized.executedLine - (buffer.baseY + buffer.cursorY))
            : undefined;
        const newCommand = new TerminalCommand(xterm, {
            command: isCommandStorageDisabled ? '' : serialized.command,
            commandLineConfidence: serialized.commandLineConfidence ?? 'low',
            isTrusted: serialized.isTrusted,
            promptStartMarker,
            marker,
            startX: serialized.startX,
            endMarker,
            executedMarker,
            executedX: serialized.executedX,
            timestamp: serialized.timestamp,
            duration: serialized.duration,
            cwd: serialized.cwd,
            commandStartLineContent: serialized.commandStartLineContent,
            exitCode: serialized.exitCode,
            markProperties: serialized.markProperties,
            aliases: undefined,
            wasReplayed: true,
        });
        return newCommand;
    }
    serialize(isCommandStorageDisabled) {
        return {
            promptStartLine: this.promptStartMarker?.line,
            startLine: this.marker?.line,
            startX: undefined,
            endLine: this.endMarker?.line,
            executedLine: this.executedMarker?.line,
            executedX: this.executedX,
            command: isCommandStorageDisabled ? '' : this.command,
            commandLineConfidence: isCommandStorageDisabled ? 'low' : this.commandLineConfidence,
            isTrusted: this.isTrusted,
            cwd: this.cwd,
            exitCode: this.exitCode,
            commandStartLineContent: this.commandStartLineContent,
            timestamp: this.timestamp,
            duration: this.duration,
            markProperties: this.markProperties,
        };
    }
    extractCommandLine() {
        return extractCommandLine(this._xterm.buffer.active, this._xterm.cols, this.marker, this.startX, this.executedMarker, this.executedX);
    }
    getOutput() {
        if (!this.executedMarker || !this.endMarker) {
            return undefined;
        }
        const startLine = this.executedMarker.line;
        const endLine = this.endMarker.line;
        if (startLine === endLine) {
            return undefined;
        }
        let output = '';
        let line;
        for (let i = startLine; i < endLine; i++) {
            line = this._xterm.buffer.active.getLine(i);
            if (!line) {
                continue;
            }
            output += line.translateToString(!line.isWrapped) + (line.isWrapped ? '' : '\n');
        }
        return output === '' ? undefined : output;
    }
    getOutputMatch(outputMatcher) {
        // TODO: Add back this check? this._ptyHeuristics.value instanceof WindowsPtyHeuristics && (executedMarker?.line === endMarker?.line) ? this._currentCommand.commandStartMarker : executedMarker
        if (!this.executedMarker || !this.endMarker) {
            return undefined;
        }
        const endLine = this.endMarker.line;
        if (endLine === -1) {
            return undefined;
        }
        const buffer = this._xterm.buffer.active;
        const startLine = Math.max(this.executedMarker.line, 0);
        const matcher = outputMatcher.lineMatcher;
        const linesToCheck = typeof matcher === 'string' ? 1 : outputMatcher.length || countNewLines(matcher);
        const lines = [];
        let match;
        if (outputMatcher.anchor === 'bottom') {
            for (let i = endLine - (outputMatcher.offset || 0); i >= startLine; i--) {
                let wrappedLineStart = i;
                const wrappedLineEnd = i;
                while (wrappedLineStart >= startLine && buffer.getLine(wrappedLineStart)?.isWrapped) {
                    wrappedLineStart--;
                }
                i = wrappedLineStart;
                lines.unshift(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, this._xterm.cols));
                if (!match) {
                    match = lines[0].match(matcher);
                }
                if (lines.length >= linesToCheck) {
                    break;
                }
            }
        }
        else {
            for (let i = startLine + (outputMatcher.offset || 0); i < endLine; i++) {
                const wrappedLineStart = i;
                let wrappedLineEnd = i;
                while (wrappedLineEnd + 1 < endLine && buffer.getLine(wrappedLineEnd + 1)?.isWrapped) {
                    wrappedLineEnd++;
                }
                i = wrappedLineEnd;
                lines.push(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, this._xterm.cols));
                if (!match) {
                    match = lines[lines.length - 1].match(matcher);
                }
                if (lines.length >= linesToCheck) {
                    break;
                }
            }
        }
        return match ? { regexMatch: match, outputLines: lines } : undefined;
    }
    hasOutput() {
        return (!this.executedMarker?.isDisposed &&
            !this.endMarker?.isDisposed &&
            !!(this.executedMarker && this.endMarker && this.executedMarker.line < this.endMarker.line));
    }
    getPromptRowCount() {
        return getPromptRowCount(this, this._xterm.buffer.active);
    }
    getCommandRowCount() {
        return getCommandRowCount(this);
    }
}
export class PartialTerminalCommand {
    constructor(_xterm) {
        this._xterm = _xterm;
    }
    serialize(cwd) {
        if (!this.commandStartMarker) {
            return undefined;
        }
        return {
            promptStartLine: this.promptStartMarker?.line,
            startLine: this.commandStartMarker.line,
            startX: this.commandStartX,
            endLine: undefined,
            executedLine: undefined,
            executedX: undefined,
            command: '',
            commandLineConfidence: 'low',
            isTrusted: true,
            cwd,
            exitCode: undefined,
            commandStartLineContent: undefined,
            timestamp: 0,
            duration: 0,
            markProperties: undefined,
        };
    }
    promoteToFullCommand(cwd, exitCode, ignoreCommandLine, markProperties) {
        // When the command finishes and executed never fires the placeholder selector should be used.
        if (exitCode === undefined && this.command === undefined) {
            this.command = '';
        }
        if ((this.command !== undefined && !this.command.startsWith('\\')) || ignoreCommandLine) {
            return new TerminalCommand(this._xterm, {
                command: ignoreCommandLine ? '' : this.command || '',
                commandLineConfidence: ignoreCommandLine ? 'low' : this.commandLineConfidence || 'low',
                isTrusted: !!this.isTrusted,
                promptStartMarker: this.promptStartMarker,
                marker: this.commandStartMarker,
                startX: this.commandStartX,
                endMarker: this.commandFinishedMarker,
                executedMarker: this.commandExecutedMarker,
                executedX: this.commandExecutedX,
                timestamp: Date.now(),
                duration: this.commandDuration || 0,
                cwd,
                exitCode,
                commandStartLineContent: this.commandStartLineContent,
                markProperties,
            });
        }
        return undefined;
    }
    markExecutedTime() {
        if (this.commandExecutedTimestamp === undefined) {
            this.commandExecutedTimestamp = Date.now();
        }
    }
    markFinishedTime() {
        if (this.commandDuration === undefined && this.commandExecutedTimestamp !== undefined) {
            this.commandDuration = Date.now() - this.commandExecutedTimestamp;
        }
    }
    extractCommandLine() {
        return extractCommandLine(this._xterm.buffer.active, this._xterm.cols, this.commandStartMarker, this.commandStartX, this.commandExecutedMarker, this.commandExecutedX);
    }
    getPromptRowCount() {
        return getPromptRowCount(this, this._xterm.buffer.active);
    }
    getCommandRowCount() {
        return getCommandRowCount(this);
    }
}
function extractCommandLine(buffer, cols, commandStartMarker, commandStartX, commandExecutedMarker, commandExecutedX) {
    if (!commandStartMarker ||
        !commandExecutedMarker ||
        commandStartX === undefined ||
        commandExecutedX === undefined) {
        return '';
    }
    let content = '';
    for (let i = commandStartMarker.line; i <= commandExecutedMarker.line; i++) {
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, i === commandStartMarker.line ? commandStartX : 0, i === commandExecutedMarker.line ? commandExecutedX : cols);
        }
    }
    return content;
}
function getXtermLineContent(buffer, lineStart, lineEnd, cols) {
    // Cap the maximum number of lines generated to prevent potential performance problems. This is
    // more of a sanity check as the wrapped line should already be trimmed down at this point.
    const maxLineLength = Math.max((2048 / cols) * 2);
    lineEnd = Math.min(lineEnd, lineStart + maxLineLength);
    let content = '';
    for (let i = lineStart; i <= lineEnd; i++) {
        // Make sure only 0 to cols are considered as resizing when windows mode is enabled will
        // retain buffer data outside of the terminal width as reflow is disabled.
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, 0, cols);
        }
    }
    return content;
}
function countNewLines(regex) {
    if (!regex.multiline) {
        return 1;
    }
    const source = regex.source;
    let count = 1;
    let i = source.indexOf('\\n');
    while (i !== -1) {
        count++;
        i = source.indexOf('\\n', i + 1);
    }
    return count;
}
function getPromptRowCount(command, buffer) {
    const marker = 'hasOutput' in command ? command.marker : command.commandStartMarker;
    if (!marker || !command.promptStartMarker) {
        return 1;
    }
    let promptRowCount = 1;
    let promptStartLine = command.promptStartMarker.line;
    // Trim any leading whitespace-only lines to retain vertical space
    while (promptStartLine < marker.line &&
        (buffer.getLine(promptStartLine)?.translateToString(true) ?? '').length === 0) {
        promptStartLine++;
    }
    promptRowCount = marker.line - promptStartLine + 1;
    return promptRowCount;
}
function getCommandRowCount(command) {
    const marker = 'hasOutput' in command ? command.marker : command.commandStartMarker;
    const executedMarker = 'hasOutput' in command ? command.executedMarker : command.commandExecutedMarker;
    if (!marker || !executedMarker) {
        return 1;
    }
    const commandExecutedLine = Math.max(executedMarker.line, marker.line);
    let commandRowCount = commandExecutedLine - marker.line + 1;
    // Trim the last line if the cursor X is in the left-most cell
    const executedX = 'hasOutput' in command ? command.executedX : command.commandExecutedX;
    if (executedX === 0) {
        commandRowCount--;
    }
    return commandRowCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb24vdGVybWluYWxDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBaUNoRyxNQUFNLE9BQU8sZUFBZTtJQUMzQixJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFBO0lBQ2hDLENBQUM7SUFDRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUE7SUFDOUMsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUE7SUFDbEMsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUE7SUFDbEMsQ0FBQztJQUNELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUE7SUFDakMsQ0FBQztJQUNELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQTtJQUMxQyxDQUFDO0lBQ0QsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQTtJQUMvQixDQUFDO0lBQ0QsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQTtJQUNsQyxDQUFDO0lBQ0QsSUFBSSxTQUFTLENBQUMsS0FBK0I7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBQ25DLENBQUM7SUFDRCxJQUFJLGNBQWM7UUFDakIs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