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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2NhcGFiaWxpdGllcy9jb21tYW5kRGV0ZWN0aW9uL3Rlcm1pbmFsQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWlDaEcsTUFBTSxPQUFPLGVBQWU7SUFDM0IsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsSUFBSSxxQkFBcUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFBO0lBQzlDLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFBO0lBQ2xDLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFBO0lBQ2xDLENBQUM7SUFDRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFBO0lBQ2pDLENBQUM7SUFDRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUE7SUFDMUMsQ0FBQztJQUNELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUE7SUFDL0IsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUE7SUFDbEMsQ0FBQztJQUNELElBQUksU0FBUyxDQUFDLEtBQStCO1FBQzVDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtJQUNuQyxDQUFDO0lBQ0QsSUFBSSxjQUFjO1FBQ2pCLE9BQU8s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