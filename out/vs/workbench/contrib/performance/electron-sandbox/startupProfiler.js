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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9lbGVjdHJvbi1zYW5kYm94L3N0YXJ0dXBQcm9maWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxD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