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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1Zpc3VhbGl6ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBMkIsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsc0JBQXNCLEdBUXRCLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFOUYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQ25DLGVBQWUsQ0FBMEIsd0JBQXdCLENBQUMsQ0FBQTtBQXdCbkUsTUFBTSxPQUFPLGVBQWU7SUFDM0IsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FB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