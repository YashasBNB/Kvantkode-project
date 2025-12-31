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
import { Emitter } from '../../../base/common/event.js';
import { Disposable, markAsSingleton, toDisposable, } from '../../../base/common/lifecycle.js';
import * as strings from '../../../base/common/strings.js';
import { DEFAULT_WORD_REGEXP, ensureValidWordDefinition } from '../core/wordHelper.js';
import { AutoClosingPairs, } from './languageConfiguration.js';
import { CharacterPairSupport } from './supports/characterPair.js';
import { BracketElectricCharacterSupport } from './supports/electricCharacter.js';
import { IndentRulesSupport } from './supports/indentRules.js';
import { OnEnterSupport } from './supports/onEnter.js';
import { RichEditBrackets } from './supports/richEditBrackets.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILanguageService } from './language.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { PLAINTEXT_LANGUAGE_ID } from './modesRegistry.js';
import { LanguageBracketsConfiguration } from './supports/languageBracketsConfiguration.js';
export class LanguageConfigurationServiceChangeEvent {
    constructor(languageId) {
        this.languageId = languageId;
    }
    affects(languageId) {
        return !this.languageId ? true : this.languageId === languageId;
    }
}
export const ILanguageConfigurationService = createDecorator('languageConfigurationService');
let LanguageConfigurationService = class LanguageConfigurationService extends Disposable {
    constructor(configurationService, languageService) {
        super();
        this.configurationService = configurationService;
        this.languageService = languageService;
        this._registry = this._register(new LanguageConfigurationRegistry());
        this.onDidChangeEmitter = this._register(new Emitter());
        this.onDidChange = this.onDidChangeEmitter.event;
        this.configurations = new Map();
        const languageConfigKeys = new Set(Object.values(customizedLanguageConfigKeys));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            const globalConfigChanged = e.change.keys.some((k) => languageConfigKeys.has(k));
            const localConfigChanged = e.change.overrides
                .filter(([overrideLangName, keys]) => keys.some((k) => languageConfigKeys.has(k)))
                .map(([overrideLangName]) => overrideLangName);
            if (globalConfigChanged) {
                this.configurations.clear();
                this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(undefined));
            }
            else {
                for (const languageId of localConfigChanged) {
                    if (this.languageService.isRegisteredLanguageId(languageId)) {
                        this.configurations.delete(languageId);
                        this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(languageId));
                    }
                }
            }
        }));
        this._register(this._registry.onDidChange((e) => {
            this.configurations.delete(e.languageId);
            this.onDidChangeEmitter.fire(new LanguageConfigurationServiceChangeEvent(e.languageId));
        }));
    }
    register(languageId, configuration, priority) {
        return this._registry.register(languageId, configuration, priority);
    }
    getLanguageConfiguration(languageId) {
        let result = this.configurations.get(languageId);
        if (!result) {
            result = computeConfig(languageId, this._registry, this.configurationService, this.languageService);
            this.configurations.set(languageId, result);
        }
        return result;
    }
};
LanguageConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILanguageService)
], LanguageConfigurationService);
export { LanguageConfigurationService };
function computeConfig(languageId, registry, configurationService, languageService) {
    let languageConfig = registry.getLanguageConfiguration(languageId);
    if (!languageConfig) {
        if (!languageService.isRegisteredLanguageId(languageId)) {
            // this happens for the null language, which can be returned by monarch.
            // Instead of throwing an error, we just return a default config.
            return new ResolvedLanguageConfiguration(languageId, {});
        }
        languageConfig = new ResolvedLanguageConfiguration(languageId, {});
    }
    const customizedConfig = getCustomizedLanguageConfig(languageConfig.languageId, configurationService);
    const data = combineLanguageConfigurations([languageConfig.underlyingConfig, customizedConfig]);
    const config = new ResolvedLanguageConfiguration(languageConfig.languageId, data);
    return config;
}
const customizedLanguageConfigKeys = {
    brackets: 'editor.language.brackets',
    colorizedBracketPairs: 'editor.language.colorizedBracketPairs',
};
function getCustomizedLanguageConfig(languageId, configurationService) {
    const brackets = configurationService.getValue(customizedLanguageConfigKeys.brackets, {
        overrideIdentifier: languageId,
    });
    const colorizedBracketPairs = configurationService.getValue(customizedLanguageConfigKeys.colorizedBracketPairs, {
        overrideIdentifier: languageId,
    });
    return {
        brackets: validateBracketPairs(brackets),
        colorizedBracketPairs: validateBracketPairs(colorizedBracketPairs),
    };
}
function validateBracketPairs(data) {
    if (!Array.isArray(data)) {
        return undefined;
    }
    return data
        .map((pair) => {
        if (!Array.isArray(pair) || pair.length !== 2) {
            return undefined;
        }
        return [pair[0], pair[1]];
    })
        .filter((p) => !!p);
}
export function getIndentationAtPosition(model, lineNumber, column) {
    const lineText = model.getLineContent(lineNumber);
    let indentation = strings.getLeadingWhitespace(lineText);
    if (indentation.length > column - 1) {
        indentation = indentation.substring(0, column - 1);
    }
    return indentation;
}
class ComposedLanguageConfiguration {
    constructor(languageId) {
        this.languageId = languageId;
        this._resolved = null;
        this._entries = [];
        this._order = 0;
        this._resolved = null;
    }
    register(configuration, priority) {
        const entry = new LanguageConfigurationContribution(configuration, priority, ++this._order);
        this._entries.push(entry);
        this._resolved = null;
        return markAsSingleton(toDisposable(() => {
            for (let i = 0; i < this._entries.length; i++) {
                if (this._entries[i] === entry) {
                    this._entries.splice(i, 1);
                    this._resolved = null;
                    break;
                }
            }
        }));
    }
    getResolvedConfiguration() {
        if (!this._resolved) {
            const config = this._resolve();
            if (config) {
                this._resolved = new ResolvedLanguageConfiguration(this.languageId, config);
            }
        }
        return this._resolved;
    }
    _resolve() {
        if (this._entries.length === 0) {
            return null;
        }
        this._entries.sort(LanguageConfigurationContribution.cmp);
        return combineLanguageConfigurations(this._entries.map((e) => e.configuration));
    }
}
function combineLanguageConfigurations(configs) {
    let result = {
        comments: undefined,
        brackets: undefined,
        wordPattern: undefined,
        indentationRules: undefined,
        onEnterRules: undefined,
        autoClosingPairs: undefined,
        surroundingPairs: undefined,
        autoCloseBefore: undefined,
        folding: undefined,
        colorizedBracketPairs: undefined,
        __electricCharacterSupport: undefined,
    };
    for (const entry of configs) {
        result = {
            comments: entry.comments || result.comments,
            brackets: entry.brackets || result.brackets,
            wordPattern: entry.wordPattern || result.wordPattern,
            indentationRules: entry.indentationRules || result.indentationRules,
            onEnterRules: entry.onEnterRules || result.onEnterRules,
            autoClosingPairs: entry.autoClosingPairs || result.autoClosingPairs,
            surroundingPairs: entry.surroundingPairs || result.surroundingPairs,
            autoCloseBefore: entry.autoCloseBefore || result.autoCloseBefore,
            folding: entry.folding || result.folding,
            colorizedBracketPairs: entry.colorizedBracketPairs || result.colorizedBracketPairs,
            __electricCharacterSupport: entry.__electricCharacterSupport || result.__electricCharacterSupport,
        };
    }
    return result;
}
class LanguageConfigurationContribution {
    constructor(configuration, priority, order) {
        this.configuration = configuration;
        this.priority = priority;
        this.order = order;
    }
    static cmp(a, b) {
        if (a.priority === b.priority) {
            // higher order last
            return a.order - b.order;
        }
        // higher priority last
        return a.priority - b.priority;
    }
}
export class LanguageConfigurationChangeEvent {
    constructor(languageId) {
        this.languageId = languageId;
    }
}
export class LanguageConfigurationRegistry extends Disposable {
    constructor() {
        super();
        this._entries = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.register(PLAINTEXT_LANGUAGE_ID, {
            brackets: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '\"', close: '\"' },
                { open: "'", close: "'" },
                { open: '`', close: '`' },
            ],
            colorizedBracketPairs: [],
            folding: {
                offSide: true,
            },
        }, 0));
    }
    /**
     * @param priority Use a higher number for higher priority
     */
    register(languageId, configuration, priority = 0) {
        let entries = this._entries.get(languageId);
        if (!entries) {
            entries = new ComposedLanguageConfiguration(languageId);
            this._entries.set(languageId, entries);
        }
        const disposable = entries.register(configuration, priority);
        this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageId));
        return markAsSingleton(toDisposable(() => {
            disposable.dispose();
            this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageId));
        }));
    }
    getLanguageConfiguration(languageId) {
        const entries = this._entries.get(languageId);
        return entries?.getResolvedConfiguration() || null;
    }
}
/**
 * Immutable.
 */
export class ResolvedLanguageConfiguration {
    constructor(languageId, underlyingConfig) {
        this.languageId = languageId;
        this.underlyingConfig = underlyingConfig;
        this._brackets = null;
        this._electricCharacter = null;
        this._onEnterSupport =
            this.underlyingConfig.brackets ||
                this.underlyingConfig.indentationRules ||
                this.underlyingConfig.onEnterRules
                ? new OnEnterSupport(this.underlyingConfig)
                : null;
        this.comments = ResolvedLanguageConfiguration._handleComments(this.underlyingConfig);
        this.characterPair = new CharacterPairSupport(this.underlyingConfig);
        this.wordDefinition = this.underlyingConfig.wordPattern || DEFAULT_WORD_REGEXP;
        this.indentationRules = this.underlyingConfig.indentationRules;
        if (this.underlyingConfig.indentationRules) {
            this.indentRulesSupport = new IndentRulesSupport(this.underlyingConfig.indentationRules);
        }
        else {
            this.indentRulesSupport = null;
        }
        this.foldingRules = this.underlyingConfig.folding || {};
        this.bracketsNew = new LanguageBracketsConfiguration(languageId, this.underlyingConfig);
    }
    getWordDefinition() {
        return ensureValidWordDefinition(this.wordDefinition);
    }
    get brackets() {
        if (!this._brackets && this.underlyingConfig.brackets) {
            this._brackets = new RichEditBrackets(this.languageId, this.underlyingConfig.brackets);
        }
        return this._brackets;
    }
    get electricCharacter() {
        if (!this._electricCharacter) {
            this._electricCharacter = new BracketElectricCharacterSupport(this.brackets);
        }
        return this._electricCharacter;
    }
    onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText) {
        if (!this._onEnterSupport) {
            return null;
        }
        return this._onEnterSupport.onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText);
    }
    getAutoClosingPairs() {
        return new AutoClosingPairs(this.characterPair.getAutoClosingPairs());
    }
    getAutoCloseBeforeSet(forQuotes) {
        return this.characterPair.getAutoCloseBeforeSet(forQuotes);
    }
    getSurroundingPairs() {
        return this.characterPair.getSurroundingPairs();
    }
    static _handleComments(conf) {
        const commentRule = conf.comments;
        if (!commentRule) {
            return null;
        }
        // comment configuration
        const comments = {};
        if (commentRule.lineComment) {
            comments.lineCommentToken = commentRule.lineComment;
        }
        if (commentRule.blockComment) {
            const [blockStart, blockEnd] = commentRule.blockComment;
            comments.blockCommentStartToken = blockStart;
            comments.blockCommentEndToken = blockEnd;
        }
        return comments;
    }
}
registerSingleton(ILanguageConfigurationService, LanguageConfigurationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9sYW5ndWFnZUNvbmZpZ3VyYXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsRUFFVixlQUFlLEVBQ2YsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN0RixPQUFPLEVBTU4sZ0JBQWdCLEdBR2hCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDaEQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxx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