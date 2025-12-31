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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFVBQVUsRUFDViwwQkFBMEIsRUFDMUIsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBYXhELE9BQU8sRUFFTixzQkFBc0IsRUFDdEIsZUFBZSxHQUNmLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLHdDQUF3QyxDQUFBO0FBUTFGLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUl6RCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBV0QsSUFBSSx1QkFBdUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUE7SUFDckMsQ0FBQztJQUtELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBQ0QsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQTtJQUNwQyxDQUFDO0lBQ0QsSUFBSSxzQkFBc0I7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