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
var ChatAgentNameService_1;
import { findLast } from '../../../../base/common/arraysFind.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { observableValue } from '../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
export function isChatWelcomeMessageContent(obj) {
    return (obj &&
        ThemeIcon.isThemeIcon(obj.icon) &&
        typeof obj.title === 'string' &&
        isMarkdownString(obj.message));
}
export const IChatAgentService = createDecorator('chatAgentService');
let ChatAgentService = class ChatAgentService extends Disposable {
    static { this.AGENT_LEADER = '@'; }
    constructor(contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._agents = new Map();
        this._onDidChangeAgents = new Emitter();
        this.onDidChangeAgents = this._onDidChangeAgents.event;
        this._agentsContextKeys = new Set();
        this._chatParticipantDetectionProviders = new Map();
        this._agentCompletionProviders = new Map();
        this._hasDefaultAgent = ChatContextKeys.enabled.bindTo(this.contextKeyService);
        this._defaultAgentRegistered = ChatContextKeys.panelParticipantRegistered.bindTo(this.contextKeyService);
        this._editingAgentRegistered = ChatContextKeys.editingParticipantRegistered.bindTo(this.contextKeyService);
        this._register(contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(this._agentsContextKeys)) {
                this._updateContextKeys();
            }
        }));
        this._hasToolsAgentContextKey = ChatContextKeys.Editing.hasToolsAgent.bindTo(contextKeyService);
    }
    registerAgent(id, data) {
        const existingAgent = this.getAgent(id);
        if (existingAgent) {
            throw new Error(`Agent already registered: ${JSON.stringify(id)}`);
        }
        const that = this;
        const commands = data.slashCommands;
        data = {
            ...data,
            get slashCommands() {
                return commands.filter((c) => !c.when ||
                    that.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(c.when)));
            },
        };
        const entry = { data };
        this._agents.set(id, entry);
        this._updateAgentsContextKeys();
        this._updateContextKeys();
        this._onDidChangeAgents.fire(undefined);
        return toDisposable(() => {
            this._agents.delete(id);
            this._updateAgentsContextKeys();
            this._updateContextKeys();
            this._onDidChangeAgents.fire(undefined);
        });
    }
    _updateAgentsContextKeys() {
        // Update the set of context keys used by all agents
        this._agentsContextKeys.clear();
        for (const agent of this._agents.values()) {
            if (agent.data.when) {
                const expr = ContextKeyExpr.deserialize(agent.data.when);
                for (const key of expr?.keys() || []) {
                    this._agentsContextKeys.add(key);
                }
            }
        }
    }
    _updateContextKeys() {
        let editingAgentRegistered = false;
        let defaultAgentRegistered = false;
        let toolsAgentRegistered = false;
        for (const agent of this.getAgents()) {
            if (agent.isDefault && agent.locations.includes(ChatAgentLocation.EditingSession)) {
                editingAgentRegistered = true;
                if (agent.isToolsAgent) {
                    toolsAgentRegistered = true;
                }
            }
            else if (agent.isDefault) {
                defaultAgentRegistered = true;
            }
        }
        this._editingAgentRegistered.set(editingAgentRegistered);
        this._defaultAgentRegistered.set(defaultAgentRegistered);
        if (toolsAgentRegistered !== this._hasToolsAgentContextKey.get()) {
            this._hasToolsAgentContextKey.set(toolsAgentRegistered);
            this._onDidChangeAgents.fire(this.getDefaultAgent(ChatAgentLocation.EditingSession));
        }
    }
    registerAgentImplementation(id, agentImpl) {
        const entry = this._agents.get(id);
        if (!entry) {
            throw new Error(`Unknown agent: ${JSON.stringify(id)}`);
        }
        if (entry.impl) {
            throw new Error(`Agent already has implementation: ${JSON.stringify(id)}`);
        }
        if (entry.data.isDefault) {
            this._hasDefaultAgent.set(true);
        }
        entry.impl = agentImpl;
        this._onDidChangeAgents.fire(new MergedChatAgent(entry.data, agentImpl));
        return toDisposable(() => {
            entry.impl = undefined;
            this._onDidChangeAgents.fire(undefined);
            if (entry.data.isDefault) {
                this._hasDefaultAgent.set(false);
            }
        });
    }
    registerDynamicAgent(data, agentImpl) {
        data.isDynamic = true;
        const agent = { data, impl: agentImpl };
        this._agents.set(data.id, agent);
        this._onDidChangeAgents.fire(new MergedChatAgent(data, agentImpl));
        return toDisposable(() => {
            this._agents.delete(data.id);
            this._onDidChangeAgents.fire(undefined);
        });
    }
    registerAgentCompletionProvider(id, provider) {
        this._agentCompletionProviders.set(id, provider);
        return {
            dispose: () => {
                this._agentCompletionProviders.delete(id);
            },
        };
    }
    async getAgentCompletionItems(id, query, token) {
        return (await this._agentCompletionProviders.get(id)?.(query, token)) ?? [];
    }
    updateAgent(id, updateMetadata) {
        const agent = this._agents.get(id);
        if (!agent?.impl) {
            throw new Error(`No activated agent with id ${JSON.stringify(id)} registered`);
        }
        agent.data.metadata = { ...agent.data.metadata, ...updateMetadata };
        this._onDidChangeAgents.fire(new MergedChatAgent(agent.data, agent.impl));
    }
    getDefaultAgent(location, mode) {
        if (mode === ChatMode.Edit || mode === ChatMode.Agent) {
            location = ChatAgentLocation.EditingSession;
        }
        return this._preferExtensionAgent(this.getActivatedAgents().filter((a) => {
            if ((mode === ChatMode.Agent) !== !!a.isToolsAgent) {
                return false;
            }
            return !!a.isDefault && a.locations.includes(location);
        }));
    }
    get hasToolsAgent() {
        return !!this._hasToolsAgentContextKey.get();
    }
    getContributedDefaultAgent(location) {
        return this._preferExtensionAgent(this.getAgents().filter((a) => !!a.isDefault && a.locations.includes(location)));
    }
    _preferExtensionAgent(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the last extensions provided agent
        // falling back to the last core agent if no extension agent is found.
        return findLast(agents, (agent) => !agent.isCore) ?? agents.at(-1);
    }
    getAgent(id, includeDisabled = false) {
        if (!this._agentIsEnabled(id) && !includeDisabled) {
            return;
        }
        return this._agents.get(id)?.data;
    }
    _agentIsEnabled(idOrAgent) {
        const entry = typeof idOrAgent === 'string' ? this._agents.get(idOrAgent) : idOrAgent;
        return (!entry?.data.when ||
            this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(entry.data.when)));
    }
    getAgentByFullyQualifiedId(id) {
        const agent = Iterable.find(this._agents.values(), (a) => getFullyQualifiedId(a.data) === id)?.data;
        if (agent && !this._agentIsEnabled(agent.id)) {
            return;
        }
        return agent;
    }
    /**
     * Returns all agent datas that exist- static registered and dynamic ones.
     */
    getAgents() {
        return Array.from(this._agents.values())
            .map((entry) => entry.data)
            .filter((a) => this._agentIsEnabled(a.id));
    }
    getActivatedAgents() {
        return Array.from(this._agents.values())
            .filter((a) => !!a.impl)
            .filter((a) => this._agentIsEnabled(a.data.id))
            .map((a) => new MergedChatAgent(a.data, a.impl));
    }
    getAgentsByName(name) {
        return this._preferExtensionAgents(this.getAgents().filter((a) => a.name === name));
    }
    _preferExtensionAgents(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the extensions provided agents
        // falling back to the original agents array extension agent is found.
        const extensionAgents = agents.filter((a) => !a.isCore);
        return extensionAgents.length > 0 ? extensionAgents : agents;
    }
    agentHasDupeName(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            return false;
        }
        return (this.getAgentsByName(agent.name).filter((a) => a.extensionId.value !== agent.extensionId.value).length > 0);
    }
    async invokeAgent(id, request, progress, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        return await data.impl.invoke(request, progress, history, token);
    }
    setRequestPaused(id, requestId, isPaused) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        data.impl.setRequestPaused?.(requestId, isPaused);
    }
    async getFollowups(id, request, result, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        if (!data.impl?.provideFollowups) {
            return [];
        }
        return data.impl.provideFollowups(request, result, history, token);
    }
    async getChatTitle(id, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        if (!data.impl?.provideChatTitle) {
            return undefined;
        }
        return data.impl.provideChatTitle(history, token);
    }
    registerChatParticipantDetectionProvider(handle, provider) {
        this._chatParticipantDetectionProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatParticipantDetectionProviders.delete(handle);
        });
    }
    hasChatParticipantDetectionProviders() {
        return this._chatParticipantDetectionProviders.size > 0;
    }
    async detectAgentOrCommand(request, history, options, token) {
        // TODO@joyceerhl should we have a selector to be able to narrow down which provider to use
        const provider = Iterable.first(this._chatParticipantDetectionProviders.values());
        if (!provider) {
            return;
        }
        const participants = this.getAgents().reduce((acc, a) => {
            if (a.locations.includes(options.location)) {
                acc.push({ participant: a.id, disambiguation: a.disambiguation ?? [] });
                for (const command of a.slashCommands) {
                    acc.push({
                        participant: a.id,
                        command: command.name,
                        disambiguation: command.disambiguation ?? [],
                    });
                }
            }
            return acc;
        }, []);
        const result = await provider.provideParticipantDetection(request, history, { ...options, participants }, token);
        if (!result) {
            return;
        }
        const agent = this.getAgent(result.participant);
        if (!agent) {
            // Couldn't find a participant matching the participant detection result
            return;
        }
        if (!result.command) {
            return { agent };
        }
        const command = agent?.slashCommands.find((c) => c.name === result.command);
        if (!command) {
            // Couldn't find a slash command matching the participant detection result
            return;
        }
        return { agent, command };
    }
};
ChatAgentService = __decorate([
    __param(0, IContextKeyService)
], ChatAgentService);
export { ChatAgentService };
export class MergedChatAgent {
    constructor(data, impl) {
        this.data = data;
        this.impl = impl;
    }
    get id() {
        return this.data.id;
    }
    get name() {
        return this.data.name ?? '';
    }
    get fullName() {
        return this.data.fullName ?? '';
    }
    get description() {
        return this.data.description ?? '';
    }
    get extensionId() {
        return this.data.extensionId;
    }
    get extensionPublisherId() {
        return this.data.extensionPublisherId;
    }
    get extensionPublisherDisplayName() {
        return this.data.publisherDisplayName;
    }
    get extensionDisplayName() {
        return this.data.extensionDisplayName;
    }
    get isDefault() {
        return this.data.isDefault;
    }
    get isToolsAgent() {
        return this.data.isToolsAgent;
    }
    get isCore() {
        return this.data.isCore;
    }
    get metadata() {
        return this.data.metadata;
    }
    get slashCommands() {
        return this.data.slashCommands;
    }
    get locations() {
        return this.data.locations;
    }
    get disambiguation() {
        return this.data.disambiguation;
    }
    async invoke(request, progress, history, token) {
        return this.impl.invoke(request, progress, history, token);
    }
    setRequestPaused(requestId, isPaused) {
        if (this.impl.setRequestPaused) {
            this.impl.setRequestPaused(requestId, isPaused);
        }
    }
    async provideFollowups(request, result, history, token) {
        if (this.impl.provideFollowups) {
            return this.impl.provideFollowups(request, result, history, token);
        }
        return [];
    }
    provideWelcomeMessage(token) {
        if (this.impl.provideWelcomeMessage) {
            return this.impl.provideWelcomeMessage(token);
        }
        return undefined;
    }
    provideSampleQuestions(location, token) {
        if (this.impl.provideSampleQuestions) {
            return this.impl.provideSampleQuestions(location, token);
        }
        return undefined;
    }
    toJSON() {
        return this.data;
    }
}
export const IChatAgentNameService = createDecorator('chatAgentNameService');
let ChatAgentNameService = class ChatAgentNameService {
    static { ChatAgentNameService_1 = this; }
    static { this.StorageKey = 'chat.participantNameRegistry'; }
    constructor(productService, requestService, logService, storageService) {
        this.requestService = requestService;
        this.logService = logService;
        this.storageService = storageService;
        this.registry = observableValue(this, Object.create(null));
        this.disposed = false;
        if (!productService.chatParticipantRegistry) {
            return;
        }
        this.url = productService.chatParticipantRegistry;
        const raw = storageService.get(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        try {
            this.registry.set(JSON.parse(raw ?? '{}'), undefined);
        }
        catch (err) {
            storageService.remove(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        }
        this.refresh();
    }
    refresh() {
        if (this.disposed) {
            return;
        }
        this.update()
            .catch((err) => this.logService.warn('Failed to fetch chat participant registry', err))
            .then(() => timeout(5 * 60 * 1000)) // every 5 minutes
            .then(() => this.refresh());
    }
    async update() {
        const context = await this.requestService.request({ type: 'GET', url: this.url }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        if (!result || result.version !== 1) {
            throw new Error('Unexpected chat participant registry response.');
        }
        const registry = result.restrictedChatParticipants;
        this.registry.set(registry, undefined);
        this.storageService.store(ChatAgentNameService_1.StorageKey, JSON.stringify(registry), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    /**
     * Returns true if the agent is allowed to use this name
     */
    getAgentNameRestriction(chatAgentData) {
        if (chatAgentData.isCore) {
            return true; // core agents are always allowed to use any name
        }
        // TODO would like to use observables here but nothing uses it downstream and I'm not sure how to combine these two
        const nameAllowed = this.checkAgentNameRestriction(chatAgentData.name, chatAgentData).get();
        const fullNameAllowed = !chatAgentData.fullName ||
            this.checkAgentNameRestriction(chatAgentData.fullName.replace(/\s/g, ''), chatAgentData).get();
        return nameAllowed && fullNameAllowed;
    }
    checkAgentNameRestriction(name, chatAgentData) {
        // Registry is a map of name to an array of extension publisher IDs or extension IDs that are allowed to use it.
        // Look up the list of extensions that are allowed to use this name
        const allowList = this.registry.map((registry) => registry[name.toLowerCase()]);
        return allowList.map((allowList) => {
            if (!allowList) {
                return true;
            }
            return allowList.some((id) => equalsIgnoreCase(id, id.includes('.') ? chatAgentData.extensionId.value : chatAgentData.extensionPublisherId));
        });
    }
    dispose() {
        this.disposed = true;
    }
};
ChatAgentNameService = ChatAgentNameService_1 = __decorate([
    __param(0, IProductService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IStorageService)
], ChatAgentNameService);
export { ChatAgentNameService };
export function getFullyQualifiedId(chatAgentData) {
    return `${chatAgentData.extensionId.value}.${chatAgentData.id}`;
}
export function reviveSerializedAgent(raw) {
    const agent = 'name' in raw
        ? raw
        : {
            ...raw,
            name: raw.id,
        };
    // Fill in required fields that may be missing from old data
    if (!('extensionPublisherId' in agent)) {
        agent.extensionPublisherId = agent.extensionPublisher ?? '';
    }
    if (!('extensionDisplayName' in agent)) {
        agent.extensionDisplayName = '';
    }
    if (!('extensionId' in agent)) {
        agent.extensionId = new ExtensionIdentifier('');
    }
    return revive(agent);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRBZ2VudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVB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