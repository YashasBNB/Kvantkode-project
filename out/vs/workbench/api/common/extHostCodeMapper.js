/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { NotebookEdit, TextEdit } from './extHostTypeConverters.js';
import { URI } from '../../../base/common/uri.js';
import { asArray } from '../../../base/common/arrays.js';
export class ExtHostCodeMapper {
    static { this._providerHandlePool = 0; }
    constructor(mainContext) {
        this.providers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCodeMapper);
    }
    async $mapCode(handle, internalRequest, token) {
        // Received request to map code from the main thread
        const provider = this.providers.get(handle);
        if (!provider) {
            throw new Error(`Received request to map code for unknown provider handle ${handle}`);
        }
        // Construct a response object to pass to the provider
        const stream = {
            textEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(TextEdit.from),
                });
            },
            notebookEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(NotebookEdit.from),
                });
            },
        };
        const request = {
            location: internalRequest.location,
            chatRequestId: internalRequest.chatRequestId,
            codeBlocks: internalRequest.codeBlocks.map((block) => {
                return {
                    code: block.code,
                    resource: URI.revive(block.resource),
                    markdownBeforeBlock: block.markdownBeforeBlock,
                };
            }),
        };
        const result = await provider.provideMappedEdits(request, stream, token);
        return result ?? null;
    }
    registerMappedEditsProvider(extension, provider) {
        const handle = ExtHostCodeMapper._providerHandlePool++;
        this._proxy.$registerCodeMapperProvider(handle, extension.displayName ?? extension.name);
        this.providers.set(handle, provider);
        return {
            dispose: () => {
                return this._proxy.$unregisterCodeMapperProvider(handle);
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvZGVNYXBwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb2RlTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sS0FBSyxlQUFlLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE1BQU0sT0FBTyxpQkFBaUI7YUFDZCx3QkFBbUIsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUk5QyxZQUFZLFdBQXlDO1FBRnBDLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBdUMsQ0FBQTtRQUcxRSxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBUSxDQUNiLE1BQWMsRUFDZCxlQUFzRCxFQUN0RCxLQUF3QjtRQUV4QixvREFBb0Q7UUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyw0REFBNEQsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN0RixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELE1BQU0sTUFBTSxHQUFxQztZQUNoRCxRQUFRLEVBQUUsQ0FBQyxNQUFrQixFQUFFLEtBQTBDLEVBQUUsRUFBRTtnQkFDNUUsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRTtvQkFDdEQsR0FBRyxFQUFFLE1BQU07b0JBQ1gsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztpQkFDL0IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELFlBQVksRUFBRSxDQUFDLE1BQWtCLEVBQUUsS0FBa0QsRUFBRSxFQUFFO2dCQUN4RixLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFO29CQUN0RCxHQUFHLEVBQUUsTUFBTTtvQkFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO2lCQUNuQyxDQUFDLENBQUE7WUFDSCxDQUFDO1NBQ0QsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUE4QjtZQUMxQyxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7WUFDbEMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxhQUFhO1lBQzVDLFVBQVUsRUFBRSxlQUFlLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNwRCxPQUFPO29CQUNOLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztvQkFDcEMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtpQkFDOUMsQ0FBQTtZQUNGLENBQUMsQ0FBQztTQUNGLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hFLE9BQU8sTUFBTSxJQUFJLElBQUksQ0FBQTtJQUN0QixDQUFDO0lBRUQsMkJBQTJCLENBQzFCLFNBQWdDLEVBQ2hDLFFBQXFDO1FBRXJDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUMifQ==