/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext, } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { StandardTokenType, Range, LanguageStatusSeverity } from './extHostTypes.js';
import Severity from '../../../base/common/severity.js';
import { disposableTimeout } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export class ExtHostLanguages {
    constructor(mainContext, _documents, _commands, _uriTransformer) {
        this._documents = _documents;
        this._commands = _commands;
        this._uriTransformer = _uriTransformer;
        this._languageIds = [];
        this._handlePool = 0;
        this._ids = new Set();
        this._proxy = mainContext.getProxy(MainContext.MainThreadLanguages);
    }
    $acceptLanguageIds(ids) {
        this._languageIds = ids;
    }
    async getLanguages() {
        return this._languageIds.slice(0);
    }
    async changeLanguage(uri, languageId) {
        await this._proxy.$changeLanguage(uri, languageId);
        const data = this._documents.getDocumentData(uri);
        if (!data) {
            throw new Error(`document '${uri.toString()}' NOT found`);
        }
        return data.document;
    }
    async tokenAtPosition(document, position) {
        const versionNow = document.version;
        const pos = typeConvert.Position.from(position);
        const info = await this._proxy.$tokensAtPosition(document.uri, pos);
        const defaultRange = {
            type: StandardTokenType.Other,
            range: document.getWordRangeAtPosition(position) ??
                new Range(position.line, position.character, position.line, position.character),
        };
        if (!info) {
            // no result
            return defaultRange;
        }
        const result = {
            range: typeConvert.Range.to(info.range),
            type: typeConvert.TokenType.to(info.type),
        };
        if (!result.range.contains(position)) {
            // bogous result
            return defaultRange;
        }
        if (versionNow !== document.version) {
            // concurrent change
            return defaultRange;
        }
        return result;
    }
    createLanguageStatusItem(extension, id, selector) {
        const handle = this._handlePool++;
        const proxy = this._proxy;
        const ids = this._ids;
        // enforce extension unique identifier
        const fullyQualifiedId = `${extension.identifier.value}/${id}`;
        if (ids.has(fullyQualifiedId)) {
            throw new Error(`LanguageStatusItem with id '${id}' ALREADY exists`);
        }
        ids.add(fullyQualifiedId);
        const data = {
            selector,
            id,
            name: extension.displayName ?? extension.name,
            severity: LanguageStatusSeverity.Information,
            command: undefined,
            text: '',
            detail: '',
            busy: false,
        };
        let soonHandle;
        const commandDisposables = new DisposableStore();
        const updateAsync = () => {
            soonHandle?.dispose();
            if (!ids.has(fullyQualifiedId)) {
                console.warn(`LanguageStatusItem (${id}) from ${extension.identifier.value} has been disposed and CANNOT be updated anymore`);
                return; // disposed in the meantime
            }
            soonHandle = disposableTimeout(() => {
                commandDisposables.clear();
                this._proxy.$setLanguageStatus(handle, {
                    id: fullyQualifiedId,
                    name: data.name ?? extension.displayName ?? extension.name,
                    source: extension.displayName ?? extension.name,
                    selector: typeConvert.DocumentSelector.from(data.selector, this._uriTransformer),
                    label: data.text,
                    detail: data.detail ?? '',
                    severity: data.severity === LanguageStatusSeverity.Error
                        ? Severity.Error
                        : data.severity === LanguageStatusSeverity.Warning
                            ? Severity.Warning
                            : Severity.Info,
                    command: data.command && this._commands.toInternal(data.command, commandDisposables),
                    accessibilityInfo: data.accessibilityInformation,
                    busy: data.busy,
                });
            }, 0);
        };
        const result = {
            dispose() {
                commandDisposables.dispose();
                soonHandle?.dispose();
                proxy.$removeLanguageStatus(handle);
                ids.delete(fullyQualifiedId);
            },
            get id() {
                return data.id;
            },
            get name() {
                return data.name;
            },
            set name(value) {
                data.name = value;
                updateAsync();
            },
            get selector() {
                return data.selector;
            },
            set selector(value) {
                data.selector = value;
                updateAsync();
            },
            get text() {
                return data.text;
            },
            set text(value) {
                data.text = value;
                updateAsync();
            },
            set text2(value) {
                checkProposedApiEnabled(extension, 'languageStatusText');
                data.text = value;
                updateAsync();
            },
            get text2() {
                checkProposedApiEnabled(extension, 'languageStatusText');
                return data.text;
            },
            get detail() {
                return data.detail;
            },
            set detail(value) {
                data.detail = value;
                updateAsync();
            },
            get severity() {
                return data.severity;
            },
            set severity(value) {
                data.severity = value;
                updateAsync();
            },
            get accessibilityInformation() {
                return data.accessibilityInformation;
            },
            set accessibilityInformation(value) {
                data.accessibilityInformation = value;
                updateAsync();
            },
            get command() {
                return data.command;
            },
            set command(value) {
                data.command = value;
                updateAsync();
            },
            get busy() {
                return data.busy;
            },
            set busy(value) {
                data.busy = value;
                updateAsync();
            },
        };
        updateAsync();
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sV0FBVyxHQUlYLE1BQU0sdUJBQXVCLENBQUE7QUFHOUIsT0FBTyxLQUFLLFdBQVcsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFZLHNCQUFzQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDOUYsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBSWhGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXhGLE1BQU0sT0FBTyxnQkFBZ0I7SUFLNUIsWUFDQyxXQUF5QixFQUNSLFVBQTRCLEVBQzVCLFNBQTRCLEVBQzVCLGVBQTRDO1FBRjVDLGVBQVUsR0FBVixVQUFVLENBQWtCO1FBQzVCLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLG9CQUFlLEdBQWYsZUFBZSxDQUE2QjtRQU50RCxpQkFBWSxHQUFhLEVBQUUsQ0FBQTtRQTREM0IsZ0JBQVcsR0FBVyxDQUFDLENBQUE7UUFDdkIsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFyRC9CLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsa0JBQWtCLENBQUMsR0FBYTtRQUMvQixJQUFJ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