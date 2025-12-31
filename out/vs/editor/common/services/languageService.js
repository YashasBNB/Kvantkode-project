/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LanguagesRegistry } from './languagesRegistry.js';
import { TokenizationRegistry } from '../languages.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { observableFromEvent } from '../../../base/common/observable.js';
export class LanguageService extends Disposable {
    static { this.instanceCount = 0; }
    constructor(warnOnOverwrite = false) {
        super();
        this._onDidRequestBasicLanguageFeatures = this._register(new Emitter());
        this.onDidRequestBasicLanguageFeatures = this._onDidRequestBasicLanguageFeatures.event;
        this._onDidRequestRichLanguageFeatures = this._register(new Emitter());
        this.onDidRequestRichLanguageFeatures = this._onDidRequestRichLanguageFeatures.event;
        this._onDidChange = this._register(new Emitter({
            leakWarningThreshold: 200 /* https://github.com/microsoft/vscode/issues/119968 */,
        }));
        this.onDidChange = this._onDidChange.event;
        this._requestedBasicLanguages = new Set();
        this._requestedRichLanguages = new Set();
        LanguageService.instanceCount++;
        this._registry = this._register(new LanguagesRegistry(true, warnOnOverwrite));
        this.languageIdCodec = this._registry.languageIdCodec;
        this._register(this._registry.onDidChange(() => this._onDidChange.fire()));
    }
    dispose() {
        LanguageService.instanceCount--;
        super.dispose();
    }
    registerLanguage(def) {
        return this._registry.registerLanguage(def);
    }
    isRegisteredLanguageId(languageId) {
        return this._registry.isRegisteredLanguageId(languageId);
    }
    getRegisteredLanguageIds() {
        return this._registry.getRegisteredLanguageIds();
    }
    getSortedRegisteredLanguageNames() {
        return this._registry.getSortedRegisteredLanguageNames();
    }
    getLanguageName(languageId) {
        return this._registry.getLanguageName(languageId);
    }
    getMimeType(languageId) {
        return this._registry.getMimeType(languageId);
    }
    getIcon(languageId) {
        return this._registry.getIcon(languageId);
    }
    getExtensions(languageId) {
        return this._registry.getExtensions(languageId);
    }
    getFilenames(languageId) {
        return this._registry.getFilenames(languageId);
    }
    getConfigurationFiles(languageId) {
        return this._registry.getConfigurationFiles(languageId);
    }
    getLanguageIdByLanguageName(languageName) {
        return this._registry.getLanguageIdByLanguageName(languageName);
    }
    getLanguageIdByMimeType(mimeType) {
        return this._registry.getLanguageIdByMimeType(mimeType);
    }
    guessLanguageIdByFilepathOrFirstLine(resource, firstLine) {
        const languageIds = this._registry.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
        return languageIds.at(0) ?? null;
    }
    createById(languageId) {
        return new LanguageSelection(this.onDidChange, () => {
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    createByMimeType(mimeType) {
        return new LanguageSelection(this.onDidChange, () => {
            const languageId = this.getLanguageIdByMimeType(mimeType);
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    createByFilepathOrFirstLine(resource, firstLine) {
        return new LanguageSelection(this.onDidChange, () => {
            const languageId = this.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    _createAndGetLanguageIdentifier(languageId) {
        if (!languageId || !this.isRegisteredLanguageId(languageId)) {
            // Fall back to plain text if language is unknown
            languageId = PLAINTEXT_LANGUAGE_ID;
        }
        return languageId;
    }
    requestBasicLanguageFeatures(languageId) {
        if (!this._requestedBasicLanguages.has(languageId)) {
            this._requestedBasicLanguages.add(languageId);
            this._onDidRequestBasicLanguageFeatures.fire(languageId);
        }
    }
    requestRichLanguageFeatures(languageId) {
        if (!this._requestedRichLanguages.has(languageId)) {
            this._requestedRichLanguages.add(languageId);
            // Ensure basic features are requested
            this.requestBasicLanguageFeatures(languageId);
            // Ensure tokenizers are created
            TokenizationRegistry.getOrCreate(languageId);
            this._onDidRequestRichLanguageFeatures.fire(languageId);
        }
    }
}
class LanguageSelection {
    constructor(onDidChangeLanguages, selector) {
        this._value = observableFromEvent(this, onDidChangeLanguages, () => selector());
        this.onDidChange = Event.fromObservable(this._value);
    }
    get languageId() {
        return this._value.get();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFFM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFRMUQsT0FBTyxFQUFvQixvQkFBb0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXJGLE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7YUFHdkMsa0JBQWEsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQXFCeEIsWUFBWSxlQUFlLEdBQUcsS0FBSztRQUNsQyxLQUFLLEVBQUUsQ0FBQTtRQXBCUyx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUMzRSxzQ0FBaUMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFBO1FBRWhGLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQzFFLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUE7UUFFNUUsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQyxJQUFJLE9BQU8sQ0FBTztZQUNqQixvQkFBb0IsRUFBRSxHQUFHLENBQUMsdURBQXVE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