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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9jb21tb24vVE1HcmFtbWFyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUdOLGVBQWUsR0FDZixNQUFNLHNCQUFzQixDQUFBO0FBaUI3QixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw2Q0FBNkMsQ0FBQTtBQUV6RixNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQVMvQyxZQUNDLElBQTJCLEVBQzNCLGtCQUE2QyxFQUM3QyxjQUFnRCxFQUNoRCxPQUEwQjtRQUUxQixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxhQUFhLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQTtRQUMzQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDM0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLDBCQUEwQixHQUFHLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDakQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JDLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQztZQUMzQixPQUFPLEVBQUUsT0FBTztZQUNoQixXQUFXLEVBQUUsS0FBSyxFQUFFLFNBQWlCLEVBQUUsRUFBRTtnQkFDeEMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLFNBQVMs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