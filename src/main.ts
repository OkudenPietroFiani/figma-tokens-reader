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
        await handleImportTokens(msg);
        break;

      case 'github-fetch-files':
        await handleGitHubFetchFiles(msg.data);
        break;

      case 'github-import-files':
        await handleGitHubImportFiles(msg.data);
        break;

      case 'load-github-config':
        await handleLoadGithubConfig();
        break;

      case 'save-github-config':
        await handleSaveGithubConfig(msg.data);
        break;

      case 'save-tokens':
        await handleSaveTokens(msg.data);
        break;

      case 'load-tokens':
        await handleLoadTokens();
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

async function handleImportTokens(msg: { data: { primitives: TokenData; semantics: TokenData }; scopeAssignments?: any }): Promise<void> {
  const { primitives, semantics } = msg.data;
  const scopeAssignments = msg.scopeAssignments || {};
  const stats = await variableManager.importTokens(primitives, semantics, scopeAssignments);

  figma.ui.postMessage({
    type: 'import-success',
    message: `✓ Tokens imported: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`
  });
}

async function handleGitHubFetchFiles(data: any): Promise<void> {
  try {
    const { token, owner, repo, branch } = data;
    const fileObjects = await githubService.fetchRepositoryFiles({ token, owner, repo, branch });

    // Extract just the paths for the UI
    const files = fileObjects.map(file => file.path);

    figma.ui.postMessage({
      type: 'github-files-fetched',
      data: { files }
    });
  } catch (error) {
    console.error('Error fetching GitHub files:', error);
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

    console.log('Files fetched successfully, sending to preview screen...');

    // Send data to UI for preview screen
    figma.ui.postMessage({
      type: 'github-files-imported',
      data: { primitives, semantics }
    });
  } catch (error) {
    console.error('Error in handleGitHubImportFiles:', error);
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to import files from GitHub'
    });
  }
}

async function handleLoadGithubConfig(): Promise<void> {
  try {
    const configString = await figma.clientStorage.getAsync('githubConfig');
    if (configString) {
      const config = JSON.parse(configString as string);
      figma.ui.postMessage({
        type: 'github-config-loaded',
        data: config
      });
    }
  } catch (error) {
    console.error('Error loading GitHub config:', error);
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

async function handleSaveTokens(data: any): Promise<void> {
  try {
    // Save token state to plugin data
    await figma.clientStorage.setAsync('tokenState', JSON.stringify(data));
    console.log('Token state saved successfully');
  } catch (error) {
    console.error('Error saving token state:', error);
  }
}

async function handleLoadTokens(): Promise<void> {
  try {
    const tokenStateString = await figma.clientStorage.getAsync('tokenState');
    if (tokenStateString) {
      const tokenState = JSON.parse(tokenStateString as string);
      figma.ui.postMessage({
        type: 'tokens-loaded',
        data: tokenState
      });
      console.log('Token state loaded successfully');
    }
  } catch (error) {
    console.error('Error loading token state:', error);
  }
}

