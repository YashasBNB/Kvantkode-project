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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnNGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci90cnVzdGVkRG9tYWluc0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3ZELE9BQU8sRUFJTixRQUFRLEVBRVIsWUFBWSxHQUlaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG1DQUFtQyxFQUNuQywyQkFBMkIsR0FDM0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsTUFBTSxzQkFBc0IsR0FBRyxnQkFBZ0IsQ0FBQTtBQUUvQyxNQUFNLG9CQUFvQixHQUFVO0lBQ25DLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtJQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNqQixJQUFJLEVBQUUsQ0FBQztDQUNQLENBQUE7QUFFRCxNQUFNLG9CQUFvQixHQUFHOzs7Ozs7Ozs7Ozs7OztDQWM1QixDQUFBO0FBRUQsTUFBTSxzQkFBc0IsR0FBRzs7O0NBRzlC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