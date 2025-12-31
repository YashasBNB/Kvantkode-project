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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let TerminalAccessibleBufferProvider = class TerminalAccessibleBufferProvider extends Disposable {
    constructor(_instance, _bufferTracker, customHelp, configurationService, terminalService) {
        super();
        this._instance = _instance;
        this._bufferTracker = _bufferTracker;
        this.id = "terminal" /* AccessibleViewProviderId.Terminal */;
        this.options = {
            type: "view" /* AccessibleViewType.View */,
            language: 'terminal',
            id: "terminal" /* AccessibleViewProviderId.Terminal */,
        };
        this.verbositySettingKey = "accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */;
        this._onDidRequestClearProvider = new Emitter();
        this.onDidRequestClearLastProvider = this._onDidRequestClearProvider.event;
        this.options.customHelp = customHelp;
        this.options.position = configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */)
            ? 'initial-bottom'
            : 'bottom';
        this._register(this._instance.onDisposed(() => this._onDidRequestClearProvider.fire("terminal" /* AccessibleViewProviderId.Terminal */)));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */)) {
                this.options.position = configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */)
                    ? 'initial-bottom'
                    : 'bottom';
            }
        }));
        this._focusedInstance = terminalService.activeInstance;
        this._register(terminalService.onDidChangeActiveInstance(() => {
            if (terminalService.activeInstance &&
                this._focusedInstance?.instanceId !== terminalService.activeInstance?.instanceId) {
                this._onDidRequestClearProvider.fire("terminal" /* AccessibleViewProviderId.Terminal */);
                this._focusedInstance = terminalService.activeInstance;
            }
        }));
    }
    onClose() {
        this._instance.focus();
    }
    provideContent() {
        this._bufferTracker.update();
        return this._bufferTracker.lines.join('\n');
    }
    getSymbols() {
        const commands = this._getCommandsWithEditorLine() ?? [];
        const symbols = [];
        for (const command of commands) {
            const label = command.command.command;
            if (label) {
                symbols.push({
                    label,
                    lineNumber: command.lineNumber,
                });
            }
        }
        return symbols;
    }
    _getCommandsWithEditorLine() {
        const capability = this._instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = capability?.commands;
        const currentCommand = capability?.currentCommand;
        if (!commands?.length) {
            return;
        }
        const result = [];
        for (const command of commands) {
            const lineNumber = this._getEditorLineForCommand(command);
            if (lineNumber === undefined) {
                continue;
            }
            result.push({ command, lineNumber, exitCode: command.exitCode });
        }
        if (currentCommand) {
            const lineNumber = this._getEditorLineForCommand(currentCommand);
            if (lineNumber !== undefined) {
                result.push({ command: currentCommand, lineNumber });
            }
        }
        return result;
    }
    _getEditorLineForCommand(command) {
        let line;
        if ('marker' in command) {
            line = command.marker?.line;
        }
        else if ('commandStartMarker' in command) {
            line = command.commandStartMarker?.line;
        }
        if (line === undefined || line < 0) {
            return;
        }
        line = this._bufferTracker.bufferToEditorLineMapping.get(line);
        if (line === undefined) {
            return;
        }
        return line + 1;
    }
};
TerminalAccessibleBufferProvider = __decorate([
    __param(3, IConfigurationService),
    __param(4, ITerminalService)
], TerminalAccessibleBufferProvider);
export { TerminalAccessibleBufferProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmxlQnVmZmVyUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3Rlcm1pbmFsQWNjZXNzaWJsZUJ1ZmZlclByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFRcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFPckcsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSXBGLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBZ0JsQixZQUNrQixTQVNoQixFQUNPLGNBQW9DLEVBQzVDLFVBQXdCLEVBQ0Qsb0JBQTJDLEVBQ2hELGVBQWlDO1FBRW5ELEtBQUssRUFBRSxDQUFBO1FBZlUsY0FBUyxHQUFULFNBQVMsQ0FTekI7UUFDTyxtQkFBYyxHQUFkLGNBQWMsQ0FBc0I7UUF4QnBDLE9BQUUsc0RBQW9DO1FBQ3RDLFlBQU8sR0FBMkI7WUFDMUMsSUFBSSxzQ0FBeUI7WUFDN0IsUUFBUSxFQUFFLFVBQVU7WUFDcEIsRUFBRSxvREFBbUM7U0FDckMsQ0FBQTtRQUNRLHdCQUFtQixxRkFBMkM7UUFJdEQsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQTRCLENBQUE7UUFDNUUsa0NBQTZCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQW1CN0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQ3BD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