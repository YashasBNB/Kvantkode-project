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
var AbstractCommandsQuickAccessProvider_1, CommandsHistory_1;
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { matchesContiguousSubString, matchesPrefix, matchesWords, or, } from '../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LRUCache } from '../../../base/common/map.js';
import { TfIdfCalculator, normalizeTfIdfScores } from '../../../base/common/tfIdf.js';
import { localize } from '../../../nls.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IConfigurationService, } from '../../configuration/common/configuration.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ILogService } from '../../log/common/log.js';
import { PickerQuickAccessProvider, } from './pickerQuickAccess.js';
import { IStorageService, WillSaveStateReason, } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let AbstractCommandsQuickAccessProvider = class AbstractCommandsQuickAccessProvider extends PickerQuickAccessProvider {
    static { AbstractCommandsQuickAccessProvider_1 = this; }
    static { this.PREFIX = '>'; }
    static { this.TFIDF_THRESHOLD = 0.5; }
    static { this.TFIDF_MAX_RESULTS = 5; }
    static { this.WORD_FILTER = or(matchesPrefix, matchesWords, matchesContiguousSubString); }
    constructor(options, instantiationService, keybindingService, commandService, telemetryService, dialogService) {
        super(AbstractCommandsQuickAccessProvider_1.PREFIX, options);
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.dialogService = dialogService;
        this.commandsHistory = this._register(this.instantiationService.createInstance(CommandsHistory));
        this.options = options;
    }
    async _getPicks(filter, _disposables, token, runOptions) {
        // Ask subclass for all command picks
        const allCommandPicks = await this.getCommandPicks(token);
        if (token.isCancellationRequested) {
            return [];
        }
        const runTfidf = createSingleCallFunction(() => {
            const tfidf = new TfIdfCalculator();
            tfidf.updateDocuments(allCommandPicks.map((commandPick) => ({
                key: commandPick.commandId,
                textChunks: [this.getTfIdfChunk(commandPick)],
            })));
            const result = tfidf.calculateScores(filter, token);
            return normalizeTfIdfScores(result)
                .filter((score) => score.score > AbstractCommandsQuickAccessProvider_1.TFIDF_THRESHOLD)
                .slice(0, AbstractCommandsQuickAccessProvider_1.TFIDF_MAX_RESULTS);
        });
        // Filter
        const filteredCommandPicks = [];
        for (const commandPick of allCommandPicks) {
            const labelHighlights = AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.label) ?? undefined;
            const aliasHighlights = commandPick.commandAlias
                ? (AbstractCommandsQuickAccessProvider_1.WORD_FILTER(filter, commandPick.commandAlias) ??
                    undefined)
                : undefined;
            // Add if matching in label or alias
            if (labelHighlights || aliasHighlights) {
                commandPick.highlights = {
                    label: labelHighlights,
                    detail: this.options.showAlias ? aliasHighlights : undefined,
                };
                filteredCommandPicks.push(commandPick);
            }
            // Also add if we have a 100% command ID match
            else if (filter === commandPick.commandId) {
                filteredCommandPicks.push(commandPick);
            }
            // Handle tf-idf scoring for the rest if there's a filter
            else if (filter.length >= 3) {
                const tfidf = runTfidf();
                if (token.isCancellationRequested) {
                    return [];
                }
                // Add if we have a tf-idf score
                const tfidfScore = tfidf.find((score) => score.key === commandPick.commandId);
                if (tfidfScore) {
                    commandPick.tfIdfScore = tfidfScore.score;
                    filteredCommandPicks.push(commandPick);
                }
            }
        }
        // Add description to commands that have duplicate labels
        const mapLabelToCommand = new Map();
        for (const commandPick of filteredCommandPicks) {
            const existingCommandForLabel = mapLabelToCommand.get(commandPick.label);
            if (existingCommandForLabel) {
                commandPick.description = commandPick.commandId;
                existingCommandForLabel.description = existingCommandForLabel.commandId;
            }
            else {
                mapLabelToCommand.set(commandPick.label, commandPick);
            }
        }
        // Sort by MRU order and fallback to name otherwise
        filteredCommandPicks.sort((commandPickA, commandPickB) => {
            // If a result came from tf-idf, we want to put that towards the bottom
            if (commandPickA.tfIdfScore && commandPickB.tfIdfScore) {
                if (commandPickA.tfIdfScore === commandPickB.tfIdfScore) {
                    return commandPickA.label.localeCompare(commandPickB.label); // prefer lexicographically smaller command
                }
                return commandPickB.tfIdfScore - commandPickA.tfIdfScore; // prefer higher tf-idf score
            }
            else if (commandPickA.tfIdfScore) {
                return 1; // first command has a score but other doesn't so other wins
            }
            else if (commandPickB.tfIdfScore) {
                return -1; // other command has a score but first doesn't so first wins
            }
            const commandACounter = this.commandsHistory.peek(commandPickA.commandId);
            const commandBCounter = this.commandsHistory.peek(commandPickB.commandId);
            if (commandACounter && commandBCounter) {
                return commandACounter > commandBCounter ? -1 : 1; // use more recently used command before older
            }
            if (commandACounter) {
                return -1; // first command was used, so it wins over the non used one
            }
            if (commandBCounter) {
                return 1; // other command was used so it wins over the command
            }
            if (this.options.suggestedCommandIds) {
                const commandASuggestion = this.options.suggestedCommandIds.has(commandPickA.commandId);
                const commandBSuggestion = this.options.suggestedCommandIds.has(commandPickB.commandId);
                if (commandASuggestion && commandBSuggestion) {
                    return 0; // honor the order of the array
                }
                if (commandASuggestion) {
                    return -1; // first command was suggested, so it wins over the non suggested one
                }
                if (commandBSuggestion) {
                    return 1; // other command was suggested so it wins over the command
                }
            }
            // both commands were never used, so we sort by name
            return commandPickA.label.localeCompare(commandPickB.label);
        });
        const commandPicks = [];
        let addOtherSeparator = false;
        let addSuggestedSeparator = true;
        let addCommonlyUsedSeparator = !!this.options.suggestedCommandIds;
        for (let i = 0; i < filteredCommandPicks.length; i++) {
            const commandPick = filteredCommandPicks[i];
            // Separator: recently used
            if (i === 0 && this.commandsHistory.peek(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('recentlyUsed', 'recently used') });
                addOtherSeparator = true;
            }
            if (addSuggestedSeparator && commandPick.tfIdfScore !== undefined) {
                commandPicks.push({ type: 'separator', label: localize('suggested', 'similar commands') });
                addSuggestedSeparator = false;
            }
            // Separator: commonly used
            if (addCommonlyUsedSeparator &&
                commandPick.tfIdfScore === undefined &&
                !this.commandsHistory.peek(commandPick.commandId) &&
                this.options.suggestedCommandIds?.has(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('commonlyUsed', 'commonly used') });
                addOtherSeparator = true;
                addCommonlyUsedSeparator = false;
            }
            // Separator: other commands
            if (addOtherSeparator &&
                commandPick.tfIdfScore === undefined &&
                !this.commandsHistory.peek(commandPick.commandId) &&
                !this.options.suggestedCommandIds?.has(commandPick.commandId)) {
                commandPicks.push({ type: 'separator', label: localize('morecCommands', 'other commands') });
                addOtherSeparator = false;
            }
            // Command
            commandPicks.push(this.toCommandPick(commandPick, runOptions));
        }
        if (!this.hasAdditionalCommandPicks(filter, token)) {
            return commandPicks;
        }
        return {
            picks: commandPicks,
            additionalPicks: (async () => {
                const additionalCommandPicks = await this.getAdditionalCommandPicks(allCommandPicks, filteredCommandPicks, filter, token);
                if (token.isCancellationRequested) {
                    return [];
                }
                const commandPicks = additionalCommandPicks.map((commandPick) => this.toCommandPick(commandPick, runOptions));
                // Basically, if we haven't already added a separator, we add one before the additional picks so long
                // as one hasn't been added to the start of the array.
                if (addSuggestedSeparator && commandPicks[0]?.type !== 'separator') {
                    commandPicks.unshift({
                        type: 'separator',
                        label: localize('suggested', 'similar commands'),
                    });
                }
                return commandPicks;
            })(),
        };
    }
    toCommandPick(commandPick, runOptions) {
        if (commandPick.type === 'separator') {
            return commandPick;
        }
        const keybinding = this.keybindingService.lookupKeybinding(commandPick.commandId);
        const ariaLabel = keybinding
            ? localize('commandPickAriaLabelWithKeybinding', '{0}, {1}', commandPick.label, keybinding.getAriaLabel())
            : commandPick.label;
        return {
            ...commandPick,
            ariaLabel,
            detail: this.options.showAlias && commandPick.commandAlias !== commandPick.label
                ? commandPick.commandAlias
                : undefined,
            keybinding,
            accept: async () => {
                // Add to history
                this.commandsHistory.push(commandPick.commandId);
                // Telementry
                this.telemetryService.publicLog2('workbenchActionExecuted', {
                    id: commandPick.commandId,
                    from: runOptions?.from ?? 'quick open',
                });
                // Run
                try {
                    commandPick.args?.length
                        ? await this.commandService.executeCommand(commandPick.commandId, ...commandPick.args)
                        : await this.commandService.executeCommand(commandPick.commandId);
                }
                catch (error) {
                    if (!isCancellationError(error)) {
                        this.dialogService.error(localize('canNotRun', "Command '{0}' resulted in an error", commandPick.label), toErrorMessage(error));
                    }
                }
            },
        };
    }
    // TF-IDF string to be indexed
    getTfIdfChunk({ label, commandAlias, commandDescription }) {
        let chunk = label;
        if (commandAlias && commandAlias !== label) {
            chunk += ` - ${commandAlias}`;
        }
        if (commandDescription && commandDescription.value !== label) {
            // If the original is the same as the value, don't add it
            chunk += ` - ${commandDescription.value === commandDescription.original ? commandDescription.value : `${commandDescription.value} (${commandDescription.original})`}`;
        }
        return chunk;
    }
};
AbstractCommandsQuickAccessProvider = AbstractCommandsQuickAccessProvider_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, IDialogService)
], AbstractCommandsQuickAccessProvider);
export { AbstractCommandsQuickAccessProvider };
let CommandsHistory = class CommandsHistory extends Disposable {
    static { CommandsHistory_1 = this; }
    static { this.DEFAULT_COMMANDS_HISTORY_LENGTH = 50; }
    static { this.PREF_KEY_CACHE = 'commandPalette.mru.cache'; }
    static { this.PREF_KEY_COUNTER = 'commandPalette.mru.counter'; }
    static { this.counter = 1; }
    static { this.hasChanges = false; }
    constructor(storageService, configurationService, logService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.configuredCommandsHistoryLength = 0;
        this.updateConfiguration();
        this.load();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.updateConfiguration(e)));
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                // Commands history is very dynamic and so we limit impact
                // on storage to only save on shutdown. This helps reduce
                // the overhead of syncing this data across machines.
                this.saveState();
            }
        }));
    }
    updateConfiguration(e) {
        if (e && !e.affectsConfiguration('workbench.commandPalette.history')) {
            return;
        }
        this.configuredCommandsHistoryLength = CommandsHistory_1.getConfiguredCommandHistoryLength(this.configurationService);
        if (CommandsHistory_1.cache &&
            CommandsHistory_1.cache.limit !== this.configuredCommandsHistoryLength) {
            CommandsHistory_1.cache.limit = this.configuredCommandsHistoryLength;
            CommandsHistory_1.hasChanges = true;
        }
    }
    load() {
        const raw = this.storageService.get(CommandsHistory_1.PREF_KEY_CACHE, 0 /* StorageScope.PROFILE */);
        let serializedCache;
        if (raw) {
            try {
                serializedCache = JSON.parse(raw);
            }
            catch (error) {
                this.logService.error(`[CommandsHistory] invalid data: ${error}`);
            }
        }
        const cache = (CommandsHistory_1.cache = new LRUCache(this.configuredCommandsHistoryLength, 1));
        if (serializedCache) {
            let entries;
            if (serializedCache.usesLRU) {
                entries = serializedCache.entries;
            }
            else {
                entries = serializedCache.entries.sort((a, b) => a.value - b.value);
            }
            entries.forEach((entry) => cache.set(entry.key, entry.value));
        }
        CommandsHistory_1.counter = this.storageService.getNumber(CommandsHistory_1.PREF_KEY_COUNTER, 0 /* StorageScope.PROFILE */, CommandsHistory_1.counter);
    }
    push(commandId) {
        if (!CommandsHistory_1.cache) {
            return;
        }
        CommandsHistory_1.cache.set(commandId, CommandsHistory_1.counter++); // set counter to command
        CommandsHistory_1.hasChanges = true;
    }
    peek(commandId) {
        return CommandsHistory_1.cache?.peek(commandId);
    }
    saveState() {
        if (!CommandsHistory_1.cache) {
            return;
        }
        if (!CommandsHistory_1.hasChanges) {
            return;
        }
        const serializedCache = { usesLRU: true, entries: [] };
        CommandsHistory_1.cache.forEach((value, key) => serializedCache.entries.push({ key, value }));
        this.storageService.store(CommandsHistory_1.PREF_KEY_CACHE, JSON.stringify(serializedCache), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.storageService.store(CommandsHistory_1.PREF_KEY_COUNTER, CommandsHistory_1.counter, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        CommandsHistory_1.hasChanges = false;
    }
    static getConfiguredCommandHistoryLength(configurationService) {
        const config = configurationService.getValue();
        const configuredCommandHistoryLength = config.workbench?.commandPalette?.history;
        if (typeof configuredCommandHistoryLength === 'number') {
            return configuredCommandHistoryLength;
        }
        return CommandsHistory_1.DEFAULT_COMMANDS_HISTORY_LENGTH;
    }
    static clearHistory(configurationService, storageService) {
        const commandHistoryLength = CommandsHistory_1.getConfiguredCommandHistoryLength(configurationService);
        CommandsHistory_1.cache = new LRUCache(commandHistoryLength);
        CommandsHistory_1.counter = 1;
        CommandsHistory_1.hasChanges = true;
    }
};
CommandsHistory = CommandsHistory_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], CommandsHistory);
export { CommandsHistory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL2NvbW1hbmRzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBT2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGFBQWEsRUFDYixZQUFZLEVBQ1osRUFBRSxHQUNGLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBZ0MsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENB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