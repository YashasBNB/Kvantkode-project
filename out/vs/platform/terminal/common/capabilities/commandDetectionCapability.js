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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MandatoryMutableDisposable, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../log/common/log.js';
import { PartialTerminalCommand, TerminalCommand, } from './commandDetection/terminalCommand.js';
import { PromptInputModel } from './commandDetection/promptInputModel.js';
let CommandDetectionCapability = class CommandDetectionCapability extends Disposable {
    get promptInputModel() {
        return this._promptInputModel;
    }
    get hasRichCommandDetection() {
        return this._hasRichCommandDetection;
    }
    get commands() {
        return this._commands;
    }
    get executingCommand() {
        return this._currentCommand.command;
    }
    get executingCommandObject() {
        if (this._currentCommand.commandStartMarker) {
            // HACK: This does a lot more than the consumer of the API needs. It's also a little
            //       misleading since it's not promoting the current command yet.
            return this._currentCommand.promoteToFullCommand(this._cwd, undefined, this._handleCommandStartOptions?.ignoreCommandLine ?? false, undefined);
        }
        return undefined;
    }
    get executingCommandConfidence() {
        const casted = this._currentCommand;
        return 'commandLineConfidence' in casted ? casted.commandLineConfidence : undefined;
    }
    get currentCommand() {
        return this._currentCommand;
    }
    get cwd() {
        return this._cwd;
    }
    get promptTerminator() {
        return this._promptTerminator;
    }
    constructor(_terminal, _logService) {
        super();
        this._terminal = _terminal;
        this._logService = _logService;
        this.type = 2 /* TerminalCapability.CommandDetection */;
        this._commands = [];
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._commandMarkers = [];
        this.__isCommandStorageDisabled = false;
        this._hasRichCommandDetection = false;
        this._onCommandStarted = this._register(new Emitter());
        this.onCommandStarted = this._onCommandStarted.event;
        this._onCommandStartChanged = this._register(new Emitter());
        this.onCommandStartChanged = this._onCommandStartChanged.event;
        this._onBeforeCommandFinished = this._register(new Emitter());
        this.onBeforeCommandFinished = this._onBeforeCommandFinished.event;
        this._onCommandFinished = this._register(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this._onCommandExecuted = this._register(new Emitter());
        this.onCommandExecuted = this._onCommandExecuted.event;
        this._onCommandInvalidated = this._register(new Emitter());
        this.onCommandInvalidated = this._onCommandInvalidated.event;
        this._onCurrentCommandInvalidated = this._register(new Emitter());
        this.onCurrentCommandInvalidated = this._onCurrentCommandInvalidated.event;
        this._onSetRichCommandDetection = this._register(new Emitter());
        this.onSetRichCommandDetection = this._onSetRichCommandDetection.event;
        this._promptInputModel = this._register(new PromptInputModel(this._terminal, this.onCommandStarted, this.onCommandStartChanged, this.onCommandExecuted, this._logService));
        // Pull command line from the buffer if it was not set explicitly
        this._register(this.onCommandExecuted((command) => {
            if (command.commandLineConfidence !== 'high') {
                // HACK: onCommandExecuted actually fired with PartialTerminalCommand
                const typedCommand = command;
                command.command = typedCommand.extractCommandLine();
                command.commandLineConfidence = 'low';
                // ITerminalCommand
                if ('getOutput' in typedCommand) {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker &&
                        typedCommand.marker &&
                        typedCommand.executedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.startX !== undefined &&
                        typedCommand.startX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
                // PartialTerminalCommand
                else {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker &&
                        typedCommand.commandStartMarker &&
                        typedCommand.commandExecutedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.commandStartX !== undefined &&
                        typedCommand.commandStartX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
            }
        }));
        // Set up platform-specific behaviors
        const that = this;
        this._ptyHeuristicsHooks = new (class {
            get onCurrentCommandInvalidatedEmitter() {
                return that._onCurrentCommandInvalidated;
            }
            get onCommandStartedEmitter() {
                return that._onCommandStarted;
            }
            get onCommandExecutedEmitter() {
                return that._onCommandExecuted;
            }
            get dimensions() {
                return that._dimensions;
            }
            get isCommandStorageDisabled() {
                return that.__isCommandStorageDisabled;
            }
            get commandMarkers() {
                return that._commandMarkers;
            }
            set commandMarkers(value) {
                that._commandMarkers = value;
            }
            get clearCommandsInViewport() {
                return that._clearCommandsInViewport.bind(that);
            }
        })();
        this._ptyHeuristics = this._register(new MandatoryMutableDisposable(new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService)));
        this._dimensions = {
            cols: this._terminal.cols,
            rows: this._terminal.rows,
        };
        this._register(this._terminal.onResize((e) => this._handleResize(e)));
        this._register(this._terminal.onCursorMove(() => this._handleCursorMove()));
    }
    _handleResize(e) {
        this._ptyHeuristics.value.preHandleResize?.(e);
        this._dimensions.cols = e.cols;
        this._dimensions.rows = e.rows;
    }
    _handleCursorMove() {
        if (this._store.isDisposed) {
            return;
        }
        // Early versions of conpty do not have real support for an alt buffer, in addition certain
        // commands such as tsc watch will write to the top of the normal buffer. The following
        // checks when the cursor has moved while the normal buffer is empty and if it is above the
        // current command, all decorations within the viewport will be invalidated.
        //
        // This function is debounced so that the cursor is only checked when it is stable so
        // conpty's screen reprinting will not trigger decoration clearing.
        //
        // This is mostly a workaround for Windows but applies to all OS' because of the tsc watch
        // case.
        if (this._terminal.buffer.active === this._terminal.buffer.normal &&
            this._currentCommand.commandStartMarker) {
            if (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY <
                this._currentCommand.commandStartMarker.line) {
                this._clearCommandsInViewport();
                this._currentCommand.isInvalid = true;
                this._onCurrentCommandInvalidated.fire({ reason: "windows" /* CommandInvalidationReason.Windows */ });
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            const line = this._commands[i].marker?.line;
            if (line && line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        if (count > 0) {
            this._onCommandInvalidated.fire(this._commands.splice(this._commands.length - count, count));
        }
    }
    setContinuationPrompt(value) {
        this._promptInputModel.setContinuationPrompt(value);
    }
    // TODO: Simplify this, can everything work off the last line?
    setPromptTerminator(promptTerminator, lastPromptLine) {
        this._logService.debug('CommandDetectionCapability#setPromptTerminator', promptTerminator);
        this._promptTerminator = promptTerminator;
        this._promptInputModel.setLastPromptLine(lastPromptLine);
    }
    setCwd(value) {
        this._cwd = value;
    }
    setIsWindowsPty(value) {
        if (value && !(this._ptyHeuristics.value instanceof WindowsPtyHeuristics)) {
            const that = this;
            this._ptyHeuristics.value = new WindowsPtyHeuristics(this._terminal, this, new (class {
                get onCurrentCommandInvalidatedEmitter() {
                    return that._onCurrentCommandInvalidated;
                }
                get onCommandStartedEmitter() {
                    return that._onCommandStarted;
                }
                get onCommandExecutedEmitter() {
                    return that._onCommandExecuted;
                }
                get dimensions() {
                    return that._dimensions;
                }
                get isCommandStorageDisabled() {
                    return that.__isCommandStorageDisabled;
                }
                get commandMarkers() {
                    return that._commandMarkers;
                }
                set commandMarkers(value) {
                    that._commandMarkers = value;
                }
                get clearCommandsInViewport() {
                    return that._clearCommandsInViewport.bind(that);
                }
            })(), this._logService);
        }
        else if (!value && !(this._ptyHeuristics.value instanceof UnixPtyHeuristics)) {
            this._ptyHeuristics.value = new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService);
        }
    }
    setHasRichCommandDetection(value) {
        this._hasRichCommandDetection = value;
        this._onSetRichCommandDetection.fire(value);
    }
    setIsCommandStorageDisabled() {
        this.__isCommandStorageDisabled = true;
    }
    getCommandForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker &&
            line >= this._currentCommand.promptStartMarker?.line) {
            return this._currentCommand;
        }
        // No commands
        if (this._commands.length === 0) {
            return undefined;
        }
        // Line is before any registered commands
        if ((this._commands[0].promptStartMarker ?? this._commands[0].marker).line > line) {
            return undefined;
        }
        // Iterate backwards through commands to find the right one
        for (let i = this.commands.length - 1; i >= 0; i--) {
            if ((this.commands[i].promptStartMarker ?? this.commands[i].marker).line <= line) {
                return this.commands[i];
            }
        }
        return undefined;
    }
    getCwdForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker &&
            line >= this._currentCommand.promptStartMarker?.line) {
            return this._cwd;
        }
        const command = this.getCommandForLine(line);
        if (command && 'cwd' in command) {
            return command.cwd;
        }
        return undefined;
    }
    handlePromptStart(options) {
        // Adjust the last command's finished marker when needed. The standard position for the
        // finished marker `D` to appear is at the same position as the following prompt started
        // `A`.
        const lastCommand = this.commands.at(-1);
        if (lastCommand?.endMarker &&
            lastCommand?.executedMarker &&
            lastCommand.endMarker.line === lastCommand.executedMarker.line) {
            this._logService.debug('CommandDetectionCapability#handlePromptStart adjusted commandFinished', `${lastCommand.endMarker.line} -> ${lastCommand.executedMarker.line + 1}`);
            lastCommand.endMarker = cloneMarker(this._terminal, lastCommand.executedMarker, 1);
        }
        this._currentCommand.promptStartMarker =
            options?.marker ||
                (lastCommand?.endMarker
                    ? cloneMarker(this._terminal, lastCommand.endMarker)
                    : this._terminal.registerMarker(0));
        this._logService.debug('CommandDetectionCapability#handlePromptStart', this._terminal.buffer.active.cursorX, this._currentCommand.promptStartMarker?.line);
    }
    handleContinuationStart() {
        this._currentCommand.currentContinuationMarker = this._terminal.registerMarker(0);
        this._logService.debug('CommandDetectionCapability#handleContinuationStart', this._currentCommand.currentContinuationMarker);
    }
    handleContinuationEnd() {
        if (!this._currentCommand.currentContinuationMarker) {
            this._logService.warn('CommandDetectionCapability#handleContinuationEnd Received continuation end without start');
            return;
        }
        if (!this._currentCommand.continuations) {
            this._currentCommand.continuations = [];
        }
        this._currentCommand.continuations.push({
            marker: this._currentCommand.currentContinuationMarker,
            end: this._terminal.buffer.active.cursorX,
        });
        this._currentCommand.currentContinuationMarker = undefined;
        this._logService.debug('CommandDetectionCapability#handleContinuationEnd', this._currentCommand.continuations[this._currentCommand.continuations.length - 1]);
    }
    handleRightPromptStart() {
        this._currentCommand.commandRightPromptStartX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptStart', this._currentCommand.commandRightPromptStartX);
    }
    handleRightPromptEnd() {
        this._currentCommand.commandRightPromptEndX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptEnd', this._currentCommand.commandRightPromptEndX);
    }
    handleCommandStart(options) {
        this._handleCommandStartOptions = options;
        this._currentCommand.cwd = this._cwd;
        // Only update the column if the line has already been set
        this._currentCommand.commandStartMarker =
            options?.marker || this._currentCommand.commandStartMarker;
        if (this._currentCommand.commandStartMarker?.line === this._terminal.buffer.active.cursorY) {
            this._currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
            this._onCommandStartChanged.fire();
            this._logService.debug('CommandDetectionCapability#handleCommandStart', this._currentCommand.commandStartX, this._currentCommand.commandStartMarker?.line);
            return;
        }
        this._ptyHeuristics.value.handleCommandStart(options);
    }
    handleCommandExecuted(options) {
        this._ptyHeuristics.value.handleCommandExecuted(options);
        this._currentCommand.markExecutedTime();
    }
    handleCommandFinished(exitCode, options) {
        // Command executed may not have happened yet, if not handle it now so the expected events
        // properly propogate. This may cause the output to show up in the computed command line,
        // but the command line confidence will be low in the extension host for example and
        // therefore cannot be trusted anyway.
        if (!this._currentCommand.commandExecutedMarker) {
            this.handleCommandExecuted();
        }
        this._currentCommand.markFinishedTime();
        this._ptyHeuristics.value.preHandleCommandFinished?.();
        this._logService.debug('CommandDetectionCapability#handleCommandFinished', this._terminal.buffer.active.cursorX, options?.marker?.line, this._currentCommand.command, this._currentCommand);
        // HACK: Handle a special case on some versions of bash where identical commands get merged
        // in the output of `history`, this detects that case and sets the exit code to the last
        // command's exit code. This covered the majority of cases but will fail if the same command
        // runs with a different exit code, that will need a more robust fix where we send the
        // command ID and exit code over to the capability to adjust there.
        if (exitCode === undefined) {
            const lastCommand = this.commands.length > 0 ? this.commands[this.commands.length - 1] : undefined;
            if (this._currentCommand.command &&
                this._currentCommand.command.length > 0 &&
                lastCommand?.command === this._currentCommand.command) {
                exitCode = lastCommand.exitCode;
            }
        }
        if (this._currentCommand.commandStartMarker === undefined || !this._terminal.buffer.active) {
            return;
        }
        this._currentCommand.commandFinishedMarker = options?.marker || this._terminal.registerMarker(0);
        this._ptyHeuristics.value.postHandleCommandFinished?.();
        const newCommand = this._currentCommand.promoteToFullCommand(this._cwd, exitCode, this._handleCommandStartOptions?.ignoreCommandLine ?? false, options?.markProperties);
        if (newCommand) {
            this._commands.push(newCommand);
            this._onBeforeCommandFinished.fire(newCommand);
            if (!this._currentCommand.isInvalid) {
                this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
                this._onCommandFinished.fire(newCommand);
            }
        }
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._handleCommandStartOptions = undefined;
    }
    setCommandLine(commandLine, isTrusted) {
        this._logService.debug('CommandDetectionCapability#setCommandLine', commandLine, isTrusted);
        this._currentCommand.command = commandLine;
        this._currentCommand.commandLineConfidence = 'high';
        this._currentCommand.isTrusted = isTrusted;
        if (isTrusted) {
            this._promptInputModel.setConfidentCommandLine(commandLine);
        }
    }
    serialize() {
        const commands = this.commands.map((e) => e.serialize(this.__isCommandStorageDisabled));
        const partialCommand = this._currentCommand.serialize(this._cwd);
        if (partialCommand) {
            commands.push(partialCommand);
        }
        return {
            isWindowsPty: this._ptyHeuristics.value instanceof WindowsPtyHeuristics,
            hasRichCommandDetection: this._hasRichCommandDetection,
            commands,
            promptInputModel: this._promptInputModel.serialize(),
        };
    }
    deserialize(serialized) {
        if (serialized.isWindowsPty) {
            this.setIsWindowsPty(serialized.isWindowsPty);
        }
        if (serialized.hasRichCommandDetection) {
            this.setHasRichCommandDetection(serialized.hasRichCommandDetection);
        }
        const buffer = this._terminal.buffer.normal;
        for (const e of serialized.commands) {
            // Partial command
            if (!e.endLine) {
                // Check for invalid command
                const marker = e.startLine !== undefined
                    ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY))
                    : undefined;
                if (!marker) {
                    continue;
                }
                this._currentCommand.commandStartMarker =
                    e.startLine !== undefined
                        ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY))
                        : undefined;
                this._currentCommand.commandStartX = e.startX;
                this._currentCommand.promptStartMarker =
                    e.promptStartLine !== undefined
                        ? this._terminal.registerMarker(e.promptStartLine - (buffer.baseY + buffer.cursorY))
                        : undefined;
                this._cwd = e.cwd;
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._onCommandStarted.fire({ marker });
                continue;
            }
            // Full command
            const newCommand = TerminalCommand.deserialize(this._terminal, e, this.__isCommandStorageDisabled);
            if (!newCommand) {
                continue;
            }
            this._commands.push(newCommand);
            this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
            this._onCommandFinished.fire(newCommand);
        }
        if (serialized.promptInputModel) {
            this._promptInputModel.deserialize(serialized.promptInputModel);
        }
    }
};
__decorate([
    debounce(500)
], CommandDetectionCapability.prototype, "_handleCursorMove", null);
CommandDetectionCapability = __decorate([
    __param(1, ILogService)
], CommandDetectionCapability);
export { CommandDetectionCapability };
/**
 * Non-Windows-specific behavior.
 */
class UnixPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
        this._register(_terminal.parser.registerCsiHandler({ final: 'J' }, (params) => {
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                _hooks.clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
    }
    handleCommandStart(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        currentCommand.commandStartMarker = options?.marker || this._terminal.registerMarker(0);
        // Clear executed as it must happen after command start
        currentCommand.commandExecutedMarker?.dispose();
        currentCommand.commandExecutedMarker = undefined;
        currentCommand.commandExecutedX = undefined;
        for (const m of this._hooks.commandMarkers) {
            m.dispose();
        }
        this._hooks.commandMarkers.length = 0;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({
            marker: options?.marker || currentCommand.commandStartMarker,
            markProperties: options?.markProperties,
        });
        this._logService.debug('CommandDetectionCapability#handleCommandStart', currentCommand.commandStartX, currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandExecutedMarker = options?.marker || this._terminal.registerMarker(0);
        currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', currentCommand.commandExecutedX, currentCommand.commandExecutedMarker?.line);
        // Sanity check optional props
        if (!currentCommand.commandStartMarker ||
            !currentCommand.commandExecutedMarker ||
            currentCommand.commandStartX === undefined) {
            return;
        }
        // Calculate the command
        currentCommand.command = this._hooks.isCommandStorageDisabled
            ? ''
            : this._terminal.buffer.active
                .getLine(currentCommand.commandStartMarker.line)
                ?.translateToString(true, currentCommand.commandStartX, currentCommand.commandRightPromptStartX)
                .trim();
        let y = currentCommand.commandStartMarker.line + 1;
        const commandExecutedLine = currentCommand.commandExecutedMarker.line;
        for (; y < commandExecutedLine; y++) {
            const line = this._terminal.buffer.active.getLine(y);
            if (line) {
                const continuation = currentCommand.continuations?.find((e) => e.marker.line === y);
                if (continuation) {
                    currentCommand.command += '\n';
                }
                const startColumn = continuation?.end ?? 0;
                currentCommand.command += line.translateToString(true, startColumn);
            }
        }
        if (y === commandExecutedLine) {
            currentCommand.command +=
                this._terminal.buffer.active
                    .getLine(commandExecutedLine)
                    ?.translateToString(true, undefined, currentCommand.commandExecutedX) || '';
        }
        this._hooks.onCommandExecutedEmitter.fire(currentCommand);
    }
}
var AdjustCommandStartMarkerConstants;
(function (AdjustCommandStartMarkerConstants) {
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaxCheckLineCount"] = 10] = "MaxCheckLineCount";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["Interval"] = 20] = "Interval";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaximumPollCount"] = 10] = "MaximumPollCount";
})(AdjustCommandStartMarkerConstants || (AdjustCommandStartMarkerConstants = {}));
/**
 * An object that integrated with and decorates the command detection capability to add heuristics
 * that adjust various markers to work better with Windows and ConPTY. This isn't depended upon the
 * frontend OS, or even the backend OS, but the `IsWindows` property which technically a non-Windows
 * client can emit (for example in tests).
 */
let WindowsPtyHeuristics = class WindowsPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
        this._onCursorMoveListener = this._register(new MutableDisposable());
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._register(_terminal.parser.registerCsiHandler({ final: 'J' }, (params) => {
            // Clear commands when the viewport is cleared
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                this._hooks.clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
        this._register(this._capability.onBeforeCommandFinished((command) => {
            // For older Windows backends we cannot listen to CSI J, instead we assume running clear
            // or cls will clear all commands in the viewport. This is not perfect but it's right
            // most of the time.
            if (command.command.trim().toLowerCase() === 'clear' ||
                command.command.trim().toLowerCase() === 'cls') {
                this._tryAdjustCommandStartMarkerScheduler?.cancel();
                this._tryAdjustCommandStartMarkerScheduler = undefined;
                this._hooks.clearCommandsInViewport();
                this._capability.currentCommand.isInvalid = true;
                this._hooks.onCurrentCommandInvalidatedEmitter.fire({
                    reason: "windows" /* CommandInvalidationReason.Windows */,
                });
            }
        }));
    }
    preHandleResize(e) {
        // Resize behavior is different under conpty; instead of bringing parts of the scrollback
        // back into the viewport, new lines are inserted at the bottom (ie. the same behavior as if
        // there was no scrollback).
        //
        // On resize this workaround will wait for a conpty reprint to occur by waiting for the
        // cursor to move, it will then calculate the number of lines that the commands within the
        // viewport _may have_ shifted. After verifying the content of the current line is
        // incorrect, the line after shifting is checked and if that matches delete events are fired
        // on the xterm.js buffer to move the markers.
        //
        // While a bit hacky, this approach is quite safe and seems to work great at least for pwsh.
        const baseY = this._terminal.buffer.active.baseY;
        const rowsDifference = e.rows - this._hooks.dimensions.rows;
        // Only do when rows increase, do in the next frame as this needs to happen after
        // conpty reprints the screen
        if (rowsDifference > 0) {
            this._waitForCursorMove().then(() => {
                // Calculate the number of lines the content may have shifted, this will max out at
                // scrollback count since the standard behavior will be used then
                const potentialShiftedLineCount = Math.min(rowsDifference, baseY);
                // For each command within the viewport, assume commands are in the correct order
                for (let i = this._capability.commands.length - 1; i >= 0; i--) {
                    const command = this._capability.commands[i];
                    if (!command.marker ||
                        command.marker.line < baseY ||
                        command.commandStartLineContent === undefined) {
                        break;
                    }
                    const line = this._terminal.buffer.active.getLine(command.marker.line);
                    if (!line || line.translateToString(true) === command.commandStartLineContent) {
                        continue;
                    }
                    const shiftedY = command.marker.line - potentialShiftedLineCount;
                    const shiftedLine = this._terminal.buffer.active.getLine(shiftedY);
                    if (shiftedLine?.translateToString(true) !== command.commandStartLineContent) {
                        continue;
                    }
                    // HACK: xterm.js doesn't expose this by design as it's an internal core
                    // function an embedder could easily do damage with. Additionally, this
                    // can't really be upstreamed since the event relies on shell integration to
                    // verify the shifting is necessary.
                    ;
                    this._terminal._core._bufferService.buffer.lines.onDeleteEmitter.fire({
                        index: this._terminal.buffer.active.baseY,
                        amount: potentialShiftedLineCount,
                    });
                }
            });
        }
    }
    handleCommandStart() {
        this._capability.currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        // On Windows track all cursor movements after the command start sequence
        this._hooks.commandMarkers.length = 0;
        const initialCommandStartMarker = (this._capability.currentCommand.commandStartMarker = (this._capability.currentCommand.promptStartMarker
            ? cloneMarker(this._terminal, this._capability.currentCommand.promptStartMarker)
            : this._terminal.registerMarker(0)));
        this._capability.currentCommand.commandStartX = 0;
        // DEBUG: Add a decoration for the original unadjusted command start position
        // if ('registerDecoration' in this._terminal) {
        // 	const d = (this._terminal as any).registerDecoration({
        // 		marker: this._capability.currentCommand.commandStartMarker,
        // 		x: this._capability.currentCommand.commandStartX
        // 	});
        // 	d?.onRender((e: HTMLElement) => {
        // 		e.textContent = 'b';
        // 		e.classList.add('xterm-sequence-decoration', 'top', 'right');
        // 		e.title = 'Initial command start position';
        // 	});
        // }
        // The command started sequence may be printed before the actual prompt is, for example a
        // multi-line prompt will typically look like this where D, A and B signify the command
        // finished, prompt started and command started sequences respectively:
        //
        //     D/my/cwdB
        //     > C
        //
        // Due to this, it's likely that this will be called before the line has been parsed.
        // Unfortunately, it is also the case that the actual command start data may not be parsed
        // by the end of the task either, so a microtask cannot be used.
        //
        // The strategy used is to begin polling and scanning downwards for up to the next 5 lines.
        // If it looks like a prompt is found, the command started location is adjusted. If the
        // command executed sequences comes in before polling is done, polling is canceled and the
        // final polling task is executed synchronously.
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._tryAdjustCommandStartMarkerScheduler = new RunOnceScheduler(() => this._tryAdjustCommandStartMarker(initialCommandStartMarker), 20 /* AdjustCommandStartMarkerConstants.Interval */);
        this._tryAdjustCommandStartMarkerScheduler.schedule();
        // TODO: Cache details about polling for the future - eg. if it always fails, stop bothering
    }
    _tryAdjustCommandStartMarker(start) {
        if (this._store.isDisposed) {
            return;
        }
        const buffer = this._terminal.buffer.active;
        let scannedLineCount = this._tryAdjustCommandStartMarkerScannedLineCount;
        while (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */ &&
            start.line + scannedLineCount < buffer.baseY + this._terminal.rows) {
            if (this._cursorOnNextLine()) {
                const prompt = this._getWindowsPrompt(start.line + scannedLineCount);
                if (prompt) {
                    const adjustedPrompt = typeof prompt === 'string' ? prompt : prompt.prompt;
                    this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
                    if (typeof prompt === 'object' && prompt.likelySingleLine) {
                        this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted promptStart', `${this._capability.currentCommand.promptStartMarker?.line} -> ${this._capability.currentCommand.commandStartMarker.line}`);
                        this._capability.currentCommand.promptStartMarker?.dispose();
                        this._capability.currentCommand.promptStartMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        // Adjust the last command if it's not in the same position as the following
                        // prompt start marker
                        const lastCommand = this._capability.commands.at(-1);
                        if (lastCommand &&
                            this._capability.currentCommand.commandStartMarker.line !==
                                lastCommand.endMarker?.line) {
                            lastCommand.endMarker?.dispose();
                            lastCommand.endMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        }
                    }
                    // use the regex to set the position as it's possible input has occurred
                    this._capability.currentCommand.commandStartX = adjustedPrompt.length;
                    this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted commandStart', `${start.line} -> ${this._capability.currentCommand.commandStartMarker.line}:${this._capability.currentCommand.commandStartX}`);
                    this._flushPendingHandleCommandStartTask();
                    return;
                }
            }
            scannedLineCount++;
        }
        if (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */) {
            this._tryAdjustCommandStartMarkerScannedLineCount = scannedLineCount;
            if (++this._tryAdjustCommandStartMarkerPollCount <
                10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */) {
                this._tryAdjustCommandStartMarkerScheduler?.schedule();
            }
            else {
                this._flushPendingHandleCommandStartTask();
            }
        }
        else {
            this._flushPendingHandleCommandStartTask();
        }
    }
    _flushPendingHandleCommandStartTask() {
        // Perform final try adjust if necessary
        if (this._tryAdjustCommandStartMarkerScheduler) {
            // Max out poll count to ensure it's the last run
            this._tryAdjustCommandStartMarkerPollCount =
                10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */;
            this._tryAdjustCommandStartMarkerScheduler.flush();
            this._tryAdjustCommandStartMarkerScheduler = undefined;
        }
        if (!this._capability.currentCommand.commandExecutedMarker) {
            this._onCursorMoveListener.value = this._terminal.onCursorMove(() => {
                if (this._hooks.commandMarkers.length === 0 ||
                    this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1].line !==
                        this._terminal.buffer.active.cursorY) {
                    const marker = this._terminal.registerMarker(0);
                    if (marker) {
                        this._hooks.commandMarkers.push(marker);
                    }
                }
            });
        }
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({
            marker: this._capability.currentCommand.commandStartMarker,
        });
        this._logService.debug('CommandDetectionCapability#_handleCommandStartWindows', this._capability.currentCommand.commandStartX, this._capability.currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        if (this._tryAdjustCommandStartMarkerScheduler) {
            this._flushPendingHandleCommandStartTask();
        }
        // Use the gathered cursor move markers to correct the command start and executed markers
        this._onCursorMoveListener.clear();
        this._evaluateCommandMarkers();
        this._capability.currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', this._capability.currentCommand.commandExecutedX, this._capability.currentCommand.commandExecutedMarker?.line);
    }
    preHandleCommandFinished() {
        if (this._capability.currentCommand.commandExecutedMarker) {
            return;
        }
        // This is done on command finished just in case command executed never happens (for example
        // PSReadLine tab completion)
        if (this._hooks.commandMarkers.length === 0) {
            // If the command start timeout doesn't happen before command finished, just use the
            // current marker.
            if (!this._capability.currentCommand.commandStartMarker) {
                this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
            }
            if (this._capability.currentCommand.commandStartMarker) {
                this._hooks.commandMarkers.push(this._capability.currentCommand.commandStartMarker);
            }
        }
        this._evaluateCommandMarkers();
    }
    postHandleCommandFinished() {
        const currentCommand = this._capability.currentCommand;
        const commandText = currentCommand.command;
        const commandLine = currentCommand.commandStartMarker?.line;
        const executedLine = currentCommand.commandExecutedMarker?.line;
        if (!commandText ||
            commandText.length === 0 ||
            commandLine === undefined ||
            commandLine === -1 ||
            executedLine === undefined ||
            executedLine === -1) {
            return;
        }
        // Scan downwards from the command start line and search for every character in the actual
        // command line. This may end up matching the wrong characters, but it shouldn't matter at
        // least in the typical case as the entire command will still get matched.
        let current = 0;
        let found = false;
        for (let i = commandLine; i <= executedLine; i++) {
            const line = this._terminal.buffer.active.getLine(i);
            if (!line) {
                break;
            }
            const text = line.translateToString(true);
            for (let j = 0; j < text.length; j++) {
                // Skip whitespace in case it was not actually rendered or could be trimmed from the
                // end of the line
                while (commandText.length < current && commandText[current] === ' ') {
                    current++;
                }
                // Character match
                if (text[j] === commandText[current]) {
                    current++;
                }
                // Full command match
                if (current === commandText.length) {
                    // It's ambiguous whether the command executed marker should ideally appear at
                    // the end of the line or at the beginning of the next line. Since it's more
                    // useful for extracting the command at the end of the current line we go with
                    // that.
                    const wrapsToNextLine = j >= this._terminal.cols - 1;
                    currentCommand.commandExecutedMarker = this._terminal.registerMarker(i -
                        (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) +
                        (wrapsToNextLine ? 1 : 0));
                    currentCommand.commandExecutedX = wrapsToNextLine ? 0 : j + 1;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
    }
    _evaluateCommandMarkers() {
        // On Windows, use the gathered cursor move markers to correct the command start and
        // executed markers.
        if (this._hooks.commandMarkers.length === 0) {
            return;
        }
        this._hooks.commandMarkers = this._hooks.commandMarkers.sort((a, b) => a.line - b.line);
        this._capability.currentCommand.commandStartMarker = this._hooks.commandMarkers[0];
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        this._capability.currentCommand.commandExecutedMarker =
            this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1];
        // Fire this now to prevent issues like #197409
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
    }
    _cursorOnNextLine() {
        const lastCommand = this._capability.commands.at(-1);
        // There is only a single command, so this check is unnecessary
        if (!lastCommand) {
            return true;
        }
        const cursorYAbsolute = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY;
        // If the cursor position is within the last command, we should poll.
        const lastCommandYAbsolute = (lastCommand.endMarker ? lastCommand.endMarker.line : lastCommand.marker?.line) ?? -1;
        return cursorYAbsolute > lastCommandYAbsolute;
    }
    _waitForCursorMove() {
        const cursorX = this._terminal.buffer.active.cursorX;
        const cursorY = this._terminal.buffer.active.cursorY;
        let totalDelay = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (cursorX !== this._terminal.buffer.active.cursorX ||
                    cursorY !== this._terminal.buffer.active.cursorY) {
                    resolve();
                    clearInterval(interval);
                    return;
                }
                totalDelay += 10;
                if (totalDelay > 1000) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
    }
    _getWindowsPrompt(y = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) {
        const line = this._terminal.buffer.active.getLine(y);
        if (!line) {
            return;
        }
        const lineText = line.translateToString(true);
        if (!lineText) {
            return;
        }
        // PowerShell
        const pwshPrompt = lineText.match(/(?<prompt>(\(.+\)\s)?(?:PS.+>\s?))/)?.groups?.prompt;
        if (pwshPrompt) {
            const adjustedPrompt = this._adjustPrompt(pwshPrompt, lineText, '>');
            if (adjustedPrompt) {
                return {
                    prompt: adjustedPrompt,
                    likelySingleLine: true,
                };
            }
        }
        // Custom prompts like starship end in the common \u276f character
        const customPrompt = lineText.match(/.*\u276f(?=[^\u276f]*$)/g)?.[0];
        if (customPrompt) {
            const adjustedPrompt = this._adjustPrompt(customPrompt, lineText, '\u276f');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Bash Prompt
        const bashPrompt = lineText.match(/^(?<prompt>\$)/)?.groups?.prompt;
        if (bashPrompt) {
            const adjustedPrompt = this._adjustPrompt(bashPrompt, lineText, '$');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Python Prompt
        const pythonPrompt = lineText.match(/^(?<prompt>>>> )/g)?.groups?.prompt;
        if (pythonPrompt) {
            return {
                prompt: pythonPrompt,
                likelySingleLine: true,
            };
        }
        // Dynamic prompt detection
        if (this._capability.promptTerminator &&
            lineText.trim().endsWith(this._capability.promptTerminator)) {
            const adjustedPrompt = this._adjustPrompt(lineText, lineText, this._capability.promptTerminator);
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Command Prompt
        const cmdMatch = lineText.match(/^(?<prompt>(\(.+\)\s)?(?:[A-Z]:\\.*>))/);
        return cmdMatch?.groups?.prompt
            ? {
                prompt: cmdMatch.groups.prompt,
                likelySingleLine: true,
            }
            : undefined;
    }
    _adjustPrompt(prompt, lineText, char) {
        if (!prompt) {
            return;
        }
        // Conpty may not 'render' the space at the end of the prompt
        if (lineText === prompt && prompt.endsWith(char)) {
            prompt += ' ';
        }
        return prompt;
    }
};
WindowsPtyHeuristics = __decorate([
    __param(3, ILogService)
], WindowsPtyHeuristics);
export function getLinesForCommand(buffer, command, cols, outputMatcher) {
    if (!outputMatcher) {
        return undefined;
    }
    const executedMarker = command.executedMarker;
    const endMarker = command.endMarker;
    if (!executedMarker || !endMarker) {
        return undefined;
    }
    const startLine = executedMarker.line;
    const endLine = endMarker.line;
    const linesToCheck = outputMatcher.length;
    const lines = [];
    if (outputMatcher.anchor === 'bottom') {
        for (let i = endLine - (outputMatcher.offset || 0); i >= startLine; i--) {
            let wrappedLineStart = i;
            const wrappedLineEnd = i;
            while (wrappedLineStart >= startLine && buffer.getLine(wrappedLineStart)?.isWrapped) {
                wrappedLineStart--;
            }
            i = wrappedLineStart;
            lines.unshift(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length > linesToCheck) {
                lines.pop();
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
            lines.push(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length === linesToCheck) {
                lines.shift();
            }
        }
    }
    return lines;
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
function cloneMarker(xterm, marker, offset = 0) {
    return xterm.registerMarker(marker.line - (xterm.buffer.active.baseY + xterm.buffer.active.cursorY) + offset);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sVUFBVSxFQUNWLDBCQUEwQixFQUMxQixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFheEQsT0FBTyxFQUVOLHNCQUFzQixFQUN0QixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sd0NBQXdDLENBQUE7QUFRMUYsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBSXpELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFXRCxJQUFJLHVCQUF1QjtRQUMxQixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtJQUNyQyxDQUFDO0lBS0QsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFDRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFBO0lBQ3BD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