import { expect, test } from 'vitest';

import { mobileBBCode } from '@app/routes/m2/bbcode/index';

test('bbcode', () => {
  expect(
    mobileBBCode(`[code]q[/code]

[b]1[/b]

[i]12[/i]

[u]321[/u]

[s]qweqwe[/s]

[img]uu[/img]
[url=qweq]链接描述[/url]

[size=10]qqqas[/size]

[quote]qw[/quote]

[mask]asd[/mask]

[code]qwe[/code](bgm34)(bgm68)(bgm01)(bgm07)(=A=)(=w=)`),
  ).toBe(`<div class="codeHighlight"><pre>q</pre></div><br>
<br>
<span style="font-weight:bold;">1</span><br>
<br>
<span style="font-style:italic">12</span><br>
<br>
<span style="text-decoration: underline;">321</span><br>
<br>
<span style="text-decoration: line-through;">qweqwe</span><br>
<br>
<img src="http://uu" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt=""><br>
[url=qweq]链接描述[/url]<br>
<br>
<span style="font-size:10px; line-height:10px;">qqqas</span><br>
<div class="quote"><q>qw</q></div><br>
<br>
<span style="background-color:#555;color:#555;border:1px solid #555;">asd</span><br>
<br>
<div class="codeHighlight"><pre>qwe</pre></div><img src="/img/smiles/tv/11.gif" smileid="50" alt="(bgm34)"><img src="/img/smiles/tv/45.gif" smileid="84" alt="(bgm68)"><img src="/img/smiles/bgm/01.png" smileid="17" alt="(bgm01)"><img src="/img/smiles/bgm/07.png" smileid="23" alt="(bgm07)"><img src="/img/smiles/1.gif" smileid="1" alt="=A="><img src="/img/smiles/2.gif" smileid="2" alt="=w=">`);
});

test('try xss', () => {
  expect(mobileBBCode('[url]https://a[/url]')).toMatchInlineSnapshot(
    '"<a href=\\"https://a\\" class=\\"code\\" rel=\\"noreferrer\\" referrerpolicy=\\"no-referrer\\" alt=\\"\\">https://a</a>"',
  );
});
