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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService, terminalEditorId, } from './terminal.js';
import { parseTerminalUri } from './terminalUri.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IEmbedderTerminalService } from '../../../services/terminal/common/embedderTerminalService.js';
/**
 * The main contribution for the terminal contrib. This contains calls to other components necessary
 * to set up the terminal but don't need to be tracked in the long term (where TerminalService would
 * be more relevant).
 */
let TerminalMainContribution = class TerminalMainContribution extends Disposable {
    static { this.ID = 'terminalMain'; }
    constructor(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService) {
        super();
        this._init(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService);
    }
    async _init(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService) {
        // IMPORTANT: This listener needs to be set up before the workbench is ready to support
        // embedder terminals.
        this._register(embedderTerminalService.onDidCreateTerminal(async (embedderTerminal) => {
            const terminal = await terminalService.createTerminal({
                config: embedderTerminal,
                location: TerminalLocation.Panel,
                skipContributedProfileCheck: true,
            });
            terminalService.setActiveInstance(terminal);
            await terminalService.revealActiveTerminal();
        }));
        await lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Register terminal editors
        this._register(editorResolverService.registerEditor(`${Schemas.vscodeTerminal}:/**`, {
            id: terminalEditorId,
            label: terminalStrings.terminal,
            priority: RegisteredEditorPriority.exclusive,
        }, {
            canSupportResource: (uri) => uri.scheme === Schemas.vscodeTerminal,
            singlePerResource: true,
        }, {
            createEditorInput: async ({ resource, options }) => {
                let instance = terminalService.getInstanceFromResource(resource);
                if (instance) {
                    const sourceGroup = terminalGroupService.getGroupForInstance(instance);
                    sourceGroup?.removeInstance(instance);
                }
                else {
                    // Terminal from a different window
                    const terminalIdentifier = parseTerminalUri(resource);
                    if (!terminalIdentifier.instanceId) {
                        throw new Error('Terminal identifier without instanceId');
                    }
                    const primaryBackend = terminalService.getPrimaryBackend();
                    if (!primaryBackend) {
                        throw new Error('No terminal primary backend');
                    }
                    const attachPersistentProcess = await primaryBackend.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId);
                    if (!attachPersistentProcess) {
                        throw new Error('No terminal persistent process to attach');
                    }
                    instance = terminalInstanceService.createInstance({ attachPersistentProcess }, TerminalLocation.Editor);
                }
                const resolvedResource = terminalEditorService.resolveResource(instance);
                const editor = terminalEditorService.getInputFromResource(resolvedResource);
                return {
                    editor,
                    options: {
                        ...options,
                        pinned: true,
                        forceReload: true,
                        override: terminalEditorId,
                    },
                };
            },
        }));
        // Register a resource formatter for terminal URIs
        this._register(labelService.registerFormatter({
            scheme: Schemas.vscodeTerminal,
            formatting: {
                label: '${path}',
                separator: '',
            },
        }));
    }
};
TerminalMainContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IEmbedderTerminalService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ILabelService),
    __param(4, ILifecycleService),
    __param(5, ITerminalService),
    __param(6, ITerminalEditorService),
    __param(7, ITerminalGroupService),
    __param(8, ITerminalInstanceService)
], TerminalMainContribution);
export { TerminalMainContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNYWluQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbE1haW5Db250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbkYsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixxQkFBcUIsRUFDckIsd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRXZHOzs7O0dBSUc7QUFDSSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7YUFDaEQsT0FBRSxHQUFHLGNBQWMsQUFBakIsQ0FBaUI7SUFFMUIsWUFDeUIscUJBQTZD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