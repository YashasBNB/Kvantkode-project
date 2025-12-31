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
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SetLogLevelAction } from './logsActions.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IOutputService, Extensions, isMultiSourceOutputChannelDescriptor, isSingleSourceOutputChannelDescriptor, } from '../../../services/output/common/output.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CONTEXT_LOG_LEVEL, ILoggerService, LogLevelToString, isLogLevel, } from '../../../../platform/log/common/log.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import { windowLogId, showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { IDefaultLogLevelsService } from './defaultLogLevels.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { CounterSet } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Schemas } from '../../../../base/common/network.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SetLogLevelAction.ID,
            title: SetLogLevelAction.TITLE,
            category: Categories.Developer,
            f1: true,
        });
    }
    run(servicesAccessor) {
        return servicesAccessor
            .get(IInstantiationService)
            .createInstance(SetLogLevelAction, SetLogLevelAction.ID, SetLogLevelAction.TITLE.value)
            .run();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.setDefaultLogLevel',
            title: nls.localize2('setDefaultLogLevel', 'Set Default Log Level'),
            category: Categories.Developer,
        });
    }
    run(servicesAccessor, logLevel, extensionId) {
        return servicesAccessor
            .get(IDefaultLogLevelsService)
            .setDefaultLogLevel(logLevel, extensionId);
    }
});
let LogOutputChannels = class LogOutputChannels extends Disposable {
    constructor(loggerService, contextKeyService, uriIdentityService) {
        super();
        this.loggerService = loggerService;
        this.contextKeyService = contextKeyService;
        this.uriIdentityService = uriIdentityService;
        this.contextKeys = new CounterSet();
        this.outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        const contextKey = CONTEXT_LOG_LEVEL.bindTo(contextKeyService);
        contextKey.set(LogLevelToString(loggerService.getLogLevel()));
        this._register(loggerService.onDidChangeLogLevel((e) => {
            if (isLogLevel(e)) {
                contextKey.set(LogLevelToString(loggerService.getLogLevel()));
            }
        }));
        this.onDidAddLoggers(loggerService.getRegisteredLoggers());
        this._register(loggerService.onDidChangeLoggers(({ added, removed }) => {
            this.onDidAddLoggers(added);
            this.onDidRemoveLoggers(removed);
        }));
        this._register(loggerService.onDidChangeVisibility(([resource, visibility]) => {
            const logger = loggerService.getRegisteredLogger(resource);
            if (logger) {
                if (visibility) {
                    this.registerLogChannel(logger);
                }
                else {
                    this.deregisterLogChannel(logger);
                }
            }
        }));
        this.registerShowWindowLogAction();
        this._register(Event.filter(contextKeyService.onDidChangeContext, (e) => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
    }
    onDidAddLoggers(loggers) {
        for (const logger of loggers) {
            if (logger.when) {
                const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
                if (contextKeyExpr) {
                    for (const key of contextKeyExpr.keys()) {
                        this.contextKeys.add(key);
                    }
                    if (!this.contextKeyService.contextMatchesRules(contextKeyExpr)) {
                        continue;
                    }
                }
            }
            if (logger.hidden) {
                continue;
            }
            this.registerLogChannel(logger);
        }
    }
    onDidChangeContext() {
        for (const logger of this.loggerService.getRegisteredLoggers()) {
            if (logger.when) {
                if (this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(logger.when))) {
                    this.registerLogChannel(logger);
                }
                else {
                    this.deregisterLogChannel(logger);
                }
            }
        }
    }
    onDidRemoveLoggers(loggers) {
        for (const logger of loggers) {
            if (logger.when) {
                const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
                if (contextKeyExpr) {
                    for (const key of contextKeyExpr.keys()) {
                        this.contextKeys.delete(key);
                    }
                }
            }
            this.deregisterLogChannel(logger);
        }
    }
    registerLogChannel(logger) {
        if (logger.group) {
            this.registerCompoundLogChannel(logger.group.id, logger.group.name, logger);
            return;
        }
        const channel = this.outputChannelRegistry.getChannel(logger.id);
        if (channel &&
            isSingleSourceOutputChannelDescriptor(channel) &&
            this.uriIdentityService.extUri.isEqual(channel.source.resource, logger.resource)) {
            return;
        }
        const existingChannel = this.outputChannelRegistry.getChannel(logger.id);
        const remoteLogger = existingChannel &&
            isSingleSourceOutputChannelDescriptor(existingChannel) &&
            existingChannel.source.resource.scheme === Schemas.vscodeRemote
            ? this.loggerService.getRegisteredLogger(existingChannel.source.resource)
            : undefined;
        if (remoteLogger) {
            this.deregisterLogChannel(remoteLogger);
        }
        const hasToAppendRemote = existingChannel && logger.resource.scheme === Schemas.vscodeRemote;
        const id = hasToAppendRemote ? `${logger.id}.remote` : logger.id;
        const label = hasToAppendRemote
            ? nls.localize('remote name', '{0} (Remote)', logger.name ?? logger.id)
            : (logger.name ?? logger.id);
        this.outputChannelRegistry.registerChannel({
            id,
            label,
            source: { resource: logger.resource },
            log: true,
            extensionId: logger.extensionId,
        });
    }
    registerCompoundLogChannel(id, name, logger) {
        const channel = this.outputChannelRegistry.getChannel(id);
        const source = { resource: logger.resource, name: logger.name ?? logger.id };
        if (channel) {
            if (isMultiSourceOutputChannelDescriptor(channel) &&
                !channel.source.some(({ resource }) => this.uriIdentityService.extUri.isEqual(resource, logger.resource))) {
                this.outputChannelRegistry.updateChannelSources(id, [...channel.source, source]);
            }
        }
        else {
            this.outputChannelRegistry.registerChannel({ id, label: name, log: true, source: [source] });
        }
    }
    deregisterLogChannel(logger) {
        if (logger.group) {
            const channel = this.outputChannelRegistry.getChannel(logger.group.id);
            if (channel && isMultiSourceOutputChannelDescriptor(channel)) {
                this.outputChannelRegistry.updateChannelSources(logger.group.id, channel.source.filter(({ resource }) => !this.uriIdentityService.extUri.isEqual(resource, logger.resource)));
            }
        }
        else {
            this.outputChannelRegistry.removeChannel(logger.id);
        }
    }
    registerShowWindowLogAction() {
        this._register(registerAction2(class ShowWindowLogAction extends Action2 {
            constructor() {
                super({
                    id: showWindowLogActionId,
                    title: nls.localize2('show window log', 'Show Window Log'),
                    category: Categories.Developer,
                    f1: true,
                });
            }
            async run(servicesAccessor) {
                const outputService = servicesAccessor.get(IOutputService);
                outputService.showChannel(windowLogId);
            }
        }));
    }
};
LogOutputChannels = __decorate([
    __param(0, ILoggerService),
    __param(1, IContextKeyService),
    __param(2, IUriIdentityService)
], LogOutputChannels);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LogOutputChannels, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2NvbW1vbi9sb2dzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNwRCxPQUFPLEVBR04sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFFTixjQUFjLEVBQ2QsVUFBVSxFQUNWLG9DQUFvQyxFQUNwQyxxQ0FBcUMsR0FDckMsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixFQUVqQixjQUFjLEVBRWQsZ0JBQWdCLEVBQ2hCLFVBQVUsR0FDVixNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsaUJBQWlCLENBQUMsRUFBRTtZQUN4QixLQUFLLEVBQUUsaUJBQWlCLENBQUMsS0FBSztZQUM5QixRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsR0FBRyxDQUFDLGdCQUFrQztRQUNyQyxPQUFPLGdCQUFnQjthQUNyQixHQUFHLENBQUMscUJBQXFCLENBQUM7YUFDMUIsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2FBQ3RGLEdBQUcsRUFBRSxDQUFBO0lBQ1IsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQ0FBcUM7WUFDekMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUM7WUFDbkUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1NBQzlCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQ0YsZ0JBQWtDLEVBQ2xDLFFBQWtCLEVBQ2xCLFdBQW9CO1FBRXBCLE9BQU8sZ0JBQWdCO2FBQ3JCLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQzthQUM3QixrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQU16QyxZQUNpQixhQUE4QyxFQUMxQyxpQkFBc0QsRUFDckQsa0JBQXdEO1FBRTdFLEtBQUssRUFBRSxDQUFBO1FBSjBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3BDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFSN0QsZ0JBQVcsR0FBRyxJQUFJLFVBQVUsRUFBVSxDQUFBO1FBQ3RDLDBCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ25ELFVBQVUsQ0FBQyxjQUFjLENBQ3pCLENBQUE7UUFRQSxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM5RCxVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2QyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNuQixVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDOUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQ3ZELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2pDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUU7WUFDOUQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3pGLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUMvQixDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLE9BQWtDO1FBQ3pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5RCxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNwQixLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO3dCQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDMUIsQ0FBQztvQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7d0JBQ2pFLFNBQVE7b0JBQ1QsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuQixTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNqQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3pGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDbEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQWtDO1FBQzVELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5RCxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNwQixLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO3dCQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDN0IsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQXVCO1FBQ2pELElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMzRSxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLElBQ0MsT0FBTztZQUNQLHFDQUFxQyxDQUFDLE9BQU8sQ0FBQztZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQy9FLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sWUFBWSxHQUNqQixlQUFlO1lBQ2YscUNBQXFDLENBQUMsZUFBZSxDQUFDO1lBQ3RELGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWTtZQUM5RCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUN6RSxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2IsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUNELE1BQU0saUJBQWlCLEdBQUcsZUFBZSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDNUYsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFBO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLGlCQUFpQjtZQUM5QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDO1lBQzFDLEVBQUU7WUFDRixLQUFLO1lBQ0wsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDckMsR0FBRyxFQUFFLElBQUk7WUFDVCxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7U0FDL0IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLDBCQUEwQixDQUFDLEVBQVUsRUFBRSxJQUFZLEVBQUUsTUFBdUI7UUFDbkYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLE1BQU0sR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQTtRQUM1RSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFDQyxvQ0FBb0MsQ0FBQyxPQUFPLENBQUM7Z0JBQzdDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FDckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FDakUsRUFDQSxDQUFDO2dCQUNGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNqRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0YsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxNQUF1QjtRQUNuRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEUsSUFBSSxPQUFPLElBQUksb0NBQW9DLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUM5QyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDZixPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FDcEIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQ3BGLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUNkLE1BQU0sbUJBQW9CLFNBQVEsT0FBTztZQUN4QztnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLHFCQUFxQjtvQkFDekIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7b0JBQzFELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztvQkFDOUIsRUFBRSxFQUFFLElBQUk7aUJBQ1IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWtDO2dCQUMzQyxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQzFELGFBQWEsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDdkMsQ0FBQztTQUNELENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEzTEssaUJBQWlCO0lBT3BCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0dBVGhCLGlCQUFpQixDQTJMdEI7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsa0NBQTBCLENBQUEifQ==