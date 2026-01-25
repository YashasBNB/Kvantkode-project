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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVVzZXJEYXRhUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhL2NvbW1vbi9maWxlVXNlckRhdGFQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBYU4sMkJBQTJCLEVBTzNCLHNCQUFzQixHQUd0QixNQUFNLDZCQUE2QixDQUFBO0FBS3BDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUd6RDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLG9CQUNaLFNBQVEsVUFBVTtJQW9CbEIsWUFDa0IsZ0JBQXdCLEVBQ3hCLGtCQUtpQyxFQUNqQyxjQUFzQixFQUN0Qix1QkFBaUQsRUFDakQsa0JBQXVDLEVBQ3ZDLFVBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFBO1FBWlUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFRO1FBQ3hCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FLZTtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUN0Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUd4QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUE7UUFDeEQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIs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