# 基因组目录

本目录存放多 Agent 协作单元（Office Unit）的基因组定义。每个基因组是一组基因的引用组合，用于将 Agent 塑造为特定角色。

## 目录结构

```
genomes/
├── README.md           # 本文件
├── agile-executor/     # 灵敏 -- 执行者基因组
│   └── genome.yaml
└── visionary-planner/  # 远见 -- 规划者基因组
    └── genome.yaml
```

## 基因组与基因的关系

- **基因**（Gene）：原子能力单元，存放在 `../skills/<slug>/`，包含 `gene.yaml` 和 `SKILL.md`。
- **基因组**（Genome）：基因的引用列表 + 可选的配置覆盖，不包含技能内容本身。

## 使用方法

- 基因组定义文件（`genome.yaml`）用于版本管理和 seed 数据源。
- 将基因组导入 Registry 需通过 seed 脚本或 API，当前 GeneHub 暂无从文件自动加载基因组的 CLI。

## 已定义基因组

| slug | 名称 | 角色 |
|------|------|------|
| agile-executor | 灵敏 -- 执行者基因组 | 卓越执行者（Act 类型） |
| visionary-planner | 远见 -- 规划者基因组 | 远见规划者（Plan 类型） |
