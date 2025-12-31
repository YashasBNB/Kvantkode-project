/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// allow-any-unicode-file
import { strictEqual } from 'assert';
import { getKoreanAltChars } from '../../../common/naturalLanguage/korean.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../utils.js';
function getKoreanAltCharsForString(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const chars = getKoreanAltChars(text.charCodeAt(i));
        if (chars) {
            result += String.fromCharCode(...Array.from(chars));
        }
        else {
            result += text.charAt(i);
        }
    }
    return result;
}
suite('Korean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getKoreanAltChars', () => {
        test('Modern initial consonants', () => {
            const cases = new Map([
                ['ᄀ', 'r'],
                ['ᄁ', 'R'],
                ['ᄂ', 's'],
                ['ᄃ', 'e'],
                ['ᄄ', 'E'],
                ['ᄅ', 'f'],
                ['ᄆ', 'a'],
                ['ᄇ', 'q'],
                ['ᄈ', 'Q'],
                ['ᄉ', 't'],
                ['ᄊ', 'T'],
                ['ᄋ', 'd'],
                ['ᄌ', 'w'],
                ['ᄍ', 'W'],
                ['ᄎ', 'c'],
                ['ᄏ', 'z'],
                ['ᄐ', 'x'],
                ['ᄑ', 'v'],
                ['ᄒ', 'g'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" should result in "${alt}"`);
            }
        });
        test('Modern latter consonants', () => {
            const cases = new Map([
                ['ᆨ', 'r'],
                ['ᆩ', 'R'],
                ['ᆪ', 'rt'],
                ['ᆫ', 's'],
                ['ᆬ', 'sw'],
                ['ᆭ', 'sg'],
                ['ᆮ', 'e'],
                ['ᆯ', 'f'],
                ['ᆰ', 'fr'],
                ['ᆱ', 'fa'],
                ['ᆲ', 'fq'],
                ['ᆳ', 'ft'],
                ['ᆴ', 'fx'],
                ['ᆵ', 'fv'],
                ['ᆶ', 'fg'],
                ['ᆷ', 'a'],
                ['ᆸ', 'q'],
                ['ᆹ', 'qt'],
                ['ᆺ', 't'],
                ['ᆻ', 'T'],
                ['ᆼ', 'd'],
                ['ᆽ', 'w'],
                ['ᆾ', 'c'],
                ['ᆿ', 'z'],
                ['ᇀ', 'x'],
                ['ᇁ', 'v'],
                ['ᇂ', 'g'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        test('Modern vowels', () => {
            const cases = new Map([
                ['ᅡ', 'k'],
                ['ᅢ', 'o'],
                ['ᅣ', 'i'],
                ['ᅤ', 'O'],
                ['ᅥ', 'j'],
                ['ᅦ', 'p'],
                ['ᅧ', 'u'],
                ['ᅨ', 'P'],
                ['ᅩ', 'h'],
                ['ᅪ', 'hk'],
                ['ᅫ', 'ho'],
                ['ᅬ', 'hl'],
                ['ᅭ', 'y'],
                ['ᅮ', 'n'],
                ['ᅯ', 'nj'],
                ['ᅰ', 'np'],
                ['ᅱ', 'nl'],
                ['ᅲ', 'b'],
                ['ᅳ', 'm'],
                ['ᅴ', 'ml'],
                ['ᅵ', 'l'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        test('Compatibility Jamo', () => {
            const cases = new Map([
                ['ㄱ', 'r'],
                ['ㄲ', 'R'],
                ['ㄳ', 'rt'],
                ['ㄴ', 's'],
                ['ㄵ', 'sw'],
                ['ㄶ', 'sg'],
                ['ㄷ', 'e'],
                ['ㄸ', 'E'],
                ['ㄹ', 'f'],
                ['ㄺ', 'fr'],
                ['ㄻ', 'fa'],
                ['ㄼ', 'fq'],
                ['ㄽ', 'ft'],
                ['ㄾ', 'fx'],
                ['ㄿ', 'fv'],
                ['ㅀ', 'fg'],
                ['ㅁ', 'a'],
                ['ㅂ', 'q'],
                ['ㅃ', 'Q'],
                ['ㅄ', 'qt'],
                ['ㅅ', 't'],
                ['ㅆ', 'T'],
                ['ㅇ', 'd'],
                ['ㅈ', 'w'],
                ['ㅉ', 'W'],
                ['ㅊ', 'c'],
                ['ㅋ', 'z'],
                ['ㅌ', 'x'],
                ['ㅍ', 'v'],
                ['ㅎ', 'g'],
                ['ㅏ', 'k'],
                ['ㅐ', 'o'],
                ['ㅑ', 'i'],
                ['ㅒ', 'O'],
                ['ㅓ', 'j'],
                ['ㅔ', 'p'],
                ['ㅕ', 'u'],
                ['ㅖ', 'P'],
                ['ㅗ', 'h'],
                ['ㅘ', 'hk'],
                ['ㅙ', 'ho'],
                ['ㅚ', 'hl'],
                ['ㅛ', 'y'],
                ['ㅜ', 'n'],
                ['ㅝ', 'nj'],
                ['ㅞ', 'np'],
                ['ㅟ', 'nl'],
                ['ㅠ', 'b'],
                ['ㅡ', 'm'],
                ['ㅢ', 'ml'],
                ['ㅣ', 'l'],
                // HF: Hangul Filler (everything after this is archaic)
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        // There are too many characters to test exhaustively, so select some
        // real world use cases from this code base (workbench contrib names)
        test('Composed samples', () => {
            const cases = new Map([
                ['ㅁㅊㅊㄷㄴ냐ㅠㅑㅣㅑ쇼', 'accessibility'],
                ['ㅁㅊ채ㅕㅜㅅ뚜샤시드둣ㄴ', 'accountEntitlements'],
                ['며야ㅐ쳗ㄴ', 'audioCues'],
                ['ㅠㄱㅁ찯셰먁채ㅣㅐ걐ㄷㄱ2ㅆ디듣ㅅ교', 'bracketPairColorizer2Telemetry'],
                ['ㅠㅕㅣㅏㄸ얏', 'bulkEdit'],
                ['ㅊ미ㅣㅗㅑㄷㄱㅁㄱ초ㅛ', 'callHierarchy'],
                ['촘ㅅ', 'chat'],
                ['챙ㄷㅁㅊ샤ㅐㅜㄴ', 'codeActions'],
                ['챙ㄷㄸ야색', 'codeEditor'],
                ['채ㅡㅡ뭉ㄴ', 'commands'],
                ['채ㅡㅡ둣ㄴ', 'comments'],
                ['채ㅜ럏ㄸ테ㅐㄳㄷㄱ', 'configExporter'],
                ['채ㅜㅅㄷㅌ스두ㅕ', 'contextmenu'],
                ['쳔새ㅡㄸ야색', 'customEditor'],
                ['ㅇ듀ㅕㅎ', 'debug'],
                ['ㅇ덱ㄷㅊㅁㅅㄷㅇㄸㅌㅅ두냐ㅐㅜㅡㅑㅎㄱㅁ색', 'deprecatedExtensionMigrator'],
                ['ㄷ얏ㄴㄷㄴ냐ㅐㅜㄴ', 'editSessions'],
                ['드ㅡㄷㅅ', 'emmet'],
                ['ㄷㅌㅅ두냐ㅐㅜㄴ', 'extensions'],
                ['ㄷㅌㅅㄷ구밌ㄷ그ㅑㅜ미', 'externalTerminal'],
                ['ㄷㅌㅅㄷ구미ㅕ갸ㅒㅔ둗ㄱ', 'externalUriOpener'],
                ['랴ㅣㄷㄴ', 'files'],
                ['래ㅣ야ㅜㅎ', 'folding'],
                ['래금ㅅ', 'format'],
                ['ㅑㅟ묘ㅗㅑㅜㅅㄴ', 'inlayHints'],
                ['ㅑㅟㅑㅜㄷ촘ㅅ', 'inlineChat'],
                ['ㅑㅜㅅㄷㄱㅁㅊ샾ㄷ', 'interactive'],
                ['ㅑㄴ녇', 'issue'],
                ['ㅏ됴ㅠㅑㅜ야ㅜㅎㄴ', 'keybindings'],
                ['ㅣ무혐ㅎㄷㅇㄷㅅㄷㅊ샤ㅐㅜ', 'languageDetection'],
                ['ㅣ무혐ㅎㄷㄴㅅㅁ션', 'languageStatus'],
                ['ㅣㅑㅡㅑ샤ㅜ얓ㅁ색', 'limitIndicator'],
                ['ㅣㅑㄴㅅ', 'list'],
                ['ㅣㅐㅊ미ㅗㅑㄴ새교', 'localHistory'],
                ['ㅣㅐㅊ미ㅑㅋㅁ샤ㅐㅜ', 'localization'],
                ['ㅣㅐㅎㄴ', 'logs'],
                ['ㅡ메ㅔㄷㅇㄸ얏ㄴ', 'mappedEdits'],
                ['ㅡㅁ가애주', 'markdown'],
                ['ㅡㅁ갇ㄱㄴ', 'markers'],
                ['ㅡㄷㄱㅎㄷㄸ야색', 'mergeEditor'],
                ['ㅡㅕㅣ샤얄ㄹㄸ야색', 'multiDiffEditor'],
                ['ㅜㅐㅅ듀ㅐㅐㅏ', 'notebook'],
                ['ㅐㅕ시ㅑㅜㄷ', 'outline'],
                ['ㅐㅕ세ㅕㅅ', 'output'],
                ['ㅔㄷㄱ래그뭋ㄷ', 'performance'],
                ['ㅔㄱㄷㄹㄷㄱ둧ㄷㄴ', 'preferences'],
                ['벼ㅑ참ㅊㅊㄷㄴㄴ', 'quickaccess'],
                ['ㄱ디며ㅜ촏ㄱ', 'relauncher'],
                ['ㄱ드ㅐㅅㄷ', 'remote'],
                ['ㄱ드ㅐㅅㄷ쎠ㅜㅜ디', 'remoteTunnel'],
                ['ㄴㅁ노', 'sash'],
                ['ㄴ츠', 'scm'],
                ['ㄴㄷㅁㄱ초', 'search'],
                ['ㄴㄷㅁㄱ초ㄸ야색', 'searchEditor'],
                ['놈ㄱㄷ', 'share'],
                ['누ㅑㅔㅔㄷㅅㄴ', 'snippets'],
                ['넫ㄷ초', 'speech'],
                ['네ㅣㅁ노', 'splash'],
                ['녁ㅍ됸', 'surveys'],
                ['ㅅㅁㅎㄴ', 'tags'],
                ['ㅅㅁ난', 'tasks'],
                ['ㅅ디듣ㅅ교', 'telemetry'],
                ['ㅅㄷ그ㅑㅜ미', 'terminal'],
                ['ㅅㄷ그ㅑㅜ미채ㅜㅅ갸ㅠ', 'terminalContrib'],
                ['ㅅㄷㄴ샤ㅜㅎ', 'testing'],
                ['소듣ㄴ', 'themes'],
                ['샤ㅡ디ㅑㅜㄷ', 'timeline'],
                ['쇼ㅔ도ㅑㄷㄱㅁㄱ초ㅛ', 'typeHierarchy'],
                ['ㅕㅔㅇㅁㅅㄷ', 'update'],
                ['ㅕ기', 'url'],
                ['ㅕㄴㄷㄱㅇㅁㅅ몌개랴ㅣㄷ', 'userDataProfile'],
                ['ㅕㄴㄷㄱㅇㅁㅅㅁ뇨ㅜㅊ', 'userDataSync'],
                ['ㅈ듀퍋ㅈ', 'webview'],
                ['ㅈ듀퍋졔무디', 'webviewPanel'],
                ['ㅈ듀퍋ㅈ퍋ㅈ', 'webviewView'],
                ['ㅈ디채ㅡ듀무ㅜㄷㄱ', 'welcomeBanner'],
                ['ㅈ디채ㅡㄷ야미ㅐㅎ', 'welcomeDialog'],
                ['ㅈ디채ㅡㄷㅎㄷㅅ샤ㅜㅎㄴㅅㅁㄳㄷㅇ', 'welcomeGettingStarted'],
                ['ㅈ디채ㅡㄷ퍋ㅈㄴ', 'welcomeViews'],
                ['ㅈ디채ㅡㄷㅉ미ㅏ소개ㅕ호', 'welcomeWalkthrough'],
                ['재가넴ㅊㄷ', 'workspace'],
                ['재가넴ㅊㄷㄴ', 'workspaces'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                // Compare with lower case as some cases do not have
                // corresponding hangul inputs
                strictEqual(getKoreanAltCharsForString(hangul).toLowerCase(), alt.toLowerCase(), `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia29yZWFuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL25hdHVyYWxMYW5ndWFnZS9rb3JlYW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyx5QkFBeUI7QUFFekIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFckUsU0FBUywwQkFBMEIsQ0FBQyxJQUFZO0lBQy9DLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtJQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25ELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7WUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUM7Z0JBQ3JCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQzthQUNWLENBQUMsQ0FBQTtZQUNGLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDN0MsV0FBVyxDQUNWLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxFQUNsQyxHQUFHLEVBQ0gsSUFBSSxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FDdkMsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUM7Z0JBQ3JCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2FBQ1YsQ0FBQyxDQUFBO1lBQ0YsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxXQUFXLENBQ1YsMEJBQTBCLENBQUMsTUFBTSxDQUFDLEVBQ2xDLEdBQUcsRUFDSCxJQUFJLE1BQU0sUUFBUSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUNoRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUM7Z0JBQ3JCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2FBQ1YsQ0FBQyxDQUFBO1lBQ0YsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxXQUFXLENBQ1YsMEJBQTBCLENBQUMsTUFBTSxDQUFDLEVBQ2xDLEdBQUcsRUFDSCxJQUFJLE1BQU0sUUFBUSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUNoRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtZQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQztnQkFDckIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxJ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