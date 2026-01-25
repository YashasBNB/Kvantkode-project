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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3dvcmtlci90ZXh0TWF0ZVRva2VuaXphdGlvbldvcmtlci53b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd6RSxPQUFPLEVBQXdCLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFPNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFLL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxZQUE4QjtJQUNwRCxPQUFPLElBQUksMEJBQTBCLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDcEQsQ0FBQztBQXlCRCxNQUFNLE9BQU8sMEJBQTBCO0lBUXRDLFlBQVksWUFBOEI7UUFKekIsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFzRCxDQUFBO1FBQ3ZFLGtCQUFhLEdBQW9DLEVBQUUsQ0FBQTtRQUM1RCxvQkFBZSxHQUFxQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBR2hGLElBQUksQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQXdCO1FBQzFDLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLGtCQUFrQixDQUFD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