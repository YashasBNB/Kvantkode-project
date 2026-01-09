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
import { StringSHA1 } from '../../../../base/common/hash.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression, } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { McpRegistryInputStorage } from './mcpRegistryInputStorage.js';
import { McpServerConnection } from './mcpServerConnection.js';
const createTrustMemento = observableMemento({
    defaultValue: {},
    key: 'mcp.trustedCollections',
});
const collectionPrefixLen = 3;
let McpRegistry = class McpRegistry extends Disposable {
    get delegates() {
        return this._delegates;
    }
    constructor(_instantiationService, _configurationResolverService, _dialogService, _storageService, _productService, _notificationService, _editorService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationResolverService = _configurationResolverService;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this._productService = _productService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._trustPrompts = new Map();
        this._collections = observableValue('collections', []);
        this._delegates = [];
        this.collections = this._collections;
        this._collectionToPrefixes = this._collections.map((c) => {
            const hashes = c.map((collection) => {
                const sha = new StringSHA1();
                sha.update(collection.id);
                return { view: 0, hash: sha.digest(), collection };
            });
            const view = (h) => h.hash.slice(h.view, h.view + collectionPrefixLen);
            let collided = false;
            do {
                hashes.sort((a, b) => view(a).localeCompare(view(b)) || a.collection.id.localeCompare(b.collection.id));
                collided = false;
                for (let i = 1; i < hashes.length; i++) {
                    const prev = hashes[i - 1];
                    const curr = hashes[i];
                    if (view(prev) === view(curr) && curr.view + collectionPrefixLen < curr.hash.length) {
                        curr.view++;
                        collided = true;
                    }
                }
            } while (collided);
            return Object.fromEntries(hashes.map((h) => [h.collection.id, view(h) + '.']));
        });
        this._workspaceStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */)));
        this._profileStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)));
        this._trustMemento = new Lazy(() => this._register(createTrustMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, this._storageService)));
        this._lazyCollectionsToUpdate = new Set();
        this._ongoingLazyActivations = observableValue(this, 0);
        this.lazyCollectionState = derived((reader) => {
            if (this._ongoingLazyActivations.read(reader) > 0) {
                return 1 /* LazyCollectionState.LoadingUnknown */;
            }
            const collections = this._collections.read(reader);
            return collections.some((c) => c.lazy && c.lazy.isCached === false)
                ? 0 /* LazyCollectionState.HasUnknown */
                : 2 /* LazyCollectionState.AllKnown */;
        });
        this._onDidChangeInputs = this._register(new Emitter());
        this.onDidChangeInputs = this._onDidChangeInputs.event;
    }
    registerDelegate(delegate) {
        this._delegates.push(delegate);
        this._delegates.sort((a, b) => b.priority - a.priority);
        return {
            dispose: () => {
                const index = this._delegates.indexOf(delegate);
                if (index !== -1) {
                    this._delegates.splice(index, 1);
                }
            },
        };
    }
    registerCollection(collection) {
        const currentCollections = this._collections.get();
        const toReplace = currentCollections.find((c) => c.lazy && c.id === collection.id);
        // Incoming collections replace the "lazy" versions. See `ExtensionMcpDiscovery` for an example.
        if (toReplace) {
            this._lazyCollectionsToUpdate.add(collection.id);
            this._collections.set(currentCollections.map((c) => (c === toReplace ? collection : c)), undefined);
        }
        else {
            this._collections.set([...currentCollections, collection], undefined);
        }
        return {
            dispose: () => {
                const currentCollections = this._collections.get();
                this._collections.set(currentCollections.filter((c) => c !== collection), undefined);
            },
        };
    }
    collectionToolPrefix(collection) {
        return this._collectionToPrefixes.map((p) => p[collection.id] ?? '');
    }
    async discoverCollections() {
        const toDiscover = this._collections.get().filter((c) => c.lazy && !c.lazy.isCached);
        this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() + 1, undefined);
        await Promise.all(toDiscover.map((c) => c.lazy?.load())).finally(() => {
            this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() - 1, undefined);
        });
        const found = [];
        const current = this._collections.get();
        for (const collection of toDiscover) {
            const rec = current.find((c) => c.id === collection.id);
            if (!rec) {
                // ignored
            }
            else if (rec.lazy) {
                rec.lazy.removed?.(); // did not get replaced by the non-lazy version
            }
            else {
                found.push(rec);
            }
        }
        return found;
    }
    _getInputStorage(scope) {
        return scope === 1 /* StorageScope.WORKSPACE */
            ? this._workspaceStorage.value
            : this._profileStorage.value;
    }
    _getInputStorageInConfigTarget(configTarget) {
        return this._getInputStorage(configTarget === 5 /* ConfigurationTarget.WORKSPACE */ ||
            configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
            ? 1 /* StorageScope.WORKSPACE */
            : 0 /* StorageScope.PROFILE */);
    }
    async clearSavedInputs(scope, inputId) {
        const storage = this._getInputStorage(scope);
        if (inputId) {
            await storage.clear(inputId);
        }
        else {
            storage.clearAll();
        }
        this._onDidChangeInputs.fire();
    }
    async editSavedInput(inputId, folderData, configSection, target) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        const stored = await storage.getMap();
        const previous = stored[inputId].value;
        await this._configurationResolverService.resolveWithInteraction(folderData, expr, configSection, previous ? { [inputId.slice(2, -1)]: previous } : {}, target);
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    getSavedInputs(scope) {
        return this._getInputStorage(scope).getMap();
    }
    resetTrust() {
        this._trustMemento.value.set({}, undefined);
    }
    getTrust(collectionRef) {
        return derived((reader) => {
            const collection = this._collections.read(reader).find((c) => c.id === collectionRef.id);
            if (!collection || collection.isTrustedByDefault) {
                return true;
            }
            const memento = this._trustMemento.value.read(reader);
            return memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
        });
    }
    _promptForTrust(collection) {
        // Collect all trust prompts for a single config so that concurrently trying to start N
        // servers in a config don't result in N different dialogs
        let resultPromise = this._trustPrompts.get(collection.id);
        resultPromise ??= this._promptForTrustOpenDialog(collection).finally(() => {
            this._trustPrompts.delete(collection.id);
        });
        this._trustPrompts.set(collection.id, resultPromise);
        return resultPromise;
    }
    async _promptForTrustOpenDialog(collection) {
        const originURI = collection.presentation?.origin;
        const labelWithOrigin = originURI
            ? `[\`${basename(originURI)}\`](${originURI})`
            : collection.label;
        const result = await this._dialogService.prompt({
            message: localize('trustTitleWithOrigin', 'Trust MCP servers from {0}?', collection.label),
            custom: {
                markdownDetails: [
                    {
                        markdown: new MarkdownString(localize('mcp.trust.details', '{0} discovered Model Context Protocol servers from {1} (`{2}`). {0} can use their capabilities in Chat.\n\nDo you want to allow running MCP servers from {3}?', this._productService.nameShort, collection.label, collection.serverDefinitions
                            .get()
                            .map((s) => s.label)
                            .join('`, `'), labelWithOrigin)),
                        dismissOnLinkClick: true,
                    },
                ],
            },
            buttons: [
                { label: localize('mcp.trust.yes', 'Trust'), run: () => true },
                { label: localize('mcp.trust.no', 'Do not trust'), run: () => false },
            ],
        });
        return result.result;
    }
    async _updateStorageWithExpressionInputs(inputStorage, expr) {
        const secrets = {};
        const inputs = {};
        for (const [replacement, resolved] of expr.resolved()) {
            if (resolved.input?.type === 'promptString' && resolved.input.password) {
                secrets[replacement.id] = resolved;
            }
            else {
                inputs[replacement.id] = resolved;
            }
        }
        inputStorage.setPlainText(inputs);
        await inputStorage.setSecrets(secrets);
        this._onDidChangeInputs.fire();
    }
    async _replaceVariablesInLaunch(definition, launch) {
        if (!definition.variableReplacement) {
            return launch;
        }
        const { section, target, folder } = definition.variableReplacement;
        const inputStorage = this._getInputStorageInConfigTarget(target);
        const previouslyStored = await inputStorage.getMap();
        // pre-fill the variables we already resolved to avoid extra prompting
        const expr = ConfigurationResolverExpression.parse(launch);
        for (const replacement of expr.unresolved()) {
            if (previouslyStored.hasOwnProperty(replacement.id)) {
                expr.resolve(replacement, previouslyStored[replacement.id]);
            }
        }
        // resolve variables requiring user input
        await this._configurationResolverService.resolveWithInteraction(folder, expr, section, undefined, target);
        await this._updateStorageWithExpressionInputs(inputStorage, expr);
        // resolve other non-interactive variables, returning the final object
        return await this._configurationResolverService.resolveAsync(folder, expr);
    }
    async resolveConnection({ collectionRef, definitionRef, forceTrust, logger, }) {
        const collection = this._collections.get().find((c) => c.id === collectionRef.id);
        const definition = collection?.serverDefinitions.get().find((s) => s.id === definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found for ${collectionRef.id} and ${definitionRef.id}`);
        }
        const delegate = this._delegates.find((d) => d.canStart(collection, definition));
        if (!delegate) {
            throw new Error('No delegate found that can handle the connection');
        }
        if (!collection.isTrustedByDefault) {
            const memento = this._trustMemento.value.get();
            const trusted = memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
            if (trusted) {
                // continue
            }
            else if (trusted === undefined || forceTrust) {
                const trustValue = await this._promptForTrust(collection);
                if (trustValue !== undefined) {
                    this._trustMemento.value.set({ ...memento, [collection.id]: trustValue }, undefined);
                }
                if (!trustValue) {
                    return;
                }
            } /** trusted === false && !forceTrust */
            else {
                return undefined;
            }
        }
        let launch;
        try {
            launch = await this._replaceVariablesInLaunch(definition, definition.launch);
        }
        catch (e) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('mcp.launchError', 'Error starting {0}: {1}', definition.label, String(e)),
                actions: {
                    primary: collection.presentation?.origin && [
                        {
                            id: 'mcp.launchError.openConfig',
                            class: undefined,
                            enabled: true,
                            tooltip: '',
                            label: localize('mcp.launchError.openConfig', 'Open Configuration'),
                            run: () => this._editorService.openEditor({
                                resource: collection.presentation.origin,
                                options: { selection: definition.presentation?.origin?.range },
                            }),
                        },
                    ],
                },
            });
            return;
        }
        return this._instantiationService.createInstance(McpServerConnection, collection, definition, delegate, launch, logger);
    }
};
McpRegistry = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationResolverService),
    __param(2, IDialogService),
    __param(3, IStorageService),
    __param(4, IProductService),
    __param(5, INotificationService),
    __param(6, IEditorService)
], McpRegistry);
export { McpRegistry };
