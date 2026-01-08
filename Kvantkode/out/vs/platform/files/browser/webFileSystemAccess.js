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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmlsZVN5c3RlbUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvYnJvd3Nlci93ZWJGaWxlU3lzdGVtQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7O0dBSUc7QUFDSCxNQUFNLEtBQVcsbUJBQW1CLENBK0JuQztBQS9CRCxXQUFpQixtQkFBbUI7SUFDbkMsU0FBZ0IsU0FBUyxDQUFDLEdBQWlCO1FBQzFDLElBQUksT0FBTyxHQUFHLEVBQUUsbUJBQW1CLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBTmUsNkJBQVMsWUFNeEIsQ0FBQTtJQUVELFNBQWdCLGtCQUFrQixDQUFDLE1BQWU7UUFDakQsTUFBTSxTQUFTLEdBQUcsTUFBc0MsQ0FBQTtRQUN4RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxDQUNOLE9BQU8sU0FBUyxDQUFDLElBQUksS0FBSyxRQUFRO1lBQ2xDLE9BQU8sU0FBUyxDQUFDLGVBQWUsS0FBSyxVQUFVO1lBQy9DLE9BQU8sU0FBUyxDQUFDLGlCQUFpQixLQUFLLFVBQVUsQ0FDakQsQ0FBQTtJQUNGLENBQUM7SUFYZSxzQ0FBa0IscUJBV2pDLENBQUE7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxNQUF3QjtRQUM5RCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFBO0lBQzlCLENBQUM7SUFGZSwwQ0FBc0IseUJBRXJDLENBQUE7SUFFRCxTQUFnQiwyQkFBMkIsQ0FDMUMsTUFBd0I7UUFFeEIsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQTtJQUNuQyxDQUFDO0lBSmUsK0NBQTJCLDhCQUkxQyxDQUFBO0FBQ0YsQ0FBQyxFQS9CZ0IsbUJBQW1CLEtBQW5CLG1CQUFtQixRQStCbkM7QUFFRCwwREFBMEQ7QUFDMUQsTUFBTSxLQUFXLHFCQUFxQixDQUlyQztBQUpELFdBQWlCLHFCQUFxQjtJQUNyQyxTQUFnQixTQUFTLENBQUMsR0FBaUI7UUFDMUMsT0FBTyxPQUFPLEdBQUcsRUFBRSxrQkFBa0IsS0FBSyxVQUFVLENBQUE7SUFDckQsQ0FBQztJQUZlLCtCQUFTLFlBRXhCLENBQUE7QUFDRixDQUFDLEVBSmdCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJckMifQ==