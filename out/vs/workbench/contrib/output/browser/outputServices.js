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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0U2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dHB1dC9icm93c2VyL291dHB1dFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUdOLGNBQWMsRUFDZCxRQUFRLEVBQ1IsV0FBVyxFQUdYLFVBQVUsRUFFViw2QkFBNkIsRUFDN0IsMEJBQTBCLEVBQzFCLG9DQUFvQyxFQUNwQywyQkFBMkIsRUFDM0Isc0NBQXNDLEVBRXRDLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QiwyQkFBMkIsRUFDM0IsOEJBQThCLEVBRTlCLHFDQUFxQyxFQUNyQyw0QkFBNEIsRUFDNUIsb0NBQW9DLEdBRXBDLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1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