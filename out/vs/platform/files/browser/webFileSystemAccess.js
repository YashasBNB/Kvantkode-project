/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Typings for the https://wicg.github.io/file-system-access
 *
 * Use `supported(window)` to find out if the browser supports this kind of API.
 */
export var WebFileSystemAccess;
(function (WebFileSystemAccess) {
    function supported(obj) {
        if (typeof obj?.showDirectoryPicker === 'function') {
            return true;
        }
        return false;
    }
    WebFileSystemAccess.supported = supported;
    function isFileSystemHandle(handle) {
        const candidate = handle;
        if (!candidate) {
            return false;
        }
        return (typeof candidate.kind === 'string' &&
            typeof candidate.queryPermission === 'function' &&
            typeof candidate.requestPermission === 'function');
    }
    WebFileSystemAccess.isFileSystemHandle = isFileSystemHandle;
    function isFileSystemFileHandle(handle) {
        return handle.kind === 'file';
    }
    WebFileSystemAccess.isFileSystemFileHandle = isFileSystemFileHandle;
    function isFileSystemDirectoryHandle(handle) {
        return handle.kind === 'directory';
    }
    WebFileSystemAccess.isFileSystemDirectoryHandle = isFileSystemDirectoryHandle;
})(WebFileSystemAccess || (WebFileSystemAccess = {}));
// TODO@bpasero adopt official types of FileSystemObserver
export var WebFileSystemObserver;
(function (WebFileSystemObserver) {
    function supported(obj) {
        return typeof obj?.FileSystemObserver === 'function';
    }
    WebFileSystemObserver.supported = supported;
})(WebFileSystemObserver || (WebFileSystemObserver = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmlsZVN5c3RlbUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2Jyb3dzZXIvd2ViRmlsZVN5c3RlbUFjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7OztHQUlHO0FBQ0gsTUFBTSxLQUFXLG1CQUFtQixDQStCbkM7QUEvQkQsV0FBaUIsbUJBQW1CO0lBQ25DLFNBQWdCLFNBQVMsQ0FBQyxHQUFpQjtRQUMxQyxJQUFJLE9BQU8sR0FBRyxFQUFFLG1CQUFtQixLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQU5lLDZCQUFTLFlBTXhCLENBQUE7SUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFlO1FBQ2pELE1BQU0sU0FBUyxHQUFHLE1BQXNDLENBQUE7UUFDeEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sQ0FDTixPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUNsQyxPQUFPLFNBQVMsQ0FBQyxlQUFlLEtBQUssVUFBVTtZQUMvQyxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsS0FBSyxVQUFVLENBQ2pELENBQUE7SUFDRixDQUFDO0lBWGUsc0NBQWtCLHFCQVdqQyxDQUFBO0lBRUQsU0FBZ0Isc0JBQXNCLENBQUMsTUFBd0I7UUFDOUQsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQTtJQUM5QixDQUFDO0lBRmUsMENBQXNCLHlCQUVyQyxDQUFBO0lBRUQsU0FBZ0IsMkJBQTJCLENBQzFDLE1BQXdCO1FBRXhCLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUE7SUFDbkMsQ0FBQztJQUplLCtDQUEyQiw4QkFJMUMsQ0FBQTtBQUNGLENBQUMsRUEvQmdCLG1CQUFtQixLQUFuQixtQkFBbUIsUUErQm5DO0FBRUQsMERBQTBEO0FBQzFELE1BQU0sS0FBVyxxQkFBcUIsQ0FJckM7QUFKRCxXQUFpQixxQkFBcUI7SUFDckMsU0FBZ0IsU0FBUyxDQUFDLEdBQWlCO1FBQzFDLE9BQU8sT0FBTyxHQUFHLEVBQUUsa0JBQWtCLEtBQUssVUFBVSxDQUFBO0lBQ3JELENBQUM7SUFGZSwrQkFBUyxZQUV4QixDQUFBO0FBQ0YsQ0FBQyxFQUpnQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXJDIn0=