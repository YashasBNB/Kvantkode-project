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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
const providerScheme = 'mcp-install';
let McpUrlHandler = class McpUrlHandler extends Disposable {
    static { this.scheme = providerScheme; }
    constructor(urlService, _instaService, _fileService) {
        super();
        this._instaService = _instaService;
        this._fileService = _fileService;
        this._fileSystemProvider = new Lazy(() => {
            return this._instaService.invokeFunction((accessor) => {
                const fileService = accessor.get(IFileService);
                const filesystem = new InMemoryFileSystemProvider();
                this._register(fileService.registerProvider(providerScheme, filesystem));
                return providerScheme;
            });
        });
        this._register(urlService.registerHandler(this));
    }
    async handleURL(uri, options) {
        if (uri.path !== 'mcp/install') {
            return false;
        }
        let parsed;
        try {
            parsed = JSON.parse(decodeURIComponent(uri.query));
        }
        catch (e) {
            return false;
        }
        const { name, ...rest } = parsed;
        const scheme = this._fileSystemProvider.value;
        const fileUri = URI.from({ scheme, path: `/${encodeURIComponent(name)}.json` });
        await this._fileService.writeFile(fileUri, VSBuffer.fromString(JSON.stringify(rest, null, '\t')));
        const addConfigHelper = this._instaService.createInstance(McpAddConfigurationCommand, undefined);
        addConfigHelper.pickForUrlHandler(fileUri, true);
        return Promise.resolve(true);
    }
};
McpUrlHandler = __decorate([
    __param(0, IURLService),
    __param(1, IInstantiationService),
    __param(2, IFileService)
], McpUrlHandler);
export { McpUrlHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVXJsSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFVybEhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQWdDLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWxHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdFLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQTtBQUU3QixJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFjLFNBQVEsVUFBVTthQUNyQixXQUFNLEdBQUcsY0FBYyxBQUFqQixDQUFpQjtJQVc5QyxZQUNjLFVBQXVCLEVBQ2IsYUFBcUQsRUFDOUQsWUFBMkM7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFIaUMsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQzdDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBWnpDLHdCQUFtQixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNwRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksMEJBQTBCLEVBQUUsQ0FBQTtnQkFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hFLE9BQU8sY0FBYyxDQUFBO1lBQ3RCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFRRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFRLEVBQUUsT0FBeUI7UUFDbEQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksTUFBaUQsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUE7UUFFaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUM3QyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQ2hDLE9BQU8sRUFDUCxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDaEcsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQzs7QUEvQ1csYUFBYTtJQWF2QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxZQUFZLENBQUE7R0FmRixhQUFhLENBZ0R6QiJ9