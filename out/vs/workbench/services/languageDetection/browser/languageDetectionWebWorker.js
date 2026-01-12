/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../amdX.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { LanguageDetectionWorkerHost, } from './languageDetectionWorker.protocol.js';
import { WorkerTextModelSyncServer } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
export function create(workerServer) {
    return new LanguageDetectionWorker(workerServer);
}
/**
 * @internal
 */
export class LanguageDetectionWorker {
    static { this.expectedRelativeConfidence = 0.2; }
    static { this.positiveConfidenceCorrectionBucket1 = 0.05; }
    static { this.positiveConfidenceCorrectionBucket2 = 0.025; }
    static { this.negativeConfidenceCorrection = 0.5; }
    constructor(workerServer) {
        this._workerTextModelSyncServer = new WorkerTextModelSyncServer();
        this._regexpLoadFailed = false;
        this._loadFailed = false;
        this.modelIdToCoreId = new Map();
        this._host = LanguageDetectionWorkerHost.getChannel(workerServer);
        this._workerTextModelSyncServer.bindToServer(workerServer);
    }
    async $detectLanguage(uri, langBiases, preferHistory, supportedLangs) {
        const languages = [];
        const confidences = [];
        const stopWatch = new StopWatch();
        const documentTextSample = this.getTextForDetection(uri);
        if (!documentTextSample) {
            return;
        }
        const neuralResolver = async () => {
            for await (const language of this.detectLanguagesImpl(documentTextSample)) {
                if (!this.modelIdToCoreId.has(language.languageId)) {
                    this.modelIdToCoreId.set(language.languageId, await this._host.$getLanguageId(language.languageId));
                }
                const coreId = this.modelIdToCoreId.get(language.languageId);
                if (coreId && (!supportedLangs?.length || supportedLangs.includes(coreId))) {
                    languages.push(coreId);
                    confidences.push(language.confidence);
                }
            }
            stopWatch.stop();
            if (languages.length) {
                this._host.$sendTelemetryEvent(languages, confidences, stopWatch.elapsed());
                return languages[0];
            }
            return undefined;
        };
        const historicalResolver = async () => this.runRegexpModel(documentTextSample, langBiases ?? {}, supportedLangs);
        if (preferHistory) {
            const history = await historicalResolver();
            if (history) {
                return history;
            }
            const neural = await neuralResolver();
            if (neural) {
                return neural;
            }
        }
        else {
            const neural = await neuralResolver();
            if (neural) {
                return neural;
            }
            const history = await historicalResolver();
            if (history) {
                return history;
            }
        }
        return undefined;
    }
    getTextForDetection(uri) {
        const editorModel = this._workerTextModelSyncServer.getModel(uri);
        if (!editorModel) {
            return;
        }
        const end = editorModel.positionAt(10000);
        const content = editorModel.getValueInRange({
            startColumn: 1,
            startLineNumber: 1,
            endColumn: end.column,
            endLineNumber: end.lineNumber,
        });
        return content;
    }
    async getRegexpModel() {
        if (this._regexpLoadFailed) {
            return;
        }
        if (this._regexpModel) {
            return this._regexpModel;
        }
        const uri = await this._host.$getRegexpModelUri();
        try {
            this._regexpModel = (await importAMDNodeModule(uri, ''));
            return this._regexpModel;
        }
        catch (e) {
            this._regexpLoadFailed = true;
            // console.warn('error loading language detection model', e);
            return;
        }
    }
    async runRegexpModel(content, langBiases, supportedLangs) {
        const regexpModel = await this.getRegexpModel();
        if (!regexpModel) {
            return;
        }
        if (supportedLangs?.length) {
            // When using supportedLangs, normally computed biases are too extreme. Just use a "bitmask" of sorts.
            for (const lang of Object.keys(langBiases)) {
                if (supportedLangs.includes(lang)) {
                    langBiases[lang] = 1;
                }
                else {
                    langBiases[lang] = 0;
                }
            }
        }
        const detected = regexpModel.detect(content, langBiases, supportedLangs);
        return detected;
    }
    async getModelOperations() {
        if (this._modelOperations) {
            return this._modelOperations;
        }
        const uri = await this._host.$getIndexJsUri();
        const { ModelOperations } = (await importAMDNodeModule(uri, ''));
        this._modelOperations = new ModelOperations({
            modelJsonLoaderFunc: async () => {
                const response = await fetch(await this._host.$getModelJsonUri());
                try {
                    const modelJSON = await response.json();
                    return modelJSON;
                }
                catch (e) {
                    const message = `Failed to parse model JSON.`;
                    throw new Error(message);
                }
            },
            weightsLoaderFunc: async () => {
                const response = await fetch(await this._host.$getWeightsUri());
                const buffer = await response.arrayBuffer();
                return buffer;
            },
        });
        return this._modelOperations;
    }
    // This adjusts the language confidence scores to be more accurate based on:
    // * VS Code's language usage
    // * Languages with 'problematic' syntaxes that have caused incorrect language detection
    adjustLanguageConfidence(modelResult) {
        switch (modelResult.languageId) {
            // For the following languages, we increase the confidence because
            // these are commonly used languages in VS Code and supported
            // by the model.
            case 'js':
            case 'html':
            case 'json':
            case 'ts':
            case 'css':
            case 'py':
            case 'xml':
            case 'php':
                modelResult.confidence += LanguageDetectionWorker.positiveConfidenceCorrectionBucket1;
                break;
            // case 'yaml': // YAML has been know to cause incorrect language detection because the language is pretty simple. We don't want to increase the confidence for this.
            case 'cpp':
            case 'sh':
            case 'java':
            case 'cs':
            case 'c':
                modelResult.confidence += LanguageDetectionWorker.positiveConfidenceCorrectionBucket2;
                break;
            // For the following languages, we need to be extra confident that the language is correct because
            // we've had issues like #131912 that caused incorrect guesses. To enforce this, we subtract the
            // negativeConfidenceCorrection from the confidence.
            // languages that are provided by default in VS Code
            case 'bat':
            case 'ini':
            case 'makefile':
            case 'sql':
            // languages that aren't provided by default in VS Code
            case 'csv':
            case 'toml':
                // Other considerations for negativeConfidenceCorrection that
                // aren't built in but suported by the model include:
                // * Assembly, TeX - These languages didn't have clear language modes in the community
                // * Markdown, Dockerfile - These languages are simple but they embed other languages
                modelResult.confidence -= LanguageDetectionWorker.negativeConfidenceCorrection;
                break;
            default:
                break;
        }
        return modelResult;
    }
    async *detectLanguagesImpl(content) {
        if (this._loadFailed) {
            return;
        }
        let modelOperations;
        try {
            modelOperations = await this.getModelOperations();
        }
        catch (e) {
            console.log(e);
            this._loadFailed = true;
            return;
        }
        let modelResults;
        try {
            modelResults = await modelOperations.runModel(content);
        }
        catch (e) {
            console.warn(e);
        }
        if (!modelResults ||
            modelResults.length === 0 ||
            modelResults[0].confidence < LanguageDetectionWorker.expectedRelativeConfidence) {
            return;
        }
        const firstModelResult = this.adjustLanguageConfidence(modelResults[0]);
        if (firstModelResult.confidence < LanguageDetectionWorker.expectedRelativeConfidence) {
            return;
        }
        const possibleLanguages = [firstModelResult];
        for (let current of modelResults) {
            if (current === firstModelResult) {
                continue;
            }
            current = this.adjustLanguageConfidence(current);
            const currentHighest = possibleLanguages[possibleLanguages.length - 1];
            if (currentHighest.confidence - current.confidence >=
                LanguageDetectionWorker.expectedRelativeConfidence) {
                while (possibleLanguages.length) {
                    yield possibleLanguages.shift();
                }
                if (current.confidence > LanguageDetectionWorker.expectedRelativeConfidence) {
                    possibleLanguages.push(current);
                    continue;
                }
                return;
            }
            else {
                if (current.confidence > LanguageDetectionWorker.expectedRelativeConfidence) {
                    possibleLanguages.push(current);
                    continue;
                }
                return;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25XZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYW5ndWFnZURldGVjdGlvbi9icm93c2VyL2xhbmd1YWdlRGV0ZWN0aW9uV2ViV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUtoRSxPQUFPLEVBQ04sMkJBQTJCLEdBRTNCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFVbEgsTUFBTSxVQUFVLE1BQU0sQ0FBQyxZQUE4QjtJQUNwRCxPQUFPLElBQUksdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHVCQUF1QjthQUdYLCtCQUEwQixHQUFHLEdBQUcsQUFBTixDQUFNO2FBQ2hDLHdDQUFtQyxHQUFHLElBQUksQUFBUCxDQUFPO2FBQzFDLHdDQUFtQyxHQUFHLEtBQUssQUFBUixDQUFRO2FBQzNDLGlDQUE0QixHQUFHLEdBQUcsQUFBTixDQUFNO0lBYTFELFlBQVksWUFBOEI7UUFYekIsK0JBQTBCLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFBO1FBSXJFLHNCQUFpQixHQUFZLEtBQUssQ0FBQTtRQUdsQyxnQkFBVyxHQUFZLEtBQUssQ0FBQTtRQUU1QixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFBO1FBRzlELElBQUksQ0FBQyxLQUFLLEdBQUcsMkJBQTJCLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2pFLElBQUks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