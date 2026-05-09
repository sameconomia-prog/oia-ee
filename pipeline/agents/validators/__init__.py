"""Post-hoc validators para outputs de agentes editoriales."""
from pipeline.agents.validators.cifras import scan_cifras_sin_cita, cifras_summary, CifraHit
from pipeline.agents.validators.wikilinks import scan_wikilinks, wikilinks_summary, WikilinkHit
from pipeline.agents.validators.frontmatter import validate_frontmatter, split_frontmatter

__all__ = [
    "scan_cifras_sin_cita", "cifras_summary", "CifraHit",
    "scan_wikilinks", "wikilinks_summary", "WikilinkHit",
    "validate_frontmatter", "split_frontmatter",
]
