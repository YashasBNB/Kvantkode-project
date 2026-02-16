/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { env } from '../../../../base/common/process.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IExtensionTransferService = createDecorator('ExtensionTransferService');
// Define extensions to skip when transferring
const extensionBlacklist = [
    // ignore extensions
    'ms-vscode-remote.remote', // ms-vscode-remote.remote-ssh, ms-vscode-remote.remote-wsl
    'ms-vscode.remote', // ms-vscode.remote-explorer
    // ignore other AI copilots that could conflict with Void keybindings
    'sourcegraph.cody-ai',
    'continue.continue',
    'codeium.codeium',
    'saoudrizwan.claude-dev', // cline
    'rooveterinaryinc.roo-cline', // roo
    'supermaven.supermaven', // supermaven
    // 'github.copilot',
];
const isBlacklisted = (fsPath) => {
    return extensionBlacklist.find((bItem) => fsPath?.includes(bItem));
};
let ExtensionTransferService = class ExtensionTransferService extends Disposable {
    constructor(_fileService) {
        super();
        this._fileService = _fileService;
    }
    async transferExtensions(os, fromEditor) {
        const transferTheseFiles = transferTheseFilesOfOS(os, fromEditor);
        const fileService = this._fileService;
        let errAcc = '';
        for (const { from, to, isExtensions } of transferTheseFiles) {
            // Check if the source file exists before attempting to copy
            try {
                if (!isExtensions) {
                    console.log('transferring item', from, to);
                    const exists = await fileService.exists(from);
                    if (exists) {
                        // Ensure the destination directory exists
                        const toParent = URI.joinPath(to, '..');
                        const toParentExists = await fileService.exists(toParent);
                        if (!toParentExists) {
                            await fileService.createFolder(toParent);
                        }
                        await fileService.copy(from, to, true);
                    }
                    else {
                        console.log(`Skipping file that doesn't exist: ${from.toString()}`);
                    }
                }
                // extensions folder
                else {
                    console.log('transferring extensions...', from, to);
                    const exists = await fileService.exists(from);
                    if (exists) {
                        const stat = await fileService.resolve(from);
                        const toParent = URI.joinPath(to); // extensions/
                        const toParentExists = await fileService.exists(toParent);
                        if (!toParentExists) {
                            await fileService.createFolder(toParent);
                        }
                        for (const extensionFolder of stat.children ?? []) {
                            const from = extensionFolder.resource;
                            const to = URI.joinPath(toParent, extensionFolder.name);
                            const toStat = await fileService.resolve(from);
                            if (toStat.isDirectory) {
                                if (!isBlacklisted(extensionFolder.resource.fsPath)) {
                                    await fileService.copy(from, to, true);
                                }
                            }
                            else if (toStat.isFile) {
                                if (extensionFolder.name === 'extensions.json') {
                                    try {
                                        const contentsStr = await fileService.readFile(from);
                                        const json = JSON.parse(contentsStr.value.toString());
                                        const j2 = json.filter((entry) => !isBlacklisted(entry?.identifier?.id));
                                        const jsonStr = JSON.stringify(j2);
                                        await fileService.writeFile(to, VSBuffer.fromString(jsonStr));
                                    }
                                    catch {
                                        console.log('Error copying extensions.json, skipping');
                                    }
                                }
                            }
                        }
                    }
                    else {
                        console.log(`Skipping file that doesn't exist: ${from.toString()}`);
                    }
                    console.log('done transferring extensions.');
                }
            }
            catch (e) {
                console.error('Error copying file:', e);
                errAcc += `Error copying ${from.toString()}: ${e}\n`;
            }
        }
        if (errAcc)
            return errAcc;
        return undefined;
    }
    async deleteBlacklistExtensions(os) {
        const fileService = this._fileService;
        const extensionsURI = getExtensionsFolder(os);
        if (!extensionsURI)
            return;
        const eURI = await fileService.resolve(extensionsURI);
        for (const child of eURI.children ?? []) {
            try {
                if (child.isDirectory) {
                    // if is blacklisted
                    if (isBlacklisted(child.resource.fsPath)) {
                        console.log('Deleting extension', child.resource.fsPath);
                        await fileService.del(child.resource, { recursive: true, useTrash: true });
                    }
                }
                else if (child.isFile) {
                    // if is extensions.json
                    if (child.name === 'extensions.json') {
                        console.log('Updating extensions.json', child.resource.fsPath);
                        try {
                            const contentsStr = await fileService.readFile(child.resource);
                            const json = JSON.parse(contentsStr.value.toString());
                            const j2 = json.filter((entry) => !isBlacklisted(entry?.identifier?.id));
                            const jsonStr = JSON.stringify(j2);
                            await fileService.writeFile(child.resource, VSBuffer.fromString(jsonStr));
                        }
                        catch {
                            console.log('Error copying extensions.json, skipping');
                        }
                    }
                }
            }
            catch (e) {
                console.error('Could not delete extension', child.resource.fsPath, e);
            }
        }
    }
};
ExtensionTransferService = __decorate([
    __param(0, IFileService)
], ExtensionTransferService);
registerSingleton(IExtensionTransferService, ExtensionTransferService, 0 /* InstantiationType.Eager */); // lazily loaded, even if Eager
const transferTheseFilesOfOS = (os, fromEditor = 'VS Code') => {
    if (os === null)
        throw new Error(`One-click switch is not possible in this environment.`);
    if (os === 'mac') {
        const homeDir = env['HOME'];
        if (!homeDir)
            throw new Error(`$HOME not found`);
        if (fromEditor === 'VS Code') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Cursor') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Windsurf') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
    }
    if (os === 'linux') {
        const homeDir = env['HOME'];
        if (!homeDir)
            throw new Error(`variable for $HOME location not found`);
        if (fromEditor === 'VS Code') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Cursor') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Windsurf') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
    }
    if (os === 'windows') {
        const appdata = env['APPDATA'];
        if (!appdata)
            throw new Error(`variable for %APPDATA% location not found`);
        const userprofile = env['USERPROFILE'];
        if (!userprofile)
            throw new Error(`variable for %USERPROFILE% location not found`);
        if (fromEditor === 'VS Code') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Cursor') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
        else if (fromEditor === 'Windsurf') {
            return [
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                },
                {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                },
            ];
        }
    }
    throw new Error(`os '${os}' not recognized or editor type '${fromEditor}' not supported for this OS`);
};
const getExtensionsFolder = (os) => {
    const t = transferTheseFilesOfOS(os, 'VS Code'); // from editor doesnt matter
    return t.find((f) => f.isExtensions)?.to;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVk1RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDBCQUEwQixDQUMxQixDQUFBO0FBRUQsOENBQThDO0FBQzlDLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsb0JBQW9CO0lBQ3BCLHlCQUF5QixFQUFFLDJEQUEyRDtJQUN0RixrQkFBa0IsRUFBRSw0QkFBNEI7SUFDaEQscUVBQXFFO0lBQ3JFLHFCQUFxQjtJQUNyQixtQkFBbUI7SUFDbkIsaUJBQWlCO0lBQ2pCLHdCQUF3QixFQUFFLFFBQVE7SUFDbEMsNEJBQTRCLEVBQUUsTUFBTTtJQUNwQyx1QkFBdUIsRUFBRSxhQUFhO0lBQ3RDLG9CQUFvQjtDQUNwQixDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxNQUEwQixFQUFF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