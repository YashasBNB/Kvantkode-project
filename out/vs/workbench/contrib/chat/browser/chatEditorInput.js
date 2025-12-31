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
var ChatEditorInput_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation } from '../common/constants.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { shouldShowClearEditingSessionConfirmation, showClearEditingSessionConfirmation, } from './actions/chatActions.js';
const ChatEditorIcon = registerIcon('chat-editor-label-icon', Codicon.commentDiscussion, nls.localize('chatEditorLabelIcon', 'Icon of the chat editor label.'));
let ChatEditorInput = class ChatEditorInput extends EditorInput {
    static { ChatEditorInput_1 = this; }
    static { this.countsInUse = new Set(); }
    static { this.TypeID = 'workbench.input.chatSession'; }
    static { this.EditorID = 'workbench.editor.chatSession'; }
    static getNewEditorUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return ChatUri.generate(handle);
    }
    static getNextCount() {
        let count = 0;
        while (ChatEditorInput_1.countsInUse.has(count)) {
            count++;
        }
        return count;
    }
    constructor(resource, options, chatService, dialogService) {
        super();
        this.resource = resource;
        this.options = options;
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.closeHandler = this;
        const parsed = ChatUri.parse(resource);
        if (typeof parsed?.handle !== 'number') {
            throw new Error('Invalid chat URI');
        }
        this.sessionId =
            options.target && 'sessionId' in options.target ? options.target.sessionId : undefined;
        this.inputCount = ChatEditorInput_1.getNextCount();
        ChatEditorInput_1.countsInUse.add(this.inputCount);
        this._register(toDisposable(() => ChatEditorInput_1.countsInUse.delete(this.inputCount)));
    }
    showConfirm() {
        return this.model?.editingSession
            ? shouldShowClearEditingSessionConfirmation(this.model.editingSession)
            : false;
    }
    async confirm(editors) {
        if (!this.model?.editingSession) {
            return 0 /* ConfirmResult.SAVE */;
        }
        const titleOverride = nls.localize('chatEditorConfirmTitle', 'Close Chat Editor');
        const messageOverride = nls.localize('chat.startEditing.confirmation.pending.message.default', 'Closing the chat editor will end your current edit session.');
        const result = await showClearEditingSessionConfirmation(this.model.editingSession, this.dialogService, { titleOverride, messageOverride });
        return result ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    get editorId() {
        return ChatEditorInput_1.EditorID;
    }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */;
    }
    matches(otherInput) {
        return (otherInput instanceof ChatEditorInput_1 &&
            otherInput.resource.toString() === this.resource.toString());
    }
    get typeId() {
        return ChatEditorInput_1.TypeID;
    }
    getName() {
        return (this.model?.title ||
            nls.localize('chatEditorName', 'Chat') +
                (this.inputCount > 0 ? ` ${this.inputCount + 1}` : ''));
    }
    getIcon() {
        return ChatEditorIcon;
    }
    async resolve() {
        if (typeof this.sessionId === 'string') {
            this.model =
                (await this.chatService.getOrRestoreSession(this.sessionId)) ??
                    this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if (!this.options.target) {
            this.model = this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if ('data' in this.options.target) {
            this.model = this.chatService.loadSessionFromContent(this.options.target.data);
        }
        if (!this.model) {
            return null;
        }
        this.sessionId = this.model.sessionId;
        this._register(this.model.onDidChange(() => this._onDidChangeLabel.fire()));
        return this._register(new ChatEditorModel(this.model));
    }
    dispose() {
        super.dispose();
        if (this.sessionId) {
            this.chatService.clearSession(this.sessionId);
        }
    }
};
ChatEditorInput = ChatEditorInput_1 = __decorate([
    __param(2, IChatService),
    __param(3, IDialogService)
], ChatEditorInput);
export { ChatEditorInput };
export class ChatEditorModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._isDisposed = false;
        this._isResolved = false;
    }
    async resolve() {
        this._isResolved = true;
    }
    isResolved() {
        return this._isResolved;
    }
    isDisposed() {
        return this._isDisposed;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
}
export var ChatUri;
(function (ChatUri) {
    ChatUri.scheme = Schemas.vscodeChatSesssion;
    function generate(handle) {
        return URI.from({ scheme: ChatUri.scheme, path: `chat-${handle}` });
    }
    ChatUri.generate = generate;
    function parse(resource) {
        if (resource.scheme !== ChatUri.scheme) {
            return undefined;
        }
        const match = resource.path.match(/chat-(\d+)/);
        const handleStr = match?.[1];
        if (typeof handleStr !== 'string') {
            return undefined;
        }
        const handle = parseInt(handleStr);
        if (isNaN(handle)) {
            return undefined;
        }
        return { handle };
    }
    ChatUri.parse = parse;
})(ChatUri || (ChatUri = {}));
export class ChatEditorInputSerializer {
    canSerialize(input) {
        return input instanceof ChatEditorInput && typeof input.sessionId === 'string';
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const obj = {
            options: input.options,
            sessionId: input.sessionId,
            resource: input.resource,
        };
        return JSON.stringify(obj);
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const parsed = JSON.parse(serializedEditor);
            const resource = URI.revive(parsed.resource);
            return instantiationService.createInstance(ChatEditorInput, resource, {
                ...parsed.options,
                target: { sessionId: parsed.sessionId },
            });
        }
        catch (err) {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFPaEYsT0FBTyxFQUFFLFdBQVcsRUFBdUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUd4RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFpQixjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQ04seUNBQXlDLEVBQ3pDLG1DQUFtQyxHQUNuQyxNQUFNLDBCQUEwQixDQUFBO0FBRWpDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FDbEMsd0JBQXdCLEVBQ3hCLE9BQU8sQ0FBQyxpQkFBaUIsRUFDekIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFB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