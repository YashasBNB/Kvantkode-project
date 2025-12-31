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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9jb21tYW5kc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQU9oRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsWUFBWSxFQUNaLEVBQUUsR0FDRixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQWdDLE1BQU0sbUNBQW1DLENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFJTix5QkFB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