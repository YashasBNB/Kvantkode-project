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
import { Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { isObject } from '../../../base/common/types.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractPolicyService } from './policy.js';
function keysDiff(a, b) {
    const result = [];
    for (const key of new Set(Iterable.concat(a.keys(), b.keys()))) {
        if (a.get(key) !== b.get(key)) {
            result.push(key);
        }
    }
    return result;
}
let FilePolicyService = class FilePolicyService extends AbstractPolicyService {
    constructor(file, fileService, logService) {
        super();
        this.file = file;
        this.fileService = fileService;
        this.logService = logService;
        this.throttledDelayer = this._register(new ThrottledDelayer(500));
        const onDidChangePolicyFile = Event.filter(fileService.onDidFilesChange, (e) => e.affects(file));
        this._register(fileService.watch(file));
        this._register(onDidChangePolicyFile(() => this.throttledDelayer.trigger(() => this.refresh())));
    }
    async _updatePolicyDefinitions() {
        await this.refresh();
    }
    async read() {
        const policies = new Map();
        try {
            const content = await this.fileService.readFile(this.file);
            const raw = JSON.parse(content.value.toString());
            if (!isObject(raw)) {
                throw new Error("Policy file isn't a JSON object");
            }
            for (const key of Object.keys(raw)) {
                if (this.policyDefinitions[key]) {
                    policies.set(key, raw[key]);
                }
            }
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(`[FilePolicyService] Failed to read policies`, error);
            }
        }
        return policies;
    }
    async refresh() {
        const policies = await this.read();
        const diff = keysDiff(this.policies, policies);
        this.policies = policies;
        if (diff.length > 0) {
            this._onDidChange.fire(diff);
        }
    }
};
FilePolicyService = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], FilePolicyService);
export { FilePolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3BvbGljeS9jb21tb24vZmlsZVBvbGljeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEQsT0FBTyxFQUEyQyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUErQixNQUFNLGFBQWEsQ0FBQTtBQUVoRixTQUFTLFFBQVEsQ0FBSSxDQUFpQixFQUFFLENBQWlCO0lBQ3hELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtJQUUzQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNoRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFTSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLHFCQUFxQjtJQUczRCxZQUNrQixJQUFTLEVBQ1osV0FBMEMsRUFDM0MsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFKVSxTQUFJLEdBQUosSUFBSSxDQUFLO1FBQ0ssZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDMUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUxyQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQVM1RSxNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDaEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBRVMsS0FBSyxDQUFDLHdCQUF3QjtRQUN2QyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUk7UUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7UUFFbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFFaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUVELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNqQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUF5QixLQUFNLENBQUMsbUJBQW1CLCtDQUF1QyxFQUFFLENBQUM7Z0JBQzVGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVFLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBRXhCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyRFksaUJBQWlCO0lBSzNCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7R0FORCxpQkFBaUIsQ0FxRDdCIn0=