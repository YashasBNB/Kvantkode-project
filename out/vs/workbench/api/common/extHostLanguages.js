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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMYW5ndWFnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBRzlCLE9BQU8sS0FBSyxXQUFXLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBWSxzQkFBc0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzlGLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUloRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV4RixNQUFNLE9BQU8sZ0JBQWdCO0lBSzVCLFlBQ0MsV0FBeUIsRUFDUixVQUE0QixFQUM1QixTQUE0QixFQUM1QixlQUE0QztRQUY1QyxlQUFVLEdBQVYsVUFBVSxDQUFrQjtRQUM1QixjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixvQkFBZSxHQUFmLGVBQWUsQ0FBNkI7UUFOdEQsaUJBQVksR0FBYSxFQUFFLENBQUE7UUE0RDNCLGdCQUFXLEdBQVcsQ0FBQyxDQUFBO1FBQ3ZCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBckQvQixJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELGtCQUFrQixDQUFDLEdBQWE7UUFDL0IsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENB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