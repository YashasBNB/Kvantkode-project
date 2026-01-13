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
import { ThrottledDelayer } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isUndefined, isUndefinedOrNull } from '../../../base/common/types.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
export var SaveStrategy;
(function (SaveStrategy) {
    SaveStrategy[SaveStrategy["IMMEDIATE"] = 0] = "IMMEDIATE";
    SaveStrategy[SaveStrategy["DELAYED"] = 1] = "DELAYED";
})(SaveStrategy || (SaveStrategy = {}));
export class FileStorage extends Disposable {
    constructor(storagePath, saveStrategy, logService, fileService) {
        super();
        this.storagePath = storagePath;
        this.logService = logService;
        this.fileService = fileService;
        this.storage = Object.create(null);
        this.lastSavedStorageContents = '';
        this.initializing = undefined;
        this.closing = undefined;
        this.flushDelayer = this._register(new ThrottledDelayer(saveStrategy === 0 /* SaveStrategy.IMMEDIATE */ ? 0 : 100 /* buffer saves over a short time */));
    }
    init() {
        if (!this.initializing) {
            this.initializing = this.doInit();
        }
        return this.initializing;
    }
    async doInit() {
        try {
            this.lastSavedStorageContents = (await this.fileService.readFile(this.storagePath)).value.toString();
            this.storage = JSON.parse(this.lastSavedStorageContents);
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    getItem(key, defaultValue) {
        const res = this.storage[key];
        if (isUndefinedOrNull(res)) {
            return defaultValue;
        }
        return res;
    }
    setItem(key, data) {
        this.setItems([{ key, data }]);
    }
    setItems(items) {
        let save = false;
        for (const { key, data } of items) {
            // Shortcut for data that did not change
            if (this.storage[key] === data) {
                continue;
            }
            // Remove items when they are undefined or null
            if (isUndefinedOrNull(data)) {
                if (!isUndefined(this.storage[key])) {
                    this.storage[key] = undefined;
                    save = true;
                }
            }
            // Otherwise add an item
            else {
                this.storage[key] = data;
                save = true;
            }
        }
        if (save) {
            this.save();
        }
    }
    removeItem(key) {
        // Only update if the key is actually present (not undefined)
        if (!isUndefined(this.storage[key])) {
            this.storage[key] = undefined;
            this.save();
        }
    }
    async save() {
        if (this.closing) {
            return; // already about to close
        }
        return this.flushDelayer.trigger(() => this.doSave());
    }
    async doSave() {
        if (!this.initializing) {
            return; // if we never initialized, we should not save our state
        }
        // Make sure to wait for init to finish first
        await this.initializing;
        // Return early if the database has not changed
        const serializedDatabase = JSON.stringify(this.storage, null, 4);
        if (serializedDatabase === this.lastSavedStorageContents) {
            return;
        }
        // Write to disk
        try {
            await this.fileService.writeFile(this.storagePath, VSBuffer.fromString(serializedDatabase), {
                atomic: { postfix: '.vsctmp' },
            });
            this.lastSavedStorageContents = serializedDatabase;
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async close() {
        if (!this.closing) {
            this.closing = this.flushDelayer.trigger(() => this.doSave(), 0 /* as soon as possible */);
        }
        return this.closing;
    }
}
let StateReadonlyService = class StateReadonlyService extends Disposable {
    constructor(saveStrategy, environmentService, logService, fileService) {
        super();
        this.fileStorage = this._register(new FileStorage(environmentService.stateResource, saveStrategy, logService, fileService));
    }
    async init() {
        await this.fileStorage.init();
    }
    getItem(key, defaultValue) {
        return this.fileStorage.getItem(key, defaultValue);
    }
};
StateReadonlyService = __decorate([
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IFileService)
], StateReadonlyService);
export { StateReadonlyService };
export class StateService extends StateReadonlyService {
    setItem(key, data) {
        this.fileStorage.setItem(key, data);
    }
    setItems(items) {
        this.fileStorage.setItems(items);
    }
    removeItem(key) {
        this.fileStorage.removeItem(key);
    }
    close() {
        return this.fileStorage.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdGF0ZS9ub2RlL3N0YXRlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUtyRCxNQUFNLENBQU4sSUFBa0IsWUFHakI7QUFIRCxXQUFrQixZQUFZO0lBQzdCLHlEQUFTLENBQUE7SUFDVCxxREFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhpQixZQUFZLEtBQVosWUFBWSxRQUc3QjtBQUVELE1BQU0sT0FBTyxXQUFZLFNBQVEsVUFBVTtJQVMxQyxZQUNrQixXQUFnQixFQUNqQyxZQUEwQixFQUNULFVBQXVCLEVBQ3ZCLFdBQXlCO1FBRTFDLEtBQUssRUFBRSxDQUFBO1FBTFUsZ0JBQVcsR0FBWCxXQUFXLENBQUs7UUFFaEIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN2QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVpuQyxZQUFPLEdBQW9CLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUMsNkJBQXdC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