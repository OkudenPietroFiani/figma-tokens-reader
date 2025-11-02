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
    const primitivesData: any = {};
    const semanticsData: any = {};

    for (const filePath of filePaths) {
      const jsonData = await this.fetchFileContent(config, filePath);
      const fileName = filePath.split('/').pop() || filePath;

      // Determine if it's primitives or semantics based on filename
      if (filePath.toLowerCase().includes('primitive')) {
        // Store each file with its filename as key
        primitivesData[fileName] = jsonData;
      } else if (filePath.toLowerCase().includes('semantic')) {
        semanticsData[fileName] = jsonData;
      } else {
        // Default to primitives if unclear
        primitivesData[fileName] = jsonData;
      }
    }

    return { primitives: primitivesData, semantics: semanticsData };
  }

  private decodeBase64(base64: string): string {
    // Remove whitespace and newlines from base64 content
    const cleanBase64 = base64.replace(/\s/g, '');

    try {
      // Custom base64 decoder that works in any JavaScript environment
      // This doesn't rely on atob() or TextDecoder which may not be available
      const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const base64Lookup = new Map<string, number>();
      for (let i = 0; i < base64Chars.length; i++) {
        base64Lookup.set(base64Chars[i], i);
      }

      const bytes: number[] = [];

      // Decode base64 to bytes
      for (let i = 0; i < cleanBase64.length; i += 4) {
        const encoded1 = base64Lookup.get(cleanBase64[i]) || 0;
        const encoded2 = base64Lookup.get(cleanBase64[i + 1]) || 0;
        const encoded3 = base64Lookup.get(cleanBase64[i + 2]) || 0;
        const encoded4 = base64Lookup.get(cleanBase64[i + 3]) || 0;

        const byte1 = (encoded1 << 2) | (encoded2 >> 4);
        const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        const byte3 = ((encoded3 & 3) << 6) | encoded4;

        bytes.push(byte1);
        if (cleanBase64[i + 2] !== '=') bytes.push(byte2);
        if (cleanBase64[i + 3] !== '=') bytes.push(byte3);
      }

      // Convert bytes to UTF-8 string
      let result = '';
      let i = 0;
      while (i < bytes.length) {
        const byte1 = bytes[i++];

        if (byte1 < 128) {
          // 1-byte character (ASCII)
          result += String.fromCharCode(byte1);
        } else if (byte1 >= 192 && byte1 < 224) {
          // 2-byte character
          const byte2 = bytes[i++];
          result += String.fromCharCode(((byte1 & 31) << 6) | (byte2 & 63));
        } else if (byte1 >= 224 && byte1 < 240) {
          // 3-byte character
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          result += String.fromCharCode(((byte1 & 15) << 12) | ((byte2 & 63) << 6) | (byte3 & 63));
        } else {
          // 4-byte character (rare, skip for now)
          i += 3;
        }
      }

      return result;
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
