/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
function linkAllowedByRules(link, rules) {
    assert.ok(isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should be allowed by rules\n${JSON.stringify(rules)}`);
}
function linkNotAllowedByRules(link, rules) {
    assert.ok(!isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should NOT be allowed by rules\n${JSON.stringify(rules)}`);
}
suite('Link protection domain matching', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple', () => {
        linkNotAllowedByRules('https://x.org', []);
        linkAllowedByRules('https://x.org', ['https://x.org']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org']);
        linkNotAllowedByRules('https://x.org', ['http://x.org']);
        linkNotAllowedByRules('http://x.org', ['https://x.org']);
        linkNotAllowedByRules('https://www.x.org', ['https://x.org']);
        linkAllowedByRules('https://www.x.org', ['https://www.x.org', 'https://y.org']);
    });
    test('localhost', () => {
        linkAllowedByRules('https://127.0.0.1', []);
        linkAllowedByRules('https://127.0.0.1:3000', []);
        linkAllowedByRules('https://localhost', []);
        linkAllowedByRules('https://kvantkode-backends.onrender.com', []);
    });
    test('* star', () => {
        linkAllowedByRules('https://a.x.org', ['https://*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['https://*.x.org']);
    });
    test('no scheme', () => {
        linkAllowedByRules('https://a.x.org', ['a.x.org']);
        linkAllowedByRules('https://a.x.org', ['*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['*.x.org']);
        linkAllowedByRules('https://x.org', ['*.x.org']);
    });
    test('sub paths', () => {
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo', ['x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['*.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['*.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/foo2', ['https://x.org/foo']);
        linkNotAllowedByRules('https://www.x.org/foo', ['https://x.org/foo']);
        linkNotAllowedByRules('https://a.x.org/bar', ['https://*.x.org/foo']);
        linkNotAllowedByRules('https://a.b.x.org/bar', ['https://*.x.org/foo']);
        linkAllowedByRules('https://github.com', ['https://github.com/foo/bar', 'https://github.com']);
    });
    test('ports', () => {
        linkNotAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8081/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8080/foo']);
    });
    test('ip addresses', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7/']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:3000/']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.*:*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
    });
    test('scheme match', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://*']);
        linkAllowedByRules('http://twitter.com', ['http://*']);
        linkAllowedByRules('http://twitter.com/hello', ['http://*']);
        linkNotAllowedByRules('https://192.168.1.7/', ['http://*']);
        linkNotAllowedByRules('https://twitter.com/', ['http://*']);
    });
    test('case normalization', () => {
        // https://github.com/microsoft/vscode/issues/99294
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', [
            'https://github.com/microsoft',
        ]);
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', [
            'https://github.com/microsoft',
        ]);
    });
    test('ignore query & fragment - https://github.com/microsoft/vscode/issues/156839', () => {
        linkAllowedByRules('https://github.com/login/oauth/authorize?foo=4', [
            'https://github.com/login/oauth/authorize',
        ]);
        linkAllowedByRules('https://github.com/login/oauth/authorize#foo', [
            'https://github.com/login/oauth/authorize',
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC90ZXN0L2Jyb3dzZXIvdHJ1c3RlZERvbWFpbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRW5FLFNBQVMsa0JBQWtCLENBQUMsSUFBWSxFQUFFLEtBQWU7SUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FDUixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUMxQyxTQUFTLElBQUksa0NBQWtDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDdEUsQ0FBQTtBQUNGLENBQUM7QUFDRCxTQUFTLHFCQUFxQixDQUFDLElBQVksRUFBRSxLQUFlO0lBQzNELE1BQU0sQ0FBQyxFQUFFLENBQ1IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUMzQyxTQUFTLElBQUksc0NBQXNDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDMUUsQ0FBQTtBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQzdDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIscUJBQXFCLENBQUMs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