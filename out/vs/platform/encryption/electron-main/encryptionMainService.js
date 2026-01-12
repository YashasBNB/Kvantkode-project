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
import { safeStorage as safeStorageElectron, app } from 'electron';
import { isMacintosh, isWindows, isLinux } from '../../../base/common/platform.js';
import { ILogService } from '../../log/common/log.js';
const safeStorage = safeStorageElectron;
let EncryptionMainService = class EncryptionMainService {
    constructor(logService) {
        this.logService = logService;
        // Void added this as a nice default for linux so you don't need to specify encryption provider
        if (isLinux && !app.commandLine.getSwitchValue('password-store')) {
            this.logService.trace('[EncryptionMainService] No password-store switch, defaulting to basic...');
            app.commandLine.appendSwitch('password-store', "basic" /* PasswordStoreCLIOption.basic */);
        }
        // if this commandLine switch is set, the user has opted in to using basic text encryption
        if (app.commandLine.getSwitchValue('password-store') === "basic" /* PasswordStoreCLIOption.basic */) {
            this.logService.trace('[EncryptionMainService] setting usePlainTextEncryption to true...');
            safeStorage.setUsePlainTextEncryption?.(true);
            this.logService.trace('[EncryptionMainService] set usePlainTextEncryption to true');
        }
    }
    async encrypt(value) {
        this.logService.trace('[EncryptionMainService] Encrypting value...');
        try {
            const result = JSON.stringify(safeStorage.encryptString(value));
            this.logService.trace('[EncryptionMainService] Encrypted value.');
            return result;
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    async decrypt(value) {
        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
            if (!parsedValue.data) {
                throw new Error(`[EncryptionMainService] Invalid encrypted value: ${value}`);
            }
            const bufferToDecrypt = Buffer.from(parsedValue.data);
            this.logService.trace('[EncryptionMainService] Decrypting value...');
            const result = safeStorage.decryptString(bufferToDecrypt);
            this.logService.trace('[EncryptionMainService] Decrypted value.');
            return result;
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    isEncryptionAvailable() {
        this.logService.trace('[EncryptionMainService] Checking if encryption is available...');
        const result = safeStorage.isEncryptionAvailable();
        this.logService.trace('[EncryptionMainService] Encryption is available: ', result);
        return Promise.resolve(result);
    }
    getKeyStorageProvider() {
        if (isWindows) {
            return Promise.resolve("dpapi" /* KnownStorageProvider.dplib */);
        }
        if (isMacintosh) {
            return Promise.resolve("keychain_access" /* KnownStorageProvider.keychainAccess */);
        }
        if (safeStorage.getSelectedStorageBackend) {
            try {
                this.logService.trace('[EncryptionMainService] Getting selected storage backend...');
                const result = safeStorage.getSelectedStorageBackend();
                this.logService.trace('[EncryptionMainService] Selected storage backend: ', result);
                return Promise.resolve(result);
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        return Promise.resolve("unknown" /* KnownStorageProvider.unknown */);
    }
    async setUsePlainTextEncryption() {
        if (isWindows) {
            throw new Error('Setting plain text encryption is not supported on Windows.');
        }
        if (isMacintosh) {
            throw new Error('Setting plain text encryption is not supported on macOS.');
        }
        if (!safeStorage.setUsePlainTextEncryption) {
            throw new Error('Setting plain text encryption is not supported.');
        }
        this.logService.trace('[EncryptionMainService] Setting usePlainTextEncryption to true...');
        safeStorage.setUsePlainTextEncryption(true);
        this.logService.trace('[EncryptionMainService] Set usePlainTextEncryption to true');
    }
};
EncryptionMainService = __decorate([
    __param(0, ILogService)
], EncryptionMainService);
export { EncryptionMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvbk1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbmNyeXB0aW9uL2VsZWN0cm9uLW1haW4vZW5jcnlwdGlvbk1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLElBQUksbUJBQW1CLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBTWxGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQVNyRCxNQUFNLFdBQVcsR0FDaEIsbUJBQW1CLENBQUE7QUFFYixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUdqQyxZQUEwQyxVQUF1QjtRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2hFLCtGQUErRjtRQUMvRixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsMEVBQTBFLENBQzFFLENBQUE7WUFDRCxHQUFHLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsNkNBQStCLENBQUE7UUFDN0UsQ0FBQztRQUVELDBGQUEwRjtRQUMxRixJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLCtDQUFpQyxFQUFFLENBQUM7WUFDdkYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQTtZQUMxRixXQUFXLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxJQUFJ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