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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNYWluQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsTWFpbkNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVuRixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix3QkFBd0IsR0FDeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFFdkc7Ozs7R0FJRztBQUNJLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTthQUNoRCxPQUFFLEdBQUcsY0FBYyxBQUFqQixD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