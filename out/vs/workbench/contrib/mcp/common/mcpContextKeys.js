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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29udGV4dEtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcENvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRWxHLE9BQU8sRUFFTixXQUFXLEdBR1gsTUFBTSxlQUFlLENBQUE7QUFFdEIsTUFBTSxLQUFXLGNBQWMsQ0F3QzlCO0FBeENELFdBQWlCLGNBQWM7SUFDakIsMEJBQVcsR0FBRyxJQUFJLGFBQWEsQ0FBUyxpQkFBaUIsRUFBRSxTQUFTLEVBQUU7UUFDbEYsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsUUFBUSxDQUNwQiw2QkFBNkIsRUFDN0IsMkRBQTJELENBQzNEO0tBQ0QsQ0FBQyxDQUFBO0lBQ1csOEJBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxTQUFTLEVBQUU7UUFDM0YsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixpQ0FBaUMsRUFDakMsNkRBQTZELENBQzdEO0tBQ0QsQ0FBQyxDQUFBO0lBQ0Y7Ozs7OztPQU1HO0lBQ1UsbUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQ3BELDBCQUEwQixFQUMxQixTQUFTLEVBQ1Q7UUFDQyxJQUFJLEVBQUUsU0FBUztR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