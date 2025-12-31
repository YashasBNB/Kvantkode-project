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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25XZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGFuZ3VhZ2VEZXRlY3Rpb24vYnJvd3Nlci9sYW5ndWFnZURldGVjdGlvbldlYldvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLaEUsT0FBTyxFQUNOLDJCQUEyQixHQUUzQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBVWxILE1BQU0sVUFBVSxNQUFNLENBQUMsWUFBOEI7SUFDcEQsT0FBTyxJQUFJLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ2pELENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7YUFHWCwrQkFBMEIsR0FBRyxHQUFHLEFBQU4sQ0FBTTthQUNoQyx3Q0FBbUMsR0FBRyxJQUFJLEFBQVAsQ0FBTzthQUMxQyx3Q0FBbUMsR0FBRyxLQUFLLEFBQVIsQ0FBUTthQUMzQyxpQ0FBNEIsR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQWExRCxZQUFZLFlBQThCO1FBWHpCLCtCQUEwQixHQUFHLElBQUkseUJBQXlCLEVBQUUsQ0FBQTtRQUlyRSxzQkFBaUIsR0FBWSxLQUFLLENBQUE7UUFHbEMsZ0JBQVcsR0FBWSxLQUFLLENBQUE7UUFFNUIsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQTtRQUc5RCxJQUFJLENBQUMsS0FBSyxHQUFHLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMs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