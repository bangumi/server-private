// Manage core logic by this variable
const Settlement = [];
Settlement.microtime = function (get_as_float) {
  if (typeof performance !== 'undefined' && performance.now) {
    var now = (performance.now() + performance.timing.navigationStart) / 1e3;
    if (get_as_float) {
      return now;
    }
    // Math.round(now)
    var s = now | 0;
    return Math.round((now - s) * 1e6) / 1e6 + ' ' + s;
  } else {
    var now = (Date.now ? Date.now() : Date.now()) / 1e3;
    if (get_as_float) {
      return now;
    }
    // Math.round(now)
    var s = now | 0;
    return Math.round((now - s) * 1e3) / 1e3 + ' ' + s;
  }
};
Settlement.str_replace = function (search, replace, subject, countObj) {
  let i = 0;
  let j = 0;
  let temp = '';
  let repl = '';
  let sl = 0;
  let fl = 0;
  const f = [search].flat();
  let r = [replace].flat();
  let s = subject;
  let ra = Object.prototype.toString.call(r) === '[object Array]';
  const sa = Object.prototype.toString.call(s) === '[object Array]';
  s = [s].flat();
  const $global = typeof window === 'undefined' ? global : window;
  $global.$locutus = $global.$locutus || {};
  const $locutus = $global.$locutus;
  $locutus.php = $locutus.php || {};
  if (typeof search === 'object' && typeof replace === 'string') {
    temp = replace;
    replace = [];
    for (i = 0; i < search.length; i += 1) {
      replace[i] = temp;
    }
    temp = '';
    r = [replace].flat();
    ra = Object.prototype.toString.call(r) === '[object Array]';
  }
  if (countObj !== undefined) {
    countObj.value = 0;
  }
  for (i = 0, sl = s.length; i < sl; i++) {
    if (s[i] === '') {
      continue;
    }
    for (j = 0, fl = f.length; j < fl; j++) {
      if (f[j] === '') {
        continue;
      }
      temp = s[i] + '';
      repl = ra ? (r[j] === undefined ? '' : r[j]) : r[0];
      s[i] = temp.split(f[j]).join(repl);
      if (countObj !== undefined) {
        countObj.value += temp.split(f[j]).length - 1;
      }
    }
  }
  return sa ? s : s[0];
};
Settlement.preg_replace = function (pattern, replacement, string) {
  let _flag = pattern.slice(pattern.lastIndexOf(pattern[0]) + 1);
  _flag = _flag === '' ? 'g' : _flag;
  const _pattern = pattern.slice(1, 1 + pattern.lastIndexOf(pattern[0]) - 1);
  const regex = new RegExp(_pattern, _flag);
  const result = string.replace(regex, replacement);
  return result;
};
Settlement.is_numeric = function (mixed_var) {
  const whitespace =
    ' \n\r\t\f\u000B\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u2028\u2029\u3000';
  return (
    (typeof mixed_var === 'number' ||
      (typeof mixed_var === 'string' && !whitespace.includes(mixed_var.slice(-1)))) &&
    mixed_var !== '' &&
    !isNaN(mixed_var)
  );
};
Settlement.strtolower = function (str) {
  return (str + '').toLowerCase();
};
Settlement.array_keys = function (input, search_value, argStrict) {
  let search = search_value !== undefined,
    tmp_arr = [],
    strict = !!argStrict,
    include = true,
    key = '';

  for (key in input) {
    if (input.hasOwnProperty(key)) {
      include = true;
      if (search) {
        if (strict && input[key] !== search_value) {
          include = false;
        } else if (input[key] != search_value) {
          include = false;
        }
      }
      if (include) {
        tmp_arr[tmp_arr.length] = key;
      }
    }
  }
  // Normal array converting into object
  return Object.assign({}, tmp_arr);
};
Settlement.array_flip = function (arr) {
  let key,
    result = {};
  for (key in arr) {
    if (!arr.hasOwnProperty(key)) {
      continue;
    }
    result[arr[key]] = key;
  }
  return result;
};
Settlement.empty = function (mixed_var) {
  let undef, key, i, len;
  const emptyValues = [undef, null, false, 0, '', '0'];
  for (i = 0, len = emptyValues.length; i < len; i++) {
    if (mixed_var === emptyValues[i]) {
      return true;
    }
  }
  if (typeof mixed_var === 'object') {
    for (key in mixed_var) {
      return false;
    }
    return true;
  }
  return false;
};
// ------------------------
// Function : default_key
// This is an alternate function which
// is find default key of map.
// We assume that passing parameter is a
// Object of javascript.
Settlement.default_key = function (obj) {
  let result = 0;
  Object.entries(obj).map((item) => {
    // It's not 100 % accurate when
    // given key = 1 or key = "1"
    // both same in javascript.
    // Or key is an string in javascript object.
    const num = Number(item[0]);
    // Check key is integer and key
    // is not less than result
    if (Number.isInteger(num) && num >= result) {
      // Get new key
      result = num + 1;
    }
  });
  // Important set empty
  // when access [][]
  // array of array.
  obj[result] = {};
  return result;
};
Settlement.count = function (mixed_var, mode) {
  let key,
    cnt = 0;
  if (mixed_var === null || mixed_var === undefined) {
    return 0;
  } else if (mixed_var.constructor !== Array && mixed_var.constructor !== Object) {
    return 1;
  }
  if (mode === 1) {
    mode = 1;
  }
  if (mode != 1) {
    mode = 0;
  }
  for (key in mixed_var) {
    if (mixed_var.hasOwnProperty(key)) {
      cnt++;
      if (
        mode == 1 &&
        mixed_var[key] &&
        (mixed_var[key].constructor === Array || mixed_var[key].constructor === Object)
      ) {
        cnt += this.count(mixed_var[key], 1);
      }
    }
  }
  return cnt;
};
Settlement.implode = function (glue, pieces) {
  let retVal = '';
  let tGlue = '';
  if (arguments.length === 1) {
    pieces = glue;
    glue = '';
  }
  if (typeof pieces === 'object') {
    if (Object.prototype.toString.call(pieces) === '[object Array]') {
      return pieces.join(glue);
    }
    for (const i in pieces) {
      retVal += tGlue + pieces[i];
      tGlue = glue;
    }
    return retVal;
  }
  return pieces;
};
Settlement.array_key_exists = function (key, search) {
  if (!search || (search.constructor !== Array && search.constructor !== Object)) {
    return false;
  }
  return key in search;
};
Settlement.strpos = function (haystack, needle, offset) {
  const i = (haystack + '').indexOf(needle, offset || 0);
  return i === -1 ? false : i;
};
Settlement.explode = function (separator, string, limit) {
  // Check if given parameter value is valid or not
  if (arguments.length < 2 || separator === undefined || string === undefined) {
    // When not valid
    return null;
  }
  if (separator === '' || separator === false || separator === null) {
    return false;
  }
  if (
    typeof separator === 'function' ||
    typeof separator === 'object' ||
    typeof string === 'function' ||
    typeof string === 'object'
  ) {
    return {
      0: '',
    };
  }
  if (separator === true) {
    separator = '1';
  }
  separator += '';
  string += '';
  const s = string.split(separator);
  // When limt are not given
  if (limit === undefined) {
    return s;
  }

  if (limit === 0) {
    limit = 1;
  }

  if (limit > 0) {
    if (limit >= s.length) {
      return s;
    }
    return [...s.slice(0, limit - 1), s.slice(limit - 1).join(separator)];
  }
  // Negative limit handle
  if (-limit >= s.length) {
    return [];
  }
  s.splice(s.length + limit);
  return s;
};
Settlement.str_ireplace = function (search, replace, subject, countObj) {
  let i = 0;
  let j = 0;
  let temp = '';
  let repl = '';
  let sl = 0;
  let fl = 0;
  let f = '';
  let r = '';
  let s = '';
  let ra = '';
  let otemp = '';
  let oi = '';
  let ofjl = '';
  let os = subject;
  const osa = Object.prototype.toString.call(os) === '[object Array]';
  // var sa = ''
  if (typeof search === 'object') {
    temp = search;
    search = [];
    for (i = 0; i < temp.length; i += 1) {
      search[i] = temp[i].toLowerCase();
    }
  } else {
    search = search.toLowerCase();
  }
  if (typeof subject === 'object') {
    temp = subject;
    subject = [];
    for (i = 0; i < temp.length; i += 1) {
      subject[i] = temp[i].toLowerCase();
    }
  } else {
    subject = subject.toLowerCase();
  }
  if (typeof search === 'object' && typeof replace === 'string') {
    temp = replace;
    replace = [];
    for (i = 0; i < search.length; i += 1) {
      replace[i] = temp;
    }
  }
  temp = '';
  f = [search].flat();
  r = [replace].flat();
  ra = Object.prototype.toString.call(r) === '[object Array]';
  s = subject;
  // sa = Object.prototype.toString.call(s) === '[object Array]'
  s = [s].flat();
  os = [os].flat();
  if (countObj) {
    countObj.value = 0;
  }
  for (i = 0, sl = s.length; i < sl; i++) {
    if (s[i] === '') {
      continue;
    }
    for (j = 0, fl = f.length; j < fl; j++) {
      if (f[j] === '') {
        continue;
      }
      temp = s[i] + '';
      repl = ra ? (r[j] === undefined ? '' : r[j]) : r[0];
      s[i] = temp.split(f[j]).join(repl);
      otemp = os[i] + '';
      oi = temp.indexOf(f[j]);
      ofjl = f[j].length;
      if (oi >= 0) {
        os[i] = otemp.split(otemp.substr(oi, ofjl)).join(repl);
      }
      if (countObj) {
        countObj.value += temp.split(f[j]).length - 1;
      }
    }
  }
  return osa ? os : os[0];
};
Settlement.nl2br = function (text, is_xhtml = true) {
  let break_tag = '<br>';
  if (is_xhtml || is_xhtml == 1) {
    break_tag = '<br ' + '/>';
  }
  // When text not a string
  text += '';
  return text.replace(/([^\n\r>]?)(\r\n|\n\r|\r|\n)/g, '$1' + break_tag + '$2');
};
Settlement.intval = function (mixed_var, base = 10) {
  let tmp;
  const type = typeof mixed_var;
  if (type === 'boolean') {
    return +mixed_var;
  } else if (type === 'string') {
    tmp = Number.parseInt(mixed_var, base);
    return isNaN(tmp) || !isFinite(tmp) ? 0 : tmp;
  } else if (type === 'number' && isFinite(mixed_var)) {
    return mixed_var | 0;
  } else {
    return 0;
  }
};
Settlement.in_array = function (needle, haystack, strict = false) {
  let key = '';
  // we prevent the double check (strict && arr[key] === ndl) ||
  // (!strict && arr[key] == ndl)
  // in just one for, in order to improve the performance
  // deciding wich type of comparation will do before walk array
  if (strict) {
    for (key in haystack) {
      if (haystack[key] === needle) {
        return true;
      }
    }
  } else {
    for (key in haystack) {
      if (haystack[key] == needle) {
        return true;
      }
    }
  }
  return false;
};
Settlement.urlencode = function (str) {
  str = (str + '').toString();

  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+');
};
Settlement.addslashes = function (text) {
  return (text + '').replace(/["'\\]/g, '\\$&').replace(/\u0000/g, '\\0');
};
Settlement.sprintf = function () {
  const regex = /%%|%(?:(\d+)\$)?((?:[ #+0-]|'[\S\s])*)(\d+)?(?:\.(\d*))?([\S\s])/g;
  const args = arguments;
  let i = 0;
  const format = args[i++];
  const _pad = function (str, len, chr, leftJustify) {
    if (!chr) {
      chr = ' ';
    }
    const padding =
      str.length >= len ? '' : Array.from({ length: (1 + len - str.length) >>> 0 }).join(chr);
    return leftJustify ? str + padding : padding + str;
  };
  const justify = function (value, prefix, leftJustify, minWidth, padChar) {
    const diff = minWidth - value.length;
    if (diff > 0) {
      // when padding with zeros
      // on the left side
      // keep sign (+ or -) in front
      if (!leftJustify && padChar === '0') {
        value = [
          value.slice(0, prefix.length),
          _pad('', diff, '0', true),
          value.slice(prefix.length),
        ].join('');
      } else {
        value = _pad(value, minWidth, padChar, leftJustify);
      }
    }
    return value;
  };
  const _formatBaseX = function (value, base, leftJustify, minWidth, precision, padChar) {
    // Note: casts negative numbers to positive ones
    const number = value >>> 0;
    value = _pad(number.toString(base), precision || 0, '0', false);
    return justify(value, '', leftJustify, minWidth, padChar);
  };
  // _formatString()
  const _formatString = function (value, leftJustify, minWidth, precision, customPadChar) {
    if (precision !== null && precision !== undefined) {
      value = value.slice(0, precision);
    }
    return justify(value, '', leftJustify, minWidth, customPadChar);
  };
  // doFormat()
  const doFormat = function (substring, argIndex, modifiers, minWidth, precision, specifier) {
    let number, prefix, method, textTransform, value;
    if (substring === '%%') {
      return '%';
    }
    // parse modifiers
    let padChar = ' '; // pad with spaces by default
    let leftJustify = false;
    let positiveNumberPrefix = '';
    let j, l;
    for (j = 0, l = modifiers.length; j < l; j++) {
      switch (modifiers.charAt(j)) {
        case ' ':
        case '0': {
          padChar = modifiers.charAt(j);
          break;
        }
        case '+': {
          positiveNumberPrefix = '+';
          break;
        }
        case '-': {
          leftJustify = true;
          break;
        }
        case "'": {
          if (j + 1 < l) {
            padChar = modifiers.charAt(j + 1);
            j++;
          }
          break;
        }
      }
    }
    if (minWidth) {
      minWidth = +minWidth;
    } else {
      minWidth = 0;
    }
    if (!isFinite(minWidth)) {
      throw new TypeError('Width must be finite');
    }
    if (precision) {
      precision = +precision;
    } else {
      precision = specifier === 'd' ? 0 : 'fFeE'.includes(specifier) ? 6 : undefined;
    }
    if (argIndex && +argIndex === 0) {
      throw new Error('Argument number must be greater than zero');
    }
    if (argIndex && +argIndex >= args.length) {
      throw new Error('Too few arguments');
    }
    value = argIndex ? args[+argIndex] : args[i++];
    switch (specifier) {
      case '%': {
        return '%';
      }
      case 's': {
        return _formatString(value + '', leftJustify, minWidth, precision, padChar);
      }
      case 'c': {
        return _formatString(
          String.fromCharCode(+value),
          leftJustify,
          minWidth,
          precision,
          padChar,
        );
      }
      case 'b': {
        return _formatBaseX(value, 2, leftJustify, minWidth, precision, padChar);
      }
      case 'o': {
        return _formatBaseX(value, 8, leftJustify, minWidth, precision, padChar);
      }
      case 'x': {
        return _formatBaseX(value, 16, leftJustify, minWidth, precision, padChar);
      }
      case 'X': {
        return _formatBaseX(value, 16, leftJustify, minWidth, precision, padChar).toUpperCase();
      }
      case 'u': {
        return _formatBaseX(value, 10, leftJustify, minWidth, precision, padChar);
      }
      case 'i':
      case 'd': {
        number = +value || 0;
        // Plain Math.round doesn't just truncate
        number = Math.round(number - (number % 1));
        prefix = number < 0 ? '-' : positiveNumberPrefix;
        value = prefix + _pad(String(Math.abs(number)), precision, '0', false);
        if (leftJustify && padChar === '0') {
          // can't right-pad 0s on integers
          padChar = ' ';
        }
        return justify(value, prefix, leftJustify, minWidth, padChar);
      }
      case 'e':
      case 'E':
      case 'f':
      case 'F':
      case 'g':
      case 'G': {
        number = +value;
        prefix = number < 0 ? '-' : positiveNumberPrefix;
        method = ['toExponential', 'toFixed', 'toPrecision'][
          'efg'.indexOf(specifier.toLowerCase())
        ];
        textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(specifier) % 2];
        value = prefix + Math.abs(number)[method](precision);
        return justify(value, prefix, leftJustify, minWidth, padChar)[textTransform]();
      }
      default: {
        // unknown specifier, consume that char and return empty
        return '';
      }
    }
  };
  try {
    return format.replace(regex, doFormat);
  } catch {
    return false;
  }
};
Settlement.str_repeat = function (input, multiplier) {
  let y = '';
  while (true) {
    if (multiplier & 1) {
      y += input;
    }
    multiplier >>= 1;
    if (multiplier) {
      input += input;
    } else {
      break;
    }
  }
  return y;
};
Settlement.mt_rand = function (min, max) {
  const argc = arguments.length;
  if (argc === 0) {
    min = 0;
    max = 2147483647;
  } else if (argc === 1) {
    throw new Error('Warning: mt_rand() expects exactly 2 parameters, 1 given');
  } else {
    min = Number.parseInt(min, 10);
    max = Number.parseInt(max, 10);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
Settlement.chr = function (bytevalue) {
  // Php chr generate a byte string
  // from a number (0..255).

  // Check whether number is very large
  // 0xFFFF = 65535
  if (bytevalue > 0xffff) {
    // 0x10000 = 65536
    bytevalue -= 0x10000;
    // 0xD800 = 55296
    // 0xDC00 = 56320
    // 0x3FF  = 1023
    return String.fromCharCode(0xd800 + (bytevalue >> 10), 0xdc00 + (bytevalue & 0x3ff));
  } else if (bytevalue < 0) {
    // Case : it manage request
    // of negative byte value.
    while (bytevalue < 0) {
      bytevalue += 256;
    }
    bytevalue %= 256;
  }
  // Generate byte string from a number
  return String.fromCharCode(bytevalue);
};
//---------------------------------
// kalkicode.com
// These methods have not been changed by our tools.
// defined
// mt_srand
// preg_match
// strtr
// is_array
// preg_replace
// trim
// preg_match_all
// tpl_quote_filter
// tpl_quote
// substr
// substr_replace
//----------------------------
