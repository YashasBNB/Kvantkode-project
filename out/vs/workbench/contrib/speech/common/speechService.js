/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { language } from '../../../../base/common/platform.js';
export const ISpeechService = createDecorator('speechService');
export const HasSpeechProvider = new RawContextKey('hasSpeechProvider', false, {
    type: 'boolean',
    description: localize('hasSpeechProvider', 'A speech provider is registered to the speech service.'),
});
export const SpeechToTextInProgress = new RawContextKey('speechToTextInProgress', false, {
    type: 'boolean',
    description: localize('speechToTextInProgress', 'A speech-to-text session is in progress.'),
});
export const TextToSpeechInProgress = new RawContextKey('textToSpeechInProgress', false, {
    type: 'boolean',
    description: localize('textToSpeechInProgress', 'A text-to-speech session is in progress.'),
});
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Canceled"] = 3] = "Canceled";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
export var AccessibilityVoiceSettingId;
(function (AccessibilityVoiceSettingId) {
    AccessibilityVoiceSettingId["SpeechTimeout"] = "accessibility.voice.speechTimeout";
    AccessibilityVoiceSettingId["AutoSynthesize"] = "accessibility.voice.autoSynthesize";
    AccessibilityVoiceSettingId["SpeechLanguage"] = "accessibility.voice.speechLanguage";
    AccessibilityVoiceSettingId["IgnoreCodeBlocks"] = "accessibility.voice.ignoreCodeBlocks";
})(AccessibilityVoiceSettingId || (AccessibilityVoiceSettingId = {}));
export const SPEECH_LANGUAGE_CONFIG = "accessibility.voice.speechLanguage" /* AccessibilityVoiceSettingId.SpeechLanguage */;
export const SPEECH_LANGUAGES = {
    ['da-DK']: {
        name: localize('speechLanguage.da-DK', 'Danish (Denmark)'),
    },
    ['de-DE']: {
        name: localize('speechLanguage.de-DE', 'German (Germany)'),
    },
    ['en-AU']: {
        name: localize('speechLanguage.en-AU', 'English (Australia)'),
    },
    ['en-CA']: {
        name: localize('speechLanguage.en-CA', 'English (Canada)'),
    },
    ['en-GB']: {
        name: localize('speechLanguage.en-GB', 'English (United Kingdom)'),
    },
    ['en-IE']: {
        name: localize('speechLanguage.en-IE', 'English (Ireland)'),
    },
    ['en-IN']: {
        name: localize('speechLanguage.en-IN', 'English (India)'),
    },
    ['en-NZ']: {
        name: localize('speechLanguage.en-NZ', 'English (New Zealand)'),
    },
    ['en-US']: {
        name: localize('speechLanguage.en-US', 'English (United States)'),
    },
    ['es-ES']: {
        name: localize('speechLanguage.es-ES', 'Spanish (Spain)'),
    },
    ['es-MX']: {
        name: localize('speechLanguage.es-MX', 'Spanish (Mexico)'),
    },
    ['fr-CA']: {
        name: localize('speechLanguage.fr-CA', 'French (Canada)'),
    },
    ['fr-FR']: {
        name: localize('speechLanguage.fr-FR', 'French (France)'),
    },
    ['hi-IN']: {
        name: localize('speechLanguage.hi-IN', 'Hindi (India)'),
    },
    ['it-IT']: {
        name: localize('speechLanguage.it-IT', 'Italian (Italy)'),
    },
    ['ja-JP']: {
        name: localize('speechLanguage.ja-JP', 'Japanese (Japan)'),
    },
    ['ko-KR']: {
        name: localize('speechLanguage.ko-KR', 'Korean (South Korea)'),
    },
    ['nl-NL']: {
        name: localize('speechLanguage.nl-NL', 'Dutch (Netherlands)'),
    },
    ['pt-PT']: {
        name: localize('speechLanguage.pt-PT', 'Portuguese (Portugal)'),
    },
    ['pt-BR']: {
        name: localize('speechLanguage.pt-BR', 'Portuguese (Brazil)'),
    },
    ['ru-RU']: {
        name: localize('speechLanguage.ru-RU', 'Russian (Russia)'),
    },
    ['sv-SE']: {
        name: localize('speechLanguage.sv-SE', 'Swedish (Sweden)'),
    },
    ['tr-TR']: {
        // allow-any-unicode-next-line
        name: localize('speechLanguage.tr-TR', 'Turkish (Türkiye)'),
    },
    ['zh-CN']: {
        name: localize('speechLanguage.zh-CN', 'Chinese (Simplified, China)'),
    },
    ['zh-HK']: {
        name: localize('speechLanguage.zh-HK', 'Chinese (Traditional, Hong Kong)'),
    },
    ['zh-TW']: {
        name: localize('speechLanguage.zh-TW', 'Chinese (Traditional, Taiwan)'),
    },
};
export function speechLanguageConfigToLanguage(config, lang = language) {
    if (typeof config === 'string') {
        if (config === 'auto') {
            if (lang !== 'en') {
                const langParts = lang.split('-');
                return speechLanguageConfigToLanguage(`${langParts[0]}-${(langParts[1] ?? langParts[0]).toUpperCase()}`);
            }
        }
        else {
            if (SPEECH_LANGUAGES[config]) {
                return config;
            }
        }
    }
    return 'en-US';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BlZWNoL2NvbW1vbi9zcGVlY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUk3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQTtBQUU5RSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxtQkFBbUIsRUFBRSxLQUFLLEVBQUU7SUFDdkYsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixtQkFBbUIsRUFDbkIsd0RBQXdELENBQ3hEO0NBQ0QsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUsd0JBQXdCLEVBQUUsS0FBSyxFQUFFO0lBQ2pHLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwwQ0FBMEMsQ0FBQztDQUMzRixDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSx3QkFBd0IsRUFBRSxLQUFLLEVBQUU7SUFDakcsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDBDQUEw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