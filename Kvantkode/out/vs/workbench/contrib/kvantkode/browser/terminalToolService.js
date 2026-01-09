/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalService, } from '../../terminal/browser/terminal.js';
import { MAX_TERMINAL_BG_COMMAND_TIME, MAX_TERMINAL_CHARS, MAX_TERMINAL_INACTIVE_TIME, } from '../common/prompt/prompts.js';
import { timeout } from '../../../../base/common/async.js';
export const ITerminalToolService = createDecorator('TerminalToolService');
// function isCommandComplete(output: string) {
// 	// https://code.visualstudio.com/docs/terminal/shell-integration#_vs-code-custom-sequences-osc-633-st
// 	const completionMatch = output.match(/\]633;D(?:;(\d+))?/)
// 	if (!completionMatch) { return false }
// 	if (completionMatch[1] !== undefined) return { exitCode: parseInt(completionMatch[1]) }
// 	return { exitCode: 0 }
// }
export const persistentTerminalNameOfId = (id) => {
    if (id === '1')
        return 'KvantKode Agent';
    return `KvantKode Agent (${id})`;
};
export const idOfPersistentTerminalName = (name) => {
    if (name === 'KvantKode Agent')
        return '1';
    const match = name.match(/KvantKode Agent \((\d+)\)/);
    if (!match)
        return null;
    if (Number.isInteger(match[1]) && Number(match[1]) >= 1)
        return match[1];
    return null;
};
let TerminalToolService = class TerminalToolService extends Disposable {
    constructor(terminalService, workspaceContextService) {
        super();
        this.terminalService = terminalService;
        this.workspaceContextService = workspaceContextService;
        this.persistentTerminalInstanceOfId = {};
        this.temporaryTerminalInstanceOfId = {};
        this.createPersistentTerminal = async ({ cwd }) => {
            const terminalId = this.getValidNewTerminalId();
            const config = {
                name: persistentTerminalNameOfId(terminalId),
                title: persistentTerminalNameOfId(terminalId),
            };
            const terminal = await this._createTerminal({ cwd, config });
            this.persistentTerminalInstanceOfId[terminalId] = terminal;
            return terminalId;
        };
        this.focusPersistentTerminal = async (terminalId) => {
            if (!terminalId)
                return;
            const terminal = this.persistentTerminalInstanceOfId[terminalId];
            if (!terminal)
                return; // should never happen
            this.terminalService.setActiveInstance(terminal);
            await this.terminalService.focusActiveInstance();
        };
        this.readTerminal = async (terminalId) => {
            // Try persistent first, then temporary
            const terminal = this.getPersistentTerminal(terminalId) ?? this.getTemporaryTerminal(terminalId);
            if (!terminal) {
                throw new Error(`Read Terminal: Terminal with ID ${terminalId} does not exist.`);
            }
            // Ensure the xterm.js instance has been created – otherwise we cannot access the buffer.
            if (!terminal.xterm) {
                throw new Error('Read Terminal: The requested terminal has not yet been rendered and therefore has no scrollback buffer available.');
            }
            // Collect lines from the buffer iterator (oldest to newest)
            const lines = [];
            for (const line of terminal.xterm.getBufferReverseIterator()) {
                lines.unshift(line);
            }
            let result = removeAnsiEscapeCodes(lines.join('\n'));
            if (result.length > MAX_TERMINAL_CHARS) {
                const half = MAX_TERMINAL_CHARS / 2;
                result = result.slice(0, half) + '\n...\n' + result.slice(result.length - half);
            }
            return result;
        };
        this.runCommand = async (command, params) => {
            await this.terminalService.whenConnected;
            const { type } = params;
            const isPersistent = type === 'persistent';
            let terminal;
            const disposables = [];
            if (isPersistent) {
                // BG process
                const { persistentTerminalId } = params;
                terminal = this.persistentTerminalInstanceOfId[persistentTerminalId];
                if (!terminal)
                    throw new Error(`Unexpected internal error: Terminal with ID ${persistentTerminalId} did not exist.`);
            }
            else {
                const { cwd } = params;
                terminal = await this._createTerminal({ cwd: cwd, config: undefined, hidden: true });
                this.temporaryTerminalInstanceOfId[params.terminalId] = terminal;
            }
            const interrupt = () => {
                terminal.dispose();
                if (!isPersistent)
                    delete this.temporaryTerminalInstanceOfId[params.terminalId];
                else
                    delete this.persistentTerminalInstanceOfId[params.persistentTerminalId];
            };
            const waitForResult = async () => {
                if (isPersistent) {
                    // focus the terminal about to run
                    this.terminalService.setActiveInstance(terminal);
                    await this.terminalService.focusActiveInstance();
                }
                let result = '';
                let resolveReason;
                let rawStream = '';
                const cmdCap = await this._waitForCommandDetectionCapability(terminal);
                // if (!cmdCap) throw new Error(`There was an error using the terminal: CommandDetection capability did not mount yet. Please try again in a few seconds or report this to the Void team.`)
                // Prefer the structured command-detection capability when available
                // Always collect data from the terminal stream for fallback on timeout
                const dCollect = terminal.onData((data) => {
                    rawStream += data;
                });
                disposables.push(dCollect);
                const waitUntilDone = new Promise((resolve) => {
                    if (!cmdCap)
                        return;
                    const l = cmdCap.onCommandFinished((cmd) => {
                        if (resolveReason)
                            return; // already resolved
                        resolveReason = { type: 'done', exitCode: cmd.exitCode ?? 0 };
                        result = cmd.getOutput() ?? '';
                        l.dispose();
                        resolve();
                    });
                    disposables.push(l);
                });
                // send the command now that listeners are attached
                await terminal.sendText(command, true);
                const waitUntilInterrupt = isPersistent
                    ? // timeout after X seconds
                        new Promise((res) => {
                            setTimeout(() => {
                                resolveReason = { type: 'timeout' };
                                res();
                            }, MAX_TERMINAL_BG_COMMAND_TIME * 1000);
                        })
                    : // inactivity-based timeout
                        new Promise((res) => {
                            let globalTimeoutId;
                            const resetTimer = () => {
                                clearTimeout(globalTimeoutId);
                                globalTimeoutId = setTimeout(() => {
                                    if (resolveReason)
                                        return;
                                    resolveReason = { type: 'timeout' };
                                    res();
                                }, MAX_TERMINAL_INACTIVE_TIME * 1000);
                            };
                            const dTimeout = terminal.onData(() => {
                                resetTimer();
                            });
                            disposables.push(dTimeout, toDisposable(() => clearTimeout(globalTimeoutId)));
                            resetTimer();
                        });
                // wait for result
                await Promise.any([waitUntilDone, waitUntilInterrupt]).finally(() => disposables.forEach((d) => d.dispose()));
                // If timed out, prefer the collected stream for temporary (hidden) terminals;
                // try reading the visible buffer for persistent terminals and fall back to stream.
                if (resolveReason?.type === 'timeout') {
                    if (!isPersistent) {
                        result = rawStream;
                    }
                    else {
                        try {
                            result = await this.readTerminal(params.persistentTerminalId);
                        }
                        catch {
                            result = rawStream;
                        }
                    }
                }
                if (!isPersistent) {
                    interrupt();
                }
                if (!resolveReason)
                    throw new Error('Unexpected internal error: Promise.any should have resolved with a reason.');
                if (!isPersistent)
                    result = `$ ${command}\n${result}`;
                result = removeAnsiEscapeCodes(result);
                // trim
                if (result.length > MAX_TERMINAL_CHARS) {
                    const half = MAX_TERMINAL_CHARS / 2;
                    result = result.slice(0, half) + '\n...\n' + result.slice(result.length - half, Infinity);
                }
                return { result, resolveReason };
            };
            const resPromise = waitForResult();
            return {
                interrupt,
                resPromise,
            };
        };
        // runs on ALL terminals for simplicity
        const initializeTerminal = (terminal) => {
            // when exit, remove
            const d = terminal.onExit(() => {
                const terminalId = idOfPersistentTerminalName(terminal.title);
                if (terminalId !== null && terminalId in this.persistentTerminalInstanceOfId)
                    delete this.persistentTerminalInstanceOfId[terminalId];
                d.dispose();
            });
        };
        // initialize any terminals that are already open
        for (const terminal of terminalService.instances) {
            const proposedTerminalId = idOfPersistentTerminalName(terminal.title);
            if (proposedTerminalId)
                this.persistentTerminalInstanceOfId[proposedTerminalId] = terminal;
            initializeTerminal(terminal);
        }
        this._register(terminalService.onDidCreateInstance((terminal) => {
            initializeTerminal(terminal);
        }));
    }
    listPersistentTerminalIds() {
        return Object.keys(this.persistentTerminalInstanceOfId);
    }
    getValidNewTerminalId() {
        // {1 2 3} # size 3, new=4
        // {1 3 4} # size 3, new=2
        // 1 <= newTerminalId <= n + 1
        const n = Object.keys(this.persistentTerminalInstanceOfId).length;
        if (n === 0)
            return '1';
        for (let i = 1; i <= n + 1; i++) {
            const potentialId = i + '';
            if (!(potentialId in this.persistentTerminalInstanceOfId))
                return potentialId;
        }
        throw new Error('This should never be reached by pigeonhole principle');
    }
    async _createTerminal(props) {
        const { cwd: override_cwd, config, hidden } = props;
        const cwd = override_cwd ?? undefined ?? this.workspaceContextService.getWorkspace().folders[0]?.uri;
        const options = {
            cwd,
            location: hidden ? undefined : TerminalLocation.Panel,
            config: {
                name: config && 'name' in config ? config.name : undefined,
                forceShellIntegration: true,
                hideFromUser: hidden ? true : undefined,
                // Copy any other properties from the provided config
                ...config,
            },
            // Skip profile check to ensure the terminal is created quickly
            skipContributedProfileCheck: true,
        };
        const terminal = await this.terminalService.createTerminal(options);
        // // when a new terminal is created, there is an initial command that gets run which is empty, wait for it to end before returning
        // const disposables: IDisposable[] = []
        // const waitForMount = new Promise<void>(res => {
        // 	let data = ''
        // 	const d = terminal.onData(newData => {
        // 		data += newData
        // 		if (isCommandComplete(data)) { res() }
        // 	})
        // 	disposables.push(d)
        // })
        // const waitForTimeout = new Promise<void>(res => { setTimeout(() => { res() }, 5000) })
        // await Promise.any([waitForMount, waitForTimeout,])
        // disposables.forEach(d => d.dispose())
        return terminal;
    }
    async killPersistentTerminal(terminalId) {
        const terminal = this.persistentTerminalInstanceOfId[terminalId];
        if (!terminal)
            throw new Error(`Kill Terminal: Terminal with ID ${terminalId} did not exist.`);
        terminal.dispose();
        delete this.persistentTerminalInstanceOfId[terminalId];
        return;
    }
    persistentTerminalExists(terminalId) {
        return terminalId in this.persistentTerminalInstanceOfId;
    }
    getTemporaryTerminal(terminalId) {
        if (!terminalId)
            return;
        const terminal = this.temporaryTerminalInstanceOfId[terminalId];
        if (!terminal)
            return; // should never happen
        return terminal;
    }
    getPersistentTerminal(terminalId) {
        if (!terminalId)
            return;
        const terminal = this.persistentTerminalInstanceOfId[terminalId];
        if (!terminal)
            return; // should never happen
        return terminal;
    }
    async _waitForCommandDetectionCapability(terminal) {
        const cmdCap = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (cmdCap)
            return cmdCap;
        const disposables = [];
        const waitTimeout = timeout(10_000);
        const waitForCapability = new Promise((res) => {
            disposables.push(terminal.capabilities.onDidAddCapability((e) => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */)
                    res(e.capability);
            }));
        });
        const capability = await Promise.any([waitTimeout, waitForCapability]).finally(() => {
            disposables.forEach((d) => d.dispose());
        });
        return capability ?? undefined;
    }
};
TerminalToolService = __decorate([
    __param(0, ITerminalService),
    __param(1, IWorkspaceContextService)
], TerminalToolService);
export { TerminalToolService };
registerSingleton(ITerminalToolService, TerminalToolService, 1 /* InstantiationType.Delayed */);
