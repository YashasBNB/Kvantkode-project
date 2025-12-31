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
import { localize } from '../../../../nls.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { PerfviewContrib } from '../browser/perfviewEditor.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
let StartupProfiler = class StartupProfiler {
    constructor(_dialogService, _environmentService, _textModelResolverService, _clipboardService, lifecycleService, extensionService, _openerService, _nativeHostService, _productService, _fileService, _labelService) {
        this._dialogService = _dialogService;
        this._environmentService = _environmentService;
        this._textModelResolverService = _textModelResolverService;
        this._clipboardService = _clipboardService;
        this._openerService = _openerService;
        this._nativeHostService = _nativeHostService;
        this._productService = _productService;
        this._fileService = _fileService;
        this._labelService = _labelService;
        // wait for everything to be ready
        Promise.all([
            lifecycleService.when(4 /* LifecyclePhase.Eventually */),
            extensionService.whenInstalledExtensionsRegistered(),
        ]).then(() => {
            this._stopProfiling();
        });
    }
    _stopProfiling() {
        if (!this._environmentService.args['prof-startup-prefix']) {
            return;
        }
        const profileFilenamePrefix = URI.file(this._environmentService.args['prof-startup-prefix']);
        const dir = dirname(profileFilenamePrefix);
        const prefix = basename(profileFilenamePrefix);
        const removeArgs = ['--prof-startup'];
        const markerFile = this._fileService
            .readFile(profileFilenamePrefix)
            .then((value) => removeArgs.push(...value.toString().split('|')))
            .then(() => this._fileService.del(profileFilenamePrefix, { recursive: true })) // (1) delete the file to tell the main process to stop profiling
            .then(() => new Promise((resolve) => {
            // (2) wait for main that recreates the fail to signal profiling has stopped
            const check = () => {
                this._fileService.exists(profileFilenamePrefix).then((exists) => {
                    if (exists) {
                        resolve();
                    }
                    else {
                        setTimeout(check, 500);
                    }
                });
            };
            check();
        }))
            .then(() => this._fileService.del(profileFilenamePrefix, { recursive: true })); // (3) finally delete the file again
        markerFile
            .then(() => {
            return this._fileService.resolve(dir).then((stat) => {
                return (stat.children
                    ? stat.children.filter((value) => value.resource.path.includes(prefix))
                    : []).map((stat) => stat.resource);
            });
        })
            .then((files) => {
            const profileFiles = files.reduce((prev, cur) => `${prev}${this._labelService.getUriLabel(cur)}\n`, '\n');
            return this._dialogService
                .confirm({
                type: 'info',
                message: localize('prof.message', 'Successfully created profiles.'),
                detail: localize('prof.detail', 'Please create an issue and manually attach the following files:\n{0}', profileFiles),
                primaryButton: localize({ key: 'prof.restartAndFileIssue', comment: ['&& denotes a mnemonic'] }, '&&Create Issue and Restart'),
                cancelButton: localize('prof.restart', 'Restart'),
            })
                .then((res) => {
                if (res.confirmed) {
                    Promise.all([
                        this._nativeHostService.showItemInFolder(files[0].fsPath),
                        this._createPerfIssue(files.map((file) => basename(file))),
                    ]).then(() => {
                        // keep window stable until restart is selected
                        return this._dialogService
                            .confirm({
                            type: 'info',
                            message: localize('prof.thanks', 'Thanks for helping us.'),
                            detail: localize('prof.detail.restart', "A final restart is required to continue to use '{0}'. Again, thank you for your contribution.", this._productService.nameLong),
                            primaryButton: localize({ key: 'prof.restart.button', comment: ['&& denotes a mnemonic'] }, '&&Restart'),
                        })
                            .then((res) => {
                            // now we are ready to restart
                            if (res.confirmed) {
                                this._nativeHostService.relaunch({ removeArgs });
                            }
                        });
                    });
                }
                else {
                    // simply restart
                    this._nativeHostService.relaunch({ removeArgs });
                }
            });
        });
    }
    async _createPerfIssue(files) {
        const reportIssueUrl = this._productService.reportIssueUrl;
        if (!reportIssueUrl) {
            return;
        }
        const contrib = PerfviewContrib.get();
        const ref = await this._textModelResolverService.createModelReference(contrib.getInputUri());
        try {
            await this._clipboardService.writeText(ref.object.textEditorModel.getValue());
        }
        finally {
            ref.dispose();
        }
        const body = `
1. :warning: We have copied additional data to your clipboard. Make sure to **paste** here. :warning:
1. :warning: Make sure to **attach** these files from your *home*-directory: :warning:\n${files.map((file) => `-\`${file}\``).join('\n')}
`;
        const baseUrl = reportIssueUrl;
        const queryStringPrefix = baseUrl.indexOf('?') === -1 ? '?' : '&';
        this._openerService.open(URI.parse(`${baseUrl}${queryStringPrefix}body=${encodeURIComponent(body)}`));
    }
};
StartupProfiler = __decorate([
    __param(0, IDialogService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, ITextModelService),
    __param(3, IClipboardService),
    __param(4, ILifecycleService),
    __param(5, IExtensionService),
    __param(6, IOpenerService),
    __param(7, INativeHostService),
    __param(8, IProductService),
    __param(9, IFileService),
    __param(10, ILabelService)
], StartupProfiler);
export { StartupProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvZWxlY3Ryb24tc2FuZGJveC9zdGFydHVwUHJvZmlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtB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