use std::fmt;

use thiserror::Error;

const PREFIX: &str = "{{Infobox";
const SUFFIX: &str = "}}";

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Wiki {
  pub typ: String,
  pub fields: Vec<Field>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Field {
  pub key: String,
  pub value: FieldValue,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FieldValue {
  Scalar(String),
  Array(Vec<Item>),
  Null,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Item {
  pub key: String,
  pub value: String,
}

#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum ParseError {
  #[error("invalid wiki syntax: missing prefix '{{{{Infobox' at the start")]
  MissingPrefix,
  #[error("invalid wiki syntax: missing '}}}}' at the end")]
  MissingSuffix,
  #[error("invalid wiki syntax: array should be closed by '}}'")]
  ArrayNotClosed,
  #[error("invalid wiki syntax: array item should be wrapped by '[]'")]
  InvalidArrayItem,
  #[error("invalid wiki syntax: missing '|' to start a new field")]
  ExpectingNewField,
  #[error("invalid wiki syntax: missing '=' to separate field name and value")]
  MissingEqual,
}

pub fn parse(input: &str) -> Result<Wiki, ParseError> {
  let normalized = process_input(input);
  if normalized.is_empty() {
    return Ok(Wiki::default());
  }

  if !normalized.starts_with(PREFIX) {
    return Err(ParseError::MissingPrefix);
  }
  if !normalized.ends_with(SUFFIX) {
    return Err(ParseError::MissingSuffix);
  }

  let typ = read_type(&normalized);

  let first_eol = match normalized.find('\n') {
    Some(index) => index,
    None => {
      return Ok(Wiki {
        typ,
        fields: vec![],
      })
    }
  };

  let body = &normalized[first_eol + 1..normalized.len() - SUFFIX.len()];
  let mut fields: Vec<Field> = Vec::new();
  let mut in_array = false;
  let mut array_key = String::new();
  let mut array_items: Vec<Item> = Vec::new();

  for raw_line in body.lines() {
    let line = raw_line.trim();
    if line.is_empty() {
      continue;
    }

    if line.starts_with('|') {
      if in_array {
        return Err(ParseError::ArrayNotClosed);
      }

      let content = line.trim_start_matches('|').trim_start();
      let (key, value) = read_start_line(content)?;

      if value.is_empty() {
        fields.push(Field {
          key,
          value: FieldValue::Null,
        });
      } else if value == "{" {
        in_array = true;
        array_key = key;
      } else {
        fields.push(Field {
          key,
          value: FieldValue::Scalar(value),
        });
      }
      continue;
    }

    if in_array {
      if line == "}" {
        in_array = false;
        fields.push(Field {
          key: std::mem::take(&mut array_key),
          value: FieldValue::Array(std::mem::take(&mut array_items)),
        });
        continue;
      }

      let (key, value) = read_array_item(line)?;
      array_items.push(Item { key, value });
      continue;
    }

    return Err(ParseError::ExpectingNewField);
  }

  if in_array {
    return Err(ParseError::ArrayNotClosed);
  }

  Ok(Wiki { typ, fields })
}

pub fn parse_omit_error(input: &str) -> Wiki {
  parse(input).unwrap_or_default()
}

fn process_input(s: &str) -> String {
  s.replace("\r\n", "\n").trim().to_owned()
}

fn read_type(s: &str) -> String {
  let start = PREFIX.len();
  let end = s[start..]
    .find('\n')
    .map(|i| start + i)
    .or_else(|| s[start..].find('}').map(|i| start + i))
    .unwrap_or(s.len());
  s[start..end].trim().to_owned()
}

fn read_start_line(line: &str) -> Result<(String, String), ParseError> {
  let Some((before, after)) = line.split_once('=') else {
    return Err(ParseError::MissingEqual);
  };
  Ok((before.trim_end().to_owned(), after.trim_start().to_owned()))
}

fn read_array_item(line: &str) -> Result<(String, String), ParseError> {
  if !line.starts_with('[') || !line.ends_with(']') {
    return Err(ParseError::InvalidArrayItem);
  }

  let content = &line[1..line.len() - 1];
  if let Some((before, after)) = content.split_once('|') {
    Ok((before.trim().to_owned(), after.trim().to_owned()))
  } else {
    Ok((String::new(), content.trim().to_owned()))
  }
}

impl Wiki {
  pub fn field(&self, key: &str) -> Option<&FieldValue> {
    self.fields.iter().find_map(|field| {
      if field.key == key {
        Some(&field.value)
      } else {
        None
      }
    })
  }
}

impl fmt::Display for FieldValue {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      FieldValue::Scalar(value) => write!(f, "{value}"),
      FieldValue::Array(values) => write!(f, "{:?}", values),
      FieldValue::Null => write!(f, ""),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_scalar_fields() {
    let wiki = parse(
      "{{Infobox animanga/Novel\n|发售日= 2024-02-24（预售）\n|开始= 2021-04-16\n}}",
    )
    .expect("should parse");

    assert_eq!(wiki.typ, "animanga/Novel");
    assert_eq!(
      wiki.field("发售日"),
      Some(&FieldValue::Scalar("2024-02-24（预售）".to_owned()))
    );
    assert_eq!(
      wiki.field("开始"),
      Some(&FieldValue::Scalar("2021-04-16".to_owned()))
    );
  }

  #[test]
  fn parses_array_fields() {
    let wiki = parse("{{Infobox\n|别名={\n[罗马字|Mizuki Nana]\n[奈々]\n}\n}}")
      .expect("should parse");

    assert_eq!(wiki.typ, "");
    let value = wiki.field("别名").expect("missing array field");
    match value {
      FieldValue::Array(items) => {
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].key, "罗马字");
        assert_eq!(items[0].value, "Mizuki Nana");
        assert_eq!(items[1].key, "");
        assert_eq!(items[1].value, "奈々");
      }
      _ => panic!("expected array value"),
    }
  }

  #[test]
  fn parses_null_field() {
    let wiki = parse("{{Infobox\n|册数=\n}}").expect("should parse null field");

    assert_eq!(wiki.field("册数"), Some(&FieldValue::Null));
  }

  #[test]
  fn fails_on_missing_prefix() {
    let err = parse("Infobox\n|发售日=2024-01-01\n}}").expect_err("should fail");
    assert_eq!(err, ParseError::MissingPrefix);
  }

  #[test]
  fn fails_on_unclosed_array() {
    let err =
      parse("{{Infobox\n|别名={\n[罗马字|Mizuki Nana]\n}}").expect_err("should fail");
    assert_eq!(err, ParseError::ArrayNotClosed);
  }

  #[test]
  fn parse_omit_error_returns_default() {
    let wiki = parse_omit_error("not wiki");
    assert_eq!(wiki, Wiki::default());
  }
}
