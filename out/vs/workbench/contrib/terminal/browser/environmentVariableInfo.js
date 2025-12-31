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
import { ITerminalService } from './terminal.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import Severity from '../../../../base/common/severity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
let EnvironmentVariableInfoStale = class EnvironmentVariableInfoStale {
    constructor(_diff, _terminalId, _collection, _terminalService, _extensionService) {
        this._diff = _diff;
        this._terminalId = _terminalId;
        this._collection = _collection;
        this._terminalService = _terminalService;
        this._extensionService = _extensionService;
        this.requiresAction = true;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._diff.added.values());
        addExtensionIdentifiers(extSet, this._diff.removed.values());
        addExtensionIdentifiers(extSet, this._diff.changed.values());
        let message = localize('extensionEnvironmentContributionInfoStale', 'The following extensions want to relaunch the terminal to contribute to its environment:');
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions() {
        return [
            {
                label: localize('relaunchTerminalLabel', 'Relaunch Terminal'),
                run: () => this._terminalService.getInstanceFromId(this._terminalId)?.relaunch(),
                commandId: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */,
            },
        ];
    }
    getStatus(scope) {
        return {
            id: "relaunch-needed" /* TerminalStatus.RelaunchNeeded */,
            severity: Severity.Warning,
            icon: Codicon.warning,
            tooltip: this._getInfo(scope),
            hoverActions: this._getActions(),
        };
    }
};
EnvironmentVariableInfoStale = __decorate([
    __param(3, ITerminalService),
    __param(4, IExtensionService)
], EnvironmentVariableInfoStale);
export { EnvironmentVariableInfoStale };
let EnvironmentVariableInfoChangesActive = class EnvironmentVariableInfoChangesActive {
    constructor(_collection, _commandService, _extensionService) {
        this._collection = _collection;
        this._commandService = _commandService;
        this._extensionService = _extensionService;
        this.requiresAction = false;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._collection.getVariableMap(scope).values());
        let message = localize('extensionEnvironmentContributionInfoActive', "The following extensions have contributed to this terminal's environment:");
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions(scope) {
        return [
            {
                label: localize('showEnvironmentContributions', 'Show Environment Contributions'),
                run: () => this._commandService.executeCommand("workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */, scope),
                commandId: "workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */,
            },
        ];
    }
    getStatus(scope) {
        return {
            id: "env-var-info-changes-active" /* TerminalStatus.EnvironmentVariableInfoChangesActive */,
            severity: Severity.Info,
            tooltip: undefined, // The action is present when details aren't shown
            detailedTooltip: this._getInfo(scope),
            hoverActions: this._getActions(scope),
        };
    }
};
EnvironmentVariableInfoChangesActive = __decorate([
    __param(1, ICommandService),
    __param(2, IExtensionService)
], EnvironmentVariableInfoChangesActive);
export { EnvironmentVariableInfoChangesActive };
function getMergedDescription(collection, scope, extensionService, extSet) {
    const message = ['\n'];
    const globalDescriptions = collection.getDescriptionMap(undefined);
    const workspaceDescriptions = collection.getDescriptionMap(scope);
    for (const ext of extSet) {
        const globalDescription = globalDescriptions.get(ext);
        if (globalDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
            message.push(`: ${globalDescription}`);
        }
        const workspaceDescription = workspaceDescriptions.get(ext);
        if (workspaceDescription) {
            // Only show '(workspace)' suffix if there is already a description for the extension.
            const workspaceSuffix = globalDescription
                ? ` (${localize('ScopedEnvironmentContributionInfo', 'workspace')})`
                : '';
            message.push(`\n- \`${getExtensionName(ext, extensionService)}${workspaceSuffix}\``);
            message.push(`: ${workspaceDescription}`);
        }
        if (!globalDescription && !workspaceDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
        }
    }
    return message.join('');
}
function addExtensionIdentifiers(extSet, diff) {
    for (const mutators of diff) {
        for (const mutator of mutators) {
            extSet.add(mutator.extensionIdentifier);
        }
    }
}
function getExtensionName(id, extensionService) {
    return extensionService.extensions.find((e) => e.id === id)?.displayName || id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL2Vudmlyb25tZW50VmFyaWFibGVJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBUWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBUTdELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU5RSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQUd4QyxZQUNrQixLQUErQyxFQUMvQyxXQUFtQixFQUNuQixXQUFpRCxFQUNoRCxnQkFBbUQsRUFDbEQsaUJBQXFEO1FBSnZELFVBQUssR0FBTCxLQUFLLENBQTBDO1FBQy9DLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLGdCQUFXLEdBQVgsV0FBVyxDQUFzQztRQUMvQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ2pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFQaEUsbUJBQWMsR0FBRyxJQUFJLENBQUE7SUFRM0IsQ0FBQztJQUVJLFFBQVEsQ0FBQyxLQUEyQztRQUMzRCxNQUFNLE1BQU0sR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNyQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxF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