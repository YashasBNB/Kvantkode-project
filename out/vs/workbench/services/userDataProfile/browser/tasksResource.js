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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
let TasksResourceInitializer = class TasksResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const tasksContent = JSON.parse(content);
        if (!tasksContent.tasks) {
            this.logService.info(`Initializing Profile: No tasks to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.tasksResource, VSBuffer.fromString(tasksContent.tasks));
    }
};
TasksResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], TasksResourceInitializer);
export { TasksResourceInitializer };
let TasksResource = class TasksResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const tasksContent = await this.getTasksResourceContent(profile);
        return JSON.stringify(tasksContent);
    }
    async getTasksResourceContent(profile) {
        const tasksContent = await this.getTasksContent(profile);
        return { tasks: tasksContent };
    }
    async apply(content, profile) {
        const tasksContent = JSON.parse(content);
        if (!tasksContent.tasks) {
            this.logService.info(`Importing Profile (${profile.name}): No tasks to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.tasksResource, VSBuffer.fromString(tasksContent.tasks));
    }
    async getTasksContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.tasksResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError &&
                error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
TasksResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], TasksResource);
export { TasksResource };
let TasksResourceTreeItem = class TasksResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "tasks" /* ProfileResourceType.Tasks */;
        this.handle = "tasks" /* ProfileResourceType.Tasks */;
        this.label = { label: localize('tasks', 'Tasks') };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [
            {
                handle: this.profile.tasksResource.toString(),
                resourceUri: this.profile.tasksResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource),
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.tasksResource, undefined, undefined],
                },
            },
        ];
    }
    async hasContent() {
        const tasksContent = await this.instantiationService
            .createInstance(TasksResource)
            .getTasksResourceContent(this.profile);
        return tasksContent.tasks !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(TasksResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.tasks;
    }
};
TasksResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], TasksResourceTreeItem);
export { TasksResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci90YXNrc1Jlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixZQUFZLEdBQ1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFLNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNGLE9BQU8sRUFLTix1QkFBdUIsR0FDdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQU05QixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3QjtJQUNwQyxZQUMyQyxzQkFBK0MsRUFDMUQsV0FBeUIsRUFDMUIsVUFBdUI7UUFGWCwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQzFELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQzFCLGVBQVUsR0FBVixVQUFVLENBQWE7SUFDbkQsQ0FBQztJQUVKLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBZTtRQUMvQixNQUFNLFlBQVksR0FBMEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMv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