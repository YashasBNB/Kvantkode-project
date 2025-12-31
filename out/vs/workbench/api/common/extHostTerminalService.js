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
import { Emitter } from '../../../base/common/event.js';
import { MainContext, } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../base/common/uri.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { DisposableStore, Disposable, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { Disposable as VSCodeDisposable, EnvironmentVariableMutatorType, } from './extHostTypes.js';
import { localize } from '../../../nls.js';
import { NotSupportedError } from '../../../base/common/errors.js';
import { serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection, } from '../../../platform/terminal/common/environmentVariableShared.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { TerminalDataBufferer } from '../../../platform/terminal/common/terminalDataBuffering.js';
import { ThemeColor } from '../../../base/common/themables.js';
import { Promises } from '../../../base/common/async.js';
import { TerminalCompletionList, TerminalQuickFix, ViewColumn } from './extHostTypeConverters.js';
import { IExtHostCommands } from './extHostCommands.js';
export const IExtHostTerminalService = createDecorator('IExtHostTerminalService');
export class ExtHostTerminal extends Disposable {
    constructor(_proxy, _id, _creationOptions, _name) {
        super();
        this._proxy = _proxy;
        this._id = _id;
        this._creationOptions = _creationOptions;
        this._name = _name;
        this._disposed = false;
        this._state = { isInteractedWith: false, shell: undefined };
        this.isOpen = false;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._creationOptions = Object.freeze(this._creationOptions);
        this._pidPromise = new Promise((c) => (this._pidPromiseComplete = c));
        const that = this;
        this.value = {
            get name() {
                return that._name || '';
            },
            get processId() {
                return that._pidPromise;
            },
            get creationOptions() {
                return that._creationOptions;
            },
            get exitStatus() {
                return that._exitStatus;
            },
            get state() {
                return that._state;
            },
            get selection() {
                return that._selection;
            },
            get shellIntegration() {
                return that.shellIntegration;
            },
            sendText(text, shouldExecute = true) {
                that._checkDisposed();
                that._proxy.$sendText(that._id, text, shouldExecute);
            },
            show(preserveFocus) {
                that._checkDisposed();
                that._proxy.$show(that._id, preserveFocus);
            },
            hide() {
                that._checkDisposed();
                that._proxy.$hide(that._id);
            },
            dispose() {
                if (!that._disposed) {
                    that._disposed = true;
                    that._proxy.$dispose(that._id);
                }
            },
            get dimensions() {
                if (that._cols === undefined || that._rows === undefined) {
                    return undefined;
                }
                return {
                    columns: that._cols,
                    rows: that._rows,
                };
            },
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
    async create(options, internalOptions) {
        if (typeof this._id !== 'string') {
            throw new Error('Terminal has already been created');
        }
        await this._proxy.$createTerminal(this._id, {
            name: options.name,
            shellPath: options.shellPath ?? undefined,
            shellArgs: options.shellArgs ?? undefined,
            cwd: options.cwd ?? internalOptions?.cwd ?? undefined,
            env: options.env ?? undefined,
            icon: asTerminalIcon(options.iconPath) ?? undefined,
            color: ThemeColor.isThemeColor(options.color) ? options.color.id : undefined,
            initialText: options.message ?? undefined,
            strictEnv: options.strictEnv ?? undefined,
            hideFromUser: options.hideFromUser ?? undefined,
            forceShellIntegration: internalOptions?.forceShellIntegration ?? undefined,
            isFeatureTerminal: internalOptions?.isFeatureTerminal ?? undefined,
            isExtensionOwnedTerminal: true,
            useShellEnvironment: internalOptions?.useShellEnvironment ?? undefined,
            location: internalOptions?.location ||
                this._serializeParentTerminal(options.location, internalOptions?.resolvedExtHostIdentifier),
            isTransient: options.isTransient ?? undefined,
        });
    }
    async createExtensionTerminal(location, internalOptions, parentTerminal, iconPath, color) {
        if (typeof this._id !== 'string') {
            throw new Error('Terminal has already been created');
        }
        await this._proxy.$createTerminal(this._id, {
            name: this._name,
            isExtensionCustomPtyTerminal: true,
            icon: iconPath,
            color: ThemeColor.isThemeColor(color) ? color.id : undefined,
            location: internalOptions?.location || this._serializeParentTerminal(location, parentTerminal),
            isTransient: true,
        });
        // At this point, the id has been set via `$acceptTerminalOpened`
        if (typeof this._id === 'string') {
            throw new Error('Terminal creation failed');
        }
        return this._id;
    }
    _serializeParentTerminal(location, parentTerminal) {
        if (typeof location === 'object') {
            if ('parentTerminal' in location && location.parentTerminal && parentTerminal) {
                return { parentTerminal };
            }
            if ('viewColumn' in location) {
                return {
                    viewColumn: ViewColumn.from(location.viewColumn),
                    preserveFocus: location.preserveFocus,
                };
            }
            return undefined;
        }
        return location;
    }
    _checkDisposed() {
        if (this._disposed) {
            throw new Error('Terminal has already been disposed');
        }
    }
    set name(name) {
        this._name = name;
    }
    setExitStatus(code, reason) {
        this._exitStatus = Object.freeze({ code, reason });
    }
    setDimensions(cols, rows) {
        if (cols === this._cols && rows === this._rows) {
            // Nothing changed
            return false;
        }
        if (cols === 0 || rows === 0) {
            return false;
        }
        this._cols = cols;
        this._rows = rows;
        return true;
    }
    setInteractedWith() {
        if (!this._state.isInteractedWith) {
            this._state = {
                ...this._state,
                isInteractedWith: true,
            };
            return true;
        }
        return false;
    }
    setShellType(shellType) {
        if (this._state.shell !== shellType) {
            this._state = {
                ...this._state,
                shell: shellType,
            };
            return true;
        }
        return false;
    }
    setSelection(selection) {
        this._selection = selection;
    }
    _setProcessId(processId) {
        // The event may fire 2 times when the panel is restored
        if (this._pidPromiseComplete) {
            this._pidPromiseComplete(processId);
            this._pidPromiseComplete = undefined;
        }
        else {
            // Recreate the promise if this is the nth processId set (e.g. reused task terminals)
            this._pidPromise.then((pid) => {
                if (pid !== processId) {
                    this._pidPromise = Promise.resolve(processId);
                }
            });
        }
    }
}
class ExtHostPseudoterminal {
    get onProcessReady() {
        return this._onProcessReady.event;
    }
    constructor(_pty) {
        this._pty = _pty;
        this.id = 0;
        this.shouldPersist = false;
        this._onProcessData = new Emitter();
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = new Emitter();
        this._onDidChangeProperty = new Emitter();
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = new Emitter();
        this.onProcessExit = this._onProcessExit.event;
    }
    refreshProperty(property) {
        throw new Error(`refreshProperty is not suppported in extension owned terminals. property: ${property}`);
    }
    updateProperty(property, value) {
        throw new Error(`updateProperty is not suppported in extension owned terminals. property: ${property}, value: ${value}`);
    }
    async start() {
        return undefined;
    }
    shutdown() {
        this._pty.close();
    }
    input(data) {
        this._pty.handleInput?.(data);
    }
    resize(cols, rows) {
        this._pty.setDimensions?.({ columns: cols, rows });
    }
    clearBuffer() {
        // no-op
    }
    async processBinary(data) {
        // No-op, processBinary is not supported in extension owned terminals.
    }
    acknowledgeDataEvent(charCount) {
        // No-op, flow control is not supported in extension owned terminals. If this is ever
        // implemented it will need new pause and resume VS Code APIs.
    }
    async setUnicodeVersion(version) {
        // No-op, xterm-headless isn't used for extension owned terminals.
    }
    getInitialCwd() {
        return Promise.resolve('');
    }
    getCwd() {
        return Promise.resolve('');
    }
    startSendingEvents(initialDimensions) {
        // Attach the listeners
        this._pty.onDidWrite((e) => this._onProcessData.fire(e));
        this._pty.onDidClose?.((e = undefined) => {
            this._onProcessExit.fire(e === void 0 ? undefined : e);
        });
        this._pty.onDidOverrideDimensions?.((e) => {
            if (e) {
                this._onDidChangeProperty.fire({
                    type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */,
                    value: { cols: e.columns, rows: e.rows },
                });
            }
        });
        this._pty.onDidChangeName?.((title) => {
            this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: title });
        });
        this._pty.open(initialDimensions ? initialDimensions : undefined);
        if (initialDimensions) {
            this._pty.setDimensions?.(initialDimensions);
        }
        this._onProcessReady.fire({ pid: -1, cwd: '', windowsPty: undefined });
    }
}
let nextLinkId = 1;
let BaseExtHostTerminalService = class BaseExtHostTerminalService extends Disposable {
    get activeTerminal() {
        return this._activeTerminal?.value;
    }
    get terminals() {
        return this._terminals.map((term) => term.value);
    }
    constructor(supportsProcesses, _extHostCommands, extHostRpc) {
        super();
        this._extHostCommands = _extHostCommands;
        this._terminals = [];
        this._terminalProcesses = new Map();
        this._terminalProcessDisposables = {};
        this._extensionTerminalAwaitingStart = {};
        this._getTerminalPromises = {};
        this._environmentVariableCollections = new Map();
        this._lastQuickFixCommands = this._register(new MutableDisposable());
        this._linkProviders = new Set();
        this._completionProviders = new Map();
        this._profileProviders = new Map();
        this._quickFixProviders = new Map();
        this._terminalLinkCache = new Map();
        this._terminalLinkCancellationSource = new Map();
        this._onDidCloseTerminal = new Emitter();
        this.onDidCloseTerminal = this._onDidCloseTerminal.event;
        this._onDidOpenTerminal = new Emitter();
        this.onDidOpenTerminal = this._onDidOpenTerminal.event;
        this._onDidChangeActiveTerminal = new Emitter();
        this.onDidChangeActiveTerminal = this._onDidChangeActiveTerminal.event;
        this._onDidChangeTerminalDimensions = new Emitter();
        this.onDidChangeTerminalDimensions = this._onDidChangeTerminalDimensions.event;
        this._onDidChangeTerminalState = new Emitter();
        this.onDidChangeTerminalState = this._onDidChangeTerminalState.event;
        this._onDidChangeShell = new Emitter();
        this.onDidChangeShell = this._onDidChangeShell.event;
        this._onDidWriteTerminalData = new Emitter({
            onWillAddFirstListener: () => this._proxy.$startSendingDataEvents(),
            onDidRemoveLastListener: () => this._proxy.$stopSendingDataEvents(),
        });
        this.onDidWriteTerminalData = this._onDidWriteTerminalData.event;
        this._onDidExecuteCommand = new Emitter({
            onWillAddFirstListener: () => this._proxy.$startSendingCommandEvents(),
            onDidRemoveLastListener: () => this._proxy.$stopSendingCommandEvents(),
        });
        this.onDidExecuteTerminalCommand = this._onDidExecuteCommand.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalService);
        this._bufferer = new TerminalDataBufferer(this._proxy.$sendProcessData);
        this._proxy.$registerProcessSupport(supportsProcesses);
        this._extHostCommands.registerArgumentProcessor({
            processArgument: (arg) => {
                const deserialize = (arg) => {
                    const cast = arg;
                    return this.getTerminalById(cast.instanceId)?.value;
                };
                switch (arg?.$mid) {
                    case 15 /* MarshalledId.TerminalContext */:
                        return deserialize(arg);
                    default: {
                        // Do array transformation in place as this is a hot path
                        if (Array.isArray(arg)) {
                            for (let i = 0; i < arg.length; i++) {
                                if (arg[i].$mid === 15 /* MarshalledId.TerminalContext */) {
                                    arg[i] = deserialize(arg[i]);
                                }
                                else {
                                    // Probably something else, so exit early
                                    break;
                                }
                            }
                        }
                        return arg;
                    }
                }
            },
        });
        this._register({
            dispose: () => {
                for (const [_, terminalProcess] of this._terminalProcesses) {
                    terminalProcess.shutdown(true);
                }
            },
        });
    }
    getDefaultShell(useAutomationShell) {
        const profile = useAutomationShell ? this._defaultAutomationProfile : this._defaultProfile;
        return profile?.path || '';
    }
    getDefaultShellArgs(useAutomationShell) {
        const profile = useAutomationShell ? this._defaultAutomationProfile : this._defaultProfile;
        return profile?.args || [];
    }
    createExtensionTerminal(options, internalOptions) {
        const terminal = new ExtHostTerminal(this._proxy, generateUuid(), options, options.name);
        const p = new ExtHostPseudoterminal(options.pty);
        terminal
            .createExtensionTerminal(options.location, internalOptions, this._serializeParentTerminal(options, internalOptions).resolvedExtHostIdentifier, asTerminalIcon(options.iconPath), asTerminalColor(options.color))
            .then((id) => {
            const disposable = this._setupExtHostProcessListeners(id, p);
            this._terminalProcessDisposables[id] = disposable;
        });
        this._terminals.push(terminal);
        return terminal.value;
    }
    _serializeParentTerminal(options, internalOptions) {
        internalOptions = internalOptions ? internalOptions : {};
        if (options.location &&
            typeof options.location === 'object' &&
            'parentTerminal' in options.location) {
            const parentTerminal = options.location.parentTerminal;
            if (parentTerminal) {
                const parentExtHostTerminal = this._terminals.find((t) => t.value === parentTerminal);
                if (parentExtHostTerminal) {
                    internalOptions.resolvedExtHostIdentifier = parentExtHostTerminal._id;
                }
            }
        }
        else if (options.location && typeof options.location !== 'object') {
            internalOptions.location = options.location;
        }
        else if (internalOptions.location &&
            typeof internalOptions.location === 'object' &&
            'splitActiveTerminal' in internalOptions.location) {
            internalOptions.location = { splitActiveTerminal: true };
        }
        return internalOptions;
    }
    attachPtyToTerminal(id, pty) {
        const terminal = this.getTerminalById(id);
        if (!terminal) {
            throw new Error(`Cannot resolve terminal with id ${id} for virtual process`);
        }
        const p = new ExtHostPseudoterminal(pty);
        const disposable = this._setupExtHostProcessListeners(id, p);
        this._terminalProcessDisposables[id] = disposable;
    }
    async $acceptActiveTerminalChanged(id) {
        const original = this._activeTerminal;
        if (id === null) {
            this._activeTerminal = undefined;
            if (original !== this._activeTerminal) {
                this._onDidChangeActiveTerminal.fire(this._activeTerminal);
            }
            return;
        }
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._activeTerminal = terminal;
            if (original !== this._activeTerminal) {
                this._onDidChangeActiveTerminal.fire(this._activeTerminal.value);
            }
        }
    }
    async $acceptTerminalProcessData(id, data) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._onDidWriteTerminalData.fire({ terminal: terminal.value, data });
        }
    }
    async $acceptTerminalDimensions(id, cols, rows) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            if (terminal.setDimensions(cols, rows)) {
                this._onDidChangeTerminalDimensions.fire({
                    terminal: terminal.value,
                    dimensions: terminal.value.dimensions,
                });
            }
        }
    }
    async $acceptDidExecuteCommand(id, command) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._onDidExecuteCommand.fire({ terminal: terminal.value, ...command });
        }
    }
    async $acceptTerminalMaximumDimensions(id, cols, rows) {
        // Extension pty terminal only - when virtual process resize fires it means that the
        // terminal's maximum dimensions changed
        this._terminalProcesses.get(id)?.resize(cols, rows);
    }
    async $acceptTerminalTitleChange(id, name) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            terminal.name = name;
        }
    }
    async $acceptTerminalClosed(id, exitCode, exitReason) {
        const index = this._getTerminalObjectIndexById(this._terminals, id);
        if (index !== null) {
            const terminal = this._terminals.splice(index, 1)[0];
            terminal.setExitStatus(exitCode, exitReason);
            this._onDidCloseTerminal.fire(terminal.value);
        }
    }
    $acceptTerminalOpened(id, extHostTerminalId, name, shellLaunchConfigDto) {
        if (extHostTerminalId) {
            // Resolve with the renderer generated id
            const index = this._getTerminalObjectIndexById(this._terminals, extHostTerminalId);
            if (index !== null) {
                // The terminal has already been created (via createTerminal*), only fire the event
                this._terminals[index]._id = id;
                this._onDidOpenTerminal.fire(this.terminals[index]);
                this._terminals[index].isOpen = true;
                return;
            }
        }
        const creationOptions = {
            name: shellLaunchConfigDto.name,
            shellPath: shellLaunchConfigDto.executable,
            shellArgs: shellLaunchConfigDto.args,
            cwd: typeof shellLaunchConfigDto.cwd === 'string'
                ? shellLaunchConfigDto.cwd
                : URI.revive(shellLaunchConfigDto.cwd),
            env: shellLaunchConfigDto.env,
            hideFromUser: shellLaunchConfigDto.hideFromUser,
        };
        const terminal = new ExtHostTerminal(this._proxy, id, creationOptions, name);
        this._terminals.push(terminal);
        this._onDidOpenTerminal.fire(terminal.value);
        terminal.isOpen = true;
    }
    async $acceptTerminalProcessId(id, processId) {
        const terminal = this.getTerminalById(id);
        terminal?._setProcessId(processId);
    }
    async $startExtensionTerminal(id, initialDimensions) {
        // Make sure the ExtHostTerminal exists so onDidOpenTerminal has fired before we call
        // Pseudoterminal.start
        const terminal = this.getTerminalById(id);
        if (!terminal) {
            return {
                message: localize('launchFail.idMissingOnExtHost', 'Could not find the terminal with id {0} on the extension host', id),
            };
        }
        // Wait for onDidOpenTerminal to fire
        if (!terminal.isOpen) {
            await new Promise((r) => {
                // Ensure open is called after onDidOpenTerminal
                const listener = this.onDidOpenTerminal(async (e) => {
                    if (e === terminal.value) {
                        listener.dispose();
                        r();
                    }
                });
            });
        }
        const terminalProcess = this._terminalProcesses.get(id);
        if (terminalProcess) {
            ;
            terminalProcess.startSendingEvents(initialDimensions);
        }
        else {
            // Defer startSendingEvents call to when _setupExtHostProcessListeners is called
            this._extensionTerminalAwaitingStart[id] = { initialDimensions };
        }
        return undefined;
    }
    _setupExtHostProcessListeners(id, p) {
        const disposables = new DisposableStore();
        disposables.add(p.onProcessReady((e) => this._proxy.$sendProcessReady(id, e.pid, e.cwd, e.windowsPty)));
        disposables.add(p.onDidChangeProperty((property) => this._proxy.$sendProcessProperty(id, property)));
        // Buffer data events to reduce the amount of messages going to the renderer
        this._bufferer.startBuffering(id, p.onProcessData);
        disposables.add(p.onProcessExit((exitCode) => this._onProcessExit(id, exitCode)));
        this._terminalProcesses.set(id, p);
        const awaitingStart = this._extensionTerminalAwaitingStart[id];
        if (awaitingStart && p instanceof ExtHostPseudoterminal) {
            p.startSendingEvents(awaitingStart.initialDimensions);
            delete this._extensionTerminalAwaitingStart[id];
        }
        return disposables;
    }
    $acceptProcessAckDataEvent(id, charCount) {
        this._terminalProcesses.get(id)?.acknowledgeDataEvent(charCount);
    }
    $acceptProcessInput(id, data) {
        this._terminalProcesses.get(id)?.input(data);
    }
    $acceptTerminalInteraction(id) {
        const terminal = this.getTerminalById(id);
        if (terminal?.setInteractedWith()) {
            this._onDidChangeTerminalState.fire(terminal.value);
        }
    }
    $acceptTerminalSelection(id, selection) {
        this.getTerminalById(id)?.setSelection(selection);
    }
    $acceptProcessResize(id, cols, rows) {
        try {
            this._terminalProcesses.get(id)?.resize(cols, rows);
        }
        catch (error) {
            // We tried to write to a closed pipe / channel.
            if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                throw error;
            }
        }
    }
    $acceptProcessShutdown(id, immediate) {
        this._terminalProcesses.get(id)?.shutdown(immediate);
    }
    $acceptProcessRequestInitialCwd(id) {
        this._terminalProcesses
            .get(id)
            ?.getInitialCwd()
            .then((initialCwd) => this._proxy.$sendProcessProperty(id, {
            type: "initialCwd" /* ProcessPropertyType.InitialCwd */,
            value: initialCwd,
        }));
    }
    $acceptProcessRequestCwd(id) {
        this._terminalProcesses
            .get(id)
            ?.getCwd()
            .then((cwd) => this._proxy.$sendProcessProperty(id, { type: "cwd" /* ProcessPropertyType.Cwd */, value: cwd }));
    }
    $acceptProcessRequestLatency(id) {
        return Promise.resolve(id);
    }
    registerProfileProvider(extension, id, provider) {
        if (this._profileProviders.has(id)) {
            throw new Error(`Terminal profile provider "${id}" already registered`);
        }
        this._profileProviders.set(id, provider);
        this._proxy.$registerProfileProvider(id, extension.identifier.value);
        return new VSCodeDisposable(() => {
            this._profileProviders.delete(id);
            this._proxy.$unregisterProfileProvider(id);
        });
    }
    registerTerminalCompletionProvider(extension, provider, ...triggerCharacters) {
        if (this._completionProviders.has(provider.id)) {
            throw new Error(`Terminal completion provider "${provider.id}" already registered`);
        }
        this._completionProviders.set(provider.id, provider);
        this._proxy.$registerCompletionProvider(provider.id, extension.identifier.value, ...triggerCharacters);
        return new VSCodeDisposable(() => {
            this._completionProviders.delete(provider.id);
            this._proxy.$unregisterCompletionProvider(provider.id);
        });
    }
    async $provideTerminalCompletions(id, options) {
        const token = new CancellationTokenSource().token;
        if (token.isCancellationRequested || !this.activeTerminal) {
            return undefined;
        }
        const provider = this._completionProviders.get(id);
        if (!provider) {
            return;
        }
        const completions = await provider.provideTerminalCompletions(this.activeTerminal, options, token);
        if (completions === null || completions === undefined) {
            return undefined;
        }
        return TerminalCompletionList.from(completions);
    }
    $acceptTerminalShellType(id, shellType) {
        const terminal = this.getTerminalById(id);
        if (terminal?.setShellType(shellType)) {
            this._onDidChangeTerminalState.fire(terminal.value);
        }
    }
    registerTerminalQuickFixProvider(id, extensionId, provider) {
        if (this._quickFixProviders.has(id)) {
            throw new Error(`Terminal quick fix provider "${id}" is already registered`);
        }
        this._quickFixProviders.set(id, provider);
        this._proxy.$registerQuickFixProvider(id, extensionId);
        return new VSCodeDisposable(() => {
            this._quickFixProviders.delete(id);
            this._proxy.$unregisterQuickFixProvider(id);
        });
    }
    async $provideTerminalQuickFixes(id, matchResult) {
        const token = new CancellationTokenSource().token;
        if (token.isCancellationRequested) {
            return;
        }
        const provider = this._quickFixProviders.get(id);
        if (!provider) {
            return;
        }
        const quickFixes = await provider.provideTerminalQuickFixes(matchResult, token);
        if (quickFixes === null || (Array.isArray(quickFixes) && quickFixes.length === 0)) {
            return undefined;
        }
        const store = new DisposableStore();
        this._lastQuickFixCommands.value = store;
        // Single
        if (!Array.isArray(quickFixes)) {
            return quickFixes
                ? TerminalQuickFix.from(quickFixes, this._extHostCommands.converter, store)
                : undefined;
        }
        // Many
        const result = [];
        for (const fix of quickFixes) {
            const converted = TerminalQuickFix.from(fix, this._extHostCommands.converter, store);
            if (converted) {
                result.push(converted);
            }
        }
        return result;
    }
    async $createContributedProfileTerminal(id, options) {
        const token = new CancellationTokenSource().token;
        let profile = await this._profileProviders.get(id)?.provideTerminalProfile(token);
        if (token.isCancellationRequested) {
            return;
        }
        if (profile && !('options' in profile)) {
            profile = { options: profile };
        }
        if (!profile || !('options' in profile)) {
            throw new Error(`No terminal profile options provided for id "${id}"`);
        }
        if ('pty' in profile.options) {
            this.createExtensionTerminal(profile.options, options);
            return;
        }
        this.createTerminalFromOptions(profile.options, options);
    }
    registerLinkProvider(provider) {
        this._linkProviders.add(provider);
        if (this._linkProviders.size === 1) {
            this._proxy.$startLinkProvider();
        }
        return new VSCodeDisposable(() => {
            this._linkProviders.delete(provider);
            if (this._linkProviders.size === 0) {
                this._proxy.$stopLinkProvider();
            }
        });
    }
    async $provideLinks(terminalId, line) {
        const terminal = this.getTerminalById(terminalId);
        if (!terminal) {
            return [];
        }
        // Discard any cached links the terminal has been holding, currently all links are released
        // when new links are provided.
        this._terminalLinkCache.delete(terminalId);
        const oldToken = this._terminalLinkCancellationSource.get(terminalId);
        oldToken?.dispose(true);
        const cancellationSource = new CancellationTokenSource();
        this._terminalLinkCancellationSource.set(terminalId, cancellationSource);
        const result = [];
        const context = { terminal: terminal.value, line };
        const promises = [];
        for (const provider of this._linkProviders) {
            promises.push(Promises.withAsyncBody(async (r) => {
                cancellationSource.token.onCancellationRequested(() => r({ provider, links: [] }));
                const links = (await provider.provideTerminalLinks(context, cancellationSource.token)) || [];
                if (!cancellationSource.token.isCancellationRequested) {
                    r({ provider, links });
                }
            }));
        }
        const provideResults = await Promise.all(promises);
        if (cancellationSource.token.isCancellationRequested) {
            return [];
        }
        const cacheLinkMap = new Map();
        for (const provideResult of provideResults) {
            if (provideResult && provideResult.links.length > 0) {
                result.push(...provideResult.links.map((providerLink) => {
                    const link = {
                        id: nextLinkId++,
                        startIndex: providerLink.startIndex,
                        length: providerLink.length,
                        label: providerLink.tooltip,
                    };
                    cacheLinkMap.set(link.id, {
                        provider: provideResult.provider,
                        link: providerLink,
                    });
                    return link;
                }));
            }
        }
        this._terminalLinkCache.set(terminalId, cacheLinkMap);
        return result;
    }
    $activateLink(terminalId, linkId) {
        const cachedLink = this._terminalLinkCache.get(terminalId)?.get(linkId);
        if (!cachedLink) {
            return;
        }
        cachedLink.provider.handleTerminalLink(cachedLink.link);
    }
    _onProcessExit(id, exitCode) {
        this._bufferer.stopBuffering(id);
        // Remove process reference
        this._terminalProcesses.delete(id);
        delete this._extensionTerminalAwaitingStart[id];
        // Clean up process disposables
        const processDiposable = this._terminalProcessDisposables[id];
        if (processDiposable) {
            processDiposable.dispose();
            delete this._terminalProcessDisposables[id];
        }
        // Send exit event to main side
        this._proxy.$sendProcessExit(id, exitCode);
    }
    getTerminalById(id) {
        return this._getTerminalObjectById(this._terminals, id);
    }
    getTerminalIdByApiObject(terminal) {
        const index = this._terminals.findIndex((item) => {
            return item.value === terminal;
        });
        return index >= 0 ? index : null;
    }
    _getTerminalObjectById(array, id) {
        const index = this._getTerminalObjectIndexById(array, id);
        return index !== null ? array[index] : null;
    }
    _getTerminalObjectIndexById(array, id) {
        const index = array.findIndex((item) => {
            return item._id === id;
        });
        return index >= 0 ? index : null;
    }
    getEnvironmentVariableCollection(extension) {
        let collection = this._environmentVariableCollections.get(extension.identifier.value);
        if (!collection) {
            collection = this._register(new UnifiedEnvironmentVariableCollection());
            this._setEnvironmentVariableCollection(extension.identifier.value, collection);
        }
        return collection.getScopedEnvironmentVariableCollection(undefined);
    }
    _syncEnvironmentVariableCollection(extensionIdentifier, collection) {
        const serialized = serializeEnvironmentVariableCollection(collection.map);
        const serializedDescription = serializeEnvironmentDescriptionMap(collection.descriptionMap);
        this._proxy.$setEnvironmentVariableCollection(extensionIdentifier, collection.persistent, serialized.length === 0 ? undefined : serialized, serializedDescription);
    }
    $initEnvironmentVariableCollections(collections) {
        collections.forEach((entry) => {
            const extensionIdentifier = entry[0];
            const collection = this._register(new UnifiedEnvironmentVariableCollection(entry[1]));
            this._setEnvironmentVariableCollection(extensionIdentifier, collection);
        });
    }
    $acceptDefaultProfile(profile, automationProfile) {
        const oldProfile = this._defaultProfile;
        this._defaultProfile = profile;
        this._defaultAutomationProfile = automationProfile;
        if (oldProfile?.path !== profile.path) {
            this._onDidChangeShell.fire(profile.path);
        }
    }
    _setEnvironmentVariableCollection(extensionIdentifier, collection) {
        this._environmentVariableCollections.set(extensionIdentifier, collection);
        this._register(collection.onDidChangeCollection(() => {
            // When any collection value changes send this immediately, this is done to ensure
            // following calls to createTerminal will be created with the new environment. It will
            // result in more noise by sending multiple updates when called but collections are
            // expected to be small.
            this._syncEnvironmentVariableCollection(extensionIdentifier, collection);
        }));
    }
};
BaseExtHostTerminalService = __decorate([
    __param(1, IExtHostCommands),
    __param(2, IExtHostRpcService)
], BaseExtHostTerminalService);
export { BaseExtHostTerminalService };
/**
 * Unified environment variable collection carrying information for all scopes, for a specific extension.
 */
class UnifiedEnvironmentVariableCollection extends Disposable {
    get persistent() {
        return this._persistent;
    }
    set persistent(value) {
        this._persistent = value;
        this._onDidChangeCollection.fire();
    }
    get onDidChangeCollection() {
        return this._onDidChangeCollection && this._onDidChangeCollection.event;
    }
    constructor(serialized) {
        super();
        this.map = new Map();
        this.scopedCollections = new Map();
        this.descriptionMap = new Map();
        this._persistent = true;
        this._onDidChangeCollection = new Emitter();
        this.map = new Map(serialized);
    }
    getScopedEnvironmentVariableCollection(scope) {
        const scopedCollectionKey = this.getScopeKey(scope);
        let scopedCollection = this.scopedCollections.get(scopedCollectionKey);
        if (!scopedCollection) {
            scopedCollection = new ScopedEnvironmentVariableCollection(this, scope);
            this.scopedCollections.set(scopedCollectionKey, scopedCollection);
            this._register(scopedCollection.onDidChangeCollection(() => this._onDidChangeCollection.fire()));
        }
        return scopedCollection;
    }
    replace(variable, value, options, scope) {
        this._setIfDiffers(variable, {
            value,
            type: EnvironmentVariableMutatorType.Replace,
            options: options ?? { applyAtProcessCreation: true },
            scope,
        });
    }
    append(variable, value, options, scope) {
        this._setIfDiffers(variable, {
            value,
            type: EnvironmentVariableMutatorType.Append,
            options: options ?? { applyAtProcessCreation: true },
            scope,
        });
    }
    prepend(variable, value, options, scope) {
        this._setIfDiffers(variable, {
            value,
            type: EnvironmentVariableMutatorType.Prepend,
            options: options ?? { applyAtProcessCreation: true },
            scope,
        });
    }
    _setIfDiffers(variable, mutator) {
        if (mutator.options &&
            mutator.options.applyAtProcessCreation === false &&
            !mutator.options.applyAtShellIntegration) {
            throw new Error('EnvironmentVariableMutatorOptions must apply at either process creation or shell integration');
        }
        const key = this.getKey(variable, mutator.scope);
        const current = this.map.get(key);
        const newOptions = mutator.options
            ? {
                applyAtProcessCreation: mutator.options.applyAtProcessCreation ?? false,
                applyAtShellIntegration: mutator.options.applyAtShellIntegration ?? false,
            }
            : {
                applyAtProcessCreation: true,
            };
        if (!current ||
            current.value !== mutator.value ||
            current.type !== mutator.type ||
            current.options?.applyAtProcessCreation !== newOptions.applyAtProcessCreation ||
            current.options?.applyAtShellIntegration !== newOptions.applyAtShellIntegration ||
            current.scope?.workspaceFolder?.index !== mutator.scope?.workspaceFolder?.index) {
            const key = this.getKey(variable, mutator.scope);
            const value = {
                variable,
                ...mutator,
                options: newOptions,
            };
            this.map.set(key, value);
            this._onDidChangeCollection.fire();
        }
    }
    get(variable, scope) {
        const key = this.getKey(variable, scope);
        const value = this.map.get(key);
        // TODO: Set options to defaults if needed
        return value ? convertMutator(value) : undefined;
    }
    getKey(variable, scope) {
        const scopeKey = this.getScopeKey(scope);
        return scopeKey.length ? `${variable}:::${scopeKey}` : variable;
    }
    getScopeKey(scope) {
        return this.getWorkspaceKey(scope?.workspaceFolder) ?? '';
    }
    getWorkspaceKey(workspaceFolder) {
        return workspaceFolder ? workspaceFolder.uri.toString() : undefined;
    }
    getVariableMap(scope) {
        const map = new Map();
        for (const [_, value] of this.map) {
            if (this.getScopeKey(value.scope) === this.getScopeKey(scope)) {
                map.set(value.variable, convertMutator(value));
            }
        }
        return map;
    }
    delete(variable, scope) {
        const key = this.getKey(variable, scope);
        this.map.delete(key);
        this._onDidChangeCollection.fire();
    }
    clear(scope) {
        if (scope?.workspaceFolder) {
            for (const [key, mutator] of this.map) {
                if (mutator.scope?.workspaceFolder?.index === scope.workspaceFolder.index) {
                    this.map.delete(key);
                }
            }
            this.clearDescription(scope);
        }
        else {
            this.map.clear();
            this.descriptionMap.clear();
        }
        this._onDidChangeCollection.fire();
    }
    setDescription(description, scope) {
        const key = this.getScopeKey(scope);
        const current = this.descriptionMap.get(key);
        if (!current || current.description !== description) {
            let descriptionStr;
            if (typeof description === 'string') {
                descriptionStr = description;
            }
            else {
                // Only take the description before the first `\n\n`, so that the description doesn't mess up the UI
                descriptionStr = description?.value.split('\n\n')[0];
            }
            const value = {
                description: descriptionStr,
                scope,
            };
            this.descriptionMap.set(key, value);
            this._onDidChangeCollection.fire();
        }
    }
    getDescription(scope) {
        const key = this.getScopeKey(scope);
        return this.descriptionMap.get(key)?.description;
    }
    clearDescription(scope) {
        const key = this.getScopeKey(scope);
        this.descriptionMap.delete(key);
    }
}
class ScopedEnvironmentVariableCollection {
    get persistent() {
        return this.collection.persistent;
    }
    set persistent(value) {
        this.collection.persistent = value;
    }
    get onDidChangeCollection() {
        return this._onDidChangeCollection && this._onDidChangeCollection.event;
    }
    constructor(collection, scope) {
        this.collection = collection;
        this.scope = scope;
        this._onDidChangeCollection = new Emitter();
    }
    getScoped(scope) {
        return this.collection.getScopedEnvironmentVariableCollection(scope);
    }
    replace(variable, value, options) {
        this.collection.replace(variable, value, options, this.scope);
    }
    append(variable, value, options) {
        this.collection.append(variable, value, options, this.scope);
    }
    prepend(variable, value, options) {
        this.collection.prepend(variable, value, options, this.scope);
    }
    get(variable) {
        return this.collection.get(variable, this.scope);
    }
    forEach(callback, thisArg) {
        this.collection
            .getVariableMap(this.scope)
            .forEach((value, variable) => callback.call(thisArg, variable, value, this), this.scope);
    }
    [Symbol.iterator]() {
        return this.collection.getVariableMap(this.scope).entries();
    }
    delete(variable) {
        this.collection.delete(variable, this.scope);
        this._onDidChangeCollection.fire(undefined);
    }
    clear() {
        this.collection.clear(this.scope);
    }
    set description(description) {
        this.collection.setDescription(description, this.scope);
    }
    get description() {
        return this.collection.getDescription(this.scope);
    }
}
let WorkerExtHostTerminalService = class WorkerExtHostTerminalService extends BaseExtHostTerminalService {
    constructor(extHostCommands, extHostRpc) {
        super(false, extHostCommands, extHostRpc);
    }
    createTerminal(name, shellPath, shellArgs) {
        throw new NotSupportedError();
    }
    createTerminalFromOptions(options, internalOptions) {
        throw new NotSupportedError();
    }
};
WorkerExtHostTerminalService = __decorate([
    __param(0, IExtHostCommands),
    __param(1, IExtHostRpcService)
], WorkerExtHostTerminalService);
export { WorkerExtHostTerminalService };
function asTerminalIcon(iconPath) {
    if (!iconPath || typeof iconPath === 'string') {
        return undefined;
    }
    if (!('id' in iconPath)) {
        return iconPath;
    }
    return {
        id: iconPath.id,
        color: iconPath.color,
    };
}
function asTerminalColor(color) {
    return ThemeColor.isThemeColor(color) ? color : undefined;
}
function convertMutator(mutator) {
    const newMutator = { ...mutator };
    delete newMutator.scope;
    newMutator.options = newMutator.options ?? undefined;
    delete newMutator.variable;
    return newMutator;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFFTixXQUFXLEdBWVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFFTixlQUFlLEVBQ2YsVUFBVSxFQUNWLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFDTixVQUFVLElBQUksZ0JBQWdCLEVBQzlCLDhCQUE4QixHQUc5QixNQUFNLG1CQUFtQixDQUFBO0FBRTFCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLHNDQUFzQyxHQUN0QyxNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQW9CM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlE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