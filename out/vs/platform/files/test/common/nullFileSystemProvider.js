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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3QvY29tbW9uL251bGxGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWlCOUUsTUFBTSxPQUFPLHNCQUFzQjtJQVNsQyxZQUFvQixvQkFBdUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7UUFBNUQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEyQztRQVJoRixpQkFBWSxzREFBMEU7UUFFckUsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUN0RCw0QkFBdUIsR0FBZ0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQTtRQUVsRSxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBMEIsQ0FBQTtRQUNoRSxvQkFBZSxHQUFrQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0lBRUYsQ0FBQztJQUVwRixvQkFBb0IsQ0FBQyxPQUFzQjtRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBNEM7UUFDM0QsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7UUFFaEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBYSxFQUFFLElBQW1CO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYTtRQUN2QixPQUFPLFNBQVUsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFhO1FBQ3hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWE7UUFDMUIsT0FBTyxTQUFVLENBQUE7SUFDbEIsQ0FBQztJQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBYSxFQUFFLElBQXdCO1FBQ25ELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVMsRUFBRSxFQUFPLEVBQUUsSUFBMkI7UUFDM0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBUyxFQUFFLEVBQU8sRUFBRSxJQUEyQjtRQUN6RCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhO1FBQzNCLE9BQU8sU0FBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxjQUFjLENBQ2IsUUFBYSxFQUNiLElBQTRCLEVBQzVCLEtBQXdCO1FBRXhCLE9BQU8sU0FBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQWEsRUFBRSxPQUFtQixFQUFFLElBQXVCO1FBQzFFLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQWEsRUFBRSxJQUFzQjtRQUMvQyxPQUFPLFNBQVUsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFVO1FBQ3JCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUNULEVBQVUsRUFDVixHQUFXLEVBQ1gsSUFBZ0IsRUFDaEIsTUFBYyxFQUNkLE1BQWM7UUFFZCxPQUFPLFNBQVUsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsS0FBSyxDQUFDLEtBQUssQ0FDVixFQUFVLEVBQ1YsR0FBVyxFQUNYLElBQWdCLEVBQ2hCLE1BQWMsRUFDZCxNQUFjO1FBRWQsT0FBTyxTQUFVLENBQUE7SUFDbEIsQ0FBQztDQUNEIn0=