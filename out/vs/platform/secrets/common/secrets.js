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
import { SequencerByKey } from '../../../base/common/async.js';
import { IEncryptionService } from '../../encryption/common/encryptionService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IStorageService, InMemoryStorageService, } from '../../storage/common/storage.js';
import { Emitter } from '../../../base/common/event.js';
import { ILogService } from '../../log/common/log.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Lazy } from '../../../base/common/lazy.js';
export const ISecretStorageService = createDecorator('secretStorageService');
let BaseSecretStorageService = class BaseSecretStorageService extends Disposable {
    constructor(_useInMemoryStorage, _storageService, _encryptionService, _logService) {
        super();
        this._useInMemoryStorage = _useInMemoryStorage;
        this._storageService = _storageService;
        this._encryptionService = _encryptionService;
        this._logService = _logService;
        this._storagePrefix = 'secret://';
        this.onDidChangeSecretEmitter = this._register(new Emitter());
        this.onDidChangeSecret = this.onDidChangeSecretEmitter.event;
        this._sequencer = new SequencerByKey();
        this._type = 'unknown';
        this._onDidChangeValueDisposable = this._register(new DisposableStore());
        this._lazyStorageService = new Lazy(() => this.initialize());
    }
    /**
     * @Note initialize must be called first so that this can be resolved properly
     * otherwise it will return 'unknown'.
     */
    get type() {
        return this._type;
    }
    get resolvedStorageService() {
        return this._lazyStorageService.value;
    }
    get(key) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] getting secret for key:', fullKey);
            const encrypted = storageService.get(fullKey, -1 /* StorageScope.APPLICATION */);
            if (!encrypted) {
                this._logService.trace('[secrets] no secret found for key:', fullKey);
                return undefined;
            }
            try {
                this._logService.trace('[secrets] decrypting gotten secret for key:', fullKey);
                // If the storage service is in-memory, we don't need to decrypt
                const result = this._type === 'in-memory' ? encrypted : await this._encryptionService.decrypt(encrypted);
                this._logService.trace('[secrets] decrypted secret for key:', fullKey);
                return result;
            }
            catch (e) {
                this._logService.error(e);
                this.delete(key);
                return undefined;
            }
        });
    }
    set(key, value) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            this._logService.trace('[secrets] encrypting secret for key:', key);
            let encrypted;
            try {
                // If the storage service is in-memory, we don't need to encrypt
                encrypted =
                    this._type === 'in-memory' ? value : await this._encryptionService.encrypt(value);
            }
            catch (e) {
                this._logService.error(e);
                throw e;
            }
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] storing encrypted secret for key:', fullKey);
            storageService.store(fullKey, encrypted, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this._logService.trace('[secrets] stored encrypted secret for key:', fullKey);
        });
    }
    delete(key) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] deleting secret for key:', fullKey);
            storageService.remove(fullKey, -1 /* StorageScope.APPLICATION */);
            this._logService.trace('[secrets] deleted secret for key:', fullKey);
        });
    }
    async initialize() {
        let storageService;
        if (!this._useInMemoryStorage && (await this._encryptionService.isEncryptionAvailable())) {
            this._logService.trace(`[SecretStorageService] Encryption is available, using persisted storage`);
            this._type = 'persisted';
            storageService = this._storageService;
        }
        else {
            // If we already have an in-memory storage service, we don't need to recreate it
            if (this._type === 'in-memory') {
                return this._storageService;
            }
            this._logService.trace('[SecretStorageService] Encryption is not available, falling back to in-memory storage');
            this._type = 'in-memory';
            storageService = this._register(new InMemoryStorageService());
        }
        this._onDidChangeValueDisposable.clear();
        this._onDidChangeValueDisposable.add(storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, undefined, this._onDidChangeValueDisposable)((e) => {
            this.onDidChangeValue(e.key);
        }));
        return storageService;
    }
    reinitialize() {
        this._lazyStorageService = new Lazy(() => this.initialize());
    }
    onDidChangeValue(key) {
        if (!key.startsWith(this._storagePrefix)) {
            return;
        }
        const secretKey = key.slice(this._storagePrefix.length);
        this._logService.trace(`[SecretStorageService] Notifying change in value for secret: ${secretKey}`);
        this.onDidChangeSecretEmitter.fire(secretKey);
    }
    getKey(key) {
        return `${this._storagePrefix}${key}`;
    }
};
BaseSecretStorageService = __decorate([
    __param(1, IStorageService),
    __param(2, IEncryptionService),
    __param(3, ILogService)
], BaseSecretStorageService);
export { BaseSecretStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NlY3JldHMvY29tbW9uL3NlY3JldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sZUFBZSxFQUNmLHNCQUFzQixHQUd0QixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbkQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFBO0FBYzVGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQWN2RCxZQUNrQixtQkFBNEIsRUFDNUIsZUFBd0MsRUFDckMsa0JBQWdELEVBQ3ZELFdBQTJDO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBTFUsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFTO1FBQ3BCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUMzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBZnhDLG1CQUFjLEdBQUcsV0FBVyxDQUFBO1FBRTFCLDZCQUF3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