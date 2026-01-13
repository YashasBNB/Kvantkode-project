/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TMScopeRegistry, } from './TMScopeRegistry.js';
export const missingTMGrammarErrorMessage = 'No TM Grammar registered for this language.';
export class TMGrammarFactory extends Disposable {
    constructor(host, grammarDefinitions, vscodeTextmate, onigLib) {
        super();
        this._host = host;
        this._initialState = vscodeTextmate.INITIAL;
        this._scopeRegistry = new TMScopeRegistry();
        this._injections = {};
        this._injectedEmbeddedLanguages = {};
        this._languageToScope = new Map();
        this._grammarRegistry = this._register(new vscodeTextmate.Registry({
            onigLib: onigLib,
            loadGrammar: async (scopeName) => {
                const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
                if (!grammarDefinition) {
                    this._host.logTrace(`No grammar found for scope ${scopeName}`);
                    return null;
                }
                const location = grammarDefinition.location;
                try {
                    const content = await this._host.readFile(location);
                    return vscodeTextmate.parseRawGrammar(content, location.path);
                }
                catch (e) {
                    this._host.logError(`Unable to load and parse grammar for scope ${scopeName} from ${location}`, e);
                    return null;
                }
            },
            getInjections: (scopeName) => {
                const scopeParts = scopeName.split('.');
                let injections = [];
                for (let i = 1; i <= scopeParts.length; i++) {
                    const subScopeName = scopeParts.slice(0, i).join('.');
                    injections = [...injections, ...(this._injections[subScopeName] || [])];
                }
                return injections;
            },
        }));
        for (const validGrammar of grammarDefinitions) {
            this._scopeRegistry.register(validGrammar);
            if (validGrammar.injectTo) {
                for (const injectScope of validGrammar.injectTo) {
                    let injections = this._injections[injectScope];
                    if (!injections) {
                        this._injections[injectScope] = injections = [];
                    }
                    injections.push(validGrammar.scopeName);
                }
                if (validGrammar.embeddedLanguages) {
                    for (const injectScope of validGrammar.injectTo) {
                        let injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[injectScope];
                        if (!injectedEmbeddedLanguages) {
                            this._injectedEmbeddedLanguages[injectScope] = injectedEmbeddedLanguages = [];
                        }
                        injectedEmbeddedLanguages.push(validGrammar.embeddedLanguages);
                    }
                }
            }
            if (validGrammar.language) {
                this._languageToScope.set(validGrammar.language, validGrammar.scopeName);
            }
        }
    }
    has(languageId) {
        return this._languageToScope.has(languageId);
    }
    setTheme(theme, colorMap) {
        this._grammarRegistry.setTheme(theme, colorMap);
    }
    getColorMap() {
        return this._grammarRegistry.getColorMap();
    }
    async createGrammar(languageId, encodedLanguageId) {
        const scopeName = this._languageToScope.get(languageId);
        if (typeof scopeName !== 'string') {
            // No TM grammar defined
            throw new Error(missingTMGrammarErrorMessage);
        }
        const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
        if (!grammarDefinition) {
            // No TM grammar defined
            throw new Error(missingTMGrammarErrorMessage);
        }
        const embeddedLanguages = grammarDefinition.embeddedLanguages;
        if (this._injectedEmbeddedLanguages[scopeName]) {
            const injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[scopeName];
            for (const injected of injectedEmbeddedLanguages) {
                for (const scope of Object.keys(injected)) {
                    embeddedLanguages[scope] = injected[scope];
                }
            }
        }
        const containsEmbeddedLanguages = Object.keys(embeddedLanguages).length > 0;
        let grammar;
        try {
            grammar = await this._grammarRegistry.loadGrammarWithConfiguration(scopeName, encodedLanguageId, {
                embeddedLanguages,
                tokenTypes: grammarDefinition.tokenTypes,
                balancedBracketSelectors: grammarDefinition.balancedBracketSelectors,
                unbalancedBracketSelectors: grammarDefinition.unbalancedBracketSelectors,
            });
        }
        catch (err) {
            if (err.message && err.message.startsWith('No grammar provided for')) {
                // No TM grammar defined
                throw new Error(missingTMGrammarErrorMessage);
            }
            throw err;
        }
        return {
            languageId: languageId,
            grammar: grammar,
            initialState: this._initialState,
            containsEmbeddedLanguages: containsEmbeddedLanguages,
            sourceExtensionId: grammarDefinition.sourceExtensionId,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2NvbW1vbi9UTUdyYW1tYXJGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBR04sZUFBZSxHQUNmLE1BQU0sc0JBQXNCLENBQUE7QUFpQjdCLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLDZDQUE2QyxDQUFBO0FBRXpGLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBUy9DLFlBQ0MsSUFBMkIsRUFDM0Isa0JBQTZDLEVBQzdDLGNBQWdELEVBQ2hELE9BQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFBO1FBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtRQUNyQixJQUFJLENBQUMsMEJBQTBCLEdBQUcsRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUNqRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckMsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDO1lBQzNCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFdBQVcsRUFBRSxLQUFLLEVBQUUsU0FBaUIsRUFBRSxFQUFFO2dCQUN4QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFj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