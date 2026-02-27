import type {
  GeneAdapter,
  GeneManifest,
  InstallOptions,
  InstallResult,
  UninstallOptions,
  UninstallResult,
  InstalledGene,
} from '@genehub/types';

export abstract class BaseAdapter implements GeneAdapter {
  abstract readonly product: string;

  abstract detect(): Promise<boolean>;

  abstract install(manifest: GeneManifest, options?: InstallOptions): Promise<InstallResult>;

  abstract uninstall(slug: string, options?: UninstallOptions): Promise<UninstallResult>;

  abstract list(): Promise<InstalledGene[]>;

  abstract isInstalled(slug: string): Promise<boolean>;

  abstract getInstalledVersion(slug: string): Promise<string | null>;

  protected generateSkillContent(manifest: GeneManifest, metadataNamespace: string): string {
    const skillMeta = manifest.skill.always ? 'true' : 'false';
    const frontMatter = [
      '---',
      `name: ${manifest.skill.name}`,
      `description: ${manifest.short_description}`,
      'metadata:',
      `  ${metadataNamespace}:`,
      `    always: ${skillMeta}`,
      '---',
    ].join('\n');

    if (manifest.skill.content) {
      const content = manifest.skill.content.trim();
      if (content.startsWith('---')) {
        return content;
      }
      return `${frontMatter}\n\n${content}`;
    }

    return frontMatter;
  }
}
