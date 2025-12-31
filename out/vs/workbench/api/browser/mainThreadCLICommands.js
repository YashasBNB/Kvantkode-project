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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENMSUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDTElDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakcsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FDM0IsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFeEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQXFCLE1BQU0scUNBQXFDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHlEQUF5RCxD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