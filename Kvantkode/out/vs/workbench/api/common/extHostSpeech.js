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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNwZWVjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFNwZWVjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUk5QixNQUFNLE9BQU8sYUFBYTthQUNWLFlBQU8sR0FBRyxDQUFDLEFBQUosQ0FBSTtJQVExQixZQUFZLFdBQXlCO1FBSnBCLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQTtRQUNwRCxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUE7UUFDckQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQTtRQUc1RSxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FDL0IsTUFBYyxFQUNkLE9BQWUsRUFDZixRQUFpQjtRQUVqQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekMsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFB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