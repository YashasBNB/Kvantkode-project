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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TimelinePaneId, } from './timeline.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
export const TimelineHasProviderContext = new RawContextKey('timelineHasProvider', false);
let TimelineService = class TimelineService extends Disposable {
    constructor(logService, viewsService, configurationService, contextKeyService) {
        super();
        this.logService = logService;
        this.viewsService = viewsService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this._onDidChangeProviders = this._register(new Emitter());
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._onDidChangeTimeline = this._register(new Emitter());
        this.onDidChangeTimeline = this._onDidChangeTimeline.event;
        this._onDidChangeUri = this._register(new Emitter());
        this.onDidChangeUri = this._onDidChangeUri.event;
        this.providers = new Map();
        this.providerSubscriptions = this._register(new DisposableMap());
        this.hasProviderContext = TimelineHasProviderContext.bindTo(this.contextKeyService);
        this.updateHasProviderContext();
    }
    getSources() {
        return [...this.providers.values()].map((p) => ({ id: p.id, label: p.label }));
    }
    getTimeline(id, uri, options, tokenSource) {
        this.logService.trace(`TimelineService#getTimeline(${id}): uri=${uri.toString()}`);
        const provider = this.providers.get(id);
        if (provider === undefined) {
            return undefined;
        }
        if (typeof provider.scheme === 'string') {
            if (provider.scheme !== '*' && provider.scheme !== uri.scheme) {
                return undefined;
            }
        }
        else if (!provider.scheme.includes(uri.scheme)) {
            return undefined;
        }
        return {
            result: provider.provideTimeline(uri, options, tokenSource.token).then((result) => {
                if (result === undefined) {
                    return undefined;
                }
                result.items = result.items.map((item) => ({ ...item, source: provider.id }));
                result.items.sort((a, b) => b.timestamp - a.timestamp ||
                    b.source.localeCompare(a.source, undefined, { numeric: true, sensitivity: 'base' }));
                return result;
            }),
            options,
            source: provider.id,
            tokenSource,
            uri,
        };
    }
    registerTimelineProvider(provider) {
        this.logService.trace(`TimelineService#registerTimelineProvider: id=${provider.id}`);
        const id = provider.id;
        const existing = this.providers.get(id);
        if (existing) {
            // For now to deal with https://github.com/microsoft/vscode/issues/89553 allow any overwritting here (still will be blocked in the Extension Host)
            // TODO@eamodio: Ultimately will need to figure out a way to unregister providers when the Extension Host restarts/crashes
            // throw new Error(`Timeline Provider ${id} already exists.`);
            try {
                existing?.dispose();
            }
            catch { }
        }
        this.providers.set(id, provider);
        this.updateHasProviderContext();
        if (provider.onDidChange) {
            this.providerSubscriptions.set(id, provider.onDidChange((e) => this._onDidChangeTimeline.fire(e)));
        }
        this._onDidChangeProviders.fire({ added: [id] });
        return {
            dispose: () => {
                this.providers.delete(id);
                this._onDidChangeProviders.fire({ removed: [id] });
            },
        };
    }
    unregisterTimelineProvider(id) {
        this.logService.trace(`TimelineService#unregisterTimelineProvider: id=${id}`);
        if (!this.providers.has(id)) {
            return;
        }
        this.providers.delete(id);
        this.providerSubscriptions.deleteAndDispose(id);
        this.updateHasProviderContext();
        this._onDidChangeProviders.fire({ removed: [id] });
    }
    setUri(uri) {
        this.viewsService.openView(TimelinePaneId, true);
        this._onDidChangeUri.fire(uri);
    }
    updateHasProviderContext() {
        this.hasProviderContext.set(this.providers.size !== 0);
    }
};
TimelineService = __decorate([
    __param(0, ILogService),
    __param(1, IViewsService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService)
], TimelineService);
export { TimelineService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvY29tbW9uL3RpbWVsaW5lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQU1OLGNBQWMsR0FDZCxNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUUzRixJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUFrQjlDLFlBQ2MsVUFBd0MsRUFDdEMsWUFBcUMsRUFDN0Isb0JBQXFELEVBQ3hELGlCQUErQztRQUVuRSxLQUFLLEVBQUUsQ0FBQTtRQUx1QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQzVCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQW5CbkQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEQsSUFBSSxP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