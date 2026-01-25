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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE91dHB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkT3V0cHV0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixVQUFVLEVBRVYsY0FBYyxFQUVkLGNBQWMsRUFDZCx1QkFBdUIsR0FDdkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBRU4sV0FBVyxFQUVYLGNBQWMsR0FDZCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQWlCLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUdOLGlCQUFpQixHQUVqQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUduQyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O2FBQ3ZDLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFrQixB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