var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MainThreadChatCodemapper_1;
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { TextEdit } from '../../../editor/common/languages.js';
import { ICodeMapperService, } from '../../contrib/chat/common/chatCodeMapperService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
let MainThreadChatCodemapper = class MainThreadChatCodemapper extends Disposable {
    static { MainThreadChatCodemapper_1 = this; }
    static { this._requestHandlePool = 0; }
    constructor(extHostContext, codeMapperService) {
        super();
        this.codeMapperService = codeMapperService;
        this.providers = this._register(new DisposableMap());
        this._responseMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCodeMapper);
    }
    $registerCodeMapperProvider(handle, displayName) {
        const impl = {
            displayName,
            mapCode: async (uiRequest, response, token) => {
                const requestId = String(MainThreadChatCodemapper_1._requestHandlePool++);
                this._responseMap.set(requestId, response);
                const extHostRequest = {
                    requestId,
                    codeBlocks: uiRequest.codeBlocks,
                    chatRequestId: uiRequest.chatRequestId,
                    location: uiRequest.location,
                };
                try {
                    return await this._proxy
                        .$mapCode(handle, extHostRequest, token)
                        .then((result) => result ?? undefined);
                }
                finally {
                    this._responseMap.delete(requestId);
                }
            },
        };
        const disposable = this.codeMapperService.registerCodeMapperProvider(handle, impl);
        this.providers.set(handle, disposable);
    }
    $unregisterCodeMapperProvider(handle) {
        this.providers.deleteAndDispose(handle);
    }
    $handleProgress(requestId, data) {
        const response = this._responseMap.get(requestId);
        if (response) {
            const edits = data.edits;
            const resource = URI.revive(data.uri);
            if (!edits.length) {
                response.textEdit(resource, []);
            }
            else if (edits.every(TextEdit.isTextEdit)) {
                response.textEdit(resource, edits);
            }
            else {
                response.notebookEdit(resource, edits.map(NotebookDto.fromCellEditOperationDto));
            }
        }
        return Promise.resolve();
    }
};
MainThreadChatCodemapper = MainThreadChatCodemapper_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCodeMapper),
    __param(1, ICodeMapperService)
], MainThreadChatCodemapper);
export { MainThreadChatCodemapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRDb2RlTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENoYXRDb2RlTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFLQSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUlOLGtCQUFrQixHQUNsQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sY0FBYyxFQUdkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUdqRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O2FBR3hDLHVCQUFrQixHQUFXLENBQUMsQUFBWixDQUFZO0lBRzdDLFlBQ0MsY0FBK0IsRUFDWCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFGOEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVBuRSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBdUIsQ0FBQyxDQUFBO1FBR3BFLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7UUFPNUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCwyQkFBMkIs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