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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2V4dGVuc2lvblRyYW5zZmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFZNUYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUN2RCwwQkFBMEIsQ0FDMUIsQ0FBQTtBQUVELDhDQUE4QztBQUM5QyxNQUFNLGtCQUFrQixHQUFHO0lBQzFCLG9CQUFvQjtJQUNwQix5QkFBeUIsRUFBRSwyREFBMkQ7SUFDdEYsa0JBQWtCLEVBQUUsNEJBQTRCO0lBQ2hELHFFQUFxRTtJQUNyRSxxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQix3QkFBd0IsRUFBRSxRQUFRO0lBQ2xDLDRCQUE0QixFQUFFLE1BQU07SUFDcEMsdUJBQXVCLEVBQUUsYUFBYTtJQUN0QyxvQkFBb0I7Q0FDcEIsQ0FBQTtBQUVELE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBMEIsRUFBRSxFQUFFO0lBQ3BELE9BQU8sa0JBQWtC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