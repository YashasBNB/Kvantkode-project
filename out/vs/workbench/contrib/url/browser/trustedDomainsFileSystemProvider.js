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
import { Event } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { FileType, IFileService, } from '../../../../platform/files/common/files.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { readTrustedDomains, TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, TRUSTED_DOMAINS_STORAGE_KEY, } from './trustedDomains.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const TRUSTED_DOMAINS_SCHEMA = 'trustedDomains';
const TRUSTED_DOMAINS_STAT = {
    type: FileType.File,
    ctime: Date.now(),
    mtime: Date.now(),
    size: 0,
};
const CONFIG_HELP_TEXT_PRE = `// Links matching one or more entries in the list below can be opened without link protection.
// The following examples show what entries can look like:
// - "https://microsoft.com": Matches this specific domain using https
// - "https://microsoft.com:8080": Matches this specific domain on this port using https
// - "https://microsoft.com:*": Matches this specific domain on any port using https
// - "https://microsoft.com/foo": Matches https://microsoft.com/foo and https://microsoft.com/foo/bar,
//   but not https://microsoft.com/foobar or https://microsoft.com/bar
// - "https://*.microsoft.com": Match all domains ending in "microsoft.com" using https
// - "microsoft.com": Match this specific domain using either http or https
// - "*.microsoft.com": Match all domains ending in "microsoft.com" using either http or https
// - "http://192.168.0.1: Matches this specific IP using http
// - "http://192.168.0.*: Matches all IP's with this prefix using http
// - "*": Match all domains using either http or https
//
`;
const CONFIG_HELP_TEXT_AFTER = `//
// You can use the "Manage Trusted Domains" command to open this file.
// Save this file to apply the trusted domains rules.
`;
const CONFIG_PLACEHOLDER_TEXT = `[
	// "https://microsoft.com"
]`;
function computeTrustedDomainContent(defaultTrustedDomains, trustedDomains, configuring) {
    let content = CONFIG_HELP_TEXT_PRE;
    if (defaultTrustedDomains.length > 0) {
        content += `// By default, VS Code trusts "localhost" as well as the following domains:\n`;
        defaultTrustedDomains.forEach((d) => {
            content += `// - "${d}"\n`;
        });
    }
    else {
        content += `// By default, VS Code trusts "localhost".\n`;
    }
    content += CONFIG_HELP_TEXT_AFTER;
    content += configuring ? `\n// Currently configuring trust for ${configuring}\n` : '';
    if (trustedDomains.length === 0) {
        content += CONFIG_PLACEHOLDER_TEXT;
    }
    else {
        content += JSON.stringify(trustedDomains, null, 2);
    }
    return content;
}
let TrustedDomainsFileSystemProvider = class TrustedDomainsFileSystemProvider {
    static { this.ID = 'workbench.contrib.trustedDomainsFileSystemProvider'; }
    constructor(fileService, storageService, instantiationService) {
        this.fileService = fileService;
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
        this.fileService.registerProvider(TRUSTED_DOMAINS_SCHEMA, this);
    }
    stat(resource) {
        return Promise.resolve(TRUSTED_DOMAINS_STAT);
    }
    async readFile(resource) {
        let trustedDomainsContent = this.storageService.get(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        const configuring = resource.fragment;
        const { defaultTrustedDomains, trustedDomains } = await this.instantiationService.invokeFunction(readTrustedDomains);
        if (!trustedDomainsContent ||
            trustedDomainsContent.indexOf(CONFIG_HELP_TEXT_PRE) === -1 ||
            trustedDomainsContent.indexOf(CONFIG_HELP_TEXT_AFTER) === -1 ||
            trustedDomainsContent.indexOf(configuring ?? '') === -1 ||
            [...defaultTrustedDomains, ...trustedDomains].some((d) => !assertIsDefined(trustedDomainsContent).includes(d))) {
            trustedDomainsContent = computeTrustedDomainContent(defaultTrustedDomains, trustedDomains, configuring);
        }
        const buffer = VSBuffer.fromString(trustedDomainsContent).buffer;
        return buffer;
    }
    writeFile(resource, content, opts) {
        try {
            const trustedDomainsContent = VSBuffer.wrap(content).toString();
            const trustedDomains = parse(trustedDomainsContent);
            this.storageService.store(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, trustedDomainsContent, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            this.storageService.store(TRUSTED_DOMAINS_STORAGE_KEY, JSON.stringify(trustedDomains) || '', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        }
        catch (err) { }
        return Promise.resolve();
    }
    watch(resource, opts) {
        return {
            dispose() {
                return;
            },
        };
    }
    mkdir(resource) {
        return Promise.resolve(undefined);
    }
    readdir(resource) {
        return Promise.resolve(undefined);
    }
    delete(resource, opts) {
        return Promise.resolve(undefined);
    }
    rename(from, to, opts) {
        return Promise.resolve(undefined);
    }
};
TrustedDomainsFileSystemProvider = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IInstantiationService)
], TrustedDomainsFileSystemProvider);
export { TrustedDomainsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnNGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9icm93c2VyL3RydXN0ZWREb21haW5zRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHdkQsT0FBTyxFQUlOLFFBQVEsRUFFUixZQUFZLEdBSVosTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsbUNBQW1DLEVBQ25DLDJCQUEyQixHQUMzQixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixDQUFBO0FBRS9DLE1BQU0sb0JBQW9CLEdBQVU7SUFDbkMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO0lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ2pCLElBQUksRUFBRSxDQUFDO0NBQ1AsQ0FBQTtBQUVELE1BQU0sb0JBQW9CLEdBQUc7Ozs7Ozs7Ozs7Ozs7O0NBYzVCLENBQUE7QUFFRCxNQUFNLHNCQUFzQixHQUFHOzs7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