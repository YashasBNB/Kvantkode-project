/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { computeLinks } from '../../../common/languages/linkComputer.js';
class SimpleLinkComputerTarget {
    constructor(_lines) {
        this._lines = _lines;
        // Intentional Empty
    }
    getLineCount() {
        return this._lines.length;
    }
    getLineContent(lineNumber) {
        return this._lines[lineNumber - 1];
    }
}
function myComputeLinks(lines) {
    const target = new SimpleLinkComputerTarget(lines);
    return computeLinks(target);
}
function assertLink(text, extractedLink) {
    let startColumn = 0, endColumn = 0, chr, i = 0;
    for (i = 0; i < extractedLink.length; i++) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            startColumn = i + 1;
            break;
        }
    }
    for (i = extractedLink.length - 1; i >= 0; i--) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            endColumn = i + 2;
            break;
        }
    }
    const r = myComputeLinks([text]);
    assert.deepStrictEqual(r, [
        {
            range: {
                startLineNumber: 1,
                startColumn: startColumn,
                endLineNumber: 1,
                endColumn: endColumn,
            },
            url: extractedLink.substring(startColumn - 1, endColumn - 1),
        },
    ]);
}
suite('Editor Modes - Link Computer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Null model', () => {
        const r = computeLinks(null);
        assert.deepStrictEqual(r, []);
    });
    test('Parsing', () => {
        assertLink('x = "http://foo.bar";', '     http://foo.bar  ');
        assertLink('x = (http://foo.bar);', '     http://foo.bar  ');
        assertLink('x = [http://foo.bar];', '     http://foo.bar  ');
        assertLink("x = 'http://foo.bar';", '     http://foo.bar  ');
        assertLink('x =  http://foo.bar ;', '     http://foo.bar  ');
        assertLink('x = <http://foo.bar>;', '     http://foo.bar  ');
        assertLink('x = {http://foo.bar};', '     http://foo.bar  ');
        assertLink('(see http://foo.bar)', '     http://foo.bar  ');
        assertLink('[see http://foo.bar]', '     http://foo.bar  ');
        assertLink('{see http://foo.bar}', '     http://foo.bar  ');
        assertLink('<see http://foo.bar>', '     http://foo.bar  ');
        assertLink('<url>http://mylink.com</url>', '     http://mylink.com      ');
        assertLink('// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409', '                             https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409');
        assertLink('// Click here to learn more. https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx', '                             https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx');
        assertLink('// https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js', '   https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js');
        assertLink('<!-- !!! Do not remove !!!   WebContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->', '                                                https://go.microsoft.com/fwlink/?LinkId=166007                                                                                        ');
        assertLink('For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>', '                      https://go.microsoft.com/fwlink/?LinkId=166007         ');
        assertLink('For instructions, see https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx.</value>', '                      https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx         ');
        assertLink('x = "https://en.wikipedia.org/wiki/Zürich";', '     https://en.wikipedia.org/wiki/Zürich  ');
        assertLink('請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。', '    http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）', '     http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('x = "file:///foo.bar";', '     file:///foo.bar  ');
        assertLink('x = "file://c:/foo.bar";', '     file://c:/foo.bar  ');
        assertLink('x = "file://shares/foo.bar";', '     file://shares/foo.bar  ');
        assertLink('x = "file://shäres/foo.bar";', '     file://shäres/foo.bar  ');
        assertLink('Some text, then http://www.bing.com.', '                http://www.bing.com ');
        assertLink("let url = `http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items`;", "           http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items  ");
    });
    test('issue #7855', () => {
        assertLink('7. At this point, ServiceMain has been called.  There is no functionality presently in ServiceMain, but you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!', '                                                                                                                                                 https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx                                  ');
    });
    test('issue #62278: "Ctrl + click to follow link" for IPv6 URLs', () => {
        assertLink('let x = "http://[::1]:5000/connect/token"', '         http://[::1]:5000/connect/token  ');
    });
    test('issue #70254: bold links dont open in markdown file using editor mode with ctrl + click', () => {
        assertLink('2. Navigate to **https://portal.azure.com**', '                 https://portal.azure.com  ');
    });
    test('issue #86358: URL wrong recognition pattern', () => {
        assertLink('POST|https://portal.azure.com|2019-12-05|', '     https://portal.azure.com            ');
    });
    test("issue #67022: Space as end of hyperlink isn't always good idea", () => {
        assertLink('aa  https://foo.bar/[this is foo site]  aa', '    https://foo.bar/[this is foo site]    ');
    });
    test('issue #100353: Link detection stops at ＆(double-byte)', () => {
        assertLink('aa  http://tree-mark.chips.jp/レーズン＆ベリーミックス  aa', '    http://tree-mark.chips.jp/レーズン＆ベリーミックス    ');
    });
    test('issue #121438: Link detection stops at【...】', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/【我推的孩子】 aa', '    https://zh.wikipedia.org/wiki/【我推的孩子】   ');
    });
    test('issue #121438: Link detection stops at《...》', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/《新青年》编辑部旧址 aa', '    https://zh.wikipedia.org/wiki/《新青年》编辑部旧址   ');
    });
    test('issue #121438: Link detection stops at “...”', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/“常凯申”误译事件 aa', '    https://zh.wikipedia.org/wiki/“常凯申”误译事件   ');
    });
    test('issue #150905: Colon after bare hyperlink is treated as its part', () => {
        assertLink('https://site.web/page.html: blah blah blah', 'https://site.web/page.html                ');
    });
    // Removed because of #156875
    // test('issue #151631: Link parsing stoped where comments include a single quote ', () => {
    // 	assertLink(
    // 		`aa https://regexper.com/#%2F''%2F aa`,
    // 		`   https://regexper.com/#%2F''%2F   `,
    // 	);
    // });
    test('issue #156875: Links include quotes ', () => {
        assertLink(`"This file has been converted from https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json",`, `                                   https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json  `);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9saW5rQ29tcHV0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUF1QixZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUU3RixNQUFNLHdCQUF3QjtJQUM3QixZQUFvQixNQUFnQjtRQUFoQixXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ25DLG9CQUFvQjtJQUNyQixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0lBQzFCLENBQUM7SUFFTSxjQUFjLENBQUMsVUFBa0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFlO0lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEQsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDNUIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQVksRUFBRSxhQUFxQjtJQUN0RCxJQUFJLFdBQVcsR0FBRyxDQUFDLEVBQ2xCLFNBQVMsR0FBRyxDQUFDLEVBQ2IsR0FBVyxFQUNYLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFTixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMzQyxH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