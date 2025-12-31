/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLAnchorElement } from '../../../../../base/browser/dom.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITunnelService } from '../../../../../platform/tunnel/common/tunnel.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { LinkDetector } from '../../browser/linkDetector.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Debug - Link Detector', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let linkDetector;
    /**
     * Instantiate a {@link LinkDetector} for use by the functions being tested.
     */
    setup(() => {
        const instantiationService = (workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(ITunnelService, { canTunnel: () => false });
        linkDetector = instantiationService.createInstance(LinkDetector);
    });
    /**
     * Assert that a given Element is an anchor element.
     *
     * @param element The Element to verify.
     */
    function assertElementIsLink(element) {
        assert(isHTMLAnchorElement(element));
    }
    test('noLinks', () => {
        const input = 'I am a string';
        const expectedOutput = '<span>I am a string</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('trailingNewline', () => {
        const input = 'I am a string\n';
        const expectedOutput = '<span>I am a string\n</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('trailingNewlineSplit', () => {
        const input = 'I am a string\n';
        const expectedOutput = '<span>I am a string\n</span>';
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('singleLineLink', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const expectedOutput = isWindows
            ? '<span><a tabindex="0">C:\\foo\\bar.js:12:34<\/a><\/span>'
            : '<span><a tabindex="0">/Users/foo/bar.js:12:34<\/a><\/span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
        assert.strictEqual(isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34', output.firstElementChild.textContent);
    });
    test('relativeLink', () => {
        const input = '\./foo/bar.js';
        const expectedOutput = '<span>\./foo/bar.js</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('relativeLinkWithWorkspace', async () => {
        const input = '\./foo/bar.js';
        const output = linkDetector.linkify(input, false, new WorkspaceFolder({ uri: URI.file('/path/to/workspace'), name: 'ws', index: 0 }));
        assert.strictEqual('SPAN', output.tagName);
        assert.ok(output.outerHTML.indexOf('link') >= 0);
    });
    test('singleLineLinkAndText', function () {
        const input = isWindows ? 'The link: C:/foo/bar.js:12:34' : 'The link: /Users/foo/bar.js:12:34';
        const expectedOutput = /^<span>The link: <a tabindex="0">.*\/foo\/bar.js:12:34<\/a><\/span>$/;
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.children[0].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[0]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[0].textContent);
    });
    test('singleLineMultipleLinks', () => {
        const input = isWindows
            ? 'Here is a link C:/foo/bar.js:12:34 and here is another D:/boo/far.js:56:78'
            : 'Here is a link /Users/foo/bar.js:12:34 and here is another /Users/boo/far.js:56:78';
        const expectedOutput = /^<span>Here is a link <a tabindex="0">.*\/foo\/bar.js:12:34<\/a> and here is another <a tabindex="0">.*\/boo\/far.js:56:78<\/a><\/span>$/;
        const output = linkDetector.linkify(input);
        assert.strictEqual(2, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.children[0].tagName);
        assert.strictEqual('A', output.children[1].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[0]);
        assertElementIsLink(output.children[1]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[0].textContent);
        assert.strictEqual(isWindows ? 'D:/boo/far.js:56:78' : '/Users/boo/far.js:56:78', output.children[1].textContent);
    });
    test('multilineNoLinks', () => {
        const input = 'Line one\nLine two\nLine three';
        const expectedOutput = /^<span><span>Line one\n<\/span><span>Line two\n<\/span><span>Line three<\/span><\/span>$/;
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(3, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual('SPAN', output.children[2].tagName);
        assert(expectedOutput.test(output.outerHTML));
    });
    test('multilineTrailingNewline', () => {
        const input = 'I am a string\nAnd I am another\n';
        const expectedOutput = '<span><span>I am a string\n<\/span><span>And I am another\n<\/span><\/span>';
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(2, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('multilineWithLinks', () => {
        const input = isWindows
            ? 'I have a link for you\nHere it is: C:/foo/bar.js:12:34\nCool, huh?'
            : 'I have a link for you\nHere it is: /Users/foo/bar.js:12:34\nCool, huh?';
        const expectedOutput = /^<span><span>I have a link for you\n<\/span><span>Here it is: <a tabindex="0">.*\/foo\/bar.js:12:34<\/a>\n<\/span><span>Cool, huh\?<\/span><\/span>$/;
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(3, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual('SPAN', output.children[2].tagName);
        assert.strictEqual('A', output.children[1].children[0].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[1].children[0]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[1].children[0].textContent);
    });
    test('highlightNoLinks', () => {
        const input = 'I am a string';
        const highlights = [{ start: 2, end: 5 }];
        const expectedOutput = '<span>I <span class="highlight">am </span>a string</span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('highlightWithLink', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 0, end: 5 }];
        const expectedOutput = isWindows
            ? '<span><a tabindex="0"><span class="highlight">C:\\fo</span>o\\bar.js:12:34</a></span>'
            : '<span><a tabindex="0"><span class="highlight">/User</span>s/foo/bar.js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkStart', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 0, end: 10 }];
        const expectedOutput = isWindows
            ? '<span><a tabindex="0"><span class="highlight">C:\\foo\\bar</span>.js:12:34</a></span>'
            : '<span><a tabindex="0"><span class="highlight">/Users/foo</span>/bar.js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkEnd', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 10, end: 20 }];
        const expectedOutput = isWindows
            ? '<span><a tabindex="0">C:\\foo\\bar<span class="highlight">.js:12:34</span></a></span>'
            : '<span><a tabindex="0">/Users/foo<span class="highlight">/bar.js:12</span>:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkStartAndEnd', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 5, end: 15 }];
        const expectedOutput = isWindows
            ? '<span><a tabindex="0">C:\\fo<span class="highlight">o\\bar.js:1</span>2:34</a></span>'
            : '<span><a tabindex="0">/User<span class="highlight">s/foo/bar.</span>js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvbGlua0RldGVjdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHakcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQzdELElBQUksWUFBMEIsQ0FBQTtJQUU5Qjs7T0FFRztJQUNILEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLG9CQUFvQixHQUF1RCxDQUNoRiw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQ3JELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDckUsWUFB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