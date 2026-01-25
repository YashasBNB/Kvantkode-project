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
import { Schemas } from '../../../base/common/network.js';
import { isWeb } from '../../../base/common/platform.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { IExtensionGalleryService, IExtensionManagementService, } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementCLI } from '../../../platform/extensionManagement/common/extensionManagementCLI.js';
import { getExtensionId } from '../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { AbstractMessageLogger } from '../../../platform/log/common/log.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IExtensionManagementServerService } from '../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionManifestPropertiesService } from '../../services/extensions/common/extensionManifestPropertiesService.js';
// this class contains the commands that the CLI server is reying on
CommandsRegistry.registerCommand('_remoteCLI.openExternal', function (accessor, uri) {
    const openerService = accessor.get(IOpenerService);
    return openerService.open(isString(uri) ? uri : URI.revive(uri), {
        openExternal: true,
        allowTunneling: true,
    });
});
CommandsRegistry.registerCommand('_remoteCLI.windowOpen', function (accessor, toOpen, options) {
    const commandService = accessor.get(ICommandService);
    if (!toOpen.length) {
        return commandService.executeCommand('_files.newWindow', options);
    }
    return commandService.executeCommand('_files.windowOpen', toOpen, options);
});
CommandsRegistry.registerCommand('_remoteCLI.getSystemStatus', function (accessor) {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('_issues.getSystemStatus');
});
CommandsRegistry.registerCommand('_remoteCLI.manageExtensions', async function (accessor, args) {
    const instantiationService = accessor.get(IInstantiationService);
    const extensionManagementServerService = accessor.get(IExtensionManagementServerService);
    const remoteExtensionManagementService = extensionManagementServerService.remoteExtensionManagementServer?.extensionManagementService;
    if (!remoteExtensionManagementService) {
        return;
    }
    const lines = [];
    const logger = new (class extends AbstractMessageLogger {
        log(level, message) {
            lines.push(message);
        }
    })();
    const childInstantiationService = instantiationService.createChild(new ServiceCollection([IExtensionManagementService, remoteExtensionManagementService]));
    try {
        const cliService = childInstantiationService.createInstance(RemoteExtensionManagementCLI, logger);
        if (args.list) {
            await cliService.listExtensions(!!args.list.showVersions, args.list.category, undefined);
        }
        else {
            const revive = (inputs) => inputs.map((input) => (isString(input) ? input : URI.revive(input)));
            if (Array.isArray(args.install) && args.install.length) {
                try {
                    await cliService.installExtensions(revive(args.install), [], { isMachineScoped: true }, !!args.force);
                }
                catch (e) {
                    lines.push(e.message);
                }
            }
            if (Array.isArray(args.uninstall) && args.uninstall.length) {
                try {
                    await cliService.uninstallExtensions(revive(args.uninstall), !!args.force, undefined);
                }
                catch (e) {
                    lines.push(e.message);
                }
            }
        }
        return lines.join('\n');
    }
    finally {
        childInstantiationService.dispose();
    }
});
let RemoteExtensionManagementCLI = class RemoteExtensionManagementCLI extends ExtensionManagementCLI {
    constructor(logger, extensionManagementService, extensionGalleryService, labelService, envService, _extensionManifestPropertiesService) {
        super(logger, extensionManagementService, extensionGalleryService);
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        const remoteAuthority = envService.remoteAuthority;
        this._location = remoteAuthority
            ? labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority)
            : undefined;
    }
    get location() {
        return this._location;
    }
    validateExtensionKind(manifest) {
        if (!this._extensionManifestPropertiesService.canExecuteOnWorkspace(manifest) &&
            // Web extensions installed on remote can be run in web worker extension host
            !(isWeb && this._extensionManifestPropertiesService.canExecuteOnWeb(manifest))) {
            this.logger.info(localize('cannot be installed', "Cannot install the '{0}' extension because it is declared to not run in this setup.", getExtensionId(manifest.publisher, manifest.name)));
            return false;
        }
        return true;
    }
};
RemoteExtensionManagementCLI = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService),
    __param(3, ILabelService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IExtensionManifestPropertiesService)
], RemoteExtensionManagementCLI);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENMSUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENMSUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUMzQixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUV4RyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBcUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFMUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURB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