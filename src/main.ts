// W3C Design Tokens Importer for Figma - Main Entry Point

import { UI_CONFIG } from './constants';
import { PluginMessage, TokenData } from './types';
import { VariableManager } from './services/variableManager';
import { GitHubService } from './services/githubService';

// Initialize services
const variableManager = new VariableManager();
const githubService = new GitHubService();

// Show UI
figma.showUI(__html__, { width: UI_CONFIG.width, height: UI_CONFIG.height });

// Message handler
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case 'import-tokens':
        await handleImportTokens(msg.data);
        break;

      case 'github-fetch-files':
        await handleGitHubFetchFiles(msg.data);
        break;

      case 'github-import-files':
        await handleGitHubImportFiles(msg.data);
        break;

      case 'save-github-config':
        await handleSaveGithubConfig(msg.data);
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

async function handleGitHubFetchFiles(data: any): Promise<void> {
  try {
    const { token, owner, repo, branch } = data;
    const files = await githubService.fetchRepositoryFiles({ token, owner, repo, branch });

    figma.ui.postMessage({
      type: 'github-files-fetched',
      data: { files }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch repository files'
    });
  }
}

async function handleGitHubImportFiles(data: any): Promise<void> {
  try {
    console.log('handleGitHubImportFiles called with data:', data);
    const { token, owner, repo, branch, files } = data;

    console.log('Fetching files from GitHub:', { owner, repo, branch, fileCount: files.length });
    const { primitives, semantics } = await githubService.fetchMultipleFiles(
      { token, owner, repo, branch },
      files
    );

    console.log('Files fetched successfully, importing tokens...');
    // Import the tokens
    const stats = await variableManager.importTokens(primitives, semantics);

    figma.ui.postMessage({
      type: 'import-success',
      message: `✓ Tokens imported from GitHub: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`
    });
  } catch (error) {
    console.error('Error in handleGitHubImportFiles:', error);
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to import files from GitHub'
    });
  }
}

async function handleSaveGithubConfig(data: any): Promise<void> {
  try {
    // Save GitHub configuration to plugin data
    await figma.clientStorage.setAsync('githubConfig', JSON.stringify(data));
    figma.notify('GitHub sync configuration saved!', { timeout: 3000 });
  } catch (error) {
    console.error('Error saving GitHub config:', error);
    throw new Error('Failed to save GitHub configuration');
  }
}

