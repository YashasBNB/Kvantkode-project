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
var MainThreadOutputService_1;
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions, IOutputService, OUTPUT_VIEW_ID, OutputChannelUpdateMode, } from '../../services/output/common/output.js';
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Event } from '../../../base/common/event.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { isNumber } from '../../../base/common/types.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStatusbarService, } from '../../services/statusbar/browser/statusbar.js';
import { localize } from '../../../nls.js';
let MainThreadOutputService = class MainThreadOutputService extends Disposable {
    static { MainThreadOutputService_1 = this; }
    static { this._extensionIdPool = new Map(); }
    constructor(extHostContext, outputService, viewsService, configurationService, statusbarService) {
        super();
        this._outputStatusItem = this._register(new MutableDisposable());
        this._outputService = outputService;
        this._viewsService = viewsService;
        this._configurationService = configurationService;
        this._statusbarService = statusbarService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostOutputService);
        const setVisibleChannel = () => {
            const visibleChannel = this._viewsService.isViewVisible(OUTPUT_VIEW_ID)
                ? this._outputService.getActiveChannel()
                : undefined;
            this._proxy.$setVisibleChannel(visibleChannel ? visibleChannel.id : null);
            this._outputStatusItem.value = undefined;
        };
        this._register(Event.any(this._outputService.onActiveOutputChannel, Event.filter(this._viewsService.onDidChangeViewVisibility, ({ id }) => id === OUTPUT_VIEW_ID))(() => setVisibleChannel()));
        setVisibleChannel();
    }
    async $register(label, file, languageId, extensionId) {
        const idCounter = (MainThreadOutputService_1._extensionIdPool.get(extensionId) || 0) + 1;
        MainThreadOutputService_1._extensionIdPool.set(extensionId, idCounter);
        const id = `extension-output-${extensionId}-#${idCounter}-${label}`;
        const resource = URI.revive(file);
        Registry.as(Extensions.OutputChannels).registerChannel({
            id,
            label,
            source: { resource },
            log: false,
            languageId,
            extensionId,
        });
        this._register(toDisposable(() => this.$dispose(id)));
        return id;
    }
    async $update(channelId, mode, till) {
        const channel = this._getChannel(channelId);
        if (channel) {
            if (mode === OutputChannelUpdateMode.Append) {
                channel.update(mode);
            }
            else if (isNumber(till)) {
                channel.update(mode, till);
            }
        }
    }
    async $reveal(channelId, preserveFocus) {
        const channel = this._getChannel(channelId);
        if (!channel) {
            return;
        }
        const viewsToShowQuietly = this._configurationService.getValue('workbench.view.showQuietly') ?? {};
        if (!this._viewsService.isViewVisible(OUTPUT_VIEW_ID) && viewsToShowQuietly[OUTPUT_VIEW_ID]) {
            this._showChannelQuietly(channel);
            return;
        }
        this._outputService.showChannel(channel.id, preserveFocus);
    }
    // Show status bar indicator
    _showChannelQuietly(channel) {
        const statusProperties = {
            name: localize('status.showOutput', 'Show Output'),
            text: '$(output)',
            ariaLabel: localize('status.showOutputAria', 'Show {0} Output Channel', channel.label),
            command: `workbench.action.output.show.${channel.id}`,
            tooltip: localize('status.showOutputTooltip', 'Show {0} Output Channel', channel.label),
            kind: 'prominent',
        };
        if (!this._outputStatusItem.value) {
            this._outputStatusItem.value = this._statusbarService.addEntry(statusProperties, 'status.view.showQuietly', 1 /* StatusbarAlignment.RIGHT */, {
                location: { id: 'status.notifications', priority: Number.NEGATIVE_INFINITY },
                alignment: 0 /* StatusbarAlignment.LEFT */,
            });
        }
        else {
            this._outputStatusItem.value.update(statusProperties);
        }
    }
    async $close(channelId) {
        if (this._viewsService.isViewVisible(OUTPUT_VIEW_ID)) {
            const activeChannel = this._outputService.getActiveChannel();
            if (activeChannel && channelId === activeChannel.id) {
                this._viewsService.closeView(OUTPUT_VIEW_ID);
            }
        }
    }
    async $dispose(channelId) {
        const channel = this._getChannel(channelId);
        channel?.dispose();
    }
    _getChannel(channelId) {
        return this._outputService.getChannel(channelId);
    }
};
MainThreadOutputService = MainThreadOutputService_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadOutputService),
    __param(1, IOutputService),
    __param(2, IViewsService),
    __param(3, IConfigurationService),
    __param(4, IStatusbarService)
], MainThreadOutputService);
export { MainThreadOutputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE91dHB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE91dHB1dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sVUFBVSxFQUVWLGNBQWMsRUFFZCxjQUFjLEVBQ2QsdUJBQXVCLEdBQ3ZCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUVOLFdBQVcsRUFFWCxjQUFjLEdBQ2QsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFpQixHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFHTixpQkFBaUIsR0FFakIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHbkMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVOzthQUN2QyxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQUFBNUIs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