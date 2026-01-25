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
import { ITerminalEditorService, } from './terminal.js';
let TerminalInputSerializer = class TerminalInputSerializer {
    constructor(_terminalEditorService) {
        this._terminalEditorService = _terminalEditorService;
    }
    canSerialize(editorInput) {
        return (typeof editorInput.terminalInstance?.persistentProcessId === 'number' &&
            editorInput.terminalInstance.shouldPersist);
    }
    serialize(editorInput) {
        if (!this.canSerialize(editorInput)) {
            return;
        }
        return JSON.stringify(this._toJson(editorInput.terminalInstance));
    }
    deserialize(instantiationService, serializedEditorInput) {
        const terminalInstance = JSON.parse(serializedEditorInput);
        return this._terminalEditorService.reviveInput(terminalInstance);
    }
    _toJson(instance) {
        return {
            id: instance.persistentProcessId,
            pid: instance.processId || 0,
            title: instance.title,
            titleSource: instance.titleSource,
            cwd: '',
            icon: instance.icon,
            color: instance.color,
            hasChildProcesses: instance.hasChildProcesses,
            isFeatureTerminal: instance.shellLaunchConfig.isFeatureTerminal,
            hideFromUser: instance.shellLaunchConfig.hideFromUser,
            reconnectionProperties: instance.shellLaunchConfig.reconnectionProperties,
            shellIntegrationNonce: instance.shellIntegrationNonce,
        };
    }
};
TerminalInputSerializer = __decorate([
    __param(0, ITerminalEditorService)
], TerminalInputSerializer);
export { TerminalInputSerializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsRWRpdG9yU2VyaWFsaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0sZUFBZSxDQUFBO0FBR2YsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFDbkMsWUFDMEMsc0JBQThDO1FBQTlDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7SUFDckYsQ0FBQztJQUVHLFlBQVksQ0FDbEIsV0FBZ0M7UUFFaEMsT0FBTyxDQUNOLE9BQU8sV0FBVyxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixLQUFLLFFBQVE7WUFDckUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FDMUMsQ0FBQTtJQUNGLENBQUM7SUFFTSxTQUFTLENBQUMsV0FBZ0M7UUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVNLFdBQVcsQ0FDakIsb0JBQTJDLEVBQzNDLHFCQUE2QjtRQUU3QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUMxRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU8sT0FBTyxDQUFDLFFBQTJCO1FBQzFDLE9BQU87WUFDTixFQUFFLEVBQUUsUUFBUSxDQUFDLG1CQUFvQjtZQUNqQyxHQUFHLEVBQUUsUUFBUSxDQUFDLFNBQVMsSUFBSSxDQUFDO1lBQzVCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7WUFDakMsR0FBRyxFQUFFLEVBQUU7WUFDUCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxpQkFBaUI7WUFDN0MsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQjtZQUMvRCxZQUFZLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFlBQVk7WUFDckQsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQjtZQUN6RSxxQkFBcUIsRUFBRSxRQUFRLENBQUMscUJBQXFCO1NBQ3JELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTdDWSx1QkFBdUI7SUFFakMsV0FBQSxzQkFBc0IsQ0FBQTtHQUZaLHVCQUF1QixDQTZDbkMifQ==