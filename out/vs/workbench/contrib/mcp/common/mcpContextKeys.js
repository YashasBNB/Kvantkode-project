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
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IMcpService, } from './mcpTypes.js';
export var McpContextKeys;
(function (McpContextKeys) {
    McpContextKeys.serverCount = new RawContextKey('mcp.serverCount', undefined, {
        type: 'number',
        description: localize('mcp.serverCount.description', 'Context key that has the number of registered MCP servers'),
    });
    McpContextKeys.hasUnknownTools = new RawContextKey('mcp.hasUnknownTools', undefined, {
        type: 'boolean',
        description: localize('mcp.hasUnknownTools.description', 'Indicates whether there are MCP servers with unknown tools.'),
    });
    /**
     * A context key that indicates whether there are any servers with errors.
     *
     * @type {boolean}
     * @default undefined
     * @description This key is used to track the presence of servers with errors in the MCP context.
     */
    McpContextKeys.hasServersWithErrors = new RawContextKey('mcp.hasServersWithErrors', undefined, {
        type: 'boolean',
        description: localize('mcp.hasServersWithErrors.description', 'Indicates whether there are any MCP servers with errors.'),
    });
    McpContextKeys.toolsCount = new RawContextKey('mcp.toolsCount', undefined, {
        type: 'number',
        description: localize('mcp.toolsCount.description', 'Context key that has the number of registered MCP tools'),
    });
})(McpContextKeys || (McpContextKeys = {}));
let McpContextKeysController = class McpContextKeysController extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.contextKey'; }
    constructor(mcpService, contextKeyService) {
        super();
        const ctxServerCount = McpContextKeys.serverCount.bindTo(contextKeyService);
        const ctxToolsCount = McpContextKeys.toolsCount.bindTo(contextKeyService);
        const ctxHasUnknownTools = McpContextKeys.hasUnknownTools.bindTo(contextKeyService);
        this._store.add(bindContextKey(McpContextKeys.hasServersWithErrors, contextKeyService, (r) => mcpService.servers
            .read(r)
            .some((c) => c.connectionState.read(r).state === 3 /* McpConnectionState.Kind.Error */)));
        this._store.add(autorun((r) => {
            const servers = mcpService.servers.read(r);
            const serverTools = servers.map((s) => s.tools.read(r));
            ctxServerCount.set(servers.length);
            ctxToolsCount.set(serverTools.reduce((count, tools) => count + tools.length, 0));
            ctxHasUnknownTools.set(mcpService.lazyCollectionState.read(r) !== 2 /* LazyCollectionState.AllKnown */ ||
                servers.some((s) => {
                    if (s.trusted.read(r) === false) {
                        return false;
                    }
                    const toolState = s.toolsState.read(r);
                    return (toolState === 0 /* McpServerToolsState.Unknown */ ||
                        toolState === 2 /* McpServerToolsState.RefreshingFromUnknown */);
                }));
        }));
    }
};
McpContextKeysController = __decorate([
    __param(0, IMcpService),
    __param(1, IContextKeyService)
], McpContextKeysController);
export { McpContextKeysController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29udGV4dEtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29udGV4dEtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFFbEcsT0FBTyxFQUVOLFdBQVcsR0FHWCxNQUFNLGVBQWUsQ0FBQTtBQUV0QixNQUFNLEtBQVcsY0FBYyxDQXdDOUI7QUF4Q0QsV0FBaUIsY0FBYztJQUNqQiwwQkFBVyxHQUFHLElBQUksYUFBYSxDQUFTLGlCQUFpQixFQUFFLFNBQVMsRUFBRTtRQUNsRixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDZCQUE2QixFQUM3QiwyREFBMkQsQ0FDM0Q7S0FDRCxDQUFDLENBQUE7SUFDVyw4QkFBZSxHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLFNBQVMsRUFBRTtRQUMzRixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGlDQUFpQyxFQUNqQyw2REFBNkQsQ0FDN0Q7S0FDRCxDQUFDLENBQUE7SUFDRjs7Ozs7O09BTUc7SUFDVSxtQ0FBb0IsR0FBRyxJQUFJLGFBQWEsQ0FDcEQsMEJBQTBCLEVBQzFCLFNBQVMsRUFD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