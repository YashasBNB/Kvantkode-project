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
var McpRegistryInputStorage_1;
import { Sequencer } from '../../../../base/common/async.js';
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
const MCP_ENCRYPTION_KEY_NAME = 'mcpEncryptionKey';
const MCP_ENCRYPTION_KEY_ALGORITHM = 'AES-GCM';
const MCP_ENCRYPTION_KEY_LEN = 256;
const MCP_ENCRYPTION_IV_LENGTH = 12; // 96 bits
const MCP_DATA_STORED_VERSION = 1;
const MCP_DATA_STORED_KEY = 'mcpInputs';
let McpRegistryInputStorage = class McpRegistryInputStorage extends Disposable {
    static { McpRegistryInputStorage_1 = this; }
    static { this.secretSequencer = new Sequencer(); }
    constructor(_scope, _target, _storageService, _secretStorageService, _logService) {
        super();
        this._scope = _scope;
        this._storageService = _storageService;
        this._secretStorageService = _secretStorageService;
        this._logService = _logService;
        this._secretsSealerSequencer = new Sequencer();
        this._getEncryptionKey = new Lazy(() => {
            return McpRegistryInputStorage_1.secretSequencer.queue(async () => {
                const existing = await this._secretStorageService.get(MCP_ENCRYPTION_KEY_NAME);
                if (existing) {
                    try {
                        const parsed = JSON.parse(existing);
                        return await crypto.subtle.importKey('jwk', parsed, MCP_ENCRYPTION_KEY_ALGORITHM, false, [
                            'encrypt',
                            'decrypt',
                        ]);
                    }
                    catch {
                        // fall through
                    }
                }
                const key = await crypto.subtle.generateKey({ name: MCP_ENCRYPTION_KEY_ALGORITHM, length: MCP_ENCRYPTION_KEY_LEN }, true, ['encrypt', 'decrypt']);
                const exported = await crypto.subtle.exportKey('jwk', key);
                await this._secretStorageService.set(MCP_ENCRYPTION_KEY_NAME, JSON.stringify(exported));
                return key;
            });
        });
        this._didChange = false;
        this._record = new Lazy(() => {
            const stored = this._storageService.getObject(MCP_DATA_STORED_KEY, this._scope);
            return stored?.version === MCP_DATA_STORED_VERSION
                ? { ...stored }
                : { version: MCP_DATA_STORED_VERSION, values: {} };
        });
        this._register(_storageService.onWillSaveState(() => {
            if (this._didChange) {
                this._storageService.store(MCP_DATA_STORED_KEY, {
                    version: MCP_DATA_STORED_VERSION,
                    values: this._record.value.values,
                    secrets: this._record.value.secrets,
                }, this._scope, _target);
                this._didChange = false;
            }
        }));
    }
    /** Deletes all collection data from storage. */
    clearAll() {
        this._record.value.values = {};
        this._record.value.secrets = undefined;
        this._record.value.unsealedSecrets = undefined;
        this._didChange = true;
    }
    /** Delete a single collection data from the storage. */
    async clear(inputKey) {
        const secrets = await this._unsealSecrets();
        delete this._record.value.values[inputKey];
        this._didChange = true;
        if (secrets.hasOwnProperty(inputKey)) {
            delete secrets[inputKey];
            await this._sealSecrets();
        }
    }
    /** Gets a mapping of saved input data. */
    async getMap() {
        const secrets = await this._unsealSecrets();
        return { ...this._record.value.values, ...secrets };
    }
    /** Updates the input data mapping. */
    async setPlainText(values) {
        Object.assign(this._record.value.values, values);
        this._didChange = true;
    }
    /** Updates the input secrets mapping. */
    async setSecrets(values) {
        const unsealed = await this._unsealSecrets();
        Object.assign(unsealed, values);
        await this._sealSecrets();
    }
    async _sealSecrets() {
        const key = await this._getEncryptionKey.value;
        return this._secretsSealerSequencer.queue(async () => {
            if (!this._record.value.unsealedSecrets ||
                isEmptyObject(this._record.value.unsealedSecrets)) {
                this._record.value.secrets = undefined;
                return;
            }
            const toSeal = JSON.stringify(this._record.value.unsealedSecrets);
            const iv = crypto.getRandomValues(new Uint8Array(MCP_ENCRYPTION_IV_LENGTH));
            const encrypted = await crypto.subtle.encrypt({ name: MCP_ENCRYPTION_KEY_ALGORITHM, iv: iv.buffer }, key, new TextEncoder().encode(toSeal).buffer);
            const enc = encodeBase64(VSBuffer.wrap(new Uint8Array(encrypted)));
            this._record.value.secrets = { iv: encodeBase64(VSBuffer.wrap(iv)), value: enc };
            this._didChange = true;
        });
    }
    async _unsealSecrets() {
        if (!this._record.value.secrets) {
            return (this._record.value.unsealedSecrets ??= {});
        }
        if (this._record.value.unsealedSecrets) {
            return this._record.value.unsealedSecrets;
        }
        try {
            const key = await this._getEncryptionKey.value;
            const iv = decodeBase64(this._record.value.secrets.iv);
            const encrypted = decodeBase64(this._record.value.secrets.value);
            const decrypted = await crypto.subtle.decrypt({ name: MCP_ENCRYPTION_KEY_ALGORITHM, iv: iv.buffer }, key, encrypted.buffer);
            const unsealedSecrets = JSON.parse(new TextDecoder().decode(decrypted));
            this._record.value.unsealedSecrets = unsealedSecrets;
            return unsealedSecrets;
        }
        catch (e) {
            this._logService.warn('Error unsealing MCP secrets', e);
            this._record.value.secrets = undefined;
        }
        return {};
    }
};
McpRegistryInputStorage = McpRegistryInputStorage_1 = __decorate([
    __param(2, IStorageService),
    __param(3, ISecretStorageService),
    __param(4, ILogService)
], McpRegistryInputStorage);
export { McpRegistryInputStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBR3ZELE1BQU0sdUJBQXVCLEdBQUcsa0JBQWtCLENBQUE7QUFDbEQsTUFBTSw0QkFBNEIsR0FBRyxTQUFTLENBQUE7QUFDOUMsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUE7QUFDbEMsTUFBTSx3QkFBd0IsR0FBRyxFQUFFLENBQUEsQ0FBQyxVQUFVO0FBQzlDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxDQUFBO0FBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFBO0FBWWhDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTs7YUFDdkMsb0JBQWUsR0FBRyxJQUFJLFNBQVMsRUFBRSxBQUFsQixDQUFrQjtJQXVDaEQsWUFDa0IsTUFBb0IsRUFDckMsT0FBc0IsRUFDTCxlQUFpRCxFQUMzQyxxQkFBNkQsRUFDdkUsV0FBeUM7UUFFdEQsS0FBSyxFQUFFLENBQUE7UUFOVSxXQUFNLEdBQU4sTUFBTSxDQUFjO1FBRUgsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzFCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDdEQsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUEzQ3RDLDRCQUF1QixHQUFHLElBQUksU0FBUyxFQUFFLENBQUE7UUFFekMsc0JBQWlCLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2xELE9BQU8seUJBQXVCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDL0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQzlFLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDO3dCQUNKLE1BQU0sTUFBTSxHQUFlLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7d0JBQy9DLE9BQU8sTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLDRCQUE0QixFQUFFLEtBQUssRUFBRTs0QkFDeEYsU0FBUzs0QkFDVCxTQUFTO3lCQUNULENBQUMsQ0FBQTtvQkFDSCxDQUFDO29CQUFDLE1BQU0sQ0FBQzt3QkFDUixlQUFlO29CQUNoQixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDMUMsRUFBRSxJQUFJLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFLEVBQ3RFLElBQUksRUFDSixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDdEIsQ0FBQTtnQkFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDMUQsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtnQkFDdkYsT0FBTyxHQUFHLENBQUE7WUFDWCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRU0sZUFBVSxHQUFHLEtBQUssQ0FBQTtRQUVsQixZQUFPLEdBQUcsSUFBSSxJQUFJLENBQWdCLEdBQUcsRUFBRTtZQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBYyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDNUYsT0FBTyxNQUFNLEVBQUUsT0FBTyxLQUFLLHVCQUF1QjtnQkFDakQsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUU7Z0JBQ2YsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQUNwRCxDQUFDLENBQUMsQ0FBQTtRQVdELElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7WUFDcEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUN6QixtQkFBbUIsRUFDbkI7b0JBQ0MsT0FBTyxFQUFFLHVCQUF1QjtvQkFDaEMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ2pDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPO2lCQUNiLEVBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQ1gsT0FBTyxDQUNQLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsZ0RBQWdEO0lBQ3pDLFFBQVE7UUFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQsd0RBQXdEO0lBQ2pELEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBZ0I7UUFDbEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFFdEIsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDeEIsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCwwQ0FBMEM7SUFDbkMsS0FBSyxDQUFDLE1BQU07UUFDbEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDM0MsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUE7SUFDcEQsQ0FBQztJQUVELHNDQUFzQztJQUMvQixLQUFLLENBQUMsWUFBWSxDQUFDLE1BQXNDO1FBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCx5Q0FBeUM7SUFDbEMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFzQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMvQixNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVk7UUFDekIsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBQzlDLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNwRCxJQUNDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZTtnQkFDbkMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUNoRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7Z0JBQ3RDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNqRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtZQUMzRSxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUM1QyxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUNyRCxHQUFHLEVBQ0gsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUN2QyxDQUFBO1lBRUQsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUNoRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtRQUMxQyxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1lBQzlDLE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEQsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVoRSxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUM1QyxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUNyRCxHQUFHLEVBQ0gsU0FBUyxDQUFDLE1BQU0sQ0FDaEIsQ0FBQTtZQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUN2RSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1lBQ3BELE9BQU8sZUFBZSxDQUFBO1FBQ3ZCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDOztBQWpLVyx1QkFBdUI7SUEyQ2pDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQTdDRCx1QkFBdUIsQ0FrS25DIn0=