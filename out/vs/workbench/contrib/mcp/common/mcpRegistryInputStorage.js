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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFJlZ2lzdHJ5SW5wdXRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUd2RCxNQUFNLHVCQUF1QixHQUFHLGtCQUFrQixDQUFBO0FBQ2xELE1BQU0sNEJBQTRCLEdBQUcsU0FBUyxDQUFBO0FBQzlDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFBO0FBQ2xDLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFBLENBQUMsVUFBVTtBQUM5QyxNQUFNLHVCQUF1QixHQUFHLENBQUMsQ0FBQTtBQUNqQyxNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQTtBQVloQyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O2FBQ3ZDLG9CQUFlLEdBQUcsSUFBSSxTQUFTLEVBQUUsQUFBbEIsQ0FBa0I7SUF1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