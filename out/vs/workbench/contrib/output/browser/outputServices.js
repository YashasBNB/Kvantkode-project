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
import { Event, Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { OUTPUT_VIEW_ID, LOG_MIME, OUTPUT_MIME, Extensions, ACTIVE_OUTPUT_CHANNEL_CONTEXT, CONTEXT_ACTIVE_FILE_OUTPUT, CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE, CONTEXT_ACTIVE_OUTPUT_LEVEL, CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT, SHOW_DEBUG_FILTER_CONTEXT, SHOW_ERROR_FILTER_CONTEXT, SHOW_INFO_FILTER_CONTEXT, SHOW_TRACE_FILTER_CONTEXT, SHOW_WARNING_FILTER_CONTEXT, CONTEXT_ACTIVE_LOG_FILE_OUTPUT, isSingleSourceOutputChannelDescriptor, HIDE_CATEGORY_FILTER_CONTEXT, isMultiSourceOutputChannelDescriptor, } from '../../../services/output/common/output.js';
import { OutputLinkProvider } from './outputLinkProvider.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { ILogService, ILoggerService, LogLevel, LogLevelToString, } from '../../../../platform/log/common/log.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { DelegatedOutputChannelModel, FileOutputChannelModel, MultiFileOutputChannelModel, } from '../common/outputChannelModel.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDefaultLogLevelsService } from '../../logs/common/defaultLogLevels.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { localize } from '../../../../nls.js';
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { telemetryLogId } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { toLocalISOString } from '../../../../base/common/date.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
const OUTPUT_ACTIVE_CHANNEL_KEY = 'output.activechannel';
let OutputChannel = class OutputChannel extends Disposable {
    constructor(outputChannelDescriptor, outputLocation, outputDirPromise, languageService, instantiationService) {
        super();
        this.outputChannelDescriptor = outputChannelDescriptor;
        this.outputLocation = outputLocation;
        this.outputDirPromise = outputDirPromise;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.scrollLock = false;
        this.id = outputChannelDescriptor.id;
        this.label = outputChannelDescriptor.label;
        this.uri = URI.from({ scheme: Schemas.outputChannel, path: this.id });
        this.model = this._register(this.createOutputChannelModel(this.uri, outputChannelDescriptor));
    }
    createOutputChannelModel(uri, outputChannelDescriptor) {
        const language = outputChannelDescriptor.languageId
            ? this.languageService.createById(outputChannelDescriptor.languageId)
            : this.languageService.createByMimeType(outputChannelDescriptor.log ? LOG_MIME : OUTPUT_MIME);
        if (isMultiSourceOutputChannelDescriptor(outputChannelDescriptor)) {
            return this.instantiationService.createInstance(MultiFileOutputChannelModel, uri, language, [
                ...outputChannelDescriptor.source,
            ]);
        }
        if (isSingleSourceOutputChannelDescriptor(outputChannelDescriptor)) {
            return this.instantiationService.createInstance(FileOutputChannelModel, uri, language, outputChannelDescriptor.source);
        }
        return this.instantiationService.createInstance(DelegatedOutputChannelModel, this.id, uri, language, this.outputLocation, this.outputDirPromise);
    }
    getLogEntries() {
        return this.model.getLogEntries();
    }
    append(output) {
        this.model.append(output);
    }
    update(mode, till) {
        this.model.update(mode, till, true);
    }
    clear() {
        this.model.clear();
    }
    replace(value) {
        this.model.replace(value);
    }
};
OutputChannel = __decorate([
    __param(3, ILanguageService),
    __param(4, IInstantiationService)
], OutputChannel);
class OutputViewFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._filterText = '';
        this._trace = SHOW_TRACE_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._debug = SHOW_DEBUG_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._info = SHOW_INFO_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._warning = SHOW_WARNING_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._error = SHOW_ERROR_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._categories = HIDE_CATEGORY_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._trace.set(options.trace);
        this._debug.set(options.debug);
        this._info.set(options.info);
        this._warning.set(options.warning);
        this._error.set(options.error);
        this._categories.set(options.sources);
        this.filterHistory = options.filterHistory;
    }
    get text() {
        return this._filterText;
    }
    set text(filterText) {
        if (this._filterText !== filterText) {
            this._filterText = filterText;
            this._onDidChange.fire();
        }
    }
    get trace() {
        return !!this._trace.get();
    }
    set trace(trace) {
        if (this._trace.get() !== trace) {
            this._trace.set(trace);
            this._onDidChange.fire();
        }
    }
    get debug() {
        return !!this._debug.get();
    }
    set debug(debug) {
        if (this._debug.get() !== debug) {
            this._debug.set(debug);
            this._onDidChange.fire();
        }
    }
    get info() {
        return !!this._info.get();
    }
    set info(info) {
        if (this._info.get() !== info) {
            this._info.set(info);
            this._onDidChange.fire();
        }
    }
    get warning() {
        return !!this._warning.get();
    }
    set warning(warning) {
        if (this._warning.get() !== warning) {
            this._warning.set(warning);
            this._onDidChange.fire();
        }
    }
    get error() {
        return !!this._error.get();
    }
    set error(error) {
        if (this._error.get() !== error) {
            this._error.set(error);
            this._onDidChange.fire();
        }
    }
    get categories() {
        return this._categories.get() || ',';
    }
    set categories(categories) {
        this._categories.set(categories);
        this._onDidChange.fire();
    }
    toggleCategory(category) {
        const categories = this.categories;
        if (this.hasCategory(category)) {
            this.categories = categories.replace(`,${category},`, ',');
        }
        else {
            this.categories = `${categories}${category},`;
        }
    }
    hasCategory(category) {
        if (category === ',') {
            return false;
        }
        return this.categories.includes(`,${category},`);
    }
}
let OutputService = class OutputService extends Disposable {
    constructor(storageService, instantiationService, textModelService, logService, loggerService, lifecycleService, viewsService, contextKeyService, defaultLogLevelsService, fileDialogService, fileService, environmentService) {
        super();
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.logService = logService;
        this.loggerService = loggerService;
        this.lifecycleService = lifecycleService;
        this.viewsService = viewsService;
        this.defaultLogLevelsService = defaultLogLevelsService;
        this.fileDialogService = fileDialogService;
        this.fileService = fileService;
        this.channels = this._register(new DisposableMap());
        this._onActiveOutputChannel = this._register(new Emitter());
        this.onActiveOutputChannel = this._onActiveOutputChannel.event;
        this.outputFolderCreationPromise = null;
        this.activeChannelIdInStorage = this.storageService.get(OUTPUT_ACTIVE_CHANNEL_KEY, 1 /* StorageScope.WORKSPACE */, '');
        this.activeOutputChannelContext = ACTIVE_OUTPUT_CHANNEL_CONTEXT.bindTo(contextKeyService);
        this.activeOutputChannelContext.set(this.activeChannelIdInStorage);
        this._register(this.onActiveOutputChannel((channel) => this.activeOutputChannelContext.set(channel)));
        this.activeFileOutputChannelContext = CONTEXT_ACTIVE_FILE_OUTPUT.bindTo(contextKeyService);
        this.activeLogOutputChannelContext = CONTEXT_ACTIVE_LOG_FILE_OUTPUT.bindTo(contextKeyService);
        this.activeOutputChannelLevelSettableContext =
            CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE.bindTo(contextKeyService);
        this.activeOutputChannelLevelContext = CONTEXT_ACTIVE_OUTPUT_LEVEL.bindTo(contextKeyService);
        this.activeOutputChannelLevelIsDefaultContext =
            CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT.bindTo(contextKeyService);
        this.outputLocation = joinPath(environmentService.windowLogsPath, `output_${toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')}`);
        // Register as text model content provider for output
        this._register(textModelService.registerTextModelContentProvider(Schemas.outputChannel, this));
        this._register(instantiationService.createInstance(OutputLinkProvider));
        // Create output channels for already registered channels
        const registry = Registry.as(Extensions.OutputChannels);
        for (const channelIdentifier of registry.getChannels()) {
            this.onDidRegisterChannel(channelIdentifier.id);
        }
        this._register(registry.onDidRegisterChannel((id) => this.onDidRegisterChannel(id)));
        this._register(registry.onDidUpdateChannelSources((channel) => this.onDidUpdateChannelSources(channel)));
        this._register(registry.onDidRemoveChannel((channel) => this.onDidRemoveChannel(channel)));
        // Set active channel to first channel if not set
        if (!this.activeChannel) {
            const channels = this.getChannelDescriptors();
            this.setActiveChannel(channels && channels.length > 0 ? this.getChannel(channels[0].id) : undefined);
        }
        this._register(Event.filter(this.viewsService.onDidChangeViewVisibility, (e) => e.id === OUTPUT_VIEW_ID && e.visible)(() => {
            if (this.activeChannel) {
                this.viewsService
                    .getActiveViewWithId(OUTPUT_VIEW_ID)
                    ?.showChannel(this.activeChannel, true);
            }
        }));
        this._register(this.loggerService.onDidChangeLogLevel(() => {
            this.resetLogLevelFilters();
            this.setLevelContext();
            this.setLevelIsDefaultContext();
        }));
        this._register(this.defaultLogLevelsService.onDidChangeDefaultLogLevels(() => {
            this.setLevelIsDefaultContext();
        }));
        this._register(this.lifecycleService.onDidShutdown(() => this.dispose()));
        this.filters = this._register(new OutputViewFilters({
            filterHistory: [],
            trace: true,
            debug: true,
            info: true,
            warning: true,
            error: true,
            sources: '',
        }, contextKeyService));
    }
    provideTextContent(resource) {
        const channel = this.getChannel(resource.path);
        if (channel) {
            return channel.model.loadModel();
        }
        return null;
    }
    async showChannel(id, preserveFocus) {
        const channel = this.getChannel(id);
        if (this.activeChannel?.id !== channel?.id) {
            this.setActiveChannel(channel);
            this._onActiveOutputChannel.fire(id);
        }
        const outputView = await this.viewsService.openView(OUTPUT_VIEW_ID, !preserveFocus);
        if (outputView && channel) {
            outputView.showChannel(channel, !!preserveFocus);
        }
    }
    getChannel(id) {
        return this.channels.get(id);
    }
    getChannelDescriptor(id) {
        return Registry.as(Extensions.OutputChannels).getChannel(id);
    }
    getChannelDescriptors() {
        return Registry.as(Extensions.OutputChannels).getChannels();
    }
    getActiveChannel() {
        return this.activeChannel;
    }
    canSetLogLevel(channel) {
        return channel.log && channel.id !== telemetryLogId;
    }
    getLogLevel(channel) {
        if (!channel.log) {
            return undefined;
        }
        const sources = isSingleSourceOutputChannelDescriptor(channel)
            ? [channel.source]
            : isMultiSourceOutputChannelDescriptor(channel)
                ? channel.source
                : [];
        if (sources.length === 0) {
            return undefined;
        }
        const logLevel = this.loggerService.getLogLevel();
        return sources.reduce((prev, curr) => Math.min(prev, this.loggerService.getLogLevel(curr.resource) ?? logLevel), LogLevel.Error);
    }
    setLogLevel(channel, logLevel) {
        if (!channel.log) {
            return;
        }
        const sources = isSingleSourceOutputChannelDescriptor(channel)
            ? [channel.source]
            : isMultiSourceOutputChannelDescriptor(channel)
                ? channel.source
                : [];
        if (sources.length === 0) {
            return;
        }
        for (const source of sources) {
            this.loggerService.setLogLevel(source.resource, logLevel);
        }
    }
    registerCompoundLogChannel(descriptors) {
        const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        descriptors.sort((a, b) => a.label.localeCompare(b.label));
        const id = descriptors.map((r) => r.id.toLowerCase()).join('-');
        if (!outputChannelRegistry.getChannel(id)) {
            outputChannelRegistry.registerChannel({
                id,
                label: descriptors.map((r) => r.label).join(', '),
                log: descriptors.some((r) => r.log),
                user: true,
                source: descriptors
                    .map((descriptor) => {
                    if (isSingleSourceOutputChannelDescriptor(descriptor)) {
                        return [
                            {
                                resource: descriptor.source.resource,
                                name: descriptor.source.name ?? descriptor.label,
                            },
                        ];
                    }
                    if (isMultiSourceOutputChannelDescriptor(descriptor)) {
                        return descriptor.source;
                    }
                    const channel = this.getChannel(descriptor.id);
                    if (channel) {
                        return channel.model.source;
                    }
                    return [];
                })
                    .flat(),
            });
        }
        return id;
    }
    async saveOutputAs(...channels) {
        let channel;
        if (channels.length > 1) {
            const compoundChannelId = this.registerCompoundLogChannel(channels);
            channel = this.getChannel(compoundChannelId);
        }
        else {
            channel = this.getChannel(channels[0].id);
        }
        if (!channel) {
            return;
        }
        try {
            const name = channels.length > 1 ? 'output' : channels[0].label;
            const uri = await this.fileDialogService.showSaveDialog({
                title: localize('saveLog.dialogTitle', 'Save Output As'),
                availableFileSystems: [Schemas.file],
                defaultUri: joinPath(await this.fileDialogService.defaultFilePath(), `${name}.log`),
                filters: [
                    {
                        name,
                        extensions: ['log'],
                    },
                ],
            });
            if (!uri) {
                return;
            }
            const modelRef = await this.textModelService.createModelReference(channel.uri);
            try {
                await this.fileService.writeFile(uri, VSBuffer.fromString(modelRef.object.textEditorModel.getValue()));
            }
            finally {
                modelRef.dispose();
            }
            return;
        }
        finally {
            if (channels.length > 1) {
                Registry.as(Extensions.OutputChannels).removeChannel(channel.id);
            }
        }
    }
    async onDidRegisterChannel(channelId) {
        const channel = this.createChannel(channelId);
        this.channels.set(channelId, channel);
        if (!this.activeChannel || this.activeChannelIdInStorage === channelId) {
            this.setActiveChannel(channel);
            this._onActiveOutputChannel.fire(channelId);
            const outputView = this.viewsService.getActiveViewWithId(OUTPUT_VIEW_ID);
            outputView?.showChannel(channel, true);
        }
    }
    onDidUpdateChannelSources(channel) {
        const outputChannel = this.channels.get(channel.id);
        if (outputChannel) {
            outputChannel.model.updateChannelSources(channel.source);
        }
    }
    onDidRemoveChannel(channel) {
        if (this.activeChannel?.id === channel.id) {
            const channels = this.getChannelDescriptors();
            if (channels[0]) {
                this.showChannel(channels[0].id);
            }
        }
        this.channels.deleteAndDispose(channel.id);
    }
    createChannel(id) {
        const channel = this.instantiateChannel(id);
        this._register(Event.once(channel.model.onDispose)(() => {
            if (this.activeChannel === channel) {
                const channels = this.getChannelDescriptors();
                const channel = channels.length ? this.getChannel(channels[0].id) : undefined;
                if (channel && this.viewsService.isViewVisible(OUTPUT_VIEW_ID)) {
                    this.showChannel(channel.id);
                }
                else {
                    this.setActiveChannel(undefined);
                }
            }
            Registry.as(Extensions.OutputChannels).removeChannel(id);
        }));
        return channel;
    }
    instantiateChannel(id) {
        const channelData = Registry.as(Extensions.OutputChannels).getChannel(id);
        if (!channelData) {
            this.logService.error(`Channel '${id}' is not registered yet`);
            throw new Error(`Channel '${id}' is not registered yet`);
        }
        if (!this.outputFolderCreationPromise) {
            this.outputFolderCreationPromise = this.fileService
                .createFolder(this.outputLocation)
                .then(() => undefined);
        }
        return this.instantiationService.createInstance(OutputChannel, channelData, this.outputLocation, this.outputFolderCreationPromise);
    }
    resetLogLevelFilters() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        if (channelLogLevel !== undefined) {
            this.filters.error = channelLogLevel <= LogLevel.Error;
            this.filters.warning = channelLogLevel <= LogLevel.Warning;
            this.filters.info = channelLogLevel <= LogLevel.Info;
            this.filters.debug = channelLogLevel <= LogLevel.Debug;
            this.filters.trace = channelLogLevel <= LogLevel.Trace;
        }
    }
    setLevelContext() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        this.activeOutputChannelLevelContext.set(channelLogLevel !== undefined ? LogLevelToString(channelLogLevel) : '');
    }
    async setLevelIsDefaultContext() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        if (channelLogLevel !== undefined) {
            const channelDefaultLogLevel = await this.defaultLogLevelsService.getDefaultLogLevel(descriptor?.extensionId);
            this.activeOutputChannelLevelIsDefaultContext.set(channelDefaultLogLevel === channelLogLevel);
        }
        else {
            this.activeOutputChannelLevelIsDefaultContext.set(false);
        }
    }
    setActiveChannel(channel) {
        this.activeChannel = channel;
        const descriptor = channel?.outputChannelDescriptor;
        this.activeFileOutputChannelContext.set(!!descriptor && isSingleSourceOutputChannelDescriptor(descriptor));
        this.activeLogOutputChannelContext.set(!!descriptor?.log);
        this.activeOutputChannelLevelSettableContext.set(descriptor !== undefined && this.canSetLogLevel(descriptor));
        this.setLevelIsDefaultContext();
        this.setLevelContext();
        if (this.activeChannel) {
            this.storageService.store(OUTPUT_ACTIVE_CHANNEL_KEY, this.activeChannel.id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(OUTPUT_ACTIVE_CHANNEL_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
};
OutputService = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, ITextModelService),
    __param(3, ILogService),
    __param(4, ILoggerService),
    __param(5, ILifecycleService),
    __param(6, IViewsService),
    __param(7, IContextKeyService),
    __param(8, IDefaultLogLevelsService),
    __param(9, IFileDialogService),
    __param(10, IFileService),
    __param(11, IWorkbenchEnvironmentService)
], OutputService);
export { OutputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0U2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvYnJvd3Nlci9vdXRwdXRTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFHTixjQUFjLEVBQ2QsUUFBUSxFQUNSLFdBQVcsRUFHWCxVQUFVLEVBRVYsNkJBQTZCLEVBQzdCLDBCQUEwQixFQUMxQixvQ0FBb0MsRUFDcEMsMkJBQTJCLEVBQzNCLHNDQUFzQyxFQUV0Qyx5QkFBeUIsRUFDekIseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUU5QixxQ0FBcUMsRUFDckMsNEJBQTRCLEVBQzVCLG9DQUFvQyxHQUVwQyxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQ04s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