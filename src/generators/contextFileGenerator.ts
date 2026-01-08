import * as fs from 'fs';
import * as path from 'path';
import { ContextMap, Module } from '../types';

/**
 * Generates context files for various AI coding assistants
 * These files are automatically read by each tool to provide codebase context
 */
export class ContextFileGenerator {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Generate all AI tool context files from the context map
   */
  async generateAll(contextMap: ContextMap): Promise<void> {
    const contextContent = this.formatContextContent(contextMap);

    await Promise.all([
      this.generateClaudeCode(contextContent),
      this.generateCursor(contextContent),
      this.generateWindsurf(contextContent),
      this.generateCopilot(contextContent),
      this.generateContinue(contextContent),
      this.generateAider(contextContent),
    ]);

    console.log('[DocuDepth] Generated context files for all AI tools');
  }

  /**
   * Detect primary language from file extensions in the context map
   */
  private detectPrimaryLanguage(files: Record<string, any>): string {
    const languageCounts: Record<string, number> = {};
    const extensionToLanguage: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.swift': 'Swift',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
    };

    for (const filePath of Object.keys(files)) {
      const ext = path.extname(filePath).toLowerCase();
      const lang = extensionToLanguage[ext];
      if (lang) {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
    }

    // Return the most common language
    let maxLang = 'Unknown';
    let maxCount = 0;
    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxLang = lang;
      }
    }
    return maxLang;
  }

  /**
   * Detect architecture style from files and modules
   */
  private detectArchitectureStyle(files: Record<string, any>, modules: any[]): string {
    const filePaths = Object.keys(files);
    const hasLambda = filePaths.some(f =>
      f.includes('lambda') || f.includes('handler') || f.includes('.handler.')
    );
    const hasCDK = filePaths.some(f => f.includes('cdk') || f.includes('cloudformation'));
    const hasServerless = filePaths.some(f => f.includes('serverless'));
    const hasDocker = filePaths.some(f => f.includes('Dockerfile') || f.includes('docker-compose'));
    const hasPackages = filePaths.some(f => f.includes('/packages/'));
    const hasServices = filePaths.some(f => f.includes('/services/'));
    const hasControllers = filePaths.some(f => f.includes('/controllers/'));
    const hasRoutes = filePaths.some(f => f.includes('/routes/'));
    const hasModels = filePaths.some(f => f.includes('/models/'));
    const hasHooks = filePaths.some(f => f.includes('/hooks/') || f.includes('use'));
    const hasComponents = filePaths.some(f => f.includes('/components/'));

    if (hasLambda || hasCDK || hasServerless) return 'serverless';
    if (hasPackages) return 'monorepo';
    if (hasServices && hasControllers) return 'layered';
    if (hasRoutes && hasModels) return 'MVC';
    if (hasHooks && hasComponents) return 'component-based';
    if (modules.length > 3) return 'modular';
    return 'monolithic';
  }

  /**
   * Extract project name from package.json or directory
   */
  private extractProjectName(contextMap: ContextMap): string {
    // Try repository name first
    if (contextMap.repository?.name && contextMap.repository.name !== 'Unknown') {
      return contextMap.repository.name;
    }

    // Try to find package.json name from config files
    if (contextMap.configurationGuide?.configFiles) {
      const pkgConfig = contextMap.configurationGuide.configFiles.find(
        f => f.file.includes('package.json')
      );
      if (pkgConfig?.keySettings) {
        const nameSetting = pkgConfig.keySettings.find(s => s.startsWith('name:'));
        if (nameSetting) {
          return nameSetting.replace('name:', '').trim();
        }
      }
    }

    // Try workspace root directory name
    return path.basename(this.workspaceRoot);
  }

  /**
   * Generate a meaningful summary from available data
   */
  private generateSummary(contextMap: ContextMap): string {
    const modules = contextMap.modules || [];
    const files = contextMap.files || {};
    const api = contextMap.api;
    const dependencies = contextMap.dependencies?.external || [];

    // Build summary from available data
    const parts: string[] = [];

    // What does it do?
    if (contextMap.repository?.description) {
      parts.push(contextMap.repository.description);
    } else if (contextMap.architecture?.summary) {
      parts.push(contextMap.architecture.summary);
    } else {
      // Generate from modules
      const moduleNames = modules.map(m => m.name).slice(0, 5);
      if (moduleNames.length > 0) {
        parts.push(`Project with modules: ${moduleNames.join(', ')}.`);
      }
    }

    // Key technologies
    const techStack: string[] = [];
    for (const dep of dependencies.slice(0, 10)) {
      if (dep.purpose && dep.package) {
        // Common important packages
        const importantPkgs = ['react', 'vue', 'angular', 'express', 'hono', 'fastify', 'next', 'nuxt',
          'prisma', 'drizzle', 'typeorm', 'mongoose', 'stripe', 'aws-sdk', 'firebase', 'supabase',
          'openai', 'langchain', 'tensorflow', 'pytorch'];
        if (importantPkgs.some(p => dep.package.toLowerCase().includes(p))) {
          techStack.push(`${dep.package} (${dep.purpose})`);
        }
      }
    }
    if (techStack.length > 0) {
      parts.push(`Key technologies: ${techStack.slice(0, 5).join(', ')}.`);
    }

    // API info
    if (api?.endpoints && api.endpoints.length > 0) {
      parts.push(`Exposes ${api.endpoints.length} API endpoints.`);
    }

    // Module highlights
    const keyModules = modules.filter(m => m.businessContext || m.architectureRole);
    if (keyModules.length > 0 && !contextMap.repository?.description) {
      const highlight = keyModules[0];
      if (highlight.businessContext) {
        parts.push(highlight.businessContext);
      }
    }

    return parts.join(' ') || 'Codebase context for AI-assisted development.';
  }

  /**
   * Extract domain context from README, business context, and patterns
   */
  private extractDomainContext(contextMap: ContextMap): string | null {
    const parts: string[] = [];

    // From modules' business context
    const modules = contextMap.modules || [];
    const businessContexts = modules
      .filter((m): m is Module & { businessContext: string } => !!m.businessContext)
      .map(m => m.businessContext)
      .slice(0, 3);

    if (businessContexts.length > 0) {
      parts.push(...businessContexts);
    }

    // From AI guidance project-specific knowledge
    if (contextMap.aiGuidance?.projectSpecificKnowledge) {
      const knowledge = contextMap.aiGuidance.projectSpecificKnowledge.slice(0, 5);
      parts.push(...knowledge);
    }

    // From semantic search features
    if (contextMap.semanticSearch?.byFeature) {
      const features = Object.entries(contextMap.semanticSearch.byFeature).slice(0, 5);
      for (const [name, feature] of features) {
        if (feature.description) {
          parts.push(`${name}: ${feature.description}`);
        }
      }
    }

    if (parts.length === 0) return null;
    return parts.join('\n\n');
  }

  /**
   * Organize files by importance and group by category
   */
  private organizeKeyFiles(files: Record<string, any>, modules: any[]): {
    entryPoints: any[];
    coreLogic: any[];
    dataLayer: any[];
    utilities: any[];
    config: any[];
  } {
    const categorized = {
      entryPoints: [] as any[],
      coreLogic: [] as any[],
      dataLayer: [] as any[],
      utilities: [] as any[],
      config: [] as any[],
    };

    const fileList = Object.values(files);

    for (const file of fileList) {
      const filePath = file.path?.toLowerCase() || '';
      const role = file.role || '';
      const significance = file.architectureSignificance || 'supporting';

      // Entry points
      if (
        role === 'entry-point' ||
        filePath.includes('index') ||
        filePath.includes('main') ||
        filePath.includes('app') ||
        filePath.includes('handler') ||
        filePath.includes('lambda') ||
        significance === 'critical'
      ) {
        categorized.entryPoints.push(file);
        continue;
      }

      // Data layer
      if (
        role === 'model' ||
        filePath.includes('model') ||
        filePath.includes('schema') ||
        filePath.includes('database') ||
        filePath.includes('repository') ||
        filePath.includes('queries')
      ) {
        categorized.dataLayer.push(file);
        continue;
      }

      // Core logic (services, controllers)
      if (
        role === 'service' ||
        role === 'controller' ||
        filePath.includes('service') ||
        filePath.includes('controller') ||
        filePath.includes('core') ||
        significance === 'important'
      ) {
        categorized.coreLogic.push(file);
        continue;
      }

      // Config
      if (
        role === 'config' ||
        filePath.includes('config') ||
        filePath.includes('.env') ||
        filePath.endsWith('.json') ||
        filePath.endsWith('.yaml') ||
        filePath.endsWith('.yml')
      ) {
        categorized.config.push(file);
        continue;
      }

      // Utilities
      if (
        role === 'utility' ||
        filePath.includes('util') ||
        filePath.includes('helper') ||
        filePath.includes('lib/')
      ) {
        categorized.utilities.push(file);
        continue;
      }

      // Default to core logic for unlabeled important files
      if (significance !== 'supporting') {
        categorized.coreLogic.push(file);
      }
    }

    // Sort each category by significance
    const sortBySignificance = (a: any, b: any) => {
      const order = { critical: 0, important: 1, supporting: 2 };
      return (order[a.architectureSignificance as keyof typeof order] || 2) -
             (order[b.architectureSignificance as keyof typeof order] || 2);
    };

    categorized.entryPoints.sort(sortBySignificance);
    categorized.coreLogic.sort(sortBySignificance);
    categorized.dataLayer.sort(sortBySignificance);

    return categorized;
  }

  /**
   * Format context map into readable content for AI tools
   */
  private formatContextContent(contextMap: ContextMap): string {
    // Defensive check
    if (!contextMap) {
      throw new Error('Cannot format context: contextMap is undefined');
    }

    // Use defaults for missing properties
    const repository = contextMap.repository || {
      name: 'Unknown',
      primaryLanguage: 'Unknown',
      totalFiles: 0,
    };
    const architecture = contextMap.architecture || {
      style: 'Unknown',
      summary: 'No architecture information available',
    };
    const modules = contextMap.modules || [];
    const patterns = contextMap.patterns || [];
    const files = contextMap.files || {};

    // Smart extraction with fallbacks
    const projectName = this.extractProjectName(contextMap);
    const primaryLanguage = repository.primaryLanguage && repository.primaryLanguage !== 'Unknown'
      ? repository.primaryLanguage
      : this.detectPrimaryLanguage(files);
    const archStyle = architecture.style && architecture.style !== 'Unknown'
      ? architecture.style
      : this.detectArchitectureStyle(files, modules);
    const summary = this.generateSummary(contextMap);
    const domainContext = this.extractDomainContext(contextMap);
    const organizedFiles = this.organizeKeyFiles(files, modules);

    let content = `# ${projectName} - Codebase Context\n\n`;
    content += `> Generated by DocuDepth AI - https://docudepthai.com\n`;
    content += `> Last updated: ${new Date().toISOString()}\n\n`;

    // Project Overview with smart summary
    content += `## Project Overview\n\n`;
    content += `**${projectName}**\n\n`;
    content += `${summary}\n\n`;
    content += `| Attribute | Value |\n`;
    content += `|-----------|-------|\n`;
    content += `| Primary Language | ${primaryLanguage} |\n`;
    content += `| Architecture | ${archStyle} |\n`;
    if (repository.framework) {
      content += `| Framework | ${repository.framework} |\n`;
    }
    content += `| Total Files | ${repository.totalFiles || Object.keys(files).length} |\n\n`;

    // Domain Context (if available)
    if (domainContext) {
      content += `## Domain Context\n\n`;
      content += `${domainContext}\n\n`;
    }

    // Architecture
    content += `## Architecture\n\n`;
    content += `**Style:** ${archStyle}\n\n`;
    if (architecture.summary && architecture.summary !== 'No architecture information available') {
      content += `${architecture.summary}\n\n`;
    }
    if (architecture.diagram) {
      content += `### System Diagram\n\n`;
      content += `\`\`\`mermaid\n${architecture.diagram}\n\`\`\`\n\n`;
    }

    // Key Files (organized by category)
    content += `## Key Files\n\n`;

    if (organizedFiles.entryPoints.length > 0) {
      content += `### Entry Points\n\n`;
      for (const file of organizedFiles.entryPoints.slice(0, 8)) {
        const significance = file.architectureSignificance === 'critical' ? ' **(critical)**' : '';
        content += `- \`${file.path}\`${significance} - ${file.purpose || 'Entry point'}\n`;
      }
      content += `\n`;
    }

    if (organizedFiles.coreLogic.length > 0) {
      content += `### Core Logic\n\n`;
      for (const file of organizedFiles.coreLogic.slice(0, 10)) {
        const significance = file.architectureSignificance === 'critical' ? ' **(critical)**' : '';
        content += `- \`${file.path}\`${significance} - ${file.purpose || 'Core functionality'}\n`;
      }
      content += `\n`;
    }

    if (organizedFiles.dataLayer.length > 0) {
      content += `### Data Layer\n\n`;
      for (const file of organizedFiles.dataLayer.slice(0, 8)) {
        content += `- \`${file.path}\` - ${file.purpose || 'Data management'}\n`;
      }
      content += `\n`;
    }

    if (organizedFiles.config.length > 0) {
      content += `### Configuration\n\n`;
      for (const file of organizedFiles.config.slice(0, 5)) {
        content += `- \`${file.path}\` - ${file.purpose || 'Configuration'}\n`;
      }
      content += `\n`;
    }

    // Modules
    if (modules && modules.length > 0) {
      content += `## Modules\n\n`;
      for (const module of modules) {
        content += `### ${module.name}\n\n`;
        content += `- **Path:** \`${module.path}\`\n`;
        content += `- **Role:** ${module.architectureRole || module.purpose}\n`;
        if (module.businessContext) {
          content += `- **Business Context:** ${module.businessContext}\n`;
        }
        if (module.publicAPI && module.publicAPI.length > 0) {
          content += `- **Key Exports:** ${module.publicAPI.slice(0, 10).join(', ')}\n`;
        }
        if (module.dependencies && module.dependencies.length > 0) {
          content += `- **Dependencies:** ${module.dependencies.slice(0, 5).join(', ')}\n`;
        }
        if (module.gotchas && module.gotchas.length > 0) {
          content += `- **Gotchas:** ${module.gotchas.slice(0, 3).join('; ')}\n`;
        }
        content += `\n`;
      }
    }

    // Patterns & Conventions
    if (patterns && patterns.length > 0) {
      content += `## Code Patterns & Conventions\n\n`;
      for (const pattern of patterns) {
        content += `### ${pattern.name}\n\n`;
        content += `${pattern.description}\n\n`;
        if (pattern.rules && pattern.rules.length > 0) {
          content += `**Rules:**\n`;
          for (const rule of pattern.rules.slice(0, 5)) {
            content += `- ${rule}\n`;
          }
          content += `\n`;
        }
        if (pattern.examples?.correct) {
          content += `**Correct:**\n\`\`\`\n${pattern.examples.correct}\n\`\`\`\n\n`;
        }
        if (pattern.examples?.incorrect) {
          content += `**Incorrect:**\n\`\`\`\n${pattern.examples.incorrect}\n\`\`\`\n\n`;
        }
        if (pattern.files && pattern.files.length > 0) {
          content += `**Used in:** ${pattern.files.slice(0, 3).join(', ')}\n\n`;
        }
      }
    }

    // AI Guidance
    if (contextMap.aiGuidance) {
      content += `## AI Guidance\n\n`;

      if (contextMap.aiGuidance.mustFollow && contextMap.aiGuidance.mustFollow.length > 0) {
        content += `### Must Follow\n\n`;
        for (const rule of contextMap.aiGuidance.mustFollow) {
          content += `- ${rule}\n`;
        }
        content += `\n`;
      }

      if (contextMap.aiGuidance.mustAvoid && contextMap.aiGuidance.mustAvoid.length > 0) {
        content += `### Must Avoid\n\n`;
        for (const rule of contextMap.aiGuidance.mustAvoid) {
          content += `- ${rule}\n`;
        }
        content += `\n`;
      }

      if (contextMap.aiGuidance.commonTasks && Object.keys(contextMap.aiGuidance.commonTasks).length > 0) {
        content += `### Common Tasks\n\n`;
        for (const [task, guide] of Object.entries(contextMap.aiGuidance.commonTasks).slice(0, 5)) {
          content += `**${task}:**\n`;
          content += `- Approach: ${guide.approach}\n`;
          if (guide.files && guide.files.length > 0) {
            content += `- Files: ${guide.files.join(', ')}\n`;
          }
          content += `\n`;
        }
      }
    }

    // Quick Start by Task
    if (contextMap.semanticSearch?.byTask && Object.keys(contextMap.semanticSearch.byTask).length > 0) {
      content += `## Quick Start by Task\n\n`;
      for (const [task, guide] of Object.entries(contextMap.semanticSearch.byTask).slice(0, 6)) {
        content += `### ${task}\n\n`;
        if (guide.files && guide.files.length > 0) {
          content += `**Files to modify:** ${guide.files.slice(0, 5).join(', ')}\n\n`;
        }
        if (guide.steps && guide.steps.length > 0) {
          content += `**Steps:**\n`;
          for (const step of guide.steps) {
            content += `1. ${step}\n`;
          }
          content += `\n`;
        }
        if (guide.warnings && guide.warnings.length > 0) {
          content += `**Warnings:** ${guide.warnings.join('; ')}\n\n`;
        }
      }
    }

    // Additional context
    content += `---\n\n`;
    content += `## How to Use This Context\n\n`;
    content += `This file provides your AI coding assistant with deep understanding of this codebase.\n`;
    content += `The AI will automatically use this context to:\n\n`;
    content += `- Understand the project structure and architecture\n`;
    content += `- Follow existing code patterns and conventions\n`;
    content += `- Make accurate suggestions that fit the codebase\n`;
    content += `- Navigate between related files and modules\n\n`;
    content += `For full details, check \`.docudepth/context-map.json\`.\n\n`;
    content += `*This file is auto-generated and updated by DocuDepth. Do not edit manually.*\n`;

    return content;
  }

  /**
   * Generate CLAUDE.md for Claude Code
   */
  private async generateClaudeCode(content: string): Promise<void> {
    const claudeContent = `${content}`;
    const filePath = path.join(this.workspaceRoot, 'CLAUDE.md');
    fs.writeFileSync(filePath, claudeContent, 'utf-8');
  }

  /**
   * Generate .cursorrules for Cursor
   */
  private async generateCursor(content: string): Promise<void> {
    // Cursor expects a slightly different format - more directive
    let cursorContent = `# Cursor Rules - Generated by DocuDepth\n\n`;
    cursorContent += `You are working on a codebase with the following structure and conventions.\n`;
    cursorContent += `Always follow the patterns and architecture described below.\n\n`;
    cursorContent += content;

    const filePath = path.join(this.workspaceRoot, '.cursorrules');
    fs.writeFileSync(filePath, cursorContent, 'utf-8');
  }

  /**
   * Generate .windsurfrules for Windsurf
   */
  private async generateWindsurf(content: string): Promise<void> {
    let windsurfContent = `# Windsurf Rules - Generated by DocuDepth\n\n`;
    windsurfContent += content;

    const filePath = path.join(this.workspaceRoot, '.windsurfrules');
    fs.writeFileSync(filePath, windsurfContent, 'utf-8');
  }

  /**
   * Generate .github/copilot-instructions.md for GitHub Copilot
   */
  private async generateCopilot(content: string): Promise<void> {
    const githubDir = path.join(this.workspaceRoot, '.github');

    // Create .github directory if it doesn't exist
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    let copilotContent = `# GitHub Copilot Instructions - Generated by DocuDepth\n\n`;
    copilotContent += content;

    const filePath = path.join(githubDir, 'copilot-instructions.md');
    fs.writeFileSync(filePath, copilotContent, 'utf-8');
  }

  /**
   * Generate .continuerules for Continue.dev
   */
  private async generateContinue(content: string): Promise<void> {
    let continueContent = `# Continue Rules - Generated by DocuDepth\n\n`;
    continueContent += content;

    const filePath = path.join(this.workspaceRoot, '.continuerules');
    fs.writeFileSync(filePath, continueContent, 'utf-8');
  }

  /**
   * Generate .aider/context.md for Aider
   */
  private async generateAider(content: string): Promise<void> {
    const aiderDir = path.join(this.workspaceRoot, '.aider');

    // Create .aider directory if it doesn't exist
    if (!fs.existsSync(aiderDir)) {
      fs.mkdirSync(aiderDir, { recursive: true });
    }

    let aiderContent = `# Aider Context - Generated by DocuDepth\n\n`;
    aiderContent += content;

    const filePath = path.join(aiderDir, 'context.md');
    fs.writeFileSync(filePath, aiderContent, 'utf-8');
  }
}
