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
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CONTEXT_VARIABLE_NAME, CONTEXT_VARIABLE_TYPE, CONTEXT_VARIABLE_VALUE, } from './debug.js';
import { getContextForVariable } from './debugContext.js';
import { Scope, Variable, VisualizedExpression } from './debugModel.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export const IDebugVisualizerService = createDecorator('debugVisualizerService');
export class DebugVisualizer {
    get name() {
        return this.viz.name;
    }
    get iconPath() {
        return this.viz.iconPath;
    }
    get iconClass() {
        return this.viz.iconClass;
    }
    constructor(handle, viz) {
        this.handle = handle;
        this.viz = viz;
    }
    async resolve(token) {
        return (this.viz.visualization ??= await this.handle.resolveDebugVisualizer(this.viz, token));
    }
    async execute() {
        await this.handle.executeDebugVisualizerCommand(this.viz.id);
    }
}
const emptyRef = { object: [], dispose: () => { } };
let DebugVisualizerService = class DebugVisualizerService {
    constructor(contextKeyService, extensionService, logService) {
        this.contextKeyService = contextKeyService;
        this.extensionService = extensionService;
        this.logService = logService;
        this.handles = new Map();
        this.trees = new Map();
        this.didActivate = new Map();
        this.registrations = [];
        visualizersExtensionPoint.setHandler((_, { added, removed }) => {
            this.registrations = this.registrations.filter((r) => !removed.some((e) => ExtensionIdentifier.equals(e.description.identifier, r.extensionId)));
            added.forEach((e) => this.processExtensionRegistration(e.description));
        });
    }
    /** @inheritdoc */
    async getApplicableFor(variable, token) {
        if (!(variable instanceof Variable)) {
            return emptyRef;
        }
        const threadId = variable.getThreadId();
        if (threadId === undefined) {
            // an expression, not a variable
            return emptyRef;
        }
        const context = this.getVariableContext(threadId, variable);
        const overlay = getContextForVariable(this.contextKeyService, variable, [
            [CONTEXT_VARIABLE_NAME.key, variable.name],
            [CONTEXT_VARIABLE_VALUE.key, variable.value],
            [CONTEXT_VARIABLE_TYPE.key, variable.type],
        ]);
        const maybeVisualizers = await Promise.all(this.registrations.map(async (registration) => {
            if (!overlay.contextMatchesRules(registration.expr)) {
                return;
            }
            let prom = this.didActivate.get(registration.id);
            if (!prom) {
                prom = this.extensionService.activateByEvent(`onDebugVisualizer:${registration.id}`);
                this.didActivate.set(registration.id, prom);
            }
            await prom;
            if (token.isCancellationRequested) {
                return;
            }
            const handle = this.handles.get(toKey(registration.extensionId, registration.id));
            return handle && { handle, result: await handle.provideDebugVisualizers(context, token) };
        }));
        const ref = {
            object: maybeVisualizers
                .filter(isDefined)
                .flatMap((v) => v.result.map((r) => new DebugVisualizer(v.handle, r))),
            dispose: () => {
                for (const viz of maybeVisualizers) {
                    viz?.handle.disposeDebugVisualizers(viz.result.map((r) => r.id));
                }
            },
        };
        if (token.isCancellationRequested) {
            ref.dispose();
        }
        return ref;
    }
    /** @inheritdoc */
    register(handle) {
        const key = toKey(handle.extensionId, handle.id);
        this.handles.set(key, handle);
        return toDisposable(() => this.handles.delete(key));
    }
    /** @inheritdoc */
    registerTree(treeId, handle) {
        this.trees.set(treeId, handle);
        return toDisposable(() => this.trees.delete(treeId));
    }
    /** @inheritdoc */
    async getVisualizedNodeFor(treeId, expr) {
        if (!(expr instanceof Variable)) {
            return;
        }
        const threadId = expr.getThreadId();
        if (threadId === undefined) {
            return;
        }
        const tree = this.trees.get(treeId);
        if (!tree) {
            return;
        }
        try {
            const treeItem = await tree.getTreeItem(this.getVariableContext(threadId, expr));
            if (!treeItem) {
                return;
            }
            return new VisualizedExpression(expr.getSession(), this, treeId, treeItem, expr);
        }
        catch (e) {
            this.logService.warn('Failed to get visualized node', e);
            return;
        }
    }
    /** @inheritdoc */
    async getVisualizedChildren(session, treeId, treeElementId) {
        const node = this.trees.get(treeId);
        const children = (await node?.getChildren(treeElementId)) || [];
        return children.map((c) => new VisualizedExpression(session, this, treeId, c, undefined));
    }
    /** @inheritdoc */
    async editTreeItem(treeId, treeItem, newValue) {
        const newItem = await this.trees.get(treeId)?.editItem?.(treeItem.id, newValue);
        if (newItem) {
            Object.assign(treeItem, newItem); // replace in-place so rerenders work
        }
    }
    getVariableContext(threadId, variable) {
        const context = {
            sessionId: variable.getSession()?.getId() || '',
            containerId: variable.parent instanceof Variable ? variable.reference : undefined,
            threadId,
            variable: {
                name: variable.name,
                value: variable.value,
                type: variable.type,
                evaluateName: variable.evaluateName,
                variablesReference: variable.reference || 0,
                indexedVariables: variable.indexedVariables,
                memoryReference: variable.memoryReference,
                namedVariables: variable.namedVariables,
                presentationHint: variable.presentationHint,
            },
        };
        for (let p = variable; p instanceof Variable; p = p.parent) {
            if (p.parent instanceof Scope) {
                context.frameId = p.parent.stackFrame.frameId;
            }
        }
        return context;
    }
    processExtensionRegistration(ext) {
        const viz = ext.contributes?.debugVisualizers;
        if (!(viz instanceof Array)) {
            return;
        }
        for (const { when, id } of viz) {
            try {
                const expr = ContextKeyExpr.deserialize(when);
                if (expr) {
                    this.registrations.push({ expr, id, extensionId: ext.identifier });
                }
            }
            catch (e) {
                this.logService.error(`Error processing debug visualizer registration from extension '${ext.identifier.value}'`, e);
            }
        }
    }
};
DebugVisualizerService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IExtensionService),
    __param(2, ILogService)
], DebugVisualizerService);
export { DebugVisualizerService };
const toKey = (extensionId, id) => `${ExtensionIdentifier.toKey(extensionId)}\0${id}`;
const visualizersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debugVisualizers',
    jsonSchema: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Name of the debug visualizer',
                },
                when: {
                    type: 'string',
                    description: 'Condition when the debug visualizer is applicable',
                },
            },
            required: ['id', 'when'],
        },
    },
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(`onDebugVisualizer:${contrib.id}`);
            }
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnVmlzdWFsaXplcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUEyQixZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixzQkFBc0IsR0FRdEIsTUFBTSxZQUFZLENBQUE7QUFDbkIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUU5RixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FDbkMsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFBO0FBd0JuRSxNQUFNLE9BQU8sZUFBZTtJQUMzQixJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUE7SUFDMUIsQ0FBQztJQUVELFlBQ2tCLE1BQXdCLEVBQ3hCLEdBQXdCO1FBRHhCLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQ3hCLFFBQUcsR0FBSCxHQUFHLENBQXFCO0lBQ3ZDLENBQUM7SUFFRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQXdCO1FBQzVDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsS0FBSyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUFFTSxLQUFLLENBQUMsT0FBTztRQUNuQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0NBQ0Q7QUEyQ0QsTUFBTSxRQUFRLEdBQWtDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUFFLENBQUE7QUFFMUUsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7SUFZbEMsWUFDcUIsaUJBQXNELEVBQ3ZELGdCQUFvRCxFQUMxRCxVQUF3QztRQUZoQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3RDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDekMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVpyQyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXFELENBQUE7UUFDdEUsVUFBSyxHQUFHLElBQUksR0FBRyxFQUEwRCxDQUFBO1FBQ3pFLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUE7UUFDdkQsa0JBQWEsR0FJZixFQUFFLENBQUE7UUFPUCx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtZQUM5RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUM3QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQzFGLENBQUE7WUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsa0JBQWtCO0lBQ1gsS0FBSyxDQUFDLGdCQUFnQixDQUM1QixRQUFxQixFQUNyQixLQUF3QjtRQUV4QixJQUFJLENBQUMsQ0FBQyxRQUFRLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3ZDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLGdDQUFnQztZQUNoQyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMzRCxNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxFQUFFO1lBQ3ZFLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDMUMsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUM1QyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQzFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEVBQUU7WUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDckQsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDaEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLHFCQUFxQixZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDcEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQsTUFBTSxJQUFJLENBQUE7WUFDVixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNuQyxPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLE9BQU8sTUFBTSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQTtRQUMxRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxHQUFHLEdBQUc7WUFDWCxNQUFNLEVBQUUsZ0JBQWdCO2lCQUN0QixNQUFNLENBQUMsU0FBUyxDQUFDO2lCQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3BDLEdBQUcsRUFBRSxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNqRSxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFFRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxRQUFRLENBQUMsTUFBd0I7UUFDdkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM3QixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxrQkFBa0I7SUFDWCxZQUFZLENBQUMsTUFBYyxFQUFFLE1BQTRCO1FBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxrQkFBa0I7SUFDWCxLQUFLLENBQUMsb0JBQW9CLENBQ2hDLE1BQWMsRUFDZCxJQUFpQjtRQUVqQixJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNoRixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTTtZQUNQLENBQUM7WUFFRCxPQUFPLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEQsT0FBTTtRQUNQLENBQUM7SUFDRixDQUFDO0lBRUQsa0JBQWtCO0lBQ1gsS0FBSyxDQUFDLHFCQUFxQixDQUNqQyxPQUFrQyxFQUNsQyxNQUFjLEVBQ2QsYUFBcUI7UUFFckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLElBQUksRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDL0QsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxLQUFLLENBQUMsWUFBWSxDQUN4QixNQUFjLEVBQ2QsUUFBcUMsRUFDckMsUUFBZ0I7UUFFaEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQy9FLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQSxDQUFDLHFDQUFxQztRQUN2RSxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFFBQWdCLEVBQUUsUUFBa0I7UUFDOUQsTUFBTSxPQUFPLEdBQStCO1lBQzNDLFNBQVMsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUMvQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDakYsUUFBUTtZQUNSLFFBQVEsRUFBRTtnQkFDVCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7Z0JBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDckIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUNuQixZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7Z0JBQ25DLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxTQUFTLElBQUksQ0FBQztnQkFDM0MsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtnQkFDM0MsZUFBZSxFQUFFLFFBQVEsQ0FBQyxlQUFlO2dCQUN6QyxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWM7Z0JBQ3ZDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxnQkFBZ0I7YUFDM0M7U0FDRCxDQUFBO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBeUIsUUFBUSxFQUFFLENBQUMsWUFBWSxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsRixJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksS0FBSyxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sNEJBQTRCLENBQUMsR0FBMEI7UUFDOUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQTtRQUM3QyxJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFNO1FBQ1AsQ0FBQztRQUVELEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDN0MsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLGtFQUFrRSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxFQUN6RixDQUFDLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExTVksc0JBQXNCO0lBYWhDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFdBQVcsQ0FBQTtHQWZELHNCQUFzQixDQTBNbEM7O0FBRUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxXQUFnQyxFQUFFLEVBQVUsRUFBRSxFQUFFLENBQzlELEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFBO0FBRW5ELE1BQU0seUJBQXlCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBRXpFO0lBQ0QsY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyxVQUFVLEVBQUU7UUFDWCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLEVBQUUsRUFBRTtvQkFDSCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsOEJBQThCO2lCQUMzQztnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLG1EQUFtRDtpQkFDaEU7YUFDRDtZQUNELFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7U0FDeEI7S0FDRDtJQUNELHlCQUF5QixFQUFFLENBQUMsUUFBUSxFQUFFLE1BQW9DLEVBQUUsRUFBRTtRQUM3RSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUEifQ==