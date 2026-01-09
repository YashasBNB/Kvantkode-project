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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9uc011bHRpcGxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9mb3JtYXQvYnJvd3Nlci9mb3JtYXRBY3Rpb25zTXVsdGlwbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFLbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLDBCQUEwQixFQUMxQiw0Q0FBNEMsRUFDNUMsbUJBQW1CLEdBR25CLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLG9FQUFvRSxDQUFBO0FB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