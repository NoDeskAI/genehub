"""GeneHub 数据类型，与 Registry API 及标准学习协议对齐。"""

from typing import Any, TypedDict


class Author(TypedDict, total=False):
    type: str
    name: str
    ref: str


class CompatibilityEntry(TypedDict, total=False):
    product: str
    min_version: str


class DependencyEntry(TypedDict, total=False):
    slug: str
    version: str
    optional: bool


class Skill(TypedDict, total=False):
    name: str
    always: bool
    content: str | None
    file: str | None


class Rule(TypedDict, total=False):
    name: str
    content: str
    applies_to: str | None


class GeneConfig(TypedDict, total=False):
    common: dict[str, Any]
    openclaw: dict[str, Any]
    nanobot: dict[str, Any]


class LearningScenario(TypedDict, total=False):
    title: str
    context: str
    expected_focus: str


class Learning(TypedDict, total=False):
    force_deep_learn: bool
    objectives: list[str]
    scenarios: list[LearningScenario]


class GeneManifest(TypedDict, total=False):
    slug: str
    name: str
    version: str
    description: str
    short_description: str
    category: str
    tags: list[str]
    icon: str | None
    author: Author | None
    compatibility: list[CompatibilityEntry]
    dependencies: list[DependencyEntry]
    synergies: list[str]
    skill: Skill
    rules: list[Rule]
    config: GeneConfig | None
    learning: Learning | None


class Gene(TypedDict, total=False):
    id: str
    name: str
    slug: str
    version: str
    description: str
    short_description: str
    category: str
    tags: list[str]
    icon: str | None
    source: str
    source_ref: str | None
    manifest: GeneManifest
    compatibility: list[str]
    dependencies: list[dict[str, str]]
    synergies: list[str]
    author: Author
    install_count: int
    avg_rating: float
    is_published: bool
    created_at: str
    updated_at: str


class PaginatedData(TypedDict, total=False):
    items: list[Gene]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApiResponse(TypedDict, total=False):
    code: int
    message: str
    data: Any
    error_code: str


# --- Adapter 类型（与 types/adapter.ts 对齐）---


class InstallOptions(TypedDict, total=False):
    target_path: str | None
    force: bool
    skip_dependencies: bool


class UninstallOptions(TypedDict, total=False):
    keep_config: bool


class InstallResult(TypedDict):
    success: bool
    slug: str
    version: str
    files: list[str]
    needs_restart: bool
    dependencies: list[str]


class UninstallResult(TypedDict):
    success: bool
    slug: str
    files: list[str]
    needs_restart: bool


class InstalledGene(TypedDict):
    slug: str
    version: str
    installed_at: str
    files: list[str]
