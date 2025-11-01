// W3C Design Tokens Importer for Figma - Main Entry Point

import { UI_CONFIG } from './constants';
import { PluginMessage, TokenData } from './types';
import { VariableManager } from './services/variableManager';
import { DocumentationGenerator } from './services/documentationGenerator';

// Initialize services
const variableManager = new VariableManager();
const documentationGenerator = new DocumentationGenerator();

// Show UI
figma.showUI(__html__, { width: UI_CONFIG.width, height: UI_CONFIG.height });

// Message handler
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case 'import-tokens':
        await handleImportTokens(msg.data);
        break;

      case 'generate-documentation':
        await handleGenerateDocumentation();
        break;

      case 'connect-github':
        await handleConnectGithub(msg.data);
        break;

      case 'cancel':
        figma.closePlugin();
        break;

      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Error in plugin:', error);
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

async function handleImportTokens(data: { primitives: TokenData; semantics: TokenData }): Promise<void> {
  const { primitives, semantics } = data;
  const stats = await variableManager.importTokens(primitives, semantics);

  figma.ui.postMessage({
    type: 'import-success',
    message: `✓ Tokens imported: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`
  });
}

async function handleGenerateDocumentation(): Promise<void> {
  await documentationGenerator.generateDocumentation();

  figma.ui.postMessage({
    type: 'documentation-success',
    message: '✓ Documentation generated successfully!'
  });
}

async function handleConnectGithub(data: any): Promise<void> {
  // TODO: Implement GitHub connection
  figma.notify('GitHub connection coming soon!', { timeout: 3000 });
  figma.ui.postMessage({
    type: 'github-info',
    message: 'GitHub integration is not yet implemented. Please use "Import from Computer" for now.'
  });
}
