// GitHub integration service

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubFile {
  path: string;
  type: string;
  sha: string;
}

export class GitHubService {
  async fetchRepositoryFiles(config: GitHubConfig): Promise<GitHubFile[]> {
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Figma-W3C-Tokens-Plugin'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();

      // Filter for JSON files only
      const jsonFiles = data.tree.filter((item: any) =>
        item.type === 'blob' && item.path.endsWith('.json')
      );

      return jsonFiles.map((file: any) => ({
        path: file.path,
        type: file.type,
        sha: file.sha
      }));
    } catch (error) {
      console.error('GitHub fetch error:', error);
      throw new Error(`Failed to fetch repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fetchFileContent(config: GitHubConfig, filePath: string): Promise<any> {
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${config.branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Figma-W3C-Tokens-Plugin'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }

      const data = await response.json();

      // Decode base64 content
      const content = this.decodeBase64(data.content);
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error fetching file ${filePath}:`, error);
      throw error;
    }
  }

  async fetchMultipleFiles(config: GitHubConfig, filePaths: string[]): Promise<{ primitives: any; semantics: any }> {
    let primitivesData = null;
    let semanticsData = null;

    for (const filePath of filePaths) {
      const jsonData = await this.fetchFileContent(config, filePath);

      // Determine if it's primitives or semantics based on filename
      if (filePath.toLowerCase().includes('primitive')) {
        primitivesData = jsonData;
      } else if (filePath.toLowerCase().includes('semantic')) {
        semanticsData = jsonData;
      } else {
        // Default to primitives if unclear
        primitivesData = jsonData;
      }
    }

    return { primitives: primitivesData, semantics: semanticsData };
  }

  private decodeBase64(base64: string): string {
    // Remove whitespace and newlines
    const cleanBase64 = base64.replace(/\s/g, '');

    // For Node.js environment (Figma plugin backend)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(cleanBase64, 'base64').toString('utf-8');
    }

    // Fallback for browser environment
    return atob(cleanBase64);
  }

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }
}
