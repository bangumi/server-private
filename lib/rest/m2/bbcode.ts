/** 并不用于新前端，只是用在 /m2 支持 bbcode。 */
import * as lo from 'lodash-es';

const Settlement = {
  preg_replace(pattern: string[], replacement: string[], string: string) {
    let _flag = pattern.substr(pattern.lastIndexOf(pattern[0]!) + 1);
    _flag = _flag !== '' ? _flag : 'g';
    const _pattern = pattern.substr(1, pattern.lastIndexOf(pattern[0]!) - 1);
    const regex = new RegExp(_pattern, _flag);
    const result = string.replace(regex, replacement);
    return result;
  },
};

const IMGDIR = '';
const chiicode = {};
let message = '';

export class ChiiCodeCore {
  public static smilies_list = {
    searcharray: {
      139: '/\\(bgm123\\)/',
      138: '/\\(bgm122\\)/',
      137: '/\\(bgm121\\)/',
      136: '/\\(bgm120\\)/',
      135: '/\\(bgm119\\)/',
      134: '/\\(bgm118\\)/',
      133: '/\\(bgm117\\)/',
      132: '/\\(bgm116\\)/',
      131: '/\\(bgm115\\)/',
      130: '/\\(bgm114\\)/',
      129: '/\\(bgm113\\)/',
      128: '/\\(bgm112\\)/',
      127: '/\\(bgm111\\)/',
      126: '/\\(bgm110\\)/',
      125: '/\\(bgm109\\)/',
      124: '/\\(bgm108\\)/',
      123: '/\\(bgm107\\)/',
      122: '/\\(bgm106\\)/',
      121: '/\\(bgm105\\)/',
      120: '/\\(bgm104\\)/',
      119: '/\\(bgm103\\)/',
      118: '/\\(bgm102\\)/',
      117: '/\\(bgm101\\)/',
      116: '/\\(bgm100\\)/',
      115: '/\\(bgm99\\)/',
      114: '/\\(bgm98\\)/',
      113: '/\\(bgm97\\)/',
      112: '/\\(bgm96\\)/',
      111: '/\\(bgm95\\)/',
      110: '/\\(bgm94\\)/',
      109: '/\\(bgm93\\)/',
      108: '/\\(bgm92\\)/',
      107: '/\\(bgm91\\)/',
      106: '/\\(bgm90\\)/',
      105: '/\\(bgm89\\)/',
      104: '/\\(bgm88\\)/',
      103: '/\\(bgm87\\)/',
      102: '/\\(bgm86\\)/',
      101: '/\\(bgm85\\)/',
      100: '/\\(bgm84\\)/',
      99: '/\\(bgm83\\)/',
      98: '/\\(bgm82\\)/',
      97: '/\\(bgm81\\)/',
      96: '/\\(bgm80\\)/',
      95: '/\\(bgm79\\)/',
      94: '/\\(bgm78\\)/',
      93: '/\\(bgm77\\)/',
      92: '/\\(bgm76\\)/',
      91: '/\\(bgm75\\)/',
      90: '/\\(bgm74\\)/',
      89: '/\\(bgm73\\)/',
      88: '/\\(bgm72\\)/',
      87: '/\\(bgm71\\)/',
      86: '/\\(bgm70\\)/',
      85: '/\\(bgm69\\)/',
      84: '/\\(bgm68\\)/',
      83: '/\\(bgm67\\)/',
      82: '/\\(bgm66\\)/',
      81: '/\\(bgm65\\)/',
      80: '/\\(bgm64\\)/',
      79: '/\\(bgm63\\)/',
      78: '/\\(bgm62\\)/',
      77: '/\\(bgm61\\)/',
      76: '/\\(bgm60\\)/',
      75: '/\\(bgm59\\)/',
      74: '/\\(bgm58\\)/',
      73: '/\\(bgm57\\)/',
      72: '/\\(bgm56\\)/',
      71: '/\\(bgm55\\)/',
      70: '/\\(bgm54\\)/',
      69: '/\\(bgm53\\)/',
      68: '/\\(bgm52\\)/',
      67: '/\\(bgm51\\)/',
      66: '/\\(bgm50\\)/',
      65: '/\\(bgm49\\)/',
      64: '/\\(bgm48\\)/',
      63: '/\\(bgm47\\)/',
      62: '/\\(bgm46\\)/',
      61: '/\\(bgm45\\)/',
      60: '/\\(bgm44\\)/',
      59: '/\\(bgm43\\)/',
      58: '/\\(bgm42\\)/',
      57: '/\\(bgm41\\)/',
      56: '/\\(bgm40\\)/',
      55: '/\\(bgm39\\)/',
      54: '/\\(bgm38\\)/',
      53: '/\\(bgm37\\)/',
      52: '/\\(bgm36\\)/',
      51: '/\\(bgm35\\)/',
      50: '/\\(bgm34\\)/',
      49: '/\\(bgm33\\)/',
      48: '/\\(bgm32\\)/',
      47: '/\\(bgm31\\)/',
      46: '/\\(bgm30\\)/',
      45: '/\\(bgm29\\)/',
      44: '/\\(bgm28\\)/',
      43: '/\\(bgm27\\)/',
      42: '/\\(bgm26\\)/',
      41: '/\\(bgm25\\)/',
      40: '/\\(bgm24\\)/',
      39: '/\\(bgm23\\)/',
      38: '/\\(bgm22\\)/',
      37: '/\\(bgm21\\)/',
      36: '/\\(bgm20\\)/',
      35: '/\\(bgm19\\)/',
      34: '/\\(bgm18\\)/',
      33: '/\\(bgm17\\)/',
      32: '/\\(bgm16\\)/',
      31: '/\\(bgm15\\)/',
      30: '/\\(bgm14\\)/',
      29: '/\\(bgm13\\)/',
      28: '/\\(bgm12\\)/',
      27: '/\\(bgm11\\)/',
      26: '/\\(bgm10\\)/',
      25: '/\\(bgm09\\)/',
      24: '/\\(bgm08\\)/',
      23: '/\\(bgm07\\)/',
      22: '/\\(bgm06\\)/',
      21: '/\\(bgm05\\)/',
      20: '/\\(bgm04\\)/',
      19: '/\\(bgm03\\)/',
      18: '/\\(bgm02\\)/',
      17: '/\\(bgm01\\)/',
      16: '/\\(LOL\\)/',
      15: '/\\(:P\\)/',
      14: '/\\(=\\.,=\\)/',
      13: '/\\(=\\/\\/\\/=\\)/',
      12: "/\\(= ='\\)/",
      11: '/\\(=3=\\)/',
      10: "/\\(='=\\)/",
      9: '/\\(T_T\\)/',
      8: '/\\(TAT\\)/',
      7: '/\\(=W=\\)/',
      6: '/\\(@_@\\)/',
      5: '/\\(=v=\\)/',
      4: '/\\(S_S\\)/',
      3: '/\\(-w=\\)/',
      2: '/\\(=w=\\)/',
      1: '/\\(=A=\\)/',
    },
    replacearray: {
      139: '<img src="/img/smiles/tv/100.gif" smileid="139" alt="(bgm123)" />',
      138: '<img src="/img/smiles/tv/99.gif" smileid="138" alt="(bgm122)" />',
      137: '<img src="/img/smiles/tv/98.gif" smileid="137" alt="(bgm121)" />',
      136: '<img src="/img/smiles/tv/97.gif" smileid="136" alt="(bgm120)" />',
      135: '<img src="/img/smiles/tv/96.gif" smileid="135" alt="(bgm119)" />',
      134: '<img src="/img/smiles/tv/95.gif" smileid="134" alt="(bgm118)" />',
      133: '<img src="/img/smiles/tv/94.gif" smileid="133" alt="(bgm117)" />',
      132: '<img src="/img/smiles/tv/93.gif" smileid="132" alt="(bgm116)" />',
      131: '<img src="/img/smiles/tv/92.gif" smileid="131" alt="(bgm115)" />',
      130: '<img src="/img/smiles/tv/91.gif" smileid="130" alt="(bgm114)" />',
      129: '<img src="/img/smiles/tv/90.gif" smileid="129" alt="(bgm113)" />',
      128: '<img src="/img/smiles/tv/89.gif" smileid="128" alt="(bgm112)" />',
      127: '<img src="/img/smiles/tv/88.gif" smileid="127" alt="(bgm111)" />',
      126: '<img src="/img/smiles/tv/87.gif" smileid="126" alt="(bgm110)" />',
      125: '<img src="/img/smiles/tv/86.gif" smileid="125" alt="(bgm109)" />',
      124: '<img src="/img/smiles/tv/85.gif" smileid="124" alt="(bgm108)" />',
      123: '<img src="/img/smiles/tv/84.gif" smileid="123" alt="(bgm107)" />',
      122: '<img src="/img/smiles/tv/83.gif" smileid="122" alt="(bgm106)" />',
      121: '<img src="/img/smiles/tv/82.gif" smileid="121" alt="(bgm105)" />',
      120: '<img src="/img/smiles/tv/81.gif" smileid="120" alt="(bgm104)" />',
      119: '<img src="/img/smiles/tv/80.gif" smileid="119" alt="(bgm103)" />',
      118: '<img src="/img/smiles/tv/79.gif" smileid="118" alt="(bgm102)" />',
      117: '<img src="/img/smiles/tv/78.gif" smileid="117" alt="(bgm101)" />',
      116: '<img src="/img/smiles/tv/77.gif" smileid="116" alt="(bgm100)" />',
      115: '<img src="/img/smiles/tv/76.gif" smileid="115" alt="(bgm99)" />',
      114: '<img src="/img/smiles/tv/75.gif" smileid="114" alt="(bgm98)" />',
      113: '<img src="/img/smiles/tv/74.gif" smileid="113" alt="(bgm97)" />',
      112: '<img src="/img/smiles/tv/73.gif" smileid="112" alt="(bgm96)" />',
      111: '<img src="/img/smiles/tv/72.gif" smileid="111" alt="(bgm95)" />',
      110: '<img src="/img/smiles/tv/71.gif" smileid="110" alt="(bgm94)" />',
      109: '<img src="/img/smiles/tv/70.gif" smileid="109" alt="(bgm93)" />',
      108: '<img src="/img/smiles/tv/69.gif" smileid="108" alt="(bgm92)" />',
      107: '<img src="/img/smiles/tv/68.gif" smileid="107" alt="(bgm91)" />',
      106: '<img src="/img/smiles/tv/67.gif" smileid="106" alt="(bgm90)" />',
      105: '<img src="/img/smiles/tv/66.gif" smileid="105" alt="(bgm89)" />',
      104: '<img src="/img/smiles/tv/65.gif" smileid="104" alt="(bgm88)" />',
      103: '<img src="/img/smiles/tv/64.gif" smileid="103" alt="(bgm87)" />',
      102: '<img src="/img/smiles/tv/63.gif" smileid="102" alt="(bgm86)" />',
      101: '<img src="/img/smiles/tv/62.gif" smileid="101" alt="(bgm85)" />',
      100: '<img src="/img/smiles/tv/61.gif" smileid="100" alt="(bgm84)" />',
      99: '<img src="/img/smiles/tv/60.gif" smileid="99" alt="(bgm83)" />',
      98: '<img src="/img/smiles/tv/59.gif" smileid="98" alt="(bgm82)" />',
      97: '<img src="/img/smiles/tv/58.gif" smileid="97" alt="(bgm81)" />',
      96: '<img src="/img/smiles/tv/57.gif" smileid="96" alt="(bgm80)" />',
      95: '<img src="/img/smiles/tv/56.gif" smileid="95" alt="(bgm79)" />',
      94: '<img src="/img/smiles/tv/55.gif" smileid="94" alt="(bgm78)" />',
      93: '<img src="/img/smiles/tv/54.gif" smileid="93" alt="(bgm77)" />',
      92: '<img src="/img/smiles/tv/53.gif" smileid="92" alt="(bgm76)" />',
      91: '<img src="/img/smiles/tv/52.gif" smileid="91" alt="(bgm75)" />',
      90: '<img src="/img/smiles/tv/51.gif" smileid="90" alt="(bgm74)" />',
      89: '<img src="/img/smiles/tv/50.gif" smileid="89" alt="(bgm73)" />',
      88: '<img src="/img/smiles/tv/49.gif" smileid="88" alt="(bgm72)" />',
      87: '<img src="/img/smiles/tv/48.gif" smileid="87" alt="(bgm71)" />',
      86: '<img src="/img/smiles/tv/47.gif" smileid="86" alt="(bgm70)" />',
      85: '<img src="/img/smiles/tv/46.gif" smileid="85" alt="(bgm69)" />',
      84: '<img src="/img/smiles/tv/45.gif" smileid="84" alt="(bgm68)" />',
      83: '<img src="/img/smiles/tv/44.gif" smileid="83" alt="(bgm67)" />',
      82: '<img src="/img/smiles/tv/43.gif" smileid="82" alt="(bgm66)" />',
      81: '<img src="/img/smiles/tv/42.gif" smileid="81" alt="(bgm65)" />',
      80: '<img src="/img/smiles/tv/41.gif" smileid="80" alt="(bgm64)" />',
      79: '<img src="/img/smiles/tv/40.gif" smileid="79" alt="(bgm63)" />',
      78: '<img src="/img/smiles/tv/39.gif" smileid="78" alt="(bgm62)" />',
      77: '<img src="/img/smiles/tv/38.gif" smileid="77" alt="(bgm61)" />',
      76: '<img src="/img/smiles/tv/37.gif" smileid="76" alt="(bgm60)" />',
      75: '<img src="/img/smiles/tv/36.gif" smileid="75" alt="(bgm59)" />',
      74: '<img src="/img/smiles/tv/35.gif" smileid="74" alt="(bgm58)" />',
      73: '<img src="/img/smiles/tv/34.gif" smileid="73" alt="(bgm57)" />',
      72: '<img src="/img/smiles/tv/33.gif" smileid="72" alt="(bgm56)" />',
      71: '<img src="/img/smiles/tv/32.gif" smileid="71" alt="(bgm55)" />',
      70: '<img src="/img/smiles/tv/31.gif" smileid="70" alt="(bgm54)" />',
      69: '<img src="/img/smiles/tv/30.gif" smileid="69" alt="(bgm53)" />',
      68: '<img src="/img/smiles/tv/29.gif" smileid="68" alt="(bgm52)" />',
      67: '<img src="/img/smiles/tv/28.gif" smileid="67" alt="(bgm51)" />',
      66: '<img src="/img/smiles/tv/27.gif" smileid="66" alt="(bgm50)" />',
      65: '<img src="/img/smiles/tv/26.gif" smileid="65" alt="(bgm49)" />',
      64: '<img src="/img/smiles/tv/25.gif" smileid="64" alt="(bgm48)" />',
      63: '<img src="/img/smiles/tv/24.gif" smileid="63" alt="(bgm47)" />',
      62: '<img src="/img/smiles/tv/23.gif" smileid="62" alt="(bgm46)" />',
      61: '<img src="/img/smiles/tv/22.gif" smileid="61" alt="(bgm45)" />',
      60: '<img src="/img/smiles/tv/21.gif" smileid="60" alt="(bgm44)" />',
      59: '<img src="/img/smiles/tv/20.gif" smileid="59" alt="(bgm43)" />',
      58: '<img src="/img/smiles/tv/19.gif" smileid="58" alt="(bgm42)" />',
      57: '<img src="/img/smiles/tv/18.gif" smileid="57" alt="(bgm41)" />',
      56: '<img src="/img/smiles/tv/17.gif" smileid="56" alt="(bgm40)" />',
      55: '<img src="/img/smiles/tv/16.gif" smileid="55" alt="(bgm39)" />',
      54: '<img src="/img/smiles/tv/15.gif" smileid="54" alt="(bgm38)" />',
      53: '<img src="/img/smiles/tv/14.gif" smileid="53" alt="(bgm37)" />',
      52: '<img src="/img/smiles/tv/13.gif" smileid="52" alt="(bgm36)" />',
      51: '<img src="/img/smiles/tv/12.gif" smileid="51" alt="(bgm35)" />',
      50: '<img src="/img/smiles/tv/11.gif" smileid="50" alt="(bgm34)" />',
      49: '<img src="/img/smiles/tv/10.gif" smileid="49" alt="(bgm33)" />',
      48: '<img src="/img/smiles/tv/09.gif" smileid="48" alt="(bgm32)" />',
      47: '<img src="/img/smiles/tv/08.gif" smileid="47" alt="(bgm31)" />',
      46: '<img src="/img/smiles/tv/07.gif" smileid="46" alt="(bgm30)" />',
      45: '<img src="/img/smiles/tv/06.gif" smileid="45" alt="(bgm29)" />',
      44: '<img src="/img/smiles/tv/05.gif" smileid="44" alt="(bgm28)" />',
      43: '<img src="/img/smiles/tv/04.gif" smileid="43" alt="(bgm27)" />',
      42: '<img src="/img/smiles/tv/03.gif" smileid="42" alt="(bgm26)" />',
      41: '<img src="/img/smiles/tv/02.gif" smileid="41" alt="(bgm25)" />',
      40: '<img src="/img/smiles/tv/01.gif" smileid="40" alt="(bgm24)" />',
      39: '<img src="/img/smiles/bgm/23.gif" smileid="39" alt="(bgm23)" />',
      38: '<img src="/img/smiles/bgm/22.png" smileid="38" alt="(bgm22)" />',
      37: '<img src="/img/smiles/bgm/21.png" smileid="37" alt="(bgm21)" />',
      36: '<img src="/img/smiles/bgm/20.png" smileid="36" alt="(bgm20)" />',
      35: '<img src="/img/smiles/bgm/19.png" smileid="35" alt="(bgm19)" />',
      34: '<img src="/img/smiles/bgm/18.png" smileid="34" alt="(bgm18)" />',
      33: '<img src="/img/smiles/bgm/17.png" smileid="33" alt="(bgm17)" />',
      32: '<img src="/img/smiles/bgm/16.png" smileid="32" alt="(bgm16)" />',
      31: '<img src="/img/smiles/bgm/15.png" smileid="31" alt="(bgm15)" />',
      30: '<img src="/img/smiles/bgm/14.png" smileid="30" alt="(bgm14)" />',
      29: '<img src="/img/smiles/bgm/13.png" smileid="29" alt="(bgm13)" />',
      28: '<img src="/img/smiles/bgm/12.png" smileid="28" alt="(bgm12)" />',
      27: '<img src="/img/smiles/bgm/11.gif" smileid="27" alt="(bgm11)" />',
      26: '<img src="/img/smiles/bgm/10.png" smileid="26" alt="(bgm10)" />',
      25: '<img src="/img/smiles/bgm/09.png" smileid="25" alt="(bgm09)" />',
      24: '<img src="/img/smiles/bgm/08.png" smileid="24" alt="(bgm08)" />',
      23: '<img src="/img/smiles/bgm/07.png" smileid="23" alt="(bgm07)" />',
      22: '<img src="/img/smiles/bgm/06.png" smileid="22" alt="(bgm06)" />',
      21: '<img src="/img/smiles/bgm/05.png" smileid="21" alt="(bgm05)" />',
      20: '<img src="/img/smiles/bgm/04.png" smileid="20" alt="(bgm04)" />',
      19: '<img src="/img/smiles/bgm/03.png" smileid="19" alt="(bgm03)" />',
      18: '<img src="/img/smiles/bgm/02.png" smileid="18" alt="(bgm02)" />',
      17: '<img src="/img/smiles/bgm/01.png" smileid="17" alt="(bgm01)" />',
      16: '<img src="/img/smiles/16.gif" smileid="16" alt="LOL" />',
      15: '<img src="/img/smiles/15.gif" smileid="15" alt=":P" />',
      14: '<img src="/img/smiles/14.gif" smileid="14" alt="=.,=" />',
      13: '<img src="/img/smiles/13.gif" smileid="13" alt="=///=" />',
      12: '<img src="/img/smiles/12.gif" smileid="12" alt="= =\'" />',
      11: '<img src="/img/smiles/11.gif" smileid="11" alt="=3=" />',
      10: '<img src="/img/smiles/10.gif" smileid="10" alt="=\'=" />',
      9: '<img src="/img/smiles/9.gif" smileid="9" alt="T_T" />',
      8: '<img src="/img/smiles/8.gif" smileid="8" alt="TAT" />',
      7: '<img src="/img/smiles/7.gif" smileid="7" alt="=W=" />',
      6: '<img src="/img/smiles/6.gif" smileid="6" alt="@_@" />',
      5: '<img src="/img/smiles/5.gif" smileid="5" alt="=v=" />',
      4: '<img src="/img/smiles/4.gif" smileid="4" alt="S_S" />',
      3: '<img src="/img/smiles/3.gif" smileid="3" alt="-w=" />',
      2: '<img src="/img/smiles/2.gif" smileid="2" alt="=w=" />',
      1: '<img src="/img/smiles/1.gif" smileid="1" alt="=A=" />',
    },
  };

  public static chiicodes = { pcodecount: -1, codecount: 0, codehtml: '', smiliesreplaced: 0 };

  //[code]..[/code]的临时存放区
  private bbcodeCodeArr = {} as Record<number, string>;

  smileReplace() {
    const smiles_list: Record<string, string> = {};

    if (!ChiiCodeCore.chiicodes['smiliesreplaced']) {
      for (const [key, smiley] of Object.entries(ChiiCodeCore.smilies_list['replacearray'])) {
        smiles_list[key] =
          '<img src="' + IMGDIR + '/smilies/' + smiley + '" smileid="' + key + '" alt="" />';
      }
      chiicode['smiliesreplaced'] = 1;
    }
    return smiles_list;
  }

  private static matched_domains = '/((?:www.)?(?:(bgm\\.tv|chii\\.in|bangumi\\.tv)))+/i';
  private static replace_domains = {
    0: 'chii.in',
    1: 'bangumi.tv',
    2: 'www.chii.in',
    3: 'www.bangumi.tv',
    4: 'bgm.tv',
    5: 'www.bgm.tv',
  };

  addLink(str: string) {
    const domain_replace_regex = '/(:\\/\\/(www|api|lain|doujin)\\.)(bgm\\.tv)+/i';
    if (
      preg_match(ChiiCodeCore.matched_domains, str, _matches) &&
      !preg_match(domain_replace_regex, str, matches)
    ) {
      conv_url = ChiiCodeCore.replace_domains;
      target_url = Settlement.str_replace({ 0: 'http://', 1: 'https://' }, '', SITE_URL);
      str = Settlement.str_replace(conv_url, target_url, str);
    }
    //preg_match('#https?://[\w-./?%&=~@:$*\\\,+\#]+#i', $str, $m);
    //print_r($str);
    const o = Settlement.preg_replace(
      '#(https?://[\\w-./?%&;=~@:$*\\\\,+\\#]+)#i',
      '<a href="\\1" class="l" rel="nofollow external noopener noreferrer" target="_blank">\\1</a>',
      str,
    );
    return o;
  }

  id: number = 0;

  parseCode(code: string) {
    this.bbcodeCodeArr[this.id] = code;
    const mark =
      '<div class="codeHighlight"><pre>' + this.genParseCodeMark(this.id) + '</pre></div>';
    this.id++;
    return mark;
  }

  genParseCodeMark(id: number) {
    const mark = '8848213b4dd8e320';
    return `<${mark}#${id}>`;
  }

  cov_code = { open: {}, close: {} };
  convCodeArr = {};

  chiicode(
    message: string,
    smileyoff,
    bbcodeoff,
    htmlon = 0,
    allowsmilies = 1,
    allowbbcode = 1,
    allowimgcode = 1,
    allowhtml = 0,
    jammer = 0,
    parsetype = '0',
    authorid = '0',
    allowmediacode = '0',
    pid = 0,
    filter = 0,
  ) {
    const msglower: string = message.toLowerCase();
    const htmlrule = 0;
    let parseCode = false;

    if (htmlrule) {
      htmlon = htmlon && allowhtml ? 1 : 0;
    }

    if (!htmlon) {
      message = jammer
        ? lo.escape(message).replaceAll('/\r\n|\n|\r/e', 'jammer()')
        : lo.escape(message);
    }
    if (!bbcodeoff && allowbbcode) {
      parseCode = false;
      if (msglower.includes('[/code]')) {
        parseCode = true;
        message = message.replaceAll('#\\[code\\](.+)\\[/code\\]#Uise', this.parseCode);
      }
      if (msglower.includes('[/mask]')) {
        //打码
        if (filter == 1) {
          message = Settlement.preg_replace('#\\[mask\\](.+)\\[/mask\\]#iUse', '▇▇▇▇', message);
        } else {
          message = message.replaceAll('#\\[mask\\](.+)\\[/mask\\]#iUse', this.parseMask);
        }
      }
      if (msglower.includes('[/url]')) {
        message = message.replaceAll(
          '/\\[url(=((https?|ftp|gopher|news|telnet|rtsp|mms|callto|bctp|ed2k|thunder|synacast){1}:\\/\\/|www\\.)([^\\["\']+?))?\\](.+?)\\[\\/url\\]/ies',
          this.parseurl,
        );
      }
      if (msglower.includes('[/email]')) {
        message = message.replaceAll(
          /\\[email(=([a-z0-9\\-_.+]+)@([a-z0-9\\-_]+[.][a-z0-9\\-_.]+))?\\](.+?)\\[\\/email\\]/gi,
          this.parseEmail,
        );
      }
      if (filter == 1) {
        this.cov_code['open'] = { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
        this.cov_code['close'] = {
          0: '',
          1: '',
          2: '',
          3: '',
          4: '',
          5: '',
          6: '',
          7: '',
          8: '',
          9: '',
          10: '',
          11: '',
          12: '',
          13: '',
          14: '',
          15: '',
          16: '',
          17: '',
          18: '',
        };
        this.convCodeArr = {
          '[/color]': '',
          '[/size]': '',
          '[b]': '',
          '[/b]': '',
          '[i]': '',
          '[/i]': '',
          '[u]': '',
          '[/u]': '',
          '[s]': '',
          '[/s]': '',
          '[center]': '',
          '[/center]': '',
          '[left]': '',
          '[/left]': '',
          '[right]': '',
          '[/right]': '',
          '[/align]': '',
          '[list]': '',
          '[list=1]': '',
          '[list=a]': '',
          '[list=A]': '',
          '[*]': '',
          '[/list]': '',
          '[indent]': '',
          '[/indent]': '',
          '[/float]': '',
          '[/subject]': '',
        };
      } else {
        /*
                        $cov_code['open'] = array(
           "<span style=\"color: \\1;\">",
           "<span style=\"font-size: \\1pt;\">",
           "<font style=\"font-size: \\1\">",
           "<p align=\"\\1\">",
           "<span style=\"float: \\1;\">",
           "<a href=\"/user/\\1\" class=\"l\">",
           "<a href=\"/subject/\\1\" class=\"l\">",
                        );
                        $cov_code['close'] = array(
           '</span>', '</span>', '</span>', '</p>', '<strong>', '</strong>', '<i class="pstatus">', '<em>',
           '</em>', '<span style="text-decoration: underline;">', '</span>', '<ul>', '<ul type="1" class="litype_1">', '<ul type="a" class="litype_2">',
           '<ul type="A" class="litype_3">', '<li>', '</ul>', '<blockquote>', '</blockquote>', '</span>','</a>'
           );
        */
        convCodeArr = {
          '[/color]': '</span>',
          '[/size]': '</span>',
          '[b]': '<span style="font-weight:bold;">',
          '[/b]': '</span>',
          '[i]': '<span style="font-style:italic">',
          '[/i]': '</span>',
          '[u]': '<span style="text-decoration: underline;">',
          '[/u]': '</span>',
          '[s]': '<span style="text-decoration: line-through;">',
          '[/s]': '</span>',
          '[center]': '<p style="text-align: center;">',
          '[/center]': '</p>',
          '[left]': '<p style="text-align: left;">',
          '[/left]': '</p>',
          '[right]': '<p style="text-align: right;">',
          '[/right]': '</p>',
          '[/align]': '</p>',
          '[list]': '<ul>',
          '[list=1]': '<ul type="1" class="litype_1">',
          '[list=a]': '<ul type="a" class="litype_2">',
          '[list=A]': '<ul type="A" class="litype_3">',
          '[*]': '<li>',
          '[/list]': '</ul>',
          '[indent]': '<blockquote>',
          '[/indent]': '</blockquote>',
          '[/float]': '</span>',
          '[/subject]': '</a>',
        };
      }
      /*
                  $message = str_replace(array(
                      '[/color]', '[/size]', '[/size]',  '[/align]', '[b]', '[/b]',
                      '[i=s]', '[i]', '[/i]', '[u]', '[/u]', '[list]', '[list=1]', '[list=a]',
                      '[list=A]', '[*]', '[/list]', '[indent]', '[/indent]', '[/float]','[/user]','[/subject]'
                  ),$cov_code['close'], preg_replace(array(*/
      if (filter == 1) {
        message = message.replaceAll(
          {
            0: '/\\[color=([#\\w]+?)\\]/i',
            1: '/\\[size=(\\d+?)\\]/i',
            2: '/\\[align=(left|center|right)\\]/i',
            3: '/\\[float=(left|right)\\]/i',
            4: '/\\[subject=(\\d+?)\\]/i',
          },
          { 0: '', 1: '', 2: '', 3: '', 4: '' },
        );
      } else {
        message = Settlement.preg_replace(
          {
            0: '/\\[color=([#\\w]+?)\\]/i',
            1: '/\\[size=(\\d+?)\\]/ies',
            2: '/\\[align=(left|center|right)\\]/i',
            3: '/\\[float=(left|right)\\]/i',
            4: '/\\[subject=(\\d+?)\\]/i',
          },
          {
            0: '<span style="color: \\1;">',
            1: "this.fontResize('\\1','px');",
            2: '<p align="\\1">',
            3: '<span style="float: \\1;">',
            4: '<a href="/subject/\\1" class="l">',
          },
          message,
        );
      }
      message = strtr(message, this.convCodeArr);
      if (parsetype !== 1) {
        if (msglower.includes('[/quote]')) {
          if (filter == 1) {
            message = Settlement.preg_replace(
              '/\\s*\\[quote\\][\n\r]*(.+?)[\n\r]*\\[\\/quote\\]\\s*/is',
              tpl_quote_filter(),
              message,
            );
          } else {
            message = Settlement.preg_replace(
              '/\\s*\\[quote\\][\n\r]*(.+?)[\n\r]*\\[\\/quote\\]\\s*/is',
              tpl_quote(),
              message,
            );
          }
        }
      }
    }
    if (!smileyoff && allowsmilies) {
      //$smile_replace_list = this.smileReplace();
      message = preg_replace(
        this.smilies_list['searcharray'],
        this.smilies_list['replacearray'],
        message,
        10,
      );
    }
    if (!bbcodeoff) {
      if (msglower.includes('[/img]') || msglower.includes('[/photo]')) {
        if (filter == 1) {
          message = Settlement.preg_replace(
            {
              0: '/\\[photo=(\\d+)\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/photo\\]/ies',
              1: '/\\[img\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
              2: '/\\[img=(\\d{1,4})[x|\\,](\\d{1,4})\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
            },
            allowimgcode ? { 0: '', 1: '', 2: '' } : { 0: '', 1: '', 2: '' },
            message,
          );
          /*$message = preg_replace_callback(
            array(
                "/\[photo=(\d+)\]\s*([^\[\<\r\n]+?)\s*\[\/photo\]/is",
                "/\[img\]\s*([^\[\<\r\n]+?)\s*\[\/img\]/is",
                "/\[img=(\d{1,4})[x|\,](\d{1,4})\]\s*([^\[\<\r\n]+?)\s*\[\/img\]/is"
            ),
            function() { return array('', '', '') },
            $message);*/
        } else {
          message = Settlement.preg_replace(
            {
              0: '/\\[photo=(\\d+)\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/photo\\]/ies',
              1: '/\\[img\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
              2: '/\\[img=(\\d{1,4})[x|\\,](\\d{1,4})\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
            },
            allowimgcode
              ? {
                  0:
                    "ChiiCodeCore::insiteurl('\\2', '<img src=\"" +
                    PHOTO_URL +
                    '/l/%s" class="code" alt="" />\')',
                  1: 'ChiiCodeCore::bbcodeurl(\'\\1\', \'<img src="%s" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt="" />\')',
                  2: 'ChiiCodeCore::bbcodeurl(\'\\3\', \'<img width="\\1" height="\\2" src="%s" border="0" alt="" class="code" referrerpolicy="no-referrer" />\')',
                }
              : {
                  0:
                    "ChiiCodeCore::insiteurl('\\2', '<a href=\"" +
                    PHOTO_URL +
                    '/l/%s" class="l">' +
                    PHOTO_URL +
                    "/l/%s</a>')",
                  1: 'ChiiCodeCore::bbcodeurl(\'\\1\', \'<a href="%s" target="_blank" rel="nofollow external noopener noreferrer" class="l">%s</a>\')',
                  2: 'ChiiCodeCore::bbcodeurl(\'\\3\', \'<a href="%s" target="_blank" rel="nofollow external noopener noreferrer" class="l">%s</a>\')',
                },
            message,
          );
        }
      }
      if (msglower.includes('[/user]')) {
        message = message.replaceAll(
          /\\[user=([^\\W_][\\w]*)\\](.+?)\\[\\/user\\]/g,
          this.parseUsername,
        );

        message = message.replaceAll(
          '/\\[user]([^\\W_][\\w]*)\\[\\/user\\]/iies',
          this.parseUsername,
        );
      }

      if (parseCode) {
        for (var id in this.bbcodeCodeArr) {
          code = this.bbcodeCodeArr[id];
          message = Settlement.str_ireplace(self.genParseCodeMark(id), code, message);
        }
      }
    }
    /*for($i = 0; $i <= $chiicodes['pcodecount']; $i++) {
          $message = str_replace("[\tDISCUZ_CODE_$i\t]", $chiicodes['codehtml'][$i], $message);
      }*/
    if (highlight) {
      highlightarray = Settlement.explode('+', highlight);
      message = Settlement.preg_replace(
        {
          0: '/(^|>)([^<]+)(?=<|$)/sUe',
          1: '/<highlight>(.*)<\\/highlight>/siU',
        },
        {
          0: "highlight('\\2', $highlightarray, '\\1')",
          1: '<strong><font color="#FF0000">\\1</font></strong>',
        },
        message,
      );
    }
    unset(msglower);
    if (filter == 1) {
      message = Settlement.str_replace(
        { 0: '\t', 1: '   ', 2: '  ' },
        { 0: ' ', 1: ' ', 2: '' },
        message,
      );
    } else {
      message = Settlement.nl2br(
        Settlement.str_replace(
          { 0: '\t', 1: '   ', 2: '  ' },
          {
            0: '        ',
            1: '   ',
            2: '  ',
          },
          message,
        ),
      );
    }

    return htmlon ? message : message;
  }

  replyTo(str: string) {
    //#\B@([^_][\w]*)\b#
    o = Settlement.preg_replace(
      '#\\B@([^\\W_][\\w]*)\\b#',
      '@<a href="/user/\\1/timeline?type=say" class="l">\\1</a>',
      str,
    );
    return o;
  }

  autoBBCodeMention(str: string) {
    //#\B@([^_][\w]*)\b#
    str = Settlement.preg_replace(
      '/\\[user=([^\\W_][\\w]*)\\](.+?)\\[\\/user\\]/iies',
      "ChiiCodeCore::parseUsername('\\1', '\\2')",
      str,
    );
    str = Settlement.preg_replace(
      '/\\[user]([^\\W_][\\w]*)\\[\\/user\\]/iies',
      "ChiiCodeCore::parseUsername('\\1', '')",
      str,
    );
    return str;
  }

  parseUsername(username, nickname = '', filter = 0) {
    username = Settlement.strtolower(username);
    nickname = trim(nickname);
    if (Settlement.empty(nickname)) {
      if (filter) {
        return '@' + username;
      } else {
        return '<a href="/user/' + username + '" class="l">@' + username + '</a>';
      }
    } else {
      if (filter) {
        return '@' + nickname;
      } else {
        return '<a href="/user/' + username + '" class="l">@' + nickname + '</a>';
      }
    }
  }

  parseurl(url, text, filter) {
    domain_replace_regex = '/(:\\/\\/(www|api|lain|doujin)\\.)?(bgm\\.tv)+/i';
    conv_url = this.replace_domains;
    target_url = Settlement.str_replace({ 0: 'http://', 1: 'https://' }, '', SITE_URL);
    if (
      !url &&
      preg_match(
        '/((https?|ftp|gopher|news|telnet|rtsp|mms|callto|bctp|ed2k|thunder|synacast){1}:\\/\\/|www\\.)[^\\["\']+/i',
        trim(text),
        matches,
      )
    ) {
      url = matches[0];
      length = 65;
      if (url.length > length) {
        text =
          substr(url, 0, Settlement.intval(length * 0.5)) +
          ' ... ' +
          substr(url, -Settlement.intval(length * 0.3));
      }
      if (
        preg_match(this.matched_domains, url, _matches) &&
        !preg_match(domain_replace_regex, url, matches)
      ) {
        url = Settlement.str_replace(conv_url, target_url, url);
        text = Settlement.str_replace(conv_url, target_url, text);
      }
      if (filter == 1) {
        return url;
      } else {
        return (
          '<a href="' +
          (substr(Settlement.strtolower(url), 0, 4) == 'www.' ? 'http://' + url : url) +
          '" target="_blank" rel="nofollow external noopener noreferrer" class="l">' +
          text +
          '</a>'
        );
      }
    } else {
      url = substr(url, 1);
      if (substr(Settlement.strtolower(url), 0, 4) == 'www.') {
        url = 'http://' + url;
      }
      if (!preg_match(domain_replace_regex, url, matches)) {
        url = Settlement.str_replace(conv_url, target_url, url);
        text = Settlement.str_replace(conv_url, target_url, text);
      }
      if (filter == 1) {
        return text + '[' + url + ']';
      } else {
        return (
          '<a href="' +
          url +
          '" target="_blank" rel="nofollow external noopener noreferrer" class="l">' +
          text +
          '</a>'
        );
      }
    }
  }

  parseEmail(email: string, text: string) {
    if (
      !email &&
      preg_match('/\\s*([a-z0-9\\-_.+]+)@([a-z0-9\\-_]+[.][a-z0-9\\-_.]+)\\s*/i', text, matches)
    ) {
      email = trim(matches[0]);
      return '<a href="mailto:' + email + '">' + email + '</a>';
    } else {
      return '<a href="mailto:' + substr(email, 1) + '">' + text + '</a>';
    }
  }

  parseMask(content: string) {
    const color = '#555';
    content = Settlement.preg_replace('@\\[color=[#\\w]+?\\]@i', '[color=' + color + ']', content);
    if (Settlement.strpos(content, '[/size]') !== false) {
      content = Settlement.preg_replace(
        '@\\[size=(\\d+)\\](.+)\\[/size\\]@iUs',
        '<span style="font-size:\\1px;background-color:' + color + ';">\\2</span>',
        content,
      );
    }
    mask =
      '<span style="background-color:' +
      color +
      ';color:' +

      color +
      ';border:1px solid ' +
      color +
      ';">' +
      content +
      '</span>';
    return mask;
  }

  parsemedia(params, url) {
    params = Settlement.explode(',', params);
    if (Settlement.in_array(Settlement.count(params), { 0: 3, 1: 4 })) {
      type = params[0];
      width = Settlement.intval(params[1]) > 800 ? 800 : Settlement.intval(params[1]);
      height = Settlement.intval(params[2]) > 600 ? 600 : Settlement.intval(params[2]);
      autostart = 0;
      url = Settlement.str_replace(
        { 0: '<', 1: '>' },
        '',
        Settlement.str_replace('\\"', '\\"', url),
      );
      mediaid = 'media_' + GlobalCore.random(3);
      switch (type) {
        case 'ra':
          return (
            '<object classid="clsid:CFCDAA03-8BE4-11CF-B84B-0020AFBBCCFA" width="' +
            width +
            '" height="32"><param name="autostart" value="' +
            autostart +
            '" /><param name="src" value="' +
            url +
            '" /><param name="controls" value="controlpanel" /><param name="console" value="' +
            mediaid +
            '_" /><embed src="' +
            url +
            '" type="audio/x-pn-realaudio-plugin" controls="ControlPanel" ' +
            (autostart ? 'autostart="true"' : '') +
            ' console="' +
            mediaid +
            '_" width="' +
            width +
            '" height="32"></embed></object>'
          );
          break;
        case 'rm':
          return (
            '<object classid="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA" width="' +
            width +
            '" height="' +
            height +
            '"><param name="autostart" value="' +
            autostart +
            '" /><param name="src" value="' +
            url +
            '" /><param name="controls" value="imagewindow" /><param name="console" value="' +
            mediaid +
            '_" /><embed src="' +
            url +
            '" type="audio/x-pn-realaudio-plugin" controls="IMAGEWINDOW" console="' +
            mediaid +
            '_" width="' +
            width +
            '" height="' +
            height +
            '"></embed></object><br /><object classid="clsid:CFCDAA03-8BE4-11CF-B84B-0020AFBBCCFA" width="' +
            width +
            '" height="32"><param name="src" value="' +
            url +
            '" /><param name="controls" value="controlpanel" /><param name="console" value="' +
            mediaid +
            '_" /><embed src="' +
            url +
            '" type="audio/x-pn-realaudio-plugin" controls="ControlPanel" ' +
            (autostart ? 'autostart="true"' : '') +
            ' console="' +
            mediaid +
            '_" width="' +
            width +
            '" height="32"></embed></object>'
          );
          break;
        case 'wma':
          return (
            '<object classid="clsid:6BF52A52-394A-11d3-B153-00C04F79FAA6" width="' +
            width +
            '" height="64"><param name="autostart" value="' +
            autostart +
            '" /><param name="url" value="' +
            url +
            '" /><embed src="' +
            url +
            '" autostart="' +
            autostart +
            '" type="audio/x-ms-wma" width="' +
            width +
            '" height="64"></embed></object>'
          );
          break;
        case 'wmv':
          return (
            '<object classid="clsid:6BF52A52-394A-11d3-B153-00C04F79FAA6" width="' +
            width +
            '" height="' +
            height +
            '"><param name="autostart" value="' +
            autostart +
            '" /><param name="url" value="' +
            url +
            '" /><embed src="' +
            url +
            '" autostart="' +
            autostart +
            '" type="video/x-ms-wmv" width="' +
            width +
            '" height="' +
            height +
            '"></embed></object>'
          );
          break;
        case 'mp3':
          return (
            '<object classid="clsid:6BF52A52-394A-11d3-B153-00C04F79FAA6" width="' +
            width +
            '" height="64"><param name="autostart" value="' +
            autostart +
            '" /><param name="url" value="' +
            url +
            '" /><embed src="' +
            url +
            '" autostart="' +
            autostart +
            '" type="application/x-mplayer2" width="' +
            width +
            '" height="64"></embed></object>'
          );
          break;
        case 'mov':
          return (
            '<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" width="' +
            width +
            '" height="' +
            height +
            '"><param name="autostart" value="' +
            (autostart ? 'true' : 'false') +
            '" /><param name="src" value="' +
            url +
            '" /><embed controller="true" width="' +
            width +
            '" height="' +
            height +
            '" src="' +
            url +
            '" autostart="' +
            (autostart ? 'true' : 'false') +
            '"></embed></object>'
          );
          break;
        default:
          return;
      }
    }
    return;
  }

  videocode(message, tid, pid) {
    global;
    vsiteid, vsiteurl, boardurl;
    vsiteurl = Settlement.urlencode(vsiteurl);
    id = GlobalCore.random(5);
    playurl =
      'http://union.bokecc.com/flash/discuz2/player.swf?siteid={vsiteid}&vid=\\2&tid={tid}&pid={pid}&autoStart=\\1&referer=' +
      Settlement.urlencode(boardurl + 'redirect.php?goto=findpost&pid={pid}&ptid={tid}');
    flashplayer =
      "\n<span id=\"vid_{id}\"></span><script type=\"text/javascript\" reload=\"1\">\n$('vid_{id}').innerHTML=AC_FL_RunContent('width', '438', 'height', '373', 'src', '{playurl}', 'quality', 'high', 'id', 'object_flash_player', 'menu', 'false', 'allowScriptAccess', 'always', 'allowFullScreen', 'true');\n</script>";
    return Settlement.preg_replace(
      '/\\[video=(\\d)\\](\\w+)\\[\\/video\\]/',
      '{flashplayer}',
      message,
    );
  }

  fontResize(size, unit = NULL) {
    if (size >= 50) {
      size = 15;
    }
    rt = '<span style="font-size:' + size + unit + '; line-height:' + size + unit + ';">';
    return rt;
  }

  bbcodeurl(url, tags) {
    if (!preg_match('/<.+?>/s', url)) {
      if (
        !Settlement.in_array(Settlement.strtolower(substr(url, 0, 6)), {
          0: 'http:/',
          1: 'https:',
          2: 'ftp://',
          3: 'rtsp:/',
          4: 'mms://',
        })
      ) {
        url = 'http://' + url;
      }
      return Settlement.str_replace(
        {
          0: 'submit',
          1: 'logging.php',
          2: 'connect',
          3: 'disconnect',
          4: 'erase',
          5: 'remove',
          6: 'add_related',
          7: 'status/watched',
          8: 'status/watched',
          9: 'status/drop',
          10: 'xss.hk',
        },
        '',
        Settlement.sprintf(tags, url, Settlement.addslashes(url)),
      );
    } else {
      return ' ' + url;
    }
  }

  _sakuyaPad_(str: string) {
    //PAD长借您PAD一用。。
    return Settlement.str_repeat(' ', str.length);
  }

  autoBBcodeUrl(str: string) {
    //把已经加标签的URL全部PAD填充了。。
    paddedStr = Settlement.preg_replace(
      '#\\[(\\w+).+\\[/\\1\\]#Uise',
      "this._sakuyaPad_('\\0')",
      str,
    );
    //这下就可以把PAD之外的URL给提取出来了
    preg_match_all('#https?://[\\w-./?%&=~@:$*\\\\,+\\#<>|!]+#i', paddedStr, _m, 256);
    offsetIncr = 0;
    startPos = 0;
    foreach(_m[0] as _str);
    {
      startPos = _str[1] + offsetIncr;
      str = substr_replace(str, '[url]{_str[0]}[/url]', startPos, _str[0].length);
      //每次替换，都多了[url][/url]，那么后面的URL开始的位置偏移量就多了11
      offsetIncr += 11;
    }
    return str;
  }

  insiteurl(url, tags) {
    if (!preg_match('/<.+?>/s', url)) {
      if (
        !Settlement.in_array(Settlement.strtolower(substr(url, 0, 6)), {
          0: 'http:/',
          1: 'https:',
          2: 'ftp://',
          3: 'rtsp:/',
          4: 'mms://',
        })
      ) {
        url = url;
      }
      return Settlement.str_replace(
        { 0: 'submit', 1: 'logging.php' },
        {
          0: '',
          1: '',
        },
        Settlement.sprintf(tags, url, Settlement.addslashes(url)),
      );
    } else {
      return ' ' + url;
    }
  }

  jammer() {
    randomstr = '';
    for (i = 0; i < Settlement.mt_rand(5, 15); i++) {
      randomstr =
        Settlement.chr(Settlement.mt_rand(32, 59)) +
        ' ' +
        Settlement.chr(Settlement.mt_rand(63, 126));
    }
    seo = !GLOBALS['tagstatus'] ? GLOBALS['discuzcodes']['seoarray'][Settlement.mt_rand(0, 5)] : '';
    return Settlement.mt_rand(0, 1)
      ? '<font style="font-size:0px;color:' + WRAPBG + '">' + seo + randomstr + '</font>' + '\r\n'
      : '\r\n' + '<span style="display:none">' + randomstr + seo + '</span>';
  }

  highlight(text: string, words: Record<string, string>, prepend: string) {
    text = text.replaceAll('\\"', '"');
    for (var replaceword of Object.values(words)) {
      text = text.replaceAll(replaceword, '<highlight>' + replaceword + '</highlight>');
    }
    return `${prepend}${text}`;
  }
}
