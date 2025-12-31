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
var NodeModuleAliasingModuleFactory_1;
import * as performance from '../../../base/common/performance.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { nullExtensionDescription } from '../../services/extensions/common/extensions.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
let RequireInterceptor = class RequireInterceptor {
    constructor(_apiFactory, _extensionRegistry, _instaService, _extHostConfiguration, _extHostExtensionService, _initData, _logService) {
        this._apiFactory = _apiFactory;
        this._extensionRegistry = _extensionRegistry;
        this._instaService = _instaService;
        this._extHostConfiguration = _extHostConfiguration;
        this._extHostExtensionService = _extHostExtensionService;
        this._initData = _initData;
        this._logService = _logService;
        this._factories = new Map();
        this._alternatives = [];
    }
    async install() {
        this._installInterceptor();
        performance.mark('code/extHost/willWaitForConfig');
        const configProvider = await this._extHostConfiguration.getConfigProvider();
        performance.mark('code/extHost/didWaitForConfig');
        const extensionPaths = await this._extHostExtensionService.getExtensionPathIndex();
        this.register(new VSCodeNodeModuleFactory(this._apiFactory, extensionPaths, this._extensionRegistry, configProvider, this._logService));
        this.register(this._instaService.createInstance(NodeModuleAliasingModuleFactory));
        if (this._initData.remote.isRemote) {
            this.register(this._instaService.createInstance(OpenNodeModuleFactory, extensionPaths, this._initData.environment.appUriScheme));
        }
    }
    register(interceptor) {
        if ('nodeModuleName' in interceptor) {
            if (Array.isArray(interceptor.nodeModuleName)) {
                for (const moduleName of interceptor.nodeModuleName) {
                    this._factories.set(moduleName, interceptor);
                }
            }
            else {
                this._factories.set(interceptor.nodeModuleName, interceptor);
            }
        }
        if (typeof interceptor.alternativeModuleName === 'function') {
            this._alternatives.push((moduleName) => {
                return interceptor.alternativeModuleName(moduleName);
            });
        }
    }
};
RequireInterceptor = __decorate([
    __param(2, IInstantiationService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostExtensionService),
    __param(5, IExtHostInitDataService),
    __param(6, ILogService)
], RequireInterceptor);
export { RequireInterceptor };
//#region --- module renames
let NodeModuleAliasingModuleFactory = class NodeModuleAliasingModuleFactory {
    static { NodeModuleAliasingModuleFactory_1 = this; }
    /**
     * Map of aliased internal node_modules, used to allow for modules to be
     * renamed without breaking extensions. In the form "original -> new name".
     */
    static { this.aliased = new Map([
        ['vscode-ripgrep', '@vscode/ripgrep'],
        ['vscode-windows-registry', '@vscode/windows-registry'],
    ]); }
    constructor(initData) {
        if (initData.environment.appRoot && NodeModuleAliasingModuleFactory_1.aliased.size) {
            const root = escapeRegExpCharacters(this.forceForwardSlashes(initData.environment.appRoot.fsPath));
            // decompose ${appRoot}/node_modules/foo/bin to ['${appRoot}/node_modules/', 'foo', '/bin'],
            // and likewise the more complex form ${appRoot}/node_modules.asar.unpacked/@vcode/foo/bin
            // to ['${appRoot}/node_modules.asar.unpacked/',' @vscode/foo', '/bin'].
            const npmIdChrs = `[a-z0-9_.-]`;
            const npmModuleName = `@${npmIdChrs}+\\/${npmIdChrs}+|${npmIdChrs}+`;
            const moduleFolders = 'node_modules|node_modules\\.asar(?:\\.unpacked)?';
            this.re = new RegExp(`^(${root}/${moduleFolders}\\/)(${npmModuleName})(.*)$`, 'i');
        }
    }
    alternativeModuleName(name) {
        if (!this.re) {
            return;
        }
        const result = this.re.exec(this.forceForwardSlashes(name));
        if (!result) {
            return;
        }
        const [, prefix, moduleName, suffix] = result;
        const dealiased = NodeModuleAliasingModuleFactory_1.aliased.get(moduleName);
        if (dealiased === undefined) {
            return;
        }
        console.warn(`${moduleName} as been renamed to ${dealiased}, please update your imports`);
        return prefix + dealiased + suffix;
    }
    forceForwardSlashes(str) {
        return str.replace(/\\/g, '/');
    }
};
NodeModuleAliasingModuleFactory = NodeModuleAliasingModuleFactory_1 = __decorate([
    __param(0, IExtHostInitDataService)
], NodeModuleAliasingModuleFactory);
//#endregion
//#region --- vscode-module
class VSCodeNodeModuleFactory {
    constructor(_apiFactory, _extensionPaths, _extensionRegistry, _configProvider, _logService) {
        this._apiFactory = _apiFactory;
        this._extensionPaths = _extensionPaths;
        this._extensionRegistry = _extensionRegistry;
        this._configProvider = _configProvider;
        this._logService = _logService;
        this.nodeModuleName = 'vscode';
        this._extApiImpl = new ExtensionIdentifierMap();
    }
    load(_request, parent) {
        // get extension id from filename and api for extension
        const ext = this._extensionPaths.findSubstr(parent);
        if (ext) {
            let apiImpl = this._extApiImpl.get(ext.identifier);
            if (!apiImpl) {
                apiImpl = this._apiFactory(ext, this._extensionRegistry, this._configProvider);
                this._extApiImpl.set(ext.identifier, apiImpl);
            }
            return apiImpl;
        }
        // fall back to a default implementation
        if (!this._defaultApiImpl) {
            let extensionPathsPretty = '';
            this._extensionPaths.forEach((value, index) => (extensionPathsPretty += `\t${index} -> ${value.identifier.value}\n`));
            this._logService.warn(`Could not identify extension for 'vscode' require call from ${parent}. These are the extension path mappings: \n${extensionPathsPretty}`);
            this._defaultApiImpl = this._apiFactory(nullExtensionDescription, this._extensionRegistry, this._configProvider);
        }
        return this._defaultApiImpl;
    }
}
let OpenNodeModuleFactory = class OpenNodeModuleFactory {
    constructor(_extensionPaths, _appUriScheme, rpcService) {
        this._extensionPaths = _extensionPaths;
        this._appUriScheme = _appUriScheme;
        this.nodeModuleName = ['open', 'opn'];
        this._mainThreadTelemetry = rpcService.getProxy(MainContext.MainThreadTelemetry);
        const mainThreadWindow = rpcService.getProxy(MainContext.MainThreadWindow);
        this._impl = (target, options) => {
            const uri = URI.parse(target);
            // If we have options use the original method.
            if (options) {
                return this.callOriginal(target, options);
            }
            if (uri.scheme === 'http' || uri.scheme === 'https') {
                return mainThreadWindow.$openUri(uri, target, { allowTunneling: true });
            }
            else if (uri.scheme === 'mailto' || uri.scheme === this._appUriScheme) {
                return mainThreadWindow.$openUri(uri, target, {});
            }
            return this.callOriginal(target, options);
        };
    }
    load(request, parent, original) {
        // get extension id from filename and api for extension
        const extension = this._extensionPaths.findSubstr(parent);
        if (extension) {
            this._extensionId = extension.identifier.value;
            this.sendShimmingTelemetry();
        }
        this._original = original(request);
        return this._impl;
    }
    callOriginal(target, options) {
        this.sendNoForwardTelemetry();
        return this._original(target, options);
    }
    sendShimmingTelemetry() {
        if (!this._extensionId) {
            return;
        }
        this._mainThreadTelemetry.$publicLog2('shimming.open', { extension: this._extensionId });
    }
    sendNoForwardTelemetry() {
        if (!this._extensionId) {
            return;
        }
        this._mainThreadTelemetry.$publicLog2('shimming.open.call.noForward', { extension: this._extensionId });
    }
};
OpenNodeModuleFactory = __decorate([
    __param(2, IExtHostRpcService)
], OpenNodeModuleFactory);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFJlcXVpcmVJbnRlcmNlcHRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RSZXF1aXJlSW50ZXJjZXB0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBNEIsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDN0UsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBa0Isd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFlakUsSUFBZSxrQkFBa0IsR0FBakMsTUFBZSxrQkFBa0I7SUFJdkMsWUFDUyxXQUFpQyxFQUNqQyxrQkFBd0MsRUFDUixhQUFvQyxFQUNwQyxxQkFBNEMsRUFDekMsd0JBQWtELEVBQ25ELFNBQWtDLEVBQzlDLFdBQXdCO1FBTjlDLGdCQUFXLEdBQVgs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