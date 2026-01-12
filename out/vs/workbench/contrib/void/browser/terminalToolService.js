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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3Rlcm1pbmFsVG9vbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU0xRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLGtCQUFrQixFQUNsQiwwQkFBMEIsR0FDMUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUE0QjFELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQTtBQUVoRywrQ0FBK0M7QUFDL0MseUdBQXlHO0FBQ3pHLDhEQUE4RDtBQUM5RCwwQ0FBMEM7QUFDMUMsMkZBQTJGO0FBQzNGLDBCQUEwQjtBQUMxQixJQUFJO0FBRUosTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRTtJQUN4RCxJQUFJLEVBQUUsS0FBSyxHQUFHO1FBQUUs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