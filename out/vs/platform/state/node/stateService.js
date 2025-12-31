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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RhdGUvbm9kZS9zdGF0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUEyQyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFLckQsTUFBTSxDQUFOLElBQWtCLFlBR2pCO0FBSEQsV0FBa0IsWUFBWTtJQUM3Qix5REFBUyxDQUFBO0lBQ1QscURBQU8sQ0FBQTtBQUNSLENBQUMsRUFIaUIsWUFBWSxLQUFaLFlBQVksUUFHN0I7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLFVBQVU7SUFTMUMsWUFDa0IsV0FBZ0IsRUFDakMsWUFBMEIsRUFDVCxVQUF1QixFQUN2QixXQUF5QjtRQUUxQyxLQUFLLEVBQUUsQ0FBQTtRQUxVLGdCQUFXLEdBQVgsV0FBVyxDQUFLO1FBRWhCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFabkMsWUFBTyxHQUFvQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlDLDZCQUF3QixHQUFHLEVBQUUsQ0FBQTtRQUk3Qixp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