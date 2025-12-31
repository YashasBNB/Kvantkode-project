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
import { ITerminalService, } from '../../../../workbench/contrib/terminal/browser/terminal.js';
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
        return 'Void Agent';
    return `Void Agent (${id})`;
};
export const idOfPersistentTerminalName = (name) => {
    if (name === 'Void Agent')
        return '1';
    const match = name.match(/Void Agent \((\d+)\)/);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci90ZXJtaW5hbFRvb2xTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFNMUUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLDRCQUE0QixFQUM1QixrQkFBa0IsRUFDbEIsMEJBQTBCLEdBQzFCLE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBNEIxRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFFaEcsK0NBQStDO0FBQy9DLHlHQUF5RztBQUN6Ryw4REFBOEQ7QUFDOUQsMENBQTBDO0FBQzFDLDJGQUEyRjtBQUMzRiwwQkFBMEI7QUFDMUIsSUFBSTtBQUVKLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUU7SUFDeEQsSUFBSSxFQUFFLEtBQUssR0FBRztRQUFFLE9BQU8s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