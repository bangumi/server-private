use std::path::Path;
use std::sync::Arc;

use anyhow::{Context, Result};
use serde::Serialize;
use tera::{Context as TeraContext, Tera};

#[derive(Clone)]
pub(crate) struct TemplateEngine {
  tera: Arc<Tera>,
}

impl TemplateEngine {
  pub fn new(template_root: impl AsRef<Path>) -> Result<Self> {
    let mut pattern = template_root.as_ref().to_path_buf();
    pattern.push("**/*.html");
    let pattern = pattern.to_string_lossy().to_string();

    let tera = Tera::new(&pattern)
      .with_context(|| format!("failed to load templates from pattern {pattern}"))?;

    Ok(Self {
      tera: Arc::new(tera),
    })
  }

  pub fn render<T: Serialize>(&self, template_name: &str, data: &T) -> Result<String> {
    let context = TeraContext::from_serialize(data)
      .context("failed to build template context from serializable data")?;
    self
      .tera
      .render(template_name, &context)
      .with_context(|| format!("failed to render template {template_name}"))
  }
}
