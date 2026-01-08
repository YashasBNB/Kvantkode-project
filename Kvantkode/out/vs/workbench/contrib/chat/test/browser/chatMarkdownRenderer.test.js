/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatMarkdownRenderer } from '../../browser/chatMarkdownRenderer.js';
import { ITrustedDomainService } from '../../../url/browser/trustedDomainService.js';
import { MockTrustedDomainService } from '../../../url/test/browser/mockTrustedDomainService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('ChatMarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testRenderer;
    setup(() => {
        const instantiationService = store.add(workbenchInstantiationService(undefined, store));
        instantiationService.stub(ITrustedDomainService, new MockTrustedDomainService(['http://allowed.com']));
        testRenderer = instantiationService.createInstance(ChatMarkdownRenderer, {});
    });
    test('simple', async () => {
        const md = new MarkdownString('a');
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.textContent);
    });
    test('supportHtml with one-line markdown', async () => {
        const md = new MarkdownString('**hello**');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
        const md2 = new MarkdownString('1. [_hello_](https://example.com) test **text**');
        md2.supportHtml = true;
        const result2 = store.add(testRenderer.render(md2));
        await assertSnapshot(result2.element.outerHTML);
    });
    test('invalid HTML', async () => {
        const md = new MarkdownString('1<canvas>2<details>3</details></canvas>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('invalid HTML with attributes', async () => {
        const md = new MarkdownString('1<details id="id1" style="display: none">2<details id="my id 2">3</details></details>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('valid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<ul>
	<li>1</li>
	<li><b>hi</b></li>
</ul>
<pre><code>code here</code></pre>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('mixed valid and invalid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<details>
<ul>
	<li><span><details><i>1</i></details></span></li>
	<li><b>hi</b></li>
</ul>
</details>
<pre><canvas>canvas here</canvas></pre><details></details>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('self-closing elements', async () => {
        const md = new MarkdownString('<area><hr><br><input type="text" value="test">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('html comments', async () => {
        const md = new MarkdownString('<!-- comment1 <div></div> --><div>content</div><!-- comment2 -->');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('CDATA', async () => {
        const md = new MarkdownString('<![CDATA[<div>content</div>]]>');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('remote images', async () => {
        const md = new MarkdownString('<img src="http://allowed.com/image.jpg"> <img src="http://disallowed.com/image.jpg">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLFlBQWtDLENBQUE7SUFDdEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN2RixvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLHFCQUFxQixFQUNyQixJQUFJLHdCQUF3QixDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsWUFBWSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFF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