/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { TerminalCapabilityStore } from '../capabilities/terminalCapabilityStore.js';
import { CommandDetectionCapability } from '../capabilities/commandDetectionCapability.js';
import { CwdDetectionCapability } from '../capabilities/cwdDetectionCapability.js';
import { PartialCommandDetectionCapability } from '../capabilities/partialCommandDetectionCapability.js';
import { Emitter } from '../../../../base/common/event.js';
import { BufferMarkCapability } from '../capabilities/bufferMarkCapability.js';
import { URI } from '../../../../base/common/uri.js';
import { sanitizeCwd } from '../terminalEnvironment.js';
import { removeAnsiEscapeCodesFromPrompt } from '../../../../base/common/strings.js';
import { ShellEnvDetectionCapability } from '../capabilities/shellEnvDetectionCapability.js';
/**
 * Shell integration is a feature that enhances the terminal's understanding of what's happening
 * in the shell by injecting special sequences into the shell's prompt using the "Set Text
 * Parameters" sequence (`OSC Ps ; Pt ST`).
 *
 * Definitions:
 * - OSC: `\x1b]`
 * - Ps:  A single (usually optional) numeric parameter, composed of one or more digits.
 * - Pt:  A text parameter composed of printable characters.
 * - ST: `\x7`
 *
 * This is inspired by a feature of the same name in the FinalTerm, iTerm2 and kitty terminals.
 */
/**
 * The identifier for the first numeric parameter (`Ps`) for OSC commands used by shell integration.
 */
export var ShellIntegrationOscPs;
(function (ShellIntegrationOscPs) {
    /**
     * Sequences pioneered by FinalTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["FinalTerm"] = 133] = "FinalTerm";
    /**
     * Sequences pioneered by VS Code. The number is derived from the least significant digit of
     * "VSC" when encoded in hex ("VSC" = 0x56, 0x53, 0x43).
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["VSCode"] = 633] = "VSCode";
    /**
     * Sequences pioneered by iTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["ITerm"] = 1337] = "ITerm";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetCwd"] = 7] = "SetCwd";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetWindowsFriendlyCwd"] = 9] = "SetWindowsFriendlyCwd";
})(ShellIntegrationOscPs || (ShellIntegrationOscPs = {}));
/**
 * Sequences pioneered by FinalTerm.
 */
var FinalTermOscPt;
(function (FinalTermOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 133 ; A ST`
     */
    FinalTermOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 133 ; B ST`
     */
    FinalTermOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 133 ; C ST`
     */
    FinalTermOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. The exit code is optional, when not specified it
     * means no command was run (ie. enter on empty prompt or ctrl+c).
     *
     * Format: `OSC 133 ; D [; <ExitCode>] ST`
     */
    FinalTermOscPt["CommandFinished"] = "D";
})(FinalTermOscPt || (FinalTermOscPt = {}));
/**
 * VS Code-specific shell integration sequences. Some of these are based on more common alternatives
 * like those pioneered in {@link FinalTermOscPt FinalTerm}. The decision to move to entirely custom
 * sequences was to try to improve reliability and prevent the possibility of applications confusing
 * the terminal. If multiple shell integration scripts run, VS Code will prioritize the VS
 * Code-specific ones.
 *
 * It's recommended that authors of shell integration scripts use the common sequences (`133`)
 * when building general purpose scripts and the VS Code-specific (`633`) when targeting only VS
 * Code or when there are no other alternatives (eg. {@link CommandLine `633 ; E`}). These sequences
 * support mix-and-matching.
 */
var VSCodeOscPt;
(function (VSCodeOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 633 ; A ST`
     *
     * Based on {@link FinalTermOscPt.PromptStart}.
     */
    VSCodeOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 633 ; B ST`
     *
     * Based on  {@link FinalTermOscPt.CommandStart}.
     */
    VSCodeOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 633 ; C ST`
     *
     * Based on {@link FinalTermOscPt.CommandExecuted}.
     */
    VSCodeOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. This should generally be used on the new line
     * following the end of a command's output, just before {@link PromptStart}. The exit code is
     * optional, when not specified it means no command was run (ie. enter on empty prompt or
     * ctrl+c).
     *
     * Format: `OSC 633 ; D [; <ExitCode>] ST`
     *
     * Based on {@link FinalTermOscPt.CommandFinished}.
     */
    VSCodeOscPt["CommandFinished"] = "D";
    /**
     * Explicitly set the command line. This helps workaround performance and reliability problems
     * with parsing out the command, such as conpty not guaranteeing the position of the sequence or
     * the shell not guaranteeing that the entire command is even visible. Ideally this is called
     * immediately before {@link CommandExecuted}, immediately before {@link CommandFinished} will
     * also work but that means terminal will only know the accurate command line when the command is
     * finished.
     *
     * The command line can escape ascii characters using the `\xAB` format, where AB are the
     * hexadecimal representation of the character code (case insensitive), and escape the `\`
     * character using `\\`. It's required to escape semi-colon (`0x3b`) and characters 0x20 and
     * below, this is particularly important for new line and semi-colon.
     *
     * Some examples:
     *
     * ```
     * "\"  -> "\\"
     * "\n" -> "\x0a"
     * ";"  -> "\x3b"
     * ```
     *
     * An optional nonce can be provided which is may be required by the terminal in order enable
     * some features. This helps ensure no malicious command injection has occurred.
     *
     * Format: `OSC 633 ; E [; <CommandLine> [; <Nonce>]] ST`
     */
    VSCodeOscPt["CommandLine"] = "E";
    /**
     * Similar to prompt start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationStart"] = "F";
    /**
     * Similar to command start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationEnd"] = "G";
    /**
     * The start of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptStart"] = "H";
    /**
     * The end of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptEnd"] = "I";
    /**
     * Set the value of an arbitrary property, only known properties will be handled by VS Code.
     *
     * Format: `OSC 633 ; P ; <Property>=<Value> ST`
     *
     * Known properties:
     *
     * - `Cwd` - Reports the current working directory to the terminal.
     * - `IsWindows` - Reports whether the shell is using a Windows backend like winpty or conpty.
     *   This may be used to enable additional heuristics as the positioning of the shell
     *   integration sequences are not guaranteed to be correct. Valid values: `True`, `False`.
     * - `ContinuationPrompt` - Reports the continuation prompt that is printed at the start of
     *   multi-line inputs.
     * - `HasRichCommandDetection` - Reports whether the shell has rich command line detection,
     *   meaning that sequences A, B, C, D and E are exactly where they're meant to be. In
     *   particular, {@link CommandLine} must happen immediately before {@link CommandExecuted} so
     *   VS Code knows the command line when the execution begins.
     *
     * WARNING: Any other properties may be changed and are not guaranteed to work in the future.
     */
    VSCodeOscPt["Property"] = "P";
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 633 ; SetMark [; Id=<string>] [; Hidden]`
     *
     * `Id` - The identifier of the mark that can be used to reference it
     * `Hidden` - When set, the mark will be available to reference internally but will not visible
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["SetMark"] = "SetMark";
    /**
     * Sends the shell's complete environment in JSON format.
     *
     * Format: `OSC 633 ; EnvJson ; <Environment> ; <Nonce>`
     *
     * - `Environment` - A stringified JSON object containing the shell's complete environment. The
     *    variables and values use the same encoding rules as the {@link CommandLine} sequence.
     * - `Nonce` - An _mandatory_ nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvJson"] = "EnvJson";
    /**
     * Delete a single environment variable from cached environment.
     *
     * Format: `OSC 633 ; EnvSingleDelete ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleDelete"] = "EnvSingleDelete";
    /**
     * The start of the collecting user's environment variables individually.
     *
     * Format: `OSC 633 ; EnvSingleStart ; <Clear> [; <Nonce>]`
     *
     * - `Clear` - An _mandatory_ flag indicating any cached environment variables will be cleared.
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleStart"] = "EnvSingleStart";
    /**
     * Sets an entry of single environment variable to transactional pending map of environment variables.
     *
     * Format: `OSC 633 ; EnvSingleEntry ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEntry"] = "EnvSingleEntry";
    /**
     * The end of the collecting user's environment variables individually.
     * Clears any pending environment variables and fires an event that contains user's environment.
     *
     * Format: `OSC 633 ; EnvSingleEnd [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEnd"] = "EnvSingleEnd";
})(VSCodeOscPt || (VSCodeOscPt = {}));
/**
 * ITerm sequences
 */
var ITermOscPt;
(function (ITermOscPt) {
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 1337 ; SetMark`
     */
    ITermOscPt["SetMark"] = "SetMark";
    /**
     * Reports current working directory (CWD).
     *
     * Format: `OSC 1337 ; CurrentDir=<Cwd> ST`
     */
    ITermOscPt["CurrentDir"] = "CurrentDir";
})(ITermOscPt || (ITermOscPt = {}));
/**
 * The shell integration addon extends xterm by reading shell integration sequences and creating
 * capabilities and passing along relevant sequences to the capabilities. This is meant to
 * encapsulate all handling/parsing of sequences so the capabilities don't need to.
 */
export class ShellIntegrationAddon extends Disposable {
    get seenSequences() {
        return this._seenSequences;
    }
    get status() {
        return this._status;
    }
    constructor(_nonce, _disableTelemetry, _telemetryService, _logService) {
        super();
        this._nonce = _nonce;
        this._disableTelemetry = _disableTelemetry;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this.capabilities = this._register(new TerminalCapabilityStore());
        this._hasUpdatedTelemetry = false;
        this._commonProtocolDisposables = [];
        this._seenSequences = new Set();
        this._status = 0 /* ShellIntegrationStatus.Off */;
        this._onDidChangeStatus = new Emitter();
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._onDidChangeSeenSequences = new Emitter();
        this.onDidChangeSeenSequences = this._onDidChangeSeenSequences.event;
        this._register(toDisposable(() => {
            this._clearActivationTimeout();
            this._disposeCommonProtocol();
        }));
    }
    _disposeCommonProtocol() {
        dispose(this._commonProtocolDisposables);
        this._commonProtocolDisposables.length = 0;
    }
    activate(xterm) {
        this._terminal = xterm;
        this.capabilities.add(3 /* TerminalCapability.PartialCommandDetection */, this._register(new PartialCommandDetectionCapability(this._terminal)));
        this._register(xterm.parser.registerOscHandler(633 /* ShellIntegrationOscPs.VSCode */, (data) => this._handleVSCodeSequence(data)));
        this._register(xterm.parser.registerOscHandler(1337 /* ShellIntegrationOscPs.ITerm */, (data) => this._doHandleITermSequence(data)));
        this._commonProtocolDisposables.push(xterm.parser.registerOscHandler(133 /* ShellIntegrationOscPs.FinalTerm */, (data) => this._handleFinalTermSequence(data)));
        this._register(xterm.parser.registerOscHandler(7 /* ShellIntegrationOscPs.SetCwd */, (data) => this._doHandleSetCwd(data)));
        this._register(xterm.parser.registerOscHandler(9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */, (data) => this._doHandleSetWindowsFriendlyCwd(data)));
        this._ensureCapabilitiesOrAddFailureTelemetry();
    }
    getMarkerId(terminal, vscodeMarkerId) {
        this._createOrGetBufferMarkDetection(terminal).getMark(vscodeMarkerId);
    }
    _markSequenceSeen(sequence) {
        if (!this._seenSequences.has(sequence)) {
            this._seenSequences.add(sequence);
            this._onDidChangeSeenSequences.fire(this._seenSequences);
        }
    }
    _handleFinalTermSequence(data) {
        const didHandle = this._doHandleFinalTermSequence(data);
        if (this._status === 0 /* ShellIntegrationStatus.Off */) {
            this._status = 1 /* ShellIntegrationStatus.FinalTerm */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    _doHandleFinalTermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        // It was considered to disable the common protocol in order to not confuse the VS Code
        // shell integration if both happen for some reason. This doesn't work for powerlevel10k
        // when instant prompt is enabled though. If this does end up being a problem we could pass
        // a type flag through the capability calls
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(command);
        switch (command) {
            case "A" /* FinalTermOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* FinalTermOscPt.CommandStart */:
                // Ignore the command line for these sequences as it's unreliable for example in powerlevel10k
                this._createOrGetCommandDetection(this._terminal).handleCommandStart({
                    ignoreCommandLine: true,
                });
                return true;
            case "C" /* FinalTermOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* FinalTermOscPt.CommandFinished */: {
                const exitCode = args.length === 1 ? parseInt(args[0]) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
        }
        return false;
    }
    _handleVSCodeSequence(data) {
        const didHandle = this._doHandleVSCodeSequence(data);
        if (!this._hasUpdatedTelemetry && didHandle) {
            this._telemetryService?.publicLog2('terminal/shellIntegrationActivationSucceeded');
            this._hasUpdatedTelemetry = true;
            this._clearActivationTimeout();
        }
        if (this._status !== 2 /* ShellIntegrationStatus.VSCode */) {
            this._status = 2 /* ShellIntegrationStatus.VSCode */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    async _ensureCapabilitiesOrAddFailureTelemetry() {
        if (!this._telemetryService || this._disableTelemetry) {
            return;
        }
        this._activationTimeout = setTimeout(() => {
            if (!this.capabilities.get(2 /* TerminalCapability.CommandDetection */) &&
                !this.capabilities.get(0 /* TerminalCapability.CwdDetection */)) {
                this._telemetryService?.publicLog2('terminal/shellIntegrationActivationTimeout');
                this._logService.warn('Shell integration failed to add capabilities within 10 seconds');
            }
            this._hasUpdatedTelemetry = true;
        }, 10000);
    }
    _clearActivationTimeout() {
        if (this._activationTimeout !== undefined) {
            clearTimeout(this._activationTimeout);
            this._activationTimeout = undefined;
        }
    }
    _doHandleVSCodeSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        const argsIndex = data.indexOf(';');
        const command = argsIndex === -1 ? data : data.substring(0, argsIndex);
        this._markSequenceSeen(command);
        // Cast to strict checked index access
        const args = argsIndex === -1 ? [] : data.substring(argsIndex + 1).split(';');
        switch (command) {
            case "A" /* VSCodeOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* VSCodeOscPt.CommandStart */:
                this._createOrGetCommandDetection(this._terminal).handleCommandStart();
                return true;
            case "C" /* VSCodeOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* VSCodeOscPt.CommandFinished */: {
                const arg0 = args[0];
                const exitCode = arg0 !== undefined ? parseInt(arg0) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
            case "E" /* VSCodeOscPt.CommandLine */: {
                const arg0 = args[0];
                const arg1 = args[1];
                let commandLine;
                if (arg0 !== undefined) {
                    commandLine = deserializeMessage(arg0);
                }
                else {
                    commandLine = '';
                }
                this._createOrGetCommandDetection(this._terminal).setCommandLine(commandLine, arg1 === this._nonce);
                return true;
            }
            case "F" /* VSCodeOscPt.ContinuationStart */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationStart();
                return true;
            }
            case "G" /* VSCodeOscPt.ContinuationEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationEnd();
                return true;
            }
            case "EnvJson" /* VSCodeOscPt.EnvJson */: {
                const arg0 = args[0];
                const arg1 = args[1];
                if (arg0 !== undefined) {
                    try {
                        const env = JSON.parse(deserializeMessage(arg0));
                        this._createOrGetShellEnvDetection().setEnvironment(env, arg1 === this._nonce);
                    }
                    catch (e) {
                        this._logService.warn('Failed to parse environment from shell integration sequence', arg0);
                    }
                }
                return true;
            }
            case "EnvSingleStart" /* VSCodeOscPt.EnvSingleStart */: {
                this._createOrGetShellEnvDetection().startEnvironmentSingleVar(args[0] === '1', args[1] === this._nonce);
                return true;
            }
            case "EnvSingleDelete" /* VSCodeOscPt.EnvSingleDelete */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().deleteEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEntry" /* VSCodeOscPt.EnvSingleEntry */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().setEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEnd" /* VSCodeOscPt.EnvSingleEnd */: {
                this._createOrGetShellEnvDetection().endEnvironmentSingleVar(args[0] === this._nonce);
                return true;
            }
            case "H" /* VSCodeOscPt.RightPromptStart */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptStart();
                return true;
            }
            case "I" /* VSCodeOscPt.RightPromptEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptEnd();
                return true;
            }
            case "P" /* VSCodeOscPt.Property */: {
                const arg0 = args[0];
                const deserialized = arg0 !== undefined ? deserializeMessage(arg0) : '';
                const { key, value } = parseKeyValueAssignment(deserialized);
                if (value === undefined) {
                    return true;
                }
                switch (key) {
                    case 'ContinuationPrompt': {
                        this._updateContinuationPrompt(removeAnsiEscapeCodesFromPrompt(value));
                        return true;
                    }
                    case 'Cwd': {
                        this._updateCwd(value);
                        return true;
                    }
                    case 'IsWindows': {
                        this._createOrGetCommandDetection(this._terminal).setIsWindowsPty(value === 'True' ? true : false);
                        return true;
                    }
                    case 'HasRichCommandDetection': {
                        this._createOrGetCommandDetection(this._terminal).setHasRichCommandDetection(value === 'True' ? true : false);
                        return true;
                    }
                    case 'Prompt': {
                        // Remove escape sequences from the user's prompt
                        const sanitizedValue = value.replace(/\x1b\[[0-9;]*m/g, '');
                        this._updatePromptTerminator(sanitizedValue);
                        return true;
                    }
                    case 'Task': {
                        this._createOrGetBufferMarkDetection(this._terminal);
                        this.capabilities
                            .get(2 /* TerminalCapability.CommandDetection */)
                            ?.setIsCommandStorageDisabled();
                        return true;
                    }
                }
            }
            case "SetMark" /* VSCodeOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark(parseMarkSequence(args));
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    _updateContinuationPrompt(value) {
        if (!this._terminal) {
            return;
        }
        this._createOrGetCommandDetection(this._terminal).setContinuationPrompt(value);
    }
    _updatePromptTerminator(prompt) {
        if (!this._terminal) {
            return;
        }
        const lastPromptLine = prompt.substring(prompt.lastIndexOf('\n') + 1);
        const promptTerminator = lastPromptLine.substring(lastPromptLine.lastIndexOf(' '));
        if (promptTerminator) {
            this._createOrGetCommandDetection(this._terminal).setPromptTerminator(promptTerminator, lastPromptLine);
        }
    }
    _updateCwd(value) {
        value = sanitizeCwd(value);
        this._createOrGetCwdDetection().updateCwd(value);
        const commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        commandDetection?.setCwd(value);
    }
    _doHandleITermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${1337 /* ShellIntegrationOscPs.ITerm */};${command}`);
        switch (command) {
            case "SetMark" /* ITermOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark();
            }
            default: {
                // Checking for known `<key>=<value>` pairs.
                // Note that unlike `VSCodeOscPt.Property`, iTerm2 does not interpret backslash or hex-escape sequences.
                // See: https://github.com/gnachman/iTerm2/blob/bb0882332cec5196e4de4a4225978d746e935279/sources/VT100Terminal.m#L2089-L2105
                const { key, value } = parseKeyValueAssignment(command);
                if (value === undefined) {
                    // No '=' was found, so it's not a property assignment.
                    return true;
                }
                switch (key) {
                    case "CurrentDir" /* ITermOscPt.CurrentDir */:
                        // Encountered: `OSC 1337 ; CurrentDir=<Cwd> ST`
                        this._updateCwd(value);
                        return true;
                }
            }
        }
        // Unrecognized sequence
        return false;
    }
    _doHandleSetWindowsFriendlyCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(`${9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */};${command}`);
        switch (command) {
            case '9':
                // Encountered `OSC 9 ; 9 ; <cwd> ST`
                if (args.length) {
                    this._updateCwd(args[0]);
                }
                return true;
        }
        // Unrecognized sequence
        return false;
    }
    /**
     * Handles the sequence: `OSC 7 ; scheme://cwd ST`
     */
    _doHandleSetCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${7 /* ShellIntegrationOscPs.SetCwd */};${command}`);
        if (command.match(/^file:\/\/.*\//)) {
            const uri = URI.parse(command);
            if (uri.path && uri.path.length > 0) {
                this._updateCwd(uri.path);
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    serialize() {
        if (!this._terminal || !this.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            return {
                isWindowsPty: false,
                hasRichCommandDetection: false,
                commands: [],
                promptInputModel: undefined,
            };
        }
        const result = this._createOrGetCommandDetection(this._terminal).serialize();
        return result;
    }
    deserialize(serialized) {
        if (!this._terminal) {
            throw new Error('Cannot restore commands before addon is activated');
        }
        const commandDetection = this._createOrGetCommandDetection(this._terminal);
        commandDetection.deserialize(serialized);
        if (commandDetection.cwd) {
            // Cwd gets set when the command is deserialized, so we need to update it here
            this._updateCwd(commandDetection.cwd);
        }
    }
    _createOrGetCwdDetection() {
        let cwdDetection = this.capabilities.get(0 /* TerminalCapability.CwdDetection */);
        if (!cwdDetection) {
            cwdDetection = this._register(new CwdDetectionCapability());
            this.capabilities.add(0 /* TerminalCapability.CwdDetection */, cwdDetection);
        }
        return cwdDetection;
    }
    _createOrGetCommandDetection(terminal) {
        let commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandDetection) {
            commandDetection = this._register(new CommandDetectionCapability(terminal, this._logService));
            this.capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        }
        return commandDetection;
    }
    _createOrGetBufferMarkDetection(terminal) {
        let bufferMarkDetection = this.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!bufferMarkDetection) {
            bufferMarkDetection = this._register(new BufferMarkCapability(terminal));
            this.capabilities.add(4 /* TerminalCapability.BufferMarkDetection */, bufferMarkDetection);
        }
        return bufferMarkDetection;
    }
    _createOrGetShellEnvDetection() {
        let shellEnvDetection = this.capabilities.get(5 /* TerminalCapability.ShellEnvDetection */);
        if (!shellEnvDetection) {
            shellEnvDetection = this._register(new ShellEnvDetectionCapability());
            this.capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        }
        return shellEnvDetection;
    }
}
export function deserializeMessage(message) {
    return message.replaceAll(
    // Backslash ('\') followed by an escape operator: either another '\', or 'x' and two hex chars.
    /\\(\\|x([0-9a-f]{2}))/gi, 
    // If it's a hex value, parse it to a character.
    // Otherwise the operator is '\', which we return literally, now unescaped.
    (_match, op, hex) => hex ? String.fromCharCode(parseInt(hex, 16)) : op);
}
export function parseKeyValueAssignment(message) {
    const separatorIndex = message.indexOf('=');
    if (separatorIndex === -1) {
        return { key: message, value: undefined }; // No '=' was found.
    }
    return {
        key: message.substring(0, separatorIndex),
        value: message.substring(1 + separatorIndex),
    };
}
export function parseMarkSequence(sequence) {
    let id = undefined;
    let hidden = false;
    for (const property of sequence) {
        // Sanity check, this shouldn't happen in practice
        if (property === undefined) {
            continue;
        }
        if (property === 'Hidden') {
            hidden = true;
        }
        if (property.startsWith('Id=')) {
            id = property.substring(3);
        }
    }
    return { id, hidden };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3h0ZXJtL3NoZWxsSW50ZWdyYXRpb25BZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFFUCxZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQVNsRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUd4RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU1Rjs7Ozs7Ozs7Ozs7O0dBWUc7QUFFSDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixxQkFnQmpCO0FBaEJELFdBQWtCLHFCQUFxQjtJQUN0Qzs7T0FFRztJQUNILDZFQUFlLENBQUE7SUFDZjs7O09BR0c7SUFDSCx1RUFBWSxDQUFBO0lBQ1o7O09BRUc7SUFDSCxzRUFBWSxDQUFBO0lBQ1oscUVBQVUs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