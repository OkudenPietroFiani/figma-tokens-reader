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
      console.log(`Fetching file: ${filePath}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Figma-W3C-Tokens-Plugin'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error for ${filePath}:`, response.status, errorText);
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`File fetched successfully: ${filePath}, encoding: ${data.encoding}, size: ${data.size}`);

      if (!data.content) {
        throw new Error(`No content field in GitHub response for ${filePath}`);
      }

      // Decode base64 content
      const content = this.decodeBase64(data.content);
      console.log(`Content decoded, length: ${content.length} chars`);

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
    // Remove whitespace and newlines from base64 content
    const cleanBase64 = base64.replace(/\s/g, '');

    try {
      // Decode base64 to binary string
      const binaryString = atob(cleanBase64);

      // Convert binary string to UTF-8
      // This handles special characters correctly
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode UTF-8 bytes to string
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    } catch (error) {
      console.error('Error decoding base64:', error);
      console.error('Base64 content (first 100 chars):', base64.substring(0, 100));
      throw new Error(`Failed to decode file content from GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
