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
import { Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { ITerminalService, } from '../../contrib/terminal/browser/terminal.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { TerminalShellExecutionCommandLineConfidence } from '../common/extHostTypes.js';
let MainThreadTerminalShellIntegration = class MainThreadTerminalShellIntegration extends Disposable {
    constructor(extHostContext, _terminalService, workbenchEnvironmentService) {
        super();
        this._terminalService = _terminalService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTerminalShellIntegration);
        const instanceDataListeners = new Map();
        this._register(toDisposable(() => {
            for (const listener of instanceDataListeners.values()) {
                listener.dispose();
            }
        }));
        // onDidChangeTerminalShellIntegration initial state
        for (const terminal of this._terminalService.instances) {
            const cmdDetection = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (cmdDetection) {
                this._enableShellIntegration(terminal);
            }
        }
        // onDidChangeTerminalShellIntegration via command detection
        const onDidAddCommandDetection = this._store.add(this._terminalService.createOnInstanceEvent((instance) => {
            return Event.map(Event.filter(instance.capabilities.onDidAddCapabilityType, (e) => e === 2 /* TerminalCapability.CommandDetection */), () => instance);
        })).event;
        this._store.add(onDidAddCommandDetection((e) => this._enableShellIntegration(e)));
        // onDidChangeTerminalShellIntegration via cwd
        const cwdChangeEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(0 /* TerminalCapability.CwdDetection */, (e) => e.onDidChangeCwd));
        this._store.add(cwdChangeEvent.event((e) => {
            this._proxy.$cwdChange(e.instance.instanceId, this._convertCwdToUri(e.data));
        }));
        // onDidChangeTerminalShellIntegration via env
        const envChangeEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(5 /* TerminalCapability.ShellEnvDetection */, (e) => e.onDidChangeEnv));
        this._store.add(envChangeEvent.event((e) => {
            if (e.data.value && typeof e.data.value === 'object') {
                const envValue = e.data.value;
                // Extract keys and values
                const keysArr = Object.keys(envValue);
                const valuesArr = Object.values(envValue);
                this._proxy.$shellEnvChange(e.instance.instanceId, keysArr, valuesArr, e.data.isTrusted);
            }
        }));
        // onDidStartTerminalShellExecution
        const commandDetectionStartEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, (e) => e.onCommandExecuted));
        let currentCommand;
        this._store.add(commandDetectionStartEvent.event((e) => {
            // Prevent duplicate events from being sent in case command detection double fires the
            // event
            if (e.data === currentCommand) {
                return;
            }
            // String paths are not exposed in the extension API
            currentCommand = e.data;
            const instanceId = e.instance.instanceId;
            this._proxy.$shellExecutionStart(instanceId, e.data.command, convertToExtHostCommandLineConfidence(e.data), e.data.isTrusted, this._convertCwdToUri(e.data.cwd));
            // TerminalShellExecution.createDataStream
            // Debounce events to reduce the message count - when this listener is disposed the events will be flushed
            instanceDataListeners.get(instanceId)?.dispose();
            instanceDataListeners.set(instanceId, Event.accumulate(e.instance.onData, 50, this._store)((events) => {
                this._proxy.$shellExecutionData(instanceId, events.join(''));
            }));
        }));
        // onDidEndTerminalShellExecution
        const commandDetectionEndEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, (e) => e.onCommandFinished));
        this._store.add(commandDetectionEndEvent.event((e) => {
            currentCommand = undefined;
            const instanceId = e.instance.instanceId;
            instanceDataListeners.get(instanceId)?.dispose();
            // Shell integration C (executed) and D (command finished) sequences should always be in
            // their own events, so send this immediately. This means that the D sequence will not
            // be included as it's currently being parsed when the command finished event fires.
            this._proxy.$shellExecutionEnd(instanceId, e.data.command, convertToExtHostCommandLineConfidence(e.data), e.data.isTrusted, e.data.exitCode);
        }));
        // Clean up after dispose
        this._store.add(this._terminalService.onDidDisposeInstance((e) => this._proxy.$closeTerminal(e.instanceId)));
    }
    $executeCommand(terminalId, commandLine) {
        this._terminalService.getInstanceFromId(terminalId)?.runCommand(commandLine, true);
    }
    _convertCwdToUri(cwd) {
        return cwd ? URI.file(cwd) : undefined;
    }
    _enableShellIntegration(instance) {
        this._proxy.$shellIntegrationChange(instance.instanceId);
        const cwdDetection = instance.capabilities.get(0 /* TerminalCapability.CwdDetection */);
        if (cwdDetection) {
            this._proxy.$cwdChange(instance.instanceId, this._convertCwdToUri(cwdDetection.getCwd()));
        }
    }
};
MainThreadTerminalShellIntegration = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTerminalShellIntegration),
    __param(1, ITerminalService),
    __param(2, IWorkbenchEnvironmentService)
], MainThreadTerminalShellIntegration);
export { MainThreadTerminalShellIntegration };
function convertToExtHostCommandLineConfidence(command) {
    switch (command.commandLineConfidence) {
        case 'high':
            return TerminalShellExecutionCommandLineConfidence.High;
        case 'medium':
            return TerminalShellExecutionCommandLineConfidence.Medium;
        case 'low':
        default:
            return TerminalShellExecutionCommandLineConfidence.Low;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVybWluYWxTaGVsbEludGVncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFLakQsT0FBTyxFQUNOLGNBQWMsRUFDZCxXQUFXLEdBR1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdEcsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBR2hGLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQ1osU0FBUSxVQUFVO0lBS2xCLFlBQ0MsY0FBK0IsRUFDSSxnQkFBa0MsRUFDdkMsMkJBQXlEO1FBRXZGLEtBQUssRUFBRSxDQUFBO1FBSDRCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFLckUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBRXJGLE1BQU0scUJBQXFCLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDakUsSUFBSSxDQUFDLFNBQVMsQ0FD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