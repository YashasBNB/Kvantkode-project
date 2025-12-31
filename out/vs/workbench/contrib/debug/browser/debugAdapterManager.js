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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import * as strings from '../../../../base/common/strings.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Breakpoints } from '../common/breakpoints.js';
import { CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE, INTERNAL_CONSOLE_OPTIONS_SCHEMA, } from '../common/debug.js';
import { Debugger } from '../common/debugger.js';
import { breakpointsExtPoint, debuggersExtPoint, launchSchema, presentationSchema, } from '../common/debugSchemas.js';
import { TaskDefinitionRegistry } from '../../tasks/common/taskDefinitionRegistry.js';
import { ITaskService } from '../../tasks/common/taskService.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
let AdapterManager = class AdapterManager extends Disposable {
    constructor(delegate, editorService, configurationService, quickInputService, instantiationService, commandService, extensionService, contextKeyService, languageService, dialogService, lifecycleService, tasksService, menuService) {
        super();
        this.delegate = delegate;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.languageService = languageService;
        this.dialogService = dialogService;
        this.lifecycleService = lifecycleService;
        this.tasksService = tasksService;
        this.menuService = menuService;
        this.debugAdapterFactories = new Map();
        this._onDidRegisterDebugger = new Emitter();
        this._onDidDebuggersExtPointRead = new Emitter();
        this.breakpointContributions = [];
        this.debuggerWhenKeys = new Set();
        this.taskLabels = [];
        this.usedDebugTypes = new Set();
        this.adapterDescriptorFactories = [];
        this.debuggers = [];
        this.registerListeners();
        this.contextKeyService.bufferChangeEvents(() => {
            this.debuggersAvailable = CONTEXT_DEBUGGERS_AVAILABLE.bindTo(contextKeyService);
            this.debugExtensionsAvailable = CONTEXT_DEBUG_EXTENSION_AVAILABLE.bindTo(contextKeyService);
        });
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(this.debuggerWhenKeys)) {
                this.debuggersAvailable.set(this.hasEnabledDebuggers());
                this.updateDebugAdapterSchema();
            }
        }));
        this._register(this.onDidDebuggersExtPointRead(() => {
            this.debugExtensionsAvailable.set(this.debuggers.length > 0);
        }));
        // generous debounce since this will end up calling `resolveTask` internally
        const updateTaskScheduler = this._register(new RunOnceScheduler(() => this.updateTaskLabels(), 5000));
        this._register(Event.any(tasksService.onDidChangeTaskConfig, tasksService.onDidChangeTaskProviders)(() => {
            updateTaskScheduler.cancel();
            updateTaskScheduler.schedule();
        }));
        this.lifecycleService
            .when(4 /* LifecyclePhase.Eventually */)
            .then(() => this.debugExtensionsAvailable.set(this.debuggers.length > 0)); // If no extensions with a debugger contribution are loaded
        this._register(delegate.onDidNewSession((s) => {
            this.usedDebugTypes.add(s.configuration.type);
        }));
        updateTaskScheduler.schedule();
    }
    registerListeners() {
        debuggersExtPoint.setHandler((extensions, delta) => {
            delta.added.forEach((added) => {
                added.value.forEach((rawAdapter) => {
                    if (!rawAdapter.type || typeof rawAdapter.type !== 'string') {
                        added.collector.error(nls.localize('debugNoType', "Debugger 'type' can not be omitted and must be of type 'string'."));
                    }
                    if (rawAdapter.type !== '*') {
                        const existing = this.getDebugger(rawAdapter.type);
                        if (existing) {
                            existing.merge(rawAdapter, added.description);
                        }
                        else {
                            const dbg = this.instantiationService.createInstance(Debugger, this, rawAdapter, added.description);
                            dbg.when?.keys().forEach((key) => this.debuggerWhenKeys.add(key));
                            this.debuggers.push(dbg);
                        }
                    }
                });
            });
            // take care of all wildcard contributions
            extensions.forEach((extension) => {
                extension.value.forEach((rawAdapter) => {
                    if (rawAdapter.type === '*') {
                        this.debuggers.forEach((dbg) => dbg.merge(rawAdapter, extension.description));
                    }
                });
            });
            delta.removed.forEach((removed) => {
                const removedTypes = removed.value.map((rawAdapter) => rawAdapter.type);
                this.debuggers = this.debuggers.filter((d) => removedTypes.indexOf(d.type) === -1);
            });
            this.updateDebugAdapterSchema();
            this._onDidDebuggersExtPointRead.fire();
        });
        breakpointsExtPoint.setHandler((extensions) => {
            this.breakpointContributions = extensions.flatMap((ext) => ext.value.map((breakpoint) => this.instantiationService.createInstance(Breakpoints, breakpoint)));
        });
    }
    updateTaskLabels() {
        this.tasksService.getKnownTasks().then((tasks) => {
            this.taskLabels = tasks.map((task) => task._label);
            this.updateDebugAdapterSchema();
        });
    }
    updateDebugAdapterSchema() {
        // update the schema to include all attributes, snippets and types from extensions.
        const items = launchSchema.properties['configurations'].items;
        const taskSchema = TaskDefinitionRegistry.getJsonSchema();
        const definitions = {
            common: {
                properties: {
                    name: {
                        type: 'string',
                        description: nls.localize('debugName', 'Name of configuration; appears in the launch configuration dropdown menu.'),
                        default: 'Launch',
                    },
                    debugServer: {
                        type: 'number',
                        description: nls.localize('debugServer', 'For debug extension development only: if a port is specified VS Code tries to connect to a debug adapter running in server mode'),
                        default: 4711,
                    },
                    preLaunchTask: {
                        anyOf: [
                            taskSchema,
                            {
                                type: ['string'],
                            },
                        ],
                        default: '',
                        defaultSnippets: [{ body: { task: '', type: '' } }],
                        description: nls.localize('debugPrelaunchTask', 'Task to run before debug session starts.'),
                        examples: this.taskLabels,
                    },
                    postDebugTask: {
                        anyOf: [
                            taskSchema,
                            {
                                type: ['string'],
                            },
                        ],
                        default: '',
                        defaultSnippets: [{ body: { task: '', type: '' } }],
                        description: nls.localize('debugPostDebugTask', 'Task to run after debug session ends.'),
                        examples: this.taskLabels,
                    },
                    presentation: presentationSchema,
                    internalConsoleOptions: INTERNAL_CONSOLE_OPTIONS_SCHEMA,
                    suppressMultipleSessionWarning: {
                        type: 'boolean',
                        description: nls.localize('suppressMultipleSessionWarning', 'Disable the warning when trying to start the same debug configuration more than once.'),
                        default: true,
                    },
                },
            },
        };
        launchSchema.definitions = definitions;
        items.oneOf = [];
        items.defaultSnippets = [];
        this.debuggers.forEach((adapter) => {
            const schemaAttributes = adapter.getSchemaAttributes(definitions);
            if (schemaAttributes && items.oneOf) {
                items.oneOf.push(...schemaAttributes);
            }
            const configurationSnippets = adapter.configurationSnippets;
            if (configurationSnippets && items.defaultSnippets) {
                items.defaultSnippets.push(...configurationSnippets);
            }
        });
        jsonRegistry.registerSchema(launchSchemaId, launchSchema);
    }
    registerDebugAdapterFactory(debugTypes, debugAdapterLauncher) {
        debugTypes.forEach((debugType) => this.debugAdapterFactories.set(debugType, debugAdapterLauncher));
        this.debuggersAvailable.set(this.hasEnabledDebuggers());
        this._onDidRegisterDebugger.fire();
        return {
            dispose: () => {
                debugTypes.forEach((debugType) => this.debugAdapterFactories.delete(debugType));
            },
        };
    }
    hasEnabledDebuggers() {
        for (const [type] of this.debugAdapterFactories) {
            const dbg = this.getDebugger(type);
            if (dbg && dbg.enabled) {
                return true;
            }
        }
        return false;
    }
    createDebugAdapter(session) {
        const factory = this.debugAdapterFactories.get(session.configuration.type);
        if (factory) {
            return factory.createDebugAdapter(session);
        }
        return undefined;
    }
    substituteVariables(debugType, folder, config) {
        const factory = this.debugAdapterFactories.get(debugType);
        if (factory) {
            return factory.substituteVariables(folder, config);
        }
        return Promise.resolve(config);
    }
    runInTerminal(debugType, args, sessionId) {
        const factory = this.debugAdapterFactories.get(debugType);
        if (factory) {
            return factory.runInTerminal(args, sessionId);
        }
        return Promise.resolve(void 0);
    }
    registerDebugAdapterDescriptorFactory(debugAdapterProvider) {
        this.adapterDescriptorFactories.push(debugAdapterProvider);
        return {
            dispose: () => {
                this.unregisterDebugAdapterDescriptorFactory(debugAdapterProvider);
            },
        };
    }
    unregisterDebugAdapterDescriptorFactory(debugAdapterProvider) {
        const ix = this.adapterDescriptorFactories.indexOf(debugAdapterProvider);
        if (ix >= 0) {
            this.adapterDescriptorFactories.splice(ix, 1);
        }
    }
    getDebugAdapterDescriptor(session) {
        const config = session.configuration;
        const providers = this.adapterDescriptorFactories.filter((p) => p.type === config.type && p.createDebugAdapterDescriptor);
        if (providers.length === 1) {
            return providers[0].createDebugAdapterDescriptor(session);
        }
        else {
            // TODO@AW handle n > 1 case
        }
        return Promise.resolve(undefined);
    }
    getDebuggerLabel(type) {
        const dbgr = this.getDebugger(type);
        if (dbgr) {
            return dbgr.label;
        }
        return undefined;
    }
    get onDidRegisterDebugger() {
        return this._onDidRegisterDebugger.event;
    }
    get onDidDebuggersExtPointRead() {
        return this._onDidDebuggersExtPointRead.event;
    }
    canSetBreakpointsIn(model) {
        const languageId = model.getLanguageId();
        if (!languageId || languageId === 'jsonc' || languageId === 'log') {
            // do not allow breakpoints in our settings files and output
            return false;
        }
        if (this.configurationService.getValue('debug').allowBreakpointsEverywhere) {
            return true;
        }
        return this.breakpointContributions.some((breakpoints) => breakpoints.language === languageId && breakpoints.enabled);
    }
    getDebugger(type) {
        return this.debuggers.find((dbg) => strings.equalsIgnoreCase(dbg.type, type));
    }
    getEnabledDebugger(type) {
        const adapter = this.getDebugger(type);
        return adapter && adapter.enabled ? adapter : undefined;
    }
    someDebuggerInterestedInLanguage(languageId) {
        return !!this.debuggers.filter((d) => d.enabled).find((a) => a.interestedInLanguage(languageId));
    }
    async guessDebugger(gettingConfigurations) {
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        let candidates = [];
        let languageLabel = null;
        let model = null;
        if (isCodeEditor(activeTextEditorControl)) {
            model = activeTextEditorControl.getModel();
            const language = model ? model.getLanguageId() : undefined;
            if (language) {
                languageLabel = this.languageService.getLanguageName(language);
            }
            const adapters = this.debuggers
                .filter((a) => a.enabled)
                .filter((a) => language && a.interestedInLanguage(language));
            if (adapters.length === 1) {
                return { debugger: adapters[0] };
            }
            if (adapters.length > 1) {
                candidates = adapters;
            }
        }
        // We want to get the debuggers that have configuration providers in the case we are fetching configurations
        // Or if a breakpoint can be set in the current file (good hint that an extension can handle it)
        if ((!languageLabel || gettingConfigurations || (model && this.canSetBreakpointsIn(model))) &&
            candidates.length === 0) {
            await this.activateDebuggers('onDebugInitialConfigurations');
            candidates = this.debuggers
                .filter((a) => a.enabled)
                .filter((dbg) => dbg.hasInitialConfiguration() ||
                dbg.hasDynamicConfigurationProviders() ||
                dbg.hasConfigurationProvider());
        }
        if (candidates.length === 0 && languageLabel) {
            if (languageLabel.indexOf(' ') >= 0) {
                languageLabel = `'${languageLabel}'`;
            }
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Warning,
                message: nls.localize('CouldNotFindLanguage', "You don't have an extension for debugging {0}. Should we find a {0} extension in the Marketplace?", languageLabel),
                primaryButton: nls.localize({ key: 'findExtension', comment: ['&& denotes a mnemonic'] }, '&&Find {0} extension', languageLabel),
            });
            if (confirmed) {
                await this.commandService.executeCommand('debug.installAdditionalDebuggers', languageLabel);
            }
            return undefined;
        }
        this.initExtensionActivationsIfNeeded();
        candidates.sort((first, second) => first.label.localeCompare(second.label));
        candidates = candidates.filter((a) => !a.isHiddenFromDropdown);
        const suggestedCandidates = [];
        const otherCandidates = [];
        candidates.forEach((d) => {
            const descriptor = d.getMainExtensionDescriptor();
            if (descriptor.id && !!this.earlyActivatedExtensions?.has(descriptor.id)) {
                // Was activated early
                suggestedCandidates.push(d);
            }
            else if (this.usedDebugTypes.has(d.type)) {
                // Was used already
                suggestedCandidates.push(d);
            }
            else {
                otherCandidates.push(d);
            }
        });
        const picks = [];
        const dynamic = await this.delegate.configurationManager().getDynamicProviders();
        if (suggestedCandidates.length > 0) {
            picks.push({ type: 'separator', label: nls.localize('suggestedDebuggers', 'Suggested') }, ...suggestedCandidates.map((c) => ({ label: c.label, pick: () => ({ debugger: c }) })));
        }
        if (otherCandidates.length > 0) {
            if (picks.length > 0) {
                picks.push({ type: 'separator', label: '' });
            }
            picks.push(...otherCandidates.map((c) => ({ label: c.label, pick: () => ({ debugger: c }) })));
        }
        if (dynamic.length) {
            if (picks.length) {
                picks.push({ type: 'separator', label: '' });
            }
            for (const d of dynamic) {
                picks.push({
                    label: nls.localize('moreOptionsForDebugType', 'More {0} options...', d.label),
                    pick: async () => {
                        const cfg = await d.pick();
                        if (!cfg) {
                            return undefined;
                        }
                        return cfg && { debugger: this.getDebugger(d.type), withConfig: cfg };
                    },
                });
            }
        }
        picks.push({ type: 'separator', label: '' }, {
            label: languageLabel
                ? nls.localize('installLanguage', 'Install an extension for {0}...', languageLabel)
                : nls.localize('installExt', 'Install extension...'),
        });
        const contributed = this.menuService.getMenuActions(MenuId.DebugCreateConfiguration, this.contextKeyService);
        for (const [, action] of contributed) {
            for (const item of action) {
                picks.push(item);
            }
        }
        const placeHolder = nls.localize('selectDebug', 'Select debugger');
        return this.quickInputService
            .pick(picks, { activeItem: picks[0], placeHolder })
            .then(async (picked) => {
            if (picked && 'pick' in picked && typeof picked.pick === 'function') {
                return await picked.pick();
            }
            if (picked instanceof MenuItemAction) {
                picked.run();
                return;
            }
            if (picked) {
                this.commandService.executeCommand('debug.installAdditionalDebuggers', languageLabel);
            }
            return undefined;
        });
    }
    initExtensionActivationsIfNeeded() {
        if (!this.earlyActivatedExtensions) {
            this.earlyActivatedExtensions = new Set();
            const status = this.extensionService.getExtensionsStatus();
            for (const id in status) {
                if (!!status[id].activationTimes) {
                    this.earlyActivatedExtensions.add(id);
                }
            }
        }
    }
    async activateDebuggers(activationEvent, debugType) {
        this.initExtensionActivationsIfNeeded();
        const promises = [
            this.extensionService.activateByEvent(activationEvent),
            this.extensionService.activateByEvent('onDebug'),
        ];
        if (debugType) {
            promises.push(this.extensionService.activateByEvent(`${activationEvent}:${debugType}`));
        }
        await Promise.all(promises);
    }
};
AdapterManager = __decorate([
    __param(1, IEditorService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, ICommandService),
    __param(6, IExtensionService),
    __param(7, IContextKeyService),
    __param(8, ILanguageService),
    __param(9, IDialogService),
    __param(10, ILifecycleService),
    __param(11, ITaskService),
    __param(12, IMenuService)
], AdapterManager);
export { AdapterManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdBZGFwdGVyTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVsRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixVQUFVLElBQUksY0FBYyxHQUU1QixNQUFNLHFFQUFxRSxDQUFB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