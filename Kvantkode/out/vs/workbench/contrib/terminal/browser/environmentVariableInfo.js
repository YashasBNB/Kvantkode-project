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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvZW52aXJvbm1lbnRWYXJpYWJsZUluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFRaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFRN0QsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTlFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTRCO0lBR3hDLFlBQ2tCLEtBQStDLEVBQy9DLFdBQW1CLEVBQ25CLFdBQWlELEVBQ2hELGdCQUFtRCxFQUNsRCxpQkFBcUQ7UUFKdkQsVUFBSyxHQUFMLEtBQUssQ0FBMEM7UUFDL0MsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsZ0JBQVcsR0FBWCxXQUFXLENBQXNDO1FBQy9CLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDakMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQVBoRSxtQkFBYyxHQUFHLElBQUksQ0FBQTtJQVEzQixDQUFDO0lBRUksUUFBUSxDQUFDLEtBQTJDO1FBQzNELE1BQU0sTUFBTSxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ3JDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQzFELHVCQUF1QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQzVELHVCQUF1QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBRTVELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FDckIsMkNBQTJDLEVBQzNDLDBGQUEwRixDQUMxRixDQUFBO1FBQ0QsT0FBTyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxXQUFXO1FBQ2xCLE9BQU87WUFDTjtnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixDQUFDO2dCQUM3RCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUU7Z0JBQ2hGLFNBQVMsdUVBQTRCO2FBQ3JDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBMkM7UUFDcEQsT0FBTztZQUNOLEVBQUUsdURBQStCO1lBQ2pDLFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTztZQUMxQixJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO1NBQ2hDLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTVDWSw0QkFBNEI7SUFPdEMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGlCQUFpQixDQUFBO0dBUlAsNEJBQTRCLENBNEN4Qzs7QUFFTSxJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFvQztJQUdoRCxZQUNrQixXQUFpRCxFQUNqRCxlQUFpRCxFQUMvQyxpQkFBcUQ7UUFGdkQsZ0JBQVcsR0FBWCxXQUFXLENBQXNDO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM5QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBTGhFLG1CQUFjLEdBQUcsS0FBSyxDQUFBO0lBTTVCLENBQUM7SUFFSSxRQUFRLENBQUMsS0FBMkM7UUFDM0QsTUFBTSxNQUFNLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDckMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFFaEYsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUNyQiw0Q0FBNEMsRUFDNUMsMkVBQTJFLENBQzNFLENBQUE7UUFDRCxPQUFPLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hGLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxLQUEyQztRQUM5RCxPQUFPO1lBQ047Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQ0FBZ0MsQ0FBQztnQkFDakYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxnSEFFbEMsS0FBSyxDQUNMO2dCQUNGLFNBQVMsK0dBQWdEO2FBQ3pEO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBMkM7UUFDcEQsT0FBTztZQUNOLEVBQUUseUZBQXFEO1lBQ3ZELFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSTtZQUN2QixPQUFPLEVBQUUsU0FBUyxFQUFFLGtEQUFrRDtZQUN0RSxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDckMsWUFBWSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1NBQ3JDLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTVDWSxvQ0FBb0M7SUFLOUMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0dBTlAsb0NBQW9DLENBNENoRDs7QUFFRCxTQUFTLG9CQUFvQixDQUM1QixVQUFnRCxFQUNoRCxLQUEyQyxFQUMzQyxnQkFBbUMsRUFDbkMsTUFBbUI7SUFFbkIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsRSxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqRSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzFCLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUNELE1BQU0sb0JBQW9CLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixzRkFBc0Y7WUFDdEYsTUFBTSxlQUFlLEdBQUcsaUJBQWlCO2dCQUN4QyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsV0FBVyxDQUFDLEdBQUc7Z0JBQ3BFLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDTCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsZUFBZSxJQUFJLENBQUMsQ0FBQTtZQUNwRixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkUsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDeEIsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQy9CLE1BQW1CLEVBQ25CLElBQW1FO0lBRW5FLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxFQUFFLENBQUM7UUFDN0IsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsRUFBVSxFQUFFLGdCQUFtQztJQUN4RSxPQUFPLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsV0FBVyxJQUFJLEVBQUUsQ0FBQTtBQUMvRSxDQUFDIn0=