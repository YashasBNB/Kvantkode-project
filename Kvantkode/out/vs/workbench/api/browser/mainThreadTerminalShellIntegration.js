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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUZXJtaW5hbFNoZWxsSW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFvQixNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUtqRCxPQUFPLEVBQ04sY0FBYyxFQUNkLFdBQVcsR0FHWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN0RyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFHaEYsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FDWixTQUFRLFVBQVU7SUFLbEIsWUFDQyxjQUErQixFQUNJLGdCQUFrQyxFQUN2QywyQkFBeUQ7UUFFdkYsS0FBSyxFQUFFLENBQUE7UUFINEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUtyRSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUE7UUFFckYsTUFBTSxxQkFBcUIsR0FBNkIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNqRSxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsS0FBSyxNQUFNLFFBQVEsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxvREFBb0Q7UUFDcEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxDQUFBO1lBQ25GLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUMvQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN4RCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQ2YsS0FBSyxDQUFDLE1BQU0sQ0FDWCxRQUFRLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUM1QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxnREFBd0MsQ0FDaEQsRUFDRCxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQ2QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUMsS0FBSyxDQUFBO1FBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakYsOENBQThDO1FBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLDBDQUVwRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsOENBQThDO1FBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLCtDQUVwRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUE4QyxDQUFBO2dCQUV0RSwwQkFBMEI7Z0JBQzFCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3JDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUMxQixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFDckIsT0FBTyxFQUNQLFNBQXFCLEVBQ3JCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUNoQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxtQ0FBbUM7UUFDbkMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLCtCQUErQiw4Q0FFcEQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FDMUIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxjQUE0QyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3RDLHNGQUFzRjtZQUN0RixRQUFRO1lBQ1IsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUMvQixPQUFNO1lBQ1AsQ0FBQztZQUNELG9EQUFvRDtZQUNwRCxjQUFjLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUN2QixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUMvQixVQUFVLEVBQ1YsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQ2QscUNBQXFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQ2pDLENBQUE7WUFFRCwwQ0FBMEM7WUFDMUMsMEdBQTBHO1lBQzFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUNoRCxxQkFBcUIsQ0FBQyxHQUFHLENBQ3hCLFVBQVUsRUFDVixLQUFLLENBQUMsVUFBVSxDQUNmLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUNqQixFQUFFLEVBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsaUNBQWlDO1FBQ2pDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQy9DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywrQkFBK0IsOENBRXBELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQzFCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BDLGNBQWMsR0FBRyxTQUFTLENBQUE7WUFDMUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7WUFDeEMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ2hELHdGQUF3RjtZQUN4RixzRkFBc0Y7WUFDdEYsb0ZBQW9GO1lBQ3BGLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQzdCLFVBQVUsRUFDVixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFDZCxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzdDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUNoQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FDZixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUMzRixDQUFBO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FBQyxVQUFrQixFQUFFLFdBQW1CO1FBQ3RELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25GLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxHQUF1QjtRQUMvQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3ZDLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxRQUEyQjtRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcseUNBQWlDLENBQUE7UUFDL0UsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTVLWSxrQ0FBa0M7SUFEOUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDO0lBU2xFLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSw0QkFBNEIsQ0FBQTtHQVRsQixrQ0FBa0MsQ0E0SzlDOztBQUVELFNBQVMscUNBQXFDLENBQzdDLE9BQXlCO0lBRXpCLFFBQVEsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDdkMsS0FBSyxNQUFNO1lBQ1YsT0FBTywyQ0FBMkMsQ0FBQyxJQUFJLENBQUE7UUFDeEQsS0FBSyxRQUFRO1lBQ1osT0FBTywyQ0FBMkMsQ0FBQyxNQUFNLENBQUE7UUFDMUQsS0FBSyxLQUFLLENBQUM7UUFDWDtZQUNDLE9BQU8sMkNBQTJDLENBQUMsR0FBRyxDQUFBO0lBQ3hELENBQUM7QUFDRixDQUFDIn0=