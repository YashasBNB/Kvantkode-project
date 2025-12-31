/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { hasFileFolderCopyCapability, hasFileCloneCapability, } from '../../files/common/files.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { ResourceSet } from '../../../base/common/map.js';
/**
 * This is a wrapper on top of the local filesystem provider which will
 * 	- Convert the user data resources to file system scheme and vice-versa
 *  - Enforces atomic reads for user data
 */
export class FileUserDataProvider extends Disposable {
    constructor(fileSystemScheme, fileSystemProvider, userDataScheme, userDataProfilesService, uriIdentityService, logService) {
        super();
        this.fileSystemScheme = fileSystemScheme;
        this.fileSystemProvider = fileSystemProvider;
        this.userDataScheme = userDataScheme;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.capabilities = this.fileSystemProvider.capabilities;
        this.onDidChangeCapabilities = this.fileSystemProvider.onDidChangeCapabilities;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.watchResources = TernarySearchTree.forUris(() => !((this.capabilities & 1024) /* FileSystemProviderCapabilities.PathCaseSensitive */));
        this.atomicReadWriteResources = new ResourceSet((uri) => this.uriIdentityService.extUri.getComparisonKey(this.toFileSystemResource(uri)));
        this.updateAtomicReadWritesResources();
        this._register(userDataProfilesService.onDidChangeProfiles(() => this.updateAtomicReadWritesResources()));
        this._register(this.fileSystemProvider.onDidChangeFile((e) => this.handleFileChanges(e)));
    }
    updateAtomicReadWritesResources() {
        this.atomicReadWriteResources.clear();
        for (const profile of this.userDataProfilesService.profiles) {
            this.atomicReadWriteResources.add(profile.settingsResource);
            this.atomicReadWriteResources.add(profile.keybindingsResource);
            this.atomicReadWriteResources.add(profile.tasksResource);
            this.atomicReadWriteResources.add(profile.extensionsResource);
        }
    }
    open(resource, opts) {
        return this.fileSystemProvider.open(this.toFileSystemResource(resource), opts);
    }
    close(fd) {
        return this.fileSystemProvider.close(fd);
    }
    read(fd, pos, data, offset, length) {
        return this.fileSystemProvider.read(fd, pos, data, offset, length);
    }
    write(fd, pos, data, offset, length) {
        return this.fileSystemProvider.write(fd, pos, data, offset, length);
    }
    watch(resource, opts) {
        this.watchResources.set(resource, resource);
        const disposable = this.fileSystemProvider.watch(this.toFileSystemResource(resource), opts);
        return toDisposable(() => {
            this.watchResources.delete(resource);
            disposable.dispose();
        });
    }
    stat(resource) {
        return this.fileSystemProvider.stat(this.toFileSystemResource(resource));
    }
    mkdir(resource) {
        return this.fileSystemProvider.mkdir(this.toFileSystemResource(resource));
    }
    rename(from, to, opts) {
        return this.fileSystemProvider.rename(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
    }
    readFile(resource, opts) {
        return this.fileSystemProvider.readFile(this.toFileSystemResource(resource), opts);
    }
    readFileStream(resource, opts, token) {
        return this.fileSystemProvider.readFileStream(this.toFileSystemResource(resource), opts, token);
    }
    readdir(resource) {
        return this.fileSystemProvider.readdir(this.toFileSystemResource(resource));
    }
    enforceAtomicReadFile(resource) {
        return this.atomicReadWriteResources.has(resource);
    }
    writeFile(resource, content, opts) {
        return this.fileSystemProvider.writeFile(this.toFileSystemResource(resource), content, opts);
    }
    enforceAtomicWriteFile(resource) {
        if (this.atomicReadWriteResources.has(resource)) {
            return { postfix: '.vsctmp' };
        }
        return false;
    }
    delete(resource, opts) {
        return this.fileSystemProvider.delete(this.toFileSystemResource(resource), opts);
    }
    copy(from, to, opts) {
        if (hasFileFolderCopyCapability(this.fileSystemProvider)) {
            return this.fileSystemProvider.copy(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
        }
        throw new Error('copy not supported');
    }
    cloneFile(from, to) {
        if (hasFileCloneCapability(this.fileSystemProvider)) {
            return this.fileSystemProvider.cloneFile(this.toFileSystemResource(from), this.toFileSystemResource(to));
        }
        throw new Error('clone not supported');
    }
    handleFileChanges(changes) {
        const userDataChanges = [];
        for (const change of changes) {
            if (change.resource.scheme !== this.fileSystemScheme) {
                continue; // only interested in file schemes
            }
            const userDataResource = this.toUserDataResource(change.resource);
            if (this.watchResources.findSubstr(userDataResource)) {
                userDataChanges.push({
                    resource: userDataResource,
                    type: change.type,
                    cId: change.cId,
                });
            }
        }
        if (userDataChanges.length) {
            this.logService.debug('User data changed');
            this._onDidChangeFile.fire(userDataChanges);
        }
    }
    toFileSystemResource(userDataResource) {
        return userDataResource.with({ scheme: this.fileSystemScheme });
    }
    toUserDataResource(fileSystemResource) {
        return fileSystemResource.with({ scheme: this.userDataScheme });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVVzZXJEYXRhUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YS9jb21tb24vZmlsZVVzZXJEYXRhUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQWFOLDJCQUEyQixFQU8zQixzQkFBc0IsR0FHdEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUtwQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHekQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxvQkFDWixTQUFRLFVBQVU7SUFvQmxCLFlBQ2tCLGdCQUF3QixFQUN4QixrQkFLaUMsRUFDakMsY0FBc0IsRUFDdEIsdUJBQWlELEVBQ2pELGtCQUF1QyxFQUN2QyxVQUF1QjtRQUV4QyxLQUFLLEVBQUUsQ0FBQTtRQVpVLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtRQUN4Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBS2U7UUFDakMsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFDdEIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNqRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFHeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFBO1FBQ3hELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUE7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