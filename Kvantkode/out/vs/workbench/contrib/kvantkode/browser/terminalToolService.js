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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIva3ZhbnRrb2RlL2Jyb3dzZXIvdGVybWluYWxUb29sU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBTTFFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUNOLGdCQUFnQixHQUdoQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsa0JBQWtCLEVBQ2xCLDBCQUEwQixHQUMxQixNQUFNLDZCQUE2QixDQUFBO0FBRXBDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQTRCMUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFBO0FBRWhHLCtDQUErQztBQUMvQyx5R0FBeUc7QUFDekcsOERBQThEO0FBQzlELDBDQUEwQztBQUMxQywyRkFBMkY7QUFDM0YsMEJBQTBCO0FBQzFCLElBQUk7QUFFSixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFO0lBQ3hELElB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