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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RleHRSZXNvdXJjZUNvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFLMUMsT0FBTyxFQUNOLHFCQUFxQixHQUlyQixNQUFNLHlEQUF5RCxDQUFBO0FBRXpELElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBVWxCLFlBQ3dCLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUN6QyxlQUFrRDtRQUVwRSxLQUFLLEVBQUUsQ0FBQTtRQUppQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ3hCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQVJwRCw4QkFBeUIsR0FDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUMsQ0FBQyxDQUFBO1FBQ3JELDZCQUF3QixHQUN2QyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBUXBDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDeEQs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