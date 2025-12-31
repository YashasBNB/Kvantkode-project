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
import { URI } from '../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(folders, fileService) {
        this.folders = folders;
        this.fileService = fileService;
    }
    /**
     * Starts the mock process.
     */
    async mock() {
        return await Promise.all(this.folders.map((folder) => {
            return this.mockFolder(folder);
        }));
    }
    /**
     * The internal implementation of the filesystem mocking process.
     *
     * @throws If a folder or file in the filesystem structure already exists.
     * 		   This is to prevent subtle errors caused by overwriting existing files.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder ? URI.joinPath(parentFolder, folder.name) : URI.file(folder.name);
        assert(!(await this.fileService.exists(folderUri)), `Folder '${folderUri.path}' already exists.`);
        try {
            await this.fileService.createFolder(folderUri);
        }
        catch (error) {
            throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                assert(!(await this.fileService.exists(childUri)), `File '${folderUri.path}' already exists.`);
                await this.fileService.writeFile(childUri, VSBuffer.fromString(child.contents));
                resolvedChildren.push({
                    ...child,
                    uri: childUri,
                });
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return {
            ...folder,
            uri: folderUri,
        };
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvbW9ja0ZpbGVzeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBNEJsRjs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFDMUIsWUFDa0IsT0FBc0IsRUFDUixXQUF5QjtRQUR2QyxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQ1IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFDdEQsQ0FBQztJQUVKOztPQUVHO0lBQ0ksS0FBSyxDQUFDLElBQUk7UUFDaEIsT0FBTyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDM0IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxLQUFLLENBQUMsVUFBVSxDQUN2QixNQUFtQixFQUNuQixZQUFrQjtRQUVsQixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEcsTUFBTSxDQUNMLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQzNDLFdBQVcsU0FBUyxDQUFDLElBQUksbUJBQW1CLENBQzVDLENBQUE7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLFNBQVMsQ0FBQyxNQUFNLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUM1RSxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBb0QsRUFBRSxDQUFBO1FBQzVFLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNwRCxvQkFBb0I7WUFDcEIsSUFBSSxVQUFVLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sQ0FDTCxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUMxQyxTQUFTLFNBQVMsQ0FBQyxJQUFJLG1CQUFtQixDQUMxQyxDQUFBO2dCQUVELE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7Z0JBRS9FLGdCQUFnQixDQUFDLElBQUksQ0FBQztvQkFDckIsR0FBRyxLQUFLO29CQUNSLEdBQUcsRUFBRSxRQUFRO2lCQUNiLENBQUMsQ0FBQTtnQkFFRixTQUFRO1lBQ1QsQ0FBQztZQUVELGdEQUFnRDtZQUNoRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxPQUFPO1lBQ04sR0FBRyxNQUFNO1lBQ1QsR0FBRyxFQUFFLFNBQVM7U0FDZCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyRVksY0FBYztJQUd4QixXQUFBLFlBQVksQ0FBQTtHQUhGLGNBQWMsQ0FxRTFCIn0=