/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext, } from './extHost.protocol.js';
export class ExtHostSpeech {
    static { this.ID_POOL = 1; }
    constructor(mainContext) {
        this.providers = new Map();
        this.sessions = new Map();
        this.synthesizers = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadSpeech);
    }
    async $createSpeechToTextSession(handle, session, language) {
        const provider = this.providers.get(handle);
        if (!provider) {
            return;
        }
        const disposables = new DisposableStore();
        const cts = new CancellationTokenSource();
        this.sessions.set(session, cts);
        const speechToTextSession = await provider.provideSpeechToTextSession(cts.token, language ? { language } : undefined);
        if (!speechToTextSession) {
            return;
        }
        disposables.add(speechToTextSession.onDidChange((e) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            this.proxy.$emitSpeechToTextEvent(session, e);
        }));
        disposables.add(cts.token.onCancellationRequested(() => disposables.dispose()));
    }
    async $cancelSpeechToTextSession(session) {
        this.sessions.get(session)?.dispose(true);
        this.sessions.delete(session);
    }
    async $createTextToSpeechSession(handle, session, language) {
        const provider = this.providers.get(handle);
        if (!provider) {
            return;
        }
        const disposables = new DisposableStore();
        const cts = new CancellationTokenSource();
        this.sessions.set(session, cts);
        const textToSpeech = await provider.provideTextToSpeechSession(cts.token, language ? { language } : undefined);
        if (!textToSpeech) {
            return;
        }
        this.synthesizers.set(session, textToSpeech);
        disposables.add(textToSpeech.onDidChange((e) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            this.proxy.$emitTextToSpeechEvent(session, e);
        }));
        disposables.add(cts.token.onCancellationRequested(() => disposables.dispose()));
    }
    async $synthesizeSpeech(session, text) {
        this.synthesizers.get(session)?.synthesize(text);
    }
    async $cancelTextToSpeechSession(session) {
        this.sessions.get(session)?.dispose(true);
        this.sessions.delete(session);
        this.synthesizers.delete(session);
    }
    async $createKeywordRecognitionSession(handle, session) {
        const provider = this.providers.get(handle);
        if (!provider) {
            return;
        }
        const disposables = new DisposableStore();
        const cts = new CancellationTokenSource();
        this.sessions.set(session, cts);
        const keywordRecognitionSession = await provider.provideKeywordRecognitionSession(cts.token);
        if (!keywordRecognitionSession) {
            return;
        }
        disposables.add(keywordRecognitionSession.onDidChange((e) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            this.proxy.$emitKeywordRecognitionEvent(session, e);
        }));
        disposables.add(cts.token.onCancellationRequested(() => disposables.dispose()));
    }
    async $cancelKeywordRecognitionSession(session) {
        this.sessions.get(session)?.dispose(true);
        this.sessions.delete(session);
    }
    registerProvider(extension, identifier, provider) {
        const handle = ExtHostSpeech.ID_POOL++;
        this.providers.set(handle, provider);
        this.proxy.$registerProvider(handle, identifier, { extension, displayName: extension.value });
        return toDisposable(() => {
            this.proxy.$unregisterProvider(handle);
            this.providers.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNwZWVjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTcGVlY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFJOUIsTUFBTSxPQUFPLGFBQWE7YUFDVixZQUFPLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFRMUIsWUFBWSxXQUF5QjtRQUpwQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7UUFDcEQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFBO1FBQ3JELGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUE7UUFHNUUsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQy9CLE1BQWMsRUFDZCxPQUFlLEVBQ2YsUUFBaUI7UUFFakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FB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