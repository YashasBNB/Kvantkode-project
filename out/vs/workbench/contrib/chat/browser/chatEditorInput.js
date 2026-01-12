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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQU9oRixPQUFPLEVBQUUsV0FBVyxFQUF1QixNQUFNLHVDQUF1QyxDQUFBO0FBR3hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQWlCLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlGLE9BQU8sRUFDTix5Q0FBeUMsRUFDekMsbUNBQW1DLEdBQ25DLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUNsQyx3QkFBd0IsRUFDeEIsT0FBTyxDQUFDLGlCQUFpQixFQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFx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