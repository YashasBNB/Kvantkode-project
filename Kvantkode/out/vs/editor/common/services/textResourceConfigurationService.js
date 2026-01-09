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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Position } from '../core/position.js';
import { ILanguageService } from '../languages/language.js';
import { IModelService } from './model.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
let TextResourceConfigurationService = class TextResourceConfigurationService extends Disposable {
    constructor(configurationService, modelService, languageService) {
        super();
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._register(this.configurationService.onDidChangeConfiguration((e) => this._onDidChangeConfiguration.fire(this.toResourceConfigurationChangeEvent(e))));
    }
    getValue(resource, arg2, arg3) {
        if (typeof arg3 === 'string') {
            return this._getValue(resource, Position.isIPosition(arg2) ? arg2 : null, arg3);
        }
        return this._getValue(resource, null, typeof arg2 === 'string' ? arg2 : undefined);
    }
    updateValue(resource, key, value, configurationTarget) {
        const language = resource ? this.getLanguage(resource, null) : null;
        const configurationValue = this.configurationService.inspect(key, {
            resource,
            overrideIdentifier: language,
        });
        if (configurationTarget === undefined) {
            configurationTarget = this.deriveConfigurationTarget(configurationValue, language);
        }
        const overrideIdentifier = language && configurationValue.overrideIdentifiers?.includes(language) ? language : undefined;
        return this.configurationService.updateValue(key, value, { resource, overrideIdentifier }, configurationTarget);
    }
    deriveConfigurationTarget(configurationValue, language) {
        if (language) {
            if (configurationValue.memory?.override !== undefined) {
                return 8 /* ConfigurationTarget.MEMORY */;
            }
            if (configurationValue.workspaceFolder?.override !== undefined) {
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
            if (configurationValue.workspace?.override !== undefined) {
                return 5 /* ConfigurationTarget.WORKSPACE */;
            }
            if (configurationValue.userRemote?.override !== undefined) {
                return 4 /* ConfigurationTarget.USER_REMOTE */;
            }
            if (configurationValue.userLocal?.override !== undefined) {
                return 3 /* ConfigurationTarget.USER_LOCAL */;
            }
        }
        if (configurationValue.memory?.value !== undefined) {
            return 8 /* ConfigurationTarget.MEMORY */;
        }
        if (configurationValue.workspaceFolder?.value !== undefined) {
            return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
        if (configurationValue.workspace?.value !== undefined) {
            return 5 /* ConfigurationTarget.WORKSPACE */;
        }
        if (configurationValue.userRemote?.value !== undefined) {
            return 4 /* ConfigurationTarget.USER_REMOTE */;
        }
        return 3 /* ConfigurationTarget.USER_LOCAL */;
    }
    _getValue(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        if (typeof section === 'undefined') {
            return this.configurationService.getValue({ resource, overrideIdentifier: language });
        }
        return this.configurationService.getValue(section, {
            resource,
            overrideIdentifier: language,
        });
    }
    inspect(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        return this.configurationService.inspect(section, { resource, overrideIdentifier: language });
    }
    getLanguage(resource, position) {
        const model = this.modelService.getModel(resource);
        if (model) {
            return position
                ? model.getLanguageIdAtPosition(position.lineNumber, position.column)
                : model.getLanguageId();
        }
        return this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
    }
    toResourceConfigurationChangeEvent(configurationChangeEvent) {
        return {
            affectedKeys: configurationChangeEvent.affectedKeys,
            affectsConfiguration: (resource, configuration) => {
                const overrideIdentifier = resource ? this.getLanguage(resource, null) : undefined;
                if (configurationChangeEvent.affectsConfiguration(configuration, {
                    resource,
                    overrideIdentifier,
                })) {
                    return true;
                }
                if (overrideIdentifier) {
                    //TODO@bpasero workaround for https://github.com/microsoft/vscode/issues/240410
                    return configurationChangeEvent.affectedKeys.has(`[${overrideIdentifier}]`);
                }
                return false;
            },
        };
    }
};
TextResourceConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], TextResourceConfigurationService);
export { TextResourceConfigurationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUsxQyxPQUFPLEVBQ04scUJBQXFCLEdBSXJCLE1BQU0seURBQXlELENBQUE7QUFFekQsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FDWixTQUFRLFVBQVU7SUFVbEIsWUFDd0Isb0JBQTRELEVBQ3BFLFlBQTRDLEVBQ3pDLGVBQWtEO1FBRXBFLEtBQUssRUFBRSxDQUFBO1FBSmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBUnBELDhCQUF5QixHQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF5QyxDQUFDLENBQUE7UUFDckQsNkJBQXdCLEdBQ3ZDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7UUFRcEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FB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