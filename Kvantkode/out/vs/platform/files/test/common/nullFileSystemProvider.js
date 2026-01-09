/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class NullFileSystemProvider {
    constructor(disposableFactory = () => Disposable.None) {
        this.disposableFactory = disposableFactory;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */;
        this._onDidChangeCapabilities = new Emitter();
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this._onDidChangeFile = new Emitter();
        this.onDidChangeFile = this._onDidChangeFile.event;
    }
    emitFileChangeEvents(changes) {
        this._onDidChangeFile.fire(changes);
    }
    setCapabilities(capabilities) {
        this.capabilities = capabilities;
        this._onDidChangeCapabilities.fire();
    }
    watch(resource, opts) {
        return this.disposableFactory();
    }
    async stat(resource) {
        return undefined;
    }
    async mkdir(resource) {
        return undefined;
    }
    async readdir(resource) {
        return undefined;
    }
    async delete(resource, opts) {
        return undefined;
    }
    async rename(from, to, opts) {
        return undefined;
    }
    async copy(from, to, opts) {
        return undefined;
    }
    async readFile(resource) {
        return undefined;
    }
    readFileStream(resource, opts, token) {
        return undefined;
    }
    async writeFile(resource, content, opts) {
        return undefined;
    }
    async open(resource, opts) {
        return undefined;
    }
    async close(fd) {
        return undefined;
    }
    async read(fd, pos, data, offset, length) {
        return undefined;
    }
    async write(fd, pos, data, offset, length) {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9jb21tb24vbnVsbEZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBaUI5RSxNQUFNLE9BQU8sc0JBQXNCO0lBU2xDLFlBQW9CLG9CQUF1QyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtRQUE1RCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQTJDO1FBUmhGLGlCQUFZLHNEQUEwRTtRQUVyRSw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ3RELDRCQUF1QixHQUFnQixJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBRWxFLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFBO1FBQ2hFLG9CQUFlLEdBQWtDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7SUFFRixDQUFDO0lBRXBGLG9CQUFvQixDQUFDLE9BQXNCO1FBQzFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUE0QztRQUMzRCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUVoQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDckMsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFhLEVBQUUsSUFBbUI7UUFDdkMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFhO1FBQ3ZCLE9BQU8sU0FBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQWE7UUFDeEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBYTtRQUMxQixPQUFPLFNBQVUsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFhLEVBQUUsSUFBd0I7UUFDbkQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBUyxFQUFFLEVBQU8sRUFBRSxJQUEyQjtRQUMzRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFTLEVBQUUsRUFBTyxFQUFFLElBQTJCO1FBQ3pELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWE7UUFDM0IsT0FBTyxTQUFVLENBQUE7SUFDbEIsQ0FBQztJQUNELGNBQWMsQ0FDYixRQUFhLEVBQ2IsSUFBNEIsRUFDNUIsS0FBd0I7UUFFeEIsT0FBTyxTQUFVLENBQUE7SUFDbEIsQ0FBQztJQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBYSxFQUFFLE9BQW1CLEVBQUUsSUFBdUI7UUFDMUUsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYSxFQUFFLElBQXNCO1FBQy9DLE9BQU8sU0FBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQVU7UUFDckIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQ1QsRUFBVSxFQUNWLEdBQVcsRUFDWCxJQUFnQixFQUNoQixNQUFjLEVBQ2QsTUFBYztRQUVkLE9BQU8sU0FBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxDQUNWLEVBQVUsRUFDVixHQUFXLEVBQ1gsSUFBZ0IsRUFDaEIsTUFBYyxFQUNkLE1BQWM7UUFFZCxPQUFPLFNBQVUsQ0FBQTtJQUNsQixDQUFDO0NBQ0QifQ==