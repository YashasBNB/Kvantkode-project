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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDdkgsT0FBTyxFQUNOLCtCQUEr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