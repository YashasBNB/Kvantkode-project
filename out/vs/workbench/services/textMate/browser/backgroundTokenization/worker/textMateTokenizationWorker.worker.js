/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { TMGrammarFactory } from '../../../common/TMGrammarFactory.js';
import { TextMateWorkerTokenizer } from './textMateWorkerTokenizer.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { TextMateWorkerHost } from './textMateWorkerHost.js';
export function create(workerServer) {
    return new TextMateTokenizationWorker(workerServer);
}
export class TextMateTokenizationWorker {
    constructor(workerServer) {
        this._models = new Map();
        this._grammarCache = [];
        this._grammarFactory = Promise.resolve(null);
        this._host = TextMateWorkerHost.getChannel(workerServer);
    }
    async $init(_createData) {
        const grammarDefinitions = _createData.grammarDefinitions.map((def) => {
            return {
                location: URI.revive(def.location),
                language: def.language,
                scopeName: def.scopeName,
                embeddedLanguages: def.embeddedLanguages,
                tokenTypes: def.tokenTypes,
                injectTo: def.injectTo,
                balancedBracketSelectors: def.balancedBracketSelectors,
                unbalancedBracketSelectors: def.unbalancedBracketSelectors,
                sourceExtensionId: def.sourceExtensionId,
            };
        });
        this._grammarFactory = this._loadTMGrammarFactory(grammarDefinitions, _createData.onigurumaWASMUri);
    }
    async _loadTMGrammarFactory(grammarDefinitions, onigurumaWASMUri) {
        const vscodeTextmate = await importAMDNodeModule('vscode-textmate', 'release/main.js');
        const vscodeOniguruma = await importAMDNodeModule('vscode-oniguruma', 'release/main.js');
        const response = await fetch(onigurumaWASMUri);
        // Using the response directly only works if the server sets the MIME type 'application/wasm'.
        // Otherwise, a TypeError is thrown when using the streaming compiler.
        // We therefore use the non-streaming compiler :(.
        const bytes = await response.arrayBuffer();
        await vscodeOniguruma.loadWASM(bytes);
        const onigLib = Promise.resolve({
            createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
            createOnigString: (str) => vscodeOniguruma.createOnigString(str),
        });
        return new TMGrammarFactory({
            logTrace: (msg) => {
                /* console.log(msg) */
            },
            logError: (msg, err) => console.error(msg, err),
            readFile: (resource) => this._host.$readFile(resource),
        }, grammarDefinitions, vscodeTextmate, onigLib);
    }
    // These methods are called by the renderer
    $acceptNewModel(data) {
        const uri = URI.revive(data.uri);
        const that = this;
        this._models.set(data.controllerId, new TextMateWorkerTokenizer(uri, data.lines, data.EOL, data.versionId, {
            async getOrCreateGrammar(languageId, encodedLanguageId) {
                const grammarFactory = await that._grammarFactory;
                if (!grammarFactory) {
                    return Promise.resolve(null);
                }
                if (!that._grammarCache[encodedLanguageId]) {
                    that._grammarCache[encodedLanguageId] = grammarFactory.createGrammar(languageId, encodedLanguageId);
                }
                return that._grammarCache[encodedLanguageId];
            },
            setTokensAndStates(versionId, tokens, stateDeltas) {
                that._host.$setTokensAndStates(data.controllerId, versionId, tokens, stateDeltas);
            },
            reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) {
                that._host.$reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample);
            },
        }, data.languageId, data.encodedLanguageId, data.maxTokenizationLineLength));
    }
    $acceptModelChanged(controllerId, e) {
        this._models.get(controllerId).onEvents(e);
    }
    $retokenize(controllerId, startLineNumber, endLineNumberExclusive) {
        this._models.get(controllerId).retokenize(startLineNumber, endLineNumberExclusive);
    }
    $acceptModelLanguageChanged(controllerId, newLanguageId, newEncodedLanguageId) {
        this._models.get(controllerId).onLanguageId(newLanguageId, newEncodedLanguageId);
    }
    $acceptRemovedModel(controllerId) {
        const model = this._models.get(controllerId);
        if (model) {
            model.dispose();
            this._models.delete(controllerId);
        }
    }
    async $acceptTheme(theme, colorMap) {
        const grammarFactory = await this._grammarFactory;
        grammarFactory?.setTheme(theme, colorMap);
    }
    $acceptMaxTokenizationLineLength(controllerId, value) {
        this._models.get(controllerId).acceptMaxTokenizationLineLength(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi93b3JrZXIvdGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sc0NBQXNDLENBQUE7QUFHekUsT0FBTyxFQUF3QixnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBTzVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBSy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTVELE1BQU0sVUFBVSxNQUFNLENBQUMsWUFBOEI7SUFDcEQsT0FBTyxJQUFJLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3BELENBQUM7QUF5QkQsTUFBTSxPQUFPLDBCQUEwQjtJQVF0QyxZQUFZLFlBQThCO1FBSnpCLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBc0QsQ0FBQTtRQUN2RSxrQkFBYSxHQUFvQyxFQUFFLENBQUE7UUFDNUQsb0JBQWUsR0FBcUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUdoRixJQUFJLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUF3QjtRQUMxQyxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFH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