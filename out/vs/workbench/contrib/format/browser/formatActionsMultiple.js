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
var DefaultFormatter_1;
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { formatDocumentRangesWithProvider, formatDocumentWithProvider, getRealAndSyntheticDocumentFormattersOrdered, FormattingConflicts, } from '../../../../editor/contrib/format/browser/format.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IExtensionService, toExtension } from '../../../services/extensions/common/extensions.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { generateUuid } from '../../../../base/common/uuid.js';
let DefaultFormatter = class DefaultFormatter extends Disposable {
    static { DefaultFormatter_1 = this; }
    static { this.configName = 'editor.defaultFormatter'; }
    static { this.extensionIds = []; }
    static { this.extensionItemLabels = []; }
    static { this.extensionDescriptions = []; }
    constructor(_extensionService, _extensionEnablementService, _configService, _notificationService, _dialogService, _quickInputService, _languageService, _languageFeaturesService, _languageStatusService, _editorService) {
        super();
        this._extensionService = _extensionService;
        this._extensionEnablementService = _extensionEnablementService;
        this._configService = _configService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._languageService = _languageService;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageStatusService = _languageStatusService;
        this._editorService = _editorService;
        this._languageStatusStore = this._store.add(new DisposableStore());
        this._store.add(this._extensionService.onDidChangeExtensions(this._updateConfigValues, this));
        this._store.add(FormattingConflicts.setFormatterSelector((formatter, document, mode, kind) => this._selectFormatter(formatter, document, mode, kind)));
        this._store.add(_editorService.onDidActiveEditorChange(this._updateStatus, this));
        this._store.add(_languageFeaturesService.documentFormattingEditProvider.onDidChange(this._updateStatus, this));
        this._store.add(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(this._updateStatus, this));
        this._store.add(_configService.onDidChangeConfiguration((e) => e.affectsConfiguration(DefaultFormatter_1.configName) && this._updateStatus()));
        this._updateConfigValues();
    }
    async _updateConfigValues() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        let extensions = [...this._extensionService.extensions];
        extensions = extensions.sort((a, b) => {
            const boostA = a.categories?.find((cat) => cat === 'Formatters' || cat === 'Programming Languages');
            const boostB = b.categories?.find((cat) => cat === 'Formatters' || cat === 'Programming Languages');
            if (boostA && !boostB) {
                return -1;
            }
            else if (!boostA && boostB) {
                return 1;
            }
            else {
                return a.name.localeCompare(b.name);
            }
        });
        DefaultFormatter_1.extensionIds.length = 0;
        DefaultFormatter_1.extensionItemLabels.length = 0;
        DefaultFormatter_1.extensionDescriptions.length = 0;
        DefaultFormatter_1.extensionIds.push(null);
        DefaultFormatter_1.extensionItemLabels.push(nls.localize('null', 'None'));
        DefaultFormatter_1.extensionDescriptions.push(nls.localize('nullFormatterDescription', 'None'));
        for (const extension of extensions) {
            if (extension.main || extension.browser) {
                DefaultFormatter_1.extensionIds.push(extension.identifier.value);
                DefaultFormatter_1.extensionItemLabels.push(extension.displayName ?? '');
                DefaultFormatter_1.extensionDescriptions.push(extension.description ?? '');
            }
        }
    }
    static _maybeQuotes(s) {
        return s.match(/\s/) ? `'${s}'` : s;
    }
    async _analyzeFormatter(kind, formatter, document) {
        const defaultFormatterId = this._configService.getValue(DefaultFormatter_1.configName, {
            resource: document.uri,
            overrideIdentifier: document.getLanguageId(),
        });
        if (defaultFormatterId) {
            // good -> formatter configured
            const defaultFormatter = formatter.find((formatter) => ExtensionIdentifier.equals(formatter.extensionId, defaultFormatterId));
            if (defaultFormatter) {
                // formatter available
                return defaultFormatter;
            }
            // bad -> formatter gone
            const extension = await this._extensionService.getExtension(defaultFormatterId);
            if (extension && this._extensionEnablementService.isEnabled(toExtension(extension))) {
                // formatter does not target this file
                const langName = this._languageService.getLanguageName(document.getLanguageId()) ||
                    document.getLanguageId();
                const detail = kind === 1 /* FormattingKind.File */
                    ? nls.localize('miss.1', "Extension '{0}' is configured as formatter but it cannot format '{1}'-files", extension.displayName || extension.name, langName)
                    : nls.localize('miss.2', "Extension '{0}' is configured as formatter but it can only format '{1}'-files as a whole, not selections or parts of it.", extension.displayName || extension.name, langName);
                return detail;
            }
        }
        else if (formatter.length === 1) {
            // ok -> nothing configured but only one formatter available
            return formatter[0];
        }
        const langName = this._languageService.getLanguageName(document.getLanguageId()) || document.getLanguageId();
        const message = !defaultFormatterId
            ? nls.localize('config.needed', "There are multiple formatters for '{0}' files. One of them should be configured as default formatter.", DefaultFormatter_1._maybeQuotes(langName))
            : nls.localize('config.bad', "Extension '{0}' is configured as formatter but not available. Select a different default formatter to continue.", defaultFormatterId);
        return message;
    }
    async _selectFormatter(formatter, document, mode, kind) {
        const formatterOrMessage = await this._analyzeFormatter(kind, formatter, document);
        if (typeof formatterOrMessage !== 'string') {
            return formatterOrMessage;
        }
        if (mode !== 2 /* FormattingMode.Silent */) {
            // running from a user action -> show modal dialog so that users configure
            // a default formatter
            const { confirmed } = await this._dialogService.confirm({
                message: nls.localize('miss', 'Configure Default Formatter'),
                detail: formatterOrMessage,
                primaryButton: nls.localize({ key: 'do.config', comment: ['&& denotes a mnemonic'] }, '&&Configure...'),
            });
            if (confirmed) {
                return this._pickAndPersistDefaultFormatter(formatter, document);
            }
        }
        else {
            // no user action -> show a silent notification and proceed
            this._notificationService.prompt(Severity.Info, formatterOrMessage, [
                {
                    label: nls.localize('do.config.notification', 'Configure...'),
                    run: () => this._pickAndPersistDefaultFormatter(formatter, document),
                },
            ], { priority: NotificationPriority.SILENT });
        }
        return undefined;
    }
    async _pickAndPersistDefaultFormatter(formatter, document) {
        const picks = formatter.map((formatter, index) => {
            return {
                index,
                label: formatter.displayName || (formatter.extensionId ? formatter.extensionId.value : '?'),
                description: formatter.extensionId && formatter.extensionId.value,
            };
        });
        const langName = this._languageService.getLanguageName(document.getLanguageId()) || document.getLanguageId();
        const pick = await this._quickInputService.pick(picks, {
            placeHolder: nls.localize('select', "Select a default formatter for '{0}' files", DefaultFormatter_1._maybeQuotes(langName)),
        });
        if (!pick || !formatter[pick.index].extensionId) {
            return undefined;
        }
        this._configService.updateValue(DefaultFormatter_1.configName, formatter[pick.index].extensionId.value, {
            resource: document.uri,
            overrideIdentifier: document.getLanguageId(),
        });
        return formatter[pick.index];
    }
    // --- status item
    _updateStatus() {
        this._languageStatusStore.clear();
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        if (!editor || !editor.hasModel()) {
            return;
        }
        const document = editor.getModel();
        const formatter = getRealAndSyntheticDocumentFormattersOrdered(this._languageFeaturesService.documentFormattingEditProvider, this._languageFeaturesService.documentRangeFormattingEditProvider, document);
        if (formatter.length === 0) {
            return;
        }
        const cts = new CancellationTokenSource();
        this._languageStatusStore.add(toDisposable(() => cts.dispose(true)));
        this._analyzeFormatter(1 /* FormattingKind.File */, formatter, document).then((result) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            if (typeof result !== 'string') {
                return;
            }
            const command = {
                id: `formatter/configure/dfl/${generateUuid()}`,
                title: nls.localize('do.config.command', 'Configure...'),
            };
            this._languageStatusStore.add(CommandsRegistry.registerCommand(command.id, () => this._pickAndPersistDefaultFormatter(formatter, document)));
            this._languageStatusStore.add(this._languageStatusService.addStatus({
                id: 'formatter.conflict',
                name: nls.localize('summary', 'Formatter Conflicts'),
                selector: { language: document.getLanguageId(), pattern: document.uri.fsPath },
                severity: Severity.Error,
                label: nls.localize('formatter', 'Formatting'),
                detail: result,
                busy: false,
                source: '',
                command,
                accessibilityInfo: undefined,
            }));
        });
    }
};
DefaultFormatter = DefaultFormatter_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IConfigurationService),
    __param(3, INotificationService),
    __param(4, IDialogService),
    __param(5, IQuickInputService),
    __param(6, ILanguageService),
    __param(7, ILanguageFeaturesService),
    __param(8, ILanguageStatusService),
    __param(9, IEditorService)
], DefaultFormatter);
export { DefaultFormatter };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DefaultFormatter, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        [DefaultFormatter.configName]: {
            description: nls.localize('formatter.default', 'Defines a default formatter which takes precedence over all other formatter settings. Must be the identifier of an extension contributing a formatter.'),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFormatter.extensionIds,
            enumItemLabels: DefaultFormatter.extensionItemLabels,
            markdownEnumDescriptions: DefaultFormatter.extensionDescriptions,
        },
    },
});
async function showFormatterPick(accessor, model, formatters) {
    const quickPickService = accessor.get(IQuickInputService);
    const configService = accessor.get(IConfigurationService);
    const languageService = accessor.get(ILanguageService);
    const overrides = { resource: model.uri, overrideIdentifier: model.getLanguageId() };
    const defaultFormatter = configService.getValue(DefaultFormatter.configName, overrides);
    let defaultFormatterPick;
    const picks = formatters.map((provider, index) => {
        const isDefault = ExtensionIdentifier.equals(provider.extensionId, defaultFormatter);
        const pick = {
            index,
            label: provider.displayName || '',
            description: isDefault ? nls.localize('def', '(default)') : undefined,
        };
        if (isDefault) {
            // autofocus default pick
            defaultFormatterPick = pick;
        }
        return pick;
    });
    const configurePick = {
        label: nls.localize('config', 'Configure Default Formatter...'),
    };
    const pick = await quickPickService.pick([...picks, { type: 'separator' }, configurePick], {
        placeHolder: nls.localize('format.placeHolder', 'Select a formatter'),
        activeItem: defaultFormatterPick,
    });
    if (!pick) {
        // dismissed
        return undefined;
    }
    else if (pick === configurePick) {
        // config default
        const langName = languageService.getLanguageName(model.getLanguageId()) || model.getLanguageId();
        const pick = await quickPickService.pick(picks, {
            placeHolder: nls.localize('select', "Select a default formatter for '{0}' files", DefaultFormatter._maybeQuotes(langName)),
        });
        if (pick && formatters[pick.index].extensionId) {
            configService.updateValue(DefaultFormatter.configName, formatters[pick.index].extensionId.value, overrides);
        }
        return undefined;
    }
    else {
        // picked one
        return pick.index;
    }
}
registerEditorAction(class FormatDocumentMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument.multiple',
            label: nls.localize('formatDocument.label.multiple', 'Format Document With...'),
            alias: 'Format Document...',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasMultipleDocumentFormattingProvider),
            contextMenuOpts: {
                group: '1_modification',
                order: 1.3,
            },
        });
    }
    async run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
        const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
        if (typeof pick === 'number') {
            await instaService.invokeFunction(formatDocumentWithProvider, provider[pick], editor, 1 /* FormattingMode.Explicit */, CancellationToken.None);
        }
    }
});
registerEditorAction(class FormatSelectionMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatSelection.multiple',
            label: nls.localize('formatSelection.label.multiple', 'Format Selection With...'),
            alias: 'Format Code...',
            precondition: ContextKeyExpr.and(ContextKeyExpr.and(EditorContextKeys.writable), EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider),
            contextMenuOpts: {
                when: ContextKeyExpr.and(EditorContextKeys.hasNonEmptySelection),
                group: '1_modification',
                order: 1.31,
            },
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        let range = editor.getSelection();
        if (range.isEmpty()) {
            range = new Range(range.startLineNumber, 1, range.startLineNumber, model.getLineMaxColumn(range.startLineNumber));
        }
        const provider = languageFeaturesService.documentRangeFormattingEditProvider.ordered(model);
        const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
        if (typeof pick === 'number') {
            await instaService.invokeFunction(formatDocumentRangesWithProvider, provider[pick], editor, range, CancellationToken.None, true);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9uc011bHRpcGxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZm9ybWF0L2Jyb3dzZXIvZm9ybWF0QWN0aW9uc011bHRpcGxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBS2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQywwQkFBMEIsRUFDMUIsNENBQTRDLEVBQzVDLG1CQUFtQixHQUduQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJ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