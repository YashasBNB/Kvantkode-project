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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvY29tbW9uL2xvZ3MuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3BELE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUVOLGNBQWMsRUFDZCxVQUFVLEVBQ1Ysb0NBQW9DLEVBQ3BDLHFDQUFxQyxHQUNyQyxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEVBRWpCLGNBQWMsRUFFZCxnQkFBZ0IsRUFDaEIsVUFBVSxHQUNWLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FB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