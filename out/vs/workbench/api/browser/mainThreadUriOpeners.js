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
import { Action } from '../../../base/common/actions.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { localize } from '../../../nls.js';
import { INotificationService, Severity, } from '../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { defaultExternalUriOpenerId } from '../../contrib/externalUriOpener/common/configuration.js';
import { ContributedExternalUriOpenersStore } from '../../contrib/externalUriOpener/common/contributedOpeners.js';
import { IExternalUriOpenerService, } from '../../contrib/externalUriOpener/common/externalUriOpenerService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadUriOpeners = class MainThreadUriOpeners extends Disposable {
    constructor(context, storageService, externalUriOpenerService, extensionService, openerService, notificationService) {
        super();
        this.extensionService = extensionService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this._registeredOpeners = new Map();
        this.proxy = context.getProxy(ExtHostContext.ExtHostUriOpeners);
        this._register(externalUriOpenerService.registerExternalOpenerProvider(this));
        this._contributedExternalUriOpenersStore = this._register(new ContributedExternalUriOpenersStore(storageService, extensionService));
    }
    async *getOpeners(targetUri) {
        // Currently we only allow openers for http and https urls
        if (targetUri.scheme !== Schemas.http && targetUri.scheme !== Schemas.https) {
            return;
        }
        await this.extensionService.activateByEvent(`onOpenExternalUri:${targetUri.scheme}`);
        for (const [id, openerMetadata] of this._registeredOpeners) {
            if (openerMetadata.schemes.has(targetUri.scheme)) {
                yield this.createOpener(id, openerMetadata);
            }
        }
    }
    createOpener(id, metadata) {
        return {
            id: id,
            label: metadata.label,
            canOpen: (uri, token) => {
                return this.proxy.$canOpenUri(id, uri, token);
            },
            openExternalUri: async (uri, ctx, token) => {
                try {
                    await this.proxy.$openUri(id, { resolvedUri: uri, sourceUri: ctx.sourceUri }, token);
                }
                catch (e) {
                    if (!isCancellationError(e)) {
                        const openDefaultAction = new Action('default', localize('openerFailedUseDefault', 'Open using default opener'), undefined, undefined, async () => {
                            await this.openerService.open(uri, {
                                allowTunneling: false,
                                allowContributedOpeners: defaultExternalUriOpenerId,
                            });
                        });
                        openDefaultAction.tooltip = uri.toString();
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: localize({
                                key: 'openerFailedMessage',
                                comment: ['{0} is the id of the opener. {1} is the url being opened.'],
                            }, "Could not open uri with '{0}': {1}", id, e.toString()),
                            actions: {
                                primary: [openDefaultAction],
                            },
                        });
                    }
                }
                return true;
            },
        };
    }
    async $registerUriOpener(id, schemes, extensionId, label) {
        if (this._registeredOpeners.has(id)) {
            throw new Error(`Opener with id '${id}' already registered`);
        }
        this._registeredOpeners.set(id, {
            schemes: new Set(schemes),
            label,
            extensionId,
        });
        this._contributedExternalUriOpenersStore.didRegisterOpener(id, extensionId.value);
    }
    async $unregisterUriOpener(id) {
        this._registeredOpeners.delete(id);
        this._contributedExternalUriOpenersStore.delete(id);
    }
    dispose() {
        super.dispose();
        this._registeredOpeners.clear();
    }
};
MainThreadUriOpeners = __decorate([
    extHostNamedCustomer(MainContext.MainThreadUriOpeners),
    __param(1, IStorageService),
    __param(2, IExternalUriOpenerService),
    __param(3, IExtensionService),
    __param(4, IOpenerService),
    __param(5, INotificationService)
], MainThreadUriOpeners);
export { MainThreadUriOpeners };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFVyaU9wZW5lcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFVyaU9wZW5lcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2pILE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFTdEQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFDWixTQUFRLFVBQVU7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